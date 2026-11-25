/**
 * Các mẫu biểu BHYT theo hướng dẫn (Thông tư 63/2025/TT-BQP, 98/2025/TT-BQP):
 *  - Mẫu 03A/BHYT-QĐ : công văn đề nghị cấp thẻ BHYT (đơn vị)            → .docx
 *  - Mẫu 01A/BHYT-QĐ : tờ khai cá nhân quân nhân, CCQP, VCQP, LĐHĐ        → .docx
 *  - Mẫu 01C/BHYT-QĐ : tờ khai thân nhân (cấp thẻ BHYT mới)               → .xlsx
 *  - Mẫu 04/BHYT-QĐ  : đơn cấp đổi, cấp lại, gia hạn có thay đổi thông tin → .docx
 * Mẫu 04a/04b (danh sách đơn vị tổng hợp) nằm ở bhytExport.ts.
 */
import { BhytCaNhan, BhytThanNhan, LOAI_DE_NGHI, LoaiDeNghi, effectiveLoai, loaiDeNghiTitle } from '../services/bhytService';
import { Employee, Family } from '../services/personnelService';
import { buildDocx, downloadBlob, escapeXml } from './docxBuilder';
import { CellStyle, StyledSheet, downloadBytes, writeStyledXlsx } from './xlsxWriter';
import { formatDateVN } from './bhytExport';

// ===== Thông tin đơn vị (theo mẫu 03A của khoa) =====
export const DON_VI = {
    capTren: 'BỆNH VIỆN QUÂN Y 103',
    ten: 'KHOA HỒI SỨC NGOẠI',
    tenThuong: 'Khoa Hồi sức ngoại',
    benhVien: 'Bệnh viện Quân y 103',
    kyHieu: 'B11',
    noiNhan: 'Ban Quân lực',
    diaDanh: 'Hà Nội',
    chucDanhKy: 'CHỦ NHIỆM KHOA',
    nguoiKy: 'Đại tá Vũ Minh Dương',
};

const DOTS = '…………………………………';
const val = (v?: string | number | null, dots = DOTS) => {
    const s = String(v ?? '').trim();
    return s || dots;
};
const fileSafe = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
const dateParts = (d?: string | null) => {
    if (!d) return { d: '……', m: '……', y: '……' };
    const [y, m, day] = d.split('-');
    return { d: (day || '').slice(0, 2) || '……', m: m || '……', y: y || '……' };
};
/** '2011-10-01' → '10/2011' (tháng, năm) */
const thangNam = (d?: string | null) => {
    const m = String(d || '').match(/^(\d{4})-(\d{2})/);
    return m ? `${m[2]}/${m[1]}` : (d || '');
};
const isFemale = (g?: string | null) => (g || '').trim().toLowerCase() === 'nữ';
const diaChi = (xa?: string | null, tinh?: string | null, fallback?: string | null) =>
    [xa, tinh].filter(Boolean).join(', ') || fallback || '';

/** Lý do đề nghị = tên mục + ghi chú của bản ghi */
const lyDo = (x: { loai_de_nghi?: string | null; sd_den_ngay?: string | null; nam: number; ghi_chu?: string | null }) => {
    const loai = effectiveLoai(x);
    const base: Record<LoaiDeNghi, string> = {
        I: 'Thẻ còn giá trị sử dụng',
        II: 'Gia hạn thẻ BHYT (không thay đổi thông tin)',
        III: 'Gia hạn thẻ BHYT có thay đổi thông tin',
        IV: 'Cấp đổi thẻ BHYT',
        V: 'Cấp lại thẻ BHYT (mất, hỏng thẻ)',
        VI: 'Giảm thẻ BHYT',
        VII: 'Cấp mới thẻ BHYT',
    };
    const note = (x.ghi_chu || '').trim();
    return note ? `${base[loai]}: ${note}` : base[loai];
};

// ====================================================================== DOCX
type Run = string | { t: string; b?: boolean; i?: boolean; u?: boolean; sz?: number };
interface POpt {
    align?: 'left' | 'center' | 'right' | 'both';
    sz?: number;
    b?: boolean;
    i?: boolean;
    indent?: number;      // thụt đầu dòng (twip)
    before?: number;      // khoảng cách trước (twip)
    after?: number;
    line?: number;        // giãn dòng (240 = đơn)
    tabs?: number[];
    pageBreakBefore?: boolean;
}

