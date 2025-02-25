import logger from "../../../../shared/utils/logger";
import { UserService } from "../services/User.service";
import { UserServiceFactory } from "../factories/User.factory";
import { CookieService } from "../services/Cookie.service";
import { HttpStatus } from "../../../../shared/helpers/http-status.helper";
import { AdapterRequest, AdapterReply } from "../../../../shared/configurations/adapters/server.adapter";
import { ICreateUserRequest, IUpdateUserRequest, IUpdatePasswordRequest } from "../../domain/dtos/user.dto";

/**
 * UserController handles HTTP requests for user-related operations.
 * It delegates business logic to the UserService and manages HTTP responses.
 * 
 * Responsibilities:
 * - Handle incoming HTTP requests related to users.
 * - Delegate business logic to the UserService.
 * - Log request activities and errors.
 * - Send appropriate HTTP responses to the client.
 */
export class UserController {
    private userService: UserService;
    private cookieService: CookieService;

    /**
     * Initializes the UserController and creates an instance of UserService
     * using the UserServiceFactory.
     */
    constructor() {
        this.userService = UserServiceFactory.create();
        this.cookieService = new CookieService();
    }

    /**
     * Handles the creation of a new user.
     * Validates the input from the request body and delegates user creation to the UserService.
     * 
     * @param {AdapterRequest} request - The HTTP request containing user data (email, password, full_name) in the body.
     * @param {AdapterReply} reply - The HTTP response object to send back the result.
     * @returns {Promise<void>} A promise that resolves when the response is sent.
     * 
     * @example
     * // Request body example
     * {
     *   "email": "user@example.com",
     *   "password": "securepassword",
     *   "full_name": "Example User"
     * }
     */
    async createUser(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        const { email, password, full_name, password_confirmation } = request.body as ICreateUserRequest;

        if (!email) {
            logger.warn(`POST /users - email is required`);
            reply.status(HttpStatus.BAD_REQUEST).send({
                message: `email is required`
            });
            return;
        }

        if (!password) {
            logger.warn(`POST /users - Password is required`);
            reply.status(HttpStatus.BAD_REQUEST).send({
                message: `password is required`
            });
            return;
        }

        if (!password_confirmation) {
            logger.warn(`POST /users - password_confirmation is required`);
            reply.status(HttpStatus.BAD_REQUEST).send({
                message: `password_confirmation is required`
            });
            return;
        }

        if (!full_name) {
            logger.warn(`POST /users - full_name is required`);
            reply.status(HttpStatus.BAD_REQUEST).send({
                message: `full_name is required`
            });
            return;
        }

        logger.info(`POST /users - Attempting to create user with email: ${email}`);

        const result = await this.userService.createUser(email, password, full_name, password_confirmation);

        result.match(
            result => {
                switch (result.status) {
                    case 'success':
                        logger.info(`POST /users - User created successfully: ${result.email}`);
                        reply.status(HttpStatus.CREATED).send(result);
                        break;

                    case 'partial_success':
                        logger.warn(`POST /users - User created but email failed: ${result.email}`);
                        reply.status(HttpStatus.MULTI_STATUS).send(result); // 207 Multi-Status
                        break;

                    default:
                        logger.error(`POST /users - Unexpected status: ${result.status}`);
                        reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send(result);
                }
            },
            error => {
                logger.warn(`POST /users - Failed to create user with email: ${email} - ${error.message}`);
                reply.status(HttpStatus.BAD_REQUEST).send({ message: error.message });
            }
        );
    }

    async resendEmailVerification(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        const { email } = request.body as { email: string };

        if (!email) {
            return reply.status(HttpStatus.BAD_REQUEST).send({ message: 'Email is required' });
        }

        const result = await this.userService.resendVerificationEmail(email);

        if (result.isErr()) {
            return reply.status(HttpStatus.BAD_REQUEST).send({ message: result.error.message });
        }

        reply.status(HttpStatus.OK).send({ message: 'Verification email resent successfully' });
    }

    async verifyEmail(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        const { code } = request.body as { code: string };

        if (!code) {
            return reply.status(HttpStatus.BAD_REQUEST).send({ message: 'Code is required' });
        }

        const result = await this.userService.verifyEmail(code);

        if (result.isErr()) {
            return reply.status(HttpStatus.BAD_REQUEST).send({ message: result.error.message });
        }

        reply.status(HttpStatus.OK).send({ message: 'Email verified successfully' });
    }

