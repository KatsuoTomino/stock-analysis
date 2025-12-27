/**
 * 代替APIから一株当たりの配当を取得するテストスクリプト
 * 
 * テスト対象:
 * 1. J-Quants API（日本取引所グループ）
 * 2. みんかぶ（スクレイピング）
 * 
 * 使用方法:
 * npx tsx scripts/test-dividend-alternative.ts [銘柄コード] [API名]
 * 
 * 例:
 * npx tsx scripts/test-dividend-alternative.ts 7203 jquants
 * npx tsx scripts/test-dividend-alternative.ts 7203 minkabu
 */

// J-Quants APIから配当情報を取得
async function getDividendFromJQuants(code: string): Promise<number | null> {
  try {
    console.log(`\n[J-Quants API] 配当情報取得開始: ${code}`);
    
    // J-Quants APIのエンドポイント
    // 注意: 実際のAPIキーとエンドポイントは公式ドキュメントを参照
    // https://jpx-jquants.com/
    
    // 配当情報取得エンドポイント（例）
    // 実際のエンドポイントは公式ドキュメントを確認してください
    const apiKey = process.env.JQUANTS_API_KEY || '';
    
    if (!apiKey) {
      console.log('⚠️  J-Quants APIキーが設定されていません');
      console.log('  環境変数 JQUANTS_API_KEY を設定してください');
      return null;
    }
    
    // 配当情報取得エンドポイント（仮）
    // 実際のエンドポイントは公式ドキュメントを確認してください
    const url = `https://api.jquants.com/v1/listed/info/dividend?code=${code}`;
    
    const response = await fetch(url, {
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`[J-Quants API] エラー: ${response.status} ${response.statusText}`);
      const errorText = await response.text().catch(() => '');
      console.error(`[J-Quants API] エラーレスポンス:`, errorText);
      return null;
    }
    
    const data = await response.json();
    console.log(`[J-Quants API] レスポンス:`, JSON.stringify(data, null, 2));
    
    // レスポンス構造に応じて一株配当を抽出
    // 実際の構造は公式ドキュメントを確認してください
    if (data.dividendPerShare) {
      return data.dividendPerShare;
    }
    
    return null;
  } catch (error) {
    console.error(`[J-Quants API] エラー:`, error);
    return null;
  }
}

