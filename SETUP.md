## 目次

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [開発環境セットアップガイド](#%E9%96%8B%E7%99%BA%E7%92%B0%E5%A2%83%E3%82%BB%E3%83%83%E3%83%88%E3%82%A2%E3%83%83%E3%83%97%E3%82%AC%E3%82%A4%E3%83%89)
  - [前提条件](#%E5%89%8D%E6%8F%90%E6%9D%A1%E4%BB%B6)
  - [セットアップ手順](#%E3%82%BB%E3%83%83%E3%83%88%E3%82%A2%E3%83%83%E3%83%97%E6%89%8B%E9%A0%86)
    - [1. リポジトリのクローン](#1-%E3%83%AA%E3%83%9D%E3%82%B8%E3%83%88%E3%83%AA%E3%81%AE%E3%82%AF%E3%83%AD%E3%83%BC%E3%83%B3)
    - [2. 依存パッケージのインストール](#2-%E4%BE%9D%E5%AD%98%E3%83%91%E3%83%83%E3%82%B1%E3%83%BC%E3%82%B8%E3%81%AE%E3%82%A4%E3%83%B3%E3%82%B9%E3%83%88%E3%83%BC%E3%83%AB)
    - [3. 環境の確認](#3-%E7%92%B0%E5%A2%83%E3%81%AE%E7%A2%BA%E8%AA%8D)
  - [開発ワークフロー](#%E9%96%8B%E7%99%BA%E3%83%AF%E3%83%BC%E3%82%AF%E3%83%95%E3%83%AD%E3%83%BC)
    - [新しいリポジトリ情報の追加](#%E6%96%B0%E3%81%97%E3%81%84%E3%83%AA%E3%83%9D%E3%82%B8%E3%83%88%E3%83%AA%E6%83%85%E5%A0%B1%E3%81%AE%E8%BF%BD%E5%8A%A0)
    - [READMEの検証](#readme%E3%81%AE%E6%A4%9C%E8%A8%BC)
    - [目次の更新](#%E7%9B%AE%E6%AC%A1%E3%81%AE%E6%9B%B4%E6%96%B0)
  - [トラブルシューティング](#%E3%83%88%E3%83%A9%E3%83%96%E3%83%AB%E3%82%B7%E3%83%A5%E3%83%BC%E3%83%86%E3%82%A3%E3%83%B3%E3%82%B0)
    - [doctocがインストールされていない場合](#doctoc%E3%81%8C%E3%82%A4%E3%83%B3%E3%82%B9%E3%83%88%E3%83%BC%E3%83%AB%E3%81%95%E3%82%8C%E3%81%A6%E3%81%84%E3%81%AA%E3%81%84%E5%A0%B4%E5%90%88)
    - [GitHubワークフローエラー](#github%E3%83%AF%E3%83%BC%E3%82%AF%E3%83%95%E3%83%AD%E3%83%BC%E3%82%A8%E3%83%A9%E3%83%BC)
  - [問題が発生した場合](#%E5%95%8F%E9%A1%8C%E3%81%8C%E7%99%BA%E7%94%9F%E3%81%97%E3%81%9F%E5%A0%B4%E5%90%88)
  - [ディレクトリ構造](#%E3%83%87%E3%82%A3%E3%83%AC%E3%82%AF%E3%83%88%E3%83%AA%E6%A7%8B%E9%80%A0)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# 開発環境セットアップガイド

このガイドでは、リポジトリ管理システムの開発環境をセットアップする手順を説明します。

## 前提条件

- [Node.js](https://nodejs.org/) v14以上
- [npm](https://www.npmjs.com/) v6以上
- [Git](https://git-scm.com/) v2.20以上

## セットアップ手順

### 1. リポジトリのクローン

```bash
git clone https://github.com/YourUsername/repositories-summary.git
cd repositories-summary
```

### 2. 依存パッケージのインストール

```bash
npm install
```

これにより、必要なパッケージ（doctocなど）がインストールされます。

### 3. 環境の確認

セットアップが正常に完了したことを確認するために、以下のコマンドを実行します：

```bash
npm run validate
```

このコマンドはREADMEの形式チェックと目次更新を行います。エラーがなければ環境のセットアップは完了です。

## 開発ワークフロー

### 新しいリポジトリ情報の追加

1. リポジトリ情報追加スクリプトを実行

```bash
npm run add-repo
```

2. プロンプトに従って必要な情報を入力
3. 追加内容を確認
4. 変更をコミットして、プルリクエストを作成

### READMEの検証

READMEの形式が正しいことを確認するには：

```bash
npm run lint
```

### 目次の更新

READMEの目次を更新するには：

```bash
npm run update-toc
```

## トラブルシューティング

### doctocがインストールされていない場合

```bash
npm install -g doctoc
```

### GitHubワークフローエラー

GitHub Actionsでエラーが発生した場合は、ローカルでまず検証コマンドを実行して問題を特定してください：

```bash
npm run validate
```

## 問題が発生した場合

問題や質問がある場合は、[Issues](https://github.com/YourUsername/repositories-summary/issues)に問題を報告してください。

## ディレクトリ構造

```
repositories-summary/
├── .github/               # GitHub関連設定
│   ├── ISSUE_TEMPLATE/    # Issueテンプレート
│   └── workflows/         # GitHub Actionsワークフロー
├── assets/                # 静的アセット
│   └── screenshots/       # リポジトリのスクリーンショット
├── docs/                  # ドキュメント
│   ├── category_guideline.md  # カテゴリ分類ガイドライン
│   └── emoji_guideline.md     # アイコン選定ガイドライン
├── scripts/               # ユーティリティスクリプト
│   ├── add_repository.js  # リポジトリ追加スクリプト
│   ├── check_icons.js     # アイコン重複チェック
│   ├── lint_readme.js     # README検証
│   └── update_toc.sh      # 目次更新
├── templates/             # テンプレート
│   └── repository_template.md  # リポジトリ情報テンプレート
├── .gitignore             # Gitの除外設定
├── CODE_OF_CONDUCT.md     # 行動規範
├── CONTRIBUTING.md        # コントリビューションガイド
├── LICENSE                # ライセンス情報
├── README.md              # メインのドキュメント
├── SETUP.md               # 本セットアップガイド
└── package.json           # npm設定
``` 