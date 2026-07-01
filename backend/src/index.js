import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import aiRoutes from './routes/ai.js';
import { authenticate } from './middleware/auth.js';
import { getAiMode, getAiModeLabel } from './config/ai.js';
import { isVercelConfigured } from './services/vercel.js';
import * as authHandlers from './routes/auth.js';
import * as projectHandlers from './routes/projects.js';
import * as shareHandlers from './routes/share.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    name: 'DIGIGRO AI',
    version: '1.0.0',
    aiMode: getAiMode(),
    vercelConfigured: isVercelConfigured(),
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

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║         DIGIGRO AI Backend           ║
  ║     http://localhost:${PORT}            ║
  ║  AI Mode: ${getAiModeLabel()}             ║
  ╚══════════════════════════════════════╝
  `);
});
