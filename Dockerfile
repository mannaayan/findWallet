# Use official Node.js runtime as base image
FROM node:20-alpine

# Set working directory in container
WORKDIR /app

# Install build tools for native dependencies (required for bigint bindings)
RUN apk add --no-cache python3 make g++ gcc

# Copy package files
COPY package*.json ./

# Install dependencies and rebuild native modules
RUN npm ci && npm rebuild

# Copy the rest of the application
COPY . .

# Command to run the application
CMD ["npm", "start"]
