import * as XLSX from 'xlsx';
import { BhytCaNhan, BhytThanNhan, LOAI_DE_NGHI, loaiDeNghiTitle } from '../services/bhytService';

export const formatDateVN = (d?: string | null) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    if (!y || !m || !day) return d;
    return `${day.slice(0, 2)}/${m}/${y}`;
};

const isFemale = (g?: string | null) => (g || '').trim().toLowerCase() === 'nữ';

type Row = (string | number)[];

const buildSheet = (
    nCols: number,
    mauSo: string,
    title: string,
    nam: number,
    headerRows: Row[],
    headerMerges: XLSX.Range[],
    colNumbers: Row,
    sections: { title: string; rows: Row[] }[],
    colWidths: number[],
    // vị trí cột ký tên bên phải (0-based)
    rightSignCol: number,
) => {
    const last = nCols - 1;
    const aoa: Row[] = [];
    const merges: XLSX.Range[] = [];
    const m = (r1: number, c1: number, r2: number, c2: number) => merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
    const empty = () => new Array(nCols).fill('');

    // Dòng 1: Mẫu số
    let r = empty(); r[rightSignCol] = mauSo; aoa.push(r); m(0, rightSignCol, 0, last);
    // Dòng 2-3: đơn vị / quốc hiệu
    r = empty(); r[0] = 'HỌC VIỆN QUÂN Y'; r[rightSignCol - 1] = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'; aoa.push(r);
    m(1, 0, 1, 3); m(1, rightSignCol - 1, 1, last);
    r = empty(); r[0] = 'PHÒNG……….'; r[rightSignCol - 1] = 'Độc lập - Tự do - Hạnh phúc'; aoa.push(r);
    m(2, 0, 2, 3); m(2, rightSignCol - 1, 2, last);
    aoa.push(empty());
    r = empty(); r[rightSignCol - 1] = `Hà Nội, ngày      tháng      năm ${nam - 1}`; aoa.push(r);
    m(4, rightSignCol - 1, 4, last);
    // Tiêu đề
    r = empty(); r[0] = title; aoa.push(r); m(5, 0, 5, last);
    aoa.push(empty());

    // Header bảng
    const headerStart = aoa.length;
    headerRows.forEach(h => aoa.push(h));
    headerMerges.forEach(hm => merges.push({ s: { r: hm.s.r + headerStart, c: hm.s.c }, e: { r: hm.e.r + headerStart, c: hm.e.c } }));
    aoa.push(colNumbers);

    // Các mục I..VII
    sections.forEach((sec, i) => {
        r = empty(); r[0] = LOAI_DE_NGHI[i]; r[1] = sec.title; aoa.push(r);
        m(aoa.length - 1, 1, aoa.length - 1, last);
        if (sec.rows.length === 0) {
            r = empty(); r[1] = 'Không'; aoa.push(r);
        } else {
            sec.rows.forEach(row => aoa.push(row));
        }
    });

    // Ký tên
    aoa.push(empty());
    r = empty(); r[1] = 'NGƯỜI LẬP BIỂU'; r[rightSignCol] = 'THỦ TRƯỞNG ĐƠN VỊ'; aoa.push(r);
    m(aoa.length - 1, 1, aoa.length - 1, 4); m(aoa.length - 1, rightSignCol, aoa.length - 1, last);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!merges'] = merges;
    ws['!cols'] = colWidths.map(wch => ({ wch }));
    return ws;
};

const download = (ws: XLSX.WorkSheet, fileName: string) => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, fileName);
};

