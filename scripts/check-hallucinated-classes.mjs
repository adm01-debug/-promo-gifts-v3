import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Whitelist of valid custom shadows from tailwind.config.ts
const VALID_SHADOWS = ['xs', 'sm', 'md', 'lg', 'xl', 'soft', 'glow', 'glow-hover', 'glow-active', 'glow-focus', 'premium-hover', 'glow-primary', 'glow-secondary', 'glow-success', 'glow-warning', 'glow-orange', 'glow-cart', 'header', 'elevated'];

const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build'];

function getFiles(dir) {
  const files = [];
  for (const file of readdirSync(dir)) {
    const fullPath = join(dir, file);
    if (statSync(fullPath).isDirectory()) {
      if (!IGNORE_DIRS.includes(file)) {
        files.push(...getFiles(fullPath));
      }
    } else if (/\.(tsx|ts|css)$/.test(file)) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = getFiles('src');
let errorsFound = false;

files.forEach(file => {
  const content = readFileSync(file, 'utf8');
  
  // Search for shadow-[name] in classNames
  const shadowRegex = /shadow-([a-z0-9-]+)/g;
  let match;
  while ((match = shadowRegex.exec(content)) !== null) {
    const shadowName = match[1];
    // Skip default tailwind shadows (none, inner)
    if (['none', 'inner', '2xl'].includes(shadowName)) continue;
    
    if (!VALID_SHADOWS.includes(shadowName)) {
      console.error(`Error: Invalid shadow class "shadow-${shadowName}" found in ${file}`);
      errorsFound = true;
    }
  }
});

if (errorsFound) {
  console.error('\nBuild failed: Non-existent CSS classes detected.');
  process.exit(1);
} else {
  console.log('CSS class check passed.');
  process.exit(0);
}
