"""Refresh the checked-in landing excerpt from a collated, reviewed results revision.

Usage: python3 scripts/featured.py SNAPSHOT.sqlite RESULTS_CHECKOUT
The normal site build uses the checked-in excerpt and needs neither input.
"""
import json
import pathlib
import sqlite3
import subprocess
import sys

snapshot, results = map(pathlib.Path, sys.argv[1:])
revision = subprocess.check_output(["git", "-C", str(results), "rev-parse", "HEAD"], text=True).strip()
sources = {}
for path in sorted((results / "datasets").rglob("*.json")):
    run = json.loads(path.read_text())["run"]
    sources[run["run_id"]] = str(path.relative_to(results))

with sqlite3.connect(f"file:{snapshot.resolve()}?mode=ro", uri=True) as db:
    db.row_factory = sqlite3.Row
    rows = db.execute("""
        SELECT p.*, r.machine_hash, r.started_at FROM points p
        JOIN runs r ON r.id = p.run_id
        WHERE p.query = 'exact_nn' AND p.k = 1 AND p.dims = 3
          AND p.dataset = 'uniform' AND p.metric = 'squared_euclidean'
          AND p.parallelism = 'single_threaded' AND p.query_batching = 'single_query'
          AND p.config = 'default' AND p.query_count = 1000
          AND p.impl IN ('kiddo', 'kdtree', 'nanoflann')
          AND (p.impl != 'kiddo' OR p.version = '6.3.0')
          AND r.machine_hash = 'anxrmnkpfa-qxmvv'
        ORDER BY r.started_at DESC, p.id
    """)
    points, seen = [], set()
    columns = "impl version language axis query k dims metric dataset parallelism query_batching isa config tree_size query_count query_batch_size machine_hash started_at".split()
    metrics = dict(latencyNs="latency_ns", latencyLower="latency_ns_lower", latencyUpper="latency_ns_upper", throughputQps="throughput_qps", medianNs="median_ns", madNs="mad_ns", stdDevNs="std_dev_ns", samples="samples")
    for row in rows:
        key = row["impl"], row["axis"], row["tree_size"]
        if key in seen:
            continue
        seen.add(key)
        points.append(dict(
            id=row["id"], runId=row["run_id"], machineHash=row["machine_hash"],
            startedAt=row["started_at"], core={c: row[c] for c in columns if row[c] is not None},
            tags=dict(db.execute("SELECT key, value FROM point_tags WHERE point_id = ?", (row["id"],))),
            **{k: row[v] for k, v in metrics.items()},
        ))
    assert len(points) == 54, "Review changed coverage before updating this curated example"
    used_sources = {p["runId"]: sources[p["runId"]] for p in points}
    out = dict(revision=revision, captured="2026-09-14", machine="AMD Ryzen 5 8500GE", sources=used_sources, points=points)
    pathlib.Path("src/data/featured.json").write_text(json.dumps(out, indent=2) + "\n")
