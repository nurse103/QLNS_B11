import * as XLSX from 'xlsx';

/**
 * Bộ ghi .xlsx tối giản có định dạng (font, viền, căn lề, gộp ô, khổ giấy).
 * Thư viện xlsx (bản cộng đồng) không ghi được định dạng, nên tự sinh XML
 * và dùng bộ nén ZIP có sẵn trong xlsx (XLSX.CFB).
 */

export type Align = 'left' | 'center' | 'right';
export interface CellStyle {
    size?: number;
    bold?: boolean;
    italic?: boolean;
    align?: Align;
    valign?: 'top' | 'center' | 'bottom';
    wrap?: boolean;
    /** none | thin (4 cạnh mảnh) | row (dọc mảnh, ngang chấm) */
    border?: 'none' | 'thin' | 'row';
}

interface Cell { v: string | number; s: CellStyle }

export class StyledSheet {
    cells = new Map<string, Cell>();
    merges: string[] = [];
    colWidths: number[] = [];
    rowHeights = new Map<number, number>();
    font = 'Times New Roman';
    landscape = true;
    /** Dòng tiêu đề bảng lặp lại đầu mỗi trang khi in (0-based, từ..đến) */
    printTitleRows?: [number, number];

    /** r, c tính từ 0 */
    set(r: number, c: number, v: string | number | null | undefined, s: CellStyle = {}) {
        this.cells.set(`${r},${c}`, { v: v ?? '', s });
    }

    /** Gộp ô; style được áp cho mọi ô trong vùng để viền hiện đủ */
    merge(r1: number, c1: number, r2: number, c2: number, v?: string | number, s: CellStyle = {}) {
        for (let r = r1; r <= r2; r++)
            for (let c = c1; c <= c2; c++)
                this.set(r, c, r === r1 && c === c1 ? v : '', s);
        if (r1 !== r2 || c1 !== c2) this.merges.push(`${ref(r1, c1)}:${ref(r2, c2)}`);
    }
}

