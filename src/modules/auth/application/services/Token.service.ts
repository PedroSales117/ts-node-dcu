import jwt from 'jsonwebtoken';
import { AuthToken } from '../../domain/entities/AuthToken';
import { TokenPayload } from '../../domain/dto/auth.dto';
import { Result, Ok, Err } from '../../../../shared/core/Result';
import { TOKEN_TYPES, TokenValidationResponse, UserResult } from './types/types';
import logger from '../../../../shared/utils/logger';
import { UserService } from '../../../users/application/services/User.service';

export class TokenService {
    private readonly Auth = AuthToken;
    private readonly userService: UserService;

    private readonly jwtSecret = process.env.JWT_SECRET!;
    private readonly token_expiry = '45m';
    private readonly refresh_token_expiry = '7d';
    private readonly remember_me_days = 14;
    private readonly remember_me_expiry = '14d';
    private readonly MAX_TOKEN_AGE_DAYS = 30;
    private readonly ALLOWED_IP_CHANGE = false;
    private readonly ALLOWED_USER_AGENT_CHANGE = false;

    constructor() {
        this.userService = new UserService();
    }

    public async validateTokenOwnership(token: string, email: string): Promise<boolean> {
        try {
            const payload = jwt.verify(token, this.jwtSecret) as TokenPayload;

            if (!payload || !payload.id) {
                return false;
            }

            const user = await this.userService.findUserById(payload.id);

            if (!user || user.isErr() || !user.value) {
                return false
            }

            return user.value.email === email;
        } catch (error) {
            return false;
        }
    }

