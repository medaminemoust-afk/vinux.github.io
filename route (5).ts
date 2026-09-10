import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface LrcResult {
  syncedLyrics: string | null;
  plainLyrics: string | null;
  trackName?: string;
  artistName?: string;
}

async function lrclibJson(path: string): Promise<any> {
  const res = await fetch(`https://lrclib.net${path}`, {
    headers: { Accept: "application/json", "User-Agent": "Vinux/1.0 (music app)" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`lrclib ${res.status}`);
  return res.json();
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const artist = (sp.get("artist") || "").trim();
  const title = (sp.get("title") || "").trim();
  if (!artist || !title) {
    return NextResponse.json({ error: "artist and title required" }, { status: 400 });
  }

  try {
    let found: LrcResult | null = null;
    try {
      const direct = (await lrclibJson(
        `/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}`,
      )) as LrcResult;
      if (direct && (direct.syncedLyrics || direct.plainLyrics)) found = direct;
    } catch {
      /* fall through to search */
    }

    if (!found) {
      const list = (await lrclibJson(
        `/api/search?q=${encodeURIComponent(`${artist} ${title}`)}&track_name=${encodeURIComponent(title)}`,
      )) as LrcResult[];
      if (Array.isArray(list)) {
        const artistL = artist.toLowerCase();
        found =
          list.find(
            (r) =>
              (r.syncedLyrics || r.plainLyrics) &&
              (r.artistName || "").toLowerCase().includes(artistL),
          ) ??
          list.find((r) => r.syncedLyrics || r.plainLyrics) ??
          null;
      }
    }

    if (!found) {
      return NextResponse.json({ synced: null, plain: null });
    }
    return NextResponse.json({
      synced: found.syncedLyrics || null,
      plain: found.plainLyrics || null,
      sourceArtist: found.artistName || artist,
      sourceTitle: found.trackName || title,
    });
  } catch {
    return NextResponse.json({ synced: null, plain: null });
  }
}
