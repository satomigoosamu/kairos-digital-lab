import React, { useState, useEffect } from 'react';
import { X, Shuffle, ListOrdered, Check } from 'lucide-react';

export default function ExamConfigPopover({ project, onUpdateConfig, onClose }) {
  const totalQuestions = project?.questions?.length || 1;
  const [questionCount, setQuestionCount] = useState(
    Math.min(Math.max(1, project?.config?.questionCount || Math.min(20, totalQuestions)), totalQuestions)
  );
  const [passingScore, setPassingScore] = useState(project?.config?.passingScore || 80);
  const [shuffle, setShuffle] = useState(project?.config?.shuffle !== false);

  useEffect(() => {
    if (!project) return;
    const total = project.questions?.length || 1;
    setQuestionCount(Math.min(Math.max(1, project.config?.questionCount || Math.min(20, total)), total));
    setPassingScore(project.config?.passingScore || 80);
    setShuffle(project.config?.shuffle !== false);
  }, [project]);

  if (!project) return null;

  const safeCount = Math.min(Math.max(1, Number(questionCount) || 1), totalQuestions);
  const safePass = Math.min(Math.max(1, Number(passingScore) || 60), 100);
  const pointsPerQuestion = (100 / safeCount).toFixed(2);
  const requiredCorrect = Math.ceil((safePass / 100) * safeCount);

  const countPresets = Array.from(
    new Set([10, 20, 30, 50, 100, totalQuestions].filter((n) => n >= 1 && n <= totalQuestions))
  ).sort((a, b) => a - b);

  const handleApply = (e) => {
    e.preventDefault();
    onUpdateConfig({
      ...project.config,
      questionCount: safeCount,
      passingScore: safePass,
      shuffle,
    });
    onClose();
  };

  return (
    <div className="absolute right-0 top-full z-40 mt-2 w-80 rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-obsidian-surface sm:w-96">
      <div className="mb-4 flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-gold">EXAM PARAMETERS</span>
          <h4 className="text-sm font-semibold text-charcoal dark:text-zinc-100">調整模擬測驗參數</h4>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-charcoal dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          aria-label="關閉參數設定"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleApply} className="space-y-4">
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-slateink dark:text-zinc-400">每次抽題數量</span>
            <span className="font-mono font-semibold text-charcoal dark:text-zinc-100">
              {safeCount} / {totalQuestions} 題
            </span>
          </div>

          {countPresets.length > 1 && (
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              {countPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setQuestionCount(preset)}
                  className={`rounded-md border px-2 py-1 font-mono text-[11px] transition ${
                    safeCount === preset
                      ? 'border-gold bg-gold-muted font-semibold text-charcoal dark:text-gold'
                      : 'border-zinc-200 text-slateink hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400'
                  }`}
                >
                  {preset === totalQuestions ? `全部(${preset})` : `${preset}題`}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2.5">
            <input
              type="range"
              min={1}
              max={totalQuestions}
              value={safeCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="h-1.5 flex-1 cursor-pointer accent-gold"
            />
            <input
              type="number"
              min={1}
              max={totalQuestions}
              value={safeCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-16 rounded-md border border-zinc-300 bg-paper px-2 py-1 text-center font-mono text-xs text-charcoal dark:border-zinc-700 dark:bg-obsidian dark:text-zinc-100"
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-slateink dark:text-zinc-400">及格分數門檻</span>
            <span className="font-mono font-semibold text-gold">{safePass} 分</span>
          </div>
          <div className="flex items-center gap-1.5">
            {[60, 70, 80, 100].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setPassingScore(preset)}
                className={`flex-1 rounded-md border py-1.5 font-mono text-xs transition ${
                  safePass === preset
                    ? 'border-gold bg-gold-muted font-semibold text-charcoal dark:text-gold'
                    : 'border-zinc-200 text-slateink hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400'
                }`}
              >
                {preset}
              </button>
            ))}
            <input
              type="number"
              min={1}
              max={100}
              value={safePass}
              onChange={(e) => setPassingScore(Number(e.target.value))}
              className="w-14 rounded-md border border-zinc-300 bg-paper px-1.5 py-1.5 text-center font-mono text-xs text-charcoal dark:border-zinc-700 dark:bg-obsidian dark:text-zinc-100"
            />
          </div>
          <p className="mt-1.5 font-mono text-[11px] text-slateink dark:text-zinc-400">
            單題 {pointsPerQuestion} 分 · 需答對 {requiredCorrect} 題及格
          </p>
        </div>

        <div>
          <span className="mb-1.5 block text-xs text-slateink dark:text-zinc-400">抽題順序</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setShuffle(true)}
              className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition ${
                shuffle
                  ? 'border-gold bg-gold-muted text-charcoal dark:text-gold'
                  : 'border-zinc-200 text-slateink dark:border-zinc-700 dark:text-zinc-400'
              }`}
            >
              <Shuffle className="h-3.5 w-3.5" />
              隨機抽題
            </button>
            <button
              type="button"
              onClick={() => setShuffle(false)}
              className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition ${
                !shuffle
                  ? 'border-gold bg-gold-muted text-charcoal dark:text-gold'
                  : 'border-zinc-200 text-slateink dark:border-zinc-700 dark:text-zinc-400'
              }`}
            >
              <ListOrdered className="h-3.5 w-3.5" />
              依序前 {safeCount} 題
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-charcoal py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-gold dark:text-charcoal dark:hover:bg-gold-hover"
        >
          <Check className="h-3.5 w-3.5" />
          套用並重新抽題
        </button>
      </form>
    </div>
  );
}
