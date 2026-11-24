import React, { useState } from 'react';
import { parseQuestionsFromJson } from '../../utils/pdfParserCore';

const field='w-full rounded-lg border border-zinc-300 bg-paper p-2 text-sm dark:border-zinc-700 dark:bg-obsidian';
export default function QuestionEditor({ project, onSaveProject, onClose }) {
  const [index,setIndex]=useState(0);
  const [draft,setDraft]=useState(()=>structuredClone(project.questions[0]));
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  function choose(next) {
    if (JSON.stringify(draft)!==JSON.stringify(project.questions[index]) && !confirm('此題尚未儲存，確定放棄修改並切換題目？')) return;
    setIndex(next);setDraft(structuredClone(project.questions[next]));setError('');
  }
  async function save(e) {
    e.preventDefault();setError('');
    try {
      const [validated]=parseQuestionsFromJson(JSON.stringify([draft]));
      const question={...draft,question:validated.question,options:validated.options,answerIndex:validated.answerIndex,explanation:validated.explanation};
      if (!confirm('儲存校正會重新開始本專案的測驗，並清除此題的錯題紀錄；既有歷史成績會保留。確定儲存？')) return;
      setBusy(true);
      const wrongCounts={...project.wrongCounts};delete wrongCounts[draft.id];
      await onSaveProject({...project,questionRevision:(project.questionRevision || 0)+1,questions:project.questions.map((q,i)=>i===index?question:q),wrongQuestionIds:(project.wrongQuestionIds || []).filter(id=>id!==draft.id),wrongCounts});
      onClose();
    } catch(e){setError(`校正未儲存：${e.message}`);}
    finally {setBusy(false);}
  }
  return <div role="dialog" aria-modal="true" aria-label="校正題庫" className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4">
    <form onSubmit={save} className="mx-auto my-4 w-full max-w-xl space-y-4 rounded-xl border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-obsidian-surface">
      <div className="flex justify-between gap-2"><h2 className="font-semibold">校正題庫</h2><button type="button" disabled={busy} onClick={()=>{if(JSON.stringify(draft)===JSON.stringify(project.questions[index]) || confirm('放棄尚未儲存的校正？'))onClose();}}>關閉校正</button></div>
      <p className="text-xs text-slateink dark:text-zinc-400">請對照原始題庫與標準答案。每次儲存一題，不會自動補猜答案。</p>
      <label className="block text-sm">選擇題目<select aria-label="選擇校正題目" className={field} value={index} disabled={busy} onChange={e=>choose(Number(e.target.value))}>{project.questions.map((q,i)=><option key={q.id} value={i}>第 {q.sourceNumber || i+1} 題 · {q.question.slice(0,35)}</option>)}</select></label>
      <label className="block text-sm">題幹<textarea aria-label="校正題幹" className={field} rows={4} value={draft.question} onChange={e=>setDraft({...draft,question:e.target.value})}/></label>
      <fieldset className="space-y-2"><legend className="text-sm">選項與正確答案</legend>{draft.options.map((option,i)=><div className="flex items-center gap-2" key={i}>
        <input aria-label={`正確答案 ${String.fromCharCode(65+i)}`} type="radio" name="correct" checked={draft.answerIndex===i} onChange={()=>setDraft({...draft,answerIndex:i})}/>
        <label className="min-w-0 flex-1 text-xs">{String.fromCharCode(65+i)}<textarea aria-label={`校正選項 ${String.fromCharCode(65+i)}`} rows={2} className={field} value={option} onChange={e=>setDraft({...draft,options:draft.options.map((o,n)=>n===i?e.target.value:o)})}/></label>
        <button type="button" aria-label={`刪除選項 ${String.fromCharCode(65+i)}`} disabled={busy || draft.options.length <= 2} onClick={()=>setDraft({...draft,options:draft.options.filter((_,n)=>n!==i),answerIndex:draft.answerIndex===i?null:draft.answerIndex>i?draft.answerIndex-1:draft.answerIndex})} className="shrink-0 text-xs text-red-500">刪除</button>
      </div>)}</fieldset>
      <button type="button" disabled={busy || draft.options.length >= 9} onClick={()=>setDraft({...draft,options:[...draft.options,'']})} className="rounded-lg border border-zinc-300 px-3 py-2 text-xs dark:border-zinc-700">新增選項</button>
      <label className="block text-sm">解析<textarea aria-label="校正解析" className={field} rows={3} value={draft.explanation || ''} onChange={e=>setDraft({...draft,explanation:e.target.value})}/></label>
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>
      <button disabled={busy} className="rounded-lg bg-charcoal px-4 py-2 text-sm text-white dark:bg-gold dark:text-charcoal">{busy?'儲存中…':'儲存本題校正'}</button>
    </form>
  </div>;
}
