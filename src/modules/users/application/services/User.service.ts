import { randomBytes } from 'crypto';
import { User } from '../../domain/entities/User';
import bcrypt from 'bcryptjs';
import { Err, Ok, Result, ResultAsync } from '../../../../shared/core/Result';
import { EmailClient } from '../clients/Email.client';
import logger from '../../../../shared/utils/logger';
import { validateUpdates } from '../utils/allowed-update-fields';
import { EmailService } from '../../../email/services/Email.service';
import { MailAdapterFactory } from '../../../email/factories/MailAdapter.factory';

/**
 * Type representing a sanitized user object without sensitive fields.
 */
export type SanitizedUser = Omit<User, 'password' | 'hasId' | 'save' | 'remove' | 'softRemove' | 'recover'>;

type UserCreationResult = {
    status: 'success' | 'partial_success' | 'error';
    email: string;
    message: string;
    error?: Error;
};

/**
 * Service class for managing regular User-related operations.
 */
export class UserService {
    private emailClient: EmailClient;

    /**
 * Configuration for verification codes
 */
    private readonly VERIFICATION = {
        CODE_LENGTH: 8,
        EXPIRATION_MINUTES: 10
    } as const;

    /**
     * Configuration for password constraints
     */
    private readonly PASSWORD_CONSTRAINTS = {
        MIN_LENGTH: 8,
        MAX_LENGTH: 100,
        REQUIRE_UPPERCASE: true,
        REQUIRE_LOWERCASE: true,
        REQUIRE_NUMBER: true,
        REQUIRE_SPECIAL_CHAR: true,
        SPECIAL_CHARS: "!@#$%^&*(),.?\":{}|<>"
    } as const;

    /**
     * Validates password against defined constraints
     * @param password - The password to validate
     * @returns Result containing validation result or error message
     */
    private validatePassword(password: string): Result<true, Error> {
        if (!password) {
            return Err(new Error('Password is required'));
        }

        if (password.length < this.PASSWORD_CONSTRAINTS.MIN_LENGTH) {
            return Err(new Error(`Password must be at least ${this.PASSWORD_CONSTRAINTS.MIN_LENGTH} characters long`));
        }

        if (password.length > this.PASSWORD_CONSTRAINTS.MAX_LENGTH) {
            return Err(new Error(`Password must not exceed ${this.PASSWORD_CONSTRAINTS.MAX_LENGTH} characters`));
        }

        if (this.PASSWORD_CONSTRAINTS.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
            return Err(new Error('Password must contain at least one uppercase letter'));
        }

        if (this.PASSWORD_CONSTRAINTS.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
            return Err(new Error('Password must contain at least one lowercase letter'));
        }

        if (this.PASSWORD_CONSTRAINTS.REQUIRE_NUMBER && !/\d/.test(password)) {
            return Err(new Error('Password must contain at least one number'));
        }

        if (this.PASSWORD_CONSTRAINTS.REQUIRE_SPECIAL_CHAR &&
            !new RegExp(`[${this.PASSWORD_CONSTRAINTS.SPECIAL_CHARS}]`).test(password)) {
            return Err(new Error('Password must contain at least one special character'));
        }

        return Ok(true);
    }

    /**
     * Initializes the UserService and EmailClient for sending emails.
     */
    constructor() {
        const mailAdapter = MailAdapterFactory.create();
        this.emailClient = new EmailClient(new EmailService(mailAdapter));
    }

    /**
     * Helper method to sanitize user data by removing sensitive fields like password.
     * @param user - The user object to sanitize.
     * @returns A sanitized user object.
     */
    private sanitizeUser(user: User): SanitizedUser {
        const { password, id, email_verification_code, email_verification_expires_at, role, ...sanitizedUser } = user;
        return sanitizedUser as SanitizedUser;
    }

