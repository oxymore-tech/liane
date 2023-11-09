FROM node:16 AS build

WORKDIR /app

COPY package.json ./
COPY yarn.lock ./
COPY ../common /common

RUN yarn

COPY . ./

ARG DOMAIN
ENV NEXT_PUBLIC_APP_URL https://${DOMAIN}

RUN yarn build

FROM node:16

WORKDIR /app

COPY --from=build /app /app

ENV HOST 0.0.0.0

EXPOSE 3000

CMD ["yarn", "start"]
