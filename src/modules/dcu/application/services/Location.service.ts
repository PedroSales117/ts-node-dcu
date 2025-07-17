import { Location } from '../../domain/entities/Location';
import { Result, Ok, Err } from '../../../../shared/core/Result';
import logger from '../../../../shared/utils/logger';
import { ICreateLocationRequest, IUpdateLocationRequest } from '../../domain/dtos/dcu.dto';
import { Like } from 'typeorm';

/**
 * Service class for managing Location operations in the DCU system.
 * Handles CRUD operations for planets, cities, bases, and other locations.
 */
export class LocationService {
    /**
     * Creates a new location in the database.
     * @param {ICreateLocationRequest} data - The location creation data
     * @returns {Promise<Result<Location, Error>>} The created location or error
     */
    async createLocation(data: ICreateLocationRequest): Promise<Result<Location, Error>> {
        try {
            logger.info(`Creating new location: ${data.name}`);

            /** Check if location with same name already exists */
            const existing = await Location.findOne({ 
                where: { name: data.name } 
            });

            if (existing) {
                logger.warn(`Location already exists: ${data.name}`);
                return Err(new Error('Location with this name already exists'));
            }

            /** Validate parent location if provided */
            if (data.parent_location_id) {
                const parent = await Location.findOne({ 
                    where: { id: data.parent_location_id } 
                });
                if (!parent) {
                    return Err(new Error('Parent location not found'));
                }

                /** Prevent circular references */
                if (parent.parent_location && parent.parent_location.id === data.parent_location_id) {
                    return Err(new Error('Circular reference detected in location hierarchy'));
                }
            }

            /** Create location */
            const location = Location.create({
                ...data,
                parent_location: data.parent_location_id ? { id: data.parent_location_id } as Location : undefined
            });

            await location.save();

            /** Reload with relations */
            const savedLocation = await Location.findOne({
                where: { id: location.id },
                relations: ['parent_location']
            });

            logger.info(`Location created successfully: ${location.name}`);
            return Ok(savedLocation!);
        } catch (error) {
            logger.error('Error creating location:', error);
            return Err(error as Error);
        }
    }

    /**
     * Updates an existing location.
     * @param {string} id - The location's UUID
     * @param {IUpdateLocationRequest} data - The update data
     * @returns {Promise<Result<Location, Error>>} The updated location or error
     */
    async updateLocation(id: string, data: IUpdateLocationRequest): Promise<Result<Location, Error>> {
        try {
            logger.info(`Updating location: ${id}`);

            const location = await Location.findOne({ where: { id } });

            if (!location) {
                logger.warn(`Location not found: ${id}`);
                return Err(new Error('Location not found'));
            }

            /** Check if new name is unique */
            if (data.name && data.name !== location.name) {
                const existing = await Location.findOne({ 
                    where: { name: data.name } 
                });
                if (existing) {
                    return Err(new Error('Another location with this name already exists'));
                }
            }

            /** Validate parent location if provided */
            if (data.parent_location_id) {
                if (data.parent_location_id === id) {
                    return Err(new Error('Location cannot be its own parent'));
                }

                const parent = await Location.findOne({ 
                    where: { id: data.parent_location_id } 
                });
                if (!parent) {
                    return Err(new Error('Parent location not found'));
                }

                /** Check for circular references */
                let currentParent = parent;
                while (currentParent.parent_location) {
                    if (currentParent.parent_location.id === id) {
                        return Err(new Error('This would create a circular reference in location hierarchy'));
                    }
                    currentParent = currentParent.parent_location;
                }
            }

            /** Update location */
            Object.assign(location, {
                ...data,
                parent_location: data.parent_location_id ? { id: data.parent_location_id } as Location : location.parent_location
            });

            await location.save();

            /** Reload with relations */
            const updatedLocation = await Location.findOne({
                where: { id: location.id },
                relations: ['parent_location']
            });

            logger.info(`Location updated successfully: ${location.name}`);
            return Ok(updatedLocation!);
        } catch (error) {
            logger.error('Error updating location:', error);
            return Err(error as Error);
        }
    }

    /**
     * Retrieves a location by ID.
     * @param {string} id - The location's UUID
     * @returns {Promise<Result<Location, Error>>} The location or error
     */
    async getLocationById(id: string): Promise<Result<Location, Error>> {
        try {
            logger.info(`Fetching location by ID: ${id}`);

            const location = await Location.findOne({
                where: { id },
                relations: ['parent_location']
            });

            if (!location) {
                logger.warn(`Location not found: ${id}`);
                return Err(new Error('Location not found'));
            }

            logger.info(`Location retrieved: ${location.name}`);
            return Ok(location);
        } catch (error) {
            logger.error('Error fetching location:', error);
            return Err(error as Error);
        }
    }

