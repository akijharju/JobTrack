# Global arguments can be used by both build stages.
ARG NODE_IMAGE
ARG NGINX_IMAGE

# Build the React application with Node.
FROM ${NODE_IMAGE} AS build

WORKDIR /app

# The build needs development dependencies such as Vite.
COPY package.json package-lock.json ./
RUN npm ci

# Local environment files and build output are excluded by Docker ignore.
COPY . .
RUN npm run build

# Only Nginx and the finished frontend are needed at runtime.
FROM ${NGINX_IMAGE}

COPY --from=build /app/dist /usr/share/nginx/html

# The Nginx entrypoint fills this template when the container starts.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template