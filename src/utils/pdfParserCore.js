const LETTER_TO_INDEX = {
  A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, H: 7, I: 8,
  '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6, '8': 7, '9': 8,
  '①': 0, '②': 1, '③': 2, '④': 3, '⑤': 4, '⑥': 5, '⑦': 6, '⑧': 7, '⑨': 8,
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
  const parenNumMatches = [...text.matchAll(/\(\s*([1-9])\s*\)\s*/g)];
  if (parenNumMatches.length >= 2) {
    const firstOneIdx = parenNumMatches.findIndex((m) => m[1] === '1');
    const validMatches = firstOneIdx >= 0 ? parenNumMatches.slice(firstOneIdx) : parenNumMatches;
    if (validMatches.length >= 2) return validMatches;
  }

  const parenAlphaMatches = [...text.matchAll(/\(\s*([A-I])\s*\)\s*/gi)];
  if (parenAlphaMatches.length >= 2) {
    const firstAIdx = parenAlphaMatches.findIndex((m) => m[1].toUpperCase() === 'A');
    const validMatches = firstAIdx >= 0 ? parenAlphaMatches.slice(firstAIdx) : parenAlphaMatches;
    if (validMatches.length >= 2) return validMatches;
  }

  const punctAlphaMatches = [...text.matchAll(/(?:^|\s|(?<=[？?。！!；;]))(?:([A-I])[.、:：\)]|([①-⑨]))\s*/gi)];
  if (punctAlphaMatches.length >= 2) return punctAlphaMatches;

  const rightParenNumMatches = [...text.matchAll(/(?:^|\s|(?<=[？?。！!；;]))([1-9])[\)）、]\s*/g)];
  if (rightParenNumMatches.length >= 2) return rightParenNumMatches;

  return [];
}

export function buildQuestionObject(qNum, rawQuestionText, rawAnswerToken, revisionText, revisionAns, idx) {
  let body = normalizeChars(revisionText || rawQuestionText).replace(/\s+/g, ' ').trim();
  let ansToken = normalizeChars(revisionAns || rawAnswerToken || '').trim().toUpperCase();
  const revClean = revisionText ? normalizeChars(revisionText).replace(/\s+/g, ' ').trim() : '';
  const revAnsClean = revisionAns ? normalizeChars(revisionAns).trim().toUpperCase() : '';

  if (/(?:建議|請|已)?刪除|作廢|取消此題|\bDELETE(?:D)?\b/i.test(revClean)) return null;
  if (revClean && !revAnsClean) return null; // A changed question needs an explicit revised answer.
  let explanation = '';

  const expMatch = body.match(/(?:解析|詳解|說明|備註)\s*:\s*(.+)$/i);
  if (expMatch) {
    explanation = expMatch[1].trim();
    body = body.slice(0, expMatch.index).trim();
  }

  const inlineAnsMatch = body.match(/(?:【?(?:正確)?答案】?|【?正解】?|Answer|Ans)\s*[:：]?\s*\(?([A-I1-9①-⑨OX○✕對錯是否])\)?/i);
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
        const tailAns = optText.match(/(?:\s+|(?<=[\u4e00-\u9fa5\)\]」』）]))([A-I1-9])\s*$/i);
        if (tailAns) {
          ansToken = tailAns[1].toUpperCase();
          optText = optText.slice(0, tailAns.index).trim();
        }
      }
      if (optText) options.push(optText);
    }

    const effectiveAns = ansToken || revAnsClean;
    const labels = matches.map(m => (m[1] || m[2] || '').toUpperCase());
    const indexes = labels.map(label => LETTER_TO_INDEX[label]);
    if (indexes.some((value, i) => value !== i) || options.length !== matches.length) return null;
    if (!(effectiveAns in LETTER_TO_INDEX) || LETTER_TO_INDEX[effectiveAns] >= options.length) return null;
    const answerIndex =
      effectiveAns && effectiveAns in LETTER_TO_INDEX
        ? LETTER_TO_INDEX[effectiveAns]
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
        options,
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
    const isTrue = TF_TRUE_SET.has(effectiveTf);
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

const isDeletion = text => /(?:建議|請|已)?刪除|作廢|取消此題|\bDELETE(?:D)?\b/i.test(text || '');

