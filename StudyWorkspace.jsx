import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ClipboardCheck,
  BookOpen,
  RotateCcw,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Star,
  CheckCircle2,
  XCircle,
  Award,
  Filter,
  Trash2,
  RefreshCw,
  Search,
} from 'lucide-react';
import { shortcutIndex } from '../../utils/studyShortcuts';
import QuestionEditor from './QuestionEditor';
import ExamHistory from './ExamHistory';
import { readSession, writeSession, questionSignature, examRecord, appendHistory } from '../../utils/studyProgress';
import ExamConfigPopover from './ExamConfigPopover';

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
const NAV_PAGE_SIZE = 20;

function buildSessionQuestions(project) {
  const all = [...project.questions];
  if (project.config.shuffle) {
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
  }
  const count = Math.min(Math.max(1, project.config.questionCount || all.length), all.length);
  return all.slice(0, count);
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function StudyWorkspace({ project, onSaveProject }) {
  const [showEditor, setShowEditor] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [ready, setReady] = useState(false);
  const submitting = useRef(false);
  const sessionMeta = useRef({ id: crypto.randomUUID(), startedAt: Date.now() });
  const signature = useMemo(() => questionSignature(project), [project.config, project.questions, project.questionRevision]);
  const [mode, setMode] = useState('mock');
  const [showConfigPopover, setShowConfigPopover] = useState(false);

  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [starredIds, setStarredIds] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [onlyWrongFilter, setOnlyWrongFilter] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [navPage, setNavPage] = useState(0);
  const [searchNumInput, setSearchNumInput] = useState('');

  const [autoRemoveOnCorrect, setAutoRemoveOnCorrect] = useState(true);
  const [wrongPracticeAnswers, setWrongPracticeAnswers] = useState({});

  const startNewSession = useCallback(
    (targetProject = project) => {
      if (!targetProject) return;
      sessionMeta.current = { id: crypto.randomUUID(), startedAt: Date.now() };
      setProgressMessage('已開始新的測驗。');
      const qs = buildSessionQuestions(targetProject);
      setSessionQuestions(qs);
      setCurrentIndex(0);
      setNavPage(0);
      setSearchNumInput('');
      setAnswers({});
      setStarredIds({});
      setIsSubmitted(false);
      setOnlyWrongFilter(true);
      setElapsedSeconds(0);
    },
    [project]
  );

  const confirmRestart = () => !submitting.current && (isSubmitted || Object.keys(answers).length === 0 || confirm('此操作會清除目前答案並開始新測驗，確定繼續？'));
  const restartSession = (nextMode = mode) => {
    if (!confirmRestart()) return;
    setMode(nextMode);startNewSession(project);
  };

  useEffect(() => {
    setReady(false);
    try {
      const saved = readSession(project);
      if (saved) {
        sessionMeta.current = { id:saved.id, startedAt:saved.startedAt };
        setMode(saved.mode);setSessionQuestions(saved.questions);setCurrentIndex(saved.currentIndex);
        setAnswers(saved.answers);setStarredIds(saved.starredIds);setIsSubmitted(saved.isSubmitted);
        setElapsedSeconds(saved.elapsedSeconds);setOnlyWrongFilter(true);
        setProgressMessage(saved.isSubmitted ? '已恢復上次交卷結果。' : '已恢復上次未完成的作答，離開期間不計時。');
      } else { startNewSession(project); }
    } catch { startNewSession(project);setProgressMessage('無法讀取續答資料，已建立新測驗。'); }
    setWrongPracticeAnswers({});setReady(true);
  }, [project.id, signature]);

  useEffect(() => {
    if (!ready || !sessionQuestions.length) return;
    try {
      writeSession(project, {...sessionMeta.current, mode, questionIds:sessionQuestions.map(q=>q.id), currentIndex, answers, starredIds, isSubmitted, elapsedSeconds});
    } catch { setProgressMessage('無法儲存續答，請勿關閉此頁，並檢查瀏覽器儲存空間。'); }
  }, [ready, mode, sessionQuestions, currentIndex, answers, starredIds, isSubmitted, elapsedSeconds]);

  useEffect(() => {
    setNavPage(Math.floor(currentIndex / NAV_PAGE_SIZE));
  }, [currentIndex]);

  useEffect(() => {
    if (mode !== 'mock' || showEditor || isSubmitted || sessionQuestions.length === 0) return;
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [mode, showEditor, isSubmitted, sessionQuestions.length]);

  const currentQuestion = sessionQuestions[currentIndex] || null;

  const recordWrongQuestions = useCallback(
    (wrongIds) => {
      if (!project || wrongIds.length === 0) return;
      const existingSet = new Set(project.wrongQuestionIds || []);
      const nextCounts = { ...(project.wrongCounts || {}) };

      wrongIds.forEach((qid) => {
        existingSet.add(qid);
        nextCounts[qid] = (nextCounts[qid] || 0) + 1;
      });

      onSaveProject({
        ...project,
        wrongQuestionIds: Array.from(existingSet),
        wrongCounts: nextCounts,
      });
    },
    [project, onSaveProject]
  );

  const removeWrongQuestion = (qid) => {
    if (!project) return;
    const nextIds = (project.wrongQuestionIds || []).filter((id) => id !== qid);
    const nextCounts = { ...(project.wrongCounts || {}) };
    delete nextCounts[qid];
    onSaveProject({
      ...project,
      wrongQuestionIds: nextIds,
      wrongCounts: nextCounts,
    });
  };

  const handleSelectOption = (optionIdx) => {
    if (!currentQuestion) return;
    if (submitting.current) return;
    if (mode === 'mock' && isSubmitted) return;
    if (mode === 'practice' && answers[currentQuestion.id] !== undefined) return;

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionIdx,
    }));

    if (mode === 'practice' && optionIdx !== currentQuestion.answerIndex) {
      recordWrongQuestions([currentQuestion.id]);
    }
  };

  const handleJumpToQuestion = (e) => {
    e.preventDefault();
    const num = parseInt(searchNumInput, 10);
    if (!Number.isFinite(num) || num < 1 || num > sessionQuestions.length) return;
    const targetIdx = num - 1;
    setCurrentIndex(targetIdx);
    setNavPage(Math.floor(targetIdx / NAV_PAGE_SIZE));
    setSearchNumInput('');
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (submitting.current || showEditor || showConfigPopover || e.target.isContentEditable || e.ctrlKey || e.metaKey || e.altKey || ['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
      if (mode === 'wrong') return;
      if (mode === 'mock' && isSubmitted) return;
      if (!currentQuestion) return;

      const optionIndex = shortcutIndex(e.key, currentQuestion.options);
      if (optionIndex !== null) {
        e.preventDefault();
        handleSelectOption(optionIndex);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentIndex((prev) => Math.min(sessionQuestions.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleSubmitMockExam = async () => {
    if (submitting.current || isSubmitted || !sessionQuestions.length) return;
    const remaining = sessionQuestions.filter(q => answers[q.id] === undefined).length;
    if (remaining && !confirm(`還有 ${remaining} 題未作答，未答題將計為錯誤。確定交卷？`)) return;
    submitting.current = true;
    try {
      if ((project.examHistory || []).some(r => r.id === sessionMeta.current.id)) {
        setIsSubmitted(true);setProgressMessage('此份測驗已交卷，已恢復結果。');return;
      }
      const wrongIds = sessionQuestions.filter(q => answers[q.id] !== q.answerIndex).map(q=>q.id);
      const wrongCounts = {...project.wrongCounts};
      wrongIds.forEach(id => { wrongCounts[id] = (wrongCounts[id] || 0) + 1; });
      const record = examRecord(project, sessionQuestions, answers, sessionMeta.current, elapsedSeconds);
      await onSaveProject({...project, wrongQuestionIds:[...new Set([...(project.wrongQuestionIds || []),...wrongIds])], wrongCounts, lastExamSummary:record, examHistory:appendHistory(project.examHistory,record)});
      setIsSubmitted(true);setOnlyWrongFilter(wrongIds.length > 0);
      setProgressMessage('成績已儲存至本機歷史紀錄。');
    } catch { setProgressMessage('交卷儲存失敗，答案仍保留，請重試交卷。'); }
    finally { submitting.current = false; }
  };

  const examResult = useMemo(() => {
    if (!isSubmitted || sessionQuestions.length === 0) return null;
    let correctCount = 0;
    const reviewItems = sessionQuestions.map((q, idx) => {
      const userAns = answers[q.id];
      const isCorrect = userAns === q.answerIndex;
      if (isCorrect) correctCount += 1;
      return {
        ...q,
        index: idx + 1,
        userAnswerIndex: userAns,
        isCorrect,
      };
    });

    const total = sessionQuestions.length;
    const score = Math.round((correctCount / total) * 100);
    const passed = correctCount * 100 >= (project?.config?.passingScore || 60) * total;
    return {
      score,
      correctCount,
      wrongCount: total - correctCount,
      total,
      passed,
      reviewItems,
    };
  }, [isSubmitted, sessionQuestions, answers, project?.config?.passingScore]);

  const wrongQuestionsList = useMemo(() => {
    if (!project) return [];
    const idSet = new Set(project.wrongQuestionIds || []);
    return project.questions.filter((q) => idSet.has(q.id));
  }, [project]);

  if (!project) return null;

  const answeredCount = sessionQuestions.filter((q) => answers[q.id] !== undefined).length;
  const progressPct = sessionQuestions.length > 0 ? Math.round((answeredCount / sessionQuestions.length) * 100) : 0;

  const totalNavPages = Math.max(1, Math.ceil(sessionQuestions.length / NAV_PAGE_SIZE));
  const safeNavPage = Math.min(navPage, totalNavPages - 1);
  const pageStartIdx = safeNavPage * NAV_PAGE_SIZE;
  const pageQuestions = sessionQuestions.slice(pageStartIdx, pageStartIdx + NAV_PAGE_SIZE);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p role="status" className="text-xs text-slateink dark:text-zinc-400">{progressMessage}</p>
        <button type="button" onClick={()=>setShowEditor(true)} className="rounded-lg border border-zinc-300 px-3 py-2 text-xs dark:border-zinc-700">校正題庫</button>
      </div>
      <ExamHistory history={project.examHistory} />
      {showEditor && <QuestionEditor project={project} onSaveProject={onSaveProject} onClose={()=>setShowEditor(false)} />}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-100/80 p-1 dark:border-zinc-800 dark:bg-zinc-900">
          <button
            type="button"
            onClick={() => {
              restartSession('mock');
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition ${
              mode === 'mock'
                ? 'bg-white text-charcoal shadow-sm dark:bg-obsidian-surface dark:text-gold'
                : 'text-slateink hover:text-charcoal dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <ClipboardCheck className="h-3.5 w-3.5" />
            模擬測驗（交卷看錯題）
          </button>

          <button
            type="button"
            onClick={() => {
              restartSession('practice');
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition ${
              mode === 'practice'
                ? 'bg-white text-charcoal shadow-sm dark:bg-obsidian-surface dark:text-gold'
                : 'text-slateink hover:text-charcoal dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            逐題練習（即時回饋）
          </button>

          <button
            type="button"
            onClick={() => setMode('wrong')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition ${
              mode === 'wrong'
                ? 'bg-white text-charcoal shadow-sm dark:bg-obsidian-surface dark:text-gold'
                : 'text-slateink hover:text-charcoal dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            錯題本
            <span className="ml-0.5 rounded-full bg-zinc-200 px-1.5 py-0.2 font-mono text-[11px] text-charcoal dark:bg-zinc-800 dark:text-gold">
              {wrongQuestionsList.length}
            </span>
          </button>
        </div>

        <div className="relative flex items-center gap-2.5">
          <div className="hidden items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 font-mono text-xs text-slateink dark:border-zinc-800 dark:bg-obsidian-surface dark:text-zinc-400 sm:flex">
            <span>題數 {sessionQuestions.length}/{project.questions.length}</span>
            <span>·</span>
            <span className="text-gold">及格 {project.config.passingScore}分</span>
          </div>

          <button
            type="button"
            onClick={() => setShowConfigPopover((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-charcoal transition hover:border-gold dark:border-zinc-700 dark:bg-obsidian-surface dark:text-zinc-200"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-gold" />
            參數設定
          </button>

          {showConfigPopover && (
            <ExamConfigPopover
              project={project}
              onUpdateConfig={async (newConfig) => {
                if (newConfig.questionCount === project.config.questionCount && newConfig.passingScore === project.config.passingScore && newConfig.shuffle === project.config.shuffle) return true;
                if (!confirmRestart()) return false;
                submitting.current = true;
                try { await onSaveProject({ ...project, config:newConfig }); return true; }
                finally { submitting.current = false; }
              }}
              onClose={() => setShowConfigPopover(false)}
            />
          )}
        </div>
      </div>

      {mode === 'mock' && isSubmitted && examResult && (
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-obsidian-surface sm:p-8">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
              <div>
                <span className="font-mono text-xs uppercase tracking-widest text-slateink dark:text-zinc-400">
                  EXAMINATION REPORT · {project.title}
                </span>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="font-mono text-5xl font-bold tracking-tight text-charcoal dark:text-zinc-100">
                    {examResult.score}
                  </span>
                  <span className="font-mono text-sm text-slateink dark:text-zinc-400">
                    / 100 分（及格標準 {project.config.passingScore} 分）
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4 font-mono text-xs text-slateink dark:text-zinc-400">
                  <span>答對 {examResult.correctCount} 題</span>
                  <span>·</span>
                  <span className="text-red-600 dark:text-red-400">答錯 {examResult.wrongCount} 題</span>
                  <span>·</span>
                  <span>耗時 {formatDuration(elapsedSeconds)}</span>
                </div>
              </div>

              <div className="flex flex-col items-start gap-3 sm:items-end">
                {examResult.passed ? (
                  <div className="animate-stamp inline-flex items-center gap-2 rounded-lg border-2 border-gold bg-gold-muted px-4 py-2 font-mono text-sm font-bold tracking-wider text-charcoal dark:text-gold">
                    <Award className="h-5 w-5 text-gold" />
                    PASS · 通過檢定
                  </div>
                ) : (
                  <div className="animate-stamp inline-flex items-center gap-2 rounded-lg border-2 border-red-500/70 bg-red-500/10 px-4 py-2 font-mono text-sm font-bold tracking-wider text-red-600 dark:text-red-400">
                    <XCircle className="h-5 w-5" />
                    UNPASSED · 未達及格線
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => restartSession()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-charcoal px-4 py-2 text-xs font-medium text-white transition hover:bg-zinc-800 dark:bg-gold dark:text-charcoal dark:hover:bg-gold-hover"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  重新抽題再測一次
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-charcoal dark:text-zinc-100">
              試卷逐題檢討（錯題已自動收入錯題本）
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOnlyWrongFilter(true)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  onlyWrongFilter
                    ? 'border-gold bg-gold-muted text-charcoal dark:text-gold'
                    : 'border-zinc-200 bg-white text-slateink dark:border-zinc-800 dark:bg-obsidian-surface dark:text-zinc-400'
                }`}
              >
                <Filter className="h-3.5 w-3.5" />
                只看錯題 ({examResult.wrongCount})
              </button>
              <button
                type="button"
                onClick={() => setOnlyWrongFilter(false)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  !onlyWrongFilter
                    ? 'border-gold bg-gold-muted text-charcoal dark:text-gold'
                    : 'border-zinc-200 bg-white text-slateink dark:border-zinc-800 dark:bg-obsidian-surface dark:text-zinc-400'
                }`}
              >
                顯示全部 ({examResult.total})
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {examResult.reviewItems
              .filter((item) => (!onlyWrongFilter ? true : !item.isCorrect))
              .map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-obsidian-surface"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-slateink dark:text-zinc-400">
                      Q{String(item.index).padStart(2, '0')}
                    </span>
                    {item.isCorrect ? (
                      <span className="inline-flex items-center gap-1 font-mono text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        答對
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-mono text-xs font-medium text-red-600 dark:text-red-400">
                        <XCircle className="h-3.5 w-3.5" />
                        {item.userAnswerIndex === undefined
                          ? '未作答'
                          : `誤選 (${OPTION_LABELS[item.userAnswerIndex]})`}
                      </span>
                    )}
                  </div>

                  <p className="mb-4 text-sm font-medium leading-relaxed text-charcoal dark:text-zinc-100">
                    {item.question}
                  </p>

                  <div className="space-y-2">
                    {item.options.map((opt, optIdx) => {
                      const isRight = optIdx === item.answerIndex;
                      const isUserWrong = optIdx === item.userAnswerIndex && !isRight;
                      return (
                        <div
                          key={optIdx}
                          className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-xs ${
                            isRight
                              ? 'border-emerald-500/60 bg-emerald-50/70 text-emerald-950 dark:border-emerald-500/40 dark:bg-emerald-950/30 dark:text-emerald-200'
                              : isUserWrong
                              ? 'border-red-400/60 bg-red-50/70 text-red-950 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-200'
                              : 'border-zinc-100 bg-paper/60 text-slateink dark:border-zinc-800/80 dark:bg-obsidian/40 dark:text-zinc-400'
                          }`}
                        >
                          <span className="font-mono font-bold">{OPTION_LABELS[optIdx]}.</span>
                          <span className="flex-1">{opt}</span>
                          {isRight && <span className="font-mono text-[11px] font-semibold">正解</span>}
                          {isUserWrong && <span className="font-mono text-[11px] font-semibold">你的選項</span>}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 rounded-lg border-l-2 border-gold bg-paper px-3.5 py-2.5 text-xs leading-relaxed text-slateink dark:bg-obsidian dark:text-zinc-300">
                    <span className="font-semibold text-charcoal dark:text-gold">解析：</span>
                    {item.explanation}
                  </div>
                </div>
              ))}

            {onlyWrongFilter && examResult.wrongCount === 0 && (
              <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-slateink dark:border-zinc-800 dark:bg-obsidian-surface dark:text-zinc-400">
                本次測驗全數答對，沒有任何錯題。
              </div>
            )}
          </div>
        </div>
      )}

      {(mode === 'practice' || (mode === 'mock' && !isSubmitted)) && currentQuestion && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-obsidian-surface sm:p-7">
              <div className="mb-5">
                <div className="mb-2 flex items-center justify-between font-mono text-xs text-slateink dark:text-zinc-400">
                  <span>
                    QUESTION {String(currentIndex + 1).padStart(2, '0')} / {String(sessionQuestions.length).padStart(2, '0')}
                  </span>
                  <div className="flex items-center gap-3">
                    {mode === 'mock' && <span>TIME {formatDuration(elapsedSeconds)}</span>}
                    <span>已作答 {progressPct}%</span>
                  </div>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full bg-gold transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              <div className="mb-6 flex items-start justify-between gap-3">
                <h2 className="min-w-0 [overflow-wrap:anywhere] text-base font-semibold leading-relaxed text-charcoal dark:text-zinc-100 sm:text-lg">
                  {currentQuestion.question}
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    setStarredIds((prev) => ({
                      ...prev,
                      [currentQuestion.id]: !prev[currentQuestion.id],
                    }))
                  }
                  title="星號標記此題稍後檢查"
                  className={`shrink-0 rounded-lg border p-2 transition ${
                    starredIds[currentQuestion.id]
                      ? 'border-gold bg-gold-muted text-gold'
                      : 'border-zinc-200 text-zinc-400 hover:text-gold dark:border-zinc-700'
                  }`}
                >
                  <Star className={`h-4 w-4 ${starredIds[currentQuestion.id] ? 'fill-gold text-gold' : ''}`} />
                </button>
              </div>

              <div className="space-y-3">
                {currentQuestion.options.map((opt, idx) => {
                  const selectedIdx = answers[currentQuestion.id];
                  const hasAnswered = selectedIdx !== undefined;
                  const isSelected = selectedIdx === idx;
                  const isCorrect = idx === currentQuestion.answerIndex;

                  let cardStyle =
                    'border-zinc-200 bg-paper/50 hover:border-zinc-400 dark:border-zinc-800 dark:bg-obsidian/50 dark:hover:border-zinc-600';

                  if (mode === 'mock') {
                    if (isSelected) {
                      cardStyle =
                        'border-gold bg-gold-muted text-charcoal ring-1 ring-gold dark:text-zinc-100';
                    }
                  } else if (mode === 'practice' && hasAnswered) {
                    if (isCorrect) {
                      cardStyle =
                        'border-emerald-500 bg-emerald-50/80 text-emerald-950 dark:border-emerald-500/60 dark:bg-emerald-950/30 dark:text-emerald-200';
                    } else if (isSelected && !isCorrect) {
                      cardStyle =
                        'border-red-400 bg-red-50/80 text-red-950 dark:border-red-500/60 dark:bg-red-950/30 dark:text-red-200';
                    } else {
                      cardStyle = 'border-zinc-200 opacity-60 dark:border-zinc-800';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectOption(idx)}
                      className={`flex w-full items-start gap-3.5 rounded-xl border p-4 text-left text-sm transition ${cardStyle}`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border font-mono text-xs font-semibold ${
                          isSelected
                            ? 'border-gold bg-gold text-charcoal'
                            : 'border-zinc-300 bg-white text-slateink dark:border-zinc-700 dark:bg-obsidian-surface dark:text-zinc-300'
                        }`}
                      >
                        {OPTION_LABELS[idx]}
                      </span>
                      <span className="flex-1 leading-relaxed">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {mode === 'practice' && answers[currentQuestion.id] !== undefined && (
                <div className="mt-5 rounded-xl border-l-2 border-gold bg-paper p-4 text-xs leading-relaxed text-slateink dark:bg-obsidian dark:text-zinc-300">
                  <div className="mb-1 flex items-center gap-2 font-mono font-semibold">
                    {answers[currentQuestion.id] === currentQuestion.answerIndex ? (
                      <span className="text-emerald-600 dark:text-emerald-400">✓ 回答正確</span>
                    ) : (
                      <span className="text-red-600 dark:text-red-400">
                        ✗ 正確答案為 ({OPTION_LABELS[currentQuestion.answerIndex]}) — 已自動加入錯題本
                      </span>
                    )}
                  </div>
                  <p>{currentQuestion.explanation}</p>
                </div>
              )}

              <div className="mt-7 flex items-center justify-between border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3.5 py-2 text-xs font-medium text-charcoal transition hover:bg-zinc-100 disabled:opacity-35 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <ChevronLeft className="h-4 w-4" />
                  上一題
                </button>

                <span className="hidden font-mono text-[11px] text-zinc-400 sm:inline">
                  快捷鍵：A-D / O-X 作答 · ← → 換題
                </span>

                {currentIndex < sessionQuestions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((prev) => Math.min(sessionQuestions.length - 1, prev + 1))}
                    className="inline-flex items-center gap-1 rounded-lg bg-charcoal px-4 py-2 text-xs font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-charcoal dark:hover:bg-white"
                  >
                    下一題
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : mode === 'mock' ? (
                  <button
                    type="button"
                    onClick={handleSubmitMockExam}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-5 py-2 text-xs font-bold text-charcoal shadow-sm transition hover:bg-gold-hover"
                  >
                    <ClipboardCheck className="h-4 w-4" />
                    交卷並查看成績
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => restartSession()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-xs font-bold text-charcoal transition hover:bg-gold-hover"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    重新一輪練習
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-obsidian-surface">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-charcoal dark:text-zinc-100">題號預覽卡</span>
                <span className="font-mono text-xs text-slateink dark:text-zinc-400">
                  {answeredCount}/{sessionQuestions.length}
                </span>
              </div>

              <form onSubmit={handleJumpToQuestion} className="mb-3 flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="number"
                    min={1}
                    max={sessionQuestions.length}
                    value={searchNumInput}
                    onChange={(e) => setSearchNumInput(e.target.value)}
                    placeholder={`搜尋題號 (1-${sessionQuestions.length})`}
                    className="w-full rounded-lg border border-zinc-200 bg-paper py-1.5 pl-8 pr-2 font-mono text-xs text-charcoal focus:border-gold focus:outline-none dark:border-zinc-700 dark:bg-obsidian dark:text-zinc-100"
                  />
                </div>
                <button
                  type="submit"
                  className="shrink-0 rounded-lg border border-zinc-300 bg-paper px-2.5 py-1.5 text-xs font-medium text-charcoal transition hover:border-gold hover:text-gold dark:border-zinc-700 dark:bg-obsidian dark:text-zinc-200"
                >
                  跳轉
                </button>
              </form>

              <div className="mb-3 flex flex-wrap items-center gap-3 text-[11px] text-slateink dark:text-zinc-400">
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-sm bg-charcoal dark:bg-zinc-200" />
                  已作答
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-sm border border-zinc-300 dark:border-zinc-600" />
                  未作答
                </span>
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-gold text-gold" />
                  星號標記
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {pageQuestions.map((q, localIdx) => {
                  const globalIdx = pageStartIdx + localIdx;
                  const isCurrent = globalIdx === currentIndex;
                  const isDone = answers[q.id] !== undefined;
                  const isStarred = starredIds[q.id];

                  let btnClass =
                    'border-zinc-200 bg-paper text-slateink hover:border-zinc-400 dark:border-zinc-800 dark:bg-obsidian dark:text-zinc-400';

                  if (isDone) {
                    btnClass =
                      'border-charcoal bg-charcoal text-white dark:border-zinc-200 dark:bg-zinc-200 dark:text-charcoal';
                  }
                  if (isStarred) {
                    btnClass = 'border-gold bg-gold-muted font-bold text-charcoal dark:text-gold';
                  }

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setCurrentIndex(globalIdx)}
                      className={`relative flex h-9 items-center justify-center rounded-lg border font-mono text-xs transition ${btnClass} ${
                        isCurrent ? 'ring-2 ring-gold ring-offset-1 dark:ring-offset-obsidian-surface' : ''
                      }`}
                    >
                      {globalIdx + 1}
                      {isStarred && (
                        <Star className="absolute right-0.5 top-0.5 h-2.5 w-2.5 fill-gold text-gold" />
                      )}
                    </button>
                  );
                })}
              </div>

              {totalNavPages > 1 && (
                <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2.5 font-mono text-[11px] text-slateink dark:border-zinc-800 dark:text-zinc-400">
                  <button
                    type="button"
                    disabled={safeNavPage === 0}
                    onClick={() => setNavPage((p) => Math.max(0, p - 1))}
                    className="inline-flex items-center gap-0.5 rounded border border-zinc-200 px-2 py-1 transition hover:border-gold disabled:opacity-35 dark:border-zinc-700"
                  >
                    <ChevronLeft className="h-3 w-3" />
                    上20題
                  </button>
                  <span>
                    {pageStartIdx + 1}-{Math.min(pageStartIdx + NAV_PAGE_SIZE, sessionQuestions.length)} 題 · 第 {safeNavPage + 1}/{totalNavPages} 頁
                  </span>
                  <button
                    type="button"
                    disabled={safeNavPage >= totalNavPages - 1}
                    onClick={() => setNavPage((p) => Math.min(totalNavPages - 1, p + 1))}
                    className="inline-flex items-center gap-0.5 rounded border border-zinc-200 px-2 py-1 transition hover:border-gold disabled:opacity-35 dark:border-zinc-700"
                  >
                    下20題
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              )}

              {mode === 'mock' && (
                <button
                  type="button"
                  onClick={handleSubmitMockExam}
                  className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gold py-2.5 text-xs font-bold text-charcoal transition hover:bg-gold-hover"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  提前交卷 ({answeredCount}/{sessionQuestions.length})
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {mode === 'wrong' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-obsidian-surface">
            <div>
              <h3 className="text-sm font-semibold text-charcoal dark:text-zinc-100">
                自動錯題本（共 {wrongQuestionsList.length} 題待複習）
              </h3>
              <p className="mt-0.5 text-xs text-slateink dark:text-zinc-400">
                彙整本分頁在「模擬測驗」與「逐題練習」中答錯的題目，儲存在本機 IndexedDB。
              </p>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-xs text-charcoal dark:text-zinc-200">
              <input
                type="checkbox"
                checked={autoRemoveOnCorrect}
                onChange={(e) => setAutoRemoveOnCorrect(e.target.checked)}
                className="h-4 w-4 rounded accent-gold"
              />
              答對後自動移出錯題本
            </label>
          </div>

          {wrongQuestionsList.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-obsidian-surface">
              <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-gold" />
              <p className="text-sm font-medium text-charcoal dark:text-zinc-100">目前沒有待複習的錯題</p>
              <p className="mt-1 text-xs text-slateink dark:text-zinc-400">
                進行「模擬測驗」或「逐題練習」時答錯的題目會自動收錄於此。
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {wrongQuestionsList.map((q, idx) => {
                const picked = wrongPracticeAnswers[q.id];
                const hasPicked = picked !== undefined;
                const missCount = project.wrongCounts?.[q.id] || 1;

                return (
                  <div
                    key={q.id}
                    className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-obsidian-surface"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-slateink dark:text-zinc-400">
                          WRONG #{String(idx + 1).padStart(2, '0')}
                        </span>
                        <span className="rounded bg-red-500/10 px-2 py-0.5 font-mono text-[11px] font-medium text-red-600 dark:text-red-400">
                          累計錯誤 {missCount} 次
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeWrongQuestion(q.id)}
                        className="inline-flex items-center gap-1 text-xs text-zinc-400 transition hover:text-red-500"
                        title="手動移出錯題本"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        移出
                      </button>
                    </div>

                    <p className="mb-4 text-sm font-medium leading-relaxed text-charcoal dark:text-zinc-100">
                      {q.question}
                    </p>

                    <div className="space-y-2">
                      {q.options.map((opt, optIdx) => {
                        const isRight = optIdx === q.answerIndex;
                        const isPicked = picked === optIdx;

                        let style =
                          'border-zinc-200 bg-paper/50 hover:border-zinc-400 dark:border-zinc-800 dark:bg-obsidian/40';
                        if (hasPicked) {
                          if (isRight) {
                            style =
                              'border-emerald-500 bg-emerald-50/80 text-emerald-950 dark:border-emerald-500/50 dark:bg-emerald-950/30 dark:text-emerald-200';
                          } else if (isPicked) {
                            style =
                              'border-red-400 bg-red-50/80 text-red-950 dark:border-red-500/50 dark:bg-red-950/30 dark:text-red-200';
                          }
                        }

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => {
                              setWrongPracticeAnswers((prev) => ({ ...prev, [q.id]: optIdx }));
                              if (optIdx === q.answerIndex && autoRemoveOnCorrect) {
                                setTimeout(() => removeWrongQuestion(q.id), 900);
                              }
                            }}
                            className={`flex w-full items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-left text-xs transition ${style}`}
                          >
                            <span className="font-mono font-bold">{OPTION_LABELS[optIdx]}.</span>
                            <span className="flex-1">{opt}</span>
                          </button>
                        );
                      })}
                    </div>

                    {hasPicked && (
                      <div className="mt-4 rounded-lg border-l-2 border-gold bg-paper px-3.5 py-2.5 text-xs leading-relaxed text-slateink dark:bg-obsidian dark:text-zinc-300">
                        <span className="font-semibold text-charcoal dark:text-gold">解析：</span>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
