This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 機能

- 日本株の銘柄管理
- リアルタイム株価取得（Yahoo Finance API）
- 配当情報取得（J-Quants API / みんかぶ / Yahoo Finance API）
- 損益計算
- 配当利回り計算（取得株価・現在株価ベース）
- PDF分析による理論株価計算（Claude API）

## 環境変数の設定

`.env.local`ファイルを作成し、以下の環境変数を設定してください：

```env
# データベース（Vercel Postgres）
POSTGRES_URL=your_postgres_url
POSTGRES_PRISMA_URL=your_prisma_url
POSTGRES_URL_NON_POOLING=your_non_pooling_url

# Claude API（PDF分析用）
ANTHROPIC_API_KEY=your_anthropic_api_key

# J-Quants API（配当情報取得用、オプション）
JQUANTS_REFRESH_TOKEN=your_refresh_token

# 認証設定（必須）
AUTH_USERNAME=your_username
AUTH_PASSWORD=your_password
NEXTAUTH_SECRET=your_secret_key_minimum_32_characters
```

### 認証設定について

- `AUTH_USERNAME`: ログインに使用するユーザー名（デフォルト: `admin`）
- `AUTH_PASSWORD`: ログインに使用するパスワード（デフォルト: `password`）
- `NEXTAUTH_SECRET`: NextAuth.jsのシークレットキー（32文字以上推奨）

**重要**: 本番環境では必ず強力なパスワードとシークレットキーを設定してください。

シークレットキーを生成するには、以下のコマンドを実行してください：

```bash
openssl rand -base64 32
```

### J-Quants APIの設定（オプション）

J-Quants APIを使用すると、より正確な配当情報を取得できます。

#### 手順1: J-Quants APIに登録

1. [J-Quants API](https://jpx-jquants.com/)にアクセス
2. 「ユーザー登録」または「新規登録」をクリック
3. メールアドレスとパスワードを設定してアカウントを作成

#### 手順2: リフレッシュトークンの取得

**方法A: スクリプトを使用（推奨）**

```bash
npx tsx scripts/get-jquants-token.ts
```

スクリプトを実行すると、メールアドレスとパスワードの入力が求められます。入力後、リフレッシュトークンが表示されます。

**方法B: curlコマンドを使用**

```bash
curl --request POST "https://api.jquants.com/v1/token/auth_user" \
     --header "Content-Type: application/json" \
     --data '{
       "mailaddress": "your_email@example.com",
       "password": "your_password"
     }'
```

レスポンスから`refreshToken`をコピーしてください。

#### 手順3: .env.localファイルに設定

取得したリフレッシュトークンを`.env.local`ファイルに追加：

```env
JQUANTS_REFRESH_TOKEN=ここにリフレッシュトークンを貼り付け
```

**重要**: 
- `=`の前後にスペースを入れないでください
- トークンの前後に引用符（`"`や`'`）を付けないでください
- 例: `JQUANTS_REFRESH_TOKEN=abc123def456ghi789`

#### 手順4: 開発サーバーを再起動

環境変数を変更した後は、開発サーバーを再起動してください。

**注意**: 
- J-Quants APIが設定されていない場合、みんかぶまたはYahoo Finance APIから配当情報を取得します
- リフレッシュトークンは1週間有効です。期限が切れる前に更新してください

詳細は [JQUANTS_SETUP.md](./JQUANTS_SETUP.md) を参照してください。

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