// みんかぶから配当情報を取得（スクレイピング）
async function getDividendFromMinkabu(code: string): Promise<number | null> {
  try {
    console.log(`\n[みんかぶ] 配当情報取得開始: ${code}`);
    
    // みんかぶの配当情報ページ
    const url = `https://minkabu.jp/stock/${code}/dividend`;
    
    console.log(`[みんかぶ] URL: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://minkabu.jp/',
      },
    });
    
    if (!response.ok) {
      console.error(`[みんかぶ] エラー: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const html = await response.text();
    
    // HTMLから配当情報を抽出
    console.log(`[みんかぶ] HTML取得成功 (${html.length}文字)`);
    
    // HTMLの構造を詳しく確認
    // テーブルやリストから配当情報を抽出
    const tableMatch = html.match(/<table[^>]*>[\s\S]*?配当[\s\S]*?<\/table>/i);
    
    // テーブルから配当利回りを抽出
    const yieldFromTable = tableMatch ? tableMatch[0].match(/配当利回り[\s\S]*?<td[^>]*>(\d+(?:\.\d+)?)%<\/td>/i) : null;
    const yieldValue = yieldFromTable ? parseFloat(yieldFromTable[1]) : null;
    
    if (yieldValue && yieldValue > 0) {
      console.log(`[みんかぶ] 配当利回り抽出（テーブル）: ${yieldValue}%`);
      
      // 現在株価を取得（Yahoo Finance APIを使用）
      try {
        const { getStockPrice } = await import('../lib/yahooFinance');
        const currentPrice = await getStockPrice(code);
        if (currentPrice && currentPrice > 0) {
          const dividendPerShare = (yieldValue / 100) * currentPrice;
          console.log(`[みんかぶ] 配当利回りから計算: ${dividendPerShare}円 (利回り: ${yieldValue}%, 株価: ${currentPrice}円)`);
          return dividendPerShare;
        }
      } catch (e) {
        console.log(`[みんかぶ] 株価取得エラー:`, e);
      }
    }
    
    // 配当利回りから逆算を試す（メタタグから取得）
    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    if (metaDescMatch) {
      const desc = metaDescMatch[1];
      const yieldMatch = desc.match(/配当利回り[：:]\s*(\d+(?:\.\d+)?)\s*%/);
      if (yieldMatch) {
        const yield = parseFloat(yieldMatch[1]);
        console.log(`[みんかぶ] 配当利回り抽出（メタタグ）: ${yield}%`);
        
        // 現在株価を取得（Yahoo Finance APIを使用）
        try {
          const { getStockPrice } = await import('../lib/yahooFinance');
          const currentPrice = await getStockPrice(code);
          if (currentPrice && currentPrice > 0) {
            const dividendPerShare = (yield / 100) * currentPrice;
            console.log(`[みんかぶ] 配当利回りから計算（メタタグ）: ${dividendPerShare}円 (利回り: ${yield}%, 株価: ${currentPrice}円)`);
            return dividendPerShare;
          }
        } catch (e) {
          console.log(`[みんかぶ] 株価取得エラー:`, e);
        }
      }
    }
    
    // テーブルの詳細を表示（既に取得済み）
    if (tableMatch) {
      const tableHtml = tableMatch[0];
      console.log(`[みんかぶ] 配当テーブルHTML:`, tableHtml.substring(0, 2000));
      
      // テーブル内の数値を抽出
      const numbers = tableHtml.match(/\d+\.?\d*/g);
      if (numbers) {
        console.log(`[みんかぶ] テーブル内の数値:`, numbers.slice(0, 10));
      }
    }
    
    // JSONデータが埋め込まれている可能性を確認
    const jsonMatches = html.matchAll(/<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi);
    for (const jsonMatch of jsonMatches) {
      try {
        const jsonData = JSON.parse(jsonMatch[1]);
        console.log(`[みんかぶ] JSONデータ発見:`, Object.keys(jsonData).slice(0, 10));
        
        // JSONから配当情報を抽出
        const findDividendInObject = (obj: any, path = ''): number | null => {
          if (typeof obj === 'number' && obj > 0 && obj < 10000) {
            return obj;
          }
          if (typeof obj === 'object' && obj !== null) {
            for (const key in obj) {
              const currentPath = path ? `${path}.${key}` : key;
              if (key.toLowerCase().includes('dividend') || key.toLowerCase().includes('配当')) {
                const value = obj[key];
                if (typeof value === 'number' && value > 0) {
                  console.log(`[みんかぶ] 配当情報発見 (${currentPath}): ${value}`);
                  return value;
                }
              }
              const result = findDividendInObject(obj[key], currentPath);
              if (result !== null) return result;
            }
          }
          return null;
        };
        
        const dividendFromJson = findDividendInObject(jsonData);
        if (dividendFromJson) {
          console.log(`[みんかぶ] JSONから一株配当抽出: ${dividendFromJson}円`);
          return dividendFromJson;
        }
      } catch (e) {
        // JSON解析エラーは無視
      }
    }
    
    // 配当利回りから逆算を試す（メタタグから取得）
    const metaDescription = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    if (metaDescription) {
      const desc = metaDescription[1];
      console.log(`[みんかぶ] メタ説明: ${desc}`);
      
      // メタ説明から配当利回りを抽出
      const yieldMatch = desc.match(/配当利回り[：:]\s*(\d+(?:\.\d+)?)\s*%/);
      if (yieldMatch) {
        const yield = parseFloat(yieldMatch[1]);
        console.log(`[みんかぶ] 配当利回り抽出: ${yield}%`);
        
        // 現在株価を取得（Yahoo Finance APIを使用）
        try {
          const { getStockPrice } = await import('../lib/yahooFinance');
          const currentPrice = await getStockPrice(code);
          if (currentPrice && currentPrice > 0) {
            const dividendPerShare = (yield / 100) * currentPrice;
            console.log(`[みんかぶ] 配当利回りから計算: ${dividendPerShare}円 (利回り: ${yield}%, 株価: ${currentPrice}円)`);
            return dividendPerShare;
          }
        } catch (e) {
          console.log(`[みんかぶ] 株価取得エラー:`, e);
        }
      }
    }
    
    console.log(`[みんかぶ] 一株配当が見つかりませんでした`);
    
    return null;
  } catch (error) {
    console.error(`[みんかぶ] エラー:`, error);
    return null;
  }
}

async function testAlternativeAPI(code: string, apiName: string) {
  console.log(`\n=== 代替APIテスト: ${code} (${apiName}) ===\n`);
  
  let result: number | null = null;
  
  if (apiName === 'jquants') {
    result = await getDividendFromJQuants(code);
  } else if (apiName === 'minkabu') {
    result = await getDividendFromMinkabu(code);
  } else {
    console.error(`❌ 不明なAPI名: ${apiName}`);
    console.log('利用可能なAPI: jquants, minkabu');
    return;
  }
  
  if (result === null) {
    console.log(`❌ 一株配当の取得に失敗しました (${code}, ${apiName})`);
  } else {
    console.log(`✅ 一株配当取得成功: ${result}円 (${code}, ${apiName})`);
  }
  
  console.log(`\n=== テスト完了: ${code} (${apiName}) ===\n`);
}

// コマンドライン引数から銘柄コードとAPI名を取得
const code = process.argv[2];
const apiName = process.argv[3] || 'minkabu'; // デフォルトはみんかぶ

if (!code) {
  console.log('使用方法: npx tsx scripts/test-dividend-alternative.ts [銘柄コード] [API名]');
  console.log('\n例:');
  console.log('  npx tsx scripts/test-dividend-alternative.ts 7203 minkabu  # みんかぶから取得');
  console.log('  npx tsx scripts/test-dividend-alternative.ts 7203 jquants  # J-Quants APIから取得');
  console.log('\n利用可能なAPI:');
  console.log('  - minkabu: みんかぶ（スクレイピング）');
  console.log('  - jquants: J-Quants API（APIキーが必要）');
  process.exit(1);
}

// 銘柄コードのバリデーション
if (!/^\d{4}$/.test(code)) {
  console.error('❌ 無効な銘柄コードです。4桁の数字を入力してください。');
  console.error(`   入力された値: ${code}`);
  process.exit(1);
}

// テスト実行
testAlternativeAPI(code, apiName).catch((error) => {
  console.error('予期しないエラー:', error);
  process.exit(1);
});

