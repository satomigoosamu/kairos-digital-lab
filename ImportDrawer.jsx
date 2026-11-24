import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  FileJson,
  AlignLeft,
  Download,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Shuffle,
  ListOrdered,
  Eye,
} from 'lucide-react';
import {
  parsePdfFileWithDiagnostics,
  parseQuestionsWithDiagnostics,
  parseQuestionsFromJson,
  SAMPLE_JSON_TEMPLATE,
} from '../../utils/pdfParser';

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

export default function ImportDrawer({ isOpen, onClose, onCreateProject }) {
  const [sourceTab, setSourceTab] = useState('pdf');
  const [projectTitle, setProjectTitle] = useState('');
  const [rawText, setRawText] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [missingNumbers, setMissingNumbers] = useState([]);
  const [isParsing, setIsParsing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [questionCount, setQuestionCount] = useState(20);
  const [passingScore, setPassingScore] = useState(80);
  const [shuffle, setShuffle] = useState(true);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const resetState = () => {
    setProjectTitle('');
    setRawText('');
    setParsedQuestions([]);
    setMissingNumbers([]);
    setErrorMsg('');
    setQuestionCount(20);
    setPassingScore(80);
    setShuffle(true);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const applyParsedResult = (resultObj, defaultTitle) => {
    const questions = Array.isArray(resultObj) ? resultObj : resultObj.questions;
    const missing = Array.isArray(resultObj) ? [] : (resultObj.missingNumbers || []);

    if (!questions || questions.length === 0) {
      setErrorMsg('未能識別出題目格式。請確認包含題號（如 1. 或 17）與選項（(1)(2)(3)(4)、(A)(B)(C)(D) 或是非題 O / X），或改用 JSON 匯入。');
      setParsedQuestions([]);
      setMissingNumbers([]);
      return;
    }
    setErrorMsg(Array.isArray(resultObj) ? '' : (resultObj.warnings || []).join(' '));
    setParsedQuestions(questions);
    setMissingNumbers(missing);
    setQuestionCount(Math.min(20, questions.length));
    if (!projectTitle.trim() && defaultTitle) {
      setProjectTitle(defaultTitle.replace(/\.(pdf|json|txt)$/i, ''));
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setErrorMsg('');
    setIsParsing(true);
    try {
      const ext = file.name.split('.').pop().toLowerCase();
      if (ext === 'pdf') {
        const result = await parsePdfFileWithDiagnostics(file);
        applyParsedResult(result, file.name);
      } else if (ext === 'json') {
        const text = await file.text();
        const questions = parseQuestionsFromJson(text);
        applyParsedResult(questions, file.name);
      } else {
        const text = await file.text();
        const result = parseQuestionsWithDiagnostics(text);
        applyParsedResult(result, file.name);
      }
    } catch (err) {
      setErrorMsg(`檔案解析失敗：${err.message || '請確認檔案未加密且格式正確'}`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleParseManualText = () => {
    setErrorMsg('');
    try {
      if (sourceTab === 'json') {
        const qs = parseQuestionsFromJson(rawText);
        applyParsedResult(qs, '自訂 JSON 題庫');
      } else {
        const result = parseQuestionsWithDiagnostics(rawText);
        applyParsedResult(result, '自訂文字題庫');
      }
    } catch (err) {
      setErrorMsg(`格式解析錯誤：${err.message}`);
    }
  };

  const handleDownloadSampleJson = () => {
    const blob = new Blob([SAMPLE_JSON_TEMPLATE], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kairos-exam-template.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirmCreate = () => {
    if (parsedQuestions.length === 0) return;
    const safeCount = Math.min(Math.max(1, Number(questionCount) || parsedQuestions.length), parsedQuestions.length);
    const safePass = Math.min(Math.max(1, Number(passingScore) || 60), 100);

    onCreateProject({
      id: `proj-${Date.now()}`,
      title: projectTitle.trim() || `未命名考卷 (${parsedQuestions.length}題)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      config: {
        questionCount: safeCount,
        passingScore: safePass,
        shuffle,
      },
      wrongQuestionIds: [],
      wrongCounts: {},
      lastExamSummary: null,
      questions: parsedQuestions,
    });
    handleClose();
  };

  const effectiveCount =
    parsedQuestions.length > 0
      ? Math.min(Math.max(1, Number(questionCount) || parsedQuestions.length), parsedQuestions.length)
      : 0;
  const pointsPerQuestion = effectiveCount > 0 ? (100 / effectiveCount).toFixed(2) : '0.00';
  const requiredCorrect = effectiveCount > 0 ? Math.ceil((passingScore / 100) * effectiveCount) : 0;

  const countPresets = Array.from(
    new Set([10, 20, 30, 50, 100, parsedQuestions.length].filter((n) => n >= 1 && n <= parsedQuestions.length))
  ).sort((a, b) => a - b);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-[2px]">
      <div className="relative flex h-full w-full max-w-xl flex-col border-l border-zinc-200 bg-paper shadow-2xl dark:border-zinc-800 dark:bg-obsidian">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div>
            <span className="font-mono text-xs uppercase tracking-wider text-gold">NEW EXAM WORKSPACE</span>
            <h2 className="text-lg font-semibold tracking-tight text-charcoal dark:text-zinc-100">
              匯入題庫與考前參數設定
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-200/70 hover:text-charcoal dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            aria-label="關閉抽屜"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div>
            <label className="mb-2 block text-xs font-medium text-slateink dark:text-zinc-400">
              選擇題庫來源格式（純瀏覽器本機運算，檔案不上傳伺服器）
            </label>
            <div className="grid grid-cols-3 gap-2 rounded-lg border border-zinc-200 bg-zinc-100/80 p-1 dark:border-zinc-800 dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => { setSourceTab('pdf'); setErrorMsg(''); }}
                className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition ${
                  sourceTab === 'pdf'
                    ? 'bg-white text-charcoal shadow-sm dark:bg-obsidian-surface dark:text-gold'
                    : 'text-zinc-600 hover:text-charcoal dark:text-zinc-400'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                PDF / 檔案上傳
              </button>
              <button
                type="button"
                onClick={() => { setSourceTab('text'); setErrorMsg(''); }}
                className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition ${
                  sourceTab === 'text'
                    ? 'bg-white text-charcoal shadow-sm dark:bg-obsidian-surface dark:text-gold'
                    : 'text-zinc-600 hover:text-charcoal dark:text-zinc-400'
                }`}
              >
                <AlignLeft className="h-3.5 w-3.5" />
                貼上題庫純文字
              </button>
              <button
                type="button"
                onClick={() => { setSourceTab('json'); setErrorMsg(''); }}
                className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition ${
                  sourceTab === 'json'
                    ? 'bg-white text-charcoal shadow-sm dark:bg-obsidian-surface dark:text-gold'
                    : 'text-zinc-600 hover:text-charcoal dark:text-zinc-400'
                }`}
              >
                <FileJson className="h-3.5 w-3.5" />
                JSON 結構化匯入
              </button>
            </div>
          </div>

          {sourceTab === 'pdf' && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="group cursor-pointer rounded-xl border-2 border-dashed border-zinc-300 bg-white p-6 text-center transition hover:border-gold dark:border-zinc-700 dark:bg-obsidian-surface dark:hover:border-gold"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.json,.txt"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files?.[0])}
              />
              <div className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-paper text-charcoal transition group-hover:border-gold group-hover:text-gold dark:border-zinc-700 dark:bg-obsidian dark:text-zinc-200">
                <Upload className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-charcoal dark:text-zinc-100">
                {isParsing ? '正在透過 2D 座標錨點引擎解析多行表格...' : '拖曳 PDF / JSON / TXT 題庫至此，或點擊選擇本機檔案'}
              </p>
              <p className="mt-1 text-xs text-slateink dark:text-zinc-400">
                支援多行儲存格表格、五欄修訂題庫、(1)(2)(3)(4) 選擇題及是非題（O / X）
              </p>
            </div>
          )}

          {(sourceTab === 'text' || sourceTab === 'json') && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slateink dark:text-zinc-400">
                  {sourceTab === 'json' ? '貼上 JSON 陣列內容' : '貼上題庫文字（支援選擇題或是非題 O / X）'}
                </span>
                {sourceTab === 'json' && (
                  <button
                    type="button"
                    onClick={handleDownloadSampleJson}
                    className="inline-flex items-center gap-1 font-mono text-xs text-gold hover:underline"
                  >
                    <Download className="h-3.5 w-3.5" />
                    下載 JSON 範本
                  </button>
                )}
              </div>
              <textarea
                rows={6}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={
                  sourceTab === 'json'
                    ? SAMPLE_JSON_TEMPLATE
                    : '85 選擇風險控制措施時應優先選擇下列何者?(1)個人防護具(2)工程控制(3)管理控制(4)消除 4'
                }
                className="w-full rounded-lg border border-zinc-300 bg-white p-3 font-mono text-xs text-charcoal focus:border-gold focus:outline-none dark:border-zinc-700 dark:bg-obsidian-surface dark:text-zinc-100"
              />
              <button
                type="button"
                onClick={handleParseManualText}
                className="w-full rounded-lg border border-charcoal bg-charcoal py-2 text-xs font-medium text-white transition hover:bg-zinc-800 dark:border-gold dark:bg-gold dark:text-charcoal dark:hover:bg-gold-hover"
              >
                解析內容並預覽題數
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50/80 p-3.5 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {parsedQuestions.length > 0 && (
            <div className="space-y-5 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-obsidian-surface">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-xs font-semibold">
                    成功切分 <span className="font-mono text-sm">{parsedQuestions.length}</span> 道獨立題目
                  </span>
                </div>
                <span className="font-mono text-[11px] text-slateink dark:text-zinc-400">2D ANCHOR ENGINE</span>
              </div>

              {missingNumbers.length > 0 && missingNumbers.length <= 15 && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <div>
                    <span className="font-semibold">原檔缺號提示：</span>
                    原文件編號序列中未出現{' '}
                    <span className="font-mono font-bold">
                      {missingNumbers.map((n) => `第 ${n} 號`).join('、')}
                    </span>
                    （未自動補題；刪除及異常題另見匯入提示）。
                  </div>
                </div>
              )}

              <div>
                <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-charcoal dark:text-zinc-200">
                  <Eye className="h-3.5 w-3.5 text-gold" />
                  <span>題目與選項預覽（顯示前 {Math.min(5, parsedQuestions.length)} 題）</span>
                </div>
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-zinc-200 bg-paper p-2.5 dark:border-zinc-800 dark:bg-obsidian">
                  {parsedQuestions.slice(0, 5).map((q, i) => (
                    <div
                      key={q.id}
                      className="rounded-md border border-zinc-200/80 bg-white p-2.5 text-xs dark:border-zinc-800 dark:bg-obsidian-surface"
                    >
                      <div className="mb-1 flex items-center justify-between font-mono text-[11px]">
                        <span className="font-semibold text-gold">
                          Q{i + 1} · {q.options.length} 個選項
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400">
                          正解：{OPTION_LABELS[q.answerIndex]} ({q.options[q.answerIndex]?.slice(0, 12)})
                        </span>
                      </div>
                      <p className="line-clamp-2 text-charcoal dark:text-zinc-200">{q.question}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-charcoal dark:text-zinc-200">
                  考試分頁名稱
                </label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="例如：美光工安認證、廠務 HVAC 題庫"
                  className="w-full rounded-lg border border-zinc-300 bg-paper px-3 py-2 text-sm text-charcoal focus:border-gold focus:outline-none dark:border-zinc-700 dark:bg-obsidian dark:text-zinc-100"
                />
              </div>

              <div className="space-y-4 pt-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-charcoal dark:text-zinc-200">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-gold" />
                  <span>模擬測驗出題參數（建立後仍可隨時調整）</span>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-slateink dark:text-zinc-400">每次模擬測驗抽題數</span>
                    <span className="font-mono font-semibold text-charcoal dark:text-zinc-100">
                      {effectiveCount} / {parsedQuestions.length} 題
                    </span>
                  </div>

                  {countPresets.length > 1 && (
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      {countPresets.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setQuestionCount(preset)}
                          className={`rounded-md border px-2.5 py-1 font-mono text-xs transition ${
                            effectiveCount === preset
                              ? 'border-gold bg-gold-muted font-semibold text-charcoal dark:text-gold'
                              : 'border-zinc-200 text-slateink hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-400'
                          }`}
                        >
                          {preset === parsedQuestions.length ? `全部 (${preset})` : `${preset}題`}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={parsedQuestions.length}
                      value={effectiveCount}
                      onChange={(e) => setQuestionCount(Number(e.target.value))}
                      className="h-1.5 flex-1 cursor-pointer accent-gold"
                    />
                    <input
                      type="number"
                      min={1}
                      max={parsedQuestions.length}
                      value={effectiveCount}
                      onChange={(e) => setQuestionCount(Number(e.target.value))}
                      className="w-16 rounded-md border border-zinc-300 bg-paper px-2 py-1 text-center font-mono text-xs dark:border-zinc-700 dark:bg-obsidian"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-slateink dark:text-zinc-400">及格分數門檻</span>
                    <span className="font-mono font-semibold text-gold">{passingScore} 分</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {[60, 70, 80, 100].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setPassingScore(preset)}
                        className={`flex-1 rounded-md border py-1.5 font-mono text-xs transition ${
                          passingScore === preset
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
                      value={passingScore}
                      onChange={(e) => setPassingScore(Number(e.target.value))}
                      className="w-16 rounded-md border border-zinc-300 bg-paper px-2 py-1.5 text-center font-mono text-xs dark:border-zinc-700 dark:bg-obsidian"
                    />
                  </div>
                  <p className="mt-1.5 font-mono text-[11px] text-slateink dark:text-zinc-400">
                    單題配分 {pointsPerQuestion} 分 · 至少需答對 {requiredCorrect} 題通過
                  </p>
                </div>

                <div>
                  <span className="mb-1.5 block text-xs text-slateink dark:text-zinc-400">抽題與出題順序</span>
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
                      隨機抽題並打亂
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
                      依原題庫前 {effectiveCount} 題
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-obsidian-surface">
          <button
            type="button"
            disabled={parsedQuestions.length === 0}
            onClick={handleConfirmCreate}
            className="w-full rounded-lg bg-charcoal py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-gold dark:text-charcoal dark:hover:bg-gold-hover"
          >
            建立考試工作區（模擬測驗 {effectiveCount} 題）
          </button>
        </div>
      </div>
    </div>
  );
}
