---
title: Methodology
description: Workload definitions, timing boundaries, statistical estimates and reproducibility of spatial-bench measurements.
---

spatial-bench measures repeated spatial queries against an index built from
generated points. Each recorded point describes one library version and
configuration executing a specified workload on one machine. The measured time
includes the adapter's calls and its handling of results, normalized by the number
of probes executed.

## Experimental unit and workloads

A case specifies `tree_size` construction points and `query_count` probes, with tags
for distribution, dimension, scalar type, metric, query, batching and parallelism.
Library-specific parameters use namespaced tags. Comparisons should hold all of
these dimensions constant apart from the factors being studied; the
[reading guide](/guide) shows how to express that selection in the explorer.

The shared generator gives every adapter either `uniform` coordinates in `[0,1)` or
standard-normal `gaussian` coordinates, and the selected distribution applies to
both the construction points and the probes. It uses ChaCha8 with PCG32 seed
expansion, and a Box-Muller transform for Gaussian values. The CLI defaults to
construction seed **42** and probe seed **43**; supplying a seed `s` uses `s` and
`s + 1`, with unsigned 64-bit wrapping. Scalar conversion differs between `f32` and
`f64`, so changing precision can also change the generated points, and Gaussian
calculation depends on platform transcendental functions. [Generator][generator]

`exact_nn` requests the `k` nearest results. Euclidean and squared Euclidean metrics
preserve the ranking of finite distances while using different distance units.
Kiddo's `within_radius` and `best_n_within` use the threshold
`r = (3 * 100 / (4 * pi * tree_size))^(1/3)`, passed directly to a
`SquaredEuclidean` query. That heuristic assumes a three-dimensional uniform volume:
it is neither squared nor adjusted for other dimensions, Gaussian inputs or
boundaries, and it does not guarantee 100 results. `best_n_within` selects by item
priority. Comparing radius implementations therefore requires matching their
threshold units, boundary inclusion and result ordering. [Kiddo driver][kiddo]

The engine computes `defaults_or_tuned` by comparing a case against all declared
manifest defaults: every value matching yields `default`, and any mismatch yields
`tuned`. An empty defaults map labels every case `default`. Review is what
establishes whether those declarations match the library's normal API settings, and
how any tuned configurations were chosen. [Catalog loading][catalog]

## Timed operations

Adapters read or generate their inputs and build the index before warm-up. Each
timed body then traverses the complete probe set, reusing both that index and those
probes across samples. The implemented query drivers do not provide separate
construction timings. The work inside the timed body differs at the API boundary:

| Adapter | Work inside the timed body |
| --- | --- |
| Rust kdtree | Per-probe `nearest`, result allocation/destruction and a checksum using the last result |
| Rust Kiddo | Single-query or batch calls, result allocation/consumption and checksum |
| C++ nanoflann | Per-probe `findNeighbors`, reuse of preallocated result buffers and consumption of every result index |
| Python pykdtree | Python iteration, input reshape/type conversion, binding calls and result processing; bulk calls for batch cases |

The Rust wrapper black-boxes the checksum while nanoflann updates a sink, so
allocation and language-binding differences are part of the measured operation
rather than overhead outside it. [Driver implementations][drivers]

`single_query` makes one call per probe. `batch_query` chunks probes according to
`query_batch_size`, including a shorter final chunk when the division is uneven. In
both cases normalization uses the total `query_count`. Kiddo selects a serial or
parallel executor from `parallelism`; batching by itself does not imply parallel
execution. A parallel batch's normalized wall time is an amortized cost per query
rather than the response time of one request. The pykdtree adapter accepts
`single_threaded`, but dependency thread counts and CPU affinity still have to be
controlled externally.

The perf runner starts one case per process under `perf stat`, so its counters cover
startup, input preparation, index construction, warm-up, measurement and
analysis/output. They are process totals without per-query normalization, and
unavailable counters are omitted. Latency still comes from the adapter's own timer.
Dividing a process counter by `query_count` would discard the repeated probe passes
performed during warm-up and measurement. [Perf runner][perf]

## Sampling and statistical estimates

The version 2 harness requests **3,000 ms warm-up**, **5,000 ms measurement** and
**30 samples** per case, and the CLI uses these defaults without exposing budget
flags. Rust and exec adapters receive the same budget but collect their samples
differently. [Harness contract][harness]

### Sample collection