function finalizeRows(rows, layoutIssues = []) {
  const counts = new Map();
  for (const row of rows) counts.set(row.qNum, (counts.get(row.qNum) || 0) + 1);
  const detectedNumbers = [...counts.keys()].sort((a, b) => a - b);
  const duplicateNumbers = detectedNumbers.filter(n => counts.get(n) > 1);
  const deletedNumbers = [], rejectedNumbers = [], questions = [];
  for (const [idx, row] of rows.entries()) {
    if (counts.get(row.qNum) > 1) continue; // Never choose one duplicate silently.
    if (isDeletion(row.revisionText)) { deletedNumbers.push(row.qNum); continue; }
    const question = row.unsafe ? null : buildQuestionObject(row.qNum, row.questionText,
      row.answerText, row.revisionText, row.revisionAns, idx);
    if (question) {
      question.revised = Boolean(row.revisionText || row.revisionAns);
      question.sourcePage = row.pageNum;
      questions.push(question);
    } else rejectedNumbers.push(row.qNum);
  }
  const maxDetectedNumber = detectedNumbers.at(-1) || 0;
  const missingNumbers = [];
  // Bound diagnostics only; do not derive the upper bound from successfully parsed questions.
  if (maxDetectedNumber <= 10000) for (let n = 1; n <= maxDetectedNumber; n++) {
    if (!counts.has(n)) missingNumbers.push(n);
  }
  const warnings = [
    deletedNumbers.length ? `已排除標示刪除／作廢的題號：${deletedNumbers.join('、')}。請由題庫負責人確認。` : '',
    rejectedNumbers.length ? `以下題號的題目、選項或答案不完整，已排除，請人工確認：${rejectedNumbers.join('、')}。` : '',
    duplicateNumbers.length ? `以下題號重複，已全部排除，請人工確認：${duplicateNumbers.join('、')}。` : '',
    ...layoutIssues,
  ].filter(Boolean);
  return { questions, missingNumbers, maxDetectedNumber, detectedNumbers, duplicateNumbers,
    deletedNumbers, rejectedNumbers, warnings, sourceRowCount: rows.length };
}

function orderedText(parts) {
  // Group baselines before sorting columns; a tolerance comparator alone is not transitive.
  const lines = [];
  for (const item of [...parts].sort((a, b) => b.y - a.y || a.x - b.x)) {
    let line = lines.find(line => Math.abs(line.y - item.y) <= 2);
    if (!line) { line = {y: item.y, items: []}; lines.push(line); }
    line.items.push(item);
  }
  return lines.map(line => line.items.sort((a, b) => a.x - b.x)
    .map(item => item.str).join(' ')).join(' ').trim();
}

function pageLayout(page) {
  const norm = item => normalizeChars(item.str).trim().toLowerCase();
  const id = page.items.find(it => /^(item|id|no\.?|題號|項次|編號)$/.test(norm(it)) && it.x < page.width * .3);
  if (!id) return null;
  const headers = page.items.filter(it => Math.abs(it.y - id.y) < 4).sort((a,b) => a.x-b.x);
  const content = headers.find(it => /^(content|question|題目|題目內容|題幹)$/.test(norm(it)));
  const answers = headers.filter(it => /^(ans|answer|answ|答案|正解|解答)$/.test(norm(it)));
  const revision = headers.find(it => /^(題目修正|修正題目|修訂題目|revision)$/.test(norm(it)));
  if (!content || !answers.length) return null;
  // Boundaries follow the next column's left edge, never fixed widths or page percentages.
  return { idMax: content.x - 1, ansMin: answers[0].x - 2,
    revMin: revision ? revision.x - 2 : Infinity,
    revAnsMin: revision && answers[1] ? answers[1].x - 2 : Infinity,
    headerY: id.y, width: page.width };
}

