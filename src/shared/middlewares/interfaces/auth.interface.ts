/**
 * Interface representing the response from token validation endpoint.
 * @interface TokenValidationResponse 
 */
export interface TokenValidationResponse {
    /** Indicates if the token is valid */
    is_valid: boolean;

    /** Message describing the validation result */
    message: string;

    /** Object containing user status information */
    user_status: {
        /** Indicates if the user account is active */
        is_active: boolean;

        /** Indicates if the user's email has been verified */
        is_email_verified: boolean;

        /** Current status of the authentication token */
        token_status: string;
    }
}