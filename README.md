# spatial-bench-web

This is the website for [spatial-bench](https://spatial-bench.org): benchmark
comparisons, reading guides and the technical methodology. Astro builds the public
Markdown pages, and React runs the interactive explorer at `/explore`.

## Preview the site

With Node 22.12+ and pnpm 12 installed, run everything from the repository root:

```sh
pnpm install --frozen-lockfile
node scripts/fixture.mjs
pnpm dev
```

Then open `http://localhost:4321`. The checked-in fixture means you can use the
explorer without production credentials or running a benchmark yourself.

## Edit the site

- Public documentation: [`docs/`](docs/guide.md).
- Shared layout and navigation: [`SiteLayout.astro`](src/layouts/SiteLayout.astro).
- Landing page: [`index.astro`](src/pages/index.astro).
- React explorer: [`main.tsx`](src/main.tsx).

[CONTRIBUTING.md](CONTRIBUTING.md) covers Markdown conventions, working with
current-results fixtures, validation and deployment.

## Related repositories

[Core](https://github.com/spatial-bench/spatial-bench-core) executes benchmarks and
collates results, [benchers](https://github.com/spatial-bench/spatial-bench-benchers)
holds the library adapters, and
[results](https://github.com/spatial-bench/spatial-bench-results) stores run
documents and publishes the database this site loads.