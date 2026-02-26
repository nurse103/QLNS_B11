import React, { useState, useEffect, useRef } from 'react';
import {
    getNCKH,
    createNCKH,
    updateNCKH,
    deleteNCKH,
    uploadNCKHFiles
} from '../services/nckhService';
import { getPersonnel } from '../services/personnelService';
import {
    BookOpen,
    Plus,
    Search,
    Edit,
    Trash2,
    Save,
    X,
    ChevronLeft,
    ChevronRight,
    Paperclip,
    FileDown,
    Upload,
    Copy,
    ExternalLink,
    Calendar,
    User,
    CheckCircle2,
    Clock
} from 'lucide-react';
import { NCKH, Employee } from '../types';
import { usePermissions } from '../hooks/usePermissions';

export const NCKHModule = () => {
    const { can_add, can_edit, can_delete } = usePermissions('r-topics');
    const [nckhList, setNckhList] = useState<NCKH[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<NCKH>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [personnel, setPersonnel] = useState<Employee[]>([]);
    const [uploading, setUploading] = useState(false);

    // Pagination State
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    // Debounced search term
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setPage(1);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data, totalCount } = await getNCKH(page, pageSize, debouncedSearchTerm);
            setNckhList(data);
            setTotalCount(totalCount);
        } catch (error) {
            console.error("Failed to fetch NCKH data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [page, debouncedSearchTerm]);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const personnelData = await getPersonnel();
                setPersonnel(personnelData);
            } catch (error) {
                console.error("Failed to fetch personnel", error);
            }
        };
        fetchInitialData();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.dsnv_id || !formData.ten_de_tai) {
            alert("Vui lòng điền đầy đủ thông tin bắt buộc!");
            return;
        }

        try {
            if (formData.id) {
                await updateNCKH(formData.id, formData);
                alert("Cập nhật thành công!");
            } else {
                await createNCKH(formData);
                alert("Thêm mới thành công!");
            }
            setIsModalOpen(false);
            setFormData({});
            fetchData();
        } catch (error) {
            console.error("Submit failed:", error);
            alert("Có lỗi xảy ra!");
        }
    };

    const handleEdit = (nckh: NCKH) => {
        setFormData({ ...nckh });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa đề tài này?")) {
            try {
                await deleteNCKH(id);
                fetchData();
            } catch (error) {
                console.error("Delete failed:", error);
                alert("Xóa thất bại!");
            }
        }
    };

    const handleAddNew = () => {
        setFormData({
            trang_thai: 'Đang thực hiện',
            minh_chung: [],
            ngay_bat_dau: new Date().toISOString().split('T')[0]
        });
        setIsModalOpen(true);
    };

    const handleClone = (nckh: NCKH) => {
        const { id, created_at, updated_at, ...clonedData } = nckh;
        setFormData({
            ...clonedData,
            ten_de_tai: `${clonedData.ten_de_tai} (Bản sao)`
        });
        setIsModalOpen(true);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setUploading(true);
        try {
            const urls = await uploadNCKHFiles(files);
            setFormData(prev => ({
                ...prev,
                minh_chung: [...(prev.minh_chung || []), ...urls]
            }));
            alert(`Đã tải lên ${urls.length} tệp!`);
        } catch (error) {
            console.error("Upload failed", error);
            alert("Tải lên tệp thất bại!");
        } finally {
            setUploading(false);
        }
    };

    const removeFile = (index: number) => {
        setFormData(prev => ({
            ...prev,
            minh_chung: (prev.minh_chung || []).filter((_, i) => i !== index)
        }));
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm đề tài, vai trò, cấp quản lý..."
                        className="pl-10 pr-4 py-2 w-full border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#009900] outline-none"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                {can_add && (
                    <button
                        onClick={handleAddNew}
                        className="px-4 py-2 bg-[#009900] text-white rounded-lg flex items-center gap-2 hover:bg-[#007700] transition-colors shadow-sm whitespace-nowrap"
                    >
                        <Plus size={18} /> Thêm đề tài mới
                    </button>
                )}
            </div>

            {/* Content View */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-[#009900] border-b border-[#007700] text-white font-black uppercase tracking-widest text-[11px]">
                            <tr>
                                <th className="px-6 py-4">Đề tài & Cấp quản lý</th>
                                <th className="px-6 py-4">Nhân viên & Vai trò</th>
                                <th className="px-6 py-4 text-center">Thời gian</th>
                                <th className="px-6 py-4 text-center">Trạng thái</th>
                                <th className="px-6 py-4 text-center w-32">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Đang tải dữ liệu...</td></tr>
                            ) : nckhList.length > 0 ? (
                                nckhList.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <p className="font-black text-slate-900 leading-snug mb-1">{item.ten_de_tai}</p>
                                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-tight">
                                                {item.cap_quan_ly}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-700 flex items-center gap-1">
                                                    <User size={12} /> {item.ho_va_ten}
                                                </span>
                                                <span className="text-xs text-slate-500 italic mt-1 font-medium">{item.vai_tro}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center whitespace-nowrap">
                                            <div className="flex flex-col items-center gap-1 text-[11px] font-bold text-slate-500">
                                                <span className="flex items-center gap-1"><Clock size={10} /> {item.ngay_bat_dau ? new Date(item.ngay_bat_dau).toLocaleDateString('vi-VN') : '-'}</span>
                                                <span className="flex items-center gap-1 text-slate-400">đến</span>
                                                <span className="flex items-center gap-1"><CheckCircle2 size={10} /> {item.ngay_ket_thuc ? new Date(item.ngay_ket_thuc).toLocaleDateString('vi-VN') : '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${item.trang_thai === 'Đã nghiệm thu'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {item.trang_thai === 'Đã nghiệm thu' ? <CheckCircle2 size={10} className="mr-1" /> : <Clock size={10} className="mr-1" />}
                                                {item.trang_thai}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                {item.minh_chung && item.minh_chung.length > 0 && (
                                                    <div className="relative group/files">
                                                        <button className="p-2 bg-blue-50 text-blue-600 rounded-lg" title="Xem minh chứng">
                                                            <Paperclip size={14} />
                                                            <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                                                                {item.minh_chung.length}
                                                            </span>
                                                        </button>
                                                        <div className="absolute hidden group-hover/files:block bottom-full right-0 mb-2 w-48 bg-white shadow-xl rounded-lg border border-slate-100 p-2 z-10">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase mb-2 px-1">Tệp đính kèm:</p>
                                                            <div className="space-y-1 max-h-40 overflow-y-auto">
                                                                {item.minh_chung.map((url, idx) => (
                                                                    <a key={idx} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded text-xs text-blue-600 truncate">
                                                                        <ExternalLink size={10} /> Tệp {idx + 1}
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                {can_add && (
                                                    <button onClick={() => handleClone(item)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600" title="Sao chép">
                                                        <Copy size={14} />
                                                    </button>
                                                )}
                                                {can_edit && (
                                                    <button onClick={() => handleEdit(item)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-emerald-600" title="Sửa">
                                                        <Edit size={14} />
                                                    </button>
                                                )}
                                                {can_delete && (
                                                    <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600" title="Xóa">
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={5} className="px-6 py-16 text-center text-slate-400">Không có dữ liệu đề tài NCKH</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                            Trang {page} / {totalPages} ({totalCount} bản ghi)
                        </span>
                        <div className="flex items-center gap-1">
                            <button disabled={page === 1} onClick={() => setPage(page - 1)} className="p-2 bg-white border border-slate-200 rounded-lg disabled:opacity-30"><ChevronLeft size={16} /></button>
                            <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="p-2 bg-white border border-slate-200 rounded-lg disabled:opacity-30"><ChevronRight size={16} /></button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                <BookOpen className="text-[#009900]" />
                                {formData.id ? 'Cập nhật đề tài NCKH' : 'Thêm mới đề tài NCKH'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Tên đề tài NCKH <span className="text-rose-500">*</span></label>
                                    <textarea
                                        name="ten_de_tai"
                                        required
                                        rows={2}
                                        value={formData.ten_de_tai || ''}
                                        onChange={handleInputChange}
                                        className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-[#009900] outline-none transition-all"
                                        placeholder="Nhập tên đầy đủ của đề tài nghiên cứu..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Nhân viên chủ trì <span className="text-rose-500">*</span></label>
                                    <select
                                        name="dsnv_id"
                                        required
                                        value={formData.dsnv_id || ''}
                                        onChange={handleInputChange}
                                        className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-[#009900] outline-none transition-all"
                                    >
                                        <option value="">-- Chọn nhân viên --</option>
                                        {personnel.map(p => (
                                            <option key={p.id} value={p.id}>{p.ho_va_ten}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Vai trò</label>
                                    <input
                                        type="text"
                                        name="vai_tro"
                                        list="vaitro-options"
                                        value={formData.vai_tro || ''}
                                        onChange={handleInputChange}
                                        className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-[#009900] outline-none transition-all"
                                        placeholder="VD: Chủ nhiệm đề tài, Thư ký..."
                                    />
                                    <datalist id="vaitro-options">
                                        <option value="Chủ nhiệm đề tài" />
                                        <option value="Thư ký đề tài" />
                                        <option value="Thành viên chính" />
                                        <option value="Thành viên" />
                                    </datalist>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Cấp quản lý</label>
                                    <select
                                        name="cap_quan_ly"
                                        value={formData.cap_quan_ly || ''}
                                        onChange={handleInputChange}
                                        className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-[#009900] outline-none transition-all"
                                    >
                                        <option value="">-- Chọn cấp --</option>
                                        <option value="Cấp cơ sở">Cấp cơ sở</option>
                                        <option value="Cấp Bệnh viện">Cấp Bệnh viện</option>
                                        <option value="Cấp Bộ">Cấp Bộ</option>
                                        <option value="Cấp Nhà nước">Cấp Nhà nước</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Trạng thái</label>
                                    <div className="flex gap-2">
                                        {['Đang thực hiện', 'Đã nghiệm thu'].map(st => (
                                            <button
                                                key={st}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, trang_thai: st as any }))}
                                                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight border-2 transition-all ${formData.trang_thai === st
                                                    ? 'bg-[#009900] border-[#009900] text-white'
                                                    : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                                                    }`}
                                            >
                                                {st}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Ngày bắt đầu</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-3.5 text-slate-400" size={16} />
                                        <input type="date" name="ngay_bat_dau" value={formData.ngay_bat_dau || ''} onChange={handleInputChange} className="w-full border-2 border-slate-100 rounded-xl pl-12 pr-4 py-3 text-sm font-bold focus:border-[#009900] outline-none" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Ngày kết thúc (dự kiến)</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-3.5 text-slate-400" size={16} />
                                        <input type="date" name="ngay_ket_thuc" value={formData.ngay_ket_thuc || ''} onChange={handleInputChange} className="w-full border-2 border-slate-100 rounded-xl pl-12 pr-4 py-3 text-sm font-bold focus:border-[#009900] outline-none" />
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Kết quả (Xếp loại / Ghi chú)</label>
                                    <input
                                        type="text"
                                        name="ket_qua"
                                        value={formData.ket_qua || ''}
                                        onChange={handleInputChange}
                                        className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-[#009900] outline-none transition-all"
                                        placeholder="VD: Xuất sắc, Đạt, Đang chờ hội đồng..."
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Minh chứng (Tải lên nhiều tệp)</label>
                                    <div className="space-y-3">
                                        <div className="flex gap-2">
                                            <label className={`flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl py-4 cursor-pointer hover:border-[#009900] hover:bg-green-50/30 transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                                <Upload size={20} className="text-slate-400" />
                                                <span className="text-xs font-bold text-slate-500">Kéo thả hoặc nhấp để chọn tệp...</span>
                                                <input type="file" multiple className="hidden" onChange={handleFileChange} />
                                            </label>
                                        </div>
                                        {uploading && (
                                            <div className="flex items-center gap-2 text-[#009900] animate-pulse px-2">
                                                <div className="w-3 h-3 border-2 border-[#009900] border-t-transparent rounded-full animate-spin"></div>
                                                <span className="text-[10px] font-black uppercase">Đang tải lên hệ thống...</span>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {formData.minh_chung?.map((url, idx) => (
                                                <div key={idx} className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl group/item">
                                                    <Paperclip size={14} className="text-slate-400 group-hover/item:text-[#009900]" />
                                                    <a href={url} target="_blank" rel="noreferrer" className="flex-1 text-[10px] font-bold text-blue-600 truncate hover:underline">Tệp minh chứng {idx + 1}</a>
                                                    <button type="button" onClick={() => removeFile(idx)} className="p-1 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded transition-colors"><Trash2 size={12} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 rounded-xl transition-all">Hủy bỏ</button>
                                <button type="submit" className="px-10 py-2.5 bg-[#009900] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#007700] shadow-lg shadow-green-100 flex items-center gap-2 transition-all"><Save size={18} /> Lưu dữ liệu</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
