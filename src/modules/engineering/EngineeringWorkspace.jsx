import React, { useState } from 'react';
import { Ruler, Maximize2, Scale, Gauge, Copy, Check } from 'lucide-react';

function fmt(num) {
  if (!Number.isFinite(num) || num === 0) return '0';
  if (Math.abs(num) >= 1000) return Number(num.toFixed(2)).toString();
  if (Math.abs(num) >= 1) return Number(num.toFixed(4)).toString();
  return Number(num.toPrecision(4)).toString();
}

/**
 * 工程工具模組（日常現場實用版：雙向即時長度、面積、重量、壓力與溫度換算）
 */
export default function EngineeringWorkspace() {
  const [copiedKey, setCopiedKey] = useState('');

  // 1. 長度換算（基準單位：mm）
  const [lengthMm, setLengthMm] = useState(1000);
  const lengthUnits = [
    { id: 'mm', label: '公釐 (mm)', factor: 1 },
    { id: 'cm', label: '公分 (cm)', factor: 10 },
    { id: 'm', label: '公尺 (m)', factor: 1000 },
    { id: 'inch', label: '英吋 (inch / 吋)', factor: 25.4 },
    { id: 'ft', label: '英尺 (ft / 呎)', factor: 304.8 },
    { id: 'fen', label: '台制 / 管件「分」(1/8吋)', factor: 3.175 },
  ];

  // 2. 面積換算（基準單位：m²）
  const [areaSqm, setAreaSqm] = useState(33.0579);
  const areaUnits = [
    { id: 'sqm', label: '平方公尺 (m²)', factor: 1 },
    { id: 'ping', label: '坪（台灣常用）', factor: 3.305785 },
    { id: 'sqft', label: '平方英尺 (ft²)', factor: 0.092903 },
    { id: 'sqcm', label: '平方公分 (cm²)', factor: 0.0001 },
  ];

  // 3. 重量換算（基準單位：kg）
  const [weightKg, setWeightKg] = useState(100);
  const weightUnits = [
    { id: 'g', label: '公克 (g)', factor: 0.001 },
    { id: 'kg', label: '公斤 (kg)', factor: 1 },
    { id: 'ton', label: '公噸 (t)', factor: 1000 },
    { id: 'lb', label: '磅 (lb)', factor: 0.45359237 },
  ];

  // 4. 壓力換算（基準單位：kgf/cm²，現場壓力錶最常用）
  const [pressKgf, setPressKgf] = useState(1);
  const pressureUnits = [
    { id: 'kgf', label: 'kgf/cm²（公斤力）', factor: 1 },
    { id: 'bar', label: 'bar', factor: 1.019716 },
    { id: 'psi', label: 'psi', factor: 0.070307 },
    { id: 'kpa', label: 'kPa', factor: 0.0101972 },
    { id: 'mpa', label: 'MPa', factor: 10.19716 },
  ];

  // 5. 溫度換算（基準單位：°C）
  const [tempC, setTempC] = useState(25);

  const handleCopy = async (key, val) => {
    await navigator.clipboard.writeText(String(val));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 1500);
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-gold">ENGINEERING CONVERTER</span>
          <h2 className="text-lg font-bold tracking-tight text-charcoal dark:text-zinc-100">
            工程常用單位雙向換算（輸入任一格即時同步）
          </h2>
        </div>
        <span className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 font-mono text-xs text-slateink dark:border-zinc-800 dark:bg-obsidian-surface dark:text-zinc-400">
          INSTANT TWO-WAY CALC
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* 1. 長度換算 */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-obsidian-surface">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4 text-gold" />
              <h3 className="text-sm font-semibold text-charcoal dark:text-zinc-100">長度換算</h3>
            </div>
            <span className="font-mono text-[11px] text-slateink dark:text-zinc-400">
              1 吋 = 25.4 mm · 1 呎 = 30.48 cm
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {lengthUnits.map((u) => {
              const displayVal = fmt(lengthMm / u.factor);
              return (
                <div key={u.id}>
                  <label className="mb-1 flex items-center justify-between text-[11px] text-slateink dark:text-zinc-400">
                    <span>{u.label}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(u.id, displayVal)}
                      className="text-zinc-400 hover:text-gold"
                      title="複製數值"
                    >
                      {copiedKey === u.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={displayVal}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setLengthMm(Number.isFinite(v) ? v * u.factor : 0);
                    }}
                    className="w-full rounded-lg border border-zinc-300 bg-paper px-3 py-2 font-mono text-xs font-medium text-charcoal focus:border-gold focus:outline-none dark:border-zinc-700 dark:bg-obsidian dark:text-zinc-100"
                  />
                </div>
              );
            })}
          </div>

          {/* 現場管徑快速點選 */}
          <div className="mt-3.5 flex flex-wrap items-center gap-1.5 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <span className="text-[11px] text-slateink dark:text-zinc-400">常用管徑速填：</span>
            {[
              { label: '2分 (1/4")', mm: 6.35 },
              { label: '3分 (3/8")', mm: 9.525 },
              { label: '4分 (1/2")', mm: 12.7 },
              { label: '6分 (3/4")', mm: 19.05 },
              { label: '1吋 (1")', mm: 25.4 },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setLengthMm(preset.mm)}
                className="rounded border border-zinc-200 bg-paper px-2 py-0.5 font-mono text-[11px] text-charcoal transition hover:border-gold hover:text-gold dark:border-zinc-700 dark:bg-obsidian dark:text-zinc-300"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. 面積換算 */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-obsidian-surface">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Maximize2 className="h-4 w-4 text-gold" />
              <h3 className="text-sm font-semibold text-charcoal dark:text-zinc-100">面積換算</h3>
            </div>
            <span className="font-mono text-[11px] text-slateink dark:text-zinc-400">
              1 坪 ≈ 3.3058 m² · 1 m² ≈ 0.3025 坪
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {areaUnits.map((u) => {
              const displayVal = fmt(areaSqm / u.factor);
              return (
                <div key={u.id}>
                  <label className="mb-1 flex items-center justify-between text-[11px] text-slateink dark:text-zinc-400">
                    <span>{u.label}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(u.id, displayVal)}
                      className="text-zinc-400 hover:text-gold"
                      title="複製數值"
                    >
                      {copiedKey === u.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={displayVal}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setAreaSqm(Number.isFinite(v) ? v * u.factor : 0);
                    }}
                    className="w-full rounded-lg border border-zinc-300 bg-paper px-3 py-2 font-mono text-xs font-medium text-charcoal focus:border-gold focus:outline-none dark:border-zinc-700 dark:bg-obsidian dark:text-zinc-100"
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-3.5 flex flex-wrap items-center gap-1.5 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <span className="text-[11px] text-slateink dark:text-zinc-400">快速帶入：</span>
            {[1, 10, 50, 100].map((pingVal) => (
              <button
                key={pingVal}
                type="button"
                onClick={() => setAreaSqm(pingVal * 3.305785)}
                className="rounded border border-zinc-200 bg-paper px-2 py-0.5 font-mono text-[11px] text-charcoal transition hover:border-gold hover:text-gold dark:border-zinc-700 dark:bg-obsidian dark:text-zinc-300"
              >
                {pingVal} 坪
              </button>
            ))}
          </div>
        </div>

        {/* 3. 重量換算 */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-obsidian-surface">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-gold" />
              <h3 className="text-sm font-semibold text-charcoal dark:text-zinc-100">重量換算</h3>
            </div>
            <span className="font-mono text-[11px] text-slateink dark:text-zinc-400">
              1 kg ≈ 2.2046 lb · 1 t = 1,000 kg
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {weightUnits.map((u) => {
              const displayVal = fmt(weightKg / u.factor);
              return (
                <div key={u.id}>
                  <label className="mb-1 flex items-center justify-between text-[11px] text-slateink dark:text-zinc-400">
                    <span>{u.label}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(u.id, displayVal)}
                      className="text-zinc-400 hover:text-gold"
                      title="複製數值"
                    >
                      {copiedKey === u.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={displayVal}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setWeightKg(Number.isFinite(v) ? v * u.factor : 0);
                    }}
                    className="w-full rounded-lg border border-zinc-300 bg-paper px-3 py-2 font-mono text-xs font-medium text-charcoal focus:border-gold focus:outline-none dark:border-zinc-700 dark:bg-obsidian dark:text-zinc-100"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. 壓力錶與溫度常用換算 */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-obsidian-surface">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-gold" />
              <h3 className="text-sm font-semibold text-charcoal dark:text-zinc-100">壓力與溫度換算</h3>
            </div>
            <span className="font-mono text-[11px] text-slateink dark:text-zinc-400">
              1 kgf/cm² ≈ 14.22 psi
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {pressureUnits.map((u) => {
              const displayVal = fmt(pressKgf / u.factor);
              return (
                <div key={u.id}>
                  <label className="mb-1 block truncate text-[11px] text-slateink dark:text-zinc-400">
                    {u.label}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={displayVal}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setPressKgf(Number.isFinite(v) ? v * u.factor : 0);
                    }}
                    className="w-full rounded-lg border border-zinc-300 bg-paper px-2.5 py-1.5 font-mono text-xs font-medium text-charcoal focus:border-gold focus:outline-none dark:border-zinc-700 dark:bg-obsidian dark:text-zinc-100"
                  />
                </div>
              );
            })}
          </div>

          {/* 溫度換算 */}
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-zinc-100 pt-3.5 dark:border-zinc-800">
            <div>
              <label className="mb-1 block text-[11px] text-slateink dark:text-zinc-400">攝氏溫度 (°C)</label>
              <input
                type="number"
                step="any"
                value={fmt(tempC)}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setTempC(Number.isFinite(v) ? v : 0);
                }}
                className="w-full rounded-lg border border-zinc-300 bg-paper px-3 py-1.5 font-mono text-xs font-medium text-charcoal focus:border-gold focus:outline-none dark:border-zinc-700 dark:bg-obsidian dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-slateink dark:text-zinc-400">華氏溫度 (°F)</label>
              <input
                type="number"
                step="any"
                value={fmt((tempC * 9) / 5 + 32)}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setTempC(Number.isFinite(v) ? ((v - 32) * 5) / 9 : 0);
                }}
                className="w-full rounded-lg border border-zinc-300 bg-paper px-3 py-1.5 font-mono text-xs font-medium text-charcoal focus:border-gold focus:outline-none dark:border-zinc-700 dark:bg-obsidian dark:text-zinc-100"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
