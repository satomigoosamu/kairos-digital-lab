/**
 * Kairos Digital Lab — 強化版智慧題庫解析器 (支援表格型 PDF、是非題 O/X、選擇題 A-D、JSON)
 * 解決痛點：
 * 1. 自動過濾 PDF 頁首/頁尾雜訊（如 Micron Confidential、# Item content Ans 題目修正 答案）
 * 2. 依 PDF 座標 (Y 軸分列 + X 軸排序) 精準還原表格每一列
 * 3. 支援無標點題號（如 "17 無塵室..."、"18 有發塵..."）與連續同行題目自動切分
 * 4. 同時支援「是非題 (O / X)」與「選擇題 ((A)(B)(C)(D) / A.B.C.D / (1)-(4))」
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

    // 收集帶有座標的文字片段
    const items = content.items
      .filter((item) => 'str' in item && item.str.trim() !== '')
      .map((item) => ({
        str: item.str.trim(),
        x: item.transform ? item.transform[4] : 0,
        y: item.transform ? item.transform[5] : 0,
        width: item.width || 0,
      }));

    // 依 Y 軸由上往下排序，同一列 (Y 差距 <= 4) 依 X 軸由左往右排序
    items.sort((a, b) => {
      if (Math.abs(a.y - b.y) > 4) {
        return b.y - a.y;
      }
      return a.x - b.x;
    });

    const rows = [];
    let currentRow = [];
    let currentY = null;

    for (const item of items) {
      if (currentY === null || Math.abs(item.y - currentY) <= 4) {
        currentRow.push(item);
        if (currentY === null) currentY = item.y;
      } else {
        rows.push(currentRow);
        currentRow = [item];
        currentY = item.y;
      }
    }
    if (currentRow.length > 0) rows.push(currentRow);

    const lineStrings = rows.map((row) => {
      row.sort((a, b) => a.x - b.x);
      let line = '';
      let prevRight = null;
      for (const cell of row) {
        if (prevRight !== null) {
          const gap = cell.x - prevRight;
          line += gap > 14 ? '  ' : ' ';
        }
        line += cell.str;
        prevRight = cell.x + cell.width;
      }
      return line.trim();
    });

    pageTexts.push(lineStrings.join('\n'));
  }

  return pageTexts.join('\n');
}

const LETTER_TO_INDEX = {
  A: 0, B: 1, C: 2, D: 3, E: 4,
  '1': 0, '2': 1, '3': 2, '4': 3, '5': 4,
  '①': 0, '②': 1, '③': 2, '④': 3, '⑤': 4,
};

const TF_TRUE_SET = new Set(['O', '○', '〇', '對', '是', 'TRUE', 'T', '✓', '✔']);
const TF_FALSE_SET = new Set(['X', '✕', '✖', '×', '錯', '否', 'FALSE', 'F']);

function cleanPdfNoise(text) {
  return text
    // 移除常見機密浮水印與表格標頭
    .replace(/#?\s*Micron\s+Confidential/gi, ' ')
    .replace(/#?\s*Item\s+content\s+Ans(?:\s+題目修正\s+答案)?/gi, ' ')
    .replace(/(?:題號|題目內容|題幹|標準答案|參考答案)\s+(?:選項|答案|解析)/g, ' ')
    .replace(/Page\s+\d+\s+(?:of|\/)\s+\d+/gi, ' ')
    .replace(/第\s*\d+\s*頁\s*(?:共\s*\d+\s*頁)?/g, ' ');
}

export function parseQuestionsFromText(rawText) {
  if (!rawText || !rawText.trim()) return [];

  let normalized = cleanPdfNoise(rawText)
    .replace(/\r\n/g, '\n')
    .replace(/[Ａ-Ｚ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .replace(/[：]/g, ':');

  // 1. 抓取文末「解答區」（例如：解答：1.A 2.B 3.C）
  const answerKeyMap = {};
  const answerKeySectionMatch = normalized.match(/(?:標準答案|參考答案|解答區|答案表|附錄答案)\s*:?([\s\S]{6,})$/i);
  if (answerKeySectionMatch) {
    const keyBlock = answerKeySectionMatch[1];
    const pairRegex = /(\d{1,4})\s*[.、:：)\-]\s*\(?([A-E1-5OX○✕])\)?/gi;
    let m;
    while ((m = pairRegex.exec(keyBlock)) !== null) {
      const qNum = parseInt(m[1], 10);
      const ansChar = m[2].toUpperCase();
      answerKeyMap[qNum] = ansChar;
    }
  }

  // 2. 預處理：若多題被擠在同一行（例如 "... O 18 有發塵之虞..." 或 "... 以上皆是 4 17 無塵室..."），在題號前強制插入換行
  normalized = normalized.replace(
    /(?:(?<=\s[A-DOX○✕1-4])|(?<=\([A-D1-4]\))|(?<=[。．.?!])\s*(?:[1-4]\s+)?)\s+(?=(?:第\s*)?\d{1,4}\s*[.、:：)\]]?\s*[\u4e00-\u9fa5A-Za-z「『【（(])/g,
    '\n'
  );

  // 3. 逐行切分題目區塊：同時支援「有標點題號 (1. / 1、 / (1))」與「無標點表格題號 (17 無塵室...)」
  const lines = normalized
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const blocks = [];
  let currentBlock = null;

  const qStartRegex = /^(?:[\(\[【]([A-E1-5OX○✕])[\)\]】]\s*)?(?:第\s*(\d{1,4})\s*題|\(?(\d{1,4})\)?\s*[.、:：\)\]]|(\d{1,4})\s+(?=[\u4e00-\u9fa5A-Za-z「『【（(])|Q\s*(\d{1,4})\s*[.、:：]?)\s*(.+)$/i;

  for (const line of lines) {
    if (/^(?:標準答案|參考答案|解答表|附錄答案)\s*:?$/i.test(line)) {
      break;
    }

    const match = line.match(qStartRegex);
    const detectedNumStr = match ? (match[2] || match[3] || match[4] || match[5]) : null;
    const detectedNum = detectedNumStr ? parseInt(detectedNumStr, 10) : null;

    // 避免將選項 (1) (2) (3) (4) 誤判為新題號
    const isLikelyOptionNumber =
      currentBlock &&
      detectedNum !== null &&
      detectedNum >= 1 &&
      detectedNum <= 4 &&
      /^\(\d\)/.test(line) &&
      currentBlock.qNum !== detectedNum - 1;

    // 若前一個區塊尚未結束，且新偵測到的無標點數字明顯不合理（例如題幹內的數字 "4 17" 中的 4 已被剝離，17 為真正題號）
    if (match && !isLikelyOptionNumber) {
      if (currentBlock) blocks.push(currentBlock);
      const leadingAns = match[1] ? match[1].toUpperCase() : null;
      currentBlock = {
        qNum: detectedNum,
        rawLines: [match[6]],
        inlineAnswer: leadingAns,
      };
    } else if (currentBlock) {
      currentBlock.rawLines.push(line);
    }
  }
  if (currentBlock) blocks.push(currentBlock);

  const parsedQuestions = [];

  for (let idx = 0; idx < blocks.length; idx++) {
    const block = blocks[idx];
    const fullText = block.rawLines.join(' ').replace(/\s+/g, ' ').trim();

    // 擷取解析
    let explanation = '';
    let bodyWithoutExp = fullText;
    const expMatch = fullText.match(/(?:解析|詳解|說明|備註)\s*:\s*(.+)$/i);
    if (expMatch) {
      explanation = expMatch[1].trim();
      bodyWithoutExp = fullText.slice(0, expMatch.index).trim();
    }

    // 擷取內嵌答案
    let rawAnswerToken = block.inlineAnswer;
    const inlineAnsMatch = bodyWithoutExp.match(/(?:【?正確?答案】?|【?正解】?|Ans)\s*:\s*\(?([A-E1-5①-⑤OX○✕對錯是否])\)?/i);
    if (inlineAnsMatch) {
      rawAnswerToken = inlineAnsMatch[1].toUpperCase();
      bodyWithoutExp = bodyWithoutExp.replace(inlineAnsMatch[0], '').trim();
    }

    if (!rawAnswerToken && block.qNum && block.qNum in answerKeyMap) {
      rawAnswerToken = answerKeyMap[block.qNum];
    }

    // 嘗試切分選擇題選項：(A)(B)(C)(D) / A. B. C. D. / ①②③④ / (1)(2)(3)(4)
    let optPattern = /(?:^|\s)(?:\(([A-D])\)|([A-D])[.、\)]|([①-④]))\s*/g;
    let matches = [...bodyWithoutExp.matchAll(optPattern)];

    if (matches.length < 2) {
      optPattern = /(?:^|\s)\(([1-4])\)\s*/g;
      matches = [...bodyWithoutExp.matchAll(optPattern)];
    }

    if (matches.length >= 2) {
      // 【情況 A：選擇題】
      const questionStem = bodyWithoutExp.slice(0, matches[0].index).trim();
      const options = [];
      for (let i = 0; i < matches.length; i++) {
        const start = matches[i].index + matches[i][0].length;
        const end = i + 1 < matches.length ? matches[i + 1].index : bodyWithoutExp.length;
        let optText = bodyWithoutExp.slice(start, end).trim();
        // 若最後一個選項尾巴黏著單獨答案字元（如 "...以上皆是 4" 或 "...以上皆是 D"）
        if (i === matches.length - 1 && !rawAnswerToken) {
          const tailAns = optText.match(/\s+([A-D1-4])$/i);
          if (tailAns) {
            rawAnswerToken = tailAns[1].toUpperCase();
            optText = optText.slice(0, tailAns.index).trim();
          }
        }
        if (optText) options.push(optText);
      }

      const answerIndex =
        rawAnswerToken && rawAnswerToken in LETTER_TO_INDEX
          ? Math.min(LETTER_TO_INDEX[rawAnswerToken], options.length - 1)
          : 0;

      if (questionStem && options.length >= 2) {
        parsedQuestions.push({
          id: `q-${Date.now()}-${idx}`,
          type: 'choice',
          question: questionStem,
          options: options.slice(0, 5),
          answerIndex,
          explanation: explanation || '未提供詳細解析，建議對照原始講義或法規條文複習。',
        });
      }
    } else {
      // 【情況 B：是非題 (O / X)】— 常見於廠務/工安表格題庫
      // 偵測列中獨立出現的 O / X（例如 "...需鋪設 PVC 軟墊 O" 或 "...點數 O 違反台灣美光... O"）
      const tfMatch = bodyWithoutExp.match(/^(.*?)\s+([OX○〇✕✖×對錯是否])(?:\s+(.*))?$/i);
      let tfToken = rawAnswerToken;
      let stemText = bodyWithoutExp;
      let revisionNote = '';

      if (tfMatch && tfMatch[1].trim().length >= 4) {
        stemText = tfMatch[1].trim();
        tfToken = tfMatch[2].toUpperCase();
        if (tfMatch[3] && tfMatch[3].trim()) {
          // 清除「題目修正」欄末尾重複的 O/X
          revisionNote = tfMatch[3].replace(/\s+[OX○〇✕✖×對錯是否]$/i, '').trim();
        }
      }

      if (tfToken && (TF_TRUE_SET.has(tfToken) || TF_FALSE_SET.has(tfToken)) && stemText.length >= 4) {
        const isTrue = TF_TRUE_SET.has(tfToken);
        const combinedExp = [
          explanation,
          revisionNote ? `題目修正／補充對照：${revisionNote}` : '',
          !explanation && !revisionNote ? `是非題標準答案：${isTrue ? 'O（正確）' : 'X（錯誤）'}` : '',
        ]
          .filter(Boolean)
          .join(' ｜ ');

        parsedQuestions.push({
          id: `q-${Date.now()}-${idx}`,
          type: 'boolean',
          question: stemText,
          options: ['O（正確）', 'X（錯誤）'],
          answerIndex: isTrue ? 0 : 1,
          explanation: combinedExp,
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
        if (TF_TRUE_SET.has(upper)) ansIdx = 0;
        else if (TF_FALSE_SET.has(upper)) ansIdx = 1;
        else ansIdx = upper in LETTER_TO_INDEX ? LETTER_TO_INDEX[upper] : 0;
      } else if (typeof item.answer === 'number') {
        ansIdx = item.answer;
      }

      if (!qText || !Array.isArray(opts) || opts.length < 2) return null;

      return {
        id: item.id || `q-json-${Date.now()}-${idx}`,
        type: opts.length === 2 ? 'boolean' : 'choice',
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
      question: '進入半導體無塵室（Cleanroom）進行空調箱（MAU / AHU）濾網更換前，應先停止風機並執行 LOTO 上鎖掛牌隔離。',
      options: ['O（正確）', 'X（錯誤）'],
      answer: 'O',
      explanation: '進行空調箱內部濾網更換前，必須先確認風機停止運轉並執行 LOTO 能量隔離。',
    },
    {
      question: '在有限空間從事點檢作業時，作業前氧氣濃度測定值應維持在何種範圍內始得進入？',
      options: ['14% ～ 16%', '16% ～ 17.5%', '18% ～ 23.5%', '25% 以上'],
      answer: 'C',
      explanation: '作業場所空氣中氧氣濃度必須保持在 18% 以上、23.5% 以下。',
    },
  ],
  null,
  2
);
