import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function walkDir(dir: string, callback: (file: string) => void) {
  readdirSync(dir).forEach(f => {
    let dirPath = join(dir, f);
    let isDirectory = statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(join(dir, f));
  });
}

describe('Admin SEO Enforcement', () => {
  it('should not import Helmet directly in admin pages', () => {
    const violations: string[] = [];
    walkDir('src/pages/admin', (file) => {
      if (!file.endsWith('.tsx')) return;
      const content = readFileSync(file, 'utf-8');
      if (content.includes('from "react-helmet-async"') || content.includes('from "react-helmet"')) {
        violations.push(file);
      }
      if (content.includes('<Helmet>')) {
        violations.push(file + " (direct <Helmet> tag)");
      }
    });
    expect(violations, `Found files using Helmet directly instead of PageSEO: ${violations.join(', ')}`).toHaveLength(0);
  });

  it('should include PageSEO in all admin pages', () => {
    const missing: string[] = [];
    walkDir('src/pages/admin', (file) => {
      if (!file.endsWith('.tsx') || file.includes('ai-usage/') || file.includes('telemetry/')) return;
      const content = readFileSync(file, 'utf-8');
      if (!content.includes('<PageSEO')) {
        missing.push(file);
      }
    });
    expect(missing, `Found files missing PageSEO component: ${missing.join(', ')}`).toHaveLength(0);
  });
});
