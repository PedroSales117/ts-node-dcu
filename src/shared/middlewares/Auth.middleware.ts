import logger from '../utils/logger';
import { CookieService } from '../services/Cookie.service';
import { AdapterReply, AdapterRequest } from '../configurations/adapters/server.adapter';
import { AuthService } from '../../modules/auth/application/services/Auth.service';

/**
 * Middleware responsible for handling authentication and session management.
 * @class AuthMiddleware
 * @description Validates user sessions and manages authentication state through cookies.
 */
export class AuthMiddleware {
    private readonly cookieService: CookieService;
    private readonly authService: AuthService;

    /**
     * Creates an instance of AuthMiddleware.
     * @constructor
     */
    constructor() {
        this.cookieService = new CookieService();
        this.authService = new AuthService();
    }

    /**
     * Authenticates incoming requests by validating session tokens.
     * @async
     * @param {AdapterRequest} request - The incoming request object
     * @param {AdapterReply} reply - The reply object used to send responses
     * @returns {Promise<void>}
     * @throws Will not throw errors, but will fallback to guest user on authentication failures
     */
    async authenticate(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        const tokenResult = this.cookieService.getSessionCookie(request);
        if (tokenResult.isErr() || !tokenResult.value || tokenResult.value.trim().length < 10) {
            logger.info('No valid session token found, continuing as guest');
            this.cookieService.setCookie(reply, 'email', 'guest');
            return;
        }

        const token = tokenResult.value.trim();
        if (!token.includes('.')) {
            logger.warn('Invalid token format, continuing as guest');
            this.cookieService.setCookie(reply, 'email', 'guest');
            return;
        }

        try {
            const validationResult = await this.authService.validateAccessToken(
                token,
                undefined,
                request.ip,
                request.headers['user-agent']
            );

            if (validationResult.isErr()) {
                logger.warn('Invalid token from auth service, continuing as guest');
                this.cookieService.setCookie(reply, 'email', 'guest');
                return;
            }

            const { user } = validationResult.value;
            if (!user) {
                logger.warn('No user found in token, continuing as guest');
                this.cookieService.setCookie(reply, 'email', 'guest');
                return;
            } else if (!user.is_active || !user.is_email_verified) {
                logger.warn('User is inactive or unverified, continuing as guest');
                this.cookieService.setCookie(reply, 'email', 'guest');
                return;
            } else if (!user.email) {
                logger.warn('No email found in user, continuing as guest');
                this.cookieService.setCookie(reply, 'email', 'guest');
                return;
            } else if (!user.id) {
                logger.warn('No ID found in user, continuing as guest');
                this.cookieService.setCookie(reply, 'email', 'guest');
                return;
            } else {
                this.cookieService.setCookie(reply, 'email', user.email);
                logger.info(`User authenticated: ${user.email}`);
            }
        } catch (error) {
            logger.error('Token validation error, continuing as guest:', error);
            this.cookieService.setCookie(reply, 'email', 'guest');
        }
    }
}