import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // 👈 allows external access (your LAN IP)
    port: 5173, // your default port
    strictPort: false, // use next free port if busy
  },
  define: {
    global: "globalThis", // Fix for sockjs-client
  },
});
