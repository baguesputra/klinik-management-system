// src/config/redis.js
import Redis from 'ioredis';
import { env } from './env.js';

// Support REDIS_URL (Railway) atau host/port/password terpisah
const redisConfig = process.env.REDIS_URL
  ? { 
      // Parse dari URL — Railway format
      lazyConnect: true,
    }
  : {
      host: env.REDIS_HOST,
      port: parseInt(env.REDIS_PORT),
      password: env.REDIS_PASSWORD,
    };

export const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, redisConfig)
  : new Redis(redisConfig);

redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('error', (err) => console.error('❌ Redis error:', err));