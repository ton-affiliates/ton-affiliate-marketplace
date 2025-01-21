# -----------------------------
# Stage 1: Build the React App
# -----------------------------
    FROM node:18-alpine AS builder

    # 1. Accept the build argument (no default)
    ARG NODE_ENV
    # 2. Convert it into an ENV var so that `npm run build` sees it
    ENV NODE_ENV=$NODE_ENV
    
    # Use a working directory inside the mini-app folder
    WORKDIR /app/modules/mini-app
    
    # 3. (Optional) Copy all .env.* files so Vite can auto-detect the right one
    #    If you rely on them for build-time variables, this ensures they exist in the container.
    COPY modules/mini-app/.env.* ./
    
    # 4. Copy package & tsconfig files, then install
    COPY modules/mini-app/package*.json ./
    COPY modules/mini-app/tsconfig*.json ./
    RUN npm install
    
    # 5. Copy the rest (Vite config, public, src, shared "common", etc.)
    COPY modules/mini-app/vite.config.ts ./
    COPY modules/mini-app/index.html ./
    COPY modules/mini-app/public ./public
    
    COPY modules/mini-app/src    ./src
    COPY modules/common          ./src/common
    
    # 6. Copy Tact-generated TS files (if needed)
    COPY build/AffiliateMarketplace/tact_AffiliateMarketplace.ts ./src/contracts/AffiliateMarketplace.ts
    COPY build/Campaign/tact_Campaign.ts                         ./src/contracts/Campaign.ts
    
    # 7. (Optional) Prepend `// @ts-nocheck` if you want to silence Tact warnings
    RUN echo "// @ts-nocheck" | cat - ./src/contracts/AffiliateMarketplace.ts > temp && mv temp ./src/contracts/AffiliateMarketplace.ts
    RUN echo "// @ts-nocheck" | cat - ./src/contracts/Campaign.ts > temp && mv temp ./src/contracts/Campaign.ts
    
    # 8. Build the app, passing NODE_ENV as the Vite mode
    #    The double-dash (--) ensures the `--mode` flag is passed to Vite, not npm.
    RUN npm run build -- --mode $NODE_ENV
    
    
    # -----------------------------
    # Stage 2: Serve with Nginx
    # -----------------------------
    FROM nginx:stable-alpine
    
    # Clean out default nginx html folder
    RUN rm -rf /usr/share/nginx/html/*
    
    # Copy the built files from builder
    COPY --from=builder /app/modules/mini-app/dist /usr/share/nginx/html
    
    # Expose port 80
    EXPOSE 80
    
    # (Optional) For dynamic envsubst, if you do it
    RUN apk add --no-cache gettext
    
    # Copy in nginx config template & startup script
    COPY modules/mini-app/nginx.conf /etc/nginx/conf.d/nginx.conf.template
    COPY modules/mini-app/start.sh   /start.sh
    RUN chmod +x /start.sh
    
    ENTRYPOINT ["/start.sh"]
    