/**
 * The IRootRequest interface defines the structure of the request object
 * expected by the RootController when handling requests that include a message.
 */
export interface IRootRequest {
    /**
     * A message that is included in the request.
     */
    message: string;
}
