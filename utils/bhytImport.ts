import * as XLSX from 'xlsx';
import { BhytCaNhan, BhytThanNhan, LOAI_DE_NGHI, LoaiDeNghi, MANUAL_LOAI, autoLoai } from '../services/bhytService';
import { Employee } from '../services/personnelService';

/** Chuẩn hóa tên để so khớp: NFC, bỏ khoảng trắng thừa, chữ thường */
export const normName = (s: any) =>
    String(s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();

const str = (v: any): string | null => {
    if (v === null || v === undefined) return null;
    const s = String(v).replace(/\s+/g, ' ').trim();
    return s === '' ? null : s;
};

/** Ô ngày trong Excel: số serial, "dd/mm/yyyy", "dd.mm.yyyy", "dd-mm-yyyy" hoặc "yyyy-mm-dd".
 *  Chỉ có năm (VD 1960) → trả về { year } để ghi vào ghi chú, không tự bịa ngày. */
const parseDate = (v: any): { date: string | null; year?: string } => {
    if (v === null || v === undefined || v === '') return { date: null };
    const pad = (n: number) => String(n).padStart(2, '0');
    if (typeof v === 'number') {
        if (v >= 1900 && v <= 2100 && Number.isInteger(v)) return { date: null, year: String(v) };
        const d = XLSX.SSF.parse_date_code(v);
        if (d && d.y) return { date: `${d.y}-${pad(d.m)}-${pad(d.d)}` };
        return { date: null };
    }
    const s = String(v).trim();
    let m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
    if (m) return { date: `${m[3]}-${pad(+m[2])}-${pad(+m[1])}` };
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return { date: `${m[1]}-${pad(+m[2])}-${pad(+m[3])}` };
    if (/^\d{4}$/.test(s)) return { date: null, year: s };
    return { date: null };
};

/** Giữ dạng chữ cho mã số/CCCD (Excel hay lưu thành số và mất số 0 đầu) */
const code = (v: any, len?: number): string | null => {
    if (v === null || v === undefined || v === '') return null;
    let s = typeof v === 'number' ? String(Math.round(v)) : String(v).trim();
    if (len && /^\d+$/.test(s) && s.length < len) s = s.padStart(len, '0');
    return s || null;
};

/** SĐT lưu dạng số trong Excel mất số 0 đầu (912345678 → 0912345678) */
/** CCCD 12 số lưu dạng số mất số 0 đầu (001064012345 → 1064012345). CMND cũ 9 số giữ nguyên. */
const cccd = (v: any): string | null => {
    const s = code(v);
    return s && /^\d{10,11}$/.test(s) ? s.padStart(12, '0') : s;
};

const phone = (v: any): string | null => {
    const s = code(v);
    return s && /^[1-9]\d{8}$/.test(s) ? '0' + s : s;
};

export interface ImportResult<T> {
    type: 'ca_nhan' | 'than_nhan';
    nam: number;
    /** true: file là danh sách phẳng (không chia mục I–VII) */
    flat: boolean;
    records: T[];
    /** Tên quân nhân trong file không tìm thấy trong danh sách nhân viên */
    unmatched: string[];
}

const findEmployee = (employees: Employee[], name: any, ngaySinh?: string | null) => {
    const key = normName(name);
    if (!key) return undefined;
    const list = employees.filter(e => normName(e.ho_va_ten) === key);
    if (list.length <= 1) return list[0];
    return list.find(e => ngaySinh && e.ngay_sinh === ngaySinh) || list[0];
};

const readRows = async (file: File) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, raw: true, defval: '' });
    // File Excel tiếng Việt hay lưu chữ dạng tổ hợp (A + dấu rời) → chuẩn hóa NFC
    return rows.map(r => r.map(c => typeof c === 'string' ? c.normalize('NFC') : c));
};

const rowText = (r: any[]) => r.map(c => String(c)).join(' ').replace(/\s+/g, ' ');

/** Nhận biết mẫu, năm, dòng tiêu đề cột và cột "Ghi chú" */
const detect = (rows: any[][], fileName: string) => {
    const top = rows.slice(0, 15);
    const head = top.map(rowText).join('\n');
    let type: 'ca_nhan' | 'than_nhan' | null = null;
    if (/04a/i.test(head) || /THÂN NHÂN/i.test(head)) type = 'than_nhan';
    if (/04b/i.test(head) || /CCQP|VCQP|LĐHĐ/i.test(head)) type = 'ca_nhan';

    // Dòng tiêu đề cột: dòng có "Họ và tên" gần cuối nhất trong phần đầu
    let headerRow = -1;
    top.forEach((r, i) => { if (r.some(c => normName(c) === 'họ và tên')) headerRow = i; });
    if (!type && headerRow >= 0) {
        type = rows[headerRow].some(c => normName(c) === 'quan hệ') ? 'than_nhan' : 'ca_nhan';
    }
    const ghiChuCol = headerRow >= 0 ? rows[headerRow].findIndex(c => normName(c) === 'ghi chú') : -1;

    // Năm: dòng tiêu đề "DANH SÁCH … NĂM 2027" → tên file "..._2027.xlsx"
    const titleLine = top.map(rowText).find(l => /DANH SÁCH/i.test(l) && /NĂM\s+\d{4}/i.test(l));
    const y = titleLine?.match(/NĂM\s+(\d{4})/i) || fileName.match(/(20\d{2})/);
    return { type, nam: y ? Number(y[1]) : null, headerRow, ghiChuCol };
};

/**
 * Duyệt các dòng dữ liệu.
 *  - Mẫu chính thức: có dòng tiêu đề mục I..VII → gắn mục theo dòng đó.
 *  - Danh sách phẳng: không có mục → mọi dòng sau dòng tiêu đề cột có tên.
 */
