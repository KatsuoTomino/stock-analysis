/**
 * API エンドポイントテストスクリプト
 * 実行方法: npx tsx scripts/test-api.ts
 * 
 * 注意: このスクリプトを実行する前に、開発サーバーが起動していることを確認してください
 * npm run dev を別のターミナルで実行しておく必要があります
 */

const API_BASE_URL = 'http://localhost:3000/api';

interface Stock {
  id?: number;
  code: string;
  name: string;
  purchase_price: number;
  shares: number;
  purchase_amount: number;
}

async function testAPI() {
  console.log('=== API エンドポイントテスト開始 ===\n');

  let createdStockId: number | null = null;

  try {
    // 1. POST /api/stocks - 銘柄登録テスト
    console.log('1. POST /api/stocks - 銘柄登録テスト');
    const testStock: Stock = {
      code: '7203',
      name: 'トヨタ自動車',
      purchase_price: 2500.00,
      shares: 100,
      purchase_amount: 250000.00,
    };

    const createResponse = await fetch(`${API_BASE_URL}/stocks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testStock),
    });

    if (createResponse.ok) {
      const createdStock = await createResponse.json();
      createdStockId = createdStock.id;
      console.log('✓ 銘柄登録成功:', createdStock);
    } else {
      const error = await createResponse.json();
      console.error('✗ 銘柄登録失敗:', error);
    }
    console.log('');

    // 2. GET /api/stocks - 全銘柄取得テスト
    console.log('2. GET /api/stocks - 全銘柄取得テスト');
    const getResponse = await fetch(`${API_BASE_URL}/stocks`);

    if (getResponse.ok) {
      const stocks = await getResponse.json();
      console.log(`✓ 銘柄取得成功: ${stocks.length}件の銘柄を取得`);
      console.log('取得した銘柄:', stocks);
    } else {
      const error = await getResponse.json();
      console.error('✗ 銘柄取得失敗:', error);
    }
    console.log('');

    if (createdStockId) {
      // 3. PUT /api/stocks/[id] - 銘柄更新テスト
      console.log(`3. PUT /api/stocks/${createdStockId} - 銘柄更新テスト`);
      const updatedStock: Stock = {
        code: '7203',
        name: 'トヨタ自動車（更新）',
        purchase_price: 2600.00,
        shares: 100,
        purchase_amount: 260000.00,
      };

      const updateResponse = await fetch(`${API_BASE_URL}/stocks/${createdStockId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedStock),
      });

      if (updateResponse.ok) {
        const updated = await updateResponse.json();
        console.log('✓ 銘柄更新成功:', updated);
      } else {
        const error = await updateResponse.json();
        console.error('✗ 銘柄更新失敗:', error);
      }
      console.log('');

      // 4. DELETE /api/stocks/[id] - 銘柄削除テスト
      console.log(`4. DELETE /api/stocks/${createdStockId} - 銘柄削除テスト`);
      const deleteResponse = await fetch(`${API_BASE_URL}/stocks/${createdStockId}`, {
        method: 'DELETE',
      });

      if (deleteResponse.ok) {
        const result = await deleteResponse.json();
        console.log('✓ 銘柄削除成功:', result);
      } else {
        const error = await deleteResponse.json();
        console.error('✗ 銘柄削除失敗:', error);
      }
      console.log('');
    }

    // 5. バリデーションテスト
    console.log('5. バリデーションテスト（エラーケース）');
    
    // 無効な銘柄コード
    const invalidCodeResponse = await fetch(`${API_BASE_URL}/stocks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: '123', // 3桁（無効）
        name: 'テスト',
        purchase_price: 1000,
        shares: 10,
        purchase_amount: 10000,
      }),
    });

    if (!invalidCodeResponse.ok) {
      const error = await invalidCodeResponse.json();
      console.log('✓ バリデーション動作確認（無効な銘柄コード）:', error.error);
    }

    console.log('\n=== API エンドポイントテスト完了 ===');
  } catch (error) {
    console.error('テスト実行エラー:', error);
    console.log('\n注意: 開発サーバーが起動していることを確認してください (npm run dev)');
  }
}

testAPI();

