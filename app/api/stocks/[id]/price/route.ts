import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getStockPrice } from '@/lib/yahooFinance';

// GET /api/stocks/[id]/price - 現在株価取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: '無効なIDです' },
        { status: 400 }
      );
    }

    // データベースから銘柄情報を取得
    const result = await sql`
      SELECT code, name FROM stocks WHERE id = ${id}
    `;

    const rows = result.rows || result;
    if (rows.length === 0) {
      return NextResponse.json(
        { error: '銘柄が見つかりません' },
        { status: 404 }
      );
    }

    const stock = rows[0];
    const code = stock.code;

    // Yahoo Finance APIから株価を取得
    const price = await getStockPrice(code);

    if (price === null) {
      return NextResponse.json(
        { error: '株価の取得に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      code,
      name: stock.name,
      price,
    });
  } catch (error) {
    console.error('株価取得APIエラー:', error);
    return NextResponse.json(
      { error: '株価の取得に失敗しました' },
      { status: 500 }
    );
  }
}

