# Bizsphere-Ug — container image for Coolify (or any Docker host).
# Next.js (App Router) + Prisma + PostgreSQL. Migrations run at container START (see
# scripts/docker-entrypoint.sh), so the database is always up to date with the deployed code.

# ── Build stage: install everything and build the app ──
FROM node:22-bookworm-slim AS build
WORKDIR /app
# Prisma needs openssl; ca-certificates for HTTPS during the build.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NEXT_TELEMETRY_DISABLED=1

# Install dependencies first (cached unless these files change). postinstall runs
# `prisma generate` and copies the PDF.js worker, so prisma/ and scripts/ must be present.
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY scripts ./scripts
RUN npm ci

# Build the app. `npm run build` runs deploy-migrate.mjs first, which is a no-op off Vercel,
# so no database is needed at build time.
COPY . .
RUN npm run build

# ── Runtime stage: a smaller image that runs the built app ──
FROM node:22-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
# node_modules is kept whole (not pruned) because the Prisma CLI runs migrations at startup.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.mjs ./next.config.mjs

EXPOSE 3000
# Apply migrations, then start the server (see the script).
CMD ["sh", "scripts/docker-entrypoint.sh"]
