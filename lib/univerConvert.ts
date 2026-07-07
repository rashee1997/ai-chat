// Converts between this app's LLM-facing JSON schemas (documented in the
// system prompt, app/api/chat/route.ts) and the snapshot shapes Univer's
// Sheets/Docs presets consume and produce. Kept separate from the Univer
// packages themselves (plain data in, plain data out) so it can be unit
// tested without mounting a real Univer instance.

interface ExcelSheet {
  name?: string;
  headers?: string[];
  rows?: Array<Array<string | number>>;
}
interface ExcelDoc {
  sheets?: ExcelSheet[];
}

export function excelContentToWorkbookData(contentJson: string, id: string): Record<string, unknown> {
  let doc: ExcelDoc = {};
  try {
    doc = JSON.parse(contentJson);
  } catch {
    doc = { sheets: [] };
  }

  const sheets: Record<string, unknown> = {};
  const sheetOrder: string[] = [];

  (doc.sheets || []).forEach((sheet, i) => {
    const sheetId = `sheet-${i}`;
    sheetOrder.push(sheetId);
    const cellData: Record<number, Record<number, { v: string | number; t?: number }>> = {};
    let rowIndex = 0;

    if (sheet.headers && sheet.headers.length > 0) {
      cellData[rowIndex] = {};
      sheet.headers.forEach((header, col) => {
        cellData[rowIndex][col] = { v: header, t: 1 };
      });
      rowIndex++;
    }

    (sheet.rows || []).forEach((row) => {
      cellData[rowIndex] = {};
      row.forEach((cell, col) => {
        cellData[rowIndex][col] = {
          v: cell,
          t: typeof cell === "number" ? 2 : 1,
        };
      });
      rowIndex++;
    });

    sheets[sheetId] = {
      id: sheetId,
      name: sheet.name || `Sheet${i + 1}`,
      cellData,
    };
  });

  return { id, name: id, sheetOrder, sheets };
}

interface UniverCellData {
  v?: string | number | boolean | null;
}
interface UniverSheetSnapshot {
  name?: string;
  cellData?: Record<string | number, Record<string | number, UniverCellData>>;
}
interface UniverWorkbookSnapshot {
  sheetOrder?: string[];
  sheets?: Record<string, UniverSheetSnapshot>;
}

/**
 * Reverse of excelContentToWorkbookData: reads a workbook snapshot (from
 * FWorkbook.save()) back into this app's excel JSON schema. The first row
 * of each sheet is always treated as the header row, matching what the
 * forward conversion always produces.
 */
export function workbookDataToExcelContent(snapshot: UniverWorkbookSnapshot): string {
  const sheets: ExcelSheet[] = (snapshot.sheetOrder || []).flatMap((sheetId) => {
    const sheet = snapshot.sheets?.[sheetId];
    if (!sheet) return [];

    const cellData = sheet.cellData || {};
    const rowKeys = Object.keys(cellData)
      .map(Number)
      .sort((a, b) => a - b);

    let headers: string[] = [];
    const rows: Array<Array<string | number>> = [];

    rowKeys.forEach((rowKey, idx) => {
      const rowObj = cellData[rowKey] || {};
      const colKeys = Object.keys(rowObj)
        .map(Number)
        .sort((a, b) => a - b);
      const maxCol = colKeys.length > 0 ? Math.max(...colKeys) : -1;
      const rowValues: Array<string | number> = [];
      for (let col = 0; col <= maxCol; col++) {
        const value = rowObj[col]?.v;
        rowValues.push(typeof value === "number" ? value : value == null ? "" : String(value));
      }
      if (idx === 0) {
        headers = rowValues.map(String);
      } else {
        rows.push(rowValues);
      }
    });

    return [{ name: sheet.name, headers, rows }];
  });

  return JSON.stringify({ sheets });
}

interface WordSection {
  heading?: string;
  paragraphs?: string[];
}
interface WordDoc {
  title?: string;
  subtitle?: string;
  sections?: WordSection[];
}

type WordParagraphRole =
  | { kind: "title" }
  | { kind: "subtitle" }
  | { kind: "heading"; sectionIndex: number }
  | { kind: "paragraph"; sectionIndex: number };

