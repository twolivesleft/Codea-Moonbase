# syntax=docker/dockerfile:1

FROM node:14.18.2
ENV NODE_ENV=production

WORKDIR /app

COPY ["package.json", "package-lock.json*", "./"]

RUN npm install --production

COPY . .

CMD node index.js

EXPOSE 80
