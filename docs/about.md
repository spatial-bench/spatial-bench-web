---
title: About spatial-bench
description: Compare spatial-index libraries using recorded query workloads and inspectable benchmark code.
---
spatial-bench measures what spatial queries actually cost across different library
implementations. You can use it to compare libraries for a workload you care about,
to see how a newer measured version changed, or to understand how query time grows
as the number of indexed points increases.

## Comparing libraries

A useful comparison starts with the query your application needs, because
dimensions, numeric precision, input distribution and execution mode all change the
result. The [reading guide](/guide) works through an exact nearest-neighbour
comparison as a concrete example, and the [methodology](/methodology) describes the
experiment behind every measurement.

The explorer lets you select those conditions and inspect individual points. Each
point belongs to a run document that records its library version, configuration and
whatever machine information was available. Because the source records and adapter
code are public, you can also examine the calls that were timed rather than taking
the number on trust.

## Project organization

| Repository | Responsibility |
| --- | --- |
| [Core](https://github.com/spatial-bench/spatial-bench-core) | Select workloads, generate inputs, execute benchmarks and collate results |
| [Benchers](https://github.com/spatial-bench/spatial-bench-benchers) | Describe library configurations and implement the calls being measured |
| [Results](https://github.com/spatial-bench/spatial-bench-results) | Store run documents and publish the explorer's database |
| [Web](https://github.com/spatial-bench/spatial-bench-web) | Present comparisons and maintain these guides |

A library adapter translates a declared workload into calls to that library; the
engine runs the adapter and writes a result document; accepted records are collated
into the snapshot the website loads.

## Contributing and review

Library authors can add adapters or extend an existing entry, and there is similar
work in datasets, query types, engine development and documentation. The
[contribution guides](/contribute) point to the repository and starting point for
each of these.

Changes arrive as pull requests. Review can examine query semantics, timing
boundaries and the evidence supplied with a measurement. Independent reruns are
additional evidence rather than something the project guarantees, and merging a
record does not by itself establish that one took place.