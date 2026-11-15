# Image du site Liane (Next.js, sortie autonome). Contexte de construction : le dossier web/.
#   docker build -t liane-web web/
#
# Les adresses ci-dessous sont figées à la construction :
# - API_URL et TILES_URL : où le serveur Next relaie /api et /tiles quand le navigateur passe par lui.
#   En production le reverse proxy envoie /api et /tiles directement à l'API et à Martin (voir
#   deploy/production.yml) ; ces relais ne servent alors qu'en secours et en local.
# - MAPTILER_KEY : clé publique du fond de carte, visible dans le navigateur. Vide : fond neutre.

FROM node:24-bookworm-slim AS build
WORKDIR /web
ENV NEXT_TELEMETRY_DISABLED=1 COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install --immutable

ARG API_URL=http://api:5000/api
ARG TILES_URL=http://martin:3000
ARG MAPTILER_KEY=
ENV NEXT_PUBLIC_API_URL=$API_URL \
    NEXT_PUBLIC_TILES_URL=$TILES_URL \
    NEXT_PUBLIC_MAPTILER_KEY=$MAPTILER_KEY \
    NEXT_OUTPUT=standalone

COPY . .
RUN yarn build

FROM node:24-bookworm-slim
WORKDIR /web
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0

COPY --from=build /web/.next/standalone ./
COPY --from=build /web/.next/static ./.next/static
COPY --from=build /web/public ./public

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:3000/manifest.webmanifest').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "server.js"]
