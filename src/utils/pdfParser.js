/**
 * Kairos Digital Lab — 強化版智慧題庫解析器 (PDF / JSON / 純文字)
 * 支援多種台灣公職、證照、廠務與內訓題庫格式：
 * 1. 題首帶答案：(A) 1. 題幹... / 【A】1. 題幹...
 * 2. 題尾帶答案：... (A) / 答案：A / 正解：(B) / Ans: C
 * 3. 文末解答表：解答：1.A 2.B 3.C 或 1~5: A B C D A
 * 4. 支援選項標記：(A)(B)(C)(D)、A. B. C. D.、①②③④、(1)(2)(3)(4)
 */
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export async function extractTextFromPdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const pageTexts = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    let lastY = null;
    const lines = [];
    let currentLine = '';

    for (const item of content.items) {
      if (!('str' in item)) continue;
      const y = item.transform ? item.transform[5] : null;
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 6) {
        if (currentLine.trim()) lines.push(currentLine.trim());
        currentLine = item.str;
      } else {
        currentLine += (currentLine && !currentLine.endsWith(' ') ? ' ' : '') + item.str;
      }
      if (y !== null) lastY = y;
    }
    if (currentLine.trim()) lines.push(currentLine.trim());
    pageTexts.push(lines.join('\n'));
  }

  return pageTexts.join('\n');
}

const LETTER_TO_INDEX = {
  A: 0, B: 1, C: 2, D: 3, E: 4,
  '1': 0, '2': 1, '3': 2, '4': 3, '5': 4,
  '①': 0, '②': 1, '③': 2, '④': 3, '⑤': 4,
};

export function parseQuestionsFromText(rawText) {
  if (!rawText || !rawText.trim()) return [];

  const normalized = rawText
    .replace(/\r\n/g, '\n')
    .replace(/[Ａ-Ｚ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .replace(/[：]/g, ':');

  const answerKeyMap = {};
  const answerKeySectionMatch = normalized.match(/(?:標準答案|參考答案|解答區|答案表|附錄答案)\s*:?([\s\S]{6,})$/i);
  if (answerKeySectionMatch) {
    const keyBlock = answerKeySectionMatch[1];
    const pairRegex = /(\d{1,4})\s*[.、:：)\-]\s*\(?([A-E1-5])\)?/gi;
    let m;
    while ((m = pairRegex.exec(keyBlock)) !== null) {
      const qNum = parseInt(m[1], 10);
      const ansChar = m[2].toUpperCase();
      if (ansChar in LETTER_TO_INDEX) {
        answerKeyMap[qNum] = LETTER_TO_INDEX[ansChar];
      }
    }
  }

  const lines = normalized.split('\n').map((l) => l.trim()).filter(Boolean);
  const blocks = [];
  let currentBlock = null;

  const qStartRegex = /^(?:[\(\[【]([A-E1-5])[\)\]】]\s*)?(?:第\s*(\d{1,4})\s*題|\(?(\d{1,4})\)?\s*[.、:：\)\]]|Q\s*(\d{1,4})\s*[.、:：])\s*(.+)$/i;

  for (const line of lines) {
    if (/^(?:標準答案|參考答案|解答表|附錄答案)\s*:?$/i.test(line)) {
      break;
    }

    const match = line.match(qStartRegex);
    const detectedNumStr = match ? (match[2] || match[3] || match[4]) : null;
    const detectedNum = detectedNumStr ? parseInt(detectedNumStr, 10) : null;

    const isLikelyOptionNumber =
      currentBlock &&
      detectedNum !== null &&
      detectedNum >= 1 &&
      detectedNum <= 4 &&
      /^\(\d\)/.test(line) &&
      currentBlock.qNum !== detectedNum - 1;

    if (match && !isLikelyOptionNumber) {
      if (currentBlock) blocks.push(currentBlock);
      const leadingAns = match[1] ? match[1].toUpperCase() : null;
      currentBlock = {
        qNum: detectedNum,
        rawLines: [match[5]],
        inlineAnswer: leadingAns && leadingAns in LETTER_TO_INDEX ? LETTER_TO_INDEX[leadingAns] : null,
      };
    } else if (currentBlock) {
      currentBlock.rawLines.push(line);
    }
  }
  if (currentBlock) blocks.push(currentBlock);

  const parsedQuestions = [];

  for (let idx = 0; idx < blocks.length; idx++) {
    const block = blocks[idx];
    const fullText = block.rawLines.join(' ');

    let explanation = '';
    let bodyWithoutExp = fullText;
    const expMatch = fullText.match(/(?:解析|詳解|說明|備註)\s*:\s*(.+)$/i);
    if (expMatch) {
      explanation = expMatch[1].trim();
      bodyWithoutExp = fullText.slice(0, expMatch.index).trim();
    }

    let answerIndex = block.inlineAnswer;
    const inlineAnsMatch = bodyWithoutExp.match(/(?:【?正確?答案】?|【?正解】?|Ans)\s*:\s*\(?([A-E1-5①-⑤])\)?/i);
    if (inlineAnsMatch) {
      const ch = inlineAnsMatch[1].toUpperCase();
      if (ch in LETTER_TO_INDEX) {
        answerIndex = LETTER_TO_INDEX[ch];
      }
      bodyWithoutExp = bodyWithoutExp.replace(inlineAnsMatch[0], '').trim();
    }

    if (answerIndex === null && block.qNum && block.qNum in answerKeyMap) {
      answerIndex = answerKeyMap[block.qNum];
    }

    let optPattern = /(?:^|\s)(?:\(([A-D])\)|([A-D])[.、\)]|([①-④]))\s*/g;
    let matches = [...bodyWithoutExp.matchAll(optPattern)];

    if (matches.length < 2) {
      optPattern = /(?:^|\s)\(([1-4])\)\s*/g;
      matches = [...bodyWithoutExp.matchAll(optPattern)];
    }

    if (matches.length >= 2) {
      const questionStem = bodyWithoutExp.slice(0, matches[0].index).trim();
      const options = [];
      for (let i = 0; i < matches.length; i++) {
        const start = matches[i].index + matches[i][0].length;
        const end = i + 1 < matches.length ? matches[i + 1].index : bodyWithoutExp.length;
        const optText = bodyWithoutExp.slice(start, end).trim();
        if (optText) options.push(optText);
      }

      if (questionStem && options.length >= 2) {
        parsedQuestions.push({
          id: `q-${Date.now()}-${idx}`,
          question: questionStem,
          options: options.slice(0, 5),
          answerIndex: answerIndex !== null && answerIndex < options.length ? answerIndex : 0,
          explanation: explanation || '未提供詳細解析，建議對照原始講義或法規條文複習。',
        });
      }
    }
  }

  return parsedQuestions;
}

