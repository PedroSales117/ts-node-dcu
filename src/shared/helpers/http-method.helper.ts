/**
 * Enum representing HTTP methods used in the application.
 * Provides a type-safe way to reference standard HTTP methods.
 * 
 * @readonly
 * @enum {string}
 * 
 * @property {string} GET - Retrieves a resource
 * @property {string} POST - Creates a new resource
 * @property {string} PUT - Updates or replaces an existing resource
 * @property {string} DELETE - Removes a resource
 * @property {string} PATCH - Partially updates an existing resource
 * @property {string} HEAD - Retrieves headers only
 * @property {string} OPTIONS - Returns supported HTTP methods and other options
 */
export const HttpMethod = Object.freeze({
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    DELETE: 'DELETE',
    PATCH: 'PATCH',
    HEAD: 'HEAD',
    OPTIONS: 'OPTIONS'
} as const);

/**
 * Type representing valid HTTP methods
 * Derived from the HttpMethod object keys
 * 
 * @typedef {string} HttpMethod
 */
export type HttpMethod = typeof HttpMethod[keyof typeof HttpMethod];