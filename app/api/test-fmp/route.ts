import { NextRequest, NextResponse } from 'next/server';

/**
 * FMP APIのテスト用エンドポイント
 * GET /api/test-fmp?code=7203
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code') || '7203';
  
  const apiKey = process.env.FMP_API_KEY;
  
  const results: any = {
    apiKeyStatus: apiKey ? `設定済み (${apiKey.substring(0, 4)}...)` : '未設定',
    code: code,
    tests: [],
  };

  // 日本株シンボル形式をテスト
  const symbols = [
    `${code}.T`,      // 東証形式
    `${code}.TYO`,    // 東京形式
    code,             // そのまま
  ];

  for (const symbol of symbols) {
    try {
      // Profile エンドポイントをテスト
      const profileUrl = `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${apiKey}`;
      const profileResponse = await fetch(profileUrl);
      const profileData = await profileResponse.json();
      
      // Ratios エンドポイントをテスト
      const ratiosUrl = `https://financialmodelingprep.com/api/v3/ratios/${symbol}?apikey=${apiKey}`;
      const ratiosResponse = await fetch(ratiosUrl);
      const ratiosData = await ratiosResponse.json();

      results.tests.push({
        symbol: symbol,
        profile: {
          status: profileResponse.status,
          hasData: Array.isArray(profileData) && profileData.length > 0,
          data: profileData,
        },
        ratios: {
          status: ratiosResponse.status,
          hasData: Array.isArray(ratiosData) && ratiosData.length > 0,
          data: ratiosData,
        },
      });
    } catch (error) {
      results.tests.push({
        symbol: symbol,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // 米国株でテスト（動作確認用）
  try {
    const usSymbol = 'AAPL';
    const usProfileUrl = `https://financialmodelingprep.com/api/v3/profile/${usSymbol}?apikey=${apiKey}`;
    const usProfileResponse = await fetch(usProfileUrl);
    const usProfileData = await usProfileResponse.json();
    
    const usRatiosUrl = `https://financialmodelingprep.com/api/v3/ratios/${usSymbol}?apikey=${apiKey}`;
    const usRatiosResponse = await fetch(usRatiosUrl);
    const usRatiosData = await usRatiosResponse.json();

    results.usStockTest = {
      symbol: usSymbol,
      profile: {
        status: usProfileResponse.status,
        hasData: Array.isArray(usProfileData) && usProfileData.length > 0,
        sample: usProfileData[0] ? {
          companyName: usProfileData[0].companyName,
          sector: usProfileData[0].sector,
        } : null,
      },
      ratios: {
        status: usRatiosResponse.status,
        hasData: Array.isArray(usRatiosData) && usRatiosData.length > 0,
        sample: usRatiosData[0] ? {
          dividendPayoutRatio: usRatiosData[0].dividendPayoutRatio,
          dividendYield: usRatiosData[0].dividendYield,
          debtEquityRatio: usRatiosData[0].debtEquityRatio,
        } : null,
      },
    };
  } catch (error) {
    results.usStockTest = {
      error: error instanceof Error ? error.message : String(error),
    };
  }

  return NextResponse.json(results);
}

