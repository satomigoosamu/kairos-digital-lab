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
} from 'lucide-react';
import {
  getAllProjects,
  saveProject,
  deleteProjectById,
  loadPreferences,
  savePreferences,
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
  const [darkMode, setDarkMode] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const [renamingId, setRenamingId] = useState(null);
  const [renameInput, setRenameInput] = useState('');

  useEffect(() => {
    const prefs = loadPreferences();
    setDarkMode(Boolean(prefs.darkMode));
    if (prefs.activeDomain) setActiveDomain(prefs.activeDomain);
    if (prefs.darkMode) {
      document.documentElement.classList.add('dark');
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

  const handleCreateProject = async (newProj) => {
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
    if (projects.length <= 1) {
      alert('至少需保留一個考試工作區分頁。');
      return;
    }
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
                題庫練習室 · 工程速算 · AI 工具箱
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
                onClick={() => setIsImportOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-charcoal px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-gold dark:text-charcoal dark:hover:bg-gold-hover"
              >
                <Plus className="h-3.5 w-3.5" />
                新增考試專案
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
            <div className="mx-auto flex max-w-5xl items-center gap-1.5 overflow-x-auto px-4 py-2 sm:px-6">
              {projects.map((proj) => {
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
                            <button
                              type="button"
                              title="複製專案與參數"
                              onClick={() => handleDuplicateProject(proj)}
                              className="rounded p-0.5 text-zinc-400 hover:text-charcoal dark:hover:text-zinc-200"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                            {projects.length > 1 && (
                              <button
                                type="button"
                                title="刪除此考試分頁"
                                onClick={() => handleDeleteProject(proj.id)}
                                className="rounded p-0.5 text-zinc-400 hover:text-red-500"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {activeDomain === 'study' && activeProject && (
          <StudyWorkspace project={activeProject} onSaveProject={handleUpdateProject} />
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
