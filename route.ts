import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const cache = new Map<string, { url: string | null; at: number }>();
const TTL = 24 * 60 * 60 * 1000;

async function deezerArtist(name: string): Promise<string | null> {
  const res = await fetch(
    `https://api.deezer.com/search/artist?q=${encodeURIComponent(name)}&limit=3&order=RANKING`,
    { signal: AbortSignal.timeout(6000) },
  );
  if (!res.ok) throw new Error(`deezer ${res.status}`);
  const json = (await res.json()) as { data?: { name: string; picture_medium?: string }[] };
  const data = json.data || [];
  const want = name.toLowerCase();
  const match =
    data.find((a) => a.name.toLowerCase() === want) ??
    data.find((a) => want.includes(a.name.toLowerCase()) || a.name.toLowerCase().includes(want)) ??
    data[0];
  if (match?.picture_medium) {
    // ask for a slightly bigger crop
    return match.picture_medium.replace("250x250", "500x500");
  }
  return null;
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const namesRaw = sp.get("names") || "";
  const names = [...new Set(namesRaw.split(",").map((s) => s.trim()).filter(Boolean))].slice(0, 40);
  if (names.length === 0) {
    return NextResponse.json({ images: {} });
  }

  const result: Record<string, string | null> = {};
  const missing: string[] = [];
  for (const n of names) {
    const hit = cache.get(n);
    if (hit && Date.now() - hit.at < TTL) {
      result[n] = hit.url;
    } else {
      missing.push(n);
    }
  }

  // fetch missing with small concurrency
  const queue = [...missing];
  async function worker() {
    while (queue.length) {
      const n = queue.shift()!;
      try {
        const url = await deezerArtist(n);
        cache.set(n, { url, at: Date.now() });
        result[n] = url;
      } catch {
        cache.set(n, { url: null, at: Date.now() });
        result[n] = null;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(6, missing.length) }, () => worker()));

  return NextResponse.json({ images: result });
}
