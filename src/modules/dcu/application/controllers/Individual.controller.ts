import { AdapterReply, AdapterRequest } from '../../../../shared/configurations/adapters/server.adapter';
import { HttpStatus } from '../../../../shared/helpers/http-status.helper';
import { IndividualService } from '../services/Individual.service';
import { ICreateIndividualRequest, IUpdateIndividualRequest, IIndividualQueryParams } from '../../domain/dtos/dcu.dto';
import logger from '../../../../shared/utils/logger';

/**
 * Controller for handling Individual-related HTTP requests in the DCU system.
 * Manages heroes, villains, and other individuals in the DC Universe.
 */
export class IndividualController {
    private individualService: IndividualService;

    /**
     * Initializes the IndividualController with required services.
     */
    constructor() {
        this.individualService = new IndividualService();
    }

    /**
     * Creates a new individual (hero, villain, civilian, etc.).
     * @param {AdapterRequest} request - HTTP request containing individual data
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async createIndividual(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            const data = request.body as ICreateIndividualRequest;

            logger.info(`POST /dcu/individuals - Creating individual: ${data.primary_designation}`);

            const result = await this.individualService.createIndividual(data);

            result.match(
                individual => {
                    logger.info(`Individual created successfully: ${individual.primary_designation}`);
                    reply.status(HttpStatus.CREATED).send({
                        status: 'success',
                        data: individual
                    });
                },
                error => {
                    logger.warn(`Failed to create individual: ${error.message}`);
                    reply.status(HttpStatus.BAD_REQUEST).send({
                        status: 'error',
                        message: error.message
                    });
                }
            );
        } catch (error) {
            logger.error('Unexpected error in createIndividual:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }

    /**
     * Updates an existing individual's information.
     * @param {AdapterRequest} request - HTTP request with individual ID and update data
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async updateIndividual(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            const { id } = request.params as { id: string };
            const data = request.body as IUpdateIndividualRequest;

            logger.info(`PUT /dcu/individuals/${id} - Updating individual`);

            const result = await this.individualService.updateIndividual(id, data);

            result.match(
                individual => {
                    logger.info(`Individual updated successfully: ${individual.primary_designation}`);
                    reply.status(HttpStatus.OK).send({
                        status: 'success',
                        data: individual
                    });
                },
                error => {
                    logger.warn(`Failed to update individual: ${error.message}`);
                    const status = error.message.includes('not found') ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
                    reply.status(status).send({
                        status: 'error',
                        message: error.message
                    });
                }
            );
        } catch (error) {
            logger.error('Unexpected error in updateIndividual:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }

    /**
     * Retrieves an individual by their ID.
     * @param {AdapterRequest} request - HTTP request with individual ID
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async getIndividualById(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            const { id } = request.params as { id: string };

            logger.info(`GET /dcu/individuals/${id} - Fetching individual`);

            const result = await this.individualService.getIndividualById(id);

            result.match(
                individual => {
                    logger.info(`Individual retrieved: ${individual.primary_designation}`);
                    reply.status(HttpStatus.OK).send({
                        status: 'success',
                        data: individual
                    });
                },
                error => {
                    logger.warn(`Individual not found: ${id}`);
                    reply.status(HttpStatus.NOT_FOUND).send({
                        status: 'error',
                        message: error.message
                    });
                }
            );
        } catch (error) {
            logger.error('Unexpected error in getIndividualById:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }

    /**
     * Searches for individuals based on query parameters.
     * @param {AdapterRequest} request - HTTP request with search parameters
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async searchIndividuals(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            const query = request.query as IIndividualQueryParams;

            logger.info('GET /dcu/individuals/search - Searching individuals');

            const result = await this.individualService.searchIndividuals(query);

            result.match(
                individuals => {
                    logger.info(`Search returned ${individuals.length} individuals`);
                    reply.status(HttpStatus.OK).send({
                        status: 'success',
                        data: individuals,
                        count: individuals.length
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
            logger.error('Unexpected error in searchIndividuals:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }

    /**
     * Lists all individuals with pagination.
     * @param {AdapterRequest} request - HTTP request with pagination parameters
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async listIndividuals(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            const { page = 1, limit = 20 } = request.query as { page?: number; limit?: number };

            logger.info(`GET /dcu/individuals - Listing individuals (page: ${page}, limit: ${limit})`);

            const result = await this.individualService.listIndividuals(Number(page), Number(limit));

            result.match(
                ({ individuals, total }) => {
                    logger.info(`Listed ${individuals.length} of ${total} individuals`);
                    reply.status(HttpStatus.OK).send({
                        status: 'success',
                        data: individuals,
                        pagination: {
                            page: Number(page),
                            limit: Number(limit),
                            total,
                            totalPages: Math.ceil(total / Number(limit))
                        }
                    });
                },
                error => {
                    logger.warn(`Failed to list individuals: ${error.message}`);
                    reply.status(HttpStatus.BAD_REQUEST).send({
                        status: 'error',
                        message: error.message
                    });
                }
            );
        } catch (error) {
            logger.error('Unexpected error in listIndividuals:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }

    /**
     * Deletes an individual from the system.
     * @param {AdapterRequest} request - HTTP request with individual ID
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async deleteIndividual(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            const { id } = request.params as { id: string };

            logger.info(`DELETE /dcu/individuals/${id} - Deleting individual`);

            const result = await this.individualService.deleteIndividual(id);

            result.match(
                () => {
                    logger.info(`Individual deleted successfully`);
                    reply.status(HttpStatus.NO_CONTENT).send();
                },
                error => {
                    logger.warn(`Failed to delete individual: ${error.message}`);
                    const status = error.message.includes('not found') ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
                    reply.status(status).send({
                        status: 'error',
                        message: error.message
                    });
                }
            );
        } catch (error) {
            logger.error('Unexpected error in deleteIndividual:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }
}