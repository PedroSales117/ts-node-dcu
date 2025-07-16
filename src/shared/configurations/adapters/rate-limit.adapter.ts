import fs from 'fs/promises';
import path from 'path';
import logger from '../../utils/logger';
import { IIPRecord, IRateLimitStorage } from './interfaces/IRateLimit';

interface RateLimitConfig {
    authenticatedLimit: number;
    unauthenticatedLimit: number;
    authWindowSeconds: number;
    unauthWindowSeconds: number;
}

interface RateLimitResult {
    limitExceeded: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
    retryAfter: number;
}

/**
 * RateLimitAdapter provides rate limiting functionality using a file-based storage.
 */
export class RateLimitAdapter implements IRateLimitStorage {
    private readonly filePath: string;
    private readonly blacklistPath: string;
    private records: Map<string, IIPRecord>;
    private blacklist: Set<string>;
    private readonly AUTHENTICATED_LIMIT: number;
    private readonly UNAUTHENTICATED_LIMIT: number;
    private readonly AUTH_WINDOW_SECONDS: number;
    private readonly UNAUTH_WINDOW_SECONDS: number;

    /**
     * Constructs a new RateLimitAdapter.
     * @param {RateLimitConfig} config - Configuration for rate limits.
     */
    constructor(config: RateLimitConfig) {
        this.filePath = this.sanitizePath(path.join(process.cwd(), 'data', 'rate-limits.json'));
        this.blacklistPath = this.sanitizePath(path.join(process.cwd(), 'data', 'blacklist.json'));
        this.records = new Map();
        this.blacklist = new Set();
        this.AUTHENTICATED_LIMIT = config.authenticatedLimit;
        this.UNAUTHENTICATED_LIMIT = config.unauthenticatedLimit;
        this.AUTH_WINDOW_SECONDS = config.authWindowSeconds;
        this.UNAUTH_WINDOW_SECONDS = config.unauthWindowSeconds;
        this.init();
    }

    /**
     * Sanitizes a file path to prevent path injection vulnerabilities.
     * @param {string} filePath - The file path to sanitize.
     * @returns {string} The sanitized file path.
     */
    private sanitizePath(filePath: string): string {
        const sanitizedPath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
        if (!sanitizedPath.startsWith(path.resolve(process.cwd(), 'data'))) {
            throw new Error('Invalid file path');
        }
        return sanitizedPath;
    }

    /**
     * Initializes the rate limit storage by loading existing records and blacklist from files.
     * @private
     * @returns {Promise<void>}
     */
    private async init(): Promise<void> {
        try {
            await fs.mkdir(path.dirname(this.filePath), { recursive: true });

            try {
                const data = await fs.readFile(this.filePath, 'utf-8');
                const records = JSON.parse(data) as IIPRecord[];
                this.records = new Map(records.map(record => [record.ip, { ...record, lastReset: new Date(record.lastReset) }]));
            } catch (error) {
                await this.saveToFile();
            }

            try {
                const blacklistData = await fs.readFile(this.blacklistPath, 'utf-8');
                const blacklist = JSON.parse(blacklistData) as string[];
                this.blacklist = new Set(blacklist);
            } catch (error) {
                await this.saveBlacklistToFile();
            }
        } catch (error) {
            logger.error('Failed to initialize rate limit storage', { error });
            throw error;
        }
    }

    /**
     * Saves the current rate limit records to the file.
     * @private
     * @returns {Promise<void>}
     */
    private async saveToFile(): Promise<void> {
        try {
            const records = Array.from(this.records.values());
            await fs.writeFile(this.filePath, JSON.stringify(records, null, 2));
        } catch (error) {
            logger.error('Failed to save rate limit records', { error });
            throw error;
        }
    }

    /**
     * Saves the current blacklist to the file.
     * @private
     * @returns {Promise<void>}
     */
    private async saveBlacklistToFile(): Promise<void> {
        try {
            const blacklist = Array.from(this.blacklist);
            await fs.writeFile(this.blacklistPath, JSON.stringify(blacklist, null, 2));
        } catch (error) {
            logger.error('Failed to save blacklist', { error });
            throw error;
        }
    }

    /**
     * Retrieves the rate limit record for a given IP address.
     * @param {string} ip - The IP address to retrieve the record for.
     * @returns {Promise<IIPRecord | null>} The rate limit record or null if not found.
     */
    async getRecord(ip: string): Promise<IIPRecord | null> {
        if (this.blacklist.has(ip)) {
            throw new Error('IP is blacklisted');
        }

        const record = this.records.get(ip);
        if (!record) return null;

        const timeWindow = record.isAuthenticated ? this.AUTH_WINDOW_SECONDS : this.UNAUTH_WINDOW_SECONDS;
        const windowAgo = new Date(Date.now() - timeWindow * 1000);

        if (new Date(record.lastReset) < windowAgo) {
            await this.resetRecord(ip);
            return this.records.get(ip) || null;
        }

        return record;
    }

    /**
     * Increments the request count for a given IP address.
     * @param {string} ip - The IP address to increment the request count for.
     * @param {boolean} isAuthenticated - Whether the request is authenticated.
     * @returns {Promise<void>}
     */
    async incrementRecord(ip: string, isAuthenticated: boolean): Promise<void> {
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

        this.records.set(ip, record);
        await this.saveToFile();
    }

    /**
     * Resets the rate limit record for a given IP address.
     * @param {string} ip - The IP address to reset the record for.
     * @returns {Promise<void>}
     */
    async resetRecord(ip: string): Promise<void> {
        const record = this.records.get(ip);
        if (record) {
            record.requests = 0;
            record.lastReset = new Date();
            record.violations = 0;
            this.records.set(ip, record);
            await this.saveToFile();
        }
    }

    /**
     * Cleans up old rate limit records that are older than 24 hours.
     * @returns {Promise<void>}
     */
    async cleanupOldRecords(): Promise<void> {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        for (const [ip, record] of this.records.entries()) {
            if (new Date(record.lastReset) < twentyFourHoursAgo) {
                this.records.delete(ip);
            }
        }

        await this.saveToFile();
    }

    /**
     * Adds an IP address to the blacklist.
     * @param {string} ip - The IP address to add to the blacklist.
     * @returns {Promise<void>}
     */
    async addToBlacklist(ip: string): Promise<void> {
        this.blacklist.add(ip);
        await this.saveBlacklistToFile();
    }

    /**
     * Removes an IP address from the blacklist.
     * @param {string} ip - The IP address to remove from the blacklist.
     * @returns {Promise<void>}
     */
    async removeFromBlacklist(ip: string): Promise<void> {
        this.blacklist.delete(ip);
        await this.saveBlacklistToFile();
    }

    /**
     * Checks the rate limit for a given IP address.
     * @param {string} ip - The IP address to check the rate limit for.
     * @param {boolean} isAuthenticated - Whether the request is authenticated.
     * @returns {Promise<RateLimitResult>} The result of the rate limit check.
     */
    async checkRateLimit(ip: string, isAuthenticated: boolean): Promise<RateLimitResult> {
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
    }
}
