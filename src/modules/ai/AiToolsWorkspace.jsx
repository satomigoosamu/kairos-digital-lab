import React, { useState } from 'react';
import { Copy, Check, FileJson } from 'lucide-react';

export default function AiToolsWorkspace() {
  const [copied, setCopied] = useState(false);
  const [questionGoal, setQuestionGoal] = useState('10');
  const [focusTopic, setFocusTopic] = useState('半導體廠務工安與法規重點');

  const promptTemplate = `請扮演專業命題與考題結構化助手。請根據我提供的講義或題庫內容，整理出 ${questionGoal} 題測驗題（主題聚焦：${focusTopic}），並「嚴格只輸出合法 JSON 陣列」，不要包含任何 Markdown 標記說明文字，格式如下：

[
  {
    "question": "完整題幹敘述",
    "options": [
      "選項 A 內容",
      "選項 B 內容",
      "選項 C 內容",
      "選項 D 內容"
    ],
    "answer": "A",
    "explanation": "簡明扼要的法規或觀念白話解析"
  }
]

注意事項：
1. 選擇題 answer 欄位請填寫 "A"、"B"、"C" 或 "D"；若是是非題，options 請填 ["O（正確）", "X（錯誤）"]，answer 填 "O" 或 "X"。
2. 直接輸出純 JSON 陣列，方便我複製貼入 Kairos 題庫練習室。`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(promptTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-gold">AI WORKFLOW HELPER</span>
          <h2 className="text-lg font-bold tracking-tight text-charcoal dark:text-zinc-100">
            講義轉 JSON 題庫指令產生器
          </h2>
        </div>
        <span className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 font-mono text-xs text-slateink dark:border-zinc-800 dark:bg-obsidian-surface dark:text-zinc-400">
          ZERO-API PROMPT TOOL
        </span>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-obsidian-surface">
        <div className="mb-4 flex items-center gap-2">
          <FileJson className="h-4 w-4 text-gold" />
          <h3 className="text-sm font-semibold text-charcoal dark:text-zinc-100">
            遇到掃描版 PDF 或純講義筆記？一鍵複製結構化出題指令
          </h3>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-slateink dark:text-zinc-400">預計生成題數</label>
            <input
              type="number"
              min={1}
              max={50}
              value={questionGoal}
              onChange={(e) => setQuestionGoal(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-paper px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-obsidian"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slateink dark:text-zinc-400">考試科目 / 重點方向</label>
            <input
              type="text"
              value={focusTopic}
              onChange={(e) => setFocusTopic(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-paper px-3 py-2 text-xs dark:border-zinc-700 dark:bg-obsidian"
            />
          </div>
        </div>

        <div className="relative">
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-zinc-200 bg-paper p-4 font-mono text-xs leading-relaxed text-charcoal dark:border-zinc-800 dark:bg-obsidian dark:text-zinc-300">
            {promptTemplate}
          </pre>

          <button
            type="button"
            onClick={handleCopy}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-charcoal px-4 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-gold dark:text-charcoal dark:hover:bg-gold-hover"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? '已複製指令，可貼給 AI 轉換題庫' : '複製指令並前往匯入題庫'}
          </button>
        </div>
      </div>
    </div>
  );
}
