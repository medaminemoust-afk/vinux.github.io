import { NextResponse } from "next/server";
import type { RegionInfo } from "@/lib/types";

export const dynamic = "force-dynamic";

interface GeoResult {
  success?: boolean;
  country?: string;
  country_code?: string;
  continent_code?: string;
}

function regionOf(countryCode: string | undefined, continentCode?: string): string {
  const cc = (countryCode || "").toUpperCase();
  const na = new Set(["US", "CA", "MX", "GL", "BM", "BS", "BB", "JM", "TT"]);
  const latam = new Set([
    "BR", "AR", "CL", "CO", "PE", "VE", "EC", "BO", "UY", "PY", "CR", "PA",
    "CU", "DO", "PR", "GT", "HN", "SV", "NI", "BZ", "GY", "SR",
  ]);
  const eu = new Set([
    "FR", "DE", "GB", "IT", "ES", "PT", "NL", "BE", "CH", "AT", "SE", "NO",
    "DK", "FI", "PL", "UA", "RO", "CZ", "GR", "HU", "IE", "IS", "LT", "LV",
    "EE", "BG", "HR", "RS", "SK", "SI", "AL", "BA", "MK", "ME", "MD", "LU",
    "MT", "CY", "TR", "GE", "AM", "AZ",
  ]);
  const af = new Set([
    "DZ", "EG", "MA", "TN", "LY", "SD", "SS", "NG", "ZA", "GH", "KE", "ET",
    "TZ", "UG", "SN", "CI", "CM", "ML", "BF", "NE", "CD", "AO", "MZ", "ZM",
    "ZW", "RW", "SO", "ER", "DJ", "GM", "GN", "GW", "LR", "SL", "TG", "BJ",
    "GA", "GQ", "CF", "TD", "MW", "NA", "BW", "LS", "SZ", "MR", "EH", "KM",
    "SC", "MU", "CV", "ST", "BI",
  ]);
  const me = new Set([
    "SA", "AE", "QA", "KW", "BH", "OM", "JO", "LB", "PS", "IQ", "SY", "YE",
    "IR", "IL",
  ]);
  const asia = new Set([
    "IN", "PK", "BD", "NP", "LK", "AF", "CN", "JP", "KR", "TH", "VN", "ID",
    "MY", "SG", "PH", "TW", "HK", "MO", "MM", "KH", "LA", "MN", "KZ", "UZ",
    "TM", "KG", "TJ", "BT", "MV",
  ]);
  const oc = new Set(["AU", "NZ", "FJ", "PG", "WS", "TO", "VU", "SB", "NC", "PF"]);

  if (cc) {
    if (na.has(cc)) return "north-america";
    if (latam.has(cc)) return "latin-america";
    if (eu.has(cc)) return "europe";
    if (af.has(cc)) return "africa";
    if (me.has(cc)) return "middle-east";
    if (asia.has(cc)) return "asia";
    if (oc.has(cc)) return "oceania";
  }
  if (continentCode === "AF") return "africa";
  if (continentCode === "EU") return "europe";
  if (continentCode === "AS") return "asia";
  if (continentCode === "OC") return "oceania";
  if (continentCode === "SA") return "latin-america";
  if (continentCode === "NA") return "north-america";
  return "global";
}

const FLAGS: Record<string, string> = {
  US: "🇺🇸", CA: "🇨🇦", MX: "🇲🇽", FR: "🇫🇷", DE: "🇩🇪", GB: "🇬🇧", MA: "🇲🇦",
  DZ: "🇩🇿", TN: "🇹🇳", EG: "🇪🇬", NG: "🇳🇬", ZA: "🇿🇦", GH: "🇬🇭", KE: "🇰🇪",
  ES: "🇪🇸", IT: "🇮🇹", PT: "🇵🇹", NL: "🇳🇱", BE: "🇧🇪", CH: "🇨🇭", AT: "🇦🇹",
  SE: "🇸🇪", NO: "🇳🇴", DK: "🇩🇰", FI: "🇫🇮", PL: "🇵🇱", IE: "🇮🇪", BR: "🇧🇷",
  AR: "🇦🇷", CO: "🇨🇴", CL: "🇨🇱", PE: "🇵🇪", SA: "🇸🇦", AE: "🇦🇪", QA: "🇶🇦",
  KW: "🇰🇼", JO: "🇯🇴", LB: "🇱🇧", TR: "🇹🇷", IN: "🇮🇳", PK: "🇵🇰",
  BD: "🇧🇩", CN: "🇨🇳", JP: "🇯🇵", KR: "🇰🇷", TH: "🇹🇭", VN: "🇻🇳", ID: "🇮🇩",
  MY: "🇲🇾", SG: "🇸🇬", PH: "🇵🇭", AU: "🇦🇺", NZ: "🇳🇿", RU: "🇷🇺", UA: "🇺🇦",
  GR: "🇬🇷", RO: "🇷🇴", CZ: "🇨🇿", HU: "🇭🇺", IS: "🇮🇸", IL: "🇮🇱", IR: "🇮🇷",
};

