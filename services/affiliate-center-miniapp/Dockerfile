# services/affiliate-center-miniapp/Dockerfile

# Stage 1: Build the React App
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY services/affiliate-center-miniapp/package*.json ./

# Copy TypeScript configuration
COPY services/affiliate-center-miniapp/tsconfig*.json ./

# Install dependencies
RUN npm install

# Copy Vite and other config
COPY services/affiliate-center-miniapp/vite.config.ts ./
COPY services/affiliate-center-miniapp/index.html ./
COPY services/affiliate-center-miniapp/public ./public

# Copy mini-app source
COPY services/affiliate-center-miniapp/src ./src

# Copy the common directory
COPY services/common ./src/common

# Build the application
RUN npm run build

# Stage 2: Serve the App with Nginx
FROM nginx:stable-alpine

# Remove default Nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy the build output
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
