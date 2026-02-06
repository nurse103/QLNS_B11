import React, { useState, useEffect } from 'react';
import { Schedule, Employee } from '../types';
import { getPersonnel } from '../services/personnelService';
import { createSchedule, updateSchedule, uploadFile } from '../services/scheduleService';
import { X, Upload, Save } from 'lucide-react';

interface ScheduleFormProps {
    initialData?: Partial<Schedule>;
    onClose: () => void;
    onSuccess: () => void;
}

export const ScheduleForm: React.FC<ScheduleFormProps> = ({ initialData, onClose, onSuccess }) => {
    const toLocalInputFormat = (dateStr?: string) => {
        if (!dateStr) return '';
        // If it doesn't look like UTC/ISO with timezone, assume it's already local input format
        if (!dateStr.includes('Z') && !dateStr.includes('+')) return dateStr;

        const date = new Date(dateStr);
        const offset = date.getTimezoneOffset() * 60000;
        const localDate = new Date(date.getTime() - offset);
        return localDate.toISOString().slice(0, 16);
    };

    const [formData, setFormData] = useState<Partial<Schedule>>({
        noi_dung: '',
        chi_tiet: '',
        nguoi_thuc_hien: [],
        file_dinh_kem: null,
        ...initialData,
        // Override dates with local format for input
        ngay_bat_dau: toLocalInputFormat(initialData?.ngay_bat_dau),
        ngay_ket_thuc: toLocalInputFormat(initialData?.ngay_ket_thuc),
    });

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [uploading, setUploading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        getPersonnel().then(setEmployees);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const url = await uploadFile(file);
            setFormData(prev => ({ ...prev, file_dinh_kem: url }));
        } catch (error) {
            console.error("Upload failed", error);
            alert("Upload file thất bại");
        } finally {
            setUploading(false);
        }
    };

    const toggleEmployee = (id: string) => {
        setFormData(prev => {
            const current = prev.nguoi_thuc_hien || [];
            if (current.includes(id)) {
                return { ...prev, nguoi_thuc_hien: current.filter(x => x !== id) };
            } else {
                return { ...prev, nguoi_thuc_hien: [...current, id] };
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.noi_dung || !formData.ngay_bat_dau || !formData.ngay_ket_thuc) {
            alert("Vui lòng điền đầy đủ thông tin bắt buộc");
            return;
        }

        try {
            // Convert local input time back to UTC ISO string for preservation
            const payload = {
                ...formData,
                ngay_bat_dau: formData.ngay_bat_dau ? new Date(formData.ngay_bat_dau).toISOString() : null,
                ngay_ket_thuc: formData.ngay_ket_thuc ? new Date(formData.ngay_ket_thuc).toISOString() : null
            };

            if (payload.id) {
                await updateSchedule(payload.id, payload);
            } else {
                await createSchedule(payload as any);
            }
            onSuccess();
        } catch (error) {
            console.error("Save failed", error);
            alert("Lưu thất bại");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800">
                        {formData.id ? 'Cập nhật lịch công tác' : 'Thêm lịch công tác mới'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nội dung <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                name="noi_dung"
                                value={formData.noi_dung}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Bắt đầu <span className="text-red-500">*</span></label>
                                <input
                                    type="datetime-local"
                                    name="ngay_bat_dau"
                                    value={formData.ngay_bat_dau || ''}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Kết thúc <span className="text-red-500">*</span></label>
                                <input
                                    type="datetime-local"
                                    name="ngay_ket_thuc"
                                    value={formData.ngay_ket_thuc || ''}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Chi tiết</label>
                            <textarea
                                name="chi_tiet"
                                value={formData.chi_tiet || ''}
                                onChange={handleChange}
                                rows={3}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Người thực hiện</label>

                            {/* Selected Tags */}
                            <div className="flex flex-wrap gap-2 mb-2">
                                {(formData.nguoi_thuc_hien || []).map(id => {
                                    const emp = employees.find(e => e.id.toString() === id);
                                    return (
                                        <span key={id} className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full flex items-center gap-1 border border-blue-100">
                                            {emp?.ho_va_ten || id}
                                            <button
                                                type="button"
                                                onClick={() => toggleEmployee(id)}
                                                className="hover:text-blue-900"
                                            >
                                                <X size={12} />
                                            </button>
                                        </span>
                                    );
                                })}
                            </div>

                            {/* Search and Dropdown */}
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm nhân viên..."
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <div className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
                                    {employees
                                        .filter(emp =>
                                            !searchTerm ||
                                            emp.ho_va_ten.toLowerCase().includes(searchTerm.toLowerCase())
                                        )
                                        .map(emp => (
                                            <div
                                                key={emp.id}
                                                onClick={() => {
                                                    if (!(formData.nguoi_thuc_hien || []).includes(emp.id.toString())) {
                                                        toggleEmployee(emp.id.toString());
                                                    }
                                                }}
                                                className={`px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 flex items-center justify-between
                                                ${(formData.nguoi_thuc_hien || []).includes(emp.id.toString()) ? 'bg-blue-50 text-blue-700' : 'text-slate-700'}
                                            `}
                                            >
                                                <span>{emp.ho_va_ten}</span>
                                                {(formData.nguoi_thuc_hien || []).includes(emp.id.toString()) && (
                                                    <span className="text-xs text-blue-500">Đã chọn</span>
                                                )}
                                            </div>
                                        ))}
                                    {employees.length > 0 && employees.filter(emp => !searchTerm || emp.ho_va_ten.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                                        <div className="px-3 py-2 text-sm text-slate-500 text-center">Không tìm thấy kết quả</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">File đính kèm</label>
                            <div className="flex items-center space-x-4">
                                <label className="cursor-pointer px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2 text-sm font-medium text-slate-600">
                                    <Upload size={16} />
                                    {uploading ? 'Đang tải lên...' : 'Chọn file (PDF, Ảnh)'}
                                    <input type="file" onChange={handleFileChange} accept=".pdf,image/*" className="hidden" />
                                </label>
                                {formData.file_dinh_kem && (
                                    <span className="text-xs text-green-600 truncate max-w-[200px]">
                                        Đã tải lên file
                                    </span>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Trạng thái</label>
                            <select
                                name="trang_thai"
                                value={formData.trang_thai || 'Đang thực hiện'}
                                onChange={handleChange as any}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="Đang thực hiện">Đang thực hiện</option>
                                <option value="Quá hạn">Quá hạn</option>
                                <option value="Hoàn thành">Hoàn thành</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-50"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={uploading}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 flex items-center gap-2 disabled:opacity-50"
                        >
                            <Save size={16} /> Lưu lại
                        </button>
                    </div>
                </form>
            </div >
        </div >
    );
};
