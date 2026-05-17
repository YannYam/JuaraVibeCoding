# ---- Build Stage ----
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci --only=production

# ---- Runtime Stage ----
FROM node:20-alpine

WORKDIR /app

# Copy installed node_modules from build stage
COPY --from=build /app/node_modules ./node_modules

# Copy application source code
COPY . .

# Remove unnecessary files from the image
RUN rm -rf .dockerignore Dockerfile

# Create uploads directory
RUN mkdir -p uploads

# Cloud Run injects PORT env variable
ENV PORT=8080
EXPOSE 8080

# Start the server
CMD ["node", "server.js"]
