# 一株配当取得テスト結果

## テスト実行日
2025年12月20日

## テスト結果

### 銘柄コード: 7203 (トヨタ自動車)

#### エラー内容
```
Error: Yahoo Finance API エラー: 401 Unauthorized
Invalid Crumb
```

#### 問題点
1. **Yahoo Finance APIのv10エンドポイントは認証が必要**
   - `quoteSummary`エンドポイント（v10）は認証用のcrumbトークンを要求
   - 非公式APIのため、crumbトークンの取得が複雑

2. **v8エンドポイントには配当情報が含まれていない**
   - v8エンドポイント（`/v8/finance/chart/`）は株価情報のみ提供
   - 配当情報（`summaryDetail`、`defaultKeyStatistics`）は含まれていない

3. **現在の実装では配当情報を取得できない**
   - v10エンドポイントは401エラーを返す
   - v8エンドポイントには配当情報がない

## 代替案

### 1. 手動入力機能を追加（推奨）
- ユーザーが手動で一株配当を入力できる機能を追加
- データベースに`dividend_per_share`カラムを追加
- 既存の配当履歴機能と統合

### 2. 別のAPIサービスを使用
- **Alpha Vantage**: 有料プランあり
- **IEX Cloud**: 有料プランあり
- **Yahoo Financeスクレイピング**: 利用規約に注意が必要

### 3. 配当利回りから逆算
- 現在株価と配当利回りが取得できれば、一株配当を計算可能
- ただし、配当利回りもv10エンドポイントから取得する必要がある

## 推奨される対応

1. **短期的な解決策**: 手動入力機能を追加
   - ユーザーが一株配当を手動で入力できるようにする
   - 既存の配当履歴機能と統合

2. **長期的な解決策**: 別のAPIサービスを検討
   - 有料APIサービスの利用を検討
   - または、Yahoo FinanceのWebページからスクレイピング（利用規約に注意）

## テストファイル

テストファイルは `scripts/test-dividend.ts` にあります。

実行方法:
```bash
npx tsx scripts/test-dividend.ts [銘柄コード]
```

例:
```bash
npx tsx scripts/test-dividend.ts 7203
npx tsx scripts/test-dividend.ts 9984
npx tsx scripts/test-dividend.ts 6481
```

