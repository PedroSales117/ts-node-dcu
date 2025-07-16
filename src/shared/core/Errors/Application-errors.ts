import { HttpStatus } from "../../helpers/http-status.helper";

export class ValidationError extends Error {
    status: number;
    validationErrors: any[];

    constructor(message: string, validationErrors: any[] = []) {
        super(message);
        this.name = 'ValidationError';
        this.status = HttpStatus.UNPROCESSABLE_ENTITY;
        this.validationErrors = validationErrors;
    }
}

export class NotFoundError extends Error {
    status: number;

    constructor(resource: string) {
        super(`${resource} not found`);
        this.name = 'NotFoundError';
        this.status = HttpStatus.NOT_FOUND;
    }
}

export class UnauthorizedError extends Error {
    status: number;

    constructor(message: string = 'Unauthorized') {
        super(message);
        this.name = 'UnauthorizedError';
        this.status = HttpStatus.UNAUTHORIZED;
    }
}