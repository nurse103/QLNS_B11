import React, { useState, useEffect } from 'react';
import {
    getCongVanList,
    createCongVan,
    updateCongVan,
    deleteCongVan,
    uploadCongVanFile,
    CongVan
} from '../services/congVanService';
import {
    FileText,
    Plus,
    Search,
    Edit,
    Trash2,
    Save,
    X,
    Filter,
    Download,
    Paperclip,
    ExternalLink
} from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { getAuthUser } from '../services/authService';
import { canModify } from '../utils/ownershipUtils';

export const CongVanModule = () => {
    const { can_add, can_edit, can_delete } = usePermissions('cong_van');
    const currentUser = getAuthUser();
    const [documents, setDocuments] = useState<CongVan[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<CongVan>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('All');
    const [uploading, setUploading] = useState(false);

    const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
    const [groupInput, setGroupInput] = useState('');

    // Fetch Data
    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getCongVanList();
            setDocuments(data);
        } catch (error) {
            console.error("Failed to fetch documents", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Handlers
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddGroup = (e?: React.FormEvent) => {
        e?.preventDefault(); // Prevent form submission if called from Enter key
        if (!groupInput.trim()) return;

        const newGroup = groupInput.trim();
        if (!selectedGroups.includes(newGroup)) {
            setSelectedGroups([...selectedGroups, newGroup]);
        }
        setGroupInput('');
    };

    const handleRemoveGroup = (groupToRemove: string) => {
        setSelectedGroups(selectedGroups.filter(g => g !== groupToRemove));
    };

    const handleGroupInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddGroup();
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        try {
            const newUploadedFiles = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const publicUrl = await uploadCongVanFile(file);
                newUploadedFiles.push({ name: file.name, url: publicUrl });
            }

            // Get existing files
            let existingFiles: any[] = [];
            try {
                if (formData.file_dinh_kem) {
                    if (formData.file_dinh_kem.startsWith('[')) {
                        existingFiles = JSON.parse(formData.file_dinh_kem);
                    } else {
                        // Legacy single file support
                        existingFiles = [{ name: 'File đính kèm', url: formData.file_dinh_kem }];
                    }
                }
            } catch (e) {
                // Fallback for plain text that isn't JSON
                if (formData.file_dinh_kem) {
                    existingFiles = [{ name: 'File đính kèm', url: formData.file_dinh_kem }];
                }
            }

            const updatedFiles = [...existingFiles, ...newUploadedFiles];
            setFormData(prev => ({ ...prev, file_dinh_kem: JSON.stringify(updatedFiles) }));

        } catch (error) {
            console.error("Upload failed:", error);
            alert("Upload file thất bại!");
        } finally {
            setUploading(false);
        }
    };

    const removeFile = (index: number) => {
        try {
            let files: any[] = [];
            if (formData.file_dinh_kem) {
                if (formData.file_dinh_kem.startsWith('[')) {
                    files = JSON.parse(formData.file_dinh_kem);
                } else {
                    files = [{ name: 'File đính kèm', url: formData.file_dinh_kem }];
                }
            }

            files.splice(index, 1);
            setFormData(prev => ({
                ...prev,
                file_dinh_kem: files.length > 0 ? JSON.stringify(files) : null
            }));
        } catch (e) {
            console.error("Remove file error", e);
            setFormData(prev => ({ ...prev, file_dinh_kem: null }));
        }
    };

    // Helper to render file list
    const renderFiles = (fileData: string | null) => {
        if (!fileData) return <span className="text-slate-300">-</span>;

        let files: { name: string, url: string }[] = [];
        try {
            if (fileData.startsWith('[')) {
                files = JSON.parse(fileData);
            } else {
                files = [{ name: 'File đính kèm', url: fileData }];
            }
        } catch (e) {
            files = [{ name: 'File đính kèm', url: fileData }];
        }

        return (
            <div className="flex flex-col gap-1">
                {files.map((f, idx) => (
                    <a
                        key={idx}
                        href={f.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs"
                        title={f.name}
                    >
                        <Paperclip size={12} /> <span className="truncate max-w-[150px]">{f.name}</span>
                    </a>
                ))}
            </div>
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const submissionData = {
                ...formData,
                phan_nhom: selectedGroups.join(', ')
            };

            if (formData.id) {
                await updateCongVan(formData.id, submissionData);
                alert("Cập nhật công văn thành công!");
            } else {
                await createCongVan(submissionData as any);
                alert("Thêm mới công văn thành công!");
            }
            setIsModalOpen(false);
            setFormData({});
            setSelectedGroups([]);
            fetchData();
        } catch (error) {
            console.error("Submit failed:", error);
            alert("Có lỗi xảy ra!");
        }
    };

    const handleEdit = (doc: CongVan) => {
        setFormData(doc);
        // Initialize groups from comma-separated string
        if (doc.phan_nhom) {
            setSelectedGroups(doc.phan_nhom.split(',').map(s => s.trim()).filter(Boolean));
        } else {
            setSelectedGroups([]);
        }
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa công văn này?")) {
            try {
                await deleteCongVan(id);
                fetchData();
            } catch (error) {
                console.error("Delete failed:", error);
                alert("Xóa thất bại!");
            }
        }
    };

    const handleAddNew = () => {
        setFormData({
            loai_cong_van: 'CV Đến',
            ngay_ban_hanh: new Date().toISOString().split('T')[0]
        });
        setSelectedGroups([]);
        setIsModalOpen(true);
    };

    // Filter Logic
    const filteredDocs = documents.filter(doc => {
        const matchesSearch =
            (doc.so_hieu?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
            (doc.ten_cong_van?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
            (doc.noi_dung?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
            (doc.co_quan_ban_hanh?.toLowerCase().includes(searchTerm.toLowerCase()) || '');

        const matchesType = filterType === 'All' || doc.loai_cong_van === filterType;

        return matchesSearch && matchesType;
    }).sort((a, b) => new Date(b.ngay_ban_hanh).getTime() - new Date(a.ngay_ban_hanh).getTime());

    // Extract unique values for autocomplete
    const uniqueCoQuan = Array.from(new Set(documents.map(d => d.co_quan_ban_hanh).filter(Boolean)));
    // Flatten all groups from comma separated strings
    const uniquePhanNhom = Array.from(new Set(
        documents.flatMap(d => d.phan_nhom ? d.phan_nhom.split(',').map(s => s.trim()) : [])
            .filter(Boolean)
    ));

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="text-blue-600" />
                        Quản lý công văn
                    </h1>
                    <p className="text-slate-500 mt-1">Theo dõi công văn đi và đến</p>
                </div>
                {can_add && (
                    <button
                        onClick={handleAddNew}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus size={18} /> Thêm công văn
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo số hiệu, tên, nội dung, cơ quan..."
                        className="pl-10 pr-4 py-2 w-full border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="text-slate-400" size={18} />
                    <select
                        className="border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                    >
                        <option value="All">Tất cả loại</option>
                        <option value="CV Đến">Công văn Đến</option>
                        <option value="CV Đi">Công văn Đi</option>
                    </select>
                </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {loading ? (
                    <div className="text-center py-8 text-slate-500">Đang tải dữ liệu...</div>
                ) : filteredDocs.length > 0 ? (
                    filteredDocs.map((doc) => (
                        <div key={doc.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${doc.loai_cong_van === 'CV Đến' ? 'text-green-600 bg-green-50 border-green-100' : 'text-blue-600 bg-blue-50 border-blue-100'}`}>
                                            {doc.loai_cong_van}
                                        </span>
                                        <span className="text-xs text-slate-500">{new Date(doc.ngay_ban_hanh).toLocaleDateString('vi-VN')}</span>
                                    </div>
                                    <h3 className="font-semibold text-slate-800">{doc.so_hieu}</h3>
                                </div>
                                <div className="flex gap-2">
                                    {can_edit && canModify(doc, currentUser) && (
                                        <button
                                            onClick={() => handleEdit(doc)}
                                            className="p-1.5 bg-slate-50 rounded text-slate-500 hover:text-blue-600 transition-colors"
                                        >
                                            <Edit size={16} />
                                        </button>
                                    )}
                                    {can_delete && canModify(doc, currentUser) && (
                                        <button
                                            onClick={() => handleDelete(doc.id)}
                                            className="p-1.5 bg-red-50 rounded text-red-500 hover:bg-red-100 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div>
                                <p className="font-medium text-slate-800 mb-1 line-clamp-2">{doc.ten_cong_van}</p>
                                <p className="text-slate-500 text-xs line-clamp-2">{doc.noi_dung}</p>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                <span className="text-xs text-slate-500">{doc.co_quan_ban_hanh}</span>
                                {doc.file_dinh_kem && (
                                    <div className="mt-2 pt-2 border-t border-slate-50">
                                        {renderFiles(doc.file_dinh_kem)}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12 text-slate-400">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>Không tìm thấy công văn nào</p>
                    </div>
                )}
            </div>

            {/* Table (Desktop) */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#009900] text-white font-medium">
                            <tr>
                                <th className="px-4 py-3 w-32">Ngày BH</th>
                                <th className="px-4 py-3 w-32">Số hiệu</th>
                                <th className="px-4 py-3">Tên & Nội dung</th>
                                <th className="px-4 py-3 w-40">Cơ quan BH</th>
                                <th className="px-4 py-3 w-32">Phân nhóm</th>
                                <th className="px-4 py-3 w-20 text-center">Tệp</th>
                                <th className="px-4 py-3 w-24 text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">Đang tải dữ liệu...</td>
                                </tr>
                            ) : filteredDocs.length > 0 ? (
                                filteredDocs.map((doc) => (
                                    <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                                            {new Date(doc.ngay_ban_hanh).toLocaleDateString('vi-VN')}
                                            <div className={`text-[10px] uppercase font-bold mt-1 inline-block px-1.5 py-0.5 rounded border ${doc.loai_cong_van === 'CV Đến' ? 'text-green-600 bg-green-50 border-green-100' : 'text-blue-600 bg-blue-50 border-blue-100'}`}>
                                                {doc.loai_cong_van}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-slate-700">{doc.so_hieu}</td>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-slate-800 mb-1">{doc.ten_cong_van}</p>
                                            <p className="text-slate-500 text-xs line-clamp-2">{doc.noi_dung}</p>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{doc.co_quan_ban_hanh}</td>
                                        <td className="px-4 py-3 text-slate-600">
                                            <div className="flex flex-wrap gap-1">
                                                {doc.phan_nhom ? (
                                                    doc.phan_nhom.split(',').map((group, idx) => (
                                                        <span key={idx} className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs whitespace-nowrap">
                                                            {group.trim()}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-slate-300">---</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {renderFiles(doc.file_dinh_kem)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {can_edit && canModify(doc, currentUser) && (
                                                    <button
                                                        onClick={() => handleEdit(doc)}
                                                        className="p-1.5 hover:bg-slate-200 rounded text-slate-500 hover:text-blue-600 transition-colors"
                                                        title="Sửa"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                )}
                                                {can_delete && canModify(doc, currentUser) && (
                                                    <button
                                                        onClick={() => handleDelete(doc.id)}
                                                        className="p-1.5 hover:bg-red-50 rounded text-slate-500 hover:text-red-600 transition-colors"
                                                        title="Xóa"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p>Không tìm thấy công văn nào</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                            <h2 className="text-xl font-bold text-slate-800">
                                {formData.id ? 'Cập nhật công văn' : 'Thêm công văn mới'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Datalists for Autocomplete */}
                            <datalist id="coQuanOptions">
                                {uniqueCoQuan.map((item, index) => (
                                    <option key={index} value={String(item)} />
                                ))}
                            </datalist>
                            <datalist id="phanNhomOptions">
                                {uniquePhanNhom.map((item, index) => (
                                    <option key={index} value={String(item)} />
                                ))}
                            </datalist>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Loại công văn</label>
                                    <select
                                        name="loai_cong_van"
                                        value={formData.loai_cong_van || 'CV Đến'}
                                        onChange={handleInputChange}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="CV Đến">Công văn Đến</option>
                                        <option value="CV Đi">Công văn Đi</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Số hiệu <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        name="so_hieu"
                                        required
                                        value={formData.so_hieu || ''}
                                        onChange={handleInputChange}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="VD: 123/QD-BQP"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Ngày ban hành</label>
                                    <input
                                        type="date"
                                        name="ngay_ban_hanh"
                                        value={formData.ngay_ban_hanh || ''}
                                        onChange={handleInputChange}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Cơ quan ban hành</label>
                                    <input
                                        type="text"
                                        name="co_quan_ban_hanh"
                                        list="coQuanOptions"
                                        value={formData.co_quan_ban_hanh || ''}
                                        onChange={handleInputChange}
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="VD: Bộ Quốc Phòng"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tên công văn (Trích yếu) <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    name="ten_cong_van"
                                    required
                                    value={formData.ten_cong_van || ''}
                                    onChange={handleInputChange}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Nhập tên hoặc trích yếu nội dung chính"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nội dung chi tiết</label>
                                <textarea
                                    name="noi_dung"
                                    rows={3}
                                    value={formData.noi_dung || ''}
                                    onChange={handleInputChange}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Tóm tắt nội dung công văn..."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Phân nhóm</label>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {selectedGroups.map((group, idx) => (
                                            <span key={idx} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs flex items-center gap-1">
                                                {group}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveGroup(group)}
                                                    className="text-blue-400 hover:text-blue-600"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            list="phanNhomOptions"
                                            value={groupInput}
                                            onChange={e => setGroupInput(e.target.value)}
                                            onKeyDown={handleGroupInputKeyDown}
                                            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                            placeholder="Nhập nhóm và ấn Enter..."
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleAddGroup()}
                                            className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">File đính kèm</label>
                                    <div className="flex gap-2 mb-2">
                                        <input
                                            type="file"
                                            multiple
                                            onChange={handleFileUpload}
                                            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                        />
                                    </div>
                                    {uploading && <p className="text-xs text-blue-600 mt-1">Đang tải lên...</p>}

                                    {/* File List in Modal */}
                                    {formData.file_dinh_kem && (
                                        <div className="space-y-1 mt-2">
                                            {(() => {
                                                let files: { name: string, url: string }[] = [];
                                                try {
                                                    if (formData.file_dinh_kem.startsWith('[')) {
                                                        files = JSON.parse(formData.file_dinh_kem);
                                                    } else {
                                                        files = [{ name: 'File đính kèm', url: formData.file_dinh_kem }];
                                                    }
                                                } catch (e) {
                                                    files = [{ name: 'File đính kèm', url: formData.file_dinh_kem }];
                                                }

                                                return files.map((f, idx) => (
                                                    <div key={idx} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded">
                                                        <a href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline truncate">
                                                            <Paperclip size={12} /> {f.name}
                                                        </a>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeFile(idx)}
                                                            className="text-red-500 hover:text-red-700 p-1"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú</label>
                                <input
                                    type="text"
                                    name="ghi_chu"
                                    value={formData.ghi_chu || ''}
                                    onChange={handleInputChange}
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Save size={18} /> Lưu lại
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
