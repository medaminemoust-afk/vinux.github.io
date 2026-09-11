import { NextResponse } from "next/server";
import { resolveStream, invalidate } from "@/lib/server/resolver";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ID_RE = /^[A-Za-z0-9_-]{11}$/;

async function fetchUpstream(url: string): Promise<Response | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    // Ranged request avoids YouTube's throttling of plain downloads.
    return await fetch(url, { redirect: "follow", signal: ctrl.signal, headers: { Range: "bytes=0-" } });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!ID_RE.test(id)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }
  const sp = new URL(req.url).searchParams;
  const title = sp.get("title")?.slice(0, 80) || id;

  let resolved: Awaited<ReturnType<typeof resolveStream>>;
  try {
    resolved = await resolveStream(id);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "resolution failed" },
      { status: 502 },
    );
  }

  let upstream = await fetchUpstream(resolved.url);
  if (!upstream || (upstream.status !== 200 && upstream.status !== 206)) {
    invalidate(id);
    try {
      resolved = await resolveStream(id);
    } catch {
      return NextResponse.json({ error: "download unavailable" }, { status: 502 });
    }
    upstream = await fetchUpstream(resolved.url);
    if (!upstream || (upstream.status !== 200 && upstream.status !== 206)) {
      return NextResponse.json({ error: "download unavailable" }, { status: 502 });
    }
  }

  const safe = (title.replace(/[^\w\s-]/g, "") || id).trim();
  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("content-type") || resolved.mime);
  headers.set("Content-Disposition", `attachment; filename="${safe}.${resolved.ext}"`);
  headers.set("Cache-Control", "private, max-age=3600");
  const total = upstream.headers.get("content-range")?.split("/")[1];
  const cl = upstream.headers.get("content-length");
  if (total && /^\d+$/.test(total)) headers.set("Content-Length", total);
  else if (cl) headers.set("Content-Length", cl);

  return new Response(upstream.body, { status: 200, headers });
}
