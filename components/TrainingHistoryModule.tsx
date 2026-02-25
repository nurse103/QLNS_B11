import React, { useState, useEffect } from 'react';
import { getPersonnel } from '../services/personnelService';
import { getTrainingRecords, createTrainingRecord, updateTrainingRecord, deleteTrainingRecord, TrainingRecord } from '../services/trainingService';
import { Training } from '../services/personnelService';
import { Search, Download, GraduationCap, ChevronRight, X, FileText, Plus, Edit, Trash2, Save } from 'lucide-react';
import * as XLSX from 'xlsx';

export const TrainingHistoryModule = () => {
    const [trainingList, setTrainingList] = useState<TrainingRecord[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [viewData, setViewData] = useState<TrainingRecord | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<TrainingRecord>>({});

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [data, personnel] = await Promise.all([
                getTrainingRecords(),
                getPersonnel()
            ]);
            setTrainingList(data || []);
            setEmployees(personnel || []);
        } catch (error) {
            console.error("Failed to fetch training history:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (item: TrainingRecord) => {
        setFormData({ ...item });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa bản ghi này?")) {
            try {
                await deleteTrainingRecord(id);
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

            console.log('Training Submit Payload Keys (Module):', Object.keys(payload));

            if (formData.id) {
                await updateTrainingRecord(formData.id, payload);
            } else {
                await createTrainingRecord(payload as Training);
            }
            setIsModalOpen(false);
            setFormData({});
            fetchData();
        } catch (error) {
            console.error(error);
            alert("Lưu thất bại");
        }
    };

    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return '---';
        const [year, month, day] = dateStr.split('-');
        if (!year || !month || !day) return dateStr;
        return `${day}/${month}/${year}`;
    };

    // Filter Logic
    const filteredList = trainingList.filter(item => {
        const searchLower = searchTerm.toLowerCase();
        const empName = item.dsnv?.ho_va_ten?.toLowerCase() || '';
        const school = item.ten_co_so_dao_tao?.toLowerCase() || '';
        const major = item.nganh_dao_tao?.toLowerCase() || '';

        return empName.includes(searchLower) || school.includes(searchLower) || major.includes(searchLower);
    });

    // Group records by employee
    const groupedRecords = filteredList.reduce((acc, current) => {
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
    }, {} as Record<number, { employeeId: number, employee: any, records: any[] }>);

    const sortedGroups: { employeeId: number; employee: any; records: any[] }[] = Object.values(groupedRecords).sort((a, b) =>
        (a.employee?.ho_va_ten || '').localeCompare(b.employee?.ho_va_ten || '')
    );

    const handleExportExcel = () => {
        const exportData = filteredList.map((item, index) => ({
            'STT': index + 1,
            'Họ và tên': item.dsnv?.ho_va_ten || '',
            'Số hiệu quân nhân/CMQĐ': item.dsnv?.cmqd || '',
            'Từ thời gian': formatDate(item.tu_thang_nam),
            'Đến thời gian': formatDate(item.den_thang_nam),
            'Cơ sở đào tạo': item.ten_co_so_dao_tao,
            'Ngành đào tạo': item.nganh_dao_tao,
            'Trình độ': item.trinh_do_dao_tao,
            'Hình thức': item.hinh_thuc_dao_tao,
            'Xếp loại': item.xep_loai_tot_nghiep,
            'Ghi chú': item.ghi_chu
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "QuaTrinhDaoTao");
        XLSX.writeFile(wb, "Qua_Trinh_Dao_Tao.xlsx");
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <GraduationCap className="text-[#009900]" />
                        Quá trình đào tạo
                    </h1>
                    <p className="text-slate-500 text-sm">Quản lý lịch sử học bổng, đào tạo của cán bộ nhân viên</p>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Tìm tên, trường, ngành..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009900]"
                        />
                    </div>
                    <button
                        onClick={handleExportExcel}
                        className="px-4 py-2 bg-[#009900]/10 text-[#009900] border border-[#009900]/20 rounded-lg text-sm font-medium hover:bg-[#009900]/20 flex items-center gap-2 transition-colors whitespace-nowrap"
                    >
                        <Download size={18} /> Xuất Excel
                    </button>
                    <button
                        onClick={() => { setFormData({}); setIsModalOpen(true); }}
                        className="px-4 py-2 bg-[#009900] text-white rounded-lg text-sm font-medium hover:bg-[#007700] flex items-center gap-2 transition-colors whitespace-nowrap shadow-sm"
                    >
                        <Plus size={18} /> Thêm mới
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
                                <th className="px-3 md:px-4 py-4">Số đợt đào tạo</th>
                                <th className="hidden md:table-cell px-4 py-4">Chức vụ</th>
                                <th className="hidden md:table-cell px-4 py-4 w-20 text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-6 h-6 border-2 border-[#009900] border-t-transparent rounded-full animate-spin"></div>
                                        <span>Đang tải dữ liệu...</span>
                                    </div>
                                </td></tr>
                            ) : sortedGroups.length === 0 ? (
                                <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic">Không có dữ liệu.</td></tr>
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
                                                        {group.records.length} đợt
                                                    </span>
                                                </td>
                                                <td className="hidden md:table-cell px-4 py-4 text-slate-600">
                                                    {group.employee?.chuc_vu}
                                                </td>
                                                <td className="hidden md:table-cell px-4 py-4 text-center">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setFormData({
                                                                dsnv_id: group.employeeId
                                                            });
                                                            setIsModalOpen(true);
                                                        }}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-lg transition-all"
                                                        title="Thêm đợt đào tạo"
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr className="bg-[#fdfdfe]">
                                                    <td colSpan={5} className="px-4 md:px-8 py-6 border-b border-slate-200">
                                                        <div className="flex items-center gap-2 mb-4">
                                                            <div className="h-4 w-1 bg-[#009900] rounded-full"></div>
                                                            <h4 className="font-bold text-slate-800 uppercase text-xs tracking-wider">Lịch sử đào tạo</h4>
                                                        </div>

                                                        {/* Mobile View: List of cards */}
                                                        <div className="block md:hidden space-y-3">
                                                            {group.records.map((r, idx) => (
                                                                <button
                                                                    key={idx}
                                                                    onClick={() => setViewData(r)}
                                                                    className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-[#009900] hover:shadow-md transition-all text-left group"
                                                                >
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 group-hover:bg-[#009900] group-hover:text-white transition-colors">
                                                                            <FileText size={16} />
                                                                        </div>
                                                                        <div>
                                                                            <div className="font-bold text-slate-900 group-hover:text-[#009900] transition-colors">{r.nganh_dao_tao}</div>
                                                                            <div className="text-[10px] text-slate-500 uppercase tracking-tighter">{formatDate(r.tu_thang_nam)} - {formatDate(r.den_thang_nam)} • Nhấn xem chi tiết</div>
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
                                                                        <th className="px-4 py-3">Thời gian</th>
                                                                        <th className="px-4 py-3">Cơ sở đào tạo</th>
                                                                        <th className="px-4 py-3">Ngành đào tạo</th>
                                                                        <th className="px-4 py-3">Trình độ</th>
                                                                        <th className="px-4 py-3">Hình thức</th>
                                                                        <th className="px-4 py-3">Xếp loại</th>
                                                                        <th className="px-4 py-3">Ghi chú</th>
                                                                        <th className="px-4 py-3 text-center w-20">Thao tác</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100 bg-white">
                                                                    {group.records.map((r, idx) => (
                                                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                                            <td className="px-4 py-3">
                                                                                <div className="font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded w-fit">
                                                                                    {formatDate(r.tu_thang_nam)} - {formatDate(r.den_thang_nam)}
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-4 py-3 font-bold text-slate-800">{r.ten_co_so_dao_tao}</td>
                                                                            <td className="px-4 py-3 text-slate-700 font-medium">{r.nganh_dao_tao}</td>
                                                                            <td className="px-4 py-3 text-slate-600">{r.trinh_do_dao_tao}</td>
                                                                            <td className="px-4 py-3 text-slate-500">{r.hinh_thuc_dao_tao}</td>
                                                                            <td className="px-4 py-3 text-slate-500">{r.xep_loai_tot_nghiep}</td>
                                                                            <td className="px-4 py-3 text-slate-500 italic max-w-xs truncate">{r.ghi_chu}</td>
                                                                            <td className="px-4 py-3 text-center">
                                                                                <div className="flex items-center justify-center gap-1">
                                                                                    <button
                                                                                        onClick={() => handleEdit(r)}
                                                                                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                                                        title="Sửa"
                                                                                    >
                                                                                        <Edit size={14} />
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleDelete(r.id!)}
                                                                                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                                        title="Xóa"
                                                                                    >
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
                            <h3 className="font-bold text-slate-800">Chi tiết đào tạo</h3>
                            <button onClick={() => setViewData(null)} className="p-1 text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="py-2 border-b border-slate-50">
                                <span className="text-sm text-slate-500 block mb-1">Ngành đào tạo:</span>
                                <span className="font-bold text-slate-900">{viewData.nganh_dao_tao}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-slate-50">
                                <span className="text-sm text-slate-500">Thời gian:</span>
                                <span className="font-bold text-blue-600">{formatDate(viewData.tu_thang_nam)} - {formatDate(viewData.den_thang_nam)}</span>
                            </div>
                            <div className="py-2 border-b border-slate-50">
                                <span className="text-sm text-slate-500 block mb-1">Cơ sở đào tạo:</span>
                                <span className="font-medium text-slate-800 uppercase text-xs">{viewData.ten_co_so_dao_tao}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-slate-50">
                                <span className="text-sm text-slate-500">Trình độ:</span>
                                <span className="font-bold text-slate-900">{viewData.trinh_do_dao_tao}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-slate-50">
                                <span className="text-sm text-slate-500">Hình thức:</span>
                                <span className="font-medium text-slate-700">{viewData.hinh_thuc_dao_tao}</span>
                            </div>
                            <div className="py-2 border-b border-slate-50">
                                <span className="text-slate-500 text-xs">Xếp loại:</span>
                                <span className="font-bold text-slate-900">{viewData.xep_loai_tot_nghiep}</span>
                            </div>
                            <div className="py-2">
                                <span className="text-sm text-slate-500 block mb-1">Ghi chú:</span>
                                <span className="text-slate-600 italic text-sm">{viewData.ghi_chu || 'Không có ghi chú'}</span>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 flex gap-3">
                            <button
                                onClick={() => { handleEdit(viewData); setViewData(null); }}
                                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-colors"
                            >
                                <Edit size={18} /> Chỉnh sửa
                            </button>
                            <button
                                onClick={() => { if (window.confirm("Xóa bản ghi này?")) { handleDelete(viewData.id!); setViewData(null); } }}
                                className="px-3 py-2.5 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors"
                                title="Xóa"
                            >
                                <Trash2 size={18} />
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
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800">{formData.id ? 'Cập nhật thông tin đào tạo' : 'Thêm đợt đào tạo mới'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Thời gian bắt đầu</label>
                                    <input type="date" value={formData.tu_thang_nam || ''} onChange={e => setFormData({ ...formData, tu_thang_nam: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009900]" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Thời gian kết thúc</label>
                                    <input type="date" value={formData.den_thang_nam || ''} onChange={e => setFormData({ ...formData, den_thang_nam: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009900]" />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Cơ sở đào tạo <span className="text-red-500">*</span></label>
                                    <input required type="text" value={formData.ten_co_so_dao_tao || ''} onChange={e => setFormData({ ...formData, ten_co_so_dao_tao: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009900]" placeholder="VD: Học viện Quân y" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Ngành đào tạo <span className="text-red-500">*</span></label>
                                    <input required type="text" value={formData.nganh_dao_tao || ''} onChange={e => setFormData({ ...formData, nganh_dao_tao: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009900]" placeholder="VD: Bác sĩ đa khoa" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Trình độ đào tạo</label>
                                    <input type="text" value={formData.trinh_do_dao_tao || ''} onChange={e => setFormData({ ...formData, trinh_do_dao_tao: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009900]" placeholder="VD: Đại học, Thạc sĩ..." />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Hình thức đào tạo</label>
                                    <input type="text" value={formData.hinh_thuc_dao_tao || ''} onChange={e => setFormData({ ...formData, hinh_thuc_dao_tao: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009900]" placeholder="VD: Chính quy, Tập trung..." />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Xếp loại tốt nghiệp</label>
                                    <input type="text" value={formData.xep_loai_tot_nghiep || ''} onChange={e => setFormData({ ...formData, xep_loai_tot_nghiep: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009900]" placeholder="VD: Khá, Giỏi..." />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Ghi chú</label>
                                    <textarea value={formData.ghi_chu || ''} onChange={e => setFormData({ ...formData, ghi_chu: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009900] min-h-[80px]" />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium transition-colors">Hủy</button>
                                <button type="submit" className="px-4 py-2 bg-[#009900] text-white rounded-lg hover:bg-[#007700] font-medium flex items-center gap-2 transition-colors shadow-lg shadow-green-100">
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
