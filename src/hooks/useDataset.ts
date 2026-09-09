import { useQuery } from "@tanstack/react-query";
import { type Dataset, type DatasetManifest, loadFromBase } from "../engine/dataset";

/**
 * Where the collated dataset lives. The results repo's publish workflow
 * writes `latest.json` (the only mutable pointer) next to an immutable
 * `benchmarks-<sha>.sqlite.gz`; this URL is the bucket's public base.
 */
export const DATASET_BASE: string = import.meta.env.VITE_DATASET_BASE ?? "/data";

/** The loaded dataset, keyed by the snapshot sha so a new publish refetches. */
export function useDataset() {
  return useQuery({
    queryKey: ["dataset"],
    queryFn: async (): Promise<{ dataset: Dataset }> => {
      const { dataset } = await loadFromBase(DATASET_BASE);
      return { dataset };
    },
    staleTime: 5 * 60 * 1000,
  });
}

export type { Dataset, DatasetManifest };
