import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { chromium } from 'playwright';
import { resolveFromRoot } from '../apps/workers/src/lib/env';

async function main() {
  const authStatePath = resolveFromRoot(process.env.NAVER_AUTH_STATE_PATH?.trim() || 'secrets/naver-auth.json');
  const boardUrl = process.env.NAVER_CAFE_BOARD_URL?.trim() || 'https://nid.naver.com/nidlogin.login';
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  const rl = createInterface({ input, output });

  await page.goto('https://nid.naver.com/nidlogin.login', { waitUntil: 'domcontentloaded' });
  if (boardUrl) {
    await page.goto(boardUrl, { waitUntil: 'domcontentloaded' }).catch(() => undefined);
  }

  await rl.question(`브라우저에서 네이버 로그인 후 Enter를 누르면 ${authStatePath} 에 storageState를 저장합니다.\n`);
  await context.storageState({ path: authStatePath });
  await rl.close();
  await browser.close();
}

main().catch((error) => {
  process.stderr.write(`${String(error)}\n`);
  process.exit(1);
});
