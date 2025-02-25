#!/bin/bash

# ===================================================
# GitHubリポジトリ同期スクリプト
# 
# 機能:
#   - 指定されたGitHubユーザーのリポジトリ情報を取得し、
#     README.mdを自動更新します。
#   - 新しいリポジトリの追加や、既存リポジトリの説明更新を
#     対話的に処理できます。
# ===================================================

# UTF-8環境設定
export LANG=ja_JP.UTF-8
export LC_ALL=ja_JP.UTF-8

# GitHub関連の設定
export GITHUB_USERNAME="2f0833e717"
export GITHUB_TOKEN=""  # トークンが必要な場合は設定

# 開始メッセージ
echo "====================================="
echo "  リポジトリ情報同期ツール自動実行"
echo "====================================="
echo "スクリプト実行開始: リポジトリ同期を開始します"
echo "スクリプトノーマルモード: デバッグ出力は無効化されています"

# expectコマンドのチェック
if ! command -v expect &> /dev/null; then
    echo "expectコマンドが見つかりません。インストールしてください。"
    echo "sudo apt install expect"
    exit 1
fi

# ログファイル設定
LOG_FILE="run_sync.log"
> $LOG_FILE  # ログファイルの初期化

# expectスクリプトを使用してプロンプト応答を自動化
expect <<EOF | tee -a $LOG_FILE
# デバッグモード設定（0=無効、1=有効）
exp_internal 0

# タイムアウト設定（30秒）
set timeout 30

# npmコマンドを実行
spawn env LANG=ja_JP.UTF-8 LC_ALL=ja_JP.UTF-8 npm run sync-repos

# プロンプトと応答のパターン
expect {
    "GitHub APIトークンを入力してください*" {
        send "\r"
    }
    "GitHub APIトークン*" {
        send "\r"
    }
    "GitHubユーザー名*" {
        send "2f0833e717\r"
    }
    # 新しいリポジトリの追加
    "新しいリポジトリをREADMEに追加しますか？*" {
        send "y\r"
        exp_continue
    }
    # 既存のリポジトリの更新
    "既存のリポジトリ情報を更新しますか？*" {
        send "y\r"
        exp_continue
    }
    # 目次の更新
    "READMEの目次を更新しますか？*" {
        send "y\r"
        exp_continue
    }
    timeout {
        puts "タイムアウトが発生しました。"
        exit 1
    }
    eof {
        puts "スクリプトの実行が完了しました。"
    }
}
EOF

echo "スクリプト実行完了"
echo "====================================="

exit 0 