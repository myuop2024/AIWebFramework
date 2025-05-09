import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from 'url';

// Convert URL to path
const __filename = fileURLToPath(import.meta.url);
// Get directory name
const __dirname = path.dirname(__filename);

export default defineConfig({
  root: path.resolve(__dirname, "client"),
  plugins: [react()],
  resolve: {
    /* your existing aliases */
  },
  build: {
    /* your existing build options */
  },
  server: {
    proxy: {
      // proxy all socket.io traffic
      "/socket.io": {
        target: "http://localhost:5000",
        ws: true
      },
      // proxy your namespace if hit directly
      "/comms": {
        target: "http://localhost:5000",
        ws: true
      }
    }
  }
});
