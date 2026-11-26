import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { EXCUSE } from "./src/excuse.ts";

export interface RunOptions {
  outputPath: string;
  print: boolean;
  stats: boolean;
  checkOnly: boolean;
  log: (line: string) => void;
}

export function run(options: RunOptions): number {
  const bytes = Buffer.byteLength(EXCUSE, "utf8");
  const chars = [...EXCUSE].length;
  const valid =
    bytes >= 1 &&
    bytes <= 200 &&
    chars >= 1 &&
    chars <= 200 &&
    EXCUSE.trim().length > 0 &&
    !/[\r\n\u2028\u2029]/.test(EXCUSE);

  if (!valid) {
    options.log(`invalid excuse: ${bytes} bytes, ${chars} chars`);
    return 1;
  }

  if (options.stats) options.log(`bytes=${bytes} chars=${chars}`);
  if (options.print) options.log(EXCUSE);

  if (!options.checkOnly) {
    mkdirSync(dirname(options.outputPath), { recursive: true });
    writeFileSync(options.outputPath, EXCUSE, "utf8");
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = new Set(process.argv.slice(2));
  process.exitCode = run({
    outputPath: process.env.ENTRY_OUTPUT_PATH || "/output/entry.txt",
    print: args.has("--print"),
    stats: args.has("--stats"),
    checkOnly: args.has("--check-only"),
    log: (line) => console.log(line),
  });
}