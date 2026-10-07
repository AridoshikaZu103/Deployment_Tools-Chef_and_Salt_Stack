import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import healthHandler from './api/health.js'
import chatHandler from './api/chat.js'

function vercelDevServerPlugin() {
  return {
    name: 'vercel-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ? req.url.split('?')[0] : '';
        if (url === '/api/health') {
          res.status = (code) => { res.statusCode = code; return res; };
          res.json = (data) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
          };
          return healthHandler(req, res);
        }
        if (url === '/api/chat') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', async () => {
            try {
              req.body = body ? JSON.parse(body) : {};
            } catch (_) {
              req.body = {};
            }
            res.status = (code) => { res.statusCode = code; return res; };
            res.json = (data) => {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
            };
            return chatHandler(req, res);
          });
          return;
        }
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), vercelDevServerPlugin()],
  server: {
    port: 5173,
    proxy: {
      '/api/v1': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      }
    }
  }
})
