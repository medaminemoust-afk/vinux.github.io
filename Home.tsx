"use client";

import { useCallback, useEffect, useState } from "react";
import { Play, Radio } from "lucide-react";
import type { PlayMode, Track } from "@/lib/types";
import { REGION_LABEL_KEYS } from "@/lib/pools";
import { apiGet, cx } from "@/lib/utils";
import { useAppState } from "./app-state";
import { usePlayer } from "./player";
import { ArtistImg, CoverCard, ErrBox, SkeletonCards, useArtistImages } from "./ui";

interface SectionDef {
  title: string;
  url: string;
  mode: PlayMode;
}

function useSection(def: SectionDef) {
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [error, setError] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setTracks(null);
    setError(false);
    apiGet<{ tracks: Track[] }>(def.url)
      .then((r) => {
        if (alive) setTracks(r.tracks.slice(0, 20));
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, [def.url, nonce]);

  return { tracks, error, retry: () => setNonce((n) => n + 1) };
}

function TrackSection({
  def,
  highlight,
  onTitle,
}: {
  def: SectionDef;
  highlight?: boolean;
  onTitle?: () => void;
}) {
  const { t } = useAppState();
  const { playContext } = usePlayer();
  const { tracks, error, retry } = useSection(def);

  const play = useCallback(
    (start: number) => {
      if (!tracks?.length) return;
      playContext(tracks, start, def.mode, { shuffleOn: false });
    },
    [tracks, def.mode, playContext],
  );

  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        {onTitle ? (
          <button
            onClick={onTitle}
            className={cx(
              "text-start font-extrabold tracking-tight text-zinc-100 transition hover:text-emerald-300",
              highlight ? "text-xl" : "text-lg",
            )}
          >
            {def.title} ↗
          </button>
        ) : (
          <h2 className={cx("font-extrabold tracking-tight text-zinc-100", highlight ? "text-xl" : "text-lg")}>
            {def.title}
          </h2>
        )}
        {tracks && tracks.length > 0 && (
          <button
            onClick={() => play(0)}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/8 px-3 py-1.5 text-xs font-bold text-zinc-200 ring-1 ring-white/10 transition hover:bg-emerald-500 hover:text-black"
          >
            <Play className="h-3.5 w-3.5 fill-current" /> {t("home.playAll")}
          </button>
        )}
      </div>
      {error ? (
        <ErrBox label={t("home.loadFailed")} onRetry={retry} />
      ) : !tracks ? (
        <SkeletonCards />
      ) : tracks.length === 0 ? (
        <p className="text-sm text-zinc-500">—</p>
      ) : (
        <div className="scrollbar-none -mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
          {tracks.map((tr, i) => (
            <CoverCard key={tr.videoId} track={tr} onPlay={() => play(i)} />
          ))}
        </div>
      )}
    </section>
  );
}

export function Home({
  onArtist,
  onEditTaste,
}: {
  onArtist: (name: string) => void;
  onEditTaste: () => void;
}) {
  const { t, settings, regionInfo } = useAppState();
  useArtistImages(settings.artists);
  const hour = new Date().getHours();
  const greet =
    hour < 12 ? t("home.greetingMorning") : hour < 18 ? t("home.greetingAfternoon") : t("home.greetingEvening");

  const regionKey =
    settings.region && settings.region !== "global" ? settings.region : regionInfo?.regionKey || "global";

  const styleRadioMode = (key: string): PlayMode => ({ type: "style", label: `${t("home.styleRadio")}`, param: key });

  return (
    <div className="space-y-10">
      <div>
        <p className="text-sm font-medium text-emerald-400">{t("app.name")} 🎧</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">{greet}</h1>
        <p className="mt-1 text-xs text-zinc-500">
          {regionInfo?.country && regionInfo.country !== "Unknown" ? `${regionInfo.flag} ${regionInfo.country} · ` : ""}
          {t("app.tagline")}
        </p>
      </div>

      {/* Your artists — photos */}
      {settings.artists.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-extrabold tracking-tight text-zinc-100">{t("home.yourArtists")}</h2>
          <div className="scrollbar-none -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
            {settings.artists.map((name) => (
              <button
                key={name}
                onClick={() => onArtist(name)}
                className="group flex w-24 shrink-0 flex-col items-center gap-2 text-center"
              >
                <ArtistImg
                  name={name}
                  className="h-20 w-20 rounded-full shadow-lg shadow-black/40 ring-2 ring-white/10 transition group-hover:ring-emerald-400"
                  textClass="text-2xl"
                />
                <span className="line-clamp-2 text-xs font-semibold text-zinc-200">{name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Style radios first (the style the user loves keeps playing) */}
      {settings.styles.slice(0, 3).map((key) => (
        <TrackSection
          key={`st-${key}`}
          highlight
          def={{
            title: `${key} ${t("home.styleRadio")}`,
            url: `/api/songs?style=${encodeURIComponent(key)}`,
            mode: styleRadioMode(key),
          }}
        />
      ))}

      {/* Artist sections */}
      {settings.artists.map((name) => (
        <TrackSection
          key={`ar-${name}`}
          onTitle={() => onArtist(name)}
          def={{
            title: name,
            url: `/api/songs?artist=${encodeURIComponent(name)}`,
            mode: { type: "artist", label: name, param: name },
          }}
        />
      ))}

      {/* regional + global */}
      {regionKey !== "global" && (
        <TrackSection
          def={{
            title: t("home.trendingIn", { region: t(REGION_LABEL_KEYS[regionKey] || "region.global") }),
            url: `/api/songs?region=${encodeURIComponent(regionKey)}`,
            mode: { type: "mix", label: t("home.trendingIn", { region: regionKey }) },
          }}
        />
      )}
      <TrackSection
        def={{
          title: t("home.globalHits"),
          url: "/api/songs?region=global",
          mode: { type: "mix", label: t("home.globalHits") },
        }}
      />

      {settings.artists.length === 0 && settings.styles.length === 0 && (
        <button
          onClick={onEditTaste}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-white/5 py-8 text-sm text-zinc-300 transition hover:bg-white/10"
        >
          <Radio className="h-5 w-5 text-emerald-400" /> {t("nav.editTaste")}
        </button>
      )}
    </div>
  );
}
