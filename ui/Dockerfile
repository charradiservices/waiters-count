# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or pnpm/yarn lockfile)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the project files
COPY . .

# Build the Vite app (outputs to the 'dist' folder)
RUN npm run build

# Production stage
FROM nginx:1.25-alpine

# Remove default NGINX files
RUN rm -rf /usr/share/nginx/html/*

# Copy the 'dist' folder from the build stage to NGINX
COPY --from=builder /usr/src/app/dist /usr/share/nginx/html

# Expose NGINX port
EXPOSE 80

# Start NGINX
CMD ["nginx", "-g", "daemon off;"]
