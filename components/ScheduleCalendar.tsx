import React, { useState } from 'react';
import { Schedule } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ScheduleCalendarProps {
    schedules: Schedule[];
    onSelectDate: (date: Date) => void;
    onEdit: (schedule: Schedule) => void;
}

export const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({ schedules, onSelectDate, onEdit }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year: number, month: number) => {
        // 0 = Sunday, 1 = Monday, ...
        const day = new Date(year, month, 1).getDay();
        // Adjust so Valid Monday=0... Sunday=6 if we want Monday start, but standard JS is Sun=0
        return day;
    };

    const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
    const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const renderCells = () => {
        const cells = [];
        const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

        // Header
        const header = days.map(day => (
            <div key={day} className="text-center font-bold text-slate-500 py-2 bg-slate-50">
                {day}
            </div>
        ));

        // Empty cells for previous month
        for (let i = 0; i < firstDay; i++) {
            cells.push(<div key={`empty-${i}`} className="h-32 border border-slate-100 bg-slate-50/50"></div>);
        }

        // Days
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const isToday = new Date().toDateString() === date.toDateString();

            const daySchedules = schedules.filter(s => {
                const start = new Date(s.ngay_bat_dau);
                const end = new Date(s.ngay_ket_thuc);
                // Simple check: if date is within range (ignoring time for visualization simplicity on daily grid)
                // Or strictly matching start date. Let's do strictly matching start date or overlaps.
                // For a month view cell, we usually show items that START on this day or span through it.
                // Let's simplified: check if date is between start and end (inclusive)
                const checkDate = new Date(date);
                checkDate.setHours(0, 0, 0, 0);
                const sDate = new Date(start); sDate.setHours(0, 0, 0, 0);
                const eDate = new Date(end); eDate.setHours(23, 59, 59, 999);
                return checkDate >= sDate && checkDate <= eDate;
            });

            cells.push(
                <div
                    key={day}
                    onClick={() => onSelectDate(date)}
                    className={`h-32 border border-slate-100 p-2 overflow-y-auto cursor-pointer hover:bg-slate-50 transition-colors ${isToday ? 'bg-blue-50' : ''}`}
                >
                    <div className={`text-right text-sm mb-1 ${isToday ? 'font-bold text-blue-600' : 'text-slate-700'}`}>
                        {day}
                    </div>
                    <div className="space-y-1">
                        {daySchedules.map(sch => (
                            <div
                                key={sch.id}
                                onClick={(e) => { e.stopPropagation(); onEdit(sch); }}
                                className="text-xs p-1 rounded bg-blue-100 text-blue-800 truncate hover:bg-blue-200 cursor-pointer border-l-2 border-blue-500"
                                title={`${sch.noi_dung} (${new Date(sch.ngay_bat_dau).toLocaleTimeString().slice(0, 5)})`}
                            >
                                {new Date(sch.ngay_bat_dau).toLocaleTimeString().slice(0, 5)} {sch.noi_dung}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-7 gap-px border border-slate-200 bg-white rounded-lg overflow-hidden">
                {header}
                {cells}
            </div>
        );
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-800 capitalize">
                    Tháng {currentDate.getMonth() + 1}, {currentDate.getFullYear()}
                </h2>
                <div className="flex gap-2">
                    <button onClick={prevMonth} className="p-2 border rounded hover:bg-slate-50"><ChevronLeft size={20} /></button>
                    <button onClick={() => setCurrentDate(new Date())} className="px-3 py-2 border rounded hover:bg-slate-50 text-sm font-medium">Hôm nay</button>
                    <button onClick={nextMonth} className="p-2 border rounded hover:bg-slate-50"><ChevronRight size={20} /></button>
                </div>
            </div>
            {renderCells()}
        </div>
    );
};
