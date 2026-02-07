import React, { useState, useEffect } from 'react';
import { getSchedules, createSchedule, updateSchedule, deleteSchedule, uploadFile } from '../services/scheduleService';
import { getPersonnel, Employee } from '../services/personnelService';
import { Schedule } from '../types';
import { Plus, Search, Calendar as CalendarIcon, Edit, Trash2, FileText, Download, Upload, X, Save, Filter, Clock, UserCheck, Paperclip, CheckCircle, XCircle, Circle } from 'lucide-react';
import * as XLSX from 'xlsx';

export const WorkScheduleModule = () => {
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter State
    const [filterType, setFilterType] = useState<'all' | 'today' | 'week' | 'month'>('month');
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<Schedule>>({});
    const [selectedPerformers, setSelectedPerformers] = useState<string[]>([]); // Employee Names
    const [performerSearch, setPerformerSearch] = useState('');
    const [isPerformerDropdownOpen, setIsPerformerDropdownOpen] = useState(false);

    // File Upload State
    const [uploadingFile, setUploadingFile] = useState(false);

    // Fetch Data
    const fetchData = async () => {
        setLoading(true);
        try {
            const [scheduleData, employeeData] = await Promise.all([
                getSchedules(),
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
    }, []);

    // Filter Logic
    const getFilteredSchedules = () => {
        let filtered = [...schedules];
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // 1. Date Filters
        if (filterType === 'today') {
            filtered = filtered.filter(s => {
                const start = s.ngay_bat_dau.split('T')[0];
                const end = s.ngay_ket_thuc.split('T')[0];
                return start >= todayStr && end <= todayStr; // Simplified overlap check: actually usually ranges overlap
                // Better: start <= today && end >= today
            });
            filtered = filtered.filter(s => s.ngay_bat_dau <= todayStr && s.ngay_ket_thuc >= todayStr);
        } else if (filterType === 'week') {
            const day = today.getDay();
            const diff = today.getDate() - day + (day === 0 ? -6 : 1);
            const start = new Date(today.setDate(diff));
            const end = new Date(today.setDate(diff + 6));
            const startStr = start.toISOString().split('T')[0];
            const endStr = end.toISOString().split('T')[0];

            filtered = filtered.filter(s =>
                (s.ngay_bat_dau >= startStr && s.ngay_bat_dau <= endStr) ||
                (s.ngay_ket_thuc >= startStr && s.ngay_ket_thuc <= endStr) ||
                (s.ngay_bat_dau <= startStr && s.ngay_ket_thuc >= endStr)
            );
        } else if (filterType === 'month') {
            filtered = filtered.filter(s => {
                const d = new Date(s.ngay_bat_dau);
                return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
            });
        }

        // 2. Search Filter
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            filtered = filtered.filter(s =>
                s.noi_dung.toLowerCase().includes(lower) ||
                s.chi_tiet.toLowerCase().includes(lower) ||
                (Array.isArray(s.nguoi_thuc_hien) && s.nguoi_thuc_hien.some(p => p.toLowerCase().includes(lower)))
            );
        }

        // Sort by start date desc
        return filtered.sort((a, b) => new Date(b.ngay_bat_dau).getTime() - new Date(a.ngay_bat_dau).getTime());
    };

    const filteredSchedules = getFilteredSchedules();

    // Helper to get name from ID or Name
    const getPerformerName = (idOrName: string | number) => {
        if (!idOrName) return '';
        const strVal = String(idOrName);

        // Try to find by ID first
        const emp = employees.find(e => e.id.toString() === strVal);
        if (emp) return emp.ho_va_ten;

        // If not found by ID, maybe it's already a name or ID doesn't exist
        // Try to find by Name (reverse check, optional but good for mixed data)
        const empByName = employees.find(e => e.ho_va_ten === strVal);
        if (empByName) return empByName.ho_va_ten;

        return strVal;
    };

    // Handlers
    const handleAdd = () => {
        setFormData({
            ngay_bat_dau: new Date().toISOString().split('T')[0],
            ngay_ket_thuc: new Date().toISOString().split('T')[0],
        });
        setSelectedPerformers([]); // IDs
        setIsModalOpen(true);
    };

    const handleEdit = (item: Schedule) => {
        setFormData(item);
        // Ensure nguoi_thuc_hien is array of strings (IDs or Names)
        const performers = Array.isArray(item.nguoi_thuc_hien) ? item.nguoi_thuc_hien : [];
        setSelectedPerformers(performers);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa lịch công tác này?")) {
            try {
                await deleteSchedule(id);
                fetchData();
            } catch (error) {
                console.error("Delete failed", error);
                alert("Xóa thất bại");
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                nguoi_thuc_hien: selectedPerformers // IDs
            };

            // However, scheduleService.ts getSchedules does JSON.parse. This implies the DB column is TEXT or similar containing JSON.
            // If I send array to Supabase JSON column, it's fine.
            // If I send array to TEXT column, I might need to JSON.stringify.
            // Let's assume Supabase JSON column for now as generic 'json' type is best practice.
            // But wait, getSchedules: 
            // return data.map(item => ({ ...item, nguoi_thuc_hien: typeof === 'string' ? JSON.parse(...) : ... }))
            // This suggests it MIGHT be returned as string sometimes.
            // For create/update, let's explicitely cast to any if needed or just pass array.

            // Adjust payload for service if needed.
            // Actually, let's just pass it. The Types match.

            if (formData.id) {
                await updateSchedule(formData.id, payload);
            } else {
                await createSchedule(payload as any);
            }
            setIsModalOpen(false);
            setFormData({});
            fetchData();
        } catch (error) {
            console.error("Save failed", error);
            alert("Lưu thất bại");
        }
    };

    const togglePerformer = (id: string) => {
        setSelectedPerformers(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    // Status Update Modal State
    const [statusModal, setStatusModal] = useState<{
        isOpen: boolean;
        scheduleId: number | null;
        currentStatus: string;
    }>({
        isOpen: false,
        scheduleId: null,
        currentStatus: ''
    });

    const openStatusUpdate = (item: Schedule) => {
        setStatusModal({
            isOpen: true,
            scheduleId: item.id,
            currentStatus: item.trang_thai || 'Chưa thực hiện'
        });
    };

    const handleStatusUpdate = async (newStatus: string) => {
        if (!statusModal.scheduleId) return;

        try {
            // Optimistic update (optional, but good for UX)
            // For now, simpler to just wait or refetch

            await updateSchedule(statusModal.scheduleId, { trang_thai: newStatus });

            setStatusModal({ ...statusModal, isOpen: false });
            fetchData(); // Refresh list
        } catch (error) {
            console.error("Update status failed", error);
            alert("Cập nhật trạng thái thất bại");
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingFile(true);
        try {
            const url = await uploadFile(file);
            setFormData(prev => ({ ...prev, file_dinh_kem: url }));
        } catch (error) {
            console.error("Upload failed", error);
            alert("Upload file thất bại");
        } finally {
            setUploadingFile(false);
        }
    };

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Lịch công tác</h1>
                    <p className="text-slate-500 mt-1">Quản lý các sự kiện, cuộc họp và công việc chung</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleAdd} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 flex items-center gap-2">
                        <Plus size={18} /> Thêm lịch mới
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
                    <button
                        onClick={() => setFilterType('all')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filterType === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        Tất cả
                    </button>
                    <button
                        onClick={() => setFilterType('month')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filterType === 'month' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        Tháng này
                    </button>
                    <button
                        onClick={() => setFilterType('week')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filterType === 'week' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        Tuần này
                    </button>
                    <button
                        onClick={() => setFilterType('today')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filterType === 'today' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        Hôm nay
                    </button>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    {filterType === 'month' && (
                        <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                            <select
                                value={currentMonth}
                                onChange={(e) => setCurrentMonth(Number(e.target.value))}
                                className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer"
                            >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                    <option key={m} value={m}>Tháng {m}</option>
                                ))}
                            </select>
                            <span className="text-slate-400">/</span>
                            <select
                                value={currentYear}
                                onChange={(e) => setCurrentYear(Number(e.target.value))}
                                className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer"
                            >
                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm nội dung, người thực hiện..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                </div>
            </div>

            {/* List - Desktop View */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#009900] text-white font-medium">
                            <tr>
                                <th className="px-6 py-4 w-40">Thời gian</th>
                                <th className="px-6 py-4">Nội dung công việc</th>
                                <th className="px-6 py-4 w-60">Thực hiện</th>
                                <th className="px-6 py-4 w-32">Trạng thái</th>
                                <th className="px-6 py-4 min-w-[200px] border-l border-white/10">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Đang tải dữ liệu...</td>
                                </tr>
                            ) : filteredSchedules.length > 0 ? (
                                filteredSchedules.map((item) => {
                                    const todayStr = new Date().toISOString().split('T')[0];
                                    const isOverdue = item.ngay_ket_thuc < todayStr;
                                    const isCompleted = item.trang_thai === 'Đã hoàn thành';
                                    const displayStatus = isCompleted ? 'Đã hoàn thành' : (isOverdue ? 'Quá hạn' : (item.trang_thai || 'Chưa thực hiện'));
                                    const isRowRed = isOverdue && !isCompleted;

                                    return (
                                        <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${isRowRed ? 'text-red-600' : ''}`}>
                                            <td className="px-6 py-4 align-top">
                                                <div className="flex flex-col gap-1">
                                                    <span className={`font-medium ${isRowRed ? 'text-red-600' : 'text-slate-800'}`}>
                                                        {new Date(item.ngay_bat_dau).toLocaleDateString('vi-VN')}
                                                    </span>
                                                    {item.ngay_bat_dau !== item.ngay_ket_thuc && (
                                                        <span className={`text-xs ${isRowRed ? 'text-red-500' : 'text-slate-500'}`}>
                                                            đến {new Date(item.ngay_ket_thuc).toLocaleDateString('vi-VN')}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <p className={`font-semibold mb-1 ${isRowRed ? 'text-red-600' : 'text-slate-800'}`}>{item.noi_dung}</p>
                                                <p className={`${isRowRed ? 'text-red-500' : 'text-slate-600'} whitespace-pre-line`}>{item.chi_tiet}</p>
                                                {item.file_dinh_kem && (
                                                    <a href={item.file_dinh_kem} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded">
                                                        <Paperclip size={12} /> File đính kèm
                                                    </a>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <div className="flex flex-wrap gap-1">
                                                    {Array.isArray(item.nguoi_thuc_hien) && item.nguoi_thuc_hien.length > 0 ? (
                                                        item.nguoi_thuc_hien.map((p, idx) => (
                                                            <span key={idx} className={`inline-flex items-center px-2 py-1 rounded text-xs ${isRowRed ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                                                                {getPerformerName(p)}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className={`${isRowRed ? 'text-red-400' : 'text-slate-400'} italic`}>--</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${displayStatus === 'Đã hoàn thành' ? 'bg-green-50 text-green-700 border-green-200' :
                                                    displayStatus === 'Đang thực hiện' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                        displayStatus === 'Đã hủy' ? 'bg-slate-50 text-slate-700 border-slate-200' :
                                                            displayStatus === 'Quá hạn' ? 'bg-red-50 text-red-700 border-red-200' :
                                                                'bg-slate-50 text-slate-700 border-slate-200'
                                                    }`}
                                                >
                                                    {displayStatus}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 align-top border-l border-slate-50">
                                                <div className="flex flex-col gap-2">
                                                    <button
                                                        onClick={() => openStatusUpdate(item)}
                                                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors w-full"
                                                    >
                                                        <UserCheck size={16} /> Cập nhật
                                                    </button>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleEdit(item)}
                                                            className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                                        >
                                                            <Edit size={16} /> Sửa
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(item.id)}
                                                            className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 size={16} /> Xóa
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                                        Không tìm thấy lịch công tác nào.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* List - Mobile View (Cards) */}
            <div className="md:hidden space-y-4">
                {loading ? (
                    <div className="text-center py-8 text-slate-500">Đang tải dữ liệu...</div>
                ) : filteredSchedules.length > 0 ? (
                    filteredSchedules.map((item) => {
                        const todayStr = new Date().toISOString().split('T')[0];
                        const isOverdue = item.ngay_ket_thuc < todayStr;
                        const isCompleted = item.trang_thai === 'Đã hoàn thành';
                        const displayStatus = isCompleted ? 'Đã hoàn thành' : (isOverdue ? 'Quá hạn' : (item.trang_thai || 'Chưa thực hiện'));
                        const isRowRed = isOverdue && !isCompleted;

                        return (
                            <div key={item.id} className={`bg-white rounded-xl shadow-sm border p-4 space-y-3 ${isRowRed ? 'border-red-200 bg-red-50/10' : 'border-slate-100'}`}>
                                {/* Header: Date & Status */}
                                <div className="flex justify-between items-start">
                                    <div className="flex flex-col">
                                        <span className={`font-bold ${isRowRed ? 'text-red-700' : 'text-slate-800'}`}>
                                            {new Date(item.ngay_bat_dau).toLocaleDateString('vi-VN')}
                                        </span>
                                        {item.ngay_bat_dau !== item.ngay_ket_thuc && (
                                            <span className={`text-xs ${isRowRed ? 'text-red-500' : 'text-slate-500'}`}>
                                                - {new Date(item.ngay_ket_thuc).toLocaleDateString('vi-VN')}
                                            </span>
                                        )}
                                    </div>
                                    <span
                                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${displayStatus === 'Đã hoàn thành' ? 'bg-green-50 text-green-700 border-green-200' :
                                            displayStatus === 'Đang thực hiện' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                displayStatus === 'Đã hủy' ? 'bg-slate-50 text-slate-700 border-slate-200' :
                                                    displayStatus === 'Quá hạn' ? 'bg-red-50 text-red-700 border-red-200' :
                                                        'bg-slate-50 text-slate-700 border-slate-200'
                                            }`}
                                    >
                                        {displayStatus}
                                    </span>
                                </div>

                                {/* Content */}
                                <div>
                                    <p className={`font-semibold mb-1 ${isRowRed ? 'text-red-700' : 'text-slate-800'}`}>{item.noi_dung}</p>
                                    <p className={`text-sm whitespace-pre-line ${isRowRed ? 'text-red-600' : 'text-slate-600'}`}>{item.chi_tiet}</p>
                                    {item.file_dinh_kem && (
                                        <a href={item.file_dinh_kem} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded">
                                            <Paperclip size={12} /> File
                                        </a>
                                    )}
                                </div>

                                {/* Footer: Performers & Actions */}
                                <div className="space-y-3 pt-3 border-t border-slate-100">
                                    <div>
                                        <p className="text-xs text-slate-400 mb-1">Người thực hiện:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {Array.isArray(item.nguoi_thuc_hien) && item.nguoi_thuc_hien.length > 0 ? (
                                                item.nguoi_thuc_hien.map((p, idx) => (
                                                    <span key={idx} className={`inline-flex items-center px-2 py-1 rounded text-xs ${isRowRed ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                                                        {getPerformerName(p)}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-slate-400 italic text-xs">--</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openStatusUpdate(item)}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors whitespace-nowrap"
                                        >
                                            <UserCheck size={14} /> Cập nhật
                                        </button>
                                        <button onClick={() => handleEdit(item)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-xs font-medium">
                                            <Edit size={14} /> Sửa
                                        </button>
                                        <button onClick={() => handleDelete(item.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-xs font-medium">
                                            <Trash2 size={14} /> Xóa
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-12 bg-white rounded-xl border border-slate-100 text-slate-400 italic">
                        Không tìm thấy lịch công tác nào.
                    </div>
                )}
            </div>

            {/* Status Update Modal (Small) */}
            {statusModal.isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 p-4 animate-fade-in" onClick={() => setStatusModal({ ...statusModal, isOpen: false })}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5 animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-slate-800 text-lg">Cập nhật trạng thái</h4>
                            <button onClick={() => setStatusModal({ ...statusModal, isOpen: false })} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                            {[
                                { value: 'Chưa thực hiện', label: 'Chưa thực hiện', icon: Circle, color: 'text-slate-500', bg: 'bg-slate-50 hover:bg-slate-100' },
                                { value: 'Đang thực hiện', label: 'Đang thực hiện', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50 hover:bg-blue-100' },
                                { value: 'Đã hoàn thành', label: 'Đã hoàn thành', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 hover:bg-green-100' },
                                { value: 'Đã hủy', label: 'Đã hủy', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 hover:bg-red-100' }
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => handleStatusUpdate(option.value)}
                                    className={`w-full py-3 px-4 rounded-xl text-sm font-medium transition-all flex items-center gap-3 border ${statusModal.currentStatus === option.value
                                        ? `${option.bg} border-current ring-1 ring-offset-0`
                                        : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-700'
                                        }`}
                                >
                                    <option.icon size={20} className={statusModal.currentStatus === option.value ? 'text-current' : option.color} />
                                    <span className={`flex-1 text-left ${statusModal.currentStatus === option.value ? 'font-bold' : ''}`}>
                                        {option.label}
                                    </span>
                                    {statusModal.currentStatus === option.value && <CheckCircle size={18} className="text-current" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl animate-scale-in">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100">
                            <h3 className="text-xl font-bold text-slate-800">
                                {formData.id ? 'Cập nhật lịch công tác' : 'Thêm lịch công tác mới'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Nội dung công việc <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.noi_dung || ''}
                                        onChange={e => setFormData({ ...formData, noi_dung: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all font-medium"
                                        placeholder="Ví dụ: Họp giao ban, Kiểm tra vệ sinh..."
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Chi tiết</label>
                                    <textarea
                                        rows={3}
                                        value={formData.chi_tiet || ''}
                                        onChange={e => setFormData({ ...formData, chi_tiet: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all"
                                        placeholder="Mô tả chi tiết công việc..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Ngày bắt đầu <span className="text-red-500">*</span></label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.ngay_bat_dau || ''}
                                        onChange={e => setFormData({ ...formData, ngay_bat_dau: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Ngày kết thúc <span className="text-red-500">*</span></label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.ngay_ket_thuc || ''}
                                        onChange={e => setFormData({ ...formData, ngay_ket_thuc: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>

                                {/* Status Field */}
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Trạng thái</label>
                                    <select
                                        value={formData.trang_thai || 'Chưa thực hiện'}
                                        onChange={e => setFormData({ ...formData, trang_thai: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="Chưa thực hiện">Chưa thực hiện</option>
                                        <option value="Đang thực hiện">Đang thực hiện</option>
                                        <option value="Đã hoàn thành">Đã hoàn thành</option>
                                        <option value="Đã hủy">Đã hủy</option>
                                    </select>
                                </div>

                                {/* Performers Multi-select */}
                                <div className="col-span-2 relative">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Người thực hiện</label>
                                    <div className="p-2 border border-slate-200 rounded-lg bg-white min-h-[42px] flex flex-wrap gap-2 cursor-text" onClick={() => setIsPerformerDropdownOpen(true)}>
                                        {selectedPerformers.map(id => (
                                            <span key={id} className="bg-slate-100 text-slate-700 text-sm px-2 py-1 rounded-md flex items-center gap-1">
                                                {getPerformerName(id)}
                                                <button type="button" onClick={(e) => { e.stopPropagation(); togglePerformer(id); }} className="hover:text-red-500"><X size={14} /></button>
                                            </span>
                                        ))}
                                        <input
                                            type="text"
                                            className="flex-1 min-w-[120px] outline-none text-sm bg-transparent"
                                            placeholder={selectedPerformers.length === 0 ? "Chọn người thực hiện..." : ""}
                                            value={performerSearch}
                                            onChange={e => { setPerformerSearch(e.target.value); setIsPerformerDropdownOpen(true); }}
                                            onFocus={() => setIsPerformerDropdownOpen(true)}
                                        />
                                    </div>

                                    {isPerformerDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setIsPerformerDropdownOpen(false)}></div>
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto custom-scrollbar">
                                                {employees
                                                    .filter(e => e.ho_va_ten.toLowerCase().includes(performerSearch.toLowerCase()))
                                                    .map(e => (
                                                        <button
                                                            key={e.id}
                                                            type="button"
                                                            onClick={() => { togglePerformer(e.id.toString()); setPerformerSearch(''); }}
                                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex justify-between items-center ${selectedPerformers.includes(e.id.toString()) ? 'bg-blue-50 text-blue-600' : 'text-slate-700'}`}
                                                        >
                                                            <span>{e.ho_va_ten}</span>
                                                            {selectedPerformers.includes(e.id.toString()) && <UserCheck size={16} />}
                                                        </button>
                                                    ))
                                                }
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">File đính kèm</label>
                                    <div className="flex items-center gap-4">
                                        <label className="cursor-pointer px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                                            <Upload size={18} />
                                            {uploadingFile ? 'Đang tải lên...' : 'Chọn file'}
                                            <input type="file" onChange={handleFileUpload} className="hidden" disabled={uploadingFile} />
                                        </label>
                                        {formData.file_dinh_kem && (
                                            <span className="text-sm text-green-600 flex items-center gap-1">
                                                <FileText size={16} /> Đã có file
                                            </span>
                                        )}
                                    </div>
                                </div>

                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-primary-600 text-white font-medium hover:bg-primary-700 rounded-lg shadow-lg shadow-primary-200 flex items-center gap-2 transition-transform active:scale-95"
                                >
                                    <Save size={18} />
                                    {formData.id ? 'Cập nhật' : 'Thêm mới'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
