# Kairos Digital Lab 專案指示

品牌定位：極簡、實用，解決真實學習與工作痛點的輕量數位產品與 Micro-SaaS。

## 產品原則
- 免費版核心完整、誠實、立即可用；本機優先，不強制登入。
- Pro 聚焦跨裝置同步、AI 輔助解析與進階匯出；本機備份與還原屬免費核心。
- 目前有條件批准商業化，優先完成 Phase 0。定價、免費工作區數量、轉換率均不是已驗證決策。本基線維持 2 個工作區。
- 保留現有功能和設計；先提出具體改善清單，再執行低風險修復與測試。

## 視覺
- 畫布 #FAF9F6、卡片 #FFFFFF、細框 #E4E4E7、主文 #18181B、次文 #52525B、強調 #C5A059。
- 深色背景 #121214、表面 #1E1E22，沿用金色強調。
- UI：Inter、Noto Sans TC；題號、計時、分數、狀態：JetBrains Mono / ui-monospace。
- 禁止無順序意義的裝飾大編號、預設紫藍漸層、霓虹、制式三欄與空泛行銷詞。
- 贊助維持頁尾膠囊按鈕與 Popover。

## 架構與協作
- React、Tailwind CSS、Vite；學習／工程／AI 工具共用頁尾。GitHub 管理原始碼，Codex／Claude Code／GARY 協作。
- Cloudflare Pages 是既定部署方向；本機 IndexedDB + LocalStorage 為第一階段儲存。Google Forms 匿名回饋與台灣金流連結沿用現值。
- 第二階段才依需求評估 Supabase 或 Cloudflare 後端。任何後端選型須另行決策。

## 不可跨越的範圍
- 本次不得部署、變更正式金流或新增前端測試後門。
- 禁止 VITE_DEV_MASTER_KEY、網址 unlock、localStorage 授權、前端雜湊金鑰等解鎖方案。
- 雲端與 AI 付費資源須由後端驗證身分與權限，未經核准不得接入。
- 題庫與企業機密不得加入測試、公開版本、雲端或 AI；測試僅使用合成資料。
- 不得默認答案或靜默漏題；無法確認須提示並阻擋不可靠資料。
- 交付需記錄基線、變更、測試、限制及回復方法。不得把自動測試通過寫成真實題庫全面驗收。

## 本機驗證
`npm ci`、`npm test`、`npm run build`。瀏覽器測試先啟動 `npm run dev -- --host 127.0.0.1`，再執行 `npm run test:browser`。
