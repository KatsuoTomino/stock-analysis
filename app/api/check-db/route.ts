import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    // 1. データベース接続確認
    const connectionTest = await sql`SELECT NOW() as current_time`;
    
    // 2. stocksテーブルの構造確認
    const stocksColumns = await sql`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'stocks'
      ORDER BY ordinal_position
    `;
    
    // 3. stocksテーブルのデータ確認
    const stocksData = await sql`
      SELECT 
        id,
        code,
        name,
        purchase_price,
        shares,
        purchase_amount,
        dividend_amount,
        created_at,
        updated_at
      FROM stocks
      ORDER BY id
    `;
    
    // 4. dividendsテーブルの構造確認
    const dividendsColumns = await sql`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'dividends'
      ORDER BY ordinal_position
    `;
    
    // 5. dividendsテーブルのデータ確認
    const dividendsData = await sql`
      SELECT 
        id,
        stock_id,
        amount,
        year,
        created_at
      FROM dividends
      ORDER BY id
    `;
    
    // 6. テーブル一覧確認
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    return NextResponse.json({
      success: true,
      connection: {
        status: 'connected',
        currentTime: connectionTest.rows[0]?.current_time || null
      },
      tables: tables.rows || tables,
      stocks: {
        columns: stocksColumns.rows || stocksColumns,
        data: stocksData.rows || stocksData,
        count: (stocksData.rows || stocksData).length
      },
      dividends: {
        columns: dividendsColumns.rows || dividendsColumns,
        data: dividendsData.rows || dividendsData,
        count: (dividendsData.rows || dividendsData).length
      },
      check: {
        hasDividendAmountColumn: (stocksColumns.rows || stocksColumns).some(
          (col: any) => col.column_name === 'dividend_amount'
        ),
        stocksWithDividend: (stocksData.rows || stocksData).filter(
          (stock: any) => stock.dividend_amount !== null && stock.dividend_amount !== undefined
        ).length
      }
    });
  } catch (error) {
    console.error('データベース確認エラー:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
      details: error instanceof Error ? error.stack : String(error)
    }, { status: 500 });
  }
}

