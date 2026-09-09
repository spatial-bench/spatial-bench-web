# spatial-bench-web

Benchmark results explorer for the [spatial-bench](https://github.com/spatial-bench/spatial-bench-core) engine.

## Stack

| Layer | Choice |
|---|---|
| Build | Vite (static SPA — Cloudflare Pages) |
| Language | TypeScript, strict |
| Styling | Tailwind CSS v4 |
| Charts | visx (D3 primitives as React components) |
| Server state | TanStack Query |
| Lint + format | Biome |
| Data | wa-sqlite over the published snapshot |

## Data source

The [results repo](https://github.com/spatial-bench/spatial-bench-results)
collates every merged run document into a SQLite file and publishes it to
Cloudflare R2 on merge: an immutable `benchmarks-<sha>.sqlite.zst` plus a
`latest.json` pointer (the only mutable object). This app polls
`latest.json`, downloads the snapshot when it changes, and queries it
in-browser; lazy HTTP-range loading is the upgrade path once the dataset
outgrows a straight download.

Point `VITE_DATASET_BASE` at the bucket's public base URL (dev: a local
`/data` directory works with `vite`).

## Develop

```sh
pnpm install
pnpm dev      # vite dev server
pnpm check    # biome lint + format
pnpm test     # vitest
pnpm build    # tsc + vite production build
```