export function parseQuestionsFromJson(jsonText) {
  const data = JSON.parse(jsonText);
  const list = Array.isArray(data) ? data : data.questions;
  if (!Array.isArray(list)) {
    throw new Error('JSON 格式錯誤：根層級必須為陣列或包含 questions 陣列。');
  }

  return list
    .map((item, idx) => {
      const qText = item.question || item.title || item.stem;
      const opts = item.options || item.choices;
      let ansIdx = 0;
      if (typeof item.answerIndex === 'number') {
        ansIdx = item.answerIndex;
      } else if (typeof item.answer === 'string') {
        const upper = item.answer.trim().toUpperCase();
        ansIdx = upper in LETTER_TO_INDEX ? LETTER_TO_INDEX[upper] : 0;
      } else if (typeof item.answer === 'number') {
        ansIdx = item.answer;
      }

      if (!qText || !Array.isArray(opts) || opts.length < 2) return null;

      return {
        id: item.id || `q-json-${Date.now()}-${idx}`,
        question: String(qText).trim(),
        options: opts.map((o) => String(o).trim()),
        answerIndex: Math.min(Math.max(0, ansIdx), opts.length - 1),
        explanation: item.explanation ? String(item.explanation).trim() : '未提供詳細解析。',
      };
    })
    .filter(Boolean);
}

export const SAMPLE_JSON_TEMPLATE = JSON.stringify(
  [
    {
      question: '在半導體廠務空調系統中，MAU 的全稱與主要功能為何？',
      options: [
        'Make-up Air Unit（外氣空調箱），負責補充無塵室正壓所需之過濾與溫濕度調節外氣',
        'Main Air Utility（主壓縮空氣機），負責供應製程氣動閥門動力',
        'Micro Aerosol Unit（微霧加濕器），僅用於辦公室舒適空調',
        'Mechanical Exhaust Unit（機械排風機），負責抽取酸鹼廢氣',
      ],
      answer: 'A',
      explanation: 'MAU（Make-up Air Unit）為外氣空調箱，負責將戶外新鮮空氣經過濾、預熱/預冷與除濕/加濕處理後送入無塵室以維持正壓。',
    },
    {
      question: '執行電氣盤體維護保養時，驗電筆應於何時進行測試以確保功能正常？',
      options: [
        '僅需在每年年度定檢時測試一次',
        '驗電前先於已知有電之電源測試確認正常，驗電後再確認一次（三步驟驗電）',
        '觸碰匯流排後若無火花即代表無電',
        '穿戴絕緣手套時不需使用驗電筆',
      ],
      answer: 'B',
      explanation: '標準安全作業程序為「測有電 → 測無電 → 再測有電」，確保驗電器本身未故障或電池沒電。',
    },
  ],
  null,
  2
);
