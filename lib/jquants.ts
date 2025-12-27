/**
 * J-Quants API クライアント
 * リフレッシュトークンからIDトークンを取得し、株価・配当情報を取得
 */

const API_BASE_URL = 'https://api.jquants.com/v1';

// IDトークンのキャッシュ（24時間有効）
let cachedIdToken: string | null = null;
let tokenExpiryTime: number = 0;

/**
 * リフレッシュトークンからIDトークンを取得
 * @returns IDトークン、取得できない場合はnull
 */
async function getIdToken(): Promise<string | null> {
  try {
    const refreshToken = process.env.JQUANTS_REFRESH_TOKEN;

    if (!refreshToken) {
      console.log('[J-Quants API] リフレッシュトークンが設定されていません');
      return null;
    }

    // キャッシュされたトークンが有効な場合はそれを使用
    const now = Date.now();
    if (cachedIdToken && now < tokenExpiryTime) {
      console.log('[J-Quants API] キャッシュされたIDトークンを使用');
      return cachedIdToken;
    }

    console.log('[J-Quants API] IDトークンを取得中...');

    // リフレッシュトークンからIDトークンを取得
    const authUrl = `${API_BASE_URL}/token/auth_refresh?refreshtoken=${encodeURIComponent(refreshToken)}`;
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[J-Quants API] IDトークン取得エラー: ${response.status}`, errorData);
      return null;
    }

    const data = await response.json();
    const idToken = data.idToken;

    if (!idToken) {
      console.error('[J-Quants API] IDトークンがレスポンスに含まれていません');
      return null;
    }

    // トークンをキャッシュ（23時間後に期限切れとして扱う）
    cachedIdToken = idToken;
    tokenExpiryTime = now + 23 * 60 * 60 * 1000; // 23時間

    console.log('[J-Quants API] IDトークンの取得に成功しました');
    return idToken;
  } catch (error) {
    console.error('[J-Quants API] IDトークン取得エラー:', error);
    return null;
  }
}

/**
 * J-Quants APIから現在株価を取得
 * @param code 銘柄コード（4桁の数字、例: "7203"）
 * @returns 現在株価（円）、取得できない場合はnull
 */
export async function getStockPriceFromJQuants(code: string): Promise<number | null> {
  try {
    // 銘柄コードのバリデーション
    if (!/^\d{4}$/.test(code)) {
      throw new Error('無効な銘柄コードです');
    }

    const idToken = await getIdToken();
    if (!idToken) {
      return null;
    }

    console.log(`[J-Quants API] 株価取得開始: ${code}`);

    // 最新の日次株価データを取得
    // エンドポイント: /markets/daily_quotes
    // 注意: 実際のエンドポイントは公式ドキュメントを確認してください
    const today = new Date().toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD形式
    const url = `${API_BASE_URL}/markets/daily_quotes?code=${code}&date=${today}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${idToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`[J-Quants API] 株価取得エラー: ${response.status}`, errorText);
      return null;
    }

    const data = await response.json();

    // レスポンス構造に応じて株価を抽出
    // 実際の構造は公式ドキュメントを確認してください
    if (data.daily_quotes && Array.isArray(data.daily_quotes) && data.daily_quotes.length > 0) {
      const latestQuote = data.daily_quotes[0];
      const price = latestQuote.Close || latestQuote.close || latestQuote.closing_price;
      
      if (price && price > 0) {
        console.log(`[J-Quants API] 株価取得成功: ${code} = ${price}円`);
        return price;
      }
    }

    // 別の構造を試す
    if (data.Close || data.close || data.closing_price) {
      const price = data.Close || data.close || data.closing_price;
      if (price && price > 0) {
        console.log(`[J-Quants API] 株価取得成功: ${code} = ${price}円`);
        return price;
      }
    }

    console.log(`[J-Quants API] 株価データが見つかりませんでした: ${code}`);
    return null;
  } catch (error) {
    console.error(`[J-Quants API] 株価取得エラー (${code}):`, error);
    return null;
  }
}

/**
 * J-Quants APIから一株配当（年間）を取得
 * @param code 銘柄コード（4桁の数字、例: "7203"）
 * @returns 一株配当（年間、円）、取得できない場合はnull
 */
