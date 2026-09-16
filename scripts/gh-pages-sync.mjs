import fs from 'node:fs';
import path from 'node:path';

const distBrowser = path.resolve('dist/app/browser');
const rootDir = path.resolve('.');

if (fs.existsSync(distBrowser)) {
  // Read dist index.html
  const distIndex = path.join(distBrowser, 'index.html');
  if (fs.existsSync(distIndex)) {
    let html = fs.readFileSync(distIndex, 'utf8');
    html = html.replace(/<base href="\/">/g, '<base href="./">');
    html = html.replace(/href="\/icon\.svg"/g, 'href="icon.svg"');
    html = html.replace(/href="\/manifest\.json"/g, 'href="manifest.json"');

    // Write index.html, .index.html, and 404.html at root
    fs.writeFileSync(path.join(rootDir, 'index.html'), html, 'utf8');
    fs.writeFileSync(path.join(rootDir, '.index.html'), html, 'utf8');
    fs.writeFileSync(path.join(rootDir, '404.html'), html, 'utf8');
  }

  // Copy bundle assets (js, css, svg, json, ico) to root
  const files = fs.readdirSync(distBrowser);
  for (const file of files) {
    const fullSrc = path.join(distBrowser, file);
    const stat = fs.statSync(fullSrc);
    if (!stat.isDirectory() && file !== 'index.html') {
      fs.copyFileSync(fullSrc, path.join(rootDir, file));
    }
  }

  // Create .nojekyll in root and public
  fs.writeFileSync(path.join(rootDir, '.nojekyll'), '', 'utf8');
  const publicDir = path.join(rootDir, 'public');
  if (fs.existsSync(publicDir)) {
    fs.writeFileSync(path.join(publicDir, '.nojekyll'), '', 'utf8');
  }

  console.log('GitHub Pages static assets, index.html, and .index.html synced successfully.');
}
