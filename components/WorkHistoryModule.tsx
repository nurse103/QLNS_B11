
import React, { useState, useEffect } from 'react';
import { getAllWorkHistory, WorkHistory } from '../services/personnelService';
import { Search, Filter, FileText, Download, Briefcase } from 'lucide-react';
import * as XLSX from 'xlsx';

export const WorkHistoryModule = () => {
    const [historyList, setHistoryList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getAllWorkHistory();
            setHistoryList(data || []);
        } catch (error) {
            console.error("Failed to fetch work history:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return '---';
        const [year, month, day] = dateStr.split('-');
        if (!year || !month || !day) return dateStr;
        return `${day}/${month}/${year}`;
    };

    // Filter Logic
    const filteredList = historyList.filter(item => {
        const searchLower = searchTerm.toLowerCase();
        const empName = item.dsnv?.ho_va_ten?.toLowerCase() || '';
        const unit = item.don_vi_cong_tac?.toLowerCase() || '';

        return empName.includes(searchLower) || unit.includes(searchLower);
    });

    // Pagination
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredList.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredList.length / itemsPerPage);

    const handleExportExcel = () => {
        const exportData = filteredList.map((item, index) => ({
            'STT': index + 1,
            'Họ và tên': item.dsnv?.ho_va_ten || '',
            'Số hiệu quân nhân/CMQĐ': item.dsnv?.cmqd || '',
            'Từ thời gian': formatDate(item.tu_thang_nam),
            'Đến thời gian': formatDate(item.den_thang_nam),
            'Đơn vị công tác': item.don_vi_cong_tac,
            'Cấp bậc': item.cap_bac,
            'Chức vụ': item.chuc_vu,
            'Ghi chú': item.ghi_chu
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "QuaTrinhCongTac");
        XLSX.writeFile(wb, "Qua_Trinh_Cong_Tac.xlsx");
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Briefcase className="text-orange-600" />
                Quá trình công tác toàn đơn vị
            </h1>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Header Controls */}
                <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative flex-1 max-w-md w-full">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo tên nhân viên, đơn vị..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>

                    <button
                        onClick={handleExportExcel}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2 transition-colors w-full md:w-auto justify-center"
                    >
                        <Download size={18} /> Xuất Excel
                    </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 font-medium text-slate-600 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 w-12 text-center">#</th>
                                <th className="px-4 py-3">Nhân viên</th>
                                <th className="px-4 py-3">Thời gian</th>
                                <th className="px-4 py-3">Đơn vị công tác</th>
                                <th className="px-4 py-3">Cấp bậc</th>
                                <th className="px-4 py-3">Chức vụ</th>
                                <th className="px-4 py-3">Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                                        Đang tải dữ liệu...
                                    </td>
                                </tr>
                            ) : currentItems.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500 italic">
                                        Không tìm thấy dữ liệu phù hợp.
                                    </td>
                                </tr>
                            ) : (
                                currentItems.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 text-center text-slate-400">
                                            {indexOfFirstItem + index + 1}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-slate-800">
                                            <div>{item.dsnv?.ho_va_ten || '---'}</div>
                                            <div className="text-xs text-slate-400">{item.dsnv?.cmqd}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded w-fit text-xs">
                                                {formatDate(item.tu_thang_nam)} - {formatDate(item.den_thang_nam)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-700 font-medium">{item.don_vi_cong_tac}</td>
                                        <td className="px-4 py-3 text-slate-600">{item.cap_bac}</td>
                                        <td className="px-4 py-3 text-slate-600">{item.chuc_vu}</td>
                                        <td className="px-4 py-3 text-slate-500 max-w-xs truncate" title={item.ghi_chu}>
                                            {item.ghi_chu}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-sm text-slate-500">
                        Hiển thị <strong>{indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredList.length)}</strong> trên tổng số <strong>{filteredList.length}</strong> bản ghi
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                            Trước
                        </button>
                        <span className="px-3 py-1 bg-slate-100 rounded text-slate-600 font-medium">
                            {currentPage} / {totalPages || 1}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="px-3 py-1 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                            Sau
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
