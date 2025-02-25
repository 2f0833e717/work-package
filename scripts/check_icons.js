#!/usr/bin/env node

/**
 * リポジトリ情報にあるアイコン（絵文字）の一貫性をチェックするスクリプト
 * 
 * 使用方法:
 * npm run check-icons
 * 
 * 機能:
 * - README.mdからリポジトリ情報とアイコンを抽出
 * - カテゴリ内での重複チェック
 * - 不適切なアイコンの検出
 * - アイコン選定のガイドラインとの整合性確認
 */

const fs = require('fs');
const path = require('path');

// 設定
const README_PATH = path.join(process.cwd(), 'README.md');
const EMOJI_GUIDELINE_PATH = path.join(process.cwd(), 'docs', 'emoji_guideline.md');

// カテゴリとその推奨アイコン
const CATEGORIES = {
  'ポートフォリオ': ['🎨', '📱', '🌐', '📊', '🖼️', '📈', '🎬', '🎮', '🎯', '📚'],
  'ビジネスツール': ['🛠️', '📝', '📋', '📁', '📅', '📊', '💼', '🔧', '⚙️', '📈'],
  '学習リポジトリ': ['🎓', '📚', '💻', '🔍', '🧠', '🧪', '🔬', '📖', '🧩', '🧮']
};

// メイン関数
function main() {
  console.log('=== リポジトリアイコンチェックツール ===\n');
  
  // READMEファイルの存在確認
  if (!fs.existsSync(README_PATH)) {
    console.error('エラー: README.mdファイルが見つかりません。');
    process.exit(1);
  }
  
  // READMEの内容を読み込む
  const readmeContent = fs.readFileSync(README_PATH, 'utf8');
  
  // リポジトリ情報とアイコンを抽出
  const repositories = extractRepositories(readmeContent);
  
  // カテゴリごとにアイコンをグループ化
  const categorizedIcons = categorizeIcons(repositories);
  
  // アイコンの重複チェック
  checkDuplicateIcons(categorizedIcons);
  
  // アイコンとカテゴリの整合性チェック
  checkIconCategoryConsistency(categorizedIcons);
  
  console.log('\n✅ アイコンチェックが完了しました。');
}

// READMEからリポジトリ情報を抽出
function extractRepositories(content) {
  const repositories = [];
  const lines = content.split('\n');
  
  // カテゴリ情報
  let currentCategory = '';
  
  for (let i = 0; i < lines.length; i++) {
    // カテゴリの検出
    if (lines[i].startsWith('## ') && !lines[i].includes('リポジトリ管理ツール')) {
      currentCategory = lines[i].replace('## ', '').trim();
      continue;
    }
    
    // リポジトリ名とアイコンの検出
    if (lines[i].startsWith('### ')) {
      const repoLine = lines[i].replace('### ', '').trim();
      const emojiMatch = repoLine.match(/^([\p{Emoji}\u200d]+)\s+(.+)$/u);
      
      if (emojiMatch) {
        repositories.push({
          name: emojiMatch[2].trim(),
          icon: emojiMatch[1].trim(),
          category: currentCategory
        });
      } else {
        repositories.push({
          name: repoLine,
          icon: '',
          category: currentCategory
        });
      }
    }
  }
  
  return repositories;
}

// カテゴリごとにアイコンをグループ化
function categorizeIcons(repositories) {
  const categorized = {};
  
  repositories.forEach(repo => {
    if (!categorized[repo.category]) {
      categorized[repo.category] = [];
    }
    
    categorized[repo.category].push({
      name: repo.name,
      icon: repo.icon
    });
  });
  
  return categorized;
}

// アイコンの重複チェック
function checkDuplicateIcons(categorizedIcons) {
  console.log('カテゴリ内のアイコン重複チェック:');
  console.log('---------------------------');
  
  let foundDuplicates = false;
  
  for (const [category, repos] of Object.entries(categorizedIcons)) {
    console.log(`\n${category}:`);
    
    const icons = {};
    const duplicates = [];
    
    repos.forEach(repo => {
      if (!repo.icon) return;
      
      if (icons[repo.icon]) {
        duplicates.push({
          icon: repo.icon,
          repos: [...icons[repo.icon], repo.name]
        });
        icons[repo.icon] = [...icons[repo.icon], repo.name];
      } else {
        icons[repo.icon] = [repo.name];
      }
    });
    
    if (duplicates.length === 0) {
      console.log('  ✓ 重複なし');
    } else {
      foundDuplicates = true;
      duplicates.forEach(duplicate => {
        console.log(`  ⚠️ ${duplicate.icon} が重複しています:`);
        duplicate.repos.forEach(repo => {
          console.log(`    - ${repo}`);
        });
      });
    }
  }
  
  if (foundDuplicates) {
    console.log('\n⚠️ 重複したアイコンが見つかりました。異なるアイコンの使用を検討してください。');
  } else {
    console.log('\n✓ アイコンの重複はありません。');
  }
}

// アイコンとカテゴリの整合性チェック
function checkIconCategoryConsistency(categorizedIcons) {
  console.log('\nアイコンとカテゴリの整合性チェック:');
  console.log('---------------------------');
  
  let foundInconsistencies = false;
  
  for (const [category, repos] of Object.entries(categorizedIcons)) {
    console.log(`\n${category}:`);
    
    const recommendedIcons = CATEGORIES[category] || [];
    const nonRecommendedRepos = [];
    
    repos.forEach(repo => {
      if (!repo.icon) {
        nonRecommendedRepos.push({
          name: repo.name,
          reason: 'アイコンがありません'
        });
        return;
      }
      
      if (recommendedIcons.length > 0 && !recommendedIcons.includes(repo.icon)) {
        nonRecommendedRepos.push({
          name: repo.name,
          icon: repo.icon,
          reason: '推奨アイコンリストにありません'
        });
      }
    });
    
    if (nonRecommendedRepos.length === 0) {
      console.log('  ✓ すべてのアイコンが適切です');
    } else {
      foundInconsistencies = true;
      nonRecommendedRepos.forEach(repo => {
        console.log(`  ⚠️ ${repo.name}: ${repo.icon || ''}${repo.reason}`);
      });
      
      if (recommendedIcons.length > 0) {
        console.log(`  推奨アイコン: ${recommendedIcons.join(' ')}`);
      }
    }
  }
  
  if (foundInconsistencies) {
    console.log('\n⚠️ 一部のアイコンが推奨リストにありません。変更を検討してください。');
    
    if (fs.existsSync(EMOJI_GUIDELINE_PATH)) {
      console.log(`詳細なガイドラインは ${EMOJI_GUIDELINE_PATH} を参照してください。`);
    }
  } else {
    console.log('\n✓ すべてのアイコンがカテゴリに適しています。');
  }
}

// スクリプトを実行
main(); 