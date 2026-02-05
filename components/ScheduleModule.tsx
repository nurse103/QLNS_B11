import React, { useState, useEffect, useMemo } from 'react';
import { Schedule, Employee } from '../types';
import { getSchedules, deleteSchedule } from '../services/scheduleService';
import { getPersonnel } from '../services/personnelService';
import { ScheduleList } from './ScheduleList';
import { ScheduleCalendar } from './ScheduleCalendar';
import { ScheduleForm } from './ScheduleForm';
import { StatusUpdateModal } from './StatusUpdateModal';
import { ScheduleDetailsModal } from './ScheduleDetailsModal';
import { Calendar, List, Plus, CheckCircle, Clock, AlertCircle, LayoutGrid, Filter, CalendarDays } from 'lucide-react';

export const ScheduleModule = () => {
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter State
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'>('ALL');
    const [filterTime, setFilterTime] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<Partial<Schedule> | undefined>(undefined);
    const [selectedSchedule, setSelectedSchedule] = useState<Schedule | undefined>(undefined);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [scheduleData, employeeData] = await Promise.all([
                getSchedules(),
                getPersonnel()
            ]);
            setSchedules(scheduleData);
            setEmployees(employeeData);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Statistics Calculation
    const stats = useMemo(() => {
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);

        // Helper to get start of week (Monday)
        const getStartOfWeek = (d: Date) => {
            const date = new Date(d);
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            return new Date(date.setDate(diff));
        };
        const startOfWeek = getStartOfWeek(now);
        startOfWeek.setHours(0, 0, 0, 0);

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        return {
            total: schedules.length,
            inProgress: schedules.filter(s => !s.trang_thai || s.trang_thai === 'Đang thực hiện').length,
            completed: schedules.filter(s => s.trang_thai === 'Hoàn thành').length,
            overdue: schedules.filter(s => s.trang_thai === 'Quá hạn').length,
            today: schedules.filter(s => {
                const sDate = new Date(s.ngay_bat_dau);
                const eDate = new Date(s.ngay_ket_thuc);
                const check = new Date();
                return check >= sDate && check <= eDate;
            }).length,
            thisWeek: schedules.filter(s => {
                const sDate = new Date(s.ngay_bat_dau);
                return sDate >= startOfWeek;
            }).length,
            thisMonth: schedules.filter(s => {
                const sDate = new Date(s.ngay_bat_dau);
                return sDate >= startOfMonth;
            }).length
        };
    }, [schedules]);

    // Filter Logic
    const filteredSchedules = useMemo(() => {
        return schedules.filter(s => {
            // Status Filter
            if (filterStatus === 'IN_PROGRESS' && s.trang_thai !== 'Đang thực hiện' && s.trang_thai) return false;
            // Note: If trang_thai is undefined/null, treat as In Progress?
            if (filterStatus === 'IN_PROGRESS' && s.trang_thai && s.trang_thai !== 'Đang thực hiện') return false;
            if (filterStatus === 'COMPLETED' && s.trang_thai !== 'Hoàn thành') return false;
            if (filterStatus === 'OVERDUE' && s.trang_thai !== 'Quá hạn') return false;

            // Time Filter
            const now = new Date();
            const sDate = new Date(s.ngay_bat_dau);

            if (filterTime === 'TODAY') {
                const todayStr = now.toDateString();
                return new Date(s.ngay_bat_dau).toDateString() === todayStr || new Date(s.ngay_ket_thuc).toDateString() === todayStr || (now >= new Date(s.ngay_bat_dau) && now <= new Date(s.ngay_ket_thuc));
            }
            if (filterTime === 'WEEK') {
                const getStartOfWeek = (d: Date) => {
                    const date = new Date(d);
                    const day = date.getDay(); // 0 (Sun) to 6 (Sat)
                    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
                    return new Date(date.setDate(diff));
                };
                const startOfWeek = getStartOfWeek(now);
                startOfWeek.setHours(0, 0, 0, 0);
                return sDate >= startOfWeek;
            }
            if (filterTime === 'MONTH') {
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                return sDate >= startOfMonth;
            }

            return true;
        });
    }, [schedules, filterStatus, filterTime]);

    const handleCreate = () => {
        setEditingSchedule(undefined);
        setIsModalOpen(true);
    };

    const handleEdit = (schedule: Schedule) => {
        setEditingSchedule(schedule);
        setIsModalOpen(true);
    };

    const handleView = (schedule: Schedule) => {
        setSelectedSchedule(schedule);
        setIsDetailsModalOpen(true);
    }

    const handleUpdateStatus = (schedule: Schedule) => {
        setSelectedSchedule(schedule);
        setIsStatusModalOpen(true);
    }

    const handleDelete = async (id: number) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa lịch này không?")) {
            try {
                await deleteSchedule(id);
                fetchData();
            } catch (error) {
                alert("Xóa thất bại");
            }
        }
    };

    const handleDateSelect = (date: Date) => {
        const start = new Date(date);
        start.setHours(8, 0, 0, 0);
        const end = new Date(date);
        end.setHours(17, 0, 0, 0);

        setEditingSchedule({
            ngay_bat_dau: start.toISOString(),
            ngay_ket_thuc: end.toISOString()
        });
        setIsModalOpen(true);
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800">Quản lý Lịch công tác</h1>
                <button
                    onClick={handleCreate}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2 shadow-sm"
                >
                    <Plus size={16} /> Thêm công việc
                </button>
            </div>

            {/* Statistic Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                        <LayoutGrid size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Tổng công việc</p>
                        <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                    <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Đang thực hiện</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-2xl font-bold text-slate-800">{stats.inProgress}</p>
                            <span className="text-xs text-slate-400">Hôm nay: {stats.today}</span>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                    <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                        <CheckCircle size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Đã hoàn thành</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-2xl font-bold text-slate-800">{stats.completed}</p>
                            <span className="text-xs text-slate-400">Tháng này: {stats.thisMonth}</span>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Quá hạn</p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-2xl font-bold text-slate-800">{stats.overdue}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Time-based Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-4 rounded-xl shadow-sm text-white flex items-center justify-between">
                    <div>
                        <p className="text-indigo-100 text-sm font-medium mb-1">Hôm nay</p>
                        <p className="text-2xl font-bold">{stats.today}</p>
                        <p className="text-xs text-indigo-200 mt-1">Công việc cần làm</p>
                    </div>
                    <div className="p-3 bg-white/20 rounded-lg">
                        <CalendarDays size={24} />
                    </div>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-4 rounded-xl shadow-sm text-white flex items-center justify-between">
                    <div>
                        <p className="text-blue-100 text-sm font-medium mb-1">Tuần này</p>
                        <p className="text-2xl font-bold">{stats.thisWeek}</p>
                        <p className="text-xs text-blue-200 mt-1">Tổng công việc trong tuần</p>
                    </div>
                    <div className="p-3 bg-white/20 rounded-lg">
                        <Calendar size={24} />
                    </div>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 rounded-xl shadow-sm text-white flex items-center justify-between">
                    <div>
                        <p className="text-emerald-100 text-sm font-medium mb-1">Tháng này</p>
                        <p className="text-2xl font-bold">{stats.thisMonth}</p>
                        <p className="text-xs text-emerald-200 mt-1">Tổng công việc trong tháng</p>
                    </div>
                    <div className="p-3 bg-white/20 rounded-lg">
                        <LayoutGrid size={24} />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px] flex flex-col">
                {/* Controls Bar */}
                <div className="border-b border-slate-100 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Filter Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1 text-slate-500 text-sm font-medium mr-2">
                            <Filter size={16} /> Lọc:
                        </div>
                        <button
                            onClick={() => { setFilterStatus('ALL'); setFilterTime('ALL'); }}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterStatus === 'ALL' && filterTime === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            Tất cả
                        </button>
                        <button
                            onClick={() => setFilterStatus(filterStatus === 'IN_PROGRESS' ? 'ALL' : 'IN_PROGRESS')}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterStatus === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            Đang thực hiện
                        </button>
                        <button
                            onClick={() => setFilterTime(filterTime === 'TODAY' ? 'ALL' : 'TODAY')}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterTime === 'TODAY' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            Hôm nay
                        </button>
                        <button
                            onClick={() => setFilterTime(filterTime === 'WEEK' ? 'ALL' : 'WEEK')}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterTime === 'WEEK' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            Tuần này
                        </button>
                        <button
                            onClick={() => setFilterTime(filterTime === 'MONTH' ? 'ALL' : 'MONTH')}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterTime === 'MONTH' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            Tháng này
                        </button>
                    </div>

                    {/* View Switcher */}
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-all ${viewMode === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            onClick={() => setViewMode('list')}
                        >
                            <List size={16} /> Danh sách
                        </button>
                        <button
                            className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition-all ${viewMode === 'calendar' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            onClick={() => setViewMode('calendar')}
                        >
                            <Calendar size={16} /> Lịch
                        </button>
                    </div>
                </div>

                <div className="flex-1 p-0">
                    {loading ? (
                        <div className="text-center text-slate-500 py-10">Đang tải dữ liệu...</div>
                    ) : viewMode === 'list' ? (
                        <ScheduleList
                            schedules={filteredSchedules}
                            employees={employees}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onView={handleView}
                            onUpdateStatus={handleUpdateStatus}
                        />
                    ) : (
                        <div className="p-6">
                            <ScheduleCalendar
                                schedules={filteredSchedules}
                                onSelectDate={handleDateSelect}
                                onEdit={handleEdit}
                            />
                        </div>
                    )}
                </div>
            </div>

            {isModalOpen && (
                <ScheduleForm
                    initialData={editingSchedule}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => {
                        setIsModalOpen(false);
                        fetchData();
                    }}
                />
            )}

            {isStatusModalOpen && selectedSchedule && (
                <StatusUpdateModal
                    schedule={selectedSchedule}
                    onClose={() => setIsStatusModalOpen(false)}
                    onSuccess={() => {
                        setIsStatusModalOpen(false);
                        fetchData();
                    }}
                />
            )}

            {isDetailsModalOpen && selectedSchedule && (
                <ScheduleDetailsModal
                    schedule={selectedSchedule}
                    employees={employees}
                    onClose={() => setIsDetailsModalOpen(false)}
                />
            )}
        </div>
    );
};
