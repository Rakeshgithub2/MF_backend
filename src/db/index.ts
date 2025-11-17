import { mongodb } from './mongodb';
import { prisma } from './prisma';

// Export MongoDB instance and Prisma client
export { mongodb, prisma };

// Test connection
mongodb
  .connect()
  .then(() => console.log('✅ Database connected successfully'))
  .catch((err) => {
    console.error('❌ Database connection failed:', err);
    // Don't exit - let the server continue
  });
