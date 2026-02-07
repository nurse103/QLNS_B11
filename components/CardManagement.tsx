import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../types';
import { getCards, createCard, updateCard, deleteCard } from '../services/cardService';
import { supabase } from '../services/supabaseClient';
import { Plus, Edit, Trash2, X, Save, CreditCard, Upload, Download, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

export const CardManagement = () => {
    const [cards, setCards] = useState<Card[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCard, setEditingCard] = useState<Card | null>(null);
    const [formData, setFormData] = useState<Partial<Card>>({});
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
    const [batchStatus, setBatchStatus] = useState<string>('Đã trả thẻ');

    // Excel Import State
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isImporting, setIsImporting] = useState(false);

    useEffect(() => {
        fetchData();

        const subscription = supabase
            .channel('card_management_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'dm_the_cham' }, (payload) => {
                fetchData();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getCards();
            setCards(data);
        } catch (error: any) {
            console.error("Failed to fetch cards:", error);
            if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
                alert("Lỗi: Bảng dữ liệu chưa được tạo. Vui lòng chạy file SQL 'create_card_management.sql' trong Supabase.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(cards.map(c => c.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectRow = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleBatchUpdate = async () => {
        if (selectedIds.length === 0) return;
        if (!window.confirm(`Bạn có chắc chắn muốn cập nhật trạng thái cho ${selectedIds.length} thẻ đã chọn?`)) return;

        setLoading(true);
        try {
            await Promise.all(selectedIds.map(id => updateCard(id, { trang_thai: batchStatus })));
            alert("Cập nhật hàng loạt thành công!");
            setIsBatchModalOpen(false);
            setSelectedIds([]);
            fetchData();
        } catch (error) {
            console.error("Batch update error:", error);
            alert("Có lỗi xảy ra khi cập nhật hàng loạt.");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (card?: Card) => {
        if (card) {
            setEditingCard(card);
            setFormData(card);
        } else {
            setEditingCard(null);
            setFormData({
                so_the: '',
                trang_thai: 'Đã trả thẻ',
                ghi_chu: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCard?.id) {
                await updateCard(editingCard.id, formData);
                alert("Cập nhật thành công!");
            } else {
                await createCard(formData as any);
                alert("Thêm mới thành công!");
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error("Submit error:", error);
            alert("Có lỗi xảy ra, vui lòng thử lại.");
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa thẻ này?")) {
            try {
                await deleteCard(id);
                fetchData();
            } catch (error) {
                alert("Xóa thất bại.");
            }
        }
    };

    // --- Excel Logic ---

    const handleDownloadTemplate = () => {
        const headers = ["Số thẻ", "Trạng thái", "Ghi chú"];
        const sampleData = [
            ["THE-001", "Đã trả thẻ", "Thẻ mới"],
            ["THE-002", "Mất thẻ", "Đang cấp lại"]
        ];

        const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Danh_Sach_The");
        XLSX.writeFile(wb, "Mau_Nhap_The_Cham.xlsx");
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const reader = new FileReader();

        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

                // Skip header row
                const rows = data.slice(1);
                let successCount = 0;
                let failCount = 0;

                for (const row of rows) {
                    if (!row[0]) continue; // Skip empty rows

                    const cardData = {
                        so_the: row[0]?.toString(),
                        trang_thai: row[1]?.toString() || 'Đã trả thẻ',
                        ghi_chu: row[2]?.toString() || ''
                    };

                    try {
                        // Check if card exists to decide insert or maybe skip?
                        // Simple approach: Try insert, if fails (duplicate unique key), it catches error
                        await createCard(cardData);
                        successCount++;
                    } catch (err) {
                        console.error(`Error importing card ${cardData.so_the}:`, err);
                        failCount++;
                    }
                }

                alert(`Nhập dữ liệu hoàn tất!\nThành công: ${successCount}\nThất bại (hoặc trùng lặp): ${failCount}`);
                fetchData();
            } catch (error) {
                console.error("Excel processing error:", error);
                alert("Lỗi khi đọc file Excel.");
            } finally {
                setIsImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };

        reader.readAsBinaryString(file);
    };

    const triggerFileUpload = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <CreditCard className="text-blue-600" /> Danh mục thẻ chăm
                </h2>
                <div className="flex flex-wrap gap-2">
                    {selectedIds.length > 0 && (
                        <button
                            onClick={() => setIsBatchModalOpen(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm text-sm animate-in fade-in zoom-in-95"
                        >
                            <Edit size={16} /> Cập nhật ({selectedIds.length})
                        </button>
                    )}
                    <button
                        onClick={handleDownloadTemplate}
                        className="bg-white border border-green-600 text-green-600 hover:bg-green-50 px-3 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors text-sm"
                        title="Tải file mẫu Excel"
                    >
                        <Download size={16} /> File mẫu
                    </button>
                    {/* ... (Import and Add buttons) */}
                    <button
                        onClick={triggerFileUpload}
                        disabled={isImporting}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm text-sm"
                    >
                        {isImporting ? (
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                            <FileSpreadsheet size={16} />
                        )}
                        Nhập Excel
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".xlsx, .xls"
                        className="hidden"
                    />
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm text-sm"
                    >
                        <Plus size={18} /> Thêm thẻ
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                {loading && !isBatchModalOpen ? (
                    <div className="p-12 text-center text-slate-500">Đang tải dữ liệu...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-[#009900] text-white font-medium">
                                <tr>
                                    <th className="px-6 py-4 w-10">
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            onChange={handleSelectAll}
                                            checked={cards.length > 0 && selectedIds.length === cards.length}
                                        />
                                    </th>
                                    <th className="px-6 py-4">Số thẻ</th>
                                    <th className="px-6 py-4">Trạng thái</th>
                                    <th className="px-6 py-4">Ghi chú</th>
                                    <th className="px-6 py-4 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {cards.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                                            Chưa có thẻ nào được cấu hình.
                                        </td>
                                    </tr>
                                ) : cards.map((card) => (
                                    <tr key={card.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                checked={selectedIds.includes(card.id)}
                                                onChange={() => handleSelectRow(card.id)}
                                            />
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-800">
                                            {card.so_the}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${card.trang_thai === 'Đang mượn thẻ chăm' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                                card.trang_thai === 'Mất thẻ' ? 'bg-red-50 text-red-700 border-red-100' :
                                                    'bg-green-50 text-green-700 border-green-100'
                                                }`}>
                                                {card.trang_thai}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {card.ghi_chu || '---'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleOpenModal(card)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                    <Edit size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(card.id)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="text-xl font-bold text-slate-800">
                                {editingCard ? 'Cập nhật thẻ' : 'Thêm thẻ mới'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Số thẻ <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.so_the || ''}
                                    onChange={e => setFormData({ ...formData, so_the: e.target.value })}
                                    placeholder="VD: THE-001"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Trạng thái</label>
                                <select
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.trang_thai || 'Đã trả thẻ'}
                                    onChange={e => setFormData({ ...formData, trang_thai: e.target.value })}
                                >
                                    <option value="Đã trả thẻ">Đã trả thẻ</option>
                                    <option value="Đang mượn thẻ chăm">Đang mượn thẻ chăm</option>
                                    <option value="Mất thẻ">Mất thẻ</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Ghi chú</label>
                                <textarea
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                                    value={formData.ghi_chu || ''}
                                    onChange={e => setFormData({ ...formData, ghi_chu: e.target.value })}
                                    placeholder="Ghi chú thêm..."
                                ></textarea>
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
                                    <Save size={18} /> Lưu thông tin
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Batch Update Modal */}
            {isBatchModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="text-xl font-bold text-slate-800">Cập nhật hàng loạt</h2>
                            <button onClick={() => setIsBatchModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <p className="text-slate-600 text-sm">
                                Bạn đang chọn <span className="font-bold text-blue-600">{selectedIds.length}</span> thẻ.
                                Vui lòng chọn trạng thái mới để cập nhật:
                            </p>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Trạng thái mới</label>
                                <select
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={batchStatus}
                                    onChange={e => setBatchStatus(e.target.value)}
                                >
                                    <option value="Đã trả thẻ">Đã trả thẻ</option>
                                    <option value="Đang mượn thẻ chăm">Đang mượn thẻ chăm</option>
                                    <option value="Mất thẻ">Mất thẻ</option>
                                    <option value="Hỏng">Hỏng</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    onClick={() => setIsBatchModalOpen(false)}
                                    className="px-5 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 font-medium rounded-lg transition-colors"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    onClick={handleBatchUpdate}
                                    disabled={loading}
                                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm shadow-blue-200 transition-colors flex items-center gap-2"
                                >
                                    {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : <Save size={18} />}
                                    Cập nhật
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
