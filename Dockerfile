# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# The stream route shells out to yt-dlp to resolve audio URLs; yt-dlp is a
# Python zipapp, and ffmpeg is its muxing dependency. Taking the binary from
# releases rather than apt keeps it current — Debian's package lags behind
# YouTube's changes and a stale yt-dlp simply stops resolving.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 ffmpeg ca-certificates curl \
 && curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
      -o /usr/local/bin/yt-dlp \
 && chmod 755 /usr/local/bin/yt-dlp \
 && yt-dlp --version \
 && apt-get purge -y curl \
 && apt-get autoremove -y \
 && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs

# Access log lives here. Created and owned up front so a volume mounted over it
# inherits the ownership — the server runs as uid 1001 and a root-owned mount
# point would make every write fail silently.
RUN mkdir -p /data && chown nextjs:nodejs /data
VOLUME ["/data"]

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
