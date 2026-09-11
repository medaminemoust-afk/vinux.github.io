"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  ChevronDown, Download, Heart, ListMusic, Loader2, Mic2, Pause,
  Play, Plus, Repeat, Repeat1, Shuffle, SkipBack, SkipForward,
  Volume1, Volume2, VolumeX, X,
} from "lucide-react";
import type { Track } from "@/lib/types";
import { useApi } from "@/lib/useApi";
import { cx, fmtTime, parseSyncedLyrics } from "@/lib/utils";
import { useAppState, useToast } from "./app-state";
import { useLibrary } from "./library";
import { usePlayer } from "./player";
import { bgStyle, RowSong, Spinner } from "./ui";

/* ================= Shared bits ================= */

/** Range input whose filled portion is driven by a CSS var (see globals.css). */
function Bar({
  value,
  max,
  onChange,
  className,
  label,
  step = 1,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
  className?: string;
  label: string;
  step?: number;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <input
      type="range"
      min={0}
      max={max}
      step={step}
      value={value}
      aria-label={label}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className={cx("bar", className)}
      style={{ "--pct": `${pct}%` } as CSSProperties}
    />
  );
}

function VolumeControl() {
  const { t } = useAppState();
  const { volume, muted, setVolume, toggleMute } = usePlayer();
  const Icon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleMute}
        className="text-subdued transition hover:text-white"
        aria-label={muted ? t("pl.unmute") : t("pl.mute")}
        title={muted ? t("pl.unmute") : t("pl.mute")}
      >
        <Icon className="h-5 w-5" />
      </button>
      <Bar
        label={t("pl.volume")}
        value={muted ? 0 : volume}
        max={1}
        step={0.01}
        onChange={setVolume}
        className="w-24"
      />
    </div>
  );
}

/* ================= Player bottom bar ================= */