// Read painted horizontal paths (not clipping rectangles) in PDF coordinates.
export function extractHorizontalRules(list, ops, pageWidth) {
  const rules = [], stack = [];
  let matrix = [1,0,0,1,0,0], segments = [];
  const point = (x,y) => [matrix[0]*x+matrix[2]*y+matrix[4], matrix[1]*x+matrix[3]*y+matrix[5]];
  const segment = (a,b) => {
    if (Math.abs(a[1]-b[1]) <= 1 && Math.abs(a[0]-b[0]) > pageWidth*.3)
      segments.push({x1:Math.min(a[0],b[0]), x2:Math.max(a[0],b[0]), y:(a[1]+b[1])/2});
  };
  for (let i=0;i<list.fnArray.length;i++) {
    const fn=list.fnArray[i], args=list.argsArray[i];
    if (fn===ops.save) stack.push([...matrix]);
    else if (fn===ops.restore) matrix=stack.pop() || [1,0,0,1,0,0];
    else if (fn===ops.transform) {
      const [a,b,c,d,e,f]=matrix, [g,h,j,k,l,m]=args;
      matrix=[a*g+c*h,b*g+d*h,a*j+c*k,b*j+d*k,a*l+c*m+e,b*l+d*m+f];
    } else if (fn===ops.constructPath && Array.isArray(args[0])) {
      let cursor=0, previous=null, first=null;
      for (const op of args[0]) {
        if (op===ops.rectangle) {
          const [x,y,w,h]=args[1].slice(cursor,cursor+4); cursor+=4;
          if (Math.abs(h)<=2) segment(point(x,y+h/2),point(x+w,y+h/2));
        } else if (op===ops.moveTo || op===ops.lineTo) {
          const next=point(args[1][cursor++],args[1][cursor++]);
          if (op===ops.lineTo && previous) segment(previous,next);
          else first=next;
          previous=next;
        } else if (op===ops.closePath) { if (previous && first) segment(previous,first); }
        else cursor += op===ops.curveTo ? 6 : 4;
      }
    } else if ([ops.stroke,ops.closeStroke,ops.fill,ops.eoFill,ops.fillStroke,
      ops.eoFillStroke,ops.closeFillStroke,ops.closeEOFillStroke].includes(fn)) {
      rules.push(...segments); segments=[];
    } else if (fn===ops.endPath) segments=[];
  }
  return rules;
}

// getTextContent includes text hidden by table-cell clipping. Keep those baselines
// out of the following row; otherwise an overflowing option becomes its neighbour's stem.
export function extractHiddenTextOrigins(list, ops) {
  const hidden=[], stack=[];
  let clip=null, rectangle=null, matrix=[1,0,0,1,0,0], origin=null;
  const point=(x,y)=>[matrix[0]*x+matrix[2]*y+matrix[4],matrix[1]*x+matrix[3]*y+matrix[5]];
  for(let i=0;i<list.fnArray.length;i++) {
    const fn=list.fnArray[i], a=list.argsArray[i];
    if(fn===ops.save) stack.push({clip,matrix:[...matrix]});
    else if(fn===ops.restore) { const state=stack.pop(); if(state){clip=state.clip;matrix=state.matrix;} }
    else if(fn===ops.transform) {
      const [b,c,d,e,f,g]=matrix,[h,j,k,l,m,n]=a;
      matrix=[b*h+d*j,c*h+e*j,b*k+d*l,c*k+e*l,b*m+d*n+f,c*m+e*n+g];
    } else if(fn===ops.constructPath) {
      rectangle=null;
      if(Array.isArray(a[0]) && a[0].length===1 && a[0][0]===ops.rectangle && matrix[1]===0 && matrix[2]===0) {
        const [x,y,w,h]=a[1], p=point(x,y),q=point(x+w,y+h);
        rectangle={left:Math.min(p[0],q[0]),right:Math.max(p[0],q[0]),bottom:Math.min(p[1],q[1]),top:Math.max(p[1],q[1])};
      }
    } else if((fn===ops.clip || fn===ops.eoClip) && rectangle) {
      clip=clip?{left:Math.max(clip.left,rectangle.left),right:Math.min(clip.right,rectangle.right),
        top:Math.min(clip.top,rectangle.top),bottom:Math.max(clip.bottom,rectangle.bottom)}:rectangle;
    } else if(fn===ops.setTextMatrix) origin=point(a[4],a[5]);
    else if(fn===ops.showText && origin && clip) {
      if(origin[0]<clip.left-.5 || origin[0]>clip.right+.5 || origin[1]<clip.bottom-.5 || origin[1]>clip.top+.5)
        hidden.push({x:origin[0],y:origin[1]});
    }
  }
  return hidden;
}

