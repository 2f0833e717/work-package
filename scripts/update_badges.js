#!/usr/bin/env node

/**
 * リポジトリのバッジ情報を更新するスクリプト
 * 
 * 使用方法:
 * npm run update-badges
 * 
 * 機能:
 * - GitHubリポジトリの情報に基づいてバッジを生成
 * - README.mdのリポジトリ情報にバッジを追加・更新
 * - バッジの種類: Stars数, Languages, 最終更新日
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');
const https = require('https');

// 設定
const README_PATH = path.join(process.cwd(), 'README.md');
const GITHUB_API_URL = 'https://api.github.com';
const BADGE_TYPES = ['stars', 'language', 'last-commit', 'license'];

// メイン関数
async function main() {
  console.log('=== リポジトリバッジ更新ツール ===\n');
  
  // READMEファイルの存在確認
  if (!fs.existsSync(README_PATH)) {
    console.error('エラー: README.mdファイルが見つかりません。');
    process.exit(1);
  }
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  try {
    // リポジトリ名の入力
    const repoName = await question(rl, 'バッジを更新するリポジトリ名を入力してください: ');
    if (!repoName) {
      console.error('エラー: リポジトリ名は必須です。');
      return;
    }
    
    // GitHubユーザー名の入力
    const username = await question(rl, 'GitHubユーザー名を入力してください: ');
    if (!username) {
      console.error('エラー: GitHubユーザー名は必須です。');
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
    
    // GitHub APIからリポジトリ情報を取得
    const repoInfo = await fetchRepoInfo(username, repoName);
    if (!repoInfo) {
      console.error(`エラー: GitHubリポジトリ "${username}/${repoName}" の情報を取得できませんでした。`);
      return;
    }
    
    console.log('\n取得したリポジトリ情報:');
    console.log(`- ⭐ Stars: ${repoInfo.stargazers_count}`);
    console.log(`- 🔄 最終更新: ${new Date(repoInfo.updated_at).toLocaleDateString('ja-JP')}`);
    console.log(`- 📑 ライセンス: ${repoInfo.license ? repoInfo.license.name : 'なし'}`);
    console.log(`- 📊 主要言語: ${repoInfo.language || 'なし'}`);
    
    // 更新するバッジの選択
    console.log('\n追加/更新するバッジを選択してください:');
    const selectedBadges = [];
    
    for (const badgeType of BADGE_TYPES) {
      let badgeName = '';
      switch (badgeType) {
        case 'stars': badgeName = 'Stars数'; break;
        case 'language': badgeName = '使用言語'; break;
        case 'last-commit': badgeName = '最終更新日'; break;
        case 'license': badgeName = 'ライセンス'; break;
      }
      
      const answer = await question(rl, `${badgeName}のバッジを追加しますか？ (y/n): `);
      if (answer.toLowerCase() === 'y') {
        selectedBadges.push(badgeType);
      }
    }
    
    if (selectedBadges.length === 0) {
      console.log('バッジが選択されていないため、更新は行われません。');
      return;
    }
    
    // バッジの生成
    const badgeMarkdown = await generateBadges(username, repoName, selectedBadges, repoInfo);
    
    // README.mdの更新
    await updateReadme(repoName, badgeMarkdown);
    
    console.log('\n✅ バッジの更新が完了しました。');
  } catch (error) {
    console.error('エラーが発生しました:', error);
  } finally {
    rl.close();
  }
}

// GitHub APIからリポジトリ情報を取得
function fetchRepoInfo(username, repoName) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Repository-Badge-Updater'
      }
    };
    
    https.get(`${GITHUB_API_URL}/repos/${username}/${repoName}`, options, (response) => {
      if (response.statusCode === 404) {
        resolve(null);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`GitHub API returned status code ${response.statusCode}`));
        return;
      }
      
      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const repoInfo = JSON.parse(data);
          resolve(repoInfo);
        } catch (error) {
          reject(new Error('GitHub APIからの応答の解析に失敗しました。'));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// バッジURLの生成
function generateBadges(username, repoName, badgeTypes, repoInfo) {
  const badges = [];
  
  const encodedUser = encodeURIComponent(username);
  const encodedRepo = encodeURIComponent(repoName);
  
  for (const badgeType of badgeTypes) {
    let badgeUrl = '';
    
    switch (badgeType) {
      case 'stars':
        badgeUrl = `[![Stars](https://img.shields.io/github/stars/${encodedUser}/${encodedRepo}?style=flat-square)](https://github.com/${username}/${repoName}/stargazers)`;
        break;
      case 'language':
        if (repoInfo.language) {
          const encodedLang = encodeURIComponent(repoInfo.language);
          badgeUrl = `[![Language](https://img.shields.io/badge/language-${encodedLang}-blue?style=flat-square)](https://github.com/${username}/${repoName})`;
        }
        break;
      case 'last-commit':
        badgeUrl = `[![Last Commit](https://img.shields.io/github/last-commit/${encodedUser}/${encodedRepo}?style=flat-square)](https://github.com/${username}/${repoName}/commits)`;
        break;
      case 'license':
        if (repoInfo.license && repoInfo.license.spdx_id) {
          badgeUrl = `[![License](https://img.shields.io/github/license/${encodedUser}/${encodedRepo}?style=flat-square)](https://github.com/${username}/${repoName}/blob/main/LICENSE)`;
        }
        break;
    }
    
    if (badgeUrl) {
      badges.push(badgeUrl);
    }
  }
  
  return badges.join(' ');
}

// READMEファイルの更新
async function updateReadme(repoName, badgeMarkdown) {
  const readmeContent = fs.readFileSync(README_PATH, 'utf8');
  const lines = readmeContent.split('\n');
  
  let repoFound = false;
  let badgesInserted = false;
  
  for (let i = 0; i < lines.length; i++) {
    if (!repoFound && (lines[i] === `## ${repoName}` || lines[i] === `### ${repoName}`)) {
      repoFound = true;
      
      // 既存のバッジを確認
      if (i + 1 < lines.length && lines[i + 1].includes('img.shields.io')) {
        // 既存のバッジ行を更新
        lines[i + 1] = badgeMarkdown;
        badgesInserted = true;
      } else {
        // 新しいバッジ行を追加
        lines.splice(i + 1, 0, badgeMarkdown);
        badgesInserted = true;
      }
      break;
    }
  }
  
  if (!repoFound) {
    console.error(`警告: "${repoName}" セクションが見つかりませんでした。`);
    return;
  }
  
  if (!badgesInserted) {
    console.error('警告: バッジの挿入に失敗しました。');
    return;
  }
  
  // 更新したREADMEを保存
  fs.writeFileSync(README_PATH, lines.join('\n'), 'utf8');
  console.log('README.mdのバッジを更新しました。');
  
  // 目次の更新確認
  const updateToc = await question(readline.createInterface({
    input: process.stdin,
    output: process.stdout
  }), 'READMEの目次を更新しますか？ (y/n): ');
  
  if (updateToc.toLowerCase() === 'y') {
    try {
      execSync('npm run update-toc', { stdio: 'inherit' });
      console.log('目次を更新しました。');
    } catch (error) {
      console.error('目次の更新に失敗しました:', error.message);
    }
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