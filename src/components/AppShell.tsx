"use client";

import { useEffect, useState } from "react";
import { Home as HomeIcon, Library, Music2, Search, SlidersHorizontal, WifiOff } from "lucide-react";
import { LANGS } from "@/lib/i18n";
import { cx } from "@/lib/utils";
import { AppStateProvider, ToastProvider, useAppState } from "./app-state";
import { LibraryProvider } from "./library";
import { PlayerProvider, usePlayer } from "./player";
import { Onboarding } from "./Onboarding";
import { Home } from "./Home";
import { SearchView } from "./SearchView";
import { LibraryView } from "./LibraryView";
import { ArtistSheet } from "./ArtistSheet";
import { NowPlaying, PlayerBar } from "./PlayerUI";

type View = "home" | "search" | "library";

export function AppShell() {
  return (
    <AppStateProvider>
      <ToastProvider>
        <LibraryProvider>
          <PlayerProvider>
            <Shell />
          </PlayerProvider>
        </LibraryProvider>
      </ToastProvider>
    </AppStateProvider>
  );
}

function Logo({ small }: { small?: boolean }) {
  const { t } = useAppState();
  return (
    <div className="flex items-center gap-2">
      <span
        className={cx(
          "flex items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 shadow-lg shadow-emerald-500/30",
          small ? "h-8 w-8" : "h-9 w-9",
        )}
      >
        <Music2 className={cx("text-black", small ? "h-4 w-4" : "h-5 w-5")} />
      </span>
      <span className={cx("font-extrabold tracking-tight text-white", small ? "text-base" : "text-lg")}>
        {t("app.name")}
      </span>
    </div>
  );
}

function LangPicker() {
  const { lang, setLang } = useAppState();
  return (
    <div className="flex gap-0.5 rounded-full bg-white/5 p-1 ring-1 ring-white/10">
      {LANGS.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          title={l.label}
          className={cx(
            "rounded-full px-2.5 py-1 text-[11px] font-bold uppercase transition",
            lang === l.code ? "bg-emerald-500 text-black" : "text-zinc-400 hover:text-white",
          )}
        >
          {l.code}
        </button>
      ))}
    </div>
  );
}

function Shell() {
  const { t, settings, ready } = useAppState();
  const { current } = usePlayer();
  const [view, setView] = useState<View>("home");
  const [artist, setArtist] = useState<string | null>(null);
  const [showNP, setShowNP] = useState(false);
  const [editTaste, setEditTaste] = useState(false);
  const [online, setOnline] = useState(true);

  // Register the offline service worker (caches the app shell so downloaded
  // songs can be played even when the page is reloaded without network).
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => {
      setOnline(false);
      setView("library");
    };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a12]">
        <div className="flex flex-col items-center gap-3">
          <span className="flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500">
            <Music2 className="h-7 w-7 text-black" />
          </span>
          <span className="text-sm font-bold tracking-widest text-zinc-400">VINUX</span>
        </div>
      </div>
    );
  }

  if (!settings.onboarded || editTaste) {
    return (
      <Onboarding
        onDone={() => {
          setEditTaste(false);
          setView("home");
        }}
        onCancel={() => setEditTaste(false)}
      />
    );
  }

  const nav: { key: View; label: string; icon: typeof HomeIcon }[] = [
    { key: "home", label: t("nav.home"), icon: HomeIcon },
    { key: "search", label: t("nav.search"), icon: Search },
    { key: "library", label: t("nav.library"), icon: Library },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a12] text-zinc-100">
      {!online && (
        <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-amber-400 px-4 py-1.5 text-center text-xs font-bold text-black">
          <WifiOff className="h-3.5 w-3.5" /> {t("st.offline")}
        </div>
      )}

      <div className="mx-auto flex max-w-6xl">
        {/* Sidebar (desktop) */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-e border-white/5 px-4 py-6 md:flex">
          <div className="mb-8 px-2">
            <Logo />
          </div>
          <nav className="space-y-1">
            {nav.map((n) => (
              <button
                key={n.key}
                onClick={() => setView(n.key)}
                className={cx(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition",
                  view === n.key ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white",
                )}
              >
                <n.icon className={cx("h-5 w-5", view === n.key && "text-emerald-400")} />
                {n.label}
              </button>
            ))}
            <button
              onClick={() => setEditTaste(true)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-zinc-400 transition hover:bg-white/5 hover:text-white"
            >
              <SlidersHorizontal className="h-5 w-5" />
              {t("nav.settings")}
            </button>
          </nav>
          <div className="mt-auto space-y-3 px-1">
            <LangPicker />
            <p className="text-[11px] leading-relaxed text-zinc-600">{t("app.tagline")}</p>
          </div>
        </aside>

        {/* Main */}
        <main className={cx("min-w-0 flex-1 px-4 pt-4 sm:px-6", current ? "pb-44 md:pb-32" : "pb-24 md:pb-10")}>
          <header className="mb-5 flex items-center justify-between md:hidden">
            <Logo small />
            <div className="flex items-center gap-2">
              <LangPicker />
              <button
                onClick={() => setEditTaste(true)}
                className="rounded-full bg-white/5 p-2 text-zinc-300 ring-1 ring-white/10 hover:bg-white/10"
                title={t("nav.settings")}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            </div>
          </header>

          {view === "home" && <Home onArtist={(n) => setArtist(n)} onEditTaste={() => setEditTaste(true)} />}
          {view === "search" && <SearchView />}
          {view === "library" && <LibraryView initialTab={online ? "favorites" : "downloads"} />}
        </main>
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch border-t border-white/5 bg-[#0a0a12]/95 backdrop-blur-xl md:hidden">
        {nav.map((n) => (
          <button
            key={n.key}
            onClick={() => setView(n.key)}
            className={cx(
              "flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-bold transition",
              view === n.key ? "text-emerald-400" : "text-zinc-500",
            )}
          >
            <n.icon className="h-5 w-5" />
            {n.label}
          </button>
        ))}
      </nav>

      <PlayerBar onOpen={() => setShowNP(true)} />
      {showNP && current && <NowPlaying onClose={() => setShowNP(false)} />}
      {artist && <ArtistSheet name={artist} onClose={() => setArtist(null)} />}
    </div>
  );
}
