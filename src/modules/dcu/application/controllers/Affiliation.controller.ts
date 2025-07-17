import { AdapterReply, AdapterRequest } from '../../../../shared/configurations/adapters/server.adapter';
import { HttpStatus } from '../../../../shared/helpers/http-status.helper';
import { AffiliationService } from '../services/Affiliation.service';
import { ICreateAffiliationRequest, IUpdateAffiliationRequest, ICreateAffiliationMemberRequest, IUpdateAffiliationMemberRequest, IAffiliationQueryParams } from '../../domain/dtos/dcu.dto';
import logger from '../../../../shared/utils/logger';

/**
 * Controller for handling Affiliation-related HTTP requests in the DCU system.
 * Manages teams, organizations, and their members.
 */
export class AffiliationController {
    private affiliationService: AffiliationService;

    /**
     * Initializes the AffiliationController with required services.
     */
    constructor() {
        this.affiliationService = new AffiliationService();
    }

    /**
     * Creates a new affiliation (team/organization).
     * @param {AdapterRequest} request - HTTP request containing affiliation data
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async createAffiliation(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            const data = request.body as ICreateAffiliationRequest;

            logger.info(`POST /dcu/affiliations - Creating affiliation: ${data.name}`);

            const result = await this.affiliationService.createAffiliation(data);

            result.match(
                affiliation => {
                    logger.info(`Affiliation created successfully: ${affiliation.name}`);
                    reply.status(HttpStatus.CREATED).send({
                        status: 'success',
                        data: affiliation
                    });
                },
                error => {
                    logger.warn(`Failed to create affiliation: ${error.message}`);
                    reply.status(HttpStatus.BAD_REQUEST).send({
                        status: 'error',
                        message: error.message
                    });
                }
            );
        } catch (error) {
            logger.error('Unexpected error in createAffiliation:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }

    /**
     * Updates an existing affiliation's information.
     * @param {AdapterRequest} request - HTTP request with affiliation ID and update data
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async updateAffiliation(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            const { id } = request.params as { id: string };
            const data = request.body as IUpdateAffiliationRequest;

            logger.info(`PUT /dcu/affiliations/${id} - Updating affiliation`);

            const result = await this.affiliationService.updateAffiliation(id, data);

            result.match(
                affiliation => {
                    logger.info(`Affiliation updated successfully: ${affiliation.name}`);
                    reply.status(HttpStatus.OK).send({
                        status: 'success',
                        data: affiliation
                    });
                },
                error => {
                    logger.warn(`Failed to update affiliation: ${error.message}`);
                    const status = error.message.includes('not found') ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
                    reply.status(status).send({
                        status: 'error',
                        message: error.message
                    });
                }
            );
        } catch (error) {
            logger.error('Unexpected error in updateAffiliation:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }

    /**
     * Retrieves an affiliation by ID with all members.
     * @param {AdapterRequest} request - HTTP request with affiliation ID
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async getAffiliationById(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            const { id } = request.params as { id: string };

            logger.info(`GET /dcu/affiliations/${id} - Fetching affiliation`);

            const result = await this.affiliationService.getAffiliationById(id);

            result.match(
                affiliation => {
                    logger.info(`Affiliation retrieved: ${affiliation.name}`);
                    reply.status(HttpStatus.OK).send({
                        status: 'success',
                        data: affiliation
                    });
                },
                error => {
                    logger.warn(`Affiliation not found: ${id}`);
                    reply.status(HttpStatus.NOT_FOUND).send({
                        status: 'error',
                        message: error.message
                    });
                }
            );
        } catch (error) {
            logger.error('Unexpected error in getAffiliationById:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }

    /**
     * Searches affiliations based on query parameters.
     * @param {AdapterRequest} request - HTTP request with search parameters
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async searchAffiliations(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            const query = request.query as IAffiliationQueryParams;

            logger.info('GET /dcu/affiliations/search - Searching affiliations');

            const result = await this.affiliationService.searchAffiliations(query);

            result.match(
                affiliations => {
                    logger.info(`Search returned ${affiliations.length} affiliations`);
                    reply.status(HttpStatus.OK).send({
                        status: 'success',
                        data: affiliations,
                        count: affiliations.length
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
            logger.error('Unexpected error in searchAffiliations:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }

    /**
     * Lists all affiliations.
     * @param {AdapterRequest} request - HTTP request
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async listAffiliations(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            logger.info('GET /dcu/affiliations - Listing all affiliations');

            const result = await this.affiliationService.listAffiliations();

            result.match(
                affiliations => {
                    logger.info(`Listed ${affiliations.length} affiliations`);
                    reply.status(HttpStatus.OK).send({
                        status: 'success',
                        data: affiliations,
                        count: affiliations.length
                    });
                },
                error => {
                    logger.warn(`Failed to list affiliations: ${error.message}`);
                    reply.status(HttpStatus.BAD_REQUEST).send({
                        status: 'error',
                        message: error.message
                    });
                }
            );
        } catch (error) {
            logger.error('Unexpected error in listAffiliations:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }

    /**
     * Adds a member to an affiliation.
     * @param {AdapterRequest} request - HTTP request with membership data
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async addMemberToAffiliation(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            const data = request.body as ICreateAffiliationMemberRequest;

            logger.info(`POST /dcu/affiliations/members - Adding member ${data.individual_id} to affiliation ${data.affiliation_id}`);

            const result = await this.affiliationService.addMemberToAffiliation(data);

            result.match(
                member => {
                    logger.info('Member added successfully');
                    reply.status(HttpStatus.CREATED).send({
                        status: 'success',
                        data: member
                    });
                },
                error => {
                    logger.warn(`Failed to add member: ${error.message}`);
                    reply.status(HttpStatus.BAD_REQUEST).send({
                        status: 'error',
                        message: error.message
                    });
                }
            );
        } catch (error) {
            logger.error('Unexpected error in addMemberToAffiliation:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }

    /**
     * Updates a member's role or exit date.
     * @param {AdapterRequest} request - HTTP request with member ID and update data
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async updateMembership(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            const { memberId } = request.params as { memberId: string };
            const data = request.body as IUpdateAffiliationMemberRequest;

            logger.info(`PUT /dcu/affiliations/members/${memberId} - Updating membership`);

            const result = await this.affiliationService.updateMembership(memberId, data);

            result.match(
                member => {
                    logger.info('Membership updated successfully');
                    reply.status(HttpStatus.OK).send({
                        status: 'success',
                        data: member
                    });
                },
                error => {
                    logger.warn(`Failed to update membership: ${error.message}`);
                    const status = error.message.includes('not found') ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
                    reply.status(status).send({
                        status: 'error',
                        message: error.message
                    });
                }
            );
        } catch (error) {
            logger.error('Unexpected error in updateMembership:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }

    /**
     * Gets all active members of an affiliation.
     * @param {AdapterRequest} request - HTTP request with affiliation ID
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async getActiveMembers(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            const { affiliationId } = request.params as { affiliationId: string };

            logger.info(`GET /dcu/affiliations/${affiliationId}/members - Getting active members`);

            const result = await this.affiliationService.getActiveMembers(affiliationId);

            result.match(
                members => {
                    logger.info(`Found ${members.length} active members`);
                    reply.status(HttpStatus.OK).send({
                        status: 'success',
                        data: members,
                        count: members.length
                    });
                },
                error => {
                    logger.warn(`Failed to get members: ${error.message}`);
                    reply.status(HttpStatus.BAD_REQUEST).send({
                        status: 'error',
                        message: error.message
                    });
                }
            );
        } catch (error) {
            logger.error('Unexpected error in getActiveMembers:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }
}
