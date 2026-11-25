import { supabase } from './supabaseClient';
import { sanitizeData } from './personnelService';

/** Các mục phân loại trong Mẫu 04a/04b BHYT-QĐ */
export const LOAI_DE_NGHI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'] as const;
export type LoaiDeNghi = typeof LOAI_DE_NGHI[number];

export const LOAI_DE_NGHI_SHORT: Record<LoaiDeNghi, string> = {
    I: 'Còn giá trị sử dụng',
    II: 'Gia hạn (không đổi thông tin)',
    III: 'Gia hạn có thay đổi thông tin',
    IV: 'Cấp đổi',
    V: 'Cấp lại (mất, hỏng thẻ)',
    VI: 'Giảm thẻ',
    VII: 'Cấp mới, tăng mới',
};

/** Tiêu đề từng mục khi xuất mẫu. who = 'quân nhân' | 'thân nhân' */
export const loaiDeNghiTitle = (loai: LoaiDeNghi, nam: number, type: 'ca_nhan' | 'than_nhan') => {
    const prev = nam - 1;
    const who = type === 'ca_nhan' ? 'quân nhân' : 'thân nhân';
    const Who = type === 'ca_nhan' ? 'Quân nhân' : 'Thân nhân';
    switch (loai) {
        case 'I': return `THẺ CẤP TẠI HỌC VIỆN QUÂN Y, CÒN GIÁ TRỊ SỬ DỤNG TRONG NĂM ${nam}`;
        case 'II': return `ĐỀ NGHỊ GIA HẠN GIÁ TRỊ SỬ DỤNG NĂM ${nam}: Thẻ hết hạn tại thời điểm 31/12/${prev}; không thay đổi thông tin gì.`;
        case 'III': return `ĐỀ NGHỊ GIA HẠN CÓ THAY ĐỔI THÔNG TIN: Thẻ hết hạn tại thời điểm 31/12/${prev} nhưng thay đổi nơi khám chữa bệnh ban đầu, thay đổi thông tin nhân thân …`;
        case 'IV': return `THẺ ĐỀ NGHỊ CẤP ĐỔI: Thẻ cấp tại HVQY còn giá trị sử dụng năm ${nam} nhưng ${who} thay đổi nơi khám chữa bệnh ban đầu, thông tin nhân thân …`;
        case 'V': return `THẺ ĐỀ NGHỊ CẤP LẠI: Thẻ cấp tại HVQY còn giá trị sử dụng năm ${nam} nhưng bị mất thẻ, hỏng thẻ`;
        case 'VI': return type === 'ca_nhan'
            ? 'ĐỀ NGHỊ GIẢM THẺ: Quân nhân chuyển đơn vị khác, …. và các trường hợp khác'
            : 'ĐỀ NGHỊ GIẢM THẺ: Thân nhân của quân nhân bị chết, hết tuổi được hưởng …. và các trường hợp khác';
        case 'VII': return `ĐỀ NGHỊ CẤP MỚI, TĂNG MỚI: ${Who} đủ điều kiện cấp mới (cấp lần đầu); thẻ đã được cấp tại HVQY nhưng hết hạn và ${type === 'ca_nhan' ? 'Quân nhân' : 'TNQN'} ở đơn vị khác chuyển về Học viện`;
    }
};

export interface DsnvRef {
    ho_va_ten: string;
    cap_bac: string | null;
    chuc_vu: string | null;
    cccd: string | null;
    ngay_sinh: string | null;
    gioi_tinh: string | null;
    dien_thoai: string | null;
}

export interface BhytCaNhan {
    id?: number;
    dsnv_id: number;
    nam: number;
    loai_de_nghi: LoaiDeNghi;
    ma_so_bhxh?: string | null;
    xa_phuong?: string | null;
    tinh?: string | null;
    noi_kcb?: string | null;
    so_dien_thoai?: string | null;
    sd_tu_ngay?: string | null;
    sd_den_ngay?: string | null;
    ghi_chu?: string | null;
    created_by?: string | null;
    dsnv?: DsnvRef;
}

export interface BhytThanNhan {
    id?: number;
    dsnv_id: number;
    gia_dinh_id?: number | null;
    nam: number;
    loai_de_nghi: LoaiDeNghi;
    moi_quan_he: string;
    noi_cu_tru?: string | null;
    anh_bhyt?: string | null;
    ho_va_ten: string;
    cccd?: string | null;
    ma_so_bhyt?: string | null;
    ngay_sinh?: string | null;
    gioi_tinh?: string | null;
    xa_phuong?: string | null;
    tinh?: string | null;
    noi_kcb?: string | null;
    so_dien_thoai?: string | null;
    sd_tu_ngay?: string | null;
    sd_den_ngay?: string | null;
    ghi_chu?: string | null;
    created_by?: string | null;
    dsnv?: DsnvRef;
}

const DSNV_SELECT = 'dsnv:dsnv_id ( ho_va_ten, cap_bac, chuc_vu, cccd, ngay_sinh, gioi_tinh, dien_thoai )';

const currentUserId = () => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return user?.id ?? null;
};

const makeCrud = <T extends { id?: number; dsnv?: DsnvRef }>(table: string) => ({
    list: async (nam?: number): Promise<T[]> => {
        let q = supabase.from(table).select(`*, ${DSNV_SELECT}`);
        if (nam) q = q.eq('nam', nam);
        const { data, error } = await q.order('id', { ascending: true });
        if (error) {
            console.error(`Error fetching ${table}:`, error);
            throw error;
        }
        return (data || []) as T[];
    },
    create: async (record: Partial<T>) => {
        const { dsnv, id, created_at, ...payload } = record as any;
        const { data, error } = await supabase
            .from(table)
            .insert([{ ...sanitizeData(payload), created_by: currentUserId() }])
            .select()
            .single();
        if (error) throw error;
        return data;
    },
    bulkCreate: async (records: Partial<T>[]) => {
        const uid = currentUserId();
        const rows = records.map(r => {
            const { dsnv, id, ...payload } = r as any;
            return { ...sanitizeData(payload), created_by: uid };
        });
        const { error } = await supabase.from(table).insert(rows);
        if (error) throw error;
    },
    update: async (id: number, record: Partial<T>) => {
        const { dsnv, id: _id, created_by, created_at, ...payload } = record as any;
        const { data, error } = await supabase
            .from(table)
            .update(sanitizeData(payload))
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },
    remove: async (id: number) => {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
    },
});

export const bhytCaNhanApi = makeCrud<BhytCaNhan>('bhyt_ca_nhan');
export const bhytThanNhanApi = makeCrud<BhytThanNhan>('bhyt_than_nhan');
