/**
 * Yahoo Finance API から株価を取得する関数
 * エンドポイント: https://query1.finance.yahoo.com/v8/finance/chart/{銘柄コード}.T
 */

interface YahooFinanceResponse {
  chart: {
    result: Array<{
      meta: {
        regularMarketPrice: number;
        previousClose: number;
        currency: string;
        symbol: string;
        longName?: string;
        shortName?: string;
      };
      timestamp?: number[];
      indicators?: {
        quote: Array<{
          close?: number[];
          open?: number[];
          high?: number[];
          low?: number[];
          volume?: number[];
        }>;
      };
    }>;
    error: null | {
      code: string;
      description: string;
    };
  };
}


export interface StockHistoryData {
  date: string;
  price: number;
}

// Yahoo Finance APIのレスポンス構造
// 配当情報は { raw: number, fmt: string } の形式で返されることがある
interface YahooFinanceValue {
  raw?: number;
  fmt?: string;
}

interface YahooQuoteSummaryResponse {
  quoteSummary: {
    result: Array<{
      summaryDetail?: {
        dividendRate?: number | YahooFinanceValue;
        dividendYield?: number | YahooFinanceValue;
        trailingAnnualDividendRate?: number | YahooFinanceValue;
        trailingAnnualDividendYield?: number | YahooFinanceValue;
        forwardAnnualDividendRate?: number | YahooFinanceValue;
        forwardAnnualDividendYield?: number | YahooFinanceValue;
      };
      defaultKeyStatistics?: {
        trailingAnnualDividendRate?: number | YahooFinanceValue;
        trailingAnnualDividendYield?: number | YahooFinanceValue;
        forwardAnnualDividendRate?: number | YahooFinanceValue;
        forwardAnnualDividendYield?: number | YahooFinanceValue;
        dividendRate?: number | YahooFinanceValue;
        dividendYield?: number | YahooFinanceValue;
      };
    }>;
    error?: {
      code: string;
      description: string;
    };
  };
}

/**
 * 日本株式の銘柄名を取得
 * @param code 銘柄コード（4桁の数字、例: "7203"）
 * @returns 銘柄名、取得できない場合はnull
 */
export async function getStockName(code: string): Promise<string | null> {
  try {
    // 銘柄コードのバリデーション
    if (!/^\d{4}$/.test(code)) {
      throw new Error('無効な銘柄コードです');
    }

    // Yahoo Finance API エンドポイント
    const symbol = `${code}.T`;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance API エラー: ${response.status}`);
    }

    const data: YahooFinanceResponse = await response.json();

    // エラーチェック
    if (data.chart.error) {
      throw new Error(`Yahoo Finance API エラー: ${data.chart.error.description}`);
    }

    // 結果が空の場合
    if (!data.chart.result || data.chart.result.length === 0) {
      throw new Error('銘柄が見つかりません');
    }

    const result = data.chart.result[0];
    const name = result.meta.longName || result.meta.shortName || result.meta.symbol.replace('.T', '');

    return name;
  } catch (error) {
    console.error(`銘柄名取得エラー (${code}):`, error);
    return null;
  }
}

/**
 * 日本株式の現在株価を取得
 * @param code 銘柄コード（4桁の数字、例: "7203"）
 * @returns 現在株価（円）、取得できない場合はnull
 */
export async function getStockPrice(code: string): Promise<number | null> {
  try {
    // 銘柄コードのバリデーション
    if (!/^\d{4}$/.test(code)) {
      throw new Error('無効な銘柄コードです');
    }

    // Yahoo Finance API エンドポイント
    // 日本株式の場合は .T サフィックスを付ける
    const symbol = `${code}.T`;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      // キャッシュを無効化（最新の株価を取得）
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance API エラー: ${response.status}`);
    }

    const data: YahooFinanceResponse = await response.json();

    // エラーチェック
    if (data.chart.error) {
      throw new Error(`Yahoo Finance API エラー: ${data.chart.error.description}`);
    }

    // 結果が空の場合
    if (!data.chart.result || data.chart.result.length === 0) {
      throw new Error('銘柄が見つかりません');
    }

    const result = data.chart.result[0];
    const price = result.meta.regularMarketPrice;

    if (!price || price <= 0) {
      throw new Error('有効な株価データが取得できませんでした');
    }

    return price;
  } catch (error) {
    console.error(`株価取得エラー (${code}):`, error);
    return null;
  }
}

/**
 * 複数の銘柄の株価を一括取得（レート制限対策のため順次実行）
 * @param codes 銘柄コードの配列
 * @returns 銘柄コードをキーとした株価のマップ
 */
