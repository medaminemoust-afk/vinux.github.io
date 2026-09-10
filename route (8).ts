import { NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { playlistTracks, playlists } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const device = new URL(req.url).searchParams.get("device") || "";
  if (!device) return NextResponse.json({ playlists: [] });
  const rows = await db
    .select({
      id: playlists.id,
      name: playlists.name,
      createdAt: playlists.createdAt,
      count: sql<number>`count(${playlistTracks.id})::int`,
    })
    .from(playlists)
    .leftJoin(playlistTracks, eq(playlistTracks.playlistId, playlists.id))
    .where(eq(playlists.deviceId, device))
    .groupBy(playlists.id)
    .orderBy(desc(playlists.createdAt));
  return NextResponse.json({ playlists: rows });
}

export async function POST(req: Request) {
  let body: { device?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  const device = (body.device || "").slice(0, 100);
  const name = (body.name || "").trim().slice(0, 100);
  if (!device || !name) {
    return NextResponse.json({ error: "device and name required" }, { status: 400 });
  }
  const [row] = await db
    .insert(playlists)
    .values({ deviceId: device, name })
    .returning({ id: playlists.id, name: playlists.name });
  return NextResponse.json({ playlist: { id: row.id, name: row.name, count: 0 } });
}
