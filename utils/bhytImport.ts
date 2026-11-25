import * as XLSX from 'xlsx';
import { BhytCaNhan, BhytThanNhan, LOAI_DE_NGHI, LoaiDeNghi } from '../services/bhytService';
import { Employee } from '../services/personnelService';

/** Chuẩn hóa tên để so khớp: NFC, bỏ khoảng trắng thừa, chữ thường */
export const normName = (s: any) =>
    String(s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();

const str = (v: any): string | null => {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
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

/** Giữ dạng chữ cho mã số/CCCD/SĐT (Excel hay lưu thành số và mất số 0 đầu) */
const code = (v: any, len?: number): string | null => {
    if (v === null || v === undefined || v === '') return null;
    let s = typeof v === 'number' ? String(Math.round(v)) : String(v).trim();
    if (len && /^\d+$/.test(s) && s.length < len) s = s.padStart(len, '0');
    return s || null;
};

/** SĐT lưu dạng số trong Excel mất số 0 đầu (912345678 → 0912345678) */
const phone = (v: any): string | null => {
    const s = code(v);
    return s && /^[1-9]\d{8}$/.test(s) ? '0' + s : s;
};

export interface ImportResult<T> {
    type: 'ca_nhan' | 'than_nhan';
    nam: number | null;
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

/** Nhận biết mẫu và năm từ phần tiêu đề */
const detect = (rows: any[][]) => {
    const head = rows.slice(0, 15).map(r => r.map(c => String(c)).join(' ')).join('\n');
    let type: 'ca_nhan' | 'than_nhan' | null = null;
    if (/04a/i.test(head) || /THÂN NHÂN/i.test(head)) type = 'than_nhan';
    if (/04b/i.test(head) || /CCQP|VCQP|LĐHĐ/i.test(head)) type = 'ca_nhan';
    // Năm lấy ở dòng tiêu đề "…ĐỀ NGHỊ CẤP THẺ BHYT … NĂM 2027", không lấy dòng "Hà Nội, ngày … năm 2026"
    const titleLine = rows.slice(0, 15)
        .map(r => r.map(c => String(c)).join(' ').replace(/\s+/g, ' '))
        .find(l => /DANH SÁCH/i.test(l) && /NĂM\s+\d{4}/i.test(l));
    const y = titleLine?.match(/NĂM\s+(\d{4})/i);
    return { type, nam: y ? Number(y[1]) : null };
};

/** Duyệt các dòng dữ liệu, gắn mục I..VII theo dòng tiêu đề mục gần nhất */
const eachDataRow = (rows: any[][], cb: (row: any[], loai: LoaiDeNghi) => void) => {
    let loai: LoaiDeNghi | null = null;
    for (const row of rows) {
        const a = String(row[0] ?? '').trim();
        const b = String(row[1] ?? '').trim();
        if (/NGƯỜI LẬP BIỂU/i.test(b) || /NGƯỜI LẬP BIỂU/i.test(a)) break;
        if ((LOAI_DE_NGHI as readonly string[]).includes(a.toUpperCase()) && b) {
            loai = a.toUpperCase() as LoaiDeNghi;
            continue;
        }
        if (loai && /^\d+$/.test(a)) cb(row, loai);
    }
};

export const parseBhytFile = async (
    file: File,
    expected: 'ca_nhan' | 'than_nhan',
    employees: Employee[],
    fallbackNam: number,
): Promise<ImportResult<BhytCaNhan> | ImportResult<BhytThanNhan>> => {
    const rows = await readRows(file);
    const { type, nam: namInFile } = detect(rows);
    if (type && type !== expected) {
        throw new Error(expected === 'ca_nhan'
            ? 'File này là Mẫu 04a (thân nhân). Hãy chuyển sang thẻ "BHYT thân nhân" để nhập.'
            : 'File này là Mẫu 04b (cá nhân). Hãy chuyển sang thẻ "BHYT cá nhân" để nhập.');
    }
    const nam = namInFile || fallbackNam;
    const unmatched = new Set<string>();

    if (expected === 'ca_nhan') {
        // A TT | B Họ tên | C Cấp bậc | D Mã BHXH | E CCCD | F Ngày sinh | G Nữ | H Xã | I Tỉnh | J Nơi KCB | K SĐT | L Từ | M Đến
        const records: BhytCaNhan[] = [];
        eachDataRow(rows, (r, loai) => {
            if (!str(r[1])) return;
            const ns = parseDate(r[5]).date;
            const emp = findEmployee(employees, r[1], ns);
            if (!emp) { unmatched.add(String(r[1]).trim()); return; }
            records.push({
                dsnv_id: emp.id, nam, loai_de_nghi: loai,
                ma_so_bhxh: code(r[3], 10),
                xa_phuong: str(r[7]), tinh: str(r[8]), noi_kcb: str(r[9]),
                so_dien_thoai: phone(r[10]),
                sd_tu_ngay: parseDate(r[11]).date, sd_den_ngay: parseDate(r[12]).date,
            });
        });
        return { type: 'ca_nhan', nam, records, unmatched: [...unmatched] };
    }

    // A TT | B QN họ tên | C CB | D Quan hệ | E Họ tên | F CCCD | G Mã số | H Ngày sinh | I Nữ | J Xã | K Tỉnh | L Nơi KCB | M SĐT | N Từ | O Đến
    const records: BhytThanNhan[] = [];
    let currentQn: any = '';
    let lastLoai: LoaiDeNghi | null = null;
    eachDataRow(rows, (r, loai) => {
        if (loai !== lastLoai) { currentQn = ''; lastLoai = loai; }
        if (str(r[1])) currentQn = r[1]; // tên quân nhân chỉ ghi ở dòng đầu nhóm
        if (!str(r[4])) return;
        const emp = findEmployee(employees, currentQn);
        if (!emp) { if (str(currentQn)) unmatched.add(String(currentQn).trim()); else unmatched.add(`(không rõ quân nhân) – ${String(r[4]).trim()}`); return; }
        const ns = parseDate(r[7]);
        records.push({
            dsnv_id: emp.id, nam, loai_de_nghi: loai,
            moi_quan_he: str(r[3]) || 'Khác',
            ho_va_ten: String(r[4]).normalize('NFC').trim(),
            cccd: code(r[5]),
            ma_so_bhyt: code(r[6]),
            ngay_sinh: ns.date,
            gioi_tinh: /x/i.test(String(r[8] ?? '')) ? 'Nữ' : 'Nam',
            xa_phuong: str(r[9]), tinh: str(r[10]), noi_kcb: str(r[11]),
            so_dien_thoai: phone(r[12]),
            sd_tu_ngay: parseDate(r[13]).date, sd_den_ngay: parseDate(r[14]).date,
            ghi_chu: ns.year ? `Năm sinh: ${ns.year}` : null,
        });
    });
    return { type: 'than_nhan', nam, records, unmatched: [...unmatched] };
};
