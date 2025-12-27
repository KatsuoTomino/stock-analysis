import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getStockName } from '@/lib/yahooFinance';

// POST /api/stocks/register - 銘柄コードから自動登録
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    // バリデーション
    if (!code || !/^\d{4}$/.test(code)) {
      return NextResponse.json(
        { error: '有効な4桁の銘柄コードを入力してください' },
        { status: 400 }
      );
    }

    // 既に登録されているか確認
    const existingCheck = await sql`
      SELECT id FROM stocks WHERE code = ${code}
    `;
    const existingRows = existingCheck.rows || existingCheck;
    if (existingRows.length > 0) {
      return NextResponse.json(
        { error: 'この銘柄は既に登録されています' },
        { status: 400 }
      );
    }

    // Yahoo Finance APIから銘柄名を取得
    const name = await getStockName(code);
    if (!name) {
      return NextResponse.json(
        { error: '銘柄名の取得に失敗しました。銘柄コードを確認してください。' },
        { status: 400 }
      );
    }

    // デフォルト値で登録（後で編集可能）
    const purchase_price = 0;
    const shares = 0;
    const purchase_amount = 0;

    const result = await sql`
      INSERT INTO stocks (code, name, purchase_price, shares, purchase_amount)
      VALUES (${code}, ${name}, ${purchase_price}, ${shares}, ${purchase_amount})
      RETURNING *
    `;

    const rows = result.rows || result;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('銘柄登録エラー:', error);
    return NextResponse.json(
      { error: '銘柄の登録に失敗しました' },
      { status: 500 }
    );
  }
}

