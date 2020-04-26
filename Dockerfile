FROM node:14-alpine AS build

# build tools
RUN apk add --update --no-cache \
    python \
    make \
    g++

ENV CI=true

ADD . /src
WORKDIR /src
RUN npm install
# RUN npm run test -- --no-watch
RUN npm run build
RUN npm prune --production

# Dockerfile continued

FROM node:14-alpine

# install curl for healthcheck
# RUN apk add --update --no-cache curl

ENV DIR=/usr/src/service
WORKDIR $DIR

# Copy files from build stage
COPY --from=build /src /src

WORKDIR /src

CMD ["npm", "start"]

# HEALTHCHECK --interval=5s \
#     --timeout=5s \
#     --retries=6 \
#     CMD curl -fs http://localhost:80/_health || exit 1