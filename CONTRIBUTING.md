# Work on the website

Every command below runs from the web repository root, and needs Node 22.12+ and
pnpm 12; CI uses Node 24.

## Start a local preview

```sh
pnpm install --frozen-lockfile
node scripts/fixture.mjs
pnpm dev
```

Open `http://localhost:4321`, or `/explore` for the charts. The fixture script reads
the checked-in SQLite file and writes a gzip snapshot plus `latest.json` under
`public/data`. It can lag the published coverage, so treat it as repeatable input
for frontend work rather than a view of what is currently live.

The manifest hashes **uncompressed SQLite bytes**. The loader also accepts responses
that HTTP has already decompressed, and checks the same digest either way. Set
`VITE_DATASET_BASE` before starting or building to serve data from another URL
prefix; the default is `/data`. A remote prefix needs appropriate CORS responses.

## Edit a documentation page

Files in `docs/*.md` become static pages, so `docs/guide.md` is served at `/guide`.
Each one needs frontmatter:

```yaml
---
title: Page title
description: A short description of the page's subject.
---
```

The layout supplies the `h1`, the description and the table of contents, which means
body headings should start at `h2` and links between pages should be root-relative.
Keep developer setup in this file, outside the public `docs/` directory. Preview long
tables and code examples on a narrow screen as well as desktop.

Public guidance is for readers who know spatial queries but not the internals of
this project. The methodology page is the exception: its readers need precise
experimental and statistical definitions, so cite the relevant implementation and
keep any qualification that affects interpretation. Update the source references
when the measured procedure changes.

## Work on the explorer

[`src/main.tsx`](src/main.tsx) is mounted only at `/explore`.
[`SpecEditor`](src/components/SpecEditor.tsx) edits a `ChartSpec`;
[`group.ts`](src/engine/group.ts) filters and groups observations; and
[`BenchChart`](src/components/BenchChart.tsx) draws them.
[`url.ts`](src/engine/url.ts) keeps settings in shareable URLs; legacy `/?spec=...`
links redirect to `/explore` with their query and fragment intact.
[`dataset.ts`](src/engine/dataset.ts) fetches the manifest and snapshot, verifies the
digest, and opens SQLite WASM in memory. TanStack Query caches the loaded data, and
its five-minute stale time is a cache lifetime, not a polling schedule.

Read the [guide](docs/guide.md) before changing filter or statistic labels. Latency
prefers the median while confidence bounds describe the mean, and grouping also
determines which of several repeated observations is retained.

## Use current results

With sibling engine and results checkouts, adjusting paths for your layout:

```sh
cargo build --release --manifest-path ../spatial-bench/Cargo.toml -p spatial-bench
../spatial-bench/target/release/spatial-bench publish \
  --results ../spatial-bench-results --out .fixture/current.sqlite --sha local
node scripts/fixture.mjs .fixture/current.sqlite public/data
```

Collation only reads existing records, so it needs neither the dataset generator nor
a benchmark run. If you set a custom `CARGO_TARGET_DIR`, use the executable from
there instead. Leave the tracked fixture alone unless updating it is part of the
change you are proposing.

## Update the landing page

The landing page renders the existing chart component to SVG at build time.
[`src/data/featured.json`](src/data/featured.json) holds a fixed excerpt with its
source revision and run paths, and [`featured.ts`](src/data/featured.ts) defines the
comparison. The same chart is rendered at desktop and mobile sizes, and a small
script picks one workload example per visit, falling back to the first available
when JavaScript is disabled.

To refresh the excerpt after collating results:

```sh
python3 scripts/featured.py .fixture/current.sqlite ../spatial-bench-results
```

Review the script's fixed selections and capture metadata before running it. Check
the changed values against their source records and update the page captions. The
expected coverage assertion is there to make an unexpected corpus change explicit.
Normal builds use the checked-in excerpt and need no live dataset.

Editorial updates belong in `docs/updates.md`, with the short landing excerpt
updated at the same time. Date them by the project change rather than by a
benchmark's measurement timestamp.

## Check a change

```sh
pnpm check
pnpm test
pnpm build
pnpm preview
```

These run Biome, Vitest, Astro's checks and a static build; the post-build check
verifies routes, links and the absence of runtime bundles from public pages. Astro's
checker uses TypeScript 6's programmatic API, so the native TypeScript 7 compiler
cannot currently stand in for it here.

In the production preview, check keyboard navigation, narrow and wide layouts, and
public pages with JavaScript disabled. Confirm that an explorer URL restores after a
reload, and select a point to check that public navigation still works if data
loading fails. Include the validation you ran and any documentation impact in the
PR.

## Deploy the site

Cloudflare Workers Static Assets serves `dist/`. The Worker proxies `/data/*` to the
`DATASET` R2 binding and sends every other request to `ASSETS`; there is no Astro
application server. The GitHub workflow runs CI, while production publication uses
the configured Cloudflare integration or an authorized Wrangler deployment.

> Build deployments from a clean checkout without `public/data`. Astro copies public
> assets into `dist`, so a local fixture left in place would ship with the site.

Keep credentials in the deployment environment. The results repository owns snapshot
uploads; its [publication guide](https://github.com/spatial-bench/spatial-bench-results/blob/main/docs/publication.md)
covers object names, integrity checks and recovery. Inspect the built assets and
verify the configured bucket before publishing.