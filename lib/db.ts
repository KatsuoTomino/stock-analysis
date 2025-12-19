import { sql } from '@vercel/postgres';

export { sql };

export async function testConnection() {
    try {
      const result = await sql`SELECT NOW()`;
      console.log('✅ Database connected:', result.rows[0]);
      return true;
    } catch (error) {
      console.error('❌ Database connection error:', error);
      return false;
    }
  }