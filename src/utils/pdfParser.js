/**
 * Kairos Digital Lab — 高精準智慧題庫解析器 v1.5
 * 針對實測問題全面升級：
 * 1. 修正無空白黏連選項（如「？(1) 個人防護具 (2) 工程控制」不再把 (1) 吃進題幹）
 * 2. 修正表格答案欄在「Answer / Ans」表頭前的格式（如「...高架地板作業 2 Answer」精準擷取答案 2 並清除雜訊）
 * 3. 支援題幹以數字或引號開頭（如「45 2公尺以上...」、「60 110V...」、「72 《職業安全...」），避免 100 題漏抓 1 題
 * 4. 回傳缺失題號診斷資訊 (missingNumbers)，若原卷 1..100 少題可直接提示缺哪一題
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

    const items = content.items
      .filter((item) => 'str' in item && item.str.trim() !== '')
      .map((item) => ({
        str: item.str.trim(),
        x: item.transform ? item.transform[4] : 0,
        y: item.transform ? item.transform[5] : 0,
        width: item.width || 0,
      }));

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
    .replace(/#?\s*Micron\s+Confidential/gi, ' ')
    .replace(/#?\s*Item\s+content\s+Ans(?:wer)?(?:\s+題目修正\s+答案)?/gi, ' ')
    .replace(/(?:題號|題目內容|題幹|標準答案|參考答案)\s+(?:選項|答案|解析)/g, ' ')
    .replace(/Page\s+\d+\s+(?:of|\/)\s+\d+/gi, ' ')
    .replace(/第\s*\d+\s*頁\s*(?:共\s*\d+\s*頁)?/g, ' ');
}

/**
 * 切分題目內部的選擇題選項，不要求選項標記前必須有空白（解決「？(1) 個人防護具」黏在一起的問題）
 */
function extractChoiceOptions(text) {
  // 策略 1：括號數字 (1) (2) (3) (4) — 允許前面緊貼「？」或中文字，且允許括號內有空白如 ( 1 )
  const parenNumMatches = [...text.matchAll(/\(\s*([1-5])\s*\)\s*/g)];
  if (parenNumMatches.length >= 2) {
    // 確保是從 (1) 開始的選項序列（避免題幹裡出現單一括號數字干擾）
    const firstOneIdx = parenNumMatches.findIndex((m) => m[1] === '1');
    const validMatches = firstOneIdx >= 0 ? parenNumMatches.slice(firstOneIdx) : parenNumMatches;
    if (validMatches.length >= 2) {
      return validMatches;
    }
  }

  // 策略 2：括號英文字母 (A) (B) (C) (D) — 同樣不強制要求前面有空白
  const parenAlphaMatches = [...text.matchAll(/\(\s*([A-E])\s*\)\s*/gi)];
  if (parenAlphaMatches.length >= 2) {
    const firstAIdx = parenAlphaMatches.findIndex((m) => m[1].toUpperCase() === 'A');
    const validMatches = firstAIdx >= 0 ? parenAlphaMatches.slice(firstAIdx) : parenAlphaMatches;
    if (validMatches.length >= 2) {
      return validMatches;
    }
  }

  // 策略 3：帶標點英文字母 A. / B、 / C) / D： 或圈號 ①②③④
  const punctAlphaMatches = [...text.matchAll(/(?:^|\s|(?<=[？?。！!；;]))(?:([A-E])[.、:：\)]|([①-⑤]))\s*/gi)];
  if (punctAlphaMatches.length >= 2) {
    return punctAlphaMatches;
  }

  // 策略 4：無左括號數字選項 1) 2) 3) 4)
  const rightParenNumMatches = [...text.matchAll(/(?:^|\s|(?<=[？?。！!；;]))([1-5])[\)）、]\s*/g)];
  if (rightParenNumMatches.length >= 2) {
    return rightParenNumMatches;
  }

  return [];
}

