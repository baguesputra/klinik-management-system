// tests/helpers/setup.js
import { prisma } from '../../src/config/database.js';
import { redis } from '../../src/config/redis.js';

afterAll(async () => {
  await prisma.$disconnect();
  await redis.quit();
});