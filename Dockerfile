FROM node:lts-alpine3.12 as builder

WORKDIR /app
COPY package*.json .
RUN npm install
COPY . .
RUN npm run build


FROM node:lts-alpine3.12

WORKDIR /app

COPY package*.json .
RUN npm install

COPY --from=builder /app/out ./out
COPY ./config/* ./config/

ENTRYPOINT ["node", "out/app.js"]
