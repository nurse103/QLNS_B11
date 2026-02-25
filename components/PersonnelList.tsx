import React, { useState, useEffect, useRef } from 'react';
import {
    Search,
    Edit,
    FileText,
    Users,
    Eye,
    Trash2,
    Plus,
    Save,
    X,
    Baby,
    Briefcase,
    GraduationCap,
    Activity,
    Heart,
    History,
    BadgeCheck,
    HeartPulse,
    User
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { EmployeeDetailsModal } from './EmployeeDetailsModal';
import { usePermissions } from '../hooks/usePermissions';
import {
    getPersonnel,
    createPersonnel,
    updatePersonnel,
    bulkCreatePersonnel,
    bulkUpdatePersonnel,
    deletePersonnel,
    getEmployeeDetails,
    uploadPartyCardImage,
    Employee,
    Family,
    WorkHistory,
    Training,
    Salary
} from '../services/personnelService';

// Helper function
const formatDateVN = (dateStr: string | undefined | null) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return dateStr;
    return `${day}/${month}/${year}`;
};

export const PersonnelList = () => {
    const [personnel, setPersonnel] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Permissions
    const { can_add, can_edit, can_delete } = usePermissions('p-list');

    // View Modal State
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [viewData, setViewData] = useState<{
        employee: Employee;
        family: Family[];
        workHistory: WorkHistory[];
        training: Training[];
        salary: Salary[];
    } | null>(null);

    const [activeTab, setActiveTab] = useState('general');
    const [filterType, setFilterType] = useState<string>('all');

    // Bulk Selection State
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);
    const [bulkStatus, setBulkStatus] = useState<string>('');
    const [bulkObject, setBulkObject] = useState<string>('');
    const [bulkManagementArea, setBulkManagementArea] = useState<string>('');

    // Form State
    const [formData, setFormData] = useState<Partial<Employee>>({});
    const [familyList, setFamilyList] = useState<Family[]>([]);
    const [workHistoryList, setWorkHistoryList] = useState<WorkHistory[]>([]);
    const [trainingList, setTrainingList] = useState<Training[]>([]);
    const [salaryList, setSalaryList] = useState<Salary[]>([]);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Filter Logic
    const filteredPersonnel = personnel.filter(p => {
        // 1. Text Search
        const searchLower = searchTerm.toLowerCase();
        const matchSearch =
            (p.ho_va_ten?.toLowerCase().includes(searchLower) || '') ||
            (p.so_the_dang?.includes(searchLower) || '') ||
            (p.chuc_vu?.toLowerCase().includes(searchLower) || '');

        // 2. Filter by Doi Tuong (Object) or Trang Thai (Status)
        const matchFilter = filterType === 'all' ||
            p.doi_tuong === filterType ||
            p.trang_thai === filterType ||
            (filterType === 'Sĩ quan' && p.doi_tuong === 'Sỹ quan'); // Handle spelling variation

        return matchSearch && matchFilter;
    });

    // Calculate Pagination
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredPersonnel.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredPersonnel.length / itemsPerPage);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setItemsPerPage(Number(e.target.value));
        setCurrentPage(1); // Reset to first page
    };

    // Temp State for adding new items to lists
    const [tempFamily, setTempFamily] = useState<Partial<Family>>({});
    const [tempWork, setTempWork] = useState<Partial<WorkHistory>>({});
    const [tempTraining, setTempTraining] = useState<Partial<Training>>({});
    const [tempSalary, setTempSalary] = useState<Partial<Salary>>({});

    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getPersonnel();
            // Sort Priority: Đang làm việc > Đang học việc > Tạm nghỉ việc > Đã nghỉ việc
            const statusPriority: { [key: string]: number } = {
                'Đang làm việc': 1,
                'Đang học việc': 2,
                'Tạm nghỉ việc': 3,
                'Đã nghỉ việc': 4
            };

            const sortedData = data.sort((a, b) => {
                const priorityA = statusPriority[a.trang_thai || ''] || 99;
                const priorityB = statusPriority[b.trang_thai || ''] || 99;

                if (priorityA !== priorityB) {
                    return priorityA - priorityB;
                }

                // If same status, sort by name
                return (a.ho_va_ten || '').localeCompare(b.ho_va_ten || '');
            });
            setPersonnel(sortedData);
        } catch (error) {
            console.error("Failed to fetch personnel:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name === 'ngay_vao_dang' && value) {
            const admissionDate = new Date(value);
            if (!isNaN(admissionDate.getTime())) {
                const officialDate = new Date(admissionDate);
                officialDate.setFullYear(admissionDate.getFullYear() + 1);
                const officialDateStr = officialDate.toISOString().split('T')[0];

                setFormData(prev => ({
                    ...prev,
                    [name]: value,
                    ngay_chinh_thuc: officialDateStr
                }));
                return;
            }
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.ho_va_ten) {
            alert("Vui lòng nhập họ và tên");
            return;
        }

        try {
            if (formData.id) {
                await updatePersonnel(formData.id, formData, familyList, workHistoryList, trainingList, salaryList);
                alert("Cập nhật nhân viên thành công!");
            } else {
                await createPersonnel(formData as any, familyList, workHistoryList, trainingList, salaryList);
                alert("Thêm nhân viên thành công!");
            }
            setIsModalOpen(false);
            // Reset all form state
            setFormData({});
            setFamilyList([]);
            setWorkHistoryList([]);
            setTrainingList([]);
            setSalaryList([]);
            setActiveTab('general');
            fetchData();
        } catch (error) {
            console.error("Failed to create personnel:", error);
            alert("Có lỗi xảy ra khi lưu nhân viên.");
        }
    };

    const toggleSelection = (id: number) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allIds = new Set(filteredPersonnel.map(emp => emp.id));
            setSelectedIds(allIds);
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleBulkUpdate = async () => {
        if (selectedIds.size === 0) return;
        if (!bulkStatus && !bulkObject && !bulkManagementArea) {
            alert("Vui lòng chọn ít nhất một thông tin cần cập nhật.");
            return;
        }

        try {
            const updates: Partial<Employee> = {};
            if (bulkStatus) updates.trang_thai = bulkStatus;
            if (bulkObject) updates.doi_tuong = bulkObject;
            if (bulkManagementArea) updates.dien_quan_ly = bulkManagementArea;

            await bulkUpdatePersonnel(Array.from(selectedIds), updates);
            alert(`Đã cập nhật cho ${selectedIds.size} nhân viên!`);
            setIsBulkUpdateModalOpen(false);
            setSelectedIds(new Set());
            setBulkStatus('');
            setBulkObject('');
            setBulkManagementArea('');
            fetchData();
        } catch (error) {
            console.error("Bulk update failed:", error);
            alert("Có lỗi xảy ra khi cập nhật.");
        }
    };

    const handleView = async (emp: Employee) => {
        try {
            const details = await getEmployeeDetails(emp.id);
            setViewData(details);
            setIsViewModalOpen(true);
        } catch (error) {
            console.error("Failed to fetch details for view:", error);
            alert("Không thể tải thông tin chi tiết.");
            setIsViewModalOpen(false);
            setViewData(null);
        }
    };

    const handleEdit = async (emp: Employee) => {
        try {
            const details = await getEmployeeDetails(emp.id);
            setFormData(details.employee);
            setFamilyList(details.family || []);
            setWorkHistoryList(details.workHistory || []);
            setTrainingList(details.training || []);
            setSalaryList(details.salary || []);
            setIsModalOpen(true);
        } catch (error) {
            console.error("Failed to fetch details:", error);
            alert("Không thể tải thông tin chi tiết.");
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa nhân viên này không? Hành động này không thể hoàn tác.")) {
            try {
                await deletePersonnel(id);
                alert("Đã xóa nhân viên thành công!");
                fetchData();
            } catch (error) {
                console.error("Failed to delete personnel:", error);
                alert("Có lỗi xảy ra khi xóa nhân viên.");
            }
        }
    };

    const addItem = (listName: string, item: any, setItem: any, setList: any) => {
        setList((prev: any) => [...prev, item]);
        setItem({});
    };

    const removeItem = (index: number, setList: any) => {
        setList((prev: any) => prev.filter((_: any, i: number) => i !== index));
    };

    const handleDownloadTemplate = () => {
        const headers = [
            "Họ và tên", "Ngày sinh", "Giới tính", "Cấp bậc", "Chức vụ", "CCCD", "Ngày cấp CCCD",
            "CMQĐ", "Ngày cấp CMQĐ", "Quê quán", "Nơi ở hiện nay", "Điện thoại",
            "Tháng năm tuyển dụng", "Tháng năm nhập ngũ", "Ngày về khoa", "Trạng thái",
            "Diện quản lý", "Ngày vào đảng", "Ngày chính thức", "Số thẻ đảng", "Ngày cấp thẻ đảng"
        ];
        const ws = XLSX.utils.aoa_to_sheet([headers]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Mau_Nhap_Lieu");
        XLSX.writeFile(wb, "Mau_Nhap_Lieu_Nhan_Su.xlsx");
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

            // Remove header row
            const rows = data.slice(1);

            // Helper to process excel dates
            const processDate = (value: any) => {
                if (!value) return null;
                if (typeof value === 'number') {
                    // Excel date serial number
                    const date = new Date((value - (25567 + 2)) * 86400 * 1000);
                    return date.toISOString().split('T')[0];
                }
                if (typeof value === 'string') {
                    // Handle DD/MM/YYYY
                    if (value.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
                        const [d, m, y] = value.split('/');
                        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                    }
                    // Try standard date parse
                    try {
                        const date = new Date(value);
                        if (!isNaN(date.getTime())) {
                            return date.toISOString().split('T')[0];
                        }
                    } catch (e) { }
                }
                return null;
            };

            const newEmployees: Omit<Employee, 'id' | 'created_at'>[] = rows.map(row => ({
                ho_va_ten: row[0],
                ngay_sinh: processDate(row[1]),
                gioi_tinh: row[2],
                cap_bac: row[3],
                chuc_vu: row[4],
                cccd: row[5] ? String(row[5]) : null,
                ngay_cap_cccd: processDate(row[6]),
                cmqd: row[7] ? String(row[7]) : null,
                ngay_cap_cmqd: processDate(row[8]),
                que_quan: row[9],
                noi_o_hien_nay: row[10],
                dien_thoai: row[11] ? String(row[11]) : null,
                thang_nam_tuyen_dung: processDate(row[12]),
                thang_nam_nhap_ngu: processDate(row[13]),
                ngay_ve_khoa_cong_tac: processDate(row[14]),
                trang_thai: row[15],
                dien_quan_ly: row[16],
                ngay_vao_dang: processDate(row[17]),
                ngay_chinh_thuc: processDate(row[18]),
                so_the_dang: row[19] ? String(row[19]) : null,
                ngay_cap_the_dang: processDate(row[20]),
                chung_chi_hanh_nghe: row[21] || null, // Added chung_chi_hanh_nghe
                // Default null for others
                thang_nam_roi_khoa: null,
                trang_thai_roi_khoa: null,
                noi_den: null,
                avatar: null,
                ghi_chu: null,
                doi_tuong: null,
                danh_hieu: null,
                don_vi_id: null,
                noi_cap_the_dang: null,
                anh_the_dang: null
            })).filter(e => e.ho_va_ten); // Ensure name exists

            if (newEmployees.length > 0) {
                try {
                    await bulkCreatePersonnel(newEmployees);
                    alert(`Đã nhập thành công ${newEmployees.length} nhân viên!`);
                    fetchData();
                } catch (error: any) {
                    console.error("Import failed:", error);
                    alert(`Có lỗi xảy ra khi nhập dữ liệu: ${error.message || JSON.stringify(error)}`);
                }
            }
        };
        reader.readAsBinaryString(file);

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="p-4 md:p-6 pb-20 md:pb-6">
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Danh sách nhân viên</h1>
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo tên..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1); // Reset to page 1 on search
                            }}
                        />
                    </div>
                    <div className="flex gap-2 ml-auto overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
                        {/* Import Buttons */}
                        <div className="flex gap-2 mr-4">
                            {can_edit && selectedIds.size > 0 && (
                                <button
                                    onClick={() => setIsBulkUpdateModalOpen(true)}
                                    className="px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 flex items-center gap-2 animate-fade-in whitespace-nowrap"
                                >
                                    <Edit size={16} /> <span className="hidden md:inline">Cập nhật ({selectedIds.size})</span>
                                </button>
                            )}

                            {can_add && (
                                <>
                                    <input
                                        type="file"
                                        accept=".xlsx, .xls"
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                    />
                                    <button
                                        onClick={handleDownloadTemplate}
                                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2 whitespace-nowrap"
                                    >
                                        <FileText size={16} /> <span className="hidden md:inline">Tải mẫu</span>
                                    </button>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2 whitespace-nowrap"
                                    >
                                        <FileText size={16} /> <span className="hidden md:inline">Import</span>
                                    </button>
                                </>
                            )}
                        </div>

                        {can_add && (
                            <button
                                onClick={() => {
                                    setFormData({ trang_thai: 'Đang làm việc' });
                                    setIsModalOpen(true);
                                }}
                                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2 whitespace-nowrap"
                            >
                                <Users size={16} /> <span className="hidden md:inline">Thêm mới</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Quick Filters */}
                <div className="px-4 pb-4 flex gap-2 overflow-x-auto scrollbar-hide">
                    {['all', 'Sĩ quan', 'QNCN', 'LĐHĐ'].map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${filterType === type
                                ? 'bg-green-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            {type === 'all' ? 'Tất cả' : type}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="p-8 text-center text-slate-500">Đang tải dữ liệu...</div>
                ) : (
                    <>
                        {/* Desktop View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-[#009900] text-white font-medium">
                                    <tr>
                                        <th className="px-4 py-3 w-10">
                                            <input
                                                type="checkbox"
                                                onChange={handleSelectAll}
                                                checked={filteredPersonnel.length > 0 && selectedIds.size === filteredPersonnel.length}
                                                className="rounded border-slate-300 transform scale-125 accent-green-600"
                                            />
                                        </th>
                                        <th className="px-6 py-3">Họ và tên / Cấp bậc / Chức danh/Chức vụ</th>
                                        <th className="px-6 py-3">Ngày sinh / Giới tính</th>
                                        <th className="px-6 py-3">Đối tượng</th>
                                        <th className="px-6 py-3">Trạng thái</th>
                                        <th className="px-6 py-3">Ngày về khoa</th>
                                        <th className="px-6 py-3 text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {currentItems.length > 0 ? (
                                        currentItems.map((employee, index) => (
                                            <tr key={employee.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                                            checked={selectedIds.has(employee.id)}
                                                            onChange={() => toggleSelection(employee.id)}
                                                        />
                                                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-xs">
                                                            {employee.ho_va_ten?.charAt(0)}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-bold text-slate-800">{employee.ho_va_ten}</div>
                                                    <div className="text-xs text-slate-500 mt-0.5">
                                                        {employee.cap_bac} {employee.cap_bac && employee.chuc_vu ? '-' : ''} {employee.chuc_vu}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-slate-700">
                                                        {employee.ngay_sinh ? new Date(employee.ngay_sinh).toLocaleDateString('vi-VN') : '-'}
                                                    </div>
                                                    <div className="text-xs text-slate-500 mt-0.5">{employee.gioi_tinh || '-'}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{employee.doi_tuong || '-'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${employee.trang_thai === 'Đang làm việc' ? 'bg-green-100 text-green-800' :
                                                        employee.trang_thai === 'Đã nghỉ hưu' ? 'bg-slate-100 text-slate-800' :
                                                            'bg-red-100 text-red-800'
                                                        }`}>
                                                        {employee.trang_thai || 'Chưa cập nhật'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                                    {employee.ngay_ve_khoa_cong_tac ? new Date(employee.ngay_ve_khoa_cong_tac).toLocaleDateString('vi-VN') : '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handleView(employee)}
                                                            className="flex items-center gap-1 px-2 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                            title="Xem chi tiết"
                                                        >
                                                            <Eye size={14} />
                                                            <span>Xem</span>
                                                        </button>
                                                        {can_edit && (
                                                            <button
                                                                onClick={() => handleEdit(employee)}
                                                                className="flex items-center gap-1 px-2 py-1 text-orange-600 hover:bg-orange-50 rounded transition-colors"
                                                                title="Chỉnh sửa"
                                                            >
                                                                <Edit size={14} />
                                                                <span>Sửa</span>
                                                            </button>
                                                        )}
                                                        {can_delete && (
                                                            <button
                                                                onClick={() => handleDelete(employee.id)}
                                                                className="flex items-center gap-1 px-2 py-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                title="Xóa nhân viên"
                                                            >
                                                                <Trash2 size={14} />
                                                                <span>Xóa</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                                Không tìm thấy nhân sự phù hợp
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile View */}
                        <div className="md:hidden space-y-4 p-4 bg-slate-50">
                            {currentItems.length > 0 ? (
                                currentItems.map((employee) => (
                                    <div key={employee.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 space-y-3 relative">
                                        {/* Selection Checkbox */}
                                        <div className="absolute top-4 right-4">
                                            <input
                                                type="checkbox"
                                                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 w-5 h-5"
                                                checked={selectedIds.has(employee.id)}
                                                onChange={() => toggleSelection(employee.id)}
                                            />
                                        </div>

                                        {/* Row 1: Name and Status */}
                                        <div className="pr-10">
                                            <h3 className="font-bold text-slate-800 text-base">{employee.ho_va_ten}</h3>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium mt-1 ${employee.trang_thai === 'Đang làm việc' ? 'bg-green-50 text-green-700 border border-green-100' :
                                                employee.trang_thai === 'Đã nghỉ hưu' ? 'bg-slate-100 text-slate-600 border border-slate-200' :
                                                    'bg-red-50 text-red-700 border border-red-100'
                                                }`}>
                                                {employee.trang_thai || 'Chưa cập nhật'}
                                            </span>
                                        </div>

                                        {/* Row 2: Info Grid */}
                                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                                            <div>
                                                <span className="text-slate-400 block mb-0.5">Cấp bậc / Chức danh/Chức vụ:</span>
                                                <span className="font-medium text-slate-700">{employee.cap_bac || '-'} / {employee.chuc_vu || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block mb-0.5">Đối tượng:</span>
                                                <span className="font-medium text-slate-700">{employee.doi_tuong || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block mb-0.5">Ngày sinh:</span>
                                                <span className="font-medium text-slate-700">{employee.ngay_sinh ? formatDateVN(employee.ngay_sinh) : '-'}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block mb-0.5">Về khoa:</span>
                                                <span className="font-medium text-slate-700">{employee.ngay_ve_khoa_cong_tac ? formatDateVN(employee.ngay_ve_khoa_cong_tac) : '-'}</span>
                                            </div>
                                        </div>

                                        {/* Row 3: Actions */}
                                        <div className="pt-3 border-t border-slate-100 flex gap-2">
                                            <button
                                                onClick={() => handleView(employee)}
                                                className="flex-1 py-2 text-slate-600 bg-slate-50 hover:bg-slate-100 rounded text-xs font-medium transition-colors border border-slate-200"
                                            >
                                                Xem
                                            </button>
                                            {can_edit && (
                                                <button
                                                    onClick={() => handleEdit(employee)}
                                                    className="flex-1 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded text-xs font-medium transition-colors border border-blue-100"
                                                >
                                                    Sửa
                                                </button>
                                            )}
                                            {can_delete && (
                                                <button
                                                    onClick={() => handleDelete(employee.id)}
                                                    className="flex-1 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded text-xs font-medium transition-colors border border-red-100"
                                                >
                                                    Xóa
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-slate-500 italic py-8">
                                    Không có nhân viên nào.
                                </div>
                            )}
                        </div>
                    </>
                )}

                <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-sm text-slate-600 gap-4">
                    <div className="flex items-center gap-4">
                        <span>
                            Hiển thị {currentItems.length > 0 ? indexOfFirstItem + 1 : 0}-{Math.min(indexOfLastItem, filteredPersonnel.length)} của {filteredPersonnel.length} nhân viên
                        </span>
                        <select
                            value={itemsPerPage}
                            onChange={handleItemsPerPageChange}
                            className="border border-slate-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <option value={5}>5 dòng</option>
                            <option value={10}>10 dòng</option>
                            <option value={15}>15 dòng</option>
                            <option value={20}>20 dòng</option>
                            <option value={50}>50 dòng</option>
                            <option value={100}>100 dòng</option>
                        </select>
                    </div>

                    <div className="flex gap-1">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-3 py-1 border rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Trước
                        </button>

                        {/* Simple Page Numbers */}
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let p = currentPage - 2 + i;
                            if (currentPage < 3) p = 1 + i;
                            if (currentPage > totalPages - 2) p = totalPages - 4 + i;
                            if (p < 1) p = 1;
                            if (p > totalPages) return null;

                            return (
                                <button
                                    key={p}
                                    onClick={() => handlePageChange(p)}
                                    className={`px-3 py-1 rounded border ${currentPage === p
                                        ? 'bg-primary-600 text-white border-primary-600'
                                        : 'bg-white border-slate-200 hover:bg-slate-50'
                                        }`}
                                >
                                    {p}
                                </button>
                            );
                        })}

                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="px-3 py-1 border rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Sau
                        </button>
                    </div>
                </div>
            </div >

            {/* Employee Details View Modal */}
            {
                isViewModalOpen && viewData && (
                    <EmployeeDetailsModal
                        employee={viewData.employee}
                        family={viewData.family}
                        workHistory={viewData.workHistory}
                        training={viewData.training}
                        salary={viewData.salary}
                        onClose={() => setIsViewModalOpen(false)}
                    />
                )
            }

            {/* Add New Employee Modal */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-0 md:p-4">
                        <div className="bg-white rounded-none md:rounded-xl shadow-xl w-full max-w-2xl h-full md:h-auto md:max-h-[90vh] overflow-hidden flex flex-col">
                            <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-100 shrink-0">
                                <h2 className="text-lg md:text-xl font-bold text-slate-800 truncate pr-4">{formData.id ? 'Cập nhật nhân viên' : 'Thêm nhân viên'}</h2>
                                <button onClick={() => {
                                    setIsModalOpen(false);
                                    setFormData({});
                                    setFamilyList([]);
                                    setWorkHistoryList([]);
                                    setTrainingList([]);
                                    setSalaryList([]);
                                    setActiveTab('general');
                                }} className="text-slate-400 hover:text-slate-600 p-2">
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Tabs Header - Scrollable on mobile */}
                            <div className="flex border-b border-slate-200 bg-slate-50 shrink-0 overflow-x-auto hide-scrollbar px-2 md:px-6 pt-2">
                                {[
                                    { id: 'general', label: 'Thông tin chung', icon: User },
                                    { id: 'family', label: 'Gia đình', icon: Baby },
                                    { id: 'work', label: 'Công tác', icon: Briefcase },
                                    { id: 'training', label: 'Đào tạo', icon: GraduationCap },
                                    { id: 'salary', label: 'Lương', icon: Activity },
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`
                                            px-3 md:px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap
                                            ${activeTab === tab.id
                                                ? 'border-blue-600 text-blue-600'
                                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
                                        `}
                                    >
                                        <tab.icon size={16} /> {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Scrollable Content */}
                            <div className="overflow-y-auto p-4 md:p-6 flex-1">
                                <form id="employee-form" onSubmit={handleSubmit} className="space-y-6">

                                    {activeTab === 'general' && (
                                        <div className="space-y-6 animate-fade-in">
                                            {/* Group 1: Thông tin cơ bản */}
                                            <div>
                                                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                                    <span className="w-1 h-6 bg-blue-600 rounded-full"></span>
                                                    Thông tin cơ bản
                                                </h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-slate-700">Họ và tên <span className="text-red-500">*</span></label>
                                                        <input type="text" name="ho_va_ten" value={formData.ho_va_ten || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" required />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-slate-700">Ngày sinh</label>
                                                        <input type="date" name="ngay_sinh" value={formData.ngay_sinh || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-slate-700">Giới tính</label>
                                                        <select name="gioi_tinh" value={formData.gioi_tinh || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                                                            <option value="">Chọn giới tính</option>
                                                            <option value="Nam">Nam</option>
                                                            <option value="Nữ">Nữ</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-slate-700">Cấp bậc</label>
                                                        <input type="text" name="cap_bac" value={formData.cap_bac || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-slate-700">Chức danh/Chức vụ</label>
                                                        <input type="text" name="chuc_vu" value={formData.chuc_vu || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-slate-700">Đối tượng</label>
                                                        <select name="doi_tuong" value={formData.doi_tuong || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                                                            <option value="">Chọn đối tượng</option>
                                                            <option value="Sĩ quan">Sĩ quan</option>
                                                            <option value="QNCN">QNCN</option>
                                                            <option value="HSQ-CS">HSQ-CS</option>
                                                            <option value="CN & VCQP">CN & VCQP</option>
                                                            <option value="LĐHĐ">LĐHĐ</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-slate-700">Diện quản lý</label>
                                                        <select name="dien_quan_ly" value={formData.dien_quan_ly || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                                                            <option value="">Chọn diện quản lý</option>
                                                            <option value="Cán bộ">Cán bộ</option>
                                                            <option value="Quân lực">Quân lực</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-slate-700">Số điện thoại</label>
                                                        <input type="text" name="dien_thoai" value={formData.dien_thoai || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-slate-700">CCCD</label>
                                                        <input type="text" name="cccd" value={formData.cccd || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-slate-700">Ngày cấp CCCD</label>
                                                        <input type="date" name="ngay_cap_cccd" value={formData.ngay_cap_cccd || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-slate-700">Chứng minh quân đội</label>
                                                        <input type="text" name="cmqd" value={formData.cmqd || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-slate-700">Ngày cấp CMQĐ</label>
                                                        <input type="date" name="ngay_cap_cmqd" value={formData.ngay_cap_cmqd || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                                    </div>
                                                    <div className="space-y-2 md:col-span-2">
                                                        <label className="text-sm font-medium text-slate-700">Quê quán</label>
                                                        <input type="text" name="que_quan" value={formData.que_quan || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                                    </div>
                                                    <div className="space-y-2 md:col-span-2">
                                                        <label className="text-sm font-medium text-slate-700">Nơi ở hiện nay</label>
                                                        <input type="text" name="noi_o_hien_nay" value={formData.noi_o_hien_nay || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-slate-700">Tháng năm tuyển dụng</label>
                                                        <input type="date" name="thang_nam_tuyen_dung" value={formData.thang_nam_tuyen_dung || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-slate-700">Tháng năm nhập ngũ</label>
                                                        <input type="date" name="thang_nam_nhap_ngu" value={formData.thang_nam_nhap_ngu || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-slate-700">Ngày về khoa công tác</label>
                                                        <input type="date" name="ngay_ve_khoa_cong_tac" value={formData.ngay_ve_khoa_cong_tac || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-slate-700">Chứng chỉ hành nghề</label>
                                                        <input type="text" name="chung_chi_hanh_nghe" value={formData.chung_chi_hanh_nghe || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-slate-700">Trạng thái</label>
                                                        <select name="trang_thai" value={formData.trang_thai || 'Đang làm việc'} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                                                            <option value="Đang làm việc">Đang làm việc</option>
                                                            <option value="Đang học việc">Đang học việc</option>
                                                            <option value="Nghỉ phép">Nghỉ phép</option>
                                                            <option value="Tạm nghỉ việc">Tạm nghỉ việc</option>
                                                            <option value="Đã nghỉ việc">Đã nghỉ việc</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="border-t border-slate-100 my-4"></div>

                                            {/* Group 2: Thông tin đảng viên */}
                                            <div>
                                                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                                    <span className="w-1 h-6 bg-red-600 rounded-full"></span>
                                                    Thông tin đảng viên
                                                </h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-slate-700">Ngày vào Đảng</label>
                                                        <input type="date" name="ngay_vao_dang" value={formData.ngay_vao_dang || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-slate-700">Ngày chính thức</label>
                                                        <input type="date" name="ngay_chinh_thuc" value={formData.ngay_chinh_thuc || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-slate-700">Số thẻ Đảng</label>
                                                        <input type="text" name="so_the_dang" value={formData.so_the_dang || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-slate-700">Ngày cấp thẻ Đảng</label>
                                                        <input type="date" name="ngay_cap_the_dang" value={formData.ngay_cap_the_dang || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-sm font-medium text-slate-700">Nơi cấp thẻ Đảng</label>
                                                        <input type="text" name="noi_cap_the_dang" value={formData.noi_cap_the_dang || ''} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                                                    </div>
                                                    <div className="space-y-2 md:col-span-2">
                                                        <label className="text-sm font-medium text-slate-700">Ảnh thẻ Đảng</label>
                                                        <div className="flex items-center gap-4">
                                                            {formData.anh_the_dang && (
                                                                <img src={formData.anh_the_dang} alt="Thẻ đảng" className="h-20 w-32 object-cover rounded border border-slate-200" />
                                                            )}
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={async (e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) {
                                                                        try {
                                                                            const url = await uploadPartyCardImage(file);
                                                                            setFormData(prev => ({ ...prev, anh_the_dang: url }));
                                                                        } catch (err) {
                                                                            console.error(err);
                                                                            alert("Lỗi tải ảnh lên");
                                                                        }
                                                                    }
                                                                }}
                                                                className="block w-full text-sm text-slate-500
                                                                file:mr-4 file:py-2 file:px-4
                                                                file:rounded-full file:border-0
                                                                file:text-sm file:font-semibold
                                                                file:bg-violet-50 file:text-violet-700
                                                                hover:file:bg-violet-100"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Other Tabs content ... (Assuming similar structure, simplified for brevity in this artifact but should be full in file) */}
                                    {/* Copying the rest of the form logic from the original file... */}

                                    {activeTab === 'family' && (
                                        <div className="space-y-6 animate-fade-in">
                                            {/* List */}
                                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                                <h4 className="text-sm font-semibold text-slate-700 mb-3">Danh sách thành viên ({familyList.length})</h4>
                                                {familyList.length === 0 ? (
                                                    <p className="text-sm text-slate-500 italic">Chưa có thông tin gia đình.</p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {familyList.map((item, idx) => (
                                                            <div key={idx} className="flex justify-between items-center bg-white p-3 rounded border border-slate-100 shadow-sm">
                                                                <div>
                                                                    <p className="text-sm font-medium text-slate-800">{item.ho_va_ten} ({item.nam_sinh})</p>
                                                                    <p className="text-xs text-slate-500">{item.moi_quan_he} - {item.nghe_nghiep}</p>
                                                                </div>
                                                                <button type="button" onClick={() => removeItem(idx, setFamilyList)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            {/* Add Form */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="col-span-1 md:col-span-2"><h4 className="text-sm font-bold text-slate-800">Thêm thành viên mới</h4></div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-slate-700">Mối quan hệ</label>
                                                    <input
                                                        list="relationship-options-personnel"
                                                        type="text"
                                                        value={tempFamily.moi_quan_he || ''}
                                                        onChange={e => setTempFamily({ ...tempFamily, moi_quan_he: e.target.value })}
                                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                                        placeholder="Vợ/Con/Bố/Mẹ..."
                                                    />
                                                    <datalist id="relationship-options-personnel">
                                                        <option value="Vợ" />
                                                        <option value="Chồng" />
                                                        <option value="Con" />
                                                        <option value="Bố đẻ" />
                                                        <option value="Mẹ đẻ" />
                                                        <option value="Bố chồng" />
                                                        <option value="Mẹ chồng" />
                                                        <option value="Bố vợ" />
                                                        <option value="Mẹ vợ" />
                                                    </datalist>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-slate-700">Họ và tên</label>
                                                    <input type="text" value={tempFamily.ho_va_ten || ''} onChange={e => setTempFamily({ ...tempFamily, ho_va_ten: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-slate-700">Năm sinh</label>
                                                    <input type="number" value={tempFamily.nam_sinh || ''} onChange={e => setTempFamily({ ...tempFamily, nam_sinh: e.target.value ? parseInt(e.target.value) : undefined })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-slate-700">Nghề nghiệp</label>
                                                    <input type="text" value={tempFamily.nghe_nghiep || ''} onChange={e => setTempFamily({ ...tempFamily, nghe_nghiep: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-slate-700">SĐT</label>
                                                    <input type="text" value={tempFamily.so_dien_thoai || ''} onChange={e => setTempFamily({ ...tempFamily, so_dien_thoai: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                                </div>
                                                <div className="col-span-1 md:col-span-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => addItem('family', tempFamily, setTempFamily, setFamilyList)}
                                                        disabled={!tempFamily.ho_va_ten || !tempFamily.moi_quan_he}
                                                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium flex justify-center items-center gap-2 disabled:opacity-50"
                                                    >
                                                        <Plus size={16} /> Thêm vào danh sách
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'work' && (
                                        <div className="space-y-6 animate-fade-in">
                                            {/* List */}
                                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                                <h4 className="text-sm font-semibold text-slate-700 mb-3">Lịch sử công tác ({workHistoryList.length})</h4>
                                                {workHistoryList.length === 0 ? (
                                                    <p className="text-sm text-slate-500 italic">Chưa có thông tin công tác.</p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {workHistoryList.map((item, idx) => (
                                                            <div key={idx} className="flex justify-between items-center bg-white p-3 rounded border border-slate-100 shadow-sm">
                                                                <div>
                                                                    <p className="text-sm font-medium text-slate-800">{formatDateVN(item.tu_thang_nam)} - {formatDateVN(item.den_thang_nam)}: {item.don_vi_cong_tac}</p>
                                                                    <p className="text-xs text-slate-500">{item.chuc_vu} - {item.cap_bac}</p>
                                                                </div>
                                                                <button type="button" onClick={() => removeItem(idx, setWorkHistoryList)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Add Form */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="col-span-1 md:col-span-2"><h4 className="text-sm font-bold text-slate-800">Thêm quá trình mới</h4></div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-slate-700">Từ thời gian</label>
                                                    <input type="date" value={tempWork.tu_thang_nam || ''} onChange={e => setTempWork({ ...tempWork, tu_thang_nam: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-slate-700">Đến thời gian</label>
                                                    <input type="date" value={tempWork.den_thang_nam || ''} onChange={e => setTempWork({ ...tempWork, den_thang_nam: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                                </div>
                                                <div className="space-y-2 md:col-span-2">
                                                    <label className="text-sm font-medium text-slate-700">Đơn vị công tác</label>
                                                    <input type="text" value={tempWork.don_vi_cong_tac || ''} onChange={e => setTempWork({ ...tempWork, don_vi_cong_tac: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-slate-700">Cấp bậc</label>
                                                    <input type="text" value={tempWork.cap_bac || ''} onChange={e => setTempWork({ ...tempWork, cap_bac: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-slate-700">Chức vụ</label>
                                                    <input type="text" value={tempWork.chuc_vu || ''} onChange={e => setTempWork({ ...tempWork, chuc_vu: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                                </div>
                                                <div className="col-span-1 md:col-span-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => addItem('work', tempWork, setTempWork, setWorkHistoryList)}
                                                        disabled={!tempWork.don_vi_cong_tac}
                                                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium flex justify-center items-center gap-2 disabled:opacity-50"
                                                    >
                                                        <Plus size={16} /> Thêm vào danh sách
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'training' && (
                                        <div className="space-y-6 animate-fade-in">
                                            {/* List */}
                                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                                <h4 className="text-sm font-semibold text-slate-700 mb-3">Lịch sử đào tạo ({trainingList.length})</h4>
                                                {trainingList.length === 0 ? (
                                                    <p className="text-sm text-slate-500 italic">Chưa có thông tin đào tạo.</p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {trainingList.map((item, idx) => (
                                                            <div key={idx} className="flex justify-between items-center bg-white p-3 rounded border border-slate-100 shadow-sm">
                                                                <div>
                                                                    <p className="text-sm font-medium text-slate-800">{formatDateVN(item.tu_thang_nam)} - {formatDateVN(item.den_thang_nam)}: {item.ten_co_so_dao_tao}</p>
                                                                    <p className="text-xs text-slate-500">{item.nganh_dao_tao} - {item.trinh_do_dao_tao}</p>
                                                                </div>
                                                                <button type="button" onClick={() => removeItem(idx, setTrainingList)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Add Form */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="col-span-1 md:col-span-2"><h4 className="text-sm font-bold text-slate-800">Thêm quá trình đào tạo</h4></div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-slate-700">Từ thời gian</label>
                                                    <input type="date" value={tempTraining.tu_thang_nam || ''} onChange={e => setTempTraining({ ...tempTraining, tu_thang_nam: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-slate-700">Đến thời gian</label>
                                                    <input type="date" value={tempTraining.den_thang_nam || ''} onChange={e => setTempTraining({ ...tempTraining, den_thang_nam: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                                </div>
                                                <div className="space-y-2 md:col-span-2">
                                                    <label className="text-sm font-medium text-slate-700">Cơ sở đào tạo</label>
                                                    <input type="text" value={tempTraining.ten_co_so_dao_tao || ''} onChange={e => setTempTraining({ ...tempTraining, ten_co_so_dao_tao: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-slate-700">Ngành đào tạo</label>
                                                    <input type="text" value={tempTraining.nganh_dao_tao || ''} onChange={e => setTempTraining({ ...tempTraining, nganh_dao_tao: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-slate-700">Trình độ</label>
                                                    <input type="text" value={tempTraining.trinh_do_dao_tao || ''} onChange={e => setTempTraining({ ...tempTraining, trinh_do_dao_tao: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                                </div>
                                                <div className="col-span-1 md:col-span-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => addItem('training', tempTraining, setTempTraining, setTrainingList)}
                                                        disabled={!tempTraining.ten_co_so_dao_tao}
                                                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium flex justify-center items-center gap-2 disabled:opacity-50"
                                                    >
                                                        <Plus size={16} /> Thêm vào danh sách
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'salary' && (
                                        <div className="space-y-6 animate-fade-in">
                                            {/* List */}
                                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                                <h4 className="text-sm font-semibold text-slate-700 mb-3">Lịch sử lương/quân hàm ({salaryList.length})</h4>
                                                {salaryList.length === 0 ? (
                                                    <p className="text-sm text-slate-500 italic">Chưa có thông tin lương.</p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {salaryList.map((item, idx) => (
                                                            <div key={idx} className="flex justify-between items-center bg-white p-3 rounded border border-slate-100 shadow-sm">
                                                                <div>
                                                                    <p className="text-sm font-medium text-slate-800">{formatDateVN(item.thang_nam_nhan)}: {item.quan_ham} - {item.loai_nhom}</p>
                                                                    <p className="text-xs text-slate-500">Hệ số: {item.he_so} - Bậc: {item.bac}</p>
                                                                </div>
                                                                <button type="button" onClick={() => removeItem(idx, setSalaryList)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Add Form */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="col-span-1 md:col-span-2"><h4 className="text-sm font-bold text-slate-800">Thêm đợt nâng lương/quân hàm</h4></div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-slate-700">Thời gian nhận</label>
                                                    <input type="date" value={tempSalary.thang_nam_nhan || ''} onChange={e => setTempSalary({ ...tempSalary, thang_nam_nhan: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-slate-700">Quân hàm</label>
                                                    <input type="text" value={tempSalary.quan_ham || ''} onChange={e => setTempSalary({ ...tempSalary, quan_ham: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-slate-700">Loại nhóm</label>
                                                    <input type="text" value={tempSalary.loai_nhom || ''} onChange={e => setTempSalary({ ...tempSalary, loai_nhom: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-slate-700">Bậc</label>
                                                    <input type="text" value={tempSalary.bac || ''} onChange={e => setTempSalary({ ...tempSalary, bac: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-slate-700">Hệ số</label>
                                                    <input type="number" step="0.01" value={tempSalary.he_so || ''} onChange={e => setTempSalary({ ...tempSalary, he_so: parseFloat(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                                </div>
                                                <div className="col-span-1 md:col-span-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => addItem('salary', tempSalary, setTempSalary, setSalaryList)}
                                                        disabled={!tempSalary.thang_nam_nhan}
                                                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium flex justify-center items-center gap-2 disabled:opacity-50"
                                                    >
                                                        <Plus size={16} /> Thêm vào danh sách
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                </form>
                            </div>

                            {/* Footer Actions */}
                            <div className="p-4 border-t border-slate-100 bg-white shrink-0 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Hủy</button>
                                <button form="employee-form" type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 flex items-center gap-2">
                                    <Save size={18} /> Lưu
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            {isBulkUpdateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md animate-scale-in">
                        <h3 className="text-xl font-bold text-slate-800 mb-4">Cập nhật trạng thái hàng loạt</h3>
                        <p className="text-slate-600 mb-6">Bạn đang chọn update cho <strong>{selectedIds.size}</strong> nhân viên.</p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Chọn trạng thái mới (để trống nếu không đổi)</label>
                                <select
                                    value={bulkStatus}
                                    onChange={(e) => setBulkStatus(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                    <option value="">-- Không thay đổi --</option>
                                    <option value="Đang làm việc">Đang làm việc</option>
                                    <option value="Đang học việc">Đang học việc</option>
                                    <option value="Nghỉ phép">Nghỉ phép</option>
                                    <option value="Đi học">Đi học</option>
                                    <option value="Tranh thủ">Tranh thủ</option>
                                    <option value="Bệnh nhân">Bệnh nhân</option>
                                    <option value="Tạm nghỉ việc">Tạm nghỉ việc</option>
                                    <option value="Chờ hưu">Chờ hưu</option>
                                    <option value="Nghỉ hưu">Nghỉ hưu</option>
                                    <option value="Chuyển công tác">Chuyển công tác</option>
                                    <option value="Phục viên/Xuất ngũ">Phục viên/Xuất ngũ</option>
                                    <option value="Đã nghỉ việc">Đã nghỉ việc</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Chọn diện quản lý mới (để trống nếu không đổi)</label>
                                <select
                                    value={bulkManagementArea}
                                    onChange={(e) => setBulkManagementArea(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                    <option value="">-- Không thay đổi --</option>
                                    <option value="Cán bộ">Cán bộ</option>
                                    <option value="Quân lực">Quân lực</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Chọn đối tượng mới (để trống nếu không đổi)</label>
                                <select
                                    value={bulkObject}
                                    onChange={(e) => setBulkObject(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                    <option value="">-- Không thay đổi --</option>
                                    <option value="Sĩ quan">Sĩ quan</option>
                                    <option value="QNCN">QNCN</option>
                                    <option value="HSQ-CS">HSQ-CS</option>
                                    <option value="CN & VCQP">CN & VCQP</option>
                                    <option value="LĐHĐ">LĐHĐ</option>
                                </select>
                            </div>
                            <div className="flex gap-3 justify-end mt-6">
                                <button
                                    onClick={() => setIsBulkUpdateModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleBulkUpdate}
                                    className="px-4 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-lg flex items-center gap-2"
                                >
                                    <Save size={18} /> Cập nhật
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};
