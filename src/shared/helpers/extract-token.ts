import { Result } from "../core/Result";

export function extractToken(cookieToken: Result<string | undefined, Error>): string | undefined {
    return cookieToken.isOk() && cookieToken.value !== undefined
        ? cookieToken.value
        : undefined;
};
