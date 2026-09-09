import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { DATASET_BASE, useDataset } from "./hooks/useDataset";

const queryClient = new QueryClient();

function DatasetStatus() {
  const query = useDataset();
  if (query.isPending) return <p className="text-zinc-400">loading dataset…</p>;
  if (query.isError)
    return (
      <p className="text-red-400">
        dataset unreachable at <code>{DATASET_BASE}/latest.json</code>:{" "}
        {String(query.error)}
      </p>
    );
  const { dataset } = query.data;
  const { manifest, points, machines } = dataset;
  return (
    <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
      <dt className="text-zinc-400">revision</dt>
      <dd className="font-mono">{manifest.sha}</dd>
      <dt className="text-zinc-400">published</dt>
      <dd>{manifest.generated_at}</dd>
      <dt className="text-zinc-400">points</dt>
      <dd>{points.length.toLocaleString()}</dd>
      <dt className="text-zinc-400">machines</dt>
      <dd>{machines.join(", ")}</dd>
      <dt className="text-zinc-400">sha256</dt>
      <dd className="truncate font-mono" title={manifest.sha256}>
        {manifest.sha256}
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
