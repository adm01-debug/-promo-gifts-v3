import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { globSync } from 'glob';

describe('Admin SEO Enforcement', () => {
  it('should not import Helmet directly in admin pages', () => {
    const adminPages = globSync('src/pages/admin/**/*.tsx');
    const violations: string[] = [];

    adminPages.forEach(file => {
      const content = readFileSync(file, 'utf-8');
      // Look for react-helmet or react-helmet-async imports
      if (content.includes('from "react-helmet-async"') || content.includes('from "react-helmet"')) {
        violations.push(file);
      }
      
      // Check for direct <Helmet> tag usage without import (unlikely but possible)
      if (content.includes('<Helmet>')) {
        violations.push(file + " (direct <Helmet> tag)");
      }
    });

    expect(violations, `Found files using Helmet directly instead of PageSEO: ${violations.join(', ')}`).toHaveLength(0);
  });

  it('should include PageSEO in all admin pages', () => {
    const adminPages = globSync('src/pages/admin/*.tsx');
    const missing: string[] = [];

    adminPages.forEach(file => {
      const content = readFileSync(file, 'utf-8');
      if (!content.includes('<PageSEO')) {
        missing.push(file);
      }
    });

    expect(missing, `Found files missing PageSEO component: ${missing.join(', ')}`).toHaveLength(0);
  });
});
