# GitHub リポジトリ作成手順

## ステップ 1: GitHubでリポジトリを作成

1. GitHub（https://github.com）にログイン
2. 右上の「+」ボタンをクリック → 「New repository」を選択
3. リポジトリ情報を入力:
   - **Repository name**: `stock-analysis`（または任意の名前）
   - **Description**: 「個人用の持ち株管理・分析Webアプリケーション」（任意）
   - **Visibility**: Public または Private を選択
   - **重要**: 「Initialize this repository with a README」のチェックは**外す**（既にローカルにリポジトリがあるため）
4. 「Create repository」をクリック

## ステップ 2: ローカルで変更をコミット

以下のコマンドを実行:

```bash
# 変更をステージング
git add .

# コミット
git commit -m "Phase 1: データベースとバックエンド基礎実装完了"
```

## ステップ 3: GitHubリポジトリと接続

GitHubで作成したリポジトリのページに表示されるURLを使用します。

**HTTPS の場合:**
```bash
git remote add origin https://github.com/あなたのユーザー名/stock-analysis.git
```

**SSH の場合:**
```bash
git remote add origin git@github.com:あなたのユーザー名/stock-analysis.git
```

## ステップ 4: コードをプッシュ

```bash
# メインブランチをプッシュ
git push -u origin main
```

## 確認

GitHubのリポジトリページを開いて、ファイルが正しくアップロードされているか確認してください。

---

## 注意事項

- `.env.local` ファイルは `.gitignore` に含まれているため、自動的に無視されます（安全です）
- 機密情報（APIキーなど）がコードに含まれていないか確認してください
- 初回プッシュ後、GitHubでリポジトリの設定を確認してください

