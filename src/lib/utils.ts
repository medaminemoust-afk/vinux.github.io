import type { Track } from "./types";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function fmtDuration(sec?: number | null): string {
  if (!sec || sec <= 0 || !isFinite(sec)) return "–:––";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function fmtTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickN<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

export function deviceId(): string {
  try {
    let id = localStorage.getItem("tf_device");
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem("tf_device", id);
    }
    return id;
  } catch {
    return `dev-${Math.random().toString(36).slice(2)}`;
  }
}

export function thumbOf(videoId: string, quality: "mq" | "hq" = "hq"): string {
  return `https://i.ytimg.com/vi/${videoId}/${quality}default.jpg`;
}

export function parseSongDuration(text?: string | null): number | undefined {
  if (!text) return undefined;
  const parts = text.split(":").map(Number);
  if (parts.some((p) => !isFinite(p))) return undefined;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return undefined;
}

export function toTrack(t: Track): Track {
  return t;
}

export interface LyricLine {
  time: number;
  text: string;
}

/** Parse LRCLIB-style synced lyrics "[mm:ss.xx] text". */
export function parseSyncedLyrics(raw: string): LyricLine[] {
  const out: LyricLine[] = [];
  const re = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]\s*(.*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const min = parseInt(m[1], 10);
    const sec = parseInt(m[2], 10);
    let frac = 0;
    if (m[3]) {
      const f = m[3].padEnd(3, "0").slice(0, 3);
      frac = parseInt(f, 10);
    }
    const time = min * 60 + sec + frac / 1000;
    const text = (m[4] || "").trim();
    if (text) out.push({ time, text });
  }
  return out.sort((a, b) => a.time - b.time);
}

export async function apiGet<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.json()) as T;
}

export async function apiSend<T>(
  url: string,
  method: "POST" | "DELETE" | "PATCH",
  body?: unknown,
): Promise<T> {
  const r = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.json()) as T;
}
