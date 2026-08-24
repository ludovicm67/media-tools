import basicSsl from "@vitejs/plugin-basic-ssl";

// Ports are configurable via env vars so the e2e test can pin dedicated,
// collision-free ports. When `VITE_PORT` is set (test mode) we also enable
// `strictPort` so vite fails loudly instead of silently moving to another
// port; for regular `npm run dev` the port stays 5173 and can auto-increment.
const explicitVitePort = process.env.VITE_PORT;
const vitePort = Number(explicitVitePort) || 5173;
const backendPort = Number(process.env.BACKEND_PORT) || 3000;

export default {
  plugins: [basicSsl()],
  server: {
    port: vitePort,
    strictPort: Boolean(explicitVitePort),
    proxy: {
      "/backend": {
        target: `http://127.0.0.1:${backendPort}`,
        changeOrigin: false,
        secure: false,
        ws: false,
        rewrite: (path) => path.replace(/^\/backend/, ""),
      },
    },
  },
  build: {
    target: "ES2022",
  },
};
