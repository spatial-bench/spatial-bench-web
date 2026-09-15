---
title: Read a comparison
description: Choose a workload, interpret chart statistics, inspect a recorded point, and share your view.
---
Start with a concrete question: *How does single-threaded exact nearest-neighbour
latency grow with tree size for three-dimensional uniform points?* Keep the
workload fixed while you compare implementations. Open the [explorer](/explore),
or use a featured workload link on the [home page](/).

## 1. Choose one machine and workload

Open **chart controls**. Filters apply together; multiple values within one filter
are alternatives. The initial view chooses one available machine and default
configurations, but leaves other workload dimensions open. It is an orientation
view, not a controlled library comparison.

For the example, add filters for `query = exact_nn`, `k = 1`, `dims = 3`,
`axis = f32`, `dataset = uniform`, `metric = squared_euclidean`,
`parallelism = single_threaded` and `query_batching = single_query`.
Keep `config = default`, choose one `machine_hash` and keep `query_count` fixed.
Use `impl` to choose libraries. Remove a filter with its × control before replacing it.

These terms specify one nearest neighbour, 32-bit floating-point coordinates and
an individual-query API. `exact_nn` also covers larger `k`; it does not always mean
one neighbour. Some adapters expose Euclidean distances and others squared
Euclidean distances. Check the metric and radius semantics before combining them.

The machine identifier points to a recorded hardware fingerprint. It is not a
complete description of operating conditions; inspect the run for toolchain,
operating system and available context. Missing filter combinations are missing
measurements, not zero cost or evidence that a library cannot implement them.

## 2. Decide what each line represents

Set **chart key** to `axis` and **panel key** to `query`, for example. Add `impl`
and `version` to **series** and assign both to **colour**. Each distinct combination
of series fields becomes a line. Remove unrelated initial series fields only when
you have already fixed them with filters.

Every dimension that can change interpretation must be fixed or explicitly
separated into charts, panels or series. Otherwise measurements with different
identities can collapse into the same line and x position.

**Default** and **tuned** describe configurations selected in the library manifest.
They do not guarantee identical settings across implementations. Compare defaults
first; inspect extension tags and the manifest before interpreting a tuned result.

The version filter's **latest (per library)** keeps the highest version present
for each library *after the other filters*. It does not query upstream releases.
To compare multiple measured versions, remove this filter and separate `version`
in the series. The UI currently offers “latest” rather than a list of explicit
version choices; saved chart specifications can contain explicit version filters.

## 3. Read axes and repeated measurements

For this comparison use **tree size** on x and **latency** on y. A logarithmic axis
shows ratios: equal spacing represents equal multiplicative changes, not equal
absolute changes. Latency is in nanoseconds per query; tick labels use ns, µs or ms.
Lower latency means less time for the measured query operation.

The latency line uses the recorded **median**, falling back to the **mean** when a
median is absent. Throughput is a separately stored value derived from the mean;
it is not generally the reciprocal of the displayed median. Higher throughput
means more queries per second within the driver's measurement boundary.

**Latest run** selects the newest timestamp at each x position within a grouped
series. **Best (median)** selects the smallest recorded median, falling back to the
mean. Neither pools observations or estimates a median across runs. A line may
therefore contain points from different run documents.

Tree size is the supported numeric comparison used here. Version and run-date
controls are also exposed, but the current chart renderer uses numeric scales;
those choices do not provide a reliable categorical or time-axis comparison.
Keep versions in series and inspect dates in point details instead.

## 4. Inspect a point and its evidence

Select a point to open its details, including run identifier, time, workload fields,
extension tags, sample count and dispersion. The detail label “latency (median)”
currently also covers the mean fallback. The stored lower and upper confidence
bounds describe the **mean**, not a confidence interval for the plotted median.
The hover badge's ± presentation is not a reliable statement of a symmetric
interval around that median; use the explicit bounds and [methods](/methodology).

MAD and standard deviation describe the recorded samples, not variation across
machines. Overlapping or separated bounds alone do not establish a statistically
significant difference between libraries. Driver overhead, operating conditions
and input selection also affect applicability to your program.

Copy the run identifier and find it in the
[run documents](https://github.com/spatial-bench/spatial-bench-results/tree/main/datasets).
The [provenance guide](https://github.com/spatial-bench/spatial-bench-results/blob/main/docs/format-and-provenance.md)
shows how to trace that record to its subjects' versions, source pins and machine.
Point IDs are snapshot-local; the run identifier is the useful link to the record.

## 5. Share a view, then test your own workload

Changes to chart controls update the address bar. Copy the full URL, including
`?spec=…`; reloading restores the specification. Existing links beginning at
`/?spec=…` continue to open the explorer. Zoom, the selected point and the database
snapshot itself are not encoded in that specification. A later snapshot can change
what the same URL displays, so include run identifiers when citing a result.

Use the comparison to select experiments for your own application. Consult
[coverage](/coverage) for missing workloads and [contribute](/contribute) to propose
new measurements, datasets, queries or library support.
