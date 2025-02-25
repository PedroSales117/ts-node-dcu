import { CookieAdapter, ICookieOptions } from '../configurations/adapters/cookie.adapter';
import { AdapterRequest, AdapterReply } from '../configurations/adapters/server.adapter';
import { Err, Ok, Result } from '../core/Result';
import logger from '../utils/logger';

export class CookieService {
    private cookieAdapter: CookieAdapter;

    constructor() {
        this.cookieAdapter = new CookieAdapter();
    }

    setSessionCookie(
        reply: AdapterReply,
        value: string,
        options?: ICookieOptions
    ): Result<void, Error> {
        logger.info('Setting session cookie');
        return this.cookieAdapter.setCookie(reply, 'session', value, {
            maxAge: 24 * 60 * 60 * 1000,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            ...options,
        });
    }

    getSessionCookie(request: AdapterRequest): Result<string | undefined, Error> {
        return this.cookieAdapter.getCookie(request, 'session');
    }

    clearSessionCookie(reply: AdapterReply): Result<void, Error> {
        return this.cookieAdapter.clearCookie(reply, 'session');
    }

    setCookie(
        reply: AdapterReply,
        name: string,
        value: string,
        options?: ICookieOptions
    ): Result<void, Error> {
        logger.info(`Setting cookie: ${name}`);
        const defaultPath = name === 'email' ? '/' : '/';
        return this.cookieAdapter.setCookie(reply, name, value, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: defaultPath,
            ...options,
        });
    }

    getCookie(request: any, key: string): { isErr: () => boolean, value?: string } {
        if (request.cookies && request.cookies[key]) {
            return { isErr: () => false, value: request.cookies[key] };
        }
        const cookieHeader = request.headers['cookie'] || '';
        const parsedCookies = cookieHeader.split(';').reduce((cookies: Record<string, string>, item: string) => {
            const [cookieKey, cookieVal] = item.split('=');
            if (cookieKey && cookieVal) {
                cookies[cookieKey.trim()] = decodeURIComponent(cookieVal.trim());
            }
            return cookies;
        }, {});
        if (parsedCookies[key]) {
            return { isErr: () => false, value: parsedCookies[key] };
        }
        return { isErr: () => true };
    }

    clearCookie(
        reply: AdapterReply,
        name: string,
        options?: ICookieOptions
    ): Result<void, Error> {
        logger.info(`Clearing cookie: ${name}`);
        const defaultPath = name === 'email' ? '/' : '/';
        return this.cookieAdapter.clearCookie(reply, name, {
            path: defaultPath,
            ...options,
        });
    }

    setAuthCookie(
        reply: AdapterReply,
        name: string,
        value: string,
        expirationHours: number
    ): Result<void, Error> {
        logger.info(`Setting auth cookie: ${name}`);
        return this.setCookie(reply, name, value, {
            maxAge: expirationHours * 60 * 60 * 1000,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            sameSite: 'strict',
            domain: process.env.NODE_ENV === 'production' ? 'biasales.com.br' : undefined,
        });
    }

    clearAllAuthCookies(reply: AdapterReply, email: string): Result<void, Error> {
        logger.info('Clearing all auth cookies');
        try {
            this.clearSessionCookie(reply);
            if (email !== 'guest') {
                this.clearCookie(reply, 'email', { path: '/' });
            }
            this.clearCookie(reply, 'refresh_token', { path: '/' });
            this.clearCookie(reply, 'remember_me_token', { path: '/' });
            return Ok(undefined);
        } catch (error) {
            logger.error('Error clearing auth cookies:', { error });
            return Err(new Error(`Failed to clear auth cookies: ${error.message}`));
        }
    }

    setAdminSessionCookie(
        reply: AdapterReply,
        value: string,
    ): Result<void, Error> {
        logger.info('Setting session cookie');
        return this.cookieAdapter.setCookie(reply, 'session', value, {
            maxAge: 24 * 60 * 60 * 1000,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/api/admin',
            domain: process.env.NODE_ENV === 'production' ? 'portal.biasales.com.br' : undefined,
        });
    }

    setAdminAuthCookie(
        reply: AdapterReply,
        name: string,
        value: string,
        expirationHours: number
    ): Result<void, Error> {
        logger.info(`Setting auth cookie: ${name}`);
        return this.setCookie(reply, name, value, {
            maxAge: expirationHours * 60 * 60 * 1000,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/api/admin',
            sameSite: 'strict',
            domain: process.env.NODE_ENV === 'production' ? 'portal.biasales.com.br' : undefined,
        });
    }

    clearAllAdminAuthCookies(reply: AdapterReply): Result<void, Error> {
        logger.info('Clearing all auth cookies');
        try {
            this.clearSessionCookie(reply);
            this.clearCookie(reply, 'admin_access', { path: '/api/admin' });
            this.clearCookie(reply, 'admin_refresh_token', { path: '/api/admin' });
            return Ok(undefined);
        } catch (error) {
            logger.error('Error clearing auth cookies:', { error });
            return Err(new Error(`Failed to clear auth cookies: ${error.message}`));
        }
    }

    setMultipleCookies(
        reply: AdapterReply,
        cookies: Array<{ name: string; value: string; options?: ICookieOptions }>
    ): Result<void, Error> {
        logger.info('Setting multiple cookies');
        try {
            cookies.forEach(({ name, value, options }) => {
                this.setCookie(reply, name, value, options);
            });
            return Ok(undefined);
        } catch (error) {
            logger.error('Error setting multiple cookies:', { error });
            return Err(new Error(`Failed to set multiple cookies: ${error.message}`));
        }
    }
}