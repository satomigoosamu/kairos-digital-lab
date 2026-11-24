# Kairos Digital Lab — Windows 一鍵技能安裝與環境初始化腳本
$ErrorActionPreference = "Stop"

Write-Host "=== [1/4] 檢查本機開發工具環境 ===" -ForegroundColor Cyan
node -v
npm -v

Write-Host "`n=== [2/4] 安裝已通過安全評估的瀏覽器操控 Skill ===" -ForegroundColor Cyan
npx skills add d-wwei/browser-control-skill -g -y
npx skills add lackeyjb/playwright-skill -g -y

Write-Host "`n=== [3/4] 安裝 Kairos Digital Lab 前端依賴套件 ===" -ForegroundColor Cyan
npm install

Write-Host "`n=== [4/4] 執行本機正式版建置檢查 (Vite Build) ===" -ForegroundColor Cyan
npm run build
