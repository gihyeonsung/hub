FROM node:lts

WORKDIR /app

COPY . /app

RUN corepack enable && \
    corepack prepare yarn@stable --activate && \
    yarn

ENTRYPOINT yarn dev