import { supabase } from './supabaseClient';
import { sanitizeData, Employee, Family, WorkHistory, Training } from './personnelService';

/**
 * Hồ sơ đảng viên - các trường của PHIẾU ĐẢNG VIÊN không có sẵn trong bảng dsnv.
 * Quan hệ 1-1 với dsnv (xem create_ho_so_dang_vien.sql).
 */
export interface PartyProfile {
    id?: number;
    dsnv_id: number;

    // Phần đầu phiếu
    dang_bo_tinh?: string | null;
    dang_bo_xa?: string | null;
    dang_bo_chi_bo_co_so?: string | null;
    dang_bo_bo_phan?: string | null;
    chi_bo?: string | null;
    so_ly_lich?: string | null;

    // 03, 05, 07
    ten_goi_khac?: string | null;
    noi_dang_ky_khai_sinh?: string | null;
    noi_tam_tru?: string | null;

    // 08 - 11
    dan_toc?: string | null;
    ton_giao?: string | null;
    thanh_phan_gia_dinh?: string | null;
    nghe_nghiep_hien_nay?: string | null;

    // 12
    chi_bo_ket_nap?: string | null;
    nguoi_gioi_thieu_1?: string | null;
    chuc_vu_nguoi_gt_1?: string | null;
    nguoi_gioi_thieu_2?: string | null;
    chuc_vu_nguoi_gt_2?: string | null;
    ngay_qd_ket_nap?: string | null;
    chi_bo_chinh_thuc?: string | null;

    // 13 - 16
    co_quan_tuyen_dung?: string | null;
    ngay_vao_doan?: string | null;
    to_chuc_xa_hoi_khac?: string | null;
    ngay_xuat_ngu?: string | null;

    // 17
    giao_duc_pho_thong?: string | null;
    chuyen_mon_nghiep_vu?: string | null;
    hoc_vi?: string | null;
    hoc_ham?: string | null;
    ly_luan_chinh_tri?: string | null;
    ngoai_ngu?: string | null;
    tin_hoc?: string | null;

    // 18
    tinh_trang_suc_khoe?: string | null;
    thuong_binh_loai?: string | null;
    gia_dinh_liet_sy?: string | null;
    gia_dinh_co_cong?: string | null;

    // 20
    ngay_mien_cong_tac_shd?: string | null;

    // 23 - 26
    khen_thuong?: string | null;
    huy_hieu_dang?: string[] | null;
    danh_hieu_duoc_phong?: string | null;
    ky_luat?: string | null;

    // 27
    ls_khai_tru_thoi_gian?: string | null;
    ls_khai_tru_chi_bo?: string | null;
    ngay_vao_dang_lan_2?: string | null;
    chi_bo_ket_nap_lan_2?: string | null;
    nguoi_gioi_thieu_1_lan_2?: string | null;
    chuc_vu_nguoi_gt_1_lan_2?: string | null;
    nguoi_gioi_thieu_2_lan_2?: string | null;
    chuc_vu_nguoi_gt_2_lan_2?: string | null;
    ngay_chinh_thuc_lan_2?: string | null;
    chi_bo_chinh_thuc_lan_2?: string | null;
    ngay_khoi_phuc_dang_tich?: string | null;
    chi_bo_khoi_phuc?: string | null;
    bi_xu_ly_phap_luat?: string | null;
    lam_viec_che_do_cu?: string | null;

    // 28
    da_di_nuoc_ngoai?: string | null;
    quan_he_to_chuc_nuoc_ngoai?: string | null;
    nguoi_than_nuoc_ngoai?: string | null;

    // 30
    tong_thu_nhap?: string | null;
    binh_quan_dau_nguoi?: string | null;
    nha_duoc_cap_loai?: string | null;
    nha_duoc_cap_dien_tich?: string | null;
    nha_tu_mua_loai?: string | null;
    nha_tu_mua_dien_tich?: string | null;
    dat_duoc_cap?: string | null;
    dat_tu_mua?: string | null;
    hoat_dong_kinh_te?: string | null;
    dien_tich_trang_trai?: string | null;
    so_lao_dong_thue?: string | null;
    tai_san_gia_tri?: string | null;
    gia_tri_tai_san?: string | null;

    // Ký phiếu
    noi_khai?: string | null;
    ngay_khai?: string | null;

    created_by?: string | null;
    created_at?: string;
    updated_at?: string;
}

/**
 * Giá trị điền sẵn cho khối cấp uỷ - cả đơn vị dùng chung nên gợi ý sẵn,
 * người dùng vẫn sửa được nếu chuyển sinh hoạt sang chi bộ khác.
 */
export const PARTY_ORG_DEFAULTS = {
    dang_bo_chi_bo_co_so: 'Bệnh viện Quân y 103',
    dang_bo_bo_phan: 'BMTT Hồi sức CCCĐ',
    chi_bo: 'Khoa Hồi sức ngoại',
} as const;

/** Danh sách mốc Huy hiệu Đảng in trên phiếu (mục 24). */
export const HUY_HIEU_DANG_MOC = ['30', '40', '45', '50', '55', '60', '65', '70', '75', '80', '85', '90'];

