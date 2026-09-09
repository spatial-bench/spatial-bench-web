/**
 * The dataset loader: latest.json → snapshot → ResolvedPoint[].
 *
 * The results repo's publish workflow writes an immutable
 * `benchmarks-<sha>.sqlite.gz` plus a mutable `latest.json` pointer (with a
 * sha256 for integrity). This module fetches, verifies, decompresses with
 * the browser's native DecompressionStream, mounts the SQLite bytes in the
 * wasm module, and resolves every point row into the engine's shape — core
 * columns merged with extension tags.
 *
 * In-memory SQLite first: the whole snapshot downloads (a few hundred KiB
 * today). When it outgrows that, the OPFS VFS is the persistence story and
 * an HTTP-range VFS the lazy one — both behind this same seam.
 */
import type { ResolvedPoint } from "./model";

export interface DatasetManifest {
  db: string;
  sha: string;
  sha256: string;
  bytes: number;
  generated_at: string;
}

export interface Dataset {
  manifest: DatasetManifest;
  points: ResolvedPoint[];
  machines: string[];
}

/** Poll the pointer. The only mutable object in the bucket. */
export async function fetchManifest(base: string): Promise<DatasetManifest> {
  const res = await fetch(`${base}/latest.json`, { cache: "no-cache" });
  if (!res.ok) throw new Error(`latest.json: HTTP ${res.status}`);
  return (await res.json()) as DatasetManifest;
}

async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Fetch + verify + decompress the snapshot into raw SQLite bytes. */
export async function fetchSnapshot(
  base: string,
  manifest: DatasetManifest,
): Promise<Uint8Array> {
  const res = await fetch(`${base}/${manifest.db}`);
  if (!res.ok) throw new Error(`${manifest.db}: HTTP ${res.status}`);
  const compressed = await res.arrayBuffer();

  const actual = await sha256Hex(compressed);
  if (manifest.sha256 && manifest.sha256 !== actual) {
    throw new Error(
      `sha256 mismatch for ${manifest.db}: manifest says ${manifest.sha256}, got ${actual}`,
    );
  }

  const stream = new Response(compressed).body!.pipeThrough(
    new DecompressionStream("gzip"),
  );
  const bytes = await new Response(stream).arrayBuffer();
  return new Uint8Array(bytes);
}

/**
 * A read-only wrapper over one opened database. The bytes are written into
 * the wasm's in-memory filesystem and opened from there — the documented
 * sqlite-wasm path for mounting a serialized database.
 */
export interface DatasetDb {
  select(sql: string, bind?: unknown[]): Record<string, unknown>[];
  close(): void;
}

export async function openInMemory(bytes: Uint8Array): Promise<DatasetDb> {
  const sqlite3 = await sqlite3Module();
  // Mount the bytes as a file in the wasm's memory-backed VFS, then open it.
  // The name is unique per call so two datasets never share a file.
  const name = `snapshot-${Date.now()}.sqlite`;
  sqlite3.capi.sqlite3_js_posix_create_file(name, bytes, bytes.length);
  const db = new sqlite3.oo1.DB({ filename: name, flags: "c" });
  return {
    select(sql: string, bind: unknown[] = []): Record<string, unknown>[] {
      const rows: Record<string, unknown>[] = [];
      db.exec({
        sql,
        bind: bind as never[],
        rowMode: "object",
        callback: (row: object) => rows.push(row as Record<string, unknown>),
      });
      return rows;
    },
    close: () => db.close(),
  };
}

let modulePromise: Promise<Sqlite3> | undefined;

/** The wasm module, initialised once. */
export function sqlite3Module(): Promise<Sqlite3> {
  modulePromise ??= loadSqlite();
  return modulePromise;
}

/** The slice of sqlite-wasm's surface this module uses. */
interface Sqlite3 {
  oo1: {
    DB: new (config: { filename: string; flags: string }) => SqliteDb;
  };
  capi: {
    sqlite3_js_posix_create_file: (
      filename: string,
      data: Uint8Array,
      dataLen?: number,
    ) => void;
  };
}

