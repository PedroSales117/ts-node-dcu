/** 
 * Enum containing standard cookie names used throughout the application
 * @enum {string}
 */
export enum CookieNames {
    /** Cookie storing the user's session data */
    SESSION = 'session',
    /** Cookie storing the user's email */
    EMAIL = 'email',
    /** Cookie storing the refresh token for authentication */
    REFRESH_TOKEN = 'refresh_token',
    /** Cookie storing the remember me token for persistent sessions */
    REMEMBER_ME_TOKEN = 'remember_me_token'
}

/**
 * Enum containing standard cookie paths used in the application
 * @enum {string}
 */
export enum CookiePaths {
    /** Root path for cookies that should be accessible across all routes */
    ROOT = '/'
}
