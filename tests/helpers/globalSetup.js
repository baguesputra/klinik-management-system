// tests/helpers/globalSetup.js
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, renameSync } from 'fs';

export default async function globalSetup() {
  console.log('\n🧪 Setting up test environment...');

  renameSync('.env', '.env.backup');
  writeFileSync('.env', readFileSync('.env.test', 'utf8'));

  try {
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('✅ Test database ready\n');
  } catch (err) {
    console.error('❌ Failed to setup test database:', err);
    process.exit(1);
  } finally {
    renameSync('.env.backup', '.env');
  }
}