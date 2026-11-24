import { validHistory } from './studyProgress.js';
import { parseQuestionsFromJson } from './pdfParserCore.js';

export function validateBackup(raw, limit) {
  const data = JSON.parse(raw);
  if (data?.format !== 'kairos-backup' || data.version !== 1 || !Array.isArray(data.projects) || data.projects.length > limit) throw new Error('備份版本、格式或專案數不符。');
  const ids = new Set();
  for (const p of data.projects) {
    if (!p || typeof p.id !== 'string' || !p.id || ids.has(p.id) || typeof p.title !== 'string' || !p.title.trim()) throw new Error('備份專案資料或 ID 無效。');
    ids.add(p.id);
    parseQuestionsFromJson(JSON.stringify(p.questions));
    const c = p.config;
    if (!c || !Number.isInteger(c.questionCount) || c.questionCount < 1 || c.questionCount > p.questions.length || !Number.isFinite(c.passingScore) || c.passingScore < 1 || c.passingScore > 100 || typeof c.shuffle !== 'boolean') throw new Error('備份測驗設定無效。');
    if (p.examHistory !== undefined && !validHistory(p.examHistory)) throw new Error('備份歷史成績無效。');
    const qids = new Set(p.questions.map(q => q.id));
    if (!Array.isArray(p.wrongQuestionIds) || p.wrongQuestionIds.some(id => !qids.has(id)) || !p.wrongCounts || Object.entries(p.wrongCounts).some(([id,n]) => !qids.has(id) || !Number.isInteger(n) || n < 0)) throw new Error('備份錯題紀錄無效。');
  }
  return data.projects;
}

export function serializeBackup(projects) {
  return JSON.stringify({ format: 'kairos-backup', version: 1, exportedAt: new Date().toISOString(), projects }, null, 2);
}
