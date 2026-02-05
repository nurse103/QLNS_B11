import React from 'react';
import { Schedule, Employee } from '../types';
import { X, Calendar, User, FileText, Info } from 'lucide-react';

interface ScheduleDetailsModalProps {
    schedule: Schedule;
    employees: Employee[];
    onClose: () => void;
}

export const ScheduleDetailsModal: React.FC<ScheduleDetailsModalProps> = ({ schedule, employees, onClose }) => {

    const getEmployeeNames = (ids: string[]) => {
        return ids.map(id => employees.find(e => e.id.toString() === id)?.ho_va_ten).filter(Boolean).join(', ');
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('vi-VN', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-start p-6 border-b border-slate-100 bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 leading-tight">{schedule.noi_dung}</h2>
                        <span className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${schedule.trang_thai === 'Hoàn thành' ? 'bg-green-100 text-green-700 border-green-200' :
                                schedule.trang_thai === 'Quá hạn' ? 'bg-red-100 text-red-700 border-red-200' :
                                    'bg-blue-100 text-blue-700 border-blue-200'
                            }`}>
                            {schedule.trang_thai || 'Đang thực hiện'}
                        </span>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-200">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Time */}
                    <div className="flex gap-4">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg h-fit">
                            <Calendar size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900 mb-1">Thời gian</h3>
                            <div className="space-y-1 text-sm text-slate-600">
                                <p><span className="font-medium">Bắt đầu:</span> {formatDate(schedule.ngay_bat_dau)}</p>
                                <p><span className="font-medium">Kết thúc:</span> {formatDate(schedule.ngay_ket_thuc)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Details */}
                    <div className="flex gap-4">
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg h-fit">
                            <Info size={20} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-semibold text-slate-900 mb-1">Chi tiết công việc</h3>
                            <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-wrap">
                                {schedule.chi_tiet || "Không có mô tả chi tiết."}
                            </div>
                        </div>
                    </div>

                    {/* Performers */}
                    <div className="flex gap-4">
                        <div className="p-2 bg-orange-50 text-orange-600 rounded-lg h-fit">
                            <User size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900 mb-1">Người thực hiện</h3>
                            <p className="text-sm text-slate-600">
                                {getEmployeeNames(schedule.nguoi_thuc_hien) || <span className="italic text-slate-400">Chưa phân công</span>}
                            </p>
                        </div>
                    </div>

                    {/* Attachments */}
                    {schedule.file_dinh_kem && (
                        <div className="flex gap-4">
                            <div className="p-2 bg-slate-100 text-slate-600 rounded-lg h-fit">
                                <FileText size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900 mb-1">Tài liệu đính kèm</h3>
                                <a
                                    href={schedule.file_dinh_kem}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline hover:text-blue-800"
                                >
                                    Xem tài liệu
                                    <FileText size={14} />
                                </a>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-100 transition-colors shadow-sm"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};
