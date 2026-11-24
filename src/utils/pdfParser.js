/**
 * Kairos Digital Lab — 2D 座標錨點與多行儲存格還原解析器 v1.7
 * 針對兩份實測原檔《100題廠務端考試題庫》與《255題報到公安課題庫》徹底重構：
 * 1. 【左欄題號錨點法 (Anchor-Based Table Extraction)】
 *    先在左側題號欄 (Item / id) 鎖定所有題號 Y 座標作為錨點，再將同一列上下浮動 ±28pt 內的題目文字、
 *    多行換行文字、以及右側 Ans 欄答案全部歸位到該題號錨點，徹底解決 multi-line cell 錯位與漏題。
 * 2. 【五欄表格修正欄支援 (Item | content | Ans | 題目修正 | 答案)】
 *    若右側「題目修正」與「答案」欄有更新版題目（如第 57、68、83、125、192、207、228、229 題），
 *    自動將修訂版題目與答案納入解析對照，並避免右欄內容污染主選項。
 * 3. 【跨欄合併與小寫 o/x、數字 0 誤植校正】
 *    處理 PDF 引擎將「第 55 題題幹 + 3」或「141 + 0」合併成同一文字片段的情況，並支援小寫 o/x 及全形字元。
 */
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const LETTER_TO_INDEX = {
  A: 0, B: 1, C: 2, D: 3, E: 4,
  '1': 0, '2': 1, '3': 2, '4': 3, '5': 4,
  '①': 0, '②': 1, '③': 2, '④': 3, '⑤': 4,
};

const TF_TRUE_SET = new Set(['O', 'Ο', 'Ｏ', '○', '〇', '對', '是', 'TRUE', 'T', '✓', '✔']);
const TF_FALSE_SET = new Set(['X', 'Χ', 'Ｘ', '✕', '✖', '×', '錯', '否', 'FALSE', 'F']);

