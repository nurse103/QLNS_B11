/**
 * Xuất PHIẾU ĐẢNG VIÊN ra file Word (.docx) - khổ A4 dọc, đúng bố cục mẫu:
 *  - Khối đầu phiếu (Đảng bộ / Số lý lịch / Số thẻ đảng viên / Ảnh 3x4)
 *  - Mục 01 -> 20: thông tin cá nhân
 *  - Mục 21: Tóm tắt quá trình hoạt động và công tác (bảng)
 *  - Mục 22: Đào tạo, bồi dưỡng (bảng)
 *  - Mục 23 -> 26: Khen thưởng, Huy hiệu Đảng, danh hiệu, kỷ luật
 *  - Mục 27 -> 28: Đặc điểm lịch sử bản thân, quan hệ với nước ngoài
 *  - Mục 29: Quan hệ gia đình (bảng)
 *  - Mục 30: Hoàn cảnh kinh tế + phần ký xác nhận
 */

import { buildDocx, downloadBlob, escapeXml, fetchImageBytes, DocxImage } from './docxBuilder';
import { HUY_HIEU_DANG_MOC, PartyDossier } from '../services/partyService';

// -------------------------------------------------- Kích thước trang (twips)
const PAGE_W = 11907;   // A4 ngang 21 cm
const PAGE_H = 16839;   // A4 dọc 29,7 cm
const MARGIN = { top: 1304, right: 851, bottom: 1134, left: 1701 };
const CONTENT_W = PAGE_W - MARGIN.left - MARGIN.right; // 9355

const SZ = 25;          // 12,5pt - đúng cỡ chữ của mẫu
const PHOTO_REL_ID = 'rIdPhoto';

// ------------------------------------------------------------ Helper chung
const fmtDate = (value?: string | null) => {
    if (!value) return '';
    const iso = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    return String(value);
};

/** Ngày dạng "..../..../........" khi trống, "12/05/1985" khi có dữ liệu. */
const fmtDateSlot = (value?: string | null) => fmtDate(value) || '...../...../.........';

/** Trường tháng/năm: chấp nhận cả date ISO lẫn chuỗi tự nhập. */
const fmtMonthYear = (value?: string | null) => {
    if (!value) return '';
    const iso = String(value).match(/^(\d{4})-(\d{2})/);
    if (iso) return `${iso[2]}/${iso[1]}`;
    return String(value);
};

const val = (value?: string | number | null) => (value === null || value === undefined ? '' : String(value));

/**
 * Giá trị kèm dấu chấm kéo dài - dùng cho ô nằm giữa dòng để giữ đúng dáng của mẫu
 * (mẫu in sẵn luôn có dòng chấm dù có hay không có dữ liệu).
 */
const dotFill = (value: string | number | null | undefined, width: number) => {
    const v = val(value);
    return v ? v : '.'.repeat(width);
};

interface RunOptions {
    b?: boolean;
    i?: boolean;
    u?: boolean;
    sz?: number;
    caps?: boolean;
}

const rPr = (o: RunOptions) => {
    const parts: string[] = [];
    if (o.b) parts.push('<w:b/><w:bCs/>');
    if (o.i) parts.push('<w:i/><w:iCs/>');
    if (o.caps) parts.push('<w:caps/>');
    const size = o.sz ?? SZ;
    parts.push(`<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>`);
    if (o.u) parts.push('<w:u w:val="single"/>');
    return `<w:rPr>${parts.join('')}</w:rPr>`;
};

const run = (text: string, o: RunOptions = {}) => {
    const body = escapeXml(text)
        .split('\n')
        .map(line => `<w:t xml:space="preserve">${line}</w:t>`)
        .join('<w:br/>');
    return `<w:r>${rPr(o)}${body}</w:r>`;
};

/** Run chỉ chứa ký tự tab (dùng với tab stop có dot leader). */
const tabRun = () => `<w:r>${rPr({})}<w:tab/></w:r>`;

interface ParaOptions {
    align?: 'left' | 'center' | 'right' | 'both';
    indent?: number;
    hanging?: number;
    before?: number;
    after?: number;
    line?: number;
    /** Các điểm dừng tab của đoạn (dùng để chia đôi dòng và kéo dấu chấm). */
    tabStops?: { pos: number; val: 'left' | 'right' | 'center'; dot?: boolean }[];
    pageBreakBefore?: boolean;
    keepNext?: boolean;
}

const para = (content: string, o: ParaOptions = {}) => {
    const pPr: string[] = [];
    if (o.keepNext) pPr.push('<w:keepNext/>');
    if (o.pageBreakBefore) pPr.push('<w:pageBreakBefore/>');
    if (o.tabStops?.length) {
        pPr.push(
            `<w:tabs>${o.tabStops
                .map(t => `<w:tab w:val="${t.val}"${t.dot ? ' w:leader="dot"' : ''} w:pos="${t.pos}"/>`)
                .join('')}</w:tabs>`
        );
    }
    if (o.before || o.after || o.line) {
        pPr.push(
            `<w:spacing w:before="${o.before ?? 0}" w:after="${o.after ?? 0}"` +
            (o.line ? ` w:line="${o.line}" w:lineRule="auto"` : '') + '/>'
        );
    }
    if (o.indent || o.hanging) {
        pPr.push(`<w:ind w:left="${o.indent ?? 0}"${o.hanging ? ` w:hanging="${o.hanging}"` : ''}/>`);
    }
    if (o.align) pPr.push(`<w:jc w:val="${o.align}"/>`);
    return `<w:p>${pPr.length ? `<w:pPr>${pPr.join('')}</w:pPr>` : ''}${content}</w:p>`;
};

