import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { X, Upload, Eye, Save, FileSpreadsheet, ArrowLeft } from 'lucide-react';
import {
    DutySchedule, getDutySchedulesRange, createDutySchedule, updateDutySchedule,
} from '../services/dutyScheduleService';

/**
 * Nhập lịch trực từ file "BANG PHAN TRUC" (sheet PHÂN TRỰC):
 *   cột B = ngày trực, R = Bác sỹ, O = Sau ĐH, T = Điều dưỡng, N = Phụ ĐD.
 * Người dùng chọn khoảng ngày → xem trước → xác nhận mới lưu.
 */
const COL = { ngay: 1, phuDD: 13, sauDH: 14, bacSy: 17, dieuDuong: 19 } as const; // B, N, O, R, T

interface Row {
    ngay_truc: string;
    bac_sy: string;
    sau_dai_hoc: string;
    dieu_duong: string;
    phu_dieu_duong: string;
}
type Status = 'new' | 'update' | 'same';
interface PreviewRow extends Row { status: Status; existing?: DutySchedule }

const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const todayISO = () => { const t = new Date(); return toISO(t.getFullYear(), t.getMonth() + 1, t.getDate()); };
const fmtVN = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
const THU = ['CN', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy'];
const thuOf = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return THU[new Date(y, m - 1, d).getDay()]; };

/** Ô ngày: số serial Excel, Date, hoặc chuỗi d/m/y */
const parseDate = (v: unknown): string | null => {
    if (v == null || v === '') return null;
    if (typeof v === 'number') {
        const p = XLSX.SSF.parse_date_code(v);
        return p && p.y > 1900 ? toISO(p.y, p.m, p.d) : null;
    }
    if (v instanceof Date && !isNaN(v.getTime())) return toISO(v.getFullYear(), v.getMonth() + 1, v.getDate());
    const s = String(v).trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return toISO(+m[1], +m[2], +m[3]);
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) { const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return toISO(y, +m[2], +m[1]); }
    return null;
};

/** "Nam, , Việt, " → "Nam, Việt" */
const cleanList = (v: unknown) => String(v ?? '').split(',').map(s => s.trim()).filter(Boolean).join(', ');
const same = (a?: string | null, b?: string | null) => cleanList(a) === cleanList(b);

interface Props {
    onClose: () => void;
    onSaved: () => void;
}

