#!/usr/bin/env node

/**
 * CI/CD Audit Artifact Generator v6.0
 * Features:
 * - Automated Evidence Genesis via git log
 * - Path and External URL validation
 * - Automated CI Failure on broken links
 * - Sync with PDF generation
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const ARTIFACTS_DIR = path.join(process.cwd(), 'mnt', 'documents');
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

const DOSSIER_PATH = 'FINAL_ENTERPRISE_AUDIT_REPORT.md';

console.log('🚀 Starting Advanced Audit Artifacts Generation...');

/** Validates if a local file path exists */
function checkLocalPath(filePath) {
  if (filePath.startsWith('/') || filePath.startsWith('./') || filePath.includes('/')) {
    const cleanPath = filePath.replace(/^\.\//, '');
    if (!fs.existsSync(cleanPath)) {
      return false;
    }
  }
  return true;
}

/** Validates if an external URL is reachable */
function checkExternalUrl(url, timeout = 5000) {
  return new Promise((resolve) => {
    const req = https.get(url, { timeout }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

/** Generates Evidence Genesis table via Git */
function generateEvidenceGenesis() {
  const files = [
    { label: 'Isolamento RLS', path: 'supabase/migrations/' },
    { label: 'MFA Integration', path: 'src/contexts/AuthContext.tsx' },
    { label: 'Pricing Engine', path: 'src/lib/personalization/calculators.ts' },
    { label: 'Performance Catálogo', path: 'src/components/products/VirtualizedProductGrid.tsx' }
  ];

  let table = '| Funcionalidade | Data de Geração | Versão Ref | Commit Ref | Auditor Original |\n';
  table += '| :--- | :--- | :--- | :--- | :--- |\n';

  files.forEach(f => {
    try {
      const firstCommit = execSync(`git log --reverse --format="%ad|%h|%an" --date=short "${f.path}" | head -n 1`).toString().trim();
      if (firstCommit) {
        const [date, hash, author] = firstCommit.split('|');
        // Simple versioning based on year/month for this report context
        const version = `v${date.split('-')[0].slice(2)}.${date.split('-')[1]}`;
        table += `| **${f.label}** | ${date} | ${version} | \`${hash}\` | ${author} |\n`;
      } else {
        table += `| **${f.label}** | N/A | - | - | System |\n`;
      }
    } catch (e) {
      table += `| **${f.label}** | N/A | - | - | Error |\n`;
    }
  });

  return table;
}

async function run() {
  try {
    let mdContent = fs.readFileSync(DOSSIER_PATH, 'utf8');

    // 1. Automate Evidence Genesis Section
    console.log('📜 Automating Evidence Genesis via Git...');
    const genesisMarker = '## 📜 5. Trilha de Auditoria Operacional (Evidence Genesis)';
    const nextSectionMarker = '---';
    const genesisStartIdx = mdContent.indexOf(genesisMarker);
    const nextIdx = mdContent.indexOf(nextSectionMarker, genesisStartIdx + genesisMarker.length);
    
    if (genesisStartIdx !== -1) {
      // Find end of section by looking for the next header or a significant divider
      let nextSectionIdx = mdContent.indexOf('## ', genesisStartIdx + genesisMarker.length);
      if (nextSectionIdx === -1) nextSectionIdx = mdContent.indexOf('---', genesisStartIdx + genesisMarker.length);
      
      const newGenesis = `\n\n${generateEvidenceGenesis()}\n\n`;
      mdContent = mdContent.slice(0, genesisStartIdx + genesisMarker.length) + newGenesis + (nextSectionIdx !== -1 ? mdContent.slice(nextSectionIdx) : '');
      fs.writeFileSync(DOSSIER_PATH, mdContent);
    }

    // 2. Validate paths and links
    console.log('🔍 Validating all evidence paths and URLs...');
    const pathRegex = /`([^`]+\.(tsx|ts|sql|js|cjs|json|md|sh|yml|mjs|txt))`|path: `([^`]+)`/g;
    const urlRegex = /https?:\/\/[^\s\)]+/g;
    
    let brokenCount = 0;
    let match;

    // Validate Files
    while ((match = pathRegex.exec(mdContent)) !== null) {
      const filePath = match[1] || match[3];
      if (filePath && !filePath.includes('*') && !checkLocalPath(filePath)) {
        console.error(`❌ BROKEN FILE PATH: ${filePath}`);
        brokenCount++;
      }
    }

    // Validate External Links
    const urls = mdContent.match(urlRegex) || [];
    for (const url of urls) {
      const ok = await checkExternalUrl(url);
      if (!ok) {
        console.error(`❌ BROKEN EXTERNAL URL: ${url}`);
        brokenCount++;
      }
    }

    if (brokenCount > 0) {
      console.error(`\n🚨 AUDIT FAILED: ${brokenCount} broken references found.`);
      process.exit(1); // FAIL CI
    }

    console.log('✅ All references validated.');

    // 3. Generate PDF
    console.log('📄 Syncing PDF generation...');
    execSync('node scripts/generate-final-dossier.cjs', { stdio: 'inherit' });

    console.log('✨ Artifacts successfully updated and validated.');
  } catch (error) {
    console.error('❌ CI Audit Script failed:', error.message);
    process.exit(1);
  }
}

run();
