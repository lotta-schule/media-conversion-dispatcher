FROM node:15-alpine AS build

# build tools
RUN apk add --update --no-cache \
    python \
    make \
    g++

ENV NODE_ENV production
ENV CI 1

ADD . /src
WORKDIR /src
RUN npm install --production=false
RUN npm run build
RUN npm prune --production

# Dockerfile continued

FROM node:15-alpine

# install curl for healthcheck
# RUN apk add --update --no-cache curl

ENV DIR=/usr/src/service
ENV NODE_ENV=production
WORKDIR $DIR

# Copy files from build stage
COPY --from=build /src /src

WORKDIR /src


CMD ["npm", "start"]

# HEALTHCHECK --interval=5s \
#     --timeout=5s \
#     --retries=6 \
#     CMD curl -fs http://localhost:80/_health || exit 1
