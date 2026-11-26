import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EXCUSE } from "../src/excuse.ts";
import { run } from "../main.ts";

const args = new Set(process.argv.slice(2));
const failures: string[] = [];

function check(condition: boolean, message: string): void {
  if (!condition) failures.push(message);
}

function assertBounds(text: string, label: string): void {
  const bytes = Buffer.byteLength(text, "utf8");
  const chars = [...text].length;
  check(bytes >= 1 && bytes <= 200, `${label}: ${bytes} UTF-8 bytes outside 1..200`);
  check(chars >= 1 && chars <= 200, `${label}: ${chars} characters outside 1..200`);
  check(text.trim().length > 0, `${label}: whitespace only`);
  check(!/[\r\n\u2028\u2029]/.test(text), `${label}: not a single line`);
}

function capture(): { lines: string[]; log: (line: string) => void } {
  const lines: string[] = [];
  return { lines, log: (line) => lines.push(line) };
}

assertBounds(EXCUSE, "src/excuse.ts");

if (args.has("--print")) console.log(EXCUSE);
if (args.has("--stats")) {
  console.log(`bytes=${Buffer.byteLength(EXCUSE, "utf8")} chars=${[...EXCUSE].length}`);
}

const dir = mkdtempSync(join(tmpdir(), "excuse-verify-"));
try {
  const first = join(dir, "nested", "a.txt");
  const second = join(dir, "b.txt");

  const logA = capture();
  const logB = capture();
  check(run({ outputPath: first, print: false, stats: false, checkOnly: false, log: logA.log }) === 0, "run 1 returned non-zero");
  check(run({ outputPath: second, print: false, stats: false, checkOnly: false, log: logB.log }) === 0, "run 2 returned non-zero");

  const outA = readFileSync(first, "utf8");
  const outB = readFileSync(second, "utf8");
  check(outA === outB, "determinism: two runs wrote different output");
  check(outA === EXCUSE, "output file does not match src/excuse.ts");
  assertBounds(outA, "output file");

  const logP = capture();
  const printed = join(dir, "c.txt");
  check(run({ outputPath: printed, print: true, stats: true, checkOnly: false, log: logP.log }) === 0, "--print --stats returned non-zero");
  check(logP.lines.includes(EXCUSE), "--print did not emit the excuse");
  check(logP.lines.some((line) => /^bytes=\d+ chars=\d+$/.test(line)), "--stats did not report counts");
  check(readFileSync(printed, "utf8") === EXCUSE, "--print run did not write the output file");

  const checkOnly = join(dir, "never.txt");
  check(run({ outputPath: checkOnly, print: false, stats: false, checkOnly: true, log: () => {} }) === 0, "--check-only returned non-zero");
  check(!existsSync(checkOnly), "--check-only wrote a file");
} finally {
  rmSync(dir, { recursive: true, force: true });
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}

console.log("PASS excuse is deterministic, single-line, and within 1..200 UTF-8 characters");