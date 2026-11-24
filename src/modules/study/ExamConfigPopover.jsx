import React from 'react';
import { SlidersHorizontal, Shuffle, ListOrdered, X } from 'lucide-react';

export default function ExamConfigPopover({ project, onUpdateConfig, onClose }) {
  if (!project) return null;
  const total = project.questions.length;
  const { questionCount, passingScore, shuffle } = project.config;
  const safeCount = Math.min(Math.max(1, questionCount || total), total);
  const pointsPerQ = (100 / safeCount).toFixed(2);
  const minCorrect = Math.ceil((passingScore / 100) * safeCount);

  return (
    <div className="absolute right-0 top-12 z-30 w-80 rounded-xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-obsidian-surface">
      <div className="mb-3 flex items-center justify-between border-b border-zinc-100 pb-2.5 dark:border-zinc-800">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-charcoal dark:text-zinc-100">
          <SlidersHorizontal className="h-3.5 w-3.5 text-gold" />
          <span>考前參數抽屜</span>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-charcoal dark:hover:bg-zinc-800"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-slateink dark:text-zinc-400">抽題數量</span>
            <span className="font-mono font-semibold text-charcoal dark:text-zinc-100">
              {safeCount} / {total} 題
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={total}
              value={safeCount}
              onChange={(e) => onUpdateConfig({ ...project.config, questionCount: Number(e.target.value) })}
              className="h-1.5 flex-1 cursor-pointer accent-gold"
            />
            <input
              type="number"
              min={1}
              max={total}
              value={safeCount}
              onChange={(e) =>
                onUpdateConfig({
                  ...project.config,
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
                onClick={() => onUpdateConfig({ ...project.config, passingScore: score })}
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
              onClick={() => onUpdateConfig({ ...project.config, shuffle: true })}
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
              onClick={() => onUpdateConfig({ ...project.config, shuffle: false })}
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
      </div>
    </div>
  );
}
