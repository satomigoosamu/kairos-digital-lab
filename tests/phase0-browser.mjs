import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser = await chromium.launch({headless:true,...(process.env.BROWSER_EXE ? {executablePath:process.env.BROWSER_EXE}:{})});
try {
  const context=await browser.newContext({acceptDownloads:true});
  const page=await context.newPage();
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:5173');
  const project={id:'synthetic-project',title:'Synthetic',createdAt:1,config:{questionCount:1,passingScore:80,shuffle:false},questions:[{id:'q1',question:'Invented long question '+ 'abcdefghij'.repeat(30),options:['Alpha','Beta'],answerIndex:1}],wrongQuestionIds:['q1'],wrongCounts:{q1:2}};
  await page.evaluate(async p=>{const s=await import('/src/utils/storage.js');await s.saveProject(p);},project);
  await page.reload(); await page.getByText('Synthetic',{exact:true}).waitFor();
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'匯出本機備份',exact:true}).click();
  const download=await downloadPromise;
  const backup=await fs.readFile(await download.path(),'utf8');
  const saved=JSON.parse(backup).projects;
  assert.equal(saved[0].wrongCounts.q1,2);
  page.on('dialog',d=>d.accept());
  await page.getByTitle('刪除此考試分頁').click();
  await page.getByText('尚未建立考試專案',{exact:false}).waitFor();
  await page.getByLabel('選擇備份檔案').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(backup)});
  await page.getByText('備份已還原。',{exact:true}).waitFor();
  await page.reload(); await page.getByText('Synthetic',{exact:true}).waitFor();
  assert.deepEqual(await page.evaluate(async()=> (await import('/src/utils/storage.js')).getAllProjects()),saved);
  await page.getByLabel('選擇備份檔案').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"version":999}')});
  await page.getByText(/^還原失敗/).waitFor();
  assert.deepEqual(await page.evaluate(async()=> (await import('/src/utils/storage.js')).getAllProjects()),saved);
  // Force transaction failure in the isolated test page, without an application hook.
  await page.evaluate(async()=>{
    const original=IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put=function(value){const req=original.call(this,value);this.transaction.abort();return req;};
    try {
      const storage=await import('/src/utils/storage.js');
      for (const operation of [() => storage.saveProject({id:'aborted'}), () => storage.restoreProjects([{id:'aborted'}])]) {
        try { await operation(); throw new Error('incorrect success'); }
        catch(e){if(e.message==='incorrect success') throw e;}
      }
    }
    finally {IDBObjectStore.prototype.put=original;}
  });
  assert.deepEqual(await page.evaluate(async()=> (await import('/src/utils/storage.js')).getAllProjects()),saved);
  for(const width of [320,390,1280]) {
    await page.setViewportSize({width,height:844});
    await page.getByRole('button',{name:'參數設定',exact:true}).click();
    const popover=page.getByText('考前參數抽屜',{exact:true}).locator('../../..');
    const box=await popover.boundingBox(); assert.ok(box.x>=0 && box.x+box.width<=width,`popover ${width}: ${JSON.stringify(box)}`);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`);
    await page.screenshot({path:`../../work/mobile-${width}.png`,fullPage:true});
    await page.getByRole('button',{name:'參數設定',exact:true}).click();
  }
  await page.getByRole('button',{name:/新增考試專案/}).click();
  const input=page.locator('input[accept=".pdf,.json,.txt"]');
  const questions=Array.from({length:25},(_,i)=>({id:`import-${i}`,question:`Synthetic ${i}`,options:['Alpha','Beta'],answerIndex:0}));
  await input.setInputFiles({name:'new.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(questions))});
  await page.getByText('成功切分',{exact:false}).waitFor();
  assert.equal(await page.locator('input[type=number][max="25"]').inputValue(),'20');
  await input.setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('[{"question":"Bad","options":["A","B"]}]')});
  await page.getByText(/^檔案解析失敗/).waitFor();
  assert.ok(await page.getByRole('button',{name:'建立考試工作區分頁',exact:true}).isDisabled());
  await input.setInputFiles({name:'new.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(questions))});
  await page.getByText('成功切分',{exact:false}).waitFor();
  await page.evaluate(()=>{
    window.originalPut=IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put=function(value){const req=window.originalPut.call(this,value);this.transaction.abort();return req;};
  });
  await page.getByRole('button',{name:'建立考試工作區分頁',exact:true}).click();
  await page.getByText(/^儲存失敗/).waitFor();
  await page.evaluate(()=>{IDBObjectStore.prototype.put=window.originalPut;delete window.originalPut;});
  assert.ok(await page.getByRole('button',{name:'建立考試工作區分頁',exact:true}).isVisible());
    assert.deepEqual(errors,[]);
  console.log('PASS backup download/restore/reload, invalid restore preservation, aborted save, stale import prevention, default 20, save failure stays open, 320/390/1280 layout');
} finally {await browser.close();}
