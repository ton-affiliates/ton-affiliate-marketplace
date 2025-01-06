# Stage 1: Build the React App
FROM node:18-alpine AS builder

WORKDIR /app

# 1. Copy package files
COPY services/affiliate-center-miniapp/package*.json ./

# 2. Copy TypeScript config
COPY services/affiliate-center-miniapp/tsconfig*.json ./

RUN npm install

# 3. Copy Vite config and public files
COPY services/affiliate-center-miniapp/vite.config.ts ./
COPY services/affiliate-center-miniapp/index.html ./
COPY services/affiliate-center-miniapp/public ./public

# 4. Copy source code + shared "common" folder
COPY services/affiliate-center-miniapp/src ./src
COPY services/common ./src/common

# 5. Copy Tact-generated TS files (example: AffiliateMarketplace, Campaign)
COPY build/AffiliateMarketplace/tact_AffiliateMarketplace.ts ./src/contracts/AffiliateMarketplace.ts
COPY build/Campaign/tact_Campaign.ts ./src/contracts/Campaign.ts

# 6. Prepend // @ts-nocheck to Tact files (optional step)
RUN echo "// @ts-nocheck" | cat - ./src/contracts/AffiliateMarketplace.ts > temp && mv temp ./src/contracts/AffiliateMarketplace.ts
RUN echo "// @ts-nocheck" | cat - ./src/contracts/Campaign.ts > temp && mv temp ./src/contracts/Campaign.ts

# 7. Build the application
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:stable-alpine

# Clean out the default nginx html folder
RUN rm -rf /usr/share/nginx/html/*

# Copy the production build from the builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy the TonConnect manifest file and icon from the builder
COPY --from=builder /app/public/tonconnect-manifest.json /usr/share/nginx/html/
RUN mkdir -p /usr/share/nginx/html/assets/
COPY --from=builder /app/public/assets/icon.png /usr/share/nginx/html/assets/

# Expose port 80 for Nginx
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
