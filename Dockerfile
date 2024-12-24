# Use the official Node.js image as the base
FROM node:20-alpine

# Set the working directory
WORKDIR /usr/src/app

# Copy backend files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the backend files
COPY . .

# Expose the port your backend runs on
EXPOSE 5551

# Start the backend
CMD ["npm", "start"]
