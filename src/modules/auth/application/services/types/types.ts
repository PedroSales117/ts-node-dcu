export interface TokenResponse {
    access_token: string;
    refresh_token: string;
    remember_me_token?: string;
}

export interface TokenValidationResponse {
    user?: UserResult;
    is_valid: boolean;
    message: string;
    user_status?: {
        is_active: boolean;
        is_email_verified: boolean;
        token_status: 'valid' | 'revoked' | 'expired' | 'invalid';
    };
}

export interface UserResult {
    id: string;
    email: string;
    password?: string;
    full_name?: string | null;
    role?: string;
    is_active: boolean;
    is_email_verified: boolean;
    email_verification_token?: string | null;
}

export const TOKEN_TYPES = {
    REMEMBER_ME: 'remember_me',
    ACCESS: 'access',
    REFRESH: 'refresh',
    ADMIN_ACCESS: 'admin_access',
    ADMIN_REFRESH: 'admin_refresh'
} as const;