const colName = (c: number) => {
    let s = '';
    c += 1;
    while (c > 0) { const m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26); }
    return s;
};
const ref = (r: number, c: number) => `${colName(c)}${r + 1}`;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const buildXml = (ws: StyledSheet) => {
    // ----- styles -----
    const fonts: string[] = [];
    const fontIdx = new Map<string, number>();
    const xfs: string[] = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
    const xfIdx = new Map<string, number>();
    const borderId = { none: 0, thin: 1, row: 2 } as const;
    const getFont = (s: CellStyle) => {
        const k = `${s.size || 11}|${s.bold ? 1 : 0}|${s.italic ? 1 : 0}`;
        if (!fontIdx.has(k)) {
            fontIdx.set(k, fonts.length);
            fonts.push(`<font>${s.bold ? '<b/>' : ''}${s.italic ? '<i/>' : ''}<sz val="${s.size || 11}"/><name val="${esc(ws.font)}"/><family val="1"/></font>`);
        }
        return fontIdx.get(k)!;
    };
    getFont({}); // font 0 mặc định
    const getXf = (s: CellStyle) => {
        const k = JSON.stringify([s.size, s.bold, s.italic, s.align, s.valign, s.wrap, s.border]);
        if (!xfIdx.has(k)) {
            const f = getFont(s);
            const b = borderId[s.border || 'none'];
            xfIdx.set(k, xfs.length);
            xfs.push(`<xf numFmtId="49" fontId="${f}" fillId="0" borderId="${b}" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1" applyNumberFormat="1">` +
                `<alignment${s.align ? ` horizontal="${s.align}"` : ''} vertical="${s.valign || 'center'}"${s.wrap ? ' wrapText="1"' : ''}/></xf>`);
        }
        return xfIdx.get(k)!;
    };

    // ----- sheet data -----
    const byRow = new Map<number, [number, Cell][]>();
    ws.cells.forEach((cell, key) => {
        const [r, c] = key.split(',').map(Number);
        if (!byRow.has(r)) byRow.set(r, []);
        byRow.get(r)!.push([c, cell]);
    });
    const rowsSorted = [...new Set([...byRow.keys(), ...ws.rowHeights.keys()])].sort((a, b) => a - b);
    let maxR = 0, maxC = 0;
    const rowXml = rowsSorted.map(r => {
        const cells = (byRow.get(r) || []).sort((a, b) => a[0] - b[0]);
        const h = ws.rowHeights.get(r);
        maxR = Math.max(maxR, r);
        const inner = cells.map(([c, cell]) => {
            maxC = Math.max(maxC, c);
            const s = getXf(cell.s);
            if (typeof cell.v === 'number') return `<c r="${ref(r, c)}" s="${s}"><v>${cell.v}</v></c>`;
            if (cell.v === '') return `<c r="${ref(r, c)}" s="${s}"/>`;
            return `<c r="${ref(r, c)}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${esc(String(cell.v))}</t></is></c>`;
        }).join('');
        return `<row r="${r + 1}"${h ? ` ht="${h}" customHeight="1"` : ''}>${inner}</row>`;
    }).join('');

    const cols = ws.colWidths.length
        ? `<cols>${ws.colWidths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
        : '';
    const merges = ws.merges.length
        ? `<mergeCells count="${ws.merges.length}">${ws.merges.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>`
        : '';

    const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
        `<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>` +
        `<dimension ref="A1:${ref(maxR, maxC)}"/>` +
        `<sheetViews><sheetView workbookViewId="0" zoomScale="85"/></sheetViews>` +
        `<sheetFormatPr defaultRowHeight="15.75"/>` +
        cols + `<sheetData>${rowXml}</sheetData>` + merges +
        `<pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>` +
        `<pageSetup paperSize="9" orientation="${ws.landscape ? 'landscape' : 'portrait'}" fitToWidth="1" fitToHeight="0"/>` +
        `</worksheet>`;

    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
        `<fonts count="${fonts.length}">${fonts.join('')}</fonts>` +
        `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>` +
        `<borders count="3">` +
        `<border><left/><right/><top/><bottom/><diagonal/></border>` +
        `<border><left style="thin"><color auto="1"/></left><right style="thin"><color auto="1"/></right><top style="thin"><color auto="1"/></top><bottom style="thin"><color auto="1"/></bottom><diagonal/></border>` +
        `<border><left style="thin"><color auto="1"/></left><right style="thin"><color auto="1"/></right><top style="dotted"><color auto="1"/></top><bottom style="dotted"><color auto="1"/></bottom><diagonal/></border>` +
        `</borders>` +
        `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
        `<cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs>` +
        `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
        `</styleSheet>`;
    return { sheet, styles };
};

const printTitles = (ws: StyledSheet, sheetName: string) => {
    if (!ws.printTitleRows) return '';
    const [a, b] = ws.printTitleRows;
    const range = `'${esc(sheetName)}'!` + '$' + (a + 1) + ':$' + (b + 1);
    return `<definedNames><definedName name="_xlnm.Print_Titles" localSheetId="0">${range}</definedName></definedNames>`;
};

export const writeStyledXlsx =(ws: StyledSheet, sheetName: string): Uint8Array => {
    const { sheet, styles } = buildXml(ws);
    const files: Record<string, string> = {
        '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
        '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
        'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(sheetName)}" sheetId="1" r:id="rId1"/></sheets>${printTitles(ws, sheetName)}</workbook>`,
        'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
        'xl/worksheets/sheet1.xml': sheet,
        'xl/styles.xml': styles,
    };
    const CFB = (XLSX as any).CFB;
    const zip = CFB.utils.cfb_new();
    const enc = new TextEncoder();
    Object.entries(files).forEach(([path, content]) => CFB.utils.cfb_add(zip, path, enc.encode(content)));
    // bỏ mục giữ chỗ mà cfb_new tự thêm
    try { CFB.utils.cfb_del(zip, '\u0001Sh33tJ5'); } catch { /* không có thì thôi */ }
    const out = CFB.write(zip, { fileType: 'zip', type: 'array', compression: true });
    return out instanceof Uint8Array ? out : new Uint8Array(out);
};

export const downloadBytes = (bytes: Uint8Array, fileName: string) => {
    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};
