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
import { translate, LANGS } from "@/lib/i18n";
import type { LangCode, RegionInfo, UserSettings } from "@/lib/types";
import { apiGet } from "@/lib/utils";

/* ---------------- Toasts ---------------- */

interface ToastItem {
  id: number;
  msg: string;
  kind: "ok" | "err";
}

interface ToastCtx {
  push: (msg: string, kind?: "ok" | "err") => void;
}

const ToastContext = createContext<ToastCtx>({ push: () => {} });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(1);

  const push = useCallback((msg: string, kind: "ok" | "err" = "ok") => {
    const id = idRef.current++;
    setItems((prev) => [...prev.slice(-2), { id, msg, kind }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[90] flex flex-col items-center gap-2 px-4">
        {items.map((t) => (
          <div
            key={t.id}
            className={`animate-toast rounded-full px-4 py-2 text-sm font-medium shadow-xl backdrop-blur ${
              t.kind === "err"
                ? "bg-rose-600/90 text-white"
                : "bg-white/10 text-white ring-1 ring-white/20"
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ---------------- App state (language + settings + geo) ---------------- */

const DEFAULT_SETTINGS: UserSettings = {
  onboarded: false,
  lang: "en",
  region: "global",
  artists: [],
  styles: [],
  images: {},
};

interface AppState {
  t: (key: string, params?: Record<string, string | number>) => string;
  lang: LangCode;
  setLang: (l: LangCode) => void;
  settings: UserSettings;
  saveSettings: (patch: Partial<UserSettings>) => void;
  regionInfo: RegionInfo | null;
  rememberImages: (map: Record<string, string | null>) => void;
  ready: boolean;
}

const AppStateContext = createContext<AppState>({
  t: (k: string) => k,
  lang: "en",
  setLang: () => {},
  settings: DEFAULT_SETTINGS,
  saveSettings: () => {},
  regionInfo: null,
  rememberImages: () => {},
  ready: false,
});

export const useAppState = () => useContext(AppStateContext);

function loadSettings(): UserSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem("tf_settings");
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UserSettings>;
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_SETTINGS;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [regionInfo, setRegionInfo] = useState<RegionInfo | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem("tf_settings", JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings, ready]);

  // detect region from IP once
  useEffect(() => {
    let alive = true;
    apiGet<RegionInfo>("/api/geo")
      .then((info) => {
        if (alive) setRegionInfo(info);
      })
      .catch(() => {
        if (alive) setRegionInfo({ country: "", countryCode: "", regionKey: "global", flag: "🌐" });
      });
    return () => {
      alive = false;
    };
  }, []);

  const lang = settings.lang;
  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => translate(lang, key, params),
    [lang],
  );

  const setLang = useCallback(
    (l: LangCode) => setSettings((s) => ({ ...s, lang: l })),
    [],
  );

  const saveSettings = useCallback((patch: Partial<UserSettings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  const rememberImages = useCallback((map: Record<string, string | null>) => {
    setSettings((s) => {
      const next = { ...s.images };
      let changed = false;
      for (const [name, url] of Object.entries(map)) {
        if (url && next[name] !== url) {
          next[name] = url;
          changed = true;
        }
      }
      return changed ? { ...s, images: next } : s;
    });
  }, []);

  useEffect(() => {
    const meta = LANGS.find((l) => l.code === lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = meta?.dir || "ltr";
  }, [lang]);

  const value = useMemo(
    () => ({ t, lang, setLang, settings, saveSettings, regionInfo, rememberImages, ready }),
    [t, lang, setLang, settings, saveSettings, regionInfo, rememberImages, ready],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}
