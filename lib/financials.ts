/**
 * 財務指標取得ライブラリ
 * Yahoo Finance Japan と みんかぶ から財務指標を取得
 */

// 財務指標の型定義
export interface FinancialMetrics {
  dividendPayoutRatio: number | null;  // 配当性向 (%)
  dividendYield: number | null;        // 配当利回り (%)
  equityRatio: number | null;          // 自己資本比率 (%)
  per: number | null;                  // PER (倍)
  pbr: number | null;                  // PBR (倍)
  roe: number | null;                  // ROE (%)
  eps: number | null;                  // EPS (円)
  bps: number | null;                  // BPS (円)
  source: 'yahoo' | 'minkabu' | null;
}

/**
 * Yahoo Finance Japan から財務指標を取得
 */
async function getFinancialsFromYahoo(code: string): Promise<FinancialMetrics | null> {
  try {
    // Yahoo Finance Japan の株式詳細ページ
    const url = `https://finance.yahoo.co.jp/quote/${code}.T`;
    console.log(`[Yahoo Finance] 財務指標取得: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
      },
    });

    if (!response.ok) {
      console.error(`[Yahoo Finance] HTTPエラー: ${response.status}`);
      return null;
    }

    const html = await response.text();
    
    // 参考指標セクションから値を抽出
    const metrics: FinancialMetrics = {
      dividendPayoutRatio: null,
      dividendYield: null,
      equityRatio: null,
      per: null,
      pbr: null,
      roe: null,
      eps: null,
      bps: null,
      source: 'yahoo',
    };

    // 配当利回り
    const dividendYieldMatch = html.match(/配当利回り[（(]会社予想[）)][^>]*>[\s\S]*?<[^>]+>([0-9.]+)%/);
    if (dividendYieldMatch) {
      metrics.dividendYield = parseFloat(dividendYieldMatch[1]);
    }

    // PER
    const perMatch = html.match(/PER[（(]会社予想[）)][^>]*>[\s\S]*?<[^>]+>([0-9.]+)倍/);
    if (perMatch) {
      metrics.per = parseFloat(perMatch[1]);
    }

    // PBR
    const pbrMatch = html.match(/PBR[（(]実績[）)][^>]*>[\s\S]*?<[^>]+>([0-9.]+)倍/);
    if (pbrMatch) {
      metrics.pbr = parseFloat(pbrMatch[1]);
    }

    // EPS
    const epsMatch = html.match(/EPS[（(]会社予想[）)][^>]*>[\s\S]*?<[^>]+>([0-9,.]+)円/);
    if (epsMatch) {
      metrics.eps = parseFloat(epsMatch[1].replace(/,/g, ''));
    }

    // BPS
    const bpsMatch = html.match(/BPS[（(]実績[）)][^>]*>[\s\S]*?<[^>]+>([0-9,.]+)円/);
    if (bpsMatch) {
      metrics.bps = parseFloat(bpsMatch[1].replace(/,/g, ''));
    }

    // 値が取得できたかチェック
    const hasData = Object.values(metrics).some(v => v !== null && v !== 'yahoo');
    if (!hasData) {
      console.warn('[Yahoo Finance] データを抽出できませんでした');
      return null;
    }

    console.log('[Yahoo Finance] 取得成功:', metrics);
    return metrics;
  } catch (error) {
    console.error('[Yahoo Finance] エラー:', error);
    return null;
  }
}

/**
 * みんかぶから財務指標を取得
 */
async function getFinancialsFromMinkabu(code: string): Promise<FinancialMetrics | null> {
  try {
    // みんかぶの財務情報ページ
    const url = `https://minkabu.jp/stock/${code}/fundamental`;
    console.log(`[みんかぶ] 財務指標取得: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
      },
    });

    if (!response.ok) {
      console.error(`[みんかぶ] HTTPエラー: ${response.status}`);
      return null;
    }

    const html = await response.text();
    
    const metrics: FinancialMetrics = {
      dividendPayoutRatio: null,
      dividendYield: null,
      equityRatio: null,
      per: null,
      pbr: null,
      roe: null,
      eps: null,
      bps: null,
      source: 'minkabu',
    };

    // 配当性向を抽出
    const payoutMatch = html.match(/配当性向[\s\S]*?([0-9.]+)\s*%/);
    if (payoutMatch) {
      metrics.dividendPayoutRatio = parseFloat(payoutMatch[1]);
    }

    // 配当利回りを抽出
    const dividendYieldMatch = html.match(/配当利回り[\s\S]*?([0-9.]+)\s*%/);
    if (dividendYieldMatch) {
      metrics.dividendYield = parseFloat(dividendYieldMatch[1]);
    }

    // 自己資本比率を抽出
    const equityMatch = html.match(/自己資本比率[\s\S]*?([0-9.]+)\s*%/);
    if (equityMatch) {
      metrics.equityRatio = parseFloat(equityMatch[1]);
    }

    // PERを抽出
    const perMatch = html.match(/PER[\s\S]*?([0-9.]+)\s*倍/);
    if (perMatch) {
      metrics.per = parseFloat(perMatch[1]);
    }

    // PBRを抽出
    const pbrMatch = html.match(/PBR[\s\S]*?([0-9.]+)\s*倍/);
    if (pbrMatch) {
      metrics.pbr = parseFloat(pbrMatch[1]);
    }

    // ROEを抽出
    const roeMatch = html.match(/ROE[\s\S]*?([0-9.]+)\s*%/);
    if (roeMatch) {
      metrics.roe = parseFloat(roeMatch[1]);
    }

    // EPSを抽出
    const epsMatch = html.match(/EPS[\s\S]*?([0-9,.]+)\s*円/);
    if (epsMatch) {
      metrics.eps = parseFloat(epsMatch[1].replace(/,/g, ''));
    }

    // BPSを抽出
    const bpsMatch = html.match(/BPS[\s\S]*?([0-9,.]+)\s*円/);
    if (bpsMatch) {
      metrics.bps = parseFloat(bpsMatch[1].replace(/,/g, ''));
    }

    // 値が取得できたかチェック
    const hasData = Object.values(metrics).some(v => v !== null && v !== 'minkabu');
    if (!hasData) {
      console.warn('[みんかぶ] データを抽出できませんでした');
      return null;
    }

    console.log('[みんかぶ] 取得成功:', metrics);
    return metrics;
  } catch (error) {
    console.error('[みんかぶ] エラー:', error);
    return null;
  }
}

/**
 * 財務指標を取得（Yahoo Finance → みんかぶ の順でフォールバック）
 */
export async function getFinancialMetrics(code: string): Promise<FinancialMetrics | null> {
  console.log(`[財務指標] 取得開始: ${code}`);
  
  // まずYahoo Finance Japanを試す
  const yahooData = await getFinancialsFromYahoo(code);
  if (yahooData) {
    return yahooData;
  }
  
  console.log('[財務指標] Yahoo Financeから取得できず、みんかぶを試行');
  
  // Yahoo Financeで取得できなければみんかぶを試す
  const minkabuData = await getFinancialsFromMinkabu(code);
  if (minkabuData) {
    return minkabuData;
  }
  
  console.warn('[財務指標] すべてのソースから取得できませんでした');
  return null;
}

