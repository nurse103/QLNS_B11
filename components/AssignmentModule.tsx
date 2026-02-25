import React, { useState, useEffect } from 'react';
import {
    getAssignments,
    createAssignment,
    updateAssignment,
    deleteAssignment
} from '../services/assignmentService';
import { getPersonnel, Employee } from '../services/personnelService';
import { getDutySchedules, DutySchedule } from '../services/dutyScheduleService';
import {
    CalendarDays,
    Plus,
    Search,
    Edit,
    Trash2,
    Save,
    X,
    ChevronLeft,
    ChevronRight,
    Users
} from 'lucide-react';
import { Assignment } from '../types';
import { usePermissions } from '../hooks/usePermissions';
import { Check } from 'lucide-react';

const MultiSelect = ({
    label,
    value,
    options,
    onChange,
    placeholder = "Chọn nhân viên..."
}: {
    label: string,
    value: string,
    options: string[],
    onChange: (val: string) => void,
    placeholder?: string
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const selected = value ? value.split(', ').filter(Boolean) : [];

    const toggleOption = (opt: string) => {
        let newSelected;
        if (selected.includes(opt)) {
            newSelected = selected.filter(s => s !== opt);
        } else {
            newSelected = [...selected, opt];
        }
        onChange(newSelected.join(', '));
    };

    return (
        <div className="relative">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</label>
            <div
                className="min-h-[38px] w-full border rounded-lg px-3 py-1.5 text-sm bg-white cursor-pointer flex flex-wrap gap-1 items-center focus-within:ring-2 focus-within:ring-[#009900]"
                onClick={() => setIsOpen(!isOpen)}
            >
                {selected.length > 0 ? (
                    selected.map(s => (
                        <span key={s} className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md text-xs font-bold border border-emerald-100 flex items-center gap-1">
                            {s}
                            <X size={12} className="hover:text-emerald-900" onClick={(e) => { e.stopPropagation(); toggleOption(s); }} />
                        </span>
                    ))
                ) : (
                    <span className="text-slate-400">{placeholder}</span>
                )}
            </div>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full left-0 w-full mt-1 bg-white border rounded-lg shadow-xl z-[70] max-h-60 overflow-y-auto py-1">
                        {options.length > 0 ? (
                            options.map(opt => (
                                <div
                                    key={opt}
                                    className="px-3 py-2 hover:bg-slate-50 cursor-pointer flex items-center justify-between text-sm"
                                    onClick={() => toggleOption(opt)}
                                >
                                    <span className={selected.includes(opt) ? "font-bold text-[#009900]" : "text-slate-700"}>{opt}</span>
                                    {selected.includes(opt) && <Check size={16} className="text-[#009900]" />}
                                </div>
                            ))
                        ) : (
                            <div className="px-3 py-2 text-slate-400 text-xs text-center italic">Không còn nhân viên nào khả dụng</div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export const AssignmentModule = () => {
    const { can_add, can_edit, can_delete } = usePermissions('assignments');
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<Partial<Assignment>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [allPersonnel, setAllPersonnel] = useState<Employee[]>([]);
    const [prevDayDuty, setPrevDayDuty] = useState<DutySchedule | null>(null);

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data, totalCount } = await getAssignments(page, pageSize);
            setAssignments(data);
            setTotalCount(totalCount);

            // Fetch personnel
            const personnel = await getPersonnel();
            setAllPersonnel(personnel.filter(p => p.doi_tuong === 'QNCN' || p.doi_tuong === 'LĐHĐ'));
        } catch (error) {
            console.error("Failed to fetch assignments", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [page]);

    // Fetch previous day duty whenever date changes
    useEffect(() => {
        if (formData.ngay_thang) {
            fetchPrevDayDuty(formData.ngay_thang);
        }
    }, [formData.ngay_thang]);

    const fetchPrevDayDuty = async (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            date.setDate(date.getDate() - 1);
            const prevDateStr = date.toISOString().split('T')[0];
            const [year, month, day] = prevDateStr.split('-');
            const schedules = await getDutySchedules(parseInt(month), parseInt(year));
            const found = schedules.find(s => s.ngay_truc === prevDateStr);
            setPrevDayDuty(found || null);
        } catch (error) {
            console.error("Error fetching prev duty", error);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (formData.id) {
                await updateAssignment(formData.id, formData);
                alert("Cập nhật phân công thành công!");
            } else {
                await createAssignment(formData);
                alert("Thêm phân công mới thành công!");
            }
            setIsModalOpen(false);
            setFormData({});
            fetchData();
        } catch (error: any) {
            console.error("Submit failed", error);
            const msg = error.message || "";
            if (msg.includes("unique constraint") || msg.includes("already exists")) {
                alert("Lỗi: Ngày này đã có bản phân công rồi. Vui lòng chọn ngày khác hoặc sửa bản ghi cũ.");
            } else {
                alert("Có lỗi xảy ra khi lưu: " + (error.message || "Lỗi không xác định"));
            }
        }
    };

    const handleEdit = (assignment: Assignment) => {
        setFormData(assignment);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Xóa bản phân công này?")) {
            try {
                await deleteAssignment(id);
                fetchData();
            } catch (error) {
                console.error("Delete failed", error);
                alert("Xóa thất bại!");
            }
        }
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    const filteredAssignments = assignments.filter(a =>
        a.ngay_thang.includes(searchTerm) ||
        [a.buong_1, a.buong_2, a.buong_3, a.buong_4, a.chay_ngoai, a.chup_phim, a.lam_so]
            .some(val => val?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getFullExclusionFromPrevDay = () => {
        if (!prevDayDuty) return [];
        return [
            prevDayDuty.bac_sy,
            prevDayDuty.noi_tru,
            prevDayDuty.sau_dai_hoc,
            prevDayDuty.dieu_duong,
            prevDayDuty.phu_dieu_duong
        ].flatMap(s => s ? s.split(', ') : []);
    };

    const getAvailableStaff = (currentField: keyof Assignment, previousSelections: string[]) => {
        let staff = allPersonnel.map(p => p.ho_va_ten);

        // Rule: For rooms and others, exclude full duty team from prev day
        const fullExcluded = getFullExclusionFromPrevDay();
        staff = staff.filter(name => !fullExcluded.includes(name));

        // Rule: Exclude already selected staff in sequential logic
        // Buồng 1 -> Buồng 2 -> Buồng 3 -> Buồng 4 -> Chạy ngoài -> Chụp phim
        // (Lưu ý: Chụp phim không bị loại trừ bởi những cái trước theo yêu cầu? 
        // "khi chọn đến buồng 2 thì sẽ hiển thị những QNCN, LĐHĐ đã đuộc chọn ở buồng 1 ẩn đi, tương tự buồng 3, buồng 4, chạy ngoài."
        // Chụp phim không được nhắc đến trong chuỗi ẩn đi sequential, nhưng thường là có. Let's follow strictly first.)

        return staff.filter(name => !previousSelections.includes(name));
    };

    const getSelections = (fields: (keyof Assignment)[]) => {
        return fields.flatMap(f => formData[f] ? (formData[f] as string).split(', ') : []);
    };

    return (
        <div className="p-4 md:p-6 min-h-screen bg-slate-50/50">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Phân công hàng ngày</h1>
                <p className="text-slate-500">Quản lý lịch phân công nhân sự tại các buồng và vị trí</p>
            </div>

            {/* Filters & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Tìm theo ngày, tên nhân viên..."
                        className="pl-10 pr-4 py-2 w-full border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#009900] outline-none"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                {can_add && (
                    <button
                        onClick={() => {
                            const today = new Date();
                            const localDate = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
                            setFormData({ ngay_thang: localDate });
                            setIsModalOpen(true);
                        }}
                        className="px-4 py-2 bg-[#009900] text-white rounded-lg flex items-center gap-2 hover:bg-[#007700] transition-colors shadow-sm font-bold"
                    >
                        <Plus size={18} /> Thêm phân công
                    </button>
                )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-[#009900] border-b border-[#007700] text-white font-black uppercase tracking-widest text-[11px]">
                            <tr>
                                <th className="px-6 py-4 w-32 whitespace-nowrap">Ngày</th>
                                <th className="px-6 py-4 whitespace-nowrap">Buồng 1</th>
                                <th className="px-6 py-4 whitespace-nowrap">Buồng 2</th>
                                <th className="px-6 py-4 whitespace-nowrap">Buồng 3</th>
                                <th className="px-6 py-4 whitespace-nowrap">Buồng 4</th>
                                <th className="px-6 py-4 whitespace-nowrap">Chạy ngoài</th>
                                <th className="px-6 py-4 whitespace-nowrap">Chụp phim</th>
                                <th className="px-6 py-4 whitespace-nowrap">Làm số</th>
                                <th className="px-6 py-4 w-24 text-center whitespace-nowrap">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan={9} className="px-6 py-12 text-center text-slate-400 font-medium">Đang tải dữ liệu...</td></tr>
                            ) : filteredAssignments.length > 0 ? (
                                filteredAssignments.map((a) => (
                                    <tr key={a.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap font-black text-slate-900">
                                            {new Date(a.ngay_thang).toLocaleDateString('vi-VN')}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-700">{a.buong_1 || '-'}</td>
                                        <td className="px-6 py-4 font-bold text-slate-700">{a.buong_2 || '-'}</td>
                                        <td className="px-6 py-4 font-bold text-slate-700">{a.buong_3 || '-'}</td>
                                        <td className="px-6 py-4 font-bold text-slate-700">{a.buong_4 || '-'}</td>
                                        <td className="px-6 py-4 font-bold text-slate-700">{a.chay_ngoai || '-'}</td>
                                        <td className="px-6 py-4 font-bold text-slate-700">{a.chup_phim || '-'}</td>
                                        <td className="px-6 py-4 font-bold text-slate-700">{a.lam_so || '-'}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                {can_edit && (
                                                    <button onClick={() => handleEdit(a)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-all active:scale-90" title="Chỉnh sửa">
                                                        <Edit size={16} />
                                                    </button>
                                                )}
                                                {can_delete && (
                                                    <button onClick={() => handleDelete(a.id)} className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-all active:scale-90" title="Xóa">
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={9} className="px-6 py-16 text-center text-slate-400 font-medium">Không tìm thấy bản ghi nào</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        Tổng số: <span className="text-slate-700">{totalCount}</span> bản ghi
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                            className="p-2 border border-slate-200 bg-white rounded-lg text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:border-slate-300 transition-colors shadow-sm"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-xs font-bold px-3">Trang {page} / {totalPages || 1}</span>
                        <button
                            disabled={page === totalPages || totalPages === 0}
                            onClick={() => setPage(page + 1)}
                            className="p-2 border border-slate-200 bg-white rounded-lg text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:border-slate-300 transition-colors shadow-sm"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#009900] rounded-full animate-spin"></div>
                        <p className="font-medium">Đang tải dữ liệu...</p>
                    </div>
                ) : filteredAssignments.length > 0 ? (
                    filteredAssignments.map((a) => (
                        <div key={a.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                            {/* Card Header */}
                            <div className="bg-slate-50 px-4 py-3 flex justify-between items-center border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-[#009900]/10 flex items-center justify-center text-[#009900]">
                                        <CalendarDays size={16} />
                                    </div>
                                    <span className="text-sm font-black text-slate-900">
                                        {new Date(a.ngay_thang).toLocaleDateString('vi-VN')}
                                    </span>
                                </div>
                                <div className="flex gap-1">
                                    {can_edit && (
                                        <button onClick={() => handleEdit(a)} className="p-2 text-slate-400 hover:text-blue-600 active:scale-90 transition-all">
                                            <Edit size={16} />
                                        </button>
                                    )}
                                    {can_delete && (
                                        <button onClick={() => handleDelete(a.id)} className="p-2 text-slate-400 hover:text-rose-600 active:scale-90 transition-all">
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Card Body - Grid Layout */}
                            <div className="p-4 grid grid-cols-1 gap-y-3">
                                {[
                                    { label: 'Buồng 1', value: a.buong_1 },
                                    { label: 'Buồng 2', value: a.buong_2 },
                                    { label: 'Buồng 3', value: a.buong_3 },
                                    { label: 'Buồng 4', value: a.buong_4 },
                                    { label: 'Chạy ngoài', value: a.chay_ngoai },
                                    { label: 'Chụp phim', value: a.chup_phim },
                                    { label: 'Làm số', value: a.lam_so },
                                ].map((item, idx) => (
                                    <div key={idx} className="flex flex-col gap-1 border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#001df5]">{item.label}</span>
                                        <div className="flex flex-wrap gap-x-2 gap-y-1">
                                            {item.value ? (
                                                item.value.split(', ').map((name, nIdx) => (
                                                    <span key={nIdx} className="text-slate-900 text-sm font-bold italic">
                                                        {name}{nIdx < item.value!.split(', ').length - 1 ? ',' : ''}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-slate-300 text-xs italic">Chưa phân công</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center flex flex-col items-center gap-3">
                        <Users size={32} className="text-slate-200" />
                        <p className="text-slate-400 font-medium whitespace-nowrap">Không tìm thấy bản ghi nào</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-xl animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b flex justify-between items-center">
                            <h2 className="text-lg font-bold">{formData.id ? 'Sửa phân công' : 'Thêm phân công'}</h2>
                            <button onClick={() => setIsModalOpen(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Ngày phân công</label>
                                <input type="date" name="ngay_thang" value={formData.ngay_thang || ''} onChange={handleInputChange} required className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#009900]" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <MultiSelect
                                    label="Buồng 1"
                                    value={formData.buong_1 || ''}
                                    options={getAvailableStaff('buong_1', [])}
                                    onChange={(val) => setFormData(prev => ({ ...prev, buong_1: val }))}
                                />
                                <MultiSelect
                                    label="Buồng 2"
                                    value={formData.buong_2 || ''}
                                    options={getAvailableStaff('buong_2', getSelections(['buong_1']))}
                                    onChange={(val) => setFormData(prev => ({ ...prev, buong_2: val }))}
                                />
                                <MultiSelect
                                    label="Buồng 3"
                                    value={formData.buong_3 || ''}
                                    options={getAvailableStaff('buong_3', getSelections(['buong_1', 'buong_2']))}
                                    onChange={(val) => setFormData(prev => ({ ...prev, buong_3: val }))}
                                />
                                <MultiSelect
                                    label="Buồng 4"
                                    value={formData.buong_4 || ''}
                                    options={getAvailableStaff('buong_4', getSelections(['buong_1', 'buong_2', 'buong_3']))}
                                    onChange={(val) => setFormData(prev => ({ ...prev, buong_4: val }))}
                                />
                                <MultiSelect
                                    label="Chạy ngoài"
                                    value={formData.chay_ngoai || ''}
                                    options={getAvailableStaff('chay_ngoai', getSelections(['buong_1', 'buong_2', 'buong_3', 'buong_4']))}
                                    onChange={(val) => setFormData(prev => ({ ...prev, chay_ngoai: val }))}
                                />
                                <MultiSelect
                                    label="Chụp phim"
                                    value={formData.chup_phim || ''}
                                    options={getAvailableStaff('chup_phim', [])} // Chụp phim doesn't seem to be excluded by others in logic description
                                    onChange={(val) => setFormData(prev => ({ ...prev, chup_phim: val }))}
                                />
                                <div className="col-span-2">
                                    <MultiSelect
                                        label="Làm số"
                                        value={formData.lam_so || ''}
                                        options={getAvailableStaff('lam_so', getSelections(['chup_phim', 'chay_ngoai']))}
                                        onChange={(val) => setFormData(prev => ({ ...prev, lam_so: val }))}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 text-sm hover:bg-slate-100 rounded-lg">Hủy</button>
                                <button type="submit" className="px-6 py-2 bg-[#009900] text-white text-sm font-bold rounded-lg hover:bg-[#007700] flex items-center gap-2">
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
