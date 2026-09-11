import { NextResponse } from "next/server";
import { resolveStream, invalidate } from "@/lib/server/resolver";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ID_RE = /^[A-Za-z0-9_-]{11}$/;

/** Fetch upstream with a timeout that only guards the headers phase, so the
 *  body can stream for as long as the song lasts. */
async function fetchUpstream(url: string, range: string | null): Promise<Response | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, {
      headers: range ? { Range: range } : undefined,
      redirect: "follow",
      signal: ctrl.signal,
    });
    return res;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function good(res: Response | null): res is Response {
  return !!res && (res.status === 200 || res.status === 206);
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!ID_RE.test(id)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }

  let resolved: Awaited<ReturnType<typeof resolveStream>>;
  try {
    resolved = await resolveStream(id);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "resolution failed" },
      { status: 502 },
    );
  }

  const clientRange = req.headers.get("range");
  // YouTube throttles requests without a Range header (~30KB/s) but serves
  // ranged requests at full speed — so always ask upstream with a Range.
  const range = clientRange || "bytes=0-";
  let upstream = await fetchUpstream(resolved.url, range);

  if (!good(upstream)) {
    // URL expired or rejected — resolve a fresh one exactly once.
    invalidate(id);
    try {
      resolved = await resolveStream(id);
    } catch {
      return NextResponse.json({ error: "stream unavailable" }, { status: 502 });
    }
    upstream = await fetchUpstream(resolved.url, range);
    if (!good(upstream)) {
      return NextResponse.json({ error: "stream unavailable" }, { status: 502 });
    }
  }

  const headers = new Headers({
    "Content-Type": upstream.headers.get("content-type") || resolved.mime,
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
  });
  const cr = upstream.headers.get("content-range");
  const cl = upstream.headers.get("content-length");

  if (!clientRange) {
    // Client asked for the whole file: present a plain 200 with the full length.
    const total = cr?.split("/")[1];
    if (total && /^\d+$/.test(total)) headers.set("Content-Length", total);
    else if (cl) headers.set("Content-Length", cl);
    return new Response(upstream.body, { status: 200, headers });
  }

  if (cr) headers.set("Content-Range", cr);
  if (cl) headers.set("Content-Length", cl);
  return new Response(upstream.body, { status: upstream.status, headers });
}
