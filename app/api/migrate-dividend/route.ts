import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST() {
  try {
    // dividend_amountカラムが存在するか確認
    const columnCheck = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'stocks' 
        AND column_name = 'dividend_amount'
    `;
    
    const hasColumn = (columnCheck.rows || columnCheck).length > 0;
    
    if (hasColumn) {
      return NextResponse.json({
        success: true,
        message: 'dividend_amountカラムは既に存在します',
        alreadyExists: true
      });
    }
    
    // dividend_amountカラムを追加
    await sql`
      ALTER TABLE stocks 
      ADD COLUMN dividend_amount DECIMAL(10, 2) DEFAULT NULL
    `;
    
    return NextResponse.json({
      success: true,
      message: '✅ dividend_amountカラムを追加しました',
      alreadyExists: false
    });
  } catch (error) {
    console.error('マイグレーションエラー:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
      details: error instanceof Error ? error.stack : String(error)
    }, { status: 500 });
  }
}

