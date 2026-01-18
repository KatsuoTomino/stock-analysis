import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getStockInfo } from '@/lib/stockInfo';

// GET /api/stocks/[id]/info - 業種と配当性向を取得
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
      SELECT code, name, industry, payout_ratio FROM stocks WHERE id = ${id}
    `;

    const rows = result.rows || result;
    if (rows.length === 0) {
      return NextResponse.json(
        { error: '銘柄が見つかりません' },
        { status: 404 }
      );
    }

    const stock = rows[0];
    
    // キャッシュされたデータがあればそれを返す
    if (stock.industry || stock.payout_ratio) {
      return NextResponse.json({
        id,
        code: stock.code,
        name: stock.name,
        industry: stock.industry,
        payoutRatio: stock.payout_ratio ? parseFloat(stock.payout_ratio) : null,
        cached: true,
      });
    }

    // 外部ソースから取得
    const info = await getStockInfo(stock.code);

    // データベースに保存
    if (info.industry || info.payoutRatio) {
      await sql`
        UPDATE stocks
        SET 
          industry = ${info.industry},
          payout_ratio = ${info.payoutRatio},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `;
    }

    return NextResponse.json({
      id,
      code: stock.code,
      name: stock.name,
      industry: info.industry,
      payoutRatio: info.payoutRatio,
      cached: false,
    });
  } catch (error) {
    console.error('株式情報取得APIエラー:', error);
    return NextResponse.json(
      { error: '株式情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// PUT /api/stocks/[id]/info - 業種と配当性向を更新（外部ソースから再取得）
export async function PUT(
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

    // 外部ソースから取得
    const info = await getStockInfo(stock.code);

    // データベースに保存
    await sql`
      UPDATE stocks
      SET 
        industry = ${info.industry},
        payout_ratio = ${info.payoutRatio},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `;

    return NextResponse.json({
      id,
      code: stock.code,
      name: stock.name,
      industry: info.industry,
      payoutRatio: info.payoutRatio,
    });
  } catch (error) {
    console.error('株式情報更新APIエラー:', error);
    return NextResponse.json(
      { error: '株式情報の更新に失敗しました' },
      { status: 500 }
    );
  }
}