/** Mẫu 04b/BHYT-QĐ: thẻ BHYT quân nhân, CCQP, VCQP, LĐHĐ */
export const exportMau04b = (records: BhytCaNhan[], nam: number) => {
    const sections = LOAI_DE_NGHI.map(loai => {
        const list = records
            .filter(x => x.loai_de_nghi === loai)
            .sort((a, b) => (a.dsnv?.ho_va_ten || '').localeCompare(b.dsnv?.ho_va_ten || '', 'vi'));
        return {
            title: loaiDeNghiTitle(loai, nam, 'ca_nhan'),
            rows: list.map((x, i) => [
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
            ] as Row),
        };
    });

    const h1: Row = ['TT', 'Họ và tên', 'Cấp bậc', 'Mã số BHXH\n(10 số cuối thẻ BHYT)', 'Số CCCD', 'Ngày, tháng, năm sinh', 'Nữ (X)', 'Xã', 'Tỉnh', 'Nơi KCB ban đầu', 'Số điện thoại', 'Giá trị sử dụng \ncủa thẻ BHYT đã cấp', ''];
    const h2: Row = ['', '', '', '', '', '', '', '', '', '', '', 'Từ', 'Đến'];
    const headerMerges: XLSX.Range[] = [];
    for (let c = 0; c <= 10; c++) headerMerges.push({ s: { r: 0, c }, e: { r: 1, c } });
    headerMerges.push({ s: { r: 0, c: 11 }, e: { r: 0, c: 12 } });
    const nums: Row = ['(1)', '(2)', '(3)', '(4)', '(5)', '(6)', '(7)', '(8)', '(9)', '(10)', '(11)', '(12)', '(13)'];

    const ws = buildSheet(
        13, 'Mẫu số: 04b/BHYT-QĐ',
        `DANH SÁCH THẺ BHYT ĐƠN VỊ QUẢN LÝ \nVÀ ĐỀ NGHỊ CẤP THẺ BHYT QUÂN NHÂN, CCQP, VCQP, LĐHĐ NĂM ${nam}`,
        nam, [h1, h2], headerMerges, nums, sections,
        [5, 24, 10, 16, 15, 12, 6, 16, 12, 22, 13, 11, 11],
        8,
    );
    download(ws, `Mau_04b_BHYT_ca_nhan_${nam}.xlsx`);
};

/** Mẫu 04a/BHYT-QĐ: thẻ BHYT thân nhân quân nhân */
export const exportMau04a = (records: BhytThanNhan[], nam: number) => {
    const sections = LOAI_DE_NGHI.map(loai => {
        const list = records
            .filter(x => x.loai_de_nghi === loai)
            .sort((a, b) =>
                (a.dsnv?.ho_va_ten || '').localeCompare(b.dsnv?.ho_va_ten || '', 'vi') || (a.id || 0) - (b.id || 0));
        let lastQn: number | null = null;
        return {
            title: loaiDeNghiTitle(loai, nam, 'than_nhan'),
            rows: list.map((x, i) => {
                // Chỉ ghi tên quân nhân ở dòng thân nhân đầu tiên của người đó
                const showQn = x.dsnv_id !== lastQn;
                lastQn = x.dsnv_id;
                return [
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
                ] as Row;
            }),
        };
    });

    const h1: Row = ['TT', 'Quân nhân', '', 'Thân nhân', '', '', '', '', '', '', '', 'Nơi đăng \nký KCB', 'Số điện thoại', 'Giá trị sử dụng của thẻ BHYT đã cấp', ''];
    const h2: Row = ['', 'Họ và tên', 'CB', 'Quan hệ', 'Họ và tên', 'Số CCCD/Số định danh cá nhân', 'Mã số', 'Ngày, tháng, năm sinh', 'Nữ(X)', 'Xã/Phường', 'Tỉnh', '', '', 'Từ', 'Đến'];
    const headerMerges: XLSX.Range[] = [
        { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
        { s: { r: 0, c: 1 }, e: { r: 0, c: 2 } },
        { s: { r: 0, c: 3 }, e: { r: 0, c: 10 } },
        { s: { r: 0, c: 11 }, e: { r: 1, c: 11 } },
        { s: { r: 0, c: 12 }, e: { r: 1, c: 12 } },
        { s: { r: 0, c: 13 }, e: { r: 0, c: 14 } },
    ];
    const nums: Row = ['(1)', '(2)', '(3)', '(4)', '(5)', '(6)', '(7)', '(8)', '(9)', '(10)', '(11)', '(12)', '(13)', '(14)', '(15)'];

    const ws = buildSheet(
        15, 'Mẫu số: 04a/BHYT-QĐ',
        `DANH SÁCH THẺ BHYT ĐƠN VỊ QUẢN LÝ \nVÀ ĐỀ NGHỊ CẤP THẺ BHYT THÂN NHÂN QUÂN NHÂN NĂM ${nam}`,
        nam, [h1, h2], headerMerges, nums, sections,
        [5, 22, 8, 9, 22, 16, 14, 12, 6, 16, 12, 22, 13, 11, 11],
        10,
    );
    download(ws, `Mau_04a_BHYT_than_nhan_${nam}.xlsx`);
};
