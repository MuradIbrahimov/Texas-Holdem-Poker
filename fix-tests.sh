#!/bin/bash
# Fix frontend testing setup

cd frontend

# Install missing test dependencies
npm install --save-dev ts-jest @types/jest jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom

# Create jest.config.js if it doesn't exist
cat > jest.config.js << 'EOF'
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react'
      }
    }]
  },
  testMatch: [
    '**/__tests__/**/*.(test|spec).(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
EOF

# Create jest.setup.js
cat > jest.setup.js << 'EOF'
import '@testing-library/jest-dom';

// Mock fetch
global.fetch = jest.fn();

// Mock console to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};
EOF

# Install identity-obj-proxy for CSS mocking
npm install --save-dev identity-obj-proxy

echo "✅ Jest configuration fixed!"