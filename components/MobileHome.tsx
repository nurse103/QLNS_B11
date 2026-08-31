import React from 'react';
import { useNavigate, useParams, useLocation, Navigate, Link } from 'react-router-dom';
import { ArrowLeft, Home, Menu, LayoutGrid } from 'lucide-react';
import { MenuItem } from '../types';

// Logo ứng dụng (đặt file tại public/logo.png)
export const APP_LOGO_SRC = '/logo.png';

// Trang tổng quan trên mobile được tách khỏi "/" vì "/" là lưới menu
export const MOBILE_OVERVIEW_PATH = '/overview';

// Bảng màu cho từng ô trong lưới, lặp lại theo thứ tự.
// Mỗi ô dùng gradient sáng -> đậm cộng viền/bóng để tạo cảm giác nổi khối 3D.
const TILE_STYLES = [
  { bg: 'bg-gradient-to-br from-orange-100 via-orange-200 to-orange-400', icon: 'text-orange-700', label: 'text-orange-700', shadow: 'shadow-orange-300/70' },
  { bg: 'bg-gradient-to-br from-indigo-100 via-indigo-200 to-indigo-400', icon: 'text-indigo-700', label: 'text-indigo-700', shadow: 'shadow-indigo-300/70' },
  { bg: 'bg-gradient-to-br from-sky-100 via-sky-200 to-sky-400', icon: 'text-sky-700', label: 'text-sky-700', shadow: 'shadow-sky-300/70' },
  { bg: 'bg-gradient-to-br from-amber-100 via-amber-200 to-amber-400', icon: 'text-amber-700', label: 'text-amber-700', shadow: 'shadow-amber-300/70' },
  { bg: 'bg-gradient-to-br from-pink-100 via-pink-200 to-pink-400', icon: 'text-pink-700', label: 'text-pink-700', shadow: 'shadow-pink-300/70' },
  { bg: 'bg-gradient-to-br from-violet-100 via-violet-200 to-violet-400', icon: 'text-violet-700', label: 'text-violet-700', shadow: 'shadow-violet-300/70' },
  { bg: 'bg-gradient-to-br from-rose-100 via-rose-200 to-rose-400', icon: 'text-rose-700', label: 'text-rose-700', shadow: 'shadow-rose-300/70' },
  { bg: 'bg-gradient-to-br from-emerald-100 via-emerald-200 to-emerald-400', icon: 'text-emerald-700', label: 'text-emerald-700', shadow: 'shadow-emerald-300/70' },
  { bg: 'bg-gradient-to-br from-cyan-100 via-cyan-200 to-cyan-400', icon: 'text-cyan-700', label: 'text-cyan-700', shadow: 'shadow-cyan-300/70' },
  { bg: 'bg-gradient-to-br from-lime-100 via-lime-200 to-lime-400', icon: 'text-lime-700', label: 'text-lime-700', shadow: 'shadow-lime-300/70' },
  { bg: 'bg-gradient-to-br from-teal-100 via-teal-200 to-teal-400', icon: 'text-teal-700', label: 'text-teal-700', shadow: 'shadow-teal-300/70' },
  { bg: 'bg-gradient-to-br from-slate-100 via-slate-200 to-slate-400', icon: 'text-slate-700', label: 'text-slate-700', shadow: 'shadow-slate-300/70' },
];

// Đường dẫn thực tế khi bấm vào một ô trong lưới
const targetPath = (item: MenuItem) => {
  if (item.subItems && item.subItems.length > 0) return `/m/${item.id}`;
  if (item.path === '/') return MOBILE_OVERVIEW_PATH;
  return item.path || '/';
};

/**
 * Tìm mục menu (và nhóm cha) tương ứng với đường dẫn hiện tại.
 */
const findByPath = (menuItems: MenuItem[], pathname: string) => {
  for (const item of menuItems) {
    if (item.path === pathname) return { item, parent: null as MenuItem | null };
    for (const sub of item.subItems || []) {
      if (sub.path === pathname) return { item: sub, parent: item };
    }
  }
  return null;
};

/** Tiêu đề hiển thị trên thanh header của mobile */
export const getMobileTitle = (menuItems: MenuItem[], pathname: string) => {
  if (pathname === '/') return 'Trang chủ';
  if (pathname === MOBILE_OVERVIEW_PATH) return 'Tổng quan';
  const groupId = pathname.startsWith('/m/') ? pathname.slice(3) : null;
  if (groupId) return menuItems.find(i => i.id === groupId)?.label || 'Danh mục';
  return findByPath(menuItems, pathname)?.item.label || '';
};

