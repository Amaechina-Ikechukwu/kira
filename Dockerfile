# Use a Bun base image
FROM oven/bun:latest

# Set the working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json bun.lock ./
RUN bun install

# Copy the rest of the application
COPY . .

# Build the frontend (Vite)
RUN bun run build

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Expose the application port
EXPOSE 8080

# Start the server
CMD ["sh", "-c", "bun run db:push && bun run src/server/index.ts"]