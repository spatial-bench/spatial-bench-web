import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

const queryClient = new QueryClient();

/**
 * Where the collated dataset lives. The results repo's publish workflow
 * writes `latest.json` (the only mutable pointer) next to an immutable
 * `benchmarks-<sha>.sqlite.zst`; this URL is the bucket's public base.
 */
const DATASET_BASE: string = import.meta.env.VITE_DATASET_BASE ?? "/data";

interface DatasetManifest {
  db: string;
  sha: string;
  sha256: string;
  bytes: number;
  generated_at: string;
}

function useLatestManifest() {
  return useQuery({
    queryKey: ["latest"],
    queryFn: async (): Promise<DatasetManifest> => {
      const res = await fetch(`${DATASET_BASE}/latest.json`);
      if (!res.ok) throw new Error(`latest.json: ${res.status}`);
      return res.json();
    },
    // The pointer changes only on a publish; poll gently.
    refetchInterval: 5 * 60 * 1000,
  });
}

function DatasetStatus() {
  const query = useLatestManifest();
  if (query.isPending) return <p className="text-zinc-400">loading dataset…</p>;
  if (query.isError)
    return (
      <p className="text-red-400">
        no dataset reachable at <code>{DATASET_BASE}/latest.json</code>:{" "}
        {String(query.error)}
      </p>
    );
  const data = query.data;
  return (
    <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
      <dt className="text-zinc-400">revision</dt>
      <dd className="font-mono">{data.sha}</dd>
      <dt className="text-zinc-400">published</dt>
      <dd>{data.generated_at}</dd>
      <dt className="text-zinc-400">size</dt>
      <dd>{(data.bytes / 1024).toFixed(0)} KiB</dd>
      <dt className="text-zinc-400">sha256</dt>
      <dd className="truncate font-mono" title={data.sha256}>
        {data.sha256}
      </dd>
    </dl>
  );
}

export default function App() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12 text-zinc-100">
      <h1 className="mb-1 text-2xl font-semibold">spatial-bench</h1>
      <p className="mb-8 text-zinc-400">
        spatial index benchmarks, tag-addressed and semver-scoped
      </p>
      <DatasetStatus />
    </main>
  );
}

createRoot(document.getElementById("root") ?? document.body).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