/** Đường dẫn khi bấm nút quay lại: về nhóm cha nếu có, ngược lại về trang chủ */
export const getMobileBackPath = (menuItems: MenuItem[], pathname: string) => {
  const found = findByPath(menuItems, pathname);
  if (found?.parent) return `/m/${found.parent.id}`;
  return '/';
};

/**
 * Lưới menu dạng icon cho mobile.
 * - "/"          : danh sách menu cấp 1
 * - "/m/:groupId": danh sách menu con của một nhóm
 */
export const MobileHome = ({ menuItems }: { menuItems: MenuItem[] }) => {
  const navigate = useNavigate();
  const { groupId } = useParams();

  const group = groupId ? menuItems.find(i => i.id === groupId) : undefined;
  if (groupId && !group) return <Navigate to="/" replace />;

  const items = group ? (group.subItems || []) : menuItems;

  return (
    <div className="p-4 pb-24 animate-fade-in">
      {!group && (
        <div className="rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 text-white px-5 py-5 mb-6 shadow-sm flex items-center gap-4">
          <img
            src={APP_LOGO_SRC}
            alt="Logo"
            className="w-16 h-16 shrink-0 rounded-full object-contain bg-white shadow-md ring-2 ring-white/70"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div className="min-w-0">
            <p className="text-base font-bold uppercase tracking-wide leading-loose">QUẢN LÝ NHÂN SỰ</p>
            <p className="text-base font-bold uppercase tracking-wide leading-loose">KHOA HỒI SỨC NGOẠI</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-x-3 gap-y-6">
        {items.map((item, index) => {
          const style = TILE_STYLES[index % TILE_STYLES.length];
          const Icon = item.icon || LayoutGrid;
          return (
            <button
              key={item.id}
              onClick={() => navigate(targetPath(item))}
              className="group flex flex-col items-center gap-2 focus:outline-none"
            >
              <div
                className={`w-16 h-16 rounded-2xl ${style.bg} ${style.shadow} flex items-center justify-center
                  border border-white/70 ring-1 ring-inset ring-white/60 shadow-lg
                  transition-all duration-150
                  group-active:translate-y-0.5 group-active:shadow-md group-active:brightness-95`}
              >
                <Icon size={28} strokeWidth={2} className={`${style.icon} drop-shadow-sm`} />
              </div>
              <span className={`text-[11px] font-semibold uppercase leading-tight text-center ${style.label}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Nút bên trái header trên mobile: menu (ở trang chủ) hoặc quay lại (trong module).
 */
export const MobileNavButton = ({
  menuItems,
  onOpenSidebar
}: {
  menuItems: MenuItem[];
  onOpenSidebar: () => void;
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';

  if (isHome) {
    return (
      <button
        onClick={onOpenSidebar}
        className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 lg:hidden"
        aria-label="Mở menu"
      >
        <Menu size={20} />
      </button>
    );
  }

  return (
    <button
      onClick={() => navigate(getMobileBackPath(menuItems, location.pathname))}
      className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 lg:hidden"
      aria-label="Quay lại"
    >
      <ArrowLeft size={20} />
    </button>
  );
};

/** Tiêu đề trang hiện tại, canh giữa header trên mobile */
export const MobileHeaderTitle = ({ menuItems }: { menuItems: MenuItem[] }) => {
  const location = useLocation();
  return (
    <div className="lg:hidden flex-1 min-w-0 px-2">
      <span className="font-bold text-slate-800 truncate block text-center">
        {getMobileTitle(menuItems, location.pathname)}
      </span>
    </div>
  );
};

/** Thanh điều hướng dưới cùng trên mobile: nút quay lại bên trái, trang chủ ở giữa */
export const MobileBottomNav = ({ menuItems }: { menuItems: MenuItem[] }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 h-16 bg-white border-t border-slate-200 flex items-center justify-center z-30">
      {!isHome && (
        <button
          onClick={() => navigate(getMobileBackPath(menuItems, location.pathname))}
          className="absolute left-4 flex flex-col items-center gap-0.5 px-4 py-1 text-slate-500 active:scale-95 transition-transform"
          aria-label="Quay lại"
        >
          <ArrowLeft size={22} strokeWidth={1.75} />
          <span className="text-[11px] font-medium">Quay lại</span>
        </button>
      )}
      <Link
        to="/"
        className={`flex flex-col items-center gap-0.5 px-6 py-1 ${isHome ? 'text-primary-600' : 'text-slate-400'}`}
      >
        <Home size={22} strokeWidth={1.75} />
        <span className="text-[11px] font-medium">Trang chủ</span>
      </Link>
    </nav>
  );
};
