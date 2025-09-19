import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globals: true,
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    env: {
      DATABASE_URL: "postgresql://postgres:password@localhost:5433/goldenpalace_test",
      JWT_ACCESS_SECRET: "test-access-secret-key-12345",
      JWT_REFRESH_SECRET: "test-refresh-secret-key-12345",
      NODE_ENV: "test"
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});