# Use the official Node.js image as the base image
FROM node:22-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install the application dependencies
# This will also install Prisma as a dev dependency
RUN npm install

# Copy the Prisma schema file first to leverage Docker cache
COPY prisma ./prisma/

# Generate the Prisma Client
# This is the crucial step that was missing. It creates all the necessary TypeScript types.
RUN npx prisma generate

# Copy the rest of the application files
COPY . .

# Build the NestJS application
RUN npm run build

# Expose the application port
EXPOSE 3000

# Command to run the application
CMD ["node", "dist/main"]
