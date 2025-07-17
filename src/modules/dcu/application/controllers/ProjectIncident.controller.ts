import { AdapterReply, AdapterRequest } from '../../../../shared/configurations/adapters/server.adapter';
import { HttpStatus } from '../../../../shared/helpers/http-status.helper';
import { ProjectIncidentService } from '../services/ProjectIncident.service';
import { ICreateProjectIncidentRequest, IUpdateProjectIncidentRequest, ICreateInvolvementLogRequest, IUpdateInvolvementLogRequest, IProjectIncidentQueryParams } from '../../domain/dtos/dcu.dto';
import logger from '../../../../shared/utils/logger';

/**
 * Controller for handling Project/Incident-related HTTP requests in the DCU system.
 * Manages missions, events, and participant involvement.
 */
export class ProjectIncidentController {
    private projectIncidentService: ProjectIncidentService;

    /**
     * Initializes the ProjectIncidentController with required services.
     */
    constructor() {
        this.projectIncidentService = new ProjectIncidentService();
    }

    /**
     * Creates a new project/incident in the DCU.
     * @param {AdapterRequest} request - HTTP request containing incident data
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async createProjectIncident(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            const data = request.body as ICreateProjectIncidentRequest;

            logger.info(`POST /dcu/incidents - Creating incident: ${data.codename}`);

            const result = await this.projectIncidentService.createProjectIncident(data);

            result.match(
                incident => {
                    logger.info(`Incident created successfully: ${incident.codename}`);
                    reply.status(HttpStatus.CREATED).send({
                        status: 'success',
                        data: incident
                    });
                },
                error => {
                    logger.warn(`Failed to create incident: ${error.message}`);
                    reply.status(HttpStatus.BAD_REQUEST).send({
                        status: 'error',
                        message: error.message
                    });
                }
            );
        } catch (error) {
            logger.error('Unexpected error in createProjectIncident:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }

    /**
     * Updates an existing project/incident.
     * @param {AdapterRequest} request - HTTP request with incident ID and update data
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async updateProjectIncident(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            const { id } = request.params as { id: string };
            const data = request.body as IUpdateProjectIncidentRequest;

            logger.info(`PUT /dcu/incidents/${id} - Updating incident`);

            const result = await this.projectIncidentService.updateProjectIncident(id, data);

            result.match(
                incident => {
                    logger.info(`Incident updated successfully: ${incident.codename}`);
                    reply.status(HttpStatus.OK).send({
                        status: 'success',
                        data: incident
                    });
                },
                error => {
                    logger.warn(`Failed to update incident: ${error.message}`);
                    const status = error.message.includes('not found') ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
                    reply.status(status).send({
                        status: 'error',
                        message: error.message
                    });
                }
            );
        } catch (error) {
            logger.error('Unexpected error in updateProjectIncident:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }

    /**
     * Retrieves an incident by ID with all participants.
     * @param {AdapterRequest} request - HTTP request with incident ID
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async getProjectIncidentById(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            const { id } = request.params as { id: string };

            logger.info(`GET /dcu/incidents/${id} - Fetching incident`);

            const result = await this.projectIncidentService.getProjectIncidentById(id);

            result.match(
                incident => {
                    logger.info(`Incident retrieved: ${incident.codename}`);
                    reply.status(HttpStatus.OK).send({
                        status: 'success',
                        data: incident
                    });
                },
                error => {
                    logger.warn(`Incident not found: ${id}`);
                    reply.status(HttpStatus.NOT_FOUND).send({
                        status: 'error',
                        message: error.message
                    });
                }
            );
        } catch (error) {
            logger.error('Unexpected error in getProjectIncidentById:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }

    /**
     * Searches incidents based on query parameters.
     * @param {AdapterRequest} request - HTTP request with search parameters
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async searchProjectIncidents(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            const query = request.query as IProjectIncidentQueryParams;

            logger.info('GET /dcu/incidents/search - Searching incidents');

            const result = await this.projectIncidentService.searchProjectIncidents(query);

            result.match(
                incidents => {
                    logger.info(`Search returned ${incidents.length} incidents`);
                    reply.status(HttpStatus.OK).send({
                        status: 'success',
                        data: incidents,
                        count: incidents.length
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
            logger.error('Unexpected error in searchProjectIncidents:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }

    /**
     * Lists ongoing incidents.
     * @param {AdapterRequest} request - HTTP request
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async listOngoingIncidents(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            logger.info('GET /dcu/incidents/ongoing - Listing ongoing incidents');

            const result = await this.projectIncidentService.listOngoingIncidents();

            result.match(
                incidents => {
                    logger.info(`Listed ${incidents.length} ongoing incidents`);
                    reply.status(HttpStatus.OK).send({
                        status: 'success',
                        data: incidents,
                        count: incidents.length
                    });
                },
                error => {
                    logger.warn(`Failed to list ongoing incidents: ${error.message}`);
                    reply.status(HttpStatus.BAD_REQUEST).send({
                        status: 'error',
                        message: error.message
                    });
                }
            );
        } catch (error) {
            logger.error('Unexpected error in listOngoingIncidents:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }

    /**
     * Adds a participant to an incident.
     * @param {AdapterRequest} request - HTTP request with involvement data
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async addParticipantToIncident(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            const data = request.body as ICreateInvolvementLogRequest;

            logger.info(`POST /dcu/incidents/participants - Adding participant ${data.individual_id} to incident ${data.incident_id}`);

            const result = await this.projectIncidentService.addParticipantToIncident(data);

            result.match(
                involvement => {
                    logger.info('Participant added successfully');
                    reply.status(HttpStatus.CREATED).send({
                        status: 'success',
                        data: involvement
                    });
                },
                error => {
                    logger.warn(`Failed to add participant: ${error.message}`);
                    reply.status(HttpStatus.BAD_REQUEST).send({
                        status: 'error',
                        message: error.message
                    });
                }
            );
        } catch (error) {
            logger.error('Unexpected error in addParticipantToIncident:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }

    /**
     * Updates a participant's involvement in an incident.
     * @param {AdapterRequest} request - HTTP request with involvement ID and update data
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async updateInvolvement(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            const { involvementId } = request.params as { involvementId: string };
            const data = request.body as IUpdateInvolvementLogRequest;

            logger.info(`PUT /dcu/incidents/participants/${involvementId} - Updating involvement`);

            const result = await this.projectIncidentService.updateInvolvement(involvementId, data);

            result.match(
                involvement => {
                    logger.info('Involvement updated successfully');
                    reply.status(HttpStatus.OK).send({
                        status: 'success',
                        data: involvement
                    });
                },
                error => {
                    logger.warn(`Failed to update involvement: ${error.message}`);
                    const status = error.message.includes('not found') ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
                    reply.status(status).send({
                        status: 'error',
                        message: error.message
                    });
                }
            );
        } catch (error) {
            logger.error('Unexpected error in updateInvolvement:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }

    /**
     * Removes a participant from an incident.
     * @param {AdapterRequest} request - HTTP request with involvement ID
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async removeParticipantFromIncident(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            const { involvementId } = request.params as { involvementId: string };

            logger.info(`DELETE /dcu/incidents/participants/${involvementId} - Removing participant`);

            const result = await this.projectIncidentService.removeParticipantFromIncident(involvementId);

            result.match(
                () => {
                    logger.info('Participant removed successfully');
                    reply.status(HttpStatus.NO_CONTENT).send();
                },
                error => {
                    logger.warn(`Failed to remove participant: ${error.message}`);
                    const status = error.message.includes('not found') ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
                    reply.status(status).send({
                        status: 'error',
                        message: error.message
                    });
                }
            );
        } catch (error) {
            logger.error('Unexpected error in removeParticipantFromIncident:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }

    /**
     * Gets all incidents involving a specific individual.
     * @param {AdapterRequest} request - HTTP request with individual ID
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async getIncidentsByIndividual(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            const { individualId } = request.params as { individualId: string };

            logger.info(`GET /dcu/individuals/${individualId}/incidents - Getting incidents for individual`);

            const result = await this.projectIncidentService.getIncidentsByIndividual(individualId);

            result.match(
                involvements => {
                    logger.info(`Found ${involvements.length} incidents`);
                    reply.status(HttpStatus.OK).send({
                        status: 'success',
                        data: involvements,
                        count: involvements.length
                    });
                },
                error => {
                    logger.warn(`Failed to get incidents: ${error.message}`);
                    reply.status(HttpStatus.BAD_REQUEST).send({
                        status: 'error',
                        message: error.message
                    });
                }
            );
        } catch (error) {
            logger.error('Unexpected error in getIncidentsByIndividual:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }
}
