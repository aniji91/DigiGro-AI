import { startServer } from './backend/src/server.js';

try {
  console.log('DIGIGRO AI — starting on port', process.env.PORT || 3000);
  await startServer();
} catch (err) {
  console.error('Failed to start:', err);
  process.exit(1);
}
