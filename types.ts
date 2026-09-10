export interface Track {
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration?: number;
  durationText?: string;
}

export interface TrackRow {
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number | null;
  durationText: string | null;
}

export interface RegionInfo {
  country: string;
  countryCode: string;
  regionKey: string;
  flag: string;
}

export type PlayModeType =
  | "artist" // radio of one artist, infinite
  | "style" // radio of one style, infinite
  | "mix" // generic queue, refills from current artist
  | "favorites"
  | "playlist"
  | "search";

export interface PlayMode {
  type: PlayModeType;
  label: string;
  param?: string;
}

export interface UserSettings {
  onboarded: boolean;
  lang: LangCode;
  region: string;
  artists: string[];
  styles: string[];
  images: Record<string, string>;
}

export type LangCode = "en" | "ar" | "fr" | "es";
