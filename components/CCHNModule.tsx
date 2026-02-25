import React, { useState, useEffect, useRef } from 'react';
import { getPersonnel } from '../services/personnelService';
import { getCCHNRecords, createCCHNRecord, updateCCHNRecord, deleteCCHNRecord, uploadCCHNFile, bulkCreateCCHNRecords, CCHNRecord } from '../services/cchnService';
import { Search, Download, FileText, ChevronRight, X, Plus, Edit, Trash2, Save, Image as ImageIcon, Upload, File as FileIcon, ExternalLink } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

export const CCHNModule = () => {
    const [cchnList, setCchnList] = useState<CCHNRecord[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewData, setViewData] = useState<CCHNRecord | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<CCHNRecord>>({});
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [data, personnel] = await Promise.all([
                getCCHNRecords(),
                getPersonnel()
            ]);
            setCchnList(data || []);
            setEmployees(personnel || []);
        } catch (error) {
            console.error("Failed to fetch CCHN records:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (item: CCHNRecord) => {
        setFormData({ ...item });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa chứng chỉ này?")) {
            try {
                await deleteCCHNRecord(id);
                fetchData();
            } catch (error) {
                alert("Xóa thất bại");
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { dsnv, ...payload } = formData as any;

            if (formData.id) {
                await updateCCHNRecord(formData.id, payload);
            } else {
                await createCCHNRecord(payload);
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

    const filteredList = cchnList.filter(item => {
        const searchLower = searchTerm.toLowerCase();
        const empName = item.dsnv?.ho_va_ten?.toLowerCase() || '';
        const soCchn = item.so_cchn?.toLowerCase() || '';
        const phamVi = item.pham_vi_hoat_dong?.toLowerCase() || '';

        return empName.includes(searchLower) || soCchn.includes(searchLower) || phamVi.includes(searchLower);
    });

    const sortedList = [...filteredList].sort((a, b) =>
        (a.dsnv?.ho_va_ten || '').localeCompare(b.dsnv?.ho_va_ten || '')
    );

    const handleExportExcel = () => {
        const exportData = filteredList.map((item, index) => ({
            'STT': index + 1,
            'Họ và tên': item.dsnv?.ho_va_ten || '',
            'Số CCHN': item.so_cchn,
            'Ngày cấp': formatDate(item.ngay_cap),
            'Nơi cấp': item.noi_cap,
            'Văn bằng chuyên môn': item.van_bang_chuyen_mon,
            'Phạm vi hoạt động': item.pham_vi_hoat_dong,
            'Ngày hết hạn': formatDate(item.ngay_het_han),
            'Ghi chú': item.ghi_chu
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "CCHN");
        XLSX.writeFile(wb, "Chung_Chi_Hanh_Nghe.xlsx");
    };

    const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws) as any[];

                const parseExcelDate = (val: any) => {
                    if (!val) return null;
                    if (typeof val === 'number') {
                        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
                        return date.toISOString().split('T')[0];
                    }
                    return val.toString();
                };

                const newRecords = data.map(item => {
                    const empName = item['Họ và tên']?.toString().trim();
                    const emp = employees.find(e => e.ho_va_ten.toLowerCase() === empName?.toLowerCase());

                    return {
                        dsnv_id: emp?.id || null,
                        so_cchn: item['Số CCHN']?.toString() || null,
                        ngay_cap: parseExcelDate(item['Ngày cấp']),
                        noi_cap: item['Nơi cấp']?.toString() || null,
                        van_bang_chuyen_mon: item['Văn bằng chuyên môn']?.toString() || null,
                        pham_vi_hoat_dong: item['Phạm vi hoạt động']?.toString() || null,
                        ngay_het_han: parseExcelDate(item['Ngày hết hạn']),
                        ghi_chu: item['Ghi chú']?.toString() || null
                    };
                }).filter(r => r.dsnv_id);

                if (newRecords.length > 0) {
                    await bulkCreateCCHNRecords(newRecords);
                    alert(`Đã nhập thành công ${newRecords.length} bản ghi`);
                    fetchData();
                } else {
                    alert("Không tìm thấy nhân viên phù hợp hoặc dữ liệu trống.");
                }
            } catch (error) {
                console.error(error);
                alert("Lỗi khi đọc file Excel");
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            let finalFile: File | Blob = file;
            let finalName = file.name;

            // Check if it's an image to convert to PDF
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                const pdfBlob = await new Promise<Blob>((resolve, reject) => {
                    reader.onload = (event) => {
                        const img = new Image();
                        img.onload = () => {
                            const pdf = new jsPDF();
                            const imgWidth = 190;
                            const imgHeight = (img.height * imgWidth) / img.width;
                            const canvas = document.createElement("canvas");
                            canvas.width = img.width;
                            canvas.height = img.height;
                            const ctx = canvas.getContext("2d");
                            ctx?.drawImage(img, 0, 0);
                            const imgData = canvas.toDataURL("image/jpeg", 0.8);
                            pdf.addImage(imgData, 'JPEG', 10, 10, imgWidth, imgHeight);
                            resolve(pdf.output('blob'));
                        };
                        img.onerror = reject;
                        img.src = event.target?.result as string;
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                finalFile = pdfBlob;
                finalName = file.name.replace(/\.[^/.]+$/, "") + ".pdf";
            }

            const url = await uploadCCHNFile(finalFile, finalName);
            setFormData({ ...formData, anh_cchn: url });
        } catch (error) {
            console.error(error);
            alert("Tải tệp thất bại");
        } finally {
            setUploading(false);
        }
    };

    const handleDownloadTemplate = () => {
        const templateData = [
            {
                'Họ và tên': 'Nguyễn Văn A',
                'Số CCHN': '12345/CCHN-Y',
                'Ngày cấp': '2020-01-01',
                'Nơi cấp': 'Bộ Y tế',
                'Văn bằng chuyên môn': 'Bác sĩ đa khoa',
                'Phạm vi hoạt động': 'Khám bệnh, chữa bệnh nội khoa',
                'Ngày hết hạn': '2030-01-01',
                'Ghi chú': 'Ghi chú mẫu'
            }
        ];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Mau_Import_CCHN");
        XLSX.writeFile(wb, "Mau_Import_CCHN.xlsx");
    };

    const uniqueScopes = Array.from(new Set(cchnList.map(item => item.pham_vi_hoat_dong).filter(Boolean)));
    const uniqueNoiCap = Array.from(new Set(cchnList.map(item => item.noi_cap).filter(Boolean)));
    const uniqueVanBang = Array.from(new Set(cchnList.map(item => item.van_bang_chuyen_mon).filter(Boolean)));

    return (
        <div className="p-6 space-y-6 bg-slate-50/30 min-h-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <div className="p-2 bg-green-50 rounded-lg">
                            <FileText className="text-[#009900]" size={24} />
                        </div>
                        Chứng chỉ hành nghề
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Danh sách chi tiết chứng chỉ hành nghề nhân viên</p>
                </div>

                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64 min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Tìm tên, số CCHN, phạm vi..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009900] shadow-sm"
                        />
                    </div>

                    <button
                        onClick={handleDownloadTemplate}
                        className="px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2 transition-colors shadow-sm whitespace-nowrap"
                        title="Tải file mẫu để import"
                    >
                        <Download size={18} /> Mẫu
                    </button>

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg text-sm font-medium hover:bg-blue-100 flex items-center gap-2 transition-colors shadow-sm whitespace-nowrap"
                    >
                        <Upload size={18} /> Nhập Excel
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx,.xls" className="hidden" />

                    <button
                        onClick={handleExportExcel}
                        className="px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2 transition-colors shadow-sm whitespace-nowrap"
                    >
                        <Download size={18} /> Xuất
                    </button>
                    <button
                        onClick={() => { setFormData({}); setIsModalOpen(true); }}
                        className="px-4 py-2 bg-[#009900] text-white rounded-lg text-sm font-medium hover:bg-[#007700] flex items-center gap-2 transition-colors shadow-md whitespace-nowrap"
                    >
                        <Plus size={18} /> Thêm mới
                    </button>
                </div>
            </div>

            {/* Mobile View: Cards */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
                {loading ? (
                    <div className="py-12 text-center text-slate-500">Đang tải...</div>
                ) : filteredList.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 font-medium italic">Không tìm thấy dữ liệu phù hợp.</div>
                ) : (
                    filteredList.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => setViewData(item)}
                            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm active:scale-[0.98] transition-all cursor-pointer relative group"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-slate-900 group-hover:text-[#009900] transition-colors">{item.dsnv?.ho_va_ten}</h3>
                                <div className="flex gap-2">
                                    {item.anh_cchn && <FileIcon className="text-blue-500" size={16} />}
                                    <ChevronRight className="text-slate-300" size={16} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-y-2 text-xs">
                                <div className="text-slate-500">Số: <span className="text-blue-600 font-medium">{item.so_cchn || '---'}</span></div>
                                <div className="text-slate-500 text-right">Cấp: <span className="text-slate-900">{formatDate(item.ngay_cap)}</span></div>
                                <div className="text-slate-500 col-span-2 line-clamp-1">Phạm vi: <span className="text-slate-900 font-medium">{item.pham_vi_hoat_dong || '---'}</span></div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Desktop View: Full Table */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#009900] text-white font-bold uppercase text-[11px] tracking-wider border-b border-[#007700]">
                            <tr>
                                <th className="px-4 py-4">Nhân viên</th>
                                <th className="px-4 py-4">Số CCHN</th>
                                <th className="px-4 py-4">Cấp tại / Ngày cấp</th>
                                <th className="px-4 py-4">Văn bằng</th>
                                <th className="px-4 py-4">Phạm vi hoạt động</th>
                                <th className="px-4 py-4">Hết hạn</th>
                                <th className="px-4 py-4 text-center">Tệp</th>
                                <th className="px-4 py-4 text-center w-24">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-6 h-6 border-2 border-[#009900] border-t-transparent rounded-full animate-spin"></div>
                                        <span>Đang tải dữ liệu...</span>
                                    </div>
                                </td></tr>
                            ) : sortedList.length === 0 ? (
                                <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-500 italic">Không có dữ liệu.</td></tr>
                            ) : (
                                sortedList.map((r) => (
                                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group cursor-default">
                                        <td className="px-4 py-3 font-bold text-slate-900 group-hover:text-[#009900] transition-colors">
                                            {r.dsnv?.ho_va_ten}
                                            <div className="text-[10px] text-slate-400 font-normal mt-0.5">{r.dsnv?.chuc_vu}</div>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-blue-600">{r.so_cchn || '---'}</td>
                                        <td className="px-4 py-3 text-slate-600">
                                            <div className="font-medium text-slate-800">{r.noi_cap || '---'}</div>
                                            <div className="text-[10px] text-slate-400">{formatDate(r.ngay_cap)}</div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{r.van_bang_chuyen_mon || '---'}</td>
                                        <td className="px-4 py-3 text-slate-800 line-clamp-2 max-w-[350px]" title={r.pham_vi_hoat_dong || ''}>
                                            {r.pham_vi_hoat_dong || '---'}
                                        </td>
                                        <td className="px-4 py-3 text-red-500 font-medium">{formatDate(r.ngay_het_han)}</td>
                                        <td className="px-4 py-3 text-center">
                                            {r.anh_cchn ? (
                                                <button
                                                    onClick={() => window.open(r.anh_cchn!, '_blank')}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex"
                                                    title="Xem PDF"
                                                >
                                                    <FileIcon size={18} />
                                                </button>
                                            ) : <span className="text-slate-300">---</span>}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button onClick={() => handleEdit(r)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"><Edit size={16} /></button>
                                                <button onClick={() => handleDelete(r.id!)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Detail (Mobile & Desktop Quick View) */}
            {viewData && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg">Chi tiết Chứng chỉ</h3>
                                <p className="text-xs text-slate-500 uppercase font-medium">{viewData.dsnv?.ho_va_ten}</p>
                            </div>
                            <button onClick={() => setViewData(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            {viewData.anh_cchn && (
                                <div className="mb-4">
                                    <button
                                        onClick={() => window.open(viewData.anh_cchn!, '_blank')}
                                        className="w-full flex items-center justify-center gap-2 py-4 bg-[#009900]/5 text-[#009900] border border-[#009900]/20 rounded-xl font-bold hover:bg-[#009900]/10 transition-all border-dashed"
                                    >
                                        <FileIcon size={24} /> XEM FILE PDF CHỨNG CHỈ <ExternalLink size={16} />
                                    </button>
                                </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-3 bg-slate-50 rounded-xl">
                                    <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider mb-1">Số CCHN:</span>
                                    <span className="font-bold text-blue-600 text-base">{viewData.so_cchn || 'Chưa cung cấp'}</span>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl">
                                    <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider mb-1">Ngày cấp:</span>
                                    <span className="font-bold text-slate-900 text-base">{formatDate(viewData.ngay_cap)}</span>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl sm:col-span-2">
                                    <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider mb-1">Nơi cấp:</span>
                                    <span className="font-semibold text-slate-800 text-base">{viewData.noi_cap || '---'}</span>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl sm:col-span-2">
                                    <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider mb-1">Văn bằng chuyên môn:</span>
                                    <span className="font-semibold text-slate-800 text-base">{viewData.van_bang_chuyen_mon || '---'}</span>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl sm:col-span-2">
                                    <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider mb-1">Phạm vi hoạt động:</span>
                                    <span className="font-medium text-slate-800">{viewData.pham_vi_hoat_dong || '---'}</span>
                                </div>
                                <div className="p-3 bg-red-50 rounded-xl">
                                    <span className="text-[10px] text-red-400 block uppercase font-bold tracking-wider mb-1">Ngày hết hạn:</span>
                                    <span className="font-bold text-red-600 text-base">{formatDate(viewData.ngay_het_han)}</span>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl sm:col-span-2">
                                    <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider mb-1">Ghi chú:</span>
                                    <span className="text-slate-600 italic text-sm">{viewData.ghi_chu || 'Không có ghi chú'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex gap-3">
                            <button onClick={() => { handleEdit(viewData); setViewData(null); }} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-100"><Edit size={20} /> CHỈNH SỬA</button>
                            <button onClick={() => setViewData(null)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors">ĐÓNG</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Add/Edit */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800">{formData.id ? 'Cập nhật CCHN' : 'Thêm CCHN mới'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Nhân viên <span className="text-red-500">*</span></label>
                                <select
                                    required
                                    value={formData.dsnv_id || ''}
                                    onChange={e => setFormData({ ...formData, dsnv_id: Number(e.target.value) })}
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#009900] shadow-sm appearance-none bg-white font-medium"
                                >
                                    <option value="">-- Chọn nhân viên --</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.ho_va_ten} - {emp.chuc_vu}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Số CCHN</label>
                                    <input type="text" value={formData.so_cchn || ''} onChange={e => setFormData({ ...formData, so_cchn: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-[#009900]" placeholder="Ví dụ: 00123/CCHN..." />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Ngày cấp</label>
                                    <input type="date" value={formData.ngay_cap || ''} onChange={e => setFormData({ ...formData, ngay_cap: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-[#009900]" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Nơi cấp</label>
                                    <input
                                        type="text"
                                        list="noi-cap-options"
                                        value={formData.noi_cap || ''}
                                        onChange={e => setFormData({ ...formData, noi_cap: e.target.value })}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-[#009900]"
                                        placeholder="Sở Y tế, Bộ Y tế..."
                                    />
                                    <datalist id="noi-cap-options">
                                        {uniqueNoiCap.map((item, idx) => <option key={idx} value={item} />)}
                                    </datalist>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Văn bằng chuyên môn</label>
                                    <input
                                        type="text"
                                        list="van-bang-options"
                                        value={formData.van_bang_chuyen_mon || ''}
                                        onChange={e => setFormData({ ...formData, van_bang_chuyen_mon: e.target.value })}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-[#009900]"
                                        placeholder="Bác sĩ, Điều dưỡng..."
                                    />
                                    <datalist id="van-bang-options">
                                        {uniqueVanBang.map((item, idx) => <option key={idx} value={item} />)}
                                    </datalist>
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Phạm vi hoạt động</label>
                                    <input
                                        type="text"
                                        list="pham-vi-options"
                                        value={formData.pham_vi_hoat_dong || ''}
                                        onChange={e => setFormData({ ...formData, pham_vi_hoat_dong: e.target.value })}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-[#009900]"
                                        placeholder="Nhập hoặc chọn phạm vi hoạt động..."
                                    />
                                    <datalist id="pham-vi-options">
                                        {uniqueScopes.map((scope, idx) => (
                                            <option key={idx} value={scope} />
                                        ))}
                                    </datalist>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Ngày hết hạn</label>
                                    <input type="date" value={formData.ngay_het_han || ''} onChange={e => setFormData({ ...formData, ngay_het_han: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-[#009900]" />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Tệp chứng chỉ (Ảnh/PDF)</label>
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 group-hover:border-[#009900] transition-colors">
                                            {uploading ? (
                                                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                            ) : formData.anh_cchn ? (
                                                <FileIcon className="text-blue-600" size={20} />
                                            ) : (
                                                <Upload size={20} />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                type="file"
                                                accept="image/*,.pdf"
                                                onChange={handleFileUpload}
                                                disabled={uploading}
                                                className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-[#009900]/10 file:text-[#009900] hover:file:bg-[#009900]/20 cursor-pointer"
                                            />
                                            <p className="text-[10px] text-slate-400 mt-1">Ảnh sẽ tự động chuyển sang PDF</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-span-2 space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Ghi chú</label>
                                    <textarea value={formData.ghi_chu || ''} onChange={e => setFormData({ ...formData, ghi_chu: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-[#009900] min-h-[80px]" placeholder="Thông tin bổ sung..." />
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-bold transition-colors">HỦY</button>
                                <button type="submit" disabled={uploading} className="px-6 py-2.5 bg-[#009900] text-white rounded-xl hover:bg-[#007700] font-bold flex items-center gap-2 shadow-lg shadow-green-100 disabled:opacity-50 transition-all">
                                    <Save size={18} /> {formData.id ? 'CẬP NHẬT' : 'LƯU LẠI'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
