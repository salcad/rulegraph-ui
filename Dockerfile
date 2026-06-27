# Build stage: produce the static front end.
FROM node:20-alpine AS build
WORKDIR /build
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
# The browser calls the engine's API directly, so the API base URL is baked into the static bundle at
# build time. Pass it with --build-arg VITE_API_BASE_URL=https://api.example.com (defaults to the
# engine's local dev address when unset). The backend must allow this site's origin via CORS.
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# Run stage: serve the static files. API calls go straight from the browser to the engine (CORS).
FROM nginx:1.27-alpine
COPY --from=build /build/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
