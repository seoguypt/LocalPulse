# Build stage
FROM node:20-alpine AS builder

# Install pnpm and build dependencies
RUN corepack enable && corepack prepare pnpm@9.0.6 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Set environment variables
ENV CI=true
ENV NODE_ENV=production
ENV NITRO_PRESET=node-server

# Install dependencies (use frozen lockfile for reproducibility)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Debug: Check what files are present
RUN echo "=== Files in /app ===" && ls -la

# Build the application with verbose output
RUN echo "=== Starting build ===" && \
    pnpm run build && \
    echo "=== Build completed ==="

# Debug: Check if .output was created
RUN echo "=== Checking for .output directory ===" && \
    ls -la

# Verify build output
RUN ls -la .output && \
    test -f .output/server/index.mjs || (echo "Build failed: index.mjs not found" && exit 1)

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Copy built application
COPY --from=builder /app/.output /app/.output

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nuxt -u 1001

# Change ownership
RUN chown -R nuxt:nodejs /app

# Switch to non-root user
USER nuxt

# Expose port (Railway will set PORT env var)
EXPOSE 3000

# Set environment
ENV NODE_ENV=production
ENV HOST=0.0.0.0

# Start the application
CMD ["node", ".output/server/index.mjs"]
