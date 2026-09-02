import React, { useState } from 'react';
import { Employee, Family, WorkHistory, Training, Salary, sanitizeData } from '../services/personnelService';
import { updateFamilyRecord } from '../services/familyService';
import { updateWorkHistoryRecord } from '../services/workHistoryService';
import { updateTrainingRecord } from '../services/trainingService';
import { updateSalaryRecord } from '../services/salaryService';
import { usePermissions } from '../hooks/usePermissions';
import { X, User, Users, Briefcase, GraduationCap, Activity, Calendar, Phone, MapPin, FileText, Shield, Award, Edit, Save } from 'lucide-react';

type ChildTab = 'family' | 'work' | 'training' | 'salary';

type EditableField = {
    name: string;
    label: string;
    type?: 'text' | 'date' | 'number' | 'textarea';
};

/** Các cột được phép sửa của từng bảng con, theo đúng tên cột trong CSDL. */
const EDITABLE_FIELDS: Record<ChildTab, EditableField[]> = {
    family: [
        { name: 'moi_quan_he', label: 'Mối quan hệ' },
        { name: 'ho_va_ten', label: 'Họ và tên' },
        { name: 'nam_sinh', label: 'Năm sinh', type: 'number' },
        { name: 'nghe_nghiep', label: 'Nghề nghiệp' },
        { name: 'so_dien_thoai', label: 'Số điện thoại' },
        { name: 'que_quan', label: 'Quê quán' },
        { name: 'noi_o_hien_nay', label: 'Nơi ở hiện nay' },
        { name: 'chuc_vu_don_vi', label: 'Chức vụ, đơn vị' },
        { name: 'ghi_chu', label: 'Ghi chú', type: 'textarea' },
    ],
    work: [
        { name: 'tu_thang_nam', label: 'Từ ngày', type: 'date' },
        { name: 'den_thang_nam', label: 'Đến ngày', type: 'date' },
        { name: 'don_vi_cong_tac', label: 'Đơn vị công tác' },
        { name: 'cap_bac', label: 'Cấp bậc' },
        { name: 'chuc_vu', label: 'Chức vụ' },
        { name: 'ghi_chu', label: 'Ghi chú', type: 'textarea' },
    ],
    training: [
        { name: 'tu_thang_nam', label: 'Từ ngày', type: 'date' },
        { name: 'den_thang_nam', label: 'Đến ngày', type: 'date' },
        { name: 'ten_co_so_dao_tao', label: 'Cơ sở đào tạo' },
        { name: 'nganh_dao_tao', label: 'Ngành đào tạo' },
        { name: 'trinh_do_dao_tao', label: 'Trình độ đào tạo' },
        { name: 'hinh_thuc_dao_tao', label: 'Hình thức đào tạo' },
        { name: 'xep_loai_tot_nghiep', label: 'Xếp loại tốt nghiệp' },
        { name: 'ghi_chu', label: 'Ghi chú', type: 'textarea' },
    ],
    salary: [
        { name: 'thang_nam_nhan', label: 'Tháng năm nhận', type: 'date' },
        { name: 'quan_ham', label: 'Quân hàm' },
        { name: 'loai_nhom', label: 'Loại nhóm' },
        { name: 'bac', label: 'Bậc' },
        { name: 'he_so', label: 'Hệ số', type: 'number' },
        { name: 'phan_tram_tnvk', label: '% thâm niên vượt khung', type: 'number' },
        { name: 'hsbl', label: 'Hệ số bảo lưu', type: 'number' },
        { name: 'hinh_thuc', label: 'Hình thức' },
        { name: 'ghi_chu', label: 'Ghi chú', type: 'textarea' },
    ],
};

const UPDATERS: Record<ChildTab, (id: number, updates: any) => Promise<any>> = {
    family: updateFamilyRecord,
    work: updateWorkHistoryRecord,
    training: updateTrainingRecord,
    salary: updateSalaryRecord,
};

const EDIT_TITLES: Record<ChildTab, string> = {
    family: 'Sửa thông tin người thân',
    work: 'Sửa quá trình công tác',
    training: 'Sửa quá trình đào tạo',
    salary: 'Sửa diễn biến lương',
};

