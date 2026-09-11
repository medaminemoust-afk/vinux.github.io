import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Track } from "@/lib/types";
import { thumbOf } from "@/lib/utils";

const execFileP = promisify(execFile);

const FORMAT_SELECTOR = "140/bestaudio[ext=m4a]/bestaudio/18";

interface Cmd {
  bin: string;
  args: string[];
}

interface Resolved {
  url: string;
  mime: string;
  ext: string;
}

/* ---------------- yt-dlp discovery / self-heal ---------------- */

const CANDIDATES: Cmd[] = [
  { bin: "python3", args: ["-m", "yt_dlp"] },
  { bin: "yt-dlp", args: [] },
  { bin: "python", args: ["-m", "yt_dlp"] },
  { bin: "/tmp/yt-dlp", args: [] },
];

let detected: Cmd | null = null;
let detecting: Promise<Cmd> | null = null;

async function run(cmd: Cmd, args: string[], timeout: number, maxBuffer = 2 * 1024 * 1024): Promise<string> {
  const { stdout } = await execFileP(cmd.bin, [...cmd.args, ...args], {
    timeout,
    maxBuffer,
    env: { ...process.env, PYTHONUNBUFFERED: "1" },
  });
  return stdout;
}

async function works(cmd: Cmd): Promise<boolean> {
  try {
    const out = await run(cmd, ["--version"], 20000);
    return /\d{4}\.\d{2}/.test(out);
  } catch {
    return false;
  }
}

async function tryInstall(): Promise<void> {
  const attempts: Cmd[] = [
    { bin: "python3", args: ["-m", "pip", "install", "--quiet", "--break-system-packages", "yt-dlp"] },
    { bin: "python3", args: ["-m", "pip", "install", "--quiet", "--user", "yt-dlp"] },
    { bin: "pip", args: ["install", "--quiet", "yt-dlp"] },
    {
      bin: "sh",
      args: [
        "-c",
        "curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /tmp/yt-dlp && chmod +x /tmp/yt-dlp",
      ],
    },
  ];
  for (const a of attempts) {
    try {
      await execFileP(a.bin, a.args, { timeout: 180000, maxBuffer: 4 * 1024 * 1024 });
      return;
    } catch {
      /* try next strategy */
    }
  }
}

export async function getYtdlp(): Promise<Cmd> {
  if (detected) return detected;
  if (detecting) return detecting;
  detecting = (async () => {
    for (const c of CANDIDATES) {
      if (await works(c)) {
        detected = c;
        return c;
      }
    }
    await tryInstall();
    for (const c of CANDIDATES) {
      if (await works(c)) {
        detected = c;
        return c;
      }
    }
    throw new Error("yt-dlp is not available on this server");
  })();
  try {
    return await detecting;
  } finally {
    detecting = null;
  }
}

/* ---------------- stream resolution ---------------- */

const cache = new Map<string, { resolved: Resolved; at: number }>();
const inflight = new Map<string, Promise<Resolved>>();
const TTL_MS = 3.5 * 60 * 60 * 1000; // googlevideo URLs live ~6h

async function directUrl(videoId: string): Promise<string> {
  const cmd = await getYtdlp();
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const stdout = await run(cmd, ["--no-warnings", "--no-playlist", "-f", FORMAT_SELECTOR, "-g", url], 60000);
  const line = stdout
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith("http"));
  if (!line) throw new Error("yt-dlp returned no url");
  return line;
}

function mimeForExt(ext: string): string {
  switch (ext) {
    case "m4a":
    case "mp4":
      return "audio/mp4";
    case "webm":
      return "audio/webm";
    case "opus":
      return "audio/ogg";
    default:
      return "audio/mpeg";
  }
}

function extFromUrl(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes("mime=audio%2Fmp4") || lower.includes("mime=audio/mp4")) return "m4a";
  if (lower.includes("mime=audio%2Fwebm") || lower.includes("mime=audio/webm")) return "webm";
  if (lower.includes("mime=video%2Fmp4") || lower.includes("mime=video/mp4")) return "mp4";
  const clean = lower.split("?")[0];
  if (clean.endsWith(".webm")) return "webm";
  if (clean.endsWith(".opus")) return "opus";
  return "m4a";
}

async function probe(url: string): Promise<void> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(url, { headers: { Range: "bytes=0-1" }, signal: ctrl.signal, redirect: "follow" });
    if (r.status !== 206 && r.status !== 200) throw new Error(`probe failed ${r.status}`);
    // drain tiny body
    await r.arrayBuffer().catch(() => undefined);
  } finally {
    clearTimeout(t);
  }
}

/** Resolve a direct audio URL (full song) for a YouTube video id. */
export async function resolveStream(videoId: string): Promise<Resolved> {
  const hit = cache.get(videoId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.resolved;
  const existing = inflight.get(videoId);
  if (existing) return existing;

  const p = (async () => {
    const url = await directUrl(videoId);
    await probe(url);
    const ext = extFromUrl(url);
    const resolved: Resolved = { url, mime: mimeForExt(ext), ext: ext === "mp4" ? "m4a" : ext };
    cache.set(videoId, { resolved, at: Date.now() });
    return resolved;
  })();

  inflight.set(videoId, p);
  try {
    return await p;
  } finally {
    inflight.delete(videoId);
  }
}

export function invalidate(videoId: string): void {
  cache.delete(videoId);
}

/* ---------------- search fallback (when Piped is down) ---------------- */

interface FlatEntry {
  id?: string;
  title?: string;
  uploader?: string;
  channel?: string;
  duration?: number | null;
}

export async function ytdlpSearch(query: string, limit = 25): Promise<Track[]> {
  const cmd = await getYtdlp();
  const stdout = await run(
    cmd,
    ["--no-warnings", "--flat-playlist", "-J", `ytsearch${Math.min(limit, 40)}:${query}`],
    60000,
    16 * 1024 * 1024,
  );
  const json = JSON.parse(stdout) as { entries?: FlatEntry[] };
  const out: Track[] = [];
  for (const e of json.entries || []) {
    if (!e.id || !e.title) continue;
    const dur = typeof e.duration === "number" ? e.duration : undefined;
    if (dur && dur > 1200) continue; // skip long mixes/albums
    if (dur && dur < 30) continue;
    const artist = (e.uploader || e.channel || "Unknown artist")
      .replace(/\s*-\s*Topic$/i, "")
      .replace(/\s*VEVO$/i, "")
      .trim();
    out.push({
      videoId: e.id,
      title: e.title,
      artist,
      thumbnail: thumbOf(e.id),
      duration: dur,
      durationText: dur ? `${Math.floor(dur / 60)}:${Math.floor(dur % 60).toString().padStart(2, "0")}` : undefined,
    });
  }
  return out;
}
