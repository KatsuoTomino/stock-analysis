import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getFinancialMetrics } from '@/lib/financials';

type Params = Promise<{ id: string }>;

/**
 * GET /api/stocks/[id]/financials
 * 銘柄の財務指標を取得（Yahoo Finance → みんかぶ の順でフォールバック）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { id } = await params;
    const stockId = parseInt(id);

    if (isNaN(stockId)) {
      return NextResponse.json(
        { error: '無効な銘柄IDです' },
        { status: 400 }
      );
    }

    // 銘柄情報を取得
    const stockResult = await sql`
      SELECT id, code, name FROM stocks WHERE id = ${stockId}
    `;

    const stocks = stockResult.rows || stockResult;

    if (stocks.length === 0) {
      return NextResponse.json(
        { error: '銘柄が見つかりません' },
        { status: 404 }
      );
    }

    const stock = stocks[0];

    // Yahoo Finance / みんかぶ から財務指標を取得
    const metrics = await getFinancialMetrics(stock.code);

    if (!metrics) {
      return NextResponse.json({
        success: false,
        stockId: stock.id,
        code: stock.code,
        name: stock.name,
        message: '財務指標を取得できませんでした',
        financials: null,
      });
    }

    return NextResponse.json({
      success: true,
      stockId: stock.id,
      code: stock.code,
      name: stock.name,
      source: metrics.source,
      financials: {
        // 配当性向（%）
        dividendPayoutRatio: metrics.dividendPayoutRatio?.toFixed(2) ?? null,
        // 配当利回り（%）
        dividendYield: metrics.dividendYield?.toFixed(2) ?? null,
        // 自己資本比率（%）
        equityRatio: metrics.equityRatio?.toFixed(2) ?? null,
        // ROE（%）
        returnOnEquity: metrics.roe?.toFixed(2) ?? null,
        // PER（倍）
        priceToEarningsRatio: metrics.per?.toFixed(2) ?? null,
        // PBR（倍）
        priceToBookRatio: metrics.pbr?.toFixed(2) ?? null,
        // EPS（円）
        eps: metrics.eps?.toFixed(2) ?? null,
        // BPS（円）
        bps: metrics.bps?.toFixed(2) ?? null,
      },
    });
  } catch (error) {
    console.error('[財務指標API] エラー:', error);
    return NextResponse.json(
      { 
        error: '財務指標の取得に失敗しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

