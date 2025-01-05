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

# 4. Copy source code
COPY services/affiliate-center-miniapp/src ./src
COPY services/common ./src/common

# 5. Copy Tact-generated TS files (example: AffiliateMarketplace, Campaign)
COPY build/AffiliateMarketplace/tact_AffiliateMarketplace.ts ./src/contracts/AffiliateMarketplace.ts
COPY build/Campaign/tact_Campaign.ts ./src/contracts/Campaign.ts

# 6. Prepend // @ts-nocheck to Tact files
#    This inserts a line at the very top of each file to disable TS checks.
RUN echo "// @ts-nocheck" | cat - ./src/contracts/AffiliateMarketplace.ts > temp && mv temp ./src/contracts/AffiliateMarketplace.ts
RUN echo "// @ts-nocheck" | cat - ./src/contracts/Campaign.ts > temp && mv temp ./src/contracts/Campaign.ts

# 7. Build the application
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:stable-alpine
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
