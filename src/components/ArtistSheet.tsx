"use client";

import { useCallback, useEffect } from "react";
import { Play, Radio, X } from "lucide-react";
import type { Track } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { useAppState } from "./app-state";
import { usePlayer } from "./player";
import { ArtistImg, ErrBox, RowSong, Spinner } from "./ui";

export function ArtistSheet({
  name,
  onClose,
}: {
  name: string;
  onClose: () => void;
}) {
  const { t } = useAppState();
  const { playContext } = usePlayer();
  const { data, error: err, retry } = useApi<{ tracks: Track[] }>(
    `/api/songs?artist=${encodeURIComponent(name)}`,
  );
  const tracks = data?.tracks ?? null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const play = useCallback(
    (list: Track[], i: number, radio: boolean) => {
      playContext(list, i, { type: "artist", label: name, param: name }, { shuffleOn: radio });
    },
    [name, playContext],
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-white/10 bg-[#101018] p-5 shadow-2xl sm:rounded-3xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <ArtistImg name={name} className="h-16 w-16 rounded-2xl shadow-lg" />
            <div>
              <h2 className="text-xl font-extrabold text-white">{name}</h2>
              <p className="text-xs text-subdued">{t("pl.artistRadio")}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full bg-white/10 p-2 text-subdued hover:bg-white/20">
            <X className="h-4 w-4" />
          </button>
        </div>

        {err ? (
          <ErrBox label={t("home.loadFailed")} onRetry={retry} />
        ) : !tracks ? (
          <div className="flex justify-center py-10 text-subdued">
            <Spinner />
          </div>
        ) : (
          <>
            <div className="mb-3 flex gap-2">
              <button
                onClick={() => play(tracks, 0, false)}
                className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-bold text-black hover:bg-accent-bright"
              >
                <Play className="h-4 w-4 fill-current" /> {t("home.playAll")}
              </button>
              <button
                onClick={() => play(tracks, 0, true)}
                className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/15 hover:bg-white/20"
              >
                <Radio className="h-4 w-4" /> {t("pl.artistRadio")}
              </button>
            </div>
            <div className="space-y-0.5">
              {tracks.map((tr, i) => (
                <RowSong key={tr.videoId} track={tr} index={i} onPlay={() => play(tracks, i, false)} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
