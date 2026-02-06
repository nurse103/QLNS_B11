import React, { useState, useEffect } from 'react';
import { getBackground, login, User } from '../services/authService';
import { User as UserIcon, Lock, Loader2, LogIn } from 'lucide-react';

interface LoginProps {
    onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [background, setBackground] = useState('');

    useEffect(() => {
        const fetchBg = async () => {
            const bg = await getBackground();
            if (bg) setBackground(bg);
        };
        fetchBg();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const user = await login(username, password);
            if (user) {
                onLogin(user);
            } else {
                setError('Tên đăng nhập hoặc mật khẩu không đúng');
            }
        } catch (err) {
            setError('Có lỗi xảy ra, vui lòng thử lại');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen w-full flex items-center justify-center bg-cover bg-center transition-all duration-1000"
            style={{
                backgroundImage: `url(${background || 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop'})`
            }}
        >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

            <div className="relative z-10 w-full max-w-md bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-white/20 animate-fade-in-up">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-tr from-green-600 to-green-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30">
                        <UserIcon className="text-white" size={32} />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-800">Đăng nhập</h2>
                    <p className="text-slate-500 mt-2">Hệ thống quản lý nhân sự</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center gap-2 animate-shake">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 ml-1">Tài khoản</label>
                        <div className="relative group">
                            <UserIcon className="absolute left-3 top-3 text-slate-400 group-focus-within:text-green-600 transition-colors" size={20} />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all"
                                placeholder="Nhập tên đăng nhập"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 ml-1">Mật khẩu</label>
                        <div className="relative group">
                            <Lock className="absolute left-3 top-3 text-slate-400 group-focus-within:text-green-600 transition-colors" size={20} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-white/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all"
                                placeholder="Nhập mật khẩu"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-500/30 transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                Đang xử lý...
                            </>
                        ) : (
                            <>
                                <LogIn size={20} />
                                Đăng nhập
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center text-xs text-slate-400">
                    &copy; 2024 HRMS Pro. All rights reserved.
                </div>
            </div>
        </div>
    );
};
