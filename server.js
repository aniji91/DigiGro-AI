import { ensureFrontendBuild } from './scripts/ensure-build.js';
import { startServer } from './backend/src/server.js';

ensureFrontendBuild();
await startServer();
