import { Result } from "../core/Result";

/**
 * Extracts a token value from a Result type containing an optional string token
 * 
 * @param {Result<string | undefined, Error>} cookieToken - The Result object containing either a string token or undefined
 * @returns {string | undefined} The extracted token if present and valid, otherwise undefined
 * 
 * @example
 * const result = Result.ok("myToken");
 * const token = extractToken(result); // returns "myToken"
 * 
 * const emptyResult = Result.ok(undefined);
 * const emptyToken = extractToken(emptyResult); // returns undefined
 */
export function extractToken(cookieToken: Result<string | undefined, Error>): string | undefined {
    return cookieToken.isOk() && cookieToken.value !== undefined
        ? cookieToken.value
        : undefined;
};