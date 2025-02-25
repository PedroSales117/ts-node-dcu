import { UserService } from "../services/User.service";

/**
 * Factory class for creating instances of UserService.
 */
export class UserServiceFactory {
  /**
   * Creates and returns an instance of UserService.
   * @returns An instance of UserService.
   */
  static create(): UserService {
    return new UserService();
  }
}
