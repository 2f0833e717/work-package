#!/usr/bin/env node

/**
 * README.mdの形式を検証するためのリンタースクリプト
 * 各リポジトリ情報が正しいフォーマットで記述されているか確認します
 */

const fs = require('fs');
const path = require('path');

// READMEファイルを読み込む
const readmePath = path.join(process.cwd(), 'README.md');
if (!fs.existsSync(readmePath)) {
  console.error('エラー: README.mdファイルが見つかりません。');
  process.exit(1);
}

const readmeContent = fs.readFileSync(readmePath, 'utf8');
const lines = readmeContent.split('\n');

// カテゴリと各リポジトリのセクションを検証
const categories = ['# ポートフォリオ', '# 業務用ツール', '# 学習用リポジトリ'];
const foundCategories = [];
const repositories = [];
let currentCategory = null;
let lineNum = 0;
let errors = [];

function addError(line, message) {
  errors.push(`行 ${line}: ${message}`);
}

// 各行を検証
lines.forEach((line, index) => {
  lineNum = index + 1;
  
  // カテゴリの検出
  if (line.startsWith('# ') && categories.includes(line.split(' 🖼️')[0].split(' 🛠️')[0].split(' 📚')[0])) {
    currentCategory = line;
    foundCategories.push(line);
  }
  
  // リポジトリの検出
  if (line.startsWith('## ') && !line.includes('目次') && currentCategory) {
    const repoName = line.substring(3).trim();
    repositories.push({
      name: repoName,
      category: currentCategory,
      line: lineNum
    });
    
    // 次の行が空行かチェック
    if (lines[index + 1] !== '') {
      addError(lineNum + 1, `リポジトリ名の後には空行が必要です: ${repoName}`);
    }
    
    // 概要セクションの存在確認
    if (!lines[index + 2] || !lines[index + 2].startsWith('### 概要(')) {
      addError(lineNum, `リポジトリ「${repoName}」の概要セクションが見つかりません`);
    } else if (!lines[index + 2].includes(repoName)) {
      addError(lineNum + 2, `概要セクションにリポジトリ名が含まれていません: ${lines[index + 2]}`);
    } else if (!lines[index + 2].match(/\s[🔍📂🎚️🎬🔗🎤⚙️⌨️👁️📸🔑⏱️🔒💻🚀📎🧰✉️📝🔷☁️🐳📊🔥📦]/)) {
      addError(lineNum + 2, `概要セクションに絵文字アイコンがありません: ${lines[index + 2]}`);
    }
    
    // 概要の内容行数チェック
    let overviewLines = 0;
    for (let i = index + 3; i < lines.length; i++) {
      if (lines[i].startsWith('###')) break;
      if (lines[i].trim() !== '') overviewLines++;
    }
    
    if (overviewLines < 1 || overviewLines > 3) {
      addError(lineNum + 3, `リポジトリ「${repoName}」の概要は1-3行である必要があります (現在: ${overviewLines}行)`);
    }
    
    // アクセス先セクションの存在確認
    let accessLine = 0;
    for (let i = index + 2; i < lines.length; i++) {
      if (lines[i].startsWith('### アクセス先(')) {
        accessLine = i;
        break;
      }
      if (i > index + 10) break; // 10行以内に見つからなければ終了
    }
    
    if (accessLine === 0) {
      addError(lineNum, `リポジトリ「${repoName}」のアクセス先セクションが見つかりません`);
    } else if (!lines[accessLine].includes(repoName)) {
      addError(accessLine + 1, `アクセス先セクションにリポジトリ名が含まれていません: ${lines[accessLine]}`);
    }
    
    // アクセス先のURL形式チェック
    if (accessLine > 0 && lines[accessLine + 1]) {
      const url = lines[accessLine + 1].trim();
      if (!url.startsWith('https://github.com/')) {
        addError(accessLine + 2, `アクセス先URLの形式が正しくありません: ${url}`);
      }
    }
    
    // 説明セクションの存在確認
    let descLine = 0;
    for (let i = accessLine + 2; i < lines.length; i++) {
      if (lines[i].startsWith('### 説明(')) {
        descLine = i;
        break;
      }
      if (i > accessLine + 5) break; // 5行以内に見つからなければ終了
    }
    
    if (descLine === 0) {
      addError(lineNum, `リポジトリ「${repoName}」の説明セクションが見つかりません`);
    } else if (!lines[descLine].includes(repoName)) {
      addError(descLine + 1, `説明セクションにリポジトリ名が含まれていません: ${lines[descLine]}`);
    }
    
    // 説明の内容行数チェック
    let descLines = 0;
    for (let i = descLine + 1; i < lines.length; i++) {
      if (lines[i].startsWith('#')) break;
      if (lines[i].trim() !== '') descLines++;
    }
    
    if (descLines < 1 || descLines > 3) {
      addError(descLine + 1, `リポジトリ「${repoName}」の説明は1-3行である必要があります (現在: ${descLines}行)`);
    }
  }
});

// 必須カテゴリの存在確認
categories.forEach(category => {
  if (!foundCategories.find(c => c.split(' ')[1] === category.split(' ')[1])) {
    addError(0, `必須カテゴリが見つかりません: ${category}`);
  }
});

// 結果出力
if (errors.length === 0) {
  console.log('検証成功: README.mdは正しい形式で記述されています。');
  console.log(`カテゴリ数: ${foundCategories.length}`);
  console.log(`リポジトリ数: ${repositories.length}`);
} else {
  console.error(`エラー (${errors.length}件):`);
  errors.forEach(error => {
    console.error(` - ${error}`);
  });
  process.exit(1);
}

process.exit(0); 