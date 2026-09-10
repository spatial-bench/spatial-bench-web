import type { ChartSpec } from "./model";

/**
 * The whole chart spec serialises into the URL: every view the user builds
 * is a shareable link, and a refresh restores exactly what they had.
 */
export function specToQuery(spec: ChartSpec): string {
  const json = JSON.stringify(spec);
  const b64 = btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `spec=${b64}`;
}

export function specFromQuery(
  search: string,
  fallback: ChartSpec,
): ChartSpec {
  const params = new URLSearchParams(search);
  const raw = params.get("spec");
  if (!raw) return spec;
  try {
    const json = atob(raw.replace(/-/g, "+").replace(/_/g, "/"));
    const parsed = JSON.parse(json) as ChartSpec;
    // Structural sanity, not a full schema: the engine is defensive anyway.
    if (typeof parsed !== "object" || !parsed.chartKey) return spec;
    return { ...spec, ...parsed };
  } catch {
    return spec;
  }
}

export function pushSpecToUrl(spec: ChartSpec): void {
  const url = new URL(window.location.href);
  url.search = specToQuery(spec);
  window.history.replaceState(null, "", url);
}