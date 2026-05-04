import { test, expect } from '@playwright/test';

test.describe('RLS Enterprise: Multi-tenant & Role Isolation', () => {
  
  const ANON_HEADERS = {
    'apikey': process.env.VITE_SUPABASE_ANON_KEY || '',
    'Content-Type': 'application/json'
  };

  test('Public Users must NOT leak cross-organization quotes', async ({ request }) => {
    // Attempt to fetch all quotes as an unauthenticated user
    const response = await request.get('/rest/v1/quotes', { headers: ANON_HEADERS });
    
    // Status 200 is fine as long as the array is empty due to RLS
    if (response.status() === 200) {
      const data = await response.json();
      expect(data.length).toBe(0);
    } else {
      expect([401, 403]).toContain(response.status());
    }
  });

  test('Organization isolation simulation via RPC', async ({ request }) => {
    // Attempt to invoke a restricted RPC without authentication
    const response = await request.post('/rest/v1/rpc/get_industry_top_products', {
      headers: ANON_HEADERS,
      data: { p_industry: 'Technology' }
    });
    
    // Must be rejected or return no sensitive data
    expect([401, 403, 404]).toContain(response.status());
  });

  test('Direct table access security for high-risk data', async ({ request }) => {
    const highRiskTables = [
      'integration_credentials',
      'secret_rotation_log',
      'ip_access_control',
      'admin_settings'
    ];

    for (const table of highRiskTables) {
      const response = await request.get(`/rest/v1/${table}`, { headers: ANON_HEADERS });
      
      // RLS should return 401 (if no auth) or empty list
      if (response.status() === 200) {
        const data = await response.json();
        expect(data.length).toBe(0);
      } else {
        expect([401, 403]).toContain(response.status());
      }
    }
  });

  test('Rate limiting log must NOT be visible to public', async ({ request }) => {
    const response = await request.get('/rest/v1/request_rate_limits', { headers: ANON_HEADERS });
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data.length).toBe(0);
    }
  });
});
