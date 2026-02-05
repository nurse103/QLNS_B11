import React from 'react';
import { Schedule, Employee } from '../types';
import { Calendar, FileText, Edit, Trash2, Eye, CheckSquare, Clock, User } from 'lucide-react';

interface ScheduleListProps {
    schedules: Schedule[];
    employees: Employee[];
    onEdit: (schedule: Schedule) => void;
    onDelete: (id: number) => void;
    onView: (schedule: Schedule) => void;
    onUpdateStatus: (schedule: Schedule) => void;
}

export const ScheduleList: React.FC<ScheduleListProps> = ({ schedules, employees, onEdit, onDelete, onView, onUpdateStatus }) => {
    const getEmployeeNames = (ids: string[]) => {
        return ids.map(id => employees.find(e => e.id.toString() === id)?.ho_va_ten).filter(Boolean).join(', ');
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('vi-VN', {
            year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
        });
    };

    if (schedules.length === 0) {
        return (
            <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
                Chưa có lịch công tác nào phù hợp.
            </div>
        );
    }

    return (
        <div className="bg-slate-50 md:bg-white rounded-xl">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-[#009900] text-white font-medium">
                        <tr>
                            <th className="px-6 py-4">Nội dung</th>
                            <th className="px-6 py-4">Thời gian</th>
                            <th className="px-6 py-4">Trạng thái</th>
                            <th className="px-6 py-4">Người thực hiện</th>
                            <th className="px-6 py-4 text-center">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {schedules.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50 group transition-colors">
                                <td className="px-6 py-4 font-medium text-slate-900 align-top">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-base cursor-pointer hover:text-blue-600 transition-colors" onClick={() => onView(item)}>{item.noi_dung}</span>
                                        {item.chi_tiet && <span className="text-xs text-slate-500 font-normal line-clamp-2">{item.chi_tiet}</span>}
                                        {item.file_dinh_kem && (
                                            <a
                                                href={item.file_dinh_kem}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="mt-1 text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs w-fit"
                                            >
                                                <FileText size={12} /> File đính kèm
                                            </a>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 align-top">
                                    <div className="flex flex-col text-xs gap-1.5">
                                        <div className="flex items-center gap-1.5 text-slate-600">
                                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                            <span>Từ: <span className="font-medium text-slate-800">{formatDate(item.ngay_bat_dau)}</span></span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-slate-600">
                                            <span className="w-2 h-2 rounded-full bg-red-400"></span>
                                            <span>Đến: <span className="font-medium text-slate-800">{formatDate(item.ngay_ket_thuc)}</span></span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 align-top">
                                    <button
                                        onClick={() => onUpdateStatus(item)}
                                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-transform active:scale-95 ${item.trang_thai === 'Hoàn thành' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' :
                                            item.trang_thai === 'Quá hạn' ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' :
                                                'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                            }`}>
                                        {item.trang_thai || 'Đang thực hiện'}
                                    </button>
                                </td>
                                <td className="px-6 py-4 align-top">
                                    <span className="text-slate-600 block max-w-xs text-xs leading-relaxed">
                                        {getEmployeeNames(item.nguoi_thuc_hien) || <span className="text-slate-400 italic">Chưa phân công</span>}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right align-top">
                                    <div className="flex items-center justify-end gap-1">
                                        <button
                                            onClick={() => onView(item)}
                                            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Xem chi tiết"
                                        >
                                            <Eye size={18} />
                                        </button>
                                        <button
                                            onClick={() => onUpdateStatus(item)}
                                            className="p-2 text-slate-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                            title="Cập nhật trạng thái"
                                        >
                                            <CheckSquare size={18} />
                                        </button>
                                        <button
                                            onClick={() => onEdit(item)}
                                            className="p-2 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                            title="Sửa công việc"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            onClick={() => onDelete(item.id)}
                                            className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Xóa công việc"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {schedules.map((item) => (
                    <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
                        <div className="flex justify-between items-start">
                            <h3 className="text-base font-semibold text-slate-800 line-clamp-2" onClick={() => onView(item)}>
                                {item.noi_dung}
                            </h3>
                            <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${item.trang_thai === 'Hoàn thành' ? 'bg-green-100 text-green-700' :
                                item.trang_thai === 'Quá hạn' ? 'bg-red-100 text-red-700' :
                                    'bg-blue-100 text-blue-700'
                                }`}>
                                {item.trang_thai || 'Đang thực hiện'}
                            </span>
                        </div>

                        <div className="space-y-2 text-sm text-slate-600">
                            <div className="flex items-start gap-2">
                                <Clock size={16} className="mt-0.5 text-slate-400 shrink-0" />
                                <div className="text-xs flex flex-wrap gap-x-2">
                                    <span><span className="font-medium">Từ:</span> {formatDate(item.ngay_bat_dau)}</span>
                                    <span>-</span>
                                    <span><span className="font-medium">Đến:</span> {formatDate(item.ngay_ket_thuc)}</span>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <User size={16} className="mt-0.5 text-slate-400 shrink-0" />
                                <span className="text-xs line-clamp-1">{getEmployeeNames(item.nguoi_thuc_hien) || 'Chưa phân công'}</span>
                            </div>
                            {item.file_dinh_kem && (
                                <div className="flex items-center gap-2">
                                    <FileText size={16} className="text-slate-400 shrink-0" />
                                    <a href={item.file_dinh_kem} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                                        Xem tài liệu đính kèm
                                    </a>
                                </div>
                            )}
                        </div>

                        <div className="pt-3 border-t border-slate-100 grid grid-cols-4 gap-2">
                            <button
                                onClick={() => onView(item)}
                                className="flex flex-col items-center justify-center gap-1 py-1 text-slate-600 hover:bg-slate-50 rounded-lg"
                            >
                                <Eye size={18} />
                                <span className="text-[10px]">Xem</span>
                            </button>
                            <button
                                onClick={() => onUpdateStatus(item)}
                                className="flex flex-col items-center justify-center gap-1 py-1 text-slate-600 hover:bg-slate-50 rounded-lg"
                            >
                                <CheckSquare size={18} />
                                <span className="text-[10px]">Cập nhật</span>
                            </button>
                            <button
                                onClick={() => onEdit(item)}
                                className="flex flex-col items-center justify-center gap-1 py-1 text-slate-600 hover:bg-slate-50 rounded-lg"
                            >
                                <Edit size={18} />
                                <span className="text-[10px]">Sửa</span>
                            </button>
                            <button
                                onClick={() => onDelete(item.id)}
                                className="flex flex-col items-center justify-center gap-1 py-1 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                                <Trash2 size={18} />
                                <span className="text-[10px]">Xóa</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
