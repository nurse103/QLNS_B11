import React, { useState, useEffect } from 'react';
import { SystemUser } from '../types';
import { updateUser } from '../services/userService';
import { X, User, Save, Shield, Camera } from 'lucide-react';
import { getCurrentUser } from '../services/authService';

interface UserProfileModalProps {
    onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ onClose }) => {
    const [user, setUser] = useState<SystemUser | null>(null);
    const [formData, setFormData] = useState<Partial<SystemUser>>({});
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        const currentUser = getCurrentUser();
        if (currentUser) {
            // We might want to fetch the latest user data from server to be sure
            // But for now, let's use what we have or fetch if we had a getUserById
            // Since we don't have getUserById easily exposed without filtering getUsers, 
            // let's rely on localStorage or passed prop, OR fetch all and find.
            // fetching all is inefficient. Let's use localStorage user for now.
            // Ideally we should have a `getUserMe` or similar.
            // casting Key 'id' to string as per SystemUser type which uses string id (UUID)
            setUser(currentUser as unknown as SystemUser);
            setFormData({
                full_name: currentUser.full_name,
                username: currentUser.username,
                // avatar: currentUser.avatar 
            });
        }
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !user.id) return;

        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            // Update only allowed fields
            const updates = {
                full_name: formData.full_name,
                // avatar: formData.avatar
            };

            await updateUser(user.id, updates);

            // Update local storage
            const updatedUser = { ...user, ...updates };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser as SystemUser);

            setMessage({ type: 'success', text: 'Cập nhật hồ sơ thành công!' });
            setIsEditing(false);

            // Notify parent to refresh if needed (optional)
            // window.location.reload(); // Simple way to refresh app state
        } catch (error) {
            console.error("Update profile failed:", error);
            setMessage({ type: 'error', text: 'Có lỗi xảy ra khi cập nhật.' });
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-800">Hồ sơ cá nhân</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <div className="flex flex-col items-center mb-6">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-3xl shadow-lg mb-2">
                                {user.full_name?.charAt(0) || user.username.charAt(0)}
                            </div>
                            {/* Avatar upload placeholder */}
                            {isEditing && (
                                <button className="absolute bottom-2 right-0 p-2 bg-white rounded-full shadow border border-slate-200 text-slate-600 hover:text-primary-600">
                                    <Camera size={16} />
                                </button>
                            )}
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">{user.full_name}</h2>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border mt-1
                ${user.role === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                user.role === 'manager' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                    'bg-green-100 text-green-700 border-green-200'}
            `}>
                            {user.role === 'admin' ? 'Quản trị viên' :
                                user.role === 'manager' ? 'Quản lý' : 'Nhân viên'}
                        </span>
                    </div>

                    {message.text && (
                        <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {message.type === 'success' ? <User size={16} /> : <Shield size={16} />}
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tên đăng nhập</label>
                            <div className="relative">
                                <Shield className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    value={user.username}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed focus:outline-none"
                                    disabled
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Họ và tên</label>
                            <div className="relative">
                                <User className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    value={isEditing ? formData.full_name : user.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${isEditing ? 'border-slate-300 bg-white' : 'border-transparent bg-transparent pl-10'}`}
                                    readOnly={!isEditing}
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex gap-3">
                            {isEditing ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsEditing(false);
                                            setFormData({ full_name: user.full_name, username: user.username }); // Reset
                                            setMessage({ type: '', text: '' });
                                        }}
                                        className="flex-1 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 py-2 text-white bg-primary-600 hover:bg-primary-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                        {loading ? 'Đang lưu...' : <><Save size={18} /> Lưu thay đổi</>}
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(true)}
                                    className="w-full py-2 text-white bg-primary-600 hover:bg-primary-700 rounded-lg font-medium transition-colors"
                                >
                                    Chỉnh sửa thông tin
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
