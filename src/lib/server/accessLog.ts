import { appendFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export interface AccessEntry {
  at: string;
  ip: string;
  country: string;
  countryCode: string;
  region: string;
  path: string;
  ua: string;
}

const FILE = process.env.ACCESS_LOG_PATH ?? "/data/access.log";

// Rotation is by size rather than by date: this runs unattended behind
// Watchtower, and an unbounded file on a homelab volume is how you fill a disk.
const MAX_BYTES = 5 * 1024 * 1024;

let writing: Promise<void> = Promise.resolve();

async function trimIfLarge(): Promise<void> {
  const st = await stat(FILE).catch(() => null);
  if (!st || st.size < MAX_BYTES) return;
  const lines = (await readFile(FILE, "utf8")).split("\n").filter(Boolean);
  await writeFile(FILE, `${lines.slice(Math.floor(lines.length / 2)).join("\n")}\n`, "utf8");
}

/**
 * Append one visit as a JSON line. Serialised through a promise chain so two
 * concurrent requests cannot interleave a rotation with a write, and never
 * rejects — a logging failure must not turn into a failed request.
 */
export function logAccess(entry: AccessEntry): void {
  writing = writing
    .then(async () => {
      await mkdir(dirname(FILE), { recursive: true });
      await trimIfLarge();
      await appendFile(FILE, `${JSON.stringify(entry)}\n`, "utf8");
    })
    .catch(() => {});
}

/** Most recent entries first. Malformed lines are skipped, never thrown on. */
export async function readAccessLog(limit: number): Promise<AccessEntry[]> {
  const raw = await readFile(FILE, "utf8").catch(() => "");
  if (!raw) return [];
  const out: AccessEntry[] = [];
  const lines = raw.split("\n").filter(Boolean);
  for (let i = lines.length - 1; i >= 0 && out.length < limit; i--) {
    try {
      out.push(JSON.parse(lines[i]) as AccessEntry);
    } catch {
      /* truncated or partially written line */
    }
  }
  return out;
}
