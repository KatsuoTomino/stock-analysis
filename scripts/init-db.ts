/**
 * データベース初期化スクリプト
 * 実行方法: npx tsx scripts/init-db.ts
 * 
 * 注意: このスクリプトを実行する前に、.env.local に POSTGRES_URL が設定されていることを確認してください
 */

import { sql } from '../lib/db';
import { readFileSync } from 'fs';
import { join } from 'path';

async function initDatabase() {
  try {
    console.log('データベース初期化を開始します...');

    // schema.sql を読み込む
    const schemaPath = join(process.cwd(), 'lib', 'db', 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    // SQL文を分割して実行（セミコロンで区切る）
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement) {
        console.log(`実行中: ${statement.substring(0, 50)}...`);
        try {
          // @ts-ignore - sql.query()は実行時に利用可能
          await (sql as any).query(statement + ';');
        } catch (error: any) {
          // IF NOT EXISTS の場合、既に存在するエラーは無視
          if (error?.message?.includes('already exists')) {
            console.log('  (テーブルは既に存在します)');
          } else {
            throw error;
          }
        }
      }
    }

    console.log('✓ データベース初期化が完了しました');

    // テーブルが正しく作成されたか確認
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    console.log('\n作成されたテーブル:');
    tables.forEach((table: { table_name: string }) => {
      console.log(`  - ${table.table_name}`);
    });
  } catch (error) {
    console.error('データベース初期化エラー:', error);
    process.exit(1);
  }
}

initDatabase();
