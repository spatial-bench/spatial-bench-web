---
title: Project updates
description: Editorial notes about changes that affect reading or contributing to spatial-bench.
---
Updates explain changes to the project and their effect on readers. For individual
measurements, inspect the [results records](https://github.com/spatial-bench/spatial-bench-results/tree/main/datasets)
and the [explorer](/explore).

## 2026-09-14 — A guide to the comparisons

The website now has a [reading guide](/guide), an auditable
[methodology](/methodology), [coverage notes](/coverage) and
[contribution routes](/contribute). The explorer lives at `/explore`; existing
`/?spec=…` chart links still work.

The guide makes two important distinctions explicit. The plotted latency prefers
a recorded median, while stored confidence bounds describe a mean. Selecting
**latest library version** and selecting the **latest measurement** are separate
operations. These explanations describe the existing measurement and display
behaviour; they do not change the recorded results.

The home page includes static examples from the results revision
[`895a701`](https://github.com/spatial-bench/spatial-bench-results/tree/895a701),
with source records and exact-value tables. Public explanations and these examples
can be read without downloading the live benchmark database. Contributor setup
and task guides live beside the code in each repository.
