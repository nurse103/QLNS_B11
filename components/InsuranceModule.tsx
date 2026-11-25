import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HeartPulse, Users, User, Plus, Search, Edit, Trash2, X, Save, FileSpreadsheet, Copy, Upload } from 'lucide-react';
import { parseBhytFile, normName } from '../utils/bhytImport';
import { getPersonnel, Employee } from '../services/personnelService';
import { getFamilyRecords, FamilyRecord } from '../services/familyService';
import {
    bhytCaNhanApi, bhytThanNhanApi, BhytCaNhan, BhytThanNhan,
    LOAI_DE_NGHI, LOAI_DE_NGHI_SHORT, LoaiDeNghi,
} from '../services/bhytService';
import { exportMau04a, exportMau04b, formatDateVN } from '../utils/bhytExport';
import { usePermissions } from '../hooks/usePermissions';

type Tab = 'ca_nhan' | 'than_nhan';

const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009900] bg-white';
const labelCls = 'text-xs font-semibold text-slate-600';

const LoaiBadge = ({ loai }: { loai: LoaiDeNghi }) => {
    const color: Record<LoaiDeNghi, string> = {
        I: 'bg-green-50 text-green-700 border-green-200',
        II: 'bg-blue-50 text-blue-700 border-blue-200',
        III: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        IV: 'bg-amber-50 text-amber-700 border-amber-200',
        V: 'bg-orange-50 text-orange-700 border-orange-200',
        VI: 'bg-red-50 text-red-700 border-red-200',
        VII: 'bg-teal-50 text-teal-700 border-teal-200',
    };
    return (
        <span className={`inline-block px-2 py-0.5 rounded-full border text-[11px] font-semibold whitespace-nowrap ${color[loai]}`}>
            {loai}. {LOAI_DE_NGHI_SHORT[loai]}
        </span>
    );
};

