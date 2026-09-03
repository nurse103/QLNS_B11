import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, CheckCircle, AlertCircle, ChevronUp, ChevronDown, Tag } from 'lucide-react';
import { getCatalog, updateCatalog, CATALOG_KEYS, CatalogKey } from '../services/catalogService';

interface CatalogEditorProps {
    title: string;
    catalogKey: CatalogKey;
    placeholder: string;
}

const CatalogEditor = ({ title, catalogKey, placeholder }: CatalogEditorProps) => {
    const [items, setItems] = useState<string[]>([]);
    const [newItem, setNewItem] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        const load = async () => {
            const data = await getCatalog(catalogKey);
            setItems(data);
        };
        load();
    }, [catalogKey]);

    const addItem = () => {
        const value = newItem.trim();
        if (!value) return;
        if (items.some(i => i.toLowerCase() === value.toLowerCase())) {
            setMessage({ type: 'error', text: 'Mục này đã tồn tại.' });
            return;
        }
        setItems([...items, value]);
        setNewItem('');
        setMessage(null);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const moveItem = (index: number, direction: 'up' | 'down') => {
        const next = direction === 'up' ? index - 1 : index + 1;
        if (next < 0 || next >= items.length) return;
        const newItems = [...items];
        [newItems[index], newItems[next]] = [newItems[next], newItems[index]];
        setItems(newItems);
    };

    const handleSave = async () => {
        setLoading(true);
        setMessage(null);
        const ok = await updateCatalog(catalogKey, items);
        if (ok) {
            setMessage({ type: 'success', text: 'Đã lưu danh mục thành công!' });
        } else {
            setMessage({ type: 'error', text: 'Không thể lưu danh mục.' });
        }
        setLoading(false);
    };

    return (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
            <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Tag size={18} className="text-blue-600" />
                {title}
            </h3>

            {/* Add row */}
            <div className="flex gap-2 mb-4">
                <input
                    type="text"
                    value={newItem}
                    onChange={e => setNewItem(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
                    placeholder={placeholder}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                    onClick={addItem}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1"
                >
                    <Plus size={16} /> Thêm
                </button>
            </div>

            {/* List */}
            <div className="space-y-2 mb-4 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                {items.length === 0 ? (
                    <p className="text-sm text-slate-400 italic py-4 text-center">Chưa có mục nào. Thêm mục mới ở trên.</p>
                ) : (
                    items.map((item, index) => (
                        <div
                            key={`${item}-${index}`}
                            className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 group"
                        >
                            <div className="flex items-center gap-3">
                                <span className="w-6 h-6 flex items-center justify-center bg-slate-100 text-slate-500 rounded text-xs font-bold">
                                    {index + 1}
                                </span>
                                <span className="font-medium text-slate-700 text-sm">{item}</span>
                            </div>
                            <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100">
                                <button onClick={() => moveItem(index, 'up')} disabled={index === 0}
                                    className="p-1 hover:bg-blue-100 text-slate-400 hover:text-blue-600 disabled:opacity-20 rounded">
                                    <ChevronUp size={16} />
                                </button>
                                <button onClick={() => moveItem(index, 'down')} disabled={index === items.length - 1}
                                    className="p-1 hover:bg-blue-100 text-slate-400 hover:text-blue-600 disabled:opacity-20 rounded">
                                    <ChevronDown size={16} />
                                </button>
                                <button onClick={() => removeItem(index)}
                                    className="p-1 hover:bg-red-100 text-slate-400 hover:text-red-600 rounded">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {message && (
                <div className={`p-3 rounded-lg flex items-center gap-2 text-sm mb-3 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {message.text}
                </div>
            )}

            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-md"
                >
                    {loading ? 'Đang lưu...' : 'Lưu danh mục'}
                    {!loading && <Save size={16} />}
                </button>
            </div>
        </div>
    );
};

export const CatalogSettings = () => {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-slate-800 mb-1">Cấu hình danh mục</h2>
                <p className="text-sm text-slate-500 mb-6 italic">
                    * Các danh mục dưới đây được dùng làm gợi ý chọn nhanh khi nhập <b>Cấp bậc</b> và <b>Chức danh/Chức vụ</b> trong hồ sơ nhân viên.
                </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CatalogEditor
                    title="Danh mục Cấp bậc"
                    catalogKey={CATALOG_KEYS.CAP_BAC}
                    placeholder="Nhập cấp bậc mới..."
                />
                <CatalogEditor
                    title="Danh mục Chức danh/Chức vụ"
                    catalogKey={CATALOG_KEYS.CHUC_VU}
                    placeholder="Nhập chức danh/chức vụ mới..."
                />
            </div>
        </div>
    );
};
