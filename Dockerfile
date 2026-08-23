# Use official Node.js 20 LTS (Bookworm slim for robust GLIBC / sharp binary compatibility)
FROM node:20-bookworm-slim

# Set default production environment
ENV NODE_ENV=production
ENV PORT=5000

# Set working directory
WORKDIR /app

# Copy package manifests first to leverage Docker layer caching
COPY package.json package-lock.json ./

# Install exact production dependencies using existing lockfile (zero drift)
RUN npm ci --omit=dev && npm cache clean --force

# Copy all application files
COPY . .

# Ensure storage and data directories exist with proper permissions for the node user
RUN mkdir -p uploads/originals uploads/thumbnails uploads/medium music photo server/data \
    && chown -R node:node /app

# Switch to non-root user for security
USER node

# Expose server port
EXPOSE 5000

# Healthcheck for container orchestration and uptime monitoring
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 5000) + '/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# Start the application using existing start command (node server/server.js)
CMD ["npm", "start"]
