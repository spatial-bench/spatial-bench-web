---
title: Read a comparison
description: Set up a nearest-neighbour comparison, interpret query timings and inspect the source of a result.
---
For a nearest-neighbour workload, a useful question is how query time changes
as the index grows. This example compares one exact nearest neighbour in a
three-dimensional uniform point cloud, using an individual-query API on one thread.

## Select the workload

Open the [explorer](/explore) and expand **chart controls**. Choose one
`machine_hash`, keep `config = default`, and add these filters:

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

Select a dimension and its values, then press **add filter**. Values within a
filter are alternatives; separate filters apply together. Use `impl` to choose
libraries. Remove a filter with its `x` button before replacing it.

> An empty chart means no points in the published snapshot match the complete
> selection. Check [coverage](/coverage) before drawing conclusions about a library.

## Arrange the comparison

Set **chart key** to `axis`, **panel key** to `query`, and **series** to `impl`
and `version`. Assign both series fields to **colour**. Use **tree size** for x,
**latency** for y, and **latest run** for repeated measurements.

Keep other workload and configuration dimensions fixed or separate them into
series. Otherwise, distinct cases can occupy the same line and x position, and
only one of their measurements will be shown.

`default` and `tuned` are classifications derived from the library manifest.
Inspect a point's extension tags for settings such as leaf capacity. A default
label does not mean that different libraries use identical settings.

The version filter's **latest (per library)** selects the highest measured
version remaining after other filters. Remove it to compare older releases,
keeping `version` in the series. The filter does not check upstream releases.
For version comparisons, retain tree size on x: the current version/date axis
controls do not provide reliable categorical or time scales.

## Read the values

Latency is time per query, displayed in nanoseconds, microseconds or milliseconds.
The plotted value is the recorded median, with a mean fallback. It summarizes
repeated passes over the probes. A parallel or batched result is amortized wall
time per query, rather than the response time of an individual request.

Throughput is derived from the mean latency. It can therefore differ from the
reciprocal of the median shown on the latency chart. A logarithmic scale displays
ratios: the same spacing represents the same proportional change.

| Repeated-run setting | Point selected at each x position |
| --- | --- |
| Latest run | The newest recorded timestamp in the grouped series |
| Best (median) | The lowest median, falling back to the mean |

Neither setting combines samples from separate runs. A line can contain points
from several run documents.

> Confidence bounds in point details apply to the **mean**, even when the chart
> plots a median. The hover `±` label shows the full mean-interval width; it is
> not an interval around the median. Use the explicit bounds and the
> [methodology](/methodology) when assessing uncertainty.

Within-run intervals do not establish how a comparison will behave on another
machine or workload. They also do not, by themselves, establish a statistically
significant difference between libraries.

## Inspect and share a result

Select a point to open its run ID, measurement date, tags and available statistics.
Find that run ID in the [results repository](https://github.com/spatial-bench/spatial-bench-results/tree/main/datasets);
its [format guide](https://github.com/spatial-bench/spatial-bench-results/blob/main/docs/format-and-provenance.md)
traces the record to source versions and machine information.

Copy the full explorer URL to share the chart settings. Reloading restores them,
but the URL does not freeze the results snapshot, selected point or zoom. Include
run IDs when citing a measurement.
