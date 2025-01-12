#!/bin/sh

# Replace placeholders in nginx.conf with environment variables
envsubst '${SERVER_NAME} ${SERVER_PORT} ${BACKEND_URL}' < /etc/nginx/conf.d/nginx.conf.template > /etc/nginx/conf.d/default.conf

# Start Nginx
nginx -g "daemon off;"
