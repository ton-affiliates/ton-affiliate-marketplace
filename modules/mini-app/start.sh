#!/bin/sh

# Replace placeholders in nginx.conf with environment variables
echo "Starting envsubst..."
envsubst '${VITE_SERVER_NAME} ${VITE_SERVER_PORT} ${BACKEND_URL}' < /etc/nginx/conf.d/nginx.conf.template > /etc/nginx/conf.d/default.conf

# Debugging: Print the generated configuration
echo "Generated nginx configuration:"
cat /etc/nginx/conf.d/default.conf

# Start Nginx
echo "Starting Nginx..."
nginx -g "daemon off;"
