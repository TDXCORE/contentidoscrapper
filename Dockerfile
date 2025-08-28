# Use the official Apify Node.js Actor base image with Node 20
FROM apify/actor-node:20

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install all dependencies (not just production) to ensure all packages are available
# Use npm ci for faster, reliable, reproducible builds
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi \
 && echo "Installed NPM packages:" \
 && npm list --depth=0 2>/dev/null || echo "Package list completed"

# Next, copy the remaining files and directories with the source code
# Since we do this after installing dependencies, rebuilds will be fast
# for most source file changes
COPY . ./

# Create output directory
RUN mkdir -p output

# Install Chromium and dependencies for Puppeteer (Alpine Linux)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Specify how to launch the Actor
CMD ["node", "src/main.js"]
