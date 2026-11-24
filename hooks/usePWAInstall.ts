import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Sự kiện beforeinstallprompt có thể bắn trước khi React mount,
// nên bắt nó ngay khi module được nạp và giữ lại để dùng sau.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(fn => fn());

if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e as BeforeInstallPromptEvent;
        notify();
    });
    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        notify();
    });
}

const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true;

// iOS (Safari) không có beforeinstallprompt, phải hướng dẫn "Thêm vào MH chính" thủ công
const isIOS = () =>
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/**
 * Trạng thái cài đặt PWA:
 * - canInstall: trình duyệt (Chrome/Edge/Android) cho phép hiện hộp thoại cài đặt
 * - isIOS: cần hướng dẫn cài thủ công qua nút Chia sẻ
 * - installed: đang chạy dưới dạng ứng dụng đã cài
 */
export const usePWAInstall = () => {
    const [, forceUpdate] = useState(0);
    const [installed, setInstalled] = useState(isStandalone);

    useEffect(() => {
        const update = () => {
            setInstalled(isStandalone());
            forceUpdate(n => n + 1);
        };
        listeners.add(update);
        const mq = window.matchMedia('(display-mode: standalone)');
        mq.addEventListener('change', update);
        return () => {
            listeners.delete(update);
            mq.removeEventListener('change', update);
        };
    }, []);

    const promptInstall = async () => {
        if (!deferredPrompt) return false;
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        notify();
        return outcome === 'accepted';
    };

    return {
        canInstall: !installed && !!deferredPrompt,
        isIOS: !installed && isIOS(),
        installed,
        promptInstall,
    };
};
