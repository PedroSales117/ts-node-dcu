import { AdapterReply, AdapterRequest } from '../../../../shared/configurations/adapters/server.adapter';
import { HttpStatus } from '../../../../shared/helpers/http-status.helper';
import { LocationService } from '../services/Location.service';
import { ICreateLocationRequest, IUpdateLocationRequest } from '../../domain/dtos/dcu.dto';
import logger from '../../../../shared/utils/logger';

/**
 * Controller for handling Location-related HTTP requests in the DCU system.
 * Manages planets, cities, bases, and other locations in the DC Universe.
 */
export class LocationController {
    private locationService: LocationService;

    /**
     * Initializes the LocationController with required services.
     */
    constructor() {
        this.locationService = new LocationService();
    }

    /**
     * Creates a new location in the DCU.
     * @param {AdapterRequest} request - HTTP request containing location data
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async createLocation(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            const data = request.body as ICreateLocationRequest;

            logger.info(`POST /dcu/locations - Creating location: ${data.name}`);

            const result = await this.locationService.createLocation(data);

            result.match(
                location => {
                    logger.info(`Location created successfully: ${location.name}`);
                    reply.status(HttpStatus.CREATED).send({
                        status: 'success',
                        data: location
                    });
                },
                error => {
                    logger.warn(`Failed to create location: ${error.message}`);
                    reply.status(HttpStatus.BAD_REQUEST).send({
                        status: 'error',
                        message: error.message
                    });
                }
            );
        } catch (error) {
            logger.error('Unexpected error in createLocation:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }

    /**
     * Updates an existing location's information.
     * @param {AdapterRequest} request - HTTP request with location ID and update data
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async updateLocation(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            const { id } = request.params as { id: string };
            const data = request.body as IUpdateLocationRequest;

            logger.info(`PUT /dcu/locations/${id} - Updating location`);

            const result = await this.locationService.updateLocation(id, data);

            result.match(
                location => {
                    logger.info(`Location updated successfully: ${location.name}`);
                    reply.status(HttpStatus.OK).send({
                        status: 'success',
                        data: location
                    });
                },
                error => {
                    logger.warn(`Failed to update location: ${error.message}`);
                    const status = error.message.includes('not found') ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
                    reply.status(status).send({
                        status: 'error',
                        message: error.message
                    });
                }
            );
        } catch (error) {
            logger.error('Unexpected error in updateLocation:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }

    /**
     * Retrieves a location by its ID.
     * @param {AdapterRequest} request - HTTP request with location ID
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async getLocationById(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            const { id } = request.params as { id: string };

            logger.info(`GET /dcu/locations/${id} - Fetching location`);

            const result = await this.locationService.getLocationById(id);

            result.match(
                location => {
                    logger.info(`Location retrieved: ${location.name}`);
                    reply.status(HttpStatus.OK).send({
                        status: 'success',
                        data: location
                    });
                },
                error => {
                    logger.warn(`Location not found: ${id}`);
                    reply.status(HttpStatus.NOT_FOUND).send({
                        status: 'error',
                        message: error.message
                    });
                }
            );
        } catch (error) {
            logger.error('Unexpected error in getLocationById:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }

    /**
     * Searches locations by name or type.
     * @param {AdapterRequest} request - HTTP request with search parameters
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async searchLocations(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            const { search, type } = request.query as { search?: string; type?: string };

            logger.info(`GET /dcu/locations/search - Searching locations`);

            const result = await this.locationService.searchLocations(search, type);

            result.match(
                locations => {
                    logger.info(`Search returned ${locations.length} locations`);
                    reply.status(HttpStatus.OK).send({
                        status: 'success',
                        data: locations,
                        count: locations.length
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
            logger.error('Unexpected error in searchLocations:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }

    /**
     * Gets all child locations of a parent location.
     * @param {AdapterRequest} request - HTTP request with parent location ID
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async getChildLocations(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            const { parentId } = request.params as { parentId: string };

            logger.info(`GET /dcu/locations/${parentId}/children - Getting child locations`);

            const result = await this.locationService.getChildLocations(parentId);

            result.match(
                locations => {
                    logger.info(`Found ${locations.length} child locations`);
                    reply.status(HttpStatus.OK).send({
                        status: 'success',
                        data: locations,
                        count: locations.length
                    });
                },
                error => {
                    logger.warn(`Failed to get child locations: ${error.message}`);
                    reply.status(HttpStatus.BAD_REQUEST).send({
                        status: 'error',
                        message: error.message
                    });
                }
            );
        } catch (error) {
            logger.error('Unexpected error in getChildLocations:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }

    /**
     * Gets the full location hierarchy from root to the specified location.
     * @param {AdapterRequest} request - HTTP request with location ID
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async getLocationHierarchy(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            const { locationId } = request.params as { locationId: string };

            logger.info(`GET /dcu/locations/${locationId}/hierarchy - Getting location hierarchy`);

            const result = await this.locationService.getLocationHierarchy(locationId);

            result.match(
                hierarchy => {
                    logger.info(`Hierarchy contains ${hierarchy.length} levels`);
                    reply.status(HttpStatus.OK).send({
                        status: 'success',
                        data: hierarchy,
                        levels: hierarchy.length
                    });
                },
                error => {
                    logger.warn(`Failed to get hierarchy: ${error.message}`);
                    const status = error.message.includes('not found') ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
                    reply.status(status).send({
                        status: 'error',
                        message: error.message
                    });
                }
            );
        } catch (error) {
            logger.error('Unexpected error in getLocationHierarchy:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }

    /**
     * Lists all locations with optional filtering.
     * @param {AdapterRequest} request - HTTP request with filter parameters
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async listLocations(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            const { accessibleOnly } = request.query as { accessibleOnly?: string };

            logger.info('GET /dcu/locations - Listing locations');

            const result = await this.locationService.listLocations(accessibleOnly === 'true');

            result.match(
                locations => {
                    logger.info(`Listed ${locations.length} locations`);
                    reply.status(HttpStatus.OK).send({
                        status: 'success',
                        data: locations,
                        count: locations.length
                    });
                },
                error => {
                    logger.warn(`Failed to list locations: ${error.message}`);
                    reply.status(HttpStatus.BAD_REQUEST).send({
                        status: 'error',
                        message: error.message
                    });
                }
            );
        } catch (error) {
            logger.error('Unexpected error in listLocations:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }

    /**
     * Deletes a location if it has no dependencies.
     * @param {AdapterRequest} request - HTTP request with location ID
     * @param {AdapterReply} reply - HTTP response object
     * @returns {Promise<void>}
     */
    async deleteLocation(request: AdapterRequest, reply: AdapterReply): Promise<void> {
        try {
            const { id } = request.params as { id: string };

            logger.info(`DELETE /dcu/locations/${id} - Deleting location`);

            const result = await this.locationService.deleteLocation(id);

            result.match(
                () => {
                    logger.info('Location deleted successfully');
                    reply.status(HttpStatus.NO_CONTENT).send();
                },
                error => {
                    logger.warn(`Failed to delete location: ${error.message}`);
                    const status = error.message.includes('not found') ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
                    reply.status(status).send({
                        status: 'error',
                        message: error.message
                    });
                }
            );
        } catch (error) {
            logger.error('Unexpected error in deleteLocation:', error);
            reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                status: 'error',
                message: 'Internal server error'
            });
        }
    }
}
