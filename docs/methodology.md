---
title: Methodology
description: Workload definitions, timing boundaries, statistical estimates and reproducibility of spatial-bench measurements.
---

spatial-bench measures repeated spatial queries against an index built from
generated points. Each point describes a library version and configuration
executing a specified workload on one machine. Query time includes the adapter's
calls and result handling, normalized by the number of probes.

## Experimental unit and workloads

A case specifies `tree_size` construction points and `query_count` probes, with
tags for distribution, dimension, scalar type, metric, query, batching and
parallelism. Library parameters use namespaced tags. Comparisons should hold
these dimensions constant except for the factors being studied; the
[reading guide](/guide) shows how to express that selection.

The shared generator supplies every adapter with `uniform` coordinates in
`[0,1)` or standard-normal `gaussian` coordinates. Both construction points and
probes use the selected distribution. It uses ChaCha8 with PCG32 seed expansion
and a Box-Muller transform for Gaussian values. The CLI defaults to construction
seed **42** and probe seed **43**; a supplied seed `s` uses `s` and `s + 1`, with
unsigned 64-bit wrapping. Scalar conversions differ between `f32` and `f64`, so
changing precision can also change the generated points. Gaussian calculations
depend on platform transcendental functions. [Generator][generator]

`exact_nn` requests `k` nearest results. Euclidean and squared Euclidean metrics
preserve the ranking of finite distances but use different distance units.
Kiddo's `within_radius` and `best_n_within` use the threshold
`r = (3 * 100 / (4 * pi * tree_size))^(1/3)`, passed directly to a
`SquaredEuclidean` query. This three-dimensional uniform-volume heuristic is
neither squared nor adjusted for other dimensions, Gaussian inputs or boundaries;
it does not guarantee 100 results. `best_n_within` selects by item priority.
Comparing radius implementations requires matching their threshold units,
boundary inclusion and result ordering. [Kiddo driver][kiddo]

The engine computes `defaults_or_tuned` by comparing a case with all declared
manifest defaults: every value matching yields `default`; any mismatch yields
`tuned`. An empty defaults map labels every case `default`. Review establishes
whether those declarations match the library's normal API settings and how tuned
configurations were selected. [Catalog loading][catalog]

## Timed operations

Adapters generate/read inputs and build the index before warm-up. Each timed
body then traverses the complete probe set, reusing that index and those probes
across samples. The implemented query drivers do not provide separate
construction timings. Their measured work differs at the API boundary:

| Adapter | Work inside the timed body |
| --- | --- |
| Rust kdtree | Per-probe `nearest`, result allocation/destruction and a checksum using the last result |
| Rust Kiddo | Single-query or batch calls, result allocation/consumption and checksum |
| C++ nanoflann | Per-probe `findNeighbors`, reuse of preallocated result buffers and consumption of every result index |
| Python pykdtree | Python iteration, input reshape/type conversion, binding calls and result processing; bulk calls for batch cases |

The Rust wrapper black-boxes the checksum; nanoflann updates a sink. Allocation
and language-binding differences are therefore part of the measured operation.
[Driver implementations][drivers]

`single_query` makes one call per probe. `batch_query` uses `query_batch_size`
chunks, including a shorter final chunk when necessary. Normalization uses the
total `query_count`. Kiddo selects a serial or parallel executor from
`parallelism`; batching itself does not imply parallel execution. A parallel
batch's normalized wall time is an amortized cost per query, rather than the
response time of one request. The pykdtree adapter accepts `single_threaded`,
but dependency thread counts and CPU affinity still require environmental control.

The perf runner starts one case per process under `perf stat`. Counters cover
startup, input preparation, index construction, warm-up, measurement and
analysis/output. They are process totals, without per-query normalization;
unavailable counters are omitted. Latency still comes from the adapter's timer.
Dividing a process counter by `query_count` would omit the repeated probe passes
performed during warm-up and measurement. [Perf runner][perf]

## Sampling and statistical estimates

The version 2 harness requests **3,000 ms warm-up**, **5,000 ms measurement** and
**30 samples** per case. The CLI uses these defaults without exposing budget
flags. Rust and exec adapters receive the same budget but use different sampling
procedures. [Harness contract][harness]

### Sample collection

