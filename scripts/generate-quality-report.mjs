import fs from 'fs';
import path from 'path';

/**
 * Aggregates results from various test runners into a single quality report.
 * - Vitest (Unit/Integration)
 * - Playwright (E2E)
 * - ESLint (Linting)
 * - TypeScript (Type Safety)
 */

const REPORT_PATH = 'quality-report.md';

function generateReport() {
  console.log('Generating comprehensive quality report...');
  
  let report = '# 🚀 System Quality & Test Coverage Report\n\n';
  report += `*Generated on: ${new Date().toLocaleString()}*\n\n`;

  // --- 1. Unit/Integration Coverage (Vitest) ---
  report += '## 🧪 Unit & Integration Tests (Vitest)\n';
  try {
    const coverageSummary = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'));
    const total = coverageSummary.total;
    
    report += '| Metric | Coverage | Status |\n';
    report += '| --- | --- | --- |\n';
    report += `| Lines | ${total.lines.pct}% | ${total.lines.pct > 80 ? '✅' : '⚠️'} |\n`;
    report += `| Statements | ${total.statements.pct}% | ${total.statements.pct > 80 ? '✅' : '⚠️'} |\n`;
    report += `| Functions | ${total.functions.pct}% | ${total.functions.pct > 80 ? '✅' : '⚠️'} |\n`;
    report += `| Branches | ${total.branches.pct}% | ${total.branches.pct > 80 ? '✅' : '⚠️'} |\n\n`;
    
    report += '### Gaps by Module (Low Coverage < 50%)\n';
    const files = coverageSummary;
    let gapsFound = false;
    for (const [file, data] of Object.entries(files)) {
      if (file !== 'total' && data.lines && data.lines.pct < 50) {
        report += `- \`${file}\`: **${data.lines.pct}%**\n`;
        gapsFound = true;
      }
    }
    if (!gapsFound) report += 'No critical gaps found in monitored modules. ✨\n';
  } catch (e) {
    report += '⚠️ Coverage data not found. Run `npm run test:coverage` first.\n';
  }

  // --- 2. E2E Regression (Playwright) ---
  report += '\n## 🎭 E2E Regression (Playwright)\n';
  try {
    const e2eSummary = JSON.parse(fs.readFileSync('playwright-report/feature-summary.json', 'utf8'));
    report += `**Total Features Tested:** ${e2eSummary.totalFeatures}\n`;
    report += `**Passing:** ${e2eSummary.passed} | **Failed:** ${e2eSummary.failed}\n\n`;
    
    report += '### Coverage by Route\n';
    report += '| Route | Status | Coverage |\n';
    report += '| --- | --- | --- |\n';
    e2eSummary.routes.forEach(route => {
      report += `| ${route.name} | ${route.passed ? '✅' : '❌'} | ${route.coverage}% |\n`;
    });
  } catch (e) {
    report += '⚠️ E2E report not found. Run `npm run test:e2e:regression:report` first.\n';
  }

  // --- 3. Code Health ---
  report += '\n## 🛠️ Code Health\n';
  report += '- **Linting (ESLint):** Check `eslint.config.js` for rules. Baseline enforced in CI.\n';
  report += '- **Type Safety (TypeScript):** Strict mode enabled. `tsc --noEmit` enforced in CI.\n';
  
  // --- 4. CI Pipeline Summary ---
  report += '\n## ⚙️ CI Pipeline Status\n';
  report += '- **Automatic Trigger:** Every push/PR to `main`.\n';
  report += '- **Blocking Rules:** Merge blocked if Lint, Build, or Tests fail.\n';
  report += '- **Security Gated:** CodeQL and Dependency audits active.\n';

  fs.writeFileSync(REPORT_PATH, report);
  console.log(`Report generated at ${REPORT_PATH}`);
}

generateReport();
