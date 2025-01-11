# Base image
FROM node:18-alpine

WORKDIR /usr/src/app

# Copy package files
COPY ./services/web-server/package*.json ./
RUN npm install
RUN npm install -g typescript

# Copy tsconfig, now inside /src as well
COPY ./services/web-server/tsconfig.json ./tsconfig.json

# Copy source files and the new location of ormconfig (within src/)
COPY ./services/web-server/src ./src

# Copy the common folder
COPY ./services/common ./src/common

# Copy Tact-generated TS files
COPY build/AffiliateMarketplace/tact_AffiliateMarketplace.ts ./src/contracts/AffiliateMarketplace.ts
COPY build/Campaign/tact_Campaign.ts ./src/contracts/Campaign.ts

# Prepend // @ts-nocheck if needed
RUN echo "// @ts-nocheck" | cat - ./src/contracts/AffiliateMarketplace.ts > temp && mv temp ./src/contracts/AffiliateMarketplace.ts
RUN echo "// @ts-nocheck" | cat - ./src/contracts/Campaign.ts > temp && mv temp ./src/contracts/Campaign.ts

RUN tsc -p tsconfig.json

EXPOSE 3000
CMD ["npm", "run", "start"]
