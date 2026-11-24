import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQuestionsFromJson as parse } from '../src/utils/pdfParserCore.js';
import { serializeBackup, validateBackup } from '../src/utils/backup.js';
const q = { id:'q1', question:'Invented?', options:['Alpha','Beta','Gamma','Delta','Echo','Foxtrot'], answerIndex:5 };
for (const patch of [{answerIndex:undefined}, {answerIndex:9}, {answerIndex:-1}, {answerIndex:1.5}, {answerIndex:null}, {options:['','Beta']}, {question:' '}]) {
  test(`invalid JSON rejected ${JSON.stringify(patch)}`, () => assert.throws(() => parse(JSON.stringify([{...q,...patch}]))));
}
test('F on six choices is sixth, not false', () => assert.equal(parse(JSON.stringify([{...q,answerIndex:undefined,answer:'F'}]))[0].answerIndex,5));
test('duplicate IDs reject whole import', () => assert.throws(() => parse(JSON.stringify([q,q]))));
test('null JSON rejected', () => assert.throws(() => parse('null')));
const project={id:'p1',title:'Synthetic',questions:[q],config:{questionCount:1,passingScore:80,shuffle:false},wrongQuestionIds:['q1'],wrongCounts:{q1:2}};
test('backup preserves questions, configuration and wrong history',()=>assert.deepEqual(validateBackup(serializeBackup([project]),2),[project]));
for(const projects of [[project,project], [{...project,config:{}}], [{...project,wrongQuestionIds:['missing']}], [{...project,questions:[{...q,answerIndex:90}]}]]) {
  test(`invalid backup rejected ${JSON.stringify(projects).slice(-70)}`,()=>assert.throws(()=>validateBackup(serializeBackup(projects),2)));
}
test('unsupported backup version rejected',()=>assert.throws(()=>validateBackup('{"format":"kairos-backup","version":2,"projects":[]}',2)));
test('over-limit backup rejected',()=>assert.throws(()=>validateBackup(serializeBackup([project]),0)));