function flattenWordDoc(doc: WordDoc): { texts: string[]; roles: WordParagraphRole[] } {
  const texts: string[] = [];
  const roles: WordParagraphRole[] = [];

  if (doc.title) {
    texts.push(doc.title);
    roles.push({ kind: "title" });
  }
  if (doc.subtitle) {
    texts.push(doc.subtitle);
    roles.push({ kind: "subtitle" });
  }
  (doc.sections || []).forEach((section, sectionIndex) => {
    if (section.heading) {
      texts.push(section.heading);
      roles.push({ kind: "heading", sectionIndex });
    }
    (section.paragraphs || []).forEach((paragraph) => {
      texts.push(paragraph);
      roles.push({ kind: "paragraph", sectionIndex });
    });
  });

  return { texts, roles };
}

/**
 * Univer Docs' body is a flat "dataStream" string with `\r`-terminated
 * paragraphs and a trailing `\n` (section break) — not markup. Each
 * paragraph's `startIndex` is the index of its own trailing `\r`.
 */
export function wordContentToDocumentData(contentJson: string, id: string): Record<string, unknown> {
  let doc: WordDoc = {};
  try {
    doc = JSON.parse(contentJson);
  } catch {
    doc = {};
  }
  const { texts, roles } = flattenWordDoc(doc);

  let dataStream = "";
  const paragraphs: Array<{ startIndex: number; paragraphStyle?: Record<string, unknown> }> = [];

  texts.forEach((text, i) => {
    dataStream += `${text}\r`;
    const role = roles[i];
    const isHeadingLike = role.kind === "title" || role.kind === "subtitle" || role.kind === "heading";
    paragraphs.push({
      startIndex: dataStream.length - 1,
      ...(isHeadingLike ? { paragraphStyle: { spaceAbove: { v: 10 } } } : {}),
    });
  });
  dataStream += "\n";

  return {
    id,
    title: doc.title || "",
    body: { dataStream, paragraphs },
    documentStyle: {},
  };
}

interface UniverDocumentSnapshot {
  body?: { dataStream?: string };
}

/**
 * Reverse of wordContentToDocumentData. Paragraph structure (which
 * paragraph is the title vs. a section heading vs. body text) is recovered
 * positionally against the *original* content's shape, not stored in
 * Univer itself — so this only round-trips cleanly for in-place text edits.
 * Paragraphs added beyond the original structure are appended as body text
 * to the last section; paragraphs deleted from the middle will shift later
 * roles. Good enough for "edit the wording, save" — not lossless structural
 * editing.
 */
export function documentDataToWordContent(snapshot: UniverDocumentSnapshot, originalContentJson: string): string {
  let doc: WordDoc = {};
  try {
    doc = JSON.parse(originalContentJson);
  } catch {
    doc = {};
  }
  const { roles } = flattenWordDoc(doc);

  const dataStream = snapshot.body?.dataStream || "";
  // Split on the paragraph terminator; the segment after the last `\r` is
  // just the trailing section-break marker (a lone "\n" or ""), so drop it.
  const paragraphTexts = dataStream
    .split("\r")
    .slice(0, -1)
    .map((t) => t.replace(/\n$/, ""));

  const result: WordDoc = {
    title: doc.title,
    subtitle: doc.subtitle,
    sections: (doc.sections || []).map((s) => ({ heading: s.heading, paragraphs: [] as string[] })),
  };
  if (!result.sections || result.sections.length === 0) {
    result.sections = [{ paragraphs: [] }];
  }

  paragraphTexts.forEach((text, i) => {
    const role = roles[i];
    if (!role) {
      const lastSection = result.sections![result.sections!.length - 1];
      lastSection.paragraphs = lastSection.paragraphs || [];
      lastSection.paragraphs.push(text);
      return;
    }
    if (role.kind === "title") result.title = text;
    else if (role.kind === "subtitle") result.subtitle = text;
    else if (role.kind === "heading") result.sections![role.sectionIndex].heading = text;
    else {
      const section = result.sections![role.sectionIndex];
      section.paragraphs = section.paragraphs || [];
      section.paragraphs.push(text);
    }
  });

  return JSON.stringify(result);
}