function normalizeChars(str) {
  return str
    .replace(/\(cid:\d+\)/g, ' ')
    .replace(/[Ａ-Ｚ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/Ο/g, 'O')
    .replace(/Χ/g, 'X')
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .replace(/[：]/g, ':');
}

function cleanPdfNoise(text) {
  return text
    .replace(/#?\s*Micron\s+Confidential\s*#?/gi, ' ')
    .replace(/#?\s*Item\s+content\s+Ans(?:wer)?(?:\s+題目修正\s+答案)?/gi, ' ')
    .replace(/(?:題號|題目內容|題幹|標準答案|參考答案)\s+(?:選項|答案|解析)/g, ' ')
    .replace(/Page\s+\d+\s+(?:of|\/)\s+\d+/gi, ' ')
    .replace(/第\s*\d+\s*頁\s*(?:共\s*\d+\s*頁)?/g, ' ');
}

function extractChoiceOptions(text) {
  const parenNumMatches = [...text.matchAll(/\(\s*([1-5]?)\s*\)\s*/g)];
  if (parenNumMatches.length >= 2) {
    const firstOneIdx = parenNumMatches.findIndex((m) => m[1] === '1');
    const validMatches = firstOneIdx >= 0 ? parenNumMatches.slice(firstOneIdx) : parenNumMatches;
    if (validMatches.length >= 2) return validMatches;
  }

  const parenAlphaMatches = [...text.matchAll(/\(\s*([A-E])\s*\)\s*/gi)];
  if (parenAlphaMatches.length >= 2) {
    const firstAIdx = parenAlphaMatches.findIndex((m) => m[1].toUpperCase() === 'A');
    const validMatches = firstAIdx >= 0 ? parenAlphaMatches.slice(firstAIdx) : parenAlphaMatches;
    if (validMatches.length >= 2) return validMatches;
  }

  const punctAlphaMatches = [...text.matchAll(/(?:^|\s|(?<=[？?。！!；;]))(?:([A-E])[.、:：\)]|([①-⑤]))\s*/gi)];
  if (punctAlphaMatches.length >= 2) return punctAlphaMatches;

  const rightParenNumMatches = [...text.matchAll(/(?:^|\s|(?<=[？?。！!；;]))([1-5])[\)）、]\s*/g)];
  if (rightParenNumMatches.length >= 2) return rightParenNumMatches;

  return [];
}

function buildQuestionObject(qNum, rawQuestionText, rawAnswerToken, revisionText, revisionAns, idx) {
  let body = normalizeChars(rawQuestionText).replace(/\s+/g, ' ').trim();
  let ansToken = rawAnswerToken ? normalizeChars(rawAnswerToken).trim().toUpperCase() : '';
  const revClean = revisionText ? normalizeChars(revisionText).replace(/\s+/g, ' ').trim() : '';
  const revAnsClean = revisionAns ? normalizeChars(revisionAns).trim().toUpperCase() : '';

  let explanation = '';

  const expMatch = body.match(/(?:解析|詳解|說明|備註)\s*:\s*(.+)$/i);
  if (expMatch) {
    explanation = expMatch[1].trim();
    body = body.slice(0, expMatch.index).trim();
  }

  const inlineAnsMatch = body.match(/(?:【?正確?答案】?|【?正解】?|Answer|Ans)\s*[:：]?\s*\(?([A-E1-5①-⑤OX○✕對錯是否])\)?/i);
  if (inlineAnsMatch) {
    if (!ansToken) ansToken = normalizeChars(inlineAnsMatch[1]).toUpperCase();
    body = body.replace(inlineAnsMatch[0], ' ').trim();
  }

  const matches = extractChoiceOptions(body);

  if (matches.length >= 2) {
    const questionStem = body.slice(0, matches[0].index).trim();
    const options = [];
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index + matches[i][0].length;
      const end = i + 1 < matches.length ? matches[i + 1].index : body.length;
      let optText = body.slice(start, end).trim();

      if (i === matches.length - 1 && !ansToken) {
        const tailAns = optText.match(/(?:\s+|(?<=[\u4e00-\u9fa5\)\]」』）]))([A-E1-5])\s*$/i);
        if (tailAns) {
          ansToken = tailAns[1].toUpperCase();
          optText = optText.slice(0, tailAns.index).trim();
        }
      }
      if (optText) options.push(optText);
    }

    const effectiveAns = ansToken || revAnsClean;
    const answerIndex =
      effectiveAns && effectiveAns in LETTER_TO_INDEX
        ? Math.min(LETTER_TO_INDEX[effectiveAns], options.length - 1)
        : 0;

    const notes = [
      explanation,
      revClean ? `題目修正／補充對照：${revClean}${revAnsClean ? `（修正答案：${revAnsClean}）` : ''}` : '',
    ].filter(Boolean);

    if (questionStem && options.length >= 2) {
      return {
        id: `q-${Date.now()}-${idx}`,
        sourceNumber: qNum || idx + 1,
        type: 'choice',
        question: questionStem,
        options: options.slice(0, 5),
        answerIndex,
        explanation: notes.join(' ｜ ') || '未提供詳細解析，建議對照原始講義或法規條文複習。',
      };
    }
  } else {
    let stemText = body;
    if (!ansToken) {
      const tfTail = stemText.match(/^(.*?)\s+([OX○〇✕✖×對錯是否])\s*$/i);
      if (tfTail && tfTail[1].trim().length >= 3) {
        stemText = tfTail[1].trim();
        ansToken = normalizeChars(tfTail[2]).toUpperCase();
      }
    }

    const effectiveTf = ansToken || revAnsClean;
    const isTrue = TF_TRUE_SET.has(effectiveTf) || effectiveTf === '0';
    const isFalse = TF_FALSE_SET.has(effectiveTf);

    if (stemText.length >= 3 && (isTrue || isFalse)) {
      const notes = [
        explanation,
        revClean ? `題目修正／補充對照：${revClean}` : '',
        !explanation && !revClean ? `是非題標準答案：${isTrue ? 'O（正確）' : 'X（錯誤）'}` : '',
      ].filter(Boolean);

      return {
        id: `q-${Date.now()}-${idx}`,
        sourceNumber: qNum || idx + 1,
        type: 'boolean',
        question: stemText,
        options: ['O（正確）', 'X（錯誤）'],
        answerIndex: isTrue ? 0 : 1,
        explanation: notes.join(' ｜ '),
      };
    }
  }

  return null;
}

