import { User } from "../entities/User";

export interface ICreateUserRequest {
    email: string;
    password: string;
    full_name: string;
    password_confirmation: string;
}

export interface IAuthenticateUserRequest extends User {
    email: string;
    password: string;
}

export interface IUpdateUserRequest extends User {
    full_name: string;
    email: string;
}

export interface IFindUserRequestParams extends User {
    email: string;
}

export interface IDeactivateAccountRequest extends User {
    email: string;
}

export interface IRequestAccountDeletionRequest extends User {
    email: string;
}

/**
 * Interface for updating a user's password.
 */
export interface IUpdatePasswordRequest extends User {
    current_password: string;
    new_password: string;
}
