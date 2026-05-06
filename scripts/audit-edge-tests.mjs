import fs from 'fs';
import path from 'path';

const functionsDir = 'supabase/functions';
const testsDir = 'supabase/functions/tests';

const functions = fs.readdirSync(functionsDir).filter(f => 
  fs.statSync(path.join(functionsDir, f)).isDirectory() && !f.startsWith('_') && f !== 'tests'
);

const testFiles = [];
const walkSync = (dir) => {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walkSync(filePath);
    } else if (file.endsWith('_test.ts') || file.endsWith('.test.ts')) {
      testFiles.push({ name: file, path: filePath });
    }
  });
};

walkSync(functionsDir);

console.log('--- Edge Functions Integration Test Audit ---');
let missingCount = 0;
functions.forEach(fn => {
  const hasTest = testFiles.some(tf => tf.path.includes(fn) || tf.name.includes(fn));
  console.log(`${hasTest ? '✅' : '❌'} ${fn}`);
  if (!hasTest) missingCount++;
});

if (missingCount > 0) {
  console.warn(`\n⚠️ ${missingCount} Edge Functions are missing dedicated integration tests.`);
} else {
  console.log('\n✨ All Edge Functions have dedicated integration tests.');
}
