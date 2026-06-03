// tests/helpers/globalSetup.js
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, renameSync, existsSync } from 'fs';

export default async function globalSetup() {
  console.log('\n🧪 Setting up test environment...');

  // Di CI tidak ada .env file — langsung jalankan migrasi
  // karena DATABASE_URL sudah di-inject via environment
  if (!existsSync('.env')) {
    try {
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      console.log('✅ Test database ready\n');
    } catch (err) {
      console.error('❌ Failed to setup test database:', err);
      process.exit(1);
    }
    return;
  }

  // Di local — swap .env dengan .env.test
  renameSync('.env', '.env.backup');
  writeFileSync('.env', readFileSync('.env.test', 'utf8'));

  try {
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('✅ Test database ready\n');
  } catch (err) {
    console.error('❌ Failed to setup test database:', err);
  } finally {
    renameSync('.env.backup', '.env');
  }
}