const emptyPara = (o: ParaOptions = {}) => para('', o);

/** Điểm chia đôi dòng - ô thông tin thứ hai luôn bắt đầu ở đây cho cân trang. */
const HALF = Math.round(CONTENT_W / 2);

/**
 * Một ô thông tin trên phiếu.
 * `filled` = đã có dữ liệu thật -> KHÔNG kéo dấu chấm nữa.
 */
interface Slot {
    text: string;
    filled: boolean;
}

/** Ô chữ thường. */
const v = (value?: string | number | null): Slot => {
    const t = val(value);
    return { text: t, filled: !!t };
};

/** Ô ngày tháng: trống thì in sẵn khung ngày của mẫu và vẫn kéo chấm tiếp. */
const vDate = (value?: string | null): Slot => {
    const d = fmtDate(value);
    return d ? { text: d, filled: true } : { text: '...../...../.........', filled: false };
};

/** Dòng tự do: có dữ liệu thì thôi kéo chấm, chưa có thì kéo chấm tới lề phải. */
const fieldLine = (content: string, filled: boolean, o: ParaOptions = {}) =>
    filled
        ? para(content, { before: 30, ...o })
        : para(content + tabRun(), {
              before: 30,
              tabStops: [{ pos: CONTENT_W, val: 'right', dot: true }],
              ...o,
          });

/** Dòng chỉ có 1 ô thông tin. */
const line1 = (label: string, slot: Slot, o: ParaOptions = {}) =>
    fieldLine(run(`${label} `) + (slot.text ? run(slot.text) : ''), slot.filled, o);

/**
 * Nhãn nằm riêng một dòng, nội dung xuống dòng dưới.
 * Dùng cho mục có nhãn quá dài (23, 25) để phần trả lời không bị dồn về cuối dòng.
 */
const lineBlock = (label: string, slot: Slot, o: ParaOptions = {}) =>
    para(run(label), { before: 30, ...o }) +
    fieldLine(slot.text ? run(slot.text) : '', slot.filled, { before: 20 }) +
    // Chưa có dữ liệu thì thêm một dòng chấm nữa, đúng như mẫu in sẵn chừa 2 dòng
    (slot.filled ? '' : fieldLine('', false, { before: 20 }));

/** Dòng có 2 ô thông tin - ô thứ hai luôn bắt đầu đúng giữa trang. */
const line2 = (
    label1: string,
    slot1: Slot,
    label2: string,
    slot2: Slot,
    o: ParaOptions & { splitAt?: number; align2Right?: boolean } = {}
) => {
    const { splitAt, align2Right, ...paraOptions } = o;

    // align2Right: mục 1 sát lề trái, mục 2 sát lề phải (hai cột rõ rệt).
    // Dùng một tab căn phải tại lề phải; khoảng giữa hai cột để trống, không kéo chấm.
    if (align2Right) {
        const seg1 = run(`${label1} `) + (slot1.text ? run(slot1.text) : '');
        const seg2 = run(`${label2} `) + (slot2.text ? run(slot2.text) : '');
        return para(seg1 + tabRun() + seg2, {
            before: 30,
            tabStops: [{ pos: CONTENT_W, val: 'right', dot: false }],
            ...paraOptions,
        });
    }

    const stops: NonNullable<ParaOptions['tabStops']> = [
        { pos: splitAt ?? HALF, val: 'left', dot: !slot1.filled },
    ];
    if (!slot2.filled) stops.push({ pos: CONTENT_W, val: 'right', dot: true });

    const seg1 = run(`${label1} `) + (slot1.text ? run(slot1.text) : '');
    const seg2 = run(`${label2} `) + (slot2.text ? run(slot2.text) : '');

    return para(seg1 + tabRun() + seg2 + (slot2.filled ? '' : tabRun()), {
        before: 30,
        tabStops: stops,
        ...paraOptions,
    });
};

// ------------------------------------------------------------------- Bảng
interface Cell {
    /** Nội dung đã là XML paragraph. Nếu dùng `text` thì sẽ tự bọc paragraph. */
    xml?: string;
    text?: string;
    w: number;
    span?: number;
    bold?: boolean;
    italic?: boolean;
    align?: 'left' | 'center' | 'right' | 'both';
    valign?: 'top' | 'center' | 'bottom';
    sz?: number;
    borders?: boolean;
}

const tcBorders = (on: boolean) =>
    on
        ? '<w:tcBorders>' +
          ['top', 'left', 'bottom', 'right']
              .map(s => `<w:${s} w:val="single" w:sz="6" w:space="0" w:color="000000"/>`)
              .join('') +
          '</w:tcBorders>'
        : '';

const cell = (c: Cell) => {
    const pr = [
        `<w:tcW w:w="${c.w}" w:type="dxa"/>`,
        c.span && c.span > 1 ? `<w:gridSpan w:val="${c.span}"/>` : '',
        tcBorders(c.borders !== false),
        `<w:vAlign w:val="${c.valign ?? 'center'}"/>`,
    ].join('');

    const content =
        c.xml ??
        para(c.text ? run(c.text, { b: c.bold, i: c.italic, sz: c.sz }) : '', {
            align: c.align ?? 'left',
            before: 20,
            after: 20,
        });

    return `<w:tc><w:tcPr>${pr}</w:tcPr>${content}</w:tc>`;
};

