import { supabase } from './supabaseClient';

// Danh mục dùng chung, lưu trong bảng system_settings dưới dạng mảng JSON.
// Mỗi danh mục là một key riêng, quản trị viên chỉnh sửa trong trang Cài đặt.
export const CATALOG_KEYS = {
    CHUC_VU: 'danh_muc_chuc_vu',
    CAP_BAC: 'danh_muc_cap_bac',
} as const;

export type CatalogKey = typeof CATALOG_KEYS[keyof typeof CATALOG_KEYS];

// Giá trị mặc định gợi ý khi danh mục chưa được cấu hình.
export const DEFAULT_CAP_BAC = [
    'Binh nhì', 'Binh nhất', 'Hạ sĩ', 'Trung sĩ', 'Thượng sĩ',
    'Thiếu úy', 'Trung úy', 'Thượng úy', 'Đại úy',
    'Thiếu tá', 'Trung tá', 'Thượng tá', 'Đại tá',
    'Quân nhân chuyên nghiệp', 'Công nhân viên quốc phòng',
];

export const DEFAULT_CHUC_VU = [
    'Bác sĩ', 'Y sĩ', 'Điều dưỡng', 'Kỹ thuật viên', 'Hộ lý',
    'Điều dưỡng trưởng', 'Phó chủ nhiệm khoa', 'Chủ nhiệm khoa',
];

const CATALOG_DEFAULTS: Record<string, string[]> = {
    [CATALOG_KEYS.CHUC_VU]: DEFAULT_CHUC_VU,
    [CATALOG_KEYS.CAP_BAC]: DEFAULT_CAP_BAC,
};

// Lấy danh mục theo key. Nếu chưa cấu hình, trả về danh sách mặc định (nếu có).
export const getCatalog = async (key: CatalogKey): Promise<string[]> => {
    try {
        const { data, error } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', key)
            .single();

        if (error || !data) return CATALOG_DEFAULTS[key] || [];

        try {
            const items = JSON.parse(data.value);
            return Array.isArray(items) ? items.filter(x => typeof x === 'string') : [];
        } catch (e) {
            console.error(`Error parsing catalog ${key}:`, e);
            return CATALOG_DEFAULTS[key] || [];
        }
    } catch (err) {
        console.error(`Error fetching catalog ${key}:`, err);
        return CATALOG_DEFAULTS[key] || [];
    }
};

// Lưu danh mục. Tự loại bỏ mục rỗng và trùng lặp, giữ nguyên thứ tự.
export const updateCatalog = async (key: CatalogKey, items: string[]): Promise<boolean> => {
    try {
        const cleaned = Array.from(
            new Set(items.map(i => i.trim()).filter(i => i !== ''))
        );

        const { error } = await supabase
            .from('system_settings')
            .upsert({
                key,
                value: JSON.stringify(cleaned),
                updated_at: new Date(),
            });

        if (error) {
            console.error(`Error updating catalog ${key}:`, error);
            return false;
        }
        return true;
    } catch (err) {
        console.error(`Error updating catalog ${key} exception:`, err);
        return false;
    }
};
