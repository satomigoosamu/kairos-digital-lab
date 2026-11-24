import test from 'node:test';
import assert from 'node:assert/strict';
import { shortcutIndex } from '../src/utils/studyShortcuts.js';
test('all nine labels and numbers select only available options',()=>{
  const options=Array.from({length:9},(_,i)=>String(i));
  for(let i=0;i<9;i++){
    assert.equal(shortcutIndex(String.fromCharCode(97+i),options),i);
    assert.equal(shortcutIndex(String(i+1),options),i);
  }
  assert.equal(shortcutIndex('F',options.slice(0,4)),null);
  assert.equal(shortcutIndex('0',options),null);
});
test('O/X aliases apply only to explicitly labelled boolean options',()=>{
  assert.equal(shortcutIndex('o',['O（正確）','X（錯誤）']),0);
  assert.equal(shortcutIndex('X',['O（正確）','X（錯誤）']),1);
  assert.equal(shortcutIndex('O',['Alpha','Beta']),null);
  assert.equal(shortcutIndex('X',['Alpha','Beta']),null);
});
