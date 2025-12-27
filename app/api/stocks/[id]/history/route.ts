import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getStockHistory } from '@/lib/yahooFinance';

// GET /api/stocks/[id]/history - 過去株価データ取得
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

    // クエリパラメータから期間を取得
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') || '1m') as '1m' | '3m' | '6m' | '1y';

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

    // Yahoo Finance APIから過去株価データを取得
    const history = await getStockHistory(code, period);

    if (history === null) {
      return NextResponse.json(
        { error: '過去株価データの取得に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      code,
      name: stock.name,
      period,
      data: history,
    });
  } catch (error) {
    console.error('過去株価取得APIエラー:', error);
    return NextResponse.json(
      { error: '過去株価データの取得に失敗しました' },
      { status: 500 }
    );
  }
}

