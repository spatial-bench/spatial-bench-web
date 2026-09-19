---
title: Read a comparison
description: Set up a nearest-neighbour comparison, interpret query timings and inspect the source of a result.
---
For a nearest-neighbour workload, one of the more useful questions is how query
time changes as the index grows. The example below compares a single exact nearest
neighbour in a three-dimensional uniform point cloud, using an individual-query API
on a single thread. It is small enough to follow through by hand, and the same
controls work for anything else in the snapshot.

## Select the workload

Open the [explorer](/explore) and expand **chart controls**. Choose one
`machine_hash`, leave `config = default`, and add these filters:

| Filter | Value | Meaning |
| --- | --- | --- |
| `query` | `exact_nn` | Exact nearest neighbours |
| `k` | `1` | One result per query |
| `dims` | `3` | Three coordinates per point |
| `axis` | `f32` | 32-bit floating-point coordinates |
| `dataset` | `uniform` | Uniformly generated points |
| `metric` | `squared_euclidean` | Squared Euclidean distance |
| `parallelism` | `single_threaded` | The recorded single-threaded configuration |
| `query_batching` | `single_query` | One query per library call |
| `query_count` | `1000` | Probes in each timed pass |

Pick a dimension, choose its values, then press **add filter**. Values within a
single filter are alternatives, while separate filters all have to match. Add an
`impl` filter to choose libraries, and remove a filter with its `x` button before
replacing it.

> An empty chart means the published snapshot has no points matching the complete
> selection. Check [coverage](/coverage) before reading anything into that.

## Arrange the comparison

Set **chart key** to `axis`, **panel key** to `query`, and **series** to `impl` and
`version`, assigning both series fields to **colour**. Use **tree size** for x,
**latency** for y, and **latest run** for repeated measurements.

Keep every other workload and configuration dimension either fixed or separated
into series. If you leave one free, distinct cases can land on the same line and x
position, and only one of their measurements will be shown.

`default` and `tuned` are classifications derived from the library manifest rather
than claims about the library. Inspect a point's extension tags to see settings such
as leaf capacity, and remember that a `default` label does not mean different
libraries are using identical settings.

The version filter's **latest (per library)** option selects the highest measured
version remaining after the other filters; remove it to compare older releases,
keeping `version` in the series. It does not consult upstream release feeds. For
version comparisons, keep tree size on x, because the current version and date axis
controls do not give reliable categorical or time scales.

## Read the values

Latency is time per query, shown in nanoseconds, microseconds or milliseconds. The
plotted value is the recorded median, falling back to the mean, and summarizes
repeated passes over the probes. A parallel or batched result is amortized wall time
per query rather than the response time of a single request.

Throughput is derived from the mean latency, so it need not equal the reciprocal of
the median shown on the latency chart. On a logarithmic scale, equal spacing
represents the same proportional change.

| Repeated-run setting | Point selected at each x position |
| --- | --- |
| Latest run | The newest recorded timestamp in the grouped series |
| Best (median) | The lowest median, falling back to the mean |

Neither setting pools samples from separate runs, so a single line can contain points
drawn from several run documents.

> Confidence bounds in point details apply to the **mean**, even when the chart plots
> a median. The hover `±` label shows the full width of that mean interval, not an
> interval around the median. Use the explicit bounds and the
> [methodology](/methodology) when assessing uncertainty.

Within-run intervals say nothing about how the comparison would behave on another
machine or workload, and on their own they do not establish a statistically
significant difference between two libraries.

## Inspect and share a result

Select a point to see its run ID, measurement date, tags and available statistics.
Look that run ID up in the [results repository](https://github.com/spatial-bench/spatial-bench-results/tree/main/datasets),
where the [format guide](https://github.com/spatial-bench/spatial-bench-results/blob/main/docs/format-and-provenance.md)
traces the record through to its source versions and machine information.

Copy the full explorer URL to share the chart settings. Reloading restores them, but
the URL does not freeze the results snapshot, the selected point or the zoom level.
When you cite a measurement, include the run IDs it came from.