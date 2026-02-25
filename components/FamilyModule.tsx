import React, { useState, useEffect } from 'react';
import { getFamilyRecords, createFamilyRecord, updateFamilyRecord, deleteFamilyRecord, FamilyRecord } from '../services/familyService';
import { getPersonnel, Employee } from '../services/personnelService';
import { Plus, Search, Edit, Trash2, X, Save, Users, ChevronRight, Heart } from 'lucide-react';

export const FamilyModule = () => {
    const [familyRecords, setFamilyRecords] = useState<FamilyRecord[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [viewData, setViewData] = useState<FamilyRecord | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<FamilyRecord>>({});

    // Fetch Data
    const fetchData = async () => {
        setLoading(true);
        try {
            const [families, personnel] = await Promise.all([
                getFamilyRecords(),
                getPersonnel()
            ]);
            setFamilyRecords(families || []);
            setEmployees(personnel || []);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Handlers
    const handleEdit = (item: FamilyRecord) => {
        setFormData({ ...item });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa bản ghi này?")) {
            try {
                await deleteFamilyRecord(id);
                fetchData();
            } catch (error) {
                alert("Xóa thất bại");
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Remove the expanded 'dsnv' object before sending to DB
            const { dsnv, ...payload } = formData as any;

            if (formData.id) {
                await updateFamilyRecord(formData.id, payload);
            } else {
                await createFamilyRecord(payload);
            }
            setIsModalOpen(false);
            setFormData({});
            fetchData();
        } catch (error) {
            console.error(error);
            alert("Lưu thất bại");
        }
    };

    const filteredRecords = familyRecords.filter(record =>
        (record.dsnv?.ho_va_ten || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (record.ho_va_ten || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Group records by employee
    const groupedRecords = filteredRecords.reduce((acc, current) => {
        const empId = current.dsnv_id;
        if (!empId) return acc;
        if (!acc[empId]) {
            acc[empId] = {
                employeeId: empId,
                employee: current.dsnv,
                records: []
            };
        }
        acc[empId].records.push(current);
        return acc;
    }, {} as Record<number, { employeeId: number, employee: any, records: FamilyRecord[] }>);

    const sortedGroups = Object.values(groupedRecords).sort((a, b) =>
        (a.employee?.ho_va_ten || '').localeCompare(b.employee?.ho_va_ten || '')
    );

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Users className="text-[#009900]" />
                        Quan hệ gia đình
                    </h1>
                    <p className="text-slate-500 text-sm">Quản lý thông tin thân nhân của cán bộ, nhân viên</p>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Tìm nhân viên hoặc người thân..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009900]"
                        />
                    </div>
                    <button onClick={() => { setFormData({}); setIsModalOpen(true); }} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium whitespace-nowrap">
                        <Plus size={16} /> Thêm mới
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#009900] text-white font-bold uppercase text-xs border-b border-[#007700]">
                            <tr>
                                <th className="px-3 md:px-4 py-4 w-8 md:w-10 text-center"></th>
                                <th className="px-3 md:px-4 py-4">Nhân viên</th>
                                <th className="px-3 md:px-4 py-4">Số người thân</th>
                                <th className="hidden md:table-cell px-4 py-4">Chức vụ</th>
                                <th className="hidden md:table-cell px-4 py-3 w-20 text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-6 h-6 border-2 border-[#009900] border-t-transparent rounded-full animate-spin"></div>
                                        <span>Đang tải dữ liệu...</span>
                                    </div>
                                </td></tr>
                            ) : sortedGroups.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">Không có dữ liệu.</td></tr>
                            ) : (
                                sortedGroups.map((group) => {
                                    const isExpanded = expandedId === group.employeeId;
                                    return (
                                        <React.Fragment key={group.employeeId}>
                                            <tr
                                                className={`hover:bg-slate-50 transition-colors cursor-pointer ${isExpanded ? 'bg-green-50/30' : ''}`}
                                                onClick={() => setExpandedId(isExpanded ? null : group.employeeId)}
                                            >
                                                <td className="px-3 md:px-4 py-4 text-center">
                                                    <ChevronRight
                                                        size={16}
                                                        className={`transition-transform duration-200 ${isExpanded ? 'rotate-90 text-[#009900]' : 'text-slate-400'}`}
                                                    />
                                                </td>
                                                <td className="px-3 md:px-4 py-4 font-bold text-slate-900">
                                                    {group.employee?.ho_va_ten || 'N/A'}
                                                    <div className="md:hidden text-[10px] text-slate-500 font-normal uppercase mt-1">{group.employee?.chuc_vu}</div>
                                                </td>
                                                <td className="px-3 md:px-4 py-4">
                                                    <span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full text-xs font-bold border border-blue-100">
                                                        {group.records.length} người thân
                                                    </span>
                                                </td>
                                                <td className="hidden md:table-cell px-4 py-4 text-slate-600">
                                                    {group.employee?.chuc_vu}
                                                </td>
                                                <td className="hidden md:table-cell px-4 py-4 text-center">
                                                    <button onClick={(e) => { e.stopPropagation(); setFormData({ dsnv_id: group.employeeId }); setIsModalOpen(true); }} className="p-1.5 text-blue-600 hover:bg-white border border-transparent hover:border-blue-100 rounded-lg shadow-sm transition-all" title="Thêm người thân">
                                                        <Plus size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr className="bg-[#fdfdfe]">
                                                    <td colSpan={5} className="px-4 md:px-8 py-6 border-b border-slate-200">
                                                        <div className="flex items-center gap-2 mb-4">
                                                            <div className="h-4 w-1 bg-[#009900] rounded-full"></div>
                                                            <h4 className="font-bold text-slate-800 uppercase text-xs tracking-wider">Danh sách người thân</h4>
                                                        </div>

                                                        {/* Mobile View: List of cards */}
                                                        <div className="block md:hidden space-y-3">
                                                            {group.records.map((r) => (
                                                                <button
                                                                    key={r.id}
                                                                    onClick={() => setViewData(r)}
                                                                    className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-[#009900] hover:shadow-md transition-all text-left group"
                                                                >
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center text-pink-600 shrink-0 group-hover:bg-[#009900] group-hover:text-white transition-colors">
                                                                            <Heart size={16} />
                                                                        </div>
                                                                        <div>
                                                                            <div className="font-bold text-slate-900 group-hover:text-[#009900] transition-colors">{r.ho_va_ten}</div>
                                                                            <div className="text-[10px] text-slate-500 uppercase tracking-tighter">{r.moi_quan_he} • Nhấn để xem chi tiết</div>
                                                                        </div>
                                                                    </div>
                                                                    <ChevronRight size={16} className="text-slate-300 group-hover:text-[#009900] translate-x-0 group-hover:translate-x-1 transition-all" />
                                                                </button>
                                                            ))}
                                                        </div>

                                                        {/* Desktop View: Table */}
                                                        <div className="hidden md:block border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                                            <table className="w-full text-xs text-left">
                                                                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                                                                    <tr>
                                                                        <th className="px-4 py-3">Họ và tên</th>
                                                                        <th className="px-4 py-3">Mối quan hệ</th>
                                                                        <th className="px-4 py-3">Năm sinh</th>
                                                                        <th className="px-4 py-3">Nghề nghiệp</th>
                                                                        <th className="px-4 py-3">Số điện thoại</th>
                                                                        <th className="px-4 py-3">Ghi chú</th>
                                                                        <th className="px-4 py-3 text-center">Thao tác</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100 bg-white">
                                                                    {group.records.map((r) => (
                                                                        <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                                                                            <td className="px-4 py-3 font-bold text-slate-900">{r.ho_va_ten}</td>
                                                                            <td className="px-4 py-3 font-medium text-pink-600">{r.moi_quan_he}</td>
                                                                            <td className="px-4 py-3 text-slate-600">{r.nam_sinh}</td>
                                                                            <td className="px-4 py-3 text-slate-600">{r.nghe_nghiep}</td>
                                                                            <td className="px-4 py-3 text-slate-600">{r.so_dien_thoai}</td>
                                                                            <td className="px-4 py-3 text-slate-400 italic truncate max-w-[150px]">{r.ghi_chu}</td>
                                                                            <td className="px-4 py-3 text-center">
                                                                                <div className="flex items-center justify-center gap-1">
                                                                                    <button onClick={() => handleEdit(r)} className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors">
                                                                                        <Edit size={14} />
                                                                                    </button>
                                                                                    <button onClick={() => handleDelete(r.id!)} className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors">
                                                                                        <Trash2 size={14} />
                                                                                    </button>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Detail (Mobile) */}
            {viewData && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800">Chi tiết người thân</h3>
                            <button onClick={() => setViewData(null)} className="p-1 text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between py-2 border-b border-slate-50">
                                <span className="text-sm text-slate-500">Họ và tên:</span>
                                <span className="font-bold text-slate-900">{viewData.ho_va_ten}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-slate-50">
                                <span className="text-sm text-slate-500">Mối quan hệ:</span>
                                <span className="font-bold text-pink-600">{viewData.moi_quan_he}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-slate-50">
                                <span className="text-sm text-slate-500">Năm sinh:</span>
                                <span className="font-medium text-slate-900">{viewData.nam_sinh || 'N/A'}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-slate-50">
                                <span className="text-sm text-slate-500">Số điện thoại:</span>
                                <span className="font-medium text-slate-900">{viewData.so_dien_thoai || 'chưa cập nhật'}</span>
                            </div>
                            <div className="py-2 border-b border-slate-50">
                                <span className="text-sm text-slate-500 block mb-1">Nghề nghiệp:</span>
                                <span className="font-medium text-slate-700">{viewData.nghe_nghiep || 'N/A'}</span>
                            </div>
                            <div className="py-2">
                                <span className="text-sm text-slate-500 block mb-1">Ghi chú:</span>
                                <span className="text-slate-600 italic text-sm">{viewData.ghi_chu || 'Không có ghi chú'}</span>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 flex gap-3">
                            <button
                                onClick={() => { handleEdit(viewData); setViewData(null); }}
                                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors"
                            >
                                <Edit size={18} /> Chỉnh sửa
                            </button>
                            <button
                                onClick={() => setViewData(null)}
                                className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Add/Edit */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800">{formData.id ? 'Cập nhật thông tin gia đình' : 'Thêm người thân mới'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Nhân viên <span className="text-red-500">*</span></label>
                                <select
                                    required
                                    value={formData.dsnv_id || ''}
                                    onChange={e => setFormData({ ...formData, dsnv_id: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009900]"
                                >
                                    <option value="">-- Chọn nhân viên --</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.ho_va_ten} - {emp.chuc_vu}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Mối quan hệ <span className="text-red-500">*</span></label>
                                    <input
                                        required
                                        list="relationship-options"
                                        type="text"
                                        value={formData.moi_quan_he || ''}
                                        onChange={e => setFormData({ ...formData, moi_quan_he: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009900]"
                                        placeholder="Chọn hoặc nhập mối quan hệ..."
                                    />
                                    <datalist id="relationship-options">
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
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Họ và tên người thân <span className="text-red-500">*</span></label>
                                    <input required type="text" value={formData.ho_va_ten || ''} onChange={e => setFormData({ ...formData, ho_va_ten: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009900]" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Năm sinh</label>
                                    <input type="number" value={formData.nam_sinh || ''} onChange={e => setFormData({ ...formData, nam_sinh: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009900]" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Số điện thoại</label>
                                    <input type="text" value={formData.so_dien_thoai || ''} onChange={e => setFormData({ ...formData, so_dien_thoai: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009900]" />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Nghề nghiệp</label>
                                    <input type="text" value={formData.nghe_nghiep || ''} onChange={e => setFormData({ ...formData, nghe_nghiep: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009900]" />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Ghi chú</label>
                                    <input type="text" value={formData.ghi_chu || ''} onChange={e => setFormData({ ...formData, ghi_chu: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009900]" />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium">Hủy</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
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
