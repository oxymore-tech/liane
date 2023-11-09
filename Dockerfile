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

ARG DD_CLIENT_TOKEN
ARG DD_APP_ID
ARG APP_ENV
ARG APP_VERSION
ARG MAPTILER_KEY
ARG TEST_ACCOUNT

ENV NEXT_DD_CLIENT_TOKEN ${DD_CLIENT_TOKEN}
ENV NEXT_DD_APP_ID ${DD_APP_ID}
ENV NEXT_APP_ENV ${APP_ENV}
ENV NEXT_APP_VERSION ${APP_VERSION}
ENV NEXT_MAPTILER_KEY ${MAPTILER_KEY}
ENV NEXT_TEST_ACCOUNT ${TEST_ACCOUNT}

RUN cd /app/web && yarn build

FROM node:20

WORKDIR /app

COPY --from=build /app/web /app

ENV HOST 0.0.0.0

EXPOSE 3000

CMD ["yarn", "start"]
