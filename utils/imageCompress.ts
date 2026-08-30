/**
 * Nén ảnh phía trình duyệt trước khi tải lên storage.
 *
 * Ảnh chụp từ điện thoại thường 3-8 MB, trong khi ảnh 3x4 in trên phiếu đảng viên
 * chỉ cần khoảng 600x800 px là đã nét hơn mức máy in cần. Nén trước giúp:
 *  - tải lên nhanh, đỡ tốn dung lượng bucket
 *  - file .docx xuất ra nhẹ (ảnh được nhúng thẳng vào tài liệu)
 */

export interface CompressOptions {
    /** Chiều rộng tối đa sau khi thu nhỏ (px). */
    maxWidth?: number;
    /** Chiều cao tối đa sau khi thu nhỏ (px). */
    maxHeight?: number;
    /** Chất lượng JPEG 0-1. */
    quality?: number;
}

const loadBitmap = async (file: File): Promise<ImageBitmap | HTMLImageElement> => {
    // createImageBitmap xử lý luôn EXIF orientation (ảnh chụp dọc từ điện thoại)
    if (typeof createImageBitmap === 'function') {
        try {
            return await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
        } catch {
            /* rơi xuống cách dùng <img> bên dưới */
        }
    }

    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Không đọc được ảnh'));
        };
        img.src = url;
    });
};

/**
 * Thu nhỏ và nén ảnh về JPEG.
 * Nếu nén không có lợi (kết quả không nhỏ hơn) hoặc trình duyệt không xử lý được
 * định dạng đó thì trả lại file gốc để không làm hỏng luồng tải lên.
 */
export const compressImage = async (file: File, options: CompressOptions = {}): Promise<File> => {
    const { maxWidth = 600, maxHeight = 800, quality = 0.82 } = options;

    if (!file.type.startsWith('image/')) return file;

    try {
        const source = await loadBitmap(file);
        const srcW = 'width' in source ? source.width : 0;
        const srcH = 'height' in source ? source.height : 0;
        if (!srcW || !srcH) return file;

        const scale = Math.min(1, maxWidth / srcW, maxHeight / srcH);
        const width = Math.max(1, Math.round(srcW * scale));
        const height = Math.max(1, Math.round(srcH * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return file;

        // Nền trắng: ảnh PNG nền trong suốt chuyển sang JPEG sẽ thành đen nếu không tô nền
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(source as CanvasImageSource, 0, 0, width, height);
        if ('close' in source && typeof source.close === 'function') source.close();

        const blob = await new Promise<Blob | null>(resolve =>
            canvas.toBlob(resolve, 'image/jpeg', quality)
        );
        if (!blob || blob.size >= file.size) return file;

        const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
        return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
    } catch (error) {
        console.warn('Không nén được ảnh, dùng file gốc:', error);
        return file;
    }
};