function parseSpatialTablePages(pagesItems) {
  let idColMaxX = null;
  let ansColMinX = null;
  let ansColMaxX = null;

  for (const p of pagesItems) {
    const pageW = p.width || 842;
    for (const it of p.items) {
      const norm = normalizeChars(it.str).trim().toLowerCase();
      if (/^(?:id|no\.?|#|題號|項次|編號|item\b)/.test(norm) && it.x < pageW * 0.22) {
        idColMaxX = Math.max(idColMaxX || 0, it.x + 24);
      }
      if (/^(?:ans|answer|answ|答案|正解|解答)\b/.test(norm) && it.x > pageW * 0.4) {
        if (ansColMinX === null || it.x - 10 < ansColMinX) {
          ansColMinX = it.x - 10;
          ansColMaxX = it.x + 38;
        }
      }
    }
  }

  if (idColMaxX === null) {
    const leftNums = [];
    for (const p of pagesItems) {
      const pageW = p.width || 842;
      for (const it of p.items) {
        if (it.x < pageW * 0.16 && /^\d{1,4}\b/.test(it.str.trim())) {
          leftNums.push(it.x + 20);
        }
      }
    }
    if (leftNums.length >= 3) {
      idColMaxX = Math.max(...leftNums);
    }
  }

  if (ansColMinX === null) {
    const rightAnswers = [];
    for (const p of pagesItems) {
      const pageW = p.width || 842;
      for (const it of p.items) {
        const tok = normalizeChars(it.str).trim().toUpperCase();
        if (it.x > pageW * 0.45 && /^(?:[A-E1-5OX○✕])$/.test(tok)) {
          rightAnswers.push(it.x);
        }
      }
    }
    if (rightAnswers.length >= 3) {
      ansColMinX = Math.min(...rightAnswers) - 10;
      ansColMaxX = Math.min(...rightAnswers) + 38;
    }
  }

  if (idColMaxX === null || ansColMinX === null) {
    return null;
  }

  const tableRows = [];

  for (const p of pagesItems) {
    const pageW = p.width || 842;
    const pageH = p.height || 595;

    const validItems = p.items.filter((it) => {
      const s = normalizeChars(it.str).trim();
      if (!s) return false;
      if (/Micron\s+Confidential/i.test(s)) return false;
      if (
        it.y > pageH - 85 &&
        /^(?:id|question|answer|answ|item|content|ans|題目修正|答案)\b/i.test(s)
      ) {
        return false;
      }
      return true;
    });

    const anchors = [];
    const bodyItems = [];

    for (const it of validItems) {
      const s = normalizeChars(it.str).trim();
      if (it.x < idColMaxX) {
        const mPureNum = s.match(/^(\d{1,4})$/);
        const mMergedLead = s.match(/^(\d{1,4})\s+(.+)$/);
        if (mPureNum) {
          anchors.push({
            qNum: parseInt(mPureNum[1], 10),
            y: it.y,
            qParts: [],
            ansParts: [],
            revParts: [],
            revAnsParts: [],
          });
        } else if (mMergedLead) {
          anchors.push({
            qNum: parseInt(mMergedLead[1], 10),
            y: it.y,
            qParts: [{ y: it.y, x: it.x, width: it.width, str: mMergedLead[2] }],
            ansParts: [],
            revParts: [],
            revAnsParts: [],
          });
        } else {
          bodyItems.push(it);
        }
      } else {
        bodyItems.push(it);
      }
    }

    anchors.sort((a, b) => b.y - a.y);

    for (const it of bodyItems) {
      if (anchors.length === 0) continue;
      let bestAnchor = null;
      let bestDist = Infinity;
      for (const a of anchors) {
        const dist = Math.abs(a.y - it.y);
        if (dist < bestDist) {
          bestDist = dist;
          bestAnchor = a;
        }
      }
      if (!bestAnchor || bestDist > 28) continue;

      const s = it.str.trim();
      if (it.x < ansColMinX) {
        bestAnchor.qParts.push({ y: it.y, x: it.x, width: it.width, str: s });
      } else if (it.x <= ansColMaxX) {
        const mMergedAns = normalizeChars(s).match(/^([A-E1-5OX○✕0])\s+(.+)$/i);
        if (mMergedAns) {
          bestAnchor.ansParts.push(mMergedAns[1]);
          bestAnchor.revParts.push({ y: it.y, x: it.x, width: it.width, str: mMergedAns[2] });
        } else {
          bestAnchor.ansParts.push(s);
        }
      } else if (it.x > pageW * 0.82) {
        bestAnchor.revAnsParts.push(s);
      } else {
        bestAnchor.revParts.push({ y: it.y, x: it.x, width: it.width, str: s });
      }
    }

    for (const a of anchors) {
      a.qParts.sort((u, v) => {
        if (Math.abs(u.y - v.y) > 4) return v.y - u.y;
        return u.x - v.x;
      });
      a.revParts.sort((u, v) => {
        if (Math.abs(u.y - v.y) > 4) return v.y - u.y;
        return u.x - v.x;
      });

      let qStr = a.qParts.map((p) => p.str).join(' ').trim();
      let ansStr = normalizeChars(a.ansParts.join(' ')).trim();
      const revStr = a.revParts.map((p) => p.str).join(' ').trim();
      const revAnsStr = normalizeChars(a.revAnsParts.join(' ')).trim();

      if (!ansStr && qStr) {
        const maxRight = Math.max(...a.qParts.map((p) => p.x + (p.width || 0)), 0);
        if (maxRight >= ansColMinX - 4) {
          const tailAns = normalizeChars(qStr).match(/(?:\s+|(?<=[\u4e00-\u9fa5。．.?!？\)\]」』）]))([A-E1-5OX○✕0])\s*$/i);
          if (tailAns) {
            ansStr = tailAns[1].toUpperCase();
            qStr = qStr.slice(0, qStr.length - tailAns[0].length).trim();
          }
        }
      }

      if (qStr) {
        tableRows.push({
          qNum: a.qNum,
          questionText: qStr,
          answerText: ansStr,
          revisionText: revStr,
          revisionAns: revAnsStr,
        });
      }
    }
  }

  if (tableRows.length < 3) return null;

  const questions = [];
  const seenNumbers = new Set();

  for (let i = 0; i < tableRows.length; i++) {
    const row = tableRows[i];
    const qObj = buildQuestionObject(
      row.qNum,
      row.questionText,
      row.answerText,
      row.revisionText,
      row.revisionAns,
      i
    );
    if (qObj) {
      seenNumbers.add(row.qNum);
      questions.push(qObj);
    }
  }

  const sortedNums = Array.from(seenNumbers).sort((a, b) => a - b);
  const maxDetectedNumber = sortedNums.length > 0 ? sortedNums[sortedNums.length - 1] : 0;
  const missingNumbers = [];
  if (maxDetectedNumber >= 5 && maxDetectedNumber <= 500) {
    for (let n = 1; n <= maxDetectedNumber; n++) {
      if (!seenNumbers.has(n)) missingNumbers.push(n);
    }
  }

  return {
    questions,
    missingNumbers,
    maxDetectedNumber,
  };
}

