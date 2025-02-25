import { AdapterReply, AdapterRequest } from "../../../../shared/configurations/adapters/server.adapter";
import { extractToken } from "../../../../shared/helpers/extract-token";
import { HttpStatus } from "../../../../shared/helpers/http-status.helper";
import { CookieService } from "../../../../shared/services/Cookie.service";
import logger from "../../../../shared/utils/logger";
import { ILoginRequest } from "../../domain/dto/auth.dto";
import { AuthServiceFactory } from "../factories/Auth.factory";
import { AuthService } from "../services/Auth.service";

export class AuthController {
    private authService: AuthService;
    private cookieService: CookieService;

    constructor() {
        this.authService = AuthServiceFactory.create();
        this.cookieService = new CookieService();
    }

    async login(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        const { email, password, remember_me } = request.body as ILoginRequest;

        logger.info(`POST /auth/login - Attempting login for email: ${email} with rememberMe: ${remember_me}`);

        const result = await this.authService.login(
            email,
            password,
            request.ip,
            request.headers['user-agent'] || '',
            remember_me
        );

        result.match(
            tokens => {
                this.cookieService.setSessionCookie(reply, tokens.access_token);
                this.cookieService.setAuthCookie(reply, 'refresh_token', tokens.refresh_token, 30 * 24 * 60 * 60 * 1000);
                if (tokens.remember_me_token) {
                    this.cookieService.setAuthCookie(reply, 'remember_me_token', tokens.remember_me_token, 30 * 24 * 60 * 60 * 1000);
                }

                this.cookieService.setCookie(reply, 'email', email, {
                    maxAge: 24 * 60 * 60 * 1000,
                    httpOnly: false,
                    secure: process.env.NODE_ENV === 'production',
                    path: '/'
                });

                logger.info(`POST /auth/login - Login successful for email: ${email}`);
                reply.status(HttpStatus.OK).send({ message: 'Login successful' });
            },
            error => {
                logger.warn(`POST /auth/login - Login failed for email: ${email} - ${error.message}`);
                reply.status(HttpStatus.UNAUTHORIZED).send({ message: error.message });
            }
        );
    }

    /**
     * Handles requests to revoke a specific Remember Me token.
     * 
     * @param {AdapterRequest} request - The HTTP request containing the user ID and token.
     * @param {AdapterReply} reply - The HTTP response object to send back the result.
     * @returns {Promise<void>} A promise that resolves when the response is sent.
     * 
     * @example
     * // Request body example
     * {
     *   "remember_me_token": "token-to-revoke"
     * }
     */
    async revokeRememberMeToken(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        const remember_me_token = this.cookieService.getCookie(request, 'remember_me_token');

        if (remember_me_token.isErr() || !remember_me_token.value) {
            logger.warn('Remember me token is missing in cookies');
            reply.status(HttpStatus.BAD_REQUEST).send({ message: "Missing remember me token in cookies" });
            return;
        }

        logger.info(`POST /auth/remember-me/revoke - Attempting to revoke Remember Me token`);

        const result = await this.authService.revokeRememberMeToken(remember_me_token.value);

        result.match(
            success => {
                logger.info(`POST /auth/remember-me/revoke - Token revoked successfully`);
                reply.status(HttpStatus.OK).send(success);
            },
            error => {
                logger.warn(`POST /auth/remember-me/revoke - Failed to revoke token - ${error.message}`);
                reply.status(HttpStatus.BAD_REQUEST).send({ message: error.message });
            }
        );
    }

    /**
     * Handles token refresh requests.
     * Validates the provided refresh token and issues new access and refresh tokens.
     * 
     * @param {AdapterRequest} request - The HTTP request containing the refresh token in the body.
     * @param {AdapterReply} reply - The HTTP response object to send back the result.
     * @returns {Promise<void>} A promise that resolves when the response is sent.
     * 
     * @example
     * // Request body example
     * {
     *   "refresh_token": "your-refresh-token"
     * }
     */
    async refreshToken(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        const refresh_token = this.cookieService.getCookie(request, 'refresh_token');

        if (refresh_token.isErr() || !refresh_token.value) {
            logger.warn('Refresh token is missing in cookies');
            reply.status(HttpStatus.BAD_REQUEST).send({ message: "Missing refresh token in cookies" });
            return;
        }

        logger.info(`POST /auth/refresh - Attempting to refresh token`);

        const result = await this.authService.refresh(
            refresh_token.value,
            request.ip,
            request.headers['user-agent'] || ''
        );

        result.match(
            (tokens) => {
                this.cookieService.setSessionCookie(reply, tokens.access_token);
                this.cookieService.setAuthCookie(reply, 'refresh_token', tokens.refresh_token, 30 * 24 * 60 * 60 * 1000);

                if (tokens.remember_me_token) {
                    this.cookieService.setAuthCookie(reply, 'remember_me_token', tokens.remember_me_token, 30 * 24 * 60 * 60 * 1000);
                }

                logger.info(`POST /auth/refresh - Token refreshed successfully`);
                reply.status(HttpStatus.OK).send({ message: 'Token refresh successful' });
            },
            error => {
                logger.warn(`POST /auth/refresh - Token refresh failed - ${error.message}`);
                reply.status(HttpStatus.UNAUTHORIZED).send({ message: error.message });
            }
        );
    }

