import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vinux — Free music streaming",
  description:
    "Vinux: stream full songs from your favorite artists, artist & style radios, playlists, favorites, offline downloads and synced lyrics.",
  applicationName: "Vinux",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-chrome text-white antialiased">{children}</body>
    </html>
  );
}
