import type { Track } from "@/lib/types";
import { parseSongDuration, thumbOf } from "@/lib/utils";
import { ytdlpSearch } from "./resolver";

// Piped instances used for search/metadata (streams are resolved with yt-dlp).
const INSTANCES = [
  "https://pipedapi.ducks.party",
  "https://api.piped.private.coffee",
];

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function pipedJson(path: string, timeoutMs = 9000): Promise<any> {
  let lastErr: unknown = new Error("all piped instances failed");
  for (const base of INSTANCES) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(`${base}${path}`, {
        headers: { "User-Agent": UA, Accept: "application/json" },
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`piped ${res.status}`);
      const json = (await res.json()) as any;
      if (!json || typeof json !== "object") throw new Error("bad json");
      return json;
    } catch (e) {
      lastErr = e;
    } finally {
      clearTimeout(t);
    }
  }
  throw lastErr;
}

function toVideoId(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const m = url.match(/[?&]v=([A-Za-z0-9_-]{11})/) || url.match(/^\/(?:watch|shorts)\?v=([A-Za-z0-9_-]{11})/);
  return m ? m[1] : undefined;
}

interface RawItem {
  url?: string;
  type?: string;
  title?: string;
  thumbnail?: string;
  uploaderName?: string;
  duration?: number;
  views?: number;
}

function mapItem(item: RawItem): Track | null {
  const videoId = toVideoId(item.url);
  if (!videoId || !item.title) return null;
  const artist =
    (item.uploaderName || "").replace(/\s*-\s*Topic$/i, "").replace(/\s*VEVO$/i, "").trim() ||
    "Unknown artist";
  const dur = item.duration && item.duration > 20 ? item.duration : undefined;
  return {
    videoId,
    title: item.title,
    artist,
    thumbnail: thumbOf(videoId),
    duration: dur,
    durationText: dur ? fmt(dur) : undefined,
  };
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function keepArtistBoost(tracks: Track[], artist: string): Track[] {
  const want = artist.toLowerCase();
  const exact = tracks.filter((t) => t.artist.toLowerCase() === want);
  const fuzzy = tracks.filter(
    (t) => t.artist.toLowerCase() !== want && (t.artist.toLowerCase().includes(want) || want.includes(t.artist.toLowerCase())),
  );
  const rest = tracks.filter((t) => !exact.includes(t) && !fuzzy.includes(t));
  return [...exact, ...fuzzy, ...rest];
}

/** Search songs via Piped (music filter). Sorted by views when available. */
export async function searchSongs(query: string, limit = 24): Promise<Track[]> {
  const q = encodeURIComponent(query);
  let json: any = null;
  try {
    json = await pipedJson(`/search?q=${q}&filter=music_songs`);
  } catch {
    try {
      json = await pipedJson(`/search?q=${q}`);
    } catch {
      json = null;
    }
  }
  if (!json || !Array.isArray(json.items)) {
    // Piped unavailable — fall back to yt-dlp search (slower but reliable).
    return (await ytdlpSearch(query, limit)).slice(0, limit);
  }
  const items: RawItem[] = json.items as RawItem[];
  const seen = new Set<string>();
  const out: Track[] = [];
  for (const it of items) {
    const t = mapItem(it);
    if (!t) continue;
    if (seen.has(t.videoId)) continue;
    seen.add(t.videoId);
    out.push(t);
    if (out.length >= limit) break;
  }
  return out;
}

export function parseDurationFromText(text?: string): number | undefined {
  return parseSongDuration(text);
}
