# 代替APIテスト結果

## テスト実行日
2025年12月20日

## テスト結果

### 1. みんかぶ（スクレイピング）

#### 銘柄コード: 7203 (トヨタ自動車)
- **結果**: ✅ 成功
- **取得方法**: 配当利回り（2.77%）をHTMLテーブルから抽出し、現在株価（3424円）から一株配当を計算
- **計算結果**: 94.84円
- **計算式**: (2.77% / 100) × 3424円 = 94.84円

#### 実装方法
1. みんかぶの配当情報ページ（`https://minkabu.jp/stock/{code}/dividend`）からHTMLを取得
2. HTMLテーブルから配当利回りを抽出
3. Yahoo Finance APIから現在株価を取得
4. 配当利回りと現在株価から一株配当を計算

#### メリット
- 無料で利用可能
- 配当利回りが取得できる
- 現在株価と組み合わせて一株配当を計算可能

#### デメリット
- HTMLスクレイピングのため、HTML構造が変更されると動作しなくなる可能性
- 利用規約に注意が必要
- レート制限の可能性

### 2. J-Quants API

#### テスト結果
- **結果**: ⚠️ 未実装（APIキーが必要）
- **理由**: J-Quants APIは認証が必要で、APIキーの登録が必要

#### J-Quants APIについて
- **提供元**: 日本取引所グループ（JPX）
- **データ**: 上場会社の配当情報（決定・予想）を含む多様なデータセット
- **取得可能な情報**:
  - 1株当たりの配当金額
  - 基準日
  - 権利落ち日
  - 支払い開始予定日

#### 利用方法
1. J-Quants APIに登録（https://jpx-jquants.com/）
2. APIキーを取得
3. 環境変数 `JQUANTS_API_KEY` に設定
4. APIエンドポイントを呼び出し

#### メリット
- 公式APIのため信頼性が高い
- 詳細な配当情報が取得できる
- 構造化されたデータ

#### デメリット
- 登録とAPIキーの取得が必要
- 利用規約の確認が必要

## 推奨される実装

### 短期的な解決策: みんかぶを使用
1. みんかぶから配当利回りを取得
2. Yahoo Finance APIから現在株価を取得
3. 配当利回りと現在株価から一株配当を計算

### 長期的な解決策: J-Quants APIを検討
1. J-Quants APIに登録
2. APIキーを取得
3. 環境変数に設定
4. 公式APIから直接配当情報を取得

## テストファイル

テストファイルは `scripts/test-dividend-alternative.ts` にあります。

実行方法:
```bash
# みんかぶから取得
npx tsx scripts/test-dividend-alternative.ts [銘柄コード] minkabu

# J-Quants APIから取得（APIキーが必要）
npx tsx scripts/test-dividend-alternative.ts [銘柄コード] jquants
```

例:
```bash
npx tsx scripts/test-dividend-alternative.ts 7203 minkabu
npx tsx scripts/test-dividend-alternative.ts 9984 minkabu
npx tsx scripts/test-dividend-alternative.ts 7203 jquants
```

