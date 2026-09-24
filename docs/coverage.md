---
title: Benchmark coverage
description: Find the libraries and workloads represented in the results, and check whether a comparison fits your application.
---
Spatial Bench covers a selection of spatial index libraries for C++, Python and Rust. Don't see results for a 
particular library? See the contribution guidelines for now to add coverage for it.

## Types of queries that are benchmarked

* `exact_nn`: Exact nearest-neighbour queries. Covers different result counts through `k`: by default, for k=1, k=5, k=20 and k=50.
* `within_radius`: Queries that return all points within a specified radius of a given point. 
* `nearst_n_within`: A combination of the first two; return the nearest n points within a specified radius of a given query point.
* `best_n_within`: Select the 'best' n items within a speified radius of a given point, where 'best' is defined by the sort order
  of the item stored for a given point, typically an index into a list of the points. For example, queries like "what are the three
 largest cities within 20km of a given point".

* The [methodology](/methodology) describes these query families aad the radius interpretation currently in use.

An adapter may cover only part of its library's API, so check the [manifests](https://github.com/spatial-bench/spatial-bench-benchers/tree/master/subjects) when you need support beyond what has been measured.

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
shared query type, start in the [core repository](https://github.com/spatial-bench/spatial-bench-core).