    /**
     * Helper method to generate a unique token for email verification.
     * @returns A secure, random code with length defined in VERIFICATION.CODE_LENGTH
     */
    private generateVerificationCode(): string {
        const randomNumber = randomBytes(4).readUInt32BE(0);
        const code = (randomNumber % Math.pow(10, this.VERIFICATION.CODE_LENGTH))
            .toString()
            .padStart(this.VERIFICATION.CODE_LENGTH, '0');
        return code;
    }

    /**
     * Generates an expiration timestamp for the verification code based on VERIFICATION.EXPIRATION_MINUTES.
     * @returns {Date} A Date object representing when the verification code will expire
     */
    private generateCodeExpiredTime(): Date {
        return new Date(Date.now() + this.VERIFICATION.EXPIRATION_MINUTES * 60 * 1000);
    }

    /**
     * Checks if a verification code timestamp is still valid.
     * A timestamp is valid if it's in the future relative to the current time.
     * 
     * @param {Date} timestamp - The timestamp to validate
     * @returns {boolean} true if the timestamp is still valid (in the future), false otherwise
     */
    private isVerificationTimestampCodeValid(timestamp: Date): boolean {
        return timestamp.getTime() > Date.now();
    }

    /**
     * Creates a new user and sends a verification email.
     * @param email - The email of the user.
     * @param password - The password of the user.
     * @param full_name - (Optional) The full name of the user.
     * @returns A Result object indicating success or an error.
     */
    async createUser(email: string, password: string, full_name: string, password_confirmation: string): Promise<Result<UserCreationResult, Error>> {
        try {
            logger.info(`Attempting to create user with email: ${email}`);
            const existingUser = await User.findOne({ where: { email } });

            if (existingUser) {
                logger.warn(`User creation failed. Email already exists: ${email}`);
                return Err(new Error('User already exists.'));
            }


            if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                logger.warn(`User creation failed. Invalid email format: ${email}`);
                return Err(new Error('Invalid email format'));
            }

            if (password_confirmation !== password) {
                const error_message = `User creation failed. Password and Password confirmation is different`
                logger.warn(error_message);
                return Err(new Error(error_message));
            }


            const passwordValidation = this.validatePassword(password);
            if (passwordValidation.isErr()) {
                logger.warn(`User creation failed. Invalid password format`);
                return Err(passwordValidation.error);
            }

            const passwordConfirmationValidation = this.validatePassword(password_confirmation);
            if (passwordConfirmationValidation.isErr()) {
                logger.warn(`User creation failed. Invalid password confirmation format`);
                return Err(passwordConfirmationValidation.error);
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const email_verification_code = this.generateVerificationCode();
            const email_verification_expires_at = this.generateCodeExpiredTime();

            const user = User.create({
                email,
                password: hashedPassword,
                full_name,
                role: 'user',
                email_verification_code,
                email_verification_expires_at
            });

            await user.save();
            logger.info(`User created successfully with Email: ${user.email}`);

            try {
                if (!user.email_verification_code) {
                    throw new Error('Verification code not found');
                }

                await this.sendVerificationEmail(user.email!, user.email_verification_code, full_name.split(' ')[0]);
                logger.info(`Verification email sent to ${email}`);

                return Ok({
                    status: 'success',
                    email: user.email,
                    message: 'User successfully created. A verification email has been sent.'
                });
            } catch (emailError) {
                logger.error(`Failed to send verification email to ${email}`, emailError);

                return Ok({
                    status: 'partial_success',
                    message: 'User created successfully but verification email could not be sent. Please try again later.',
                    email: user.email,
                    error: emailError as Error
                });
            }
        } catch (error) {
            logger.error(`Error creating user with email: ${email}`, error);
            return Err(error as Error);
        }
    }

