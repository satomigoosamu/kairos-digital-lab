// Start npm run preview first. All PDF content is invented.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {syntheticPdf} from './synthetic-pdf.mjs';
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXE?{executablePath:process.env.BROWSER_EXE}:{})});
try {
  const page=await browser.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:4173');
  await page.getByText('v1.7.1 Workspace',{exact:true}).waitFor();
  await page.getByRole('button',{name:'匯入 PDF / 題庫建立專案',exact:true}).click();
  await page.locator('input[accept=".pdf,.json,.txt"]').setInputFiles({name:'synthetic.pdf',mimeType:'application/pdf',buffer:Buffer.from(syntheticPdf())});
  await page.getByText('成功切分',{exact:false}).waitFor();
  assert.match(await page.locator('body').innerText(),/成功切分\s*3\s*道獨立題目/);
  assert.deepEqual(errors,[]);
  console.log('PASS production bundle version v1.7.1, local PDF worker and import');
} finally {await browser.close();}
