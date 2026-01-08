const { spawn } = require('child_process');

const port = process.env.PORT || process.env.port || 3000;

const args = ['-s', 'build', '-l', String(port)];

// Resolve the package root and point to its build entry
const servePkgPath = require.resolve('serve/package.json');
const path = require('path');
const serveBin = path.join(path.dirname(servePkgPath), 'build', 'main.js');

const child = spawn(process.execPath, [serveBin, ...args], { stdio: 'inherit' });

child.on('exit', (code) => process.exit(code));
child.on('error', (err) => {
  console.error('Failed to start serve:', err);
  process.exit(1);
});
