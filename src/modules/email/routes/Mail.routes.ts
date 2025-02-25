import { RateLimitMiddleware } from "../../../shared/middlewares/RateLimit.middleware";
import { IRouter } from "../../../shared/router/interfaces/IRouter";
import { Router } from "../../../shared/router/Router";
import { EmailController } from "../application/controllers/Mail.controller";

/**
 * Creates and returns an email router with predefined routes for sending emails
 * and verification emails.
 *
 * @returns {IRouter} The email router configured with the email-related routes.
 */
export const emailRoute = (): IRouter => {
    const email_router = new Router();

    // Controller instance
    const emailController = new EmailController();

    // RateLimitMiddleware instance
    const rateLimitMiddleware = new RateLimitMiddleware({
        authenticatedLimit: 5,
        unauthenticatedLimit: 3,
        authWindowSeconds: 30,
        unauthWindowSeconds: 30
    });

    // Define a route for sending generic emails.
    email_router.addRoute({
        path: "/email/send", // Path for sending generic emails.
        method: "POST", // HTTP method to respond with.
        middlewares: [
            async (request, reply) => {
                await rateLimitMiddleware.checkRateLimit(request, reply);
            }
        ],
        handler: async (request, reply) => {
            // Handler function to delegate to the EmailController.
            await emailController.sendEmail(request, reply);
        },
    });

    return email_router; // Return the configured router with email-related routes.
};
