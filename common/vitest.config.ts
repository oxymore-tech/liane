import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";
export default defineConfig({
  test: {
    include: ["tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: configDefaults.exclude
  }
});
