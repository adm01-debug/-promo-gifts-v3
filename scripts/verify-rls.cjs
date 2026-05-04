const { execSync } = require('child_process');
const fs = require('fs');

/**
 * RLS Integrity Verifier
 * Queries PostgreSQL to ensure all tables have RLS enabled and policies defined.
 */

console.log('🔍 Starting Automated RLS Integrity Check...');

const query = `
SELECT 
    schemaname, 
    tablename, 
    rowsecurity,
    (SELECT count(*) FROM pg_policies p WHERE p.schemaname = t.schemaname AND p.tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY tablename;
`;

try {
  const output = execSync(`psql -c "${query}"`).toString();
  console.log('--- RLS STATUS REPORT ---');
  console.log(output);

  // Check for tables without RLS
  const lines = output.split('\n');
  const tablesWithoutRls = lines.filter(line => line.includes(' f ') || (line.includes(' 0') && !line.includes('tablename')));
  
  if (tablesWithoutRls.length > 0) {
    console.warn('⚠️ WARNING: Tables found with RLS disabled or 0 policies:');
    tablesWithoutRls.forEach(t => console.warn(`  - ${t.trim()}`));
  } else {
    console.log('✅ ALL TABLES HAVE RLS ENABLED.');
  }

  // Save to file for audit evidence
  fs.writeFileSync('mnt/documents/RLS_INTEGRITY_REPORT.txt', output);
} catch (error) {
  console.error('❌ RLS Check failed:', error.message);
}
