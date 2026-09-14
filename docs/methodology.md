---
title: Methodology
description: Measurement boundaries, sampling, estimators, provenance and limitations of spatial-bench comparisons.
---

## What the experiment measures

spatial-bench measures an implementation executing a specified workload on a
recorded machine. A point describes a library version, driver configuration,
input distribution, scalar type, dimension, operation and execution mode. Its
latency is elapsed time per query averaged over a repeated set of probes. It is
not an individual query latency distribution, an end-to-end application
benchmark, or a ranking independent of workload and hardware.

This methods audit covers engine **2104bfe**, benchers **1972c50**, and explorer
**7551596**, inspected on **14 September 2026**. Links below pin those source
revisions. Historical run documents can have different drivers and dependencies;
the present implementation does not retroactively describe every published run.
Use the [reading guide](/guide) to construct a comparison and the
[results provenance guide](https://github.com/spatial-bench/spatial-bench-results/blob/main/docs/format-and-provenance.md)
to audit its underlying record.

## Workload and input specification

The engine expands manifest cases and selectors into tags. Match at least
`dataset`, `dims`, `axis`, `query`, `k` where applicable, `tree_size`,
`query_count`, `query_batching`, `query_batch_size`, `parallelism`, `isa`, and
configuration when interpreting a comparison. Namespaced tags describe library
choices such as leaf capacity and tree layout. A supported vocabulary word is
not evidence that a driver implements it or that it has published measurements.
See [coverage](/coverage).

Harness version 2 supplies a `RunSpec` containing a budget and case specifications.
Drivers obtain construction points and probes from the same companion generator.
The CLI's default `random_seed` is **42**; construction uses that seed and probes
use the seed plus one, with wrapping unsigned 64-bit addition. This replaces the
older per-language fixed-seed path: the legacy `POINT_SEED` and `QUERY_SEED`
constants in the harness are not the current CLI seed selection.
[Harness](https://github.com/spatial-bench/spatial-bench-core/blob/2104bfe8b2ba04c31ee484e9a9aee4f0c5df0f79/crates/spatial-bench-core/src/harness.rs),
[CLI](https://github.com/spatial-bench/spatial-bench-core/blob/2104bfe8b2ba04c31ee484e9a9aee4f0c5df0f79/crates/spatial-bench-cli/src/main.rs).

The generator uses ChaCha8 with PCG32 seed expansion. `uniform` produces
coordinates in `[0,1)`; `gaussian` uses Box–Muller transforms for standard normal
coordinates. Both construction points and probes use the selected distribution.
It emits `f32` or `f64` coordinates in a native-endian binary stream for local
consumption. Scalar types consume/convert the random stream differently; changing
precision need not preserve the same numerical points. Gaussian transcendental
functions also limit claims of bitwise equivalence across platforms. Drivers at a
fixed generator revision, seed, shape and scalar type share the input mechanism;
there is no current arbitrary-file upload or real-world input import contract.
[Generator](https://github.com/spatial-bench/spatial-bench-core/blob/2104bfe8b2ba04c31ee484e9a9aee4f0c5df0f79/crates/spatial-bench-dataset/src/main.rs).

`exact_nn` requests `k` nearest results. Metric tags matter: Euclidean and squared
Euclidean rank finite distances equivalently but return different distance units
and can do different arithmetic. Radius operations require an additional audit of
the driver's threshold and the library's boundary/ordering semantics. In the
current Kiddo driver, `within_radius` and `best_n_within` receive
`r = (3 × 100 / (4π × tree_size))^(1/3)` directly in a `SquaredEuclidean` query.
That is a three-dimensional uniform-volume heuristic, not a recorded radius
parameter or a guarantee of 100 hits. The formula is not adjusted for dimensions,
Gaussian inputs or boundaries, and the driver does not square its output before
passing it to the metric API. `best_n_within` uses Kiddo's item-priority operation,
not nearest-`k` ordering. Reuse of this label across libraries requires explicit
semantic checks; registration conformance does not check returned answers.
[Kiddo driver](https://github.com/spatial-bench/spatial-bench-benchers/blob/1972c5004eb5c6e4b9969f5b80331d02cc9af06c/subjects/kiddo/driver/src/lib.rs),
[conformance](https://github.com/spatial-bench/spatial-bench-core/blob/2104bfe8b2ba04c31ee484e9a9aee4f0c5df0f79/crates/spatial-bench-core/src/conform.rs).

## Timed regions and execution modes

The inspected query drivers generate/read inputs and build the index before
warm-up and timing. They reuse the same index and probes across samples. The
measured body performs a complete probe pass and consumes result items through a
checksum. Rust black-boxes the returned checksum; nanoflann updates a sink.
Allocation, conversion, result traversal and destruction performed inside that
body contribute to latency. They differ by adapter:

| Driver | Setup outside query timing | Work included in the measured body |
| --- | --- | --- |
| Rust `kdtree` | Generate points; insert them into the tree | Per-probe `nearest`, returned result allocation/drop, last-item checksum |
| Rust Kiddo | Generate points; construct tree and executor | Query/batch API, result consumption, allocations incurred by those calls |
| C++ nanoflann | Generate points; construct index; allocate index/distance buffers | Repeated `knnSearch`, reuse of those buffers, last-item checksum |
| Python pykdtree | Generate/read arrays; construct `KDTree` | Python loop and binding calls, probe reshape/type conversion, output processing; bulk calls in batch mode |

These are measurements of the exposed operation through the chosen driver.
Shared inputs and normalization do not remove binding costs or make allocation
policies identical. The inspected manifests/drivers do not publish an independent
index-construction benchmark; process counters that include construction are not
construction timings.
[Rust example](https://github.com/spatial-bench/spatial-bench-benchers/blob/1972c5004eb5c6e4b9969f5b80331d02cc9af06c/subjects/kdtree/driver/src/lib.rs),
[C++ driver](https://github.com/spatial-bench/spatial-bench-benchers/blob/1972c5004eb5c6e4b9969f5b80331d02cc9af06c/subjects/nanoflann/shim.cpp),
[Python driver](https://github.com/spatial-bench/spatial-bench-benchers/blob/1972c5004eb5c6e4b9969f5b80331d02cc9af06c/subjects/pykdtree/driver.py).

`single_query` performs one library call per probe. `batch_query` chunks probes
by `query_batch_size`; a final chunk may be shorter. `query_count` is the total
number of probes per timed body. A batch can still be single-threaded. Kiddo's
batch driver selects its serial or parallel executor from `parallelism`;
pykdtree's driver accepts only the single-threaded label. That label alone does
not prove process affinity or the absence of dependency-managed worker threads;
record and review the actual runtime environment. Dividing a parallel batch by
its query count gives amortized wall time per query, not an individual request's
response time.

## Sampling and estimators

The CLI currently uses the harness defaults: **3,000 ms warm-up**, **5,000 ms
measurement budget**, **30 requested samples**. These are per case, not a total
run duration. They are not currently CLI budget flags. Rust and exec drivers share
these inputs but implement different experiments.

### Rust through Criterion

`spatial-bench-measure` uses `criterion = "0.8"`. It overrides warm-up duration,
measurement duration and sample count, retaining other Criterion defaults.
Criterion 0.8.2 was inspected for the following details; the run JSON does not
record its resolved version. Criterion warms the body, estimates iteration cost,
then chooses linear or flat sampling automatically. Samples can contain multiple
complete probe passes. The measurement duration is a scheduling target, not a
hard timeout; collection and analysis can exceed it. This wrapper rejects sample
counts below 10 and zero warm-up/measurement durations.

For sample `i`, let `t_i` be total timed nanoseconds and `b_i` the number of body
iterations. Criterion analyzes `t_i / b_i`. The engine takes the arithmetic mean
estimate from `estimates.json`, **not the regression slope**. For `Q` probes per
body, it stores:

```text
latency_ns.point = mean(t_i / b_i) / Q
latency_ns.lower, upper = Criterion mean confidence bounds / Q
throughput_qps.point = 1,000,000,000 / latency_ns.point
```

Median, standard deviation and median absolute deviation (MAD) are likewise
scaled by `Q`. The sample count comes from the length of `sample.json.times`,
not the number of queries or bootstrap replicates; a missing file leaves it
absent. Raw sample files remain in a temporary Criterion directory and are not
included in the normal run JSON.
[Measurement wrapper](https://github.com/spatial-bench/spatial-bench-core/blob/2104bfe8b2ba04c31ee484e9a9aee4f0c5df0f79/crates/spatial-bench-measure/src/lib.rs).

Criterion 0.8.2 uses 100,000 bootstrap resamples and 95% confidence by default.
Its standard deviation uses denominator `n−1`; its MAD is the median absolute
deviation multiplied by **1.4826**. Its median interpolates at the 50th percentile.
Tukey outliers are classified, but the mean/median estimates here still use the
sample, rather than discarding flagged observations. These are properties of
Criterion's estimates; spatial-bench does not add a separate outlier filter.
[Criterion defaults and sampling](https://github.com/criterion-rs/criterion.rs/blob/7f0d745532e3c7b2e11bbf9de9b911f91790d3b1/src/lib.rs),
[analysis](https://github.com/criterion-rs/criterion.rs/blob/7f0d745532e3c7b2e11bbf9de9b911f91790d3b1/src/analysis/mod.rs),
[dispersion](https://github.com/criterion-rs/criterion.rs/blob/7f0d745532e3c7b2e11bbf9de9b911f91790d3b1/src/stats/univariate/sample.rs).

### Current C++ and Python loops

nanoflann uses `steady_clock`; pykdtree uses `perf_counter_ns`. Each repeats the
body until warm-up time has elapsed. Measurement takes one complete body per
sample, divides its duration by `query_count`, and stops when **either** the
sample count reaches the request **or** elapsed measurement time reaches the
budget. The deadline is checked between bodies, so the last body can overshoot.
A fast case can stop after 30 samples well before five seconds. Zero samples are
an error; a single sample is possible under a short budget/slow workload.

For normalized observations `x_i`, both drivers compute:

```text
mean = sum(x_i) / n
sd = sqrt(sum((x_i - mean)^2) / n)
median = sorted(x)[floor(n/2)]
mad = sorted(abs(x_i - median))[floor(n/2)]
mean bounds = mean ± 1.96 * sd / sqrt(n)
throughput = 1,000,000,000 / mean
```

The median and MAD use the upper middle value for even `n`; MAD is unscaled and
SD uses denominator `n`. These differ from Criterion's definitions. The bounds
are labelled 95% but use a normal approximation, not a bootstrap or Student's
`t` interval. With one observation SD and width are zero, which provides no
useful evidence of repeatability. Serial dependence, scheduler interference and
non-normal/small samples can invalidate nominal coverage. These loops do not
implement early stopping based on precision or convergence.
[C++ sampling](https://github.com/spatial-bench/spatial-bench-benchers/blob/1972c5004eb5c6e4b9969f5b80331d02cc9af06c/subjects/nanoflann/shim.cpp),
[Python sampling](https://github.com/spatial-bench/spatial-bench-benchers/blob/1972c5004eb5c6e4b9969f5b80331d02cc9af06c/subjects/pykdtree/driver.py).

### What the explorer displays

The latency axis uses `median_ns` when present and falls back to the stored mean.
The throughput axis uses stored throughput, the reciprocal of the **mean**; it is
therefore not generally the reciprocal of the displayed latency. Stored lower
and upper bounds describe uncertainty in the **mean**, not in the displayed
median. Missing statistics mean unavailable values, not zero variation.

At the audited explorer baseline, point detail labels these bounds “confidence”
beside a median. The hover tooltip prints `±(upper−lower)`: that is the full mean
interval width, not a half-width around the median. Read the actual lower/upper
values and statistic definitions when auditing uncertainty.
[Point display](https://github.com/spatial-bench/spatial-bench-web/blob/755159672d2601f6eb5a40a16e9b0fb9c0e96b8a/src/main.tsx),
[tooltip](https://github.com/spatial-bench/spatial-bench-web/blob/755159672d2601f6eb5a40a16e9b0fb9c0e96b8a/src/components/BenchChart.tsx).

Grouping also changes which observations survive. Within each panel/chart/series
and x value, `latest` deduplication selects the newest `started_at`; `median`
(the “best (median)” option) selects the **smallest** median, falling back to mean.
Neither pools samples across runs. Omitting a workload dimension from grouping
or filters can make different cases compete for that one point. “Latest version”
selects the greatest version present per library after ordinary filters, not the
latest upstream release or latest measurement. There is no hypothesis test or
multiple-comparison correction behind these selections.
[Grouping implementation](https://github.com/spatial-bench/spatial-bench-web/blob/755159672d2601f6eb5a40a16e9b0fb9c0e96b8a/src/engine/group.ts).

## Perf counter attribution

The perf runner starts **one driver process per case** under `perf stat -j`.
Available cycles, instructions, branch misses and task-clock counters cover that
process invocation: startup, input preparation, index construction, warm-up,
measurement and analysis/output. They are recorded as counts or milliseconds,
without per-query normalization. Unavailable/unsupported counter values are
omitted. The driver still supplies its own timed-region latency; perf adds metrics
rather than moving that timer. Do not divide process counters by `query_count`
and call the result query cost: the process can execute many warm-up and measured
passes, especially with Criterion.
[Perf runner](https://github.com/spatial-bench/spatial-bench-core/blob/2104bfe8b2ba04c31ee484e9a9aee4f0c5df0f79/crates/spatial-bench-core/src/perf.rs).

## Configuration, environment and provenance

`defaults_or_tuned` is computed at catalog load by comparing the case against all
declared manifest defaults. All declared defaults matching means `default`; any
mismatch means `tuned`. With no declared defaults, the comparison succeeds for
every case. The engine prevents directly declaring that label, but does not
establish that declared defaults match the upstream API's defaults or that a
tuned setting was selected independently of measured performance. Those are
review responsibilities. Configuration searches and selecting the best rerun can
bias a comparison; disclose how candidates and runs were chosen.
[Catalog labels](https://github.com/spatial-bench/spatial-bench-core/blob/2104bfe8b2ba04c31ee484e9a9aee4f0c5df0f79/crates/spatial-bench-core/src/catalog_load.rs).

Rust selections share a resolved toolchain, normally the highest declared minimum
unless explicitly overridden. Native ISA choices and manifest C++ flags can use
machine-specific instructions. The run records available machine fields and
context such as kernel, OS, governor, SMT, boost and isolated CPUs. Capturing a
value is not enforcing an experimental control: the engine does not make all
runs share affinity, thermal state, background load or dependency thread counts.
Repeated probes/index reuse also measures a warmed workload rather than cold
cache behavior.
[Run pipeline](https://github.com/spatial-bench/spatial-bench-core/blob/2104bfe8b2ba04c31ee484e9a9aee4f0c5df0f79/crates/spatial-bench-core/src/run.rs),
[context capture](https://github.com/spatial-bench/spatial-bench-core/blob/2104bfe8b2ba04c31ee484e9a9aee4f0c5df0f79/crates/spatial-bench-core/src/context.rs).

Fingerprint validation compares observed host fields with a captured fingerprint.
The full machine hash is the continuity key; incomplete observations can mark a
machine degraded. The optional unfingerprinted path is distinguishable by an
`UNKNOWN` suffix. A fingerprint checksum uses a public constant key: it detects
accidental modification, not malicious fabrication, and is not an attestation of
who ran the benchmark.
[Fingerprint validation](https://github.com/spatial-bench/spatial-bench-core/blob/2104bfe8b2ba04c31ee484e9a9aee4f0c5df0f79/crates/spatial-bench-core/src/fingerprint.rs).

Subject provenance records a version, declared pin and resolved identity: a Git
revision or `sha256:` digest of the PyPI distribution actually installed. A version
alone is insufficient for that artifact identity. The current manifest validator
accepts an unprefixed 64-character hex digest but rejects the `sha256:` prefix;
the emitted provenance uses the prefix. Preserve the distinction when reviewing
manifest pins and run records.
[Source preparation](https://github.com/spatial-bench/spatial-bench-core/blob/2104bfe8b2ba04c31ee484e9a9aee4f0c5df0f79/crates/spatial-bench-core/src/exec.rs),
[manifest validation](https://github.com/spatial-bench/spatial-bench-core/blob/2104bfe8b2ba04c31ee484e9a9aee4f0c5df0f79/crates/spatial-bench-core/src/manifest.rs).

The run document is not a complete reproduction package. Current assembly leaves
engine `git_sha` absent and uses `git_dirty` to mark subject-path overrides,
without inspecting actual engine/bencher working-tree cleanliness. It does not
persist the generator seed, measurement budget, full bencher revision, complete
dependency lockfiles, or C++/Python toolchain versions. Several Rust toolchain
fields are placeholders (`target_cpu` absent, features empty); `host` is an
architecture string. Keep exact engine/bencher revisions, generated build
lockfiles, invocation including seed, compiler/interpreter details, runtime
thread/affinity settings and raw samples with a submission when needed for
reproduction. Review must fill these gaps rather than inferring them from a
passing submission command.
[Run assembly](https://github.com/spatial-bench/spatial-bench-core/blob/2104bfe8b2ba04c31ee484e9a9aee4f0c5df0f79/crates/spatial-bench-core/src/run.rs),
[result schema](https://github.com/spatial-bench/spatial-bench-core/blob/2104bfe8b2ba04c31ee484e9a9aee4f0c5df0f79/crates/spatial-bench-core/src/schema.rs).

## Review and applicability

Independent review means someone other than the author can inspect the adapter,
workload, provenance and evidence. It does not imply a recorded independent
rerun. Registration checks establish declared/implemented case coverage, not
answer correctness, timing equivalence or environment control. Known-answer
checks, radius/boundary checks and comparisons with a reference implementation
belong in driver review. The [contribution paths](/contribute) separate driver
changes, engine extensions and results submissions.

Within-run confidence intervals concern the chosen estimator under its sampling
assumptions. They do not measure variability between independent runs, machines,
seeds or application workloads, and interval overlap alone does not establish
statistical significance. Missing measurements indicate missing coverage. Audit
raw records before generalizing to another distribution, dimension, update
pattern, concurrency level or application; none of these data establish a
universal fastest spatial index.
