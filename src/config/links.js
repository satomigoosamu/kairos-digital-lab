/**
 * Kairos Digital Lab — 外部服務與贊助連結集中設定檔
 * 已填入歐付寶 O'Pay 實際贊助收款連結（NT$ 50 / NT$ 100 / NT$ 200）
 */
export const KAIROS_CONFIG = {
  brandName: 'Kairos Digital Lab',
  productName: '題庫練習室',
  version: 'v1.3 Modular Workspace',
  contactEmail: 'contact@kairos-lab.tw',
  // Google Forms 匿名回饋表單連結（建立後替換此處網址）
  feedbackFormUrl: 'https://forms.gle/your-google-form-id',
  // 歐付寶 O'Pay 贊助收款連結
  tipLinks: [
    {
      id: 'coffee-50',
      label: '濃縮咖啡',
      amount: 50,
      currency: 'NT$',
      url: 'https://p.opay.tw/0jbnC',
    },
    {
      id: 'coffee-100',
      label: '手沖單品',
      amount: 100,
      currency: 'NT$',
      url: 'https://p.opay.tw/TZHTJ',
    },
    {
      id: 'coffee-200',
      label: '深夜研發補給',
      amount: 200,
      currency: 'NT$',
      url: 'https://p.opay.tw/Xu8IP',
    },
  ],
};