const runXml = (r: Run, o: POpt) => {
    const x = typeof r === 'string' ? { t: r } : r;
    const b = x.b ?? o.b, i = x.i ?? o.i, sz = x.sz ?? o.sz;
    const rPr = `${b ? '<w:b/><w:bCs/>' : ''}${i ? '<w:i/><w:iCs/>' : ''}${x.u ? '<w:u w:val="single"/>' : ''}${sz ? `<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>` : ''}`;
    // Hỗ trợ \t (tab) trong nội dung
    return x.t.split('\t').map((part, k) =>
        `${k > 0 ? `<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ''}<w:tab/></w:r>` : ''}<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ''}<w:t xml:space="preserve">${escapeXml(part)}</w:t></w:r>`
    ).join('');
};

const P = (runs: Run | Run[], o: POpt = {}) => {
    const list = Array.isArray(runs) ? runs : [runs];
    const pPr = [
        o.pageBreakBefore ? '<w:pageBreakBefore/>' : '',
        o.tabs?.length ? `<w:tabs>${o.tabs.map(t => `<w:tab w:val="left" w:pos="${t}"/>`).join('')}</w:tabs>` : '',
        `<w:spacing w:before="${o.before ?? 0}" w:after="${o.after ?? 0}" w:line="${o.line ?? 264}" w:lineRule="auto"/>`,
        o.indent ? `<w:ind w:firstLine="${o.indent}"/>` : '',
        `<w:jc w:val="${o.align || 'left'}"/>`,
    ].join('');
    return `<w:p><w:pPr>${pPr}</w:pPr>${list.map(r => runXml(r, o)).join('')}</w:p>`;
};

interface Cell { content: string; span?: number; vMerge?: 'restart' | 'continue'; valign?: 'top' | 'center' }
/** Bảng: widths theo twip; border = có kẻ khung */
const Table = (widths: number[], rows: Cell[][], border: boolean) => {
    const b = border ? 'single' : 'nil';
    const borders = `<w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(s => `<w:${s} w:val="${b}" w:sz="4" w:space="0" w:color="000000"/>`).join('')}</w:tblBorders>`;
    const total = widths.reduce((a, c) => a + c, 0);
    const body = rows.map(cells => {
        let col = 0;
        const tcs = cells.map(c => {
            const span = c.span || 1;
            const w = widths.slice(col, col + span).reduce((a, x) => a + x, 0);
            col += span;
            const tcPr = `<w:tcW w:w="${w}" w:type="dxa"/>${span > 1 ? `<w:gridSpan w:val="${span}"/>` : ''}${c.vMerge ? `<w:vMerge${c.vMerge === 'restart' ? ' w:val="restart"' : ''}/>` : ''}<w:vAlign w:val="${c.valign || 'center'}"/>`;
            return `<w:tc><w:tcPr>${tcPr}</w:tcPr>${c.content || P('')}</w:tc>`;
        }).join('');
        return `<w:tr><w:trPr><w:cantSplit/></w:trPr>${tcs}</w:tr>`;
    }).join('');
    return `<w:tbl><w:tblPr><w:tblW w:w="${total}" w:type="dxa"/><w:tblLayout w:type="fixed"/>${borders}</w:tblPr><w:tblGrid>${widths.map(w => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${body}</w:tbl>`;
};

const SECT_A4 = (m: { top: number; right: number; bottom: number; left: number }) =>
    `<w:sectPr><w:pgSz w:w="11906" w:h="16838" w:code="9"/><w:pgMar w:top="${m.top}" w:right="${m.right}" w:bottom="${m.bottom}" w:left="${m.left}" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>`;

/** Đoạn kết siêu nhỏ: Word luôn cần 1 đoạn sau bảng cuối, tránh sinh thêm trang trắng */
const END_P = '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/></w:rPr></w:pPr></w:p>';

const saveDocx = (body: string, fileName: string) =>
    downloadBlob(buildDocx({ body: body.replace('<w:sectPr>', `${END_P}<w:sectPr>`), defaultHalfPointSize: 28 }), fileName);

