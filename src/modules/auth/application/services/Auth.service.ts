import { Result, Ok, Err } from '../../../../shared/core/Result';
import { TokenService } from './Token.service';
import { TokenResponse } from './types/types';
import logger from '../../../../shared/utils/logger';
import bcrypt from 'bcryptjs';
import { UserService } from '../../../users/application/services/User.service';
import { AuthToken } from '../../domain/entities/AuthToken';

export class AuthService {
    private readonly Auth = AuthToken;
    private readonly tokenService: TokenService;
    private readonly userService: UserService;

    constructor() {
        this.tokenService = new TokenService();
        this.userService = new UserService();
    }

    async login(
        email: string,
        password: string,
        ipAddress: string,
        userAgent: string,
        remember_me: boolean = false
    ): Promise<Result<TokenResponse, Error>> {
        try {
            logger.info('Attempting login');

            const user = await this.userService.findUser(email);
            if (!user || user.isErr() || !user.value) {
                logger.warn(`Login failed. User not found: ${email}`);
                return Err(new Error('Invalid credentials.'));
            }

            const id = await this.userService.getUserId(email);
            if (!id || id.isErr() || !id.value) {
                logger.warn(`Login failed. Id not found: ${email}`);
                return Err(new Error('Invalid credentials.'));
            }

            const user_by_id = await this.userService.findUserById(id.value);
            if (!user_by_id || user_by_id.isErr() || !user_by_id.value) {
                logger.warn(`Login failed. User not found: ${email}`);
                return Err(new Error('Invalid credentials.'));
            }

            const userValue = user_by_id.value;

            if (!userValue.is_email_verified || !userValue.is_active) {
                logger.warn(
                    `Login failed. Account status - verified: ${userValue.is_email_verified}, active: ${userValue.is_active}`
                );
                return Err(new Error('Account is inactive or unverified.'));
            }

            const isValidPassword = await bcrypt.compare(password, userValue.password!);
            if (!isValidPassword) {
                logger.warn(`Login failed. Invalid password for user: ${email}`);
                return Err(new Error('Invalid credentials.'));
            }

            const tokenRecord = await this.tokenService.createTokenRecord(
                userValue.id,
                ipAddress,
                userAgent,
                remember_me
            );

            await tokenRecord.save();

            const response: TokenResponse = {
                access_token: tokenRecord.access_token,
                refresh_token: tokenRecord.refresh_token
            };

            if (remember_me && tokenRecord.remember_me_token) {
                response.remember_me_token = tokenRecord.remember_me_token;
            }

            logger.info(`Login successful for user: ${userValue.id}`);
            return Ok(response);
        } catch (error) {
            logger.error('Error during login:', error);
            return Err(error as Error);
        }
    }

    async loginWithRememberMe(
        remember_me_token: string,
        ipAddress: string,
        userAgent: string
    ): Promise<Result<TokenResponse, Error>> {
        try {
            logger.info('Attempting login with Remember Me token');

            const validationResult = await this.tokenService.validateRememberMeToken(remember_me_token);
            if (validationResult.isErr()) {
                return Err(validationResult.error);
            }

            const { tokenRecord, user } = validationResult.value;

            const newTokenRecord = await this.tokenService.createTokenRecord(
                user.id,
                ipAddress,
                userAgent,
                true,
                (tokenRecord.token_version || 0) + 1
            );

            await this.Auth.getRepository().manager.transaction(async transactionalEntityManager => {
                await transactionalEntityManager.save(newTokenRecord);
                tokenRecord.revokeToken();
                await transactionalEntityManager.save(tokenRecord);
            });

            logger.info(`Remember Me login successful for user: ${user.id}`);
            return Ok({
                access_token: newTokenRecord.access_token,
                refresh_token: newTokenRecord.refresh_token,
                remember_me_token: newTokenRecord.remember_me_token!
            });
        } catch (error) {
            logger.error('Error during Remember Me login', error);
            return Err(error as Error);
        }
    }

    async refresh(
        refresh_token: string,
        ipAddress: string,
        userAgent: string
    ): Promise<Result<TokenResponse, Error>> {
        try {
            logger.info('Refreshing tokens');

            const validationResult = await this.tokenService.validateRefreshToken(refresh_token);
            if (validationResult.isErr()) {
                return Err(validationResult.error);
            }

            const { tokenRecord, user } = validationResult.value;

            const newTokenRecord = await this.tokenService.createTokenRecord(
                user.id,
                ipAddress,
                userAgent
            );

            await this.Auth.getRepository().manager.transaction(async transactionalEntityManager => {
                await transactionalEntityManager.save(newTokenRecord);
                tokenRecord.revokeToken();
                await transactionalEntityManager.save(tokenRecord);
            });

            logger.info(`Tokens refreshed successfully for user ID: ${user.id}`);
            return Ok({
                access_token: newTokenRecord.access_token,
                refresh_token: newTokenRecord.refresh_token
            });
        } catch (error) {
            logger.error('Error during token refresh', error);
            return Err(error as Error);
        }
    }

    async logout(
        access_token: string,
        refresh_token?: string,
        remember_me_token?: string
    ): Promise<Result<{ message: string }, Error>> {
        try {
            logger.info('Attempting to logout user');
            const result = await this.tokenService.revokeUserTokens(
                access_token,
                refresh_token,
                remember_me_token
            );

            if (result.isErr()) {
                return Err(result.error);
            }

            return Ok({ message: 'Logout successful.' });
        } catch (error) {
            logger.error('Error during logout:', error);
            return Err(error as Error);
        }
    }

    async revokeRememberMeToken(
        remember_me_token: string
    ): Promise<Result<{ message: string }, Error>> {
        return this.tokenService.revokeRememberMeToken(remember_me_token);
    }

    async revokeAllRememberMeTokens(
        userId: string
    ): Promise<Result<{ message: string }, Error>> {
        return this.tokenService.revokeAllRememberMeTokens(userId);
    }

    // Token validation methods
    async validateAccessToken(token: string, email?: string, ipAddress?: string, userAgent?: string) {
        return this.tokenService.validateAccessToken(token, email, ipAddress, userAgent);
    }

    async validateTokenOwnership(token: string, email: string): Promise<boolean> {
        return this.tokenService.validateTokenOwnership(token, email);
    }
}