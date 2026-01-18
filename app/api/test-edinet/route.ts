import { NextRequest, NextResponse } from 'next/server';
import { testEdinetConnection, getFinancialMetricsFromEdinet } from '@/lib/edinet';

/**
 * EDINET APIのテスト用エンドポイント
 * GET /api/test-edinet?code=7203
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code') || '7203';

  // 接続テスト
  const connectionTest = await testEdinetConnection();

  // 財務指標取得テスト
  let metricsTest = null;
  if (connectionTest.success) {
    metricsTest = await getFinancialMetricsFromEdinet(code);
  }

  return NextResponse.json({
    code: code,
    connectionTest: connectionTest,
    metricsTest: metricsTest,
    setupGuide: {
      step1: 'EDINET APIキーを取得してください',
      step1_url: 'https://disclosure.edinet-fsa.go.jp/',
      step2: 'Vercelの環境変数に EDINET_API_KEY を設定してください',
      step2_url: 'https://vercel.com/katsuotominos-projects/stock-analysis/settings/environment-variables',
      note: 'EDINET APIは金融庁が提供する公式APIです。利用には登録が必要です。',
    },
  });
}

