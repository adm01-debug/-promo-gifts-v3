#!/usr/bin/env node

/**
 * CI/CD Audit Artifact Generator v8.0
 * Features:
 * - Automated Evidence Genesis via git log (Clickable links to Github)
 * - RLS Coverage per table and route
 * - Automated Checklist status updates
 * - Clickable links for files, routes, and tests
 * - Historical Versioning
 * - PDF Export Sync
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const ARTIFACTS_DIR = path.join(process.cwd(), 'mnt', 'documents');
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

const REPO_URL = 'https://github.com/adm01-debug/gifts-store';
const DOSSIER_PATH = 'AUDIT_ENTERPRISE_FINAL.md';
const EXTERNAL_LINK_TIMEOUT = parseInt(process.env.AUDIT_LINK_TIMEOUT || '5000', 10);

console.log('🚀 Starting Advanced Audit Artifacts Generation v8.0...');

/** Validates if a local file path exists */
function checkLocalPath(filePath) {
  const cleanPath = filePath.replace(/^\.\//, '').replace(/[`']/g, '');
  if (cleanPath && !fs.existsSync(cleanPath)) {
    return false;
  }
  return true;
}

/** Generates a Github link for a file or commit */
function getGithubLink(type, ref) {
  if (type === 'file') return `${REPO_URL}/blob/main/${ref}`;
  if (type === 'commit') return `${REPO_URL}/commit/${ref}`;
  return ref;
}

/** Generates RLS Coverage Section */
function generateRlsCoverage() {
  let report = '### 🔒 Detalhe de Cobertura de RLS (Row Level Security)\n\n';
  report += '| Tabela | RLS Ativo | Políticas | Status de Auditoria | Evidência |\n';
  report += '| :--- | :---: | :---: | :---: | :--- |\n';

  try {
    const query = `
    SELECT 
        tablename, 
        rowsecurity,
        (SELECT count(*) FROM pg_policies p WHERE p.schemaname = t.schemaname AND p.tablename = t.tablename) as policy_count
    FROM pg_tables t
    WHERE schemaname = 'public'
    ORDER BY tablename;
    `;
    const output = execSync(`psql -c "${query}"`).toString();
    const lines = output.split('\n').filter(l => l.includes('|') && !l.includes('tablename') && !l.includes('schemaname'));

    lines.forEach(line => {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length < 3) return;
      const [name, rls, count] = parts;
      const status = (rls === 't' && parseInt(count) > 0) ? '✅ PASS' : '❌ FAIL';
      report += `| ${name} | ${rls === 't' ? 'SIM' : 'NÃO'} | ${count} | ${status} | [schema](${getGithubLink('file', 'supabase/migrations')}) |\n`;
    });
  } catch (e) {
    report += '| ERROR | - | - | - | Falha ao consultar DB |\n';
  }

  return report;
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
        const commitLink = `[\`${hash}\`](${getGithubLink('commit', hash)})`;
        table += `| **${f.label}** | ${date} | ${version} | ${commitLink} | ${author} |\n`;
      } else {
        table += `| **${f.label}** | N/A | - | - | System |\n`;
      }
    } catch (e) {
      table += `| **${f.label}** | N/A | - | - | Error |\n`;
    }
  });

  return table;
}

/** Automatically updates checklist based on evidence existence and adds links */
function updateChecklist(mdContent) {
  const lines = mdContent.split('\n');
  let inChecklist = false;
  const updatedLines = lines.map(line => {
    if (line.includes('## ✅') && line.includes('Checklist Auditável')) {
      inChecklist = true;
      return line;
    }
    if (inChecklist && line.trim() === '---') {
      inChecklist = false;
      return line;
    }
    if (inChecklist && line.includes('|') && !line.includes('---') && !line.includes('Item de Controle')) {
      const parts = line.split('|');
      if (parts.length > 5) {
        const evidencePathMatch = parts[5].match(/`([^`]+)`/);
        if (evidencePathMatch) {
          const path = evidencePathMatch[1];
          const exists = checkLocalPath(path);
          if (exists) {
            parts[4] = ' ✅ '; // Status Column
            // Add clickable link to evidence path
            parts[5] = ` [\`${path}\`](${getGithubLink('file', path)}) `;
          } else {
            parts[4] = ' ⏳ '; // Status Column
          }
        }
        return parts.join('|');
      }
    }
    return line;
  });
  return updatedLines.join('\n');
}

async function run() {
  try {
    let mdContent = fs.readFileSync(DOSSIER_PATH, 'utf8');

    // 1. Update Checklist Status
    console.log('✅ Updating Checklist Status...');
    mdContent = updateChecklist(mdContent);

    // 2. Automate Evidence Genesis
    console.log('📜 Updating Evidence Genesis...');
    const genesisMarker = '## 📜 5. Trilha de Auditoria Operacional (Evidence Genesis)';
    const genesisStartIdx = mdContent.indexOf(genesisMarker);
    if (genesisStartIdx !== -1) {
      let nextSectionIdx = mdContent.indexOf('## ', genesisStartIdx + genesisMarker.length);
      if (nextSectionIdx === -1) nextSectionIdx = mdContent.length;
      const newGenesis = `\n\n${generateEvidenceGenesis()}\n\n`;
      mdContent = mdContent.slice(0, genesisStartIdx + genesisMarker.length) + newGenesis + mdContent.slice(nextSectionIdx);
    }

    // 3. Add RLS Detailed Coverage
    console.log('🔒 Generating RLS Coverage Report...');
    const rlsMarker = '## 🔒 8. Relatório de Cobertura de RLS';
    const rlsStartIdx = mdContent.indexOf(rlsMarker);
    const rlsReport = `\n\n${generateRlsCoverage()}\n\n`;
    if (rlsStartIdx !== -1) {
      let nextSectionIdx = mdContent.indexOf('## ', rlsStartIdx + rlsMarker.length);
      if (nextSectionIdx === -1) nextSectionIdx = mdContent.length;
      mdContent = mdContent.slice(0, rlsStartIdx + rlsMarker.length) + rlsReport + mdContent.slice(nextSectionIdx);
    } else {
      mdContent += `\n\n${rlsMarker}${rlsReport}`;
    }

    fs.writeFileSync(DOSSIER_PATH, mdContent);

    // 4. Historical Versioning
    console.log('📂 Creating historical version...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const versionPath = `mnt/documents/AUDIT_V8_${timestamp}.md`;
    fs.writeFileSync(versionPath, mdContent);

    // 5. Generate PDF
    console.log('📄 Syncing PDF generation...');
    execSync('node scripts/generate-final-dossier.cjs', { stdio: 'inherit' });

    console.log('✨ Enterprise Audit v8.0 generation completed.');
  } catch (error) {
    console.error('❌ CI Audit Script failed:', error.message);
    process.exit(1);
  }
}

run();
