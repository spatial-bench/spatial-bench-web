---
title: Contribute to spatial-bench
description: Find the right guide for a library adapter, engine extension, result submission or website change.
---
Choose the contribution you want to make. Each repository owns the instructions
for its part of the experiment; changes to a workload or contract may need linked
pull requests in more than one repository.

## Add or update a library

Start with the [bencher contributor guide](https://github.com/spatial-bench/spatial-bench-benchers/blob/master/CONTRIBUTING.md).
The [add a library walkthrough](https://github.com/spatial-bench/spatial-bench-benchers/blob/master/docs/adding-a-library.md)
covers manifests, source pins and adapting an existing driver.
[Update an existing entry](https://github.com/spatial-bench/spatial-bench-benchers/blob/master/docs/updating-a-library.md)
for version bumps, API changes and new configurations.

Explain timing boundaries and query semantics, supply correctness evidence, and
include a small reproducible run. Library authors' expertise is useful; maintainer
review should separately assess the adapter and the comparison.

## Develop the engine or extend a workload

Use the [core contributor guide](https://github.com/spatial-bench/spatial-bench-core/blob/main/CONTRIBUTING.md)
for setup and checks. Follow the dedicated guides to
[add a dataset](https://github.com/spatial-bench/spatial-bench-core/blob/main/docs/adding-datasets.md)
or [add a query type](https://github.com/spatial-bench/spatial-bench-core/blob/main/docs/adding-query-types.md).
These changes can affect vocabulary, generators, adapters, manifests and corpus
selections. Define semantics and validation before measuring performance.

## Run and propose measurements

[Run a benchmark locally](https://github.com/spatial-bench/spatial-bench-core/blob/main/docs/running-benchmarks.md),
then read the [results contributor guide](https://github.com/spatial-bench/spatial-bench-results/blob/main/CONTRIBUTING.md)
before proposing records. Preserve the run document, machine information, source
pins and available execution context. A local experiment and a reviewed published
result are distinct stages.

## Improve the website or explanations

The [web contributor guide](https://github.com/spatial-bench/spatial-bench-web/blob/main/CONTRIBUTING.md)
explains local data setup, static Markdown pages, the React explorer, checks and
production builds. Corrections to the [methodology](/methodology) should identify
the implementation evidence and the affected interpretation.

## Question a result or request coverage

For a questionable measurement, open an issue in
[results](https://github.com/spatial-bench/spatial-bench-results/issues) with the
chart URL, run identifier, workload, library/version and the specific concern.
Include a reproducer or reference evidence where available. The run identifier is
more durable than a point's numeric ID in a particular database snapshot.

For missing library support, use
[bencher issues](https://github.com/spatial-bench/spatial-bench-benchers/issues).
For new input distributions or query semantics, use
[core issues](https://github.com/spatial-bench/spatial-bench-core/issues).
For display and navigation problems, use
[web issues](https://github.com/spatial-bench/spatial-bench-web/issues).
These are requests for review, not automatic acceptance or publication.
