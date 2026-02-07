import React, { useState, useEffect } from 'react';
import { AbsenceRecord, Employee } from '../types';
import { getAbsencesByDate, createAbsenceRecord, updateAbsenceRecord, deleteAbsenceRecord, checkAbsenceExists } from '../services/absenceService';
import { getPersonnel } from '../services/personnelService';
import { getDutySchedules } from '../services/dutyScheduleService';
import { Plus, Search, Edit, Trash2, X, Save, Calendar, User, FileText, Zap, Copy, CheckSquare, Square } from 'lucide-react';
import * as XLSX from 'xlsx';

export const AbsenceModule = () => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [records, setRecords] = useState<AbsenceRecord[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);

    // Selection & Copy State
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
    const [targetCopyDate, setTargetCopyDate] = useState(new Date().toISOString().split('T')[0]);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<AbsenceRecord | null>(null);
    const [formData, setFormData] = useState<Partial<AbsenceRecord>>({});

    // Search Employee State
    const [searchEmployeeTerm, setSearchEmployeeTerm] = useState('');
    const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
    const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
    const [isAutoGenerating, setIsAutoGenerating] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [data, pers] = await Promise.all([
                getAbsencesByDate(selectedDate),
                getPersonnel()
            ]);
            setRecords(data);
            setEmployees(pers);
            setSelectedIds(new Set()); // Reset selection on date change/fetch
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedDate]);

    // Selection Handlers
    const toggleSelection = (id: number) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === records.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(records.map(r => r.id)));
        }
    };

    // Copy Handler
    const handleCopy = async () => {
        if (selectedIds.size === 0) return;

        try {
            let copiedCount = 0;
            const recordsToCopy = records.filter(r => selectedIds.has(r.id));

            for (const record of recordsToCopy) {
                // Check duplicate on target date
                let exists = false;
                if (record.dsnv_id) {
                    exists = await checkAbsenceExists(record.dsnv_id, targetCopyDate);
                }

                if (!exists) {
                    await createAbsenceRecord({
                        dsnv_id: record.dsnv_id,
                        ho_va_ten: record.ho_va_ten,
                        loai_nghi: record.loai_nghi,
                        ngay_nghi: targetCopyDate,
                        ghi_chu: record.ghi_chu ? `${record.ghi_chu} (Sao chép)` : 'Sao chép'
                    });
                    copiedCount++;
                }
            }

            alert(`Đã sao chép thành công ${copiedCount} bản ghi sang ngày ${new Date(targetCopyDate).toLocaleDateString('vi-VN')}.`);
            setIsCopyModalOpen(false);
            // Optionally redirect to target date?
            if (window.confirm("Bạn có muốn chuyển sang xem ngày vừa sao chép đến không?")) {
                setSelectedDate(targetCopyDate);
            }

        } catch (error) {
            console.error("Copy error:", error);
            alert("Có lỗi xảy ra khi sao chép.");
        }
    };


    // Auto Generate Logic
    const handleAutoGenerate = async () => {
        setIsAutoGenerating(true);
        try {
            // 1. Calculate Yesterday (Duty Date) from Selected Date (Target Date)
            const targetDateObj = new Date(selectedDate);
            const yesterdayObj = new Date(targetDateObj);
            yesterdayObj.setDate(yesterdayObj.getDate() - 1);

            const month = yesterdayObj.getMonth() + 1;
            const year = yesterdayObj.getFullYear();
            const dateStr = yesterdayObj.getDate().toString();

            // 2. Fetch Duty Schedules for the month
            const schedules = await getDutySchedules(month, year);

            // 3. Find Yesterday's Schedule
            // Handle date string matching carefully. `ngay_truc` in DB is YYYY-MM-DD
            const yesterdayISO = yesterdayObj.toISOString().split('T')[0];
            const dutySchedule = schedules.find(s => s.ngay_truc === yesterdayISO);

            if (!dutySchedule) {
                alert(`Không tìm thấy lịch trực ngày hôm qua (${yesterdayISO}).`);
                return;
            }

            if (!dutySchedule.dieu_duong) {
                alert(`Không có điều dưỡng nào được phân công trực ngày ${yesterdayISO}.`);
                return;
            }

            // 4. Extract Names
            const nurseNames = dutySchedule.dieu_duong
                .split(/[\n,]/) // Split by comma or newline
                .map(n => n.trim())
                .filter(n => n.length > 0);

            let addedCount = 0;

            for (const name of nurseNames) {
                // Find employee by name
                const emp = employees.find(e => e.ho_va_ten.toLowerCase() === name.toLowerCase());

                if (emp) {
                    // Check if already exists for target date
                    const exists = await checkAbsenceExists(emp.id, selectedDate);
                    if (!exists) {
                        await createAbsenceRecord({
                            dsnv_id: emp.id,
                            ho_va_ten: emp.ho_va_ten,
                            loai_nghi: 'Nghỉ trực',
                            ngay_nghi: selectedDate,
                            ghi_chu: `Tự động tạo từ lịch trực ngày ${yesterdayISO}`
                        });
                        addedCount++;
                    }
                } else {
                    // Create without ID if not found (optional, but requested "Họ và tên lấy từ danh sách nhân viên" implying FK, but maybe allow text if name mismatch?)
                    // For safety, let's create a record without ID if name doesn't match perfectly, OR just skip.
                    // Requirement says "Họ và tên (lấy từ danh sách nhân viên)", so we should probably stick to matching employees.
                    // But if we can't find them, maybe we should alert? Or just log? 
                    // Let's create a record with just the name to be safe so user sees it.
                    await createAbsenceRecord({
                        dsnv_id: null,
                        ho_va_ten: name,
                        loai_nghi: 'Nghỉ trực',
                        ngay_nghi: selectedDate,
                        ghi_chu: `Tự động tạo từ lịch trực (Không tìm thấy nhân viên trong DS)`
                    });
                    addedCount++;
                }
            }

            alert(`Đã tạo thành công ${addedCount} bản ghi nghỉ trực.`);
            fetchData();

        } catch (error) {
            console.error("Auto generate error:", error);
            alert("Có lỗi xảy ra khi tự động tạo.");
        } finally {
            setIsAutoGenerating(false);
        }
    };

    // Form Handlers
    const handleOpenModal = (record?: AbsenceRecord) => {
        if (record) {
            setEditingRecord(record);
            setFormData(record);
        } else {
            setEditingRecord(null);
            setFormData({
                loai_nghi: 'Nghỉ trực',
                ngay_nghi: selectedDate
            });
        }
        setSearchEmployeeTerm('');
        setShowEmployeeDropdown(false);
        setIsModalOpen(true);
    };

    const handleEmployeeSearch = (term: string) => {
        setSearchEmployeeTerm(term);
        if (term.trim()) {
            const filtered = employees.filter(e => e.ho_va_ten.toLowerCase().includes(term.toLowerCase()));
            setFilteredEmployees(filtered);
            setShowEmployeeDropdown(true);
        } else {
            setFilteredEmployees([]);
            setShowEmployeeDropdown(false);
        }
    };

    const selectEmployee = (emp: Employee) => {
        setFormData({
            ...formData,
            dsnv_id: emp.id,
            ho_va_ten: emp.ho_va_ten
        });
        setSearchEmployeeTerm('');
        setShowEmployeeDropdown(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingRecord?.id) {
                await updateAbsenceRecord(editingRecord.id, formData);
                alert("Cập nhật thành công!");
            } else {
                await createAbsenceRecord(formData as any);
                alert("Thêm mới thành công!");
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error("Submit error:", error);
            alert("Có lỗi xảy ra, vui lòng thử lại.");
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa bản ghi này?")) {
            try {
                await deleteAbsenceRecord(id);
                fetchData();
            } catch (error) {
                alert("Xóa thất bại.");
            }
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Quản lý Quân số nghỉ</h1>
                    <p className="text-slate-500 text-sm mt-1">Theo dõi quân số nghỉ hàng ngày</p>
                </div>
                <div className="flex gap-2">
                    {selectedIds.size > 0 && (
                        <button
                            onClick={() => setIsCopyModalOpen(true)}
                            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm animate-in fade-in"
                        >
                            <Copy size={18} /> Sao chép ({selectedIds.size})
                        </button>
                    )}
                    <button
                        onClick={handleAutoGenerate}
                        disabled={isAutoGenerating}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
                    >
                        <Zap size={18} /> {isAutoGenerating ? 'Đang tạo...' : 'Tự động tạo nghỉ trực'}
                    </button>
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
                    >
                        <Plus size={18} /> Thêm mới
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex gap-4 bg-slate-50/50 items-center">
                    <div className="font-medium text-slate-700">Xem ngày:</div>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                </div>

                {loading ? (
                    <div className="p-12 text-center text-slate-500">Đang tải dữ liệu...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-[#009900] text-white font-medium">
                                <tr>
                                    <th className="px-4 py-4 w-12 text-center">
                                        <button onClick={handleSelectAll} className="hover:text-slate-200">
                                            {records.length > 0 && selectedIds.size === records.length ? <CheckSquare size={18} /> : <Square size={18} />}
                                        </button>
                                    </th>
                                    <th className="px-6 py-4">Họ và tên</th>
                                    <th className="px-6 py-4">Loại nghỉ</th>
                                    <th className="px-6 py-4">Ngày nghỉ</th>
                                    <th className="px-6 py-4">Ghi chú</th>
                                    <th className="px-6 py-4 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {records.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">
                                            Không có quân số nghỉ trong ngày này.
                                        </td>
                                    </tr>
                                ) : records.map((record) => (
                                    <tr key={record.id} className={`hover:bg-slate-50 transition-colors group ${selectedIds.has(record.id) ? 'bg-blue-50/50' : ''}`}>
                                        <td className="px-4 py-4 text-center">
                                            <button
                                                onClick={() => toggleSelection(record.id)}
                                                className={`transition-colors ${selectedIds.has(record.id) ? 'text-blue-600' : 'text-slate-300 hover:text-slate-400'}`}
                                            >
                                                {selectedIds.has(record.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-900">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                                                    {record.ho_va_ten?.charAt(0)}
                                                </div>
                                                {record.ho_va_ten}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${record.loai_nghi === 'Nghỉ trực' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                record.loai_nghi === 'Nghỉ ốm' ? 'bg-red-50 text-red-700 border-red-100' :
                                                    'bg-blue-50 text-blue-700 border-blue-100'
                                                }`}>
                                                {record.loai_nghi}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {new Date(record.ngay_nghi).toLocaleDateString('vi-VN')}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 italic">
                                            {record.ghi_chu || '---'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleOpenModal(record)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                    <Edit size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(record.id)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Copy Modal */}
            {isCopyModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="text-xl font-bold text-slate-800">Sao chép sang ngày khác</h2>
                            <p className="text-sm text-slate-500 mt-1">Đã chọn {selectedIds.size} bản ghi</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Chọn ngày đích</label>
                                <input
                                    type="date"
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={targetCopyDate}
                                    onChange={e => setTargetCopyDate(e.target.value)}
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    onClick={() => setIsCopyModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 font-medium rounded-lg transition-colors"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    onClick={handleCopy}
                                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2"
                                >
                                    <Copy size={16} /> Sao chép
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="text-xl font-bold text-slate-800">
                                {editingRecord ? 'Cập nhật quân số nghỉ' : 'Thêm mới quân số nghỉ'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Employee Selector */}
                            <div className="space-y-2 relative">
                                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                    <User size={16} /> Chọn nhân viên <span className="text-red-500">*</span>
                                </label>
                                {!editingRecord ? (
                                    <div className="relative">
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pl-10"
                                            placeholder="Nhập tên để tìm kiếm..."
                                            value={formData.ho_va_ten || searchEmployeeTerm}
                                            onChange={(e) => {
                                                setFormData({ ...formData, ho_va_ten: undefined });
                                                handleEmployeeSearch(e.target.value);
                                            }}
                                            onFocus={() => { if (searchEmployeeTerm) setShowEmployeeDropdown(true); }}
                                        />
                                        <Search className="absolute left-3 top-3 text-slate-400" size={18} />

                                        {showEmployeeDropdown && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
                                                {filteredEmployees.length > 0 ? filteredEmployees.map(emp => (
                                                    <div
                                                        key={emp.id}
                                                        className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0"
                                                        onClick={() => selectEmployee(emp)}
                                                    >
                                                        <div className="font-medium text-slate-800">{emp.ho_va_ten}</div>
                                                        <div className="text-xs text-slate-500">{emp.cap_bac} - {emp.chuc_vu}</div>
                                                    </div>
                                                )) : (
                                                    <div className="p-4 text-center text-slate-500 text-sm">Không tìm thấy nhân viên</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium">
                                        {formData.ho_va_ten}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Loại nghỉ</label>
                                <select
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.loai_nghi || 'Nghỉ trực'}
                                    onChange={e => setFormData({ ...formData, loai_nghi: e.target.value })}
                                >
                                    <option value="Nghỉ trực">Nghỉ trực</option>
                                    <option value="Công tác">Công tác</option>
                                    <option value="Đi tăng cường">Đi tăng cường</option>
                                    <option value="Đi học">Đi học</option>
                                    <option value="Khác">Khác</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Ngày nghỉ</label>
                                <input
                                    type="date"
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.ngay_nghi || ''}
                                    onChange={e => setFormData({ ...formData, ngay_nghi: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Ghi chú</label>
                                <textarea
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                                    value={formData.ghi_chu || ''}
                                    onChange={e => setFormData({ ...formData, ghi_chu: e.target.value })}
                                    placeholder="Ghi chú chi tiết..."
                                ></textarea>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 font-medium rounded-lg transition-colors"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm shadow-blue-200 transition-colors flex items-center gap-2"
                                >
                                    <Save size={18} /> Lưu thông tin
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
