/**
 * Financial Modeling Prep (FMP) API クライアント
 * 配当性向、配当利回り、自己資本比率などの財務指標を取得
 */

const FMP_API_BASE_URL = 'https://financialmodelingprep.com/api/v3';

// FMP APIキーは環境変数から取得
const getApiKey = () => {
  return process.env.FMP_API_KEY || '';
};

// 日本株のシンボルを FMP 形式に変換 (例: 7203 -> 7203.T)
export function toFmpSymbol(code: string): string {
  // すでに .T が付いている場合はそのまま返す
  if (code.endsWith('.T')) {
    return code;
  }
  // 4桁の数字の場合は日本株と判断
  if (/^\d{4}$/.test(code)) {
    return `${code}.T`;
  }
  return code;
}

// 財務比率データの型定義
export interface FinancialRatios {
  dividendPayoutRatio: number | null;  // 配当性向
  dividendYield: number | null;        // 配当利回り
  debtEquityRatio: number | null;      // 負債資本比率
  equityRatio: number | null;          // 自己資本比率（計算値）
  returnOnEquity: number | null;       // ROE
  priceToEarningsRatio: number | null; // PER
  priceToBookRatio: number | null;     // PBR
}

// 企業プロファイルの型定義
export interface CompanyProfile {
  symbol: string;
  companyName: string;
  sector: string;
  industry: string;
  lastDividend: number | null;
  beta: number | null;
  mktCap: number | null;
}

/**
 * 財務比率を取得
 * @param code 銘柄コード（日本株の場合は4桁の数字）
 */
export async function getFinancialRatios(code: string): Promise<FinancialRatios | null> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    console.warn('[FMP API] APIキーが設定されていません。環境変数 FMP_API_KEY を設定してください。');
    return null;
  }

  const symbol = toFmpSymbol(code);
  
  try {
    // 財務比率エンドポイント
    const ratiosUrl = `${FMP_API_BASE_URL}/ratios/${symbol}?apikey=${apiKey}`;
    console.log(`[FMP API] 財務比率取得: ${symbol}`);
    
    const response = await fetch(ratiosUrl);
    
    if (!response.ok) {
      console.error(`[FMP API] エラー: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      console.warn(`[FMP API] ${symbol} のデータが見つかりません`);
      return null;
    }

    // 最新のデータを取得
    const latest = data[0];
    
    // 自己資本比率を計算（1 / (1 + D/E ratio) * 100）
    let equityRatio: number | null = null;
    if (latest.debtEquityRatio !== null && latest.debtEquityRatio !== undefined) {
      equityRatio = (1 / (1 + latest.debtEquityRatio)) * 100;
    }

    return {
      dividendPayoutRatio: latest.dividendPayoutRatio ?? null,
      dividendYield: latest.dividendYield ?? null,
      debtEquityRatio: latest.debtEquityRatio ?? null,
      equityRatio: equityRatio,
      returnOnEquity: latest.returnOnEquity ?? null,
      priceToEarningsRatio: latest.priceEarningsRatio ?? null,
      priceToBookRatio: latest.priceToBookRatio ?? null,
    };
  } catch (error) {
    console.error('[FMP API] 財務比率取得エラー:', error);
    return null;
  }
}

/**
 * キーメトリクス（重要指標）を取得
 * @param code 銘柄コード
 */
export async function getKeyMetrics(code: string): Promise<any | null> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    console.warn('[FMP API] APIキーが設定されていません');
    return null;
  }

  const symbol = toFmpSymbol(code);
  
  try {
    const url = `${FMP_API_BASE_URL}/key-metrics/${symbol}?apikey=${apiKey}`;
    console.log(`[FMP API] キーメトリクス取得: ${symbol}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`[FMP API] エラー: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      console.warn(`[FMP API] ${symbol} のキーメトリクスが見つかりません`);
      return null;
    }

    return data[0];
  } catch (error) {
    console.error('[FMP API] キーメトリクス取得エラー:', error);
    return null;
  }
}

/**
 * 企業プロファイルを取得
 * @param code 銘柄コード
 */
export async function getCompanyProfile(code: string): Promise<CompanyProfile | null> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    console.warn('[FMP API] APIキーが設定されていません');
    return null;
  }

  const symbol = toFmpSymbol(code);
  
  try {
    const url = `${FMP_API_BASE_URL}/profile/${symbol}?apikey=${apiKey}`;
    console.log(`[FMP API] 企業プロファイル取得: ${symbol}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`[FMP API] エラー: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      console.warn(`[FMP API] ${symbol} のプロファイルが見つかりません`);
      return null;
    }

    const profile = data[0];
    
    return {
      symbol: profile.symbol,
      companyName: profile.companyName,
      sector: profile.sector,
      industry: profile.industry,
      lastDividend: profile.lastDiv ?? null,
      beta: profile.beta ?? null,
      mktCap: profile.mktCap ?? null,
    };
  } catch (error) {
    console.error('[FMP API] 企業プロファイル取得エラー:', error);
    return null;
  }
}

/**
 * すべての財務指標をまとめて取得
 * @param code 銘柄コード
 */
export async function getAllFinancialData(code: string): Promise<{
  ratios: FinancialRatios | null;
  profile: CompanyProfile | null;
  keyMetrics: any | null;
}> {
  const [ratios, profile, keyMetrics] = await Promise.all([
    getFinancialRatios(code),
    getCompanyProfile(code),
    getKeyMetrics(code),
  ]);

  return { ratios, profile, keyMetrics };
}

