"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
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
          "flex items-center justify-center rounded-full bg-accent",
          small ? "h-8 w-8" : "h-9 w-9",
        )}
      >
        <Music2 className={cx("text-black", small ? "h-4 w-4" : "h-5 w-5")} />
      </span>
      <span className={cx("font-bold tracking-tight text-white", small ? "text-base" : "text-lg")}>
        {t("app.name")}
      </span>
    </div>
  );
}

function LangPicker() {
  const { lang, setLang } = useAppState();
  return (
    <div className="flex gap-0.5 rounded-full bg-white/5 p-1">
      {LANGS.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          title={l.label}
          aria-label={l.label}
          aria-pressed={lang === l.code}
          className={cx(
            "rounded-full px-2.5 py-1 text-[11px] font-bold uppercase transition",
            lang === l.code ? "bg-accent text-black" : "text-subdued hover:text-white",
          )}
        >
          {l.code}
        </button>
      ))}
    </div>
  );
}

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

function Shell() {
  const { t, settings, ready } = useAppState();
  const { current } = usePlayer();
  const [view, setView] = useState<View>("home");
  const [artist, setArtist] = useState<string | null>(null);
  const [showNP, setShowNP] = useState(false);
  const [editTaste, setEditTaste] = useState(false);

  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
  // Offline there is nothing to browse but downloads, so the library takes over
  // without clobbering the view the user picked — they get it back on reconnect.
  const shownView: View = online ? view : "library";

  // Register the offline service worker (caches the app shell so downloaded
  // songs can be played even when the page is reloaded without network).
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-chrome">
        <div className="flex flex-col items-center gap-3">
          <span className="flex h-14 w-14 animate-pulse items-center justify-center rounded-full bg-accent">
            <Music2 className="h-7 w-7 text-black" />
          </span>
          <span className="text-sm font-bold tracking-widest text-subdued">VINUX</span>
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
    <div className="flex h-[100dvh] flex-col bg-chrome text-white">
      {!online && (
        <div className="flex items-center justify-center gap-2 bg-amber-400 px-4 py-1.5 text-center text-xs font-bold text-black">
          <WifiOff className="h-3.5 w-3.5" /> {t("st.offline")}
        </div>
      )}

      <div className="flex min-h-0 flex-1 gap-2 p-2">
        {/* Sidebar (desktop) */}
        <aside className="hidden w-60 shrink-0 flex-col gap-2 md:flex">
          <div className="rounded-lg bg-base px-3 py-4">
            <div className="mb-4 px-2">
              <Logo />
            </div>
            <nav className="space-y-1">
              {nav.map((n) => (
                <button
                  key={n.key}
                  onClick={() => setView(n.key)}
                  aria-current={shownView === n.key ? "page" : undefined}
                  className={cx(
                    "flex w-full items-center gap-4 rounded-md px-3 py-2 text-sm font-bold transition",
                    shownView === n.key ? "text-white" : "text-subdued hover:text-white",
                  )}
                >
                  <n.icon className="h-6 w-6" />
                  {n.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex min-h-0 flex-1 flex-col rounded-lg bg-base px-3 py-4">
            <button
              onClick={() => setEditTaste(true)}
              className="flex w-full items-center gap-4 rounded-md px-3 py-2 text-sm font-bold text-subdued transition hover:text-white"
            >
              <SlidersHorizontal className="h-6 w-6" />
              {t("nav.settings")}
            </button>
            <div className="mt-auto space-y-3 px-1 pt-4">
              <LangPicker />
              <p className="text-[11px] leading-relaxed text-white/40">{t("app.tagline")}</p>
            </div>
          </div>
        </aside>

        {/* Main — scrolls on its own, Spotify-style gradient wash at the top */}
        <main className="scrollbar-thin relative min-w-0 flex-1 overflow-y-auto rounded-lg bg-base">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-white/[0.07] to-transparent"
          />
          <div className="relative px-4 pb-8 pt-4 sm:px-6">
            <header className="mb-5 flex items-center justify-between md:hidden">
              <Logo small />
              <div className="flex items-center gap-2">
                <LangPicker />
                <button
                  onClick={() => setEditTaste(true)}
                  className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                  aria-label={t("nav.settings")}
                  title={t("nav.settings")}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </button>
              </div>
            </header>

            {shownView === "home" && <Home onArtist={(n) => setArtist(n)} onEditTaste={() => setEditTaste(true)} />}
            {shownView === "search" && <SearchView />}
            {shownView === "library" && (
              <LibraryView key={online ? "online" : "offline"} initialTab={online ? "favorites" : "downloads"} />
            )}
          </div>
        </main>
      </div>

      <PlayerBar onOpen={() => setShowNP(true)} />

      {/* Bottom nav (mobile) */}
      <nav className="flex h-16 shrink-0 items-stretch border-t border-line bg-chrome md:hidden">
        {nav.map((n) => (
          <button
            key={n.key}
            onClick={() => setView(n.key)}
            aria-current={view === n.key ? "page" : undefined}
            className={cx(
              "flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-bold transition",
              view === n.key ? "text-white" : "text-subdued",
            )}
          >
            <n.icon className="h-5 w-5" />
            {n.label}
          </button>
        ))}
      </nav>

      {showNP && current && <NowPlaying onClose={() => setShowNP(false)} />}
      {artist && <ArtistSheet name={artist} onClose={() => setArtist(null)} />}
    </div>
  );
}
