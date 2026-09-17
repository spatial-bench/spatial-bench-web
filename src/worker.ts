/**
 * The deploy's worker: serves the built static site from assets, and proxies
 * /data/* to the R2 dataset bucket — same-origin, so the browser needs no
 * CORS dance and the r2.dev URL stays out of the public surface.
 */

interface Env {
  /** The dataset bucket (benchmarks-<sha>.sqlite.gz + latest.json). */
  DATASET: {
    get: (key: string) => Promise<DatasetObject | null>;
  };
  /** The built static site (wrangler assets binding). */
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

interface DatasetObject {
  body: ReadableStream;
  httpEtag: string;
  httpMetadata: {
    contentType?: string;
    contentEncoding?: string;
    cacheControl?: string;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/data/")) {
      return serveDataset(decodeURIComponent(url.pathname.slice("/data/".length)), env);
    }
    return env.ASSETS.fetch(request);
  },
};

async function serveDataset(key: string, env: Env): Promise<Response> {
  // latest.json only, or the immutable snapshot files — no directory
  // listings, no traversal.
  if (!key.match(/^(latest\.json|benchmarks-[0-9a-f]{12}\.sqlite\.gz)$/)) {
    return new Response("not found", { status: 404 });
  }
  const object = await env.DATASET.get(key);
  if (object === null) {
    return new Response("not found", { status: 404 });
  }
  const headers = new Headers();
  if (object.httpMetadata.contentType) {
    headers.set("content-type", object.httpMetadata.contentType);
  }
  headers.set("etag", object.httpEtag);
  headers.set(
    "cache-control",
    key === "latest.json" ? "no-cache" : "public, max-age=31536000, immutable",
  );
  // The snapshot was uploaded with content-encoding: gzip; the browser
  // decompresses transparently, and the loader also sniffs the gzip magic,
  // so the bytes are correct either way.
  return new Response(object.body, { headers });
}