const Field = ({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) => (
    <div className={`space-y-1 ${className}`}>
        <label className={labelCls}>{label}</label>
        {children}
    </div>
);

export const InsuranceModule = () => {
    const { can_add, can_edit, can_delete } = usePermissions('p-insurance');
    const [tab, setTab] = useState<Tab>('ca_nhan');
    const [caNhan, setCaNhan] = useState<BhytCaNhan[]>([]);
    const [thanNhan, setThanNhan] = useState<BhytThanNhan[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [families, setFamilies] = useState<FamilyRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const thisYear = new Date().getFullYear();
    const [nam, setNam] = useState<number>(thisYear + 1);
    const [search, setSearch] = useState('');
    const [loaiFilter, setLoaiFilter] = useState<'' | LoaiDeNghi>('');

    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState<any>({});
    const [saving, setSaving] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const [cn, tn, emps, fam] = await Promise.all([
                bhytCaNhanApi.list(),
                bhytThanNhanApi.list(),
                getPersonnel(),
                getFamilyRecords(),
            ]);
            setCaNhan(cn);
            setThanNhan(tn);
            setEmployees(emps || []);
            setFamilies(fam || []);
        } catch (err: any) {
            console.error(err);
            setLoadError(err?.message || 'Không tải được dữ liệu BHYT');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const years = useMemo(() => {
        const s = new Set<number>([thisYear, thisYear + 1]);
        caNhan.forEach(x => s.add(x.nam));
        thanNhan.forEach(x => s.add(x.nam));
        return Array.from(s).sort((a, b) => b - a);
    }, [caNhan, thanNhan, thisYear]);

    const empById = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);

    const matches = (text: (string | null | undefined)[]) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return text.some(t => (t || '').toLowerCase().includes(q));
    };

    const caNhanYear = caNhan.filter(x => x.nam === nam);
    const thanNhanYear = thanNhan.filter(x => x.nam === nam);

    const caNhanView = caNhanYear
        .filter(x => !loaiFilter || x.loai_de_nghi === loaiFilter)
        .filter(x => matches([x.dsnv?.ho_va_ten, x.ma_so_bhxh, x.dsnv?.cccd, x.noi_kcb]))
        .sort((a, b) => LOAI_DE_NGHI.indexOf(a.loai_de_nghi) - LOAI_DE_NGHI.indexOf(b.loai_de_nghi)
            || (a.dsnv?.ho_va_ten || '').localeCompare(b.dsnv?.ho_va_ten || '', 'vi'));

    const thanNhanView = thanNhanYear
        .filter(x => !loaiFilter || x.loai_de_nghi === loaiFilter)
        .filter(x => matches([x.ho_va_ten, x.dsnv?.ho_va_ten, x.ma_so_bhyt, x.cccd, x.noi_kcb, x.moi_quan_he]))
        .sort((a, b) => LOAI_DE_NGHI.indexOf(a.loai_de_nghi) - LOAI_DE_NGHI.indexOf(b.loai_de_nghi)
            || (a.dsnv?.ho_va_ten || '').localeCompare(b.dsnv?.ho_va_ten || '', 'vi')
            || (a.id || 0) - (b.id || 0));

    // ===== Actions =====
    const openAdd = () => {
        setForm({ nam, loai_de_nghi: 'I' });
        setModalOpen(true);
    };

    const openEdit = (item: BhytCaNhan | BhytThanNhan) => {
        setForm({ ...item });
        setModalOpen(true);
    };

    const handleDelete = async (id?: number) => {
        if (!id || !window.confirm('Bạn có chắc chắn muốn xóa bản ghi BHYT này?')) return;
        try {
            await (tab === 'ca_nhan' ? bhytCaNhanApi : bhytThanNhanApi).remove(id);
            fetchData();
        } catch (err) {
            console.error(err);
            alert('Xóa thất bại');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const api: any = tab === 'ca_nhan' ? bhytCaNhanApi : bhytThanNhanApi;
            const payload = { ...form, nam: Number(form.nam), dsnv_id: Number(form.dsnv_id) };
            if (tab === 'than_nhan' && !payload.gia_dinh_id) payload.gia_dinh_id = null;
            if (form.id) await api.update(form.id, payload);
            else await api.create(payload);
            setModalOpen(false);
            setForm({});
            fetchData();
        } catch (err: any) {
            console.error(err);
            alert('Lưu thất bại: ' + (err?.message || ''));
        } finally {
            setSaving(false);
        }
    };

    /** Sao chép danh sách năm trước sang năm đang chọn (mặc định mục II - gia hạn) */
    const handleCopyFromPrevYear = async () => {
        const prev = nam - 1;
        const isCN = tab === 'ca_nhan';
        const src: any[] = (isCN ? caNhan : thanNhan).filter(x => x.nam === prev && x.loai_de_nghi !== 'VI');
        const existing = new Set((isCN ? caNhanYear : thanNhanYear).map((x: any) =>
            isCN ? `${x.dsnv_id}` : `${x.dsnv_id}|${(x.ho_va_ten || '').toLowerCase()}`));
        const toCopy = src.filter(x => !existing.has(isCN ? `${x.dsnv_id}` : `${x.dsnv_id}|${(x.ho_va_ten || '').toLowerCase()}`));
        if (toCopy.length === 0) {
            alert(`Không có bản ghi nào của năm ${prev} cần sao chép sang năm ${nam}.`);
            return;
        }
        if (!window.confirm(`Sao chép ${toCopy.length} bản ghi từ năm ${prev} sang năm ${nam}?\nCác bản ghi mới sẽ được xếp vào mục "II. Gia hạn", bạn có thể sửa lại sau.`)) return;
        try {
            const rows = toCopy.map(({ id, created_at, created_by, dsnv, ...rest }) => ({ ...rest, nam, loai_de_nghi: 'II' }));
            await (isCN ? bhytCaNhanApi : bhytThanNhanApi).bulkCreate(rows);
            fetchData();
        } catch (err: any) {
            console.error(err);
            alert('Sao chép thất bại: ' + (err?.message || ''));
        }
    };

    // ===== Nhập từ Excel theo Mẫu 04a / 04b =====
    const importInputRef = useRef<HTMLInputElement>(null);
    const [importing, setImporting] = useState(false);

    const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        const isCN = tab === 'ca_nhan';
        setImporting(true);
        try {
            const result = await parseBhytFile(file, tab, employees, nam);
            const targetNam = result.nam || nam;
            const keyOf = (x: any) => isCN ? `${x.dsnv_id}` : `${x.dsnv_id}|${normName(x.ho_va_ten)}`;
            const existing = new Map<string, any>(
                (isCN ? caNhan : thanNhan).filter(x => x.nam === targetNam).map(x => [keyOf(x), x]));

            const toCreate: any[] = [];
            const toUpdate: { id: number; data: any }[] = [];
            const seen = new Set<string>();
            for (const rec of result.records as any[]) {
                const k = keyOf(rec);
                if (seen.has(k)) continue; // trùng trong file: lấy dòng đầu
                seen.add(k);
                const old = existing.get(k);
                if (old) {
                    // Ô trống trong file thì giữ nguyên giá trị đang có
                    const data = Object.fromEntries(Object.entries(rec).filter(([, v]) => v !== null && v !== ''));
                    toUpdate.push({ id: old.id, data });
                } else {
                    toCreate.push(rec);
                }
            }

            const lines = [
                `File: ${isCN ? 'Mẫu 04b - BHYT cá nhân' : 'Mẫu 04a - BHYT thân nhân'}, năm ${targetNam}`,
                `• Thêm mới: ${toCreate.length}`,
                `• Cập nhật (đã có trong năm ${targetNam}): ${toUpdate.length}`,
            ];
            if (result.unmatched.length) {
                lines.push(`• Bỏ qua ${result.unmatched.length} người không tìm thấy trong danh sách nhân viên:`);
                lines.push(...result.unmatched.slice(0, 15).map(n => `   - ${n}`));
                if (result.unmatched.length > 15) lines.push(`   ... và ${result.unmatched.length - 15} người khác`);
            }
            if (toCreate.length + toUpdate.length === 0) {
                alert(lines.join('\n') + '\n\nKhông có dòng nào để nhập.');
                return;
            }
            if (!window.confirm(lines.join('\n') + '\n\nTiếp tục nhập?')) return;

            const api: any = isCN ? bhytCaNhanApi : bhytThanNhanApi;
            if (toCreate.length) await api.bulkCreate(toCreate);
            for (const u of toUpdate) await api.update(u.id, u.data);
            if (targetNam !== nam) setNam(targetNam);
            await fetchData();
            alert(`Đã nhập xong: ${toCreate.length} thêm mới, ${toUpdate.length} cập nhật.`);
        } catch (err: any) {
            console.error(err);
            alert('Nhập Excel thất bại: ' + (err?.message || ''));
        } finally {
            setImporting(false);
        }
    };

    const handleExport = () => {
        if (tab === 'ca_nhan') exportMau04b(caNhanYear, nam);
        else exportMau04a(thanNhanYear, nam);
    };

    // Khi chọn thân nhân từ "Quan hệ gia đình" → điền sẵn thông tin
    const familyOfSelected = families.filter(f => f.dsnv_id === Number(form.dsnv_id));
    const pickFamily = (id: string) => {
        const f = families.find(x => x.id === Number(id));
        if (!f) {
            setForm({ ...form, gia_dinh_id: null });
            return;
        }
        setForm({
            ...form,
            gia_dinh_id: f.id,
            moi_quan_he: f.moi_quan_he || form.moi_quan_he,
            ho_va_ten: f.ho_va_ten || form.ho_va_ten,
            so_dien_thoai: f.so_dien_thoai || form.so_dien_thoai,
        });
    };

    const selectedEmp = form.dsnv_id ? empById.get(Number(form.dsnv_id)) : undefined;

    const counts = (list: { loai_de_nghi: LoaiDeNghi }[]) =>
        LOAI_DE_NGHI.map(l => ({ l, n: list.filter(x => x.loai_de_nghi === l).length }));
    const yearList = tab === 'ca_nhan' ? caNhanYear : thanNhanYear;

    const actionBtns = (item: BhytCaNhan | BhytThanNhan) => (
        <div className="flex items-center justify-center gap-1">
            {can_edit && <button onClick={() => openEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Sửa"><Edit size={16} /></button>}
            {can_delete && <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Xóa"><Trash2 size={16} /></button>}
        </div>
    );

    return (
        <div className="p-4 md:p-6 space-y-5 bg-slate-50/30 min-h-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <div className="p-2 bg-green-50 rounded-lg"><HeartPulse className="text-[#009900]" size={24} /></div>
                        Bảo hiểm y tế
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Danh sách thẻ BHYT đơn vị quản lý và đề nghị cấp thẻ (Mẫu 04a, 04b/BHYT-QĐ)</p>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600 font-medium">Năm</label>
                    <select value={nam} onChange={e => setNam(Number(e.target.value))} className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold bg-white shadow-sm">
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            {/* 2 thẻ */}
            <div className="flex gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-full md:w-fit">
                {([
                    { id: 'ca_nhan', label: 'BHYT cá nhân', icon: User, n: caNhanYear.length },
                    { id: 'than_nhan', label: 'BHYT thân nhân', icon: Users, n: thanNhanYear.length },
                ] as const).map(t => (
                    <button
                        key={t.id}
                        onClick={() => { setTab(t.id); setLoaiFilter(''); }}
                        className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${tab === t.id ? 'bg-[#009900] text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <t.icon size={16} /> {t.label}
                        <span className={`text-[11px] px-1.5 rounded-full ${tab === t.id ? 'bg-white/25' : 'bg-slate-100'}`}>{t.n}</span>
                    </button>
                ))}
            </div>

            {loadError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    {loadError}. Nếu chưa tạo bảng, hãy chạy file <b>create_bhyt_tables.sql</b> trong Supabase SQL Editor.
                </div>
            )}

            {/* Thống kê theo mục */}
            <div className="flex flex-wrap gap-2">
                <button onClick={() => setLoaiFilter('')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${loaiFilter === '' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}>
                    Tất cả ({yearList.length})
                </button>
                {counts(yearList).map(({ l, n }) => (
                    <button key={l} onClick={() => setLoaiFilter(l)} title={LOAI_DE_NGHI_SHORT[l]}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${loaiFilter === l ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}>
                        {l}. {LOAI_DE_NGHI_SHORT[l]} ({n})
                    </button>
                ))}
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-[200px] md:max-w-sm">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder={tab === 'ca_nhan' ? 'Tìm tên, mã BHXH, CCCD...' : 'Tìm tên thân nhân, quân nhân, mã số...'}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009900] shadow-sm" />
                </div>
                {can_add && (
                    <button onClick={handleCopyFromPrevYear} className="px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2 shadow-sm whitespace-nowrap" title={`Sao chép danh sách năm ${nam - 1} sang năm ${nam}`}>
                        <Copy size={16} /> Từ năm {nam - 1}
                    </button>
                )}
                {can_add && (
                    <>
                        <button onClick={() => importInputRef.current?.click()} disabled={importing}
                            className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg text-sm font-medium hover:bg-blue-100 flex items-center gap-2 shadow-sm whitespace-nowrap disabled:opacity-50"
                            title={`Nhập từ file Excel theo ${tab === 'ca_nhan' ? 'Mẫu 04b' : 'Mẫu 04a'}`}>
                            <Upload size={16} /> {importing ? 'Đang nhập...' : `Nhập Excel ${tab === 'ca_nhan' ? '04b' : '04a'}`}
                        </button>
                        <input ref={importInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} />
                    </>
                )}
                <button onClick={handleExport} className="px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2 shadow-sm whitespace-nowrap">
                    <FileSpreadsheet size={16} className="text-green-700" /> Xuất {tab === 'ca_nhan' ? 'Mẫu 04b' : 'Mẫu 04a'}
                </button>
                {can_add && (
                    <button onClick={openAdd} className="px-4 py-2 bg-[#009900] text-white rounded-lg text-sm font-medium hover:bg-[#007700] flex items-center gap-2 shadow-md whitespace-nowrap">
                        <Plus size={16} /> Thêm mới
                    </button>
                )}
            </div>

            {/* ===== BHYT CÁ NHÂN ===== */}
            {tab === 'ca_nhan' && (
                <>
                    <div className="grid grid-cols-1 gap-3 md:hidden">
                        {loading ? <div className="py-10 text-center text-slate-500">Đang tải...</div>
                            : caNhanView.length === 0 ? <div className="py-10 text-center text-slate-500 italic">Chưa có dữ liệu năm {nam}.</div>
                                : caNhanView.map(x => (
                                    <div key={x.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                                        <div className="flex justify-between items-start gap-2">
                                            <div>
                                                <div className="font-bold text-slate-900">{x.dsnv?.ho_va_ten}</div>
                                                <div className="text-xs text-slate-500">{x.dsnv?.cap_bac || ''} · {formatDateVN(x.dsnv?.ngay_sinh)}</div>
                                            </div>
                                            {actionBtns(x)}
                                        </div>
                                        <LoaiBadge loai={x.loai_de_nghi} />
                                        <div className="grid grid-cols-2 gap-1 text-xs text-slate-600">
                                            <div>Mã BHXH: <b className="text-blue-700">{x.ma_so_bhxh || '---'}</b></div>
                                            <div>CCCD: {x.dsnv?.cccd || '---'}</div>
                                            <div className="col-span-2">Nơi KCB: {x.noi_kcb || '---'}</div>
                                            <div className="col-span-2">Hạn thẻ: {formatDateVN(x.sd_tu_ngay) || '---'} → {formatDateVN(x.sd_den_ngay) || '---'}</div>
                                        </div>
                                    </div>
                                ))}
                    </div>

                    <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-[#009900] text-white font-bold uppercase text-[11px] tracking-wider">
                                    <tr>
                                        <th className="px-3 py-3 w-10">TT</th>
                                        <th className="px-3 py-3">Họ và tên</th>
                                        <th className="px-3 py-3">Cấp bậc</th>
                                        <th className="px-3 py-3">Mã số BHXH</th>
                                        <th className="px-3 py-3">Số CCCD</th>
                                        <th className="px-3 py-3">Ngày sinh</th>
                                        <th className="px-3 py-3 text-center">Nữ</th>
                                        <th className="px-3 py-3">Xã / Tỉnh</th>
                                        <th className="px-3 py-3">Nơi KCB ban đầu</th>
                                        <th className="px-3 py-3">SĐT</th>
                                        <th className="px-3 py-3">Giá trị thẻ</th>
                                        <th className="px-3 py-3">Mục</th>
                                        <th className="px-3 py-3 text-center w-20">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr><td colSpan={13} className="px-6 py-10 text-center text-slate-500">Đang tải dữ liệu...</td></tr>
                                    ) : caNhanView.length === 0 ? (
                                        <tr><td colSpan={13} className="px-6 py-10 text-center text-slate-500 italic">Chưa có dữ liệu năm {nam}.</td></tr>
                                    ) : caNhanView.map((x, i) => (
                                        <tr key={x.id} className="hover:bg-slate-50/60">
                                            <td className="px-3 py-2.5 text-slate-500">{i + 1}</td>
                                            <td className="px-3 py-2.5 font-bold text-slate-900 whitespace-nowrap">{x.dsnv?.ho_va_ten}</td>
                                            <td className="px-3 py-2.5 text-slate-600">{x.dsnv?.cap_bac || ''}</td>
                                            <td className="px-3 py-2.5 font-medium text-blue-700">{x.ma_so_bhxh || '---'}</td>
                                            <td className="px-3 py-2.5 text-slate-600">{x.dsnv?.cccd || ''}</td>
                                            <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{formatDateVN(x.dsnv?.ngay_sinh)}</td>
                                            <td className="px-3 py-2.5 text-center font-bold">{(x.dsnv?.gioi_tinh || '').toLowerCase() === 'nữ' ? 'X' : ''}</td>
                                            <td className="px-3 py-2.5 text-slate-600">{[x.xa_phuong, x.tinh].filter(Boolean).join(', ')}</td>
                                            <td className="px-3 py-2.5 text-slate-700">{x.noi_kcb || ''}</td>
                                            <td className="px-3 py-2.5 text-slate-600">{x.so_dien_thoai || x.dsnv?.dien_thoai || ''}</td>
                                            <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap text-xs">{formatDateVN(x.sd_tu_ngay)}{(x.sd_tu_ngay || x.sd_den_ngay) && ' → '}{formatDateVN(x.sd_den_ngay)}</td>
                                            <td className="px-3 py-2.5"><LoaiBadge loai={x.loai_de_nghi} /></td>
                                            <td className="px-3 py-2.5">{actionBtns(x)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* ===== BHYT THÂN NHÂN ===== */}
            {tab === 'than_nhan' && (
                <>
                    <div className="grid grid-cols-1 gap-3 md:hidden">
                        {loading ? <div className="py-10 text-center text-slate-500">Đang tải...</div>
                            : thanNhanView.length === 0 ? <div className="py-10 text-center text-slate-500 italic">Chưa có dữ liệu năm {nam}.</div>
                                : thanNhanView.map(x => (
                                    <div key={x.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                                        <div className="flex justify-between items-start gap-2">
                                            <div>
                                                <div className="font-bold text-slate-900">{x.ho_va_ten} <span className="text-pink-600 font-medium text-sm">({x.moi_quan_he || '---'})</span></div>
                                                <div className="text-xs text-slate-500">Quân nhân: <b>{x.dsnv?.ho_va_ten}</b> {x.dsnv?.cap_bac ? `· ${x.dsnv.cap_bac}` : ''}</div>
                                            </div>
                                            {actionBtns(x)}
                                        </div>
                                        <LoaiBadge loai={x.loai_de_nghi} />
                                        <div className="grid grid-cols-2 gap-1 text-xs text-slate-600">
                                            <div>Mã số: <b className="text-blue-700">{x.ma_so_bhyt || '---'}</b></div>
                                            <div>Sinh: {formatDateVN(x.ngay_sinh) || '---'}</div>
                                            <div className="col-span-2">Nơi KCB: {x.noi_kcb || '---'}</div>
                                            <div className="col-span-2">Hạn thẻ: {formatDateVN(x.sd_tu_ngay) || '---'} → {formatDateVN(x.sd_den_ngay) || '---'}</div>
                                        </div>
                                    </div>
                                ))}
                    </div>

                    <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-[#009900] text-white font-bold uppercase text-[11px] tracking-wider">
                                    <tr>
                                        <th className="px-3 py-3 w-10">TT</th>
                                        <th className="px-3 py-3">Quân nhân</th>
                                        <th className="px-3 py-3">Quan hệ</th>
                                        <th className="px-3 py-3">Họ tên thân nhân</th>
                                        <th className="px-3 py-3">CCCD/Định danh</th>
                                        <th className="px-3 py-3">Mã số</th>
                                        <th className="px-3 py-3">Ngày sinh</th>
                                        <th className="px-3 py-3 text-center">Nữ</th>
                                        <th className="px-3 py-3">Xã / Tỉnh</th>
                                        <th className="px-3 py-3">Nơi KCB</th>
                                        <th className="px-3 py-3">Giá trị thẻ</th>
                                        <th className="px-3 py-3">Mục</th>
                                        <th className="px-3 py-3 text-center w-20">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr><td colSpan={13} className="px-6 py-10 text-center text-slate-500">Đang tải dữ liệu...</td></tr>
                                    ) : thanNhanView.length === 0 ? (
                                        <tr><td colSpan={13} className="px-6 py-10 text-center text-slate-500 italic">Chưa có dữ liệu năm {nam}.</td></tr>
                                    ) : thanNhanView.map((x, i) => (
                                        <tr key={x.id} className="hover:bg-slate-50/60">
                                            <td className="px-3 py-2.5 text-slate-500">{i + 1}</td>
                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                <div className="font-bold text-slate-900">{x.dsnv?.ho_va_ten}</div>
                                                <div className="text-[10px] text-slate-400">{x.dsnv?.cap_bac || ''}</div>
                                            </td>
                                            <td className="px-3 py-2.5 font-medium text-pink-600">{x.moi_quan_he || ''}</td>
                                            <td className="px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap">{x.ho_va_ten}</td>
                                            <td className="px-3 py-2.5 text-slate-600">{x.cccd || ''}</td>
                                            <td className="px-3 py-2.5 font-medium text-blue-700">{x.ma_so_bhyt || ''}</td>
                                            <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{formatDateVN(x.ngay_sinh)}</td>
                                            <td className="px-3 py-2.5 text-center font-bold">{(x.gioi_tinh || '').toLowerCase() === 'nữ' ? 'X' : ''}</td>
                                            <td className="px-3 py-2.5 text-slate-600">{[x.xa_phuong, x.tinh].filter(Boolean).join(', ')}</td>
                                            <td className="px-3 py-2.5 text-slate-700">{x.noi_kcb || ''}</td>
                                            <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap text-xs">{formatDateVN(x.sd_tu_ngay)}{(x.sd_tu_ngay || x.sd_den_ngay) && ' → '}{formatDateVN(x.sd_den_ngay)}</td>
                                            <td className="px-3 py-2.5"><LoaiBadge loai={x.loai_de_nghi} /></td>
                                            <td className="px-3 py-2.5">{actionBtns(x)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* ===== Modal thêm / sửa ===== */}
            {modalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800">
                                {form.id ? 'Cập nhật' : 'Thêm'} {tab === 'ca_nhan' ? 'BHYT cá nhân' : 'BHYT thân nhân'}
                            </h3>
                            <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <Field label={tab === 'ca_nhan' ? 'Nhân viên *' : 'Quân nhân (nhân viên) *'} className="md:col-span-2">
                                    <select required value={form.dsnv_id || ''} onChange={e => setForm({ ...form, dsnv_id: Number(e.target.value), gia_dinh_id: null })} className={inputCls}>
                                        <option value="">-- Chọn nhân viên --</option>
                                        {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.ho_va_ten}{emp.cap_bac ? ` - ${emp.cap_bac}` : ''}</option>)}
                                    </select>
                                </Field>
                                <Field label="Năm *">
                                    <input type="number" required value={form.nam || ''} onChange={e => setForm({ ...form, nam: e.target.value })} className={inputCls} />
                                </Field>
                                <Field label="Mục đề nghị *">
                                    <select required value={form.loai_de_nghi || 'I'} onChange={e => setForm({ ...form, loai_de_nghi: e.target.value })} className={inputCls}>
                                        {LOAI_DE_NGHI.map(l => <option key={l} value={l}>{l}. {LOAI_DE_NGHI_SHORT[l]}</option>)}
                                    </select>
                                </Field>
                            </div>

                            {tab === 'ca_nhan' && selectedEmp && (
                                <div className="p-3 bg-green-50/60 border border-green-100 rounded-xl text-xs text-slate-700 grid grid-cols-2 md:grid-cols-4 gap-2">
                                    <div>Cấp bậc: <b>{selectedEmp.cap_bac || '---'}</b></div>
                                    <div>Ngày sinh: <b>{formatDateVN(selectedEmp.ngay_sinh) || '---'}</b></div>
                                    <div>Giới tính: <b>{selectedEmp.gioi_tinh || '---'}</b></div>
                                    <div>CCCD: <b>{selectedEmp.cccd || '---'}</b></div>
                                    <div className="col-span-2 md:col-span-4 text-slate-500 italic">Các thông tin trên lấy từ hồ sơ nhân viên — sửa ở “Danh sách nhân viên”.</div>
                                </div>
                            )}

                            {tab === 'than_nhan' && (
                                <>
                                    <Field label="Chọn từ “Quan hệ gia đình” (tùy chọn – điền sẵn thông tin)">
                                        <select value={form.gia_dinh_id || ''} onChange={e => pickFamily(e.target.value)} className={inputCls} disabled={!form.dsnv_id}>
                                            <option value="">{form.dsnv_id ? (familyOfSelected.length ? '-- Chọn thân nhân --' : 'Nhân viên chưa có dữ liệu gia đình') : 'Chọn quân nhân trước'}</option>
                                            {familyOfSelected.map(f => <option key={f.id} value={f.id}>{f.moi_quan_he} - {f.ho_va_ten}{f.nam_sinh ? ` (${f.nam_sinh})` : ''}</option>)}
                                        </select>
                                    </Field>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <Field label="Quan hệ *">
                                            <input required list="bhyt-quan-he" value={form.moi_quan_he || ''} onChange={e => setForm({ ...form, moi_quan_he: e.target.value })} className={inputCls} placeholder="Bố, Mẹ, Vợ, Con..." />
                                            <datalist id="bhyt-quan-he">
                                                {['Bố', 'Mẹ', 'Bố vợ', 'Mẹ vợ', 'Bố chồng', 'Mẹ chồng', 'Vợ', 'Chồng', 'Con'].map(v => <option key={v} value={v} />)}
                                            </datalist>
                                        </Field>
                                        <Field label="Họ và tên thân nhân *" className="md:col-span-2">
                                            <input required value={form.ho_va_ten || ''} onChange={e => setForm({ ...form, ho_va_ten: e.target.value })} className={inputCls} />
                                        </Field>
                                        <Field label="Giới tính">
                                            <select value={form.gioi_tinh || ''} onChange={e => setForm({ ...form, gioi_tinh: e.target.value })} className={inputCls}>
                                                <option value="">--</option>
                                                <option value="Nam">Nam</option>
                                                <option value="Nữ">Nữ</option>
                                            </select>
                                        </Field>
                                        <Field label="Ngày sinh">
                                            <input type="date" value={form.ngay_sinh || ''} onChange={e => setForm({ ...form, ngay_sinh: e.target.value })} className={inputCls} />
                                        </Field>
                                        <Field label="Số CCCD / Số định danh">
                                            <input value={form.cccd || ''} onChange={e => setForm({ ...form, cccd: e.target.value })} className={inputCls} />
                                        </Field>
                                        <Field label="Mã số BHYT/BHXH">
                                            <input value={form.ma_so_bhyt || ''} onChange={e => setForm({ ...form, ma_so_bhyt: e.target.value })} className={inputCls} />
                                        </Field>
                                        <Field label="Số điện thoại">
                                            <input value={form.so_dien_thoai || ''} onChange={e => setForm({ ...form, so_dien_thoai: e.target.value })} className={inputCls} />
                                        </Field>
                                    </div>
                                </>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {tab === 'ca_nhan' && (
                                    <>
                                        <Field label="Mã số BHXH (10 số cuối thẻ)">
                                            <input value={form.ma_so_bhxh || ''} onChange={e => setForm({ ...form, ma_so_bhxh: e.target.value })} className={inputCls} />
                                        </Field>
                                        <Field label="Số điện thoại">
                                            <input value={form.so_dien_thoai || ''} onChange={e => setForm({ ...form, so_dien_thoai: e.target.value })} className={inputCls} placeholder={selectedEmp?.dien_thoai || 'Theo hồ sơ'} />
                                        </Field>
                                    </>
                                )}
                                <Field label="Xã / Phường">
                                    <input value={form.xa_phuong || ''} onChange={e => setForm({ ...form, xa_phuong: e.target.value })} className={inputCls} />
                                </Field>
                                <Field label="Tỉnh / Thành phố">
                                    <input value={form.tinh || ''} onChange={e => setForm({ ...form, tinh: e.target.value })} className={inputCls} />
                                </Field>
                                <Field label="Nơi KCB ban đầu" className="md:col-span-2">
                                    <input list="bhyt-noi-kcb" value={form.noi_kcb || ''} onChange={e => setForm({ ...form, noi_kcb: e.target.value })} className={inputCls} />
                                    <datalist id="bhyt-noi-kcb">
                                        {Array.from(new Set([...caNhan, ...thanNhan].map(x => x.noi_kcb).filter(Boolean))).map(v => <option key={v as string} value={v as string} />)}
                                    </datalist>
                                </Field>
                                <Field label="Giá trị thẻ đã cấp: Từ">
                                    <input type="date" value={form.sd_tu_ngay || ''} onChange={e => setForm({ ...form, sd_tu_ngay: e.target.value })} className={inputCls} />
                                </Field>
                                <Field label="Đến">
                                    <input type="date" value={form.sd_den_ngay || ''} onChange={e => setForm({ ...form, sd_den_ngay: e.target.value })} className={inputCls} />
                                </Field>
                                <Field label="Ghi chú" className="md:col-span-4">
                                    <textarea value={form.ghi_chu || ''} onChange={e => setForm({ ...form, ghi_chu: e.target.value })} className={`${inputCls} min-h-[60px]`} />
                                </Field>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                                <button type="button" onClick={() => setModalOpen(false)} className="px-6 py-2.5 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-bold">HỦY</button>
                                <button type="submit" disabled={saving} className="px-6 py-2.5 bg-[#009900] text-white rounded-xl hover:bg-[#007700] font-bold flex items-center gap-2 shadow-lg shadow-green-100 disabled:opacity-50">
                                    <Save size={18} /> {form.id ? 'CẬP NHẬT' : 'LƯU LẠI'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