    async resendVerificationEmail(email: string) {
        return ResultAsync.fromPromise(
            (async () => {
                const user = await User.findOne({ where: { email } });

                if (!user) {
                    throw new Error('User not found');
                }

                if (user.is_email_verified) {
                    throw new Error('Email is already verified');
                }

                const full_name = user.full_name!
                const email_verification_code = this.generateVerificationCode();
                const email_verification_expires_at = this.generateCodeExpiredTime();

                user.email_verification_code = email_verification_code;
                user.email_verification_expires_at = email_verification_expires_at;
                await user.save();

                await this.sendVerificationEmail(user.email!, email_verification_code, full_name.split(' ')[0]);
                logger.info(`Verification email resent to ${user.email}`);
            })(),
            (error: unknown) => {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                logger.error(`Failed to resend verification email to ${email}: ${errorMessage}`);
                return new Error(errorMessage);
            }
        );
    }

    /**
     * Sends an email verification link to the user.
     * @param email - The user's email address.
     * @param verification_code - The email verification code.
     * @throws Error if the email could not be sent.
     */
    private async sendVerificationEmail(email: string, email_verification_code: string, full_name: string): Promise<void> {
        logger.info(`Sending verification email to ${email}`);

        const code_first = email_verification_code.slice(0, 4);
        const code_second = email_verification_code.slice(4, 8);

        await this.emailClient.sendVerificationEmail(
            email,
            {
                full_name,
                verification_code: email_verification_code,
                code_first,
                code_second,
                expiration_minutes: this.VERIFICATION.EXPIRATION_MINUTES
            }
        );
    }

    /**
    * Confirms the user's email based on the provided verification code.
    * @param code - The email verification code.
    * @returns A ResultAsync indicating success or an error.
    */
    async verifyEmail(code: string) {
        return ResultAsync.fromPromise(
            (async () => {
                const user = await User.findOne({ where: { email_verification_code: code } });

                if (!user) {
                    throw new Error('User not found');
                }

                if (user.is_email_verified) {
                    throw new Error('Email is already verified');
                }

                if (!user.email_verification_expires_at) {
                    throw new Error('Invalid code');
                }

                if (!this.isVerificationTimestampCodeValid(user.email_verification_expires_at)) {
                    throw new Error('Code has expired');
                }

                user.is_active = true;
                user.is_email_verified = true;
                user.email_verification_code = '';
                user.email_verification_expires_at = undefined;
                await user.save();

                logger.info(`Email successfully verified for user: ${user.email}`);
            })(),
            (error: unknown) => {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                logger.error(`Failed to verify email with code ${code}: ${errorMessage}`);
                return new Error(errorMessage);
            }
        );
    }

    /**
     * Updates user details.
     * @param email - The email of the user to update.
     * @param updates - An object containing the fields to update.
     * @returns A Result object indicating success or an error.
     */
    async updateUser(email: string, updates: Partial<Omit<User, 'role' | 'password'>>): Promise<Result<{ message: string; user: SanitizedUser }, Error>> {
        try {
            logger.info(`Attempting to update user with Email: ${email}`);
            const user = await User.findOne({ where: { email } });

            const validationResult = validateUpdates(updates);
            if (validationResult.isErr()) {
                logger.warn(`Invalid update data: ${validationResult.error.message}`);
                return Err(validationResult.error);
            }

            if (!user) {
                logger.warn(`User update failed. User not found with Email: ${email}`);
                return Err(new Error('User not found.'));
            }

            Object.assign(user, updates);
            await user.save();
            logger.info(`User updated successfully with Email: ${email}`);
            return Ok({
                message: 'User successfully updated.',
                user: this.sanitizeUser(user),
            });
        } catch (error) {
            logger.error(`Error updating user with Email: ${email}`, error);
            return Err(error as Error);
        }
    }

