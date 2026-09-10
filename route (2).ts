import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { favorites } from "@/db/schema";
import type { Track } from "@/lib/types";

export const dynamic = "force-dynamic";

function trackFromRow(r: (typeof favorites.$inferSelect)): Track {
  return {
    videoId: r.videoId,
    title: r.title,
    artist: r.artist,
    thumbnail: r.thumbnail,
    duration: r.duration ?? undefined,
    durationText: r.durationText ?? undefined,
  };
}

export async function GET(req: Request) {
  const device = new URL(req.url).searchParams.get("device") || "";
  if (!device) return NextResponse.json({ tracks: [] });
  const rows = await db
    .select()
    .from(favorites)
    .where(eq(favorites.deviceId, device))
    .orderBy(desc(favorites.addedAt));
  return NextResponse.json({ tracks: rows.map(trackFromRow) });
}

export async function POST(req: Request) {
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
  await db
    .insert(favorites)
    .values({
      deviceId: device,
      videoId: t.videoId,
      title: t.title.slice(0, 300),
      artist: (t.artist || "Unknown").slice(0, 200),
      thumbnail: t.thumbnail?.slice(0, 500) || "",
      duration: t.duration ?? null,
      durationText: t.durationText ?? null,
    })
    .onConflictDoNothing({ target: [favorites.deviceId, favorites.videoId] });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const sp = new URL(req.url).searchParams;
  const device = sp.get("device") || "";
  const videoId = sp.get("videoId") || "";
  if (!device || !videoId) {
    return NextResponse.json({ error: "params required" }, { status: 400 });
  }
  await db
    .delete(favorites)
    .where(and(eq(favorites.deviceId, device), eq(favorites.videoId, videoId)));
  return NextResponse.json({ ok: true });
}
