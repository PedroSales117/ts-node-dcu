/**
 * Extends the ProcessEnv interface in the NodeJS namespace to include custom environment variables.
 * This ensures that TypeScript recognizes the environment variables used in the project and provides type safety.
 */
declare global {
    namespace NodeJS {
        interface ProcessEnv {

            // ===== Environment Configuration =====
            /**
             * The port number on which the server should listen.
             * @type {number}
             */
            PORT: number;

            /**
             * The environment in which the application is running.
             * @type {string}
             */
            NODE_ENV: 'development' | 'production' | 'test';


            // ===== Database Configuration =====
            /**
             * The database host address.
             * @type {string}
             */
            DB_HOST: string;

            /**
             * The database port.
             * @type {number}
             */
            DB_PORT: number;

            /**
             * The database username.
             * @type {string}
             */
            DB_USERNAME: string;

            /**
             * The database password.
             * @type {string}
             */
            DB_PASSWORD: string;

            /**
             * The database name.
             * @type {string}
             */
            DB_NAME: string;


            // ===== Security and Encryption =====
            /**
             * Secret key used for JWT token generation and validation.
             * @type {string}
             */
            JWT_SECRET: string;

            /**
             * Secret key used for cookie signing.
             * @type {string}
             */
            COOKIE_SECRET: string;

            /**
             * Key used for general encryption purposes.
             * @type {string}
             */
            ENCRYPTION_KEY: string;


            // ===== CORS Configuration =====
            /**
             * Allowed origins for CORS (multiple origins).
             * @type {string}
             */
            ALLOW_ORIGINS: string;

            /**
             * Domain name used for cookie settings and CORS configuration
             * @example 'example.com'
             * @type {string}
             */
            DOMAIN: string;


            // ===== Rate Limiting Configuration =====
            /**
             * Rate limit for authenticated requests.
             * @type {number}
             */
            AUTHENTICATED_LIMIT: number;

            /**
             * Rate limit for unauthenticated requests.
             * @type {number}
             */
            UNAUTHENTICATED_LIMIT: number;

            /**
             * Time window for authenticated rate limits in minutes.
             * @type {number}
             */
            AUTH_WINDOW_MINUTES: number;

            /**
             * Time window for unauthenticated rate limits in minutes.
             * @type {number}
             */
            UNAUTH_WINDOW_MINUTES: number;
        }
    }
}

/**
 * Empty export to convert the file into a module, enabling TypeScript's module scope.
 */
export { }