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
import type { PlayMode, Track } from "@/lib/types";
import { apiGet, shuffle as shuffleArr } from "@/lib/utils";
import { useLibrary } from "./library";
import { useAppState, useToast } from "./app-state";

export type RepeatMode = "off" | "all" | "one";

interface PlayerCtx {
  queue: Track[];
  index: number;
  current: Track | null;
  playing: boolean;
  loading: boolean;
  curTime: number;
  duration: number;
  mode: PlayMode;
  shuffle: boolean;
  repeat: RepeatMode;
  playContext: (tracks: Track[], start: number, mode: PlayMode, opts?: { shuffleOn?: boolean }) => void;
  toggle: () => void;
  next: (auto?: boolean) => void;
  prev: () => void;
  seek: (s: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
}

const noop = () => {};

const PlayerContext = createContext<PlayerCtx>({
  queue: [],
  index: -1,
  current: null,
  playing: false,
  loading: false,
  curTime: 0,
  duration: 0,
  mode: { type: "mix", label: "" },
  shuffle: true,
  repeat: "all",
  playContext: noop,
  toggle: noop,
  next: noop,
  prev: noop,
  seek: noop,
  toggleShuffle: noop,
  cycleRepeat: noop,
});

export const usePlayer = () => useContext(PlayerContext);

const isRadioMode = (m: PlayMode) => m.type === "artist" || m.type === "style" || m.type === "mix";

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { dlUrl } = useLibrary();
  const { t } = useAppState();
  const { push } = useToast();

  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(-1);
  const [tick, setTick] = useState(0); // forces (re)load even when index is unchanged
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [curTime, setCurTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mode, setMode] = useState<PlayMode>({ type: "mix", label: "" });
  const [shuffle, setShuffle] = useState(true); // "next music random" by default
  const [repeat, setRepeat] = useState<RepeatMode>("all");

  const queueRef = useRef(queue);
  queueRef.current = queue;
  const indexRef = useRef(index);
  indexRef.current = index;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const shuffleRef = useRef(shuffle);
  shuffleRef.current = shuffle;
  const repeatRef = useRef(repeat);
  repeatRef.current = repeat;
  const dlUrlRef = useRef(dlUrl);
  dlUrlRef.current = dlUrl;
  const playedRef = useRef<Set<string>>(new Set());
  const errStreakRef = useRef(0);
  const refillingRef = useRef(false);

  const current = index >= 0 && index < queue.length ? queue[index] : null;

  const srcFor = useCallback((tr: Track): string => {
    const local = dlUrlRef.current(tr.videoId);
    return local || `/api/stream/${tr.videoId}`;
  }, []);

  const playIndex = useCallback((i: number) => {
    const q = queueRef.current;
    if (!q.length || i < 0 || i >= q.length) return;
    playedRef.current.add(q[i].videoId);
    setIndex(i);
    setTick((x) => x + 1);
    setPlaying(true);
  }, []);

