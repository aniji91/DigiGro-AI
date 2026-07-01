import { spawn } from 'child_process';

function runScript(scriptPath) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath], {
      stdio: 'inherit',
      env: process.env,
    });
    child.on('close', () => resolve());
    child.on('error', (err) => {
      console.error('Script error:', err.message);
      resolve();
    });
  });
}

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  process.exit(1);
});

console.log('Starting DIGIGRO AI...');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('PORT:', process.env.PORT || '5000');

await runScript('backend/src/config/initDb.js');
await import('./backend/src/index.js');
