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

FROM node:20

WORKDIR /tests

COPY --from=build /tests /tests

CMD ["yarn", "test", "e2e", "--reporter=junit", "--outputFile=./report/test-output.xml"]