The Rust wrapper uses Criterion `0.8`, overriding warm-up time, measurement time and
sample count. Criterion estimates body cost during warm-up and then selects linear
or flat sampling, which means a single sample can contain several complete probe
passes. Because the measurement duration is a scheduling target rather than a hard
limit, collection can exceed it. The wrapper requires positive durations and at
least 10 samples, and reads the mean estimate from `estimates.json` rather than the
optional regression slope. [Measurement wrapper][measurement]

The C++ executable adapters use `steady_clock`, while the Python executable adapters
use `perf_counter_ns`. After warm-up, each sample times one complete probe pass.
Collection stops when **either** the requested sample count or the measurement time
is reached, with the deadline checked between bodies: a fast case can finish 30
samples well before five seconds, while the last body of a slow case can overshoot.
The Python adapters and nanoflann reject an empty sample set; the other C++ adapters
do not currently guard against one. None uses a stopping rule based on statistical
precision. [Executable sampling contract][exec-sampling], [current adapters][exec-drivers]

### Normalization and estimates

For sample `i`, let `t_i` be the elapsed nanoseconds, `b_i` the number of complete
probe passes it covered, and `Q` the probes per pass. The normalized observation is
`x_i = t_i / (b_i * Q)`; the exec loops always have `b_i = 1`.

```text
latency_ns.point = arithmetic mean of x_i
throughput_qps.point = 1,000,000,000 / latency_ns.point
```

Rust obtains estimates of time per body from Criterion and divides the mean, bounds
and dispersion estimates by `Q`. The table specifies the inspected Criterion 0.8.2
implementation and the current exec loops:

| Quantity | Rust / Criterion | C++ and Python executable adapters |
| --- | --- | --- |
| Mean interval | 95% bootstrap interval; 100,000 resamples by default | `mean +/- 1.96 * SD / sqrt(n)` |
| Standard deviation | Denominator `n - 1` | Denominator `n` |
| Median | Interpolated 50th percentile | Sorted observation at zero-based index `floor(n/2)` |
| Median absolute deviation (MAD) | Median absolute deviation multiplied by `1.4826` | Upper-middle absolute deviation, unscaled; the newer C++ shims currently report zero instead |
| Sample count | Length of Criterion's `sample.json.times` | Number of timed probe passes |

Criterion classifies Tukey outliers but retains them for these estimates. Its
resolved version and raw samples are not included in the submitted JSON, so retain
the build lockfile and temporary sample directory when those are needed; a missing
Criterion sample file leaves the count absent. [Criterion configuration][criterion], [analysis][analysis],
[dispersion definitions][dispersion]

These estimates describe variation among average probe-pass costs, not a per-query
latency distribution. The exec bounds use a normal approximation, and a single
sample yields a zero-width interval without establishing repeatability. Serial
dependence, small samples and scheduler interference can all reduce nominal
coverage. Within-run bounds also exclude variability between independent runs, seeds
or machines, so overlapping intervals are not a significance test.

### Displayed values and repeated runs

The explorer plots `median_ns` for latency when it is present, falling back to the
mean, while throughput remains the reciprocal of the mean. Lower and upper
confidence bounds refer to the **mean** even when they are displayed beside a
median. At the referenced explorer revision, the hover tooltip's `+/-` value is the
full mean-interval width (`upper - lower`), not a median half-width. [Point display][display]

Within a grouped series and a given x value, `latest` selects the greatest
`started_at` and `median` selects the **smallest** median, falling back to the mean.
Neither pools samples. Workload dimensions left out of filtering or grouping can
therefore make different cases compete for the same displayed point. Latest-version
filtering chooses the highest version available per library after the ordinary
filters, independently of upstream releases. Because picking the best configuration
or rerun can bias a comparison, the selection procedure belongs with the
interpretation. [Grouping][grouping]

## Environment and reproducibility

Rust subjects share a resolved toolchain, normally the highest declared minimum
unless overridden. Native ISA choices and manifest C++ flags can enable
machine-specific instructions. Run context records the available kernel, OS,
governor, SMT, boost and CPU-isolation settings, but experimental control of
affinity, thermal state, background load and dependency threads remains the
operator's responsibility. Repeated probes against a retained index describe a
warmed workload. [Run pipeline][run]

Fingerprint validation compares host observations against a captured record. The
full machine hash is the continuity key; incomplete observations can mark it
`degraded`, and an unfingerprinted run carries an `UNKNOWN` suffix. The checksum uses
a public constant key, so it provides accidental-change detection rather than
attestation of the operator. [Fingerprint implementation][fingerprint]

