import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { playlistTracks, playlists } from "@/db/schema";

export const dynamic = "force-dynamic";

async function getPlaylist(id: string, device: string) {
  const [pl] = await db
    .select()
    .from(playlists)
    .where(and(eq(playlists.id, id), eq(playlists.deviceId, device)));
  return pl;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const device = new URL(_req.url).searchParams.get("device") || "";
  const pl = await getPlaylist(id, device);
  if (!pl) return NextResponse.json({ error: "not found" }, { status: 404 });

  const tracks = await db
    .select({
      videoId: playlistTracks.videoId,
      title: playlistTracks.title,
      artist: playlistTracks.artist,
      thumbnail: playlistTracks.thumbnail,
      duration: playlistTracks.duration,
      durationText: playlistTracks.durationText,
      addedAt: playlistTracks.addedAt,
    })
    .from(playlistTracks)
    .where(eq(playlistTracks.playlistId, id))
    .orderBy(asc(playlistTracks.addedAt));

  return NextResponse.json({ playlist: pl, tracks });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const device = new URL(_req.url).searchParams.get("device") || "";
  const pl = await getPlaylist(id, device);
  if (!pl) return NextResponse.json({ error: "not found" }, { status: 404 });
  await db.delete(playlists).where(eq(playlists.id, id));
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const device = new URL(req.url).searchParams.get("device") || "";
  const pl = await getPlaylist(id, device);
  if (!pl) return NextResponse.json({ error: "not found" }, { status: 404 });
  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  const name = (body.name || "").trim().slice(0, 100);
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  await db.update(playlists).set({ name }).where(eq(playlists.id, id));
  return NextResponse.json({ ok: true });
}