    validateTokenType(token: string, expectedType?: string): Result<TokenPayload, Error> {
        try {
            const payload = jwt.verify(token, this.jwtSecret) as TokenPayload;

            if (!payload || !payload.id) {
                logger.warn('Invalid token structure.', { token });
                return Err(new Error('Invalid token structure.'));
            }

            if (expectedType && payload.type !== expectedType) {
                logger.warn(`Invalid token type. Expected: ${expectedType}`, { token, expectedType });
                return Err(new Error(`Invalid token type. Expected: ${expectedType}`));
            }

            logger.info('Token validated successfully.', { token, payload });
            return Ok(payload);
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                logger.warn('Token has expired.', { token });
                return Err(new Error('Token has expired.'));
            }
            logger.error('Invalid token format.', { token, error });
            return Err(new Error('Invalid token format.'));
        }
    }

    generateAccessToken(userId: string): string {
        const token = jwt.sign(
            { id: userId, type: TOKEN_TYPES.ACCESS },
            this.jwtSecret,
            { expiresIn: this.token_expiry }
        );
        logger.info('Access token generated.', { userId, token });
        return token;
    }

    generateRefreshToken(userId: string): string {
        const token = jwt.sign(
            { id: userId, type: TOKEN_TYPES.REFRESH },
            this.jwtSecret,
            { expiresIn: this.refresh_token_expiry }
        );
        logger.info('Refresh token generated.', { userId, token });
        return token;
    }

    generateRememberMeToken(userId: string): string {
        const token = jwt.sign(
            { id: userId, type: TOKEN_TYPES.REMEMBER_ME },
            this.jwtSecret,
            { expiresIn: this.remember_me_expiry }
        );
        logger.info('Remember me token generated.', { userId, token });
        return token;
    }

    async createTokenRecord(
        userId: string,
        ipAddress: string,
        userAgent: string,
        isRememberMe: boolean = false,
        tokenVersion: number = 1
    ): Promise<AuthToken> {
        const tokenRecord = new AuthToken();
        tokenRecord.user_id = userId;
        tokenRecord.access_token = this.generateAccessToken(userId);
        tokenRecord.refresh_token = this.generateRefreshToken(userId);
        tokenRecord.ip_address = ipAddress;
        tokenRecord.user_agent = userAgent;

        if (isRememberMe) {
            tokenRecord.remember_me_token = this.generateRememberMeToken(userId);
            tokenRecord.is_remember_me_token = true;
            tokenRecord.remember_me_expires_at = this.calculateRememberMeExpiration();
            tokenRecord.token_version = tokenVersion;
        }

        logger.info('Token record created.', { userId, ipAddress, userAgent, isRememberMe, tokenVersion });
        return tokenRecord;
    }

    validateTokenAge(payload: TokenPayload): { isValid: boolean; message: string } {
        if (!payload.iat) {
            logger.warn('Token issue time not found.', { payload });
            return { isValid: false, message: 'Token issue time not found.' };
        }

        const issuedAt = payload.iat * 1000;
        const now = Date.now();
        const maxAge = this.MAX_TOKEN_AGE_DAYS * 24 * 60 * 60 * 1000;

        if (now - issuedAt > maxAge) {
            logger.warn('Token has exceeded maximum age.', { payload, maxAge });
            return {
                isValid: false,
                message: `Token has exceeded maximum age of ${this.MAX_TOKEN_AGE_DAYS} days.`
            };
        }

        logger.info('Token age is valid.', { payload });
        return { isValid: true, message: 'Token age is valid.' };
    }

    calculateRememberMeExpiration(): Date {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + this.remember_me_days);
        logger.info('Remember me expiration calculated.', { expiresAt });
        return expiresAt;
    }

    async revokeTokens(tokens: AuthToken[]): Promise<void> {
        await this.Auth.getRepository().manager.transaction(async transactionalEntityManager => {
            for (const token of tokens) {
                token.revokeToken();
                await transactionalEntityManager.save(token);
                logger.info('Token revoked.', { token });
            }
        });
    }

    async validateAccessToken(
        token: string,
        email?: string,
        currentIpAddress?: string,
        currentUserAgent?: string
    ): Promise<Result<TokenValidationResponse, TokenValidationResponse>> {
        try {
            logger.info('Validating access token');

            if (!token) {
                logger.warn('No token provided');
                return Err({
                    is_valid: false,
                    message: 'Token is required.'
                });
            }

            const validationResult = this.validateTokenType(token, TOKEN_TYPES.ACCESS);
            if (validationResult.isErr()) {
                return Err({
                    is_valid: false,
                    message: validationResult.error.message
                });
            }

            const payload = validationResult.value;

            const tokenAge = this.validateTokenAge(payload);
            if (!tokenAge.isValid) {
                logger.warn(`Token age validation failed: ${tokenAge.message}`);
                return Err({
                    is_valid: false,
                    message: tokenAge.message,
                    user_status: {
                        is_active: false,
                        is_email_verified: false,
                        token_status: 'expired'
                    }
                });
            }

            const [user, tokenRecord] = await Promise.all([
                this.userService.findUserById(payload.id),
                this.Auth.getRepository().findOne({
                    where: {
                        user_id: payload.id,
                        access_token: token,
                        revoked: false
                    }
                })
            ]);

            if (!user || user.isErr() || !user.value) {
                logger.warn(`User not found for token`);
                return Err({
                    is_valid: false,
                    message: 'User not found.',
                    user_status: {
                        is_active: false,
                        is_email_verified: false,
                        token_status: 'valid'
                    }
                });
            }

            const userValue = user.value;

            if (email && userValue.email !== email) {
                logger.warn(`Token ownership validation failed for email: ${email}`);
                return Err({
                    is_valid: false,
                    message: 'Token ownership validation failed.',
                    user_status: {
                        is_active: userValue.is_active,
                        is_email_verified: userValue.is_email_verified,
                        token_status: 'valid'
                    }
                });
            }

            if (!userValue.is_active || !userValue.is_email_verified) {
                logger.warn(`User account is inactive or unverified`);
                return Err({
                    is_valid: false,
                    message: 'User account is inactive or unverified.',
                    user_status: {
                        is_active: userValue.is_active,
                        is_email_verified: userValue.is_email_verified,
                        token_status: 'valid'
                    }
                });
            }

            if (!tokenRecord) {
                logger.warn('Token has been revoked or is invalid');
                return Err({
                    is_valid: false,
                    message: 'Token has been revoked.',
                    user_status: {
                        is_active: userValue.is_active,
                        is_email_verified: userValue.is_email_verified,
                        token_status: 'revoked'
                    }
                });
            }

            if (currentIpAddress && !this.ALLOWED_IP_CHANGE && tokenRecord.ip_address !== currentIpAddress) {
                logger.warn(`IP address mismatch. Expected: ${tokenRecord.ip_address}, Got: ${currentIpAddress}`);
                return Err({
                    is_valid: false,
                    message: 'Token IP address mismatch.',
                    user_status: {
                        is_active: userValue.is_active,
                        is_email_verified: userValue.is_email_verified,
                        token_status: 'invalid'
                    }
                });
            }

            if (currentUserAgent && !this.ALLOWED_USER_AGENT_CHANGE && tokenRecord.user_agent !== currentUserAgent) {
                logger.warn(`User agent mismatch. Expected: ${tokenRecord.user_agent}, Got: ${currentUserAgent}`);
                return Err({
                    is_valid: false,
                    message: 'Token user agent mismatch.',
                    user_status: {
                        is_active: userValue.is_active,
                        is_email_verified: userValue.is_email_verified,
                        token_status: 'invalid'
                    }
                });
            }

            logger.info('Token validated successfully');
            return Ok({
                user: userValue,
                is_valid: true,
                message: 'Token valid.',
                user_status: {
                    is_active: userValue.is_active,
                    is_email_verified: userValue.is_email_verified,
                    token_status: 'valid'
                }
            });

        } catch (error) {
            logger.error('Unexpected error during token validation:', error);
            return Err({
                is_valid: false,
                message: error.message
            });
        }
    }

    async revokeRememberMeToken(
        remember_me_token: string
    ): Promise<Result<{ message: string }, Error>> {
        try {
            logger.info(`Revoking Remember Me token`);

            const tokenRecord = await this.Auth.getRepository().findOne({
                where: {
                    remember_me_token: remember_me_token,
                    is_remember_me_token: true,
                    revoked: false
                }
            });

            if (!tokenRecord) {
                return Err(new Error('Token not found or already revoked.'));
            }

            await this.revokeTokens([tokenRecord]);
            return Ok({ message: 'Remember Me token successfully revoked.' });
        } catch (error) {
            logger.error(`Error revoking Remember Me token`, error);
            return Err(error as Error);
        }
    }

    async revokeAllRememberMeTokens(
        userId: string
    ): Promise<Result<{ message: string }, Error>> {
        try {
            logger.info(`Revoking all Remember Me tokens for user: ${userId}`);

            const tokens = await this.Auth.getRepository().find({
                where: {
                    user_id: userId,
                    is_remember_me_token: true,
                    revoked: false
                }
            });

            if (tokens.length > 0) {
                await this.revokeTokens(tokens);
            }

            return Ok({ message: 'All Remember Me tokens successfully revoked.' });
        } catch (error) {
            logger.error(`Error revoking all Remember Me tokens for user: ${userId}`, error);
            return Err(error as Error);
        }
    }

    async validateRememberMeToken(
        remember_me_token: string
    ): Promise<Result<{ tokenRecord: AuthToken; user: UserResult }, Error>> {
        try {
            logger.info('Validating Remember Me token');

            const validationResult = this.validateTokenType(remember_me_token, TOKEN_TYPES.REMEMBER_ME);
            if (validationResult.isErr()) {
                return Err(validationResult.error);
            }

            const payload = validationResult.value;

            const tokenRecord = await this.Auth.getRepository().findOne({
                where: {
                    user_id: payload.id,
                    remember_me_token: remember_me_token,
                    is_remember_me_token: true,
                    revoked: false
                }
            });

            if (!tokenRecord) {
                logger.warn('Remember Me token not found or revoked');
                return Err(new Error('Remember Me token is invalid or has been revoked.'));
            }

            if (new Date() > tokenRecord.remember_me_expires_at!) {
                logger.warn('Remember Me token has expired');
                return Err(new Error('Remember Me token has expired.'));
            }

            const user = await this.userService.findUserById(payload.id);

            if (!user || user.isErr() || !user.value) {
                logger.warn('User not found for Remember Me token');
                return Err(new Error('User not found for Remember Me token.'));
            }

            const userValue = user.value;

            if (!user || !userValue.is_active || !userValue.is_email_verified) {
                logger.warn('User account is invalid, inactive, or unverified');
                return Err(new Error('User account is invalid or inactive.'));
            }

            logger.info('Remember Me token validated successfully');
            return Ok({
                tokenRecord,
                user: userValue
            });
        } catch (error) {
            logger.error('Error validating Remember Me token:', error);
            return Err(error as Error);
        }
    }

    async validateRefreshToken(
        refresh_token: string
    ): Promise<Result<{ tokenRecord: AuthToken; user: UserResult }, Error>> {
        try {
            logger.info('Validating refresh token');

            const validationResult = this.validateTokenType(refresh_token, TOKEN_TYPES.REFRESH);
            if (validationResult.isErr()) {
                return Err(validationResult.error);
            }

            const payload = validationResult.value;

            const tokenAgeValidation = this.validateTokenAge(payload);
            if (!tokenAgeValidation.isValid) {
                return Err(new Error(tokenAgeValidation.message));
            }

            const tokenRecord = await this.Auth.getRepository().findOne({
                where: {
                    user_id: payload.id,
                    refresh_token: refresh_token,
                    revoked: false
                }
            });

            if (!tokenRecord) {
                logger.warn('Refresh token not found or revoked');
                return Err(new Error('Refresh token is invalid or has been revoked.'));
            }

            const user = await this.userService.findUserById(payload.id);

            if (!user || user.isErr() || !user.value) {
                logger.warn('User not found for refresh token');
                return Err(new Error('User not found for refresh token.'));
            }

            const userValue = user.value;

            if (!user || !userValue.is_active || !userValue.is_email_verified) {
                logger.warn('User account is invalid, inactive, or unverified');
                return Err(new Error('User account is invalid or inactive.'));
            }

            logger.info('Refresh token validated successfully');
            return Ok({
                tokenRecord,
                user: userValue
            });
        } catch (error) {
            logger.error('Error validating refresh token:', error);
            return Err(error as Error);
        }
    }

    async revokeUserTokens(
        access_token: string,
        refresh_token?: string,
        remember_me_token?: string
    ): Promise<Result<void, Error>> {
        try {
            logger.info('Revoking user tokens');

            const validationResult = this.validateTokenType(access_token);
            if (validationResult.isErr()) {
                return Err(validationResult.error);
            }

            const payload = validationResult.value;
            const tokensToRevoke = await this.Auth.getRepository().find({
                where: [
                    { user_id: payload.id, access_token },
                    ...(refresh_token ? [{ user_id: payload.id, refresh_token }] : []),
                    ...(remember_me_token ? [{ user_id: payload.id, remember_me_token }] : [])
                ]
            });

            if (tokensToRevoke.length === 0) {
                logger.warn('No tokens found to revoke');
                return Err(new Error('No valid tokens found to revoke.'));
            }

            await this.revokeTokens(tokensToRevoke);
            logger.info('User tokens revoked successfully');
            return Ok(void 0);
        } catch (error) {
            logger.error('Error revoking user tokens:', error);
            return Err(error as Error);
        }
    }
}
