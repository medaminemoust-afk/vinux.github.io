import {
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  index,
} from "drizzle-orm/pg-core";

/** User-created playlists, scoped to an anonymous device id. */
export const playlists = pgTable(
  "playlists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    deviceId: text("device_id").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("playlists_device_idx").on(t.deviceId)],
);

/** Tracks belonging to a playlist. */
export const playlistTracks = pgTable(
  "playlist_tracks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playlistId: uuid("playlist_id")
      .notNull()
      .references(() => playlists.id, { onDelete: "cascade" }),
    videoId: text("video_id").notNull(),
    title: text("title").notNull(),
    artist: text("artist").notNull(),
    thumbnail: text("thumbnail").notNull(),
    duration: integer("duration"),
    durationText: text("duration_text"),
    addedAt: timestamp("added_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("playlist_tracks_uniq").on(t.playlistId, t.videoId),
    index("playlist_tracks_playlist_idx").on(t.playlistId),
  ],
);

/** Favorite tracks, scoped to an anonymous device id. */
export const favorites = pgTable(
  "favorites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    deviceId: text("device_id").notNull(),
    videoId: text("video_id").notNull(),
    title: text("title").notNull(),
    artist: text("artist").notNull(),
    thumbnail: text("thumbnail").notNull(),
    duration: integer("duration"),
    durationText: text("duration_text"),
    addedAt: timestamp("added_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("favorites_device_track_uniq").on(t.deviceId, t.videoId),
    index("favorites_device_idx").on(t.deviceId),
  ],
);

export type Playlist = typeof playlists.$inferSelect;
export type PlaylistTrack = typeof playlistTracks.$inferSelect;
export type Favorite = typeof favorites.$inferSelect;