function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  if (ip === "::1" || ip.startsWith("::ffff:127.") || ip.startsWith("fe80:") || ip.startsWith("fc") || ip.startsWith("fd")) return true;
  const m = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

async function lookup(ip: string): Promise<GeoResult | null> {
  const suffix = ip ? `/${encodeURIComponent(ip)}` : "";
  // Provider 1: ipwho.is (full info)
  try {
    const r = await fetch(`https://ipwho.is${suffix}`, { signal: AbortSignal.timeout(6000) });
    if (r.ok) {
      const j = (await r.json()) as GeoResult;
      if (j && j.success !== false && (j.country_code || j.country)) return j;
    }
  } catch {
    /* next provider */
  }
  // Provider 2: country.is (country code only)
  try {
    const r = await fetch(`https://api.country.is${suffix}`, { signal: AbortSignal.timeout(6000) });
    if (r.ok) {
      const j = (await r.json()) as { country?: string };
      if (j?.country) return { country_code: j.country, country: j.country };
    }
  } catch {
    /* next provider */
  }
  // Provider 3: ipapi.co
  try {
    const r = await fetch(`https://ipapi.co${suffix || ""}/json/`, {
      signal: AbortSignal.timeout(6000),
      headers: { "User-Agent": "Vinux/1.0" },
    });
    if (r.ok) {
      const j = (await r.json()) as GeoResult & { country_name?: string };
      if (j?.country_code) return { country_code: j.country_code, country: j.country_name || j.country };
    }
  } catch {
    /* give up */
  }
  return null;
}

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States", CA: "Canada", MX: "Mexico", FR: "France", DE: "Germany", GB: "United Kingdom",
  MA: "Morocco", DZ: "Algeria", TN: "Tunisia", EG: "Egypt", NG: "Nigeria", ZA: "South Africa", GH: "Ghana",
  KE: "Kenya", ES: "Spain", IT: "Italy", PT: "Portugal", NL: "Netherlands", BE: "Belgium", CH: "Switzerland",
  BR: "Brazil", AR: "Argentina", CO: "Colombia", SA: "Saudi Arabia", AE: "United Arab Emirates", TR: "Türkiye",
  IN: "India", PK: "Pakistan", JP: "Japan", KR: "South Korea", AU: "Australia", SN: "Senegal", CI: "Côte d'Ivoire",
};

export async function GET(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  const chain = forwarded.split(",").map((s) => s.trim()).filter(Boolean);
  const realIp = req.headers.get("x-real-ip")?.trim() || "";
  const ip = [...chain, realIp].find((c) => c && !isPrivateIp(c)) || "";

  // Private/loopback IPs (local dev) fall back to the server's public IP.
  const geo = await lookup(ip);
  if (geo && geo.country_code && (!geo.country || geo.country === geo.country_code)) {
    geo.country = COUNTRY_NAMES[geo.country_code.toUpperCase()] || geo.country_code;
  }

  const regionKey = regionOf(geo?.country_code, geo?.continent_code);
  const info: RegionInfo = {
    country: geo?.country || "Unknown",
    countryCode: geo?.country_code || "",
    regionKey,
    flag: FLAGS[(geo?.country_code || "").toUpperCase()] || "🌐",
  };
  return NextResponse.json(info);
}
