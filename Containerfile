# lohn.cc CRM/ERP (Next.js + Better Auth + Drizzle/Postgres) for app.lohn.cc.
# Build and deploy with ./deploy.sh. Runtime secrets come from podman secrets (see deploy/lohn-crm.container).

# ---- build ----
FROM docker.io/library/node:24-alpine AS build
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install -g --no-audit --no-fund pnpm@12.4.2
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
# Inlined into the client bundle at build time.
ARG NEXT_PUBLIC_APP_URL=https://app.lohn.cc
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
# Build-only placeholders so config modules load during `next build`. Real values are runtime secrets.
RUN BETTER_AUTH_SECRET=build-time-placeholder-not-used-at-runtime \
    BETTER_AUTH_URL=$NEXT_PUBLIC_APP_URL \
    DATABASE_URL=postgres://build:build@127.0.0.1:1/build \
    pnpm --filter @lohn/web build

# ---- run ----
FROM docker.io/library/node:24-alpine
LABEL org.opencontainers.image.title="lohn.cc CRM/ERP" \
      org.opencontainers.image.source="https://github.com/lohnxongmixay/lohn.cc"
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
# Whole built workspace: the app plus packages/db (drizzle-kit + migrations) and scripts/ (admin tools).
COPY --from=build /app /app
USER node
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["node_modules/.bin/next", "start", "-p", "3000", "-H", "0.0.0.0"]
