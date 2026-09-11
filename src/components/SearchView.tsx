"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { Track } from "@/lib/types";
import { STYLES } from "@/lib/pools";
import { useApi } from "@/lib/useApi";
import { apiGet } from "@/lib/utils";
import { useAppState } from "./app-state";
import { usePlayer } from "./player";
import { ErrBox, RowSong, Spinner } from "./ui";

export function SearchView() {
  const { t, settings } = useAppState();
  const { playContext } = usePlayer();
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(q.trim()), 450);
    return () => window.clearTimeout(timer);
  }, [q]);

  const { data, error: err, loading: searching, retry } = useApi<{ tracks: Track[] }>(
    query ? `/api/songs?search=${encodeURIComponent(query)}` : null,
  );
  const tracks = data?.tracks ?? null;

  const playAll = (list: Track[], start: number) => {
    if (!list.length) return;
    playContext(list, start, { type: "mix", label: q.trim() || "Search" });
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 -mx-2 bg-base/90 px-2 py-3 backdrop-blur-lg">
        <div className="flex items-center gap-2 rounded-full bg-white/8 px-4 py-3 ring-1 ring-white/10 focus-within:ring-accent/60">
          <Search className="h-4 w-4 shrink-0 text-subdued" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search.placeholder")}
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
          />
          {q && (
            <button onClick={() => setQ("")} className="text-subdued hover:text-white">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {!q.trim() && (
        <>
          <p className="text-sm text-subdued">{t("search.hint")}</p>
          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-subdued">
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
                    className="rounded-full bg-white/5 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/10 transition hover:bg-accent hover:text-black"
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
        <div className="flex items-center justify-center gap-2 py-10 text-subdued">
          <Spinner /> {t("st.loading")}
        </div>
      )}

      {!searching && !err && tracks && (
        tracks.length === 0 ? (
          <p className="py-10 text-center text-sm text-white/40">{t("search.empty")}</p>
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
        )
      )}

      {err && <ErrBox label={t("pl.err")} onRetry={retry} />}
    </div>
  );
}
