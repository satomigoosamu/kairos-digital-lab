import React, { useRef, useState } from 'react';
import { getAllProjects, restoreProjects, MAX_FREE_PROJECTS } from '../../utils/storage';
import { clearSession } from '../../utils/studyProgress';
import { serializeBackup, validateBackup } from '../../utils/backup';

export default function BackupControls({ onRestore }) {
  const input = useRef(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const cls = 'rounded-lg border border-zinc-300 px-3 py-2 text-xs dark:border-zinc-700';
  async function download() {
    try {
      const raw = serializeBackup(await getAllProjects());
      const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = 'kairos-backup.json'; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('備份包含題庫、錯題與歷史成績；未交卷的續答僅保留於此瀏覽器。');
    } catch { setMessage('備份失敗，請重試。'); }
  }
  async function restore(e) {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const projects = validateBackup(await file.text(), MAX_FREE_PROJECTS);
      if (!confirm(`將以備份的 ${projects.length} 個專案取代本機全部專案。請先備份目前資料。確定還原？`)) return;
      const previous = await getAllProjects();
      await restoreProjects(projects);
      try { [...previous,...projects].forEach(p=>clearSession(p.id)); } catch { /* Storage warning shown below. */ }
      onRestore(projects); setMessage('備份已還原。');
    } catch (err) { setMessage(`還原失敗：${err.message}`); }
    finally { setBusy(false); }
  }
  return <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-2 sm:px-6">
    <button className={cls} disabled={busy} onClick={download}>匯出本機備份</button>
    <button className={cls} disabled={busy} onClick={() => input.current.click()}>還原備份</button>
    <input ref={input} type="file" accept=".json" className="hidden" aria-label="選擇備份檔案" onChange={restore}/>
    <span role="status" className="break-all text-xs text-slateink dark:text-zinc-400">{message}</span>
  </div>;
}
