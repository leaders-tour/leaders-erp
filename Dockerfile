FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  fonts-noto-cjk \
  libnspr4 \
  libnss3 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libdbus-1-3 \
  libxkbcommon0 \
  libx11-6 \
  libxcomposite1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libpango-1.0-0 \
  libcairo2 \
  libasound2 \
  libatspi2.0-0 \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@9.12.2

COPY . .

ENV NODE_ENV=production
ENV PUPPETEER_CACHE_DIR=/app/.cache/puppeteer

RUN pnpm install --frozen-lockfile --prod=false
RUN cd apps/api && pnpm exec puppeteer browsers install chrome
RUN pnpm --filter @tour/prisma db:generate
RUN pnpm --filter @tour/api build

EXPOSE 4000

CMD ["sh", "-c", "pnpm --filter @tour/prisma db:deploy && pnpm --filter @tour/api start"]
