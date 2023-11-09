FROM node:20 AS build

WORKDIR /app

COPY web/package.json ./web/
COPY web/yarn.lock ./web/

RUN cd /app/web && yarn

COPY common/package.json ./common/
COPY common/yarn.lock ./common/

RUN cd /app/common && yarn

COPY common/ ./common/

RUN cd /app/common && yarn prepublishOnly

COPY web/ ./web/

ARG DOMAIN
ENV NEXT_PUBLIC_APP_URL https://${DOMAIN}

RUN cd /app/web && yarn build

FROM node:20

WORKDIR /app

COPY --from=build /app/web /app

ENV HOST 0.0.0.0

EXPOSE 3000

CMD ["yarn", "start"]
