#!/bin/bash

# READMEの目次を自動更新するスクリプト

# 現在のディレクトリがリポジトリのルートディレクトリであるか確認
if [ ! -f "README.md" ]; then
  echo "エラー: README.mdファイルが見つかりません。"
  echo "このスクリプトはリポジトリのルートディレクトリから実行してください。"
  exit 1
fi

# doctocコマンドが利用可能か確認
if ! command -v doctoc &> /dev/null; then
  echo "doctocがインストールされていません。インストールを開始します..."
  npm install -g doctoc
  
  # インストール確認
  if ! command -v doctoc &> /dev/null; then
    echo "エラー: doctocのインストールに失敗しました。"
    echo "手動でインストールしてください: npm install -g doctoc"
    exit 1
  fi
  
  echo "doctocがインストールされました。"
fi

# READMEの目次を更新
echo "READMEの目次を更新中..."
doctoc README.md

# 更新完了確認
if [ $? -eq 0 ]; then
  echo "目次の更新が完了しました。"
else
  echo "エラー: 目次の更新に失敗しました。"
  exit 1
fi

exit 0 