"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Track } from "@/lib/types";
import { apiGet, apiSend, deviceId } from "@/lib/utils";
import { idbAll, idbDelete, idbPut, type DownloadedSong } from "@/lib/offlineDb";

export interface PlaylistMeta {
  id: string;
  name: string;
  count: number;
}

interface LibraryCtx {
  favorites: Track[];
  playlists: PlaylistMeta[];
  downloads: DownloadedSong[];
  downloading: Set<string>;
  isFav: (videoId: string) => boolean;
  isDl: (videoId: string) => boolean;
  toggleFav: (track: Track) => Promise<void>;
  createPlaylist: (name: string) => Promise<PlaylistMeta | null>;
  deletePlaylist: (id: string) => Promise<void>;
  addToPlaylist: (playlistId: string, track: Track) => Promise<void>;
  removeFromPlaylist: (playlistId: string, videoId: string) => Promise<void>;
  download: (track: Track) => Promise<void>;
  removeDownload: (videoId: string) => Promise<void>;
  dlUrl: (videoId: string) => string | null;
  addFavLocal: (track: Track) => void;
}

const LibraryContext = createContext<LibraryCtx>({
  favorites: [],
  playlists: [],
  downloads: [],
  downloading: new Set(),
  isFav: () => false,
  isDl: () => false,
  toggleFav: async () => {},
  createPlaylist: async () => null,
  deletePlaylist: async () => {},
  addToPlaylist: async () => {},
  removeFromPlaylist: async () => {},
  download: async () => {},
  removeDownload: async () => {},
  dlUrl: () => null,
  addFavLocal: () => {},
});

export const useLibrary = () => useContext(LibraryContext);

