---
title: Contribute to spatial-bench
description: Find the guide for adding a library, extending a benchmark, submitting measurements or improving the website.
---
Choose the guide for the change you want to make. Each repository keeps its
contributor instructions beside the code or records it owns.

## Add or update a library

The bencher repository contains library manifests and adapters. Follow
[adding a library](https://github.com/spatial-bench/spatial-bench-benchers/blob/master/docs/adding-a-library.md)
to start with a small driver, or
[updating an entry](https://github.com/spatial-bench/spatial-bench-benchers/blob/master/docs/updating-a-library.md)
to change a version, query or configuration. The guides explain timing and
validation for authors already familiar with their library's API.

## Extend the benchmark

Start with [core development](https://github.com/spatial-bench/spatial-bench-core/blob/main/CONTRIBUTING.md)
for engine changes. The task guides for
[adding datasets](https://github.com/spatial-bench/spatial-bench-core/blob/main/docs/adding-datasets.md)
and [adding query types](https://github.com/spatial-bench/spatial-bench-core/blob/main/docs/adding-query-types.md)
cover the corresponding generator, adapter and documentation changes.

## Contribute measurements

The [results guide](https://github.com/spatial-bench/spatial-bench-results/blob/main/CONTRIBUTING.md)
explains the source and machine information needed for review, preparing a
submission, and publication after acceptance.

## Improve the website

Public pages are Markdown files in the web repository's `docs/` folder.
[Web development](https://github.com/spatial-bench/spatial-bench-web/blob/main/CONTRIBUTING.md)
covers editing them, previewing the site and working on chart controls.

## Report a questionable result

[Open a results issue](https://github.com/spatial-bench/spatial-bench-results/issues)
with the complete chart URL, run ID, selected workload and the discrepancy you
observed. Include a small reproducer when available. These details help locate
the problem in the adapter, recorded data or chart.
