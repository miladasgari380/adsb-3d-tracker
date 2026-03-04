import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/adsb': {
        // We will pass the target URL dynamically via the request headers
        target: 'http://localhost', // Fallback, we will rewrite it 
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            const targetUrl = req.headers['x-adsb-target'] as string;
            if (targetUrl) {
              try {
                const url = new URL(targetUrl);
                // Dynamically update exactly where the proxy request routes to
                proxyReq.host = url.hostname;
                proxyReq.protocol = url.protocol;
                proxyReq.path = url.pathname + url.search;
                const reqAny = proxyReq as any;
                if (url.port) {
                  reqAny.port = url.port;
                } else {
                  reqAny.port = url.protocol === 'https:' ? 443 : 80;
                }
                proxyReq.setHeader('Host', url.host);
              } catch (e) {
                console.error('Invalid target URL provided:', targetUrl);
              }
            }
          });
          proxy.on('error', (err, _req, _res) => {
            console.error('Proxy error:', err);
          });
        },
      }
    }
  }
})
