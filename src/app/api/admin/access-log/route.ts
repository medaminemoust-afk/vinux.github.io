import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { readAccessLog } from "@/lib/server/accessLog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Indistinguishable from a route that does not exist. */
function notFound() {
  return new NextResponse("Not Found", {
    status: 404,
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
  });
}

/**
 * Compare through SHA-256 digests: timingSafeEqual demands equal lengths, and
 * hashing first keeps the comparison constant-time without leaking the token's
 * length through an early return.
 */
function tokenMatches(given: string, expected: string): boolean {
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

function presentedToken(req: Request): string {
  const auth = req.headers.get("authorization") || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
  return new URL(req.url).searchParams.get("token") || "";
}

export async function GET(req: Request) {
  const expected = process.env.ACCESS_LOG_TOKEN || "";

  // Fail closed: with no token configured the endpoint simply does not exist,
  // so a deploy that forgets the variable cannot expose the log.
  if (expected.length < 16) return notFound();

  const given = presentedToken(req);
  if (!given || !tokenMatches(given, expected)) return notFound();

  const sp = new URL(req.url).searchParams;
  const limit = Math.min(Math.max(Number(sp.get("limit")) || 200, 1), 5000);
  const entries = await readAccessLog(limit);

  const headers = {
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow",
    "Referrer-Policy": "no-referrer",
  };

  if (sp.get("format") === "text") {
    const body = entries
      .map((e) => `${e.at}  ${e.ip.padEnd(39)}  ${e.countryCode || "??"}  ${e.region}  ${e.ua}`)
      .join("\n");
    return new NextResponse(body || "(vide)", {
      headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return NextResponse.json({ count: entries.length, entries }, { headers });
}
