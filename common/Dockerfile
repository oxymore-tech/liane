FROM node:20 AS build

WORKDIR /tests

COPY ./package.json .
COPY ./yarn.lock .

RUN yarn

COPY . .

FROM node:20 AS test

WORKDIR /tests

COPY --from=build /tests /tests

ARG API_URL
ARG TILES_ULR
ARG TEST_CODE

ENV VITE_API_URL ${API_URL}
ENV VITE_TILES_ULR ${TILES_ULR}
ENV VITE_TEST_CODE ${TEST_CODE}

ENTRYPOINT node /tests/tests/e2e/setup/init-back.js $VITE_API_URL && yarn test e2e --bail=0
