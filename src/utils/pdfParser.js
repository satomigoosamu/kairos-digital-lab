/** PDF transport; parsing rules live in the dependency-free pdfParserCore.js. */
import * as pdfjsLib from 'pdfjs-dist';
import { parseSpatialTablePages, parseQuestionsWithDiagnostics, extractHorizontalRules, extractHiddenTextOrigins } from './pdfParserCore.js';
export { parseQuestionsWithDiagnostics, parseQuestionsFromText, parseQuestionsFromJson, SAMPLE_JSON_TEMPLATE } from './pdfParserCore.js';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export async function parsePdfFileWithDiagnostics(file) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const pagesItems = [];
  const flatPageTexts = [];

  try {
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      const content = await page.getTextContent();
      const operators = await page.getOperatorList();
      const hiddenOrigins = extractHiddenTextOrigins(operators, pdfjsLib.OPS);

      const items = content.items
        .filter((item) => 'str' in item && item.str.trim() !== '')
        .map((item) => ({
          str: item.str.trim(),
          x: item.transform ? item.transform[4] : 0,
          y: item.transform ? item.transform[5] : 0,
          width: item.width || 0,
        }))
        .filter(item => !hiddenOrigins.some(p => Math.abs(p.y-item.y)<.5 && Math.abs(p.x-item.x)<.5));

      pagesItems.push({
        pageNum,
        width: viewport.width,
        height: viewport.height,
        items,
        rowRules: extractHorizontalRules(operators, pdfjsLib.OPS, viewport.width),
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
    if (spatialResult) {
      return spatialResult;
    }

    return parseQuestionsWithDiagnostics(flatPageTexts.join('\n'));
  } finally {
    await pdf.destroy();
  }
}

