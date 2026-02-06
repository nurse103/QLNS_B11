import React, { useState, useEffect } from 'react';
import { getFamilyRecords, createFamilyRecord, updateFamilyRecord, deleteFamilyRecord, FamilyRecord } from '../services/familyService';
import { getPersonnel, Employee } from '../services/personnelService';
import { Plus, Search, Edit, Trash2, X, Save, Users, Heart } from 'lucide-react';

export const FamilyModule = () => {
    const [familyRecords, setFamilyRecords] = useState<FamilyRecord[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<FamilyRecord>>({});

    // Fetch Data
    const fetchData = async () => {
        setLoading(true);
        try {
            const [families, personnel] = await Promise.all([
                getFamilyRecords(),
                getPersonnel()
            ]);
            setFamilyRecords(families || []);
            setEmployees(personnel || []);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Handlers
    const handleEdit = (item: FamilyRecord) => {
        setFormData({ ...item });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa bản ghi này?")) {
            try {
                await deleteFamilyRecord(id);
                fetchData();
            } catch (error) {
                alert("Xóa thất bại");
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Remove the expanded 'dsnv' object before sending to DB
            const { dsnv, ...payload } = formData as any;

            if (formData.id) {
                await updateFamilyRecord(formData.id, payload);
            } else {
                await createFamilyRecord(payload);
            }
            setIsModalOpen(false);
            setFormData({});
            fetchData();
        } catch (error) {
            console.error(error);
            alert("Lưu thất bại");
        }
    };

    const filteredRecords = familyRecords.filter(record =>
        (record.dsnv?.ho_va_ten || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (record.ho_va_ten || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Users className="text-pink-600" />
                        Quan hệ gia đình
                    </h1>
                    <p className="text-slate-500 text-sm">Quản lý thông tin thân nhân của cán bộ, nhân viên</p>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Tìm nhân viên hoặc người thân..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                        />
                    </div>
                    <button onClick={() => { setFormData({}); setIsModalOpen(true); }} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium whitespace-nowrap">
                        <Plus size={16} /> Thêm mới
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#fff1f2] text-pink-900 font-bold uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3 border-r border-pink-200">Nhân viên</th>
                                <th className="px-4 py-3 border-r border-pink-200 w-32">Mối quan hệ</th>
                                <th className="px-4 py-3 border-r border-pink-200">Họ và tên</th>
                                <th className="px-4 py-3 border-r border-pink-200 w-24">Năm sinh</th>
                                <th className="px-4 py-3 border-r border-pink-200">Nghề nghiệp</th>
                                <th className="px-4 py-3 border-r border-pink-200">SĐT</th>
                                <th className="px-4 py-3">Ghi chú</th>
                                <th className="px-4 py-3 w-20 text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-500">Đang tải dữ liệu...</td></tr>
                            ) : filteredRecords.length === 0 ? (
                                <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-500 italic">Không có dữ liệu.</td></tr>
                            ) : (
                                filteredRecords.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-slate-900 border-r border-slate-100">
                                            {item.dsnv?.ho_va_ten || 'N/A'}
                                            <div className="text-xs text-slate-500 font-normal">{item.dsnv?.chuc_vu}</div>
                                        </td>
                                        <td className="px-4 py-3 border-r border-slate-100 font-medium text-slate-700">{item.moi_quan_he}</td>
                                        <td className="px-4 py-3 border-r border-slate-100 font-semibold">{item.ho_va_ten}</td>
                                        <td className="px-4 py-3 border-r border-slate-100">{item.nam_sinh}</td>
                                        <td className="px-4 py-3 border-r border-slate-100">{item.nghe_nghiep}</td>
                                        <td className="px-4 py-3 border-r border-slate-100">{item.so_dien_thoai}</td>
                                        <td className="px-4 py-3 text-slate-500 italic max-w-xs truncate">{item.ghi_chu}</td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => handleEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                                                    <Edit size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(item.id!)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800">{formData.id ? 'Cập nhật thông tin gia đình' : 'Thêm người thân mới'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Nhân viên <span className="text-red-500">*</span></label>
                                <select
                                    required
                                    value={formData.dsnv_id || ''}
                                    onChange={e => setFormData({ ...formData, dsnv_id: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">-- Chọn nhân viên --</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.ho_va_ten} - {emp.chuc_vu}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Mối quan hệ <span className="text-red-500">*</span></label>
                                    <input required type="text" value={formData.moi_quan_he || ''} onChange={e => setFormData({ ...formData, moi_quan_he: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="VD: Vợ, Con, Bố..." />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Họ và tên người thân <span className="text-red-500">*</span></label>
                                    <input required type="text" value={formData.ho_va_ten || ''} onChange={e => setFormData({ ...formData, ho_va_ten: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Năm sinh</label>
                                    <input type="number" value={formData.nam_sinh || ''} onChange={e => setFormData({ ...formData, nam_sinh: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Số điện thoại</label>
                                    <input type="text" value={formData.so_dien_thoai || ''} onChange={e => setFormData({ ...formData, so_dien_thoai: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Nghề nghiệp</label>
                                    <input type="text" value={formData.nghe_nghiep || ''} onChange={e => setFormData({ ...formData, nghe_nghiep: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Ghi chú</label>
                                    <input type="text" value={formData.ghi_chu || ''} onChange={e => setFormData({ ...formData, ghi_chu: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium">Hủy</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
                                    <Save size={18} /> Lưu thông tin
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