    /**
     * Searches locations by name or type.
     * @param {string} search - Search term
     * @param {string} type - Optional type filter
     * @returns {Promise<Result<Location[], Error>>} Array of locations or error
     */
    async searchLocations(search?: string, type?: string): Promise<Result<Location[], Error>> {
        try {
            logger.info(`Searching locations - search: ${search}, type: ${type}`);

            let whereConditions: any = {};

            if (search) {
                whereConditions.name = Like(`%${search}%`);
            }

            if (type) {
                whereConditions.type = type;
            }

            const locations = await Location.find({
                where: whereConditions,
                relations: ['parent_location'],
                order: { name: 'ASC' }
            });

            logger.info(`Found ${locations.length} locations`);
            return Ok(locations);
        } catch (error) {
            logger.error('Error searching locations:', error);
            return Err(error as Error);
        }
    }

    /**
     * Gets all child locations of a parent location.
     * @param {string} parentId - The parent location's UUID
     * @returns {Promise<Result<Location[], Error>>} Array of child locations or error
     */
    async getChildLocations(parentId: string): Promise<Result<Location[], Error>> {
        try {
            logger.info(`Getting child locations for: ${parentId}`);

            const childLocations = await Location.find({
                where: { parent_location: { id: parentId } },
                order: { name: 'ASC' }
            });

            logger.info(`Found ${childLocations.length} child locations`);
            return Ok(childLocations);
        } catch (error) {
            logger.error('Error getting child locations:', error);
            return Err(error as Error);
        }
    }

    /**
     * Gets the full location hierarchy from root to the specified location.
     * @param {string} locationId - The location's UUID
     * @returns {Promise<Result<Location[], Error>>} Array representing the hierarchy or error
     */
    async getLocationHierarchy(locationId: string): Promise<Result<Location[], Error>> {
        try {
            logger.info(`Getting location hierarchy for: ${locationId}`);

            const hierarchy: Location[] = [];
            let currentLocation = await Location.findOne({
                where: { id: locationId },
                relations: ['parent_location']
            });

            if (!currentLocation) {
                return Err(new Error('Location not found'));
            }

            /** Build hierarchy from bottom to top */
            while (currentLocation) {
                hierarchy.unshift(currentLocation);
                if (currentLocation.parent_location) {
                    currentLocation = await Location.findOne({
                        where: { id: currentLocation.parent_location.id },
                        relations: ['parent_location']
                    });
                } else {
                    currentLocation = null;
                }
            }

            logger.info(`Hierarchy contains ${hierarchy.length} levels`);
            return Ok(hierarchy);
        } catch (error) {
            logger.error('Error getting location hierarchy:', error);
            return Err(error as Error);
        }
    }

    /**
     * Lists all locations with optional filtering.
     * @param {boolean} accessibleOnly - If true, only return accessible locations
     * @returns {Promise<Result<Location[], Error>>} Array of locations or error
     */
    async listLocations(accessibleOnly: boolean = false): Promise<Result<Location[], Error>> {
        try {
            logger.info(`Listing locations - accessible only: ${accessibleOnly}`);

            const whereConditions: any = {};
            if (accessibleOnly) {
                whereConditions.is_accessible = true;
            }

            const locations = await Location.find({
                where: whereConditions,
                relations: ['parent_location'],
                order: { type: 'ASC', name: 'ASC' }
            });

            logger.info(`Listed ${locations.length} locations`);
            return Ok(locations);
        } catch (error) {
            logger.error('Error listing locations:', error);
            return Err(error as Error);
        }
    }

    /**
     * Deletes a location if it has no dependencies.
     * @param {string} id - The location's UUID
     * @returns {Promise<Result<void, Error>>} Success or error
     */
    async deleteLocation(id: string): Promise<Result<void, Error>> {
        try {
            logger.info(`Deleting location: ${id}`);

            const location = await Location.findOne({ where: { id } });

            if (!location) {
                logger.warn(`Location not found: ${id}`);
                return Err(new Error('Location not found'));
            }

            /** Check for child locations */
            const childCount = await Location.count({
                where: { parent_location: { id } }
            });

            if (childCount > 0) {
                return Err(new Error('Cannot delete location with child locations'));
            }

            await location.remove();

            logger.info(`Location deleted successfully: ${location.name}`);
            return Ok(undefined);
        } catch (error) {
            logger.error('Error deleting location:', error);
            return Err(error as Error);
        }
    }
}