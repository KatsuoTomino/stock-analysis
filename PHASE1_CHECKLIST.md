# Phase 1 確認チェックリスト

Phase 1（データベースとバックエンド基礎）の実装が完了したら、以下の項目を確認してください。

## 1. 環境変数の設定確認

### 確認項目
- [ ] `.env.local` ファイルが存在する
- [ ] `POSTGRES_URL` が正しく設定されている
- [ ] Vercel Postgres を使用する場合、接続URLを設定済み

### 確認方法
```bash
# .env.local ファイルの内容を確認
cat .env.local
```

**注意**: 実際のデータベース接続URLに置き換えてください。
- Vercel Postgres の場合: Vercel ダッシュボードから接続URLを取得
- ローカル開発の場合: ローカルのPostgreSQL接続URLを設定

---

## 2. データベーステーブルの作成

### 確認項目
- [ ] `stocks` テーブルが作成されている
- [ ] `dividends` テーブルが作成されている
- [ ] `analyses` テーブルが作成されている

### 確認方法 A: スクリプトを使用（推奨）

1. `tsx` をインストール（まだの場合）:
```bash
npm install -D tsx
```

2. データベース初期化スクリプトを実行:
```bash
npx tsx scripts/init-db.ts
```

### 確認方法 B: Vercel Postgres ダッシュボードで確認

1. Vercel ダッシュボードにログイン
2. プロジェクトを選択
3. Storage タブ → Postgres を選択
4. Table Editor で以下のテーブルが存在することを確認:
   - `stocks`
   - `dividends`
   - `analyses`

### 確認方法 C: SQL を直接実行

Vercel Postgres の SQL Editor で `lib/db/schema.sql` の内容を実行

---

## 3. API エンドポイントの動作確認

### 確認項目
- [ ] POST /api/stocks が動作する
- [ ] GET /api/stocks が動作する
- [ ] PUT /api/stocks/[id] が動作する
- [ ] DELETE /api/stocks/[id] が動作する
- [ ] バリデーションが正しく動作する

### 確認方法 A: テストスクリプトを使用（推奨）

1. 開発サーバーを起動（別のターミナル）:
```bash
npm run dev
```

2. テストスクリプトを実行:
```bash
npx tsx scripts/test-api.ts
```

### 確認方法 B: Postman または Thunder Client で手動テスト

#### POST /api/stocks（銘柄登録）
- **URL**: `http://localhost:3000/api/stocks`
- **Method**: POST
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "code": "7203",
  "name": "トヨタ自動車",
  "purchase_price": 2500.00,
  "shares": 100,
  "purchase_amount": 250000.00
}
```
- **期待される結果**: ステータス 201、登録された銘柄データが返る

#### GET /api/stocks（全銘柄取得）
- **URL**: `http://localhost:3000/api/stocks`
- **Method**: GET
- **期待される結果**: ステータス 200、銘柄の配列が返る

#### PUT /api/stocks/[id]（銘柄更新）
- **URL**: `http://localhost:3000/api/stocks/1`（IDは実際の値に置き換え）
- **Method**: PUT
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "code": "7203",
  "name": "トヨタ自動車（更新）",
  "purchase_price": 2600.00,
  "shares": 100,
  "purchase_amount": 260000.00
}
```
- **期待される結果**: ステータス 200、更新された銘柄データが返る

#### DELETE /api/stocks/[id]（銘柄削除）
- **URL**: `http://localhost:3000/api/stocks/1`（IDは実際の値に置き換え）
- **Method**: DELETE
- **期待される結果**: ステータス 200、削除された銘柄データが返る

#### バリデーションテスト
以下の無効なデータでエラーが返ることを確認:

1. **銘柄コードが3桁**:
```json
{
  "code": "123",
  "name": "テスト",
  "purchase_price": 1000,
  "shares": 10,
  "purchase_amount": 10000
}
```
- **期待される結果**: ステータス 400、エラーメッセージ

2. **必須項目が不足**:
```json
{
  "code": "7203"
}
```
- **期待される結果**: ステータス 400、エラーメッセージ

---

## 4. エラーハンドリングの確認

### 確認項目
- [ ] 無効なリクエストで適切なエラーメッセージが返る
- [ ] 存在しないIDで更新/削除しようとした場合、404エラーが返る
- [ ] データベースエラーが適切に処理される

---

## 5. 次のステップ

Phase 1 の確認が完了したら、Phase 2（フロントエンド基本UI）に進みます。

Phase 1 完了の確認:
- [ ] すべてのチェック項目が完了
- [ ] API エンドポイントが正常に動作
- [ ] エラーハンドリングが適切に機能

---

## トラブルシューティング

### データベース接続エラー
- `.env.local` の `POSTGRES_URL` が正しいか確認
- Vercel Postgres の接続URLが有効か確認

### API エンドポイントが動作しない
- 開発サーバーが起動しているか確認 (`npm run dev`)
- ポート 3000 が使用可能か確認
- コンソールにエラーメッセージがないか確認

### テーブルが作成されない
- SQL スクリプトが正しく実行されたか確認
- Vercel Postgres の権限を確認
- エラーメッセージを確認

