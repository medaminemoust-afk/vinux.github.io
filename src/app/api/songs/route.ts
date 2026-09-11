import { NextResponse } from "next/server";
import type { Track } from "@/lib/types";
import { searchSongs, keepArtistBoost } from "@/lib/server/piped";
import { artistsOfRegion, styleByKey } from "@/lib/pools";
import { pickN, shuffle } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function pool<T>(items: (() => Promise<T>)[], size = 3): Promise<T[]> {
  const results: T[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      try {
        results[idx] = await items[idx]();
      } catch {
        results[idx] = undefined as unknown as T;
      }
    }
  }
  const workers = Array.from({ length: Math.min(size, items.length) }, () => worker());
  await Promise.all(workers);
  return results.filter((r) => r !== undefined);
}

function dedupe(tracks: Track[]): Track[] {
  const seen = new Set<string>();
  const out: Track[] = [];
  for (const t of tracks) {
    if (seen.has(t.videoId)) continue;
    seen.add(t.videoId);
    out.push(t);
  }
  return out;
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const artist = sp.get("artist")?.trim();
  const style = sp.get("style")?.trim();
  const region = sp.get("region")?.trim();
  const search = sp.get("search")?.trim();
  const relatedArtist = sp.get("relatedArtist")?.trim();
  const relatedTitle = sp.get("relatedTitle")?.trim();
  const exclude = sp.get("exclude")?.trim();

  try {
    // Artist top songs (uploader boosted, ranked)
    if (artist) {
      const tracks = await searchSongs(artist, 30);
      const boosted = keepArtistBoost(tracks, artist).slice(0, 24);
      return NextResponse.json({ label: artist, tracks: boosted });
    }

    // Style radio pool (from seed artists of the style)
    if (style) {
      const def = styleByKey(style);
      const seeds = pickN(def.seeds, 3);
      const lists = await pool(seeds.map((s) => () => searchSongs(s, 12)), 3);
      const merged = dedupe(shuffle(lists.flat())).slice(0, 36);
      return NextResponse.json({ label: def.labelKey, key: style, tracks: merged });
    }

    // Regional trending (random artists of the region)
    if (region) {
      const artists = pickN(artistsOfRegion(region), 5);
      const lists = await pool(artists.map((a) => () => searchSongs(a, 10)), 3);
      const merged = dedupe(shuffle(lists.flat())).slice(0, 30);
      return NextResponse.json({ label: region, tracks: merged });
    }

    // Free search
    if (search) {
      const tracks = await searchSongs(search, 30);
      return NextResponse.json({ label: search, tracks });
    }

    // Related songs (radio refill)
    if (relatedArtist) {
      let tracks = await searchSongs(relatedArtist, 20);
      if (exclude) tracks = tracks.filter((t) => t.videoId !== exclude);
      if (tracks.length < 6 && relatedTitle) {
        const more = await searchSongs(`${relatedArtist} ${relatedTitle}`, 10);
        tracks = dedupe([...tracks, ...more.filter((t) => t.videoId !== exclude)]);
      }
      return NextResponse.json({ label: relatedArtist, tracks });
    }

    return NextResponse.json({ label: "", tracks: [] });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "search failed" },
      { status: 502 },
    );
  }
}
