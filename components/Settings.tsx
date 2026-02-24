import React, { useState, useEffect } from 'react';
import { getBackground, updateBackground } from '../services/authService';
import { Upload, Image as ImageIcon, Save, CheckCircle, AlertCircle, Users, Layout, Shield, ListTree, ChevronUp, ChevronDown } from 'lucide-react';
import { UserManagement } from './UserManagement';
import { CardManagement } from './CardManagement';
import { PermissionSettings } from './PermissionSettings';
import { getMenuOrder, updateMenuOrder } from '../services/settingsService';
import { getAuthUser } from '../services/authService';
import { CreditCard } from 'lucide-react';

export const Settings = () => {
    const [activeTab, setActiveTab] = useState<'general' | 'users' | 'cards' | 'permissions' | 'menu'>('general');
    const [background, setBackground] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [userRole, setUserRole] = useState<string>('');

    useEffect(() => {
        const user = getAuthUser();
        if (user) setUserRole(user.role);
    }, []);
    const [preview, setPreview] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchBackground();
    }, []);

    const fetchBackground = async () => {
        const bg = await getBackground();
        setBackground(bg);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
        }
    };

    const handleSave = async () => {
        if (!file) return;
        setLoading(true);
        setMessage(null);

        try {
            const url = await updateBackground(file);
            if (url) {
                setBackground(url);
                setMessage({ type: 'success', text: 'Cập nhật ảnh nền thành công! Vui lòng đăng xuất để xem thay đổi.' });
                setFile(null);
                setPreview('');
            } else {
                setMessage({ type: 'error', text: 'Không thể cập nhật ảnh. Vui lòng thử lại.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Có lỗi xảy ra.' });
        } finally {
            setLoading(false);
        }
    };

    const [menuOrder, setMenuOrder] = useState<{ id: string, label: string }[]>([]);
    const [originalMenuOrder, setOriginalMenuOrder] = useState<string[]>([]);

    const allModules = [
        { id: 'dashboard', label: 'Tổng quan' },
        { id: 'personnel', label: 'Nhân sự' },
        { id: 'leave', label: 'Quản lý phép/Tranh thủ' },
        { id: 'cong-van', label: 'Quản lý công văn' },
        { id: 'research', label: 'Nghiên cứu khoa học' },
        { id: 'rewards', label: 'Khen thưởng - Kỷ luật' },
        { id: 'assignments', label: 'Phân công hàng ngày' },
        { id: 'party-management', label: 'Quản lý đảng viên' },
        { id: 'patient-card-management', label: 'Quản lý thẻ chăm' },
        { id: 'absence', label: 'Quản lý Quân số nghỉ' },
        { id: 'reports', label: 'Báo cáo thống kê' },
        { id: 'combat', label: 'Sẵn sàng chiến đấu' },
        { id: 'duty', label: 'Lịch trực' },
        { id: 'schedule', label: 'Lịch công tác' },
        { id: 'assets', label: 'Quản lý tài sản' },
        { id: 'settings', label: 'Cài đặt' },
    ];

    useEffect(() => {
        const fetchOrder = async () => {
            const savedOrder = await getMenuOrder();
            setOriginalMenuOrder(savedOrder);

            // Reorder allModules based on savedOrder
            let sortedModules = [...allModules];
            if (savedOrder && savedOrder.length > 0) {
                sortedModules.sort((a, b) => {
                    const indexA = savedOrder.indexOf(a.id);
                    const indexB = savedOrder.indexOf(b.id);

                    const posA = indexA === -1 ? 999 : indexA;
                    const posB = indexB === -1 ? 999 : indexB;

                    return posA - posB;
                });
            }
            setMenuOrder(sortedModules);
        };
        fetchOrder();
    }, []);

    const moveItem = (index: number, direction: 'up' | 'down') => {
        const newOrder = [...menuOrder];
        const nextIndex = direction === 'up' ? index - 1 : index + 1;

        if (nextIndex < 0 || nextIndex >= newOrder.length) return;

        [newOrder[index], newOrder[nextIndex]] = [newOrder[nextIndex], newOrder[index]];
        setMenuOrder(newOrder);
    };

    const handleSaveMenuOrder = async () => {
        setLoading(true);
        const success = await updateMenuOrder(menuOrder.map(m => m.id));
        if (success) {
            setMessage({ type: 'success', text: 'Đã cập nhật thứ tự menu! Vui lòng tải lại trang để thấy thay đổi.' });
        } else {
            setMessage({ type: 'error', text: 'Không thể cập nhật thứ tự menu.' });
        }
        setLoading(false);
    };

    return (
        <div className="p-6 max-w-6xl mx-auto animate-fade-in">
            <h1 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Layout className="text-blue-600" />
                Cài đặt hệ thống
            </h1>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Sidebar Navigation */}
                <div className="w-full md:w-64 shrink-0">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <nav className="flex flex-col p-2 space-y-1">
                            <button
                                onClick={() => setActiveTab('general')}
                                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'general' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <ImageIcon size={18} />
                                Giao diện & Ảnh nền
                            </button>
                            <button
                                onClick={() => setActiveTab('users')}
                                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'users' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <Users size={18} />
                                Quản lý người dùng
                            </button>
                            <button
                                onClick={() => setActiveTab('cards')}
                                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'cards' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <CreditCard size={18} />
                                Quản lý danh sách thẻ
                            </button>
                            {userRole === 'admin' && (
                                <button
                                    onClick={() => setActiveTab('permissions')}
                                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'permissions' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <Shield size={18} />
                                    Phân quyền người dùng
                                </button>
                            )}
                            {userRole === 'admin' && (
                                <button
                                    onClick={() => setActiveTab('menu')}
                                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'menu' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <ListTree size={18} />
                                    Sắp xếp menu
                                </button>
                            )}
                        </nav>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1">
                    {activeTab === 'general' ? (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h2 className="text-lg font-semibold text-slate-800 mb-4">Ảnh nền màn hình đăng nhập</h2>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className="aspect-video w-full rounded-lg overflow-hidden border-2 border-slate-200 relative bg-slate-50 group">
                                        {preview || background ? (
                                            <img
                                                src={preview || background}
                                                alt="Background preview"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                                <ImageIcon size={48} />
                                                <span>Chưa có ảnh nền</span>
                                            </div>
                                        )}

                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <p className="text-white font-medium">Xem trước</p>
                                        </div>
                                    </div>

                                    <p className="text-sm text-slate-500">
                                        Kích thước khuyến nghị: 1920x1080px. Định dạng: JPG, PNG.
                                    </p>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Tải ảnh mới</label>
                                        <div className="flex items-center justify-center w-full">
                                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                    <Upload className="w-8 h-8 mb-4 text-slate-400" />
                                                    <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">Nhấn để tải lên</span> hoặc kéo thả</p>
                                                    <p className="text-xs text-slate-500">SVG, PNG, JPG or GIF</p>
                                                </div>
                                                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                            </label>
                                        </div>
                                    </div>

                                    {message && (
                                        <div className={`p-4 rounded-lg flex items-center gap-2 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                            }`}>
                                            {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                                            {message.text}
                                        </div>
                                    )}

                                    <div className="flex justify-end">
                                        <button
                                            onClick={handleSave}
                                            disabled={!file || loading}
                                            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-blue-500/30 transition-all"
                                        >
                                            {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                                            {!loading && <Save size={18} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'users' ? (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[500px]">
                            <UserManagement />
                        </div>
                    ) : activeTab === 'cards' ? (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[500px]">
                            <CardManagement />
                        </div>
                    ) : activeTab === 'menu' && userRole === 'admin' ? (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <h2 className="text-lg font-semibold text-slate-800 mb-2">Thứ tự hiển thị các menu trên Sidebar</h2>
                            <p className="text-sm text-slate-500 mb-6 font-medium italic">* Kéo hoặc dùng nút mũi tên để thay đổi vị trí của các menu chính trên thanh điều hướng bên trái.</p>

                            <div className="space-y-2 mb-8 max-w-2xl">
                                {menuOrder.map((item, index) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 group hover:shadow-md transition-all hover:bg-white"
                                    >
                                        <div className="flex items-center gap-4">
                                            <span className="w-6 h-6 flex items-center justify-center bg-slate-200 text-slate-500 rounded-lg text-xs font-bold">
                                                {index + 1}
                                            </span>
                                            <span className="font-bold text-slate-800">{item.label}</span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100">
                                            <button
                                                onClick={() => moveItem(index, 'up')}
                                                disabled={index === 0}
                                                className="p-1.5 hover:bg-blue-100 text-slate-400 hover:text-blue-600 disabled:opacity-20 rounded-lg transition-colors"
                                            >
                                                <ChevronUp size={20} />
                                            </button>
                                            <button
                                                onClick={() => moveItem(index, 'down')}
                                                disabled={index === menuOrder.length - 1}
                                                className="p-1.5 hover:bg-blue-100 text-slate-400 hover:text-blue-600 disabled:opacity-20 rounded-lg transition-colors"
                                            >
                                                <ChevronDown size={20} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {message && activeTab === 'menu' && (
                                <div className={`p-4 rounded-xl flex items-center gap-2 text-sm mb-6 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                    {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                                    {message.text}
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                                <button
                                    onClick={handleSaveMenuOrder}
                                    disabled={loading}
                                    className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-200 hover:scale-105 transition-all"
                                >
                                    {loading ? 'Đang lưu...' : 'Lưu thứ tự menu'}
                                    {!loading && <Save size={20} />}
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div >
    );
};
