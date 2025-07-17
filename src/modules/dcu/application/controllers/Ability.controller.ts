import { AdapterReply, AdapterRequest } from '../../../../shared/configurations/adapters/server.adapter';
import { HttpStatus } from '../../../../shared/helpers/http-status.helper';
import { AbilityService } from '../services/Ability.service';
import { ICreateAbilityRequest, IUpdateAbilityRequest, ICreateAbilityRegistryRequest, IUpdateAbilityRegistryRequest } from '../../domain/dtos/dcu.dto';
import logger from '../../../../shared/utils/logger';

/**
 * Controller for handling Ability-related HTTP requests in the DCU system.
 * Manages powers, abilities, and their assignments to individuals.
 */
export class AbilityController {
    private abilityService: AbilityService;

    /**
     * Initializes the AbilityController with required services.
     */
    constructor() {
        this.abilityService = new AbilityService();
    }

    /**
     * Creates a new ability/power in the system.
     * @param {AdapterRequest} request - HTTP request containing ability data
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async createAbility(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            const data = request.body as ICreateAbilityRequest;

            logger.info(`POST /dcu/abilities - Creating ability: ${data.name}`);

            const result = await this.abilityService.createAbility(data);

            result.match(
                ability => {
                    logger.info(`Ability created successfully: ${ability.name}`);
                    reply.status(HttpStatus.CREATED).send({
                        status: 'success',
                        data: ability
                    });
                },
                error => {
                    logger.warn(`Failed to create ability: ${error.message}`);
                    reply.status(HttpStatus.BAD_REQUEST).send({
                        status: 'error',
                        message: error.message
                    });
                }
            );
        } catch (error) {
            logger.error('Unexpected error in createAbility:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }

    /**
     * Updates an existing ability's information.
     * @param {AdapterRequest} request - HTTP request with ability ID and update data
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async updateAbility(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            const { id } = request.params as { id: string };
            const data = request.body as IUpdateAbilityRequest;

            logger.info(`PUT /dcu/abilities/${id} - Updating ability`);

            const result = await this.abilityService.updateAbility(id, data);

            result.match(
                ability => {
                    logger.info(`Ability updated successfully: ${ability.name}`);
                    reply.status(HttpStatus.OK).send({
                        status: 'success',
                        data: ability
                    });
                },
                error => {
                    logger.warn(`Failed to update ability: ${error.message}`);
                    const status = error.message.includes('not found') ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
                    reply.status(status).send({
                        status: 'error',
                        message: error.message
                    });
                }
            );
        } catch (error) {
            logger.error('Unexpected error in updateAbility:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }

    /**
     * Retrieves an ability by its ID.
     * @param {AdapterRequest} request - HTTP request with ability ID
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async getAbilityById(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            const { id } = request.params as { id: string };

            logger.info(`GET /dcu/abilities/${id} - Fetching ability`);

            const result = await this.abilityService.getAbilityById(id);

            result.match(
                ability => {
                    logger.info(`Ability retrieved: ${ability.name}`);
                    reply.status(HttpStatus.OK).send({
                        status: 'success',
                        data: ability
                    });
                },
                error => {
                    logger.warn(`Ability not found: ${id}`);
                    reply.status(HttpStatus.NOT_FOUND).send({
                        status: 'error',
                        message: error.message
                    });
                }
            );
        } catch (error) {
            logger.error('Unexpected error in getAbilityById:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }

    /**
     * Searches abilities by name or power origin.
     * @param {AdapterRequest} request - HTTP request with search term
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async searchAbilities(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            const { search } = request.query as { search: string };

            logger.info(`GET /dcu/abilities/search - Searching abilities with term: ${search}`);

            const result = await this.abilityService.searchAbilities(search || '');

            result.match(
                abilities => {
                    logger.info(`Search returned ${abilities.length} abilities`);
                    reply.status(HttpStatus.OK).send({
                        status: 'success',
                        data: abilities,
                        count: abilities.length
                    });
                },
                error => {
                    logger.warn(`Search failed: ${error.message}`);
                    reply.status(HttpStatus.BAD_REQUEST).send({
                        status: 'error',
                        message: error.message
                    });
                }
            );
        } catch (error) {
            logger.error('Unexpected error in searchAbilities:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }

    /**
     * Lists all abilities in the system.
     * @param {AdapterRequest} request - HTTP request
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async listAbilities(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            logger.info('GET /dcu/abilities - Listing all abilities');

            const result = await this.abilityService.listAbilities();

            result.match(
                abilities => {
                    logger.info(`Listed ${abilities.length} abilities`);
                    reply.status(HttpStatus.OK).send({
                        status: 'success',
                        data: abilities,
                        count: abilities.length
                    });
                },
                error => {
                    logger.warn(`Failed to list abilities: ${error.message}`);
                    reply.status(HttpStatus.BAD_REQUEST).send({
                        status: 'error',
                        message: error.message
                    });
                }
            );
        } catch (error) {
            logger.error('Unexpected error in listAbilities:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }

    /**
     * Assigns an ability to an individual.
     * @param {AdapterRequest} request - HTTP request with assignment data
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async assignAbilityToIndividual(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            const data = request.body as ICreateAbilityRegistryRequest;

            logger.info(`POST /dcu/abilities/assign - Assigning ability ${data.ability_id} to individual ${data.individual_id}`);

            const result = await this.abilityService.assignAbilityToIndividual(data);

            result.match(
                registry => {
                    logger.info('Ability assigned successfully');
                    reply.status(HttpStatus.CREATED).send({
                        status: 'success',
                        data: registry
                    });
                },
                error => {
                    logger.warn(`Failed to assign ability: ${error.message}`);
                    reply.status(HttpStatus.BAD_REQUEST).send({
                        status: 'error',
                        message: error.message
                    });
                }
            );
        } catch (error) {
            logger.error('Unexpected error in assignAbilityToIndividual:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }

    /**
     * Updates an individual's mastery level for an ability.
     * @param {AdapterRequest} request - HTTP request with registry ID and update data
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async updateAbilityMastery(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            const { registryId } = request.params as { registryId: string };
            const data = request.body as IUpdateAbilityRegistryRequest;

            logger.info(`PUT /dcu/abilities/registry/${registryId} - Updating mastery level`);

            const result = await this.abilityService.updateAbilityMastery(registryId, data);

            result.match(
                registry => {
                    logger.info('Mastery level updated successfully');
                    reply.status(HttpStatus.OK).send({
                        status: 'success',
                        data: registry
                    });
                },
                error => {
                    logger.warn(`Failed to update mastery level: ${error.message}`);
                    const status = error.message.includes('not found') ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
                    reply.status(status).send({
                        status: 'error',
                        message: error.message
                    });
                }
            );
        } catch (error) {
            logger.error('Unexpected error in updateAbilityMastery:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }

    /**
     * Removes an ability from an individual.
     * @param {AdapterRequest} request - HTTP request with registry ID
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async removeAbilityFromIndividual(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            const { registryId } = request.params as { registryId: string };

            logger.info(`DELETE /dcu/abilities/registry/${registryId} - Removing ability from individual`);

            const result = await this.abilityService.removeAbilityFromIndividual(registryId);

            result.match(
                () => {
                    logger.info('Ability removed successfully');
                    reply.status(HttpStatus.NO_CONTENT).send();
                },
                error => {
                    logger.warn(`Failed to remove ability: ${error.message}`);
                    const status = error.message.includes('not found') ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
                    reply.status(status).send({
                        status: 'error',
                        message: error.message
                    });
                }
            );
        } catch (error) {
            logger.error('Unexpected error in removeAbilityFromIndividual:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }

    /**
     * Gets all individuals who possess a specific ability.
     * @param {AdapterRequest} request - HTTP request with ability ID
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async getIndividualsByAbility(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            const { abilityId } = request.params as { abilityId: string };

            logger.info(`GET /dcu/abilities/${abilityId}/individuals - Getting individuals with ability`);

            const result = await this.abilityService.getIndividualsByAbility(abilityId);

            result.match(
                registries => {
                    logger.info(`Found ${registries.length} individuals with this ability`);
                    reply.status(HttpStatus.OK).send({
                        status: 'success',
                        data: registries,
                        count: registries.length
                    });
                },
                error => {
                    logger.warn(`Failed to get individuals: ${error.message}`);
                    reply.status(HttpStatus.BAD_REQUEST).send({
                        status: 'error',
                        message: error.message
                    });
                }
            );
        } catch (error) {
            logger.error('Unexpected error in getIndividualsByAbility:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }
}