/** Khối quốc hiệu căn giữa (dùng cho đơn/tờ khai cá nhân) */
const quocHieu = () =>
    P({ t: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', b: true, sz: 26 }, { align: 'center' }) +
    P({ t: 'Độc lập - Tự do - Hạnh phúc', b: true, u: true }, { align: 'center' });

// ============================================================ Mẫu 03A/BHYT-QĐ
export type NhomDoiTuong = 'QN' | 'CCQP' | 'LDHD';

/** Phân nhóm nhân viên theo cấp bậc / đối tượng để đếm vào cột của mẫu 03A */
export const nhomDoiTuong = (e?: { cap_bac?: string | null; doi_tuong?: string | null } | null): NhomDoiTuong => {
    const s = `${e?.cap_bac || ''} ${e?.doi_tuong || ''}`.toLowerCase();
    if (/lđhđ|ldhd|hợp đồng/.test(s)) return 'LDHD';
    if (/cnvqp|cnqp|ccqp|vcqp|công nhân|công chức|viên chức/.test(s)) return 'CCQP';
    return 'QN';
};

/** Các dòng nội dung đề nghị của mẫu 03A và mục tương ứng trong danh sách 04a/04b */
const DONG_03A: { label: string; loai: LoaiDeNghi }[] = [
    { label: 'Cấp mới', loai: 'VII' },
    { label: 'Giảm thẻ', loai: 'VI' },
    { label: 'Gia hạn có thay đổi thông tin', loai: 'III' },
    { label: 'Gia hạn không thay đổi thông tin', loai: 'II' },
    { label: 'Cấp đổi', loai: 'IV' },
    { label: 'Cấp lại', loai: 'V' },
];

export const exportMau03A = (caNhan: BhytCaNhan[], thanNhan: BhytThanNhan[], employees: Employee[], nam: number) => {
    const empById = new Map(employees.map(e => [e.id, e]));
    const count = (loai: LoaiDeNghi) => {
        const c = [0, 0, 0, 0, 0];
        caNhan.filter(x => effectiveLoai(x) === loai).forEach(x => {
            const g = nhomDoiTuong(empById.get(x.dsnv_id) || x.dsnv as any);
            c[g === 'QN' ? 0 : g === 'CCQP' ? 1 : 2]++;
        });
        thanNhan.filter(x => effectiveLoai(x) === loai).forEach(x => {
            const g = nhomDoiTuong(empById.get(x.dsnv_id) || x.dsnv as any);
            c[g === 'QN' ? 3 : 4]++;
        });
        return c;
    };
    const data = DONG_03A.map(d => ({ ...d, c: count(d.loai) }));
    const tong = [0, 1, 2, 3, 4].map(k => data.reduce((s, d) => s + d.c[k], 0));
    const num = (n: number) => (n ? String(n) : '');

    const W = [560, 2650, 880, 1180, 820, 1000, 1180, 1040]; // tổng 9310 twip
    const th = (t: string) => ({ content: P({ t, b: true }, { align: 'center', sz: 20, line: 240 }) });
    const td = (t: string, align: POpt['align'] = 'center', b = false) => ({ content: P({ t, b }, { align, sz: 22, line: 240 }) });

    const rows: Cell[][] = [
        ['TT', 'Nội dung đề nghị', 'Quân nhân', 'CCQP, CN&VCQP', 'LĐHĐ', 'Thân nhân QN', 'Thân nhân CN&VCQP', 'Tổng số'].map(th),
        ['A', 'B', '1', '2', '3', '4', '5', '6=1+2+3+4+5'].map(t => ({ content: P({ t, i: true }, { align: 'center', sz: 18, line: 240 }) })),
        ...data.map((d, i) => [
            td(String(i + 1)), td(d.label, 'left'),
            ...d.c.map(n => td(num(n))),
            td(num(d.c.reduce((a, b) => a + b, 0)), 'center', true),
        ]),
        [td(''), td('Cộng', 'center', true), ...tong.map(n => td(num(n), 'center', true)), td(num(tong.reduce((a, b) => a + b, 0)), 'center', true)],
    ];

    const header = Table([3500, 5810], [[
        {
            content: P({ t: DON_VI.capTren, sz: 26 }, { align: 'center' }) +
                P({ t: DON_VI.ten, b: true, u: true, sz: 26 }, { align: 'center' }) +
                P({ t: `Số:……/${DON_VI.kyHieu}`, sz: 26 }, { align: 'center', before: 120 }) +
                P({ t: 'V/v cấp thẻ bảo hiểm y tế', sz: 24 }, { align: 'center' }),
            valign: 'top',
        },
        {
            content: P({ t: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', b: true, sz: 26 }, { align: 'center' }) +
                P({ t: 'Độc lập - Tự do - Hạnh phúc', b: true, u: true }, { align: 'center' }) +
                P({ t: `${DON_VI.diaDanh}, ngày      tháng      năm ${nam - 1}`, i: true }, { align: 'center', before: 240 }),
            valign: 'top',
        },
    ]], false);

    const body = [
        P({ t: 'Mẫu số 03A/BHYT-QĐ', b: true, i: true, sz: 24 }, { align: 'right' }),
        header,
        P({ t: `Kính gửi: ${DON_VI.noiNhan}` }, { align: 'center', before: 160, after: 80 }),
        P('Căn cứ Thông tư số 63/2025/TT-BQP ngày 01/7/2025 của Bộ trưởng Bộ Quốc phòng quy định, hướng dẫn thực hiện một số điều của Nghị định số 70/2015/NĐ-CP ngày 01/9/2015 của Chính phủ quy định chi tiết và hướng dẫn thi hành một số điều của Luật Bảo hiểm y tế đối với quân đội nhân dân, công an nhân dân và người làm công tác cơ yếu; Nghị định số 74/2025/NĐ-CP ngày 31/3/2025 sửa đổi, bổ sung một số điều của Nghị định số 70/2015/NĐ-CP ngày 01/9/2015 của Chính phủ;', { align: 'both', indent: 720, after: 30, line: 240 }),
        P('Căn cứ Thông tư số 98/2025/TT-BQP ngày 03/09/2025 của Bộ trưởng Bộ Quốc phòng hướng dẫn thực hiện một số điều của Nghị định số 188/2025/NĐ-CP ngày 01/07/2025 của Chính phủ quy định chi tiết và hướng dẫn thi hành một số điều của Luật BHYT đối với các đối tượng thuộc phạm vi quản lý của Bộ quốc phòng.', { align: 'both', indent: 720, after: 30, line: 240 }),
        P('Căn cứ vào tổ chức, biên chế của đơn vị.', { align: 'both', indent: 720, after: 30, line: 240 }),
        P(`${DON_VI.tenThuong} báo cáo số lượng đề nghị cấp thẻ BHYT năm ${nam} như sau:`, { align: 'both', indent: 720, after: 80, line: 240 }),
        Table(W, rows, true),
        P({ t: '* Hồ sơ gửi kèm:', b: true, i: true }, { indent: 720, before: 80, line: 240 }),
        P('1. Danh sách tham gia BHYT: …. bản.', { indent: 720, line: 240 }),
        P('2. Danh sách đề nghị cấp đổi, cấp lại: …..', { indent: 720, line: 240 }),
        P('3. Dữ liệu điện tử.', { indent: 720, line: 240 }),
        P('4. Liên hệ đồng chí (Họ và tên, cấp bậc, chức vụ) số điện thoại………………', { indent: 720, line: 240 }),
        P(`Đề nghị ${DON_VI.noiNhan} tổng hợp, báo cáo đề nghị cấp thẻ BHYT cho các đối tượng theo quy định./.`, { align: 'both', indent: 720, after: 80, line: 240 }),
        Table([4400, 4910], [[
            {
                content: P({ t: 'Nơi nhận:', b: true, i: true, sz: 24 }) + P({ t: '- Như trên;', sz: 22 }) + P({ t: '- Lưu: …………', sz: 22 }),
                valign: 'top',
            },
            {
                content: P({ t: DON_VI.chucDanhKy, b: true }, { align: 'center' }) + P('') + P('') + P('') +
                    P({ t: DON_VI.nguoiKy, b: true }, { align: 'center' }),
                valign: 'top',
            },
        ]], false),
        SECT_A4({ top: 510, right: 794, bottom: 567, left: 1588 }),
    ].join('');

    saveDocx(body, `Mau_03A_BHYT_cong_van_${nam}.docx`);
};

// ============================================================ Mẫu 04/BHYT-QĐ
/** Đơn đề nghị cấp lại, cấp đổi, gia hạn có thay đổi thông tin – mỗi thân nhân 1 trang */
export const exportMau04 = (records: BhytThanNhan[], employees: Employee[]) => {
    if (!records.length) return;
    const empById = new Map(employees.map(e => [e.id, e]));
    const line = (label: string, v: string, o: POpt = {}) => P([label, { t: v, b: !v.startsWith('…') }], { indent: 720, after: 60, ...o });

    const pages = records.map((x, idx) => {
        const emp = empById.get(x.dsnv_id);
        const qn = [emp?.cap_bac || x.dsnv?.cap_bac, emp?.ho_va_ten || x.dsnv?.ho_va_ten].filter(Boolean).join(' ');
        const tu = dateParts(x.sd_tu_ngay), den = dateParts(x.sd_den_ngay);
        const lyDoText = lyDo(x);
        return [
            P({ t: 'Mẫu số: 04/BHYT-QĐ', b: true, i: true, sz: 24 }, { align: 'right', pageBreakBefore: idx > 0 }),
            quocHieu(),
            P({ t: 'ĐƠN ĐỀ NGHỊ', b: true }, { align: 'center', before: 360 }),
            P({ t: 'Cấp lại, cấp đổi, gia hạn có thay đổi thông tin thẻ bảo hiểm y tế', b: true }, { align: 'center', after: 240 }),
            P(`Kính gửi: Thủ trưởng ${DON_VI.benhVien}`, { align: 'center', after: 240 }),
            line('Họ và tên người lao động (quân nhân): ', val(qn)),
            line('Đơn vị hoặc nơi cư trú: ', `${DON_VI.tenThuong} - ${DON_VI.benhVien}`),
            line('Họ tên thân nhân: ', val(x.ho_va_ten ? `${x.ho_va_ten}${x.moi_quan_he ? ` (${x.moi_quan_he})` : ''}` : '')),
            line('Ngày tháng năm sinh: ', val(formatDateVN(x.ngay_sinh))),
            line('Nơi thường trú: ', val(diaChi(x.xa_phuong, x.tinh, x.noi_cu_tru))),
            line('Mã thẻ BHYT (ghi 10 số cuối in trên ô số 4 của thẻ): ', val(x.ma_so_bhyt, '……………')),
            P('Thời hạn sử dụng thẻ:', { indent: 720, after: 60 }),
            P(`Từ ngày ${tu.d} tháng ${tu.m} năm ${tu.y} đến ngày ${den.d} tháng ${den.m} năm ${den.y}`, { indent: 720, after: 60 }),
            line('Lý do đề nghị: ', lyDoText),
            P('……………………………………………………………………………', { indent: 720, after: 60 }),
            P('Đề nghị cơ quan BHXH Quân đội và Thủ trưởng đơn vị cấp lại, cấp đổi, gia hạn có thay đổi thông tin thẻ BHYT để bảo đảm quyền lợi khám, chữa bệnh BHYT theo quy định của pháp luật./.', { align: 'both', indent: 720, before: 120, after: 240 }),
            Table([4600, 4754], [[
                {
                    content: P({ t: 'XÁC NHẬN CỦA THỦ TRƯỞNG ĐƠN VỊ', b: true, sz: 24 }, { align: 'center', before: 280 }) +
                        P({ t: '(ký, ghi rõ họ tên, đóng dấu)', i: true, sz: 24 }, { align: 'center' }),
                    valign: 'top',
                },
                {
                    content: P({ t: `${DON_VI.diaDanh}, ngày …. tháng …. năm ……`, i: true, sz: 26 }, { align: 'center' }) +
                        P({ t: 'NGƯỜI ĐỀ NGHỊ', b: true, sz: 26 }, { align: 'center' }) +
                        P({ t: '(ký, ghi rõ họ tên)', i: true, sz: 26 }, { align: 'center' }) +
                        P('') + P('') + P('') +
                        P({ t: emp?.ho_va_ten || x.dsnv?.ho_va_ten || '', b: true, sz: 26 }, { align: 'center' }),
                    valign: 'top',
                },
            ]], false),
        ].join('');
    });

    const name = records.length === 1 ? fileSafe(records[0].ho_va_ten || '') : `${records.length}_than_nhan`;
    saveDocx(pages.join('') + SECT_A4({ top: 851, right: 851, bottom: 851, left: 1701 }), `Mau_04_BHYT_don_de_nghi_${name}.docx`);
};

// ============================================================ Mẫu 01A/BHYT-QĐ
/**
 * Tờ khai tham gia, điều chỉnh thông tin BHYT (quân nhân, người lao động).
 * Mục VII (cấp mới) → điền phần I; các mục khác → điền phần II (thay đổi thông tin).
 */
export const exportMau01A = (records: BhytCaNhan[], employees: Employee[]) => {
    if (!records.length) return;
    const empById = new Map(employees.map(e => [e.id, e]));
    const f = (label: string, v?: string | null, dots = '……………………………………') => {
        const s = (v || '').trim();
        return [label, s ? { t: s, b: true } : dots] as Run[];
    };
    const L = (runs: Run[], o: POpt = {}) => P(runs, { indent: 567, after: 40, ...o });

    const pages = records.map((x, idx) => {
        const emp = empById.get(x.dsnv_id);
        const fill = (part: 1 | 2) => (effectiveLoai(x) === 'VII') === (part === 1);
        const e = (v?: string | null) => v || '';
        const ten = (emp?.ho_va_ten || x.dsnv?.ho_va_ten || '').toLocaleUpperCase('vi');
        const p1 = fill(1), p2 = fill(2);
        const pick = (on: boolean, v?: string | null) => (on ? e(v) : '');
        const gt = emp?.gioi_tinh || x.dsnv?.gioi_tinh || '';
        return [
            P({ t: 'Mẫu số: 01A/BHYT-QĐ', b: true, i: true, sz: 24 }, { align: 'right', pageBreakBefore: idx > 0 }),
            quocHieu(),
            P({ t: 'TỜ KHAI', b: true }, { align: 'center', before: 240 }),
            P({ t: 'THAM GIA, ĐIỀU CHỈNH THÔNG TIN BHYT', b: true }, { align: 'center' }),
            P({ t: '(dùng cho QN, người lao động tham gia BHXH do BQP quản lý)', i: true }, { align: 'center', after: 160 }),
            P({ t: 'I. Đối với người tham gia chưa được cấp mã số BHXH, BHYT', b: true }, { indent: 567, after: 60 }),
            L(f('[01]. Họ và tên (chữ in hoa): ', pick(p1, ten))),
            L(f('[02]. Mã định danh (số sổ BHXH, số thẻ BHYT-nếu đã được cấp): ', pick(p1, x.ma_so_bhxh), '…………')),
            L([...f('[03]. Ngày, tháng, năm sinh: ', pick(p1, formatDateVN(emp?.ngay_sinh || x.dsnv?.ngay_sinh)), '………………'), '   ', ...f('[04]. Giới tính: ', pick(p1, gt), '……….')]),
            L([...f('[05]. Dân tộc: ', '', '………………………'), '   ', ...f('[06]. Quốc tịch: ', pick(p1, 'Việt Nam'), '……….')]),
            L([...f('[07] Cấp bậc: ', pick(p1, emp?.cap_bac), '………………'), '   ', ...f('[08] Chức vụ: ', pick(p1, emp?.chuc_vu), '………………')]),
            L([...f('[09] Đối tượng: ', pick(p1, emp?.doi_tuong), '………………'), '   ', ...f('[10] Diện quản lý: ', pick(p1, emp?.dien_quan_ly), '………………')]),
            L(f('[11] Nơi cấp giấy khai sinh: ', pick(p1, emp?.que_quan), 'Xã (phường, thị trấn)…………… Tỉnh (thành phố)……………')),
            L(f('[12]. Số CCCD/ĐDCN: ', pick(p1, emp?.cccd || x.dsnv?.cccd))),
            L(f('[13]. Nơi thường trú/tạm trú: ', pick(p1, diaChi(x.xa_phuong, x.tinh, emp?.noi_o_hien_nay)), 'Xã (phường, thị trấn)…………… Tỉnh (thành phố)……………')),
            L([...f('[14]. Tuyển dụng (tháng, năm): ', pick(p1, thangNam(emp?.thang_nam_tuyen_dung)), '…………'), '   ', ...f('Nhập ngũ: ', pick(p1, thangNam(emp?.thang_nam_nhap_ngu)), '…………')]),
            L(['[15]. Tổng mức lương đóng BHXH, BHYT:…..…………….…đồng, trong đó: Hệ số lương:…..  Hệ số PCCV:…… % PCTNN:…… % PCTNVK:…….']),
            L(f('[16]. Nơi đăng ký KCB ban đầu: ', pick(p1, x.noi_kcb))),
            P({ t: 'II. Đối với người đã được cấp mã số BHXH, BHYT thay đổi thông tin trên thẻ BHYT', b: true }, { indent: 567, before: 120, after: 60 }),
            L(f('[01]. Họ và tên (chữ in hoa): ', pick(p2, ten))),
            L(f('[02]. Mã định danh (số sổ BHXH, số thẻ BHYT-nếu đã được cấp): ', pick(p2, x.ma_so_bhxh), '…………')),
            L([...f('[03]. Ngày, tháng, năm sinh: ', pick(p2, formatDateVN(emp?.ngay_sinh || x.dsnv?.ngay_sinh)), '………………'), '   ', ...f('[04]. Giới tính: ', pick(p2, gt), '……….')]),
            L(f('[05]. Số CCCD/ĐDCN: ', pick(p2, emp?.cccd || x.dsnv?.cccd))),
            L(f('[06]. Nội dung thay đổi: ', pick(p2, lyDo(x)))),
            L(f('[07]. Hồ sơ kèm theo: ', '')),
            L(f('[08]. Số điện thoại liên hệ: ', pick(p2, x.so_dien_thoai || emp?.dien_thoai))),
            Table([4600, 4600], [[
                {
                    content: P({ t: 'XÁC NHẬN CỦA THỦ TRƯỞNG ĐƠN VỊ', b: true, sz: 24 }, { align: 'center', before: 280 }) +
                        P({ t: '(Cấp Trung đoàn và tương đương)', i: true, sz: 24 }, { align: 'center' }),
                    valign: 'top',
                },
                {
                    content: P({ t: `${DON_VI.diaDanh}, ngày……tháng…..năm……`, i: true, sz: 24 }, { align: 'center', before: 120 }) +
                        P({ t: 'NGƯỜI KHAI', b: true, sz: 24 }, { align: 'center' }) +
                        P({ t: '(ký, ghi rõ họ, tên)', i: true, sz: 24 }, { align: 'center' }) +
                        P('') + P('') + P('') +
                        P({ t: emp?.ho_va_ten || x.dsnv?.ho_va_ten || '', b: true, sz: 24 }, { align: 'center' }),
                    valign: 'top',
                },
            ]], false),
        ].join('');
    });

    const name = records.length === 1 ? fileSafe(records[0].dsnv?.ho_va_ten || '') : `${records.length}_nguoi`;
    saveDocx(pages.join('') + SECT_A4({ top: 709, right: 1041, bottom: 567, left: 1701 }), `Mau_01A_BHYT_to_khai_${name}.docx`);
};

// ============================================================ Mẫu 01C/BHYT-QĐ
const X: Record<string, CellStyle> = {
    mauSo: { size: 11, bold: true, italic: true, align: 'right' },
    title: { size: 13, bold: true, align: 'center', wrap: true },
    info: { size: 12, align: 'left' },
    th: { size: 11, bold: true, align: 'center', wrap: true, border: 'thin' },
    num: { size: 10, italic: true, align: 'center', border: 'thin' },
    secNo: { size: 11, bold: true, align: 'center', border: 'thin' },
    secTitle: { size: 11, bold: true, align: 'left', wrap: true, border: 'thin' },
    td: { size: 11, align: 'left', wrap: true, border: 'thin' },
    tdC: { size: 11, align: 'center', wrap: true, border: 'thin' },
    camDoan: { size: 11, italic: true, align: 'left', wrap: true, valign: 'top' },
    ngay: { size: 12, italic: true, align: 'center' },
    sign: { size: 12, bold: true, align: 'center' },
};

/**
 * Tờ khai thân nhân hưởng chế độ BHYT – mỗi quân nhân 1 file, gồm các thân nhân đã chọn,
 * xếp vào đúng mục I–VII.
 */
export const exportMau01C = (records: BhytThanNhan[], employees: Employee[], families: Family[], nam: number) => {
    const empById = new Map(employees.map(e => [e.id, e]));
    const famById = new Map(families.filter(f => f.id).map(f => [f.id!, f]));
    const byQn = new Map<number, BhytThanNhan[]>();
    records.forEach(r => byQn.set(r.dsnv_id, [...(byQn.get(r.dsnv_id) || []), r]));

    byQn.forEach((list, dsnvId) => {
        const emp = empById.get(dsnvId);
        const ws = new StyledSheet();
        const last = 12;
        ws.colWidths = [5.3, 10.1, 24.7, 8.1, 14, 11.6, 12.3, 12.6, 15, 14.4, 13.1, 18.7, 13.3];

        ws.merge(0, 9, 0, last, 'Mẫu số: 01C/BHYT-QĐ', X.mauSo);
        ws.merge(1, 0, 1, last, 'TỜ KHAI THÂN NHÂN HƯỞNG CHẾ ĐỘ BẢO HIỂM Y TẾ\n(dùng cho quân nhân, người làm công tác cơ yếu để kê khai cho thân nhân)', X.title);
        ws.rowHeights.set(1, 36);
        ws.merge(2, 2, 2, 7, `Họ và tên quân nhân (người làm CTCY):  ${emp?.ho_va_ten || list[0].dsnv?.ho_va_ten || ''}`, X.info);
        ws.merge(2, 9, 2, last, `Đối tượng: ${emp?.doi_tuong || ''}`, X.info);
        ws.merge(3, 2, 3, 7, `Tháng, năm nhập ngũ (tuyển dụng): ${thangNam(emp?.thang_nam_nhap_ngu || emp?.thang_nam_tuyen_dung)}`, X.info);
        ws.merge(3, 9, 3, last, `Diện quản lý:  ${emp?.dien_quan_ly || ''}`, X.info);
        ws.merge(4, 2, 4, 7, `Cấp bậc (hệ số lương): ${emp?.cap_bac || list[0].dsnv?.cap_bac || ''}`, X.info);
        ws.merge(4, 9, 4, last, `Chức vụ: ${emp?.chuc_vu || list[0].dsnv?.chuc_vu || ''}`, X.info);
        ws.merge(5, 2, 5, last, `Đơn vị (từ đại đội và tương đương trở lên): ${DON_VI.tenThuong} - ${DON_VI.benhVien}`, X.info);

        // Tiêu đề bảng (2 dòng)
        const h = 7;
        const heads: [number, string][] = [[0, 'TT'], [1, 'Quan hệ với người kê khai'], [2, 'Họ và tên'], [3, 'Dân tộc'],
            [8, 'Số ĐDCN/CCCD'], [9, 'Mã số BHXH hoặc thẻ BHYT'], [10, 'Nơi đăng ký KCB ban đầu'], [11, 'Nghề nghiệp'], [12, 'Số điện thoại thân nhân']];
        heads.forEach(([c, t]) => ws.merge(h, c, h + 1, c, t, X.th));
        ws.merge(h, 4, h + 1, 5, 'Nơi cư trú\n(Xã, tỉnh)', X.th);
        ws.merge(h, 6, h, 7, 'Ngày, tháng, \nnăm sinh', X.th);
        ws.set(h + 1, 6, 'Nam', X.th);
        ws.set(h + 1, 7, 'Nữ', X.th);
        ws.rowHeights.set(h, 33);
        ws.rowHeights.set(h + 1, 30);
        ['1', '2', '3', '4', '5', '', '6', '7', '8', '9', '10', '11', '12'].forEach((n, c) => ws.set(h + 2, c, n, X.num));
        ws.merge(h + 2, 4, h + 2, 5, '5', X.num);
        ws.printTitleRows = [h, h + 2];

        let r = h + 3;
        LOAI_DE_NGHI.forEach(loai => {
            ws.set(r, 0, loai, X.secNo);
            const title = loaiDeNghiTitle(loai, nam, 'than_nhan');
            ws.merge(r, 1, r, last, title, X.secTitle);
            ws.rowHeights.set(r, title.length > 150 ? 31.5 : 18);
            r++;
            const rows = list.filter(x => effectiveLoai(x) === loai);
            if (!rows.length) {
                for (let c = 0; c <= last; c++) ws.set(r, c, '', X.td);
                ws.merge(r, 4, r, 5, '', X.td);
                r++;
                return;
            }
            rows.forEach((x, i) => {
                const fam = x.gia_dinh_id ? famById.get(x.gia_dinh_id) : undefined;
                const ns = formatDateVN(x.ngay_sinh) || (fam?.nam_sinh ? String(fam.nam_sinh) : '');
                const v: (string | number)[] = [i + 1, x.moi_quan_he || '', x.ho_va_ten || '', '', diaChi(x.xa_phuong, x.tinh, x.noi_cu_tru), '',
                    isFemale(x.gioi_tinh) ? '' : ns, isFemale(x.gioi_tinh) ? ns : '', x.cccd || '', x.ma_so_bhyt || '', x.noi_kcb || '',
                    fam?.nghe_nghiep || '', x.so_dien_thoai || fam?.so_dien_thoai || ''];
                v.forEach((val, c) => ws.set(r, c, val, [0, 1, 3, 6, 7, 8, 9, 12].includes(c) ? X.tdC : X.td));
                ws.merge(r, 4, r, 5, v[4], X.td);
                r++;
            });
        });

        r++;
        ws.merge(r, 0, r, last, '           Tôi xin cam đoan nội dung kê khai trên là đúng sự thật, nếu sai tôi hoàn toàn chịu trách nhiệm trước pháp luật: Không đề nghị cấp thẻ BHYT đối với TNQN là: người lao động đang hưởng tiền lương, tiền công hằng tháng; người đang hưởng trợ cấp hằng tháng từ ngân sách nhà nước hoặc từ quỹ BHXH; người đang hưởng lương hưu; người có công với cách mạng; cựu chiến binh; trẻ em dưới 6 tuổi; người từ đủ 75 tuổi đang hưởng trợ cấp bảo trợ xã hội hằng tháng; người thuộc hộ nghèo; người dân tộc thiểu số đang sinh sống ở xã vùng có điều kiện kinh tế - xã hội khó khăn; người đang sinh sống tại vùng có điều kiện kinh tế - xã hội đặc biệt khó khăn; người đang sinh sống ở xã đảo, huyện đảo.', X.camDoan);
        ws.rowHeights.set(r, 62);
        r++;
        ws.merge(r, 8, r, last, `${DON_VI.diaDanh}, ngày       tháng      năm ${nam - 1}`, X.ngay);
        r++;
        ws.merge(r, 0, r, 4, 'THỦ TRƯỞNG ĐƠN VỊ', X.sign);
        ws.merge(r, 8, r, last, 'NGƯỜI KÊ KHAI', X.sign);
        r += 5;
        ws.merge(r, 8, r, last, emp?.ho_va_ten || list[0].dsnv?.ho_va_ten || '', X.sign);

        const name = fileSafe(emp?.ho_va_ten || list[0].dsnv?.ho_va_ten || String(dsnvId));
        downloadBytes(writeStyledXlsx(ws, 'Mau 01C'), `Mau_01C_BHYT_to_khai_than_nhan_${name}_${nam}.xlsx`);
    });
};

/** Mẫu cá nhân gợi ý theo mục của bản ghi */
export const mauGoiY = (type: 'ca_nhan' | 'than_nhan', loai: LoaiDeNghi): string | null => {
    if (type === 'ca_nhan') return ['III', 'IV', 'V', 'VII'].includes(loai) ? '01A' : null;
    if (loai === 'VII') return '01C';
    if (['III', 'IV', 'V'].includes(loai)) return '04';
    return null;
};