export async function parsePdfFileWithDiagnostics(file) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const pagesItems = [];
  const flatPageTexts = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const content = await page.getTextContent();

    const items = content.items
      .filter((item) => 'str' in item && item.str.trim() !== '')
      .map((item) => ({
        str: item.str.trim(),
        x: item.transform ? item.transform[4] : 0,
        y: item.transform ? item.transform[5] : 0,
        width: item.width || 0,
      }));

    pagesItems.push({
      pageNum,
      width: viewport.width,
      height: viewport.height,
      items,
    });

    const sorted = [...items].sort((a, b) => {
      if (Math.abs(a.y - b.y) > 4) return b.y - a.y;
      return a.x - b.x;
    });
    const rows = [];
    let curRow = [];
    let curY = null;
    for (const it of sorted) {
      if (curY === null || Math.abs(it.y - curY) <= 4) {
        curRow.push(it);
        if (curY === null) curY = it.y;
      } else {
        rows.push(curRow);
        curRow = [it];
        curY = it.y;
      }
    }
    if (curRow.length > 0) rows.push(curRow);
    flatPageTexts.push(
      rows
        .map((r) =>
          r
            .sort((a, b) => a.x - b.x)
            .map((c) => c.str)
            .join(' ')
        )
        .join('\n')
    );
  }

  const spatialResult = parseSpatialTablePages(pagesItems);
  if (spatialResult && spatialResult.questions.length >= 3) {
    return spatialResult;
  }

  return parseQuestionsWithDiagnostics(flatPageTexts.join('\n'));
}

