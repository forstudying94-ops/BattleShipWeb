import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
 const env = loadEnv(mode, process.cwd(), "");
 const apiUrl = env.API_URL ?? "http://127.0.0.1:5204";

 return {
  plugins: [react()],
  server: {
   port: 3000,
   proxy: {
    "/api": {
     target: apiUrl,
     changeOrigin: true,
    },
    "/hub": {
     target: apiUrl,
     changeOrigin: true,
     ws: true,
    },
   },
  },
  preview: {
   port: 3000,
   proxy: {
    "/api": {
     target: apiUrl,
     changeOrigin: true,
    },
    "/hub": {
     target: apiUrl,
     changeOrigin: true,
     ws: true,
    },
   },
  },
 };
});