  // Load + play whenever a new track is requested.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || tick === 0) return;
    const tr = queueRef.current[indexRef.current];
    if (!tr) return;
    setLoading(true);
    setCurTime(0);
    setDuration(tr.duration || 0);
    audio.src = srcFor(tr);
    audio.load();
    audio.play().catch(() => {
      /* autoplay may be blocked until user gesture */
    });
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: tr.title,
          artist: tr.artist,
          album: modeRef.current.label || "Vinux",
          artwork: [{ src: tr.thumbnail, sizes: "480x360", type: "image/jpeg" }],
        });
      } catch {
        /* ignore */
      }
    }
  }, [tick, srcFor]);

  const playContext = useCallback(
    (tracks: Track[], start: number, m: PlayMode, opts?: { shuffleOn?: boolean }) => {
      if (!tracks.length) return;
      let list = tracks;
      let startIdx = Math.min(Math.max(0, start), tracks.length - 1);
      if (opts?.shuffleOn) {
        list = shuffleArr(tracks);
        startIdx = 0;
      }
      playedRef.current = new Set();
      errStreakRef.current = 0;
      queueRef.current = list;
      setQueue(list);
      setMode(m);
      playIndex(startIdx);
    },
    [playIndex],
  );

  const fetchRadio = useCallback(async (m: PlayMode, seed: Track): Promise<Track[]> => {
    let url: string;
    if (m.type === "style" && m.param) {
      url = `/api/songs?style=${encodeURIComponent(m.param)}`;
    } else if (m.type === "artist" && m.param) {
      url = `/api/songs?artist=${encodeURIComponent(m.param)}`;
    } else {
      url = `/api/songs?relatedArtist=${encodeURIComponent(seed.artist)}&relatedTitle=${encodeURIComponent(
        seed.title,
      )}&exclude=${seed.videoId}`;
    }
    const res = await apiGet<{ tracks: Track[] }>(url);
    return res.tracks || [];
  }, []);

  /** Fetch more songs for the current radio and append them. Returns count added. */
  const refill = useCallback(async (): Promise<number> => {
    if (refillingRef.current) return 0;
    refillingRef.current = true;
    try {
      const q = queueRef.current;
      const seed = q[indexRef.current] || q[q.length - 1];
      if (!seed) return 0;
      const fresh = await fetchRadio(modeRef.current, seed);
      const have = new Set(q.map((x) => x.videoId));
      const add = fresh.filter((x) => !have.has(x.videoId)).slice(0, 40);
      if (add.length) {
        const nq = [...queueRef.current, ...add];
        queueRef.current = nq;
        setQueue(nq);
      }
      return add.length;
    } catch {
      return 0;
    } finally {
      refillingRef.current = false;
    }
  }, [fetchRadio]);

  const next = useCallback(
    async (auto = false) => {
      const q = queueRef.current;
      if (!q.length) return;
      const cur = indexRef.current;
      const m = modeRef.current;
      const rep = repeatRef.current;
      const radio = isRadioMode(m);

      if (auto && rep === "one") {
        const audio = audioRef.current;
        if (audio) {
          audio.currentTime = 0;
          void audio.play().catch(() => {});
        }
        return;
      }

      const pickRandom = (from: number[]) => from[Math.floor(Math.random() * from.length)];

      if (shuffleRef.current) {
        const unplayed = q.map((_, i) => i).filter((i) => i !== cur && !playedRef.current.has(q[i].videoId));
        if (unplayed.length) {
          playIndex(pickRandom(unplayed));
          return;
        }
        if (radio) {
          const before = queueRef.current.length;
          const added = await refill();
          if (added > 0) {
            const nq = queueRef.current;
            const fresh = nq.map((_, i) => i).filter((i) => i >= before);
            playIndex(pickRandom(fresh));
            return;
          }
        }
        if (rep === "all" || radio) {
          playedRef.current = new Set();
          const others = q.map((_, i) => i).filter((i) => i !== cur);
          playIndex(others.length ? pickRandom(others) : cur);
          return;
        }
        if (auto) setPlaying(false);
        return;
      }

      // sequential
      const ni = cur + 1;
      if (ni < q.length) {
        playIndex(ni);
        return;
      }
      if (radio) {
        const added = await refill();
        if (added > 0) {
          playIndex(ni);
          return;
        }
      }
      if (rep === "all" || radio) {
        playedRef.current = new Set();
        playIndex(0);
        return;
      }
      if (auto) setPlaying(false);
    },
    [playIndex, refill],
  );

  // Pre-fetch more radio songs when the queue is nearly exhausted.
  useEffect(() => {
    if (!current) return;
    const q = queueRef.current;
    const remaining = shuffleRef.current
      ? q.filter((x) => !playedRef.current.has(x.videoId)).length
      : q.length - 1 - indexRef.current;
    if (isRadioMode(modeRef.current) && remaining <= 2) {
      void refill();
    }
  }, [current, refill]);

  const prev = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 4) {
      audio.currentTime = 0;
      return;
    }
    const q = queueRef.current;
    if (!q.length) return;
    const ni = indexRef.current <= 0 ? q.length - 1 : indexRef.current - 1;
    playIndex(ni);
  }, [playIndex]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !queueRef.current.length) return;
    if (audio.paused) {
      void audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, []);

  // Audio element events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setCurTime(audio.currentTime);
    const onDur = () => {
      if (isFinite(audio.duration) && audio.duration > 0) setDuration(audio.duration);
    };
    const onWaiting = () => setLoading(true);
    const onCanPlay = () => setLoading(false);
    const onPlaying = () => {
      setLoading(false);
      setPlaying(true);
      errStreakRef.current = 0;
    };
    const onEnded = () => {
      void next(true);
    };
    const onError = () => {
      setLoading(false);
      const cur = queueRef.current[indexRef.current];
      if (!cur) return;
      const local = dlUrlRef.current(cur.videoId);
      if (local && navigator.onLine && !audio.src.startsWith("/api/") && !audio.src.includes("/api/stream/")) {
        // local blob failed — retry through network
        audio.src = `/api/stream/${cur.videoId}`;
        audio.load();
        void audio.play().catch(() => {});
        return;
      }
      if (!navigator.onLine) {
        setPlaying(false);
        return;
      }
      errStreakRef.current += 1;
      if (errStreakRef.current > 4) {
        setPlaying(false);
        push(t("pl.err"), "err");
        return;
      }
      push(t("pl.playErr"), "err");
      void next(true);
    };
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("durationchange", onDur);
    audio.addEventListener("loadedmetadata", onDur);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("durationchange", onDur);
      audio.removeEventListener("loadedmetadata", onDur);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [next, push, t]);

  const seek = useCallback((s: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = s;
    setCurTime(s);
  }, []);

  const toggleShuffle = useCallback(() => setShuffle((s) => !s), []);
  const cycleRepeat = useCallback(() => {
    setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off"));
  }, []);

  // Media Session (lock screen / headset buttons)
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.setActionHandler("play", () => toggle());
      navigator.mediaSession.setActionHandler("pause", () => toggle());
      navigator.mediaSession.setActionHandler("nexttrack", () => void next(false));
      navigator.mediaSession.setActionHandler("previoustrack", () => prev());
    } catch {
      /* ignore */
    }
  }, [toggle, next, prev]);

  const nextPublic = useCallback((auto?: boolean) => void next(!!auto), [next]);

  const value = useMemo<PlayerCtx>(
    () => ({
      queue,
      index,
      current,
      playing,
      loading,
      curTime,
      duration,
      mode,
      shuffle,
      repeat,
      playContext,
      toggle,
      next: nextPublic,
      prev,
      seek,
      toggleShuffle,
      cycleRepeat,
    }),
    [queue, index, current, playing, loading, curTime, duration, mode, shuffle, repeat, playContext, toggle, nextPublic, prev, seek, toggleShuffle, cycleRepeat],
  );

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="auto" playsInline />
    </PlayerContext.Provider>
  );
}
