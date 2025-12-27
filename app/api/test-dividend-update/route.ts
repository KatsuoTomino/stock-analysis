import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// テスト用: 特定の銘柄に配当金を設定
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stock_id, dividend_amount } = body;

    if (!stock_id || dividend_amount === undefined) {
      return NextResponse.json(
        { error: 'stock_idとdividend_amountが必要です' },
        { status: 400 }
      );
    }

    console.log('テスト配当金更新:', { stock_id, dividend_amount });

    // 銘柄が存在するか確認
    const stockCheck = await sql`
      SELECT id, code, name FROM stocks WHERE id = ${stock_id}
    `;
    const stockRows = stockCheck.rows || stockCheck;
    
    if (stockRows.length === 0) {
      return NextResponse.json(
        { error: `銘柄ID ${stock_id} が見つかりません` },
        { status: 404 }
      );
    }

    console.log('銘柄情報:', stockRows[0]);

    // 配当金を更新
    const result = await sql`
      UPDATE stocks
      SET dividend_amount = ${dividend_amount},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${stock_id}
      RETURNING *
    `;

    const rows = result.rows || result;
    
    console.log('更新結果:', rows[0]);

    // 更新後の確認
    const verify = await sql`
      SELECT id, code, name, dividend_amount 
      FROM stocks 
      WHERE id = ${stock_id}
    `;
    const verifyRows = verify.rows || verify;

    return NextResponse.json({
      success: true,
      message: '配当金を更新しました',
      stock: rows[0],
      verification: verifyRows[0]
    });
  } catch (error) {
    console.error('テスト配当金更新エラー:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
      details: error instanceof Error ? error.stack : String(error)
    }, { status: 500 });
  }
}

