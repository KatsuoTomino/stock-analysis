import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import * as fs from 'fs';
import * as path from 'path';

export async function GET() {
  try {
    // migration_add_memo.sqlファイルを読み込み
    const migrationPath = path.join(process.cwd(), 'lib', 'db', 'migration_add_memo.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');
    
    // SQLを実行（複数のステートメントを分割して実行）
    const statements = migration
      .split(';')
      .filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      await sql.query(statement + ';');
    }
    
    return NextResponse.json({ 
      success: true,
      message: '✅ Memo column migration completed successfully!' 
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
