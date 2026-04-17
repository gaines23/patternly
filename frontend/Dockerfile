# ── Development: Vite dev server with HMR ─────────────────────────────────────
FROM node:20-alpine AS development

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

# Source copied in dev via volume mount
COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ── Builder: compile React to static files ─────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# VITE_API_URL is injected at build time so the compiled JS knows where the API lives.
# In production this is /api (same-origin via nginx proxy).
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Production: nginx serves the built files ───────────────────────────────────
FROM nginx:1.25-alpine AS production

RUN rm -f /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.railway.conf /etc/nginx/nginx.conf.template

# Defaults work for docker-compose; Railway overrides via env vars
ENV PORT=80
ENV BACKEND_URL=http://api:8000
ENV BACKEND_HOST=api
ENV DNS_RESOLVER=127.0.0.11

EXPOSE 80

# Render the nginx template with env vars at startup, then start nginx
CMD ["/bin/sh", "-c", "envsubst '$PORT $BACKEND_URL $BACKEND_HOST $DNS_RESOLVER' < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
