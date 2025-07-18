import { RootAdapter } from "../adapter/root.adapter";
import { IRootService } from "../../domain/interfaces/IRootService";

/**
 * The RootService class provides a service layer to interact with the RootAdapter.
 * It abstracts the underlying adapter and exposes methods to be used by higher layers in the application.
 */
export class RootService implements IRootService {
  private rootAdapter: RootAdapter;

  /**
   * Initializes the RootService with the given RootAdapter.
   *
   * @param rootAdapter - An instance of RootAdapter that this service will use to interact with the root status.
   */
  constructor(rootAdapter: RootAdapter) {
    this.rootAdapter = rootAdapter;
  }

  /**
   * Returns the root status message combined with a test message.
   *
   * @param message - The test message to be added to the root status.
   * @returns A promise that resolves with the combined status message and test message, or rejects with an error.
   */
  async returnMessage(message: string) {
    return this.rootAdapter.returnMessage(message);
  }
}
