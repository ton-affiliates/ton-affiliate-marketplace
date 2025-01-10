# Base image
FROM node:18-alpine

# Set build arguments
ARG NODE_ENV
ARG NETWORK_ENV

# Print for debugging
RUN echo "NODE_ENV=${NODE_ENV}" && echo "NETWORK_ENV=${NETWORK_ENV}"

# Set the working directory
WORKDIR /usr/src/app

# Copy package files
COPY ./services/typescript-web-server/package*.json ./

# Install dependencies
RUN npm install

# Install TypeScript globally
RUN npm install -g typescript

# Copy source files and common folder
COPY ./services/typescript-web-server/src ./src
COPY ./services/common ./src/common
COPY ./wrappers ./src/wrappers
COPY ./build ./src/build

# Copy tsconfig.json to the root
COPY ./services/typescript-web-server/tsconfig.json ./tsconfig.json

# Copy shared and service-specific .env files
COPY ./services/common/.env.${NETWORK_ENV} ./src/common/.env.shared
COPY ./services/typescript-web-server/.env.${NODE_ENV} ./src/.env.service

# Merge shared and service-specific .env files
RUN echo "" >> ./src/common/.env.shared && cat ./src/.env.service >> ./src/common/.env.shared && mv ./src/common/.env.shared .env

# Compile TypeScript files
RUN tsc -p ./tsconfig.json

# Expose the application port
EXPOSE 3000

# Run the app
CMD ["node", "dist/app.js"]
