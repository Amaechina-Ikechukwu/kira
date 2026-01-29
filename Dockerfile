# Build stage
FROM oven/bun:latest AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the frontend
RUN bun run build

# Production stage
FROM oven/bun:latest

WORKDIR /app

# Copy package files and install production deps only
COPY package.json bun.lockb ./
RUN bun install --production --frozen-lockfile

# Copy built assets and server code
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/drizzle ./drizzle

# Cloud Run uses PORT env variable (defaults to 8080)
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

# Start the server
CMD ["bun", "run", "src/server/index.ts"]