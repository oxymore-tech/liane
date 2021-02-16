FROM node:15.2 AS build

WORKDIR /app

COPY package.json ./
COPY yarn.lock ./

RUN yarn

COPY . ./

ENV NEXT_PUBLIC_APP_URL https://liane.gjini.co

RUN yarn build



FROM node:15.2

WORKDIR /app

COPY --from=build /app /app

ENV HOST 0.0.0.0
ENV NEXT_PUBLIC_APP_URL https://liane.gjini.co
ENV NEXT_PUBLIC_GOOGLE_ANALYTICS_ID 000

EXPOSE 3000

CMD ["yarn", "start"]
