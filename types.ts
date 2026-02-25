export interface MenuItem {
  id: string;
  label: string;
  icon?: any;
  path?: string;
  subItems?: MenuItem[];
}

export interface Employee {
  id: number;
  ho_va_ten: string;
  ngay_sinh: string | null;
  gioi_tinh: string | null;
  cap_bac: string | null;
  chuc_vu: string | null;
  cccd: string | null;
  ngay_cap_cccd: string | null;
  cmqd: string | null;
  ngay_cap_cmqd: string | null;
  que_quan: string | null;
  noi_o_hien_nay: string | null;
  dien_thoai: string | null;
  thang_nam_tuyen_dung: string | null;
  thang_nam_nhap_ngu: string | null;
  ngay_ve_khoa_cong_tac: string | null;
  trang_thai: string | null;
  thang_nam_roi_khoa: string | null;
  trang_thai_roi_khoa: string | null;
  noi_den: string | null;
  avatar: string | null;
  ghi_chu: string | null;
  dien_quan_ly: string | null;
  ngay_vao_dang: string | null;
  ngay_chinh_thuc: string | null;
  so_the_dang: string | null;
  ngay_cap_the_dang: string | null;
  doi_tuong: string | null;
  created_by?: string | null;
  created_at?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface Schedule {
  id: number;
  noi_dung: string;
  chi_tiet: string;
  ngay_bat_dau: string;
  ngay_ket_thuc: string;
  nguoi_thuc_hien: string[]; // List of Employee IDs
  file_dinh_kem: string | null;
  trang_thai?: string;
  created_by?: string | null;
  created_at?: string;
}

export interface LeaveRecord {
  id: number;
  dsnv_id: number | null;
  ho_va_ten: string | null;
  cap_bac: string | null;
  chuc_vu: string | null;
  loai_nghi: string | null;
  tu_ngay: string | null;
  den_ngay: string | null;
  ly_do_nghi: string | null;
  noi_dang_ky_nghi: string | null;
  ghi_chu: string | null;
  created_by?: string | null;
  created_at?: string;
}

export interface SystemUser {
  id: string;
  full_name: string;
  username: string;
  password?: string; // Optional for display, required for creation
  role: 'user' | 'admin' | 'manager'; // Assuming roles based on user_role enum
  created_at?: string;
  updated_at?: string;
}

export interface AbsenceRecord {
  id: number;
  dsnv_id: number | null;
  ho_va_ten: string;
  loai_nghi: string;
  ngay_nghi: string;
  ghi_chu: string | null;
  created_by?: string | null;
  created_at?: string;
}

export interface Card {
  id: number;
  so_the: string;
  trang_thai: string;
  ghi_chu: string | null;
  created_at?: string;
}

export interface CardRecord {
  id: number;
  ngay_muon: string;
  ho_ten_benh_nhan: string;
  nam_sinh: string | number | null;
  ho_ten_nguoi_cham: string;
  sdt_nguoi_cham: string | null;
  so_the: string;
  so_tien_cuoc: number;
  ghi_chu: string | null;
  nguoi_cho_muon: string | null;
  trang_thai: string;
  nguoi_nhan_lai_the: string | null;
  ngay_tra: string | null;
  nguoi_ban_giao_tien_muon: string | null;
  ngay_ban_giao_tien_muon: string | null;
  trang_thai_tien_muon: string | null;
  nguoi_ban_giao_tien_tra: string | null;
  ngay_ban_giao_tien_tra: string | null;
  trang_thai_tien_tra: string | null;
  created_by?: string | null;
  created_at?: string;
}

export interface Reward {
  id: string;
  loaikt: string;
  htkt: string;
  dv: string;
  capkt: string;
  ldkt: string | null;
  qdkt: string | null;
  namkt: string;
  image: string | null;
  created_by?: string | null;
  created_at?: string;
}

export interface Decision {
  id: string;
  loai_qd: 'Khen thưởng' | 'Kỷ luật';
  so_quyet_dinh: string;
  ngay_ky: string;
  cap_quyet_dinh: string;
  noi_dung: string;
  ghi_chu: string | null;
  file_quyet_dinh: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}
export interface Assignment {
  id: string;
  ngay_thang: string;
  buong_1: string | null;
  buong_2: string | null;
  buong_3: string | null;
  buong_4: string | null;
  chay_ngoai: string | null;
  chup_phim: string | null;
  lam_so: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}
