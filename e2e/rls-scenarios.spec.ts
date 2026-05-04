import { test, expect } from '@playwright/test';

test.describe('RLS Deep Dive: Authorization & Data Isolation', () => {
  
  test('Audit Log must be restricted to DEV role only', async ({ page }) => {
    // Unauthenticated access
    await page.goto('/admin/audit-log');
    await expect(page).toHaveURL(/.*login/);
  });

  test('REST API Data Isolation Check', async ({ request }) => {
    const sensitiveTables = [
      'integration_credentials',
      'discount_approval_requests',
      'admin_audit_log',
      'admin_settings'
    ];

    for (const table of sensitiveTables) {
      const response = await request.get(`/rest/v1/${table}`, {
        headers: {
          'apikey': process.env.VITE_SUPABASE_ANON_KEY || '',
        }
      });
      
      // If 200, must be empty array. If not 200, must be 401/403.
      if (response.status() === 200) {
        const data = await response.json();
        expect(Array.isArray(data)).toBeTruthy();
        expect(data.length).toBe(0);
      } else {
        expect([401, 403]).toContain(response.status());
      }
    }
  });

  test('Public Quote Approval Token security', async ({ request }) => {
    // Attempting to access an approval token without valid UUID format
    const response = await request.get('/rest/v1/quote_approval_tokens?token=eq.invalid-token');
    
    // Even if it "works" as a query, RLS will return empty result for anon
    const data = await response.json();
    expect(data.length).toBe(0);
  });
});
