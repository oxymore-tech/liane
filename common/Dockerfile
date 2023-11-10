FROM node:20 AS build

WORKDIR /tests

COPY ./package.json .
COPY ./yarn.lock .

RUN yarn

ARG API_URL
ARG TILES_ULR
ARG TEST_CODE

ENV VITE_API_URL ${API_URL}
ENV VITE_TILES_ULR ${TILES_ULR}
ENV VITE_TEST_CODE ${TEST_CODE}

COPY . .

FROM node:20 AS test

WORKDIR /tests

COPY --from=build /tests /tests

RUN node /tests/tests/e2e/setup/init-back.js ${VITE_API_URL}

CMD ["yarn", "test", "e2e", "--reporter=default"]
