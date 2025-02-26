import { StatusCodes } from "http-status-codes";

/**
 * A mapping object for HTTP status codes to enhance readability and maintainability
 * throughout the application. It leverages the `http-status-codes` library for
 * consistent status code references.
 * 
 * @readonly
 * @enum {number}
 * 
 * @property {number} OK - 200: The request has succeeded
 * @property {number} CREATED - 201: The request has succeeded and a new resource has been created
 * @property {number} NO_CONTENT - 204: The request has succeeded but returns no content
 * @property {number} BAD_REQUEST - 400: The server cannot process the request due to client error
 * @property {number} UNAUTHORIZED - 401: Authentication is required and has failed or not been provided
 * @property {number} NOT_FOUND - 404: The requested resource could not be found
 * @property {number} TOO_MANY_REQUESTS - 429: The user has sent too many requests
 * @property {number} INTERNAL_SERVER_ERROR - 500: Generic server error
 * @property {number} MULTI_STATUS - 207: Multiple status for batch operations
 */
export const HttpStatus = Object.freeze({
  OK: StatusCodes.OK,
  INTERNAL_SERVER_ERROR: StatusCodes.INTERNAL_SERVER_ERROR,
  BAD_REQUEST: StatusCodes.BAD_REQUEST,
  CREATED: StatusCodes.CREATED,
  NO_CONTENT: StatusCodes.NO_CONTENT,
  NOT_FOUND: StatusCodes.NOT_FOUND,
  TOO_MANY_REQUESTS: StatusCodes.TOO_MANY_REQUESTS,
  UNAUTHORIZED: StatusCodes.UNAUTHORIZED,
  MULTI_STATUS: StatusCodes.MULTI_STATUS,
  FORBIDDEN: StatusCodes.FORBIDDEN,
} as const);

/**
 * Type representing valid HTTP status codes
 * Derived from the HttpStatus object keys
 * 
 * @typedef {number} HttpStatus
 */
export type HttpStatus = typeof HttpStatus[keyof typeof HttpStatus];