import React from 'react';
import { Schedule, Employee } from '../types';
import { Calendar, FileText, Edit, Trash2, Eye } from 'lucide-react';

interface ScheduleListProps {
    schedules: Schedule[];
    employees: Employee[];
    onEdit: (schedule: Schedule) => void;
    onDelete: (id: number) => void;
}

export const ScheduleList: React.FC<ScheduleListProps> = ({ schedules, employees, onEdit, onDelete }) => {
    const getEmployeeNames = (ids: string[]) => {
        return ids.map(id => employees.find(e => e.id.toString() === id)?.ho_va_ten).filter(Boolean).join(', ');
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('vi-VN', {
            year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                    <tr>
                        <th className="px-6 py-3">Nội dung</th>
                        <th className="px-6 py-3">Thời gian</th>
                        <th className="px-6 py-3">Trạng thái</th>
                        <th className="px-6 py-3">Người thực hiện</th>
                        <th className="px-6 py-3">File</th>
                        <th className="px-6 py-3 text-right">Thao tác</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {schedules.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                Chưa có lịch công tác nào.
                            </td>
                        </tr>
                    ) : (
                        schedules.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50 group">
                                <td className="px-6 py-3 font-medium text-slate-900">
                                    <div className="flex flex-col">
                                        <span>{item.noi_dung}</span>
                                        {item.chi_tiet && <span className="text-xs text-slate-500 font-normal truncate max-w-xs">{item.chi_tiet}</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-3">
                                    <div className="flex flex-col text-xs">
                                        <span className="text-green-600">Từ: {formatDate(item.ngay_bat_dau)}</span>
                                        <span className="text-red-500">Đến: {formatDate(item.ngay_ket_thuc)}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.trang_thai === 'Hoàn thành' ? 'bg-green-100 text-green-700' :
                                            item.trang_thai === 'Quá hạn' ? 'bg-red-100 text-red-700' :
                                                'bg-blue-100 text-blue-700'
                                        }`}>
                                        {item.trang_thai || 'Đang thực hiện'}
                                    </span>
                                </td>
                                <td className="px-6 py-3">
                                    <span className="text-slate-600 truncate block max-w-xs" title={getEmployeeNames(item.nguoi_thuc_hien)}>
                                        {getEmployeeNames(item.nguoi_thuc_hien) || '---'}
                                    </span>
                                </td>
                                <td className="px-6 py-3">
                                    {item.file_dinh_kem ? (
                                        <a
                                            href={item.file_dinh_kem}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                        >
                                            <FileText size={16} /> Xem
                                        </a>
                                    ) : (
                                        <span className="text-slate-400">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => onEdit(item)}
                                            className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                                            title="Sửa"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => onDelete(item.id)}
                                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                                            title="Xóa"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};
