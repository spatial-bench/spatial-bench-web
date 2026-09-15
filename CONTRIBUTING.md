# Contributing to spatial-bench-web

This repository owns [spatial-bench.org](https://spatial-bench.org), its public
explanations and browser-based results explorer. For the engine, drivers or
results, start at the [project contribution page](https://spatial-bench.org/contribute).

## Install and run

Use Node **22.12 or newer** and pnpm **12**; CI uses Node 24. Python 3 is needed
only to refresh the curated landing excerpt. Install dependencies from the web
repository root:

```sh
pnpm install --frozen-lockfile
node scripts/fixture.mjs
pnpm dev
```

The site is served at `http://localhost:4321`, with the explorer at `/explore`.
`fixture.mjs` reads the checked-in `.fixture/benchmarks-test.sqlite` and writes
`public/data/latest.json` plus its gzip snapshot. This older test fixture is for
repeatable frontend development, not a representation of current published
coverage. No credentials or engine build are needed to start the website.

The fixture manifest's `sha256` hashes the **raw SQLite file**. `bytes` counts the
compressed artifact. The loader handles both gzip bytes and responses already
decompressed by the HTTP layer, then verifies the raw hash. Hashing the `.gz`
file produces an integrity error. `sha: "local"` labels local data; it is not a
source revision claim.

To use another dataset base URL, set `VITE_DATASET_BASE` before starting/building;
it defaults to `/data`. Astro's Vite configuration explicitly preserves this
existing environment variable. Remote origins must permit the browser's requests.
The normal production configuration uses the same-origin Worker proxy.

## Collate current results locally

Use sibling checkouts named `spatial-bench-core`, `spatial-bench-results` and
`spatial-bench-web`. From the web root, with Rust and the core toolchain installed:

```sh
cargo build --release --manifest-path ../spatial-bench-core/Cargo.toml -p spatial-bench
mkdir -p .fixture
../spatial-bench-core/target/release/spatial-bench publish \
  --results ../spatial-bench-results --out .fixture/current.sqlite --sha local
node scripts/fixture.mjs .fixture/current.sqlite public/data
```

Adjust paths for your checkout layout. Collation reads existing run documents;
it does not run benchmarks or submit anything. The dataset generator and bencher
drivers are not required for this frontend fixture. Consult the
[results format guide](https://github.com/spatial-bench/spatial-bench-results/blob/main/docs/format-and-provenance.md)
for run and snapshot provenance. Do not replace the tracked test fixture as an
incidental part of a frontend change.

## Edit public pages

Public Markdown files live at **`docs/*.md`**, separate from this development guide.
The filename becomes the route: `docs/guide.md` becomes `/guide`. Each has YAML
frontmatter with `title` and `description`; the shared layout supplies the single
h1, so start body headings at h2. The route in `src/pages/[slug].astro` imports and
renders these files at build time. No database or React component is needed.

`src/layouts/SiteLayout.astro` supplies the common metadata, header, native
`details`/`summary` hamburger menu, skip link and footer. Native navigation works
with a keyboard and without JavaScript. Keep public links root-relative; repository
guides should link to the canonical `https://spatial-bench.org` routes. Source claims
should cite a stable repository revision. Cross-repository contributor links point
to each repository's `CONTRIBUTING.md` or its task guide.

`docs/updates.md` contains human-written editorial updates. Add entries for changes
that affect interpreting or contributing to the project, with an accurate date and
links. Update the short home-page excerpt in `src/pages/index.astro` at the same
time. Measurement timestamps are not editorial updates.

## Landing charts

The home page renders the existing `BenchChart` at build time, using the existing
filter/group/style engine. It ships SVG plus an accessible table of values and
links to source run documents. A small inline script selects one of two rendered
examples per visit. Without JavaScript, the first example stays visible. No chart,
React or SQLite runtime is hydrated on that page.

`src/data/featured.json` is a curated excerpt, not synthetic benchmark data. Its
revision and run paths identify the source records. `src/data/featured.ts` fixes the
workload and provides shareable explorer specifications; the explorer link uses the
current live snapshot, so it can differ from the frozen example.

To refresh the excerpt intentionally, first collate the reviewed results checkout
as above, then run:

```sh
python3 scripts/featured.py .fixture/current.sqlite ../spatial-bench-results
```

The script checks the expected coverage count so a changed corpus requires review.
Update its capture date, pins and selection deliberately; inspect every changed
series and source link. The current comparison keeps squared Euclidean metrics
separate from pykdtree's recorded Euclidean metric. Verify the resulting charts and
captions together. Normal builds use the checked-in excerpt and work offline after
dependencies are installed.

## Work on the explorer

`src/main.tsx` is the React entry component, mounted only by
`src/pages/explore.astro` with `client:only="react"`. `SpecEditor` constructs a
`ChartSpec`; `engine/group.ts` filters points and forms panels, charts and series;
`BenchChart` renders them. `engine/url.ts` preserves the shareable `spec` encoding.
The root page forwards legacy `/?spec=…` links to `/explore` without dropping query
parameters or fragments.

`engine/dataset.ts` fetches and verifies snapshots, opens SQLite WASM in memory and
resolves points/tags. `useDataset` caches the result through TanStack Query; its
five-minute stale time is not a periodic polling timer. Document actual refresh
behaviour if changing it.

Read the [guide](docs/guide.md) and [methodology](docs/methodology.md) before changing
filters, deduplication, statistic labels or point details. In particular, latency
prefers median with a mean fallback, whereas stored confidence bounds belong to
the mean. Keep workload dimensions fixed or represented in series/charts to avoid
collapsing incompatible cases.

## Validate a change

```sh
pnpm check
pnpm test
pnpm build
pnpm preview
```

`check` runs Biome; `test` runs the existing Vitest chart/group/SQLite tests plus
routing, fixture integrity and landing compatibility checks. `build` runs Astro's
TypeScript checks, emits the static site, then checks generated routes, local links,
anchors, navigation and the absence of runtime bundles from static pages. Astro's
checker currently needs TypeScript 6's programmatic API, so the project pins that
major rather than the native TypeScript 7 compiler.

Inspect the production preview at narrow and wide sizes. Check menu operation by
keyboard, direct links to every public page, the no-JavaScript home fallback,
`/explore?spec=…`, old root links, and readable public pages with `/data` unavailable.
Record validation and any documentation impact in the pull request. For changes to
measurement interpretation, coordinate the methods and contributor guides.

## Workers and R2 deployment (maintainers)

Production is static Astro output in `dist/`, served by Cloudflare Workers Static
Assets. `src/worker.ts` proxies `/data/*` to the `DATASET` R2 binding; other requests
use `ASSETS`. There is **no Astro server adapter or application SSR server**.
`wrangler.jsonc` retains the existing Worker/bucket names, routes `/data/*` through
the Worker first and uses `404-page` handling instead of SPA fallback. Unknown
paths must not silently become the landing page.

The results repository owns publishing `latest.json` and
`benchmarks-<12 hex characters>.sqlite.gz` to R2. Keep the existing bucket binding,
account access and deployment credentials configured through the deployment
environment; do not commit secrets. See its
[publication guide](https://github.com/spatial-bench/spatial-bench-results/blob/main/docs/publication.md)
for snapshot operations and recovery.

For a deployment, build from a clean checkout without `public/data` fixtures:
Astro copies public assets into `dist`, so local fixtures would otherwise be
included. Run the checks above, inspect `dist`, then use the project's configured
Cloudflare Workers build/deploy integration or an authenticated Wrangler deployment
with this configuration. The checked-in GitHub workflow runs CI; it does not itself
publish the website. Preview locally before an authorized production deployment.
