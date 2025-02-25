#!/usr/bin/env node

/**
 * 新しいリポジトリ情報をインタラクティブに追加するスクリプト
 * 
 * 使用方法:
 * npm run add-repo
 * 
 * 機能:
 * - リポジトリ名、URL、説明などの情報を対話形式で入力
 * - 適切なカテゴリへの自動分類提案
 * - アイコン重複チェック＆適切なアイコン提案
 * - README.mdへの情報追加
 * - テンプレートに基づいた一貫性のある形式で追加
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

// 設定
const README_PATH = path.join(process.cwd(), 'README.md');
const TEMPLATE_PATH = path.join(process.cwd(), 'templates', 'repository_template.md');
const EMOJI_GUIDELINE_PATH = path.join(process.cwd(), 'docs', 'emoji_guideline.md');

// カテゴリとその推奨アイコン
const CATEGORIES = {
  'ポートフォリオ': ['🎨', '📱', '🌐', '📊', '🖼️', '📈', '🎬', '🎮', '🎯', '📚'],
  'ビジネスツール': ['🛠️', '📝', '📋', '📁', '📅', '📊', '💼', '🔧', '⚙️', '📈'],
  '学習リポジトリ': ['🎓', '📚', '💻', '🔍', '🧠', '🧪', '🔬', '📖', '🧩', '🧮']
};

// メイン関数
async function main() {
  console.log('=== リポジトリ情報追加ツール ===\n');
  
  // READMEファイルの存在確認
  if (!fs.existsSync(README_PATH)) {
    console.error('エラー: README.mdファイルが見つかりません。');
    process.exit(1);
  }
  
  // テンプレートファイルの存在確認
  let templateContent = '';
  if (fs.existsSync(TEMPLATE_PATH)) {
    templateContent = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  }
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  try {
    // リポジトリ情報の収集
    const repoInfo = await collectRepositoryInfo(rl);
    
    // リポジトリが既に存在するか確認
    const readmeContent = fs.readFileSync(README_PATH, 'utf8');
    if (readmeContent.includes(`## ${repoInfo.name}`) || readmeContent.includes(`### ${repoInfo.name}`)) {
      console.error(`警告: "${repoInfo.name}" は既にREADME.mdに存在します。`);
      const confirmed = await question(rl, '続行しますか？ (y/n): ');
      if (confirmed.toLowerCase() !== 'y') {
        return;
      }
    }
    
    // カテゴリセクションの探索と追加位置の特定
    const lines = readmeContent.split('\n');
    const {categoryFound, insertPosition} = findInsertPosition(lines, repoInfo.category);
    
    if (!categoryFound) {
      console.error(`警告: "${repoInfo.category}" セクションが見つかりませんでした。`);
      const createCategory = await question(rl, '新しいカテゴリセクションを作成しますか？ (y/n): ');
      if (createCategory.toLowerCase() !== 'y') {
        return;
      }
    }
    
    // 追加するリポジトリ情報の作成
    let repoContent = '';
    if (templateContent) {
      // テンプレートを使用
      repoContent = templateContent
        .replace(/\{\{REPO_NAME\}\}/g, repoInfo.name)
        .replace(/\{\{REPO_ICON\}\}/g, repoInfo.icon)
        .replace(/\{\{REPO_URL\}\}/g, repoInfo.url)
        .replace(/\{\{REPO_SUMMARY\}\}/g, repoInfo.summary)
        .replace(/\{\{REPO_DESCRIPTION\}\}/g, repoInfo.description);
    } else {
      // テンプレートがない場合はデフォルト形式
      repoContent = `
## ${repoInfo.name}

### 概要(${repoInfo.name}) ${repoInfo.icon}
${repoInfo.summary}

### アクセス先(${repoInfo.name})
${repoInfo.url}

### 説明(${repoInfo.name})
${repoInfo.description}
`;
    }
    
    // README.mdの更新
    if (categoryFound) {
      // 既存カテゴリに追加
      lines.splice(insertPosition, 0, repoContent);
    } else {
      // 新しいカテゴリを作成して追加
      const categoryContent = `
# ${repoInfo.category} ${getCategoryIcon(repoInfo.category)}

${repoContent}
`;
      lines.push(categoryContent);
    }
    
    // 更新したREADMEを保存
    fs.writeFileSync(README_PATH, lines.join('\n'), 'utf8');
    console.log('README.mdに新しいリポジトリ情報を追加しました。');
    
    // 目次の更新確認
    const updateToc = await question(rl, 'READMEの目次を更新しますか？ (y/n): ');
    if (updateToc.toLowerCase() === 'y') {
      try {
        execSync('npm run update-toc', { stdio: 'inherit' });
        console.log('目次を更新しました。');
      } catch (error) {
        console.error('目次の更新に失敗しました:', error.message);
      }
    }
    
    // アイコンチェックの確認
    const checkIcons = await question(rl, 'アイコンの一貫性をチェックしますか？ (y/n): ');
    if (checkIcons.toLowerCase() === 'y') {
      try {
        execSync('npm run check-icons', { stdio: 'inherit' });
      } catch (error) {
        console.error('アイコンチェックに失敗しました:', error.message);
      }
    }
    
    console.log('\n✅ リポジトリ情報の追加が完了しました。');
  } catch (error) {
    console.error('エラーが発生しました:', error);
  } finally {
    rl.close();
  }
}

// リポジトリ情報を収集
async function collectRepositoryInfo(rl) {
  // リポジトリ名
  const name = await question(rl, 'リポジトリ名を入力してください: ');
  if (!name) {
    throw new Error('リポジトリ名は必須です。');
  }
  
  // リポジトリURL
  const url = await question(rl, 'リポジトリのURLを入力してください: ');
  if (!url) {
    throw new Error('リポジトリのURLは必須です。');
  }
  
  // リポジトリの概要（1〜2文の簡潔な説明）
  const summary = await question(rl, 'リポジトリの概要（1〜2文）を入力してください: ');
  if (!summary) {
    throw new Error('リポジトリの概要は必須です。');
  }
  
  // リポジトリの詳細説明
  const description = await question(rl, 'リポジトリの詳細説明を入力してください: ');
  
  // カテゴリの選択
  console.log('\n利用可能なカテゴリ:');
  const categories = Object.keys(CATEGORIES);
  categories.forEach((category, index) => {
    console.log(`${index + 1}. ${category}`);
  });
  
  let category = '';
  while (!category) {
    const categoryInput = await question(rl, '適用するカテゴリの番号を選択してください（1〜3）: ');
    const categoryIndex = parseInt(categoryInput) - 1;
    
    if (isNaN(categoryIndex) || categoryIndex < 0 || categoryIndex >= categories.length) {
      console.error('無効なカテゴリ番号です。もう一度選択してください。');
    } else {
      category = categories[categoryIndex];
    }
  }
  
  // アイコンの選択
  const availableIcons = CATEGORIES[category] || [];
  const usedIcons = getUsedIcons(category);
  
  console.log('\n推奨アイコン:');
  availableIcons.forEach((icon, index) => {
    const isUsed = usedIcons.includes(icon);
    console.log(`${index + 1}. ${icon} ${isUsed ? '(使用済み)' : ''}`);
  });
  
  let icon = '';
  while (!icon) {
    const iconInput = await question(rl, 'アイコンの番号を選択するか、直接絵文字を入力してください: ');
    
    if (/^\d+$/.test(iconInput)) {
      // 番号が入力された場合
      const iconIndex = parseInt(iconInput) - 1;
      if (isNaN(iconIndex) || iconIndex < 0 || iconIndex >= availableIcons.length) {
        console.error('無効なアイコン番号です。もう一度選択してください。');
      } else {
        icon = availableIcons[iconIndex];
      }
    } else {
      // 直接絵文字が入力された場合
      icon = iconInput.trim();
    }
    
    if (icon && usedIcons.includes(icon)) {
      console.warn(`警告: "${icon}" は既に使用されています。一意性を確保するために別のアイコンを選択することをお勧めします。`);
      const confirmed = await question(rl, 'それでもこのアイコンを使用しますか？ (y/n): ');
      if (confirmed.toLowerCase() !== 'y') {
        icon = '';
      }
    }
  }
  
  // 収集した情報の確認
  console.log('\n== 追加するリポジトリ情報 ==');
  console.log(`名前: ${name}`);
  console.log(`URL: ${url}`);
  console.log(`カテゴリ: ${category}`);
  console.log(`アイコン: ${icon}`);
  console.log(`概要: ${summary}`);
  if (description) {
    console.log(`説明: ${description}`);
  }
  
  const confirmed = await question(rl, '\nこの情報でREADME.mdに追加しますか？ (y/n): ');
  if (confirmed.toLowerCase() !== 'y') {
    throw new Error('操作がキャンセルされました。');
  }
  
  return {
    name,
    url,
    summary,
    description: description || summary,  // 説明がない場合は概要を使用
    category,
    icon
  };
}

// カテゴリに適したアイコンを取得
function getCategoryIcon(category) {
  const categoryIcons = {
    'ポートフォリオ': '🖼️',
    'ビジネスツール': '🛠️',
    '学習リポジトリ': '📚'
  };
  
  return categoryIcons[category] || '';
}

// カテゴリ内で使用済みのアイコンを取得
function getUsedIcons(category) {
  try {
    const readmeContent = fs.readFileSync(README_PATH, 'utf8');
    const lines = readmeContent.split('\n');
    
    const usedIcons = [];
    let inCategory = false;
    
    for (let i = 0; i < lines.length; i++) {
      // カテゴリの開始を検出
      if (lines[i].startsWith(`# ${category}`) || lines[i].startsWith(`## ${category}`)) {
        inCategory = true;
        continue;
      }
      
      // 次のカテゴリの開始を検出（現在のカテゴリの終了）
      if (inCategory && (lines[i].startsWith('# ') || (lines[i].startsWith('## ') && !lines[i].startsWith('### ')))) {
        inCategory = false;
        break;
      }
      
      // カテゴリ内でアイコンを探す
      if (inCategory && lines[i].includes('概要(') && lines[i].includes(')')) {
        const iconMatch = lines[i].match(/\)[\s]*([\p{Emoji}\u200d]+)/u);
        if (iconMatch && iconMatch[1]) {
          usedIcons.push(iconMatch[1].trim());
        }
      }
    }
    
    return usedIcons;
  } catch (error) {
    console.error('アイコン情報の取得に失敗しました:', error);
    return [];
  }
}

// カテゴリセクションと挿入位置を見つける
function findInsertPosition(lines, category) {
  let categoryFound = false;
  let categoryStartLine = -1;
  let nextCategoryLine = -1;
  
  for (let i = 0; i < lines.length; i++) {
    // カテゴリの開始を検出
    if (lines[i].startsWith(`# ${category}`) || lines[i].startsWith(`## ${category}`)) {
      categoryFound = true;
      categoryStartLine = i;
    }
    
    // 次のカテゴリの開始を検出（現在のカテゴリの終了）
    if (categoryFound && (lines[i].startsWith('# ') || (lines[i].startsWith('## ') && !lines[i].startsWith('### ')))) {
      if (i > categoryStartLine) {
        nextCategoryLine = i;
        break;
      }
    }
  }
  
  // 挿入位置の決定
  let insertPosition = -1;
  if (categoryFound) {
    if (nextCategoryLine !== -1) {
      // 次のカテゴリの直前に挿入
      insertPosition = nextCategoryLine;
    } else {
      // カテゴリの最後に挿入
      insertPosition = lines.length;
    }
  }
  
  return { categoryFound, insertPosition };
}

// プロミスベースの質問関数
function question(rl, q) {
  return new Promise(resolve => {
    rl.question(q, answer => {
      resolve(answer);
    });
  });
}

// スクリプトを実行
main(); 