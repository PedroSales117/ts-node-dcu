import { AdapterRequest, AdapterReply } from '../configurations/adapters/server.adapter';
import { FileRateLimitAdapter } from '../configurations/adapters/rate-limit.adapter';
import { HttpStatus } from '../helpers/http-status.helper';
import logger from '../utils/logger';
import { CookieService } from '../services/Cookie.service';

interface RateLimitConfig {
    authenticatedLimit: number;
    unauthenticatedLimit: number;
    authWindowSeconds: number;
    unauthWindowSeconds: number;
}

export class RateLimitMiddleware {
    private storage: FileRateLimitAdapter;
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

        this.storage = new FileRateLimitAdapter(this.defaultConfig);
        this.setupPeriodicCleanup();
    }

    /**
     * Validates the rate limit configuration.
     * @param {RateLimitConfig} config - The rate limit configuration to validate.
     * @throws {Error} If the configuration is invalid.
     */
    private validateConfig(config: RateLimitConfig): void {
        if (isNaN(config.authenticatedLimit) || isNaN(config.unauthenticatedLimit) ||
            isNaN(config.authWindowSeconds) || isNaN(config.unauthWindowSeconds)) {
            throw new Error('Invalid rate limit configuration');
        }
    }

    /**
     * Sets up periodic cleanup of old rate limit records.
     * @private
     */
    private setupPeriodicCleanup(): void {
        setInterval(() => {
            this.storage.cleanupOldRecords()
                .catch(error => logger.error('Failed to cleanup rate limit records', { error }));
        }, 60 * 60 * 1000);
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
     * @returns {Promise<void>}
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
            logger.error('Rate limit check failed', { error });
        }
    }
}