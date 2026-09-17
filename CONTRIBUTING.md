# Work on the website

Run these commands from the web repository root. Node 22.12+ and pnpm 12 are
required; CI uses Node 24.

## Start a local preview

```sh
pnpm install --frozen-lockfile
node scripts/fixture.mjs
pnpm dev
```

Open `http://localhost:4321`, or `/explore` for the charts. The fixture script
reads the checked-in SQLite file and writes a gzip snapshot and `latest.json`
under `public/data`. The fixture can lag published coverage; use it for frontend
work that needs repeatable input.

The manifest hashes **uncompressed SQLite bytes**. The loader also accepts
responses decompressed by HTTP, then checks the same digest. Set
`VITE_DATASET_BASE` before starting or building to use another data URL prefix;
the default is `/data`. A remote prefix needs suitable CORS responses.

## Edit a documentation page

`docs/*.md` becomes static pages: `docs/guide.md` is `/guide`. Add frontmatter:

```yaml
---
title: Page title
description: A short description of the page's subject.
---
```

The layout supplies the h1, description and table of contents. Start body headings
at h2 and use root-relative links between pages. Keep developer setup in this
file, outside public `docs/`. Preview long tables and code examples on a narrow
screen as well as desktop.

Write public guidance for readers familiar with spatial queries. Methodology
readers need precise experimental and statistical definitions; cite the relevant
implementation and retain qualifications that affect interpretation. Update
source references when the measured procedure changes.

## Work on the explorer

[`src/main.tsx`](src/main.tsx) is mounted only at `/explore`.
[`SpecEditor`](src/components/SpecEditor.tsx) edits a `ChartSpec`;
[`group.ts`](src/engine/group.ts) filters and groups observations;
[`BenchChart`](src/components/BenchChart.tsx) draws them.
[`url.ts`](src/engine/url.ts) preserves settings in shareable URLs.
Legacy `/?spec=…` links redirect to `/explore` with their query and fragment.

[`dataset.ts`](src/engine/dataset.ts) fetches the manifest and snapshot, verifies
the digest, and opens SQLite WASM in memory. TanStack Query caches the loaded
data; its five-minute stale time is not a polling schedule.

Read the [guide](docs/guide.md) before changing filter or statistic labels.
Latency prefers median while confidence bounds describe mean; grouping also
determines which repeated observation is retained.

## Use current results

With sibling engine and results checkouts, adjusting paths for your layout:

```sh
cargo build --release --manifest-path ../spatial-bench/Cargo.toml -p spatial-bench
../spatial-bench/target/release/spatial-bench publish \
  --results ../spatial-bench-results --out .fixture/current.sqlite --sha local
node scripts/fixture.mjs .fixture/current.sqlite public/data
```

Collation reads existing records. It requires neither the dataset generator nor
a benchmark run. Use the executable under `CARGO_TARGET_DIR` if you set a custom
target directory. Keep the tracked fixture unchanged unless updating it is part
of the proposed change.

## Update the landing page

The landing page renders the existing chart component to SVG at build time.
`src/data/featured.json` holds a fixed excerpt with its source revision and run
paths; `featured.ts` defines the comparison. The same chart is rendered at desktop
and mobile sizes. A small script picks one workload example per visit, with the
first available when JavaScript is disabled.

To refresh the excerpt after collating results:

```sh
python3 scripts/featured.py .fixture/current.sqlite ../spatial-bench-results
```

Review the script's fixed selections and capture metadata before running it.
Check changed values against their source records and update the page captions.
The expected coverage assertion makes an unexpected corpus change explicit.
Normal builds use the checked-in excerpt and need no live dataset.

Editorial updates belong in `docs/updates.md`; update the short landing excerpt
at the same time. Use the date of the project change rather than a benchmark's
measurement timestamp.

## Check a change

```sh
pnpm check
pnpm test
pnpm build
pnpm preview
```

These run Biome, Vitest, Astro's checks and a static build. The post-build check
verifies routes, links and the absence of runtime bundles from public pages.
Astro's checker uses TypeScript 6's programmatic API; the native TypeScript 7
compiler cannot currently replace it here.

In production preview, check keyboard navigation, narrow and wide layouts,
public pages without JavaScript, and an explorer URL restored after reload.
Select a point and check that public navigation remains usable if data loading
fails. Include validation and any documentation impact in the PR.

## Deploy the site

Cloudflare Workers Static Assets serves `dist/`. The Worker proxies `/data/*`
to the `DATASET` R2 binding and sends other requests to `ASSETS`. There is no
Astro application server. The GitHub workflow runs CI; production publication
uses the configured Cloudflare integration or an authorized Wrangler deployment.

> Build deployments from a clean checkout without `public/data`. Astro copies
> public assets into `dist`, including any local fixture left there.

Keep credentials in the deployment environment. The results repository owns
snapshot uploads; its [publication guide](https://github.com/spatial-bench/spatial-bench-results/blob/main/docs/publication.md)
describes object names, integrity checks and recovery. Inspect the built assets
and verify the configured bucket before publishing.
