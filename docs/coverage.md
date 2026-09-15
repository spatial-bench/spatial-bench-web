---
title: Coverage and limits
description: Distinguish recognized vocabulary, implemented drivers and recorded measurements.
---
A library name, a driver and a plotted result establish different things. Start
with the [explorer](/explore) to find measurements for your workload, then check the
[bencher manifests](https://github.com/spatial-bench/spatial-bench-benchers/tree/master)
to understand how that combination was run.

## Recorded coverage

The results checkout at
[`895a701`](https://github.com/spatial-bench/spatial-bench-results/tree/895a701)
(13 September 2026) contains records for **Kiddo** and **kdtree** in Rust,
**nanoflann** in C++, and **pykdtree** through Python. The home page's example is a
fixed excerpt from this revision; the explorer reads the currently published
snapshot. This list is not a claim about every release or possible operation.

The recorded workload combinations differ by library and version. Inspect filters
and the underlying run for scalar type, dimension, metric, result count, batching,
threading and configuration. Recent records do not imply every older record has
been corrected or independently revalidated.

## Three levels of support

| Evidence | What it establishes |
| --- | --- |
| A name in the [core vocabulary](https://github.com/spatial-bench/spatial-bench-core/tree/main) | The engine recognizes that identifier; it does not establish driver support |
| A manifest and driver in [benchers](https://github.com/spatial-bench/spatial-bench-benchers) | A specific implementation of selected cases exists; registration checks show which cases it advertises |
| A run in [results](https://github.com/spatial-bench/spatial-bench-results/tree/main/datasets) and a published snapshot | Measurements were recorded and made available; interpretation still requires provenance and methods review |

Registration conformance checks the advertised case set, not whether every returned
neighbour is correct. New adapters and query operations need known-answer or
reference comparisons as separate review evidence.

## Workload boundaries

The shared input generator currently supports uniform and Gaussian distributions.
These are generated point clouds with controlled seeds, not a general upload
mechanism for arbitrary real-world datasets. The actual published records are a
subset of the engine's possible workloads.

Query vocabulary includes exact nearest neighbours and radius-related operations.
Do not equate “within radius”, a capped nearest set within a radius, and selection
by item value: result count, ordering, distance units and boundary inclusion matter.
The [methodology](/methodology) describes those distinctions and the limitations of
the current adapters. A vocabulary entry for an operation does not mean every
library implements or has measurements for it.

Construction, memory consumption, approximate search quality and application-level
throughput should not be inferred from a query-latency chart. In particular,
process-wide performance counters have a different scope from the timed query.

## Missing results and wider applicability

An empty view may mean the filters select an unmeasured version or incompatible
combination. Remove filters one at a time and check the driver manifest. Missing
coverage is not a score of zero and is not proof of a library limitation.

Uniform three-dimensional points on one machine cannot settle a clustered,
high-dimensional or mixed update/query workload on another. Language binding
costs, allocations, batching and threading can dominate different parts of a
comparison. Keep those dimensions explicit and consult the [reading guide](/guide).

To extend coverage, [add or update a library, dataset or query](/contribute).
Describe the semantics and application question when requesting new cases.
