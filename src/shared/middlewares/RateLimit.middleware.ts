import { AdapterRequest, AdapterReply } from '../configurations/adapters/server.adapter';
import { RedisRateLimitAdapter } from '../configurations/adapters/rate-limit.adapter';
import { HttpStatus } from '../helpers/http-status.helper';
import logger from '../utils/logger';
import { CookieService } from '../services/Cookie.service';

/**
 * Configuration for rate limits.
 */
interface RateLimitConfig {
    authenticatedLimit: number;
    unauthenticatedLimit: number;
    authWindowSeconds: number;
    unauthWindowSeconds: number;
}

/**
 * Middleware that checks and enforces rate limits using Redis.
 */
export class RateLimitMiddleware {
    private storage: RedisRateLimitAdapter;
    private readonly defaultConfig: RateLimitConfig;

    /**
     * Constructs a new RateLimitMiddleware.
     * @param {RateLimitConfig} config - Configuration for rate limits.
     */
    constructor(config: RateLimitConfig) {
        this.defaultConfig = {
            authenticatedLimit: config.authenticatedLimit,
            unauthenticatedLimit: config.unauthenticatedLimit,
            authWindowSeconds: config.authWindowSeconds,
            unauthWindowSeconds: config.unauthWindowSeconds,
        };

        this.validateConfig(this.defaultConfig);
        this.storage = new RedisRateLimitAdapter(this.defaultConfig);
    }

    /**
     * Validates the rate limit configuration.
     * @param {RateLimitConfig} config - The rate limit configuration to validate.
     * @throws {Error} If the configuration is invalid.
     * @private
     */
    private validateConfig(config: RateLimitConfig): void {
        if (isNaN(config.authenticatedLimit) || isNaN(config.unauthenticatedLimit) ||
            isNaN(config.authWindowSeconds) || isNaN(config.unauthWindowSeconds)) {
            throw new Error('Invalid rate limit configuration');
        }
    }

    /**
     * Retrieves the client IP address from the request.
     * @param {AdapterRequest} request - The incoming request.
     * @returns {string} The client IP address.
     * @private
     */
    private getClientIP(request: AdapterRequest): string {
        const forwardedFor = request.headers['x-forwarded-for'];
        if (typeof forwardedFor === 'string') {
            return forwardedFor.split(',')[0].trim();
        }
        return request.ip || '127.0.0.1';
    }

    /**
     * Checks if the request is authenticated based on the presence of a session cookie.
     * @param {AdapterRequest} request - The incoming request.
     * @returns {boolean} True if the request is authenticated, false otherwise.
     * @private
     */
    private isAuthenticated(request: AdapterRequest): boolean {
        const cookieService = new CookieService();
        const result = cookieService.getSessionCookie(request);
        return !result.isErr();
    }

    /**
     * Calculates the reset time for the rate limit window.
     * @param {Date} lastResetTime - The last reset time of the rate limit.
     * @param {number} windowSeconds - The duration of the rate limit window in seconds.
     * @returns {number} The reset time as a Unix timestamp.
     * @private
     */
    private calculateResetTime(lastResetTime: Date, windowSeconds: number): number {
        const windowMs = windowSeconds * 1000;
        const resetTime = new Date(lastResetTime.getTime() + windowMs);
        return Math.ceil(resetTime.getTime() / 1000);
    }

    /**
     * Checks the rate limit for the incoming request and updates the response headers accordingly.
     * @param {AdapterRequest} request - The incoming request.
     * @param {AdapterReply} reply - The response object.
     * @returns {Promise<void>} A promise that resolves when the rate limit check is complete.
     */
    async checkRateLimit(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            const clientIP = this.getClientIP(request);
            const isAuthenticated = this.isAuthenticated(request);

            const limitConfig = {
                authenticatedLimit: this.defaultConfig.authenticatedLimit,
                unauthenticatedLimit: this.defaultConfig.unauthenticatedLimit,
                authWindowSeconds: this.defaultConfig.authWindowSeconds,
                unauthWindowSeconds: this.defaultConfig.unauthWindowSeconds
            };

            const limit = isAuthenticated ? limitConfig.authenticatedLimit : limitConfig.unauthenticatedLimit;
            const windowSeconds = isAuthenticated ? limitConfig.authWindowSeconds : limitConfig.unauthWindowSeconds;

            try {
                const record = await this.storage.getRecord(clientIP);

                if (record) {
                    if (record.requests >= limit) {
                        const resetTime = new Date(record.lastReset.getTime() + (windowSeconds * 1000));
                        const timeLeft = Math.ceil((resetTime.getTime() - Date.now()) / 1000);

                        reply
                            .status(HttpStatus.TOO_MANY_REQUESTS)
                            .headers({
                                'X-RateLimit-Limit': limit.toString(),
                                'X-RateLimit-Remaining': '0',
                                'X-RateLimit-Reset': this.calculateResetTime(record.lastReset, windowSeconds).toString(),
                                'Retry-After': timeLeft.toString()
                            })
                            .send({
                                error: 'Rate limit exceeded',
                                message: `Please try again in ${timeLeft} seconds`,
                                type: isAuthenticated ? 'authenticated' : 'unauthenticated'
                            });
                        return;
                    }
                }

                await this.storage.incrementRecord(clientIP, isAuthenticated);

                const currentRecord = await this.storage.getRecord(clientIP);
                if (currentRecord) {
                    const resetTimestamp = this.calculateResetTime(currentRecord.lastReset, windowSeconds);

                    reply.headers({
                        'X-RateLimit-Limit': limit.toString(),
                        'X-RateLimit-Remaining': (limit - currentRecord.requests).toString(),
                        'X-RateLimit-Reset': resetTimestamp.toString()
                    });
                }

            } catch (error) {
                if (error instanceof Error) {
                    if (error.message === 'IP is blacklisted') {
                        reply
                            .status(HttpStatus.FORBIDDEN)
                            .headers({
                                'X-RateLimit-Blocked': 'true',
                                'X-RateLimit-Block-Reason': 'blacklisted'
                            })
                            .send({
                                error: 'Access Denied',
                                message: 'Your IP has been blacklisted due to excessive violations',
                                type: 'blacklisted'
                            });
                        return;
                    }
                    // Redis connection errors or other storage-related errors
                    logger.error('Rate limit storage error', {
                        error: error.message,
                        ip: clientIP,
                        stack: error.stack
                    });
                    throw error;
                }
                throw error;
            }

        } catch (error) {
            logger.error('Rate limit check failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            });

            reply
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .headers({
                    'X-RateLimit-Error': 'true'
                })
                .send({
                    error: 'Internal Server Error',
                    message: 'Rate limit service unavailable'
                });
        }
    }
}