import React, { useState, useEffect } from 'react';
import { Card, CardRecord } from '../types';
import { getCards, getCardRecords, createCardRecord, updateCardRecord, checkPatientBorrowing } from '../services/cardService';
import { getAuthUser } from '../services/authService';
import { supabase } from '../services/supabaseClient';
import { Plus, Search, Edit, Trash2, X, Save, Calendar, User, Phone, CreditCard, AlertCircle, Eye } from 'lucide-react';

export const PatientCardModule = () => {
    const [records, setRecords] = useState<CardRecord[]>([]);
    const [cards, setCards] = useState<Card[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

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
    const filteredRecords = records.filter(r =>
        r.ho_ten_benh_nhan.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.so_the.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.ho_ten_nguoi_cham.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                    <button
                        onClick={handleOpenModal}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
                    >
                        <Plus size={18} /> Đăng ký mượn mới
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 bg-slate-50/50">
                    <div className="relative flex-1 max-w-full md:max-w-sm">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo tên, số thẻ..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 overflow-x-auto whitespace-nowrap">
                        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Đang mượn</div>
                        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Đã trả</div>
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
                                                <div className="font-medium text-slate-800">{record.ho_ten_benh_nhan}</div>
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
                                        <div className="absolute top-4 left-4">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-5 h-5"
                                                checked={selectedIds.includes(record.id)}
                                                onChange={() => handleSelectRow(record.id)}
                                            />
                                        </div>
                                    )}

                                    <div className={`${isAdmin ? 'pl-8' : ''}`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-slate-800 text-lg">{record.ho_ten_benh_nhan}</h3>
                                                <p className="text-sm text-slate-500">NS: {record.nam_sinh || '---'}</p>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${record.trang_thai === 'Đang mượn thẻ' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                                'bg-green-50 text-green-700 border-green-100'
                                                }`}>
                                                {record.trang_thai}
                                            </span>
                                        </div>

                                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                            <div className="col-span-2 flex items-center gap-2 text-slate-700 bg-slate-50 p-2 rounded">
                                                <CreditCard size={14} className="text-blue-500" />
                                                <span className="font-semibold">{record.so_the}</span>
                                                <span className="text-slate-400">|</span>
                                                <span>{formatDate(record.ngay_muon)}</span>
                                            </div>

                                            <div className="col-span-2 flex items-center gap-2 text-slate-700">
                                                <User size={14} className="text-slate-400" />
                                                <span className="font-medium">{record.ho_ten_nguoi_cham}</span>
                                                <span className="text-slate-500 text-xs">({record.sdt_nguoi_cham})</span>
                                            </div>

                                            <div className="flex flex-col gap-1 border-r border-slate-100 pr-2">
                                                <span className="text-xs text-slate-500">Tiền mượn (Cọc)</span>
                                                <div className="font-medium text-slate-700">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(record.so_tien_cuoc)}</div>
                                                <div>{renderMoneyStatusBadge(record.trang_thai_tien_muon)}</div>
                                            </div>

                                            <div className="flex flex-col gap-1 pl-2">
                                                <span className="text-xs text-slate-500">Tiền trả (Hoàn)</span>
                                                {record.trang_thai === 'Đã trả thẻ' ? (
                                                    <div>{renderMoneyStatusBadge(record.trang_thai_tien_tra)}</div>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">---</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end gap-3">
                                            <button
                                                onClick={() => handleView(record)}
                                                className="flex-1 py-2 text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
                                            >
                                                Xem
                                            </button>
                                            <button
                                                onClick={() => handleEdit(record)}
                                                className="flex-1 py-2 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg text-sm font-medium transition-colors"
                                            >
                                                Sửa
                                            </button>
                                            {record.trang_thai === 'Đang mượn thẻ' && (
                                                <button
                                                    onClick={() => handleOpenReturnModal(record)}
                                                    className="flex-1 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg text-sm font-medium transition-colors shadow-sm shadow-green-200"
                                                >
                                                    Trả thẻ
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Borrow Modal */}
            {isModalOpen && (
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
                                                            disabled={!isAdmin}
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
            )}

            {/* Return Modal */}
            {isReturnModalOpen && (
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

                            {isAdmin && (
                                <div className="space-y-4 pt-4 border-t border-slate-100">
                                    <h3 className="text-sm font-bold text-slate-800 flex items-center justify-between">
                                        <span className="flex items-center gap-2"><CreditCard size={16} /> Bàn giao tiền trả thẻ</span>
                                        <div className="flex items-center gap-2">
                                            <label className="text-xs font-medium text-slate-700">Trạng thái:</label>
                                            <select
                                                className="text-xs border border-slate-200 rounded px-2 py-1"
                                                // If admin is editing return info, allow changing status
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
            )}
            {/* Batch Update Modal */}
            {isBatchModalOpen && (
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
            )}
        </div>
    );
};
