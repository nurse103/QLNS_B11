import React, { useState } from 'react';
import { Employee, Family, WorkHistory, Training, Salary } from '../services/personnelService';
import { X, User, Users, Briefcase, GraduationCap, Activity, Calendar, Phone, MapPin, FileText, Shield, Award } from 'lucide-react';

interface EmployeeDetailsModalProps {
    employee: Employee;
    family: Family[];
    workHistory: WorkHistory[];
    training: Training[];
    salary: Salary[];
    onClose: () => void;
}

export const EmployeeDetailsModal: React.FC<EmployeeDetailsModalProps> = ({
    employee,
    family,
    workHistory,
    training,
    salary,
    onClose,
}) => {
    const [activeTab, setActiveTab] = useState<'general' | 'family' | 'work' | 'training' | 'salary'>('general');

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
                <div className="bg-slate-50 border-b border-slate-200 p-4 md:p-6 flex justify-between items-start shrink-0">
                    <div className="flex gap-3 md:gap-4 items-center">
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl md:text-2xl font-bold shadow-lg ring-4 ring-blue-50">
                            {employee.ho_va_ten ? employee.ho_va_ten.charAt(0).toUpperCase() : 'NV'}
                        </div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-bold text-slate-800 leading-tight">{employee.ho_va_ten}</h2>
                            <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs md:text-sm text-slate-500 mt-1">
                                <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200"><Shield size={12} className="text-blue-500" /> {employee.cap_bac || '---'}</span>
                                <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200"><Briefcase size={12} className="text-orange-500" /> {employee.chuc_vu || '---'}</span>
                                <span className={`flex items-center gap-1 px-2 py-0.5 rounded border ${employee.trang_thai === 'Đang làm việc' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                                    }`}>
                                    <Activity size={14} /> {employee.trang_thai || '---'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-full transition-all shadow-sm border border-transparent hover:border-slate-200">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 px-4 md:px-6 bg-white shrink-0 overflow-x-auto scrollbar-hide sticky top-0 z-10">
                    {[
                        { id: 'general', label: 'Thông tin chung', icon: User },
                        { id: 'family', label: 'Gia đình', icon: Users },
                        { id: 'work', label: 'Công tác', icon: Briefcase },
                        { id: 'training', label: 'Đào tạo', icon: GraduationCap },
                        { id: 'salary', label: 'Lương & Hàm', icon: Award },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id
                                ? 'border-blue-600 text-blue-600 bg-blue-50/20'
                                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
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
                                                    <th className="px-4 py-3">Ghi chú</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {family.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50">
                                                        <td className="px-4 py-3 font-medium text-slate-900">{item.moi_quan_he}</td>
                                                        <td className="px-4 py-3">{item.ho_va_ten}</td>
                                                        <td className="px-4 py-3">{item.nam_sinh}</td>
                                                        <td className="px-4 py-3">{item.nghe_nghiep}</td>
                                                        <td className="px-4 py-3 text-slate-500">{item.ghi_chu}</td>
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
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-bold text-slate-800 text-lg">{item.don_vi_cong_tac}</h4>
                                                        <span className="text-sm font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded">
                                                            {formatDate(item.tu_thang_nam)} - {formatDate(item.den_thang_nam)}
                                                        </span>
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
                                                <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-2">
                                                    <h4 className="font-bold text-slate-800 text-lg">{item.ten_co_so_dao_tao}</h4>
                                                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded mt-2 md:mt-0 w-fit">
                                                        {formatDate(item.tu_thang_nam)} - {formatDate(item.den_thang_nam)}
                                                    </span>
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
        </div>
    );
};
