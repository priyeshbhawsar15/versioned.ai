const fs = require('fs');
const path = require('path');

const uiOutDir = path.resolve(__dirname, '../../ui/out');
const cliDistUiDir = path.resolve(__dirname, '../dist/ui');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`⚠ UI build output not found at: ${src}`);
    console.warn('  Run "npm run build:ui" first to generate the static export.');
    return;
  }

  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('Copying UI static export into CLI dist...');
copyDir(uiOutDir, cliDistUiDir);
console.log('✓ UI assets copied to dist/ui/');
