import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0", // Allow access from network
  },
  define: {
    global: "globalThis",
  },
});
