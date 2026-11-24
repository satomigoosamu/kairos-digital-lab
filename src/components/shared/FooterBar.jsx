import React, { useState, useRef, useEffect } from 'react';
import { Coffee, MessageSquarePlus, ExternalLink, ShieldCheck } from 'lucide-react';
import { KAIROS_CONFIG } from '../../config/links';

export default function FooterBar() {
  const [showTipPopover, setShowTipPopover] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setShowTipPopover(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <footer className="mt-auto border-t border-zinc-200 bg-white/70 py-5 backdrop-blur-sm dark:border-zinc-800 dark:bg-obsidian-surface/70">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slateink dark:text-zinc-400 sm:justify-start">
            <span className="font-semibold text-charcoal dark:text-zinc-200">{KAIROS_CONFIG.brandName}</span>
            <span className="font-mono text-[11px] text-zinc-400">{KAIROS_CONFIG.version}</span>
            <span>·</span>
            <button
              type="button"
              onClick={() => setShowLegalModal(true)}
              className="inline-flex items-center gap-1 hover:text-gold hover:underline"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-gold" />
              隱私權與服務條款
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <a
              href={KAIROS_CONFIG.feedbackFormUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-paper px-3.5 py-1.5 text-xs font-medium text-slateink transition hover:border-zinc-400 hover:text-charcoal dark:border-zinc-700 dark:bg-obsidian dark:text-zinc-300 dark:hover:border-zinc-500"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              匿名回饋
            </a>

            <div className="relative" ref={popoverRef}>
              <button
                type="button"
                onClick={() => setShowTipPopover((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-full border border-gold/60 bg-gold-muted px-3.5 py-1.5 text-xs font-medium text-charcoal transition hover:border-gold hover:bg-gold/25 dark:text-gold"
              >
                <Coffee className="h-3.5 w-3.5 text-gold" />
                請開發者喝杯咖啡
              </button>

              {showTipPopover && (
                <div className="absolute bottom-11 right-0 z-40 w-72 rounded-xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-obsidian-surface">
                  <div className="mb-2.5">
                    <p className="text-xs font-semibold text-charcoal dark:text-zinc-100">
                      支持 Kairos Digital Lab 持續維護
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-slateink dark:text-zinc-400">
                      所有核心刷題與 PDF 解析功能永久免費。若此工具對您的考試有幫助，歡迎隨喜贊助：
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    {KAIROS_CONFIG.tipLinks.map((tier) => (
                      <a
                        key={tier.id}
                        href={tier.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between rounded-lg border border-zinc-200 bg-paper px-3 py-2 text-xs transition hover:border-gold hover:bg-gold-muted dark:border-zinc-700 dark:bg-obsidian dark:hover:border-gold"
                      >
                        <span className="font-medium text-charcoal dark:text-zinc-200">{tier.label}</span>
                        <span className="inline-flex items-center gap-1 font-mono font-semibold text-gold">
                          {tier.currency} {tier.amount}
                          <ExternalLink className="h-3 w-3" />
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </footer>

      {showLegalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
          <div className="max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-obsidian-surface">
            <h3 className="text-base font-semibold text-charcoal dark:text-zinc-100">
              隱私權政策與服務條款（Local-First 架構聲明）
            </h3>
            <div className="mt-3 space-y-2.5 text-xs leading-relaxed text-slateink dark:text-zinc-300">
              <p>
                <strong>1. 本機資料優先：</strong>
                本網站（{KAIROS_CONFIG.brandName} — {KAIROS_CONFIG.productName}）採用純前端運算架構，您匯入的 PDF / JSON 題庫與作答紀錄僅儲存於您個人瀏覽器的 IndexedDB 與 LocalStorage 中，不會上傳至任何外部雲端伺服器。
              </p>
              <p>
                <strong>2. 數位服務與贊助說明：</strong>
                本階段提供免費線上題庫練習服務；頁尾「請開發者喝杯咖啡」為自願性小額贊助連結，透過第三方金流平台處理交易。
              </p>
              <p>
                <strong>3. 聯絡開發者：</strong>
                如有題庫解析建議、合作洽詢或服務疑問，請來信至{' '}
                <span className="font-mono text-gold">{KAIROS_CONFIG.contactEmail}</span>。
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowLegalModal(false)}
              className="mt-5 w-full rounded-lg bg-charcoal py-2 text-xs font-medium text-white dark:bg-gold dark:text-charcoal"
            >
              我已了解
            </button>
          </div>
        </div>
      )}
    </>
  );
}