The Rust wrapper uses Criterion `0.8`, overriding warm-up time, measurement time
and sample count. Criterion estimates body cost during warm-up and selects linear
or flat sampling; one sample can contain several complete probe passes. The
measurement duration is a scheduling target, so collection can exceed it. The
wrapper requires positive durations and at least 10 samples. It reads the mean
estimate from `estimates.json`, rather than the optional regression slope.
[Measurement wrapper][measurement]

nanoflann uses `steady_clock`; pykdtree uses `perf_counter_ns`. After warm-up,
each sample times one complete probe pass. Collection stops when **either** the
requested count or measurement time is reached, with the deadline checked between
bodies. A fast case can finish 30 samples before five seconds; the last body of a
slow case can overshoot. Zero samples is an error. There is no stopping rule based
on statistical precision. [C++ sampling][nanoflann], [Python sampling][python]

### Normalization and estimates

For sample `i`, let `t_i` be elapsed nanoseconds, `b_i` the number of complete
probe passes and `Q` the probes per pass. The normalized observation is
`x_i = t_i / (b_i * Q)`; the exec loops have `b_i = 1`.

```text
latency_ns.point = arithmetic mean of x_i
throughput_qps.point = 1,000,000,000 / latency_ns.point
```

Rust obtains estimates of time per body from Criterion and divides the mean,
bounds and dispersion estimates by `Q`. The table specifies the inspected
Criterion 0.8.2 implementation and current exec loops:

| Quantity | Rust / Criterion | nanoflann and pykdtree |
| --- | --- | --- |
| Mean interval | 95% bootstrap interval; 100,000 resamples by default | `mean +/- 1.96 * SD / sqrt(n)` |
| Standard deviation | Denominator `n - 1` | Denominator `n` |
| Median | Interpolated 50th percentile | Sorted observation at zero-based index `floor(n/2)` |
| Median absolute deviation (MAD) | Median absolute deviation multiplied by `1.4826` | Upper-middle absolute deviation, unscaled |
| Sample count | Length of Criterion's `sample.json.times` | Number of timed probe passes |

Criterion classifies Tukey outliers but retains them for these estimates. Its
resolved version and raw samples are not included in the submitted JSON; retain
the build lockfile and temporary sample directory when these are needed. A missing
Criterion sample file leaves the count absent. [Criterion configuration][criterion], [analysis][analysis],
[dispersion definitions][dispersion]

These estimates describe variation among average probe-pass costs, not a
per-query latency distribution. The exec bounds use a normal approximation;
one sample yields a zero-width interval without establishing repeatability.
Serial dependence, small samples and scheduler interference can reduce nominal
coverage. Within-run bounds also exclude variability between independent runs,
seeds or machines; overlap alone is not a significance test.

### Displayed values and repeated runs

The explorer plots `median_ns` for latency when present, falling back to the mean.
Throughput remains the reciprocal of the mean. Lower and upper confidence bounds
refer to the **mean**, including when displayed beside a median. At the referenced
explorer revision, the hover tooltip's `+/-` value is the full mean-interval width
(`upper - lower`), not a median half-width. [Point display][display]

Within a grouped series and x value, `latest` selects the greatest `started_at`;
`median` selects the **smallest** median, falling back to mean. Neither pools
samples. Workload dimensions omitted from filtering/grouping can therefore make
different cases compete for one displayed point. Latest-version filtering chooses
the highest version available per library after ordinary filters, independently
of upstream releases. Selecting the best configuration or rerun can bias a
comparison, so the selection procedure belongs with its interpretation.
[Grouping][grouping]

## Environment and reproducibility

Rust subjects share a resolved toolchain, normally the highest declared minimum
unless overridden. Native ISA choices and manifest C++ flags can enable
machine-specific instructions. Run context records available kernel, OS, governor,
SMT, boost and CPU-isolation settings; experimental control of affinity, thermal
state, background load and dependency threads remains the operator's responsibility.
Repeated probes on a retained index describe a warmed workload. [Run pipeline][run]

Fingerprint validation compares host observations with a captured record. The
full machine hash is the continuity key; incomplete observations can mark it
`degraded`, while an unfingerprinted run has an `UNKNOWN` suffix. The checksum uses
a public constant key, providing accidental-change detection rather than
attestation of the operator. [Fingerprint implementation][fingerprint]

