FROM node:19-alpine AS dependencies
WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci



FROM node:19.0-alpine AS builder
WORKDIR /app

COPY . .
COPY --from=dependencies /app/node_modules ./node_modules

RUN npm run build



FROM node:19.0-alpine AS runner
WORKDIR /app

RUN addgroup -g 1001 -S lotta
RUN adduser -S lotta -u 1001

ENV NODE_ENV production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER lotta

CMD ["npm", "start"]
