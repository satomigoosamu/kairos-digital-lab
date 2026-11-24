import React from 'react';
export default function ExamHistory({ history=[] }) {
  return <details className="mb-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-obsidian-surface">
    <summary className="cursor-pointer text-sm font-medium">歷史成績（{history.length}）</summary>
    <p className="my-2 text-xs text-slateink dark:text-zinc-400">本機保留最近 100 次交卷，包含於專案備份。成績保留當時的題庫與及格標準結果。</p>
    {!history.length?<p className="text-sm">尚無交卷紀錄。</p>:<ol className="space-y-2">{[...history].reverse().map(r=><li key={r.id} className="flex flex-wrap justify-between gap-2 border-t border-zinc-200 py-2 text-xs dark:border-zinc-800">
      <time>{new Date(r.submittedAt).toLocaleString('zh-TW')}</time><span className="font-mono">{r.score} 分 · {r.correctCount}/{r.total} 題 · {Math.floor(r.elapsedSeconds/60)}分{r.elapsedSeconds%60}秒</span><span className={r.passed?'text-gold':''}>{r.passed?'及格':'未及格'}（標準 {r.passingScore}）</span>
    </li>)}</ol>}
  </details>;
}
