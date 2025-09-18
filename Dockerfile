# syntax = docker/dockerfile:1

FROM oven/bun:1.2.12-slim as base

LABEL fly_launch_runtime="Bun"

# NodeJS app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV=production


# Throw-away build stage to reduce size of final image
FROM base as build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install -y python-is-python3 pkg-config build-essential 

# Install node modules
COPY --link package.json .
# RUN bun install --production
RUN bun install

# Copy application code
COPY --link . .

# Final stage for app image
FROM base

# Copy built application
COPY --from=build /app /app

RUN apt-get update && apt-get install -y sqlite3 && rm -rf /var/lib/apt/lists/*

# Start the server by default, this can be overwritten at runtime
CMD [ "bun", "--bun", "build" ]
CMD [ "bun", "./build/index.js" ]