    /**
    * Handles requests to revoke tokens for a specific user.
    * Marks all tokens as revoked for the provided user Email.
    * 
    * @param {AdapterRequest} request - The HTTP request containing the user Email in the body.
    * @param {AdapterReply} reply - The HTTP response object to send back the result.
    * @returns {Promise<void>} A promise that resolves when the response is sent.
    * 
    * @example
    * // Request body example
    * {
    *   "email": "email@email.com"
    * }
    */
    async validateToken(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        const cookieToken = this.cookieService.getSessionCookie(request);
        const email = this.cookieService.getCookie(request, 'email');
        const access_token = extractToken(cookieToken);

        if (!email || email.isErr() || !email.value) {
            logger.warn('Email is missing in cookies');
            reply.status(HttpStatus.BAD_REQUEST).send({ message: "Missing email" });
            return;
        }

        if (!access_token) {
            logger.warn('Access token is missing in cookies');
            reply.status(HttpStatus.BAD_REQUEST).send({ message: "Missing access token" });
            return;
        }

        logger.info(`GET /auth/validate - Attempting to validate token...`);

        const result = await this.authService.validateAccessToken(access_token, email.value);

        result.match(
            success => {
                const responseData = {
                    is_valid: success.is_valid,
                    message: success.message,
                    user_status: success.user_status
                };
                logger.info(`GET /auth/validate - Token validated successfully`);
                reply.status(HttpStatus.OK).send(responseData);
            },
            error => {
                this.cookieService.clearAllAuthCookies(reply, email.value ? email.value : 'guest');
                logger.warn(`GET /auth/validate - Failed to validate token - ${error.message}`);
                reply.status(HttpStatus.BAD_REQUEST).send({ message: error.message });
            }
        );
    }

    /**
    * Handles logout requests for a user.
    * Clears session and authentication cookies upon successful logout.
    *
    * @param {AdapterRequest} request - The HTTP request carrying logout information and cookies.
    * @param {AdapterReply} reply - The HTTP response object used to send back the result.
    * @returns {Promise<void>} A promise that resolves when the response is sent.
    *
    * @example
    * // Request example:
    * // POST /auth/logout with necessary cookies set.
    */
    async logout(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        const access_token = this.cookieService.getSessionCookie(request);
        const email = this.cookieService.getCookie(request, 'email');
        const refresh_token = this.cookieService.getCookie(request, 'refresh_token');
        const remember_me_token = this.cookieService.getCookie(request, 'remember_me_token');

        if (access_token.isErr() || !access_token.value) {
            logger.warn('Access token is missing in cookies');
            reply.status(HttpStatus.BAD_REQUEST).send({ message: "Missing access token in cookies" });
            return;
        }

        if (email.isErr() || !email.value) {
            logger.warn('Email is missing in cookies');
            reply.status(HttpStatus.BAD_REQUEST).send({ message: "Missing email in cookies" });
            return;
        }

        logger.info(`POST /auth/logout - Attempting to logout user`);

        const result = await this.authService.logout(
            access_token.value,
            refresh_token.isErr() ? undefined : refresh_token.value,
            remember_me_token.isErr() ? undefined : remember_me_token.value
        );

        result.match(
            success => {
                this.cookieService.clearAllAuthCookies(reply, email.value ? email.value : 'guest');
                logger.info(`POST /auth/logout - Logout successful`);
                reply.status(HttpStatus.OK).send(success);
            },
            error => {
                this.cookieService.clearAllAuthCookies(reply, email.value ? email.value : 'guest');
                logger.warn(`POST /auth/logout - Logout failed - ${error.message}`);
                reply.status(HttpStatus.BAD_REQUEST).send({ message: error.message });
            }
        );
    }

    /**
    * Handles requests to validate token ownership.
    * Validates if the token belongs to the provided email.
    * 
    * @param {AdapterRequest} request - The HTTP request containing the email in the body.
    * @param {AdapterReply} reply - The HTTP response object to send back the result.
    * @returns {Promise<void>} A promise that resolves when the response is sent.
    * 
    * @example
    * // Request body example
    * {
    *   "email": "email@example.com"
    * }
    */
    async validateTokenOwnership(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        const email = this.cookieService.getCookie(request, 'email');
        const cookieToken = this.cookieService.getSessionCookie(request);
        const access_token = extractToken(cookieToken);

        if (email.isErr() || !email.value) {
            logger.warn('Email is missing in cookies');
            reply.status(HttpStatus.BAD_REQUEST).send({ message: "Email not found" });
            return;
        }

        if (!access_token) {
            logger.warn('Access token is missing in cookies');
            reply.status(HttpStatus.BAD_REQUEST).send({ message: "Missing access token" });
            return;
        }

        if (!access_token) {
            logger.warn('Access token is missing in cookies');
            reply.status(HttpStatus.BAD_REQUEST).send({ message: "Missing access token" });
            return;
        }

        logger.info(`POST /auth/validate-ownership - Attempting to validate token ownership for email: ${email}`);

        const isValid = await this.authService.validateTokenOwnership(access_token, email.value);

        if (isValid) {
            logger.info(`POST /auth/validate-ownership - Token ownership validated successfully for email: ${email}`);
            reply.status(HttpStatus.OK).send({ message: 'Token ownership validated successfully.', is_valid: isValid });
        } else {
            logger.warn(`POST /auth/validate-ownership - Token ownership validation failed for email: ${email}`);
            reply.status(HttpStatus.UNAUTHORIZED).send({ message: 'Token ownership validation failed.', is_valid: isValid });
        }
    }
}