    /**
     * Handles the update of user information.
     * Now uses cookies to get the user's email.
     */
    async updateUser(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        const email = this.cookieService.getCookie(request, 'email');

        if (email.isErr() || !email.value || email.value.trim().length < 10) {
            logger.warn('Email is missing or malformed');
            reply.status(401).send({ message: "Email is missing or malformed, try signin again" });
            return;
        }

        const updates = request.body as IUpdateUserRequest;

        logger.info(`PUT /users - Attempting to update user details for email: ${email}`);

        const result = await this.userService.updateUser(email.value, updates);

        result.match(
            success => {
                logger.info(`PUT /users - User updated successfully for email: ${email}`);
                reply.status(HttpStatus.OK).send(success);
            },
            error => {
                logger.warn(`PUT /users - Failed to update user details for email: ${email} - ${error.message}`);
                reply.status(HttpStatus.BAD_REQUEST).send({ message: error.message });
            }
        );
    }

    /**
     * Handles updating a user's password.
     * Now uses cookies to get the user's email.
     */
    async updatePassword(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        const email = this.cookieService.getCookie(request, 'email');

        if (email.isErr() || !email.value || email.value.trim().length < 10) {
            logger.warn('Email is missing or malformed');
            reply.status(401).send({ message: "Email is missing or malformed, try signin again" });
            return;
        }

        const { current_password, new_password } = request.body as IUpdatePasswordRequest;

        logger.info(`POST /users/update-password - Attempting to update password for email: ${email}`);

        const result = await this.userService.updatePassword(email.value, current_password, new_password);

        result.match(
            success => {
                logger.info(`POST /users/update-password - Password updated successfully for email: ${email}`);
                reply.status(HttpStatus.OK).send(success);
            },
            error => {
                logger.warn(`POST /users/update-password - Failed to update password for email: ${email} - ${error.message}`);
                reply.status(HttpStatus.BAD_REQUEST).send({ message: error.message });
            }
        );
    }

    /**
     * Handles fetching a user by Email.
     * Now uses cookies to get the user's email.
     */
    async findUser(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        const email = this.cookieService.getCookie(request, 'email');

        if (email.isErr() || !email.value || email.value.trim().length < 10) {
            logger.warn('Email is missing or malformed');
            reply.status(401).send({ message: "Email is missing or malformed, try signin again" });
            return;
        }

        logger.info(`GET /users - Attempting to fetch user details for email: ${email}`);

        if (!email) {
            reply.status(HttpStatus.NOT_FOUND).send({ message: 'E-mail is required.' });
            return;
        }

        const result = await this.userService.findUser(email.value);

        result.match(
            user => {
                logger.info(`GET /users - User fetched successfully for email: ${email}`);
                reply.status(HttpStatus.OK).send(user);
            },
            error => {
                logger.warn(`GET /users - Failed to fetch user details for email: ${email} - ${error.message}`);
                reply.status(HttpStatus.NOT_FOUND).send({ message: error.message });
            }
        );
    }

    /**
     * Handles user account deactivation.
     * Now uses cookies to get the user's email.
     */
    async deactivateAccount(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        const email = this.cookieService.getCookie(request, 'email');

        if (email.isErr() || !email.value || email.value.trim().length < 10) {
            logger.warn('Email is missing or malformed');
            reply.status(401).send({ message: "Email is missing or malformed, try signin again" });
            return;
        }

        logger.info(`POST /users/deactivate - Attempting to deactivate account for email: ${email}`);

        const result = await this.userService.deactivateAccount(email.value);

        result.match(
            success => {
                logger.info(`POST /users/deactivate - Account deactivated successfully for email: ${email}`);
                reply.status(HttpStatus.OK).send(success);
            },
            error => {
                logger.warn(`POST /users/deactivate - Failed to deactivate account for email: ${email} - ${error.message}`);
                reply.status(HttpStatus.BAD_REQUEST).send({ message: error.message });
            }
        );
    }

    /**
     * Handles account deletion requests.
     * Now uses cookies to get the user's email.
     */
    async requestAccountDeletion(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        const email = this.cookieService.getCookie(request, 'email');

        if (email.isErr() || !email.value || email.value.trim().length < 10) {
            logger.warn('Email is missing or malformed');
            reply.status(401).send({ message: "Email is missing or malformed, try signin again" });
            return;
        }

        logger.info(`POST /users/request-deletion - Attempting to request account deletion for email: ${email}`);

        const result = await this.userService.requestAccountDeletion(email.value);

        result.match(
            success => {
                logger.info(`POST /users/request-deletion - Account deletion requested successfully for email: ${email}`);
                reply.status(HttpStatus.OK).send(success);
            },
            error => {
                logger.warn(`POST /users/request-deletion - Failed to request account deletion for email: ${email} - ${error.message}`);
                reply.status(HttpStatus.BAD_REQUEST).send({ message: error.message });
            }
        );
    }
}
