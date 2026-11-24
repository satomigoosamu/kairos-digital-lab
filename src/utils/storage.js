/**
 * Kairos Digital Lab — 本機優先儲存引擎 (IndexedDB + LocalStorage)
 */

const DB_NAME = 'KairosStudyLabDB';
const DB_VERSION = 1;
const STORE_PROJECTS = 'exam_projects';
const PREFS_KEY = 'kairos_study_prefs_v1';

export const SAMPLE_PROJECT = {
  id: 'sample-cleanroom-safety',
  title: '無塵室與廠務工安（示範題庫）',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  config: {
    questionCount: 6,
    passingScore: 80,
    shuffle: false,
  },
  wrongQuestionIds: ['q-3'],
  wrongCounts: { 'q-3': 1 },
  lastExamSummary: null,
  questions: [
    {
      id: 'q-1',
      question: '進入半導體無塵室（Cleanroom）進行空調箱（MAU / AHU）濾網更換作業前，下列何者為首要確認事項？',
      options: [
        '確認該區域差壓計歸零並執行上鎖掛牌（LOTO）能量隔離',
        '直接開啟檢修門以加速氣流平衡',
        '先拆除壓差感測管路再通知中控室',
        '僅需配戴一般棉質手套即可接觸 HEPA 濾網框體',
      ],
      answerIndex: 0,
      explanation: '進行空調箱內部檢修或濾網更換前，必須先確認風機停止運轉、執行 LOTO（Lockout/Tagout）上鎖掛牌程序，避免負壓吸入或風門誤動作造成人員危害。',
    },
    {
      id: 'q-2',
      question: '在有限空間（如冷卻水塔集水盤或地下管溝）從事點檢或維修作業時，作業前氧氣濃度測定值應維持在何種範圍內始得進入？',
      options: [
        '14% ～ 16%',
        '16% ～ 17.5%',
        '18% ～ 23.5%',
        '25% 以上',
      ],
      answerIndex: 2,
      explanation: '依職業安全衛生設施規則及缺氧症預防規則，作業場所空氣中氧氣濃度必須保持在 18% 以上、23.5% 以下，低於 18% 即屬缺氧危險狀態。',
    },
    {
      id: 'q-3',
      question: '高架地板下方進行冰水管路保溫施工時，若需使用電焊或砂輪機等動火作業，下列敘述何者正確？',
      options: [
        '只要施工時間少於 15 分鐘，口頭告知領班即可施工',
        '須申請動火許可證、清除周邊易燃保溫材、配置滅火器並指派專人監視火源',
        '可將滅火器放置於無塵室入口處以節省高架地板下空間',
        '施工完畢後立即關閉排煙風機並離開現場',
      ],
      answerIndex: 1,
      explanation: '無塵室高架地板下方空間狹窄且常有電纜與保溫材，動火作業必須取得核准之動火許可、落實防火毯遮蔽、就近配置滅火器及全程火源監視，完工後並須持續觀察餘火。',
    },
    {
      id: 'q-4',
      question: '無塵室潔淨度等級 ISO Class 5（相當於舊制 Class 100）之定義，係指每立方英尺空氣中粒徑大於或等於 0.5 μm 的微粒數上限為何？',
      options: [
        '10 顆',
        '100 顆',
        '1,000 顆',
        '10,000 顆',
      ],
      answerIndex: 1,
      explanation: '聯邦標準 FED-STD-209E Class 100（對應 ISO 14644-1 Class 5）定義為每立方英尺空氣中 ≥ 0.5 μm 之懸浮微粒不得超過 100 顆（每立方公尺不超過 3,520 顆）。',
    },
    {
      id: 'q-5',
      question: '廠商人員於廠務端現場施作高處作業（高度在 2 公尺以上）時，應優先採取下列何種防護措施？',
      options: [
        '僅配戴安全帽即可站在鋁梯頂端作業',
        '設置穩固之施工架或高空工作車，並確實配掛背負式安全帶（雙掛鉤）',
        '由另一名人員在下方扶住合梯即可進行 3 公尺以上配管作業',
        '使用木製馬椅墊高以增加作業半徑',
      ],
      answerIndex: 1,
      explanation: '高度 2 公尺以上高處作業應以搭設施工架或使用高空工作車為原則，並強制要求人員全程正確配戴背負式安全帶且落實雙掛鉤「高掛低用」。',
    },
    {
      id: 'q-6',
      question: '巡檢冰水主機房（Chiller Plant）發現冷媒偵測器發出警報時，現場人員應採取何種處置？',
      options: [
        '立即進入機房關閉所有通風排氣設備以防冷媒外洩',
        '確認機房緊急排風系統已啟動、切勿於現場操作非防爆電器開關，並依緊急應變程序疏散與通報',
        '直接以水霧噴灑冷媒鋼瓶降溫',
        '先重置警報盤面板後再繼續正常巡檢',
      ],
      answerIndex: 1,
      explanation: '冷媒大量洩漏可能造成低窪處缺氧窒息或凍傷，應確認機械排風啟動、避免產生火花、人員撤離至上風處或安全集合點並立即通報廠務中控室。',
    },
  ],
};

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllProjects() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readonly');
    const store = tx.objectStore(STORE_PROJECTS);
    const req = store.getAll();
    req.onsuccess = async () => {
      const items = req.result || [];
      if (items.length === 0) {
        await saveProject(SAMPLE_PROJECT);
        resolve([SAMPLE_PROJECT]);
      } else {
        items.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        resolve(items);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveProject(project) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    const store = tx.objectStore(STORE_PROJECTS);
    const updated = { ...project, updatedAt: Date.now() };
    const req = store.put(updated);
    req.onsuccess = () => resolve(updated);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteProjectById(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    const store = tx.objectStore(STORE_PROJECTS);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export function loadPreferences() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { darkMode: false, activeTabId: null, activeDomain: 'study' };
    return { darkMode: false, activeTabId: null, activeDomain: 'study', ...JSON.parse(raw) };
  } catch {
    return { darkMode: false, activeTabId: null, activeDomain: 'study' };
  }
}

export function savePreferences(prefs) {
  try {
    const current = loadPreferences();
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...current, ...prefs }));
  } catch {
    // Ignore storage quota errors
  }
}