export function parseSpatialTablePages(pages) {
  const template = pages.map(pageLayout).find(Boolean);
  if (!template) return null; // Headerless documents use the established text parser.
  const rows = [], layoutIssues = [];
  for (const page of pages) {
    let layout = pageLayout(page);
    if (!layout) {
      const scale = page.width / template.width;
      layout = Object.fromEntries(Object.entries(template).map(([k,v]) => [k,
        ['idMax','ansMin','revMin','revAnsMin'].includes(k) ? v * scale : v]));
      layout.headerY = page.height;
    }
    const items = page.items.filter(it => it.str.trim() && it.y < layout.headerY - 4 &&
      !/Micron\s+Confidential|^Page\s+\d+|^第\s*\d+\s*頁/i.test(it.str));
    const anchors = [], body = [];
    for (const item of items) {
      const m = item.x < layout.idMax && normalizeChars(item.str).trim()
        .match(/^(\d{1,4})(?:[.、:]?\s+(.+)|[.、:]?)$/);
      if (m && +m[1] > 0) {
        const row = {qNum:+m[1], y:item.y, pageNum:page.pageNum,
          q:[], ans:[], rev:[], revAns:[]};
        if (m[2]) row.q.push({...item, x:layout.idMax + 1, str:m[2]});
        anchors.push(row);
      } else body.push(item);
    }
    anchors.sort((a,b) => b.y-a.y);
    if (!anchors.length) {
      if (items.length) layoutIssues.push(`第 ${page.pageNum} 頁無可定位題號；可能是跨頁續文，請人工確認，未自動合併。`);
      continue;
    }
    const rules = (page.rowRules || []).filter(r => r.x1 <= layout.idMax && r.x2 >= layout.ansMin)
      .map(r => r.y).sort((a,b) => b-a);
    const bounds = row => {
      const k = anchors.indexOf(row);
      const above = rules.filter(y => y > row.y), below = rules.filter(y => y < row.y);
      if (above.length && below.length) return {top:above.at(-1),bottom:below[0]};
      return {top:k ? (anchors[k-1].y+row.y)/2 : layout.headerY-4,
        bottom:k+1<anchors.length ? (anchors[k+1].y+row.y)/2 :
          row.y - (k ? anchors[k-1].y-row.y : (layout.headerY-row.y)*2)/2};
    };
    for (const item of body) {
      if (item.x < layout.idMax) continue;
      const candidates = anchors.filter(a => { const b=bounds(a); return item.y<=b.top && item.y>=b.bottom; });
      const row = candidates.length===1 ? candidates[0] :
        anchors.reduce((best,a) => Math.abs(a.y-item.y)<Math.abs(best.y-item.y) ? a:best);
      const {top,bottom} = bounds(row);
      if (item.y > top || item.y < bottom) {
        layoutIssues.push(`第 ${page.pageNum} 頁有超出題列邊界的文字，請人工確認。`);
        row.unsafe = true;
        continue;
      }
      const part = {...item, str:normalizeChars(item.str).trim()};
      if (item.x < layout.ansMin) {
        // Only split a trailing answer when the text item actually spans the answer column.
        const tail = part.str.match(/\s+([A-I1-9OX○✕])$/i);
        if (tail && item.x+item.width >= layout.ansMin && item.x+item.width < layout.revMin) {
          row.ans.push({...part,str:tail[1]}); part.str = part.str.slice(0,tail.index);
        } else if (item.x+item.width > layout.revMin) row.unsafe = true;
        row.q.push(part);
      } else if (item.x < layout.revMin) {
        const merged = part.str.match(/^([A-I1-9OX○✕])\s+(.+)$/i);
        if (merged && item.x+item.width >= layout.revMin) {
          row.ans.push({...part,str:merged[1]}); row.rev.push({...part,str:merged[2]});
        } else row.ans.push(part);
      } else if (item.x < layout.revAnsMin) row.rev.push(part);
      else row.revAns.push(part);
    }
    for (const row of anchors) rows.push({qNum:row.qNum, pageNum:row.pageNum,
      questionText:orderedText(row.q), answerText:orderedText(row.ans),
      revisionText:orderedText(row.rev), revisionAns:orderedText(row.revAns), unsafe:row.unsafe});
  }
  return finalizeRows(rows, [...new Set(layoutIssues)]);
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
    normalized = normalized.slice(0, answerKeySectionMatch.index);
    const pairRegex = /(\d{1,4})\s*[.、:：)\-]\s*\(?([A-I1-9OX○✕])\)?/gi;
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
    /^(?:[\(\[【]([A-I1-9OX○✕])[\)\]】]\s*)?(?:第\s*(\d{1,4})\s*題|\(?(\d{1,4})\)?\s*[.、:：\)\]]|(\d{1,4})\s+(?=[^\s])|(\d{3})(?=[\u4e00-\u9fa5「『《【（(])|Q\s*(\d{1,4})\s*[.、:：]?)\s*(.+)$/i;

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
      detectedNum <= 9 &&
      /^\(\s*\d\s*\)/.test(line);

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

  return finalizeRows(blocks.map(block => ({
    qNum: block.qNum,
    questionText: block.rawLines.join(' ').replace(/\s+/g, ' ').trim(),
    answerText: block.inlineAnswer || answerKeyMap[block.qNum] || '',
    revisionText: '', revisionAns: '',
  })));
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
