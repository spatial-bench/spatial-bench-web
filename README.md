# spatial-bench-web

The [spatial-bench website](https://spatial-bench.org): public explanations and an
interactive spatial index benchmark explorer.

- [Understand the results](https://spatial-bench.org/guide)
- [Methodology](https://spatial-bench.org/methodology)
- [Contribute to the project](https://spatial-bench.org/contribute)
- [Develop this website](CONTRIBUTING.md)

Astro generates static HTML for `/`, `/about`, `/guide`, `/methodology`, `/coverage`,
`/contribute` and `/updates`. Public prose lives in `docs/*.md`. The existing React,
visx and TanStack Query explorer runs in the browser at `/explore`. Legacy
`/?spec=…` URLs retain their complete chart specification.

The explorer downloads a gzip SQLite snapshot and verifies the SHA-256 of the
**uncompressed SQLite bytes** before opening it with `@sqlite.org/sqlite-wasm`.
The [results repository](https://github.com/spatial-bench/spatial-bench-results)
owns the records and publication pipeline. Public pages and the pre-rendered home
charts need no live dataset, React runtime or SQLite download.

## Start locally

Use Node 22.12+ (CI uses Node 24), pnpm 12 and the checked-in test snapshot:

```sh
pnpm install --frozen-lockfile
node scripts/fixture.mjs
pnpm dev
```

Open `http://localhost:4321` or `/explore`. See [CONTRIBUTING.md](CONTRIBUTING.md)
for current-data fixtures, checks, architecture and Workers/R2 deployment.
