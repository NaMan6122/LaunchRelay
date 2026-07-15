import { defineConfig } from '@playwright/test';

export default defineConfig({
  testMatch: ['**/*.spec.*', '**/*.test.*'],
  timeout: 15000,
  use: {
    headless: true,
  },
});
