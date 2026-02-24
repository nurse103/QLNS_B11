import React, { useState, useEffect } from 'react';
import {
    getDecisions,
    createDecision,
    updateDecision,
    deleteDecision,
    uploadDecisionFile
} from '../services/decisionService';
import {
    FileText,
    Plus,
    Search,
    Edit,
    Trash2,
    Save,
    X,
    ChevronLeft,
    ChevronRight,
    Paperclip,
    FileText as FileIcon,
    Download,
    TrendingUp,
    ShieldCheck,
    AlertCircle
} from 'lucide-react';
import { Decision } from '../types';
import { usePermissions } from '../hooks/usePermissions';
import { Eye, Image as ImageIcon } from 'lucide-react';

export const DecisionList = () => {
    const { can_add, can_edit, can_delete } = usePermissions('rewards');
    const [decisions, setDecisions] = useState<Decision[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<Decision>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [uploading, setUploading] = useState(false);
    const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data, totalCount } = await getDecisions(page, pageSize);
            setDecisions(data);
            setTotalCount(totalCount);
        } catch (error) {
            console.error("Failed to fetch decisions", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [page]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const publicUrl = await uploadDecisionFile(file);
            setFormData(prev => ({ ...prev, file_quyet_dinh: publicUrl }));
            alert("Tải lên thành công!");
        } catch (error) {
            console.error("Upload failed", error);
            alert("Tải lên thất bại!");
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (formData.id) {
                await updateDecision(formData.id, formData);
                alert("Cập nhật quyết định thành công!");
            } else {
                await createDecision(formData as any);
                alert("Thêm quyết định mới thành công!");
            }
            setIsModalOpen(false);
            setFormData({});
            fetchData();
        } catch (error) {
            console.error("Submit failed", error);
            alert("Có lỗi xảy ra khi lưu!");
        }
    };

    const handleEdit = (decision: Decision) => {
        setFormData(decision);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Xóa quyết định này?")) {
            try {
                await deleteDecision(id);
                fetchData();
            } catch (error) {
                console.error("Delete failed", error);
                alert("Xóa thất bại!");
            }
        }
    };

    const handleViewDetail = (decision: Decision) => {
        setSelectedDecision(decision);
        setIsDetailModalOpen(true);
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    const filteredDecisions = decisions.filter(d =>
        d.so_quyet_dinh.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.noi_dung.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.ghi_chu && d.ghi_chu.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            {/* Filters & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Tìm theo số quyết định, nội dung..."
                        className="pl-10 pr-4 py-2 w-full border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#009900] outline-none"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                {can_add && (
                    <button
                        onClick={() => { setFormData({ loai_qd: 'Khen thưởng', ngay_ky: new Date().toISOString().split('T')[0] }); setIsModalOpen(true); }}
                        className="px-4 py-2 bg-[#009900] text-white rounded-lg flex items-center gap-2 hover:bg-[#007700] transition-colors shadow-sm"
                    >
                        <Plus size={18} /> Thêm quyết định
                    </button>
                )}
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-4">
                {loading ? (
                    <div className="text-center py-8 text-slate-500">Đang tải dữ liệu...</div>
                ) : filteredDecisions.length > 0 ? (
                    filteredDecisions.map((decision) => (
                        <div
                            key={decision.id}
                            onClick={() => handleViewDetail(decision)}
                            className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-3 active:bg-slate-50 transition-colors cursor-pointer"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${decision.loai_qd === 'Khen thưởng' ? 'text-green-600 bg-green-50 border-green-100' : 'text-red-600 bg-red-50 border-red-100'}`}>
                                            {decision.loai_qd}
                                        </span>
                                        <span className="text-xs text-slate-500">
                                            {new Date(decision.ngay_ky).toLocaleDateString('vi-VN')}
                                        </span>
                                    </div>
                                    <h3 className="font-semibold text-slate-800 text-base">{decision.so_quyet_dinh}</h3>
                                </div>
                                <div className="text-slate-400">
                                    <ChevronRight size={20} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-slate-600 line-clamp-2">{decision.noi_dung}</p>
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                                    <span className="text-[10px] text-slate-400 uppercase font-medium">{decision.cap_quyet_dinh}</span>
                                    {decision.file_quyet_dinh && (
                                        <div className="flex items-center gap-1 text-[10px] text-blue-600 font-medium">
                                            <Paperclip size={10} /> Có đính kèm
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12 text-slate-400">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>Không tìm thấy quyết định nào</p>
                    </div>
                )}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-[#009900] border-b border-[#007700] text-white font-black uppercase tracking-widest text-[11px]">
                        <tr>
                            <th className="px-6 py-4 w-52 whitespace-nowrap">Quyết định</th>
                            <th className="px-6 py-4 w-40 text-center whitespace-nowrap">Ngày & Cấp</th>
                            <th className="px-6 py-4">Nội dung</th>
                            <th className="px-6 py-4 w-80">Ghi chú</th>
                            <th className="px-6 py-4 text-center w-20 whitespace-nowrap">Tệp</th>
                            <th className="px-6 py-4 text-center w-28 whitespace-nowrap">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr><td colSpan={5} className="text-center py-12 text-slate-400 font-medium">Đang tải dữ liệu...</td></tr>
                        ) : filteredDecisions.length > 0 ? filteredDecisions.map(d => (
                            <tr key={d.id} className="hover:bg-slate-50/80 transition-colors group">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-col gap-1.5">
                                        <span className={`inline-flex items-center w-fit px-2 py-1 rounded text-[11px] font-black uppercase border tracking-tight ${d.loai_qd === 'Khen thưởng'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                            : 'bg-rose-50 text-rose-700 border-rose-100'
                                            }`}>
                                            {d.loai_qd}
                                        </span>
                                        <span className="font-black text-slate-900 text-[11px] leading-none pl-1">{d.so_quyet_dinh}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center whitespace-nowrap">
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-slate-950 font-black text-sm bg-slate-100 px-3 py-1 rounded shadow-sm w-fit mx-auto">{new Date(d.ngay_ky).toLocaleDateString('vi-VN')}</span>
                                        <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest pl-1">{d.cap_quyet_dinh}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-950 font-bold text-[13px] leading-relaxed">
                                    {d.noi_dung}
                                </td>
                                <td className="px-6 py-4 text-slate-500 font-medium text-[12px] italic leading-relaxed">
                                    {d.ghi_chu || '-'}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {d.file_quyet_dinh && (
                                        <a
                                            href={d.file_quyet_dinh}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                            title="Tải tệp đính kèm"
                                        >
                                            <Download size={16} />
                                        </a>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex justify-center gap-1">
                                        {can_edit && (
                                            <button
                                                onClick={() => handleEdit(d)}
                                                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-all active:scale-90"
                                                title="Chỉnh sửa"
                                            >
                                                <Edit size={16} />
                                            </button>
                                        )}
                                        {can_delete && (
                                            <button
                                                onClick={() => handleDelete(d.id)}
                                                className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-all active:scale-90"
                                                title="Xóa"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={5} className="text-center py-16 text-slate-400">Không tìm thấy bản ghi nào</td></tr>
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        Hiển thị <span className="text-slate-700">{filteredDecisions.length}</span> / <span className="text-slate-700">{totalCount}</span> quyết định
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
                                // Simple pagination logic showing nearby pages
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
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-xl animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b flex justify-between items-center">
                            <h2 className="text-lg font-bold">{formData.id ? 'Sửa quyết định' : 'Thêm quyết định'}</h2>
                            <button onClick={() => setIsModalOpen(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium mb-1">Loại quyết định</label>
                                    <select name="loai_qd" value={formData.loai_qd} onChange={handleInputChange} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#009900]">
                                        <option value="Khen thưởng">Khen thưởng</option>
                                        <option value="Kỷ luật">Kỷ luật</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">Số quyết định</label>
                                    <input type="text" name="so_quyet_dinh" value={formData.so_quyet_dinh || ''} onChange={handleInputChange} required className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#009900]" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">Ngày ký</label>
                                    <input type="date" name="ngay_ky" value={formData.ngay_ky || ''} onChange={handleInputChange} required className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#009900]" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">Cấp quyết định</label>
                                    <input type="text" name="cap_quyet_dinh" value={formData.cap_quyet_dinh || ''} onChange={handleInputChange} required className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#009900]" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Nội dung</label>
                                <textarea name="noi_dung" value={formData.noi_dung || ''} onChange={handleInputChange} rows={2} required className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#009900]" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Ghi chú</label>
                                <textarea name="ghi_chu" value={formData.ghi_chu || ''} onChange={handleInputChange} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#009900]" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Tệp quyết định (Ảnh/PDF)</label>
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2 items-center">
                                        <input type="text" readOnly value={formData.file_quyet_dinh || ''} className="flex-1 bg-slate-50 border rounded-lg px-3 py-2 text-[10px] outline-none" placeholder="Chưa có tệp..." />
                                        <label className="p-2 border rounded-lg bg-white cursor-pointer hover:bg-slate-50 transition-colors">
                                            <Paperclip size={18} className="text-slate-500" />
                                            <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} disabled={uploading} />
                                        </label>
                                    </div>
                                    {uploading && <p className="text-[10px] text-blue-600 animate-pulse">Đang tải lên...</p>}
                                    {formData.file_quyet_dinh && (
                                        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                                            {formData.file_quyet_dinh.toLowerCase().endsWith('.pdf') ? (
                                                <FileIcon size={16} className="text-red-500" />
                                            ) : (
                                                <FileIcon size={16} className="text-blue-500" />
                                            )}
                                            <a href={formData.file_quyet_dinh} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline truncate max-w-[300px]">
                                                {formData.file_quyet_dinh.split('/').pop()}
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, file_quyet_dinh: '' }))}
                                                className="text-red-500 hover:text-red-700 ml-auto"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 text-sm hover:bg-slate-100 rounded-lg">Hủy</button>
                                <button type="submit" disabled={uploading} className="px-6 py-2 bg-[#009900] text-white text-sm font-medium rounded-lg hover:bg-[#007700] flex items-center gap-2">
                                    <Save size={18} /> {uploading ? 'Đang tải...' : 'Lưu lại'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Detail Modal */}
            {isDetailModalOpen && selectedDecision && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <div className={`p-2 rounded-lg ${selectedDecision.loai_qd === 'Khen thưởng' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800 line-clamp-1">{selectedDecision.so_quyet_dinh}</h2>
                                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{selectedDecision.loai_qd}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsDetailModalOpen(false)}
                                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ngày ký</label>
                                    <p className="text-sm font-semibold text-slate-700">
                                        {new Date(selectedDecision.ngay_ky).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cấp quyết định</label>
                                    <p className="text-sm font-semibold text-slate-700">{selectedDecision.cap_quyet_dinh}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nội dung quyết định</label>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{selectedDecision.noi_dung}</p>
                                </div>
                            </div>

                            {selectedDecision.ghi_chu && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ghi chú</label>
                                    <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100/50">
                                        <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-wrap">{selectedDecision.ghi_chu}</p>
                                    </div>
                                </div>
                            )}

                            {selectedDecision.file_quyet_dinh && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tệp đính kèm</label>
                                    <a
                                        href={selectedDecision.file_quyet_dinh}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl group hover:bg-blue-100 transition-colors"
                                    >
                                        <div className="p-2 bg-white rounded-lg shadow-sm">
                                            {selectedDecision.file_quyet_dinh.toLowerCase().endsWith('.pdf') ? (
                                                <FileIcon size={20} className="text-red-500" />
                                            ) : (
                                                <ImageIcon size={20} className="text-blue-500" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-blue-700 truncate">
                                                {selectedDecision.file_quyet_dinh.split('/').pop()}
                                            </p>
                                            <p className="text-[10px] text-blue-500">Bấm để xem hoặc tải xuống</p>
                                        </div>
                                        <Download size={18} className="text-blue-400 group-hover:text-blue-600 transition-colors" />
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Footer - Actions */}
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <button
                                onClick={() => { setIsDetailModalOpen(false); handleEdit(selectedDecision); }}
                                className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                <Edit size={16} /> Chỉnh sửa
                            </button>
                            {can_delete && (
                                <button
                                    onClick={() => { setIsDetailModalOpen(false); handleDelete(selectedDecision.id); }}
                                    className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                                >
                                    <Trash2 size={16} /> Xóa
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
