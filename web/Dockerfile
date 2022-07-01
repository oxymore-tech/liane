FROM node:16 AS build

WORKDIR /app

COPY package.json ./
COPY yarn.lock ./

RUN yarn

COPY . ./

RUN yarn build

FROM node:16

WORKDIR /app

COPY --from=build /app /app

ENV HOST 0.0.0.0
ARG PROJECT
ENV NEXT_PUBLIC_APP_URL https://${PROJECT}.gjini.co

EXPOSE 3000

CMD ["yarn", "start"]
