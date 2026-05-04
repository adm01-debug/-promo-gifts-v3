#!/usr/bin/env node

/**
 * CI/CD Audit Artifact Generator
 * Automates the synchronization between DOSSIA_AUDITORIA_ENTERPRISE_V5.md and PDF.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ARTIFACTS_DIR = path.join(process.cwd(), 'mnt', 'documents');
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

console.log('🚀 Starting Audit Artifacts Generation...');

try {
  // 1. Run the PDF generator script
  console.log('📄 Generating PDF from Dossiê metadata...');
  execSync('node scripts/generate-final-dossier.cjs', { stdio: 'inherit' });

  // 2. Validate paths in Markdown (Self-healing check)
  console.log('🔍 Validating Markdown evidence paths...');
  const mdContent = fs.readFileSync('DOSSIA_AUDITORIA_ENTERPRISE_V5.md', 'utf8');
  const pathRegex = /`([^`]+\.(tsx|ts|sql|js|cjs|json|md))`|path: `([^`]+)`/g;
  let match;
  let brokenPaths = 0;

  while ((match = pathRegex.exec(mdContent)) !== null) {
    const filePath = match[1] || match[3];
    if (filePath && !filePath.includes('*')) { // Skip wildcards
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ BROKEN PATH DETECTED: ${filePath}`);
        brokenPaths++;
      }
    }
  }

  if (brokenPaths === 0) {
    console.log('✅ All referenced files exist in repository.');
  } else {
    console.warn(`📢 Audit finished with ${brokenPaths} path warnings.`);
  }

  console.log('✨ Artifacts updated in /mnt/documents/');
} catch (error) {
  console.error('❌ Generation failed:', error.message);
  process.exit(1);
}
