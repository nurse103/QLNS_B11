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
