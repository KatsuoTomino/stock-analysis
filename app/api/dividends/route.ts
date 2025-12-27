import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// POST /api/dividends - 配当情報登録
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stock_id, amount, year } = body;

    // バリデーション
    if (!stock_id || amount === undefined || !year) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400 }
      );
    }

    if (typeof stock_id !== 'number' || stock_id <= 0) {
      return NextResponse.json(
        { error: '無効な銘柄IDです' },
        { status: 400 }
      );
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: '配当金額は正の数である必要があります' },
        { status: 400 }
      );
    }

    if (typeof year !== 'number' || year < 2000 || year > 2100) {
      return NextResponse.json(
        { error: '無効な年度です' },
        { status: 400 }
      );
    }

    // 銘柄が存在するか確認
    const stockCheck = await sql`
      SELECT id FROM stocks WHERE id = ${stock_id}
    `;
    const stockRows = stockCheck.rows || stockCheck;
    if (stockRows.length === 0) {
      return NextResponse.json(
        { error: '銘柄が見つかりません' },
        { status: 404 }
      );
    }

    // データベースに挿入
    const result = await sql`
      INSERT INTO dividends (stock_id, amount, year)
      VALUES (${stock_id}, ${amount}, ${year})
      RETURNING *
    `;

    const rows = result.rows || result;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('配当登録エラー:', error);
    return NextResponse.json(
      { error: '配当の登録に失敗しました' },
      { status: 500 }
    );
  }
}

// GET /api/dividends - 銘柄別配当取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stockId = searchParams.get('stock_id');

    if (!stockId) {
      return NextResponse.json(
        { error: 'stock_idパラメータが必要です' },
        { status: 400 }
      );
    }

    const id = parseInt(stockId);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: '無効な銘柄IDです' },
        { status: 400 }
      );
    }

    // 銘柄別の配当履歴を取得（年度の降順）
    const result = await sql`
      SELECT * FROM dividends
      WHERE stock_id = ${id}
      ORDER BY year DESC, created_at DESC
    `;

    const rows = result.rows || result;
    return NextResponse.json(rows);
  } catch (error) {
    console.error('配当取得エラー:', error);
    return NextResponse.json(
      { error: '配当の取得に失敗しました' },
      { status: 500 }
    );
  }
}

