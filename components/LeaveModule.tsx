import React, { useState, useEffect } from 'react';
import { LeaveRecord, Employee } from '../types';
import { getLeaveRecords, createLeaveRecord, updateLeaveRecord, deleteLeaveRecord } from '../services/leaveService';
import { getPersonnel } from '../services/personnelService';
import { Plus, Search, Edit, Trash2, X, Save, Calendar, User, FileText, MapPin, Clock } from 'lucide-react';
import * as XLSX from 'xlsx';

export const LeaveModule = () => {
    const [records, setRecords] = useState<LeaveRecord[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<LeaveRecord | null>(null);
    const [formData, setFormData] = useState<Partial<LeaveRecord>>({});

    // Search Employee State
    const [searchEmployeeTerm, setSearchEmployeeTerm] = useState('');
    const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
    const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [leaves, pers] = await Promise.all([
                getLeaveRecords(),
                getPersonnel()
            ]);
            setRecords(leaves);
            setEmployees(pers);
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Filter Logic
    const filteredRecords = records.filter(r =>
        (r.ho_va_ten?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (r.loai_nghi?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    // Form Handlers
    const handleOpenModal = (record?: LeaveRecord) => {
        if (record) {
            setEditingRecord(record);
            setFormData(record);
        } else {
            setEditingRecord(null);
            setFormData({
                loai_nghi: 'Phép thường niên',
                tu_ngay: new Date().toISOString().split('T')[0],
                den_ngay: new Date().toISOString().split('T')[0]
            });
        }
        setSearchEmployeeTerm('');
        setShowEmployeeDropdown(false);
        setIsModalOpen(true);
    };

    const handleEmployeeSearch = (term: string) => {
        setSearchEmployeeTerm(term);
        if (term.trim()) {
            const filtered = employees.filter(e => e.ho_va_ten.toLowerCase().includes(term.toLowerCase()));
            setFilteredEmployees(filtered);
            setShowEmployeeDropdown(true);
        } else {
            setFilteredEmployees([]);
            setShowEmployeeDropdown(false);
        }
    };

    const selectEmployee = (emp: Employee) => {
        setFormData({
            ...formData,
            dsnv_id: emp.id,
            ho_va_ten: emp.ho_va_ten,
            cap_bac: emp.cap_bac,
            chuc_vu: emp.chuc_vu
        });
        setSearchEmployeeTerm('');
        setShowEmployeeDropdown(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingRecord?.id) {
                await updateLeaveRecord(editingRecord.id, formData);
                alert("Cập nhật thành công!");
            } else {
                await createLeaveRecord(formData as any);
                alert("Thêm mới thành công!");
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error("Submit error:", error);
            alert("Có lỗi xảy ra, vui lòng thử lại.");
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa bản ghi này?")) {
            try {
                await deleteLeaveRecord(id);
                fetchData();
            } catch (error) {
                alert("Xóa thất bại.");
            }
        }
    };

    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return '---';
        return new Date(dateStr).toLocaleDateString('vi-VN');
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Quản lý Phép / Tranh thủ</h1>
                    <p className="text-slate-500 text-sm mt-1">Theo dõi lịch nghỉ phép và tranh thủ của quân nhân</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
                >
                    <Plus size={18} /> Thêm mới
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex gap-4 bg-slate-50/50">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo tên, loại nghỉ..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-slate-500">Đang tải dữ liệu...</div>
                ) : (
                    <>
                        {/* Desktop View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-[#009900] text-white font-medium">
                                    <tr>
                                        <th className="px-6 py-4 rounded-tl-lg">Họ và tên</th>
                                        <th className="px-6 py-4">Cấp bậc / Chức vụ</th>
                                        <th className="px-6 py-4">Loại nghỉ</th>
                                        <th className="px-6 py-4">Thời gian</th>
                                        <th className="px-6 py-4">Nơi nghỉ</th>
                                        <th className="px-6 py-4 rounded-tr-lg text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredRecords.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">
                                                Chưa có dữ liệu nào phù hợp.
                                            </td>
                                        </tr>
                                    ) : filteredRecords.map((record) => (
                                        <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-slate-900">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                                        {record.ho_va_ten?.charAt(0)}
                                                    </div>
                                                    {record.ho_va_ten}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{record.cap_bac}</span>
                                                    <span className="text-xs text-slate-500">{record.chuc_vu}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${record.loai_nghi === 'Tranh thủ' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                                    record.loai_nghi === 'Nghỉ ốm' ? 'bg-red-50 text-red-700 border-red-100' :
                                                        'bg-green-50 text-green-700 border-green-100'
                                                    }`}>
                                                    {record.loai_nghi}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={14} className="text-slate-400" />
                                                    <span>{formatDate(record.tu_ngay)} - {formatDate(record.den_ngay)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={record.noi_dang_ky_nghi || ''}>
                                                <div className="flex items-center gap-2">
                                                    <MapPin size={14} className="text-slate-400" />
                                                    {record.noi_dang_ky_nghi || '---'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleOpenModal(record)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                        <Edit size={16} />
                                                    </button>
                                                    <button onClick={() => handleDelete(record.id)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden divide-y divide-slate-100">
                            {filteredRecords.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 italic">
                                    Chưa có dữ liệu nào phù hợp.
                                </div>
                            ) : filteredRecords.map((record) => (
                                <div key={record.id} className="p-4 space-y-3 bg-white">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                                                {record.ho_va_ten?.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900">{record.ho_va_ten}</div>
                                                <div className="text-xs text-slate-500 font-medium">{record.cap_bac} - {record.chuc_vu}</div>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold border ${record.loai_nghi === 'Tranh thủ' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                            record.loai_nghi === 'Nghỉ ốm' ? 'bg-red-50 text-red-700 border-red-100' :
                                                'bg-green-50 text-green-700 border-green-100'
                                            }`}>
                                            {record.loai_nghi}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2 text-sm text-slate-700 pl-[52px]">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={15} className="text-slate-400" />
                                            <span className="font-medium">{formatDate(record.tu_ngay)} - {formatDate(record.den_ngay)}</span>
                                        </div>
                                        {record.noi_dang_ky_nghi && (
                                            <div className="flex items-center gap-2">
                                                <MapPin size={15} className="text-slate-400" />
                                                <span className="truncate">{record.noi_dang_ky_nghi}</span>
                                            </div>
                                        )}
                                        {record.ghi_chu && (
                                            <div className="text-xs text-slate-500 italic mt-1 bg-slate-50 p-2 rounded">
                                                "{record.ghi_chu}"
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-end gap-3 pt-2 pl-[52px]">
                                        <button
                                            onClick={() => handleOpenModal(record)}
                                            className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 flex items-center justify-center gap-2"
                                        >
                                            <Edit size={14} /> Sửa
                                        </button>
                                        <button
                                            onClick={() => handleDelete(record.id)}
                                            className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 flex items-center justify-center gap-2"
                                        >
                                            <Trash2 size={14} /> Xóa
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="text-xl font-bold text-slate-800">
                                {editingRecord ? 'Cập nhật thông tin nghỉ' : 'Đăng ký nghỉ phép / Tranh thủ'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                {/* Employee Selector */}
                                <div className="col-span-2 space-y-2 relative">
                                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                        <User size={16} /> Chọn nhân viên <span className="text-red-500">*</span>
                                    </label>
                                    {!editingRecord ? (
                                        <div className="relative">
                                            <input
                                                type="text"
                                                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pl-10"
                                                placeholder="Nhập tên để tìm kiếm..."
                                                value={formData.ho_va_ten || searchEmployeeTerm}
                                                onChange={(e) => {
                                                    setFormData({ ...formData, ho_va_ten: undefined });
                                                    handleEmployeeSearch(e.target.value);
                                                }}
                                                onFocus={() => { if (searchEmployeeTerm) setShowEmployeeDropdown(true); }}
                                            />
                                            <Search className="absolute left-3 top-3 text-slate-400" size={18} />

                                            {showEmployeeDropdown && (
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
                                                    {filteredEmployees.length > 0 ? filteredEmployees.map(emp => (
                                                        <div
                                                            key={emp.id}
                                                            className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 flex justify-between items-center"
                                                            onClick={() => selectEmployee(emp)}
                                                        >
                                                            <div>
                                                                <div className="font-medium text-slate-800">{emp.ho_va_ten}</div>
                                                                <div className="text-xs text-slate-500">{emp.cap_bac} - {emp.chuc_vu}</div>
                                                            </div>
                                                            <div className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">Chọn</div>
                                                        </div>
                                                    )) : (
                                                        <div className="p-4 text-center text-slate-500 text-sm">Không tìm thấy nhân viên</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium">
                                            {formData.ho_va_ten}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Cấp bậc</label>
                                    <input type="text" disabled value={formData.cap_bac || ''} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-500" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Chức vụ</label>
                                    <input type="text" disabled value={formData.chuc_vu || ''} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-500" />
                                </div>

                                <div className="col-span-2 border-t border-slate-100 my-2"></div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Loại nghỉ</label>
                                    <select
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.loai_nghi || 'Phép thường niên'}
                                        onChange={e => setFormData({ ...formData, loai_nghi: e.target.value })}
                                    >
                                        <option value="Phép thường niên">Phép thường niên</option>
                                        <option value="Tranh thủ">Tranh thủ</option>
                                        <option value="Nghỉ ốm">Nghỉ ốm</option>
                                        <option value="Nghỉ cưới">Nghỉ cưới</option>
                                        <option value="Nghỉ tang">Nghỉ tang</option>
                                        <option value="Khác">Khác</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Nơi nghỉ</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.noi_dang_ky_nghi || ''}
                                        onChange={e => setFormData({ ...formData, noi_dang_ky_nghi: e.target.value })}
                                        placeholder="VD: Hà Nội..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Từ ngày</label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.tu_ngay || ''}
                                        onChange={e => setFormData({ ...formData, tu_ngay: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Đến ngày</label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.den_ngay || ''}
                                        onChange={e => setFormData({ ...formData, den_ngay: e.target.value })}
                                    />
                                </div>

                                <div className="col-span-2 space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Lý do / Ghi chú</label>
                                    <textarea
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                                        value={formData.ghi_chu || ''}
                                        onChange={e => setFormData({ ...formData, ghi_chu: e.target.value })}
                                        placeholder="Nhập lý do chi tiết..."
                                    ></textarea>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 font-medium rounded-lg transition-colors"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm shadow-blue-200 transition-colors flex items-center gap-2"
                                >
                                    <Save size={18} /> Lưu thông tin
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
