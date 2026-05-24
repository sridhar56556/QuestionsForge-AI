import express from 'express';
import http from 'http';
import path from 'path';
import { connectDB } from './backend/src/config/db';
import { initSocket } from './backend/src/socket';
import assignmentRoutes from './backend/src/routes/assignments';
import paperRoutes from './backend/src/routes/papers';
import { startWorker } from './backend/src/queues/worker';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  
  const server = http.createServer(app);
  
  app.use(express.json());

  await connectDB();
  
  initSocket(server);
  startWorker();
  
  app.use('/api/assignments', assignmentRoutes);
  app.use('/api/papers', paperRoutes);
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  // Prevent unmatched /api/* routes from falling through to the frontend static server/Vite middleware
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  });

  // Global Express error handler for any errors thrown in /api routes to avoid sending HTML pages
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api/')) {
      console.error('Global API Error:', err);
      return res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
    }
    next(err);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch(console.error);
