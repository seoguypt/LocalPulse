# Build stage
FROM node:20-alpine AS builder

# Install pnpm and build dependencies
RUN corepack enable && corepack prepare pnpm@9.0.6 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Set environment variables for build
ENV CI=true
ENV NITRO_PRESET=node-server
ENV DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy

# Install dependencies (use frozen lockfile for reproducibility)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application with full output
RUN set -ex && \
    echo "=== Starting Nuxt build ===" && \
    pnpm run build && \
    echo "=== Build completed, checking output ===" && \
    ls -la && \
    if [ -d .output ]; then \
        echo "=== .output directory exists ===" && ls -la .output; \
    else \
        echo "=== ERROR: .output directory NOT created ===" && \
        echo "=== Checking .nuxt ===" && ls -la .nuxt && \
        echo "=== Checking nuxt.config.ts ===" && cat nuxt.config.ts && \
        exit 1; \
    fi

# Final verification
RUN test -f .output/server/index.mjs || (echo "ERROR: index.mjs not found" && exit 1)

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Copy built application and startup script
COPY --from=builder /app/.output /app/.output
COPY --from=builder /app/start.sh /app/start.sh
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/server/database /app/server/database
COPY --from=builder /app/drizzle.config.ts /app/drizzle.config.ts
COPY --from=builder /app/package.json /app/package.json

# Make startup script executable
RUN chmod +x /app/start.sh

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

# Start the application with migrations
CMD ["/app/start.sh"]
