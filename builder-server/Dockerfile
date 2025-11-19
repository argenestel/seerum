FROM node:20-alpine

# Install pnpm and yarn (yarn needed for Makefile)
RUN apk update &&         apk add -y nodejs npm
RUN npm install --global yarn

RUN curl -fsSL https://get.pnpm.io/install.sh | sh -

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

