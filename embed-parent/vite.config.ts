import { defineConfig } from 'vite';

/** Local third-party parent. Different origin from the ambassador app (port 5180). */
export default defineConfig({
  root: __dirname,
  server: {
    port: 5199,
    strictPort: true,
  },
});
