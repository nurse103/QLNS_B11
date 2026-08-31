import React, { useEffect, useMemo, useState } from 'react';
import {
    getPartyDossier,
    savePartyProfile,
    savePartyCardPersonalInfo,
    PartyDossier,
    PartyProfile,
    HUY_HIEU_DANG_MOC,
    PARTY_ORG_DEFAULTS,
} from '../services/partyService';
import { exportPartyCard } from '../utils/partyCardExport';
import { Employee, uploadAvatarImage } from '../services/personnelService';
import { getAuthUser } from '../services/authService';
import { canEditPersonnelRecord } from '../utils/ownershipUtils';
import { ArrowLeft, Save, FileDown, Loader2, Info, Lock, Upload, ImageOff } from 'lucide-react';

interface PartyProfileModalProps {
    employee: Employee;
    canEdit: boolean;
    onClose: () => void;
    onSaved?: () => void;
}

type SectionId = 'cap-uy' | 'nhan-than' | 'ket-nap' | 'trinh-do' | 'khen-thuong' | 'lich-su' | 'kinh-te';

const SECTIONS: { id: SectionId; label: string }[] = [
    { id: 'cap-uy', label: 'Cấp uỷ & số hiệu' },
    { id: 'nhan-than', label: 'Mục 01 - 11' },
    { id: 'ket-nap', label: 'Mục 12 - 16' },
    { id: 'trinh-do', label: 'Mục 17 - 20' },
    { id: 'khen-thuong', label: 'Mục 23 - 26' },
    { id: 'lich-su', label: 'Mục 27 - 28' },
    { id: 'kinh-te', label: 'Mục 30 & ký phiếu' },
];

const inputClass =
    'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-slate-50 disabled:text-slate-500';

/** Ô lấy dữ liệu từ bảng dsnv - tô khác màu để phân biệt với dữ liệu riêng của phiếu. */
const dsnvInputClass =
    'w-full px-3 py-2 border border-amber-200 bg-amber-50/40 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-200';