const eachDataRow = (
    rows: any[][], headerRow: number, nameCol: number,
    cb: (row: any[], loai: LoaiDeNghi | null) => void,
) => {
    const isSection = (r: any[]) =>
        (LOAI_DE_NGHI as readonly string[]).includes(String(r[0] ?? '').trim().toUpperCase()) && !!String(r[1] ?? '').trim();
    const hasSections = rows.some(isSection);
    let loai: LoaiDeNghi | null = null;
    for (let i = Math.max(headerRow + 1, 0); i < rows.length; i++) {
        const row = rows[i];
        const a = String(row[0] ?? '').trim();
        if (/NGƯỜI LẬP BIỂU/i.test(rowText(row))) break;
        if (isSection(row)) { loai = a.toUpperCase() as LoaiDeNghi; continue; }
        if (/^\(\d+\)$/.test(a)) continue; // dòng đánh số cột (1) (2) ...
        if (!str(row[nameCol]) || normName(row[nameCol]) === 'không') continue;
        if (hasSections && !loai) continue;
        cb(row, hasSections ? loai : null);
    }
    return hasSections;
};

/** Mục: III–VI theo file (chỉ có ở mẫu chính thức); còn lại tự xếp theo hạn sử dụng */
const pickLoai = (fromFile: LoaiDeNghi | null, sdDen: string | null, nam: number): LoaiDeNghi =>
    fromFile && MANUAL_LOAI.includes(fromFile) ? fromFile : autoLoai(sdDen, nam);

export const parseBhytFile = async (
    file: File,
    expected: 'ca_nhan' | 'than_nhan',
    employees: Employee[],
    fallbackNam: number,
): Promise<ImportResult<BhytCaNhan> | ImportResult<BhytThanNhan>> => {
    const rows = await readRows(file);
    const { type, nam: namInFile, headerRow, ghiChuCol } = detect(rows, file.name || '');
    if (type && type !== expected) {
        throw new Error(expected === 'ca_nhan'
            ? 'File này là danh sách thân nhân (Mẫu 04a). Hãy chuyển sang thẻ "BHYT thân nhân" để nhập.'
            : 'File này là danh sách cá nhân (Mẫu 04b). Hãy chuyển sang thẻ "BHYT cá nhân" để nhập.');
    }
    const nam = namInFile || fallbackNam;
    const unmatched = new Set<string>();
    const note = (r: any[], extra?: string | null) =>
        [ghiChuCol >= 0 ? str(r[ghiChuCol]) : null, extra].filter(Boolean).join('; ') || null;

    if (expected === 'ca_nhan') {
        // A TT | B Họ tên | C Cấp bậc | D Mã BHXH | E CCCD | F Ngày sinh | G Nữ | H Xã | I Tỉnh | J Nơi KCB | K SĐT | L Từ | M Đến
        const records: BhytCaNhan[] = [];
        const flat = !eachDataRow(rows, headerRow, 1, (r, loai) => {
            const ns = parseDate(r[5]).date;
            const emp = findEmployee(employees, r[1], ns);
            if (!emp) { unmatched.add(str(r[1])!); return; }
            const den = parseDate(r[12]).date;
            records.push({
                dsnv_id: emp.id, nam, loai_de_nghi: pickLoai(loai, den, nam),
                ma_so_bhxh: code(r[3], 10),
                xa_phuong: str(r[7]), tinh: str(r[8]), noi_kcb: str(r[9]),
                so_dien_thoai: phone(r[10]),
                sd_tu_ngay: parseDate(r[11]).date, sd_den_ngay: den,
                ghi_chu: note(r),
            });
        });
        return { type: 'ca_nhan', nam, flat, records, unmatched: [...unmatched] };
    }

    // A TT | B QN họ tên | C CB | D Quan hệ | E Họ tên | F CCCD | G Mã số | H Ngày sinh | I Nữ | J Xã | K Tỉnh | L Nơi KCB | M SĐT | N Từ | O Đến | (Ghi chú)
    const records: BhytThanNhan[] = [];
    let currentQn: any = '';
    let lastLoai: LoaiDeNghi | null | undefined;
    const flat = !eachDataRow(rows, headerRow, 4, (r, loai) => {
        if (loai !== lastLoai) { currentQn = ''; lastLoai = loai; }
        if (str(r[1])) currentQn = r[1]; // mẫu chính thức chỉ ghi tên quân nhân ở dòng đầu nhóm
        const emp = findEmployee(employees, currentQn);
        if (!emp) {
            unmatched.add(str(currentQn) || `(không rõ quân nhân) – ${str(r[4])}`);
            return;
        }
        const ns = parseDate(r[7]);
        const den = parseDate(r[14]).date;
        records.push({
            dsnv_id: emp.id, nam, loai_de_nghi: pickLoai(loai, den, nam),
            moi_quan_he: str(r[3]) || 'Khác',
            ho_va_ten: str(r[4])!,
            cccd: cccd(r[5]),
            ma_so_bhyt: code(r[6], 10),
            ngay_sinh: ns.date,
            gioi_tinh: /x/i.test(String(r[8] ?? '')) ? 'Nữ' : 'Nam',
            xa_phuong: str(r[9]), tinh: str(r[10]), noi_kcb: str(r[11]),
            so_dien_thoai: phone(r[12]),
            sd_tu_ngay: parseDate(r[13]).date, sd_den_ngay: den,
            ghi_chu: note(r, ns.year ? `Năm sinh: ${ns.year}` : null),
        });
    });
    return { type: 'than_nhan', nam, flat, records, unmatched: [...unmatched] };
};