export function parseQuestionsWithDiagnostics(rawText) {
  if (!rawText || !rawText.trim()) {
    return { questions: [], missingNumbers: [], maxDetectedNumber: 0 };
  }

  let normalized = normalizeChars(cleanPdfNoise(rawText)).replace(/\r\n/g, '\n');

  const answerKeyMap = {};
  const answerKeySectionMatch = normalized.match(/(?:標準答案|參考答案|解答區|答案表|附錄答案)\s*:?([\s\S]{6,})$/i);
  if (answerKeySectionMatch) {
    const keyBlock = answerKeySectionMatch[1];
    const pairRegex = /(\d{1,4})\s*[.、:：)\-]\s*\(?([A-E1-5OX○✕])\)?/gi;
    let m;
    while ((m = pairRegex.exec(keyBlock)) !== null) {
      const qNum = parseInt(m[1], 10);
      answerKeyMap[qNum] = m[2].toUpperCase();
    }
  }

  normalized = normalized.replace(
    /(?:(?<=\s[A-DOX○✕1-4])|(?<=\([A-D1-4]\))|(?<=\bAnswer)|(?<=\bAns)|(?<=[。．.?!？]))\s+(?=(?:第\s*)?\d{1,4}\s*[.、:：)\]]?\s*[^\s\)\]])/gi,
    '\n'
  );

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

    const isLikelyOptionNumber =
      currentBlock &&
      detectedNum !== null &&
      detectedNum >= 1 &&
      detectedNum <= 4 &&
      /^\(\s*\d\s*\)/.test(line) &&
      currentBlock.qNum !== detectedNum - 1;

    if (match && !isLikelyOptionNumber) {
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
    const fallbackAns =
      block.inlineAnswer || (block.qNum && block.qNum in answerKeyMap ? answerKeyMap[block.qNum] : '');
    const qObj = buildQuestionObject(block.qNum, fullText, fallbackAns, '', '', idx);
    if (qObj) {
      if (block.qNum) seenNumbers.add(block.qNum);
      parsedQuestions.push(qObj);
    }
  }

  const sortedNums = Array.from(seenNumbers).sort((a, b) => a - b);
  const maxDetectedNumber = sortedNums.length > 0 ? sortedNums[sortedNums.length - 1] : 0;
  const missingNumbers = [];
  if (maxDetectedNumber >= 5 && maxDetectedNumber <= 500) {
    for (let n = 1; n <= maxDetectedNumber; n++) {
      if (!seenNumbers.has(n)) missingNumbers.push(n);
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
        const upper = normalizeChars(item.answer).trim().toUpperCase();
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