interface EmployeeDetailsModalProps {
    employee: Employee;
    family: Family[];
    workHistory: WorkHistory[];
    training: Training[];
    salary: Salary[];
    onClose: () => void;
    /** Gọi sau khi sửa xong để nạp lại dữ liệu chi tiết của nhân viên. */
    onUpdated?: () => void | Promise<void>;
}

export const EmployeeDetailsModal: React.FC<EmployeeDetailsModalProps> = ({
    employee,
    family,
    workHistory,
    training,
    salary,
    onClose,
    onUpdated,
}) => {
    const [activeTab, setActiveTab] = useState<'general' | ChildTab>('general');
    const { can_edit } = usePermissions('p-list');

    const [editing, setEditing] = useState<{ tab: ChildTab; id: number } | null>(null);
    const [editForm, setEditForm] = useState<Record<string, any>>({});
    const [saving, setSaving] = useState(false);

    const startEdit = (tab: ChildTab, record: any) => {
        if (!record?.id) return;
        const initial: Record<string, any> = {};
        EDITABLE_FIELDS[tab].forEach(f => { initial[f.name] = record[f.name] ?? ''; });
        setEditForm(initial);
        setEditing({ tab, id: record.id });
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editing) return;

        const updates: Record<string, any> = {};
        EDITABLE_FIELDS[editing.tab].forEach(f => {
            const raw = editForm[f.name];
            if (f.type === 'number') updates[f.name] = raw === '' || raw === null ? null : Number(raw);
            else updates[f.name] = raw;
        });

        setSaving(true);
        try {
            // sanitizeData đổi chuỗi rỗng thành null, tránh lỗi kiểu date của Postgres
            await UPDATERS[editing.tab](editing.id, sanitizeData(updates));
            setEditing(null);
            await onUpdated?.();
        } catch (error: any) {
            console.error('Cập nhật bản ghi thất bại:', error);
            alert(`Không lưu được thay đổi: ${error?.message ?? 'lỗi không xác định'}`);
        } finally {
            setSaving(false);
        }
    };

    const EditButton = ({ tab, record }: { tab: ChildTab; record: any }) =>
        can_edit && record?.id ? (
            <button
                type="button"
                onClick={() => startEdit(tab, record)}
                title="Sửa bản ghi"
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shrink-0"
            >
                <Edit size={14} />
            </button>
        ) : null;

    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return '---';
        const [year, month, day] = dateStr.split('-');
        if (!year || !month || !day) return dateStr;
        return `${day}/${month}/${year}`;
    };

    const InfoRow = ({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: any }) => (
        <div className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors px-2 rounded-lg">
            {Icon && <Icon size={18} className="text-slate-400 mt-0.5 shrink-0" />}
            <div className="flex-1">
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wide block mb-0.5">{label}</span>
                <span className="text-slate-800 text-sm font-medium">{value || '---'}</span>
            </div>
        </div>
    );

    const SectionTitle = ({ title, icon: Icon, colorClass }: { title: string; icon: any; colorClass: string }) => (
        <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${colorClass}`}>
            <Icon size={20} />
            {title}
        </h3>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm md:p-4 animate-in fade-in duration-200">
            <div className="bg-white md:rounded-2xl rounded-none shadow-2xl w-full max-w-4xl h-full md:h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-slate-50 border-b border-slate-200 p-4 md:p-6 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4 min-w-0">
                        {/* Ảnh 3x4 dùng chung với Phiếu đảng viên (cột dsnv.avatar) */}
                        {employee.avatar ? (
                            <img
                                src={employee.avatar}
                                alt={employee.ho_va_ten}
                                className="w-14 h-[74px] md:w-[66px] md:h-[88px] shrink-0 rounded-lg object-cover border border-slate-200 bg-white shadow-sm"
                            />
                        ) : (
                            <div className="w-14 h-[74px] md:w-[66px] md:h-[88px] shrink-0 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-300 shadow-sm">
                                <User size={26} />
                            </div>
                        )}
                    <div className="flex flex-col min-w-0">
                        <h2 className="text-xl md:text-2xl font-bold text-slate-800 leading-tight">{employee.ho_va_ten}</h2>
                        <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs md:text-sm text-slate-500 mt-1.5">
                            <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm"><Shield size={12} className="text-blue-500" /> {employee.cap_bac || '---'}</span>
                            <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm"><Briefcase size={12} className="text-orange-500" /> {employee.chuc_vu || '---'}</span>
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded border shadow-sm ${employee.trang_thai === 'Đang làm việc' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}>
                                <Activity size={14} /> {employee.trang_thai || '---'}
                            </span>
                        </div>
                    </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all border border-transparent hover:border-red-100 shrink-0">
                        <X size={24} />
                    </button>
                </div>

                {/* Navigation Buttons Grid */}
                <div className="bg-white border-b border-slate-200 p-3 md:p-4 shrink-0">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 max-w-full">
                        {[
                            { id: 'general', label: 'Thông tin chung', icon: User, color: 'blue' },
                            { id: 'family', label: 'Gia đình', icon: Users, color: 'purple' },
                            { id: 'work', label: 'Công tác', icon: Briefcase, color: 'orange' },
                            { id: 'training', label: 'Đào tạo', icon: GraduationCap, color: 'indigo' },
                            { id: 'salary', label: 'Lương & Hàm', icon: Award, color: 'yellow' },
                        ].map((btn) => (
                            <button
                                key={btn.id}
                                onClick={() => setActiveTab(btn.id as any)}
                                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[11px] md:text-xs font-bold transition-all border shadow-sm ${activeTab === btn.id
                                    ? `bg-${btn.color}-600 border-${btn.color}-600 text-white shadow-${btn.color}-100 ring-2 ring-${btn.color}-100 scale-[1.02]`
                                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 active:scale-95'
                                    }`}
                            >
                                <btn.icon size={14} className={activeTab === btn.id ? 'text-white' : `text-${btn.color}-500`} />
                                <span className="truncate">{btn.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-3 md:p-6 bg-slate-50/50">
                    <div className="bg-white md:rounded-xl shadow-sm border border-slate-200 p-4 md:p-6 min-h-full">
                        {activeTab === 'general' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 animate-in slide-in-from-bottom-2 duration-300">
                                <div>
                                    <SectionTitle title="Thông tin cá nhân" icon={User} colorClass="text-blue-600" />
                                    <div className="space-y-1">
                                        <InfoRow label="Ngày sinh" value={formatDate(employee.ngay_sinh)} icon={Calendar} />
                                        <InfoRow label="Giới tính" value={employee.gioi_tinh} icon={User} />
                                        <InfoRow label="Quê quán" value={employee.que_quan} icon={MapPin} />
                                        <InfoRow label="Nơi ở hiện nay" value={employee.noi_o_hien_nay} icon={MapPin} />
                                        <InfoRow label="Số điện thoại" value={employee.dien_thoai} icon={Phone} />
                                        <InfoRow label="Số CCCD" value={employee.cccd} icon={FileText} />
                                        <InfoRow label="Ngày cấp CCCD" value={formatDate(employee.ngay_cap_cccd)} icon={Calendar} />
                                        <InfoRow label="CM Quân đội" value={employee.cmqd} icon={FileText} />
                                        <InfoRow label="Ngày cấp CMQĐ" value={formatDate(employee.ngay_cap_cmqd)} icon={Calendar} />
                                    </div>
                                </div>
                                <div>
                                    <SectionTitle title="Thông tin chính trị & quản lý" icon={Shield} colorClass="text-red-600" />
                                    <div className="space-y-1">
                                        <InfoRow label="Diện quản lý" value={employee.dien_quan_ly} icon={Shield} />
                                        <InfoRow label="Ngày vào Đảng" value={formatDate(employee.ngay_vao_dang)} icon={Calendar} />
                                        <InfoRow label="Ngày chính thức" value={formatDate(employee.ngay_chinh_thuc)} icon={Calendar} />
                                        <InfoRow label="Số thẻ Đảng" value={employee.so_the_dang} icon={FileText} />
                                        <InfoRow label="Ngày cấp thẻ Đảng" value={formatDate(employee.ngay_cap_the_dang)} icon={Calendar} />
                                        <InfoRow label="Ngày nhập ngũ" value={formatDate(employee.thang_nam_nhap_ngu)} icon={Calendar} />
                                        <InfoRow label="Ngày tuyển dụng" value={formatDate(employee.thang_nam_tuyen_dung)} icon={Calendar} />
                                        <InfoRow label="Ngày về khoa" value={formatDate(employee.ngay_ve_khoa_cong_tac)} icon={Calendar} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'family' && (
                            <div className="animate-in slide-in-from-bottom-2 duration-300">
                                <SectionTitle title="Quan hệ gia đình" icon={Users} colorClass="text-purple-600" />
                                {family.length > 0 ? (
                                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 font-medium text-slate-500">
                                                <tr>
                                                    <th className="px-4 py-3">Mối quan hệ</th>
                                                    <th className="px-4 py-3">Họ và tên</th>
                                                    <th className="px-4 py-3">Năm sinh</th>
                                                    <th className="px-4 py-3">Nghề nghiệp</th>
                                                    <th className="px-4 py-3">Quê quán</th>
                                                    <th className="px-4 py-3">Nơi ở hiện nay</th>
                                                    <th className="px-4 py-3">Chức vụ, đơn vị</th>
                                                    <th className="px-4 py-3">Ghi chú</th>
                                                    {can_edit && <th className="px-4 py-3 w-12"></th>}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {family.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50">
                                                        <td className="px-4 py-3 font-medium text-slate-900">{item.moi_quan_he}</td>
                                                        <td className="px-4 py-3">{item.ho_va_ten}</td>
                                                        <td className="px-4 py-3">{item.nam_sinh}</td>
                                                        <td className="px-4 py-3">{item.nghe_nghiep}</td>
                                                        <td className="px-4 py-3">{item.que_quan}</td>
                                                        <td className="px-4 py-3">{item.noi_o_hien_nay}</td>
                                                        <td className="px-4 py-3">{item.chuc_vu_don_vi}</td>
                                                        <td className="px-4 py-3 text-slate-500">{item.ghi_chu}</td>
                                                        {can_edit && (
                                                            <td className="px-4 py-3 text-right">
                                                                <EditButton tab="family" record={item} />
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                        Chưa có thông tin gia đình
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'work' && (
                            <div className="animate-in slide-in-from-bottom-2 duration-300">
                                <SectionTitle title="Lịch sử công tác" icon={Briefcase} colorClass="text-orange-600" />
                                {workHistory.length > 0 ? (
                                    <div className="space-y-6">
                                        {workHistory.map((item, idx) => (
                                            <div key={idx} className="flex gap-4 relative">
                                                <div className="flex flex-col items-center">
                                                    <div className="w-4 h-4 rounded-full bg-orange-500 shadow-sm z-10"></div>
                                                    {idx !== workHistory.length - 1 && <div className="w-0.5 flex-1 bg-slate-200 -my-1"></div>}
                                                </div>
                                                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex-1 mb-2 hover:shadow-md transition-shadow">
                                                    <div className="flex justify-between items-start mb-2 gap-2">
                                                        <h4 className="font-bold text-slate-800 text-lg">{item.don_vi_cong_tac}</h4>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <span className="text-sm font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded">
                                                                {formatDate(item.tu_thang_nam)} - {formatDate(item.den_thang_nam)}
                                                            </span>
                                                            <EditButton tab="work" record={item} />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                                                        <div><span className="font-medium text-slate-500">Cấp bậc:</span> {item.cap_bac || '---'}</div>
                                                        <div><span className="font-medium text-slate-500">Chức vụ:</span> {item.chuc_vu || '---'}</div>
                                                        {item.ghi_chu && <div className="col-span-2 mt-2 pt-2 border-t border-slate-100 italic text-slate-500">{item.ghi_chu}</div>}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                        Chưa có thông tin quá trình công tác
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'training' && (
                            <div className="animate-in slide-in-from-bottom-2 duration-300">
                                <SectionTitle title="Quá trình đào tạo" icon={GraduationCap} colorClass="text-indigo-600" />
                                {training.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-4">
                                        {training.map((item, idx) => (
                                            <div key={idx} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all border-l-4 border-l-indigo-500">
                                                <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-2 gap-2">
                                                    <h4 className="font-bold text-slate-800 text-lg">{item.ten_co_so_dao_tao}</h4>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded w-fit">
                                                            {formatDate(item.tu_thang_nam)} - {formatDate(item.den_thang_nam)}
                                                        </span>
                                                        <EditButton tab="training" record={item} />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4 text-sm text-slate-600 mt-2">
                                                    <div><span className="font-medium text-slate-500">Ngành:</span> {item.nganh_dao_tao}</div>
                                                    <div><span className="font-medium text-slate-500">Trình độ:</span> {item.trinh_do_dao_tao}</div>
                                                    <div><span className="font-medium text-slate-500">Hình thức:</span> {item.hinh_thuc_dao_tao}</div>
                                                    <div><span className="font-medium text-slate-500">Xếp loại:</span> {item.xep_loai_tot_nghiep}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                        Chưa có thông tin đào tạo
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'salary' && (
                            <div className="animate-in slide-in-from-bottom-2 duration-300">
                                <SectionTitle title="Diễn biến lương & Quân hàm" icon={Award} colorClass="text-yellow-600" />
                                {salary.length > 0 ? (
                                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 font-medium text-slate-500">
                                                <tr>
                                                    <th className="px-4 py-3">Thời gian</th>
                                                    <th className="px-4 py-3">Quân hàm</th>
                                                    <th className="px-4 py-3">Loại nhóm</th>
                                                    <th className="px-4 py-3">Bậc</th>
                                                    <th className="px-4 py-3">Hệ số</th>
                                                    <th className="px-4 py-3">Ghi chú</th>
                                                    {can_edit && <th className="px-4 py-3 w-12"></th>}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {salary.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50">
                                                        <td className="px-4 py-3 font-medium text-slate-900">{formatDate(item.thang_nam_nhan)}</td>
                                                        <td className="px-4 py-3 font-medium text-blue-600">{item.quan_ham}</td>
                                                        <td className="px-4 py-3">{item.loai_nhom}</td>
                                                        <td className="px-4 py-3">{item.bac}</td>
                                                        <td className="px-4 py-3 font-bold text-slate-800">{item.he_so}</td>
                                                        <td className="px-4 py-3 text-slate-500">{item.ghi_chu}</td>
                                                        {can_edit && (
                                                            <td className="px-4 py-3 text-right">
                                                                <EditButton tab="salary" record={item} />
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                        Chưa có thông tin lương
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-100 hover:shadow-sm transition-all active:scale-95"
                    >
                        Đóng cửa sổ
                    </button>
                </div>
            </div>

            {/* Cửa sổ sửa bản ghi của bảng con, xếp trên cửa sổ chi tiết */}
            {editing && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                            <h3 className="font-bold text-lg text-slate-800">{EDIT_TITLES[editing.tab]}</h3>
                            <button
                                type="button"
                                onClick={() => setEditing(null)}
                                className="text-slate-400 hover:text-slate-600 p-1"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEdit} className="flex-1 flex flex-col overflow-hidden">
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
                                {EDITABLE_FIELDS[editing.tab].map(field => (
                                    <div
                                        key={field.name}
                                        className={`space-y-1 ${field.type === 'textarea' ? 'md:col-span-2' : ''}`}
                                    >
                                        <label className="text-sm font-medium text-slate-700">{field.label}</label>
                                        {field.type === 'textarea' ? (
                                            <textarea
                                                rows={3}
                                                value={editForm[field.name] ?? ''}
                                                onChange={e => setEditForm({ ...editForm, [field.name]: e.target.value })}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009900]"
                                            />
                                        ) : (
                                            <input
                                                type={field.type ?? 'text'}
                                                step={field.type === 'number' ? 'any' : undefined}
                                                value={editForm[field.name] ?? ''}
                                                onChange={e => setEditForm({ ...editForm, [field.name]: e.target.value })}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009900]"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setEditing(null)}
                                    className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-100 transition-all"
                                >
                                    Huỷ
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2.5 bg-[#009900] text-white font-semibold rounded-xl hover:bg-[#008000] transition-all flex items-center gap-2 disabled:opacity-60"
                                >
                                    <Save size={18} /> {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
