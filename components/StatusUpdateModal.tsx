import React, { useState } from 'react';
import { Schedule } from '../types';
import { updateSchedule } from '../services/scheduleService';
import { X, Save } from 'lucide-react';

interface StatusUpdateModalProps {
    schedule: Schedule;
    onClose: () => void;
    onSuccess: () => void;
}

export const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({ schedule, onClose, onSuccess }) => {
    const [status, setStatus] = useState(schedule.trang_thai || 'Đang thực hiện');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await updateSchedule(schedule.id, { ...schedule, trang_thai: status });
            onSuccess();
        } catch (error) {
            console.error("Failed to update status", error);
            alert("Lỗi cập nhật trạng thái");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-4 border-b border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-800">Cập nhật trạng thái</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <p className="text-sm text-slate-500 mb-2">Công việc:</p>
                        <p className="font-medium text-slate-800 line-clamp-2 bg-slate-50 p-2 rounded border border-slate-100">
                            {schedule.noi_dung}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Trạng thái mới</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="Đang thực hiện">Đang thực hiện</option>
                            <option value="Hoàn thành">Hoàn thành</option>
                            <option value="Quá hạn">Quá hạn</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-70"
                        >
                            {loading ? 'Đang lưu...' : <><Save size={18} /> Lưu thay đổi</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
