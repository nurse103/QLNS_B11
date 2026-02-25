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
