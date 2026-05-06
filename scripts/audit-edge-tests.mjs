import fs from 'fs';
import path from 'path';

const functionsDir = 'supabase/functions';
const testsDir = 'supabase/functions/tests';

const functions = fs.readdirSync(functionsDir).filter(f => 
  fs.statSync(path.join(functionsDir, f)).isDirectory() && !f.startsWith('_') && f !== 'tests'
);

const testFiles = fs.readdirSync(testsDir).filter(f => f.endsWith('_test.ts') || f.endsWith('.test.ts'));

console.log('--- Edge Functions Integration Test Audit ---');
functions.forEach(fn => {
  const hasTest = testFiles.some(tf => tf.includes(fn));
  console.log(`${hasTest ? '✅' : '❌'} ${fn}`);
});

if (functions.some(fn => !testFiles.some(tf => tf.includes(fn)))) {
  console.warn('\n⚠️ Some Edge Functions are missing dedicated integration tests.');
} else {
  console.log('\n✨ All Edge Functions have dedicated integration tests.');
}
