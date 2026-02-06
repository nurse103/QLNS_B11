
import React, { useState, useEffect } from 'react';
import { getAllTraining, Training } from '../services/personnelService';
import { Search, Download, GraduationCap } from 'lucide-react';
import * as XLSX from 'xlsx';

export const TrainingHistoryModule = () => {
    const [trainingList, setTrainingList] = useState<any[]>([]);
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
            const data = await getAllTraining();
            setTrainingList(data || []);
        } catch (error) {
            console.error("Failed to fetch training history:", error);
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
    const filteredList = trainingList.filter(item => {
        const searchLower = searchTerm.toLowerCase();
        const empName = item.dsnv?.ho_va_ten?.toLowerCase() || '';
        const school = item.ten_co_so_dao_tao?.toLowerCase() || '';
        const major = item.nganh_dao_tao?.toLowerCase() || '';

        return empName.includes(searchLower) || school.includes(searchLower) || major.includes(searchLower);
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
            'Cơ sở đào tạo': item.ten_co_so_dao_tao,
            'Ngành đào tạo': item.nganh_dao_tao,
            'Trình độ': item.trinh_do_dao_tao,
            'Hình thức': item.hinh_thuc_dao_tao,
            'Văn bằng/Chứng chỉ': item.van_bang_chung_chi,
            'Ghi chú': item.ghi_chu
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "QuaTrinhDaoTao");
        XLSX.writeFile(wb, "Qua_Trinh_Dao_Tao.xlsx");
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <GraduationCap className="text-blue-600" />
                Quá trình đào tạo toàn đơn vị
            </h1>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Header Controls */}
                <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative flex-1 max-w-md w-full">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo tên, trường, ngành..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                <th className="px-4 py-3">Cơ sở đào tạo</th>
                                <th className="px-4 py-3">Ngành đào tạo</th>
                                <th className="px-4 py-3">Trình độ</th>
                                <th className="px-4 py-3">Hình thức</th>
                                <th className="px-4 py-3">Văn bằng</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                                        Đang tải dữ liệu...
                                    </td>
                                </tr>
                            ) : currentItems.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500 italic">
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
                                            <div className="font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded w-fit text-xs">
                                                {formatDate(item.tu_thang_nam)} - {formatDate(item.den_thang_nam)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-700 font-medium max-w-xs">{item.ten_co_so_dao_tao}</td>
                                        <td className="px-4 py-3 text-slate-600">{item.nganh_dao_tao}</td>
                                        <td className="px-4 py-3 text-slate-600">{item.trinh_do_dao_tao}</td>
                                        <td className="px-4 py-3 text-slate-500">{item.hinh_thuc_dao_tao}</td>
                                        <td className="px-4 py-3 text-slate-500">{item.van_bang_chung_chi}</td>
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
