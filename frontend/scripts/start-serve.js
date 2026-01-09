const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || process.env.port || 3000;

const buildIndexPath = path.join(process.cwd(), 'build', 'index.html');

let child;

const nodeEnv = String(process.env.NODE_ENV || '').toLowerCase();
const isProd = nodeEnv === 'production';

if (isProd && fs.existsSync(buildIndexPath)) {
  const args = ['-s', 'build', '-l', String(port)];

  // Resolve the package root and point to its build entry
  const servePkgPath = require.resolve('serve/package.json');
  const serveBin = path.join(path.dirname(servePkgPath), 'build', 'main.js');

  child = spawn(process.execPath, [serveBin, ...args], { stdio: 'inherit' });
} else {
  if (isProd) {
    console.log(
      `[start] NODE_ENV=production but build/ not found. Starting CRA dev server instead (PORT=${port}).`
    );
  } else {
    console.log(`[start] Starting CRA dev server (PORT=${port}).`);
  }

  const reactScriptsStart = require.resolve('react-scripts/scripts/start');
  child = spawn(process.execPath, [reactScriptsStart], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: String(port),
    },
  });
}

child.on('exit', (code) => process.exit(code));
child.on('error', (err) => {
  console.error('Failed to start serve:', err);
  process.exit(1);
});
