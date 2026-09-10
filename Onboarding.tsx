"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronRight, Globe2, Music2, X } from "lucide-react";
import { GLOBAL_ARTISTS, REGIONS, REGION_LABEL_KEYS, STYLES, artistsOfRegion } from "@/lib/pools";
import { LANGS } from "@/lib/i18n";
import { useAppState } from "./app-state";
import { ArtistImg, useArtistImages } from "./ui";
import { cx } from "@/lib/utils";

export function Onboarding({ onDone, onCancel }: { onDone: () => void; onCancel?: () => void }) {
  const { t, settings, saveSettings, regionInfo, setLang: applyLang } = useAppState();
  const [step, setStep] = useState(settings.onboarded ? 1 : 0);
  const [lang, setLangLocal] = useState(settings.lang);
  const [region, setRegion] = useState(
    settings.onboarded && settings.region
      ? settings.region
      : regionInfo?.regionKey && regionInfo.regionKey !== "global"
        ? regionInfo.regionKey
        : "global",
  );
  const [artists, setArtists] = useState<string[]>(settings.artists);
  const [styles, setStyles] = useState<string[]>(settings.styles);
  const touchedRegion = useRef(settings.onboarded);

  // Apply the language immediately so the whole onboarding is translated live.
  const setLang = (l: typeof lang) => {
    setLangLocal(l);
    applyLang(l);
  };

  // When IP geolocation arrives after mount, jump to the detected region.
  useEffect(() => {
    if (!touchedRegion.current && regionInfo?.regionKey && regionInfo.regionKey !== "global") {
      setRegion(regionInfo.regionKey);
    }
  }, [regionInfo]);

  const detectedKey = regionInfo?.regionKey;
  const tabs = useMemo(() => {
    const keys = ["global"];
    if (detectedKey && detectedKey !== "global") keys.push(detectedKey);
    for (const r of REGIONS) if (!keys.includes(r.key)) keys.push(r.key);
    return keys;
  }, [detectedKey]);

  const pool = region === "global" ? GLOBAL_ARTISTS : artistsOfRegion(region);
  useArtistImages(pool);

  const toggleArtist = (name: string) => {
    setArtists((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : prev.length >= 5 ? prev : [...prev, name],
    );
  };
  const toggleStyle = (key: string) => {
    setStyles((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key],
    );
  };

  const finish = () => {
    saveSettings({ onboarded: true, lang, region, artists, styles });
    onDone();
  };

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-[#08080f] text-zinc-100">
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-5 py-8">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 shadow-lg shadow-emerald-500/30">
            <Music2 className="h-6 w-6 text-black" />
          </span>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">{t("app.name")}</h1>
            <p className="text-xs text-zinc-400">{t("app.tagline")}</p>
          </div>
          <div className="ms-auto flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={cx("h-1.5 rounded-full transition-all", i === step ? "w-6 bg-emerald-400" : "w-1.5 bg-white/20")}
              />
            ))}
            {onCancel && settings.onboarded && (
              <button
                onClick={onCancel}
                className="ms-3 rounded-full bg-white/10 p-2 text-zinc-300 hover:bg-white/20"
                title={t("common.close")}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* STEP 0 — language */}
        {step === 0 && (
          <div className="my-auto">
            <h2 className="text-3xl font-extrabold">{t("ob.chooseLang")}</h2>
            <p className="mt-2 text-zinc-400">{t("ob.subtitle")}</p>
            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={cx(
                    "flex items-center gap-4 rounded-2xl border p-4 text-start transition",
                    lang === l.code
                      ? "border-emerald-400/60 bg-emerald-400/10"
                      : "border-white/10 bg-white/5 hover:bg-white/10",
                  )}
                >
                  <span className="text-3xl">{l.flag}</span>
                  <span className="text-lg font-bold">{l.label}</span>
                  {lang === l.code && <Check className="ms-auto h-5 w-5 text-emerald-400" />}
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(1)}
              className="mt-10 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-base font-bold text-black transition hover:bg-emerald-400"
            >
              {t("ob.continue")} <ChevronRight className="h-5 w-5 rtl:rotate-180" />
            </button>
          </div>
        )}

        {/* STEP 1 — artists by region */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-extrabold sm:text-3xl">{t("ob.regionTitle")}</h2>
            <p className="mt-2 text-sm text-zinc-400">{t("ob.regionHint")}</p>
            {regionInfo?.country && detectedKey && detectedKey !== "global" && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 ring-1 ring-white/10">
                <Globe2 className="h-3.5 w-3.5 text-emerald-400" />
                {t("ob.detected")}: {regionInfo.flag} {regionInfo.country}
              </div>
            )}

            <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
              {tabs.map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    touchedRegion.current = true;
                    setRegion(key);
                  }}
                  className={cx(
                    "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition",
                    region === key
                      ? "bg-emerald-500 text-black"
                      : "bg-white/5 text-zinc-300 ring-1 ring-white/10 hover:bg-white/10",
                  )}
                >
                  {key === "global" ? t("region.global") : t(REGION_LABEL_KEYS[key] || "region.global")}
                </button>
              ))}
            </div>

            <p className="mt-5 text-sm text-zinc-400">
              {t("ob.pickArtists")}{" "}
              <span className="text-emerald-400">
                {artists.length}/5
              </span>
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {pool.map((name) => {
                const sel = artists.includes(name);
                return (
                  <button
                    key={name}
                    onClick={() => toggleArtist(name)}
                    className={cx(
                      "flex flex-col items-center gap-2 rounded-2xl p-3 text-center transition ring-1",
                      sel
                        ? "bg-emerald-400/10 ring-emerald-400/70"
                        : "bg-white/5 ring-white/5 hover:bg-white/10",
                    )}
                  >
                    <div className="relative">
                      <ArtistImg
                        name={name}
                        className="h-16 w-16 rounded-full shadow-lg"
                      />
                      {sel && (
                        <span className="absolute -bottom-1 -end-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-black ring-2 ring-[#08080f]">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>
                    <span className="line-clamp-2 text-xs font-semibold leading-tight">{name}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex items-center justify-between gap-3">
              <button onClick={() => setStep(0)} className="rounded-xl px-4 py-3 text-sm font-semibold text-zinc-400 hover:text-white">
                ←
              </button>
              <button
                onClick={() => setStep(2)}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 font-bold text-black transition hover:bg-emerald-400"
              >
                {t("ob.continue")} <ChevronRight className="h-5 w-5 rtl:rotate-180" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 — styles */}
        {step === 2 && (
          <div className="my-auto">
            <h2 className="text-2xl font-extrabold sm:text-3xl">{t("ob.pickStyles")}</h2>
            <p className="mt-2 text-sm text-zinc-400">{t("ob.stylesHint")}</p>
            <div className="mt-8 flex flex-wrap gap-2.5">
              {STYLES.map((s) => {
                const sel = styles.includes(s.key);
                return (
                  <button
                    key={s.key}
                    onClick={() => toggleStyle(s.key)}
                    className={cx(
                      "flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ring-1",
                      sel
                        ? "bg-emerald-500 text-black ring-emerald-400"
                        : "bg-white/5 text-zinc-200 ring-white/10 hover:bg-white/10",
                    )}
                  >
                    <span>{s.emoji}</span>
                    {t(s.labelKey)}
                    {sel && <Check className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
            <button
              onClick={finish}
              className="mt-10 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-base font-bold text-black transition hover:bg-emerald-400"
            >
              <Music2 className="h-5 w-5" /> {t("ob.finish")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
