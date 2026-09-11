"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown, Download, Heart, ListMusic, Loader2, Mic2, Pause,
  Play, Plus, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, X,
} from "lucide-react";
import type { Track } from "@/lib/types";
import { apiGet, cx, fmtTime, parseSyncedLyrics, type LyricLine } from "@/lib/utils";
import { useAppState, useToast } from "./app-state";
import { useLibrary } from "./library";
import { usePlayer } from "./player";
import { bgStyle, RowSong, Spinner } from "./ui";

/* ================= Player bottom bar ================= */

export function PlayerBar({ onOpen }: { onOpen: () => void }) {
  const { t } = useAppState();
  const { current, playing, loading, toggle, next, curTime, duration } = usePlayer();
  const { isFav, toggleFav, isDl, download, downloading } = useLibrary();
  const { push } = useToast();

  if (!current) return null;
  const pct = duration > 0 ? (curTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-x-0 bottom-16 z-40 px-2 pb-1 sm:px-4 md:bottom-0 md:pb-3">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-white/10 bg-[#14141f]/95 shadow-2xl shadow-black/60 backdrop-blur-xl">
        <div className="h-0.5 w-full bg-white/5">
          <div className="h-full bg-emerald-400 transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center gap-3 px-3 py-2">
          <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-start">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white/10">
              <img src={current.thumbnail} alt="" className="h-full w-full object-cover" />
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Spinner className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-white">{current.title}</div>
              <div className="truncate text-xs text-zinc-400">{current.artist}</div>
            </div>
          </button>

          <button
            onClick={() => {
              const was = isFav(current.videoId);
              void toggleFav(current).then(() => push(was ? t("pl.removedFav") : t("pl.addedFav")));
            }}
            className={cx(
              "hidden rounded-full p-2.5 transition sm:block",
              isFav(current.videoId) ? "text-emerald-400" : "text-zinc-400 hover:text-white",
            )}
            title={t("pl.like")}
          >
            <Heart className={cx("h-5 w-5", isFav(current.videoId) && "fill-current")} />
          </button>

          {!isDl(current.videoId) ? (
            <button
              onClick={() => {
                if (downloading.has(current.videoId)) return;
                void download(current)
                  .then(() => push(t("pl.downloadDone")))
                  .catch(() => push(t("pl.downloadErr"), "err"));
              }}
              className="hidden rounded-full p-2.5 text-zinc-400 transition hover:text-white sm:block"
              title={t("pl.download")}
            >
              {downloading.has(current.videoId) ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Download className="h-5 w-5" />
              )}
            </button>
          ) : (
            <span className="hidden rounded-full p-2.5 text-emerald-400 sm:block" title={t("pl.downloaded")}>
              <Download className="h-5 w-5" />
            </span>
          )}

          <button
            onClick={toggle}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-black transition hover:scale-105"
          >
            {playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ms-0.5 h-5 w-5 fill-current" />}
          </button>
          <button onClick={() => next(false)} className="shrink-0 rounded-full p-2.5 text-zinc-200 hover:text-white">
            <SkipForward className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= Now Playing overlay ================= */

export function NowPlaying({ onClose }: { onClose: () => void }) {
  const { t } = useAppState();
  const player = usePlayer();
  const { current, playing, toggle, curTime, duration, seek, mode, repeat, cycleRepeat, shuffle, toggleShuffle, queue, index } = player;
  const { isFav, toggleFav, isDl, download, downloading, downloads, playlists, createPlaylist, addToPlaylist } = useLibrary();
  const { push } = useToast();
  const [panel, setPanel] = useState<"none" | "lyrics" | "queue">("none");
  const [picker, setPicker] = useState(false);
  const [newPlName, setNewPlName] = useState("");

  const modeLabel = useMemo(() => {
    if (mode.type === "artist") return `${mode.param || mode.label} · ${t("pl.artistRadio")}`;
    if (mode.type === "style") return t("pl.styleRadio", { style: mode.param || mode.label });
    return mode.label || t("pl.nowPlaying");
  }, [mode, t]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const offlineDl = useMemo(
    () => downloads.find((d) => d.track.videoId === current?.videoId),
    [downloads, current],
  );

  if (!current) return null;
  const isF = isFav(current.videoId);
  const isDownloaded = isDl(current.videoId);

  const addPl = async (plId: string) => {
    try {
      await addToPlaylist(plId, current);
      const pl = playlists.find((p) => p.id === plId);
      push(t("lib.savedTo", { name: pl?.name || "" }));
      setPicker(false);
    } catch {
      push(t("pl.err"), "err");
    }
  };

  const createAndAdd = async () => {
    const name = newPlName.trim();
    if (!name) return;
    const pl = await createPlaylist(name);
    if (pl) {
      await addToPlaylist(pl.id, current);
      push(t("lib.savedTo", { name }));
      setPicker(false);
      setNewPlName("");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col overflow-y-auto text-white" style={bgStyle(current.thumbnail)}>
      {/* top bar */}
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-5 pt-5">
        <button onClick={onClose} className="rounded-full bg-black/30 p-2 backdrop-blur hover:bg-black/50">
          <ChevronDown className="h-5 w-5 rtl:rotate-90" />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-300">{t("pl.nowPlaying")}</p>
          <p className="truncate text-xs text-zinc-300">{modeLabel}</p>
        </div>
        <div className="w-9" />
      </div>

      {/* main content */}
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-5 py-8">
        {/* artwork / lyrics */}
        {panel === "lyrics" ? (
          <LyricPanel track={current} curTime={curTime} onBack={() => setPanel("none")} />
        ) : (
          <div className="relative">
            <div
              className={cx(
                "h-60 w-60 overflow-hidden rounded-3xl shadow-2xl shadow-black/60 ring-1 ring-white/15 sm:h-80 sm:w-80",
                playing && "animate-disc-spin-slow",
              )}
            >
              <img src={current.thumbnail} alt={current.title} className="h-full w-full object-cover" />
            </div>
            {playing && (
              <div className="absolute -bottom-3 left-1/2 flex h-8 -translate-x-1/2 items-end gap-0.5 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur">
                <span className="eq-bar" /><span className="eq-bar" style={{ animationDelay: "0.2s" }} />
                <span className="eq-bar" style={{ animationDelay: "0.4s" }} /><span className="eq-bar" style={{ animationDelay: "0.1s" }} />
              </div>
            )}
          </div>
        )}

        {/* title */}
        {panel !== "lyrics" && (
          <div className="w-full max-w-md text-center">
            <h2 className="truncate text-xl font-extrabold">{current.title}</h2>
            <p className="truncate text-sm text-zinc-300">{current.artist}</p>
          </div>
        )}

        {/* seek */}
        <div className="w-full max-w-md">
          <input
            type="range"
            min={0}
            max={Math.max(duration, 1)}
            step={0.5}
            value={Math.min(curTime, duration || 0)}
            onChange={(e) => seek(parseFloat(e.target.value))}
            className="seek w-full"
          />
          <div className="flex justify-between text-[11px] tabular-nums text-zinc-400">
            <span>{fmtTime(curTime)}</span>
            <span>{offlineDl ? "⬇ " : ""}{fmtTime(duration)}</span>
          </div>
        </div>

        {/* controls */}
        <div className="flex w-full max-w-md items-center justify-between gap-2">
          <button
            onClick={toggleShuffle}
            className={cx("rounded-full p-3 transition", shuffle ? "text-emerald-400" : "text-zinc-400 hover:text-white")}
            title={shuffle ? t("pl.shuffleOn") : t("pl.shuffle")}
          >
            <Shuffle className="h-5 w-5" />
          </button>
          <button onClick={() => player.prev()} className="rounded-full p-3 text-zinc-200 hover:text-white">
            <SkipBack className="h-7 w-7" />
          </button>
          <button
            onClick={toggle}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black shadow-xl transition hover:scale-105"
          >
            {playing ? <Pause className="h-7 w-7 fill-current" /> : <Play className="ms-1 h-7 w-7 fill-current" />}
          </button>
          <button onClick={() => player.next(false)} className="rounded-full p-3 text-zinc-200 hover:text-white">
            <SkipForward className="h-7 w-7" />
          </button>
          <button
            onClick={cycleRepeat}
            className={cx("rounded-full p-3", repeat !== "off" ? "text-emerald-400" : "text-zinc-400 hover:text-white")}
            title={t("pl.repeat")}
          >
            {repeat === "one" ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
          </button>
        </div>

        {/* actions */}
        <div className="flex w-full max-w-md items-center justify-around">
          <button
            onClick={() => {
              const was = isF;
              void toggleFav(current).then(() => push(was ? t("pl.removedFav") : t("pl.addedFav")));
            }}
            className="flex flex-col items-center gap-1 text-[10px] font-semibold text-zinc-300"
          >
            <Heart className={cx("h-6 w-6", isF ? "fill-current text-emerald-400" : "text-zinc-300")} />
            {isF ? t("pl.unlike") : t("pl.like")}
          </button>
          <button
            onClick={() => {
              if (isDownloaded || downloading.has(current.videoId)) return;
              void download(current)
                .then(() => push(t("pl.downloadDone")))
                .catch(() => push(t("pl.downloadErr"), "err"));
            }}
            className="flex flex-col items-center gap-1 text-[10px] font-semibold text-zinc-300"
          >
            {downloading.has(current.videoId) ? (
              <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
            ) : isDownloaded ? (
              <Download className="h-6 w-6 text-emerald-400" />
            ) : (
              <Download className="h-6 w-6" />
            )}
            {isDownloaded ? t("pl.downloaded") : t("pl.download")}
          </button>
          <button
            onClick={() => setPicker(true)}
            className="flex flex-col items-center gap-1 text-[10px] font-semibold text-zinc-300"
          >
            <Plus className="h-6 w-6" />
            {t("pl.addToPlaylist")}
          </button>
          <button
            onClick={() => setPanel(panel === "lyrics" ? "none" : "lyrics")}
            className={cx("flex flex-col items-center gap-1 text-[10px] font-semibold", panel === "lyrics" ? "text-emerald-400" : "text-zinc-300")}
          >
            <Mic2 className="h-6 w-6" />
            {t("pl.lyrics")}
          </button>
          <button
            onClick={() => setPanel(panel === "queue" ? "none" : "queue")}
            className={cx("flex flex-col items-center gap-1 text-[10px] font-semibold", panel === "queue" ? "text-emerald-400" : "text-zinc-300")}
          >
            <ListMusic className="h-6 w-6" />
            {t("pl.queue")}
          </button>
        </div>
      </div>

      {/* queue sheet */}
      {panel === "queue" && (
        <div className="mx-auto mb-6 w-full max-w-2xl rounded-3xl bg-black/60 p-4 backdrop-blur-xl ring-1 ring-white/10">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-bold">{t("pl.queue")}</h3>
            <button onClick={() => setPanel("none")} className="text-zinc-400 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
          <div className="max-h-56 space-y-0.5 overflow-y-auto">
            {queue.map((tr, i) => (
              <RowSong
                key={`${tr.videoId}-${i}`}
                track={tr}
                index={i}
                active={i === index}
                onPlay={() => player.playContext(queue, i, mode)}
              />
            ))}
            {queue.length === 0 && <p className="py-4 text-center text-xs text-zinc-500">—</p>}
          </div>
        </div>
      )}

      {/* playlist picker */}
      {picker && (
        <div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center" onClick={() => setPicker(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-t-3xl bg-[#16161f] p-5 ring-1 ring-white/10 sm:rounded-3xl">
            <h3 className="mb-3 font-bold">{t("pl.choosePlaylist")}</h3>
            <div className="max-h-60 space-y-1 overflow-y-auto">
              {playlists.map((pl) => (
                <button
                  key={pl.id}
                  onClick={() => void addPl(pl.id)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-start text-sm font-semibold text-zinc-100 hover:bg-white/10"
                >
                  <span className="truncate">{pl.name}</span>
                  <span className="text-xs text-zinc-500">{pl.count}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={newPlName}
                onChange={(e) => setNewPlName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void createAndAdd()}
                placeholder={t("lib.namePlaceholder")}
                className="w-full rounded-xl bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-zinc-500"
              />
              <button onClick={() => void createAndAdd()} className="shrink-0 rounded-xl bg-emerald-500 px-4 text-sm font-bold text-black hover:bg-emerald-400">
                {t("lib.create")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= Lyrics panel ================= */

function LyricPanel({ track, curTime, onBack }: { track: Track; curTime: number; onBack: () => void }) {
  const { t } = useAppState();
  const [state, setState] = useState<{ synced: LyricLine[] | null; plain: string | null; loading: boolean }>({
    synced: null,
    plain: null,
    loading: true,
  });

  useEffect(() => {
    let alive = true;
    setState({ synced: null, plain: null, loading: true });
    apiGet<{ synced: string | null; plain: string | null }>(
      `/api/lyrics?artist=${encodeURIComponent(track.artist)}&title=${encodeURIComponent(track.title)}`,
    )
      .then((r) => {
        if (!alive) return;
        if (r.synced) {
          const lines = parseSyncedLyrics(r.synced);
          setState({ synced: lines.length ? lines : null, plain: r.plain, loading: false });
        } else {
          setState({ synced: null, plain: r.plain, loading: false });
        }
      })
      .catch(() => alive && setState({ synced: null, plain: null, loading: false }));
    return () => {
      alive = false;
    };
  }, [track.videoId, track.artist, track.title]);

  let activeIdx = -1;
  if (state.synced) {
    for (let i = 0; i < state.synced.length; i++) {
      if (state.synced[i].time <= curTime + 0.3) activeIdx = i;
      else break;
    }
  }

  return (
    <div className="flex h-[26rem] w-full max-w-lg flex-col rounded-3xl bg-black/50 backdrop-blur-xl ring-1 ring-white/10">
      <div className="flex items-center justify-between px-5 py-3">
        <h3 className="font-bold">{t("pl.lyrics")}</h3>
        <button onClick={onBack} className="text-zinc-400 hover:text-white"><X className="h-4 w-4" /></button>
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto px-5 pb-5">
        {state.loading ? (
          <div className="flex h-full items-center justify-center text-zinc-400"><Spinner /></div>
        ) : state.synced ? (
          <div className="space-y-2.5 text-center">
            {state.synced.map((l, i) => (
              <p
                key={i}
                className={cx(
                  "text-sm leading-relaxed transition-all",
                  i === activeIdx ? "scale-105 text-emerald-300" : i < activeIdx ? "text-zinc-500" : "text-zinc-300/70",
                )}
              >
                {l.text}
              </p>
            ))}
          </div>
        ) : state.plain ? (
          <p className="whitespace-pre-line text-center text-sm leading-relaxed text-zinc-200">{state.plain}</p>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">{t("pl.noLyrics")}</div>
        )}
      </div>
    </div>
  );
}


