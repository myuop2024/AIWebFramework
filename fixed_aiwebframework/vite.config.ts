
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  root: path.resolve(__dirname, "../client"),
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../client/src')
    }
  },
  server: {
    proxy: {
      "/socket.io": {
        target: "http://0.0.0.0:5000",
        ws: true
      },
      "/comms": {
        target: "http://0.0.0.0:5000",
        ws: true
      }
    }
  }
});
