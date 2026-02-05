import React, { useState, useEffect } from 'react';
import { Schedule, Employee } from '../types';
import { getSchedules, deleteSchedule } from '../services/scheduleService';
import { getPersonnel } from '../services/personnelService';
import { ScheduleList } from './ScheduleList';
import { ScheduleCalendar } from './ScheduleCalendar';
import { ScheduleForm } from './ScheduleForm';
import { Calendar, List, Plus } from 'lucide-react';

export const ScheduleModule = () => {
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<Partial<Schedule> | undefined>(undefined);

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

    const handleCreate = () => {
        setEditingSchedule(undefined);
        setIsModalOpen(true);
    };

    const handleEdit = (schedule: Schedule) => {
        setEditingSchedule(schedule);
        setIsModalOpen(true);
    };

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
        // Pre-fill start date when clicking on calendar
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
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Quản lý Lịch công tác</h1>
                <button
                    onClick={handleCreate}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
                >
                    <Plus size={16} /> Thêm công việc
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden min-h-[600px]">
                {/* Tabs */}
                <div className="flex border-b border-slate-100 px-6 pt-4">
                    <button
                        className={`pb-3 px-4 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${viewMode === 'list' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        onClick={() => setViewMode('list')}
                    >
                        <List size={16} /> Danh sách công việc
                    </button>
                    <button
                        className={`pb-3 px-4 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${viewMode === 'calendar' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        onClick={() => setViewMode('calendar')}
                    >
                        <Calendar size={16} /> Lịch tháng
                    </button>
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="text-center text-slate-500 py-10">Đang tải dữ liệu...</div>
                    ) : viewMode === 'list' ? (
                        <ScheduleList
                            schedules={schedules}
                            employees={employees}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />
                    ) : (
                        <ScheduleCalendar
                            schedules={schedules}
                            onSelectDate={handleDateSelect}
                            onEdit={handleEdit}
                        />
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
        </div>
    );
};
