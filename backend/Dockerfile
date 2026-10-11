# Compose provides the base image from the environment settings.
ARG NODE_IMAGE
FROM ${NODE_IMAGE}

WORKDIR /app

# Install locked runtime dependencies before copying application code.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# The Docker ignore file excludes local dependencies and secrets.
COPY --chown=node:node . .

# Run the application without root privileges.
USER node

# Compose provides environment variables directly to the process.
CMD ["node", "server.js"]