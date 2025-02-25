import { CookieAdapter, ICookieOptions } from '../configurations/adapters/cookie.adapter';
import { AdapterRequest, AdapterReply } from '../configurations/adapters/server.adapter';
import { Err, Ok, Result } from '../core/Result';
import logger from '../utils/logger';
import { CookiePaths, CookieNames } from './enums/cookies.enum';

/** Default cookie configuration options */
const DEFAULT_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: CookiePaths.ROOT
} as const;

/** Enhanced security options for authentication cookies */
const AUTH_COOKIE_OPTIONS = {
    ...DEFAULT_COOKIE_OPTIONS,
    sameSite: 'strict' as const,
    domain: process.env.NODE_ENV === 'production' ? process.env.DOMAIN : undefined
};

/** Milliseconds in one day */
const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

/**
 * Service for managing HTTP cookies in the application
 */
export class CookieService {
    private cookieAdapter: CookieAdapter;

    constructor() {
        this.cookieAdapter = new CookieAdapter();
    }

    /**
     * Sets a session cookie with the provided value
     * @param {AdapterReply} reply - Server response object
     * @param {string} value - Value to store in the cookie
     * @param {ICookieOptions} [options] - Optional cookie configuration
     * @returns {Result<void, Error>} Operation result
     */
    setSessionCookie(
        reply: AdapterReply,
        value: string,
        options?: ICookieOptions
    ): Result<void, Error> {
        logger.info('Setting session cookie');
        return this.cookieAdapter.setCookie(reply, CookieNames.SESSION, value, {
            ...DEFAULT_COOKIE_OPTIONS,
            maxAge: ONE_DAY_IN_MS,
            ...options,
        });
    }

    /**
     * Retrieves the session cookie value
     * @param {AdapterRequest} request - Server request object
     * @returns {Result<string | undefined, Error>} Session cookie value if exists
     */
    getSessionCookie(request: AdapterRequest): Result<string | undefined, Error> {
        return this.cookieAdapter.getCookie(request, CookieNames.SESSION);
    }

    /**
     * Removes the session cookie
     * @param {AdapterReply} reply - Server response object
     * @returns {Result<void, Error>} Operation result
     */
    clearSessionCookie(reply: AdapterReply): Result<void, Error> {
        return this.cookieAdapter.clearCookie(reply, CookieNames.SESSION);
    }

    /**
     * Sets a cookie with the specified name and value
     * @param {AdapterReply} reply - Server response object
     * @param {string} name - Cookie name
     * @param {string} value - Cookie value
     * @param {ICookieOptions} [options] - Optional cookie configuration
     * @returns {Result<void, Error>} Operation result
     */
    setCookie(
        reply: AdapterReply,
        name: string,
        value: string,
        options?: ICookieOptions
    ): Result<void, Error> {
        logger.info(`Setting cookie: ${name}`);
        return this.cookieAdapter.setCookie(reply, name, value, {
            ...DEFAULT_COOKIE_OPTIONS,
            ...options,
        });
    }

    /**
     * Retrieves a cookie value by key
     * @param {AdapterRequest} request - Server request object
     * @param {string} key - Cookie name to retrieve
     * @returns {Result<string | undefined, Error>} Cookie value if exists
     */
    getCookie(request: AdapterRequest, key: string): Result<string | undefined, Error> {
        return this.cookieAdapter.getCookie(request, key);
    }

    /**
     * Removes a specific cookie
     * @param {AdapterReply} reply - Server response object
     * @param {string} name - Cookie name to clear
     * @param {ICookieOptions} [options] - Optional cookie configuration
     * @returns {Result<void, Error>} Operation result
     */
    clearCookie(
        reply: AdapterReply,
        name: string,
        options?: ICookieOptions
    ): Result<void, Error> {
        logger.info(`Clearing cookie: ${name}`);
        return this.cookieAdapter.clearCookie(reply, name, {
            ...DEFAULT_COOKIE_OPTIONS,
            ...options,
        });
    }

    /**
     * Sets an authentication cookie with specified expiration
     * @param {AdapterReply} reply - Server response object
     * @param {string} name - Cookie name
     * @param {string} value - Cookie value
     * @param {number} expirationHours - Hours until cookie expires
     * @returns {Result<void, Error>} Operation result
     */
    setAuthCookie(
        reply: AdapterReply,
        name: string,
        value: string,
        expirationHours: number
    ): Result<void, Error> {
        logger.info(`Setting auth cookie: ${name}`);
        return this.setCookie(reply, name, value, {
            ...AUTH_COOKIE_OPTIONS,
            maxAge: expirationHours * 60 * 60 * 1000,
        });
    }

    /**
     * Clears all authentication-related cookies
     * @param {AdapterReply} reply - Server response object
     * @param {string} email - User's email
     * @returns {Result<void, Error>} Operation result
     */
    clearAllAuthCookies(reply: AdapterReply, email: string): Result<void, Error> {
        logger.info('Clearing all auth cookies');
        try {
            this.clearSessionCookie(reply);
            if (email !== 'guest') {
                this.clearCookie(reply, CookieNames.EMAIL);
            }
            this.clearCookie(reply, CookieNames.REFRESH_TOKEN);
            this.clearCookie(reply, CookieNames.REMEMBER_ME_TOKEN);
            return Ok(undefined);
        } catch (error) {
            logger.error('Error clearing auth cookies:', { error });
            return Err(new Error(`Failed to clear auth cookies: ${error.message}`));
        }
    }
}