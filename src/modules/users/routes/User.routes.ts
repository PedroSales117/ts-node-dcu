import { AdapterReply, AdapterRequest } from "../../../shared/configurations/adapters/server.adapter";
import { AuthMiddleware } from "../../../shared/middlewares/Auth.middleware";
import { RateLimitMiddleware } from "../../../shared/middlewares/RateLimit.middleware";
import { IRouter } from "../../../shared/router/interfaces/IRouter";
import { Router } from "../../../shared/router/Router";
import { UserController } from "../application/controllers/User.controller";

/**
 * Creates and returns a router configured with user-related routes.
 * These routes handle operations such as creating, authenticating, and updating users.
 *
 * @returns {IRouter} The user router configured with all user-related routes.
 */
export const usersRoute = (): IRouter => {
    const user_router = new Router();
    const userController = new UserController();
    const authMiddleware = new AuthMiddleware();

    /**
     * Middleware to validate authentication for protected routes.
     */
    const authGuard = async (request: AdapterRequest, reply: AdapterReply) => {
        await authMiddleware.authenticate(request, reply);
    };

    // RateLimitMiddleware instances for each route
    const createUserRateLimitMiddleware = new RateLimitMiddleware({
        authenticatedLimit: 2,
        unauthenticatedLimit: 2,
        authWindowSeconds: 30,
        unauthWindowSeconds: 30
    });

    const findUserRateLimitMiddleware = new RateLimitMiddleware({
        authenticatedLimit: 20,
        unauthenticatedLimit: 0,
        authWindowSeconds: 60,
        unauthWindowSeconds: 60
    });

    const resendEmailVerificationRateLimitMiddleware = new RateLimitMiddleware({
        authenticatedLimit: 3,
        unauthenticatedLimit: 3,
        authWindowSeconds: 60,
        unauthWindowSeconds: 60
    });

    const verifyEmailRateLimitMiddleware = new RateLimitMiddleware({
        authenticatedLimit: 3,
        unauthenticatedLimit: 3,
        authWindowSeconds: 60,
        unauthWindowSeconds: 60
    });

    const updateUserRateLimitMiddleware = new RateLimitMiddleware({
        authenticatedLimit: 10,
        unauthenticatedLimit: 0,
        authWindowSeconds: 60,
        unauthWindowSeconds: 60
    });

    const updatePasswordRateLimitMiddleware = new RateLimitMiddleware({
        authenticatedLimit: 5,
        unauthenticatedLimit: 0,
        authWindowSeconds: 60,
        unauthWindowSeconds: 60
    });

    const deactivateAccountRateLimitMiddleware = new RateLimitMiddleware({
        authenticatedLimit: 5,
        unauthenticatedLimit: 0,
        authWindowSeconds: 60,
        unauthWindowSeconds: 60
    });

    const requestAccountDeletionRateLimitMiddleware = new RateLimitMiddleware({
        authenticatedLimit: 5,
        unauthenticatedLimit: 0,
        authWindowSeconds: 60,
        unauthWindowSeconds: 60
    });

    // Route for creating a new user
    user_router.addRoute({
        path: "/users", // Endpoint to create a new user
        method: "POST", // HTTP method for user creation
        middlewares: [
            async (request, reply) => {
                await createUserRateLimitMiddleware.checkRateLimit(request, reply);
            }
        ],
        handler: async (request, reply) => {
            await userController.createUser(request, reply);
        },
    });

    // Route for finding a user by Email
    user_router.addRoute({
        path: "/users", // Endpoint for fetching a user by Email
        method: "GET", // HTTP method for retrieving user data
        middlewares: [authGuard, async (request, reply) => {
            await findUserRateLimitMiddleware.checkRateLimit(request, reply);
        }],
        handler: async (request, reply) => {
            await userController.findUser(request, reply);
        },
    });

    // Route for resending email verification
    user_router.addRoute({
        path: "/users/email/resend-verification",
        method: "POST",
        middlewares: [
            async (request, reply) => {
                await resendEmailVerificationRateLimitMiddleware.checkRateLimit(request, reply);
            }
        ],
        handler: async (request, reply) => {
            await userController.resendEmailVerification(request, reply);
        },
    });

    // Route for verifying email
    user_router.addRoute({
        path: "/users/email/verify-email",
        method: "POST",
        middlewares: [
            async (request, reply) => {
                await verifyEmailRateLimitMiddleware.checkRateLimit(request, reply);
            }
        ],
        handler: async (request, reply) => {
            await userController.verifyEmail(request, reply);
        },
    });

    // Route for updating user information
    user_router.addRoute({
        path: "/users", // Endpoint for user update
        method: "PUT", // HTTP method for updating users
        middlewares: [authGuard, async (request, reply) => {
            await updateUserRateLimitMiddleware.checkRateLimit(request, reply);
        }],
        handler: async (request, reply) => {
            await userController.updateUser(request, reply);
        },
    });

    // Route for updating a user's password
    user_router.addRoute({
        path: "/users/update-password",
        method: "PUT", // HTTP method for updating password
        middlewares: [authGuard, async (request, reply) => {
            await updatePasswordRateLimitMiddleware.checkRateLimit(request, reply);
        }],
        handler: async (request, reply) => {
            await userController.updatePassword(request, reply);
        },
    });

    // Route for deactivating a user account
    user_router.addRoute({
        path: "/users/deactivate", // Endpoint for deactivating a user
        method: "POST", // HTTP method for deactivation
        middlewares: [authGuard, async (request, reply) => {
            await deactivateAccountRateLimitMiddleware.checkRateLimit(request, reply);
        }],
        handler: async (request, reply) => {
            await userController.deactivateAccount(request, reply);
        },
    });

    // Route for requesting account deletion
    user_router.addRoute({
        path: "/users/request-deletion", // Endpoint for account deletion request
        method: "POST", // HTTP method for account deletion
        middlewares: [authGuard, async (request, reply) => {
            await requestAccountDeletionRateLimitMiddleware.checkRateLimit(request, reply);
        }],
        handler: async (request, reply) => {
            await userController.requestAccountDeletion(request, reply);
        },
    });

    return user_router; // Return the configured router with all user routes
};