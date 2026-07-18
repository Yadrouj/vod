<<<<<<< HEAD
FROM node:22-alpine AS dependencies
=======
# VOD (sarvnema) — production image.
# Custom Node server: `tsx watch-party-server.ts` boots Next.js AND a socket.io
# server (watch-party) on one port. Listens on :3000.
# syntax=docker/dockerfile:1

# ---------- deps ----------
FROM node:20-bookworm-slim AS deps
>>>>>>> c8bf795889c7454b88f78e0ea0b3c56411e6a508
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

<<<<<<< HEAD
FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3004 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/data ./data
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/watch-party-server.ts /app/next.config.ts /app/tsconfig.json ./

USER nextjs
EXPOSE 3004
HEALTHCHECK --interval=20s --timeout=3s --start-period=30s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3004/readyz || exit 1

CMD ["npm", "start"]
=======
# ---------- build ----------
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# .env.local (git-ignored, present in the build context on the server) is read
# here so NEXT_PUBLIC_* values are baked into the client bundle.
RUN npm run build

# ---------- runtime ----------
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# The production entrypoint runs through `tsx` (a devDependency), so the full
# node_modules from the build stage is kept rather than a production-only prune.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/lib ./lib
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/watch-party-server.ts ./watch-party-server.ts
EXPOSE 3000
CMD ["npm", "run", "start"]
>>>>>>> c8bf795889c7454b88f78e0ea0b3c56411e6a508
