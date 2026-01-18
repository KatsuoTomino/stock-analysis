/**
 * 財務指標取得ライブラリ
 * 株探(Kabutan) → みんかぶ → Yahoo Finance Japan の順でフォールバック
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
  source: 'kabutan' | 'minkabu' | 'yahoo' | null;
}

/**
 * 株探（Kabutan）から財務指標を取得
 * 財務指標が見やすく整理されているため、最優先で使用
 */
async function getFinancialsFromKabutan(code: string): Promise<FinancialMetrics | null> {
  try {
    // 株探の財務ページ
    const url = `https://kabutan.jp/stock/finance?code=${code}`;
    console.log(`[株探] 財務指標取得: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
      },
    });

    if (!response.ok) {
      console.error(`[株探] HTTPエラー: ${response.status}`);
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
      source: 'kabutan',
    };

    // 配当利回りを抽出（複数のパターンを試す）
    const dividendYieldPatterns = [
      /配当利回り[^0-9]*([0-9]+\.?[0-9]*)\s*%/,
      /配当利回り[（(]会社予想[）)][^0-9]*([0-9]+\.?[0-9]*)\s*%/,
      /配当利回り[（(]実績[）)][^0-9]*([0-9]+\.?[0-9]*)\s*%/,
      /配当利回り[\s\S]*?([0-9]+\.?[0-9]*)\s*%/,
    ];
    for (const pattern of dividendYieldPatterns) {
      const match = html.match(pattern);
      if (match) {
        metrics.dividendYield = parseFloat(match[1]);
        break;
      }
    }

    // 配当性向を抽出（複数のパターンを試す）
    const payoutPatterns = [
      /配当性向[^0-9]*([0-9]+\.?[0-9]*)\s*%/,
      /配当性向[（(]会社予想[）)][^0-9]*([0-9]+\.?[0-9]*)\s*%/,
      /配当性向[（(]実績[）)][^0-9]*([0-9]+\.?[0-9]*)\s*%/,
      /配当性向[\s\S]*?([0-9]+\.?[0-9]*)\s*%/,
    ];
    for (const pattern of payoutPatterns) {
      const match = html.match(pattern);
      if (match) {
        metrics.dividendPayoutRatio = parseFloat(match[1]);
        break;
      }
    }

    // 自己資本比率を抽出（複数のパターンを試す）
    const equityPatterns = [
      /自己資本比率[^0-9]*([0-9]+\.?[0-9]*)\s*%/,
      /自己資本比率[（(]会社予想[）)][^0-9]*([0-9]+\.?[0-9]*)\s*%/,
      /自己資本比率[（(]実績[）)][^0-9]*([0-9]+\.?[0-9]*)\s*%/,
      /自己資本比率[\s\S]*?([0-9]+\.?[0-9]*)\s*%/,
    ];
    for (const pattern of equityPatterns) {
      const match = html.match(pattern);
      if (match) {
        metrics.equityRatio = parseFloat(match[1]);
        break;
      }
    }

    // PERを抽出（複数のパターンを試す）
    const perPatterns = [
      /PER[（(]会社予想[）)][^0-9]*([0-9]+\.?[0-9]*)\s*倍/,
      /PER[（(]実績[）)][^0-9]*([0-9]+\.?[0-9]*)\s*倍/,
      /PER[^0-9]*([0-9]+\.?[0-9]*)\s*倍/,
      /PER[\s\S]*?([0-9]+\.?[0-9]*)\s*倍/,
    ];
    for (const pattern of perPatterns) {
      const match = html.match(pattern);
      if (match) {
        metrics.per = parseFloat(match[1]);
        break;
      }
    }

    // PBRを抽出（複数のパターンを試す）
    const pbrPatterns = [
      /PBR[（(]会社予想[）)][^0-9]*([0-9]+\.?[0-9]*)\s*倍/,
      /PBR[（(]実績[）)][^0-9]*([0-9]+\.?[0-9]*)\s*倍/,
      /PBR[^0-9]*([0-9]+\.?[0-9]*)\s*倍/,
      /PBR[\s\S]*?([0-9]+\.?[0-9]*)\s*倍/,
    ];
    for (const pattern of pbrPatterns) {
      const match = html.match(pattern);
      if (match) {
        metrics.pbr = parseFloat(match[1]);
        break;
      }
    }

    // ROEを抽出（複数のパターンを試す）
    const roePatterns = [
      /ROE[（(]会社予想[）)][^0-9]*([0-9]+\.?[0-9]*)\s*%/,
      /ROE[（(]実績[）)][^0-9]*([0-9]+\.?[0-9]*)\s*%/,
      /ROE[^0-9]*([0-9]+\.?[0-9]*)\s*%/,
      /ROE[\s\S]*?([0-9]+\.?[0-9]*)\s*%/,
    ];
    for (const pattern of roePatterns) {
      const match = html.match(pattern);
      if (match) {
        metrics.roe = parseFloat(match[1]);
        break;
      }
    }

    // EPSを抽出（複数のパターンを試す）
    const epsPatterns = [
      /EPS[（(]会社予想[）)][^0-9,]*([0-9,]+\.?[0-9]*)\s*円/,
      /EPS[（(]実績[）)][^0-9,]*([0-9,]+\.?[0-9]*)\s*円/,
      /EPS[^0-9,]*([0-9,]+\.?[0-9]*)\s*円/,
      /EPS[\s\S]*?([0-9,]+\.?[0-9]*)\s*円/,
    ];
    for (const pattern of epsPatterns) {
      const match = html.match(pattern);
      if (match) {
        metrics.eps = parseFloat(match[1].replace(/,/g, ''));
        break;
      }
    }

    // BPSを抽出（複数のパターンを試す）
    const bpsPatterns = [
      /BPS[（(]会社予想[）)][^0-9,]*([0-9,]+\.?[0-9]*)\s*円/,
      /BPS[（(]実績[）)][^0-9,]*([0-9,]+\.?[0-9]*)\s*円/,
      /BPS[^0-9,]*([0-9,]+\.?[0-9]*)\s*円/,
      /BPS[\s\S]*?([0-9,]+\.?[0-9]*)\s*円/,
    ];
    for (const pattern of bpsPatterns) {
      const match = html.match(pattern);
      if (match) {
        metrics.bps = parseFloat(match[1].replace(/,/g, ''));
        break;
      }
    }

    // 値が取得できたかチェック（sourceを除く）
    const hasData = metrics.dividendPayoutRatio !== null || 
                    metrics.dividendYield !== null || 
                    metrics.equityRatio !== null || 
                    metrics.per !== null || 
                    metrics.pbr !== null || 
                    metrics.roe !== null || 
                    metrics.eps !== null || 
                    metrics.bps !== null;
    
    if (!hasData) {
      console.warn('[株探] データを抽出できませんでした');
      return null;
    }

    console.log('[株探] 取得成功:', JSON.stringify(metrics, null, 2));
    return metrics;
  } catch (error) {
    console.error('[株探] エラー:', error);
    return null;
  }
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

    // 値が取得できたかチェック（sourceを除く）
    const hasData = metrics.dividendPayoutRatio !== null || 
                    metrics.dividendYield !== null || 
                    metrics.equityRatio !== null || 
                    metrics.per !== null || 
                    metrics.pbr !== null || 
                    metrics.roe !== null || 
                    metrics.eps !== null || 
                    metrics.bps !== null;
    
    if (!hasData) {
      console.warn('[Yahoo Finance] データを抽出できませんでした');
      return null;
    }

    console.log('[Yahoo Finance] 取得成功:', JSON.stringify(metrics, null, 2));
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

    // 配当性向を抽出（複数のパターンを試す）
    const payoutPatterns = [
      /配当性向[^0-9]*([0-9]+\.?[0-9]*)\s*%/,
      /配当性向[（(]会社予想[）)][^0-9]*([0-9]+\.?[0-9]*)\s*%/,
      /配当性向[（(]実績[）)][^0-9]*([0-9]+\.?[0-9]*)\s*%/,
      /配当性向[\s\S]*?([0-9]+\.?[0-9]*)\s*%/,
    ];
    for (const pattern of payoutPatterns) {
      const match = html.match(pattern);
      if (match) {
        metrics.dividendPayoutRatio = parseFloat(match[1]);
        break;
      }
    }

    // 配当利回りを抽出（複数のパターンを試す）
    const dividendYieldPatterns = [
      /配当利回り[^0-9]*([0-9]+\.?[0-9]*)\s*%/,
      /配当利回り[（(]会社予想[）)][^0-9]*([0-9]+\.?[0-9]*)\s*%/,
      /配当利回り[（(]実績[）)][^0-9]*([0-9]+\.?[0-9]*)\s*%/,
      /配当利回り[\s\S]*?([0-9]+\.?[0-9]*)\s*%/,
    ];
    for (const pattern of dividendYieldPatterns) {
      const match = html.match(pattern);
      if (match) {
        metrics.dividendYield = parseFloat(match[1]);
        break;
      }
    }

    // 自己資本比率を抽出（複数のパターンを試す）
    const equityPatterns = [
      /自己資本比率[^0-9]*([0-9]+\.?[0-9]*)\s*%/,
      /自己資本比率[（(]会社予想[）)][^0-9]*([0-9]+\.?[0-9]*)\s*%/,
      /自己資本比率[（(]実績[）)][^0-9]*([0-9]+\.?[0-9]*)\s*%/,
      /自己資本比率[\s\S]*?([0-9]+\.?[0-9]*)\s*%/,
    ];
    for (const pattern of equityPatterns) {
      const match = html.match(pattern);
      if (match) {
        metrics.equityRatio = parseFloat(match[1]);
        break;
      }
    }

    // PERを抽出（複数のパターンを試す）
    const perPatterns = [
      /PER[（(]会社予想[）)][^0-9]*([0-9]+\.?[0-9]*)\s*倍/,
      /PER[（(]実績[）)][^0-9]*([0-9]+\.?[0-9]*)\s*倍/,
      /PER[^0-9]*([0-9]+\.?[0-9]*)\s*倍/,
      /PER[\s\S]*?([0-9]+\.?[0-9]*)\s*倍/,
    ];
    for (const pattern of perPatterns) {
      const match = html.match(pattern);
      if (match) {
        metrics.per = parseFloat(match[1]);
        break;
      }
    }

    // PBRを抽出（複数のパターンを試す）
    const pbrPatterns = [
      /PBR[（(]会社予想[）)][^0-9]*([0-9]+\.?[0-9]*)\s*倍/,
      /PBR[（(]実績[）)][^0-9]*([0-9]+\.?[0-9]*)\s*倍/,
      /PBR[^0-9]*([0-9]+\.?[0-9]*)\s*倍/,
      /PBR[\s\S]*?([0-9]+\.?[0-9]*)\s*倍/,
    ];
    for (const pattern of pbrPatterns) {
      const match = html.match(pattern);
      if (match) {
        metrics.pbr = parseFloat(match[1]);
        break;
      }
    }

    // ROEを抽出（複数のパターンを試す）
    const roePatterns = [
      /ROE[（(]会社予想[）)][^0-9]*([0-9]+\.?[0-9]*)\s*%/,
      /ROE[（(]実績[）)][^0-9]*([0-9]+\.?[0-9]*)\s*%/,
      /ROE[^0-9]*([0-9]+\.?[0-9]*)\s*%/,
      /ROE[\s\S]*?([0-9]+\.?[0-9]*)\s*%/,
    ];
    for (const pattern of roePatterns) {
      const match = html.match(pattern);
      if (match) {
        metrics.roe = parseFloat(match[1]);
        break;
      }
    }

    // EPSを抽出（複数のパターンを試す）
    const epsPatterns = [
      /EPS[（(]会社予想[）)][^0-9,]*([0-9,]+\.?[0-9]*)\s*円/,
      /EPS[（(]実績[）)][^0-9,]*([0-9,]+\.?[0-9]*)\s*円/,
      /EPS[^0-9,]*([0-9,]+\.?[0-9]*)\s*円/,
      /EPS[\s\S]*?([0-9,]+\.?[0-9]*)\s*円/,
    ];
    for (const pattern of epsPatterns) {
      const match = html.match(pattern);
      if (match) {
        metrics.eps = parseFloat(match[1].replace(/,/g, ''));
        break;
      }
    }

    // BPSを抽出（複数のパターンを試す）
    const bpsPatterns = [
      /BPS[（(]会社予想[）)][^0-9,]*([0-9,]+\.?[0-9]*)\s*円/,
      /BPS[（(]実績[）)][^0-9,]*([0-9,]+\.?[0-9]*)\s*円/,
      /BPS[^0-9,]*([0-9,]+\.?[0-9]*)\s*円/,
      /BPS[\s\S]*?([0-9,]+\.?[0-9]*)\s*円/,
    ];
    for (const pattern of bpsPatterns) {
      const match = html.match(pattern);
      if (match) {
        metrics.bps = parseFloat(match[1].replace(/,/g, ''));
        break;
      }
    }

    // 値が取得できたかチェック（sourceを除く）
    const hasData = metrics.dividendPayoutRatio !== null || 
                    metrics.dividendYield !== null || 
                    metrics.equityRatio !== null || 
                    metrics.per !== null || 
                    metrics.pbr !== null || 
                    metrics.roe !== null || 
                    metrics.eps !== null || 
                    metrics.bps !== null;
    
    if (!hasData) {
      console.warn('[みんかぶ] データを抽出できませんでした');
      return null;
    }

    console.log('[みんかぶ] 取得成功:', JSON.stringify(metrics, null, 2));
    return metrics;
  } catch (error) {
    console.error('[みんかぶ] エラー:', error);
    return null;
  }
}

/**
 * 財務指標を取得（株探 → みんかぶ → Yahoo Finance の順でフォールバック）
 */
export async function getFinancialMetrics(code: string): Promise<FinancialMetrics | null> {
  console.log(`[財務指標] 取得開始: ${code}`);
  
  // まず株探（Kabutan）を試す（最も信頼性が高い）
  const kabutanData = await getFinancialsFromKabutan(code);
  if (kabutanData) {
    return kabutanData;
  }
  
  console.log('[財務指標] 株探から取得できず、みんかぶを試行');
  
  // 株探で取得できなければみんかぶを試す
  const minkabuData = await getFinancialsFromMinkabu(code);
  if (minkabuData) {
    return minkabuData;
  }
  
  console.log('[財務指標] みんかぶから取得できず、Yahoo Financeを試行');
  
  // みんかぶで取得できなければYahoo Financeを試す
  const yahooData = await getFinancialsFromYahoo(code);
  if (yahooData) {
    return yahooData;
  }
  
  console.warn('[財務指標] すべてのソースから取得できませんでした');
  return null;
}

