---
title: About spatial-bench
description: "About Spatial Bench: the spatial indexing library comparison and benchmarking site"
---

The Spatial Bench (spatial-bench.org) project is a collection of tools for
benchmarking spatial index libraries and an accompanying website for comparing
them based on their benchmark results.

Spatial Bench is aimed at two primary audiences:

- **Developers** who are looking to choose a spatial index library to use for an application
 and are looking to see how different implementations perform against each other and how
 different configurations of the same library affect performance on different workloads / queries.
- **Researchers and Library Authors** who are interested in benchmarking their own library or implementation
 on a consistent environment for comparison against other libraries or to see changes over time or with different
 workloads / features.


## Contributions

Spatial bench strives to be an independent resource for the benefit of the community. As such, all contributions
are welcome, such as:

- New Libraries / updated versions
- New test datasets
- New query types
- Updated methodologies
- Alternate hardware on which to run the suites

Contribution guidance lives with the code and records it applies to. Choose the
relevant repository from the [Spatial Bench GitHub organization](https://github.com/spatial-bench):

- [Core](https://github.com/spatial-bench/spatial-bench-core) for the engine, datasets and shared query types
- [Benchers](https://github.com/spatial-bench/spatial-bench-benchers) for library adapters and the standard corpus
- [Results](https://github.com/spatial-bench/spatial-bench-results) for benchmark submissions and publication
- [Web](https://github.com/spatial-bench/spatial-bench-web) for this website and its documentation

## Comparing libraries

* Browse to the results explorer page to configure a chart to compare different indexing libraries against different 
datasets and with different configurations to determiine which is most suitable for a given workload.
* Or, see how the performance of a given library has changed over time for the same workload, or on its latest release.
* Alternatively, see how the impact of different configuration parameters for the same version of a library influences
its performance on the same workload.

The [guide](/guide) works through an exact nearest-neighbour
comparison as a concrete example, and the [methodology](/methodology) describes the
experiment behind every measurement.