Subject provenance identifies a Git revision or the SHA-256 of the installed
PyPI distribution. Reproduction also needs details omitted by the current run
record: generator seed, budget, exact engine/bencher revisions, resolved
dependencies and C++/Python toolchain versions. Engine `git_sha` is absent and
`git_dirty` marks subject-path overrides rather than inspecting Git status.
Preserve the invocation, source revisions and build/runtime records with the
review evidence. The [results provenance guide][provenance] explains the stored
fields and their projection into the website database.

## Scope of comparisons

Registration conformance matches driver registrations to declared cases.
Independent review of the adapter must establish query-answer correctness,
operation semantics and timing boundaries; conformance alone does not establish
an independent rerun. Driver support and published measurements are distinct
from the engine's vocabulary, as described in [coverage](/coverage). Missing
measurements indicate missing coverage. Applying a result to other distributions,
update patterns or concurrency settings requires measurements of those workloads.

## Implementation references

These methods describe engine `2104bfe`, benchers `1972c50`, explorer `7551596`
and the inspected Criterion 0.8.2 source at `7f0d745`. Source links are pinned;
use a historical run's retained build records to determine its actual dependencies.

[generator]: https://github.com/spatial-bench/spatial-bench-core/blob/2104bfe8b2ba04c31ee484e9a9aee4f0c5df0f79/crates/spatial-bench-dataset/src/main.rs
[kiddo]: https://github.com/spatial-bench/spatial-bench-benchers/blob/1972c5004eb5c6e4b9969f5b80331d02cc9af06c/subjects/kiddo/driver/src/lib.rs
[catalog]: https://github.com/spatial-bench/spatial-bench-core/blob/2104bfe8b2ba04c31ee484e9a9aee4f0c5df0f79/crates/spatial-bench-core/src/catalog_load.rs
[drivers]: https://github.com/spatial-bench/spatial-bench-benchers/tree/1972c5004eb5c6e4b9969f5b80331d02cc9af06c/subjects
[perf]: https://github.com/spatial-bench/spatial-bench-core/blob/2104bfe8b2ba04c31ee484e9a9aee4f0c5df0f79/crates/spatial-bench-core/src/perf.rs
[harness]: https://github.com/spatial-bench/spatial-bench-core/blob/2104bfe8b2ba04c31ee484e9a9aee4f0c5df0f79/crates/spatial-bench-core/src/harness.rs
[measurement]: https://github.com/spatial-bench/spatial-bench-core/blob/2104bfe8b2ba04c31ee484e9a9aee4f0c5df0f79/crates/spatial-bench-measure/src/lib.rs
[nanoflann]: https://github.com/spatial-bench/spatial-bench-benchers/blob/1972c5004eb5c6e4b9969f5b80331d02cc9af06c/subjects/nanoflann/shim.cpp
[python]: https://github.com/spatial-bench/spatial-bench-benchers/blob/1972c5004eb5c6e4b9969f5b80331d02cc9af06c/subjects/pykdtree/driver.py
[analysis]: https://github.com/criterion-rs/criterion.rs/blob/7f0d745532e3c7b2e11bbf9de9b911f91790d3b1/src/analysis/mod.rs
[dispersion]: https://github.com/criterion-rs/criterion.rs/blob/7f0d745532e3c7b2e11bbf9de9b911f91790d3b1/src/stats/univariate/sample.rs
[display]: https://github.com/spatial-bench/spatial-bench-web/blob/755159672d2601f6eb5a40a16e9b0fb9c0e96b8a/src/components/BenchChart.tsx
[grouping]: https://github.com/spatial-bench/spatial-bench-web/blob/755159672d2601f6eb5a40a16e9b0fb9c0e96b8a/src/engine/group.ts
[run]: https://github.com/spatial-bench/spatial-bench-core/blob/2104bfe8b2ba04c31ee484e9a9aee4f0c5df0f79/crates/spatial-bench-core/src/run.rs
[fingerprint]: https://github.com/spatial-bench/spatial-bench-core/blob/2104bfe8b2ba04c31ee484e9a9aee4f0c5df0f79/crates/spatial-bench-core/src/fingerprint.rs
[provenance]: https://github.com/spatial-bench/spatial-bench-results/blob/main/docs/format-and-provenance.md

[criterion]: https://github.com/criterion-rs/criterion.rs/blob/7f0d745532e3c7b2e11bbf9de9b911f91790d3b1/src/lib.rs
