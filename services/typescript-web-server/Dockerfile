# Base image
FROM node:18-alpine

# Set the working directory
WORKDIR /usr/src/app

# Copy package files
COPY ./services/typescript-web-server/package*.json ./

# Install dependencies
RUN npm install

# Install TypeScript globally
RUN npm install -g typescript

# Copy the source files
COPY ./services/typescript-web-server/src ./src
COPY ./services/common ./src/common
COPY ./wrappers ./src/wrappers
COPY ./build ./src/build

# Copy tsconfig.json to the root
COPY ./services/typescript-web-server/tsconfig.json ./tsconfig.json

# Compile TypeScript files
RUN tsc -p ./tsconfig.json

# Expose the application port
EXPOSE 3000

# Run the app
CMD ["node", "dist/app.js"]
