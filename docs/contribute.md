---
title: Contribute to spatial-bench
description: Find the guide for adding a library, extending a benchmark, submitting measurements or improving the website.
---
Each repository keeps its contributor instructions beside the code or records it
owns, so start by picking the guide that matches the change you want to make.

## Add or update a library

Library manifests and adapters live in the bencher repository. Follow
[adding a library](https://github.com/spatial-bench/spatial-bench-benchers/blob/master/docs/adding-a-library.md)
to begin with a small driver, or
[updating an entry](https://github.com/spatial-bench/spatial-bench-benchers/blob/master/docs/updating-a-library.md)
to change a version, a query or a configuration. Both guides assume you already
know your own library's API, so they focus on timing and validation.

## Extend the benchmark

Engine changes start with [core development](https://github.com/spatial-bench/spatial-bench-core/blob/main/CONTRIBUTING.md).
The task guides for
[adding datasets](https://github.com/spatial-bench/spatial-bench-core/blob/main/docs/adding-datasets.md)
and [adding query types](https://github.com/spatial-bench/spatial-bench-core/blob/main/docs/adding-query-types.md)
cover the generator, adapter and documentation work each one implies.

## Contribute measurements

The [results guide](https://github.com/spatial-bench/spatial-bench-results/blob/main/CONTRIBUTING.md)
explains what source and machine information a recording needs, how to prepare a
submission, and what happens after acceptance.

## Improve the website

Public pages are Markdown files in the web repository's `docs/` folder.
[Web development](https://github.com/spatial-bench/spatial-bench-web/blob/main/CONTRIBUTING.md)
covers editing them, previewing the site and working on the chart controls.

## Report a questionable result

[Open a results issue](https://github.com/spatial-bench/spatial-bench-results/issues)
with the complete chart URL, the run ID, the selected workload and the discrepancy
you noticed. Include a small reproducer when you have one. These details are what
let a maintainer work out whether the problem is in the adapter, the recorded data
or the chart.