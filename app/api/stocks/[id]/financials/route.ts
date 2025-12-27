import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getFinancialRatios, getAllFinancialData } from '@/lib/fmp';

type Params = Promise<{ id: string }>;

/**
 * GET /api/stocks/[id]/financials
 * 銘柄の財務指標を取得
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

    // FMP APIから財務指標を取得
    const { ratios, profile, keyMetrics } = await getAllFinancialData(stock.code);

    return NextResponse.json({
      success: true,
      stockId: stock.id,
      code: stock.code,
      name: stock.name,
      financials: {
        // 配当性向（%表示）
        dividendPayoutRatio: ratios?.dividendPayoutRatio 
          ? (ratios.dividendPayoutRatio * 100).toFixed(2) 
          : null,
        // 配当利回り（%表示）
        dividendYield: ratios?.dividendYield 
          ? (ratios.dividendYield * 100).toFixed(2) 
          : null,
        // 自己資本比率（%表示）
        equityRatio: ratios?.equityRatio 
          ? ratios.equityRatio.toFixed(2) 
          : null,
        // 負債資本比率
        debtEquityRatio: ratios?.debtEquityRatio 
          ? ratios.debtEquityRatio.toFixed(2) 
          : null,
        // ROE（%表示）
        returnOnEquity: ratios?.returnOnEquity 
          ? (ratios.returnOnEquity * 100).toFixed(2) 
          : null,
        // PER
        priceToEarningsRatio: ratios?.priceToEarningsRatio 
          ? ratios.priceToEarningsRatio.toFixed(2) 
          : null,
        // PBR
        priceToBookRatio: ratios?.priceToBookRatio 
          ? ratios.priceToBookRatio.toFixed(2) 
          : null,
      },
      profile: profile ? {
        sector: profile.sector,
        industry: profile.industry,
        lastDividend: profile.lastDividend,
        marketCap: profile.mktCap,
      } : null,
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

