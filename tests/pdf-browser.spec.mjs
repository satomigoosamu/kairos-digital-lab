// Optional browser integration: npm install --no-save playwright, then start npm run dev.
// All inputs are synthetic. PDF worker is served locally by the application.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {syntheticPdf} from './synthetic-pdf.mjs';
const browser=await chromium.launch({headless:true,
  ...(process.env.BROWSER_EXE?{executablePath:process.env.BROWSER_EXE}:{})});
try {
  const page=await browser.newPage();page.setDefaultTimeout(10000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.BASE_URL || 'http://localhost:5173');
  const result=await page.evaluate(async bytes=>{
    const {parsePdfFileWithDiagnostics}=await import('/src/utils/pdfParser.js');
    return parsePdfFileWithDiagnostics(new File([new Uint8Array(bytes)],'synthetic.pdf',{type:'application/pdf'}));
  },Array.from(syntheticPdf()));
  assert.equal(result.questions.length,3);assert.deepEqual(result.deletedNumbers,[3]);
  assert.equal(result.questions[0].question,'Shape?');assert.equal(result.questions[0].answerIndex,1);
  assert.equal(result.questions[2].options.length,6);assert.equal(result.questions[2].answerIndex,5);
  await page.getByRole('button',{name:'匯入 PDF / 題庫建立專案'}).click();
  await page.locator('input[accept=".pdf,.json,.txt"]').setInputFiles({name:'synthetic.pdf',mimeType:'application/pdf',buffer:Buffer.from(syntheticPdf())});
  await page.getByText('已排除標示刪除／作廢的題號：3。請由題庫負責人確認。',{exact:true}).waitFor();
  assert.match(await page.locator('body').innerText(),/成功切分\s*3\s*道獨立題目/);
  await page.getByRole('button',{name:'依原題庫順序',exact:true}).click();
  await page.getByRole('button',{name:'建立考試工作區分頁',exact:true}).click();
  await page.getByText('synthetic',{exact:true}).first().waitFor();
  await page.getByRole('button',{name:/^B\s*Box$/}).click();
  await page.getByRole('button',{name:'下一題',exact:true}).click();
  await page.getByRole('button',{name:/X（錯誤）/}).click();
  await page.getByRole('button',{name:'下一題',exact:true}).click();
  await page.getByRole('button',{name:/^F\s*F$/}).click();
  await page.getByRole('button',{name:'交卷並查看成績',exact:true}).click();
  await page.getByText('100',{exact:true}).first().waitFor();
  assert.deepEqual(errors,[]);
  console.log('PASS PDF transport, import drawer, revised answer, deletion, six options, mock exam 100/100');
} finally {await browser.close();}
