# Build stage: produce the static front end.
FROM node:20-alpine AS build
WORKDIR /build
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
# The browser calls /rulegraph-api/* as same-origin relative paths (an nginx in front proxies them to
# the engine), so no API URL is baked in by default. VITE_API_BASE_URL is an optional override to call
# a different origin directly (then the backend must allow this site's origin via CORS).
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# Run stage: serve the static files. /rulegraph-api/* is proxied to the engine by the nginx in front.
FROM nginx:1.27-alpine
COPY --from=build /build/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
