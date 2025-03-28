import { defineConfig } from "tsup";

export default defineConfig({
  entryPoints: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  outDir: "dist",
  minify: true,
  clean: true,
});
