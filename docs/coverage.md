---
title: Benchmark coverage
description: Find the libraries and workloads represented in the results, and check whether a comparison fits your application.
---
Coverage depends on the library, the version and the workload. The [explorer](/explore)
shows the combinations present in the currently published snapshot, while the
library manifests describe the cases that are available to run.

## Recorded libraries and queries

The [results records at 490451b](https://github.com/spatial-bench/spatial-bench-results/tree/490451b)
contain the following coverage; use the explorer for the current published view.

| Library | Interface | Recorded queries |
| --- | --- | --- |
| [Kiddo](https://github.com/sdd/kiddo) | Rust | Exact nearest neighbours and radius-related queries |
| [kdtree](https://github.com/mrhooray/kdtree-rs) | Rust | Exact nearest neighbours |
| [nanoflann](https://github.com/jlblancoc/nanoflann) | C++ | Exact nearest neighbours |
| [pykdtree](https://github.com/storpipfugl/pykdtree) | Python | Exact nearest neighbours |

`exact_nn` covers different result counts through `k`. Radius queries carry
additional distance, boundary and ordering semantics: Kiddo's `best_n_within`
selects by item priority, which is a different operation from choosing the nearest
results by distance. The [methodology](/methodology) describes these query families
and the radius interpretation currently in use.

An adapter may cover only part of its library's API, so check the
[manifests](https://github.com/spatial-bench/spatial-bench-benchers/tree/master/subjects)
when you need support beyond what has been measured.

## Inputs and configurations

These records use three-dimensional uniform point clouds with `f32` and `f64`
coordinates. The generator also supports Gaussian inputs, but generated capability
and published coverage are separate things, and there is currently no general import
path for application datasets.

Match metric, result count, batching and threading when choosing a comparison.
Euclidean and squared Euclidean metrics give the same nearest-neighbour ordering for
finite distances while using different distance units and arithmetic. Construction
time, memory consumption and approximate-search recall all need measurements beyond
the query-latency plots on this site.

The [reading guide](/guide) demonstrates the filters and grouping. Start there
before applying a result from uniform three-dimensional inputs to a clustered,
high-dimensional or mixed update/query workload.

## Request more coverage

If a selection comes back empty, remove filters until you can identify the missing
combination, then check the library manifest. For an additional library operation or
configuration, [open a bencher issue](https://github.com/spatial-bench/spatial-bench-benchers/issues)
with the query semantics and the workload you need. For a new input distribution or
shared query type, use the [core extension guides](/contribute#extend-the-benchmark).