#!/bin/sh
set -e

# Auto-detect DNS resolver from the container's resolv.conf
DNS_RESOLVER=$(grep nameserver /etc/resolv.conf | head -1 | awk '{print $2}')

# Wrap IPv6 addresses in brackets (nginx requirement)
case "$DNS_RESOLVER" in
  *:*) DNS_RESOLVER="[$DNS_RESOLVER]" ;;
esac

# Fallback to Google DNS if no resolver found
export DNS_RESOLVER="${DNS_RESOLVER:-8.8.8.8}"

echo "Using DNS resolver: $DNS_RESOLVER"
echo "Backend URL: $BACKEND_URL"
echo "Backend Host: $BACKEND_HOST"
echo "Port: $PORT"

# Render the nginx config template
envsubst '$PORT $BACKEND_URL $BACKEND_HOST $DNS_RESOLVER' \
  < /etc/nginx/nginx.conf.template \
  > /etc/nginx/conf.d/default.conf

echo "Generated nginx config:"
cat /etc/nginx/conf.d/default.conf

# Start nginx
exec nginx -g 'daemon off;'
