import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import mkcert from 'vite-plugin-mkcert';

export default defineConfig({
  plugins: [
    react(),
    mkcert()  // Add this plugin
  ],
  server: {
    host: "0.0.0.0",
    https: true,  // Change this to true
    port: 5173,
  },
  define: {
    global: "globalThis",
  },
});
