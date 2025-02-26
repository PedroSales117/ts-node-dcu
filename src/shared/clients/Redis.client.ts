import { createClient } from 'redis';
import logger from '../utils/logger';

/**
 * RedisClient is a singleton class that manages the Redis client instance.
 */
export class RedisClient {
    private static instance: RedisClient;
    private client;
    private isConnected: boolean = false;

    /**
     * Private constructor that initializes the Redis client.
     */
    private constructor() {
        this.client = createClient({
            username: process.env.REDIS_USERNAME || 'default',
            password: process.env.REDIS_PASSWORD,
            socket: {
                host: process.env.REDIS_HOST,
                port: Number(process.env.REDIS_PORT)
            }
        });

        this.setupEventHandlers();
    }

    /**
     * Sets up event handlers for the Redis client.
     */
    private setupEventHandlers() {
        this.client.on('error', (error) => {
            this.isConnected = false;
            logger.error('Redis connection error', { error });
        });

        this.client.on('connect', () => {
            this.isConnected = true;
            logger.info('Redis connected successfully');
        });
    }

    /**
     * Retrieves the singleton instance of RedisClient.
     * @returns The RedisClient instance.
     */
    public static getInstance(): RedisClient {
        if (!RedisClient.instance) {
            RedisClient.instance = new RedisClient();
        }
        return RedisClient.instance;
    }

    /**
     * Gets the underlying Redis client.
     * @returns The Redis client.
     */
    public getClient() {
        return this.client;
    }

    /**
     * Connects to the Redis server if not already connected.
     * @returns A promise that resolves when the connection is established.
     * @throws An error if the connection fails.
     */
    public async connect(): Promise<void> {
        if (!this.isConnected) {
            try {
                await this.client.connect();
            } catch (error) {
                logger.error('Failed to connect to Redis', { error });
                throw error;
            }
        }
    }

    /**
     * Disconnects from the Redis server if currently connected.
     * @returns A promise that resolves when the connection is closed.
     * @throws An error if disconnection fails.
     */
    public async disconnect(): Promise<void> {
        if (this.isConnected) {
            try {
                await this.client.quit();
                this.isConnected = false;
                logger.info('Redis connection closed');
            } catch (error) {
                logger.error('Failed to close Redis connection', { error });
                throw error;
            }
        }
    }
}