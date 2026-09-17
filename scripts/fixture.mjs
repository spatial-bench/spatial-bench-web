import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { gzipSync } from "node:zlib";

const [source = ".fixture/benchmarks-test.sqlite", destination = "public/data"] =
  process.argv.slice(2);
const raw = await readFile(source);
if (raw.subarray(0, 16).toString() !== "SQLite format 3\0")
  throw new Error("Expected a SQLite snapshot");
const compressed = gzipSync(raw);
const sha256 = createHash("sha256").update(raw).digest("hex");
const db = `${basename(source)}.gz`;
await mkdir(destination, { recursive: true });
await writeFile(join(destination, db), compressed);
await writeFile(
  join(destination, "latest.json"),
  `${JSON.stringify({ db, sha: "local", sha256, bytes: compressed.length, generated_at: new Date().toISOString() }, null, 2)}\n`,
);
console.log(
  `Local fixture: ${destination}/latest.json (SHA-256 of uncompressed SQLite: ${sha256})`,
);
