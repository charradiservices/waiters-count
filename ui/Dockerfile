# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /usr/src/app

# Copy frontend files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the frontend files
COPY . .

# Build the React app
RUN npm run build

# Production stage
FROM nginx:1.25-alpine

# Copy the built app to NGINX's HTML folder
COPY --from=builder /usr/src/app/build /usr/share/nginx/html

# Expose NGINX port
EXPOSE 5552

# Start NGINX
CMD ["nginx", "-g", "daemon off;"]
