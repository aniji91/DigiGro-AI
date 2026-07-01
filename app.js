import { ensureFrontendBuild } from './scripts/ensure-build.js';
import { startServer } from './backend/src/server.js';

console.log('DIGIGRO AI — starting');
console.log('cwd:', process.cwd());
console.log('PORT:', process.env.PORT || '5000');

ensureFrontendBuild();
await startServer();