export function parseQuestionsWithDiagnostics(rawText) {
  if (!rawText || !rawText.trim()) {
    return { questions: [], missingNumbers: [], maxDetectedNumber: 0 };
  }

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

  // 2. 預處理：若多題被擠在同一行，在下一題題號前強制插入換行
  // 支援前面是答案 (O/X/A-D/1-4)、括號答案、句號/問號，或換頁標頭 "Answer" 之後緊接下一題題號
  normalized = normalized.replace(
    /(?:(?<=\s[A-DOX○✕1-4])|(?<=\([A-D1-4]\))|(?<=\bAnswer)|(?<=\bAns)|(?<=[。．.?!？]))\s+(?=(?:第\s*)?\d{1,4}\s*[.、:：)\]]?\s*[^\s\)\]])/gi,
    '\n'
  );

  // 3. 逐行切分題目區塊：支援無標點表格題號（包含題幹以數字、引號、書名號或中文開頭，及 3 位數 100 無空白緊接中文）
  const lines = normalized
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const blocks = [];
  let currentBlock = null;

  const qStartRegex =
    /^(?:[\(\[【]([A-E1-5OX○✕])[\)\]】]\s*)?(?:第\s*(\d{1,4})\s*題|\(?(\d{1,4})\)?\s*[.、:：\)\]]|(\d{1,4})\s+(?=[^\s])|(\d{3})(?=[\u4e00-\u9fa5「『《【（(])|Q\s*(\d{1,4})\s*[.、:：]?)\s*(.+)$/i;

  for (const line of lines) {
    if (/^(?:標準答案|參考答案|解答表|附錄答案|Answer|Ans)\s*:?$/i.test(line)) {
      continue;
    }

    const match = line.match(qStartRegex);
    const detectedNumStr = match ? (match[2] || match[3] || match[4] || match[5] || match[6]) : null;
    const detectedNum = detectedNumStr ? parseInt(detectedNumStr, 10) : null;

    // 避免將選項 (1) (2) (3) (4) 誤判為新題號
    const isLikelyOptionNumber =
      currentBlock &&
      detectedNum !== null &&
      detectedNum >= 1 &&
      detectedNum <= 4 &&
      /^\(\s*\d\s*\)/.test(line) &&
      currentBlock.qNum !== detectedNum - 1;

    // 若前一個區塊已有題號，且新出現的數字與目前題號相差過遠（例如題幹內出現「2 公尺」被誤認成第 2 題，而上一題已經是第 45 題）
    const isOutOfSequenceBodyNumber =
      currentBlock &&
      currentBlock.qNum !== null &&
      detectedNum !== null &&
      !/^(?:第|\(|Q)/i.test(line) &&
      !/^\d{1,4}\s*[.、:：\)\]]/.test(line) &&
      (detectedNum < currentBlock.qNum || detectedNum > currentBlock.qNum + 15);

    if (match && !isLikelyOptionNumber && !isOutOfSequenceBodyNumber) {
      if (currentBlock) blocks.push(currentBlock);
      const leadingAns = match[1] ? match[1].toUpperCase() : null;
      currentBlock = {
        qNum: detectedNum,
        rawLines: [match[7]],
        inlineAnswer: leadingAns,
      };
    } else if (currentBlock) {
      currentBlock.rawLines.push(line);
    }
  }
  if (currentBlock) blocks.push(currentBlock);

  const parsedQuestions = [];
  const seenNumbers = new Set();

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

    // 擷取內嵌答案：支援「答案：2」、「答案 2」、「Ans: B」、「Ans 2」、「Answer 2」以及「2 Answer」（答案數字在 Answer 表頭前！）
    let rawAnswerToken = block.inlineAnswer;

    // 情況 1：答案數字/字母緊跟在 Answer / Ans / 答案 表頭前面（例如 "...高架地板作業 2 Answer"）
    const beforeHeaderAnsMatch = bodyWithoutExp.match(/\s+\(?([A-E1-5OX○✕])\)?\s+(?:Answer|Ans|答案|正解)\b/i);
    if (beforeHeaderAnsMatch) {
      rawAnswerToken = beforeHeaderAnsMatch[1].toUpperCase();
      bodyWithoutExp = bodyWithoutExp.replace(beforeHeaderAnsMatch[0], ' ').trim();
    }

    // 情況 2：標準「答案：A」或「Answer: 2」或「Ans 2」（冒號改為可選）
    const inlineAnsMatch = bodyWithoutExp.match(/(?:【?正確?答案】?|【?正解】?|Answer|Ans)\s*[:：]?\s*\(?([A-E1-5①-⑤OX○✕對錯是否])\)?/i);
    if (inlineAnsMatch) {
      rawAnswerToken = inlineAnsMatch[1].toUpperCase();
      bodyWithoutExp = bodyWithoutExp.replace(inlineAnsMatch[0], ' ').trim();
    }

    // 清除殘留的單獨表格欄位名稱 Answer / Ans
    bodyWithoutExp = bodyWithoutExp.replace(/\s+\b(?:Answer|Ans)\b\s*$/i, '').trim();

    if (!rawAnswerToken && block.qNum && block.qNum in answerKeyMap) {
      rawAnswerToken = answerKeyMap[block.qNum];
    }

    // 切分選擇題選項
    const matches = extractChoiceOptions(bodyWithoutExp);

    if (matches.length >= 2) {
      const questionStem = bodyWithoutExp.slice(0, matches[0].index).trim();
      const options = [];
      for (let i = 0; i < matches.length; i++) {
        const start = matches[i].index + matches[i][0].length;
        const end = i + 1 < matches.length ? matches[i + 1].index : bodyWithoutExp.length;
        let optText = bodyWithoutExp.slice(start, end).trim();

        // 處理最後一個選項末尾附帶的答案欄數字/字母（如 "...高架地板作業 2" 或 "...高架地板作業 2 Answer"）
        if (i === matches.length - 1) {
          const tailAnsWithHeader = optText.match(/\s+\(?([A-E1-5])\)?(?:\s+(?:Answer|Ans|答案))?\s*$/i);
          if (tailAnsWithHeader) {
            if (!rawAnswerToken) {
              rawAnswerToken = tailAnsWithHeader[1].toUpperCase();
            }
            optText = optText.slice(0, tailAnsWithHeader.index).trim();
          }
        }
        if (optText) options.push(optText);
      }

      const answerIndex =
        rawAnswerToken && rawAnswerToken in LETTER_TO_INDEX
          ? Math.min(LETTER_TO_INDEX[rawAnswerToken], options.length - 1)
          : 0;

      if (questionStem && options.length >= 2) {
        if (block.qNum) seenNumbers.add(block.qNum);
        parsedQuestions.push({
          id: `q-${Date.now()}-${idx}`,
          sourceNumber: block.qNum || idx + 1,
          type: 'choice',
          question: questionStem,
          options: options.slice(0, 5),
          answerIndex,
          explanation: explanation || '未提供詳細解析，建議對照原始講義或法規條文複習。',
        });
      }
    } else {
      // 是非題 (O / X)
      const tfMatch = bodyWithoutExp.match(/^(.*?)\s+([OX○〇✕✖×對錯是否])(?:\s+(.*))?$/i);
      let tfToken = rawAnswerToken;
      let stemText = bodyWithoutExp;
      let revisionNote = '';

      if (tfMatch && tfMatch[1].trim().length >= 4) {
        stemText = tfMatch[1].trim();
        tfToken = tfMatch[2].toUpperCase();
        if (tfMatch[3] && tfMatch[3].trim()) {
          revisionNote = tfMatch[3].replace(/\s+[OX○〇✕✖×對錯是否]$/i, '').trim();
        }
      }

      if (tfToken && (TF_TRUE_SET.has(tfToken) || TF_FALSE_SET.has(tfToken)) && stemText.length >= 4) {
        if (block.qNum) seenNumbers.add(block.qNum);
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
          sourceNumber: block.qNum || idx + 1,
          type: 'boolean',
          question: stemText,
          options: ['O（正確）', 'X（錯誤）'],
          answerIndex: isTrue ? 0 : 1,
          explanation: combinedExp,
        });
      }
    }
  }

  // 檢查題號連續性，找出是否漏掉哪一題（例如 1..100 中缺了第 54 題）
  const sortedNums = Array.from(seenNumbers).sort((a, b) => a - b);
  const maxDetectedNumber = sortedNums.length > 0 ? sortedNums[sortedNums.length - 1] : 0;
  const missingNumbers = [];
  if (maxDetectedNumber >= 5 && maxDetectedNumber <= 500) {
    for (let n = 1; n <= maxDetectedNumber; n++) {
      if (!seenNumbers.has(n)) {
        missingNumbers.push(n);
      }
    }
  }

  return {
    questions: parsedQuestions,
    missingNumbers,
    maxDetectedNumber,
  };
}

export function parseQuestionsFromText(rawText) {
  return parseQuestionsWithDiagnostics(rawText).questions;
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
        sourceNumber: idx + 1,
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
      question: '選擇風險控制措施時應優先選擇下列何者？',
      options: ['個人防護具', '工程控制', '管理控制', '消除'],
      answer: 'D',
      explanation: '風險控制層級依序為：消除 → 取代 → 工程控制 → 管理控制 → 個人防護具。',
    },
  ],
  null,
  2
);
