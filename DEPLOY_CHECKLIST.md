# Kairos Digital Lab — 網頁操作上線清單 (v1.3)

## 第 1 步：上傳至 GitHub（網頁拖曳即可）
1. 打開 https://github.com/new ，Repository name 填 `kairos-digital-lab`，點 **Create repository**。
2. 點頁面中間的 **uploading an existing file**，把解壓縮後的 `kairos-study-lab-v1.3` 內所有檔案與資料夾拖進去，點 **Commit changes**。

## 第 2 步：建立 Google Forms 匿名回饋表單
1. 打開 https://forms.new 建立表單，複製短網址並填入 `src/config/links.js` 的 `feedbackFormUrl`。

## 第 3 步：Cloudflare Pages 部署
1. 登入 https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**。
2. 授權 GitHub 並選擇 `kairos-digital-lab`：
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Build output directory: `dist`
3. 點 **Save and Deploy** 即完成上線。
