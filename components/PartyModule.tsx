import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getPersonnel, Employee } from '../services/personnelService';
import { Search, Filter, BookOpen, Flag, Image as ImageIcon, Eye, Pencil, FileDown } from 'lucide-react';
import { PartyCardPreview } from './PartyCardPreview';
import { PartyProfileModal } from './PartyProfileModal';
import { getAuthUser } from '../services/authService';
import { canEditPersonnelRecord } from '../utils/ownershipUtils';

export const PartyModule = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    // Xem chi tiết = xem trước bản Word sẽ xuất ra
    const [previewEmployee, setPreviewEmployee] = useState<Employee | null>(null);
    // Modal nhập liệu, mở từ nút "Sửa phiếu" trong bản xem trước
    const [profileEmployee, setProfileEmployee] = useState<Employee | null>(null);
    // Modal xuất lý lịch (popup xem trước + tải Word), mở từ nút "Xuất" trên bảng
    const [exportEmployee, setExportEmployee] = useState<Employee | null>(null);
    const authUser = useMemo(() => getAuthUser(), []);

    // Tải lại danh sách - dùng cả khi mở trang và sau khi lưu phiếu đảng viên
    // (phiếu có thể sửa ngược thông tin cá nhân trong dsnv).
    const refreshMembers = useCallback(async () => {
        try {
            const data = await getPersonnel();

            // Filter only employees who have joined the Party (ngay_vao_dang is not null/empty)
            // And only show active/relevant statuses
            const activeStatuses = ['Đang làm việc', 'Đang học việc', 'Tạm nghỉ việc'];
            const partyMembers = data.filter(emp => emp.ngay_vao_dang && emp.trang_thai && activeStatuses.includes(emp.trang_thai));
            setEmployees(partyMembers);
        } catch (error) {
            console.error("Error fetching party members:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshMembers();
    }, [refreshMembers]);

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

    const handleView = (emp: Employee) => setPreviewEmployee(emp);
    // Mở thẳng phiếu nhập liệu, không phải đi qua bản xem trước
    const handleEdit = (emp: Employee) => setProfileEmployee(emp);
    // Nút sửa bám theo tài khoản đang đăng nhập:
    // admin sửa được mọi hồ sơ, người khác chỉ sửa hồ sơ mang đúng họ tên của mình.
    const canEditEmployee = (emp: Employee) => canEditPersonnelRecord(emp, authUser);

    const fmtDate = (value: string | null) => (value ? new Date(value).toLocaleDateString('vi-VN') : '-');

    // Xem/sửa chi tiết hiển thị phẳng ngay trong trang (thay chỗ danh sách),
    // không mở popup. Đóng phiếu nhập liệu sẽ quay về bản xem trước nếu đang mở.
    if (profileEmployee) {
        return (
            <div className="p-4 md:p-6">
                <PartyProfileModal
                    employee={profileEmployee}
                    canEdit={canEditEmployee(profileEmployee)}
                    onClose={() => setProfileEmployee(null)}
                    onSaved={refreshMembers}
                />
            </div>
        );
    }

    if (previewEmployee) {
        return (
            <div className="p-4 md:p-6">
                <PartyCardPreview
                    employee={previewEmployee}
                    canEdit={canEditEmployee(previewEmployee)}
                    onClose={() => setPreviewEmployee(null)}
                    onEdit={() => setProfileEmployee(previewEmployee)}
                />
            </div>
        );
    }

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
                                    <th className="px-6 py-3 text-center">Thao tác</th>
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
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleView(emp)}
                                                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 flex items-center gap-1.5"
                                                    >
                                                        <Eye size={14} /> Xem
                                                    </button>
                                                    <button
                                                        onClick={() => setExportEmployee(emp)}
                                                        className="px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 flex items-center gap-1.5"
                                                    >
                                                        <FileDown size={14} /> Xuất
                                                    </button>
                                                    {canEditEmployee(emp) && (
                                                        <button
                                                            onClick={() => handleEdit(emp)}
                                                            className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 flex items-center gap-1.5"
                                                        >
                                                            <Pencil size={14} /> Sửa
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                                            <div className="flex flex-col items-center gap-2">
                                                <Flag className="w-12 h-12 text-slate-300" />
                                                <p className="font-medium text-lg">Chưa có dữ liệu đảng viên</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Mobile: danh sách card gọn - họ tên, ngày vào Đảng, nút Xem/Sửa */}
                        <div className="md:hidden divide-y divide-slate-100">
                            {sortedEmployees.length > 0 ? (
                                sortedEmployees.map(emp => (
                                    <div key={emp.id} className="p-4">
                                        <p className="font-bold text-slate-800 leading-tight">{emp.ho_va_ten}</p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Ngày vào Đảng:{' '}
                                            <span className="font-medium text-slate-700">{fmtDate(emp.ngay_vao_dang)}</span>
                                        </p>
                                        <div className="flex gap-2 mt-3">
                                            <button
                                                onClick={() => handleView(emp)}
                                                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium active:bg-slate-100 flex items-center justify-center gap-1.5"
                                            >
                                                <Eye size={16} /> Xem
                                            </button>
                                            <button
                                                onClick={() => setExportEmployee(emp)}
                                                className="flex-1 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-sm font-medium active:bg-blue-100 flex items-center justify-center gap-1.5"
                                            >
                                                <FileDown size={16} /> Xuất
                                            </button>
                                            {canEditEmployee(emp) && (
                                                <button
                                                    onClick={() => handleEdit(emp)}
                                                    className="flex-1 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-medium active:bg-red-700 flex items-center justify-center gap-1.5"
                                                >
                                                    <Pencil size={16} /> Sửa
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="px-4 py-8 text-center text-slate-400 italic">Chưa có dữ liệu đảng viên</div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal xuất lý lịch: bản xem trước A4 + nút tải Word */}
            {exportEmployee && (
                <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
                    <div className="w-full max-w-4xl my-2 sm:my-6">
                        <PartyCardPreview
                            employee={exportEmployee}
                            canEdit={canEditEmployee(exportEmployee)}
                            onClose={() => setExportEmployee(null)}
                            onEdit={() => {
                                const emp = exportEmployee;
                                setExportEmployee(null);
                                setProfileEmployee(emp);
                            }}
                        />
                    </div>
                </div>
            )}

        </div>
    );
};
