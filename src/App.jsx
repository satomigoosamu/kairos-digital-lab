import React, { useState, useEffect } from 'react';
import {
  Plus,
  Moon,
  Sun,
  Edit3,
  Copy,
  Trash2,
  Check,
  BookMarked,
  GraduationCap,
  Wrench,
  Cpu,
  UploadCloud,
} from 'lucide-react';
import {
  getAllProjects,
  saveProject,
  deleteProjectById,
  loadPreferences,
  savePreferences,
  MAX_FREE_PROJECTS,
} from './utils/storage';
import StudyWorkspace from './modules/study/StudyWorkspace';
import EngineeringWorkspace from './modules/engineering/EngineeringWorkspace';
import AiToolsWorkspace from './modules/ai/AiToolsWorkspace';
import ImportDrawer from './modules/study/ImportDrawer';
import FooterBar from './components/shared/FooterBar';

const DOMAINS = [
  { id: 'study', label: '學習工具', icon: GraduationCap },
  { id: 'engineering', label: '工程工具', icon: Wrench },
  { id: 'ai', label: 'AI 工具', icon: Cpu },
];

export default function App() {
  const [activeDomain, setActiveDomain] = useState('study');
  const [projects, setProjects] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const [renamingId, setRenamingId] = useState(null);
  const [renameInput, setRenameInput] = useState('');

  useEffect(() => {
    const prefs = loadPreferences();
    const isDark = prefs.darkMode !== undefined ? Boolean(prefs.darkMode) : true;
    setDarkMode(isDark);
    if (prefs.activeDomain) setActiveDomain(prefs.activeDomain);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    getAllProjects().then((list) => {
      setProjects(list);
      const validSaved = list.find((p) => p.id === prefs.activeTabId);
      setActiveTabId(validSaved ? validSaved.id : list[0]?.id || null);
    });
  }, []);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      savePreferences({ darkMode: next });
      return next;
    });
  };

  const handleSelectDomain = (domainId) => {
    setActiveDomain(domainId);
    savePreferences({ activeDomain: domainId });
  };

  const handleSelectTab = (id) => {
    setActiveTabId(id);
    savePreferences({ activeTabId: id });
  };

  const isLimitReached = projects.length >= MAX_FREE_PROJECTS;

  const handleOpenImport = () => {
    if (isLimitReached) {
      alert(`免費版最多可同時保留 ${MAX_FREE_PROJECTS} 個考試專案，請先刪除其中一個舊分頁再新增。`);
      return;
    }
    setIsImportOpen(true);
  };

  const handleCreateProject = async (newProj) => {
    if (projects.length >= MAX_FREE_PROJECTS) {
      alert(`免費版最多可同時保留 ${MAX_FREE_PROJECTS} 個考試專案。`);
      return;
    }
    const saved = await saveProject(newProj);
    setProjects((prev) => [...prev, saved]);
    handleSelectDomain('study');
    handleSelectTab(saved.id);
  };

  const handleUpdateProject = async (updatedProj) => {
    const saved = await saveProject(updatedProj);
    setProjects((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
  };

  const handleDuplicateProject = async (proj) => {
    if (isLimitReached) {
      alert(`免費版最多可同時保留 ${MAX_FREE_PROJECTS} 個考試專案，無法再複製。`);
      return;
    }
    const copy = {
      ...proj,
      id: `proj-${Date.now()}`,
      title: `${proj.title} (副本)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const saved = await saveProject(copy);
    setProjects((prev) => [...prev, saved]);
    handleSelectTab(saved.id);
  };

  const handleDeleteProject = async (id) => {
    await deleteProjectById(id);
    const remaining = projects.filter((p) => p.id !== id);
    setProjects(remaining);
    if (activeTabId === id) {
      handleSelectTab(remaining[0]?.id || null);
    }
  };

  const commitRename = async (proj) => {
    const trimmed = renameInput.trim();
    setRenamingId(null);
    if (!trimmed || trimmed === proj.title) return;
    await handleUpdateProject({ ...proj, title: trimmed });
  };

  const activeProject = projects.find((p) => p.id === activeTabId) || projects[0] || null;

  return (
    <div className="flex min-h-screen flex-col bg-paper text-charcoal transition-colors dark:bg-obsidian dark:text-zinc-100">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-obsidian-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-gold/60 bg-charcoal font-mono text-sm font-bold text-gold">
              K
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-charcoal dark:text-zinc-100">
                  Kairos Digital Lab
                </span>
                <span className="rounded border border-gold/50 bg-gold-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-charcoal dark:text-gold">
                  WORKSPACE
                </span>
              </div>
              <p className="font-mono text-[11px] text-slateink dark:text-zinc-400">
                題庫練習室 · 工程換算 · AI 工具箱
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-paper p-1 dark:border-zinc-800 dark:bg-obsidian">
            {DOMAINS.map((domain) => {
              const Icon = domain.icon;
              const isCurrent = activeDomain === domain.id;
              return (
                <button
                  key={domain.id}
                  type="button"
                  onClick={() => handleSelectDomain(domain.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    isCurrent
                      ? 'bg-charcoal text-white shadow-sm dark:bg-gold dark:text-charcoal'
                      : 'text-slateink hover:text-charcoal dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {domain.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {activeDomain === 'study' && (
              <button
                type="button"
                onClick={handleOpenImport}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                  isLimitReached
                    ? 'border border-zinc-300 bg-zinc-100 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400'
                    : 'bg-charcoal text-white hover:bg-zinc-800 dark:bg-gold dark:text-charcoal dark:hover:bg-gold-hover'
                }`}
              >
                <Plus className="h-3.5 w-3.5" />
                新增考試專案
                <span className="ml-0.5 font-mono text-[11px] opacity-80">
                  ({projects.length}/{MAX_FREE_PROJECTS})
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={toggleDarkMode}
              title={darkMode ? '切換至暖紙白日間模式' : '切換至深色專注考場模式'}
              className="rounded-lg border border-zinc-200 bg-paper p-2 text-slateink transition hover:border-gold hover:text-charcoal dark:border-zinc-700 dark:bg-obsidian dark:text-zinc-300"
            >
              {darkMode ? <Sun className="h-4 w-4 text-gold" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {activeDomain === 'study' && (
          <div className="border-t border-zinc-100 bg-paper/70 dark:border-zinc-800/80 dark:bg-obsidian/60">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 overflow-x-auto px-4 py-2 sm:px-6">
              <div className="flex items-center gap-1.5">
                {projects.length === 0 ? (
                  <span className="font-mono text-xs text-slateink dark:text-zinc-400">
                    尚未建立考試專案（免費版可保留最多 {MAX_FREE_PROJECTS} 個專案）
                  </span>
                ) : (
                  projects.map((proj) => {
                    const isActive = proj.id === activeProject?.id;
                    const isRenaming = renamingId === proj.id;

                    return (
                      <div
                        key={proj.id}
                        onClick={() => !isRenaming && handleSelectTab(proj.id)}
                        className={`group flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition ${
                          isActive
                            ? 'border-gold bg-white font-semibold text-charcoal shadow-sm dark:bg-obsidian-surface dark:text-zinc-100'
                            : 'border-transparent text-slateink hover:border-zinc-200 hover:bg-white/60 dark:text-zinc-400 dark:hover:border-zinc-800 dark:hover:bg-obsidian-surface/60'
                        }`}
                      >
                        <BookMarked className={`h-3.5 w-3.5 ${isActive ? 'text-gold' : 'text-zinc-400'}`} />

                        {isRenaming ? (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              autoFocus
                              value={renameInput}
                              onChange={(e) => setRenameInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitRename(proj);
                                if (e.key === 'Escape') setRenamingId(null);
                              }}
                              className="w-36 rounded border border-gold bg-paper px-1.5 py-0.5 text-xs focus:outline-none dark:bg-obsidian"
                            />
                            <button
                              type="button"
                              onClick={() => commitRename(proj)}
                              className="text-emerald-600 hover:text-emerald-500"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="max-w-[180px] truncate">{proj.title}</span>
                            <span className="font-mono text-[11px] text-zinc-400">
                              ({proj.questions.length})
                            </span>

                            {isActive && (
                              <div
                                className="ml-1 flex items-center gap-1 border-l border-zinc-200 pl-1.5 dark:border-zinc-700"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  title="重新命名分頁"
                                  onClick={() => {
                                    setRenamingId(proj.id);
                                    setRenameInput(proj.title);
                                  }}
                                  className="rounded p-0.5 text-zinc-400 hover:text-charcoal dark:hover:text-zinc-200"
                                >
                                  <Edit3 className="h-3 w-3" />
                                </button>
                                {!isLimitReached && (
                                  <button
                                    type="button"
                                    title="複製專案與參數"
                                    onClick={() => handleDuplicateProject(proj)}
                                    className="rounded p-0.5 text-zinc-400 hover:text-charcoal dark:hover:text-zinc-200"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  title="刪除此考試分頁"
                                  onClick={() => handleDeleteProject(proj.id)}
                                  className="rounded p-0.5 text-zinc-400 hover:text-red-500"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {isLimitReached && (
                <span className="hidden shrink-0 font-mono text-[11px] text-gold sm:inline">
                  已達免費版上限 ({MAX_FREE_PROJECTS}/{MAX_FREE_PROJECTS})，刪除舊分頁即可新增
                </span>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {activeDomain === 'study' && (
          activeProject ? (
            <StudyWorkspace project={activeProject} onSaveProject={handleUpdateProject} />
          ) : (
            <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
              <div className="rounded-2xl border border-zinc-200 bg-white p-10 shadow-sm dark:border-zinc-800 dark:bg-obsidian-surface">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-gold/50 bg-gold-muted text-gold">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-bold text-charcoal dark:text-zinc-100">
                  匯入題庫，開始專注測驗
                </h2>
                <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slateink dark:text-zinc-400">
                  支援 PDF、JSON 與純文字題庫（自動辨識選擇題與是非題 O / X）。所有題庫與錯題紀錄僅儲存在您的本機瀏覽器中，免費版可同時保留 {MAX_FREE_PROJECTS} 個考試專案。
                </p>
                <button
                  type="button"
                  onClick={handleOpenImport}
                  className="mt-6 inline-flex items-center gap-2 rounded-lg bg-charcoal px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-gold dark:text-charcoal dark:hover:bg-gold-hover"
                >
                  <Plus className="h-4 w-4" />
                  匯入 PDF / 題庫建立專案
                </button>
              </div>
            </div>
          )
        )}
        {activeDomain === 'engineering' && <EngineeringWorkspace />}
        {activeDomain === 'ai' && <AiToolsWorkspace />}
      </main>

      <FooterBar />

      <ImportDrawer
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onCreateProject={handleCreateProject}
      />
    </div>
  );
}
