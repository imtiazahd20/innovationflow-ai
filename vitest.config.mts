import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tells Vitest where tests live and how to understand our "@/..." import shortcut,
// which means "start from the src folder".
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "tests/**/*.test.ts"],
    environment: "node",
  },
});
