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
    const [globalStats, setGlobalStats] = useState({ total: 0, ongoing: 0, completed: 0 });
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [showEmployeeSuggestions, setShowEmployeeSuggestions] = useState(false);
    const [selectedItem, setSelectedItem] = useState<NCKH | null>(null);

    // Pagination State
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    // Debounced search term
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterLevel, setFilterLevel] = useState('');

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
            const { data, totalCount, stats } = await getNCKH(page, pageSize, debouncedSearchTerm, filterStatus, filterLevel);
            setNckhList(data);
            setTotalCount(totalCount);
            if (stats) setGlobalStats(stats);
        } catch (error) {
            console.error("Failed to fetch NCKH data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [page, debouncedSearchTerm, filterStatus, filterLevel]);

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
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (formData.id) {
                await updateNCKH(formData.id, formData);
                alert("Cập nhật thành công!");
            } else {
                if (!user.id) throw new Error("User session not found");
                await createNCKH(formData, user.id);
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
        const emp = personnel.find(p => p.id === nckh.dsnv_id);
        setEmployeeSearch(emp ? emp.ho_va_ten : '');
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
        setEmployeeSearch('');
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

    const getFileIcon = (url: string) => {
        const ext = url.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return <Upload size={14} className="text-pink-500" />;
        if (ext === 'pdf') return <Paperclip size={14} className="text-rose-500" />;
        return <FileDown size={14} className="text-blue-500" />;
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-all">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng đề tài</p>
                        <p className="text-2xl font-black text-slate-800">{globalStats.total}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-all">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang thực hiện</p>
                        <p className="text-2xl font-black text-slate-800">{globalStats.ongoing}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-all">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đã nghiệm thu</p>
                        <p className="text-2xl font-black text-slate-800">{globalStats.completed}</p>
                    </div>
                </div>
            </div>

            {/* Header Actions & Filters */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm đề tài, vai trò, nhân viên..."
                            className="pl-10 pr-4 py-2.5 w-full bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#009900] outline-none font-medium text-sm transition-all text-slate-700"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            className="px-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#009900] outline-none font-bold text-[10px] uppercase tracking-wider text-slate-500 appearance-none shadow-sm cursor-pointer min-w-[140px]"
                            value={filterStatus}
                            onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                        >
                            <option value="">Tất cả trạng thái</option>
                            <option value="Đang thực hiện">Đang thực hiện</option>
                            <option value="Đã nghiệm thu">Đã nghiệm thu</option>
                        </select>

                        <select
                            className="px-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#009900] outline-none font-bold text-[10px] uppercase tracking-wider text-slate-500 appearance-none shadow-sm cursor-pointer min-w-[140px]"
                            value={filterLevel}
                            onChange={e => { setFilterLevel(e.target.value); setPage(1); }}
                        >
                            <option value="">Tất cả cấp quản lý</option>
                            <option value="Cấp cơ sở">Cấp cơ sở</option>
                            <option value="Cấp Bệnh viện">Cấp Bệnh viện</option>
                            <option value="Cấp Bộ">Cấp Bộ</option>
                            <option value="Cấp Nhà nước">Cấp Nhà nước</option>
                        </select>

                        {can_add && (
                            <button
                                onClick={handleAddNew}
                                className="px-6 py-2.5 bg-[#009900] text-white rounded-xl flex items-center justify-center gap-2 hover:bg-[#007700] transition-all shadow-lg shadow-green-100 font-bold text-sm whitespace-nowrap"
                            >
                                <Plus size={18} /> Thêm đề tài mới
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content View */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                            <tr>
                                <th className="px-6 py-4">Thông tin đề tài</th>
                                <th className="px-6 py-4">Nhân viên chủ trì</th>
                                <th className="px-6 py-4 text-center">Thời gian</th>
                                <th className="px-6 py-4 text-center">Trạng thái</th>
                                <th className="px-6 py-4 text-center w-40">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Đang tải dữ liệu...</td></tr>
                            ) : nckhList.length > 0 ? (
                                nckhList.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <p className="font-black text-slate-800 leading-tight mb-1.5 group-hover:text-[#009900] transition-colors">{item.ten_de_tai}</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-tighter border border-emerald-100">
                                                    {item.cap_quan_ly}
                                                </span>
                                                {item.ket_qua && (
                                                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-tighter border border-blue-100">
                                                        KQ: {item.ket_qua}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-500">
                                                        {item.ho_va_ten?.charAt(0)}
                                                    </div>
                                                    {item.ho_va_ten}
                                                </span>
                                                <span className="text-xs text-slate-400 mt-1 font-medium italic">{item.vai_tro}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="inline-flex flex-col items-center gap-0.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                                <span className="text-[10px] font-black text-slate-600">{item.ngay_bat_dau ? new Date(item.ngay_bat_dau).toLocaleDateString('vi-VN') : '-'}</span>
                                                <div className="w-px h-2 bg-slate-200"></div>
                                                <span className="text-[10px] font-black text-slate-400">{item.ngay_ket_thuc ? new Date(item.ngay_ket_thuc).toLocaleDateString('vi-VN') : '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${item.trang_thai === 'Đã nghiệm thu'
                                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                                : 'bg-amber-100 text-amber-700 border border-amber-200'
                                                }`}>
                                                {item.trang_thai === 'Đã nghiệm thu' ? <CheckCircle2 size={10} className="mr-1.5" /> : <Clock size={10} className="mr-1.5" />}
                                                {item.trang_thai}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-1">
                                                {item.minh_chung && item.minh_chung.length > 0 && (
                                                    <div className="relative group/files">
                                                        <button className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Xem minh chứng">
                                                            <Paperclip size={16} />
                                                            <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold border border-white">
                                                                {item.minh_chung.length}
                                                            </span>
                                                        </button>
                                                        <div className="absolute hidden group-hover/files:block bottom-full right-0 mb-2 w-56 bg-white shadow-2xl rounded-xl border border-slate-100 p-3 z-10 animate-fade-in-up">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase mb-3 px-1 border-b border-slate-50 pb-2">Danh sách minh chứng:</p>
                                                            <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                                                                {item.minh_chung.map((url, idx) => (
                                                                    <a key={idx} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 p-2 hover:bg-slate-50 rounded-lg text-xs text-blue-600 font-bold truncate transition-colors group/link">
                                                                        {getFileIcon(url)}
                                                                        <span className="truncate flex-1">Minh chứng {idx + 1}</span>
                                                                        <ExternalLink size={10} className="opacity-0 group-hover/link:opacity-100 transition-opacity" />
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                {can_edit && (
                                                    <button onClick={() => handleEdit(item)} className="p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-colors" title="Sửa">
                                                        <Edit size={16} />
                                                    </button>
                                                )}
                                                {can_delete && (
                                                    <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors" title="Xóa">
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={5} className="px-6 py-20 text-center">
                                    <div className="flex flex-col items-center gap-3 text-slate-300">
                                        <BookOpen size={48} className="opacity-20" />
                                        <p className="text-sm font-bold">Không tìm thấy dữ liệu đề tài NCKH</p>
                                    </div>
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden divide-y divide-slate-100">
                    {loading ? (
                        <div className="p-12 text-center text-slate-400 font-bold italic">Đang tải dữ liệu...</div>
                    ) : nckhList.length > 0 ? (
                        nckhList.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setSelectedItem(item)}
                                className="w-full text-left p-5 space-y-3 hover:bg-slate-50 active:bg-slate-100 transition-colors"
                            >
                                <div className="flex justify-between items-start gap-3">
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                        <p className="font-black text-slate-800 leading-tight line-clamp-2">{item.ten_de_tai}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {item.cap_quan_ly && <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase border border-emerald-100">{item.cap_quan_ly}</span>}
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase border ${item.trang_thai === 'Đã nghiệm thu' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                                {item.trang_thai}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                        <ChevronRight size={16} />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600 shrink-0">
                                        {item.ho_va_ten?.charAt(0)}
                                    </div>
                                    <span className="font-bold text-slate-600 truncate">{item.ho_va_ten}</span>
                                    {item.vai_tro && <span className="text-slate-400 italic truncate">· {item.vai_tro}</span>}
                                </div>
                                {item.minh_chung && item.minh_chung.length > 0 && (
                                    <div className="flex items-center gap-1.5 text-[10px] text-blue-500 font-bold">
                                        <Paperclip size={11} /> {item.minh_chung.length} minh chứng
                                    </div>
                                )}
                            </button>
                        ))
                    ) : (
                        <div className="p-16 text-center text-slate-300 font-bold">Không có dữ liệu đề tài NCKH</div>
                    )}
                </div>

                {/* Mobile Detail Bottom Sheet */}
                {selectedItem && (
                    <div className="fixed inset-0 z-[200] lg:hidden">
                        {/* Backdrop */}
                        <div
                            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                            onClick={() => setSelectedItem(null)}
                        />
                        {/* Sheet */}
                        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col animate-slide-up">
                            {/* Handle bar */}
                            <div className="flex justify-center pt-4 pb-2 shrink-0">
                                <div className="w-10 h-1.5 bg-slate-200 rounded-full" />
                            </div>

                            {/* Header */}
                            <div className="px-6 pb-4 border-b border-slate-100 shrink-0">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Chi tiết đề tài</p>
                                        <h3 className="font-black text-slate-800 text-base leading-tight">{selectedItem.ten_de_tai}</h3>
                                    </div>
                                    <button
                                        onClick={() => setSelectedItem(null)}
                                        className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 shrink-0 transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {selectedItem.cap_quan_ly && (
                                        <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg uppercase border border-emerald-100">{selectedItem.cap_quan_ly}</span>
                                    )}
                                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase border flex items-center gap-1 ${selectedItem.trang_thai === 'Đã nghiệm thu' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                        {selectedItem.trang_thai === 'Đã nghiệm thu' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                                        {selectedItem.trang_thai}
                                    </span>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 custom-scrollbar">
                                {/* Người chủ trì */}
                                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-black text-lg shrink-0">
                                        {selectedItem.ho_va_ten?.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nhân viên chủ trì</p>
                                        <p className="font-black text-slate-800">{selectedItem.ho_va_ten}</p>
                                        {selectedItem.vai_tro && <p className="text-xs text-slate-500 italic mt-0.5">{selectedItem.vai_tro}</p>}
                                    </div>
                                </div>

                                {/* Thời gian */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-4 bg-slate-50 rounded-2xl">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ngày bắt đầu</p>
                                        <p className="font-bold text-slate-700 text-sm">{selectedItem.ngay_bat_dau ? new Date(selectedItem.ngay_bat_dau).toLocaleDateString('vi-VN') : '—'}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ngày kết thúc</p>
                                        <p className="font-bold text-slate-700 text-sm">{selectedItem.ngay_ket_thuc ? new Date(selectedItem.ngay_ket_thuc).toLocaleDateString('vi-VN') : '—'}</p>
                                    </div>
                                </div>

                                {/* Kết quả */}
                                {selectedItem.ket_qua && (
                                    <div className="p-4 bg-blue-50 rounded-2xl">
                                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Kết quả</p>
                                        <p className="font-bold text-blue-700">{selectedItem.ket_qua}</p>
                                    </div>
                                )}

                                {/* Minh chứng */}
                                {selectedItem.minh_chung && selectedItem.minh_chung.length > 0 && (
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Minh chứng ({selectedItem.minh_chung.length} tệp)</p>
                                        <div className="space-y-2">
                                            {selectedItem.minh_chung.map((url, idx) => (
                                                <a
                                                    key={idx}
                                                    href={url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl text-sm font-bold text-blue-600 hover:bg-blue-50 transition-colors"
                                                >
                                                    <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center">{getFileIcon(url)}</div>
                                                    <span className="flex-1 truncate">Minh chứng {idx + 1}</span>
                                                    <ExternalLink size={14} className="text-slate-400" />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="px-6 pb-8 pt-4 border-t border-slate-100 flex gap-3 shrink-0">
                                {can_edit && (
                                    <button
                                        onClick={() => { handleEdit(selectedItem); setSelectedItem(null); }}
                                        className="flex-1 py-3.5 bg-emerald-50 text-emerald-600 text-[11px] font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all border border-emerald-100"
                                    >
                                        <Edit size={16} /> Sửa
                                    </button>
                                )}
                                {can_delete && (
                                    <button
                                        onClick={() => { handleDelete(selectedItem.id); setSelectedItem(null); }}
                                        className="flex-1 py-3.5 bg-rose-50 text-rose-600 text-[11px] font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all border border-rose-100"
                                    >
                                        <Trash2 size={16} /> Xóa
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center mt-auto">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Trang {page} / {totalPages} <span className="mx-2 text-slate-200">|</span> {totalCount} bản ghi
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(page - 1)}
                                className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-30 hover:border-[#009900] hover:text-[#009900] transition-all shadow-sm active:scale-90"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <button
                                disabled={page === totalPages}
                                onClick={() => setPage(page + 1)}
                                className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-30 hover:border-[#009900] hover:text-[#009900] transition-all shadow-sm active:scale-90"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-zoom-in">
                            <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-white sticky top-0 z-10">
                                <div className="space-y-1">
                                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                                        <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                                            <BookOpen size={20} />
                                        </div>
                                        {formData.id ? 'Cập nhật đề tài NCKH' : 'Thêm mới đề tài NCKH'}
                                    </h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-11">Vui lòng điền đầy đủ các thông tin bên dưới</p>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-600 transition-all active:scale-90"><X size={20} /></button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar bg-slate-50/30">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1 text-slate-400">Tên đề tài NCKH <span className="text-rose-500">*</span></label>
                                        <textarea
                                            name="ten_de_tai"
                                            required
                                            rows={3}
                                            value={formData.ten_de_tai || ''}
                                            onChange={handleInputChange}
                                            className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:border-[#009900] focus:ring-4 focus:ring-green-50 outline-none transition-all shadow-sm"
                                            placeholder="Nhập tên đầy đủ của đề tài nghiên cứu..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1 text-slate-400">Nhân viên chủ trì <span className="text-rose-500">*</span></label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-4 text-slate-400" size={16} />
                                            <input
                                                type="text"
                                                placeholder="Tìm tên nhân viên..."
                                                value={employeeSearch}
                                                onChange={(e) => {
                                                    setEmployeeSearch(e.target.value);
                                                    setShowEmployeeSuggestions(true);
                                                }}
                                                onFocus={() => setShowEmployeeSuggestions(true)}
                                                className="w-full bg-white border-2 border-slate-100 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold text-slate-700 focus:border-[#009900] outline-none transition-all shadow-sm"
                                            />
                                            {showEmployeeSuggestions && employeeSearch && (
                                                <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar">
                                                    {personnel
                                                        .filter(p => p.ho_va_ten.toLowerCase().includes(employeeSearch.toLowerCase()))
                                                        .map(p => (
                                                            <button
                                                                key={p.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setFormData(prev => ({ ...prev, dsnv_id: p.id }));
                                                                    setEmployeeSearch(p.ho_va_ten);
                                                                    setShowEmployeeSuggestions(false);
                                                                }}
                                                                className="w-full text-left px-5 py-3 text-sm font-bold text-slate-700 hover:bg-green-50 hover:text-[#009900] transition-colors border-b border-slate-50 last:border-none"
                                                            >
                                                                {p.ho_va_ten}
                                                            </button>
                                                        ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1 text-slate-400">Vai trò</label>
                                        <input
                                            type="text"
                                            name="vai_tro"
                                            list="vaitro-options"
                                            value={formData.vai_tro || ''}
                                            onChange={handleInputChange}
                                            className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:border-[#009900] outline-none transition-all shadow-sm"
                                            placeholder="VD: Chủ nhiệm đề tài, Báo cáo viên..."
                                        />
                                        <datalist id="vaitro-options">
                                            <option value="Chủ nhiệm đề tài" />
                                            <option value="Thư ký đề tài" />
                                            <option value="Thành viên chính" />
                                            <option value="Báo cáo viên" />
                                        </datalist>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1 text-slate-400">Cấp quản lý</label>
                                        <input
                                            type="text"
                                            name="cap_quan_ly"
                                            list="capquanly-options"
                                            value={formData.cap_quan_ly || ''}
                                            onChange={handleInputChange}
                                            className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:border-[#009900] outline-none transition-all shadow-sm"
                                            placeholder="VD: Cấp Cơ sở, Cấp Bệnh viện..."
                                        />
                                        <datalist id="capquanly-options">
                                            {Array.from(new Set(nckhList.map(i => i.cap_quan_ly).filter(Boolean))).map(lvl => (
                                                <option key={lvl} value={lvl!} />
                                            ))}
                                            <option value="Cấp cơ sở" />
                                            <option value="Cấp Bệnh viện" />
                                            <option value="Cấp Bộ" />
                                            <option value="Cấp Nhà nước" />
                                        </datalist>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1 text-slate-400">Trạng thái thực hiện</label>
                                        <div className="flex gap-2 bg-white p-1.5 rounded-2xl border-2 border-slate-100 shadow-sm">
                                            {['Đang thực hiện', 'Đã nghiệm thu'].map(st => (
                                                <button
                                                    key={st}
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, trang_thai: st as any }))}
                                                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all ${formData.trang_thai === st
                                                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100'
                                                        : 'text-slate-400 hover:bg-slate-50'
                                                        }`}
                                                >
                                                    {st}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1 text-slate-400">Ngày bắt đầu</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-4 top-4 text-slate-400" size={16} />
                                            <input type="date" name="ngay_bat_dau" value={formData.ngay_bat_dau || ''} onChange={handleInputChange} className="w-full bg-white border-2 border-slate-100 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold text-slate-700 focus:border-[#009900] outline-none shadow-sm" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1 text-slate-400">Ngày kết thúc (dự kiến)</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-4 top-4 text-slate-400" size={16} />
                                            <input type="date" name="ngay_ket_thuc" value={formData.ngay_ket_thuc || ''} onChange={handleInputChange} className="w-full bg-white border-2 border-slate-100 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold text-slate-700 focus:border-[#009900] outline-none shadow-sm" />
                                        </div>
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1 text-slate-400">Kết quả đánh giá / Xếp loại</label>
                                        <input
                                            type="text"
                                            name="ket_qua"
                                            value={formData.ket_qua || ''}
                                            onChange={handleInputChange}
                                            className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:border-[#009900] outline-none transition-all shadow-sm"
                                            placeholder="VD: Đạt loại Xuất sắc, Đạt yêu cầu..."
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1 text-slate-400">Hồ sơ minh chứng <span className="text-slate-300 font-medium">(Tải lên nhiều tệp)</span></label>
                                        <div className="space-y-4">
                                            <label className={`group relative flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl py-8 px-6 cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/10 transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                                <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                                                    <Upload size={24} />
                                                </div>
                                                <p className="text-xs font-black text-slate-500 uppercase tracking-widest text-center">Kéo thả hoặc nhấp để chọn tệp tin</p>
                                                <p className="text-[10px] text-slate-400 mt-1 uppercase">Định dạng hỗ trợ: PDF, Image, Word, Excel...</p>
                                                <input type="file" multiple className="hidden" onChange={handleFileChange} />
                                            </label>

                                            {uploading && (
                                                <div className="flex items-center justify-center gap-3 text-emerald-600 bg-emerald-50 py-3 rounded-2xl border border-emerald-100 animate-pulse">
                                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Hệ thống đang xử lý tệp...</span>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {formData.minh_chung?.map((url, idx) => (
                                                    <div key={idx} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-blue-200 transition-all group/file">
                                                        <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center">
                                                            {getFileIcon(url)}
                                                        </div>
                                                        <a href={url} target="_blank" rel="noreferrer" className="flex-1 text-[11px] font-bold text-slate-600 truncate hover:text-blue-600 transition-colors">Tệp đính kèm {idx + 1}</a>
                                                        <button type="button" onClick={() => removeFile(idx)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all active:scale-90">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-6 sticky bottom-0 bg-white sm:bg-transparent flex-col-reverse sm:flex-row border-t border-slate-100 sm:border-none -mx-8 px-8 pb-4">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-100 rounded-2xl transition-all active:scale-95">Hủy bỏ</button>
                                    <button
                                        type="submit"
                                        disabled={uploading}
                                        className={`w-full sm:w-auto px-12 py-4 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all transform hover:scale-105 active:scale-95 ${uploading ? 'bg-slate-300 cursor-not-allowed shadow-none' : 'bg-[#009900] hover:bg-[#007700] shadow-green-100'}`}
                                    >
                                        <Save size={18} /> {uploading ? 'Đang xử lý file...' : 'Lưu dữ liệu'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div>
    );
};
