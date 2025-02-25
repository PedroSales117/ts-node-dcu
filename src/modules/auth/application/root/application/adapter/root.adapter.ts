import { RootDTO } from '../../domain/dto/root.dto';
import { ResultAsync } from '../../../../../../shared/core/Result';

/**
 * The RootAdapter class handles operations related to the root status of the application.
 */
export class RootAdapter {
  constructor() { }

  /**
   * Returns the root status message along with an additional message.
   * Combines the resolved message from rootStatus with the provided message.
   *
   * @param message - The message to be added to the root status.
   * @returns A ResultAsync object containing the combined status message and message, or an error.
   */
  async returnMessage(message: string) {
    return ResultAsync.fromPromise<{ root: RootDTO, message: string }, Error>(
      Promise.resolve({ root: { message }, message }),
      (error: unknown) => new Error(`Failed to return root status: ${error instanceof Error ? error.message : String(error)}`)
    );
  }
}
