import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    lib: { entry: resolve(__dirname, "src/index.ts"), name: "liane-common" },
    rollupOptions: {
      external: ["react", "react-dom"]
    }
  },
  resolve: { alias: { src: resolve("src/") } },
  plugins: [
    dts({
      insertTypesEntry: true,
      tsconfigPath: "tsconfig.build.json"
    })
  ]
});
