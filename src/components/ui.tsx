"use client";

import { useEffect, type CSSProperties, type ReactNode } from "react";
import { Play } from "lucide-react";
import type { Track } from "@/lib/types";
import { apiGet, cx, fmtDuration } from "@/lib/utils";
import { useAppState } from "./app-state";

/* ---------- Artist images (batched fetch + persisted) ---------- */

const inFlight = new Set<string>();

export function useArtistImages(names: string[]) {
  const { settings, rememberImages } = useAppState();
  const key = names.join("|");
  useEffect(() => {
    const missing = names.filter((n) => n && !settings.images[n] && !inFlight.has(n));
    if (!missing.length) return;
    missing.forEach((n) => inFlight.add(n));
    let alive = true;
    apiGet<{ images: Record<string, string | null> }>(
      `/api/artist-images?names=${encodeURIComponent(missing.join(","))}`,
    )
      .then((r) => {
        if (alive) rememberImages(r.images);
      })
      .catch(() => {})
      .finally(() => {
        missing.forEach((n) => inFlight.delete(n));
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

const GRADS = [
  "from-violet-600 to-fuchsia-500",
  "from-sky-600 to-cyan-400",
  "from-emerald-600 to-teal-400",
  "from-amber-500 to-orange-600",
  "from-rose-600 to-pink-500",
  "from-indigo-600 to-blue-500",
];

function gradOf(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return GRADS[h % GRADS.length];
}

export function ArtistImg({
  name,
  src,
  className,
  textClass = "text-lg",
}: {
  name: string;
  src?: string | null;
  className?: string;
  textClass?: string;
}) {
  const { settings } = useAppState();
  const url = src ?? settings.images[name];
  if (url) {
    return <img src={url} alt={name} loading="lazy" className={cx("object-cover", className)} />;
  }
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <div
      className={cx(
        "flex items-center justify-center bg-gradient-to-br font-bold text-white",
        gradOf(name || "?"),
        className,
      )}
    >
      <span className={cx("select-none", textClass)}>{initial}</span>
    </div>
  );
}

/* ---------- Loading / misc ---------- */

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={cx("animate-spin text-current", className)} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
    </svg>
  );
}

export function ErrBox({ onRetry, label }: { onRetry?: () => void; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3 text-sm text-zinc-300">
      <span>{label}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20"
        >
          ↻
        </button>
      )}
    </div>
  );
}

export function SkeletonCards({ n = 6 }: { n?: number }) {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="w-36 shrink-0 space-y-2">
          <div className="aspect-square animate-pulse rounded-xl bg-white/8" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-white/8" />
          <div className="h-2.5 w-3/5 animate-pulse rounded bg-white/5" />
        </div>
      ))}
    </div>
  );
}

/* ---------- Cover card (horizontal grid item) ---------- */

export function CoverCard({
  track,
  onPlay,
  subtitle,
}: {
  track: Track;
  onPlay: () => void;
  subtitle?: string;
}) {
  return (
    <button
      onClick={onPlay}
      className="group w-36 shrink-0 cursor-pointer text-start focus:outline-none"
      title={`${track.title} — ${track.artist}`}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-white/10 shadow-lg shadow-black/30">
        <img
          src={track.thumbnail}
          alt={track.title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105 group-hover:opacity-60"
        />
        <div className="absolute inset-0 flex items-end justify-end p-2 opacity-0 transition group-hover:opacity-100">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg transition hover:scale-110">
            <Play className="ml-0.5 h-4 w-4 fill-current" />
          </span>
        </div>
      </div>
      <div className="mt-2 line-clamp-1 text-[13px] font-semibold text-zinc-100">{track.title}</div>
      <div className="line-clamp-1 text-xs text-zinc-400">
        {subtitle ?? track.artist} · {fmtDuration(track.duration)}
      </div>
    </button>
  );
}

/* ---------- Vertical row ---------- */

export function RowSong({
  track,
  onPlay,
  index,
  active,
  trailing,
  onClick,
}: {
  track: Track;
  onPlay: () => void;
  index?: number;
  active?: boolean;
  trailing?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick ?? onPlay}
      className={cx(
        "group flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-white/5 active:bg-white/10",
        active && "bg-white/5",
      )}
    >
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-white/10">
        <img
          src={track.thumbnail}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
        <div
          className="absolute inset-0 hidden items-center justify-center bg-black/50 group-hover:flex"
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
        >
          <Play className="h-4 w-4 fill-current text-white" />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className={cx("truncate text-sm font-medium", active ? "text-emerald-400" : "text-zinc-100")}>
          {track.title}
        </div>
        <div className="truncate text-xs text-zinc-400">{track.artist}</div>
      </div>
      {index !== undefined && (
        <div className="hidden w-8 text-end text-xs tabular-nums text-zinc-500 sm:block">{index + 1}</div>
      )}
      <div className="shrink-0 text-xs tabular-nums text-zinc-500">{fmtDuration(track.duration)}</div>
      {trailing && (
        <span className="flex shrink-0 items-center" onClick={(e) => e.stopPropagation()}>
          {trailing}
        </span>
      )}
    </div>
  );
}

/* ---------- Cover background helper ---------- */

export function bgStyle(url?: string): CSSProperties {
  if (!url) return {};
  return {
    backgroundImage: `linear-gradient(rgba(10,10,18,0.82), rgba(10,10,18,0.97)), url(${url})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}
