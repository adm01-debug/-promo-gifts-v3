import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('Audit Automation Scripts', () => {
  const dossierPath = 'ENTERPRISE_AUDIT_REPORT_V6.md';
  const pdfPath = 'mnt/documents/ENTERPRISE_AUDIT_REPORT_V6.pdf';
  const filteredPath = 'mnt/documents/FILTERED_INVENTORY.md';

  it('ci-audit-gen.cjs should run successfully and generate artifacts', () => {
    // We expect it to run without throwing
    const output = execSync('node scripts/ci-audit-gen.cjs').toString();
    
    expect(output).toContain('Audit artifacts generated and verified');
    expect(fs.existsSync(dossierPath)).toBe(true);
    expect(fs.existsSync(pdfPath)).toBe(true);
    expect(fs.existsSync(filteredPath)).toBe(true);
  });

  it('Evidence Genesis should contain commit hashes', () => {
    const mdContent = fs.readFileSync(dossierPath, 'utf8');
    // Regex for 7-character commit hash in backticks
    expect(mdContent).toMatch(/`[a-f0-9]{7,}`/);
    expect(mdContent).toContain('Trilha de Auditoria Operacional (Evidence Genesis)');
  });

  it('Quantified Gaps should be populated', () => {
    const mdContent = fs.readFileSync(dossierPath, 'utf8');
    expect(mdContent).toContain('Seção de Lacunas Quantificadas (Gap Analysis)');
    expect(mdContent).toContain('Finance Hub Integration');
  });

  it('PDF should have the correct version', () => {
    // This is hard to check content-wise without a PDF parser, 
    // but we can check if it was updated recently
    const stats = fs.statSync(pdfPath);
    const now = new Date();
    // Should have been generated in the last 2 minutes
    expect(now.getTime() - stats.mtime.getTime()).toBeLessThan(120000);
  });

  it('Should fail when a broken path is introduced', () => {
    const originalContent = fs.readFileSync(dossierPath, 'utf8');
    try {
      // Inject a broken local path
      fs.appendFileSync(dossierPath, '\n`src/this-file-does-not-exist.tsx`');
      
      expect(() => {
        execSync('node scripts/ci-audit-gen.cjs', { stdio: 'pipe' });
      }).toThrow();
    } finally {
      // Restore original content
      fs.writeFileSync(dossierPath, originalContent);
    }
  });

  it('Should fail when a broken external URL is introduced', { timeout: 10000 }, () => {
    const originalContent = fs.readFileSync(dossierPath, 'utf8');
    try {
      // Inject a broken external URL (one that is likely down or invalid)
      fs.appendFileSync(dossierPath, '\nhttps://this-is-a-totally-fake-url-that-should-fail.com/404');
      
      expect(() => {
        execSync('node scripts/ci-audit-gen.cjs', { stdio: 'pipe' });
      }).toThrow();
    } finally {
      // Restore original content
      fs.writeFileSync(dossierPath, originalContent);
    }
  });
});
