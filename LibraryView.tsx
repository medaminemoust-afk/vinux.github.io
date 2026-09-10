"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Download, Heart, ListMusic, Play, Plus, Trash2, X,
} from "lucide-react";
import type { Track } from "@/lib/types";
import { apiGet } from "@/lib/utils";
import { useAppState } from "./app-state";
import { useLibrary, type PlaylistMeta } from "./library";
import { usePlayer } from "./player";
import { RowSong } from "./ui";

type Tab = "favorites" | "playlists" | "downloads";

export function LibraryView({ initialTab = "favorites" }: { initialTab?: Tab }) {
  const { t } = useAppState();
  const [tab, setTab] = useState<Tab>(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {(["favorites", "playlists", "downloads"] as Tab[]).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition ${
              tab === k ? "bg-emerald-500 text-black" : "bg-white/5 text-zinc-300 ring-1 ring-white/10 hover:bg-white/10"
            }`}
          >
            {k === "favorites" && <Heart className="h-4 w-4 fill-current" />}
            {k === "playlists" && <ListMusic className="h-4 w-4" />}
            {k === "downloads" && <Download className="h-4 w-4" />}
            {t(`lib.${k}`)}
          </button>
        ))}
      </div>
      {tab === "favorites" && <FavoritesTab />}
      {tab === "playlists" && <PlaylistsTab />}
      {tab === "downloads" && <DownloadsTab />}
    </div>
  );
}

/* ---------- Favorites ---------- */

function FavoritesTab() {
  const { t } = useAppState();
  const { favorites, toggleFav } = useLibrary();
  const { playContext, current } = usePlayer();

  const playAll = (list: Track[], i: number) =>
    playContext(list, i, { type: "favorites", label: t("lib.favorites") });

  return (
    <div>
      {favorites.length === 0 ? (
        <p className="rounded-2xl bg-white/5 px-5 py-10 text-center text-sm text-zinc-400">
          {t("lib.emptyFavs")}
        </p>
      ) : (
        <div className="space-y-0.5">
          {favorites.map((tr, i) => (
            <RowSong
              key={tr.videoId}
              track={tr}
              index={i}
              active={current?.videoId === tr.videoId}
              onPlay={() => playAll(favorites, i)}
              trailing={
                <button
                  onClick={() => void toggleFav(tr)}
                  className="rounded-full p-2 text-zinc-400 hover:bg-rose-500/20 hover:text-rose-400"
                  title={t("pl.unlike")}
                >
                  <Heart className="h-4 w-4 fill-current" />
                </button>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Playlists ---------- */

function PlaylistsTab() {
  const { t } = useAppState();
  const { playlists, createPlaylist, deletePlaylist } = useLibrary();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [open, setOpen] = useState<PlaylistMeta | null>(null);

  const submit = async () => {
    const n = name.trim();
    if (!n) return;
    const pl = await createPlaylist(n);
    if (pl) {
      setName("");
      setCreating(false);
    }
  };

  if (open) {
    return (
      <PlaylistDetail
        meta={open}
        onBack={() => setOpen(null)}
        onDeleted={() => {
          setOpen(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => setCreating((c) => !c)}
        className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-4 text-sm font-semibold text-zinc-200 hover:bg-white/10"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
          <Plus className="h-5 w-5" />
        </span>
        {t("lib.newPlaylist")}
      </button>

      {creating && (
        <div className="flex gap-2 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void submit()}
            placeholder={t("lib.namePlaceholder")}
            className="w-full rounded-xl bg-black/30 px-4 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-zinc-500"
          />
          <button onClick={() => void submit()} className="rounded-xl bg-emerald-500 px-4 text-sm font-bold text-black hover:bg-emerald-400">
            {t("lib.create")}
          </button>
        </div>
      )}

      {playlists.length === 0 && !creating ? (
        <p className="rounded-2xl bg-white/5 px-5 py-8 text-center text-sm text-zinc-400">{t("lib.emptyPls")}</p>
      ) : (
        playlists.map((pl) => (
          <button
            key={pl.id}
            onClick={() => setOpen(pl)}
            className="flex w-full items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 text-start ring-1 ring-white/5 transition hover:bg-white/10"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 text-emerald-300">
              <ListMusic className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold text-zinc-100">{pl.name}</span>
              <span className="text-xs text-zinc-500">
                {pl.count} {t("lib.tracks")}
              </span>
            </span>
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                void deletePlaylist(pl.id);
              }}
              className="rounded-full p-2 text-zinc-500 hover:bg-rose-500/20 hover:text-rose-400"
              title={t("lib.deletePlaylist")}
            >
              <Trash2 className="h-4 w-4" />
            </span>
          </button>
        ))
      )}
    </div>
  );
}

function PlaylistDetail({
  meta,
  onBack,
  onDeleted,
}: {
  meta: PlaylistMeta;
  onBack: () => void;
  onDeleted: () => void;
}) {
  const { t } = useAppState();
  const { removeFromPlaylist, deletePlaylist } = useLibrary();
  const { playContext, current } = usePlayer();
  const [tracks, setTracks] = useState<Track[] | null>(null);

  useEffect(() => {
    let alive = true;
    setTracks(null);
    apiGet<{ tracks: Track[] }>(`/api/playlists/${meta.id}?device=${encodeURIComponent(deviceParam())}`)
      .then((r) => alive && setTracks(r.tracks))
      .catch(() => alive && setTracks([]));
    return () => {
      alive = false;
    };
  }, [meta.id]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="rounded-full bg-white/10 p-2 text-zinc-300 hover:bg-white/20">
          <X className="h-4 w-4 rtl:rotate-180" />
        </button>
        <div>
          <h2 className="font-extrabold text-white">{meta.name}</h2>
          <p className="text-xs text-zinc-500">{meta.count} {t("lib.tracks")}</p>
        </div>
        <div className="ms-auto flex gap-2">
          {tracks && tracks.length > 0 && (
            <button
              onClick={() => playContext(tracks, 0, { type: "playlist", label: meta.name })}
              className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-bold text-black hover:bg-emerald-400"
            >
              <Play className="h-3.5 w-3.5 fill-current" /> {t("home.playAll")}
            </button>
          )}
          <button
            onClick={() => {
              void deletePlaylist(meta.id);
              onDeleted();
            }}
            className="rounded-full bg-rose-500/15 p-2 text-rose-400 hover:bg-rose-500/25"
            title={t("lib.deletePlaylist")}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      {!tracks ? (
        <p className="py-8 text-center text-sm text-zinc-500">{t("st.loading")}</p>
      ) : tracks.length === 0 ? (
        <p className="rounded-2xl bg-white/5 px-5 py-8 text-center text-sm text-zinc-400">{t("lib.emptyPls")}</p>
      ) : (
        <div className="space-y-0.5">
          {tracks.map((tr, i) => (
            <RowSong
              key={tr.videoId}
              track={tr}
              index={i}
              active={current?.videoId === tr.videoId}
              onPlay={() => playContext(tracks, i, { type: "playlist", label: meta.name })}
              trailing={
                <button
                  onClick={() => void removeFromPlaylist(meta.id, tr.videoId)}
                  className="rounded-full p-2 text-zinc-500 hover:bg-rose-500/20 hover:text-rose-400"
                >
                  <X className="h-4 w-4" />
                </button>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Downloads ---------- */

function DownloadsTab() {
  const { t } = useAppState();
  const { downloads, removeDownload } = useLibrary();
  const { playContext, current } = usePlayer();

  const play = useCallback(
    (list: { track: Track }[], i: number) => {
      const tracks = list.map((x) => x.track);
      playContext(tracks, i, { type: "mix", label: t("lib.downloads") });
    },
    [playContext, t],
  );

  return (
    <div className="space-y-3">
      {typeof navigator !== "undefined" && !navigator.onLine && (
        <p className="rounded-xl bg-amber-500/15 px-4 py-2.5 text-xs font-semibold text-amber-300 ring-1 ring-amber-500/20">
          {t("lib.offline")} ⚡ {t("lib.emptyDl")}
        </p>
      )}
      {downloads.length === 0 ? (
        <p className="rounded-2xl bg-white/5 px-5 py-10 text-center text-sm text-zinc-400">{t("lib.emptyDl")}</p>
      ) : (
        <div className="space-y-0.5">
          {downloads.map((dl, i) => (
            <RowSong
              key={dl.track.videoId}
              track={dl.track}
              index={i}
              active={current?.videoId === dl.track.videoId}
              onPlay={() => play(downloads, i)}
              trailing={
                <button
                  onClick={() => void removeDownload(dl.track.videoId)}
                  className="rounded-full p-2 text-zinc-500 hover:bg-rose-500/20 hover:text-rose-400"
                  title={t("pl.removeDownload")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function deviceParam(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem("tf_device") || "";
  } catch {
    return "";
  }
}
