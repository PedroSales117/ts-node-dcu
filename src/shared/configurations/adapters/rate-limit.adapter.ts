import { RedisClient } from '../../clients/Redis.client';
import logger from '../../utils/logger';
import { IIPRecord, IRateLimitStorage } from './interfaces/IRateLimit';

/**
 * RateLimit configuration options.
 */
interface RateLimitConfig {
    authenticatedLimit: number;
    unauthenticatedLimit: number;
    authWindowSeconds: number;
    unauthWindowSeconds: number;
}

/**
 * Rate limit result structure.
 */
interface RateLimitResult {
    limitExceeded: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
    retryAfter: number;
}

/**
 * Adapter for handling rate limiting using Redis.
 * Implements IRateLimitStorage interface.
 */
export class RedisRateLimitAdapter implements IRateLimitStorage {
    private readonly redis;
    private readonly AUTHENTICATED_LIMIT: number;
    private readonly UNAUTHENTICATED_LIMIT: number;
    private readonly AUTH_WINDOW_SECONDS: number;
    private readonly UNAUTH_WINDOW_SECONDS: number;
    private readonly RECORDS_PREFIX = 'rate-limit:';
    private readonly BLACKLIST_KEY = 'rate-limit:blacklist';

    /**
     * Creates an instance of RedisRateLimitAdapter.
     * @param config - The rate limit configuration options.
     */
    constructor(config: RateLimitConfig) {
        const redisClient = RedisClient.getInstance();
        this.redis = redisClient.getClient();
        this.AUTHENTICATED_LIMIT = config.authenticatedLimit;
        this.UNAUTHENTICATED_LIMIT = config.unauthenticatedLimit;
        this.AUTH_WINDOW_SECONDS = config.authWindowSeconds;
        this.UNAUTH_WINDOW_SECONDS = config.unauthWindowSeconds;

        // Ensure Redis is connected
        this.ensureConnection();
    }

    /**
     * Ensures that the Redis connection is open.
     * @returns A promise that resolves when a connection is ensured.
     */
    private async ensureConnection(): Promise<void> {
        try {
            if (!this.redis.isOpen) {
                await RedisClient.getInstance().connect();
            }
        } catch (error) {
            logger.error('Failed to ensure Redis connection', { error });
            throw new Error('Redis connection failed');
        }
    }

    /**
     * Executes a Redis operation ensuring connection and retry in case of connection issues.
     * @param operation - The operation to execute.
     * @returns The result of the operation.
     */
    private async executeRedisOperation<T>(operation: () => Promise<T>): Promise<T> {
        await this.ensureConnection();
        try {
            return await operation();
        } catch (error) {
            if (error instanceof Error && error.message.includes('client is closed')) {
                await this.ensureConnection();
                return await operation();
            }
            throw error;
        }
    }

    /**
     * Generates the Redis key for a given IP.
     * @param ip - The IP address.
     * @returns The Redis key string.
     */
    private getRecordKey(ip: string): string {
        return `${this.RECORDS_PREFIX}${ip}`;
    }

    /**
     * Retrieves the rate limiting record for a given IP.
     * @param ip - The IP address.
     * @returns A promise that resolves to the IIPRecord or null if not found.
     * @throws Error if the IP is blacklisted.
     */
    async getRecord(ip: string): Promise<IIPRecord | null> {
        return this.executeRedisOperation(async () => {
            const isBlacklisted = await this.redis.sIsMember(this.BLACKLIST_KEY, ip);
            if (isBlacklisted) {
                throw new Error('IP is blacklisted');
            }

            const record = await this.redis.get(this.getRecordKey(ip));
            if (!record) return null;

            const parsed = JSON.parse(record) as IIPRecord;
            parsed.lastReset = new Date(parsed.lastReset);

            const timeWindow = parsed.isAuthenticated ? this.AUTH_WINDOW_SECONDS : this.UNAUTH_WINDOW_SECONDS;
            const windowAgo = new Date(Date.now() - timeWindow * 1000);

            if (parsed.lastReset < windowAgo) {
                await this.resetRecord(ip);
                const newRecord = await this.redis.get(this.getRecordKey(ip));
                return newRecord ? JSON.parse(newRecord) : null;
            }

            return parsed;
        });
    }

