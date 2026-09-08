# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable && corepack prepare pnpm@11.17.0 --activate

WORKDIR /app

FROM base AS dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY examples/embedded-assistant-host/package.json examples/embedded-assistant-host/package.json

RUN pnpm install --frozen-lockfile

FROM dependencies AS builder

ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID
ARG NEXT_PUBLIC_NOODLE_SERVICE_URL=https://cloud.noodleseed.dev

ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID=$NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID
ENV NEXT_PUBLIC_NOODLE_SERVICE_URL=$NEXT_PUBLIC_NOODLE_SERVICE_URL

COPY . .

RUN pnpm --filter @nuitee-travel-starter/web build

FROM node:24-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e AS runner

ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID
ARG NEXT_PUBLIC_NOODLE_SERVICE_URL=https://cloud.noodleseed.dev

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID=$NEXT_PUBLIC_NOODLE_ASSISTANT_EMBED_ID
ENV NEXT_PUBLIC_NOODLE_SERVICE_URL=$NEXT_PUBLIC_NOODLE_SERVICE_URL

WORKDIR /app

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
