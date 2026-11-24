import React, { useState } from 'react';
import { Calculator, ArrowLeftRight, Info } from 'lucide-react';

/**
 * 工程工具模組（Phase 1 實用內建版：無塵室壓差風量 & HVAC 單位即時換算）
 */
export default function EngineeringWorkspace() {
  const [cfm, setCfm] = useState('1000');
  const [pa, setPa] = useState('25');

  const cfmNum = parseFloat(cfm) || 0;
  const cmh = (cfmNum * 1.69901).toFixed(2);
  const cms = (cfmNum * 0.000471947).toFixed(4);

  const paNum = parseFloat(pa) || 0;
  const inWc = (paNum * 0.00401463).toFixed(4);
  const mmAq = (paNum * 0.101972).toFixed(3);

  const [areaSqm, setAreaSqm] = useState('100');
  const [ceilingM, setCeilingM] = useState('3.2');
  const [targetAch, setTargetAch] = useState('60');

  const volumeM3 = (parseFloat(areaSqm) || 0) * (parseFloat(ceilingM) || 0);
  const requiredCmh = volumeM3 * (parseFloat(targetAch) || 0);
  const requiredCfm = requiredCmh / 1.69901;
  const estimatedFfuCount = Math.ceil(requiredCmh / 1080);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-gold">ENGINEERING DESK</span>
          <h2 className="text-lg font-bold tracking-tight text-charcoal dark:text-zinc-100">
            廠務與無塵室工程速算工具箱
          </h2>
        </div>
        <span className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 font-mono text-xs text-slateink dark:border-zinc-800 dark:bg-obsidian-surface dark:text-zinc-400">
          HVAC / CLEANROOM UTILITIES
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-obsidian-surface">
          <div className="mb-4 flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-gold" />
            <h3 className="text-sm font-semibold text-charcoal dark:text-zinc-100">
              風量 (CFM / CMH) 與無塵室壓差 (Pa / in.w.g) 換算
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-slateink dark:text-zinc-400">
                輸入風量（CFM，立方英尺/分鐘）
              </label>
              <input
                type="number"
                value={cfm}
                onChange={(e) => setCfm(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-paper px-3 py-2 font-mono text-sm text-charcoal focus:border-gold focus:outline-none dark:border-zinc-700 dark:bg-obsidian dark:text-zinc-100"
              />
              <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-paper p-3 font-mono text-xs dark:bg-obsidian">
                <div>
                  <span className="block text-[11px] text-slateink dark:text-zinc-400">CMH (m³/hr)</span>
                  <span className="text-sm font-bold text-charcoal dark:text-gold">{cmh}</span>
                </div>
                <div>
                  <span className="block text-[11px] text-slateink dark:text-zinc-400">CMS (m³/s)</span>
                  <span className="text-sm font-bold text-charcoal dark:text-zinc-100">{cms}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <label className="mb-1 block text-xs text-slateink dark:text-zinc-400">
                輸入微壓差（Pa，帕斯卡）
              </label>
              <input
                type="number"
                value={pa}
                onChange={(e) => setPa(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-paper px-3 py-2 font-mono text-sm text-charcoal focus:border-gold focus:outline-none dark:border-zinc-700 dark:bg-obsidian dark:text-zinc-100"
              />
              <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-paper p-3 font-mono text-xs dark:bg-obsidian">
                <div>
                  <span className="block text-[11px] text-slateink dark:text-zinc-400">英吋水柱 (in.w.g)</span>
                  <span className="text-sm font-bold text-charcoal dark:text-gold">{inWc}</span>
                </div>
                <div>
                  <span className="block text-[11px] text-slateink dark:text-zinc-400">毫米水柱 (mmAq)</span>
                  <span className="text-sm font-bold text-charcoal dark:text-zinc-100">{mmAq}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-obsidian-surface">
          <div className="mb-4 flex items-center gap-2">
            <Calculator className="h-4 w-4 text-gold" />
            <h3 className="text-sm font-semibold text-charcoal dark:text-zinc-100">
              無塵室換氣次數 (ACH) 與 FFU 循環風量估算
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="mb-1 block text-[11px] text-slateink dark:text-zinc-400">面積 (m²)</label>
              <input
                type="number"
                value={areaSqm}
                onChange={(e) => setAreaSqm(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-paper px-2.5 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-obsidian"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-slateink dark:text-zinc-400">淨高 (m)</label>
              <input
                type="number"
                step="0.1"
                value={ceilingM}
                onChange={(e) => setCeilingM(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-paper px-2.5 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-obsidian"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-slateink dark:text-zinc-400">目標 ACH</label>
              <input
                type="number"
                value={targetAch}
                onChange={(e) => setTargetAch(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-paper px-2.5 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-obsidian"
              />
            </div>
          </div>

          <div className="mt-5 space-y-2.5 rounded-xl border border-gold/40 bg-gold-muted p-4 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slateink dark:text-zinc-300">空間總體積</span>
              <span className="font-bold text-charcoal dark:text-zinc-100">{volumeM3.toFixed(1)} m³</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slateink dark:text-zinc-300">需求循環總風量 (CMH)</span>
              <span className="font-bold text-charcoal dark:text-gold">{Math.round(requiredCmh).toLocaleString()} CMH</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slateink dark:text-zinc-300">需求循環總風量 (CFM)</span>
              <span className="font-bold text-charcoal dark:text-zinc-100">{Math.round(requiredCfm).toLocaleString()} CFM</span>
            </div>
            <div className="flex items-center justify-between border-t border-gold/30 pt-2">
              <span className="text-slateink dark:text-zinc-300">預估 4×2 FFU 台數 (1080 CMH/台)</span>
              <span className="text-sm font-bold text-charcoal dark:text-gold">{estimatedFfuCount} 台</span>
            </div>
          </div>

          <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-slateink dark:text-zinc-400">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
            <span>參考基準：ISO Class 7 (Class 10,000) 常見設計換氣次數約 40–60 ACH；ISO Class 6 約 90–180 ACH。</span>
          </p>
        </div>
      </div>
    </div>
  );
}
