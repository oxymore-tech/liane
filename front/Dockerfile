FROM node:12-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

ARG version
RUN sed -i "s|\${VERSION}|$version|g" ./src/app/shared/components/user/login/login.component.ts

RUN npm run build



FROM nginx:1.17.6-alpine

COPY deploy/default.conf /etc/nginx/conf.d/

COPY --from=build /app/dist/synergee-frontend /usr/share/nginx/html/