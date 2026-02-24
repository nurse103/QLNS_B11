import React, { useState, useEffect } from 'react';
import { getSchedules } from '../services/scheduleService';
import { getDutySchedules, DutySchedule } from '../services/dutyScheduleService';
import { getAbsencesByDate } from '../services/absenceService';
import { getLeavesOnDate } from '../services/leaveService';
import { getPersonnel, Employee } from '../services/personnelService';
import { getAssignmentByDate } from '../services/assignmentService';
import { Schedule, AbsenceRecord, LeaveRecord, Assignment } from '../types';
import {
    Calendar,
    CalendarClock,
    Users,
    FileText,
    Cake,
    Briefcase,
    Activity,
    ChevronRight,
    Clock,
    UserCheck,
    Stethoscope,
    Heart,
    X
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const OverviewModule = () => {
    const [loading, setLoading] = useState(true);
    const [personnel, setPersonnel] = useState<Employee[]>([]);
    const [workSchedules, setWorkSchedules] = useState<Schedule[]>([]);
    const [dutySchedules, setDutySchedules] = useState<DutySchedule[]>([]);
    const [absences, setAbsences] = useState<AbsenceRecord[]>([]);
    const [todayAssignment, setTodayAssignment] = useState<Assignment | null>(null);
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const today = new Date();
                const currentMonth = today.getMonth() + 1;
                const currentYear = today.getFullYear();

                const [pData, wData, dData, aData, lData, assData] = await Promise.all([
                    getPersonnel(),
                    getSchedules(),
                    getDutySchedules(currentMonth, currentYear),
                    getAbsencesByDate(new Date().toISOString().split('T')[0]),
                    getLeavesOnDate(new Date().toISOString().split('T')[0]),
                    getAssignmentByDate(new Date().toISOString().split('T')[0])
                ]);

                setPersonnel(pData || []);
                setWorkSchedules(wData || []);
                setDutySchedules(dData || []);
                setTodayAssignment(assData);

                // Merge absences (Daily) and leaves (Long-term/Tranh thu)
                // Map LeaveRecord to AbsenceRecord format for display
                const dailyAbsences = aData || [];
                const longTermLeaves = (lData || []).map(l => ({
                    id: -l.id, // Negative ID to avoid collision with daily absence IDs (or just use a unique prefix if string)
                    dsnv_id: l.dsnv_id,
                    ho_va_ten: l.ho_va_ten || 'N/A',
                    loai_nghi: l.loai_nghi || 'Phép',
                    ngay_nghi: l.tu_ngay || '', // For display this likely doesn't matter as we are in "Today" context
                    ghi_chu: l.ghi_chu
                } as AbsenceRecord));

                // Deduplicate: If employee is in both, maybe show Daily Absence preference?
                // Or just show both? User probably wants to see "Tranh thủ" explicitly if documented there.
                // Let's combine them. If duplicate DSNV_ID exists, we might want to be careful.
                // For overview simplicity, let's just concat first.
                // If distinct people is important, we might need logic.
                // "Quân số nghỉ" usually counts heads.

                // Strategy: Use a Map to deduplicate by DSNV_ID if dsnv_id exists, otherwise by name.
                const combineMap = new Map<string, AbsenceRecord>();

                // Add Daily Absences first
                dailyAbsences.forEach(a => {
                    const key = a.dsnv_id ? `id-${a.dsnv_id}` : `name-${a.ho_va_ten}`;
                    combineMap.set(key, a);
                });

                // Add Leave items (if not already present? or overwrite? or append?)
                // If someone is on "Tranh thủ" (Leave) but also marked "Nghỉ trực" (Daily Absence), which one to show?
                // Usually "Nghỉ trực" is specific for today. "Tranh thủ" is a duration.
                // Let's accept both but if same person, maybe prioritize Daily Absence description or append?
                // User requirement: "thống kê cả bảng quản lý phép tranh thủ".
                // Let's try to add them if they are not already in daily absences.

                longTermLeaves.forEach(l => {
                    const key = l.dsnv_id ? `id-${l.dsnv_id}` : `name-${l.ho_va_ten}`;
                    if (!combineMap.has(key)) {
                        combineMap.set(key, l);
                    }
                });

                setAbsences(Array.from(combineMap.values()));

            } catch (error) {
                console.error("Error fetching overview data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Helper functions
    const isToday = (dateString: string) => {
        if (!dateString) return false;
        const d = new Date(dateString);
        const today = new Date();
        return d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear();
    };

    const isThisWeek = (dateString: string) => {
        if (!dateString) return false;
        const current = new Date();
        const startOfWeek = new Date(current.setDate(current.getDate() - current.getDay() + (current.getDay() === 0 ? -6 : 1)));
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        const checkDate = new Date(dateString);
        return checkDate >= startOfWeek && checkDate <= endOfWeek;
    };

    const isWeekend = (dateStr: string) => {
        const d = new Date(dateStr);
        const day = d.getDay();
        return day === 0 || day === 6;
    };

    // --- Derived Data ---

    // 1. Ongoing and Overdue Work (Công việc đang làm & Quá hạn)
    const ongoingAndOverdueWork = workSchedules.filter(s => {
        const start = new Date(s.ngay_bat_dau);
        const end = new Date(s.ngay_ket_thuc);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Normalize dates
        const startNorm = new Date(start.setHours(0, 0, 0, 0));
        const endNorm = new Date(end.setHours(23, 59, 59, 999));

        // Check if ongoing: today is within [start, end]
        const isOngoing = today >= startNorm && today <= endNorm;

        // Check if overdue: end < today AND status != 'Completed'
        const isOverdue = endNorm < today && s.trang_thai !== 'Đã hoàn thành';

        // Check if it's explicitly marked as 'Completed', in which case we might not want to show it in "Ongoing" 
        // unless it's strictly within today's timeframe.
        // Actually, user wants "Ongoing" and "Overdue". Completed items usually shouldn't be here unless they are "Ongoing" in time?
        // Let's assume if it's completed, it's NOT "Ongoing" or "Overdue" in the context of "What needs attention".
        // But the previous logic showed everything in time range.
        // Let's stick to: Show if (Ongoing OR Overdue) AND (Status != Completed).
        // Exceptions: If user wants to see completed work that is happening today? usually "Ongoing list" implies active tasks.
        // Let's exclude Completed tasks from this list to keep it focused on actionable items.

        return (isOngoing || isOverdue) && s.trang_thai !== 'Đã hoàn thành';
    });

    // Sort: Overdue first, then by End Date ascending (closest deadline first)
    ongoingAndOverdueWork.sort((a, b) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const endA = new Date(a.ngay_ket_thuc);
        const endB = new Date(b.ngay_ket_thuc);

        const isOverdueA = endA < today;
        const isOverdueB = endB < today;

        if (isOverdueA && !isOverdueB) return -1;
        if (!isOverdueA && isOverdueB) return 1;

        return endA.getTime() - endB.getTime();
    });

    // Helper to determine text color for work items
    const getWorkColorClass = (endDateStr: string, status: string | undefined) => {
        if (status === 'Đã hoàn thành') return 'text-green-600';

        const end = new Date(endDateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Calculate difference in days
        const diffTime = end.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // logic: Overdue -> Red, <= 1 day -> Red, > 1 day -> Green
        if (diffDays < 0) return 'text-red-600 font-bold'; // Overdue
        if (diffDays <= 1) return 'text-red-500'; // Due soon
        return 'text-[#009900]';
    };


    const todayDuty = dutySchedules.filter(s => isToday(s.ngay_truc));

    const todayBirthdays = personnel.filter(p => {
        if (!p.ngay_sinh) return false;
        const d = new Date(p.ngay_sinh);
        const today = new Date();
        return d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
    });

    // 2. Weekly Data
    const weeklyWork = workSchedules.filter(s => isThisWeek(s.ngay_bat_dau) || isThisWeek(s.ngay_ket_thuc));
    weeklyWork.sort((a, b) => new Date(a.ngay_bat_dau).getTime() - new Date(b.ngay_bat_dau).getTime());

    const weeklyDuty = dutySchedules.filter(s => isThisWeek(s.ngay_truc));
    weeklyDuty.sort((a, b) => new Date(a.ngay_truc).getTime() - new Date(b.ngay_truc).getTime());

    // 3. Detailed Statistics

    // Helper helpers
    const checkRole = (p: Employee, roles: string[]) => {
        const title = p.chuc_vu?.toLowerCase() || '';
        // Also check danh_hieu for residents if needed, but usually chuc_vu covers it per previous logic
        return roles.some(r => title.includes(r.toLowerCase()));
    };

    const isPartyMember = (p: Employee) => !!(p.ngay_vao_dang || p.so_the_dang);

    // Categories
    // Filter for Active Personnel only (Trang thai == 'Đang làm việc')
    // Note: Assuming 'personnel' contains all data.
    const activePersonnel = personnel.filter(p => p.trang_thai === 'Đang làm việc');

    const doctors = activePersonnel.filter(p => checkRole(p, ['Bác sỹ', 'Chủ nhiệm khoa', 'Phó chủ nhiệm khoa', 'BS']));
    const nurses = activePersonnel.filter(p => checkRole(p, ['Điều dưỡng']) && !p.chuc_vu?.toLowerCase().includes('học việc'));
    const traineeNurses = activePersonnel.filter(p => p.chuc_vu?.toLowerCase().includes('điều dưỡng') && p.chuc_vu?.toLowerCase().includes('học việc'));
    const residents = activePersonnel.filter(p => checkRole(p, ['Học viên', 'Nội trú', 'Cao học']));

    // Party Stats - Align with PartyModule
    const activePartyStatuses = ['Đang làm việc', 'Đang học việc', 'Tạm nghỉ việc'];
    const activePartyMembers = personnel.filter(p =>
        isPartyMember(p) && p.trang_thai && activePartyStatuses.includes(p.trang_thai)
    );

    const doctorPartyMembers = activePartyMembers.filter(p => p.dien_quan_ly === 'Cán bộ');
    const nursePartyMembers = activePartyMembers.filter(p => p.dien_quan_ly === 'Quân lực');


    const stats = {
        personnel: {
            total: activePersonnel.length,
            doctors: doctors.length,
            nurses: nurses.length,
            traineeNurses: traineeNurses.length,
            residents: residents.length
        },
        party: {
            total: activePartyMembers.length,
            doctorCell: doctorPartyMembers.length,
            nurseCell: nursePartyMembers.length
        }
    };


    if (loading) return <div className="p-8 text-center text-slate-500">Đang tải dữ liệu tổng quan...</div>;

    return (
        <div className="p-6 space-y-6 animate-fade-in relative">
            <div className="space-y-4">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-bold text-blue-700">Tổng quan</h1>
                        <p className="text-slate-500 mt-1">
                            Hôm nay, {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                </div>

                {/* Birthday Banner */}
                {todayBirthdays.length > 0 && (
                    <div className="bg-gradient-to-r from-pink-50 to-white border border-pink-100 p-4 rounded-xl flex items-center gap-4 animate-in slide-in-from-top-2">
                        <div className="p-2 bg-pink-100 text-pink-600 rounded-full shrink-0">
                            <Cake size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-pink-800 font-bold text-sm uppercase mb-1">Chúc mừng sinh nhật</h3>
                            <div className="flex flex-wrap gap-x-6 gap-y-1">
                                {todayBirthdays.map(emp => (
                                    <div key={emp.id} className="text-slate-700 text-sm flex items-center gap-1">
                                        <span className="font-semibold text-pink-700">{emp.ho_va_ten}</span>
                                        <span className="text-slate-500">({emp.chuc_vu})</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Row 1: 4 Columns - Ongoing Work, Daily Assignment, Duty Today, Absence Today */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-full">

                {/* Column 1: Ongoing Work */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col h-full min-h-[350px]">
                    <div className="px-5 py-3 bg-[#009900] rounded-t-xl flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-white/20 text-white rounded-lg">
                                <Briefcase size={18} />
                            </div>
                            <h3 className="font-bold text-white uppercase text-sm">Công việc đang làm</h3>
                        </div>
                        <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">{ongoingAndOverdueWork.length}</span>
                    </div>

                    <div className="p-4 flex-1 overflow-y-auto max-h-[280px] space-y-3 pr-1 custom-scrollbar">
                        {ongoingAndOverdueWork.length > 0 ? (
                            ongoingAndOverdueWork.map(job => (
                                <div key={job.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm hover:shadow-sm transition-shadow">
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="flex-1">
                                            <p className={`font-semibold line-clamp-2 ${getWorkColorClass(job.ngay_ket_thuc, job.trang_thai)}`}>
                                                {job.noi_dung}
                                            </p>
                                            {new Date(job.ngay_ket_thuc) < new Date(new Date().setHours(0, 0, 0, 0)) && job.trang_thai !== 'Đã hoàn thành' && (
                                                <span className="inline-block mt-1 text-[10px] uppercase font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                                                    Quá hạn
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-500 shrink-0 whitespace-nowrap">
                                            {new Date(job.ngay_ket_thuc).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                        <div className="flex items-center gap-1">
                                            <UserCheck size={12} />
                                            <span title={Array.isArray(job.nguoi_thuc_hien) ? job.nguoi_thuc_hien.join(', ') : ''}>
                                                {Array.isArray(job.nguoi_thuc_hien) ? `${job.nguoi_thuc_hien.length} người` : '---'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-6">
                                <p className="text-sm">Không có công việc</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Column 2: Daily Assignment */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col h-full min-h-[350px]">
                    <div className="px-5 py-3 bg-[#009900] rounded-t-xl flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-white/20 text-white rounded-lg">
                                <Users size={18} />
                            </div>
                            <h3 className="font-bold text-white uppercase text-sm">Phân công hàng ngày</h3>
                        </div>
                    </div>

                    <div className="p-4 flex-1 overflow-y-auto max-h-[280px] space-y-3 pr-1 custom-scrollbar">
                        {todayAssignment ? (
                            <div className="space-y-2">
                                {[
                                    { label: 'Buồng 1', value: todayAssignment.buong_1 },
                                    { label: 'Buồng 2', value: todayAssignment.buong_2 },
                                    { label: 'Buồng 3', value: todayAssignment.buong_3 },
                                    { label: 'Buồng 4', value: todayAssignment.buong_4 },
                                    { label: 'Chạy ngoài', value: todayAssignment.chay_ngoai },
                                    { label: 'Chụp phim', value: todayAssignment.chup_phim },
                                    { label: 'Làm số', value: todayAssignment.lam_so }
                                ].map((item, idx) => item.value && (
                                    <div key={idx} className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-sm">
                                        <p className="text-[10px] text-blue-600 uppercase font-bold tracking-wide">{item.label}</p>
                                        <p className="text-slate-800 font-bold">{item.value}</p>
                                    </div>
                                ))}
                                {!Object.values(todayAssignment).some(v => v && v !== todayAssignment.id && v !== todayAssignment.ngay_thang && v !== todayAssignment.created_at && v !== todayAssignment.updated_at) && (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 py-6">
                                        <p className="text-sm italic">Chưa có phân công chi tiết</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-6">
                                <p className="text-sm">Chưa có phân công</p>
                            </div>
                        )}
                    </div>
                    <div className="px-4 py-2 border-t border-slate-50">
                        <button
                            onClick={() => setIsAssignmentModalOpen(true)}
                            className="w-full text-center text-xs text-blue-600 font-medium hover:underline block"
                        >
                            Xem chi tiết
                        </button>
                    </div>
                </div>

                {/* Column 2: Duty Today */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col h-full min-h-[350px]">
                    <div className="px-5 py-3 bg-[#009900] rounded-t-xl flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-white/20 text-white rounded-lg">
                                <CalendarClock size={18} />
                            </div>
                            <h3 className="font-bold text-white uppercase text-sm">Trực hôm nay</h3>
                        </div>
                    </div>

                    <div className="p-4 flex-1 overflow-y-auto max-h-[280px] space-y-3 pr-1 custom-scrollbar">
                        {todayDuty.length > 0 ? (
                            todayDuty.map(duty => (
                                <div key={duty.id} className="space-y-3">
                                    <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100">
                                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-orange-600 font-bold text-xs border border-orange-200 shadow-sm">BS</div>
                                        <div>
                                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">Bác sỹ trực</p>
                                            <p className={`text-sm font-bold ${isWeekend(duty.ngay_truc) ? 'text-red-600' : 'text-slate-800'}`}>{duty.bac_sy}</p>
                                        </div>
                                    </div>
                                    {duty.dieu_duong && (
                                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-blue-600 font-bold text-xs border border-blue-200 shadow-sm">ĐD</div>
                                            <div>
                                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">Điều dưỡng</p>
                                                <p className={`text-sm font-medium leading-relaxed ${isWeekend(duty.ngay_truc) ? 'text-red-600' : 'text-slate-800'}`}>
                                                    {duty.dieu_duong.split(/[\n,]/).map(n => n.trim()).filter(n => n).join(', ')}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-6">
                                <p className="text-sm">Chưa có lịch trực</p>
                            </div>
                        )}
                    </div>
                    <div className="px-4 py-2 border-t border-slate-50">
                        <Link to="/duty" className="text-center text-xs text-blue-600 font-medium hover:underline block">
                            Xem chi tiết
                        </Link>
                    </div>
                </div>

                {/* Column 3: Absence Today (Quân số nghỉ) */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col h-full min-h-[350px]">
                    <div className="px-5 py-3 bg-[#009900] rounded-t-xl flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-white/20 text-white rounded-lg">
                                <UserCheck size={18} />
                            </div>
                            <h3 className="font-bold text-white uppercase text-sm">Quân số nghỉ hôm nay</h3>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-0 border-b border-slate-100 divide-x divide-slate-100 bg-slate-50/50">
                        <div className="p-3 text-center">
                            <p className="text-[10px] text-slate-500 uppercase font-semibold mb-0.5">Tổng số</p>
                            <p className="text-lg font-bold text-slate-700">{activePersonnel.length}</p>
                        </div>
                        <div className="p-3 text-center bg-red-50/30">
                            <p className="text-[10px] text-red-500 uppercase font-semibold mb-0.5">Vắng</p>
                            <p className="text-lg font-bold text-red-600">{absences.length}</p>
                        </div>
                        <div className="p-3 text-center bg-green-50/30">
                            <p className="text-[10px] text-green-600 uppercase font-semibold mb-0.5">Đi làm</p>
                            <p className="text-lg font-bold text-green-600">{activePersonnel.length - absences.length}</p>
                        </div>
                    </div>

                    {/* List */}
                    <div className="p-4 flex-1 overflow-y-auto max-h-[220px] custom-scrollbar">
                        {absences.length > 0 ? (
                            <div className="space-y-2">
                                {absences.map(item => (
                                    <div key={item.id} className="flex items-start gap-2 p-2 rounded hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                                        <div className="mt-0.5">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${item.loai_nghi === 'Nghỉ trực' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                item.loai_nghi === 'Nghỉ ốm' ? 'bg-red-50 text-red-700 border-red-100' :
                                                    item.loai_nghi === 'Tranh thủ' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                                        'bg-blue-50 text-blue-700 border-blue-100'
                                                }`}>
                                                {item.loai_nghi}
                                            </span>
                                            <span className="text-sm font-medium text-slate-800">{item.ho_va_ten}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-6">
                                <p className="text-sm italic">Quân số đầy đủ</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Row 2: Personnel Stats */}
            <div>
                <h3 className="text-sm font-bold text-blue-700 uppercase tracking-wider mb-3 ml-1">Thống kê nhân sự</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                            <Users size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">Tổng số nhân sự</p>
                            <p className="text-xl font-bold text-slate-800">{stats.personnel.total}</p>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                            <Heart size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">Điều dưỡng</p>
                            <p className="text-xl font-bold text-slate-800">{stats.personnel.nurses}</p>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center shrink-0">
                            <Activity size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">ĐD học việc</p>
                            <p className="text-xl font-bold text-slate-800">{stats.personnel.traineeNurses}</p>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                            <Stethoscope size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">Bác sỹ</p>
                            <p className="text-xl font-bold text-slate-800">{stats.personnel.doctors}</p>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                            <UserCheck size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">Học viên nội trú</p>
                            <p className="text-xl font-bold text-slate-800">{stats.personnel.residents}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 3: Party Stats */}
            <div>
                <h3 className="text-sm font-bold text-blue-700 uppercase tracking-wider mb-3 ml-1">Thống kê Đảng viên</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3 border-l-4 border-l-red-500">
                        <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                            <Activity size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">Tổng số Đảng viên</p>
                            <p className="text-xl font-bold text-slate-800">{stats.party.total}</p>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                            <Stethoscope size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">Tổ đảng Bác sỹ</p>
                            <p className="text-xl font-bold text-slate-800">{stats.party.doctorCell}</p>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                            <Heart size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500">Tổ đảng điều dưỡng</p>
                            <p className="text-xl font-bold text-slate-800">{stats.party.nurseCell}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 4: Weekly Schedules Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Weekly Work Schedule */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="px-5 py-3 bg-[#009900] flex justify-between items-center">
                        <h3 className="font-bold text-white uppercase text-sm">Lịch công tác tuần này</h3>
                        <Link to="/schedule" className="text-xs text-white/80 hover:text-white font-medium">Chi tiết</Link>
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium">
                                <tr>
                                    <th className="px-4 py-3 w-24">Ngày</th>
                                    <th className="px-4 py-3">Nội dung</th>
                                    <th className="px-4 py-3 w-32">Thực hiện</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {weeklyWork.length > 0 ? (
                                    weeklyWork.map(item => (
                                        <tr key={item.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 text-slate-600">
                                                {new Date(item.ngay_bat_dau).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                                            </td>
                                            <td className="px-4 py-3 font-medium text-slate-800">{item.noi_dung}</td>
                                            <td className="px-4 py-3 text-slate-500 text-xs">
                                                {Array.isArray(item.nguoi_thuc_hien) ? item.nguoi_thuc_hien.length + ' người' : '---'}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={3} className="px-4 py-8 text-center text-slate-400 italic">Tuần này chưa có lịch công tác</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden p-4 space-y-3">
                        {weeklyWork.length > 0 ? (
                            weeklyWork.map(item => (
                                <div key={item.id} className="bg-slate-50 border border-slate-100 rounded-lg p-3 flex gap-3">
                                    <div className="flex flex-col items-center justify-center w-12 h-12 bg-white border border-slate-200 rounded-lg shrink-0">
                                        <span className="text-xs text-slate-500 font-medium">
                                            T{new Date(item.ngay_bat_dau).getMonth() + 1}
                                        </span>
                                        <span className="text-lg font-bold text-blue-600 leading-none">
                                            {new Date(item.ngay_bat_dau).getDate()}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 line-clamp-2 mb-1">{item.noi_dung}</p>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <Users size={12} />
                                            <span>
                                                {Array.isArray(item.nguoi_thuc_hien) ? `${item.nguoi_thuc_hien.length} người thực hiện` : '---'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-slate-400 italic py-4 text-sm">Tuần này chưa có lịch công tác</div>
                        )}
                    </div>
                </div>

                {/* Weekly Duty Schedule */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="px-5 py-3 bg-[#009900] flex justify-between items-center">
                        <h3 className="font-bold text-white uppercase text-sm">Lịch trực tuần này</h3>
                        <Link to="/duty" className="text-xs text-white/80 hover:text-white font-medium">Chi tiết</Link>
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium">
                                <tr>
                                    <th className="px-4 py-3 w-24">Ngày</th>
                                    <th className="px-4 py-3 w-40">Bác sỹ</th>
                                    <th className="px-4 py-3">Điều dưỡng</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {weeklyDuty.length > 0 ? (
                                    weeklyDuty.map(item => (
                                        <tr key={item.id} className={`hover:bg-slate-50 ${isWeekend(item.ngay_truc) ? 'bg-red-50/20' : ''}`}>
                                            <td className={`px-4 py-3 ${isWeekend(item.ngay_truc) ? 'text-red-600 font-bold' : 'text-slate-600'}`}>
                                                {new Date(item.ngay_truc).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                                            </td>
                                            <td className={`px-4 py-3 font-medium ${isWeekend(item.ngay_truc) ? 'text-red-600' : 'text-green-700'}`}>{item.bac_sy}</td>
                                            <td className={`px-4 py-3 ${isWeekend(item.ngay_truc) ? 'text-red-600 font-medium' : 'text-blue-700'}`} title={item.dieu_duong || ''}>{item.dieu_duong}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={3} className="px-4 py-8 text-center text-slate-400 italic">Tuần này chưa có lịch trực</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden p-4 space-y-3">
                        {weeklyDuty.length > 0 ? (
                            weeklyDuty.map(item => (
                                <div key={item.id} className={`bg-slate-50 border rounded-lg p-3 ${isWeekend(item.ngay_truc) ? 'border-red-200 bg-red-50/30' : 'border-slate-100'}`}>
                                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200 border-dashed">
                                        <Calendar size={14} className="text-slate-400" />
                                        <span className={`text-sm font-semibold ${isWeekend(item.ngay_truc) ? 'text-red-600' : 'text-slate-700'}`}>
                                            {new Date(item.ngay_truc).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-start gap-2">
                                            <div className="mt-0.5 p-1 bg-green-100 text-green-600 rounded">
                                                <Stethoscope size={12} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-500 uppercase font-bold">Bác sỹ</p>
                                                <p className={`text-sm font-medium ${isWeekend(item.ngay_truc) ? 'text-red-600' : 'text-slate-800'}`}>{item.bac_sy}</p>
                                            </div>
                                        </div>
                                        {item.dieu_duong && (
                                            <div className="flex items-start gap-2">
                                                <div className="mt-0.5 p-1 bg-blue-100 text-blue-600 rounded">
                                                    <Heart size={12} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-slate-500 uppercase font-bold">Điều dưỡng</p>
                                                    <p className={`text-sm ${isWeekend(item.ngay_truc) ? 'text-red-600 font-medium' : 'text-slate-800'}`}>{item.dieu_duong}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-slate-400 italic py-4 text-sm">Tuần này chưa có lịch trực</div>
                        )}
                    </div>
                </div>
            </div>
            {/* Daily Assignment Detail Modal */}
            {isAssignmentModalOpen && todayAssignment && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 bg-[#009900] flex justify-between items-center">
                            <h2 className="text-lg font-bold text-white uppercase tracking-wide">Chi tiết phân công hôm nay</h2>
                            <button
                                onClick={() => setIsAssignmentModalOpen(false)}
                                className="text-white/80 hover:text-white transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
                                <Calendar className="text-blue-600" size={20} />
                                <span className="font-bold text-slate-700">
                                    {new Date(todayAssignment.ngay_thang).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {[
                                    { label: 'Buồng 1', value: todayAssignment.buong_1, iconColor: 'bg-blue-100 text-blue-600' },
                                    { label: 'Buồng 2', value: todayAssignment.buong_2, iconColor: 'bg-green-100 text-green-600' },
                                    { label: 'Buồng 3', value: todayAssignment.buong_3, iconColor: 'bg-purple-100 text-purple-600' },
                                    { label: 'Buồng 4', value: todayAssignment.buong_4, iconColor: 'bg-orange-100 text-orange-600' },
                                    { label: 'Chạy ngoài', value: todayAssignment.chay_ngoai, iconColor: 'bg-pink-100 text-pink-600' },
                                    { label: 'Chụp phim', value: todayAssignment.chup_phim, iconColor: 'bg-indigo-100 text-indigo-600' },
                                    { label: 'Làm số', value: todayAssignment.lam_so, iconColor: 'bg-amber-100 text-amber-600' }
                                ].map((item, idx) => item.value && (
                                    <div key={idx} className="flex items-start gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <div className={`w-10 h-10 rounded-lg ${item.iconColor} flex items-center justify-center shrink-0 font-bold text-xs`}>
                                            {idx < 4 ? `B${idx + 1}` : item.label.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">{item.label}</p>
                                            <p className="text-slate-800 font-bold text-base">{item.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8">
                                <button
                                    onClick={() => setIsAssignmentModalOpen(false)}
                                    className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
                                >
                                    Đóng cửa sổ
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
