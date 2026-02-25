import React, { useState, useEffect } from 'react';
import { getSalaryRecords, createSalaryRecord, updateSalaryRecord, deleteSalaryRecord, SalaryRecord } from '../services/salaryService';
import { getPersonnel, Employee } from '../services/personnelService';
import { Plus, Search, Edit, Trash2, X, Save, DollarSign, ChevronRight } from 'lucide-react';

const formatDateVN = (dateStr: string | undefined | null) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return dateStr;
    return `${day}/${month}/${year}`;
};

export const SalaryModule = () => {
    const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewData, setViewData] = useState<SalaryRecord | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<SalaryRecord>>({});

    // Fetch Data
    const fetchData = async () => {
        setLoading(true);
        try {
            const [salaries, personnel] = await Promise.all([
                getSalaryRecords(),
                getPersonnel()
            ]);
            setSalaryRecords(salaries || []);
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
    const handleEdit = (item: SalaryRecord) => {
        setFormData({ ...item });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa bản ghi này?")) {
            try {
                await deleteSalaryRecord(id);
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
                await updateSalaryRecord(formData.id, payload);
            } else {
                await createSalaryRecord(payload);
            }
            setIsModalOpen(false);
            setFormData({});
            fetchData();
        } catch (error) {
            console.error(error);
            alert("Lưu thất bại");
        }
    };

    const filteredRecords = salaryRecords.filter(record =>
        record.dsnv?.ho_va_ten.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.thang_nam_nhan?.includes(searchTerm)
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
    }, {} as Record<number, { employeeId: number, employee: any, records: SalaryRecord[] }>);

    // Array of groups sorted by latest record date
    const sortedGroups = Object.values(groupedRecords).sort((a, b) => {
        const latestA = new Date(a.records[0]?.thang_nam_nhan || '').getTime();
        const latestB = new Date(b.records[0]?.thang_nam_nhan || '').getTime();
        return latestB - latestA;
    });

    // Sort records within each group by date (newest first)
    Object.values(groupedRecords).forEach(group => {
        group.records.sort((a, b) => new Date(b.thang_nam_nhan || '').getTime() - new Date(a.thang_nam_nhan || '').getTime());
    });

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <DollarSign className="text-yellow-600" />
                        Quản lý Lương
                    </h1>
                    <p className="text-slate-500 text-sm">Theo dõi quá trình nâng lương của nhân viên</p>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm nhân viên..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
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
                                <th className="px-3 md:px-4 py-4 w-8 md:w-10"></th>
                                <th className="px-3 md:px-4 py-4">Họ và tên</th>
                                <th className="px-3 md:px-4 py-4">Hệ số</th>
                                <th className="hidden md:table-cell px-4 py-4">Thời gian</th>
                                <th className="hidden md:table-cell px-4 py-3 w-20 text-center">Thêm mới</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                        <span>Đang tải dữ liệu...</span>
                                    </div>
                                </td></tr>
                            ) : sortedGroups.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">Không có dữ liệu lương.</td></tr>
                            ) : (
                                sortedGroups.map((group) => {
                                    const latest = group.records[0];
                                    const isExpanded = expandedId === group.employeeId;

                                    return (
                                        <React.Fragment key={group.employeeId}>
                                            <tr
                                                className={`hover:bg-slate-50 transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50/30' : ''}`}
                                                onClick={() => setExpandedId(isExpanded ? null : group.employeeId)}
                                            >
                                                <td className="px-3 md:px-4 py-4 text-center">
                                                    <ChevronRight
                                                        size={16}
                                                        className={`transition-transform duration-200 ${isExpanded ? 'rotate-90 text-blue-600' : 'text-slate-400'}`}
                                                    />
                                                </td>
                                                <td className="px-3 md:px-4 py-4 font-bold text-slate-900">
                                                    {group.employee?.ho_va_ten || 'N/A'}
                                                    <div className="hidden md:block text-xs text-slate-500 font-normal">{group.employee?.chuc_vu}</div>
                                                </td>
                                                <td className="px-3 md:px-4 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-slate-700 font-bold">{latest.he_so}</span>
                                                        <span className="hidden md:inline bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase ml-2">Bậc {latest.bac}</span>
                                                    </div>
                                                </td>
                                                <td className="hidden md:table-cell px-4 py-4 text-slate-600 font-medium">
                                                    {formatDateVN(latest.thang_nam_nhan)}
                                                </td>
                                                <td className="hidden md:table-cell px-4 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-2" onClick={e => e.stopPropagation()}>
                                                        <button
                                                            onClick={() => { setFormData({ dsnv_id: group.employeeId }); setIsModalOpen(true); }}
                                                            className="p-1.5 text-blue-600 hover:bg-white border border-transparent hover:border-blue-100 rounded-lg shadow-sm transition-all"
                                                            title="Thêm đợt lương mới"
                                                        >
                                                            <Plus size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr className="bg-[#fdfdfe]">
                                                    <td colSpan={5} className="px-4 md:px-8 py-6 border-b border-slate-200">
                                                        <div className="flex items-center gap-2 mb-4">
                                                            <div className="h-4 w-1 bg-blue-600 rounded-full"></div>
                                                            <h4 className="font-bold text-slate-800 uppercase text-xs tracking-wider">Lịch sử nâng lương</h4>
                                                        </div>

                                                        {/* Mobile View: List of times */}
                                                        <div className="block md:hidden space-y-3">
                                                            {group.records.map((r) => (
                                                                <button
                                                                    key={r.id}
                                                                    onClick={() => setViewData(r)}
                                                                    className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-blue-300 hover:shadow-md transition-all text-left group"
                                                                >
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                                            {formatDateVN(r.thang_nam_nhan).split('/')[1]}
                                                                        </div>
                                                                        <div>
                                                                            <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">Tháng {formatDateVN(r.thang_nam_nhan)}</div>
                                                                            <div className="text-[10px] text-slate-500 uppercase tracking-tighter">Nhấn để xem chi tiết lịch sử</div>
                                                                        </div>
                                                                    </div>
                                                                    <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 translate-x-0 group-hover:translate-x-1 transition-all" />
                                                                </button>
                                                            ))}
                                                        </div>

                                                        {/* Desktop View: Table */}
                                                        <div className="hidden md:block border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                                            <table className="w-full text-xs text-left">
                                                                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                                                                    <tr>
                                                                        <th className="px-4 py-3">Thời gian</th>
                                                                        <th className="px-4 py-3">Loại/Nhóm</th>
                                                                        <th className="px-4 py-3">Bậc</th>
                                                                        <th className="px-4 py-3">Hệ số</th>
                                                                        <th className="px-4 py-3">% TNVK</th>
                                                                        <th className="px-4 py-3">HSBL</th>
                                                                        <th className="px-4 py-3">Hình thức</th>
                                                                        <th className="px-4 py-3">Số quyết định</th>
                                                                        <th className="px-4 py-3">Ghi chú</th>
                                                                        <th className="px-4 py-3 text-center">Thao tác</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100 bg-white">
                                                                    {group.records.map((r) => (
                                                                        <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                                                                            <td className="px-4 py-3 font-bold text-slate-900">{formatDateVN(r.thang_nam_nhan)}</td>
                                                                            <td className="px-4 py-3">{r.loai_nhom}</td>
                                                                            <td className="px-4 py-3 font-bold text-blue-600">{r.bac}</td>
                                                                            <td className="px-4 py-3 font-medium">{r.he_so}</td>
                                                                            <td className="px-4 py-3">{r.phan_tram_tnvk || 0}%</td>
                                                                            <td className="px-4 py-3">{r.hsbl || 0}</td>
                                                                            <td className="px-4 py-3">
                                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${r.hinh_thuc === 'Thường xuyên' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-purple-50 text-purple-600 border border-purple-100'}`}>
                                                                                    {r.hinh_thuc}
                                                                                </span>
                                                                            </td>
                                                                            <td className="px-4 py-3 font-medium text-slate-600">{r.file_qd}</td>
                                                                            <td className="px-4 py-3 text-slate-400 italic">{r.ghi_chu}</td>
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

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800">{formData.id ? 'Cập nhật thông tin lương' : 'Thêm đợt lương mới'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Nhân viên <span className="text-red-500">*</span></label>
                                <select
                                    required
                                    value={formData.dsnv_id || ''}
                                    onChange={e => setFormData({ ...formData, dsnv_id: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">-- Chọn nhân viên --</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.ho_va_ten} - {emp.chuc_vu}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Tháng/Năm nhận</label>
                                    <input type="date" value={formData.thang_nam_nhan || ''} onChange={e => setFormData({ ...formData, thang_nam_nhan: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Loại/Nhóm</label>
                                    <input
                                        type="text"
                                        list="suggestions-loai-nhom"
                                        value={formData.loai_nhom || ''}
                                        onChange={e => setFormData({ ...formData, loai_nhom: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <datalist id="suggestions-loai-nhom">
                                        <option value="TC" />
                                        <option value="VC-B" />
                                        <option value="VC-A0" />
                                        <option value="VC-A1" />
                                        <option value="CC-1" />
                                        <option value="CC-2" />
                                    </datalist>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Bậc lương</label>
                                    <input type="text" value={formData.bac || ''} onChange={e => setFormData({ ...formData, bac: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Hệ số</label>
                                    <input type="number" step="0.01" value={formData.he_so || ''} onChange={e => setFormData({ ...formData, he_so: parseFloat(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">% Thâm niên VK</label>
                                    <input type="number" value={formData.phan_tram_tnvk || ''} onChange={e => setFormData({ ...formData, phan_tram_tnvk: parseFloat(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Hệ số bảo lưu (HSBL)</label>
                                    <input type="number" step="0.01" value={formData.hsbl || ''} onChange={e => setFormData({ ...formData, hsbl: parseFloat(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Hình thức</label>
                                    <select value={formData.hinh_thuc || ''} onChange={e => setFormData({ ...formData, hinh_thuc: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="">-- Chọn hình thức --</option>
                                        <option value="Thường xuyên">Thường xuyên</option>
                                        <option value="Trước niên hạn">Trước niên hạn</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Số quyết định</label>
                                    <input type="text" value={formData.file_qd || ''} onChange={e => setFormData({ ...formData, file_qd: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Ghi chú</label>
                                    <input type="text" value={formData.ghi_chu || ''} onChange={e => setFormData({ ...formData, ghi_chu: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
            {/* Modal Detail (Mobile) */}
            {viewData && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800">Chi tiết đợt lương</h3>
                            <button onClick={() => setViewData(null)} className="p-1 text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between py-2 border-b border-slate-50">
                                <span className="text-sm text-slate-500">Thời gian:</span>
                                <span className="font-bold text-slate-900">{formatDateVN(viewData.thang_nam_nhan)}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-slate-50">
                                <span className="text-sm text-slate-500">Loại/Nhóm:</span>
                                <span className="font-medium text-slate-900">{viewData.loai_nhom}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-slate-50">
                                <span className="text-sm text-slate-500">Bậc lương:</span>
                                <span className="font-bold text-blue-600 text-lg">{viewData.bac}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-slate-50">
                                <span className="text-sm text-slate-500">Hệ số:</span>
                                <span className="font-bold text-slate-900">{viewData.he_so}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-slate-50">
                                <span className="text-sm text-slate-500">% Thâm niên VK:</span>
                                <span className="font-medium text-slate-900">{viewData.phan_tram_tnvk || 0}%</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-slate-50">
                                <span className="text-sm text-slate-500">HS bảo lưu:</span>
                                <span className="font-medium text-slate-900">{viewData.hsbl || 0}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-slate-50">
                                <span className="text-sm text-slate-500">Hình thức:</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${viewData.hinh_thuc === 'Thường xuyên' ? 'bg-emerald-50 text-emerald-600' : 'bg-purple-50 text-purple-600'}`}>
                                    {viewData.hinh_thuc}
                                </span>
                            </div>
                            <div className="py-2 border-b border-slate-50">
                                <span className="text-sm text-slate-500 block mb-1">Số quyết định:</span>
                                <span className="font-medium text-slate-700">{viewData.file_qd || 'N/A'}</span>
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
        </div>
    );
};
