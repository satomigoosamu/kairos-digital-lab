// All fixtures are invented here. Never add customer PDFs or extracted question banks.
import test from 'node:test';
import assert from 'node:assert/strict';
import {buildQuestionObject as build, parseSpatialTablePages as spatial,
  parseQuestionsWithDiagnostics as text, extractHorizontalRules, extractHiddenTextOrigins} from '../src/utils/pdfParserCore.js';

const item=(str,x,y,width=8)=>({str,x,y,width});
const headers=[item('Item',20,560),item('content',60,560),item('Ans',360,560),
  item('題目修正',390,560),item('答案',690,560)];
const row=(n,y,body='Invented statement.',ans='O',rev='',revAns='')=>[
  item(String(n),22,y),item(body,60,y),item(ans,365,y),
  ...(rev?[item(rev,390,y)]:[]),...(revAns?[item(revAns,695,y)]:[])];
const page=(items,extra={})=>({width:800,height:600,pageNum:1,items:[...headers,...items],...extra});
const choice='Choose a color? (1) Amber (2) Blue (3) Cyan';
test('five columns: revised body AND answer win without contaminating original answer',()=>{
  const r=spatial([page(row(1,500,choice,'1','Choose a shape? (1) Arc (2) Box (3) Cone','2'))]);
  assert.equal(r.questions.length,1);assert.equal(r.questions[0].question,'Choose a shape?');
  assert.deepEqual(r.questions[0].options,['Arc','Box','Cone']);assert.equal(r.questions[0].answerIndex,1);
});
test('revised boolean overrides old answer',()=>assert.equal(build(1,'Old statement','O','New statement','X',0).answerIndex,1));
test('answer-only revision is applied',()=>assert.equal(build(1,choice,'1','','3',0).answerIndex,2));
test('revision missing its answer is rejected',()=>assert.equal(build(1,'Old statement','O','Changed statement','',0),null));
test('deletion is excluded and diagnosed, never a boolean question',()=>{
  const r=spatial([page(row(1,500,'Invented statement','O','建議刪除'))]);
  assert.equal(r.questions.length,0);assert.deepEqual(r.deletedNumbers,[1]);assert.equal(r.warnings.length,1);
});
test('tall unequal rows use actual table rules, including text closer to next anchor',()=>{
  const r=spatial([page([...row(1,420,choice,'1'),item('continued',60,360),...row(2,330)],
    {rowRules:[550,350,310].map(y=>({x1:15,x2:730,y}))})]);
  assert.match(r.questions[0].options[2],/continued/);assert.equal(r.questions[1].question,'Invented statement.');
});
test('multi-line text beyond old 28pt radius survives',()=>{
  const r=spatial([page([...row(1,440),item('continued',60,400),...row(2,330)])]);
  assert.match(r.questions[0].question,/continued/);
});
test('columns are inferred independently on shifted/resized pages',()=>{
  const p=page(row(1,500,choice,'2'));p.items=p.items.map(i=>({...i,x:i.x*1.2+10,width:i.width*1.2}));p.width=1000;
  assert.equal(spatial([p]).questions[0].answerIndex,1);
});
test('following page without header reuses scaled column layout',()=>{
  const r=spatial([page(row(1,500)),page(row(2,450),{pageNum:2,items:row(2,450)})]);
  assert.deepEqual(r.questions.map(q=>q.sourceNumber),[1,2]);
});
test('unanchored continuation is flagged instead of joined to unrelated question',()=>{
  const r=spatial([page(row(1,500)),page([],{pageNum:2,items:[item('Continuation only',60,400)]})]);
  assert.equal(r.questions.length,1);assert.match(r.warnings.join(''),/跨頁/);
});
test('merged number plus stem remains a single question',()=>{
  const r=spatial([page([item('1 Invented statement',22,500,120),item('O',365,500)])]);
  assert.equal(r.questions[0].question,'Invented statement');
});
test('merged body and trailing answer are split only on coordinate evidence',()=>{
  const r=spatial([page([item('1',22,500),item('Invented statement O',60,500,310)])]);
  assert.equal(r.questions[0].question,'Invented statement');
});
test('numeric text in content column is never a question number anchor',()=>{
  const r=spatial([page(row(1,500,'12 invented blocks are blue.'))]);
  assert.deepEqual(r.detectedNumbers,[1]);
});
test('duplicate numbers are diagnosed and all duplicates excluded',()=>{
  const r=spatial([page([...row(1,500),...row(1,450),...row(3,400)])]);
  assert.deepEqual(r.duplicateNumbers,[1]);assert.deepEqual(r.missingNumbers,[2]);assert.equal(r.questions.length,1);
});
test('last rejected question still contributes to expected max number',()=>{
  const r=spatial([page([...row(1,500),...row(3,400,choice,'5')])]);
  assert.equal(r.maxDetectedNumber,3);assert.deepEqual(r.rejectedNumbers,[3]);assert.deepEqual(r.missingNumbers,[2]);
});
for (const [label,body,answer,options] of [
  ['number','Pick? (1) Apple (2) Berry','2',['Apple','Berry']],
  ['letter','Pick? (A) Apple (B) Berry','B',['Apple','Berry']],
  ['fullwidth','Pick? （１） Apple （２） Berry','２',['Apple','Berry']],
  ['punctuation','Pick? A. Apple B. Berry','B',['Apple','Berry']],
  ['circled','Pick? ① Apple ② Berry','②',['Apple','Berry']],
  ['right parenthesis','Pick? 1) Apple 2) Berry','2',['Apple','Berry']],
]) test(`choice format ${label}`,()=>{
  const q=build(1,body,answer,'','',0);assert.deepEqual(q.options,options);assert.equal(q.answerIndex,1);
});
for(const answer of ['','E','5','O','1 2']) test(`invalid choice answer ${JSON.stringify(answer)} is never defaulted/clamped`,()=>{
  assert.equal(build(1,'Pick? (1) Apple (2) Berry',answer,'','',0),null);
});
test('missing option labels cannot silently shift answer indexes',()=>assert.equal(build(1,'Pick? (1) Apple (3) Cyan','3','','',0),null));
test('empty option rejected',()=>assert.equal(build(1,'Pick? (1) (2) Berry','2','','',0),null));
test('six options are preserved with a sixth answer, never folded into option five',()=>{
  const q=build(1,'Pick? (1) Arc (2) Box (3) Cone (4) Disc (5) Ellipse (6) Fan','6','','',0);
  assert.deepEqual(q.options,['Arc','Box','Cone','Disc','Ellipse','Fan']);assert.equal(q.answerIndex,5);
});
test('lowercase boolean and fullwidth characters',()=>{
  assert.equal(build(1,'Invented statement','o','','',0).answerIndex,0);
  assert.equal(build(1,'Invented statement','ｘ','','',0).answerIndex,1);
  assert.equal(build(1,'Invented statement','Ｘ','','',0).answerIndex,1);
});
test('zero is ambiguous, never silently changed to O',()=>assert.equal(build(1,'Invented statement','0','','',0),null));
test('text import inline answer and explanation',()=>{
  const r=text('1. Pick a fruit? (A) Apple (B) Berry 答案: B 解析: Invented explanation.');
  assert.equal(r.questions.length,1);assert.equal(r.questions[0].answerIndex,1);assert.equal(r.questions[0].explanation,'Invented explanation.');
});
test('text answer key is not parsed as more questions',()=>{
  const r=text('1. Pick? (A) Apple (B) Berry\n2. Other? (A) Cone (B) Disc\n標準答案:\n1. B\n2. A');
  assert.deepEqual(r.questions.map(q=>q.answerIndex),[1,0]);assert.deepEqual(r.duplicateNumbers,[]);
});
test('line-separated numeric options do not start false questions',()=>{
  const r=text('1. Pick a fruit?\n(1) Apple\n(2) Berry\n答案: 2\n2. Other statement O');
  assert.equal(r.questions.length,2);assert.equal(r.questions[0].answerIndex,1);
});
test('empty input and non-table spatial input',()=>{
  assert.equal(text('').questions.length,0);assert.equal(spatial([{width:800,items:[]}]),null);
});
test('painted grid rules support transforms; clipping bounds are ignored',()=>{
  const ops={save:1,restore:2,transform:3,constructPath:4,rectangle:5,fill:6,endPath:7};
  const r=extractHorizontalRules({fnArray:[1,3,4,6,2,4,7],argsArray:[null,[2,0,0,2,10,20],[[5],[0,100,300,.5]],null,null,[[5],[0,200,300,.5]],null]},ops,800);
  assert.equal(r.length,1);assert.equal(r[0].x1,10);assert.equal(r[0].y,220.5);
});
test('text hidden by a table cell clip is detected, visible text stays',()=>{
  const ops={save:1,restore:2,constructPath:3,rectangle:4,eoClip:5,setTextMatrix:6,showText:7};
  const hidden=extractHiddenTextOrigins({fnArray:[1,3,5,6,7,6,7,2],
    argsArray:[null,[[4],[20,300,400,50]],null,[1,0,0,1,60,320],[],[1,0,0,1,60,290],[],null]},ops);
  assert.deepEqual(hidden,[{x:60,y:290}]);
});
