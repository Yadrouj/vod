# Telegram bot and channel publisher only. No Next.js build and no catalogue:
# everything they read or save goes through the site API on the site host.
FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates util-linux fontconfig fonts-noto-core \
  && rm -rf /var/lib/apt/lists/*
RUN npm init -y >/dev/null && npm install --omit=dev --no-audit --no-fund sharp@0.34.5
COPY scripts ./scripts
COPY lib ./lib
CMD ["node", "scripts/telegram-bot.mjs"]
