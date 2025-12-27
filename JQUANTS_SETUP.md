# J-Quants API セットアップガイド

## 1. J-Quants APIに登録

1. [J-Quants API公式サイト](https://jpx-jquants.com/)にアクセス
2. 「ユーザー登録」または「新規登録」をクリック
3. メールアドレスとパスワードを設定してアカウントを作成

## 2. リフレッシュトークンの取得

### 方法1: API経由で取得（推奨）

1. ターミナルまたはコマンドプロンプトを開く
2. 以下のコマンドを実行（メールアドレスとパスワードを置き換えてください）：

```bash
curl --request POST "https://api.jquants.com/v1/token/auth_user" \
     --header "Content-Type: application/json" \
     --data '{
       "mailaddress": "your_email@example.com",
       "password": "your_password"
     }'
```

3. レスポンスから`refreshToken`をコピーします：

```json
{
  "refreshToken": "ここにリフレッシュトークンが表示されます"
}
```

### 方法2: サイトから取得

1. [J-Quants API公式サイト](https://jpx-jquants.com/)にログイン
2. ダッシュボードまたは「API設定」ページに移動
3. 「リフレッシュトークン」または「Refresh Token」のセクションを確認
4. トークンをコピー

**注意**: リフレッシュトークンは1週間有効です。期限が切れる前に更新してください。

## 3. .env.localファイルの設定

プロジェクトのルートディレクトリ（`stock-analysis`フォルダ）に`.env.local`ファイルを作成または編集し、以下の形式で設定してください：

```env
JQUANTS_REFRESH_TOKEN=ここにリフレッシュトークンを貼り付け
```

**重要**:
- `=`の前後にスペースを入れないでください
- トークンの前後に引用符（`"`や`'`）を付けないでください
- 例: `JQUANTS_REFRESH_TOKEN=abc123def456ghi789`

## 4. 開発サーバーの再起動

環境変数を変更した後は、開発サーバーを再起動してください：

```bash
# 開発サーバーを停止（Ctrl+C）
# その後、再度起動
npm run dev
```

## 5. 動作確認

ブラウザでアプリケーションを開き、銘柄の配当情報が表示されることを確認してください。

ログに以下のメッセージが表示されれば成功です：
```
[J-Quants API] IDトークンの取得に成功しました
[J-Quants API] 配当情報取得開始: [銘柄コード]
```

## トラブルシューティング

### リフレッシュトークンが設定されていないエラーが出る場合

1. `.env.local`ファイルが正しい場所にあるか確認（`stock-analysis`フォルダのルート）
2. ファイル名が`.env.local`であることを確認（`.env.local.txt`などではない）
3. 環境変数の形式が正しいか確認（`JQUANTS_REFRESH_TOKEN=トークン`）
4. 開発サーバーを再起動

### 認証エラーが出る場合

1. リフレッシュトークンの有効期限（1週間）を確認
2. トークンが正しくコピーされているか確認（前後のスペースや改行がないか）
3. J-Quants APIのサイトで新しいトークンを取得

### 配当情報が取得できない場合

J-Quants APIから取得できない場合、自動的にみんかぶまたはYahoo Finance APIから取得を試みます。これは正常な動作です。

