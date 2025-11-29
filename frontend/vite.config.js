import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    // This setting ensures Vite binds to all network interfaces (0.0.0.0),
    // making it accessible via your local IP (192.168.0.106)
    host: "0.0.0.0",
    port: 5173,
  },
});
