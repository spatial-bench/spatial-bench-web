# spatial-bench-web

The website for [spatial-bench](https://spatial-bench.org): benchmark comparisons,
reading guides and technical methodology. Astro builds the public Markdown
pages; React runs the interactive explorer at `/explore`.

## Preview the site

With Node 22.12+ and pnpm 12, run from the repository root:

```sh
pnpm install --frozen-lockfile
node scripts/fixture.mjs
pnpm dev
```

Open `http://localhost:4321`. The checked-in fixture lets you use the explorer
without production credentials or running benchmarks.

## Edit the site

- Public documentation: [`docs/`](docs/guide.md).
- Shared layout and navigation: [`SiteLayout.astro`](src/layouts/SiteLayout.astro).
- Landing page: [`index.astro`](src/pages/index.astro).
- React explorer: [`main.tsx`](src/main.tsx).

[CONTRIBUTING.md](CONTRIBUTING.md) covers Markdown conventions, current-results
fixtures, validation and deployment.

## Related repositories

[Core](https://github.com/spatial-bench/spatial-bench-core) executes benchmarks and
collates results. [Benchers](https://github.com/spatial-bench/spatial-bench-benchers)
contains library adapters. [Results](https://github.com/spatial-bench/spatial-bench-results)
stores run documents and publishes the database used by this website.
