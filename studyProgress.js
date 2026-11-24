export const HISTORY_LIMIT = 100;
export const sessionKey = id => `kairos_session_v1:${id}`;
export function questionSignature(project) {
  return JSON.stringify([project.questionRevision || 0, project.config, project.questions.map(q => [q.id, q.question, q.options, q.answerIndex, q.explanation])]);
}
export function readSession(project, storage = localStorage) {
  const raw = storage.getItem(sessionKey(project.id));
  if (!raw) return null;
  const s = JSON.parse(raw);
  if (s.version !== 1 || s.signature !== questionSignature(project)) return null;
  if (!['mock','practice','wrong'].includes(s.mode) || !Array.isArray(s.questionIds) || !s.questionIds.length || new Set(s.questionIds).size !== s.questionIds.length || !Number.isInteger(s.currentIndex) || s.currentIndex < 0 || s.currentIndex >= s.questionIds.length || !Number.isInteger(s.elapsedSeconds) || s.elapsedSeconds < 0 || typeof s.isSubmitted !== 'boolean' || typeof s.id !== 'string' || !Number.isFinite(s.startedAt)) return null;
  const map = new Map(project.questions.map(q => [q.id,q]));
  if (s.questionIds.some(id => !map.has(id)) || !s.answers || typeof s.answers !== 'object' || Array.isArray(s.answers) || Object.entries(s.answers).some(([id,n]) => !s.questionIds.includes(id) || !Number.isInteger(n) || n < 0 || n >= map.get(id).options.length)) return null;
  return { ...s, questions: s.questionIds.map(id => map.get(id)), starredIds: Object.fromEntries(Object.entries(s.starredIds || {}).filter(([id,v]) => s.questionIds.includes(id) && v === true)) };
}
export function writeSession(project, session, storage = localStorage) {
  storage.setItem(sessionKey(project.id), JSON.stringify({ ...session, version:1, signature:questionSignature(project) }));
}
export function clearSession(id, storage = localStorage) { storage.removeItem(sessionKey(id)); }
export function examRecord(project, questions, answers, session, elapsedSeconds) {
  const correctCount = questions.filter(q => answers[q.id] === q.answerIndex).length;
  const total = questions.length;
  const score = total ? Math.round(correctCount / total * 100) : 0;
  return { id:session.id, startedAt:session.startedAt, submittedAt:Date.now(), total, correctCount, score, passingScore:project.config.passingScore, passed:correctCount * 100 >= project.config.passingScore * total, elapsedSeconds };
}
export function appendHistory(history, record) {
  return [...(history || []).filter(r => r.id !== record.id), record].slice(-HISTORY_LIMIT);
}
export function validHistory(history) {
  return Array.isArray(history) && history.length <= HISTORY_LIMIT && new Set(history.map(r => r?.id)).size === history.length && history.every(r => r && typeof r.id === 'string' && Number.isFinite(r.startedAt) && Number.isFinite(r.submittedAt) && Number.isInteger(r.total) && r.total > 0 && Number.isInteger(r.correctCount) && r.correctCount >= 0 && r.correctCount <= r.total && r.score === Math.round(r.correctCount / r.total * 100) && Number.isFinite(r.passingScore) && r.passingScore >= 1 && r.passingScore <= 100 && r.passed === (r.correctCount * 100 >= r.passingScore * r.total) && Number.isInteger(r.elapsedSeconds) && r.elapsedSeconds >= 0);
}
