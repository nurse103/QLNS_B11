/**
 * Minimal user type needed for ownership checks.
 */
interface OwnerUser {
    id: string;
    role: string;
}

/**
 * Checks if the current user has permission to modify (edit/delete) a record.
 * - Admin: can always modify any record.
 * - Other users: can only modify records they created (created_by matches their id).
 *
 * @param record - The record object, expected to have a `created_by` field.
 * @param user   - The currently logged-in user.
 * @returns true if the user can modify the record, false otherwise.
 */
export const canModify = (
    record: { created_by?: string | null },
    user: OwnerUser | null
): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return record.created_by === user.id;
};

/**
 * Dấu thanh tiếng Việt (huyền, sắc, ngã, hỏi, nặng) ở dạng tổ hợp Unicode.
 * KHÔNG gồm dấu tạo chữ (ˆ của â/ê/ô, ˘ của ă, ˒ của ơ/ư) vì đó là chữ khác nhau.
 */
const VN_TONE_MARKS = /[\u0300\u0301\u0303\u0309\u0323]/g;

/**
 * Chuẩn hoá họ tên tiếng Việt để so khớp.
 *
 * Xử lý được kiểu gõ dấu khác nhau ("Thúy" và "Thuý", "hoà" và "hòa") bằng cách
 * tách dấu thanh ra khỏi nguyên âm rồi gắn vào cuối từ, nhưng vẫn phân biệt
 * "Thắng" với "Thăng" vì hai từ đó khác nhau ở dấu thanh chứ không phải vị trí dấu.
 */
export const normalizeVietnameseName = (name?: string | null): string =>
    (name ?? '')
        .normalize('NFD')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .map(word => {
            const tones = (word.match(VN_TONE_MARKS) ?? []).sort().join('');
            return `${word.replace(VN_TONE_MARKS, '')}${tones ? `~${tones}` : ''}`;
        })
        .join(' ');

/**
 * Bản ghi nhân sự có đúng là hồ sơ của người đang đăng nhập không?
 * Đối chiếu theo họ tên vì bảng users không có khoá liên kết sang dsnv.
 */
export const isOwnPersonnelRecord = (
    employee: { ho_va_ten?: string | null },
    user: { full_name?: string | null } | null
): boolean => {
    const employeeName = normalizeVietnameseName(employee?.ho_va_ten);
    const userName = normalizeVietnameseName(user?.full_name);
    return !!employeeName && employeeName === userName;
};

/**
 * Quyền sửa thông tin cá nhân trong hồ sơ nhân sự (bảng dsnv):
 * - Admin: sửa được hồ sơ của bất kỳ ai.
 * - Người dùng khác: chỉ sửa được hồ sơ mang đúng họ tên của mình.
 */
export const canEditPersonnelRecord = (
    employee: { ho_va_ten?: string | null },
    user: { role?: string; full_name?: string | null } | null
): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return isOwnPersonnelRecord(employee, user);
};
