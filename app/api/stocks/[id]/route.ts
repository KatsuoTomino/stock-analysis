import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// PUT /api/stocks/[id] - 銘柄更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: '無効なIDです' },
        { status: 400 }
      );
    }

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

    // データベースを更新
    const result = await sql`
      UPDATE stocks
      SET 
        code = ${code},
        name = ${name},
        purchase_price = ${purchase_price},
        shares = ${shares},
        purchase_amount = ${purchase_amount},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: '銘柄が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('銘柄更新エラー:', error);
    return NextResponse.json(
      { error: '銘柄の更新に失敗しました' },
      { status: 500 }
    );
  }
}

// DELETE /api/stocks/[id] - 銘柄削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: '無効なIDです' },
        { status: 400 }
      );
    }

    // データベースから削除
    const result = await sql`
      DELETE FROM stocks
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: '銘柄が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: '銘柄を削除しました', deleted: result[0] });
  } catch (error) {
    console.error('銘柄削除エラー:', error);
    return NextResponse.json(
      { error: '銘柄の削除に失敗しました' },
      { status: 500 }
    );
  }
}