/** Toàn bộ dữ liệu cần để dựng một phiếu đảng viên. */
export interface PartyDossier {
    employee: Employee;
    profile: PartyProfile;
    family: Family[];
    workHistory: WorkHistory[];
    training: Training[];
}

/**
 * Các trường của bảng dsnv được phép sửa trực tiếp trong Phiếu đảng viên.
 * `ho_va_ten` KHÔNG nằm trong danh sách này: họ tên là khoá đối chiếu quyền sở hữu
 * hồ sơ (users.full_name <-> dsnv.ho_va_ten) nên chỉ admin được đổi, tránh việc
 * người dùng tự đổi tên rồi mất quyền sửa hồ sơ của chính mình.
 */
export const PARTY_CARD_PERSONAL_FIELDS = [
    'gioi_tinh',
    'ngay_sinh',
    'que_quan',
    'noi_o_hien_nay',
    'chuc_vu',
    'ngay_vao_dang',
    'ngay_chinh_thuc',
    'so_the_dang',
    'thang_nam_tuyen_dung',
    'thang_nam_nhap_ngu',
    'cccd',
    'avatar',
] as const;

/** Riêng admin mới được sửa thêm họ tên. */
export const PARTY_CARD_ADMIN_ONLY_FIELDS = ['ho_va_ten'] as const;

export type PartyCardPersonalInfo = Partial<
    Pick<Employee, (typeof PARTY_CARD_PERSONAL_FIELDS)[number] | 'ho_va_ten'>
>;

/**
 * Ghi thông tin cá nhân sửa trong Phiếu đảng viên ngược về bảng dsnv.
 * Chỉ những cột nằm trong whitelist mới được gửi đi, để phiếu không thể
 * vô tình ghi đè các cột nghiệp vụ khác của hồ sơ nhân sự.
 */
export const savePartyCardPersonalInfo = async (
    dsnvId: number,
    info: PartyCardPersonalInfo,
    options: { allowNameChange?: boolean } = {}
): Promise<Employee> => {
    const allowed: string[] = [
        ...PARTY_CARD_PERSONAL_FIELDS,
        ...(options.allowNameChange ? PARTY_CARD_ADMIN_ONLY_FIELDS : []),
    ];

    const payload: Record<string, unknown> = {};
    for (const key of allowed) {
        if (key in info) payload[key] = (info as Record<string, unknown>)[key];
    }

    if (Object.keys(payload).length === 0) {
        const { data, error } = await supabase.from('dsnv').select('*').eq('id', dsnvId).single();
        if (error) throw error;
        return data as Employee;
    }

    const { data, error } = await supabase
        .from('dsnv')
        .update(sanitizeData(payload))
        .eq('id', dsnvId)
        .select()
        .single();

    if (error) {
        console.error('Error saving personal info from party card:', error);
        throw error;
    }
    return data as Employee;
};

export const getPartyProfile = async (dsnvId: number): Promise<PartyProfile | null> => {
    const { data, error } = await supabase
        .from('ho_so_dang_vien')
        .select('*')
        .eq('dsnv_id', dsnvId)
        .maybeSingle();

    if (error) {
        console.error('Error fetching party profile:', error);
        throw error;
    }
    return (data as PartyProfile) ?? null;
};

export const savePartyProfile = async (profile: PartyProfile): Promise<PartyProfile> => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const { id, created_at, updated_at, ...rest } = profile;
    const payload = sanitizeData({
        ...rest,
        huy_hieu_dang: profile.huy_hieu_dang ?? [],
        created_by: profile.created_by ?? user?.id ?? null,
    });

    const { data, error } = await supabase
        .from('ho_so_dang_vien')
        .upsert(payload, { onConflict: 'dsnv_id' })
        .select()
        .single();

    if (error) {
        console.error('Error saving party profile:', error);
        throw error;
    }
    return data as PartyProfile;
};

/** Lấy trọn bộ hồ sơ đảng viên (thông tin nhân sự + phiếu + các bảng quá trình). */
export const getPartyDossier = async (dsnvId: number): Promise<PartyDossier> => {
    const [{ data: employee, error: empError }, profile] = await Promise.all([
        supabase.from('dsnv').select('*').eq('id', dsnvId).single(),
        getPartyProfile(dsnvId),
    ]);

    if (empError) throw empError;

    const [{ data: family }, { data: workHistory }, { data: training }] = await Promise.all([
        supabase.from('gia_dinh').select('*').eq('dsnv_id', dsnvId).order('id', { ascending: true }),
        supabase.from('qua_trinh_cong_tac').select('*').eq('dsnv_id', dsnvId).order('tu_thang_nam', { ascending: true }),
        supabase.from('qua_trinh_dao_tao').select('*').eq('dsnv_id', dsnvId).order('tu_thang_nam', { ascending: true }),
    ]);

    return {
        employee: employee as Employee,
        profile: profile ?? { dsnv_id: dsnvId, huy_hieu_dang: [] },
        family: (family as Family[]) || [],
        workHistory: (workHistory as WorkHistory[]) || [],
        training: (training as Training[]) || [],
    };
};
