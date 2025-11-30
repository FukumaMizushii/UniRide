import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  // Add this for production build
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  // Update base URL for production
  base: process.env.NODE_ENV === 'production' ? '/' : '/',
});