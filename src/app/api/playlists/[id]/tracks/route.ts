import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { playlistTracks, playlists } from "@/db/schema";
import type { Track } from "@/lib/types";

export const dynamic = "force-dynamic";

async function owns(id: string, device: string) {
  const [pl] = await db
    .select({ id: playlists.id })
    .from(playlists)
    .where(and(eq(playlists.id, id), eq(playlists.deviceId, device)));
  return !!pl;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: { device?: string; track?: Track };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  const device = body.device || "";
  const t = body.track;
  if (!device || !t?.videoId || !t.title) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  if (!(await owns(id, device))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  await db
    .insert(playlistTracks)
    .values({
      playlistId: id,
      videoId: t.videoId,
      title: t.title.slice(0, 300),
      artist: (t.artist || "Unknown").slice(0, 200),
      thumbnail: t.thumbnail?.slice(0, 500) || "",
      duration: t.duration ?? null,
      durationText: t.durationText ?? null,
    })
    .onConflictDoNothing({ target: [playlistTracks.playlistId, playlistTracks.videoId] });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sp = new URL(req.url).searchParams;
  const device = sp.get("device") || "";
  const videoId = sp.get("videoId") || "";
  if (!(await owns(id, device))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  await db
    .delete(playlistTracks)
    .where(and(eq(playlistTracks.playlistId, id), eq(playlistTracks.videoId, videoId)));
  return NextResponse.json({ ok: true });
}