Subject provenance identifies either a Git revision or the SHA-256 of the installed
PyPI distribution. Reproduction also needs details the current run record omits: the
generator seed, the budget, the exact engine and bencher revisions, resolved
dependencies, and C++ or Python toolchain versions. Engine `git_sha` is absent, and
`git_dirty` marks subject-path overrides rather than inspecting Git status. Preserve
the invocation, source revisions and build/runtime records alongside the review
evidence. The [results provenance guide][provenance] explains the stored fields and
how they project into the website database.

## Scope of comparisons

Registration conformance matches driver registrations to the cases a manifest
declares. What it does not do is establish that queries return correct answers or
that the timed operation means what it claims; an independent review of the adapter
has to cover query-answer correctness, operation semantics and timing boundaries.
Conformance alone is not an independent rerun either. Driver support and published
measurements are distinct from the engine's vocabulary, as described in
[coverage](/coverage), and missing measurements indicate missing coverage rather
than a slow library. Applying a result to other distributions, update patterns or
concurrency settings requires measurements of those workloads.

## Implementation references

These methods describe engine `2104bfe`, benchers `1972c50`, explorer `7551596` and
the inspected Criterion 0.8.2 source at `7f0d745`. The generalized executable
sampling description also covers the adapters present in benchers `14ed2d2`. Source
links are pinned; use a historical run's retained build records to determine its
actual dependencies.

[generator]: https://github.com/spatial-bench/spatial-bench-core/blob/2104bfe8b2ba04c31ee484e9a9aee4f0c5df0f79/crates/spatial-bench-dataset/src/main.rs
[kiddo]: https://github.com/spatial-bench/spatial-bench-benchers/blob/1972c5004eb5c6e4b9969f5b80331d02cc9af06c/subjects/kiddo/driver/src/lib.rs
[catalog]: https://github.com/spatial-bench/spatial-bench-core/blob/2104bfe8b2ba04c31ee484e9a9aee4f0c5df0f79/crates/spatial-bench-core/src/catalog_load.rs
[drivers]: https://github.com/spatial-bench/spatial-bench-benchers/tree/1972c5004eb5c6e4b9969f5b80331d02cc9af06c/subjects
[perf]: https://github.com/spatial-bench/spatial-bench-core/blob/2104bfe8b2ba04c31ee484e9a9aee4f0c5df0f79/crates/spatial-bench-core/src/perf.rs
[harness]: https://github.com/spatial-bench/spatial-bench-core/blob/2104bfe8b2ba04c31ee484e9a9aee4f0c5df0f79/crates/spatial-bench-core/src/harness.rs
[measurement]: https://github.com/spatial-bench/spatial-bench-core/blob/2104bfe8b2ba04c31ee484e9a9aee4f0c5df0f79/crates/spatial-bench-measure/src/lib.rs
[exec-sampling]: https://github.com/spatial-bench/spatial-bench-benchers/blob/14ed2d29213604f6d60b99a806d9b783e81a50a3/docs/driver-contract.md#c-and-python
[exec-drivers]: https://github.com/spatial-bench/spatial-bench-benchers/tree/14ed2d29213604f6d60b99a806d9b783e81a50a3/subjects
[analysis]: https://github.com/criterion-rs/criterion.rs/blob/7f0d745532e3c7b2e11bbf9de9b911f91790d3b1/src/analysis/mod.rs
[dispersion]: https://github.com/criterion-rs/criterion.rs/blob/7f0d745532e3c7b2e11bbf9de9b911f91790d3b1/src/stats/univariate/sample.rs
[display]: https://github.com/spatial-bench/spatial-bench-web/blob/755159672d2601f6eb5a40a16e9b0fb9c0e96b8a/src/components/BenchChart.tsx
[grouping]: https://github.com/spatial-bench/spatial-bench-web/blob/755159672d2601f6eb5a40a16e9b0fb9c0e96b8a/src/engine/group.ts
[run]: https://github.com/spatial-bench/spatial-bench-core/blob/2104bfe8b2ba04c31ee484e9a9aee4f0c5df0f79/crates/spatial-bench-core/src/run.rs
[fingerprint]: https://github.com/spatial-bench/spatial-bench-core/blob/2104bfe8b2ba04c31ee484e9a9aee4f0c5df0f79/crates/spatial-bench-core/src/fingerprint.rs
[provenance]: https://github.com/spatial-bench/spatial-bench-results/blob/main/docs/format-and-provenance.md

[criterion]: https://github.com/criterion-rs/criterion.rs/blob/7f0d745532e3c7b2e11bbf9de9b911f91790d3b1/src/lib.rs
