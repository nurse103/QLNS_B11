import React, { useState, useEffect } from 'react';
import { getPersonnel, Employee } from '../services/personnelService';
import { Search, Filter, BookOpen, Flag, Image as ImageIcon } from 'lucide-react';

export const PartyModule = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                console.log("PartyModule: start fetching"); // Debug log
                const data = await getPersonnel();
                console.log("PartyModule: fetched data", data.length); // Debug log

                // Filter only employees who have joined the Party (ngay_vao_dang is not null/empty)
                const partyMembers = data.filter(emp => emp.ngay_vao_dang);
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
    const doctorGroupKeywords = ["Bác sỹ", "Học viên", "Chủ nhiệm khoa", "Phó chủ nhiệm khoa"];
    const nurseGroupKeywords = ["Điều dưỡng viên", "Điều dưỡng trưởng"];

    const doctorGroupCount = employees.filter(emp =>
        emp.chuc_vu && doctorGroupKeywords.some(keyword => emp.chuc_vu!.includes(keyword))
    ).length;

    const nurseGroupCount = employees.filter(emp =>
        emp.chuc_vu && nurseGroupKeywords.some(keyword => emp.chuc_vu!.includes(keyword))
    ).length;

    // Helper to calculate Party Age
    const getPartyAge = (dateString: string | null) => {
        if (!dateString) return '-';
        const joinYear = new Date(dateString).getFullYear();
        const currentYear = new Date().getFullYear();
        return currentYear - joinYear;
    };

    const filteredEmployees = employees.filter(emp => {
        // 1. Text Search Filter
        const matchesSearch = emp.ho_va_ten.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (emp.so_the_dang && emp.so_the_dang.includes(searchTerm));

        // 2. Group Filter
        let matchesGroup = true;
        if (filterType === 'doctor') {
            matchesGroup = !!emp.chuc_vu && doctorGroupKeywords.some(k => emp.chuc_vu!.includes(k));
        } else if (filterType === 'nurse') {
            matchesGroup = !!emp.chuc_vu && nurseGroupKeywords.some(k => emp.chuc_vu!.includes(k));
        }

        return matchesSearch && matchesGroup;
    });

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
                        <table className="w-full text-sm text-left">
                            <thead className="bg-red-600 text-white font-medium">
                                <tr>
                                    <th className="px-6 py-3">STT</th>
                                    <th className="px-6 py-3">Họ và tên</th>
                                    <th className="px-6 py-3">Tuổi đảng</th>
                                    <th className="px-6 py-3">Ngày vào Đảng</th>
                                    <th className="px-6 py-3">Ngày chính thức</th>
                                    <th className="px-6 py-3">Số thẻ Đảng</th>
                                    <th className="px-6 py-3">Ngày cấp</th>
                                    <th className="px-6 py-3">Nơi cấp</th>
                                    <th className="px-6 py-3 text-center">Ảnh thẻ Đảng</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredEmployees.length > 0 ? (
                                    filteredEmployees.map((emp, index) => (
                                        <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-500">{index + 1}</td>
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-800">
                                                {emp.ho_va_ten}
                                                <div className="text-xs text-slate-500 font-normal">{emp.chuc_vu}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap font-bold text-red-600">
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
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                                {emp.ngay_cap_the_dang ? new Date(emp.ngay_cap_the_dang).toLocaleDateString('vi-VN') : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                                {emp.noi_cap_the_dang || '-'}
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
                                        <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                                            <div className="flex flex-col items-center gap-2">
                                                <Flag className="w-12 h-12 text-slate-300" />
                                                <p className="font-medium text-lg">Chưa có dữ liệu đảng viên</p>
                                                <p className="text-sm">Vui lòng cập nhật "Ngày vào Đảng" trong hồ sơ nhân viên để hiển thị tại đây.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
