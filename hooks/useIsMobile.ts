import { useState, useEffect } from 'react';

/**
 * Trả về true khi màn hình nhỏ hơn breakpoint (mặc định 1024px - mốc `lg` của Tailwind).
 * Dùng để chuyển sang giao diện mobile (lưới icon + nút quay lại).
 */
export const useIsMobile = (breakpoint = 1024) => {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < breakpoint
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);

  return isMobile;
};
