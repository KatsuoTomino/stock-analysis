import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// POST /api/stocks - 銘柄登録
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, name, purchase_price, shares, purchase_amount } = body;

    // バリデーション
    if (!code || !name || purchase_price === undefined || !shares || purchase_amount === undefined) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400 }
      );
    }

    if (typeof code !== 'string' || code.length !== 4) {
      return NextResponse.json(
        { error: '銘柄コードは4桁の文字列である必要があります' },
        { status: 400 }
      );
    }

    if (typeof purchase_price !== 'number' || purchase_price <= 0) {
      return NextResponse.json(
        { error: '取得株価は正の数である必要があります' },
        { status: 400 }
      );
    }

    if (typeof shares !== 'number' || shares <= 0 || !Number.isInteger(shares)) {
      return NextResponse.json(
        { error: '株数は正の整数である必要があります' },
        { status: 400 }
      );
    }

    if (typeof purchase_amount !== 'number' || purchase_amount <= 0) {
      return NextResponse.json(
        { error: '取得時金額は正の数である必要があります' },
        { status: 400 }
      );
    }

    // データベースに挿入
    const result = await sql`
      INSERT INTO stocks (code, name, purchase_price, shares, purchase_amount)
      VALUES (${code}, ${name}, ${purchase_price}, ${shares}, ${purchase_amount})
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('銘柄登録エラー:', error);
    return NextResponse.json(
      { error: '銘柄の登録に失敗しました' },
      { status: 500 }
    );
  }
}

// GET /api/stocks - 全銘柄取得
export async function GET() {
  try {
    const result = await sql`
      SELECT * FROM stocks
      ORDER BY created_at DESC
    `;

    return NextResponse.json(result);
  } catch (error) {
    console.error('銘柄取得エラー:', error);
    return NextResponse.json(
      { error: '銘柄の取得に失敗しました' },
      { status: 500 }
    );
  }
}

