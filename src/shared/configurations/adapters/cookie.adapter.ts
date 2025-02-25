import { AdapterRequest, AdapterReply } from './server.adapter';
import { Result, Ok, Err } from '../../core/Result';

export interface ICookieOptions {
    maxAge?: number;
    signed?: boolean;
    expires?: Date;
    httpOnly?: boolean;
    path?: string;
    domain?: string;
    secure?: boolean;
    sameSite?: boolean | 'lax' | 'strict' | 'none';
}

export class CookieAdapter {
    setCookie(
        reply: AdapterReply,
        name: string,
        value: string,
        options?: ICookieOptions
    ): Result<void, Error> {
        try {
            reply.setCookie(name, value, {
                path: '/',
                secure: process.env.NODE_ENV === 'production',
                httpOnly: true,
                sameSite: 'strict',
                ...options,
            });
            return Ok(undefined);
        } catch (error) {
            return Err(new Error(`Failed to set cookie: ${error.message}`));
        }
    }

    getCookie(request: AdapterRequest, name: string): Result<string | undefined, Error> {
        try {
            const value = request.cookies[name];
            return Ok(value);
        } catch (error) {
            return Err(new Error(`Failed to get cookie: ${error.message}`));
        }
    }

    clearCookie(
        reply: AdapterReply,
        name: string,
        options?: ICookieOptions
    ): Result<void, Error> {
        try {
            reply.clearCookie(name, {
                path: '/',
                ...options,
            });
            return Ok(undefined);
        } catch (error) {
            return Err(new Error(`Failed to clear cookie: ${error.message}`));
        }
    }
}