export async function getStockPrices(
  codes: string[]
): Promise<Record<string, number | null>> {
  const prices: Record<string, number | null> = {};

  // レート制限対策: 順次実行（必要に応じて遅延を追加）
  for (const code of codes) {
    prices[code] = await getStockPrice(code);
    // リクエスト間隔を空ける（100ms待機）
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return prices;
}

/**
 * 過去株価データを取得
 * @param code 銘柄コード（4桁の数字、例: "7203"）
 * @param period 期間（1m, 3m, 6m, 1y）
 * @returns 過去株価データの配列、取得できない場合はnull
 */
export async function getStockHistory(
  code: string,
  period: '1m' | '3m' | '6m' | '1y' = '1m'
): Promise<StockHistoryData[] | null> {
  try {
    // 銘柄コードのバリデーション
    if (!/^\d{4}$/.test(code)) {
      throw new Error('無効な銘柄コードです');
    }

    // 期間をrangeパラメータに変換
    const rangeMap: Record<string, string> = {
      '1m': '1mo',
      '3m': '3mo',
      '6m': '6mo',
      '1y': '1y',
    };
    const range = rangeMap[period] || '1mo';

    // Yahoo Finance API エンドポイント
    const symbol = `${code}.T`;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${range}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance API エラー: ${response.status}`);
    }

    const data: YahooFinanceResponse = await response.json();

    // エラーチェック
    if (data.chart.error) {
      throw new Error(`Yahoo Finance API エラー: ${data.chart.error.description}`);
    }

    // 結果が空の場合
    if (!data.chart.result || data.chart.result.length === 0) {
      throw new Error('銘柄が見つかりません');
    }

    const result = data.chart.result[0];
    
    // タイムスタンプと価格データを取得
    if (!result.timestamp || !result.indicators?.quote?.[0]?.close) {
      throw new Error('株価データが取得できませんでした');
    }

    const timestamps = result.timestamp;
    const closes = result.indicators.quote[0].close;

    // データを結合して返す
    const historyData: StockHistoryData[] = timestamps
      .map((timestamp, index) => {
        const price = closes[index];
        if (!price || price <= 0) return null;
        
        return {
          date: new Date(timestamp * 1000).toISOString().split('T')[0],
          price: price,
        };
      })
      .filter((item): item is StockHistoryData => item !== null);

    return historyData;
  } catch (error) {
    console.error(`過去株価取得エラー (${code}, ${period}):`, error);
    return null;
  }
}

/**
 * 一株配当（年間）を取得
 * @param code 銘柄コード（4桁の数字、例: "7203"）
 * @returns 一株配当（年間、円）、取得できない場合はnull
 * 注意: この値は一株あたりの年間配当金額です。配当利回りを計算するには、この値を株価で割って100を掛けます。
 */
export async function getDividendAmount(code: string): Promise<number | null> {
  try {
    // 銘柄コードのバリデーション
    if (!/^\d{4}$/.test(code)) {
      throw new Error('無効な銘柄コードです');
    }

    // Yahoo Finance API エンドポイント（quoteSummary）
    // v10エンドポイントは認証が必要な場合があるため、v8エンドポイントも試す
    const symbol = `${code}.T`;
    
    // まずv8エンドポイントを試す（認証不要の可能性がある）
    let url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
    let useV10 = false;
    
    // v10エンドポイントも試す（より詳細な情報が取得できる可能性がある）
    const urlV10 = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=summaryDetail,defaultKeyStatistics`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://finance.yahoo.com/',
        'Origin': 'https://finance.yahoo.com',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`[Yahoo Finance API] エラーレスポンス (${code}):`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorText.substring(0, 500), // 最初の500文字のみ
      });
      throw new Error(`Yahoo Finance API エラー: ${response.status} ${response.statusText}`);
    }

    const data: YahooQuoteSummaryResponse = await response.json();

    // デバッグ用: 生のレスポンスをログ出力（テスト環境でのみ詳細出力）
    if (process.env.NODE_ENV === 'test' || process.env.DEBUG === 'true') {
      console.log(`[Yahoo Finance API] レスポンス (${code}):`, JSON.stringify(data, null, 2));
    }

    // エラーチェック
    if (data.quoteSummary.error) {
      console.error(`[Yahoo Finance API] エラー (${code}):`, data.quoteSummary.error);
      throw new Error(`Yahoo Finance API エラー: ${data.quoteSummary.error.description}`);
    }

    // 結果が空の場合
    if (!data.quoteSummary.result || data.quoteSummary.result.length === 0) {
      console.error(`[Yahoo Finance API] 結果が空 (${code})`);
      throw new Error('銘柄が見つかりません');
    }

    const result = data.quoteSummary.result[0];
    const summaryDetail = result.summaryDetail;
    const defaultKeyStatistics = result.defaultKeyStatistics;

    // デバッグ用: 取得したデータをログ出力
    console.log(`[配当情報取得] (${code}):`, {
      summaryDetail: summaryDetail ? {
        forwardAnnualDividendRate: summaryDetail.forwardAnnualDividendRate,
        dividendRate: summaryDetail.dividendRate,
        trailingAnnualDividendRate: summaryDetail.trailingAnnualDividendRate,
        forwardAnnualDividendYield: summaryDetail.forwardAnnualDividendYield,
        dividendYield: summaryDetail.dividendYield,
        trailingAnnualDividendYield: summaryDetail.trailingAnnualDividendYield,
      } : null,
      defaultKeyStatistics: defaultKeyStatistics ? {
        forwardAnnualDividendRate: defaultKeyStatistics.forwardAnnualDividendRate,
        dividendRate: defaultKeyStatistics.dividendRate,
        trailingAnnualDividendRate: defaultKeyStatistics.trailingAnnualDividendRate,
        forwardAnnualDividendYield: defaultKeyStatistics.forwardAnnualDividendYield,
        dividendYield: defaultKeyStatistics.dividendYield,
        trailingAnnualDividendYield: defaultKeyStatistics.trailingAnnualDividendYield,
      } : null,
    });

    // ヘルパー関数: Yahoo Finance APIの値を数値に変換
    const extractValue = (value: number | YahooFinanceValue | undefined): number | null => {
      if (value === undefined || value === null) return null;
      if (typeof value === 'number') return value;
      if (typeof value === 'object' && 'raw' in value) {
        return value.raw !== undefined && value.raw !== null ? value.raw : null;
      }
      return null;
    };

    // 一株配当を取得（優先順位: summaryDetail > defaultKeyStatistics）
    // forwardAnnualDividendRate, dividendRate, trailingAnnualDividendRate は一株あたりの年間配当金額
    let dividendPerShare = null;
    
    if (summaryDetail) {
      dividendPerShare = extractValue(summaryDetail.forwardAnnualDividendRate)
        || extractValue(summaryDetail.dividendRate)
        || extractValue(summaryDetail.trailingAnnualDividendRate);
    }
    
    if (!dividendPerShare || dividendPerShare <= 0) {
      if (defaultKeyStatistics) {
        dividendPerShare = extractValue(defaultKeyStatistics.forwardAnnualDividendRate)
          || extractValue(defaultKeyStatistics.dividendRate)
          || extractValue(defaultKeyStatistics.trailingAnnualDividendRate);
      }
    }

    // 一株配当が直接取得できない場合は、現在株価と配当利回りから計算
    if (!dividendPerShare || dividendPerShare <= 0) {
      const currentPrice = await getStockPrice(code);
      if (currentPrice) {
        // 予想配当利回りから一株配当を計算
        let dividendYield = extractValue(summaryDetail?.forwardAnnualDividendYield)
          || extractValue(summaryDetail?.dividendYield)
          || extractValue(summaryDetail?.trailingAnnualDividendYield);
        
        if (!dividendYield && defaultKeyStatistics) {
          dividendYield = extractValue(defaultKeyStatistics.forwardAnnualDividendYield)
            || extractValue(defaultKeyStatistics.dividendYield)
            || extractValue(defaultKeyStatistics.trailingAnnualDividendYield);
        }
        
        if (dividendYield && dividendYield > 0) {
          dividendPerShare = (dividendYield / 100) * currentPrice;
          console.log(`[一株配当計算] (${code}): 配当利回り ${dividendYield}% から ${dividendPerShare}円`);
        }
      }
    }

    if (!dividendPerShare || dividendPerShare <= 0) {
      console.log(`[一株配当取得失敗] (${code}): 配当情報が利用できません`);
      console.log(`[一株配当取得失敗] (${code}): summaryDetail=${!!summaryDetail}, defaultKeyStatistics=${!!defaultKeyStatistics}`);
      return null;
    }

    console.log(`[一株配当取得成功] (${code}): ${dividendPerShare}円`);
    return dividendPerShare;
  } catch (error) {
    console.error(`配当金額取得エラー (${code}):`, error);
    return null;
  }
}

// みんかぶからのスクレイピングは削除されました
// 配当情報は個別詳細ページで手動入力する方式に変更されました
