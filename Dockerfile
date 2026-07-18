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