interface SqliteDb {
  exec: (options: {
    sql: string;
    bind?: unknown[];
    rowMode: string;
    callback: (row: object) => void;
  }) => void;
  close: () => void;
}

async function loadSqlite(): Promise<Sqlite3> {
  const mod: unknown = await import("@sqlite.org/sqlite-wasm");
  const factory = (mod as { default: (config?: object) => Promise<unknown> }).default;
  const instance = (await factory({
    print: () => {},
    printErr: () => {},
  })) as Sqlite3;
  return instance;
}

const CORE_COLUMNS = [
  "impl",
  "version",
  "axis",
  "query",
  "k",
  "dims",
  "metric",
  "dataset",
  "parallelism",
  "query_batching",
  "isa",
  "config",
  "tree_size",
  "query_count",
  "query_batch_size",
] as const;

/** The whole dataset as engine input: every point row resolved with tags. */
export async function loadDataset(
  db: DatasetDb,
): Promise<{ points: ResolvedPoint[]; machines: string[] }> {
  const machines = db
    .select("SELECT hash FROM machines ORDER BY hash")
    .map((row) => String(row.hash));

  const tagsByPoint = new Map<number, Record<string, string>>();
  for (const row of db.select(
    "SELECT point_id, key, value FROM point_tags ORDER BY point_id",
  )) {
    const id = Number(row.point_id);
    const key = String(row.key);
    const value = String(row.value);
    const map = tagsByPoint.get(id);
    if (map) map[key] = value;
    else tagsByPoint.set(id, { [key]: value });
  }

  const points: ResolvedPoint[] = [];
  for (const row of db.select(
    `SELECT p.id, p.run_id, r.machine_hash, r.started_at,
            p.impl, p.version, p.axis, p.query, p.k, p.dims, p.metric,
            p.dataset, p.parallelism, p.query_batching, p.isa, p.config,
            p.tree_size, p.query_count, p.query_batch_size,
            p.latency_ns, p.latency_ns_lower, p.latency_ns_upper,
            p.throughput_qps, p.median_ns, p.mad_ns, p.std_dev_ns, p.samples
     FROM points p JOIN runs r ON r.id = p.run_id
     ORDER BY p.id`,
  )) {
    const core: Record<string, string | number> = {};
    for (const column of CORE_COLUMNS) {
      const value = row[column];
      if (value === null || value === undefined) continue;
      core[column] = typeof value === "number" ? value : String(value);
    }
    // machine_hash and started_at ride on the run, not the point row.
    core.machine_hash = String(row.machine_hash ?? "");
    core.started_at = String(row.started_at ?? "");
    const id = Number(row.id);
    points.push({
      id,
      runId: String(row.run_id ?? ""),
      machineHash: String(row.machine_hash ?? ""),
      startedAt: String(row.started_at ?? ""),
      core: core as ResolvedPoint["core"],
      tags: tagsByPoint.get(id) ?? {},
      latencyNs: Number(row.latency_ns ?? 0),
      latencyLower: row.latency_ns_lower === null ? null : Number(row.latency_ns_lower),
      latencyUpper: row.latency_ns_upper === null ? null : Number(row.latency_ns_upper),
      throughputQps: row.throughput_qps === null ? null : Number(row.throughput_qps),
      medianNs: row.median_ns === null ? null : Number(row.median_ns),
      madNs: row.mad_ns === null ? null : Number(row.mad_ns),
      stdDevNs: row.std_dev_ns === null ? null : Number(row.std_dev_ns),
      samples: row.samples === null ? null : Number(row.samples),
    });
  }
  return { points, machines };
}

/** Convenience: base URL → verified bytes → opened db + resolved points. */
export async function loadFromBase(
  base: string,
): Promise<{ dataset: Dataset; db: DatasetDb }> {
  const manifest = await fetchManifest(base);
  const bytes = await fetchSnapshot(base, manifest);
  const db = await openInMemory(bytes);
  const { points, machines } = await loadDataset(db);
  return { dataset: { manifest, points, machines }, db };
}
