// frontend/jest.setup.js

import '@testing-library/jest-dom';

// Mock fetch for tests
global.fetch = jest.fn();

// Reset mocks between tests
beforeEach(() => {
  fetch.mockClear();
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};