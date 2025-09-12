require('@testing-library/jest-dom');


global.fetch = jest.fn();


global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};