export function PlayerBar({ onOpen }: { onOpen: () => void }) {
  const { t } = useAppState();
  const {
    current, playing, loading, toggle, next, prev, curTime, duration, seek,
    shuffle, toggleShuffle, repeat, cycleRepeat,
  } = usePlayer();
  const { isFav, toggleFav, isDl, download, downloading } = useLibrary();
  const { push } = useToast();

  if (!current) return null;

  const fav = isFav(current.videoId);
  const like = () => {
    void toggleFav(current).then(() => push(fav ? t("pl.removedFav") : t("pl.addedFav")));
  };

  return (
    <div className="shrink-0 border-t border-line bg-chrome px-4 py-2.5">
      <div className="flex items-center gap-4">
        {/* Left — track */}
        <div className="flex min-w-0 flex-1 items-center gap-3 md:w-[30%] md:flex-none">
          <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-start" aria-label={t("pl.nowPlaying")}>
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-white/10">
              <img src={current.thumbnail} alt="" className="yt-thumb h-full w-full" />
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <Spinner className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-white">{current.title}</div>
              <div className="truncate text-xs text-subdued">{current.artist}</div>
            </div>
          </button>

          <button
            onClick={like}
            className={cx("hidden shrink-0 p-2 transition sm:block", fav ? "text-accent-bright" : "text-subdued hover:text-white")}
            aria-label={fav ? t("pl.unlike") : t("pl.like")}
            title={fav ? t("pl.unlike") : t("pl.like")}
          >
            <Heart className={cx("h-4 w-4", fav && "fill-current")} />
          </button>
        </div>

        {/* Center — transport + seek */}
        <div className="flex flex-col items-center gap-1 md:flex-1">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={toggleShuffle}
              className={cx("hidden transition md:block", shuffle ? "text-accent-bright" : "text-subdued hover:text-white")}
              aria-label={t("pl.shuffle")}
              aria-pressed={shuffle}
              title={shuffle ? t("pl.shuffleOn") : t("pl.shuffle")}
            >
              <Shuffle className="h-4 w-4" />
            </button>
            <button
              onClick={prev}
              className="hidden text-subdued transition hover:text-white sm:block"
              aria-label={t("pl.prev")}
              title={t("pl.prev")}
            >
              <SkipBack className="h-5 w-5 fill-current" />
            </button>
            <button
              onClick={toggle}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-black transition hover:scale-105"
              aria-label={playing ? t("pl.pause") : t("pl.play")}
              title={playing ? t("pl.pause") : t("pl.play")}
            >
              {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ms-0.5 h-4 w-4 fill-current" />}
            </button>
            <button
              onClick={() => next(false)}
              className="text-subdued transition hover:text-white"
              aria-label={t("pl.next")}
              title={t("pl.next")}
            >
              <SkipForward className="h-5 w-5 fill-current" />
            </button>
            <button
              onClick={cycleRepeat}
              className={cx("hidden transition md:block", repeat !== "off" ? "text-accent-bright" : "text-subdued hover:text-white")}
              aria-label={t("pl.repeat")}
              title={t("pl.repeat")}
            >
              {repeat === "one" ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
            </button>
          </div>

          <div className="hidden w-full max-w-xl items-center gap-2 md:flex">
            <span className="w-10 text-end text-[11px] tabular-nums text-subdued">{fmtTime(curTime)}</span>
            <Bar
              label={t("pl.seek")}
              value={Math.min(curTime, duration || 0)}
              max={Math.max(duration, 1)}
              step={0.5}
              onChange={seek}
              className="flex-1"
            />
            <span className="w-10 text-[11px] tabular-nums text-subdued">{fmtTime(duration)}</span>
          </div>
        </div>

        {/* Right — download + volume */}
        <div className="hidden items-center justify-end gap-3 md:flex md:w-[30%]">
          {!isDl(current.videoId) ? (
            <button
              onClick={() => {
                if (downloading.has(current.videoId)) return;
                void download(current)
                  .then(() => push(t("pl.downloadDone")))
                  .catch(() => push(t("pl.downloadErr"), "err"));
              }}
              className="text-subdued transition hover:text-white"
              aria-label={t("pl.download")}
              title={t("pl.download")}
            >
              {downloading.has(current.videoId) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </button>
          ) : (
            <span className="text-accent-bright" title={t("pl.downloaded")}>
              <Download className="h-4 w-4" />
            </span>
          )}
          <VolumeControl />
        </div>
      </div>

      {/* Mobile progress hairline */}
      <div className="mt-2 h-0.5 w-full bg-white/20 md:hidden">
        <div
          className="h-full bg-white transition-[width] duration-300"
          style={{ width: `${duration > 0 ? (curTime / duration) * 100 : 0}%` }}
        />
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
          <p className="text-[11px] font-bold uppercase tracking-widest text-accent-bright">{t("pl.nowPlaying")}</p>
          <p className="truncate text-xs text-subdued">{modeLabel}</p>
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
            <div className="h-60 w-60 overflow-hidden rounded-lg shadow-2xl shadow-black/60 sm:h-80 sm:w-80">
              <img src={current.thumbnail} alt={current.title} className="yt-thumb h-full w-full" />
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
            <p className="truncate text-sm text-subdued">{current.artist}</p>
          </div>
        )}

        {/* seek */}
        <div className="w-full max-w-md">
          <Bar
            label={t("pl.seek")}
            value={Math.min(curTime, duration || 0)}
            max={Math.max(duration, 1)}
            step={0.5}
            onChange={seek}
            className="w-full"
          />
          <div className="flex justify-between text-[11px] tabular-nums text-subdued">
            <span>{fmtTime(curTime)}</span>
            <span>{offlineDl ? "⬇ " : ""}{fmtTime(duration)}</span>
          </div>
        </div>

        {/* controls */}
        <div className="flex w-full max-w-md items-center justify-between gap-2">
          <button
            onClick={toggleShuffle}
            className={cx("rounded-full p-3 transition", shuffle ? "text-accent-bright" : "text-subdued hover:text-white")}
            title={shuffle ? t("pl.shuffleOn") : t("pl.shuffle")}
          >
            <Shuffle className="h-5 w-5" />
          </button>
          <button onClick={() => player.prev()} className="rounded-full p-3 text-white hover:text-white">
            <SkipBack className="h-7 w-7" />
          </button>
          <button
            onClick={toggle}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black shadow-xl transition hover:scale-105"
          >
            {playing ? <Pause className="h-7 w-7 fill-current" /> : <Play className="ms-1 h-7 w-7 fill-current" />}
          </button>
          <button onClick={() => player.next(false)} className="rounded-full p-3 text-white hover:text-white">
            <SkipForward className="h-7 w-7" />
          </button>
          <button
            onClick={cycleRepeat}
            className={cx("rounded-full p-3", repeat !== "off" ? "text-accent-bright" : "text-subdued hover:text-white")}
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
            className="flex flex-col items-center gap-1 text-[10px] font-semibold text-subdued"
          >
            <Heart className={cx("h-6 w-6", isF ? "fill-current text-accent-bright" : "text-subdued")} />
            {isF ? t("pl.unlike") : t("pl.like")}
          </button>
          <button
            onClick={() => {
              if (isDownloaded || downloading.has(current.videoId)) return;
              void download(current)
                .then(() => push(t("pl.downloadDone")))
                .catch(() => push(t("pl.downloadErr"), "err"));
            }}
            className="flex flex-col items-center gap-1 text-[10px] font-semibold text-subdued"
          >
            {downloading.has(current.videoId) ? (
              <Loader2 className="h-6 w-6 animate-spin text-accent-bright" />
            ) : isDownloaded ? (
              <Download className="h-6 w-6 text-accent-bright" />
            ) : (
              <Download className="h-6 w-6" />
            )}
            {isDownloaded ? t("pl.downloaded") : t("pl.download")}
          </button>
          <button
            onClick={() => setPicker(true)}
            className="flex flex-col items-center gap-1 text-[10px] font-semibold text-subdued"
          >
            <Plus className="h-6 w-6" />
            {t("pl.addToPlaylist")}
          </button>
          <button
            onClick={() => setPanel(panel === "lyrics" ? "none" : "lyrics")}
            className={cx("flex flex-col items-center gap-1 text-[10px] font-semibold", panel === "lyrics" ? "text-accent-bright" : "text-subdued")}
          >
            <Mic2 className="h-6 w-6" />
            {t("pl.lyrics")}
          </button>
          <button
            onClick={() => setPanel(panel === "queue" ? "none" : "queue")}
            className={cx("flex flex-col items-center gap-1 text-[10px] font-semibold", panel === "queue" ? "text-accent-bright" : "text-subdued")}
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
            <button onClick={() => setPanel("none")} className="text-subdued hover:text-white"><X className="h-4 w-4" /></button>
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
            {queue.length === 0 && <p className="py-4 text-center text-xs text-white/40">—</p>}
          </div>
        </div>
      )}

      {/* playlist picker */}
      {picker && (
        <div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center" onClick={() => setPicker(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-t-3xl bg-elevated p-5 ring-1 ring-white/10 sm:rounded-3xl">
            <h3 className="mb-3 font-bold">{t("pl.choosePlaylist")}</h3>
            <div className="max-h-60 space-y-1 overflow-y-auto">
              {playlists.map((pl) => (
                <button
                  key={pl.id}
                  onClick={() => void addPl(pl.id)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-start text-sm font-semibold text-white hover:bg-white/10"
                >
                  <span className="truncate">{pl.name}</span>
                  <span className="text-xs text-white/40">{pl.count}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={newPlName}
                onChange={(e) => setNewPlName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void createAndAdd()}
                placeholder={t("lib.namePlaceholder")}
                className="w-full rounded-xl bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/40"
              />
              <button onClick={() => void createAndAdd()} className="shrink-0 rounded-xl bg-accent px-4 text-sm font-bold text-black hover:bg-accent-bright">
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
  const { data, error, loading } = useApi<{ synced: string | null; plain: string | null }>(
    `/api/lyrics?artist=${encodeURIComponent(track.artist)}&title=${encodeURIComponent(track.title)}`,
  );

  const synced = useMemo(() => {
    if (!data?.synced) return null;
    const lines = parseSyncedLyrics(data.synced);
    return lines.length ? lines : null;
  }, [data]);
  const plain = error ? null : data?.plain ?? null;

  let activeIdx = -1;
  if (synced) {
    for (let i = 0; i < synced.length; i++) {
      if (synced[i].time <= curTime + 0.3) activeIdx = i;
      else break;
    }
  }

  return (
    <div className="flex h-[26rem] w-full max-w-lg flex-col rounded-3xl bg-black/50 backdrop-blur-xl ring-1 ring-white/10">
      <div className="flex items-center justify-between px-5 py-3">
        <h3 className="font-bold">{t("pl.lyrics")}</h3>
        <button onClick={onBack} className="text-subdued hover:text-white"><X className="h-4 w-4" /></button>
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto px-5 pb-5">
        {loading ? (
          <div className="flex h-full items-center justify-center text-subdued"><Spinner /></div>
        ) : synced ? (
          <div className="space-y-2.5 text-center">
            {synced.map((l, i) => (
              <p
                key={i}
                className={cx(
                  "text-sm leading-relaxed transition-all",
                  i === activeIdx ? "scale-105 text-accent-bright" : i < activeIdx ? "text-white/40" : "text-subdued/70",
                )}
              >
                {l.text}
              </p>
            ))}
          </div>
        ) : plain ? (
          <p className="whitespace-pre-line text-center text-sm leading-relaxed text-white">{plain}</p>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-white/40">{t("pl.noLyrics")}</div>
        )}
      </div>
    </div>
  );
}


