#!/usr/bin/env node

/**
 * CI/CD Audit Artifact Generator v7.0
 * Features:
 * - Automated Evidence Genesis via git log
 * - Quantified Gaps analysis
 * - Filtered Inventory Export (.md)
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

const DOSSIER_PATH = 'ENTERPRISE_AUDIT_REPORT_V6.md';

console.log('🚀 Starting Advanced Audit Artifacts Generation v7.0...');

/** Validates if a local file path exists */
function checkLocalPath(filePath) {
  if (filePath.startsWith('/') || filePath.startsWith('./') || filePath.includes('/')) {
    const cleanPath = filePath.replace(/^\.\//, '').replace(/`|'/g, '');
    if (cleanPath && !fs.existsSync(cleanPath)) {
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

/** Generates Quantified Gaps section */
function generateQuantifiedGaps() {
  const gaps = [
    { name: 'Finance Hub Integration', severity: 'P0', evidence: 'docs/05_ROADMAP_PROXIMOS_PASSOS.md', status: 'Roadmap Q3' },
    { name: 'AR Visualization', severity: 'P2', evidence: 'docs/05_ROADMAP_PROXIMOS_PASSOS.md', status: 'Roadmap Q4' },
    { name: 'Cross-Org Data Leak Check', severity: 'P1', evidence: 'e2e/rls-scenarios.spec.ts', status: 'Validation Pending' }
  ];

  let section = '| Gap Identificado | Severidade | Evidência Relacionada | Status Atual | Caminho para Correção |\n';
  section += '| :--- | :---: | :--- | :--- | :--- |\n';

  gaps.forEach(g => {
    section += `| ${g.name} | **${g.severity}** | \`${g.evidence}\` | ${g.status} | \`${g.evidence}\` |\n`;
  });

  return section;
}

/** Exports a filtered inventory in Markdown */
function exportFilteredInventory(mdContent) {
  const inventoryMatch = mdContent.match(/## ✅ (?:.*)Checklist Auditável[\s\S]*?(?=##|$)/);
  if (!inventoryMatch) return;

  const inventoryContent = inventoryMatch[0];
  const rows = inventoryContent.split('\n').filter(l => l.includes('|') && !l.includes('---') && !l.includes('Item de Controle'));
  
  const implemented = rows.filter(r => r.includes('✅')).join('\n');
  const pending = rows.filter(r => r.includes('⏳')).join('\n');

  let filteredMd = '# 📋 Inventário Filtrado de Auditoria\n\n';
  filteredMd += '## 🛠️ Funcionalidades Implementadas\n\n';
  filteredMd += '| Item | Prioridade | Status | Evidência |\n';
  filteredMd += '| :--- | :---: | :---: | :--- |\n';
  filteredMd += implemented + '\n\n';

  filteredMd += '## ⏳ Roadmap e Pendências\n\n';
  filteredMd += '| Item | Prioridade | Status | Evidência |\n';
  filteredMd += '| :--- | :---: | :---: | :--- |\n';
  filteredMd += pending + '\n';

  fs.writeFileSync('mnt/documents/FILTERED_INVENTORY.md', filteredMd);
  console.log('✅ Filtered inventory exported to /mnt/documents/');
}

async function run() {
  try {
    let mdContent = fs.readFileSync(DOSSIER_PATH, 'utf8');

    // 1. Automate Evidence Genesis
    console.log('📜 Updating Evidence Genesis...');
    const genesisMarker = '## 📜 5. Trilha de Auditoria Operacional (Evidence Genesis)';
    const genesisStartIdx = mdContent.indexOf(genesisMarker);
    if (genesisStartIdx !== -1) {
      let nextSectionIdx = mdContent.indexOf('## ', genesisStartIdx + genesisMarker.length);
      if (nextSectionIdx === -1) nextSectionIdx = mdContent.length;
      const newGenesis = `\n\n${generateEvidenceGenesis()}\n\n`;
      mdContent = mdContent.slice(0, genesisStartIdx + genesisMarker.length) + newGenesis + mdContent.slice(nextSectionIdx);
    }

    // 2. Automate Quantified Gaps
    console.log('📉 Updating Quantified Gaps...');
    const gapsMarker = '## 📉 7. Seção de Lacunas Quantificadas (Gap Analysis)';
    const gapsStartIdx = mdContent.indexOf(gapsMarker);
    const quantifiedGaps = `\n\n${generateQuantifiedGaps()}\n\n`;
    
    if (gapsStartIdx !== -1) {
      let nextSectionIdx = mdContent.indexOf('## ', gapsStartIdx + gapsMarker.length);
      if (nextSectionIdx === -1) nextSectionIdx = mdContent.length;
      mdContent = mdContent.slice(0, gapsStartIdx + gapsMarker.length) + quantifiedGaps + mdContent.slice(nextSectionIdx);
    } else {
      // Append if doesn't exist
      mdContent += `\n\n${gapsMarker}${quantifiedGaps}`;
    }

    fs.writeFileSync(DOSSIER_PATH, mdContent);

    // 3. Export Filtered Inventory
    exportFilteredInventory(mdContent);

    // 4. Validate paths and links
    console.log('🔍 Validating references...');
    const pathRegex = /`([^`]+\.(tsx|ts|sql|js|cjs|json|md|sh|yml|mjs|txt))`|path: `([^`]+)`/g;
    const urlRegex = /https?:\/\/[^\s\)]+/g;
    let brokenCount = 0;
    let match;

    while ((match = pathRegex.exec(mdContent)) !== null) {
      const filePath = match[1] || match[3];
      if (filePath && !filePath.includes('*') && !checkLocalPath(filePath)) {
        console.error(`❌ BROKEN FILE PATH: ${filePath}`);
        brokenCount++;
      }
    }

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
      process.exit(1);
    }

    console.log('✅ All references validated.');

    // 5. Generate PDF
    console.log('📄 Generating PDF...');
    execSync('node scripts/generate-final-dossier.cjs', { stdio: 'inherit' });

    console.log('✨ Audit artifacts generated and verified.');
  } catch (error) {
    console.error('❌ CI Audit Script failed:', error.message);
    process.exit(1);
  }
}

run();
