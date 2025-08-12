FROM node:22-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Copy the rest of the application files
COPY . .

# Install the application dependencies
RUN npm install

RUN npx prisma generate

RUN npx prisma db push

# Build the NestJS application
RUN npm run build

# Expose the application port
EXPOSE 3000

# Command to run the application
CMD ["node", "dist/main"]