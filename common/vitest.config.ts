import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";

export default defineConfig({
  test: {
    reporters: ["junit", "verbose"],
    outputFile: {
      junit: "./report/junit.xml"
    },
    globals: true,
    include: ["tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: configDefaults.exclude
  }
});
