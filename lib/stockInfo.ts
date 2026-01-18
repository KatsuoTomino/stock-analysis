/**
 * 株式の業種・配当性向などの情報を取得する関数
 */

export interface StockInfo {
  industry: string | null;      // 業種
  payoutRatio: number | null;   // 配当性向（%）
}

/**
 * Kabutanから業種と配当性向を取得
 * @param code 銘柄コード（4桁の数字、例: "7203"）
 * @returns 業種と配当性向
 */
export async function getStockInfoFromKabutan(code: string): Promise<StockInfo> {
  const result: StockInfo = {
    industry: null,
    payoutRatio: null,
  };

  try {
    // 銘柄コードのバリデーション
    if (!/^\d{4}$/.test(code)) {
      throw new Error('無効な銘柄コードです');
    }

    // Kabutanの銘柄詳細ページを取得
    const url = `https://kabutan.jp/stock/?code=${code}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Kabutan エラー: ${response.status}`);
    }

    const html = await response.text();

    // 業種を取得（<th>業種</th>の後の<td>タグの内容）
    const industryMatch = html.match(/<th[^>]*>業種<\/th>\s*<td[^>]*>([^<]+)<\/td>/i);
    if (industryMatch) {
      result.industry = industryMatch[1].trim();
    }

    // 配当性向を取得（配当性向の数値を探す）
    // Kabutanでは「配当性向」の後に数値がある
    const payoutMatch = html.match(/配当性向[^0-9]*?(\d+(?:\.\d+)?)\s*%/i);
    if (payoutMatch) {
      result.payoutRatio = parseFloat(payoutMatch[1]);
    }

    console.log(`[Kabutan] 取得成功 (${code}):`, result);
  } catch (error) {
    console.error(`Kabutan取得エラー (${code}):`, error);
  }

  return result;
}

/**
 * みんかぶから業種と配当性向を取得（バックアップ）
 * @param code 銘柄コード（4桁の数字、例: "7203"）
 * @returns 業種と配当性向
 */
export async function getStockInfoFromMinkabu(code: string): Promise<StockInfo> {
  const result: StockInfo = {
    industry: null,
    payoutRatio: null,
  };

  try {
    // 銘柄コードのバリデーション
    if (!/^\d{4}$/.test(code)) {
      throw new Error('無効な銘柄コードです');
    }

    // みんかぶの銘柄詳細ページを取得
    const url = `https://minkabu.jp/stock/${code}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`みんかぶ エラー: ${response.status}`);
    }

    const html = await response.text();

    // 業種を取得
    const industryMatch = html.match(/業種[^<]*<[^>]+>([^<]+)</i);
    if (industryMatch) {
      result.industry = industryMatch[1].trim();
    }

    // 配当性向を取得
    const payoutMatch = html.match(/配当性向[^0-9]*?(\d+(?:\.\d+)?)\s*%/i);
    if (payoutMatch) {
      result.payoutRatio = parseFloat(payoutMatch[1]);
    }

    console.log(`[みんかぶ] 取得成功 (${code}):`, result);
  } catch (error) {
    console.error(`みんかぶ取得エラー (${code}):`, error);
  }

  return result;
}

/**
 * 株式情報を取得（複数ソースからフォールバック）
 * @param code 銘柄コード（4桁の数字、例: "7203"）
 * @returns 業種と配当性向
 */
export async function getStockInfo(code: string): Promise<StockInfo> {
  // まずKabutanから取得を試みる
  let result = await getStockInfoFromKabutan(code);
  
  // Kabutanから取得できなかった項目をみんかぶから補完
  if (!result.industry || !result.payoutRatio) {
    const minkabuResult = await getStockInfoFromMinkabu(code);
    
    if (!result.industry && minkabuResult.industry) {
      result.industry = minkabuResult.industry;
    }
    if (!result.payoutRatio && minkabuResult.payoutRatio) {
      result.payoutRatio = minkabuResult.payoutRatio;
    }
  }
  
  return result;
}
