import { AuthToken } from "../entities/AuthToken";

export interface AuthTokenDTO extends Partial<AuthToken> { }

export interface ILoginRequest {
    email: string;
    password: string;
    remember_me?: boolean;
}

export interface ILoginRequest {
    email: string;
    password: string;
}

export interface TokenPayload {
    id: string;
    type?: string;
    iat: number;
    exp: number;
}

export interface ILogoutRequest {
    refresh_token?: string;
    remember_me_token?: string;
}
