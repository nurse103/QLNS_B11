import React, { useState, useEffect } from 'react';
import { DutySchedule, getDutySchedules, createDutySchedule, updateDutySchedule, deleteDutySchedule } from '../services/dutyScheduleService';
import { getPersonnel, Employee } from '../services/personnelService';
import { Plus, Search, Filter, Calendar as CalendarIcon, Edit, Trash2, FileSpreadsheet, Download, Upload, X, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';

export const ScheduleModule = () => {
    const [schedules, setSchedules] = useState<DutySchedule[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isNurseDropdownOpen, setIsNurseDropdownOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<DutySchedule>>({});

    // Multi-select Helper State for Nurses
    const [nurseSearch, setNurseSearch] = useState('');

    // Fetch Data
    const fetchData = async () => {
        setLoading(true);
        try {
            const [scheduleData, employeeData] = await Promise.all([
                getDutySchedules(currentMonth, currentYear),
                getPersonnel()
            ]);
            setSchedules(scheduleData || []);
            setEmployees(employeeData || []);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [currentMonth, currentYear]);

    // Handlers
    const handleEdit = (item: DutySchedule) => {
        setFormData(item);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa lịch trực này?")) {
            try {
                await deleteDutySchedule(id);
                fetchData();
            } catch (error) {
                alert("Xóa thất bại");
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (formData.id) {
                await updateDutySchedule(formData.id, formData);
            } else {
                await createDutySchedule(formData as any);
            }
            setIsModalOpen(false);
            setFormData({});
            fetchData();
        } catch (error) {
            alert("Lưu thất bại");
        }
    };

    // Excel Export
    const handleExport = () => {
        const data = schedules.map(s => ({
            "Ngày trực": new Date(s.ngay_truc).toLocaleDateString('vi-VN'),
            "Bác sỹ": s.bac_sy,
            "Nội trú": s.noi_tru,
            "Sau đại học": s.sau_dai_hoc,
            "Điều dưỡng": s.dieu_duong,
            "Phụ điều dưỡng": s.phu_dieu_duong,
            "Ghi chú": s.ghi_chu
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Lich_Truc_T${currentMonth}_${currentYear}`);
        XLSX.writeFile(wb, `Lich_Truc_Thang_${currentMonth}_${currentYear}.xlsx`);
    };

    // Excel Import Template
    const handleDownloadTemplate = () => {
        const headers = ["Ngày trực (YYYY-MM-DD)", "Bác sỹ", "Nội trú", "Sau đại học", "Điều dưỡng", "Phụ điều dưỡng", "Ghi chú"];
        const ws = XLSX.utils.aoa_to_sheet([headers]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Mau_Lich_Truc");
        XLSX.writeFile(wb, "Mau_Nhap_Lieu_Lich_Truc.xlsx");
    };

    // Excel Import
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

            // Skip header row
            const rows = data.slice(1) as any[];
            const newSchedules = rows.map(row => ({
                ngay_truc: row[0], // Assuming YYYY-MM-DD or parsable
                bac_sy: row[1],
                noi_tru: row[2],
                sau_dai_hoc: row[3],
                dieu_duong: row[4],
                phu_dieu_duong: row[5],
                ghi_chu: row[6]
            })).filter(s => s.ngay_truc); // Basic validation

            if (newSchedules.length > 0) {
                // In a real app we might want to bulk create via service
                // For now, let's just loop (or add bulkCreate to service)
                try {
                    // Assuming bulkCreateDutySchedules exists or loop
                    // Let's assume we loop for safety/simplicity in this step if service missing bulk
                    // But I added bulkCreateDutySchedules in service plan.

                    // Call the bulk import directly?
                    // Let's assume we just alert for now, wait, I should verify service has bulk.
                    // Checking service file content... yes, I added bulkCreateDutySchedules.
                    const { bulkCreateDutySchedules } = require('../services/dutyScheduleService');
                    await bulkCreateDutySchedules(newSchedules);

                    alert(`Đã import ${newSchedules.length} dòng.`);
                    fetchData();
                } catch (err: any) {
                    alert("Lỗi import: " + err.message);
                }
            }
        };
        reader.readAsBinaryString(file);
    };

    // Filtered Lists
    const doctors = employees.filter(e =>
        ['Bác sỹ', 'Chủ nhiệm khoa', 'Phó chủ nhiệm khoa', 'Bs', 'BS'].some(role => e.chuc_vu?.toLowerCase().includes(role.toLowerCase()))
    );

    const residents = employees.filter(e =>
        ['Học viên', 'Học viên nội trú', 'Cao học'].some(role => e.danh_hieu?.toLowerCase().includes(role.toLowerCase()) || e.chuc_vu?.toLowerCase().includes(role.toLowerCase()) || e.doi_tuong?.toLowerCase().includes(role.toLowerCase()))
    ); // Expanding logic slightly to catch "Học viên" in various fields if chuc_vu is ambiguous, but user said "chức vụ học viên" so primarily chuc_vu.

    const nurses = employees.filter(e =>
        ['Điều dưỡng viên', 'Điều dưỡng trưởng', 'Y tá', 'ĐD'].some(role => e.chuc_vu?.toLowerCase().includes(role.toLowerCase()))
    );

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <CalendarIcon className="text-blue-600" />
                        Lịch Trực
                    </h1>
                    <p className="text-slate-500 text-sm">Quản lý phân công trực</p>
                </div>

                <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                    <button onClick={() => {
                        if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(currentYear - 1); }
                        else { setCurrentMonth(currentMonth - 1); }
                    }} className="p-2 hover:bg-slate-100 rounded text-slate-600"><ChevronLeft size={18} /></button>
                    <span className="px-4 font-semibold text-slate-700 min-w-[140px] text-center">Tháng {currentMonth}/{currentYear}</span>
                    <button onClick={() => {
                        if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(currentYear + 1); }
                        else { setCurrentMonth(currentMonth + 1); }
                    }} className="p-2 hover:bg-slate-100 rounded text-slate-600"><ChevronRight size={18} /></button>
                </div>

                <div className="flex gap-2">
                    <button onClick={handleDownloadTemplate} className="px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 flex items-center gap-2 text-sm font-medium">
                        <Download size={16} /> Mẫu
                    </button>
                    <div className="relative">
                        <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                        <button className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm font-medium">
                            <Upload size={16} /> Import
                        </button>
                    </div>
                    <button onClick={handleExport} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium">
                        <FileSpreadsheet size={16} /> Export
                    </button>
                    <button onClick={() => { setFormData({}); setIsModalOpen(true); }} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium">
                        <Plus size={16} /> Thêm
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#0078D7] text-white font-medium">
                            <tr>
                                <th className="px-4 py-3 whitespace-nowrap w-32 border-r border-blue-400">Ngày</th>
                                <th className="px-4 py-3 border-r border-blue-400">Bác sỹ</th>
                                <th className="px-4 py-3 border-r border-blue-400">Nội trú</th>
                                <th className="px-4 py-3 border-r border-blue-400">Sau ĐH</th>
                                <th className="px-4 py-3 border-r border-blue-400">Điều dưỡng</th>
                                <th className="px-4 py-3 border-r border-blue-400">Phụ ĐD</th>
                                <th className="px-4 py-3">Ghi chú</th>
                                <th className="px-4 py-3 w-20 text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {schedules.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-slate-500 italic">
                                        Chưa có lịch trực tháng này. Vui lòng thêm mới hoặc Import Excel.
                                    </td>
                                </tr>
                            ) : (
                                schedules.map((schedule) => (
                                    <tr key={schedule.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-slate-900 bg-slate-50/50 border-r border-slate-100">
                                            {schedule.ngay_truc ? new Date(schedule.ngay_truc).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }) : '-'}
                                        </td>
                                        <td className="px-4 py-3 border-r border-slate-100">{schedule.bac_sy}</td>
                                        <td className="px-4 py-3 border-r border-slate-100">{schedule.noi_tru}</td>
                                        <td className="px-4 py-3 border-r border-slate-100">{schedule.sau_dai_hoc}</td>
                                        <td className="px-4 py-3 border-r border-slate-100 max-w-xs truncate" title={schedule.dieu_duong || ''}>{schedule.dieu_duong}</td>
                                        <td className="px-4 py-3 border-r border-slate-100">{schedule.phu_dieu_duong}</td>
                                        <td className="px-4 py-3 text-slate-500 italic">{schedule.ghi_chu}</td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => handleEdit(schedule)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                                                    <Edit size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(schedule.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
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
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800">{formData.id ? 'Cập nhật lịch trực' : 'Thêm lịch trực mới'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Ngày trực <span className="text-red-500">*</span></label>
                                    <input required type="date" value={formData.ngay_truc || ''} onChange={e => setFormData({ ...formData, ngay_truc: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Bác sỹ</label>
                                    <input
                                        type="text"
                                        value={formData.bac_sy || ''}
                                        onChange={e => setFormData({ ...formData, bac_sy: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Chọn bác sỹ..."
                                        list="doctor-suggestions"
                                    />
                                    <datalist id="doctor-suggestions">
                                        {doctors.map(emp => (
                                            <option key={emp.id} value={emp.ho_va_ten}>{emp.chuc_vu}</option>
                                        ))}
                                    </datalist>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Nội trú</label>
                                    <input
                                        type="text"
                                        value={formData.noi_tru || ''}
                                        onChange={e => setFormData({ ...formData, noi_tru: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        list="resident-suggestions"
                                    />
                                    <datalist id="resident-suggestions">
                                        {residents.map(emp => (
                                            <option key={emp.id} value={emp.ho_va_ten}>{emp.chuc_vu}</option>
                                        ))}
                                    </datalist>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Sau đại học</label>
                                    <input type="text" value={formData.sau_dai_hoc || ''} onChange={e => setFormData({ ...formData, sau_dai_hoc: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="col-span-2 space-y-1 relative">
                                    <label className="text-sm font-medium text-slate-700">Điều dưỡng (Chọn nhiều)</label>
                                    <div className="border border-slate-200 rounded-lg p-2 focus-within:ring-2 focus-within:ring-blue-500 bg-white">
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {formData.dieu_duong?.split(', ').filter(Boolean).map((name, idx) => (
                                                <span key={idx} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                                    {name}
                                                    <button type="button" onClick={() => {
                                                        const current = formData.dieu_duong?.split(', ').filter(Boolean) || [];
                                                        const newNames = current.filter(n => n !== name).join(', ');
                                                        setFormData({ ...formData, dieu_duong: newNames });
                                                    }} className="hover:text-blue-900"><X size={12} /></button>
                                                </span>
                                            ))}
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Tìm và chọn điều dưỡng..."
                                                className="w-full outline-none text-sm min-w-[200px] py-1"
                                                value={nurseSearch}
                                                onChange={(e) => setNurseSearch(e.target.value)}
                                                onFocus={() => setIsNurseDropdownOpen(true)}
                                            />
                                            {isNurseDropdownOpen && (
                                                <div className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                                                    <div className="p-2 space-y-1">
                                                        {nurses.filter(n => n.ho_va_ten.toLowerCase().includes(nurseSearch.toLowerCase())).map(emp => {
                                                            const isSelected = formData.dieu_duong?.split(', ').map(s => s.trim()).includes(emp.ho_va_ten);
                                                            return (
                                                                <div
                                                                    key={emp.id}
                                                                    className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-slate-50 ${isSelected ? 'bg-blue-50' : ''}`}
                                                                    onClick={() => {
                                                                        const current = formData.dieu_duong ? formData.dieu_duong.split(', ').filter(Boolean) : [];
                                                                        let newNames;
                                                                        if (isSelected) {
                                                                            newNames = current.filter(n => n !== emp.ho_va_ten).join(', ');
                                                                        } else {
                                                                            newNames = [...current, emp.ho_va_ten].join(', ');
                                                                        }
                                                                        setFormData({ ...formData, dieu_duong: newNames });
                                                                        // Clean search after select? strictly optional. Let's keep it to allow multiple selects.
                                                                    }}
                                                                >
                                                                    <div className={`w-4 h-4 border rounded flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                                                                        {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <p className="text-sm font-medium text-slate-700">{emp.ho_va_ten}</p>
                                                                        <p className="text-xs text-slate-500">{emp.chuc_vu}</p>
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                        {nurses.filter(n => n.ho_va_ten.toLowerCase().includes(nurseSearch.toLowerCase())).length === 0 && (
                                                            <p className="text-sm text-slate-500 text-center py-2">Không tìm thấy kết quả</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {isNurseDropdownOpen && <div className="fixed inset-0 z-40" onClick={() => setIsNurseDropdownOpen(false)}></div>}
                                    <p className="text-xs text-slate-500">Tích chọn vào ô vuông để thêm.</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Phụ điều dưỡng</label>
                                    <input type="text" value={formData.phu_dieu_duong || ''} onChange={e => setFormData({ ...formData, phu_dieu_duong: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="space-y-1 col-span-2">
                                    <label className="text-sm font-medium text-slate-700">Ghi chú</label>
                                    <input type="text" value={formData.ghi_chu || ''} onChange={e => setFormData({ ...formData, ghi_chu: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>
                            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium">Hủy</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
                                    <Save size={18} /> Lưu lịch trực
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
