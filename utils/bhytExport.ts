import { BhytCaNhan, BhytThanNhan, LOAI_DE_NGHI, LoaiDeNghi, effectiveLoai, loaiDeNghiTitle } from '../services/bhytService';
import { CellStyle, StyledSheet, downloadBytes, writeStyledXlsx } from './xlsxWriter';

export const formatDateVN = (d?: string | null) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    if (!y || !m || !day) return d;
    return `${day.slice(0, 2)}/${m}/${y}`;
};

const isFemale = (g?: string | null) => (g || '').trim().toLowerCase() === 'nữ';

// ===== Định dạng theo mẫu gốc (Times New Roman) =====
const S = {
    mauSo: { size: 11, bold: true, italic: true, align: 'right' } as CellStyle,
    donVi: { size: 14, align: 'center' } as CellStyle,
    donViB: { size: 14, bold: true, align: 'center' } as CellStyle,
    quocHieu: { size: 13, bold: true, align: 'center' } as CellStyle,
    ngay: { size: 12, italic: true, align: 'center' } as CellStyle,
    title: { size: 14, bold: true, align: 'center', wrap: true } as CellStyle,
    th: { size: 11, bold: true, align: 'center', wrap: true, border: 'thin' } as CellStyle,
    num: { size: 11, align: 'center', border: 'thin' } as CellStyle,
    secNo: { size: 11, bold: true, align: 'center', border: 'thin' } as CellStyle,
    secTitle: { size: 11, bold: true, align: 'left', wrap: true, border: 'thin' } as CellStyle,
    khong: { size: 11, align: 'left', border: 'thin' } as CellStyle,
    td: { size: 11, align: 'left', wrap: true, border: 'row' } as CellStyle,
    tdC: { size: 11, align: 'center', wrap: true, border: 'row' } as CellStyle,
    sign: { size: 14, bold: true, align: 'center' } as CellStyle,
};

type Layout = {
    nCols: number;
    mauSo: string;
    /** cột bắt đầu/kết thúc của khối quốc hiệu, ngày tháng, chữ ký thủ trưởng */
    rightFrom: number; rightTo: number;
    mauSoFrom: number;
    titleRow: number;
    headerRow: number; // dòng đầu của 2 dòng tiêu đề bảng
    leftSign: [number, number];
    /** cột bắt đầu khối chữ ký "THỦ TRƯỞNG ĐƠN VỊ" */
    signFrom: number;
    widths: number[];
    titleHeight: number;
};