    /**
     * Increments the request count for a given IP and handles violation logic.
     * @param ip - The IP address.
     * @param isAuthenticated - Flag indicating if the IP belongs to an authenticated user.
     * @returns A promise that resolves when the record is updated.
     */
    async incrementRecord(ip: string, isAuthenticated: boolean): Promise<void> {
        return this.executeRedisOperation(async () => {
            let record = await this.getRecord(ip);

            if (!record) {
                record = {
                    ip,
                    requests: 0,
                    lastReset: new Date(),
                    isAuthenticated,
                    violations: 0
                };
            }

            record.requests++;
            record.isAuthenticated = isAuthenticated;

            const limit = isAuthenticated ? this.AUTHENTICATED_LIMIT : this.UNAUTHENTICATED_LIMIT;
            if (record.requests > limit) {
                record.violations++;
                if (record.violations >= 3) {
                    await this.addToBlacklist(ip);
                }
            }

            await this.redis.set(
                this.getRecordKey(ip),
                JSON.stringify(record),
                { EX: this.AUTH_WINDOW_SECONDS }
            );
        });
    }

    /**
     * Resets the rate limiting record for a given IP.
     * @param ip - The IP address.
     * @returns A promise that resolves when the record is reset.
     */
    async resetRecord(ip: string): Promise<void> {
        return this.executeRedisOperation(async () => {
            const record = await this.getRecord(ip);
            if (record) {
                record.requests = 0;
                record.lastReset = new Date();
                record.violations = 0;
                await this.redis.set(
                    this.getRecordKey(ip),
                    JSON.stringify(record),
                    { EX: this.AUTH_WINDOW_SECONDS }
                );
            }
        });
    }

    /**
     * Adds an IP to the blacklist.
     * @param ip - The IP address.
     * @returns A promise that resolves when the IP is added to the blacklist.
     */
    async addToBlacklist(ip: string): Promise<void> {
        return this.executeRedisOperation(async () => {
            await this.redis.sAdd(this.BLACKLIST_KEY, ip);
        });
    }

    /**
     * Removes an IP from the blacklist.
     * @param ip - The IP address.
     * @returns A promise that resolves when the IP is removed from the blacklist.
     */
    async removeFromBlacklist(ip: string): Promise<void> {
        return this.executeRedisOperation(async () => {
            await this.redis.sRem(this.BLACKLIST_KEY, ip);
        });
    }

    /**
     * Checks the current rate limit status for a given IP.
     * Increments the record if the limit is not yet exceeded.
     * @param ip - The IP address.
     * @param isAuthenticated - Flag indicating if the IP belongs to an authenticated user.
     * @returns A promise that resolves to the rate limit result.
     */
    async checkRateLimit(ip: string, isAuthenticated: boolean): Promise<RateLimitResult> {
        return this.executeRedisOperation(async () => {
            const record = await this.getRecord(ip);
            const limit = isAuthenticated ? this.AUTHENTICATED_LIMIT : this.UNAUTHENTICATED_LIMIT;
            const windowSeconds = isAuthenticated ? this.AUTH_WINDOW_SECONDS : this.UNAUTH_WINDOW_SECONDS;

            if (record && record.requests >= limit) {
                const resetTime = new Date(record.lastReset.getTime() + (windowSeconds * 1000));
                const timeLeft = Math.ceil((resetTime.getTime() - Date.now()) / 1000);

                return {
                    limitExceeded: true,
                    limit,
                    remaining: 0,
                    resetTime: Math.ceil(resetTime.getTime() / 1000),
                    retryAfter: timeLeft
                };
            }

            await this.incrementRecord(ip, isAuthenticated);

            const currentRecord = await this.getRecord(ip);
            const remaining = currentRecord ? limit - currentRecord.requests : limit;

            return {
                limitExceeded: false,
                limit,
                remaining,
                resetTime: currentRecord ? Math.ceil((currentRecord.lastReset.getTime() + (windowSeconds * 1000)) / 1000) : 0,
                retryAfter: 0
            };
        });
    }
}