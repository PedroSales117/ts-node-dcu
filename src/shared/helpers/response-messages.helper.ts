/**
 * Interface representing a standardized service response
 * @template T - Type of the optional data payload
 */
export interface ServiceResponse<T = void> {
    /** Unique identifier code for the response */
    code: string;
    /** Human-readable message describing the response */
    message: string;
    /** Optional data payload of type T */
    data?: T;
}

/**
 * Constant object containing all possible response messages
 * @readonly
 */
export const ResponseMessages = Object.freeze({
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR'
} as const);

/**
 * Type representing valid response message values
 * Derived from the ResponseMessages object keys
 */
export type ResponseMessage = typeof ResponseMessages[keyof typeof ResponseMessages];