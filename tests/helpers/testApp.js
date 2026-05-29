// tests/helpers/testApp.js
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import app from '../../src/app.js';

export default app;