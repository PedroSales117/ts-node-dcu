export interface IIPRecord {
    ip: string;
    requests: number;
    lastReset: Date;
    isAuthenticated: boolean;
    violations: number;
}

/**
 * Interface representing a storage mechanism for rate limiting.
 */
export interface IRateLimitStorage {
    /**
     * Retrieves the rate limit record for a given IP address.
     * @param ip - The IP address to retrieve the record for.
     * @returns A promise that resolves to the rate limit record or null if no record exists.
     */
    getRecord(ip: string): Promise<IIPRecord | null>;

    /**
     * Increments the rate limit record for a given IP address.
     * @param ip - The IP address to increment the record for.
     * @param isAuthenticated - A boolean indicating if the request is authenticated.
     * @returns A promise that resolves when the record has been incremented.
     */
    incrementRecord(ip: string, isAuthenticated: boolean): Promise<void>;

    /**
     * Resets the rate limit record for a given IP address.
     * @param ip - The IP address to reset the record for.
     * @returns A promise that resolves when the record has been reset.
     */
    resetRecord(ip: string): Promise<void>;

    /**
     * Cleans up old rate limit records that are no longer needed.
     * @returns A promise that resolves when old records have been cleaned up.
     */
    cleanupOldRecords(): Promise<void>;
}