export async function getDividendAmountFromJQuants(code: string): Promise<number | null> {
  try {
    // 銘柄コードのバリデーション
    if (!/^\d{4}$/.test(code)) {
      throw new Error('無効な銘柄コードです');
    }

    const idToken = await getIdToken();
    if (!idToken) {
      return null;
    }

    console.log(`[J-Quants API] 配当情報取得開始: ${code}`);

    // 配当情報を取得
    // エンドポイント: /fins/dividend
    // 公式ドキュメント: https://jpx.gitbook.io/j-quants-ja/api-reference/fins
    const url = `${API_BASE_URL}/fins/dividend?code=${code}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${idToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorMessage = errorText;
      
      // エラーメッセージをパースして読みやすくする
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // JSONパースに失敗した場合はそのまま使用
      }
      
      // サブスクリプションエラーの場合は、より分かりやすいメッセージを表示
      if (response.status === 400 && (errorMessage.includes('subscription') || errorMessage.includes('not available'))) {
        console.log(`[J-Quants API] 配当情報取得エラー (${code}): 現在のサブスクリプションプランでは配当情報APIが利用できません`);
        console.log(`[J-Quants API] フォールバック: みんかぶから配当情報を取得します`);
      } else {
        console.error(`[J-Quants API] 配当情報取得エラー (${code}): ${response.status}`, errorMessage);
      }
      return null;
    }

    const data = await response.json();
    console.log(`[J-Quants API] 配当情報レスポンス (${code}):`, JSON.stringify(data, null, 2));

    // レスポンス構造を確認
    // 可能性1: { dividends: [{ code, company, dividend, exDate, paymentDate }, ...] }
    // 可能性2: { dividend: [{ code, company, dividend, exDate, paymentDate }, ...] }
    // 可能性3: その他の構造
    
    let dividends = data.dividends || data.dividend || [];
    
    if (!Array.isArray(dividends)) {
      // オブジェクトの場合、配列に変換を試みる
      if (typeof dividends === 'object' && dividends !== null) {
        dividends = Object.values(dividends);
      } else {
        dividends = [];
      }
    }

    console.log(`[J-Quants API] 配当データ数 (${code}):`, dividends.length);

    if (dividends.length > 0) {
      // 最新の年度の配当を取得（exDateでソート）
      const sortedDividends = dividends
        .filter((d: any) => {
          // dividendフィールドの値を確認（複数の可能性に対応）
          const dividendValue = d.dividend || d.Dividend || d.dividendPerShare || d.DividendPerShare || 0;
          return dividendValue && dividendValue > 0;
        })
        .sort((a: any, b: any) => {
          // 日付フィールドの値を確認（複数の可能性に対応）
          const dateA = new Date(a.exDate || a.ExDate || a.paymentDate || a.PaymentDate || a.date || a.Date || 0);
          const dateB = new Date(b.exDate || b.ExDate || b.paymentDate || b.PaymentDate || b.date || b.Date || 0);
          return dateB.getTime() - dateA.getTime();
        });

      if (sortedDividends.length > 0) {
        // 最新の配当を取得
        const latestDividend = sortedDividends[0];
        // dividendフィールドの値を確認（複数の可能性に対応）
        const dividendPerShare = latestDividend.dividend || latestDividend.Dividend || latestDividend.dividendPerShare || latestDividend.DividendPerShare || 0;
        
        console.log(`[J-Quants API] 最新配当データ (${code}):`, {
          dividendPerShare,
          exDate: latestDividend.exDate || latestDividend.ExDate,
          paymentDate: latestDividend.paymentDate || latestDividend.PaymentDate,
        });

        // 年間配当を計算（過去1年間の配当を合計）
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const annualDividends = sortedDividends
          .filter((d: any) => {
            const exDate = new Date(d.exDate || d.ExDate || d.paymentDate || d.PaymentDate || d.date || d.Date || 0);
            return exDate >= oneYearAgo;
          })
          .reduce((sum: number, d: any) => {
            const dividendValue = d.dividend || d.Dividend || d.dividendPerShare || d.DividendPerShare || 0;
            return sum + dividendValue;
          }, 0);

        // 年間配当が計算できた場合はそれを使用、そうでなければ最新の配当を4倍（四半期配当を想定）
        const annualDividend = annualDividends > 0 
          ? annualDividends 
          : dividendPerShare * 4; // 四半期配当を想定

        if (annualDividend > 0) {
          console.log(`[J-Quants API] 一株配当取得成功: ${code} = ${annualDividend}円（年間）`);
          return annualDividend;
        }
      }
    }

    console.log(`[J-Quants API] 配当情報が見つかりませんでした: ${code}`);
    return null;
  } catch (error) {
    console.error(`[J-Quants API] 配当金額取得エラー (${code}):`, error);
    return null;
  }
}

