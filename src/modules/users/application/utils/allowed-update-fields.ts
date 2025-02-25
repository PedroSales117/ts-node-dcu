import { Err, Ok, Result } from "../../../../shared/core/Result";
import { User } from "../../domain/entities/User";

export type AllowedUpdates = Omit<User, 'id' | 'email' | 'password' | 'role' | 'email_verification_code' | 'email_verification_expires_at'>;

/**
 * Validates update data to ensure only allowed fields are present
 * @param updates - Object containing updates to validate
 * @returns Result indicating if the updates are valid
 */
export function validateUpdates(updates: Partial<User>): Result<void, Error> {
    const allowedFields = ['full_name'];

    const updateFields = Object.keys(updates);
    const invalidFields = updateFields.filter(field => !allowedFields.includes(field));

    if (invalidFields.length > 0) {
        return Err(new Error(`Invalid update fields: ${invalidFields.join(', ')}`));
    }

    return Ok(void 0);
}
