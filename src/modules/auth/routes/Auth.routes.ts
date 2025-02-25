import { RateLimitMiddleware } from "../../../shared/middlewares/RateLimit.middleware";
import { IRouter } from "../../../shared/router/interfaces/IRouter";
import { Router } from "../../../shared/router/Router";
import { AuthController } from "../application/controllers/Auth.controller";

/**
 * Creates and returns an authentication router with predefined routes for login,
 * refreshing tokens, remember me functionality, and token management.
 *
 * @returns {IRouter} The authentication router configured with authentication routes.
 */
export const authRoute = (): IRouter => {
    const auth_router = new Router();
    const authController = new AuthController();

    // RateLimitMiddleware instances for each route
    const loginRateLimitMiddleware = new RateLimitMiddleware({
        authenticatedLimit: 2,
        unauthenticatedLimit: 2,
        authWindowSeconds: 15,
        unauthWindowSeconds: 15
    });

    const revokeRememberMeTokenRateLimitMiddleware = new RateLimitMiddleware({
        authenticatedLimit: 20,
        unauthenticatedLimit: 20,
        authWindowSeconds: 60,
        unauthWindowSeconds: 60
    });

    const refreshTokenRateLimitMiddleware = new RateLimitMiddleware({
        authenticatedLimit: 10,
        unauthenticatedLimit: 10,
        authWindowSeconds: 60,
        unauthWindowSeconds: 60
    });

    const validateTokenRateLimitMiddleware = new RateLimitMiddleware({
        authenticatedLimit: 50,
        unauthenticatedLimit: 50,
        authWindowSeconds: 30,
        unauthWindowSeconds: 30
    });

    const logoutRateLimitMiddleware = new RateLimitMiddleware({
        authenticatedLimit: 5,
        unauthenticatedLimit: 5,
        authWindowSeconds: 60,
        unauthWindowSeconds: 60
    });

    const validateTokenOwnershipRateLimitMiddleware = new RateLimitMiddleware({
        authenticatedLimit: 20,
        unauthenticatedLimit: 20,
        authWindowSeconds: 60,
        unauthWindowSeconds: 60
    });

    // Define the login route
    auth_router.addRoute({
        path: "/auth/login",
        method: "POST",
        middlewares: [
            async (request, reply) => {
                await loginRateLimitMiddleware.checkRateLimit(request, reply);
            }
        ],
        handler: async (request, reply) => {
            await authController.login(request, reply);
        },
    });

    // Define the revoke remember me token route
    auth_router.addRoute({
        path: "/auth/remember-me/revoke",
        method: "POST",
        middlewares: [
            async (request, reply) => {
                await revokeRememberMeTokenRateLimitMiddleware.checkRateLimit(request, reply);
            }
        ],
        handler: async (request, reply) => {
            await authController.revokeRememberMeToken(request, reply);
        },
    });

    // Define the refresh token route
    auth_router.addRoute({
        path: "/auth/refresh",
        method: "POST",
        middlewares: [
            async (request, reply) => {
                await refreshTokenRateLimitMiddleware.checkRateLimit(request, reply);
            }
        ],
        handler: async (request, reply) => {
            await authController.refreshToken(request, reply);
        },
    });

    // Validate tokens route
    auth_router.addRoute({
        path: "/auth/validate",
        method: "GET",
        middlewares: [
            async (request, reply) => {
                await validateTokenRateLimitMiddleware.checkRateLimit(request, reply);
            }
        ],
        handler: async (request, reply) => {
            await authController.validateToken(request, reply);
        },
    });

    // Logout
    auth_router.addRoute({
        path: "/auth/logout",
        method: "POST",
        middlewares: [
            async (request, reply) => {
                await logoutRateLimitMiddleware.checkRateLimit(request, reply);
            }
        ],
        handler: async (request, reply) => {
            await authController.logout(request, reply);
        },
    });

    // Define the validate token ownership route
    auth_router.addRoute({
        path: "/auth/validate-ownership",
        method: "GET",
        middlewares: [
            async (request, reply) => {
                await validateTokenOwnershipRateLimitMiddleware.checkRateLimit(request, reply);
            }
        ],
        handler: async (request, reply) => {
            await authController.validateTokenOwnership(request, reply);
        },
    });

    return auth_router;
};