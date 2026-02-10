import React, { useState, useEffect } from 'react';
import { Card, CardRecord } from '../types';
import { getCards, getCardRecords, createCardRecord, updateCardRecord, checkPatientBorrowing, deleteCardRecord } from '../services/cardService';
import { getAuthUser } from '../services/authService';
import { usePermissions } from '../hooks/usePermissions';
import { supabase } from '../services/supabaseClient';
import { Plus, Search, Edit, Trash2, X, Save, Calendar, User, Phone, CreditCard, AlertCircle, Eye, Download, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

export const PatientCardModule = () => {
    const [records, setRecords] = useState<CardRecord[]>([]);
    const [cards, setCards] = useState<Card[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Filter State
    type FilterType = 'all' | 'today' | 'yesterday' | '2_days_ago' | '3_days_ago' | 'custom';
    type StatusFilterType = 'all' | 'borrowing' | 'returned';

    const [filterType, setFilterType] = useState<FilterType>('all');
    const [statusFilter, setStatusFilter] = useState<StatusFilterType>('borrowing');
    const [customDateFrom, setCustomDateFrom] = useState('');
    const [customDateTo, setCustomDateTo] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<CardRecord>>({});
    const [returnData, setReturnData] = useState<{ id: number, nguoi_nhan_lai_the: string, ngay_tra: string, nguoi_ban_giao_tien_tra?: string, ngay_ban_giao_tien_tra?: string, trang_thai_tien_tra?: string }>({ id: 0, nguoi_nhan_lai_the: '', ngay_tra: '' });
    const [isViewMode, setIsViewMode] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // Batch Update State
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
    const [batchData, setBatchData] = useState<{
        type: 'borrow' | 'return',
        trang_thai: string,
        nguoi_ban_giao: string,
        ngay_ban_giao: string
    }>({
        type: 'borrow',
        trang_thai: 'Đã bàn giao', // Default to 'Đã bàn giao' as this is the likely action
        nguoi_ban_giao: '',
        ngay_ban_giao: ''
    });

    // Warning State
    const [warning, setWarning] = useState<string | null>(null);

    const currentUser = getAuthUser();
    // Correct key matching App.tsx and DB
    const { can_add, can_edit, can_delete, can_view } = usePermissions('patient-card-management');

    // If no view permission, we might want to redirect or show message, 
    // but the parent likely handles hiding. 
    // However, for safety:
    if (!currentUser) return null; // Or loading state


    useEffect(() => {
        fetchData();
        fetchCards();

        const subscription = supabase
            .channel('patient_card_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'quan_ly_the_cham' }, (payload) => {
                fetchData();
                fetchCards(); // Also fetch cards because availability might change
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'dm_the_cham' }, (payload) => {
                fetchCards();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getCardRecords();
            setRecords(data);
        } catch (error: any) {
            console.error("Failed to fetch records:", error);
            if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
                alert("Lỗi: Bảng dữ liệu chưa được tạo. Vui lòng chạy file SQL 'create_card_management.sql' trong Supabase.");
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchCards = async () => {
        try {
            const data = await getCards();
            setCards(data);
        } catch (error) {
            console.error("Failed to fetch cards:", error);
        }
    };

    // Filter Logic
    // 1. First Pass: Filter by Search and Date
    const baseFilteredRecords = records.filter(r => {
        const matchesSearch =
            r.ho_ten_benh_nhan.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.so_the.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.ho_ten_nguoi_cham.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        if (filterType === 'all') return true;

        const recordDate = new Date(r.ngay_muon);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (filterType === 'custom') {
            if (!customDateFrom && !customDateTo) return true;
            const from = customDateFrom ? new Date(customDateFrom) : new Date(0); // Beginning of time
            const to = customDateTo ? new Date(customDateTo) : new Date(8640000000000000); // End of time
            to.setHours(23, 59, 59, 999); // Include the whole end day

            // Adjust from date to start of day
            from.setHours(0, 0, 0, 0);

            return recordDate >= from && recordDate <= to;
        }

        // Specific days
        const targetDate = new Date(today);
        if (filterType === 'yesterday') {
            targetDate.setDate(today.getDate() - 1);
        } else if (filterType === '2_days_ago') {
            targetDate.setDate(today.getDate() - 2);
        } else if (filterType === '3_days_ago') {
            targetDate.setDate(today.getDate() - 3);
        }
        // 'today' is already targetDate

        const startOfTarget = new Date(targetDate);
        startOfTarget.setHours(0, 0, 0, 0);
        const endOfTarget = new Date(targetDate);
        endOfTarget.setHours(23, 59, 59, 999);

        return recordDate >= startOfTarget && recordDate <= endOfTarget;
    });

    // 2. Sort Descending by Date
    baseFilteredRecords.sort((a, b) => new Date(b.ngay_muon).getTime() - new Date(a.ngay_muon).getTime());

    // 3. Calculate Counts based on base filters
    const borrowingCount = baseFilteredRecords.filter(r => r.trang_thai === 'Đang mượn thẻ').length;
    const returnedCount = baseFilteredRecords.filter(r => r.trang_thai === 'Đã trả thẻ').length;

    // 4. Final Pass: Filter by Status
    const filteredRecords = baseFilteredRecords.filter(r => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'borrowing') return r.trang_thai === 'Đang mượn thẻ';
        if (statusFilter === 'returned') return r.trang_thai === 'Đã trả thẻ';
        return true;
    });

    // Form Handlers
    const handleOpenModal = () => {
        const now = new Date();
        // Adjust to Vietnam time zone for default value in input type="datetime-local" which expects YYYY-MM-DDTHH:mm
        // But input type="datetime-local" works with local time of the browser usually.
        // Let's just use local time string.
        const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

        setFormData({
            ngay_muon: localIso, // Default to now
            so_tien_cuoc: 500000,
            nguoi_cho_muon: currentUser?.full_name || currentUser?.username || 'Admin',
            trang_thai: 'Đang mượn thẻ',
            trang_thai_tien_muon: 'Chưa bàn giao'
        });
        setWarning(null);
        setIsModalOpen(true);
    };

    const checkDuplicate = async (name: string) => {
        if (!name) return;
        const duplicates = await checkPatientBorrowing(name);
        if (duplicates && duplicates.length > 0) {
            const d = duplicates[0];
            const dateStr = new Date(d.ngay_muon).toLocaleDateString('vi-VN');
            setWarning(`CẢNH BÁO: Bệnh nhân ${d.ho_ten_benh_nhan} đã mượn thẻ ${d.so_the} ngày ${dateStr}, người cho mượn: ${d.nguoi_cho_muon || '---'}`);
        } else {
            setWarning(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Convert local datetime to ISO with timezone if needed, or rely on Supabase to handle it if we send ISO string.
            // input datetime-local returns "YYYY-MM-DDTHH:mm".
            // We should ensure it's treated as Vietnam time or local time.
            const recordToSave = {
                ...formData,
                ngay_muon: new Date(formData.ngay_muon!).toISOString(),
                ngay_ban_giao_tien_muon: formData.ngay_ban_giao_tien_muon ? new Date(formData.ngay_ban_giao_tien_muon).toISOString() : null
            };

            if (isEditMode && formData.id) {
                await updateCardRecord(formData.id, recordToSave);
                alert("Cập nhật thành công!");
            } else {
                await createCardRecord(recordToSave as any);
                alert("Đăng ký mượn thẻ thành công!");
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error("Submit error:", error);
            alert("Có lỗi xảy ra, vui lòng thử lại.");
        }
    };

    const handleOpenReturnModal = (record: CardRecord) => {
        const now = new Date();
        const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

        setReturnData({
            id: record.id,
            nguoi_nhan_lai_the: currentUser?.full_name || currentUser?.username || 'Admin',
            ngay_tra: localIso,
            trang_thai_tien_tra: 'Chưa bàn giao'
        });
        setIsReturnModalOpen(true);
    };

    const handleView = (record: CardRecord) => {
        setFormData(record);
        setIsViewMode(true);
        setIsEditMode(false);
        setIsModalOpen(true);
    };

    const handleEdit = (record: CardRecord) => {
        setFormData({
            ...record,
            ngay_muon: record.ngay_muon ? new Date(record.ngay_muon).toISOString().slice(0, 16) : '',
            ngay_ban_giao_tien_muon: record.ngay_ban_giao_tien_muon ? new Date(record.ngay_ban_giao_tien_muon).toISOString().slice(0, 16) : ''
        });
        setIsViewMode(false);
        setIsEditMode(true);
        setIsModalOpen(true);
    };

    const handleReturnSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateCardRecord(returnData.id, {
                trang_thai: 'Đã trả thẻ',
                nguoi_nhan_lai_the: returnData.nguoi_nhan_lai_the,
                ngay_tra: new Date(returnData.ngay_tra).toISOString(),
                nguoi_ban_giao_tien_tra: returnData.nguoi_ban_giao_tien_tra,
                ngay_ban_giao_tien_tra: returnData.ngay_ban_giao_tien_tra ? new Date(returnData.ngay_ban_giao_tien_tra).toISOString() : null,
                trang_thai_tien_tra: returnData.trang_thai_tien_tra || 'Chưa bàn giao'
            });
            alert("Trả thẻ thành công!");
            setIsReturnModalOpen(false);
            fetchData();
        } catch (error) {
            console.error("Return error:", error);
            alert("Có lỗi xảy ra.");
        }
    };

    const handleDeleteRecord = async (id: number) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa bản ghi này không? Hành động này không thể hoàn tác.")) {
            try {
                await deleteCardRecord(id);
                // alert("Xóa thành công!"); // Optional: less noise
                fetchData();
            } catch (error) {
                console.error("Delete error:", error);
                alert("Xóa thất bại.");
            }
        }
    };

    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return '---';
        return new Date(dateStr).toLocaleString('vi-VN', {
            hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric'
        });
    };

    // Batch Handlers
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(filteredRecords.map(r => r.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectRow = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleOpenBatchModal = () => {
        const now = new Date();
        const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        setBatchData({
            type: 'borrow',
            trang_thai: 'Đã bàn giao',
            nguoi_ban_giao: currentUser?.full_name || currentUser?.username || 'Admin',
            ngay_ban_giao: localIso
        });
        setIsBatchModalOpen(true);
    };

    const handleBatchSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedIds.length === 0) return;

        try {
            const updates = selectedIds.map(id => {
                const updatePayload: any = {};
                const timestamp = new Date(batchData.ngay_ban_giao).toISOString();

                if (batchData.type === 'borrow') {
                    updatePayload.trang_thai_tien_muon = batchData.trang_thai;
                    updatePayload.nguoi_ban_giao_tien_muon = batchData.nguoi_ban_giao;
                    updatePayload.ngay_ban_giao_tien_muon = timestamp;
                } else {
                    updatePayload.trang_thai_tien_tra = batchData.trang_thai;
                    updatePayload.nguoi_ban_giao_tien_tra = batchData.nguoi_ban_giao;
                    updatePayload.ngay_ban_giao_tien_tra = timestamp;
                }
                return updateCardRecord(id, updatePayload);
            });

            await Promise.all(updates);
            alert(`Đã cập nhật thành công ${selectedIds.length} bản ghi!`);
            setIsBatchModalOpen(false);
            setSelectedIds([]); // Clear selection
            fetchData();
        } catch (error) {
            console.error("Batch update error:", error);
            alert("Có lỗi xảy ra khi cập nhật hàng loạt.");
        }
    };

    const handleExport = () => {
        const dataToExport = records.map(r => ({
            'Ngày mượn': r.ngay_muon ? new Date(r.ngay_muon).toLocaleDateString('vi-VN') : '',
            'Họ tên bệnh nhân': r.ho_ten_benh_nhan,
            'Năm sinh': r.nam_sinh,
            'Họ tên người chăm': r.ho_ten_nguoi_cham,
            'SĐT người chăm': r.sdt_nguoi_cham,
            'Số thẻ': r.so_the,
            'Tiền cược': r.so_tien_cuoc,
            'Trạng thái': r.trang_thai,
            'Người cho mượn': r.nguoi_cho_muon,
            'Ghi chú': r.ghi_chu
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Danh_sach_muon_the");
        XLSX.writeFile(wb, "Danh_sach_muon_the.xlsx");
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws);

            if (data.length === 0) {
                alert("File không có dữ liệu!");
                return;
            }

            if (!window.confirm(`Tìm thấy ${data.length} dòng dữ liệu. Bạn có muốn nhập không?`)) return;

            setLoading(true);
            let successCount = 0;
            let failCount = 0;

            for (const row of data as any[]) {
                try {
                    // Try to map various possible column names
                    const ngayMuonRaw = row['Ngày mượn'] || row['Date'] || row['ngay_muon'];
                    let ngayMuon = new Date().toISOString();

                    // Simple date parsing attempt
                    if (ngayMuonRaw) {
                        // Check if Excel date number or string
                        if (typeof ngayMuonRaw === 'number') {
                            // Excel date conversion if needed, validation library usually handles this if passing option cellDates: true, 
                            // but read uses type: binary.
                            // Let's assume user inputs string DD/MM/YYYY or similar, or just default to NOW if invalid for safety.
                        } else {
                            // Try to parse string
                            // If format is DD/MM/YYYY
                            const parts = ngayMuonRaw.split('/');
                            if (parts.length === 3) {
                                ngayMuon = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).toISOString();
                            }
                        }
                    }

                    const record: any = {
                        ho_ten_benh_nhan: row['Họ tên bệnh nhân'] || row['Patient Name'] || row['ho_ten_benh_nhan'],
                        nam_sinh: row['Năm sinh']?.toString() || row['Birth Year'] || row['nam_sinh'],
                        ho_ten_nguoi_cham: row['Họ tên người chăm'] || row['Caregiver Name'] || row['ho_ten_nguoi_cham'],
                        sdt_nguoi_cham: row['SĐT người chăm']?.toString() || row['Phone'] || row['sdt_nguoi_cham'],
                        so_the: row['Số thẻ']?.toString() || row['Card Number'] || row['so_the'],
                        so_tien_cuoc: Number(row['Tiền cược'] || row['Deposit'] || row['so_tien_cuoc'] || 500000),
                        nguoi_cho_muon: currentUser?.full_name || currentUser?.username || 'Admin',
                        trang_thai: 'Đang mượn thẻ',
                        ngay_muon: ngayMuon,
                        trang_thai_tien_muon: 'Chưa bàn giao',
                        ghi_chu: row['Ghi chú'] || row['Note'] || row['ghi_chu']
                    };

                    if (record.ho_ten_benh_nhan && record.so_the) {
                        await createCardRecord(record);
                        successCount++;
                    }
                } catch (err) {
                    console.error("Import row failed", err);
                    failCount++;
                }
            }
            alert(`Nhập hoàn tất! Thành công: ${successCount}, Thất bại: ${failCount}`);
            fetchData();
            e.target.value = ''; // Reset input
        };
        reader.readAsBinaryString(file);
    };

    const renderMoneyStatusBadge = (status: string | null | undefined) => {
        if (status === 'Đã bàn giao') return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">Đã bàn giao</span>;
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">Chưa bàn giao</span>;
    };

    const isAdmin = currentUser?.role === 'admin';

    return (
        <div className="p-6 space-y-6 animate-fade-in text-slate-800">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <CreditCard className="text-blue-600" /> Quản lý thẻ chăm
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Theo dõi việc mượn/trả thẻ chăm bệnh nhân</p>
                </div>
                <div className="flex gap-2">
                    {isAdmin && selectedIds.length > 0 && (
                        <button
                            onClick={handleOpenBatchModal}
                            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
                        >
                            <CreditCard size={18} /> Cập nhật BG ({selectedIds.length})
                        </button>
                    )}
                    {isAdmin && (
                        <>
                            <button
                                onClick={handleExport}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
                                title="Xuất Excel"
                            >
                                <Download size={18} /> <span className="hidden md:inline">Xuất Excel</span>
                            </button>
                            <div className="relative">
                                <input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    onChange={handleImport}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    title="Nhập từ Excel"
                                />
                                <button
                                    className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
                                >
                                    <Upload size={18} /> <span className="hidden md:inline">Nhập Excel</span>
                                </button>
                            </div>
                        </>
                    )}
                    <button
                        onClick={handleOpenModal}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
                    >
                        <Plus size={18} /> Đăng ký mượn mới
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 bg-slate-50/50 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo tên, số thẻ..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-wrap gap-2 items-center">
                        <select
                            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value as FilterType)}
                        >
                            <option value="all">Tất cả thời gian</option>
                            <option value="today">Hôm nay</option>
                            <option value="yesterday">Hôm qua</option>
                            <option value="2_days_ago">2 ngày trước</option>
                            <option value="3_days_ago">3 ngày trước</option>
                            <option value="custom">Từ ngày - đến ngày</option>
                        </select>

                        {filterType === 'custom' && (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-5 duration-200">
                                <input
                                    type="date"
                                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                    value={customDateFrom}
                                    onChange={(e) => setCustomDateFrom(e.target.value)}
                                    title="Từ ngày"
                                />
                                <span className="text-slate-400">-</span>
                                <input
                                    type="date"
                                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                    value={customDateTo}
                                    onChange={(e) => setCustomDateTo(e.target.value)}
                                    title="Đến ngày"
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2 items-center ml-auto">
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${statusFilter === 'all'
                                ? 'bg-slate-800 text-white border-slate-800'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                        >
                            Tất cả
                        </button>
                        <button
                            onClick={() => setStatusFilter('borrowing')}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border flex items-center gap-2 ${statusFilter === 'borrowing'
                                ? 'bg-orange-600 text-white border-orange-600'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-orange-50'
                                }`}
                        >
                            <span className={`w-2 h-2 rounded-full ${statusFilter === 'borrowing' ? 'bg-white' : 'bg-orange-500'}`}></span>
                            Đang mượn ({borrowingCount})
                        </button>
                        <button
                            onClick={() => setStatusFilter('returned')}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border flex items-center gap-2 ${statusFilter === 'returned'
                                ? 'bg-green-600 text-white border-green-600'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-green-50'
                                }`}
                        >
                            <span className={`w-2 h-2 rounded-full ${statusFilter === 'returned' ? 'bg-white' : 'bg-green-500'}`}></span>
                            Đã trả ({returnedCount})
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-slate-500">Đang tải dữ liệu...</div>
                ) : (
                    <>
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-[#009900] text-white font-medium">
                                    <tr>
                                        {isAdmin && (
                                            <th className="px-4 py-3 w-10">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    onChange={handleSelectAll}
                                                    checked={filteredRecords.length > 0 && selectedIds.length === filteredRecords.length}
                                                />
                                            </th>
                                        )}
                                        <th className="px-4 py-3">Ngày mượn</th>
                                        <th className="px-4 py-3">Bệnh nhân</th>
                                        <th className="px-4 py-3">Người chăm</th>
                                        <th className="px-4 py-3">Số thẻ</th>
                                        <th className="px-4 py-3">BG Tiền mượn</th>
                                        <th className="px-4 py-3">Trạng thái thẻ</th>
                                        <th className="px-4 py-3">BG Tiền trả</th>
                                        <th className="px-4 py-3 w-40 text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredRecords.length === 0 ? (
                                        <tr>
                                            <td colSpan={isAdmin ? 9 : 8} className="px-6 py-12 text-center text-slate-500 italic">
                                                Chưa có dữ liệu nào phù hợp.
                                            </td>
                                        </tr>
                                    ) : filteredRecords.map((record) => (
                                        <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                                            {isAdmin && (
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        checked={selectedIds.includes(record.id)}
                                                        onChange={() => handleSelectRow(record.id)}
                                                    />
                                                </td>
                                            )}
                                            <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                                                {formatDate(record.ngay_muon)}
                                                <div className="text-xs text-slate-400 mt-0.5">Người cho mượn: {record.nguoi_cho_muon}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className={`font-medium ${record.trang_thai_tien_muon === 'Chưa bàn giao' ? 'text-red-600' : 'text-slate-800'}`}>{record.ho_ten_benh_nhan}</div>
                                                <div className="text-xs text-slate-500">NS: {record.nam_sinh}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-slate-700">{record.ho_ten_nguoi_cham}</div>
                                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                                    <Phone size={10} /> {record.sdt_nguoi_cham}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-bold text-blue-600">
                                                {record.so_the}
                                            </td>
                                            <td className="px-4 py-3 font-medium text-slate-700">
                                                <div>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(record.so_tien_cuoc)}</div>
                                                <div className="mt-1">{renderMoneyStatusBadge(record.trang_thai_tien_muon)}</div>
                                                {(record.trang_thai_tien_muon === 'Đã bàn giao' || record.nguoi_ban_giao_tien_muon) && (
                                                    <div className="text-[10px] text-slate-500 mt-1 border-t border-slate-100 pt-1">
                                                        <div>{record.nguoi_ban_giao_tien_muon}</div>
                                                        <div>{formatDate(record.ngay_ban_giao_tien_muon)}</div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${record.trang_thai === 'Đang mượn thẻ' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                                    'bg-green-50 text-green-700 border-green-100'
                                                    }`}>
                                                    {record.trang_thai}
                                                </span>
                                                {record.trang_thai === 'Đã trả thẻ' && (
                                                    <div className="text-[10px] text-slate-500 mt-1">
                                                        Trả: {formatDate(record.ngay_tra)}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {record.trang_thai === 'Đã trả thẻ' ? (
                                                    <>
                                                        <div className="mb-1">{renderMoneyStatusBadge(record.trang_thai_tien_tra)}</div>
                                                        {(record.trang_thai_tien_tra === 'Đã bàn giao' || record.nguoi_ban_giao_tien_tra) && (
                                                            <div className="text-[10px] text-slate-500 border-t border-slate-100 pt-1">
                                                                <div>{record.nguoi_ban_giao_tien_tra}</div>
                                                                <div>{formatDate(record.ngay_ban_giao_tien_tra)}</div>
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">---</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleView(record)}
                                                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                        title="Xem chi tiết"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(record)}
                                                        className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                                                        title="Sửa thông tin"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    {record.trang_thai === 'Đang mượn thẻ' && (
                                                        <button
                                                            onClick={() => handleOpenReturnModal(record)}
                                                            className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded text-xs font-medium transition-colors whitespace-nowrap"
                                                        >
                                                            Trả thẻ
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden space-y-4 p-4 bg-slate-50">
                            {filteredRecords.length === 0 ? (
                                <div className="text-center text-slate-500 italic py-8">
                                    Chưa có dữ liệu nào phù hợp.
                                </div>
                            ) : filteredRecords.map((record) => (
                                <div key={record.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 space-y-3 relative">
                                    {isAdmin && (
                                        <div className="absolute top-2 right-2">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-5 h-5"
                                                checked={selectedIds.includes(record.id)}
                                                onChange={() => handleSelectRow(record.id)}
                                            />
                                        </div>
                                    )}

                                    {/* Row 1: Name & Birth Year */}
                                    <div className="flex justify-between items-start pt-1">
                                        <h3 className={`font-bold text-base ${record.trang_thai_tien_muon === 'Chưa bàn giao' ? 'text-red-600' : 'text-slate-800'}`}>{record.ho_ten_benh_nhan}</h3>
                                        <span className="text-sm text-slate-500 font-medium whitespace-nowrap ml-2">
                                            NS: {record.nam_sinh || '---'}
                                        </span>
                                    </div>

                                    {/* Row 2: Money Status & Record Status */}
                                    <div className="flex justify-between items-center text-xs">
                                        <div className="flex items-center gap-1">
                                            {renderMoneyStatusBadge(record.trang_thai_tien_muon)}
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap ${record.trang_thai === 'Đang mượn thẻ' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                            'bg-green-50 text-green-700 border-green-100'
                                            }`}>
                                            {record.trang_thai}
                                        </span>
                                    </div>

                                    {/* Row 3: Card Num & Borrow Time */}
                                    <div className="flex items-center justify-between bg-slate-50 p-2 rounded text-sm">
                                        <div className="flex items-center gap-1 font-bold text-blue-600">
                                            <CreditCard size={14} />
                                            {record.so_the}
                                        </div>
                                        <div className="text-slate-500 text-xs">
                                            {formatDate(record.ngay_muon)}
                                        </div>
                                    </div>

                                    {/* Row 4: Actions */}
                                    <div className="pt-2 border-t border-slate-100 flex gap-2">
                                        <button
                                            onClick={() => handleView(record)}
                                            className="flex-1 py-1.5 text-slate-600 bg-slate-50 hover:bg-slate-100 rounded text-xs font-medium transition-colors border border-slate-200"
                                        >
                                            Xem
                                        </button>
                                        <button
                                            onClick={() => handleEdit(record)}
                                            className="flex-1 py-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded text-xs font-medium transition-colors border border-blue-100"
                                        >
                                            Sửa
                                        </button>
                                        {can_delete && (
                                            <button
                                                onClick={() => handleDeleteRecord(record.id)}
                                                className="flex-1 py-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded text-xs font-medium transition-colors border border-red-100"
                                            >
                                                Xóa
                                            </button>
                                        )}
                                        {record.trang_thai === 'Đang mượn thẻ' && (
                                            <button
                                                onClick={() => handleOpenReturnModal(record)}
                                                className="flex-1 py-1.5 bg-green-600 text-white hover:bg-green-700 rounded text-xs font-medium transition-colors shadow-sm"
                                            >
                                                Trả
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Borrow Modal */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
                                <h2 className="text-xl font-bold text-slate-800">
                                    {isViewMode ? 'Chi tiết mượn thẻ' : isEditMode ? 'Cập nhật thông tin mượn' : 'Đăng ký mượn thẻ'}
                                </h2>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-6">
                                {warning && !isViewMode && !isEditMode && (
                                    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3 text-yellow-800">
                                        <AlertCircle className="shrink-0 mt-0.5" size={18} />
                                        <p className="text-sm font-medium">{warning}</p>
                                    </div>
                                )}

                                {isViewMode ? (
                                    /* --- READ-ONLY VIEW MODE --- */
                                    <div className="space-y-6">
                                        {/* Patient Info Group */}
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                                <User size={16} className="text-blue-600" />
                                                Thông tin Bệnh nhân
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <div className="text-xs text-slate-500 uppercase font-semibold">Họ và tên</div>
                                                    <div className="text-base font-medium text-slate-800 mt-1">{formData.ho_ten_benh_nhan}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-slate-500 uppercase font-semibold">Năm sinh</div>
                                                    <div className="text-base text-slate-800 mt-1">{formData.nam_sinh || '---'}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Caregiver Info Group */}
                                        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                                            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                                <User size={16} className="text-orange-600" />
                                                Thông tin Người chăm
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <div className="text-xs text-slate-500 uppercase font-semibold">Ho tên người chăm</div>
                                                    <div className="text-base font-medium text-slate-800 mt-1">{formData.ho_ten_nguoi_cham}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-slate-500 uppercase font-semibold">Số điện thoại</div>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-base text-slate-800 font-medium">{formData.sdt_nguoi_cham || '---'}</span>
                                                        {formData.sdt_nguoi_cham && (
                                                            <a
                                                                href={`tel:${formData.sdt_nguoi_cham}`}
                                                                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm shadow-green-200"
                                                            >
                                                                <Phone size={14} /> Gọi ngay
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card & Money Info Group */}
                                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                                <CreditCard size={16} className="text-blue-600" />
                                                Thông tin Thẻ & Tiền cọc
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
                                                <div>
                                                    <div className="text-xs text-slate-500 uppercase font-semibold">Số thẻ</div>
                                                    <div className="text-lg font-bold text-blue-700 mt-0.5">{formData.so_the}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-slate-500 uppercase font-semibold">Ngày mượn</div>
                                                    <div className="text-base text-slate-800 mt-0.5">{formatDate(formData.ngay_muon)}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-slate-500 uppercase font-semibold">Tiền cược</div>
                                                    <div className="text-base font-bold text-slate-800 mt-0.5">
                                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(formData.so_tien_cuoc || 0)}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-slate-500 uppercase font-semibold">Trạng thái tiền</div>
                                                    <div className="mt-1">{renderMoneyStatusBadge(formData.trang_thai_tien_muon)}</div>
                                                    {formData.trang_thai_tien_muon === 'Đã bàn giao' && (
                                                        <div className="text-xs text-slate-500 mt-1">
                                                            {formData.nguoi_ban_giao_tien_muon} - {formatDate(formData.ngay_ban_giao_tien_muon)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="col-span-1 md:col-span-2">
                                                    <div className="text-xs text-slate-500 uppercase font-semibold">Ghi chú</div>
                                                    <div className="text-sm text-slate-700 mt-1 italic">{formData.ghi_chu || 'Không có ghi chú'}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Footer for View Mode */}
                                        <div className="flex justify-end pt-4 border-t border-slate-100">
                                            <button
                                                onClick={() => setIsModalOpen(false)}
                                                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
                                            >
                                                Đóng
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* --- HOST EDIT/CREATE FORM --- */
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">Ngày mượn <span className="text-red-500">*</span></label>
                                                <input
                                                    type="datetime-local"
                                                    required
                                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    value={formData.ngay_muon || ''}
                                                    onChange={e => setFormData({ ...formData, ngay_muon: e.target.value })}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">Số thẻ <span className="text-red-500">*</span></label>
                                                <select
                                                    required
                                                    disabled={isEditMode}
                                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                                                    value={formData.so_the || ''}
                                                    onChange={e => setFormData({ ...formData, so_the: e.target.value })}
                                                >
                                                    <option value="">-- Chọn thẻ --</option>
                                                    {cards
                                                        .filter(c =>
                                                            (c.trang_thai === 'Đã trả thẻ') ||
                                                            (formData.so_the === c.so_the)
                                                        )
                                                        .map(card => (
                                                            <option key={card.id} value={card.so_the}>
                                                                {card.so_the} - {card.trang_thai}
                                                            </option>
                                                        ))}
                                                </select>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">Họ tên bệnh nhân <span className="text-red-500">*</span></label>
                                                <input
                                                    type="text"
                                                    required
                                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    value={formData.ho_ten_benh_nhan || ''}
                                                    onChange={e => setFormData({ ...formData, ho_ten_benh_nhan: e.target.value })}
                                                    onBlur={(e) => !isEditMode && checkDuplicate(e.target.value)}
                                                    placeholder="Nhập họ tên..."
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">Năm sinh</label>
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    value={formData.nam_sinh || ''}
                                                    onChange={e => setFormData({ ...formData, nam_sinh: e.target.value })}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">Họ tên người chăm <span className="text-red-500">*</span></label>
                                                <input
                                                    type="text"
                                                    required
                                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    value={formData.ho_ten_nguoi_cham || ''}
                                                    onChange={e => setFormData({ ...formData, ho_ten_nguoi_cham: e.target.value })}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">SĐT người chăm</label>
                                                <input
                                                    type="tel"
                                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    value={formData.sdt_nguoi_cham || ''}
                                                    onChange={e => setFormData({ ...formData, sdt_nguoi_cham: e.target.value })}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">Tiền cược (VNĐ)</label>
                                                <input
                                                    type="number"
                                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    value={formData.so_tien_cuoc || 500000}
                                                    onChange={e => setFormData({ ...formData, so_tien_cuoc: Number(e.target.value) })}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-700">Người cho mượn</label>
                                                <input
                                                    type="text"
                                                    readOnly
                                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600"
                                                    value={formData.nguoi_cho_muon || ''}
                                                />
                                            </div>

                                            {/* Money Handover Fields */}
                                            {(isAdmin || (formData.trang_thai_tien_muon === 'Đã bàn giao')) && (
                                                <div className="col-span-1 md:col-span-2 border-t border-slate-100 pt-4 mt-2">
                                                    <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center justify-between">
                                                        <span className="flex items-center gap-2"><CreditCard size={16} /> Thông tin bàn giao tiền mượn thẻ</span>
                                                        {isEditMode && isAdmin && (
                                                            <div className="flex items-center gap-2">
                                                                <label className="text-xs font-medium text-slate-700">Trạng thái:</label>
                                                                <select
                                                                    className="text-xs border border-slate-200 rounded px-2 py-1"
                                                                    value={formData.trang_thai_tien_muon || 'Chưa bàn giao'}
                                                                    onChange={e => setFormData({ ...formData, trang_thai_tien_muon: e.target.value })}
                                                                >
                                                                    <option value="Chưa bàn giao">Chưa bàn giao</option>
                                                                    <option value="Đã bàn giao">Đã bàn giao</option>
                                                                </select>
                                                            </div>
                                                        )}
                                                    </h3>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium text-slate-700">Người nhận bàn giao tiền</label>
                                                            <input
                                                                type="text"
                                                                disabled={!isAdmin}
                                                                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                                                                value={formData.nguoi_ban_giao_tien_muon || ''}
                                                                onChange={e => setFormData({ ...formData, nguoi_ban_giao_tien_muon: e.target.value })}
                                                                placeholder="VD: Nguyễn Văn A"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-medium text-slate-700">Ngày giờ bàn giao tiền</label>
                                                            <input
                                                                type="datetime-local"
                                                                disabled={!can_edit}
                                                                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                                                                value={formData.ngay_ban_giao_tien_muon || ''}
                                                                onChange={e => setFormData({ ...formData, ngay_ban_giao_tien_muon: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="col-span-2 space-y-2">
                                                <label className="text-sm font-medium text-slate-700">Ghi chú</label>
                                                <textarea
                                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    value={formData.ghi_chu || ''}
                                                    onChange={e => setFormData({ ...formData, ghi_chu: e.target.value })}
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
                                                <Save size={18} /> {isEditMode ? 'Cập nhật' : 'Đăng ký'}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Return Modal */}
            {
                isReturnModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
                                <h2 className="text-xl font-bold text-slate-800">Xác nhận trả thẻ</h2>
                                <button onClick={() => setIsReturnModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleReturnSubmit} className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Ngày trả <span className="text-red-500">*</span></label>
                                    <input
                                        type="datetime-local"
                                        required
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={returnData.ngay_tra || ''}
                                        onChange={e => setReturnData({ ...returnData, ngay_tra: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Người nhận lại thẻ <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={returnData.nguoi_nhan_lai_the || ''}
                                        onChange={e => setReturnData({ ...returnData, nguoi_nhan_lai_the: e.target.value })}
                                    />
                                </div>

                                {can_edit && (
                                    <div className="space-y-4 pt-4 border-t border-slate-100">
                                        <h3 className="text-sm font-bold text-slate-800 flex items-center justify-between">
                                            <span className="flex items-center gap-2"><CreditCard size={16} /> Bàn giao tiền trả thẻ</span>
                                            <div className="flex items-center gap-2">
                                                <label className="text-xs font-medium text-slate-700">Trạng thái:</label>
                                                <select
                                                    className="text-xs border border-slate-200 rounded px-2 py-1"
                                                    // If can_edit, allow changing status
                                                    onChange={e => setReturnData({ ...returnData, trang_thai_tien_tra: e.target.value })}
                                                    defaultValue="Chưa bàn giao"
                                                >
                                                    <option value="Chưa bàn giao">Chưa bàn giao</option>
                                                    <option value="Đã bàn giao">Đã bàn giao</option>
                                                </select>
                                            </div>
                                        </h3>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">Người bàn giao tiền trả</label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                value={returnData.nguoi_ban_giao_tien_tra || ''}
                                                onChange={e => setReturnData({ ...returnData, nguoi_ban_giao_tien_tra: e.target.value })}
                                                placeholder="VD: Nguyễn Văn B"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-700">Ngày giờ bàn giao tiền</label>
                                            <input
                                                type="datetime-local"
                                                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                value={returnData.ngay_ban_giao_tien_tra || ''}
                                                onChange={e => setReturnData({ ...returnData, ngay_ban_giao_tien_tra: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsReturnModalOpen(false)}
                                        className="px-5 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 font-medium rounded-lg transition-colors"
                                    >
                                        Hủy bỏ
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg shadow-sm shadow-green-200 transition-colors flex items-center gap-2"
                                    >
                                        <Save size={18} /> Xác nhận trả
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
            {/* Batch Update Modal */}
            {
                isBatchModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
                                <h2 className="text-xl font-bold text-slate-800">Cập nhật bàn giao tiền hàng loạt</h2>
                                <button onClick={() => setIsBatchModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleBatchSubmit} className="p-6 space-y-4">
                                <div className="p-3 bg-blue-50 text-blue-800 rounded-lg text-sm">
                                    Đang chọn <strong>{selectedIds.length}</strong> bản ghi để cập nhật.
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Loại bàn giao <span className="text-red-500">*</span></label>
                                    <select
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={batchData.type}
                                        onChange={e => setBatchData({ ...batchData, type: e.target.value as 'borrow' | 'return' })}
                                    >
                                        <option value="borrow">Tiền MƯỢN thẻ (Đặt cọc)</option>
                                        <option value="return">Tiền TRẢ thẻ (Hoàn tiền)</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Trạng thái mới <span className="text-red-500">*</span></label>
                                    <select
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={batchData.trang_thai}
                                        onChange={e => setBatchData({ ...batchData, trang_thai: e.target.value })}
                                    >
                                        <option value="Đã bàn giao">Đã bàn giao</option>
                                        <option value="Chưa bàn giao">Chưa bàn giao</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Người thực hiện bàn giao <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={batchData.nguoi_ban_giao}
                                        onChange={e => setBatchData({ ...batchData, nguoi_ban_giao: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Thời gian bàn giao <span className="text-red-500">*</span></label>
                                    <input
                                        type="datetime-local"
                                        required
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={batchData.ngay_ban_giao}
                                        onChange={e => setBatchData({ ...batchData, ngay_ban_giao: e.target.value })}
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsBatchModalOpen(false)}
                                        className="px-5 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 font-medium rounded-lg transition-colors"
                                    >
                                        Hủy bỏ
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg shadow-sm shadow-orange-200 transition-colors flex items-center gap-2"
                                    >
                                        <Save size={18} /> Cập nhật
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
