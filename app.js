console.log('DIGIGRO AI — starting app.js');
console.log('cwd:', process.cwd());
console.log('PORT:', process.env.PORT || '5000');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');

await import('./backend/src/index.js');
