import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // A case's title says in words what it checks, and vitest would cut
    // an interpolated `$case` at 40 characters; 0 shows it whole.
    chaiConfig: {truncateThreshold: 0},
  },
});
