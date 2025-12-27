/**
 * Yahoo Finance APIから一株当たりの配当を取得するテストスクリプト
 * 
 * 使用方法:
 * npx tsx scripts/test-dividend.ts [銘柄コード]
 * 
 * 例:
 * npx tsx scripts/test-dividend.ts 7203
 * npx tsx scripts/test-dividend.ts 9984
 * npx tsx scripts/test-dividend.ts 6481
 */

import { getDividendAmount } from '../lib/yahooFinance';

async function testDividend(code: string) {
  console.log(`\n=== 一株配当取得テスト: ${code} ===\n`);
  
  // デバッグモードを有効化
  process.env.DEBUG = 'true';
  
  try {
    const dividendAmount = await getDividendAmount(code);
    
    if (dividendAmount === null) {
      console.log(`❌ 一株配当の取得に失敗しました (${code})`);
      console.log('\n考えられる原因:');
      console.log('  1. Yahoo Finance APIに配当情報が存在しない');
      console.log('  2. 銘柄コードが無効');
      console.log('  3. APIのレスポンス構造が期待と異なる');
      console.log('  4. Yahoo Finance APIのアクセス制限（401エラー: Invalid Crumb）');
      console.log('\n⚠️  401エラー（Invalid Crumb）の場合:');
      console.log('  Yahoo Finance APIのv10エンドポイントは認証用のcrumbトークンが必要です。');
      console.log('  非公式APIのため、crumbトークンの取得が複雑です。');
      console.log('  代替案:');
      console.log('    - 別のAPIサービスを使用（例: Alpha Vantage, IEX Cloud等）');
      console.log('    - Yahoo FinanceのWebページからスクレイピング（利用規約に注意）');
      console.log('    - 手動で配当情報を入力する機能を追加');
    } else {
      console.log(`✅ 一株配当取得成功: ${dividendAmount}円 (${code})`);
    }
  } catch (error) {
    console.error(`❌ エラーが発生しました (${code}):`, error);
    if (error instanceof Error) {
      console.error('エラーメッセージ:', error.message);
      if (error.message.includes('401') || error.message.includes('Invalid Crumb')) {
        console.error('\n⚠️  401エラー: Yahoo Finance APIのアクセス制限');
        console.error('  v10エンドポイントは認証用のcrumbトークンが必要です。');
        console.error('  現在の実装では、v10エンドポイントから配当情報を取得できません。');
      }
    }
  }
  
  console.log(`\n=== テスト完了: ${code} ===\n`);
}

// コマンドライン引数から銘柄コードを取得
const code = process.argv[2];

if (!code) {
  console.log('使用方法: npx tsx scripts/test-dividend.ts [銘柄コード]');
  console.log('\n例:');
  console.log('  npx tsx scripts/test-dividend.ts 7203  # トヨタ自動車');
  console.log('  npx tsx scripts/test-dividend.ts 9984  # ソフトバンクグループ');
  console.log('  npx tsx scripts/test-dividend.ts 6481  # 日本光電工業');
  console.log('\n複数の銘柄をテストする場合:');
  console.log('  npx tsx scripts/test-dividend.ts 7203 && npx tsx scripts/test-dividend.ts 9984');
  process.exit(1);
}

// 銘柄コードのバリデーション
if (!/^\d{4}$/.test(code)) {
  console.error('❌ 無効な銘柄コードです。4桁の数字を入力してください。');
  console.error(`   入力された値: ${code}`);
  process.exit(1);
}

// テスト実行
testDividend(code).catch((error) => {
  console.error('予期しないエラー:', error);
  process.exit(1);
});

