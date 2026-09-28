import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" hace que el mismo build sirva en Vercel y dentro de la APK (Capacitor).
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: { outDir: "dist", target: "es2020" },
});