    /**
     * Updates a user's password after validating the current password.
     * @param email - The Email of the user.
     * @param current_password - The user's current password.
     * @param newPassword - The new password to be set.
     * @returns A Result indicating success or an error.
    */
    async updatePassword(email: string, current_password: string, new_password: string): Promise<Result<{ message: string; }, Error>> {
        try {
            logger.info(`Attempting to update password for user Email: ${email}`);
            const user = await User.findOne({ where: { email } });

            if (!user) {
                logger.warn(`Password update failed. User not found with Email: ${email}`);
                return Err(new Error('User not found.'));
            }

            const passwordValidation = this.validatePassword(new_password);
            if (passwordValidation.isErr()) {
                logger.warn(`Password update failed. Invalid new password format for Email: ${email}`);
                return Err(passwordValidation.error);
            }

            const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password);

            if (!isCurrentPasswordValid) {
                logger.warn(`Password update failed. Current password is incorrect for Email: ${email}`);
                return Err(new Error('Current password is incorrect.'));
            }

            user.password = await bcrypt.hash(new_password, 10);
            await user.save();
            logger.info(`Password updated successfully for Email: ${email}`);
            return Ok({
                message: 'Password successfully updated.',
            });
        } catch (error) {
            logger.error(`Error updating password for Email: ${email}`, error);
            return Err(error as Error);
        }
    }

    /**
     * Finds a user by email.
     * @param email - The email of the user.
     * @returns A Result object containing the user or an error.
     */
    async findUser(email: string): Promise<Result<{ message: string; user: SanitizedUser }, Error>> {
        try {
            logger.info(`Attempting to find user with email: ${email}`);
            const user = await User.findOne({ where: { email } });

            if (!user) {
                logger.warn(`Find user failed. User not found with email: ${email}`);
                return Err(new Error('User not found.'));
            }

            logger.info(`User retrieved successfully with email: ${email}`);
            return Ok({
                message: 'User successfully retrieved.',
                user: this.sanitizeUser(user),
            });
        } catch (error) {
            logger.error(`Error finding user with email: ${email}`, error);
            return Err(error as Error);
        }
    }

    /**
    * Finds a user by id.
    * @param id - The id of the user.
    * @returns A Result object containing the user or an error.
    */
    async findUserById(id: string): Promise<Result<User, Error>> {
        try {
            logger.info(`Attempting to find user with id: ${id}`);
            const user = await User.findOne({ where: { id } });

            if (!user) {
                logger.warn(`Find user failed. User not found with id: ${id}`);
                return Err(new Error('User not found.'));
            }

            logger.info(`User retrieved successfully with id: ${id}`);
            return Ok(user);
        } catch (error) {
            logger.error(`Error finding user with id: ${id}`, error);
            return Err(error as Error);
        }
    }

    /**
     * Deactivates a user account by setting `is_active` to false.
     * @param email - The Email of the user to deactivate.
     * @returns A Result object indicating success or an error.
     */
    async deactivateAccount(email: string): Promise<Result<{ message: string }, Error>> {
        try {
            logger.info(`Attempting to deactivate user with Email: ${email}`);
            const user = await User.findOne({ where: { email } });

            if (!user) {
                logger.warn(`Deactivate user failed. User not found with Email: ${email}`);
                return Err(new Error('User not found.'));
            }

            user.is_active = false;
            await user.save();
            logger.info(`User deactivated successfully with Email: ${email}`);
            return Ok({
                message: 'User successfully deactivated.',
            });
        } catch (error) {
            logger.error(`Error deactivating user with Email: ${email}`, error);
            return Err(error as Error);
        }
    }

    /**
     * Requests account deletion by anonymizing sensitive data.
     * @param email - The Email of the user requesting deletion.
     * @returns A Result object indicating success or an error.
     */
    async requestAccountDeletion(email: string): Promise<Result<{ message: string }, Error>> {
        try {
            logger.info(`Attempting to request account deletion for user Email: ${email}`);
            const user = await User.findOne({ where: { email } });

            if (!user) {
                logger.warn(`Account deletion request failed. User not found with Email: ${email}`);
                return Err(new Error('User not found.'));
            }

            user.is_active = false;
            user.email = `${user.email}.deleted.${Date.now()}`;
            user.full_name = '';

            await user.save();
            logger.info(`Account deletion requested successfully for user Email: ${email}`);
            return Ok({
                message: 'Account deletion successfully requested.',
            });
        } catch (error) {
            logger.error(`Error requesting account deletion for user Email: ${email}`, error);
            return Err(error as Error);
        }
    }
}
