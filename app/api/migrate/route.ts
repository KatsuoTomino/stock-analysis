import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import * as fs from 'fs';
import * as path from 'path';

export async function GET() {
  try {
    // schema.sqlファイルを読み込み
    const schemaPath = path.join(process.cwd(), 'lib', 'db', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // SQLを実行（複数のステートメントを分割して実行）
    const statements = schema
      .split(';')
      .filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      await sql.query(statement);
    }
    
    return NextResponse.json({ 
      success: true,
      message: '✅ Migration completed successfully!' 
    });
  } catch (error: any) {
    console.error('❌ Migration error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Migration failed', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}