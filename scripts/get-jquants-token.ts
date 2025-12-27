/**
 * J-Quants API リフレッシュトークン取得スクリプト
 * 
 * 使用方法:
 * npx tsx scripts/get-jquants-token.ts [メールアドレス] [パスワード]
 * 
 * 例:
 * npx tsx scripts/get-jquants-token.ts your_email@example.com your_password
 * 
 * 注意: パスワードをコマンドラインで入力するのはセキュリティ上推奨されません。
 * 対話形式で入力する場合は、引数を省略してください。
 */

import * as readline from 'readline';

async function getRefreshToken(email?: string, password?: string): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (query: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(query, resolve);
    });
  };

  try {
    let mailaddress = email;
    let pwd = password;

    if (!mailaddress) {
      mailaddress = await question('J-Quants APIのメールアドレスを入力してください: ');
    }

    if (!pwd) {
      pwd = await question('パスワードを入力してください: ');
      // パスワードを非表示にする（Windowsでは動作しない場合があります）
      process.stdout.write('\n');
    }

    console.log('\n[J-Quants API] リフレッシュトークンを取得中...\n');

    const response = await fetch('https://api.jquants.com/v1/token/auth_user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mailaddress: mailaddress,
        password: pwd,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('❌ エラーが発生しました:');
      console.error(`   ステータス: ${response.status} ${response.statusText}`);
      console.error(`   詳細: ${errorText}`);
      process.exit(1);
    }

    const data = await response.json();

    if (!data.refreshToken) {
      console.error('❌ リフレッシュトークンが取得できませんでした');
      console.error('   レスポンス:', JSON.stringify(data, null, 2));
      process.exit(1);
    }

    console.log('✅ リフレッシュトークンの取得に成功しました！\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('以下の内容を .env.local ファイルに追加してください:\n');
    console.log(`JQUANTS_REFRESH_TOKEN=${data.refreshToken}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('⚠️  注意: リフレッシュトークンは1週間有効です。');
    console.log('   期限が切れる前に新しいトークンを取得してください。\n');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// コマンドライン引数から取得
const args = process.argv.slice(2);
const email = args[0];
const password = args[1];

getRefreshToken(email, password);