const row = (cells: (Cell | string)[], opts: { height?: number; header?: boolean } = {}) =>
    '<w:tr>' +
    (opts.height || opts.header
        ? `<w:trPr><w:cantSplit/>${opts.height ? `<w:trHeight w:val="${opts.height}"/>` : ''}${opts.header ? '<w:tblHeader/>' : ''}</w:trPr>`
        : '') +
    cells.map(c => (typeof c === 'string' ? c : cell(c))).join('') +
    '</w:tr>';

const table = (grid: number[], rows: string, withBorders = true) =>
    '<w:tbl><w:tblPr>' +
    `<w:tblW w:w="${grid.reduce((a, b) => a + b, 0)}" w:type="dxa"/>` +
    (withBorders
        ? '<w:tblBorders>' +
          ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
              .map(s => `<w:${s} w:val="single" w:sz="6" w:space="0" w:color="000000"/>`)
              .join('') +
          '</w:tblBorders>'
        : '') +
    '<w:tblLayout w:type="fixed"/></w:tblPr>' +
    `<w:tblGrid>${grid.map(w => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>` +
    rows +
    '</w:tbl>';

// ------------------------------------------------------------------- Ảnh 3x4
const photoXml = (cx: number, cy: number) =>
    `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">` +
    `<wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>` +
    `<wp:docPr id="1" name="Anh3x4"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
    `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic>` +
    `<pic:nvPicPr><pic:cNvPr id="1" name="Anh3x4"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="${PHOTO_REL_ID}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
    `</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;

// --------------------------------------------------------- Khối đầu phiếu
const LEFT_W = 3300;    // cột các cấp uỷ bên trái - đủ cho "ĐẢNG BỘ TỈNH (tương đương):"
const LABEL_W = 2500;   // đủ rộng để "SỐ THẺ ĐẢNG VIÊN:" nằm gọn một dòng
const BOX = 250;        // ô ký tự của số lý lịch / số thẻ
const ORG_SZ = 22;      // 11pt - nhãn cấp uỷ phải gọn 1 dòng trong cột hẹp
const TAIL_W = CONTENT_W - LEFT_W - LABEL_W - BOX * 12;
const PHOTO_W = 1700;   // 3 cm

const buildHeader = (d: PartyDossier, hasPhoto: boolean) => {
    const { employee, profile } = d;

    const charBoxes = (value: string, count: number) => {
        const chars = (value || '').replace(/\s/g, '').slice(0, count).split('');
        return Array.from({ length: count }, (_, i) =>
            cell({ w: BOX, text: chars[i] ?? '', align: 'center', borders: true, sz: 24 })
        );
    };

    /**
     * Khối cấp uỷ: dòng trên là nhãn, dòng dưới là nội dung IN ĐẬM.
     * Chưa có dữ liệu thì cả hai dòng đều là dòng chấm như mẫu in sẵn.
     */
    const orgBlock = (
        label: string,
        value?: string | null,
        opts: { before?: number; dotted?: boolean } = {}
    ) => {
        const { before = 80, dotted = true } = opts;
        const text = val(value);
        const stops: NonNullable<ParaOptions['tabStops']> = [
            { pos: LEFT_W - 200, val: 'right', dot: true },
        ];
        if (text) {
            return (
                para(run(label, { sz: ORG_SZ }), { before }) +
                para(run(text, { b: true, sz: ORG_SZ }), { before: 20 })
            );
        }
        // dotted = false: chỉ in nhãn, không kéo dòng chấm
        if (!dotted) return para(run(label, { sz: ORG_SZ }), { before });
        return (
            para(run(label, { sz: ORG_SZ }) + tabRun(), { before, tabStops: stops }) +
            para(tabRun(), { before: 20, tabStops: stops })
        );
    };

    const numLabel = (text: string) =>
        cell({
            w: LABEL_W,
            borders: false,
            valign: 'center',
            xml: para(run(text, { b: true, sz: ORG_SZ })),
        });

    // --- Bảng trên: quốc hiệu + 2 dòng số hiệu
    const gridTop = [LEFT_W, LABEL_W, ...Array(12).fill(BOX), TAIL_W];
    const topRows: string[] = [];

    topRows.push(
        row([
            cell({
                w: CONTENT_W,
                span: 15,
                borders: false,
                xml:
                    para(run('ĐẢNG CỘNG SẢN VIỆT NAM', { b: true, sz: 28, u: true }), {
                        align: 'center',
                        after: 80,
                    }),
            }),
        ])
    );

    // Số lý lịch: 10 ô, có khoảng hở sau ô thứ 6 đúng như mẫu
    const lyLich = charBoxes(val(profile.so_ly_lich), 10);
    topRows.push(
        row([
            cell({ w: LEFT_W, borders: false, valign: 'top', xml: orgBlock('ĐẢNG BỘ TỈNH (tương đương):', profile.dang_bo_tinh, { before: 40, dotted: false }) }),
            numLabel('SỐ LÝ LỊCH:'),
            ...lyLich.slice(0, 6),
            cell({ w: BOX, borders: false, text: '' }),
            ...lyLich.slice(6),
            cell({ w: BOX + TAIL_W, span: 2, borders: false, text: '' }),
        ])
    );

    topRows.push(
        row([
            cell({ w: LEFT_W, borders: false, valign: 'top', xml: orgBlock('ĐẢNG BỘ XÃ (tương đương):', profile.dang_bo_xa, { dotted: false }) }),
            numLabel('SỐ THẺ ĐẢNG VIÊN:'),
            ...charBoxes(val(employee.so_the_dang), 12),
            cell({ w: TAIL_W, borders: false, text: '' }),
        ])
    );

    // --- Bảng dưới: 3 cấp uỷ còn lại + tiêu đề + ảnh 3x4
    const gridBottom = [LEFT_W, CONTENT_W - LEFT_W - PHOTO_W, PHOTO_W];

    const leftBlock =
        orgBlock('ĐẢNG BỘ CƠ SỞ:', profile.dang_bo_chi_bo_co_so) +
        orgBlock('ĐẢNG BỘ BỘ PHẬN:', profile.dang_bo_bo_phan) +
        orgBlock('CHI BỘ:', profile.chi_bo);

    const titleBlock =
        para(run('PHIẾU', { b: true, sz: 40 }), { align: 'center', before: 200 }) +
        para(run('ĐẢNG VIÊN', { b: true, sz: 40 }), { align: 'center', before: 40 });

    const photoBlock = hasPhoto
        ? para(photoXml(972000, 1296000), { align: 'center' })
        : emptyPara({ after: 200 }) +
          para(run('Ảnh', { sz: 22 }), { align: 'center' }) +
          para(run('(3 x 4)', { sz: 22 }), { align: 'center' });

    const bottomRow = row(
        [
            cell({ w: gridBottom[0], borders: false, valign: 'top', xml: leftBlock }),
            cell({ w: gridBottom[1], borders: false, valign: 'center', xml: titleBlock }),
            // Đã chèn ảnh thì bỏ khung viền đen, tránh viền đôi quanh ảnh.
            // Chưa có ảnh thì vẫn giữ khung để biết chỗ dán ảnh 3x4.
            cell({ w: gridBottom[2], borders: !hasPhoto, valign: 'center', xml: photoBlock }),
        ],
        { height: 2400 }
    );

    return table(gridTop, topRows.join(''), false) + table(gridBottom, bottomRow, false);
};

// ------------------------------------------------- Mục 01 -> 20 (thông tin)
const buildPersonalInfo = (d: PartyDossier) => {
    const { employee: e, profile: p } = d;
    const parts: string[] = [];

    parts.push(line2('01) Họ và tên khai sinh:', v(val(e.ho_va_ten).toUpperCase()), '02) Giới tính (nam, nữ):', v(e.gioi_tinh), { before: 160, align2Right: true }));
    parts.push(line2('03) Tên gọi khác:', v(p.ten_goi_khac), '04) Sinh ngày:', vDate(e.ngay_sinh), { align2Right: true }));
    parts.push(line1('05) Nơi đăng ký khai sinh:', v(p.noi_dang_ky_khai_sinh)));
    parts.push(line1('06) Quê quán:', v(e.que_quan)));
    parts.push(line1('07) Nơi thường trú:', v(e.noi_o_hien_nay)));
    parts.push(line1('       Nơi tạm trú:', v(p.noi_tam_tru)));
    parts.push(line2('08) Dân tộc:', v(p.dan_toc), '09) Tôn giáo:', v(p.ton_giao)));
    parts.push(line2('10) Thành phần gia đình:', v(p.thanh_phan_gia_dinh), '11) Nghề nghiệp hiện nay:', v(val(p.nghe_nghiep_hien_nay) || val(e.chuc_vu))));

    parts.push(line2('12) Ngày vào Đảng:', vDate(e.ngay_vao_dang), 'Tại Chi bộ:', v(p.chi_bo_ket_nap)));
    parts.push(line2('       Người giới thiệu thứ 1:', v(p.nguoi_gioi_thieu_1), 'Chức vụ, đơn vị:', v(p.chuc_vu_nguoi_gt_1)));
    parts.push(line2('       Người giới thiệu thứ 2:', v(p.nguoi_gioi_thieu_2), 'Chức vụ, đơn vị:', v(p.chuc_vu_nguoi_gt_2)));
    parts.push(line1('       Ngày cấp có thẩm quyền ra quyết định kết nạp:', vDate(p.ngay_qd_ket_nap)));
    parts.push(line2('       Ngày chính thức:', vDate(e.ngay_chinh_thuc), 'Tại Chi bộ:', v(p.chi_bo_chinh_thuc)));

    parts.push(line2('13) Ngày được tuyển dụng:', vDate(e.thang_nam_tuyen_dung), 'Cơ quan tuyển dụng:', v(p.co_quan_tuyen_dung)));
    parts.push(line1('14) Ngày vào Đoàn TNCS Hồ Chí Minh:', vDate(p.ngay_vao_doan)));
    parts.push(line1('15) Tham gia các tổ chức xã hội khác:', v(p.to_chuc_xa_hoi_khac)));
    parts.push(line2('16) Ngày nhập ngũ:', vDate(e.thang_nam_nhap_ngu), 'Ngày xuất ngũ, chuyển ngành:', vDate(p.ngay_xuat_ngu)));

    parts.push(para(run('17) Trình độ hiện nay:'), { before: 30 }));
    parts.push(line1('       - Giáo dục phổ thông:', v(p.giao_duc_pho_thong)));
    parts.push(line1('       - Chuyên môn, nghiệp vụ:', v(p.chuyen_mon_nghiep_vu)));
    parts.push(line2('       - Học vị cao nhất:', v(p.hoc_vi), '- Học hàm cao nhất:', v(p.hoc_ham)));
    parts.push(line2('       - Lý luận chính trị:', v(p.ly_luan_chinh_tri), '- Ngoại ngữ:', v(p.ngoai_ngu)));
    parts.push(line1('       - Tin học:', v(p.tin_hoc)));

    parts.push(line2('18) Tình trạng sức khoẻ:', v(p.tinh_trang_suc_khoe), '- Thương binh loại:', v(p.thuong_binh_loai)));
    parts.push(line2('       - Gia đình liệt sỹ:', v(p.gia_dinh_liet_sy), '- Gia đình có công với CM:', v(p.gia_dinh_co_cong)));
    // Nhãn mục 20 dài nên chia sớm hơn nửa trang, nếu không phần ngày sẽ tràn xuống dòng
    parts.push(line2('19) Số căn cước:', v(e.cccd), '20) Miễn công tác và SHĐ ngày:', vDate(p.ngay_mien_cong_tac_shd), { splitAt: 3600 }));

    return parts.join('');
};

// ------------------------------------- Mục 21: quá trình hoạt động, công tác
const buildWorkHistory = (d: PartyDossier) => {
    const grid = [2555, 6800];
    const rows: string[] = [];

    rows.push(
        row(
            [
                cell({ w: grid[0], align: 'center', bold: true, sz: 24, xml:
                    para(run('Từ tháng, năm', { b: true, sz: 24 }), { align: 'center', before: 30 }) +
                    para(run('đến tháng, năm', { b: true, sz: 24 }), { align: 'center', after: 30 }) }),
                cell({ w: grid[1], xml:
                    para(run('Làm gì, chức vụ, đơn vị công tác', { b: true, sz: 24 }), { align: 'center', before: 30 }) +
                    para(run('(Đảng, chính quyền, đoàn thể, kinh tế, văn hoá, xã hội...)', { i: true, sz: 22 }), { align: 'center', after: 30 }) }),
            ],
            { header: true }
        )
    );

    const items = d.workHistory;
    // Phần "Làm gì" ở đầu cột lấy theo chức vụ đảng đã kê khai; nếu bỏ trống mà
    // là đảng viên thì mặc định "Đảng viên".
    const joinDate = val(d.employee.ngay_vao_dang);
    const isPartyMember = !!(d.employee.ngay_vao_dang || d.employee.so_the_dang);
    const declaredPartyRole = val(d.profile.chuc_vu_dang) || 'Đảng viên';
    // Chức vụ đảng chỉ xuất ở giai đoạn khớp với thời điểm đã vào Đảng: dòng nào
    // kết thúc trước ngày vào Đảng (chưa là đảng viên) thì bỏ qua. Nếu chỉ có số
    // thẻ đảng mà không có ngày vào Đảng thì không lọc theo mốc thời gian.
    const partyRoleFor = (item: PartyDossier['workHistory'][number]): string => {
        // Ưu tiên chức vụ đảng đã kê khai riêng cho giai đoạn công tác này.
        const perPeriod = val(item.chuc_vu_dang);
        if (perPeriod) return perPeriod;
        // Nếu chưa kê khai: tự suy ra cho giai đoạn đã là đảng viên.
        if (!isPartyMember) return '';
        if (joinDate) {
            const end = val(item.den_thang_nam);
            if (end && end < joinDate) return '';
        }
        return declaredPartyRole;
    };
    // Chỉ in đúng số dòng có dữ liệu, không chèn thêm dòng trống.
    // Giữ tối thiểu 1 dòng để bảng không trơ mỗi hàng tiêu đề khi chưa có dữ liệu.
    const total = Math.max(items.length, 1);
    for (let i = 0; i < total; i++) {
        const item = items[i];
        const period = item
            ? `${fmtMonthYear(item.tu_thang_nam) || '.......'} - ${fmtMonthYear(item.den_thang_nam) || 'nay'}`
            : '';
        // Cột "Làm gì, chức vụ, đơn vị công tác": tách các thành phần bằng dấu chấm
        // phẩy để không lẫn với dấu phẩy vốn có trong tên đơn vị công tác.
        // VD: "Bí thư chi bộ; Điều dưỡng viên; Khoa Hồi sức ngoại, Bệnh viện Quân y 103"
        const detail = item
            ? [partyRoleFor(item), item.chuc_vu, item.don_vi_cong_tac].filter(Boolean).join('; ')
            : '';
        rows.push(
            row([
                cell({ w: grid[0], text: period, align: 'center' }),
                cell({ w: grid[1], text: detail }),
            ], { height: 420 })
        );
    }

    return (
        para(run('21) TÓM TẮT QUÁ TRÌNH HOẠT ĐỘNG VÀ CÔNG TÁC', { b: true }), {
            align: 'center',
            before: 240,
            after: 80,
            keepNext: true,
        }) + table(grid, rows.join(''))
    );
};

// ------------------------------------------- Mục 22: đào tạo, bồi dưỡng
const buildTraining = (d: PartyDossier) => {
    const grid = [2300, 2300, 1700, 1300, 1755];
    const headers = [
        'Tên trường',
        'Ngành học hoặc tên lớp học',
        'Từ tháng/năm\nđến tháng/năm',
        'Hình thức học',
        'Văn bằng, chứng chỉ,\ntrình độ gì',
    ];

    const rows: string[] = [];
    rows.push(
        row(
            headers.map((h, i) => ({
                w: grid[i],
                xml: h
                    .split('\n')
                    .map(line => para(run(line, { b: true, sz: 23 }), { align: 'center', before: 25, after: 25 }))
                    .join(''),
            })),
            { header: true }
        )
    );

    const items = d.training;
    // Chỉ in đúng số dòng có dữ liệu, không chèn thêm dòng trống.
    // Giữ tối thiểu 1 dòng để bảng không trơ mỗi hàng tiêu đề khi chưa có dữ liệu.
    const total = Math.max(items.length, 1);
    for (let i = 0; i < total; i++) {
        const t = items[i];
        rows.push(
            row([
                { w: grid[0], text: t ? val(t.ten_co_so_dao_tao) : '', sz: 23 },
                { w: grid[1], text: t ? val(t.nganh_dao_tao) : '', sz: 23 },
                {
                    w: grid[2],
                    text: t ? `${fmtMonthYear(t.tu_thang_nam) || '.......'} - ${fmtMonthYear(t.den_thang_nam) || 'nay'}` : '',
                    align: 'center',
                    sz: 23,
                },
                { w: grid[3], text: t ? val(t.hinh_thuc_dao_tao) : '', align: 'center', sz: 23 },
                { w: grid[4], text: t ? [t.trinh_do_dao_tao, t.xep_loai_tot_nghiep, t.ghi_chu].filter(Boolean).join(' - ') : '', sz: 23 },
            ], { height: 340 })
        );
    }

    return (
        para(run('22) ĐÀO TẠO, BỒI DƯỠNG VỀ CHUYÊN MÔN, NGHIỆP VỤ, LÝ LUẬN CHÍNH TRỊ, NGOẠI NGỮ', { b: true }), {
            align: 'center',
            before: 240,
            after: 80,
            keepNext: true,
        }) + table(grid, rows.join(''))
    );
};

// --------------------------------------------------- Mục 23 -> 26
const buildAwards = (d: PartyDossier) => {
    const p = d.profile;
    const selected = new Set(p.huy_hieu_dang ?? []);
    const parts: string[] = [];

    parts.push(lineBlock('23) Khen thưởng (Huân chương, huy chương, bằng khen):', v(p.khen_thuong), { before: 200 }));

    const marks = HUY_HIEU_DANG_MOC.map(y => `${selected.has(y) ? '\u2612' : '\u2610'} ${y} năm`);
    parts.push(
        para(run('24) Đã được tặng HH Đảng:  ') + run(marks.slice(0, 6).join('  '), { sz: 23 }), {
            before: 60,
            indent: 2100,
            hanging: 2100,
        })
    );
    parts.push(para(run(marks.slice(6).join('  '), { sz: 23 }), { before: 30, indent: 2100 }));

    parts.push(
        lineBlock(
            '25) Danh hiệu được phong (chiến sĩ thi đua; anh hùng "LL vũ trang, lao động"; nhà giáo, nghệ sĩ, thầy thuốc "nhân dân, ưu tú"):',
            v(p.danh_hieu_duoc_phong),
            { before: 80 }
        )
    );
    parts.push(line1('26) Kỷ luật (Đảng, chính quyền, pháp luật):', v(p.ky_luat)));

    return parts.join('');
};

// --------------------------------------------------- Mục 27 -> 28
const buildHistory = (d: PartyDossier) => {
    const p = d.profile;
    const parts: string[] = [];

    parts.push(
        para(run('27) ĐẶC ĐIỂM LỊCH SỬ BẢN THÂN', { b: true }), {
            align: 'center',
            before: 240,
            after: 60,
            keepNext: true,
        })
    );
    parts.push(para(run('a) Bị khai trừ hoặc xóa tên trong danh sách đảng viên hoặc xin ra khỏi Đảng:'), { before: 30 }));
    parts.push(line2('       Thời gian:', v(p.ls_khai_tru_thoi_gian), 'Tại Chi bộ:', v(p.ls_khai_tru_chi_bo)));
    parts.push(para(run('b) Được kết nạp lại vào Đảng:'), { before: 30 }));
    parts.push(line2('       - Ngày vào Đảng lần thứ 2:', vDate(p.ngay_vao_dang_lan_2), 'Tại chi bộ:', v(p.chi_bo_ket_nap_lan_2)));
    parts.push(line2('       Người giới thiệu 1:', v(p.nguoi_gioi_thieu_1_lan_2), 'Chức vụ, đơn vị:', v(p.chuc_vu_nguoi_gt_1_lan_2)));
    parts.push(line2('       Người giới thiệu 2:', v(p.nguoi_gioi_thieu_2_lan_2), 'Chức vụ, đơn vị:', v(p.chuc_vu_nguoi_gt_2_lan_2)));
    parts.push(line2('       - Ngày chính thức lần thứ 2:', vDate(p.ngay_chinh_thuc_lan_2), 'Tại chi bộ:', v(p.chi_bo_chinh_thuc_lan_2)));
    parts.push(line2('c) Ngày được khôi phục đảng tịch:', vDate(p.ngay_khoi_phuc_dang_tich), 'Tại chi bộ:', v(p.chi_bo_khoi_phuc)));
    parts.push(line1('d) Bị xử lý theo pháp luật (ngày, tháng, năm; chính quyền nào xử lý; hình thức xử lý, nơi thi hành án...):', v(p.bi_xu_ly_phap_luat)));
    parts.push(line1('e) Bản thân có làm việc trong chế độ cũ (ngày, tháng, năm; chức vụ; nơi làm việc...):', v(p.lam_viec_che_do_cu)));

    parts.push(para(run('28) QUAN HỆ VỚI NƯỚC NGOÀI', { b: true }), { align: 'center', before: 240, after: 60, keepNext: true }));
    parts.push(line1('a) Đã đi nước ngoài (nước nào, lý do, thời gian ra nước ngoài...):', v(p.da_di_nuoc_ngoai)));
    parts.push(line1('b) Tham gia hoặc có quan hệ với các tổ chức chính trị, kinh tế, xã hội nào ở nước ngoài:', v(p.quan_he_to_chuc_nuoc_ngoai)));
    parts.push(line1('c) Có người thân ở nước ngoài (tên người, quan hệ gì, ở nước nào ?):', v(p.nguoi_than_nuoc_ngoai)));

    return parts.join('');
};

// --------------------------------------------------- Mục 29: quan hệ gia đình
const buildFamily = (d: PartyDossier) => {
    const grid = [1400, 2600, 900, 4455];
    const rows: string[] = [];

    rows.push(
        row(
            [
                cell({ w: grid[0], text: 'Quan hệ', bold: true, align: 'center', sz: 23 }),
                cell({ w: grid[1], text: 'HỌ VÀ TÊN', bold: true, align: 'center', sz: 23 }),
                cell({ w: grid[2], xml:
                    para(run('Năm', { b: true, sz: 23 }), { align: 'center', before: 25 }) +
                    para(run('sinh', { b: true, sz: 23 }), { align: 'center', after: 25 }) }),
                cell({ w: grid[3], xml:
                    para(run('Quê quán, nơi ở hiện nay (trong, ngoài nước),', { b: true, sz: 23 }), { align: 'center', before: 25 }) +
                    para(run('nghề nghiệp, chức danh, chức vụ, đơn vị công tác', { b: true, sz: 23 }), { align: 'center', after: 25 }) }),
            ],
            { header: true }
        )
    );

    const items = d.family;
    // Chỉ in đúng số dòng có dữ liệu, không chèn thêm dòng trống.
    // Giữ tối thiểu 1 dòng để bảng không trơ mỗi hàng tiêu đề khi chưa có dữ liệu.
    const total = Math.max(items.length, 1);
    for (let i = 0; i < total; i++) {
        const f = items[i];
        // Đúng thứ tự cột của mẫu: quê quán, nơi ở hiện nay, nghề nghiệp,
        // chức danh/chức vụ/đơn vị công tác.
        // Ngăn cách bằng dấu ';' vì bản thân mỗi giá trị đã chứa dấu phẩy
        // ("Hát Môn, Hà Nội"), dùng dấu phẩy sẽ không đọc ra được ranh giới.
        const detail = f
            ? [f.que_quan, f.noi_o_hien_nay, f.nghe_nghiep, f.chuc_vu_don_vi, f.ghi_chu]
                  .filter(Boolean)
                  .join('; ')
            : '';
        rows.push(
            row([
                { w: grid[0], text: f ? val(f.moi_quan_he) : '', sz: 23 },
                { w: grid[1], text: f ? val(f.ho_va_ten) : '', sz: 23 },
                { w: grid[2], text: f ? val(f.nam_sinh) : '', align: 'center', sz: 23 },
                { w: grid[3], text: detail, sz: 23 },
            ], { height: 340 })
        );
    }

    return (
        para(run('29) QUAN HỆ GIA ĐÌNH', { b: true }), {
            align: 'center',
            before: 240,
            after: 20,
            keepNext: true,
        }) +
        para(run('Cha, mẹ đẻ; cha, mẹ vợ (chồng); vợ (chồng); các con; anh chị em ruột', { i: true, sz: 23 }), {
            align: 'center',
            after: 60,
            keepNext: true,
        }) +
        table(grid, rows.join(''))
    );
};

// --------------------------------- Mục 30 + phần ký xác nhận
const buildEconomyAndSign = (d: PartyDossier) => {
    const p = d.profile;
    const parts: string[] = [];

    parts.push(
        para(run('30) HOÀN CẢNH KINH TẾ CỦA BẢN THÂN VÀ GIA ĐÌNH', { b: true }), {
            align: 'center',
            before: 240,
            after: 60,
            keepNext: true,
        })
    );
    parts.push(
        fieldLine(
            run(`- Tổng thu nhập của hộ gia đình (trong 1 năm): ${dotFill(p.tong_thu_nhap, 16)} đồng, bình quân 1 người/hộ: ${dotFill(p.binh_quan_dau_nguoi, 14)} đồng`),
            true
        )
    );
    parts.push(
        fieldLine(
            run(`- Nhà ở: + Được cấp, được thuê, loại nhà ${dotFill(p.nha_duoc_cap_loai, 14)}, tổng diện tích sử dụng ${dotFill(p.nha_duoc_cap_dien_tich, 8)} m2`),
            true
        )
    );
    parts.push(
        fieldLine(
            run(`             + Nhà tự mua, tự xây, loại nhà ${dotFill(p.nha_tu_mua_loai, 14)}, tổng diện tích sử dụng ${dotFill(p.nha_tu_mua_dien_tich, 8)} m2`),
            true
        )
    );
    parts.push(
        fieldLine(run(`- Đất ở: + Đất được cấp: ${dotFill(p.dat_duoc_cap, 12)} m2   + Đất tự mua: ${dotFill(p.dat_tu_mua, 12)} m2`), true)
    );
    parts.push(line1('- Hoạt động kinh tế:', v(p.hoat_dong_kinh_te)));
    parts.push(
        fieldLine(
            run(`   Diện tích đất kinh doanh trang trại ${dotFill(p.dien_tich_trang_trai, 10)} ha. Số lao động thuê mướn ${dotFill(p.so_lao_dong_thue, 8)} người`),
            true
        )
    );
    parts.push(
        fieldLine(
            run(`   Những tài sản có giá trị (50 triệu đồng trở lên): Tài sản: ${dotFill(p.tai_san_gia_tri, 20)} Giá trị: ${dotFill(p.gia_tri_tai_san, 12)} đồng`),
            true
        )
    );

    // Khối ký: NGƯỜI KHAI | XÁC NHẬN CỦA CHI UỶ CHI BỘ
    const signDate = p.ngay_khai
        ? (() => {
              const m = String(p.ngay_khai).match(/^(\d{4})-(\d{2})-(\d{2})/);
              return m ? `ngày ${m[3]} tháng ${m[2]} năm ${m[1]}` : 'ngày ...... tháng ...... năm 20......';
          })()
        : 'ngày ...... tháng ...... năm 20......';
    const place = val(p.noi_khai) || '.....................';

    const grid = [4677, 4678];
    const signRow = row(
        [
            {
                w: grid[0],
                borders: false,
                valign: 'top',
                xml:
                    para(run(`${place}, ${signDate}`, { i: true }), { align: 'center', before: 200 }) +
                    para(run('NGƯỜI KHAI', { b: true }), { align: 'center', before: 60 }) +
                    para(run('Tôi xin cam đoan những lời khai trên đây là đúng sự thật', { i: true, sz: 22 }), { align: 'center' }) +
                    para(run('(Ký, ghi rõ họ tên)', { i: true, sz: 22 }), { align: 'center' }) +
                    emptyPara() + emptyPara() + emptyPara() +
                    para(run(val(d.employee.ho_va_ten).toUpperCase(), { b: true }), { align: 'center' }),
            },
            {
                w: grid[1],
                borders: false,
                valign: 'top',
                xml:
                    para(run('XÁC NHẬN CỦA CHI UỶ CHI BỘ', { b: true }), { align: 'center', before: 200 }) +
                    para(run('(Chức vụ, ký, ghi rõ họ tên)', { i: true, sz: 22 }), { align: 'center' }) +
                    emptyPara() + emptyPara() + emptyPara() + emptyPara(),
            },
        ],
        { height: 2200 }
    );

    parts.push(table(grid, signRow, false));
    parts.push(
        para(run('XÁC NHẬN CỦA CẤP UỶ CƠ SỞ', { b: true }), { align: 'center', before: 240 })
    );
    parts.push(
        para(run('(Chức vụ, ký, đóng dấu, ghi rõ họ và tên)', { i: true, sz: 22 }), { align: 'center' })
    );

    return parts.join('');
};

// ----------------------------------------------------------------- Sect
const sectPr = () =>
    `<w:sectPr><w:pgSz w:w="${PAGE_W}" w:h="${PAGE_H}" w:code="9"/>` +
    `<w:pgMar w:top="${MARGIN.top}" w:right="${MARGIN.right}" w:bottom="${MARGIN.bottom}" w:left="${MARGIN.left}" w:header="720" w:footer="720" w:gutter="0"/>` +
    `<w:cols w:space="720"/><w:docGrid w:linePitch="360"/></w:sectPr>`;

// ------------------------------------------------------------------ Public
const slugify = (name: string) =>
    name
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

/** Dựng Blob .docx của phiếu đảng viên. */
export const buildPartyCardDocx = async (dossier: PartyDossier): Promise<Blob> => {
    const images: DocxImage[] = [];
    const avatar = dossier.employee.avatar;
    if (avatar) {
        const image = await fetchImageBytes(avatar);
        if (image) {
            images.push({
                fileName: `photo.${image.extension === 'jpeg' ? 'jpeg' : image.extension}`,
                extension: image.extension,
                data: image.data,
                relId: PHOTO_REL_ID,
            });
        }
    }

    const body =
        buildHeader(dossier, images.length > 0) +
        buildPersonalInfo(dossier) +
        buildWorkHistory(dossier) +
        buildTraining(dossier) +
        buildAwards(dossier) +
        buildHistory(dossier) +
        buildFamily(dossier) +
        buildEconomyAndSign(dossier) +
        sectPr();

    return buildDocx({ body, images, defaultHalfPointSize: SZ });
};

/** Dựng và tải phiếu đảng viên về máy. */
export const exportPartyCard = async (dossier: PartyDossier) => {
    const blob = await buildPartyCardDocx(dossier);
    downloadBlob(blob, `Phieu_dang_vien_${slugify(dossier.employee.ho_va_ten || 'dang_vien')}.docx`);
};
