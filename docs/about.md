---
title: About spatial-bench
description: Compare spatial-index libraries using recorded query workloads and inspectable benchmark code.
---
spatial-bench measures the cost of spatial queries across library implementations.
Use it to compare libraries for a workload, examine changes between measured
versions, or investigate how query time grows with the number of indexed points.

## Comparing libraries

A comparison starts with the query your application needs. Dimensions, numeric
precision, input distribution and execution mode all affect the result. The
[reading guide](/guide) works through an exact nearest-neighbour comparison; the
[methodology](/methodology) describes the experiment behind each measurement.

The explorer lets you select those conditions and inspect individual points.
Each point belongs to a run document containing its library version, configuration
and available machine information. Source records and adapter code are public,
so readers can examine the calls being timed.

## Project organization

| Repository | Responsibility |
| --- | --- |
| [Core](https://github.com/spatial-bench/spatial-bench-core) | Select workloads, generate inputs, execute benchmarks and collate results |
| [Benchers](https://github.com/spatial-bench/spatial-bench-benchers) | Describe library configurations and implement the calls being measured |
| [Results](https://github.com/spatial-bench/spatial-bench-results) | Store run documents and publish the explorer's database |
| [Web](https://github.com/spatial-bench/spatial-bench-web) | Present comparisons and maintain these guides |

A library adapter translates a declared workload into calls to that library.
The engine runs it and writes a result document. Accepted records are collated
into the snapshot loaded by the website.

## Contributing and review

Library authors can add adapters or extend an existing entry. Other contributions
include datasets, query types, engine development and documentation. The
[contribution guides](/contribute) identify the repository and starting point
for each task.

Changes are proposed through pull requests. Review can examine query semantics,
timing boundaries and the evidence supplied with a measurement. Independent
reruns are additional evidence; merging a record does not establish that one
has taken place.
