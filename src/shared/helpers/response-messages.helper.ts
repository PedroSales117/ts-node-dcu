export interface ServiceResponse<T = void> {
    code: string;
    message: string;
    data?: T;
}

export const ResponseMessages = Object.freeze({
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR'
} as const);

export type ResponseMessage = typeof ResponseMessages[keyof typeof ResponseMessages];
