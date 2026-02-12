import React, { useState, useEffect } from 'react';
import { getPermissions, updatePermission, Permission } from '../services/permissionService';
import { Shield, Check, X, Save, AlertCircle } from 'lucide-react';

export const PermissionSettings = () => {
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeRole, setActiveRole] = useState<string>('manager'); // Default tab
    const [saving, setSaving] = useState(false);

    // Define roles and modules
    // Updated to match actual DB roles: 'user' instead of 'staff'
    const roles = ['manager', 'user']; // Admin has full access, usually hidden or read-only

    interface ModuleDef {
        key: string;
        label: string;
        level: number;
    }

    const modules: ModuleDef[] = [
        { key: 'dashboard', label: 'Tổng quan', level: 0 },
        { key: 'personnel', label: 'Quản lý Nhân sự', level: 0 },
        { key: 'p-dashboard', label: 'Dashboard Nhân sự', level: 1 },
        { key: 'p-list', label: 'Danh sách nhân viên', level: 1 },
        { key: 'p-salary', label: 'Lên lương', level: 1 },
        { key: 'p-family', label: 'Quan hệ gia đình', level: 1 },
        { key: 'p-training', label: 'Quá trình đào tạo', level: 1 },
        { key: 'p-work', label: 'Quá trình công tác', level: 1 },
        { key: 'p-cert', label: 'Chứng chỉ hành nghề', level: 1 },
        { key: 'p-insurance', label: 'Bảo hiểm y tế', level: 1 },
        { key: 'leave', label: 'Quản lý phép/Tranh thủ', level: 0 },
        { key: 'cong-van', label: 'Quản lý công văn', level: 0 },
        { key: 'research', label: 'Nghiên cứu khoa học', level: 0 },
        { key: 'r-topics', label: 'Đề tài NCKH', level: 1 },
        { key: 'r-articles', label: 'Bài báo', level: 1 },
        { key: 'r-sports', label: 'Hội thao kỹ thuật', level: 1 },
        { key: 'r-conference', label: 'Tham dự báo cáo', level: 1 },
        { key: 'rewards', label: 'Khen thưởng - Kỷ luật', level: 0 },
        { key: 'party-management', label: 'Quản lý đảng viên', level: 0 },
        { key: 'patient-card-management', label: 'Quản lý thẻ chăm', level: 0 },
        { key: 'absence', label: 'Quản lý Quân số nghỉ', level: 0 },
        { key: 'reports', label: 'Báo cáo thống kê', level: 0 },
        { key: 'combat', label: 'Sẵn sàng chiến đấu', level: 0 },
        { key: 'duty', label: 'Lịch trực', level: 0 },
        { key: 'schedule', label: 'Lịch công tác', level: 0 },
        { key: 'assets', label: 'Quản lý tài sản', level: 0 },
        { key: 'a-medical-equip', label: 'Thiết bị y tế', level: 1 },
        { key: 'a-it-equip', label: 'Thiết bị CNTT', level: 1 },
        { key: 'a-medical-tools', label: 'Dụng cụ y tế', level: 1 },
        { key: 'a-uniforms', label: 'Quân trang, đồ vải', level: 1 },
        { key: 'settings', label: 'Cài đặt hệ thống', level: 0 },
    ];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getPermissions();
            setPermissions(data);
        } catch (error) {
            console.error("Error fetching permissions", error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (perm: Permission, field: keyof Permission) => {
        // Optimistic update
        const newVal = !perm[field];
        const originalPerms = [...permissions];

        setPermissions(prev => prev.map(p =>
            p.id === perm.id ? { ...p, [field]: newVal } : p
        ));

        // API Call
        try {
            await updatePermission(perm.id, { [field]: newVal });
        } catch (error) {
            // Revert on error
            setPermissions(originalPerms);
            alert("Không thể cập nhật quyền. Vui lòng thử lại.");
        }
    };

    const getPermissionFor = (role: string, moduleKey: string) => {
        return permissions.find(p => p.role === role && p.module === moduleKey);
    };

    if (loading) return <div className="text-center py-8 text-slate-500">Đang tải cấu hình phân quyền...</div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div>
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Shield className="text-blue-600" size={20} />
                        Phân quyền người dùng
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Cấu hình quyền truy cập và thao tác cho các vai trò trong hệ thống</p>
                </div>

                {/* Role Tabs */}
                <div className="flex bg-white p-1 rounded-lg border border-slate-200">
                    {roles.map(role => (
                        <button
                            key={role}
                            onClick={() => setActiveRole(role)}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeRole === role
                                ? 'bg-blue-100 text-blue-700 shadow-sm'
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                }`}
                        >
                            {role === 'manager' ? 'Quản lý (Manager)' : 'Nhân viên (User/Staff)'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 w-1/3">Chức năng (Module)</th>
                                <th className="px-6 py-4 text-center w-1/6">Xem</th>
                                <th className="px-6 py-4 text-center w-1/6">Thêm</th>
                                <th className="px-6 py-4 text-center w-1/6">Sửa</th>
                                <th className="px-6 py-4 text-center w-1/6">Xóa</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {modules.map((mod) => {
                                const perm = getPermissionFor(activeRole, mod.key);
                                // If no permission row exists, user might see empty or default disabled. 
                                // Ideally SQL seeded this.

                                return (
                                    <tr key={mod.key} className="hover:bg-slate-50 transition-colors">
                                        <td className={`px-6 py-4 font-medium text-slate-800 ${mod.level > 0 ? 'pl-12 border-l-4 border-l-slate-100' : ''}`}>
                                            <div className="flex items-center gap-2">
                                                {mod.level > 0 && <span className="w-2 h-2 rounded-full bg-slate-300"></span>}
                                                <div>
                                                    {mod.label}
                                                    <div className="text-xs text-slate-400 font-normal mt-0.5">{mod.key}</div>
                                                </div>
                                            </div>
                                        </td>
                                        {perm ? (
                                            <>
                                                <td className="px-6 py-4 text-center">
                                                    <Toggle
                                                        checked={perm.can_view}
                                                        onChange={() => handleToggle(perm, 'can_view')}
                                                        disabled={mod.key === 'dashboard'} // Overview usually always viewable?
                                                    />
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <Toggle checked={perm.can_add} onChange={() => handleToggle(perm, 'can_add')} />
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <Toggle checked={perm.can_edit} onChange={() => handleToggle(perm, 'can_edit')} />
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <Toggle checked={perm.can_delete} onChange={() => handleToggle(perm, 'can_delete')} />
                                                </td>
                                            </>
                                        ) : (
                                            <td colSpan={4} className="px-6 py-4 text-center text-slate-400 italic">
                                                Chưa được cấu hình trong CSDL
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3 text-sm text-blue-800">
                <AlertCircle className="shrink-0 mt-0.5" size={18} />
                <div>
                    <h4 className="font-bold mb-1">Lưu ý</h4>
                    <ul className="list-disc list-inside space-y-1 text-blue-700">
                        <li><strong>Admin</strong> luôn có toàn quyền truy cập vào tất cả các chức năng.</li>
                        <li>Quyền <strong>Xem</strong> là điều kiện tiên quyết. Nếu tắt quyền Xem, người dùng sẽ không thấy menu chức năng đó.</li>
                        <li>Thay đổi sẽ có hiệu lực ngay lập tức hoặc sau khi người dùng tải lại trang.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

const Toggle = ({ checked, onChange, disabled }: { checked: boolean, onChange: () => void, disabled?: boolean }) => (
    <button
        onClick={onChange}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${checked ? 'bg-blue-600' : 'bg-slate-200'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
        <span
            className={`${checked ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out shadow-sm`}
        />
    </button>
);