const downloadingRef: { current: Set<string> } = { current: new Set() };
let devId = "";

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistMeta[]>([]);
  const [downloads, setDownloads] = useState<DownloadedSong[]>([]);
  const [downloading, setDownloading] = useState<Set<string>>(new Set());
  const blobUrls = useRef(new Map<string, string>());

  useEffect(() => {
    devId = deviceId();
    const d = devId;
    apiGet<{ tracks: Track[] }>(`/api/favorites?device=${encodeURIComponent(d)}`)
      .then((r) => setFavorites(r.tracks))
      .catch(() => {});
    apiGet<{ playlists: PlaylistMeta[] }>(`/api/playlists?device=${encodeURIComponent(d)}`)
      .then((r) => setPlaylists(r.playlists))
      .catch(() => {});
    idbAll()
      .then((rows) => setDownloads(rows))
      .catch(() => {});
  }, []);

  // manage object URLs for downloaded blobs
  useEffect(() => {
    const current = new Set(downloads.map((x) => x.track.videoId));
    const map = blobUrls.current;
    for (const [id, url] of map) {
      if (!current.has(id)) {
        URL.revokeObjectURL(url);
        map.delete(id);
      }
    }
    for (const dl of downloads) {
      if (!map.has(dl.track.videoId)) {
        map.set(dl.track.videoId, URL.createObjectURL(dl.blob));
      }
    }
    return () => {
      /* urls cleaned on update above */
    };
  }, [downloads]);

  const isFav = useCallback((videoId: string) => favorites.some((f) => f.videoId === videoId), [favorites]);
  const isDl = useCallback((videoId: string) => downloads.some((f) => f.track.videoId === videoId), [downloads]);

  const toggleFav = useCallback(
    async (track: Track) => {
      const d = devId || deviceId();
      const exists = favorites.some((f) => f.videoId === track.videoId);
      try {
        if (exists) {
          setFavorites((prev) => prev.filter((f) => f.videoId !== track.videoId));
          await apiSend(`/api/favorites?device=${encodeURIComponent(d)}&videoId=${track.videoId}`, "DELETE");
        } else {
          setFavorites((prev) => [track, ...prev]);
          await apiSend("/api/favorites", "POST", { device: d, track });
        }
      } catch {
        // rollback optimistic change
        if (!exists) setFavorites((prev) => prev.filter((f) => f.videoId !== track.videoId));
      }
    },
    [favorites],
  );

  const addFavLocal = useCallback((track: Track) => {
    setFavorites((prev) => (prev.some((f) => f.videoId === track.videoId) ? prev : [track, ...prev]));
  }, []);

  const createPlaylist = useCallback(async (name: string) => {
    const d = devId || deviceId();
    try {
      const res = await apiSend<{ playlist: PlaylistMeta }>("/api/playlists", "POST", {
        device: d,
        name,
      });
      setPlaylists((prev) => [res.playlist, ...prev]);
      return res.playlist;
    } catch {
      return null;
    }
  }, []);

  const deletePlaylist = useCallback(async (id: string) => {
    const d = devId || deviceId();
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
    try {
      await apiSend(`/api/playlists/${id}?device=${encodeURIComponent(d)}`, "DELETE");
    } catch {
      /* ignore */
    }
  }, []);

  const addToPlaylist = useCallback(
    async (playlistId: string, track: Track) => {
      const d = devId || deviceId();
      try {
        await apiSend(`/api/playlists/${playlistId}/tracks`, "POST", { device: d, track });
        setPlaylists((prev) =>
          prev.map((p) => (p.id === playlistId ? { ...p, count: p.count + 1 } : p)),
        );
      } catch {
        throw new Error("add failed");
      }
    },
    [],
  );

  const removeFromPlaylist = useCallback(
    async (playlistId: string, videoId: string) => {
      const d = devId || deviceId();
      try {
        await apiSend(
          `/api/playlists/${playlistId}/tracks?device=${encodeURIComponent(d)}&videoId=${videoId}`,
          "DELETE",
        );
        setPlaylists((prev) =>
          prev.map((p) => (p.id === playlistId ? { ...p, count: Math.max(0, p.count - 1) } : p)),
        );
      } catch {
        /* ignore */
      }
    },
    [],
  );

  const download = useCallback(async (track: Track) => {
    if (downloadingRef.current.has(track.videoId)) return;
    setDownloading((prev) => new Set(prev).add(track.videoId));
    downloadingRef.current.add(track.videoId);
    try {
      const res = await fetch(
        `/api/download/${track.videoId}?title=${encodeURIComponent(`${track.artist} - ${track.title}`)}`,
      );
      if (!res.ok) throw new Error(`download ${res.status}`);
      const blob = await res.blob();
      const entry: DownloadedSong = {
        track,
        blob,
        addedAt: Date.now(),
        size: blob.size,
      };
      await idbPut(track.videoId, entry);
      setDownloads((prev) => [entry, ...prev.filter((x) => x.track.videoId !== track.videoId)]);
    } finally {
      setDownloading((prev) => {
        const next = new Set(prev);
        next.delete(track.videoId);
        return next;
      });
      downloadingRef.current.delete(track.videoId);
    }
  }, []);

  const removeDownload = useCallback(async (videoId: string) => {
    setDownloads((prev) => prev.filter((x) => x.track.videoId !== videoId));
    try {
      await idbDelete(videoId);
    } catch {
      /* ignore */
    }
  }, []);

  const dlUrl = useCallback(
    (videoId: string) => blobUrls.current.get(videoId) ?? null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [downloads],
  );

  const value = useMemo(
    () => ({
      favorites,
      playlists,
      downloads,
      downloading,
      isFav,
      isDl,
      toggleFav,
      createPlaylist,
      deletePlaylist,
      addToPlaylist,
      removeFromPlaylist,
      download,
      removeDownload,
      dlUrl,
      addFavLocal,
    }),
    [
      favorites,
      playlists,
      downloads,
      downloading,
      isFav,
      isDl,
      toggleFav,
      createPlaylist,
      deletePlaylist,
      addToPlaylist,
      removeFromPlaylist,
      download,
      removeDownload,
      dlUrl,
      addFavLocal,
    ],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}
