
import React, { useState, useEffect } from 'react';
import { DutySchedule, getDutySchedules, createDutySchedule, updateDutySchedule, deleteDutySchedule } from '../services/dutyScheduleService';
import { getPersonnel, Employee } from '../services/personnelService';
import { Plus, Search, Calendar as CalendarIcon, Edit, Trash2, FileSpreadsheet, Download, Upload, X, Save, ChevronLeft, ChevronRight, Filter, BarChart3, Clock } from 'lucide-react';
import * as XLSX from 'xlsx';
import { usePermissions } from '../hooks/usePermissions';

export const ScheduleModule = () => {
    const { can_add, can_edit, can_delete } = usePermissions('duty_schedule');
    const [schedules, setSchedules] = useState<DutySchedule[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);

    // Default to current month for initial fetch, but we might want to fetch more if doing custom ranges.
    // However, the service `getDutySchedules` creates/fetches by month. 
    // To support "Custom Range", we might need to fetch a broader range or rely on the user to pick the month context first.
    // For now, let's keep the Month/Year context for "fetching" but allow filtering *within* that loaded data, 
    // OR allow fetching range. The current service `getDutySchedules(month, year)` is specific.
    // Let's stick to client-side filtering of the *fetched* month/year for safety first, or fetch multiple months?
    // User asked for "Today", "This Week". If "This Week" spans months, we might miss data if we only fetch one month.
    // But refactoring the backend service to fetch by range is safer.
    // Let's assume for now we work with the "View Month". 
    // Actually, "Today" might be in a different month than the "View Month" if user navigated.
    // Let's auto-switch the "View Month" when clicking "Today".

    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isNurseDropdownOpen, setIsNurseDropdownOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<DutySchedule>>({});

    // Filter State
    const [filterType, setFilterType] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
    const [customDateFrom, setCustomDateFrom] = useState('');
    const [customDateTo, setCustomDateTo] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Nurse Multi-select Helper
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

    // Helpers
    const getWeekRange = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        const start = new Date(d.setDate(diff));
        const end = new Date(d.setDate(diff + 6));
        return { start, end };
    };

    const isWeekend = (dateStr: string) => {
        const d = new Date(dateStr);
        const day = d.getDay();
        return day === 0 || day === 6; // Sunday or Saturday
    };

    // Filter Logic
    const getFilteredSchedules = () => {
        let filtered = [...schedules];

        // 1. Date Filters
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        if (filterType === 'today') {
            filtered = filtered.filter(s => s.ngay_truc === todayStr);
        } else if (filterType === 'week') {
            const { start, end } = getWeekRange(today);
            const startStr = start.toISOString().split('T')[0];
            const endStr = end.toISOString().split('T')[0];
            // Simple string comparison works for YYYY-MM-DD
            filtered = filtered.filter(s => s.ngay_truc >= startStr && s.ngay_truc <= endStr);
        } else if (filterType === 'month') {
            // Already fetched by month, but ensures strictness if we change fetching later
            // For now, basically 'all' in current view, effectively.
        } else if (filterType === 'custom' && customDateFrom && customDateTo) {
            filtered = filtered.filter(s => s.ngay_truc >= customDateFrom && s.ngay_truc <= customDateTo);
        }

        // 2. Search Filter (Name, etc.)
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            filtered = filtered.filter(s =>
                (s.bac_sy && s.bac_sy.toLowerCase().includes(lower)) ||

                (s.sau_dai_hoc && s.sau_dai_hoc.toLowerCase().includes(lower)) ||
                (s.dieu_duong && s.dieu_duong.toLowerCase().includes(lower)) ||
                (s.phu_dieu_duong && s.phu_dieu_duong.toLowerCase().includes(lower)) ||
                (s.ghi_chu && s.ghi_chu.toLowerCase().includes(lower))
            );
        }

        // Sort by date descending
        return filtered.sort((a, b) => new Date(b.ngay_truc).getTime() - new Date(a.ngay_truc).getTime());
    };

    const filteredSchedules = getFilteredSchedules();

    // Statistics
    const stats = {
        total: filteredSchedules.length,
        normal: filteredSchedules.filter(s => !isWeekend(s.ngay_truc)).length,
        holiday: filteredSchedules.filter(s => isWeekend(s.ngay_truc)).length
    };

    // Handlers
    const handleQuickFilter = (type: 'all' | 'today' | 'week' | 'month') => {
        setFilterType(type);
        setCustomDateFrom('');
        setCustomDateTo('');

        // If "current month" view doesn't match "today", we might need to jump?
        // Ideally we'd fetch the relevant data. For simplicity, we stay in current view 
        // but user might not see "today" if they are viewing last month.
        // Let's auto-jump to current month if Today/Week/Month is clicked.
        if (type !== 'all') {
            const now = new Date();
            if (now.getMonth() + 1 !== currentMonth || now.getFullYear() !== currentYear) {
                setCurrentMonth(now.getMonth() + 1);
                setCurrentYear(now.getFullYear());
            }
        }
    };

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
        // Export the FILTERED list
        const data = filteredSchedules.map(s => ({
            "Ngày trực": new Date(s.ngay_truc).toLocaleDateString('vi-VN'),
            "Bác sỹ": s.bac_sy,
            "Sau đại học": s.sau_dai_hoc,
            "Điều dưỡng": s.dieu_duong,
            "Phụ điều dưỡng": s.phu_dieu_duong,
            "Ghi chú": s.ghi_chu
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Lich_Truc");
        XLSX.writeFile(wb, "Lich_Truc_Export.xlsx");
    };

    const handleDownloadTemplate = () => {
        const headers = ["Ngày trực (YYYY-MM-DD)", "Bác sỹ", "Sau đại học", "Điều dưỡng", "Phụ điều dưỡng", "Ghi chú"];
        const ws = XLSX.utils.aoa_to_sheet([headers]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Mau_Lich_Truc");
        XLSX.writeFile(wb, "Mau_Nhap_Lieu_Lich_Truc.xlsx");
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
            const rows = data.slice(1) as any[];
            const newSchedules = rows.map(row => ({
                ngay_truc: row[0],
                bac_sy: row[1],
                sau_dai_hoc: row[2],
                dieu_duong: row[3],
                phu_dieu_duong: row[4],
                ghi_chu: row[5]
            })).filter(s => s.ngay_truc);

            if (newSchedules.length > 0) {
                try {
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

    // Lists for dropdown
    const doctors = employees.filter(e => ['Bác sỹ', 'Chủ nhiệm khoa', 'Phó chủ nhiệm khoa', 'Bs', 'BS'].some(role => e.chuc_vu?.toLowerCase().includes(role.toLowerCase())));
    const residents = employees.filter(e => ['Học viên', 'Nội trú', 'Cao học'].some(role => e.danh_hieu?.toLowerCase().includes(role.toLowerCase()) || e.chuc_vu?.toLowerCase().includes(role.toLowerCase())));
    const nurses = employees.filter(e => ['Điều dưỡng', 'Y tá', 'ĐD'].some(role => e.chuc_vu?.toLowerCase().includes(role.toLowerCase())));

    return (
        <div className="p-4 md:p-6 space-y-6 bg-slate-50 min-h-screen">
            {/* 1. Header & Controls */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <CalendarIcon className="text-blue-600" /> Lịch Trực
                        </h1>
                        <p className="text-slate-500 text-sm">Quản lý và thống kê phân công trực</p>
                    </div>

                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        {can_add && (
                            <button onClick={() => { setFormData({}); setIsModalOpen(true); }} className="flex-1 md:flex-none justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium shadow-sm transition-all active:scale-95">
                                <Plus size={18} /> <span className="hidden sm:inline">Thêm lịch</span><span className="sm:hidden">Thêm</span>
                            </button>
                        )}
                        {can_add && (
                            <div className="relative flex-1 md:flex-none">
                                <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                <button className="w-full justify-center px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 flex items-center gap-2 text-sm font-medium shadow-sm">
                                    <Upload size={18} /> <span className="hidden sm:inline">Import</span>
                                </button>
                            </div>
                        )}
                        <button onClick={handleExport} className="flex-1 md:flex-none justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm font-medium shadow-sm">
                            <FileSpreadsheet size={18} /> <span className="hidden sm:inline">Export</span>
                        </button>
                    </div>
                </div>

                {/* 2. Filters & Stats Bar */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* Left: Month Nav & Quick Filters */}
                    <div className="md:col-span-8 space-y-4">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between">
                            {/* Month Nav */}
                            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg w-full sm:w-auto justify-between">
                                <button onClick={() => {
                                    if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(currentYear - 1); }
                                    else { setCurrentMonth(currentMonth - 1); }
                                }} className="p-2 hover:bg-white rounded shadow-sm text-slate-600"><ChevronLeft size={18} /></button>
                                <span className="font-semibold text-slate-700 min-w-[100px] text-center">T{currentMonth}/{currentYear}</span>
                                <button onClick={() => {
                                    if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(currentYear + 1); }
                                    else { setCurrentMonth(currentMonth + 1); }
                                }} className="p-2 hover:bg-white rounded shadow-sm text-slate-600"><ChevronRight size={18} /></button>
                            </div>

                            {/* Quick Filters */}
                            <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                                <button onClick={() => handleQuickFilter('today')} className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterType === 'today' ? 'bg-blue-100 text-blue-700' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>Hôm nay</button>
                                <button onClick={() => handleQuickFilter('week')} className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterType === 'week' ? 'bg-blue-100 text-blue-700' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>Tuần này</button>
                                <button onClick={() => handleQuickFilter('month')} className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterType === 'month' ? 'bg-blue-100 text-blue-700' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>Tháng này</button>
                                <button onClick={() => setFilterType('custom')} className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterType === 'custom' ? 'bg-blue-100 text-blue-700' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>Tùy chọn</button>
                            </div>
                        </div>

                        {/* Custom Range & Search */}
                        <div className="flex flex-col sm:flex-row gap-2">
                            {filterType === 'custom' && (
                                <div className="flex gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-2">
                                    <input type="date" value={customDateFrom} onChange={e => setCustomDateFrom(e.target.value)} className="px-2 py-1 text-sm border rounded outline-none focus:border-blue-500" />
                                    <span className="text-slate-400 self-center">-</span>
                                    <input type="date" value={customDateTo} onChange={e => setCustomDateTo(e.target.value)} className="px-2 py-1 text-sm border rounded outline-none focus:border-blue-500" />
                                </div>
                            )}
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Tìm tên bác sỹ, điều dưỡng..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right: Statistics */}
                    <div className="md:col-span-4 grid grid-cols-2 gap-3">
                        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center items-center text-center">
                            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Trực thường</span>
                            <span className="text-2xl font-bold text-blue-600">{stats.normal}</span>
                            <span className="text-xs text-slate-400">ngày</span>
                        </div>
                        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center items-center text-center">
                            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Trực nghỉ/lễ</span>
                            <span className="text-2xl font-bold text-orange-600">{stats.holiday}</span>
                            <span className="text-xs text-slate-400">ngày</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Schedule List (Responsive) */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">

                {/* Desktop View: Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#0078D7] text-white font-medium sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 whitespace-nowrap w-32 border-r border-blue-400">Ngày</th>
                                <th className="px-4 py-3 border-r border-blue-400">Bác sỹ</th>

                                <th className="px-4 py-3 border-r border-blue-400">Sau ĐH</th>
                                <th className="px-4 py-3 border-r border-blue-400">Điều dưỡng</th>
                                <th className="px-4 py-3 border-r border-blue-400">Phụ ĐD</th>
                                <th className="px-4 py-3">Ghi chú</th>
                                <th className="px-4 py-3 w-20 text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredSchedules.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-slate-500 italic">
                                        Không tìm thấy lịch trực phù hợp.
                                    </td>
                                </tr>
                            ) : (
                                filteredSchedules.map((schedule) => (
                                    <tr key={schedule.id} className={`hover:bg-slate-50 transition-colors ${isWeekend(schedule.ngay_truc) ? 'bg-red-50/30' : ''}`}>
                                        <td className="px-4 py-3 font-medium text-slate-900 border-r border-slate-100">
                                            {schedule.ngay_truc ? (() => {
                                                const d = new Date(schedule.ngay_truc);
                                                return (
                                                    <div>
                                                        <div className={`text-xs uppercase font-bold ${isWeekend(schedule.ngay_truc) ? 'text-red-600' : 'text-slate-500'}`}>
                                                            {d.toLocaleDateString('vi-VN', { weekday: 'short' })}
                                                        </div>
                                                        <div>{d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</div>
                                                    </div>
                                                )
                                            })() : '-'}
                                        </td>
                                        <td className={`px-4 py-3 border-r border-slate-100 font-medium ${isWeekend(schedule.ngay_truc) ? 'text-red-600' : 'text-[#009900]'}`}>{schedule.bac_sy}</td>

                                        <td className="px-4 py-3 border-r border-slate-100 text-slate-600">{schedule.sau_dai_hoc}</td>
                                        <td className={`px-4 py-3 border-r border-slate-100 max-w-xs truncate font-medium ${isWeekend(schedule.ngay_truc) ? 'text-red-600' : 'text-blue-700'}`} title={schedule.dieu_duong || ''}>{schedule.dieu_duong}</td>
                                        <td className="px-4 py-3 border-r border-slate-100 text-slate-600">{schedule.phu_dieu_duong}</td>
                                        <td className={`px-4 py-3 font-bold italic text-xs ${isWeekend(schedule.ngay_truc) ? 'text-red-600' : 'text-[#009900]'}`}>{schedule.ghi_chu}</td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {can_edit && (
                                                    <button onClick={() => handleEdit(schedule)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit size={16} /></button>
                                                )}
                                                {can_delete && (
                                                    <button onClick={() => handleDelete(schedule.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View: Cards */}
                <div className="md:hidden p-4 space-y-3 bg-slate-100">
                    {filteredSchedules.length === 0 ? (
                        <div className="text-center text-slate-500 italic py-8 bg-white rounded-lg">Không có lịch trực.</div>
                    ) : (
                        filteredSchedules.map((schedule) => {
                            const date = new Date(schedule.ngay_truc);
                            const isWE = isWeekend(schedule.ngay_truc);
                            return (
                                <div key={schedule.id} className={`bg-white rounded-xl shadow-sm border p-4 space-y-3 ${isWE ? 'border-red-200' : 'border-slate-200'}`}>
                                    {/* Card Header */}
                                    <div className="flex justify-between items-start pb-3 border-b border-slate-50">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center ${isWE ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                                                <span className="text-xs font-bold uppercase">{date.toLocaleDateString('vi-VN', { weekday: 'short' })}</span>
                                                <span className="text-lg font-bold leading-none">{date.getDate()}</span>
                                            </div>
                                            <div>
                                                <div className="text-xs text-slate-400">Tháng {date.getMonth() + 1}</div>
                                                <div className={`text-sm font-semibold ${isWE ? 'text-red-600' : 'text-slate-700'}`}>
                                                    {isWE ? 'Trực nghỉ/lễ' : 'Trực thường'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            {can_edit && <button onClick={() => handleEdit(schedule)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full"><Edit size={18} /></button>}
                                            {can_delete && <button onClick={() => handleDelete(schedule.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full"><Trash2 size={18} /></button>}
                                        </div>
                                    </div>

                                    {/* Card Body */}
                                    <div className="space-y-2 text-sm">
                                        <div className="flex gap-2">
                                            <span className="text-slate-500 w-24 shrink-0 font-medium">Bác sỹ:</span>
                                            <span className={`font-semibold ${isWE ? 'text-red-600' : 'text-[#009900]'}`}>{schedule.bac_sy || '---'}</span>
                                        </div>
                                        {schedule.sau_dai_hoc && (
                                            <div className="flex gap-2">
                                                <span className="text-slate-500 w-24 shrink-0 font-medium">Phụ bác sỹ:</span>
                                                <span className={`${isWE ? 'text-red-600' : 'text-slate-700'}`}>
                                                    {schedule.sau_dai_hoc}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex gap-2">
                                            <span className="text-slate-500 w-24 shrink-0 font-medium">Điều dưỡng:</span>
                                            <span className={`font-medium ${isWE ? 'text-red-600' : 'text-blue-700'}`}>{schedule.dieu_duong || '---'}</span>
                                        </div>
                                        {schedule.phu_dieu_duong && (
                                            <div className="flex gap-2">
                                                <span className="text-slate-500 w-24 shrink-0 font-medium">Phụ ĐD:</span>
                                                <span className="text-slate-700">{schedule.phu_dieu_duong}</span>
                                            </div>
                                        )}
                                        {schedule.ghi_chu && (
                                            <div className="flex gap-2 bg-slate-50 p-2 rounded">
                                                <span className="text-slate-400 shrink-0"><Clock size={14} className="mt-0.5" /></span>
                                                <span className={`font-bold italic text-xs break-all ${isWE ? 'text-red-600' : 'text-[#009900]'}`}>{schedule.ghi_chu}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0">
                            <h3 className="font-bold text-lg text-slate-800">{formData.id ? 'Cập nhật lịch trực' : 'Thêm lịch trực mới'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <div className="overflow-y-auto p-6">
                            <form id="schedule-form" onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1 col-span-2 sm:col-span-1">
                                        <label className="text-sm font-medium text-slate-700">Ngày trực <span className="text-red-500">*</span></label>
                                        <input required type="date" value={formData.ngay_truc || ''} onChange={e => setFormData({ ...formData, ngay_truc: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                    <div className="space-y-1 col-span-2 sm:col-span-1">
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

                                    <div className="space-y-1 col-span-2 sm:col-span-1">
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
                                                    <div className="absolute top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg z-50">
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
                                                                        }}
                                                                    >
                                                                        <div className={`w-4 h-4 border rounded flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                                                                            {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <p className="text-sm font-medium text-slate-700">{emp.ho_va_ten}</p>
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
                                    </div>
                                    <div className="space-y-1 col-span-2 sm:col-span-1">
                                        <label className="text-sm font-medium text-slate-700">Phụ điều dưỡng</label>
                                        <input type="text" value={formData.phu_dieu_duong || ''} onChange={e => setFormData({ ...formData, phu_dieu_duong: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                    <div className="space-y-1 col-span-2">
                                        <label className="text-sm font-medium text-slate-700">Ghi chú</label>
                                        <input type="text" value={formData.ghi_chu || ''} onChange={e => setFormData({ ...formData, ghi_chu: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium">Hủy</button>
                            <button type="submit" form="schedule-form" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
                                <Save size={18} /> Lưu lịch trực
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
