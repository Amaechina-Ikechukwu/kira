import express from 'express';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import 'dotenv/config';

import lessonRoutes from './routes/lesson';
import authRoutes, { authMiddleware } from './routes/auth';
import documentRoutes from './routes/documents';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  const port = process.env.PORT || 3000;

  // Middleware
  app.use(express.json());
  app.use(authMiddleware); // Add user to request if authenticated

  // API Routes
  app.get('/api/health', (_, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/lesson', lessonRoutes);

  if (isProduction) {
    // Production: serve static files from dist/client
    const clientPath = resolve(__dirname, '../../dist/client');
    app.use(express.static(clientPath));
    
    // SPA fallback
    app.get('*', (_, res) => {
      res.sendFile(resolve(clientPath, 'index.html'));
    });

    console.log(`📦 Serving production build from ${clientPath}`);
  } else {
    // Development: use Vite as middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      root: resolve(__dirname, '../client'),
    });

    app.use(vite.middlewares);

    console.log('🔥 Vite dev server running as middleware');
  }

  app.listen(port, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎓  Kira - AI Learning Platform  🎓                    ║
║                                                           ║
║   Server running at: http://localhost:${port}              ║
║   Mode: ${isProduction ? 'Production 📦' : 'Development 🔥'}                         ║
║   Mock Mode: ${process.env.MOCK_MODE === 'true' ? 'Enabled ✅' : 'Disabled ❌'}                      ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
  });
}

startServer().catch(console.error);
