FROM ubuntu:22.04

# Avoid prompts from apt
ENV DEBIAN_FRONTEND=noninteractive

# Install Node.js (using NodeSource repository for latest LTS)
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    gnupg \
    make \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm and yarn
RUN npm install --global yarn pnpm

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN pnpm install

# Copy source code and config files
COPY tsconfig.json ./
COPY tsconfig.production.json ./
COPY Makefile ./
COPY src ./src

# Build TypeScript
RUN pnpm run build

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "dist/server.js"]

