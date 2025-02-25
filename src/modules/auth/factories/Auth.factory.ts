import { AuthService } from '../services/Auth.service';
import AppDataSource from '../../../ormconfig';

/**
 * Factory class for creating instances of AuthService.
 * Responsible for providing a pre-configured AuthService
 * with its required dependencies.
 */
export class AuthServiceFactory {
    /**
     * Creates and returns an instance of AuthService.
     * 
     * @returns {AuthService} A configured instance of AuthService.
     */
    static create(): AuthService {
        return new AuthService(AppDataSource);
    }
}
