FROM node:lts-alpine3.12 as builder

WORKDIR /app
COPY package*.json .
RUN npm install --registry=https://registry.npmmirror.com
COPY . .
RUN npm run build


FROM node:lts-alpine3.12

WORKDIR /app

COPY package*.json .
RUN npm install --production --registry=https://registry.npmmirror.com

COPY --from=builder /app/out .
COPY config .

ENTRYPOINT ["node", "app.js"]