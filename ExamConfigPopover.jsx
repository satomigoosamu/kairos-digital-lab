import React, { useState } from 'react';
import { SlidersHorizontal, Shuffle, ListOrdered, X } from 'lucide-react';

export default function ExamConfigPopover({ project, onUpdateConfig, onClose }) {
  const [draft, setDraft] = useState(() => ({ ...project.config }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const total = project.questions.length;
  const { questionCount, passingScore, shuffle } = draft;
  const safeCount = Math.min(Math.max(1, Math.trunc(Number(questionCount)) || 1), total);
  const pointsPerQ = (100 / safeCount).toFixed(2);
  const minCorrect = Math.ceil((passingScore / 100) * safeCount);

  async function apply() {
    setBusy(true);setError('');
    try {
      const result = await onUpdateConfig({ ...draft, questionCount:safeCount });
      if (result !== false) onClose();
    } catch { setError('設定未儲存，原測驗與答案仍保留，請重試。'); }
    finally { setBusy(false); }
  }
  return (
    <div className="fixed left-4 right-4 top-24 z-30 w-auto max-w-[calc(100vw-2rem)] sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-80 rounded-xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-obsidian-surface">
      <div className="mb-3 flex items-center justify-between border-b border-zinc-100 pb-2.5 dark:border-zinc-800">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-charcoal dark:text-zinc-100">
          <SlidersHorizontal className="h-3.5 w-3.5 text-gold" />
          <span>考前參數抽屜</span>
        </div>
        <button
          onClick={onClose}
          disabled={busy}
          aria-label="取消參數設定"
          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-charcoal dark:hover:bg-zinc-800"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <fieldset disabled={busy} className="space-y-4">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-slateink dark:text-zinc-400">抽題數量</span>
            <span className="font-mono font-semibold text-charcoal dark:text-zinc-100">
              {safeCount} / {total} 題
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              aria-label="抽題數量滑桿"
              type="range"
              min={1}
              max={total}
              value={safeCount}
              onChange={(e) => setDraft({ ...draft, questionCount: Number(e.target.value) })}
              className="h-1.5 flex-1 cursor-pointer accent-gold"
            />
            <input
              aria-label="抽題數量"
              type="number"
              min={1}
              max={total}
              value={safeCount}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  questionCount: Math.min(Math.max(1, Number(e.target.value) || 1), total),
                })
              }
              className="w-14 rounded border border-zinc-300 bg-paper px-1.5 py-1 text-center font-mono text-xs dark:border-zinc-700 dark:bg-obsidian"
            />
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-slateink dark:text-zinc-400">及格分數線</span>
            <span className="font-mono font-semibold text-gold">{passingScore} 分</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[60, 70, 80, 100].map((score) => (
              <button
                key={score}
                type="button"
                onClick={() => setDraft({ ...draft, passingScore: score })}
                className={`rounded border py-1 font-mono text-xs transition ${
                  passingScore === score
                    ? 'border-gold bg-gold-muted font-semibold text-charcoal dark:text-gold'
                    : 'border-zinc-200 text-slateink hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400'
                }`}
              >
                {score}
              </button>
            ))}
          </div>
          <p className="mt-1.5 font-mono text-[11px] text-slateink dark:text-zinc-400">
            每題 {pointsPerQ} 分 · 需答對 {minCorrect} 題及格
          </p>
        </div>

        <div>
          <span className="mb-1 block text-xs text-slateink dark:text-zinc-400">出題順序</span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setDraft({ ...draft, shuffle: true })}
              className={`flex items-center justify-center gap-1 rounded border py-1.5 text-xs font-medium transition ${
                shuffle
                  ? 'border-gold bg-gold-muted text-charcoal dark:text-gold'
                  : 'border-zinc-200 text-slateink dark:border-zinc-700 dark:text-zinc-400'
              }`}
            >
              <Shuffle className="h-3 w-3" />
              隨機打亂
            </button>
            <button
              type="button"
              onClick={() => setDraft({ ...draft, shuffle: false })}
              className={`flex items-center justify-center gap-1 rounded border py-1.5 text-xs font-medium transition ${
                !shuffle
                  ? 'border-gold bg-gold-muted text-charcoal dark:text-gold'
                  : 'border-zinc-200 text-slateink dark:border-zinc-700 dark:text-zinc-400'
              }`}
            >
              <ListOrdered className="h-3 w-3" />
              原始順序
            </button>
          </div>
        </div>
      </fieldset>
      <p className="mt-3 text-xs text-slateink dark:text-zinc-400">調整後須套用才會生效；關閉會放棄本次調整。</p>
      <p role="alert" className="mt-2 text-xs text-red-500">{error}</p>
      <button type="button" disabled={busy} onClick={apply} className="mt-3 w-full rounded-lg bg-charcoal px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 dark:bg-gold dark:text-charcoal">{busy ? '儲存中…' : '套用並重新抽題'}</button>
    </div>
  );
}
