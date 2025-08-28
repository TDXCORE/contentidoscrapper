# Use the official Apify Node.js Actor base image
FROM apify/actor-node:18

# Copy package.json first for better Docker layer caching
COPY package.json ./

# Install dependencies
RUN npm install --only=production \
 && echo "Installed NPM packages:" \
 && npm list --depth=0 2>/dev/null || echo "Package list completed"

# Next, copy the remaining files and directories with the source code
# Since we do this after installing dependencies, rebuilds will be fast
# for most source file changes
COPY . ./

# Create output directory
RUN mkdir -p output

# Make sure Chrome/Chromium dependencies are available for Puppeteer
RUN apt-get update \
 && apt-get install -y \
    chromium \
    chromium-sandbox \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libwayland-client0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    libu2f-udev \
    libvulkan1 \
 && rm -rf /var/lib/apt/lists/*

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Specify how to launch the Actor
CMD ["node", "src/main.js"]
