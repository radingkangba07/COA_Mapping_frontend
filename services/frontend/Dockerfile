# Frontend Dockerfile (Expo Web)
FROM node:20-alpine AS builder

ARG BASE_URL=""
ARG API_BASE_URL=""
ARG APP_ENV=production

WORKDIR /app

# Copy package files
COPY frontend/package.json frontend/package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY frontend/ .

# Set Expo baseUrl for sub-path deployments (e.g. /test/, /staging/)
RUN if [ -n "$BASE_URL" ]; then \
      apk add --no-cache jq && \
      jq --arg url "$BASE_URL" '.expo.experiments.baseUrl = $url' app.json > app.tmp.json && \
      mv app.tmp.json app.json; \
    fi

# EXPO_PUBLIC_ vars must be in .env.production — Metro uses this file during `expo export`
# Remove all .env* files first so no stale values leak through
RUN rm -f .env .env.development .env.staging .env.production && \
    printf "EXPO_PUBLIC_API_BASE_URL=%s\nEXPO_PUBLIC_APP_ENV=%s\n" "$API_BASE_URL" "$APP_ENV" > .env.production

# Build the Expo web application
RUN npx expo export --platform web

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY services/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
