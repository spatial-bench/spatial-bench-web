---
title: About spatial-bench
description: What spatial-bench measures, who it is for, and how its repositories fit together.
---
spatial-bench compares spatial index implementations on explicitly described
workloads. Use it to investigate a query you care about, examine how cost changes
with tree size, or contribute measurements for an implementation you know.
Start with the [explorer](/explore) and the [reading guide](/guide).

## A comparison is an experiment

A measurement belongs to a library version, driver, configuration, machine and
input workload. It is evidence about that combination. Changing dimension,
distribution, query semantics, batching or hardware can change the conclusion.
There is no single overall winner implied by these charts.

The [methodology](/methodology) documents timing boundaries, statistical procedures
and limits. Rust, C++ and Python adapters share an input contract, but do not use
identical sampling procedures. A matching query name alone is insufficient to
establish a comparable experiment.

## Where the project lives

| Repository | Responsibility |
| --- | --- |
| [Core](https://github.com/spatial-bench/spatial-bench-core) | Workload selection, deterministic input generation, measurement and collation |
| [Benchers](https://github.com/spatial-bench/spatial-bench-benchers) | Library manifests, source pins, adapters and corpus selections |
| [Results](https://github.com/spatial-bench/spatial-bench-results) | Recorded runs, machine records and publication of database snapshots |
| [Web](https://github.com/spatial-bench/spatial-bench-web) | This website, public explanations and the results explorer |

Library manifests and drivers feed the engine. Run documents enter the results
repository through review. Its publication workflow collates the merged records
into a SQLite snapshot, which the explorer downloads and reads in your browser.
The explanatory pages are static and remain readable without that snapshot.

## Maintenance and independent review

Work is coordinated through the repositories' issues and pull requests. Library
authors can contribute adapters and explain relevant configuration choices.
Maintainer review should independently assess timing boundaries, workload
semantics, source pins and the evidence supplied by the contributor. Authorship
and review are separate roles; automated checks alone do not establish fairness
or answer correctness.

There is no published formal governance or independent certification process
claimed here. See the [contribution routes](/contribute) for proposing changes,
requesting coverage or questioning a measurement. The [coverage page](/coverage)
distinguishes names the engine recognizes from implementations with drivers and
workloads with actual results.
