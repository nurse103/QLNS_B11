import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
    getRewards,
    createReward,
    updateReward,
    deleteReward,
    getUniqueCapKT,
    uploadRewardFile,
    bulkCreateRewards
} from '../services/rewardsService';
import { getPersonnel } from '../services/personnelService';
import {
    Award,
    Plus,
    Search,
    Edit,
    Trash2,
    Save,
    X,
    ChevronLeft,
    ChevronRight,
    Image as ImageIcon,
    FileText as FileIcon,
    Paperclip,
    FileDown,
    Upload,
    ShieldCheck,
    AlertCircle
} from 'lucide-react';
import { Reward, Employee } from '../types';
import { usePermissions } from '../hooks/usePermissions';

export const RewardsList = () => {
    const { can_add, can_edit, can_delete } = usePermissions('rewards');
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<Reward & { targetType?: 'unit' | 'individual' }>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [personnel, setPersonnel] = useState<Employee[]>([]);
    const [existingCapKT, setExistingCapKT] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Pagination State
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    // Debounced search term
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setPage(1); // Reset to page 1 on search
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm]);

    // Fetch Data
    const fetchData = async () => {
        setLoading(true);
        try {
            const { data, totalCount } = await getRewards(page, pageSize, debouncedSearchTerm);
            setRewards(data);
            setTotalCount(totalCount);
        } catch (error) {
            console.error("Failed to fetch rewards", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [page, debouncedSearchTerm]);

    useEffect(() => {
        const fetchPersonnel = async () => {
            try {
                const [personnelData, capKTData] = await Promise.all([
                    getPersonnel(),
                    getUniqueCapKT()
                ]);
                setPersonnel(personnelData);
                setExistingCapKT(capKTData);
            } catch (error) {
                console.error("Failed to fetch initial data", error);
            }
        };
        fetchPersonnel();
    }, []);

    // Handlers
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Remove UI-only fields before sending to service
            const { targetType, ...submitData } = formData;

            if (formData.id) {
                await updateReward(formData.id, submitData as any);
                alert("Cập nhật khen thưởng thành công!");
            } else {
                await createReward(submitData as any);
                alert("Thêm mới khen thưởng thành công!");
            }
            setIsModalOpen(false);
            setFormData({});
            fetchData();
        } catch (error) {
            console.error("Submit failed:", error);
            alert("Có lỗi xảy ra!");
        }
    };

    const handleEdit = (reward: Reward) => {
        setFormData({
            ...reward,
            targetType: reward.dv === 'Khoa Hồi sức ngoại' ? 'unit' : 'individual'
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa bản ghi này?")) {
            try {
                await deleteReward(id);
                fetchData();
            } catch (error) {
                console.error("Delete failed:", error);
                alert("Xóa thất bại!");
            }
        }
    };

    const handleAddNew = () => {
        setFormData({
            loaikt: 'Khen thưởng',
            namkt: new Date().toISOString().split('T')[0],
            capkt: 'Cấp Bộ',
            dv: 'Khoa Hồi sức ngoại',
            targetType: 'unit'
        });
        setIsModalOpen(true);
    };

    const handleTargetTypeChange = (type: 'unit' | 'individual') => {
        setFormData(prev => ({
            ...prev,
            targetType: type,
            dv: type === 'unit' ? 'Khoa Hồi sức ngoại' : ''
        }));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const publicUrl = await uploadRewardFile(file);
            setFormData(prev => ({ ...prev, image: publicUrl }));
            alert("Tải lên tệp thành công!");
        } catch (error) {
            console.error("Upload failed:", error);
            alert("Tải lên tệp thất bại!");
        } finally {
            setUploading(false);
        }
    };

    const handleDownloadTemplate = () => {
        const templateData = [
            {
                'Loại': 'Khen thưởng',
                'Ngày ký': '22/12/2024',
                'Hình thức': 'Huân chương Chiến công Hạng Nhì',
                'Đơn vị / Cá nhân': 'Khoa Hồi sức ngoại',
                'Cấp quyết định': 'Chủ tịch nước',
                'Nội dung / Lý do': 'Thành tích xuất sắc trong công tác cấp cứu điều trị',
                'Số quyết định': '123/QD-CTN'
            },
            {
                'Loại': 'Kỷ luật',
                'Ngày ký': '15/05/2024',
                'Hình thức': 'Khai trừ khỏi Đảng',
                'Đơn vị / Cá nhân': 'Nguyễn Văn A',
                'Cấp quyết định': 'Cấp Bộ',
                'Nội dung / Lý do': 'Vi phạm kỷ luật nghiêm trọng',
                'Số quyết định': '456/QD-BQP'
            }
        ];

        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "Mau_Khen_Thuong_Ky_Luat.xlsx");
    };

    const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const bstr = event.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws) as any[];

                const parseExcelDate = (dateVal: any) => {
                    if (!dateVal) return new Date().toISOString().split('T')[0];

                    if (dateVal instanceof Date) {
                        return dateVal.toISOString().split('T')[0];
                    }

                    if (typeof dateVal === 'number') {
                        // Excel serial number
                        const d = new Date((dateVal - 25569) * 86400 * 1000);
                        return d.toISOString().split('T')[0];
                    }

                    if (typeof dateVal === 'string') {
                        // Handle DD/MM/YYYY
                        const ddmmyyyy = dateVal.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                        if (ddmmyyyy) {
                            return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`;
                        }
                        // Handle standard YYYY-MM-DD
                        if (dateVal.match(/^\d{4}-\d{2}-\d{2}/)) {
                            return dateVal.split('T')[0];
                        }
                    }

                    return new Date().toISOString().split('T')[0];
                };

                const formattedData = data.map(item => ({
                    loaikt: item['Loại'] || 'Khen thưởng',
                    namkt: parseExcelDate(item['Ngày ký'] || item['Năm']),
                    htkt: item['Hình thức'] || '',
                    dv: item['Đơn vị / Cá nhân'] || '',
                    capkt: item['Cấp quyết định'] || '',
                    ldkt: item['Nội dung / Lý do'] || '',
                    qdkt: item['Số quyết định'] || '',
                    image: null
                })).filter(item => item.htkt && item.dv);

                if (formattedData.length === 0) {
                    alert("Không có dữ liệu hợp lệ để nhập! Vui lòng kiểm tra các cột Hình thức và Đơn vị / Cá nhân.");
                    return;
                }

                if (window.confirm(`Bạn có chắc chắn muốn nhập ${formattedData.length} bản ghi từ Excel?`)) {
                    await bulkCreateRewards(formattedData);
                    alert("Nhập Excel thành công!");
                    fetchData();
                }
            } catch (error) {
                console.error("Import failed:", error);
                alert("Lỗi khi nhập tệp Excel! Vui lòng kiểm tra định dạng dữ liệu.");
            }
        };
        reader.readAsBinaryString(file);
        // Reset input value to allow re-upload of same file
        e.target.value = '';
    };

    // Total Pages
    const totalPages = Math.ceil(totalCount / pageSize);

    // List displayed is the raw rewards from server (already filtered)
    const displayRewards = rewards;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo hình thức, đơn vị, lý do, số quyết định..."
                        className="pl-10 pr-4 py-2 w-full border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#009900] outline-none"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                {can_add && (
                    <div className="flex gap-2">
                        <button
                            onClick={handleDownloadTemplate}
                            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg flex items-center gap-2 hover:bg-slate-200 transition-colors shadow-sm"
                            title="Tải file mẫu Excel"
                        >
                            <FileDown size={18} /> <span className="hidden md:inline">Mẫu Excel</span>
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg flex items-center gap-2 hover:bg-slate-200 transition-colors shadow-sm"
                            title="Nhập dữ liệu từ Excel"
                        >
                            <Upload size={18} /> <span className="hidden md:inline">Nhập Excel</span>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".xlsx, .xls"
                                onChange={handleImportExcel}
                            />
                        </button>
                        <button
                            onClick={handleAddNew}
                            className="px-4 py-2 bg-[#009900] text-white rounded-lg flex items-center gap-2 hover:bg-[#007700] transition-colors shadow-sm"
                        >
                            <Plus size={18} /> Thêm mới
                        </button>
                    </div>
                )}
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-4">
                {loading ? (
                    <div className="text-center py-8 text-slate-500">Đang tải dữ liệu...</div>
                ) : displayRewards.length > 0 ? (
                    displayRewards.map((reward) => (
                        <div key={reward.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${reward.loaikt === 'Khen thưởng' ? 'text-green-700 bg-green-50 border-green-100' : 'text-red-700 bg-red-50 border-red-100'}`}>
                                            {reward.loaikt}
                                        </span>
                                        <span className="text-xs text-slate-900 font-bold">
                                            {new Date(reward.namkt).toLocaleDateString('vi-VN')}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-slate-900">{reward.htkt}</h3>
                                </div>
                                <div className="flex gap-2">
                                    {can_edit && (
                                        <button
                                            onClick={() => handleEdit(reward)}
                                            className="p-1.5 bg-slate-50 rounded text-slate-500 hover:text-blue-600 transition-colors"
                                        >
                                            <Edit size={16} />
                                        </button>
                                    )}
                                    {can_delete && (
                                        <button
                                            onClick={() => handleDelete(reward.id)}
                                            className="p-1.5 bg-red-50 rounded text-red-500 hover:bg-red-100 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-700">Đơn vị/Cá nhân: {reward.dv}</p>
                                <p className="text-xs text-slate-500 mt-1">Lý do: {reward.ldkt}</p>
                                <p className="text-xs text-slate-600 mt-1">Quyết định: {reward.qdkt}</p>
                                {reward.image && (
                                    <a href={reward.image} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 mt-1">
                                        <Paperclip size={10} /> Xem đính kèm
                                    </a>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12 text-slate-400">
                        <Award className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>Không tìm thấy bản ghi nào</p>
                    </div>
                )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-[#009900] border-b border-[#007700] text-white font-black uppercase tracking-widest text-[11px]">
                            <tr>
                                <th className="px-6 py-4 w-48 whitespace-nowrap">Loại & Cấp</th>
                                <th className="px-6 py-4 w-52 text-center whitespace-nowrap">Số QD & Ngày ký</th>
                                <th className="px-6 py-4 w-64 whitespace-nowrap">Đối tượng & Hình thức</th>
                                <th className="px-6 py-4">Nội dung / Lý do</th>
                                <th className="px-6 py-4 w-24 text-center whitespace-nowrap">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">Đang tải dữ liệu...</td>
                                </tr>
                            ) : displayRewards.length > 0 ? (
                                displayRewards.map((reward) => (
                                    <tr key={reward.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1.5">
                                                <span className={`inline-flex items-center w-fit px-2 py-1 rounded text-[11px] font-black uppercase border tracking-tight ${reward.loaikt === 'Khen thưởng'
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                    : 'bg-rose-50 text-rose-700 border-rose-100'
                                                    }`}>
                                                    {reward.loaikt}
                                                </span>
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none pl-1">{reward.capkt}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center whitespace-nowrap">
                                            <div className="flex flex-col gap-1.5 items-center">
                                                <span className="font-mono text-sm font-black text-slate-950 bg-slate-50 px-2.5 py-1 rounded border border-slate-300 w-fit leading-none shadow-sm">{reward.qdkt}</span>
                                                <span className="text-slate-500 font-bold text-[10px] uppercase tracking-tighter">Ngày {new Date(reward.namkt).toLocaleDateString('vi-VN')}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <p className="text-slate-950 text-[14px] font-black uppercase tracking-tight truncate max-w-[200px]" title={reward.dv}>{reward.dv}</p>
                                            <p className="font-bold text-slate-600 text-[11px] leading-tight mt-1">{reward.htkt}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-slate-900 font-black text-[13px] leading-relaxed line-clamp-2" title={reward.ldkt}>{reward.ldkt}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                {reward.image && (
                                                    <a href={reward.image} target="_blank" rel="noreferrer" className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors" title="Xem đính kèm">
                                                        <Paperclip size={14} />
                                                    </a>
                                                )}
                                                {can_edit && (
                                                    <button onClick={() => handleEdit(reward)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-all active:scale-90" title="Chỉnh sửa">
                                                        <Edit size={16} />
                                                    </button>
                                                )}
                                                {can_delete && (
                                                    <button onClick={() => handleDelete(reward.id)} className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-all active:scale-90" title="Xóa">
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={5} className="px-6 py-16 text-center text-slate-400 font-medium">Không tìm thấy bản ghi nào</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        Hiển thị <span className="text-slate-700">{displayRewards.length}</span> / <span className="text-slate-700">{totalCount}</span> bản ghi
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                            className="p-2 border border-slate-200 bg-white rounded-lg text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:border-slate-300 transition-colors shadow-sm"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        <div className="flex items-center gap-1 px-2">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum = page;
                                if (totalPages <= 5) pageNum = i + 1;
                                else if (page <= 3) pageNum = i + 1;
                                else if (page > totalPages - 2) pageNum = totalPages - 4 + i;
                                else pageNum = page - 2 + i;

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setPage(pageNum)}
                                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${page === pageNum
                                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                                            : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            disabled={page === totalPages || totalPages === 0}
                            onClick={() => setPage(page + 1)}
                            className="p-2 border border-slate-200 bg-white rounded-lg text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:border-slate-300 transition-colors shadow-sm"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                            <h2 className="text-xl font-bold text-slate-800">{formData.id ? 'Cập nhật bản ghi' : 'Thêm bản ghi mới'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Loại</label>
                                    <select name="loaikt" value={formData.loaikt || 'Khen thưởng'} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none">
                                        <option value="Khen thưởng">Khen thưởng</option>
                                        <option value="Kỷ luật">Kỷ luật</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Ngày ký <span className="text-red-500">*</span></label>
                                    <input type="date" name="namkt" required value={formData.namkt || ''} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Hình thức <span className="text-red-500">*</span></label>
                                    <input type="text" name="htkt" required value={formData.htkt || ''} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none" placeholder="VD: Huân chương Chiến công" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Cấp quyết định</label>
                                    <input type="text" name="capkt" list="capKTOptions" value={formData.capkt || ''} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none" placeholder="VD: Cấp Bộ, Cấp Nhà nước" />
                                    <datalist id="capKTOptions">{existingCapKT.map((val, idx) => (<option key={idx} value={val} />))}</datalist>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Đối tượng khen thưởng</label>
                                <div className="flex gap-4 mb-3">
                                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={formData.targetType === 'unit'} onChange={() => handleTargetTypeChange('unit')} className="text-[#009900]" /><span className="text-sm">Đơn vị</span></label>
                                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={formData.targetType === 'individual'} onChange={() => handleTargetTypeChange('individual')} className="text-[#009900]" /><span className="text-sm">Cá nhân</span></label>
                                </div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tên Đơn vị / Cá nhân <span className="text-red-500">*</span></label>
                                <input type="text" name="dv" required list="personnelOptions" value={formData.dv || ''} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none" placeholder={formData.targetType === 'unit' ? "Nhập tên đơn vị" : "Nhập tên cá nhân"} />
                                <datalist id="personnelOptions">{personnel.map(p => (<option key={p.id} value={p.ho_va_ten} />))}</datalist>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Lý do / Nội dung</label>
                                <textarea name="ldkt" rows={3} value={formData.ldkt || ''} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none" placeholder="Lý do khen thưởng hoặc nội dung kỷ luật..." />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Số quyết định</label>
                                    <input type="text" name="qdkt" value={formData.qdkt || ''} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none" placeholder="VD: 123/QD-BQP" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Ảnh khen thưởng/KL (hoặc PDF)</label>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex gap-2">
                                            <input type="text" readOnly value={formData.image || ''} className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-[10px] outline-none" placeholder="Link ảnh hoặc PDF..." />
                                            <label className="p-2 border border-slate-300 rounded-lg bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors text-slate-500">
                                                <Paperclip size={20} />
                                                <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} disabled={uploading} />
                                            </label>
                                        </div>
                                        {uploading && <p className="text-[10px] text-blue-600 animate-pulse">Đang tải lên...</p>}
                                        {formData.image && (
                                            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                                                {formData.image.toLowerCase().endsWith('.pdf') ? <FileIcon size={16} className="text-red-500" /> : <ImageIcon size={16} className="text-blue-500" />}
                                                <a href={formData.image} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline truncate max-w-[200px]">{formData.image.split('/').pop()}</a>
                                                <button type="button" onClick={() => setFormData(prev => ({ ...prev, image: '' }))} className="text-red-500 ml-auto"><X size={12} /></button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors text-sm">Hủy</button>
                                <button type="submit" className="px-6 py-2 bg-[#009900] text-white font-medium rounded-lg hover:bg-[#007700] transition-colors flex items-center gap-2 text-sm"><Save size={18} /> Lưu lại</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
