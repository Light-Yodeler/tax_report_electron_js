const asar = require('@electron/asar');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

async function packageAsar() {
  const src = __dirname;
  const dest = path.join(__dirname, 'release/mac-arm64/Laporan Bapenda Anda.app/Contents/Resources/app.asar');
  
  // 1. Always build latest React & Tailwind assets first
  console.log('Compiling latest React & Tailwind frontend bundle...');
  execSync('npm run build:react', {
    cwd: src,
    stdio: 'inherit'
  });

  // Use ultra-fast local SSD /tmp directory
  const tempDir = path.join(os.tmpdir(), 'laporan_bapenda_staging_' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  console.log('Staging files to local SSD:', tempDir);

  // Copy dist, electron, package.json
  fs.cpSync(path.join(src, 'dist'), path.join(tempDir, 'dist'), { recursive: true });
  fs.cpSync(path.join(src, 'electron'), path.join(tempDir, 'electron'), { recursive: true });
  fs.cpSync(path.join(src, 'package.json'), path.join(tempDir, 'package.json'));

  // Install clean production dependencies directly on fast local SSD
  console.log('Installing production runtime dependencies on local SSD...');
  execSync('npm install --omit=dev --no-audit --no-fund', {
    cwd: tempDir,
    stdio: 'inherit'
  });

  console.log('Packaging app.asar to:', dest);
  await asar.createPackage(tempDir, dest);

  // Cleanup temp
  fs.rmSync(tempDir, { recursive: true, force: true });

  try {
    execSync('xattr -cr "release/mac-arm64/Laporan Bapenda Anda.app"', { cwd: src });
    execSync('touch "release/mac-arm64/Laporan Bapenda Anda.app" "release/mac-arm64"', { cwd: src });
  } catch (e) {}

  console.log('✓ Successfully updated Laporan Bapenda Anda.app with all dependencies (including exceljs, sql.js, xlsx)!');
}

packageAsar().catch(console.error);
