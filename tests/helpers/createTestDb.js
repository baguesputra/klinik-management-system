// tests/helpers/createTestDb.js
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, renameSync, existsSync } from 'fs';

console.log('🧪 Setting up test database...');

// Backup .env asli
renameSync('.env', '.env.backup');

// Tulis DATABASE_URL test ke .env sementara
const testEnv = readFileSync('.env.test', 'utf8');
writeFileSync('.env', testEnv);

try {
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  console.log('✅ Test database ready!');
} catch (err) {
  console.error('❌ Migration failed:', err.message);
} finally {
  // Restore .env asli — selalu dijalankan
  renameSync('.env.backup', '.env');
  console.log('✅ .env restored');
}