/** Phần chung: đầu trang, tiêu đề, các mục I–VII, chữ ký */
const buildDoc = (
    L: Layout,
    nam: number,
    title: string,
    drawHeader: (ws: StyledSheet, r: number) => void,
    colNumbers: string[],
    sections: { loai: LoaiDeNghi; title: string; rows: { v: (string | number)[]; center: number[] }[] }[],
) => {
    const ws = new StyledSheet();
    const last = L.nCols - 1;
    ws.colWidths = L.widths;

    ws.merge(0, L.mauSoFrom, 0, last, L.mauSo, S.mauSo);
    ws.merge(1, 0, 1, 3, 'HỌC VIỆN QUÂN Y', S.donVi);
    ws.merge(1, L.rightFrom, 1, L.rightTo, 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', S.quocHieu);
    ws.merge(2, 0, 2, 3, 'PHÒNG……….', S.donViB);
    ws.merge(2, L.rightFrom, 2, L.rightTo, 'Độc lập - Tự do - Hạnh phúc', S.quocHieu);
    ws.merge(4, L.rightFrom, 4, L.rightTo, `Hà Nội, ngày      tháng      năm ${nam - 1}`, S.ngay);
    ws.merge(L.titleRow, 0, L.titleRow, last, title, S.title);
    [1, 2, 3].forEach(r => ws.rowHeights.set(r, 18.75));
    ws.rowHeights.set(L.titleRow, L.titleHeight);

    drawHeader(ws, L.headerRow);
    ws.printTitleRows = [L.headerRow, L.headerRow + 2];
    let r = L.headerRow + 2;
    colNumbers.forEach((n, c) => ws.set(r, c, n, S.num));
    r++;

    sections.forEach(sec => {
        ws.set(r, 0, sec.loai, S.secNo);
        ws.merge(r, 1, r, last, sec.title, S.secTitle);
        ws.rowHeights.set(r, sec.title.length > 165 ? 31.5 : 18);
        r++;
        if (sec.rows.length === 0) {
            ws.set(r, 0, '', S.khong);
            ws.merge(r, 1, r, last, 'Không', S.khong);
            r++;
        } else {
            sec.rows.forEach(row => {
                row.v.forEach((v, c) => ws.set(r, c, v, row.center.includes(c) ? S.tdC : S.td));
                r++;
            });
        }
    });

    r++;
    ws.merge(r, L.leftSign[0], r, L.leftSign[1], 'NGƯỜI LẬP BIỂU', S.sign);
    ws.merge(r, L.signFrom, r, last, 'THỦ TRƯỞNG ĐƠN VỊ', S.sign);
    return ws;
};

const sortByQn = <T extends { dsnv?: { ho_va_ten?: string } ; id?: number; dsnv_id: number }>(a: T, b: T) =>
    (a.dsnv?.ho_va_ten || '').localeCompare(b.dsnv?.ho_va_ten || '', 'vi') || a.dsnv_id - b.dsnv_id || (a.id || 0) - (b.id || 0);

/** Mẫu 04b/BHYT-QĐ: thẻ BHYT quân nhân, CCQP, VCQP, LĐHĐ */
export const exportMau04b = (records: BhytCaNhan[], nam: number) => {
    const center = [0, 2, 3, 4, 5, 6, 10, 11, 12];
    const sections = LOAI_DE_NGHI.map(loai => ({
        loai,
        title: loaiDeNghiTitle(loai, nam, 'ca_nhan'),
        rows: records.filter(x => effectiveLoai(x) === loai).sort(sortByQn).map((x, i) => ({
            center,
            v: [
                i + 1,
                x.dsnv?.ho_va_ten || '',
                x.dsnv?.cap_bac || '',
                x.ma_so_bhxh || '',
                x.dsnv?.cccd || '',
                formatDateVN(x.dsnv?.ngay_sinh),
                isFemale(x.dsnv?.gioi_tinh) ? 'X' : '',
                x.xa_phuong || '',
                x.tinh || '',
                x.noi_kcb || '',
                x.so_dien_thoai || x.dsnv?.dien_thoai || '',
                formatDateVN(x.sd_tu_ngay),
                formatDateVN(x.sd_den_ngay),
            ],
        })),
    }));

    const ws = buildDoc(
        { nCols: 13, mauSo: 'Mẫu số: 04b/BHYT-QĐ', mauSoFrom: 8, rightFrom: 5, rightTo: 12, titleRow: 6, headerRow: 8,
          leftSign: [1, 5], signFrom: 8, widths: [6, 22.1, 10, 15.1, 15, 12, 7, 18, 14.3, 19.9, 13, 11.5, 11.5], titleHeight: 65.25 },
        nam,
        `DANH SÁCH THẺ BHYT ĐƠN VỊ QUẢN LÝ \nVÀ ĐỀ NGHỊ CẤP THẺ BHYT QUÂN NHÂN, CCQP, VCQP, LĐHĐ NĂM ${nam}`,
        (w, r) => {
            const heads = ['TT', 'Họ và tên', 'Cấp bậc', 'Mã số BHXH\n(10 số cuối thẻ BHYT)', 'Số CCCD', 'Ngày, tháng, năm sinh', 'Nữ (X)', 'Xã', 'Tỉnh', 'Nơi KCB ban đầu', 'Số điện thoại'];
            heads.forEach((h, c) => w.merge(r, c, r + 1, c, h, S.th));
            w.merge(r, 11, r, 12, 'Giá trị sử dụng \ncủa thẻ BHYT đã cấp', S.th);
            w.set(r + 1, 11, 'Từ', S.th);
            w.set(r + 1, 12, 'Đến', S.th);
            w.rowHeights.set(r, 33);
            w.rowHeights.set(r + 1, 24);
        },
        ['(1)', '(2)', '(3)', '(4)', '', '(5)', '(6)', '(7)', '(9)', '(10)', '', '(11)', '(12)'],
        sections,
    );
    downloadBytes(writeStyledXlsx(ws, 'Mau 04b'), `Mau_04b_BHYT_ca_nhan_${nam}.xlsx`);
};

/** Mẫu 04a/BHYT-QĐ: thẻ BHYT thân nhân quân nhân */
export const exportMau04a = (records: BhytThanNhan[], nam: number) => {
    const center = [0, 2, 3, 5, 6, 7, 8, 12, 13, 14];
    const sections = LOAI_DE_NGHI.map(loai => {
        let lastQn: number | null = null;
        return {
            loai,
            title: loaiDeNghiTitle(loai, nam, 'than_nhan'),
            rows: records.filter(x => effectiveLoai(x) === loai).sort(sortByQn).map((x, i) => {
                // Tên quân nhân chỉ ghi ở dòng đầu của nhóm thân nhân
                const showQn = x.dsnv_id !== lastQn;
                lastQn = x.dsnv_id;
                return {
                    center,
                    v: [
                        i + 1,
                        showQn ? x.dsnv?.ho_va_ten || '' : '',
                        showQn ? x.dsnv?.cap_bac || '' : '',
                        x.moi_quan_he || '',
                        x.ho_va_ten || '',
                        x.cccd || '',
                        x.ma_so_bhyt || '',
                        formatDateVN(x.ngay_sinh),
                        isFemale(x.gioi_tinh) ? 'X' : '',
                        x.xa_phuong || '',
                        x.tinh || '',
                        x.noi_kcb || '',
                        x.so_dien_thoai || '',
                        formatDateVN(x.sd_tu_ngay),
                        formatDateVN(x.sd_den_ngay),
                    ],
                };
            }),
        };
    });

    const ws = buildDoc(
        { nCols: 15, mauSo: 'Mẫu số: 04a/BHYT-QĐ', mauSoFrom: 10, rightFrom: 8, rightTo: 13, titleRow: 5, headerRow: 7,
          leftSign: [1, 4], signFrom: 10, widths: [5.3, 20, 8, 9, 22.1, 15, 12.5, 12, 6.1, 18, 14, 13, 12, 11.5, 11.5], titleHeight: 52.5 },
        nam,
        `DANH SÁCH THẺ BHYT ĐƠN VỊ QUẢN LÝ \nVÀ ĐỀ NGHỊ CẤP THẺ BHYT THÂN NHÂN QUÂN NHÂN NĂM ${nam}`,
        (w, r) => {
            w.merge(r, 0, r + 1, 0, 'TT', S.th);
            w.merge(r, 1, r, 2, 'Quân nhân', S.th);
            w.merge(r, 3, r, 10, 'Thân nhân', S.th);
            w.merge(r, 11, r + 1, 11, 'Nơi đăng \nký KCB', S.th);
            w.merge(r, 12, r + 1, 12, 'Số điện thoại', S.th);
            w.merge(r, 13, r, 14, 'Giá trị sử dụng của thẻ BHYT đã cấp', S.th);
            ['Họ và tên', 'CB', 'Quan hệ', 'Họ và tên', 'Số CCCD/Số định danh cá nhân', 'Mã số', 'Ngày, tháng, năm sinh', 'Nữ(X)', 'Xã/Phường', 'Tỉnh']
                .forEach((h, i) => w.set(r + 1, i + 1, h, S.th));
            w.set(r + 1, 13, 'Từ', S.th);
            w.set(r + 1, 14, 'Đến', S.th);
            w.rowHeights.set(r, 31.5);
            w.rowHeights.set(r + 1, 42.75);
        },
        ['(1)', '(2)', '(3)', '(4)', '(5)', '(6)', '(7)', '(8)', '(9)', '(11)', '(12)', '(13)', '(14)', '(15)', '(16)'],
        sections,
    );
    downloadBytes(writeStyledXlsx(ws, 'Mau 04a'), `Mau_04a_BHYT_than_nhan_${nam}.xlsx`);
};
