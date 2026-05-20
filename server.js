// server.js
import './src/config/env.js'; // validate env first
import app from './src/app.js';
import { env } from './src/config/env.js';
import { prisma } from './src/config/database.js';

const PORT = env.PORT || 3000;

const start = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📄 Swagger docs: http://localhost:${PORT}/api-docs`);
      console.log(`🌍 Environment: ${env.NODE_ENV}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

start();