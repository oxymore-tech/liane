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

ENV PROJECT=liane
ENV HOST 0.0.0.0
ENV NEXT_PUBLIC_APP_URL https://$PROJECT.gjini.co
ENV NEXT_PUBLIC_GOOGLE_ANALYTICS_ID 000

EXPOSE 3000

CMD ["yarn", "start"]