export const DutyRosterImport: React.FC<Props> = ({ onClose, onSaved }) => {
    const [fileName, setFileName] = useState('');
    const [sheetName, setSheetName] = useState('');
    const [fileRows, setFileRows] = useState<Row[]>([]);
    const [from, setFrom] = useState(todayISO());
    const [to, setTo] = useState('');
    const [preview, setPreview] = useState<PreviewRow[] | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const fileRange = useMemo(() => fileRows.length
        ? { min: fileRows[0].ngay_truc, max: fileRows[fileRows.length - 1].ngay_truc } : null, [fileRows]);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setError(''); setPreview(null);
        try {
            const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
            const name = wb.SheetNames.find(n => n.normalize('NFC').trim().toUpperCase() === 'PHÂN TRỰC') || wb.SheetNames[0];
            const data = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[name], { header: 1, defval: '', raw: true });
            const rows: Row[] = [];
            const seen = new Set<string>();
            for (const r of data) {
                const ngay = parseDate(r[COL.ngay]);
                if (!ngay || seen.has(ngay)) continue;
                seen.add(ngay);
                rows.push({
                    ngay_truc: ngay,
                    bac_sy: cleanList(r[COL.bacSy]),
                    sau_dai_hoc: cleanList(r[COL.sauDH]),
                    dieu_duong: cleanList(r[COL.dieuDuong]),
                    phu_dieu_duong: cleanList(r[COL.phuDD]),
                });
            }
            rows.sort((a, b) => a.ngay_truc.localeCompare(b.ngay_truc));
            if (!rows.length) throw new Error(`Không tìm thấy ngày trực ở cột B của sheet "${name}".`);
            setFileName(file.name);
            setSheetName(name);
            setFileRows(rows);
            const t = todayISO();
            const start = t >= rows[0].ngay_truc && t <= rows[rows.length - 1].ngay_truc ? t : rows[0].ngay_truc;
            setFrom(start);
            setTo(rows[rows.length - 1].ngay_truc);
        } catch (err: any) {
            setFileRows([]); setFileName('');
            setError(err?.message || 'Không đọc được file.');
        }
    };

    const buildPreview = async () => {
        if (!from || !to || from > to) { setError('Khoảng ngày không hợp lệ.'); return; }
        const rows = fileRows.filter(r => r.ngay_truc >= from && r.ngay_truc <= to);
        if (!rows.length) { setError('File không có ngày nào trong khoảng đã chọn.'); return; }
        setBusy(true); setError('');
        try {
            const existing = await getDutySchedulesRange(from, to);
            const byDate = new Map<string, DutySchedule>();
            existing.forEach(s => { if (!byDate.has(s.ngay_truc)) byDate.set(s.ngay_truc, s); });
            setPreview(rows.map(r => {
                const ex = byDate.get(r.ngay_truc);
                const status: Status = !ex ? 'new'
                    : same(ex.bac_sy, r.bac_sy) && same(ex.sau_dai_hoc, r.sau_dai_hoc) && same(ex.dieu_duong, r.dieu_duong) && same(ex.phu_dieu_duong, r.phu_dieu_duong)
                        ? 'same' : 'update';
                return { ...r, status, existing: ex };
            }));
        } catch (err: any) {
            setError('Lỗi tải lịch trực hiện có: ' + (err?.message || err));
        } finally {
            setBusy(false);
        }
    };

    const counts = useMemo(() => {
        const c = { new: 0, update: 0, same: 0 };
        preview?.forEach(p => c[p.status]++);
        return c;
    }, [preview]);

    const handleSave = async () => {
        if (!preview) return;
        const todo = preview.filter(p => p.status !== 'same');
        if (!todo.length) { onClose(); return; }
        setBusy(true); setError('');
        let ok = 0;
        try {
            for (const p of todo) {
                const fields = {
                    bac_sy: p.bac_sy || null,
                    sau_dai_hoc: p.sau_dai_hoc || null,
                    dieu_duong: p.dieu_duong || null,
                    phu_dieu_duong: p.phu_dieu_duong || null,
                };
                if (p.existing) await updateDutySchedule(p.existing.id, fields);
                else await createDutySchedule({ ngay_truc: p.ngay_truc, noi_tru: null, ghi_chu: null, ...fields });
                ok++;
            }
            alert(`Đã lưu ${ok} ngày trực (${counts.new} mới, ${counts.update} cập nhật).`);
            onSaved();
            onClose();
        } catch (err: any) {
            setError(`Đã lưu ${ok}/${todo.length} ngày thì gặp lỗi: ${err?.message || err}`);
            if (ok) onSaved();
        } finally {
            setBusy(false);
        }
    };

    const STATUS_UI: Record<Status, { label: string; cls: string }> = {
        new: { label: 'Mới', cls: 'bg-green-100 text-green-700' },
        update: { label: 'Ghi đè', cls: 'bg-orange-100 text-orange-700' },
        same: { label: 'Không đổi', cls: 'bg-slate-100 text-slate-500' },
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-2 md:p-4">
            <div className={`bg-white rounded-2xl shadow-xl w-full ${preview ? 'max-w-6xl' : 'max-w-lg'} max-h-[95vh] flex flex-col`}>
                <div className="flex items-center justify-between px-5 py-4 border-b">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <FileSpreadsheet className="text-blue-600" size={20} /> Nhập lịch trực từ bảng phân trực
                    </h3>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>

                {!preview ? (
                    <div className="p-5 space-y-4 text-sm">
                        <label className="block">
                            <span className="font-medium text-slate-700">File bảng phân trực (.xlsx)</span>
                            <div className="mt-1 relative">
                                <input type="file" accept=".xlsx,.xls" onChange={handleFile} className="absolute inset-0 opacity-0 cursor-pointer" />
                                <div className="px-3 py-2 border border-dashed border-slate-300 rounded-lg flex items-center gap-2 text-slate-600 hover:bg-slate-50">
                                    <Upload size={16} /> {fileName || 'Chọn file...'}
                                </div>
                            </div>
                        </label>
                        {fileRange && (
                            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-blue-800">
                                Sheet <b>{sheetName}</b>: {fileRows.length} ngày, từ <b>{fmtVN(fileRange.min)}</b> đến <b>{fmtVN(fileRange.max)}</b>.
                                <div className="text-xs text-blue-700 mt-1">Bác sỹ: cột R · Sau ĐH: cột O · Điều dưỡng: cột T · Phụ ĐD: cột N</div>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            <label className="block">
                                <span className="font-medium text-slate-700">Từ ngày</span>
                                <input type="date" value={from} min={fileRange?.min} max={fileRange?.max} onChange={e => setFrom(e.target.value)}
                                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </label>
                            <label className="block">
                                <span className="font-medium text-slate-700">Đến ngày</span>
                                <input type="date" value={to} min={fileRange?.min} max={fileRange?.max} onChange={e => setTo(e.target.value)}
                                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </label>
                        </div>
                        {error && <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-700">{error}</div>}
                        <div className="flex justify-end gap-2 pt-2">
                            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Hủy</button>
                            <button onClick={buildPreview} disabled={!fileRows.length || busy}
                                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50">
                                <Eye size={16} /> {busy ? 'Đang tải...' : 'Xem trước'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="px-5 py-3 border-b flex flex-wrap items-center gap-2 text-sm">
                            <span className="text-slate-600">{fmtVN(from)} → {fmtVN(to)}: <b>{preview.length}</b> ngày</span>
                            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">{counts.new} mới</span>
                            <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">{counts.update} ghi đè</span>
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">{counts.same} không đổi</span>
                        </div>
                        <div className="overflow-auto flex-1">
                            <table className="w-full text-sm border-collapse">
                                <thead className="bg-slate-50 sticky top-0 z-10 text-slate-600">
                                    <tr>
                                        <th className="px-3 py-2 text-left border-b w-28">Ngày</th>
                                        <th className="px-3 py-2 text-left border-b">Bác sỹ</th>
                                        <th className="px-3 py-2 text-left border-b">Sau ĐH</th>
                                        <th className="px-3 py-2 text-left border-b">Điều dưỡng</th>
                                        <th className="px-3 py-2 text-left border-b">Phụ ĐD</th>
                                        <th className="px-3 py-2 text-center border-b w-24">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.map(p => {
                                        const we = ['CN', 'Bảy'].includes(thuOf(p.ngay_truc));
                                        const ex = p.existing;
                                        const diff = (k: keyof Row) => p.status === 'update' && !same(ex?.[k] as string, p[k]);
                                        const cell = (k: keyof Row, extra = '') => (
                                            <td className={`px-3 py-2 border-b align-top ${extra} ${diff(k) ? 'bg-orange-50' : ''}`}>
                                                {p[k] || <span className="text-slate-300">—</span>}
                                                {diff(k) && ex?.[k] && <div className="text-xs text-slate-400 line-through">{ex[k] as string}</div>}
                                            </td>
                                        );
                                        return (
                                            <tr key={p.ngay_truc} className={p.status === 'same' ? 'opacity-60' : ''}>
                                                <td className={`px-3 py-2 border-b align-top whitespace-nowrap ${we ? 'text-red-600' : 'text-slate-700'}`}>
                                                    <div className="font-semibold">{fmtVN(p.ngay_truc)}</div>
                                                    <div className="text-xs">{thuOf(p.ngay_truc) === 'CN' ? 'Chủ nhật' : `Thứ ${thuOf(p.ngay_truc)}`}</div>
                                                </td>
                                                {cell('bac_sy', 'font-medium text-[#009900]')}
                                                {cell('sau_dai_hoc', 'text-slate-600')}
                                                {cell('dieu_duong', 'text-blue-700')}
                                                {cell('phu_dieu_duong', 'text-slate-600')}
                                                <td className="px-3 py-2 border-b align-top text-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_UI[p.status].cls}`}>{STATUS_UI[p.status].label}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {error && <div className="mx-5 mt-3 p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">{error}</div>}
                        <div className="px-5 py-4 border-t flex flex-wrap justify-between gap-2">
                            <button onClick={() => setPreview(null)} disabled={busy} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-2 text-sm">
                                <ArrowLeft size={16} /> Chọn lại
                            </button>
                            <div className="flex gap-2">
                                <button onClick={onClose} disabled={busy} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm">Hủy</button>
                                <button onClick={handleSave} disabled={busy || counts.new + counts.update === 0}
                                    className="px-4 py-2 rounded-lg bg-[#009900] text-white hover:bg-[#007700] flex items-center gap-2 text-sm font-medium disabled:opacity-50">
                                    <Save size={16} /> {busy ? 'Đang lưu...' : `Xác nhận lưu (${counts.new + counts.update} ngày)`}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
