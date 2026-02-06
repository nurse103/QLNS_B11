import React, { useState, useEffect } from 'react';
import { SystemUser } from '../types';
import { getUsers, createUser, updateUser, deleteUser } from '../services/userService';
import { Plus, Edit, Trash2, X, Save, Shield, User, Key } from 'lucide-react';

export const UserManagement = () => {
    const [users, setUsers] = useState<SystemUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<Partial<SystemUser>>({});
    const [error, setError] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await getUsers();
            setUsers(data);
        } catch (err) {
            console.error("Failed to fetch users", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setSelectedUser({ role: 'user' }); // Default role
        setIsModalOpen(true);
        setError('');
    };

    const handleEdit = (user: SystemUser) => {
        setSelectedUser({ ...user, password: '' }); // Don't show password
        setIsModalOpen(true);
        setError('');
    };

    const handleDelete = async (id: string, username: string) => {
        if (window.confirm(`Bạn có chắc chắn muốn xóa người dùng "${username}" không?`)) {
            try {
                await deleteUser(id);
                fetchUsers();
            } catch (err) {
                alert("Xóa thất bại");
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!selectedUser.username || !selectedUser.full_name) {
            setError("Vui lòng điền đầy đủ tên và tên đăng nhập");
            return;
        }

        if (!selectedUser.id && !selectedUser.password) {
            setError("Mật khẩu là bắt buộc khi tạo mới");
            return;
        }

        try {
            if (selectedUser.id) {
                await updateUser(selectedUser.id, selectedUser);
            } else {
                await createUser(selectedUser);
            }
            setIsModalOpen(false);
            fetchUsers();
        } catch (err: any) {
            console.error("Save failed", err);
            setError(err.message || "Lưu thất bại. Tên đăng nhập có thể đã tồn tại.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-slate-800">Danh sách người dùng</h2>
                <button
                    onClick={handleCreate}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
                >
                    <Plus size={16} /> Thêm người dùng
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4">Họ và tên</th>
                            <th className="px-6 py-4">Tên đăng nhập</th>
                            <th className="px-6 py-4">Vai trò</th>
                            <th className="px-6 py-4 text-center">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium text-slate-900">{user.full_name}</td>
                                <td className="px-6 py-4 text-slate-600">{user.username}</td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                                        ${user.role === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                            user.role === 'manager' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                'bg-green-100 text-green-700 border-green-200'}
                                    `}>
                                        {user.role === 'admin' ? 'Quản trị viên' :
                                            user.role === 'manager' ? 'Quản lý' : 'Nhân viên'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => handleEdit(user)}
                                            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                            title="Sửa"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(user.id, user.username)}
                                            className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                            title="Xóa"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && !loading && (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                                    Chưa có người dùng nào.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800">
                                {selectedUser.id ? 'Cập nhật người dùng' : 'Thêm người dùng mới'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {error && (
                                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
                                    <Shield size={16} /> {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Họ và tên</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        value={selectedUser.full_name || ''}
                                        onChange={e => setSelectedUser({ ...selectedUser, full_name: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="Nguyễn Văn A"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tên đăng nhập</label>
                                <div className="relative">
                                    <Shield className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        value={selectedUser.username || ''}
                                        onChange={e => setSelectedUser({ ...selectedUser, username: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="username"
                                        required
                                        disabled={!!selectedUser.id} // Username usually shouldn't change to avoid unique conflicts complexity, or allow it. Be safe.
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    {selectedUser.id ? 'Mật khẩu (Để trống nếu không đổi)' : 'Mật khẩu'}
                                </label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                    <input
                                        type="password"
                                        value={selectedUser.password || ''}
                                        onChange={e => setSelectedUser({ ...selectedUser, password: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="••••••"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Vai trò</label>
                                <select
                                    value={selectedUser.role || 'user'}
                                    onChange={e => setSelectedUser({ ...selectedUser, role: e.target.value as any })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                    <option value="user">Nhân viên (User)</option>
                                    <option value="manager">Quản lý (Manager)</option>
                                    <option value="admin">Quản trị viên (Admin)</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
                                >
                                    <Save size={16} /> Lưu lại
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
