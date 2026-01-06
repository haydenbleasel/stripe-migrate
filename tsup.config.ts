import { defineConfig } from "tsup";

export default defineConfig({
  shims: true,
  entry: ["src/index.ts"],
  outDir: "dist",
  format: ["esm"],
  banner: {
    js: "#!/usr/bin/env node",
  },
});
