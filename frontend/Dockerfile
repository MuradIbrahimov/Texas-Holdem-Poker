# Use Node.js LTS
FROM node:20

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json first (for caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the app
COPY . .

# Expose Next.js dev port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]
