# spatial-bench-web

The Spatial Bench (spatial-bench.org) project is a collection of tools for
benchmarking spatial index libraries and an accompanying website for comparing
them based on their benchmark results.

## Project Repos

* [Core](https://github.com/spatial-bench/spatial-bench-core): Defines the vocabulary of labels and parameters. These are used to parameterise benchmark runs and label the resulting reports so that they can be filtered and charted in the front-end. The code for the benchmark runner CLI tool itself is also in here.
* [Benchers](https://github.com/spatial-bench/spatial-bench-benchers): Defines the adapters for running spatial index libraries and the "Standard Corpus" of benchmarks that get ran for every new library release. Runs the benchmarks in CI.
* [Results](https://github.com/spatial-bench/spatial-bench-results): Stores the benchmark run results as JSON reports submitted from the Benchers CI or from spatial-bench CLI. Builds a sqlite DB from them and publishes it for the web front-end to read in.
* [Web](https://github.com/spatial-bench/spatial-bench-web): (**here**) The code for the spatial-bench.org website itself and the CI for deploying it.

## Developer Guide

### Prerequisites

Node 22.12+ and pnpm 12 installed

### Running Locally

```sh
pnpm install --frozen-lockfile
node scripts/fixture.mjs
pnpm dev
```

Then open `http://localhost:4321`. The checked-in fixture means you can use the
explorer without production credentials or running a benchmark yourself.

### Edit the site

- Public documentation (static website content): [`docs/`](docs/guide.md).
- Shared layout and navigation: [`SiteLayout.astro`](src/layouts/SiteLayout.astro).
- Landing page: [`index.astro`](src/pages/index.astro).
- React explorer: [`main.tsx`](src/main.tsx).

[CONTRIBUTING.md](CONTRIBUTING.md) covers Markdown conventions, working with current-results fixtures, validation and deployment.