const Field = ({
    label,
    children,
    hint,
    className = '',
    fromDsnv = false,
}: {
    label: string;
    children: React.ReactNode;
    hint?: string;
    className?: string;
    fromDsnv?: boolean;
}) => (
    <div className={className}>
        <label className="block text-xs font-medium text-slate-500 mb-1">
            {label}
            {fromDsnv && (
                <span className="ml-1.5 text-[10px] font-semibold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                    DSNV
                </span>
            )}
        </label>
        {children}
        {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
    </div>
);

export const PartyProfileModal: React.FC<PartyProfileModalProps> = ({ employee, canEdit, onClose, onSaved }) => {
    const [dossier, setDossier] = useState<PartyDossier | null>(null);
    const [form, setForm] = useState<PartyProfile>({ dsnv_id: employee.id, huy_hieu_dang: [] });
    const [emp, setEmp] = useState<Employee>(employee);
    const [section, setSection] = useState<SectionId>('cap-uy');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [uploading, setUploading] = useState(false);

    const authUser = useMemo(() => getAuthUser(), []);
    const isAdmin = authUser?.role === 'admin';
    /** Chỉ chính chủ (khớp họ tên đăng nhập) hoặc admin mới sửa được thông tin cá nhân. */
    const canEditPersonal = canEditPersonnelRecord(employee, authUser);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await getPartyDossier(employee.id);
                if (cancelled) return;
                setDossier(data);
                setEmp(data.employee);
                setForm({
                    ...data.profile,
                    dsnv_id: employee.id,
                    huy_hieu_dang: data.profile.huy_hieu_dang ?? [],
                    // Cấp uỷ dùng chung cả đơn vị: chưa có thì điền sẵn cho đỡ phải gõ
                    dang_bo_chi_bo_co_so: data.profile.dang_bo_chi_bo_co_so || PARTY_ORG_DEFAULTS.dang_bo_chi_bo_co_so,
                    dang_bo_bo_phan: data.profile.dang_bo_bo_phan || PARTY_ORG_DEFAULTS.dang_bo_bo_phan,
                    chi_bo: data.profile.chi_bo || PARTY_ORG_DEFAULTS.chi_bo,
                });
            } catch (error) {
                console.error('Không tải được hồ sơ đảng viên:', error);
                alert('Không tải được hồ sơ đảng viên. Kiểm tra bảng ho_so_dang_vien đã được tạo chưa.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [employee.id]);

    const set = (key: keyof PartyProfile) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(prev => ({ ...prev, [key]: e.target.value }));

    const setDsnv = (key: keyof Employee) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setEmp(prev => ({ ...prev, [key]: e.target.value }));

    const toggleHuyHieu = (year: string) =>
        setForm(prev => {
            const current = new Set(prev.huy_hieu_dang ?? []);
            if (current.has(year)) current.delete(year);
            else current.add(year);
            return { ...prev, huy_hieu_dang: HUY_HIEU_DANG_MOC.filter(y => current.has(y)) };
        });

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const url = await uploadAvatarImage(file);
            setEmp(prev => ({ ...prev, avatar: url }));
        } catch (error: any) {
            console.error(error);
            const msg = String(error?.message ?? '');
            alert(
                msg.includes('row-level security')
                    ? 'Tải ảnh thất bại: bucket "the_dang" chưa cho phép ghi. Chạy file fix_the_dang_storage.sql trong Supabase SQL Editor.'
                    : `Tải ảnh lên thất bại. ${msg}`
            );
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // 1. Ghi thông tin cá nhân ngược về dsnv (nếu là hồ sơ của mình hoặc là admin)
            if (canEditPersonal) {
                const updated = await savePartyCardPersonalInfo(employee.id, emp, { allowNameChange: isAdmin });
                setEmp(updated);
                setDossier(prev => (prev ? { ...prev, employee: updated } : prev));
            }

            // 2. Ghi phần riêng của phiếu đảng viên
            if (canEdit) {
                const saved = await savePartyProfile(form);
                setForm({ ...saved, huy_hieu_dang: saved.huy_hieu_dang ?? [] });
                setDossier(prev => (prev ? { ...prev, profile: saved } : prev));
            }

            onSaved?.();
            alert('Đã lưu phiếu đảng viên.');
        } catch (error) {
            console.error(error);
            alert('Lưu thất bại. Vui lòng thử lại.');
        } finally {
            setSaving(false);
        }
    };

    const handleExport = async () => {
        if (!dossier) return;
        setExporting(true);
        try {
            await exportPartyCard({ ...dossier, employee: emp, profile: form });
        } catch (error) {
            console.error(error);
            alert('Xuất file Word thất bại.');
        } finally {
            setExporting(false);
        }
    };

    const counts = useMemo(
        () => ({
            work: dossier?.workHistory.length ?? 0,
            training: dossier?.training.length ?? 0,
            family: dossier?.family.length ?? 0,
        }),
        [dossier]
    );

    const readOnly = !canEdit;
    const personalReadOnly = !canEditPersonal;

    return (
        /* Bố cục phẳng: hiển thị thẳng trong trang, không dùng popup */
        <div className="animate-fade-in">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-red-600 text-white p-4 md:p-5 flex justify-between items-center shrink-0 sticky top-0 z-10">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg bg-red-500/50 hover:bg-red-500/80 transition-colors shrink-0"
                            title="Quay lại danh sách"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div className="min-w-0">
                            <h2 className="text-lg md:text-xl font-bold leading-tight">PHIẾU ĐẢNG VIÊN</h2>
                            <p className="text-red-100 text-sm mt-0.5 truncate">
                                {emp.ho_va_ten}
                                {emp.chuc_vu ? ` — ${emp.chuc_vu}` : ''}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 flex gap-2 overflow-x-auto shrink-0">
                    {SECTIONS.map(s => (
                        <button
                            key={s.id}
                            onClick={() => setSection(s.id)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                                section === s.id
                                    ? 'bg-red-600 text-white shadow-sm'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:border-red-300'
                            }`}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="p-4 md:p-6 space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-40 text-slate-500 gap-2">
                            <Loader2 className="animate-spin" size={18} /> Đang tải hồ sơ...
                        </div>
                    ) : (
                        <>
                            {personalReadOnly ? (
                                <div className="flex items-start gap-2 bg-slate-100 border border-slate-200 rounded-lg p-3 text-sm text-slate-600">
                                    <Lock size={16} className="mt-0.5 shrink-0" />
                                    <span>
                                        Các ô đánh dấu <strong className="text-amber-600">DSNV</strong> lấy từ hồ sơ nhân sự và đang khoá.
                                        Chỉ <strong>{emp.ho_va_ten}</strong> (đăng nhập bằng tài khoản mang đúng họ tên này) hoặc
                                        <strong> admin</strong> mới sửa được.
                                    </span>
                                </div>
                            ) : (
                                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                                    <Info size={16} className="mt-0.5 shrink-0" />
                                    <span>
                                        Các ô đánh dấu <strong>DSNV</strong> sửa tại đây sẽ <strong>ghi thẳng vào hồ sơ nhân sự</strong>,
                                        đồng bộ với Danh sách nhân viên và mọi báo cáo khác.
                                        {!isAdmin && ' Riêng họ tên chỉ admin được đổi.'}
                                    </span>
                                </div>
                            )}

                            {section === 'cap-uy' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Đảng bộ tỉnh / Đảng bộ xã: đơn vị không dùng nên ẩn khỏi form.
                                        Cột trong DB vẫn giữ; khi xuất Word hai dòng này chỉ in nhãn, không kéo dòng chấm. */}
                                    <Field label="Đảng bộ cơ sở">
                                        <input
                                            list="goi-y-dang-bo-co-so"
                                            className={inputClass}
                                            disabled={readOnly}
                                            value={form.dang_bo_chi_bo_co_so ?? ''}
                                            onChange={set('dang_bo_chi_bo_co_so')}
                                            placeholder={PARTY_ORG_DEFAULTS.dang_bo_chi_bo_co_so}
                                        />
                                        <datalist id="goi-y-dang-bo-co-so">
                                            <option value={PARTY_ORG_DEFAULTS.dang_bo_chi_bo_co_so} />
                                        </datalist>
                                    </Field>
                                    <Field label="Đảng bộ bộ phận">
                                        <input
                                            list="goi-y-dang-bo-bo-phan"
                                            className={inputClass}
                                            disabled={readOnly}
                                            value={form.dang_bo_bo_phan ?? ''}
                                            onChange={set('dang_bo_bo_phan')}
                                            placeholder={PARTY_ORG_DEFAULTS.dang_bo_bo_phan}
                                        />
                                        <datalist id="goi-y-dang-bo-bo-phan">
                                            <option value={PARTY_ORG_DEFAULTS.dang_bo_bo_phan} />
                                        </datalist>
                                    </Field>
                                    <Field label="Chi bộ">
                                        <input
                                            list="goi-y-chi-bo"
                                            className={inputClass}
                                            disabled={readOnly}
                                            value={form.chi_bo ?? ''}
                                            onChange={set('chi_bo')}
                                            placeholder={PARTY_ORG_DEFAULTS.chi_bo}
                                        />
                                        <datalist id="goi-y-chi-bo">
                                            <option value={PARTY_ORG_DEFAULTS.chi_bo} />
                                        </datalist>
                                    </Field>
                                    <Field label="Số lý lịch (10 ô)" hint="Chỉ nhập chữ số, tối đa 10 ký tự.">
                                        <input className={inputClass} disabled={readOnly} maxLength={10} value={form.so_ly_lich ?? ''} onChange={set('so_ly_lich')} />
                                    </Field>
                                    <Field label="Số thẻ đảng viên (12 ô)" fromDsnv>
                                        <input className={dsnvInputClass} disabled={personalReadOnly} maxLength={12} value={emp.so_the_dang ?? ''} onChange={setDsnv('so_the_dang')} />
                                    </Field>

                                    <div className="md:col-span-2 flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800">
                                        <Info size={16} className="mt-0.5 shrink-0" />
                                        <span>
                                            Mục 21 (quá trình công tác — {counts.work} dòng), mục 22 (đào tạo — {counts.training} dòng)
                                            và mục 29 (quan hệ gia đình — {counts.family} dòng) được lấy tự động từ hồ sơ nhân sự khi xuất file Word.
                                        </span>
                                    </div>
                                </div>
                            )}

                            {section === 'nhan-than' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Ảnh 3x4 */}
                                    <div className="md:col-span-2 flex items-center gap-4 p-3 border border-amber-200 bg-amber-50/40 rounded-lg">
                                        <div className="w-[72px] h-[96px] shrink-0 border border-slate-300 rounded bg-white flex items-center justify-center overflow-hidden">
                                            {emp.avatar ? (
                                                <img src={emp.avatar} alt="Ảnh 3x4" className="w-full h-full object-cover" />
                                            ) : (
                                                <ImageOff size={20} className="text-slate-300" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-slate-700">
                                                Ảnh 3×4 <span className="ml-1 text-[10px] font-semibold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">DSNV</span>
                                            </p>
                                            <p className="text-[11px] text-slate-500 mt-0.5 mb-2">In vào khung ảnh góc phải đầu phiếu.</p>
                                            {!personalReadOnly && (
                                                <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-sm text-slate-700 hover:border-amber-400 cursor-pointer">
                                                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                                    {emp.avatar ? 'Đổi ảnh' : 'Tải ảnh lên'}
                                                    <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleAvatarChange} disabled={uploading} />
                                                </label>
                                            )}
                                        </div>
                                    </div>

                                    <Field label="01) Họ và tên khai sinh" fromDsnv hint={isAdmin ? undefined : 'Chỉ admin được đổi họ tên.'}>
                                        <input className={dsnvInputClass} disabled={!isAdmin} value={emp.ho_va_ten ?? ''} onChange={setDsnv('ho_va_ten')} />
                                    </Field>
                                    <Field label="02) Giới tính" fromDsnv>
                                        <input className={dsnvInputClass} disabled={personalReadOnly} value={emp.gioi_tinh ?? ''} onChange={setDsnv('gioi_tinh')} placeholder="Nam / Nữ" />
                                    </Field>
                                    <Field label="03) Tên gọi khác">
                                        <input className={inputClass} disabled={readOnly} value={form.ten_goi_khac ?? ''} onChange={set('ten_goi_khac')} />
                                    </Field>
                                    <Field label="04) Sinh ngày" fromDsnv>
                                        <input type="date" className={dsnvInputClass} disabled={personalReadOnly} value={emp.ngay_sinh ?? ''} onChange={setDsnv('ngay_sinh')} />
                                    </Field>
                                    <Field label="05) Nơi đăng ký khai sinh" className="md:col-span-2">
                                        <input className={inputClass} disabled={readOnly} value={form.noi_dang_ky_khai_sinh ?? ''} onChange={set('noi_dang_ky_khai_sinh')} />
                                    </Field>
                                    <Field label="06) Quê quán" className="md:col-span-2" fromDsnv>
                                        <input className={dsnvInputClass} disabled={personalReadOnly} value={emp.que_quan ?? ''} onChange={setDsnv('que_quan')} />
                                    </Field>
                                    <Field label="07) Nơi thường trú" fromDsnv>
                                        <input className={dsnvInputClass} disabled={personalReadOnly} value={emp.noi_o_hien_nay ?? ''} onChange={setDsnv('noi_o_hien_nay')} />
                                    </Field>
                                    <Field label="Nơi tạm trú">
                                        <input className={inputClass} disabled={readOnly} value={form.noi_tam_tru ?? ''} onChange={set('noi_tam_tru')} />
                                    </Field>
                                    <Field label="08) Dân tộc">
                                        <input className={inputClass} disabled={readOnly} value={form.dan_toc ?? ''} onChange={set('dan_toc')} />
                                    </Field>
                                    <Field label="09) Tôn giáo">
                                        <input className={inputClass} disabled={readOnly} value={form.ton_giao ?? ''} onChange={set('ton_giao')} />
                                    </Field>
                                    <Field label="10) Thành phần gia đình">
                                        <input className={inputClass} disabled={readOnly} value={form.thanh_phan_gia_dinh ?? ''} onChange={set('thanh_phan_gia_dinh')} />
                                    </Field>
                                    <Field label="Chức vụ (hồ sơ nhân sự)" fromDsnv>
                                        <input className={dsnvInputClass} disabled={personalReadOnly} value={emp.chuc_vu ?? ''} onChange={setDsnv('chuc_vu')} />
                                    </Field>
                                    <Field label="11) Nghề nghiệp hiện nay" className="md:col-span-2" hint="Bỏ trống sẽ lấy chức vụ trong hồ sơ nhân sự.">
                                        <input className={inputClass} disabled={readOnly} value={form.nghe_nghiep_hien_nay ?? ''} onChange={set('nghe_nghiep_hien_nay')} />
                                    </Field>
                                </div>
                            )}

                            {section === 'ket-nap' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Field label="12) Ngày vào Đảng" fromDsnv>
                                        <input type="date" className={dsnvInputClass} disabled={personalReadOnly} value={emp.ngay_vao_dang ?? ''} onChange={setDsnv('ngay_vao_dang')} />
                                    </Field>
                                    <Field label="Tại chi bộ">
                                        <input className={inputClass} disabled={readOnly} value={form.chi_bo_ket_nap ?? ''} onChange={set('chi_bo_ket_nap')} />
                                    </Field>
                                    <Field label="Người giới thiệu thứ 1">
                                        <input className={inputClass} disabled={readOnly} value={form.nguoi_gioi_thieu_1 ?? ''} onChange={set('nguoi_gioi_thieu_1')} />
                                    </Field>
                                    <Field label="Chức vụ, đơn vị (người giới thiệu 1)">
                                        <input className={inputClass} disabled={readOnly} value={form.chuc_vu_nguoi_gt_1 ?? ''} onChange={set('chuc_vu_nguoi_gt_1')} />
                                    </Field>
                                    <Field label="Người giới thiệu thứ 2">
                                        <input className={inputClass} disabled={readOnly} value={form.nguoi_gioi_thieu_2 ?? ''} onChange={set('nguoi_gioi_thieu_2')} />
                                    </Field>
                                    <Field label="Chức vụ, đơn vị (người giới thiệu 2)">
                                        <input className={inputClass} disabled={readOnly} value={form.chuc_vu_nguoi_gt_2 ?? ''} onChange={set('chuc_vu_nguoi_gt_2')} />
                                    </Field>
                                    <Field label="Ngày cấp có thẩm quyền ra quyết định kết nạp">
                                        <input type="date" className={inputClass} disabled={readOnly} value={form.ngay_qd_ket_nap ?? ''} onChange={set('ngay_qd_ket_nap')} />
                                    </Field>
                                    <Field label="Ngày chính thức" fromDsnv>
                                        <input type="date" className={dsnvInputClass} disabled={personalReadOnly} value={emp.ngay_chinh_thuc ?? ''} onChange={setDsnv('ngay_chinh_thuc')} />
                                    </Field>
                                    <Field label="Chi bộ công nhận chính thức">
                                        <input className={inputClass} disabled={readOnly} value={form.chi_bo_chinh_thuc ?? ''} onChange={set('chi_bo_chinh_thuc')} />
                                    </Field>
                                    <Field label="13) Ngày được tuyển dụng" fromDsnv>
                                        <input type="date" className={dsnvInputClass} disabled={personalReadOnly} value={emp.thang_nam_tuyen_dung ?? ''} onChange={setDsnv('thang_nam_tuyen_dung')} />
                                    </Field>
                                    <Field label="Cơ quan tuyển dụng">
                                        <input className={inputClass} disabled={readOnly} value={form.co_quan_tuyen_dung ?? ''} onChange={set('co_quan_tuyen_dung')} />
                                    </Field>
                                    <Field label="14) Ngày vào Đoàn TNCS Hồ Chí Minh">
                                        <input type="date" className={inputClass} disabled={readOnly} value={form.ngay_vao_doan ?? ''} onChange={set('ngay_vao_doan')} />
                                    </Field>
                                    <Field label="15) Tham gia các tổ chức xã hội khác" className="md:col-span-2">
                                        <textarea rows={2} className={inputClass} disabled={readOnly} value={form.to_chuc_xa_hoi_khac ?? ''} onChange={set('to_chuc_xa_hoi_khac')} />
                                    </Field>
                                    <Field label="16) Ngày nhập ngũ" fromDsnv>
                                        <input type="date" className={dsnvInputClass} disabled={personalReadOnly} value={emp.thang_nam_nhap_ngu ?? ''} onChange={setDsnv('thang_nam_nhap_ngu')} />
                                    </Field>
                                    <Field label="Ngày xuất ngũ, chuyển ngành">
                                        <input type="date" className={inputClass} disabled={readOnly} value={form.ngay_xuat_ngu ?? ''} onChange={set('ngay_xuat_ngu')} />
                                    </Field>
                                </div>
                            )}

                            {section === 'trinh-do' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Field label="17) Giáo dục phổ thông">
                                        <input className={inputClass} disabled={readOnly} value={form.giao_duc_pho_thong ?? ''} onChange={set('giao_duc_pho_thong')} />
                                    </Field>
                                    <Field label="Chuyên môn, nghiệp vụ">
                                        <input className={inputClass} disabled={readOnly} value={form.chuyen_mon_nghiep_vu ?? ''} onChange={set('chuyen_mon_nghiep_vu')} />
                                    </Field>
                                    <Field label="Học vị cao nhất">
                                        <input className={inputClass} disabled={readOnly} value={form.hoc_vi ?? ''} onChange={set('hoc_vi')} />
                                    </Field>
                                    <Field label="Học hàm cao nhất">
                                        <input className={inputClass} disabled={readOnly} value={form.hoc_ham ?? ''} onChange={set('hoc_ham')} />
                                    </Field>
                                    <Field label="Lý luận chính trị">
                                        <input className={inputClass} disabled={readOnly} value={form.ly_luan_chinh_tri ?? ''} onChange={set('ly_luan_chinh_tri')} />
                                    </Field>
                                    <Field label="Ngoại ngữ">
                                        <input className={inputClass} disabled={readOnly} value={form.ngoai_ngu ?? ''} onChange={set('ngoai_ngu')} />
                                    </Field>
                                    <Field label="Tin học">
                                        <input className={inputClass} disabled={readOnly} value={form.tin_hoc ?? ''} onChange={set('tin_hoc')} />
                                    </Field>
                                    <Field label="18) Tình trạng sức khoẻ bản thân">
                                        <input className={inputClass} disabled={readOnly} value={form.tinh_trang_suc_khoe ?? ''} onChange={set('tinh_trang_suc_khoe')} />
                                    </Field>
                                    <Field label="Thương binh loại">
                                        <input className={inputClass} disabled={readOnly} value={form.thuong_binh_loai ?? ''} onChange={set('thuong_binh_loai')} />
                                    </Field>
                                    <Field label="Gia đình liệt sỹ">
                                        <input className={inputClass} disabled={readOnly} value={form.gia_dinh_liet_sy ?? ''} onChange={set('gia_dinh_liet_sy')} />
                                    </Field>
                                    <Field label="Gia đình có công với cách mạng">
                                        <input className={inputClass} disabled={readOnly} value={form.gia_dinh_co_cong ?? ''} onChange={set('gia_dinh_co_cong')} />
                                    </Field>
                                    <Field label="19) Số căn cước" fromDsnv>
                                        <input className={dsnvInputClass} disabled={personalReadOnly} value={emp.cccd ?? ''} onChange={setDsnv('cccd')} />
                                    </Field>
                                    <Field label="20) Được miễn công tác và sinh hoạt Đảng ngày">
                                        <input type="date" className={inputClass} disabled={readOnly} value={form.ngay_mien_cong_tac_shd ?? ''} onChange={set('ngay_mien_cong_tac_shd')} />
                                    </Field>
                                </div>
                            )}

                            {section === 'khen-thuong' && (
                                <div className="space-y-4">
                                    <Field label="23) Khen thưởng (Huân chương, huy chương, bằng khen)">
                                        <textarea rows={3} className={inputClass} disabled={readOnly} value={form.khen_thuong ?? ''} onChange={set('khen_thuong')} />
                                    </Field>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-2">24) Đã được tặng Huy hiệu Đảng</label>
                                        <div className="flex flex-wrap gap-2">
                                            {HUY_HIEU_DANG_MOC.map(year => {
                                                const active = (form.huy_hieu_dang ?? []).includes(year);
                                                return (
                                                    <button
                                                        key={year}
                                                        type="button"
                                                        disabled={readOnly}
                                                        onClick={() => toggleHuyHieu(year)}
                                                        className={`px-3 py-1.5 rounded-lg text-sm border transition-colors disabled:opacity-60 ${
                                                            active
                                                                ? 'bg-red-600 text-white border-red-600'
                                                                : 'bg-white text-slate-600 border-slate-200 hover:border-red-300'
                                                        }`}
                                                    >
                                                        {year} năm
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <Field label='25) Danh hiệu được phong (chiến sĩ thi đua; anh hùng; nhà giáo, thầy thuốc "nhân dân, ưu tú"...)'>
                                        <textarea rows={2} className={inputClass} disabled={readOnly} value={form.danh_hieu_duoc_phong ?? ''} onChange={set('danh_hieu_duoc_phong')} />
                                    </Field>
                                    <Field label="26) Kỷ luật (Đảng, chính quyền, pháp luật)">
                                        <textarea rows={2} className={inputClass} disabled={readOnly} value={form.ky_luat ?? ''} onChange={set('ky_luat')} />
                                    </Field>
                                </div>
                            )}

                            {section === 'lich-su' && (
                                <div className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Field label="27a) Bị khai trừ/xoá tên/xin ra khỏi Đảng - thời gian">
                                            <input className={inputClass} disabled={readOnly} value={form.ls_khai_tru_thoi_gian ?? ''} onChange={set('ls_khai_tru_thoi_gian')} />
                                        </Field>
                                        <Field label="Tại chi bộ">
                                            <input className={inputClass} disabled={readOnly} value={form.ls_khai_tru_chi_bo ?? ''} onChange={set('ls_khai_tru_chi_bo')} />
                                        </Field>
                                        <Field label="27b) Ngày vào Đảng lần thứ 2">
                                            <input type="date" className={inputClass} disabled={readOnly} value={form.ngay_vao_dang_lan_2 ?? ''} onChange={set('ngay_vao_dang_lan_2')} />
                                        </Field>
                                        <Field label="Tại chi bộ (lần 2)">
                                            <input className={inputClass} disabled={readOnly} value={form.chi_bo_ket_nap_lan_2 ?? ''} onChange={set('chi_bo_ket_nap_lan_2')} />
                                        </Field>
                                        <Field label="Người giới thiệu 1 (lần 2)">
                                            <input className={inputClass} disabled={readOnly} value={form.nguoi_gioi_thieu_1_lan_2 ?? ''} onChange={set('nguoi_gioi_thieu_1_lan_2')} />
                                        </Field>
                                        <Field label="Chức vụ, đơn vị (người giới thiệu 1 - lần 2)">
                                            <input className={inputClass} disabled={readOnly} value={form.chuc_vu_nguoi_gt_1_lan_2 ?? ''} onChange={set('chuc_vu_nguoi_gt_1_lan_2')} />
                                        </Field>
                                        <Field label="Người giới thiệu 2 (lần 2)">
                                            <input className={inputClass} disabled={readOnly} value={form.nguoi_gioi_thieu_2_lan_2 ?? ''} onChange={set('nguoi_gioi_thieu_2_lan_2')} />
                                        </Field>
                                        <Field label="Chức vụ, đơn vị (người giới thiệu 2 - lần 2)">
                                            <input className={inputClass} disabled={readOnly} value={form.chuc_vu_nguoi_gt_2_lan_2 ?? ''} onChange={set('chuc_vu_nguoi_gt_2_lan_2')} />
                                        </Field>
                                        <Field label="Ngày chính thức lần thứ 2">
                                            <input type="date" className={inputClass} disabled={readOnly} value={form.ngay_chinh_thuc_lan_2 ?? ''} onChange={set('ngay_chinh_thuc_lan_2')} />
                                        </Field>
                                        <Field label="Chi bộ công nhận chính thức (lần 2)">
                                            <input className={inputClass} disabled={readOnly} value={form.chi_bo_chinh_thuc_lan_2 ?? ''} onChange={set('chi_bo_chinh_thuc_lan_2')} />
                                        </Field>
                                        <Field label="27c) Ngày được khôi phục đảng tịch">
                                            <input type="date" className={inputClass} disabled={readOnly} value={form.ngay_khoi_phuc_dang_tich ?? ''} onChange={set('ngay_khoi_phuc_dang_tich')} />
                                        </Field>
                                        <Field label="Tại chi bộ (khôi phục đảng tịch)">
                                            <input className={inputClass} disabled={readOnly} value={form.chi_bo_khoi_phuc ?? ''} onChange={set('chi_bo_khoi_phuc')} />
                                        </Field>
                                    </div>

                                    <Field label="27d) Bị xử lý theo pháp luật">
                                        <textarea rows={2} className={inputClass} disabled={readOnly} value={form.bi_xu_ly_phap_luat ?? ''} onChange={set('bi_xu_ly_phap_luat')} />
                                    </Field>
                                    <Field label="27e) Bản thân có làm việc trong chế độ cũ">
                                        <textarea rows={2} className={inputClass} disabled={readOnly} value={form.lam_viec_che_do_cu ?? ''} onChange={set('lam_viec_che_do_cu')} />
                                    </Field>
                                    <Field label="28a) Đã đi nước ngoài (nước nào, lý do, thời gian)">
                                        <textarea rows={2} className={inputClass} disabled={readOnly} value={form.da_di_nuoc_ngoai ?? ''} onChange={set('da_di_nuoc_ngoai')} />
                                    </Field>
                                    <Field label="28b) Quan hệ với tổ chức chính trị, kinh tế, xã hội ở nước ngoài">
                                        <textarea rows={2} className={inputClass} disabled={readOnly} value={form.quan_he_to_chuc_nuoc_ngoai ?? ''} onChange={set('quan_he_to_chuc_nuoc_ngoai')} />
                                    </Field>
                                    <Field label="28c) Có người thân ở nước ngoài">
                                        <textarea rows={2} className={inputClass} disabled={readOnly} value={form.nguoi_than_nuoc_ngoai ?? ''} onChange={set('nguoi_than_nuoc_ngoai')} />
                                    </Field>
                                </div>
                            )}

                            {section === 'kinh-te' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Field label="Tổng thu nhập hộ gia đình / năm (đồng)">
                                        <input className={inputClass} disabled={readOnly} value={form.tong_thu_nhap ?? ''} onChange={set('tong_thu_nhap')} />
                                    </Field>
                                    <Field label="Bình quân 1 người/hộ (đồng)">
                                        <input className={inputClass} disabled={readOnly} value={form.binh_quan_dau_nguoi ?? ''} onChange={set('binh_quan_dau_nguoi')} />
                                    </Field>
                                    <Field label="Nhà được cấp, được thuê - loại nhà">
                                        <input className={inputClass} disabled={readOnly} value={form.nha_duoc_cap_loai ?? ''} onChange={set('nha_duoc_cap_loai')} />
                                    </Field>
                                    <Field label="Tổng diện tích sử dụng (m2)">
                                        <input className={inputClass} disabled={readOnly} value={form.nha_duoc_cap_dien_tich ?? ''} onChange={set('nha_duoc_cap_dien_tich')} />
                                    </Field>
                                    <Field label="Nhà tự mua, tự xây - loại nhà">
                                        <input className={inputClass} disabled={readOnly} value={form.nha_tu_mua_loai ?? ''} onChange={set('nha_tu_mua_loai')} />
                                    </Field>
                                    <Field label="Tổng diện tích sử dụng (m2)">
                                        <input className={inputClass} disabled={readOnly} value={form.nha_tu_mua_dien_tich ?? ''} onChange={set('nha_tu_mua_dien_tich')} />
                                    </Field>
                                    <Field label="Đất được cấp (m2)">
                                        <input className={inputClass} disabled={readOnly} value={form.dat_duoc_cap ?? ''} onChange={set('dat_duoc_cap')} />
                                    </Field>
                                    <Field label="Đất tự mua (m2)">
                                        <input className={inputClass} disabled={readOnly} value={form.dat_tu_mua ?? ''} onChange={set('dat_tu_mua')} />
                                    </Field>
                                    <Field label="Hoạt động kinh tế" className="md:col-span-2">
                                        <input className={inputClass} disabled={readOnly} value={form.hoat_dong_kinh_te ?? ''} onChange={set('hoat_dong_kinh_te')} />
                                    </Field>
                                    <Field label="Diện tích đất kinh doanh trang trại (ha)">
                                        <input className={inputClass} disabled={readOnly} value={form.dien_tich_trang_trai ?? ''} onChange={set('dien_tich_trang_trai')} />
                                    </Field>
                                    <Field label="Số lao động thuê mướn (người)">
                                        <input className={inputClass} disabled={readOnly} value={form.so_lao_dong_thue ?? ''} onChange={set('so_lao_dong_thue')} />
                                    </Field>
                                    <Field label="Tài sản có giá trị từ 50 triệu đồng trở lên">
                                        <input className={inputClass} disabled={readOnly} value={form.tai_san_gia_tri ?? ''} onChange={set('tai_san_gia_tri')} />
                                    </Field>
                                    <Field label="Giá trị (đồng)">
                                        <input className={inputClass} disabled={readOnly} value={form.gia_tri_tai_san ?? ''} onChange={set('gia_tri_tai_san')} />
                                    </Field>
                                    <Field label="Nơi khai phiếu">
                                        <input className={inputClass} disabled={readOnly} value={form.noi_khai ?? ''} onChange={set('noi_khai')} placeholder="Ví dụ: Hà Nội" />
                                    </Field>
                                    <Field label="Ngày khai phiếu">
                                        <input type="date" className={inputClass} disabled={readOnly} value={form.ngay_khai ?? ''} onChange={set('ngay_khai')} />
                                    </Field>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row gap-2 sm:justify-end shrink-0">
                    <button
                        onClick={handleExport}
                        disabled={loading || exporting}
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                        {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                        Xuất phiếu Word (A4 dọc)
                    </button>
                    {(canEdit || canEditPersonal) && (
                        <button
                            onClick={handleSave}
                            disabled={loading || saving || uploading}
                            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Lưu phiếu
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-100"
                    >
                        Quay lại danh sách
                    </button>
                </div>
            </div>
        </div>
    );
};
