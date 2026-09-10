"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { Track } from "@/lib/types";
import { STYLES } from "@/lib/pools";
import { apiGet, cx } from "@/lib/utils";
import { useAppState } from "./app-state";
import { usePlayer } from "./player";
import { RowSong, Spinner } from "./ui";

export function SearchView() {
  const { t, settings } = useAppState();
  const { playContext } = usePlayer();
  const [q, setQ] = useState("");
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const query = q.trim();
    if (!query) {
      setTracks(null);
      setDone(false);
      setErr(false);
      return;
    }
    let alive = true;
    setSearching(true);
    setErr(false);
    const timer = window.setTimeout(() => {
      apiGet<{ tracks: Track[] }>(`/api/songs?search=${encodeURIComponent(query)}`)
        .then((r) => {
          if (!alive) return;
          setTracks(r.tracks);
          setDone(true);
        })
        .catch(() => {
          if (alive) {
            setErr(true);
            setDone(true);
          }
        })
        .finally(() => {
          if (alive) setSearching(false);
        });
    }, 450);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [q]);

  const playAll = (list: Track[], start: number) => {
    if (!list.length) return;
    playContext(list, start, { type: "mix", label: q.trim() || "Search" });
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 -mx-2 bg-[#0a0a12]/90 px-2 py-3 backdrop-blur-lg">
        <div className="flex items-center gap-2 rounded-full bg-white/8 px-4 py-3 ring-1 ring-white/10 focus-within:ring-emerald-400/60">
          <Search className="h-4 w-4 shrink-0 text-zinc-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search.placeholder")}
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
          />
          {q && (
            <button onClick={() => setQ("")} className="text-zinc-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {!q.trim() && (
        <>
          <p className="text-sm text-zinc-400">{t("search.hint")}</p>
          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-400">
              {t("search.styles")}
            </h3>
            <div className="flex flex-wrap gap-2">
              {(settings.styles.length ? settings.styles : STYLES.map((s) => s.key)).map((key) => {
                const def = STYLES.find((s) => s.key === key);
                return (
                  <button
                    key={key}
                    onClick={async () => {
                      const r = await apiGet<{ tracks: Track[] }>(`/api/songs?style=${encodeURIComponent(key)}`);
                      if (r.tracks?.length) playAll(r.tracks, 0);
                    }}
                    className="rounded-full bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-200 ring-1 ring-white/10 transition hover:bg-emerald-500 hover:text-black"
                  >
                    {def?.emoji} {t(def?.labelKey || "style.pop")}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {searching && (
        <div className="flex items-center justify-center gap-2 py-10 text-zinc-400">
          <Spinner /> {t("st.loading")}
        </div>
      )}

      {done && !searching && !err && tracks && (
        <>
          {tracks.length === 0 ? (
            <p className="py-10 text-center text-sm text-zinc-500">{t("search.empty")}</p>
          ) : (
            <div className="space-y-0.5">
              {tracks.map((tr, i) => (
                <RowSong
                  key={tr.videoId}
                  track={tr}
                  index={i}
                  onPlay={() => playAll(tracks, i)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {err && (
        <div
          onClick={() => setQ((s) => `${s} `)}
          className="cursor-pointer rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300"
        >
          {t("pl.err")}
        </div>
      )}

      <div className={cx("h-2")} />
    </div>
  );
}
