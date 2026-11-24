import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

async function runSmokeTest() {
  let playwright;
  try {
    playwright = await import('playwright');
  } catch {
    console.error('尚未安裝 playwright 套件');
    process.exit(1);
  }

  const server = spawn('npm', ['run', 'preview', '--', '--port', '4173'], {
    stdio: 'pipe',
    shell: true,
  });

  await new Promise((resolve) => setTimeout(resolve, 2500));

  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  try {
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
    console.log('[PASS] 頁面標題載入:', await page.title());
  } finally {
    await browser.close();
    server.kill();
  }
}

runSmokeTest().catch((err) => {
  console.error('[FAIL]', err);
  process.exit(1);
});
