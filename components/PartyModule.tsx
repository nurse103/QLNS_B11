import React, { useState, useEffect } from 'react';
import { getPersonnel, getEmployeeDetails, Employee, Family, WorkHistory, Training, Salary } from '../services/personnelService';
import { Search, Filter, BookOpen, Flag, Image as ImageIcon, User } from 'lucide-react';
import { EmployeeDetailsModal } from './EmployeeDetailsModal';

export const PartyModule = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewData, setViewData] = useState<{
        employee: Employee;
        family: Family[];
        workHistory: WorkHistory[];
        training: Training[];
        salary: Salary[];
    } | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                console.log("PartyModule: start fetching"); // Debug log
                const data = await getPersonnel();
                console.log("PartyModule: fetched data", data.length); // Debug log

                // Filter only employees who have joined the Party (ngay_vao_dang is not null/empty)
                // And only show active/relevant statuses
                const activeStatuses = ['Đang làm việc', 'Đang học việc', 'Tạm nghỉ việc'];
                const partyMembers = data.filter(emp => emp.ngay_vao_dang && emp.trang_thai && activeStatuses.includes(emp.trang_thai));
                console.log("PartyModule: filtered members", partyMembers); // Debug log
                setEmployees(partyMembers);
            } catch (error) {
                console.error("Error fetching party members:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const [filterType, setFilterType] = useState<'all' | 'doctor' | 'nurse'>('all');

    // Statistics logic
    const totalMembers = employees.length;

    const doctorGroupCount = employees.filter(emp =>
        emp.dien_quan_ly === 'Cán bộ'
    ).length;

    const nurseGroupCount = employees.filter(emp =>
        emp.dien_quan_ly === 'Quân lực'
    ).length;

    // Helper to calculate Party Age
    const getPartyAgeVal = (dateString: string | null) => {
        if (!dateString) return -1;
        const joinYear = new Date(dateString).getFullYear();
        if (isNaN(joinYear)) return -1;
        const currentYear = new Date().getFullYear();
        return currentYear - joinYear;
    };

    const getPartyAge = (dateString: string | null) => {
        const val = getPartyAgeVal(dateString);
        return val === -1 ? '-' : val;
    };

    const filteredEmployees = employees.filter(emp => {
        // 1. Text Search Filter
        const matchesSearch = emp.ho_va_ten.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (emp.so_the_dang && emp.so_the_dang.includes(searchTerm));

        // 2. Group Filter
        let matchesGroup = true;
        if (filterType === 'doctor') {
            matchesGroup = emp.dien_quan_ly === 'Cán bộ';
        } else if (filterType === 'nurse') {
            matchesGroup = emp.dien_quan_ly === 'Quân lực';
        }

        return matchesSearch && matchesGroup;
    });

    // 3. Sort by Party Age (Tuổi đảng từ lớn đến bé)
    const sortedEmployees = [...filteredEmployees].sort((a, b) => {
        const ageA = getPartyAgeVal(a.ngay_vao_dang);
        const ageB = getPartyAgeVal(b.ngay_vao_dang);
        return ageB - ageA;
    });

    const handleView = async (emp: Employee) => {
        try {
            const details = await getEmployeeDetails(emp.id);
            setViewData(details);
            setIsViewModalOpen(true);
        } catch (error) {
            console.error("Failed to fetch details for view:", error);
            alert("Không thể tải thông tin chi tiết.");
        }
    };

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Flag className="text-red-600" />
                        Quản lý Đảng viên
                    </h1>
                    <p className="text-slate-500 mt-1">Danh sách cán bộ, nhân viên là Đảng viên</p>
                </div>
            </div>

            {/* Statistics Cards & Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button
                    onClick={() => setFilterType('all')}
                    className={`p-4 rounded-xl shadow-sm border transition-all flex items-center gap-4 text-left
                        ${filterType === 'all' ? 'bg-red-50 border-red-200 ring-2 ring-red-500 ring-offset-2' : 'bg-white border-slate-100 hover:border-red-200 hover:shadow-md'}
                    `}
                >
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 shrink-0">
                        <Flag size={24} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-sm font-medium">Tổng số Đảng viên</p>
                        <p className={`text-2xl font-bold ${filterType === 'all' ? 'text-red-700' : 'text-slate-800'}`}>{totalMembers}</p>
                    </div>
                </button>

                <button
                    onClick={() => setFilterType('doctor')}
                    className={`p-4 rounded-xl shadow-sm border transition-all flex items-center gap-4 text-left
                        ${filterType === 'doctor' ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500 ring-offset-2' : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-md'}
                    `}
                >
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 shrink-0">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-sm font-medium">Tổ đảng Bác sỹ</p>
                        <p className={`text-2xl font-bold ${filterType === 'doctor' ? 'text-blue-700' : 'text-slate-800'}`}>{doctorGroupCount}</p>
                    </div>
                </button>

                <button
                    onClick={() => setFilterType('nurse')}
                    className={`p-4 rounded-xl shadow-sm border transition-all flex items-center gap-4 text-left
                        ${filterType === 'nurse' ? 'bg-green-50 border-green-200 ring-2 ring-green-500 ring-offset-2' : 'bg-white border-slate-100 hover:border-green-200 hover:shadow-md'}
                     `}
                >
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 shrink-0">
                        <Filter size={24} />
                    </div>
                    <div>
                        <p className="text-slate-500 text-sm font-medium">Tổ đảng Điều dưỡng</p>
                        <p className={`text-2xl font-bold ${filterType === 'nurse' ? 'text-green-700' : 'text-slate-800'}`}>{nurseGroupCount}</p>
                    </div>
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo tên hoặc số thẻ đảng..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-slate-500">Đang tải dữ liệu...</div>
                ) : (
                    <div className="overflow-x-auto">
                        {/* Desktop Table: Hidden on small screens */}
                        <table className="w-full text-sm text-left hidden md:table">
                            <thead className="bg-red-600 text-white font-medium">
                                <tr>
                                    <th className="px-6 py-3">STT</th>
                                    <th className="px-6 py-3">Họ và tên</th>
                                    <th className="px-6 py-3 text-center">Tuổi đảng</th>
                                    <th className="px-6 py-3">Ngày vào Đảng</th>
                                    <th className="px-6 py-3">Ngày chính thức</th>
                                    <th className="px-6 py-3">Số thẻ Đảng</th>
                                    <th className="px-6 py-3 text-center">Ảnh thẻ Đảng</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sortedEmployees.length > 0 ? (
                                    sortedEmployees.map((emp, index) => (
                                        <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-500">{index + 1}</td>
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-800">
                                                <button
                                                    onClick={() => handleView(emp)}
                                                    className="text-left hover:text-red-600 transition-colors"
                                                >
                                                    {emp.ho_va_ten}
                                                    <div className="text-xs text-slate-500 font-normal">{emp.chuc_vu}</div>
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap font-bold text-red-600 text-center">
                                                {getPartyAge(emp.ngay_vao_dang)} năm
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                                {emp.ngay_vao_dang ? new Date(emp.ngay_vao_dang).toLocaleDateString('vi-VN') : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                                {emp.ngay_chinh_thuc ? new Date(emp.ngay_chinh_thuc).toLocaleDateString('vi-VN') : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-800">
                                                {emp.so_the_dang || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                {emp.anh_the_dang ? (
                                                    <a href={emp.anh_the_dang} target="_blank" rel="noopener noreferrer" className="inline-block">
                                                        <img
                                                            src={emp.anh_the_dang}
                                                            alt="Thẻ đảng"
                                                            className="h-10 w-16 object-cover rounded border border-slate-200 hover:scale-150 transition-transform cursor-pointer bg-slate-100"
                                                        />
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-400 italic text-xs flex justify-center items-center gap-1">
                                                        <ImageIcon size={14} /> Chưa có
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                            <div className="flex flex-col items-center gap-2">
                                                <Flag className="w-12 h-12 text-slate-300" />
                                                <p className="font-medium text-lg">Chưa có dữ liệu đảng viên</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Mobile Table: 4 columns - Visible only on mobile */}
                        <table className="w-full text-[12px] text-left md:hidden bg-white">
                            <thead className="bg-red-600 text-white font-medium uppercase tracking-wider">
                                <tr>
                                    <th className="px-2 py-2 w-10 text-center border-r border-red-500/30">STT</th>
                                    <th className="px-3 py-2 border-r border-red-500/30">Họ và tên</th>
                                    <th className="px-2 py-2 text-center w-16 border-r border-red-500/30">Tuổi đảng</th>
                                    <th className="px-2 py-2 text-center w-24">Ngày vào</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sortedEmployees.length > 0 ? (
                                    sortedEmployees.map((emp, index) => (
                                        <tr key={emp.id} className="active:bg-slate-100 transition-colors">
                                            <td className="px-2 py-3 text-center font-medium text-slate-400 border-r border-slate-50">{index + 1}</td>
                                            <td className="px-3 py-3 font-bold text-slate-800 border-r border-slate-50">
                                                <button
                                                    onClick={() => handleView(emp)}
                                                    className="w-full text-left flex flex-col items-start gap-1"
                                                >
                                                    <span className="text-blue-700 leading-tight border-b border-blue-200/50">{emp.ho_va_ten}</span>
                                                    <span className="text-[10px] font-normal text-slate-500 bg-slate-50 px-1 py-0.5 rounded leading-none shrink-0 truncate max-w-[120px]">
                                                        {emp.chuc_vu}
                                                    </span>
                                                </button>
                                            </td>
                                            <td className="px-2 py-3 text-center font-black text-red-600 border-r border-slate-50">
                                                {getPartyAge(emp.ngay_vao_dang)}
                                            </td>
                                            <td className="px-2 py-3 text-center text-slate-600 font-medium">
                                                {emp.ngay_vao_dang ? new Date(emp.ngay_vao_dang).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-'}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">
                                            Chưa có dữ liệu đảng viên
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* View Detail Modal */}
            {isViewModalOpen && viewData && (
                <EmployeeDetailsModal
                    employee={viewData.employee}
                    family={viewData.family}
                    workHistory={viewData.workHistory}
                    training={viewData.training}
                    salary={viewData.salary}
                    onClose={() => setIsViewModalOpen(false)}
                />
            )}
        </div>
    );
};
