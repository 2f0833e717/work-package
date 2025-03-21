#!/usr/bin/env node

/**
 * GitHubリポジトリ情報を一括収集・同期するスクリプト
 * 
 * 使用方法:
 * npm run sync-repos
 * 
 * 機能:
 * - GitHub APIを使用して指定ユーザーの全リポジトリ情報を取得
 * - リポジトリの言語、更新日時、説明などを自動収集
 * - 既存のREADME.mdとの差分を検出
 * - 新しいリポジトリの追加と既存リポジトリ情報の更新
 * - リポジトリの自動分類（言語や説明に基づく）
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const readline = require('readline');
const { execSync } = require('child_process');
const fetch = require('node-fetch');

// 設定
const README_PATH = path.join(process.cwd(), 'README.md');
const TEMPLATE_PATH = path.join(process.cwd(), 'templates', 'repository_template.md');
const GITHUB_API_URL = 'https://api.github.com';

// カテゴリ分類のためのキーワード
const CATEGORY_KEYWORDS = {
  'ポートフォリオ': ['portfolio', 'app', 'website', 'ui', 'frontend', 'application', 'web', 'mobile', 'dashboard', 'react'],
  'ビジネスツール': ['tool', 'utility', 'automation', 'business', 'productivity', 'workflow', 'generator', 'cli', 'script'],
  '学習用リポジトリ': ['tutorial', 'learning', 'example', 'study', 'demo', 'poc', 'sample', 'experiment', 'test', 'practice', 'manual']
};

// 言語とアイコンの対応
const LANGUAGE_ICONS = {
  'JavaScript': '📜',
  'TypeScript': '📘',
  'Python': '🐍',
  'Java': '☕',
  'C#': '🔷',
  'PHP': '🐘',
  'HTML': '🌐',
  'CSS': '🎨',
  'Go': '🐹',
  'Ruby': '💎',
  'Shell': '🐚',
  'Rust': '⚙️',
  'C++': '🧮',
  'C': '🔧',
  'Dockerfile': '🐳',
  'Vue': '🟩',
  'React': '⚛️'
};

// デフォルトアイコン設定
const DEFAULT_ICONS = {
  'ポートフォリオ': '🖼️',
  'ビジネスツール': '🛠️',
  '学習用リポジトリ': '📚'
};

// メイン関数
async function main() {
  try {
    // 開始メッセージ
    console.log('🚀 GitHub リポジトリ同期ツールを開始します...');
    
    // 環境変数のチェック
    const token = process.env.GITHUB_TOKEN;
    // const username = process.env.GITHUB_USERNAME;
    const username = "2f0833e717";
    
    if (!username) {
      throw new Error('GitHubユーザー名が設定されていません。GITHUB_USERNAME環境変数を設定してください。');
    }
    
    console.log(`GitHub ユーザー: ${username}`);
    if (token) {
      console.log('認証トークンが設定されています。');
    } else {
      console.log('認証トークンなしで公開リポジトリのみを取得します。');
    }
    
    // リポジトリデータの取得
    const repos = await fetchRepositories(username, token);
    console.log(`${repos.length}個のリポジトリが見つかりました。\n`);
    
    // READMEファイルを更新する
    let updatedContent = await updateReadme(repos, fs.readFileSync(README_PATH, 'utf8'));
    
    console.log('\n✅ リポジトリ同期が完了しました。');
    process.exit(0);
  } catch (error) {
    console.error(`❌ エラーが発生しました: ${error.message}`);
    process.exit(1);
  }
}

// GitHubからリポジトリ情報を取得
async function fetchRepositories(username, token) {
  // API URLの構築
  const apiUrl = `https://api.github.com/users/${username}/repos?per_page=100`;
  
  // リクエストヘッダーの設定
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Repository-Sync-Tool'
  };
  
  // 認証トークンがある場合は追加
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }
  
  try {
    // GitHubのAPIを呼び出す
    console.log(`${apiUrl} にリクエストを送信中...`);
    const response = await fetch(apiUrl, { headers });
    
    // レスポンス処理
    return await handleResponse(response);
  } catch (error) {
    console.error(`リポジトリ取得中にエラーが発生しました: ${error.message}`);
    throw error;
  }
}

// APIレスポンスのハンドリング
async function handleResponse(response) {
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`ユーザーが見つかりません。GitHubユーザー名を確認してください。`);
    } else if (response.status === 401) {
      throw new Error(`認証エラー：トークンが無効か期限切れです。`);
    } else {
      throw new Error(`GitHub APIエラー (${response.status}): ${response.statusText}`);
    }
  }
  
  // レスポンスをJSONとして解析
  const data = await response.json();
  
  // レスポンスが配列でない場合（エラーメッセージなど）
  if (!Array.isArray(data)) {
    if (data.message) {
      throw new Error(`GitHub API: ${data.message}`);
    } else {
      throw new Error('予期しないレスポンス形式です。');
    }
  }
  
  // フォークを除外し、作成日でソート
  const filteredRepos = data
    .filter(repo => !repo.fork)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  
  console.log(`${data.length}個のリポジトリが取得され、${filteredRepos.length}個が対象となりました（フォークを除外）。`);
  
  return filteredRepos;
}

// リポジトリ情報をREADMEから抽出
function extractRepositories(content) {
  const lines = content.split('\n');
  const repos = [];
  let currentRepo = null;
  let currentCategory = '';
  let description = '';
  let url = '';
  let category = '';
  let icon = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // カテゴリ行の検出（# で始まる行）
    if (line.match(/^#\s+/)) {
      const categoryLine = line.replace(/^#\s+/, '').trim();
      // カテゴリ名とアイコンを分離
      currentCategory = categoryLine.split(' ')[0].trim();
      // 「学習リポジトリ」を「学習用リポジトリ」に標準化
      if (currentCategory === '学習リポジトリ') {
        currentCategory = '学習用リポジトリ';
      }
      continue;
    }
    
    // リポジトリ名の検出（## で始まる行）
    if (line.match(/^##\s+/)) {
      // 前のリポジトリがあれば保存
      if (currentRepo) {
        repos.push({
          name: currentRepo,
          category,
          icon,
          description,
          url
        });
      }
      
      // 新しいリポジトリの初期化
      currentRepo = line.replace(/^##\s+/, '').trim();
      description = '';
      url = '';
      category = currentCategory;
      icon = '';
      continue;
    }
    
    // アイコンの検出
    const iconMatch = line.match(/[^\s]+\s+([\p{Emoji}\p{Emoji_Presentation}\p{Emoji_Modifier}\p{Emoji_Component}]+)$/u);
    if (iconMatch && line.includes('概要(') && currentRepo) {
      icon = iconMatch[1];
      description = line.replace(/^###\s+概要\(.+\)\s+[\p{Emoji}\p{Emoji_Presentation}\p{Emoji_Modifier}\p{Emoji_Component}]+$/u, '').trim();
      if (!description) {
        // 次の行を説明として使用
        if (i + 1 < lines.length) {
          description = lines[i + 1].trim();
        }
      }
      continue;
    }
    
    // URLの検出
    if (line.includes('アクセス先(') && currentRepo) {
      // URL行の次の行をURLとして使用
      if (i + 1 < lines.length) {
        url = lines[i + 1].trim();
      }
      continue;
    }
    
    // 説明の検出（### 説明 で始まる行の次の行）
    if (line.includes('説明(') && currentRepo) {
      let descLines = [];
      // 説明行の次の行から、空白でない行かつ次の#で始まる行まで検出
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim();
        // 終了条件：次の見出しまたは空行が3つ続く
        if (nextLine.startsWith('#') || (nextLine === '' && (j + 1 >= lines.length || lines[j + 1].trim() === '' || lines[j + 1].trim().startsWith('#')))) {
          break;
        }
        if (nextLine !== '') {
          descLines.push(nextLine);
        }
      }
      
      if (descLines.length > 0) {
        description = descLines.join('\n');
      } else {
        // 説明が空の場合
        description = '';
      }
      continue;
    }
  }
  
  // 最後のリポジトリを追加
  if (currentRepo) {
    repos.push({
      name: currentRepo,
      category,
      icon,
      description,
      url
    });
  }
  
  return repos;
}

// リポジトリのカテゴリを予測
function predictCategory(repo) {
  // 言語や説明からカテゴリを予測
  const description = (repo.description || '').toLowerCase();
  const name = repo.name.toLowerCase();
  const language = (repo.language || '').toLowerCase();
  
  let scores = {
    'ポートフォリオ': 0,
    'ビジネスツール': 0,
    '学習用リポジトリ': 0
  };
  
  // キーワードによるスコアリング
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (description.includes(keyword)) scores[category] += 2;
      if (name.includes(keyword)) scores[category] += 3;
    }
  }
  
  // 言語によるヒューリスティック
  if (['javascript', 'typescript', 'react', 'vue', 'angular'].includes(language)) {
    scores['ポートフォリオ'] += 1;
  } else if (['python', 'bash', 'shell', 'perl'].includes(language)) {
    scores['ビジネスツール'] += 1;
  }
  
  // 学習リポジトリの特徴
  if (description.includes('learn') || description.includes('study') || 
      name.includes('learn') || name.includes('study') || 
      description.includes('example') || name.includes('example') ||
      name.includes('manual')) {
    scores['学習用リポジトリ'] += 3;
  }
  
  // 最高スコアのカテゴリを選択
  let maxScore = 0;
  let predictedCategory = '学習用リポジトリ'; // デフォルト
  
  for (const [category, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      predictedCategory = category;
    }
  }
  
  // 「学習リポジトリ」を「学習用リポジトリ」に正規化
  if (predictedCategory === '学習リポジトリ') {
    predictedCategory = '学習用リポジトリ';
  }
  
  return predictedCategory;
}

// リポジトリのアイコンを選択
function selectIcon(repo, category) {
  // 言語に基づくアイコン
  if (repo.language && LANGUAGE_ICONS[repo.language]) {
    return LANGUAGE_ICONS[repo.language];
  }
  
  // カテゴリに基づくデフォルトアイコン
  return DEFAULT_ICONS[category] || '📁';
}

// 新しいリポジトリの処理（重複呼び出しを回避するために分離）
async function processNewRepositories(newRepos, readmeContent) {
  // カテゴリポジションの特定
  let lines = readmeContent.split('\n');
  const categoryPositions = {};
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^#\s+.+/)) {
      const categoryLine = lines[i].replace(/^#\s+/, '').trim();
      // カテゴリ名とアイコンを分離
      let category = categoryLine.split(' ')[0].trim();
      // 「学習リポジトリ」と「学習用リポジトリ」を同一視
      if (category === '学習リポジトリ') {
        category = '学習用リポジトリ';
      }
      categoryPositions[category] = i;
      console.log(`カテゴリ「${category}」の位置: ${i}行目`);
    }
  }
  
  let updatedContent = readmeContent;
  const existingCategories = Object.keys(categoryPositions);
  const newCategories = {};
  
  // リポジトリをカテゴリでグループ化
  const reposByCategory = {};
  for (const repo of newRepos) {
    // リポジトリのカテゴリを予測
    let category = predictCategory(repo);
    console.log(`リポジトリ「${repo.name}」のカテゴリ予測結果: ${category}`);
    
    // 既存のカテゴリに一致するか確認
    let foundCategory = null;
    for (const existingCategory of existingCategories) {
      // カテゴリ名の標準化（スペースや「用」の有無を無視）
      const normalizedExisting = existingCategory.replace(/用$/, '').trim();
      const normalizedCategory = category.replace(/用$/, '').trim();
      
      if (normalizedCategory === normalizedExisting ||
          normalizedCategory + 'リポジトリ' === normalizedExisting ||
          normalizedCategory === normalizedExisting + 'リポジトリ') {
        foundCategory = existingCategory;
        break;
      }
    }
    
    if (foundCategory) {
      if (!reposByCategory[foundCategory]) {
        reposByCategory[foundCategory] = [];
      }
      reposByCategory[foundCategory].push(repo);
    } else {
      if (!newCategories[category]) {
        newCategories[category] = [];
      }
      newCategories[category].push(repo);
    }
  }
  
  // 既存カテゴリにリポジトリを追加
  let addedLines = 0;
  for (const [category, repos] of Object.entries(reposByCategory)) {
    for (const repo of repos) {
      // リポジトリのアイコンを選択
      const icon = selectIcon(repo, category);
      console.log(`リポジトリ「${repo.name}」のアイコン選択結果: ${icon}`);
      
      // 説明文を充実させる
      const enhancedDescription = enhanceDescription(repo);
      const cleanDescription = enhancedDescription;
      
      // リポジトリ情報を作成
      const repoContent = `
## ${repo.name}

### 概要(${repo.name}) ${icon}
${repo.description || `${repo.name}リポジトリ`}

### アクセス先(${repo.name})
${repo.html_url || `https://github.com/2f0833e717/${repo.name}`}

### 説明(${repo.name})
${cleanDescription}

`;  // 末尾の改行を1つだけ残す

      // カテゴリの開始位置を調整（これまでに追加された行数を考慮）
      const adjustedCategoryStart = categoryPositions[category] + addedLines;
      
      // 次のカテゴリの開始位置を探す（これまでに追加された行数を考慮）
      let nextCategoryStart = lines.length;
      for (let i = adjustedCategoryStart + 1; i < lines.length; i++) {
        if (lines[i].match(/^#\s+/)) {
          nextCategoryStart = i;
          break;
        }
      }
      
      // 区切り線（---）の位置を探す
      let separatorIndex = -1;
      for (let i = adjustedCategoryStart + 1; i < nextCategoryStart; i++) {
        if (lines[i].trim() === '---') {
          separatorIndex = i;
          break;
        }
      }
      
      // 挿入位置を決定（区切り線の前、または最後のリポジトリの後）
      let insertIndex;
      if (separatorIndex > -1) {
        // 区切り線が見つかった場合、その直前に挿入
        insertIndex = separatorIndex - 1;
      } else {
        // 区切り線が見つからない場合、カテゴリ内の最後のリポジトリを探す
        let lastRepoIndex = -1;
        for (let i = nextCategoryStart - 1; i > adjustedCategoryStart; i--) {
          if (lines[i].match(/^##\s+/) && !lines[i].includes('リポジトリ管理ツール')) {
            lastRepoIndex = i;
            break;
          }
        }
        insertIndex = lastRepoIndex > -1 ? lastRepoIndex : adjustedCategoryStart;
        
        // 最後のリポジトリからその末尾までをスキップ
        if (lastRepoIndex > -1) {
          for (let i = lastRepoIndex; i < nextCategoryStart; i++) {
            if (lines[i].match(/^##\s+/) && i !== lastRepoIndex) {
              insertIndex = i - 1;
              break;
            }
            if (i === nextCategoryStart - 1) {
              insertIndex = i;
            }
          }
        }
      }
      
      console.log(`カテゴリ「${category}」の開始位置: ${adjustedCategoryStart}行目`);
      console.log(`次のカテゴリ位置: ${nextCategoryStart}行目`);
      console.log(`挿入位置: ${insertIndex}行目`);
      
      // 更新後の内容を生成
      const beforeSection = lines.slice(0, insertIndex + 1).join('\n');
      const afterSection = lines.slice(insertIndex + 1).join('\n');
      updatedContent = `${beforeSection}${repoContent}${afterSection}`;
      lines = updatedContent.split('\n'); // 更新された行配列を再生成
      
      // 追加された行数を計算して累積
      const addedContentLines = repoContent.split('\n').length;
      addedLines += addedContentLines;
      
      // カテゴリの位置を更新
      for (const [cat, pos] of Object.entries(categoryPositions)) {
        if (pos > adjustedCategoryStart) {
          categoryPositions[cat] += addedContentLines;
        }
      }
      
      console.log(`リポジトリ「${repo.name}」を「${category}」カテゴリに追加しました（${addedContentLines}行追加）`);
    }
  }
  
  // 新しいカテゴリを追加
  if (Object.keys(newCategories).length > 0) {
    lines = updatedContent.split('\n'); // 更新された行配列を取得
    // リポジトリ管理ツールセクションの位置を見つける
    const toolSectionIndex = lines.findIndex(line => line.includes('リポジトリ管理ツール'));
    let insertPosition = toolSectionIndex > 0 ? toolSectionIndex : lines.length;
    
    console.log(`新しいカテゴリをリポジトリ管理ツールセクションの前（${insertPosition}行目）に挿入します`);
    
    let newSections = '';
    
    // 各新カテゴリの内容を生成
    for (const [category, repos] of Object.entries(newCategories)) {
      const categoryIcon = getCategoryIcon(category);
      const categoryContent = [
        `# ${category} ${categoryIcon}`,
        ...repos.map(repo => {
          const icon = selectIcon(repo, category);
          const enhancedDescription = enhanceDescription(repo);
          return [
            `## ${repo.name}`,
            `### 概要(${repo.name}) ${icon}`,
            repo.description || `${repo.name}リポジトリ`,
            `### アクセス先(${repo.name})`,
            repo.html_url || `https://github.com/2f0833e717/${repo.name}`,
            `### 説明(${repo.name})`,
            enhancedDescription
          ].join('\n');
        }),
        '---'
      ].join('\n');
      
      // カテゴリー間に1つの改行を入れる
      newSections = newSections ? `${newSections}\n${categoryContent}` : categoryContent;
    }
    
    // 更新後の内容を生成（余分な空白行を除去）
    const beforeSection = lines.slice(0, insertPosition).join('\n').trim();
    const afterSection = lines.slice(insertPosition).join('\n').trim();
    
    // 最終的な出力を生成（セクション間の改行を1つに統一）
    updatedContent = `${beforeSection}\n${newSections}\n${afterSection}`.split('\n').filter(line => line.trim()).join('\n');
  }
  
  // 更新したREADMEを保存
  fs.writeFileSync(README_PATH, updatedContent, 'utf8');
  return updatedContent;
}

// 説明文を充実させる関数
function enhanceDescription(repo) {
  // 基本の説明文
  let description = repo.description || `${repo.name}リポジトリの詳細情報`;
  
  // 説明文が短い場合は拡張する
  if (description.split('\n').length < 3) {
    // リポジトリのカテゴリに基づいた補足情報
    let category = predictCategory(repo);
    let additionalInfo = '';
    
    if (category === 'ポートフォリオ') {
      additionalInfo = `\n${repo.name}は最新のWeb技術を活用した実装例として参照できるプロジェクトです。`;
      additionalInfo += `\n// AI拡充指示: GitHub「2f0833e717/${repo.name}」リポジトリについて、Web検索をして内容を分析し、このプロジェクトの目的や特徴について、概要と説明のセクションを編集し3行以内で簡潔に説明してください。`;
    } else if (category === 'ビジネスツール') {
      additionalInfo = `\nこのツールは業務効率化と自動化のために開発されました。`;
      additionalInfo += `\n// AI拡充指示: GitHub「2f0833e717/${repo.name}」リポジトリについて、Web検索をして内容を分析し、このツールの主な機能や用途について、概要と説明のセクションを編集し3行以内で簡潔に説明してください。`;
    } else if (category === '学習用リポジトリ') {
      additionalInfo = `\nこのリポジトリは技術学習と知識共有を目的としています。`;
      additionalInfo += `\n// AI拡充指示: GitHub「2f0833e717/${repo.name}」リポジトリについて、Web検索をして内容を分析し、このリポジトリで扱われている技術や学習内容について、概要と説明のセクションを編集し3行以内で簡潔に説明してください。`;
    }
    
    // 言語情報がある場合は追加
    if (repo.language) {
      additionalInfo += `\n主な開発言語は${repo.language}です。`;
    }
    
    // 拡張した説明文
    description += additionalInfo;
  }
  
  // 行数が3行を超える場合は制限する
  const lines = description.split('\n');
  if (lines.length > 3) {
    // AI指示行は残す（除外しない）
    // 改行が増えすぎないように、3行のみに制限する必要はある
    return lines.slice(0, 3).join('\n');
  }
  
  return description;
}

// カテゴリに対応するアイコンを取得
function getCategoryIcon(category) {
  const categoryIcons = {
    'ポートフォリオ': '🖼️',
    '業務用ツール': '🛠️',
    'ビジネスツール': '🛠️',
    '学習用リポジトリ': '📚',
    '学習リポジトリ': '📚',
    'ユーティリティ': '🔧',
    'ドキュメント': '📄',
    'テンプレート': '📋',
    'API': '🌐',
    'ライブラリ': '📦'
  };
  
  return categoryIcons[category] || '📁';
}

// 既存のリポジトリ情報を更新
async function updateExistingRepositories(repos, existingRepos, readmeContent) {
  let updatedContent = readmeContent;
  let lines = updatedContent.split('\n');
  let updates = 0;
  
  // 既存リポジトリの更新が必要なものを特定
  const reposToUpdate = repos.filter(repo => {
    const existingRepo = existingRepos.find(er => er.name === repo.name);
    return existingRepo && (
      existingRepo.description !== repo.description && repo.description ||
      existingRepo.description === '' || // 説明が空の場合も更新対象に
      existingRepo.description === undefined || // undefinedの場合も
      !existingRepo.description // null、undefined、空文字列の場合も
    );
  });
  
  console.log(`更新が必要なリポジトリ: ${reposToUpdate.length}件`);
  
  if (reposToUpdate.length === 0) {
    console.log('既存リポジトリの更新はありません。');
    return updatedContent;
  }
  
  // 各リポジトリの説明を更新
  for (const repo of reposToUpdate) {
    const existingRepo = existingRepos.find(er => er.name === repo.name);
    
    console.log(`リポジトリ「${repo.name}」の説明を更新:`);
    console.log(`  - 現在の説明: ${existingRepo.description || '説明なし'}`);
    console.log(`  - 新しい説明: ${repo.description || '説明なし'}`);
    
    // 説明を設定（GitHubからの説明が空なら、デフォルトの説明を使用）
    let description = repo.description;
    if (!description) {
      console.log(`  ⚠️ GitHubからの説明が空ですが、デフォルト説明を生成します`);
      description = `${repo.name}リポジトリ`;
    }
    
    // 説明を充実させる
    const enhancedDescription = enhanceDescription({...repo, description});
    
    // AIへの指示行を保持する（削除しない）
    const cleanDescription = enhancedDescription;
    
    // 説明セクションの位置を探す
    let descriptionStart = -1;
    let descriptionEnd = -1;
    
    for (let i = 0; i < lines.length; i++) {
      // リポジトリセクションを見つける
      if (lines[i].includes(`## ${repo.name}`)) {
        // リポジトリセクションから説明セクションを探す
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].includes(`### 説明(${repo.name})`)) {
            descriptionStart = j;
            
            // 次のセクションまたはリポジトリまで
            for (let k = j + 1; k < lines.length; k++) {
              if (lines[k].startsWith('#') || k === lines.length - 1) {
                descriptionEnd = k;
                break;
              }
            }
            
            if (descriptionStart >= 0 && descriptionEnd > descriptionStart) {
              // 説明セクションがある場合、更新
              const beforeSection = lines.slice(0, descriptionStart + 1).join('\n');
              const afterSection = lines.slice(descriptionEnd).join('\n');
              
              // 新しい説明を追加（十分な改行を含める）
              updatedContent = `${beforeSection}\n${cleanDescription}\n\n\n${afterSection}`;
              lines = updatedContent.split('\n'); // 更新後の行配列を再生成
              updates++;
              console.log(`  ✅ 説明を更新しました`);
              break;
            }
          }
        }
        break; // リポジトリセクションが見つかったら外側のループを終了
      }
    }
    
    if (descriptionStart === -1) {
      console.log(`  ⚠️ リポジトリ「${repo.name}」の説明セクションが見つかりませんでした`);
    }
  }
  
  console.log(`${updates}件のリポジトリ情報を更新しました`);
  return updatedContent;
}

// READMEファイルを更新する
async function updateReadme(repos, readmeContent) {
  let updatedContent = readmeContent;
  console.log(`現在のREADME.mdサイズ: ${updatedContent.length} バイト`);
  
  // 既存のリポジトリを抽出
  const existingRepos = extractRepositories(updatedContent);
  console.log(`既存のリポジトリ: ${existingRepos.length}件`);
  
  // 既存のリポジトリ名リスト
  const existingRepoNames = existingRepos.map(repo => repo.name);
  
  // 新しいリポジトリを特定
  const newRepos = repos.filter(repo => !existingRepoNames.includes(repo.name));
  console.log(`新しいリポジトリ: ${newRepos.length}件`);
  
  if (newRepos.length > 0) {
    console.log('新しいリポジトリを追加します...');
    console.log(newRepos.map(r => r.name).join(', '));
    
    // 新しいリポジトリがある場合、質問する
    const answer = await question('新しいリポジトリをREADMEに追加しますか？ (y/n): ');
    
    if (answer.toLowerCase() === 'y') {
      updatedContent = await processNewRepositories(newRepos, updatedContent);
      console.log('✅ 新しいリポジトリの追加が完了しました。');
    } else {
      console.log('❌ 新しいリポジトリの追加をスキップしました。');
    }
  } else {
    console.log('新しいリポジトリはありません。');
  }
  
  // 既存のリポジトリ情報を更新
  if (existingRepos.length > 0) {
    console.log('既存のリポジトリ情報を更新します...');
    updatedContent = await updateExistingRepositories(repos, existingRepos, updatedContent);
    console.log('✅ 既存のリポジトリ情報の更新が完了しました。');
  }
  
  // ディレクトリ構造を更新（実装があれば）
  updatedContent = updateDirectoryStructure(updatedContent);
  console.log('✅ ディレクトリ構造の更新が完了しました（適用があれば）。');
  
  // 目次を更新
  updatedContent = updateTableOfContents(updatedContent);
  console.log('ℹ️ 目次の更新はdoctocに任せるため、スキップします。');
  
  // 更新後のREADME.mdサイズを表示
  console.log(`更新後のREADME.mdサイズ: ${updatedContent.length} バイト`);
  
  // 更新したREADMEを保存
  fs.writeFileSync(README_PATH, updatedContent, 'utf8');
  return updatedContent;
}

// ディレクトリ構造の更新（実装があれば）
function updateDirectoryStructure(readmeContent) {
  // ディレクトリ構造の更新ロジック
  return readmeContent;
}

// 目次の更新
function updateTableOfContents(readmeContent) {
  // 目次の更新はdoctocに任せるため何もしない
  console.log('目次の更新はdoctocに任せるため、この関数では何も行いません。');
  return readmeContent;
}

// プロミスベースの質問関数
async function question(prompt) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise(resolve => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// スクリプトを実行
main(); 