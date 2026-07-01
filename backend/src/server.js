import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import aiRoutes from './routes/ai.js';
import { authenticate } from './middleware/auth.js';
import { getAiMode } from './config/ai.js';
import { isVercelConfigured } from './services/vercel.js';
import * as authHandlers from './routes/auth.js';
import * as projectHandlers from './routes/projects.js';
import * as shareHandlers from './routes/share.js';
import { runInit } from './config/initDb.js';
import pool from './config/database.js';
import { getDbConnectionMode } from './config/dbConfig.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getFrontendDist() {
  const root = process.cwd();
  const candidates = [
    path.join(root, 'public'),
    path.join(root, 'frontend', 'dist'),
    path.resolve(__dirname, '../../public'),
    path.resolve(__dirname, '../../frontend/dist'),
  ];
  const found = candidates.find((dir) => fs.existsSync(path.join(dir, 'index.html')));
  if (found) {
    console.log('Serving frontend from:', found);
    return found;
  }
  console.warn('No frontend build found. Checked:', candidates.join(', '));
  return path.join(root, 'public');
}

export function createApp() {
  const frontendDist = getFrontendDist();
  const hasFrontendBuild = fs.existsSync(path.join(frontendDist, 'index.html'));
  const app = express();

  app.set('trust proxy', 1);

  const siteUrl = process.env.FRONTEND_URL || '';
  app.use(cors({
    origin: siteUrl || true,
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', async (_req, res) => {
    let database = 'connected';
    try {
      await pool.query('SELECT 1');
    } catch (err) {
      database = err.message;
    }
    res.json({
      status: database === 'connected' ? 'ok' : 'degraded',
      name: 'DIGIGRO AI',
      version: '1.0.0',
      aiMode: getAiMode(),
      vercelConfigured: isVercelConfigured(),
      database,
      dbMode: getDbConnectionMode(),
    });
  });

  app.post('/api/auth/register', authHandlers.register);
  app.post('/api/auth/login', authHandlers.login);
  app.get('/api/auth/me', authenticate, authHandlers.me);
  app.patch('/api/auth/profile', authenticate, authHandlers.updateProfile);
  app.post('/api/auth/reset-password', authenticate, authHandlers.resetPassword);

  app.get('/api/projects', authenticate, projectHandlers.listProjects);
  app.post('/api/projects', authenticate, projectHandlers.createProject);
  app.get('/api/projects/:id', authenticate, projectHandlers.getProject);
  app.patch('/api/projects/:id', authenticate, projectHandlers.updateProject);
  app.delete('/api/projects/:id', authenticate, projectHandlers.deleteProject);
  app.put('/api/projects/:id/files', authenticate, projectHandlers.updateFiles);
  app.get('/api/projects/:id/download', authenticate, projectHandlers.downloadProject);
  app.post('/api/projects/:id/github', authenticate, projectHandlers.pushToGithub);
  app.post('/api/projects/:id/remix', authenticate, projectHandlers.remixProject);
  app.get('/api/projects/:id/analytics', authenticate, projectHandlers.getProjectAnalytics);
  app.get('/api/projects/:id/thumbnail', authenticate, projectHandlers.getProjectThumbnail);
  app.get('/api/projects/:id/publish', authenticate, shareHandlers.getPublishInfo);
  app.post('/api/projects/:id/publish', authenticate, shareHandlers.publishProject);
  app.post('/api/projects/:id/unpublish', authenticate, shareHandlers.unpublishProject);
  app.get('/api/projects/:id/share', authenticate, shareHandlers.getShareInfo);
  app.patch('/api/projects/:id/share', authenticate, shareHandlers.updateShareSettings);
  app.post('/api/projects/:id/share/invite', authenticate, shareHandlers.inviteCollaborator);
  app.patch('/api/projects/:id/share/invites/:inviteId', authenticate, shareHandlers.respondToInvite);
  app.delete('/api/projects/:id/share/members/:memberId', authenticate, shareHandlers.removeCollaborator);
  app.get('/api/publish/domain-dns', authenticate, shareHandlers.getDomainDns);
  app.get('/api/preview/:id', projectHandlers.getProjectPreview);
  app.post('/api/preview/:id/track', projectHandlers.trackProjectView);

  app.use('/api/ai', aiRoutes);

  if (hasFrontendBuild) {
    app.use(express.static(frontendDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
  } else {
    app.get('/', (_req, res) => {
      res.json({
        name: 'DIGIGRO AI API',
        health: '/api/health',
        hint: 'Frontend not built. Run: npm run build',
      });
    });
  }

  app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return { app, hasFrontendBuild };
}

/** Hostinger/cPanel run Node via Phusion Passenger — must export app, not call listen(). */
export function isPassenger() {
  return typeof globalThis.PhusionPassenger !== 'undefined'
    || Boolean(process.env.PASSENGER_APP_ENV);
}

export function startServer() {
  const { app, hasFrontendBuild } = createApp();

  runInit().catch((err) => console.error('DB init:', err.message));

  if (isPassenger()) {
    console.log('DIGIGRO AI — Passenger mode (app exported, no listen)');
    console.log('Frontend:', hasFrontendBuild ? 'yes' : 'no');
    return app;
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`DIGIGRO AI listening on port ${port}`);
    console.log('Frontend:', hasFrontendBuild ? 'yes' : 'no');
  });

  return app;
}
