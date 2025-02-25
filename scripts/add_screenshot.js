#!/usr/bin/env node

/**
 * リポジトリのスクリーンショットを追加・管理するスクリプト
 * 
 * 使用方法:
 * npm run add-screenshot
 * 
 * 機能:
 * - リポジトリのスクリーンショット画像をassets/screenshotsディレクトリに保存
 * - README.mdのリポジトリ説明に画像リンクを追加
 * - サイズやクオリティの最適化
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

// 設定
const SCREENSHOTS_DIR = path.join(process.cwd(), 'assets', 'screenshots');
const README_PATH = path.join(process.cwd(), 'README.md');
const VALID_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
const MAX_FILE_SIZE_MB = 0.5; // 500KB

// メイン関数
async function main() {
  console.log('=== スクリーンショット追加・管理ツール ===\n');
  
  // assets/screenshotsディレクトリの存在確認と作成
  ensureDirectoryExists(SCREENSHOTS_DIR);
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    // リポジトリ名の入力
    const repoName = await question(rl, 'リポジトリ名を入力してください: ');
    if (!repoName) {
      console.error('エラー: リポジトリ名は必須です。');
      return;
    }
    
    // READMEにリポジトリが存在するか確認
    const readmeContent = fs.readFileSync(README_PATH, 'utf8');
    if (!readmeContent.includes(`## ${repoName}`) && !readmeContent.includes(`### ${repoName}`)) {
      console.error(`エラー: "${repoName}" はREADME.mdに存在しません。`);
      const confirmed = await question(rl, '続行しますか？ (y/n): ');
      if (confirmed.toLowerCase() !== 'y') {
        return;
      }
    }
    
    // スクリーンショットファイルパスの入力
    const filePath = await question(rl, 'スクリーンショットファイルパスを入力してください: ');
    if (!filePath || !fs.existsSync(filePath)) {
      console.error('エラー: ファイルが存在しません。');
      return;
    }
    
    // ファイル拡張子チェック
    const ext = path.extname(filePath).toLowerCase();
    if (!VALID_EXTENSIONS.includes(ext)) {
      console.error(`エラー: サポートされていないファイル形式です。サポート形式: ${VALID_EXTENSIONS.join(', ')}`);
      return;
    }
    
    // ファイルサイズチェック
    const stats = fs.statSync(filePath);
    const fileSizeMB = stats.size / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      console.log(`警告: ファイルサイズが大きすぎます (${fileSizeMB.toFixed(2)}MB)。最適なサイズは${MAX_FILE_SIZE_MB}MB以下です。`);
      const compress = await question(rl, '画像を最適化しますか？ (y/n): ');
      if (compress.toLowerCase() === 'y') {
        // TODO: 画像最適化処理（npmパッケージのインストールが必要なため現在は未実装）
        console.log('画像最適化は現在実装されていません。手動で最適化してください。');
      }
    }
    
    // ファイルコピー
    const fileName = `${repoName.toLowerCase().replace(/[^a-z0-9]/g, '_')}${ext}`;
    const destPath = path.join(SCREENSHOTS_DIR, fileName);
    fs.copyFileSync(filePath, destPath);
    console.log(`スクリーンショットを保存しました: ${destPath}`);
    
    // 代替テキストの入力
    const altText = await question(rl, 'スクリーンショットの代替テキストを入力してください: ');
    
    // README.mdの更新確認
    const updateReadme = await question(rl, 'README.mdにスクリーンショットリンクを追加しますか？ (y/n): ');
    if (updateReadme.toLowerCase() === 'y') {
      // 相対パス
      const relativePath = path.relative(process.cwd(), destPath).replace(/\\/g, '/');
      const imageLink = `\n\n![${altText || repoName}](${relativePath})\n`;
      
      // 保守的な更新方法: READMEの内容を行ごとにスキャンし、リポジトリの説明セクションを見つけてからリンクを追加
      const lines = readmeContent.split('\n');
      let repoFound = false;
      let descriptionSectionEnd = -1;
      
      for (let i = 0; i < lines.length; i++) {
        if (!repoFound && (lines[i] === `## ${repoName}` || lines[i] === `### ${repoName}`)) {
          repoFound = true;
          continue;
        }
        
        if (repoFound) {
          // リポジトリの説明セクションの終わりを探す (次のセクションの開始)
          if (lines[i].startsWith('##')) {
            descriptionSectionEnd = i;
            break;
          }
          // ファイルの終わりまで説明が続く場合
          if (i === lines.length - 1) {
            descriptionSectionEnd = lines.length;
          }
        }
      }
      
      if (repoFound && descriptionSectionEnd > 0) {
        // 画像リンクを挿入
        lines.splice(descriptionSectionEnd, 0, imageLink);
        fs.writeFileSync(README_PATH, lines.join('\n'), 'utf8');
        console.log('README.mdを更新しました。');
      } else {
        console.error(`警告: "${repoName}" の説明セクションを特定できませんでした。手動で画像リンクを追加してください。`);
        console.log(`追加する画像リンク: ${imageLink}`);
      }
    }
    
    console.log('\n✅ スクリーンショットの追加が完了しました。');
  } catch (error) {
    console.error('エラーが発生しました:', error);
  } finally {
    rl.close();
  }
}

// ディレクトリの存在確認と作成
function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`ディレクトリを作成しました: ${dir}`);
  }
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