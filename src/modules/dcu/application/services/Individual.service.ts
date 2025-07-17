import { Individual } from '../../domain/entities/Individual';
import { Location } from '../../domain/entities/Location';
import { Result, Ok, Err } from '../../../../shared/core/Result';
import logger from '../../../../shared/utils/logger';
import { ICreateIndividualRequest, IUpdateIndividualRequest, IIndividualQueryParams } from '../../domain/dtos/dcu.dto';
import { FindOptionsWhere, Like } from 'typeorm';

/**
 * Service class for managing Individual-related operations in the DCU system.
 * Handles CRUD operations and complex queries for individuals (heroes, villains, civilians).
 */
export class IndividualService {
    /**
     * Creates a new individual in the DCU database.
     * @param {ICreateIndividualRequest} data - The individual creation data
     * @returns {Promise<Result<Individual, Error>>} The created individual or error
     */
    async createIndividual(data: ICreateIndividualRequest): Promise<Result<Individual, Error>> {
        try {
            logger.info(`Creating new individual: ${data.primary_designation}`);

            /** Check if individual with same designation already exists */
            const existing = await Individual.findOne({ 
                where: { primary_designation: data.primary_designation } 
            });

            if (existing) {
                logger.warn(`Individual already exists: ${data.primary_designation}`);
                return Err(new Error('Individual with this designation already exists'));
            }

            /** Validate location references if provided */
            if (data.origin_planet_id) {
                const originPlanet = await Location.findOne({ 
                    where: { id: data.origin_planet_id } 
                });
                if (!originPlanet) {
                    return Err(new Error('Origin planet not found'));
                }
            }

            if (data.current_location_id) {
                const currentLocation = await Location.findOne({ 
                    where: { id: data.current_location_id } 
                });
                if (!currentLocation) {
                    return Err(new Error('Current location not found'));
                }
            }

            /** Create new individual */
            const individual = Individual.create({
                ...data,
                origin_planet: data.origin_planet_id ? { id: data.origin_planet_id } as Location : undefined,
                current_location: data.current_location_id ? { id: data.current_location_id } as Location : undefined
            });

            await individual.save();

            /** Reload with relations */
            const savedIndividual = await Individual.findOne({
                where: { id: individual.id },
                relations: ['origin_planet', 'current_location', 'abilities', 'affiliations', 'incidents']
            });

            logger.info(`Individual created successfully: ${individual.primary_designation}`);
            return Ok(savedIndividual!);
        } catch (error) {
            logger.error('Error creating individual:', error);
            return Err(error as Error);
        }
    }

    /**
     * Updates an existing individual's information.
     * @param {string} id - The individual's UUID
     * @param {IUpdateIndividualRequest} data - The update data
     * @returns {Promise<Result<Individual, Error>>} The updated individual or error
     */
    async updateIndividual(id: string, data: IUpdateIndividualRequest): Promise<Result<Individual, Error>> {
        try {
            logger.info(`Updating individual: ${id}`);

            const individual = await Individual.findOne({ where: { id } });

            if (!individual) {
                logger.warn(`Individual not found: ${id}`);
                return Err(new Error('Individual not found'));
            }

            /** Check if new designation is unique */
            if (data.primary_designation && data.primary_designation !== individual.primary_designation) {
                const existing = await Individual.findOne({ 
                    where: { primary_designation: data.primary_designation } 
                });
                if (existing) {
                    return Err(new Error('Another individual with this designation already exists'));
                }
            }

            /** Validate location references if provided */
            if (data.origin_planet_id) {
                const originPlanet = await Location.findOne({ 
                    where: { id: data.origin_planet_id } 
                });
                if (!originPlanet) {
                    return Err(new Error('Origin planet not found'));
                }
            }

            if (data.current_location_id) {
                const currentLocation = await Location.findOne({ 
                    where: { id: data.current_location_id } 
                });
                if (!currentLocation) {
                    return Err(new Error('Current location not found'));
                }
            }

            /** Update individual */
            Object.assign(individual, {
                ...data,
                origin_planet: data.origin_planet_id ? { id: data.origin_planet_id } as Location : individual.origin_planet,
                current_location: data.current_location_id ? { id: data.current_location_id } as Location : individual.current_location
            });

            await individual.save();

            /** Reload with relations */
            const updatedIndividual = await Individual.findOne({
                where: { id: individual.id },
                relations: ['origin_planet', 'current_location', 'abilities', 'affiliations', 'incidents']
            });

            logger.info(`Individual updated successfully: ${individual.primary_designation}`);
            return Ok(updatedIndividual!);
        } catch (error) {
            logger.error('Error updating individual:', error);
            return Err(error as Error);
        }
    }

    /**
     * Retrieves an individual by ID with all relations.
     * @param {string} id - The individual's UUID
     * @returns {Promise<Result<Individual, Error>>} The individual or error
     */
    async getIndividualById(id: string): Promise<Result<Individual, Error>> {
        try {
            logger.info(`Fetching individual by ID: ${id}`);

            const individual = await Individual.findOne({
                where: { id },
                relations: ['origin_planet', 'current_location', 'abilities', 'abilities.ability', 'affiliations', 'affiliations.affiliation', 'incidents', 'incidents.incident']
            });

            if (!individual) {
                logger.warn(`Individual not found: ${id}`);
                return Err(new Error('Individual not found'));
            }

            logger.info(`Individual retrieved: ${individual.primary_designation}`);
            return Ok(individual);
        } catch (error) {
            logger.error('Error fetching individual:', error);
            return Err(error as Error);
        }
    }

    /**
     * Searches for individuals based on query parameters.
     * @param {IIndividualQueryParams} query - The search parameters
     * @returns {Promise<Result<Individual[], Error>>} Array of individuals or error
     */
    async searchIndividuals(query: IIndividualQueryParams): Promise<Result<Individual[], Error>> {
        try {
            logger.info('Searching individuals with query:', { query });

            const whereConditions: FindOptionsWhere<Individual> = {};

            if (query.threat_level) {
                whereConditions.threat_level = query.threat_level;
            }

            if (query.species) {
                whereConditions.species = Like(`%${query.species}%`);
            }

            if (query.biological_status) {
                whereConditions.biological_status = query.biological_status;
            }

            /** Complex queries for related entities need custom query builder */
            let queryBuilder = Individual.createQueryBuilder('individual')
                .leftJoinAndSelect('individual.origin_planet', 'origin_planet')
                .leftJoinAndSelect('individual.current_location', 'current_location')
                .leftJoinAndSelect('individual.abilities', 'abilities')
                .leftJoinAndSelect('abilities.ability', 'ability')
                .leftJoinAndSelect('individual.affiliations', 'affiliations')
                .leftJoinAndSelect('affiliations.affiliation', 'affiliation');

            /** Apply basic where conditions */
            Object.entries(whereConditions).forEach(([key, value]) => {
                queryBuilder = queryBuilder.andWhere(`individual.${key} = :${key}`, { [key]: value });
            });

            /** Filter by affiliation if provided */
            if (query.affiliation_id) {
                queryBuilder = queryBuilder.andWhere('affiliation.id = :affiliation_id', { affiliation_id: query.affiliation_id });
            }

            /** Filter by location if provided */
            if (query.location_id) {
                queryBuilder = queryBuilder.andWhere(
                    '(individual.origin_planet_id = :location_id OR individual.current_location_id = :location_id)',
                    { location_id: query.location_id }
                );
            }

            /** Filter by having abilities */
            if (query.has_abilities !== undefined) {
                if (query.has_abilities) {
                    queryBuilder = queryBuilder.andWhere('abilities.id IS NOT NULL');
                } else {
                    queryBuilder = queryBuilder.andWhere('abilities.id IS NULL');
                }
            }

            const individuals = await queryBuilder.getMany();

            logger.info(`Found ${individuals.length} individuals`);
            return Ok(individuals);
        } catch (error) {
            logger.error('Error searching individuals:', error);
            return Err(error as Error);
        }
    }

    /**
     * Deletes an individual from the database.
     * @param {string} id - The individual's UUID
     * @returns {Promise<Result<void, Error>>} Success or error
     */
    async deleteIndividual(id: string): Promise<Result<void, Error>> {
        try {
            logger.info(`Deleting individual: ${id}`);

            const individual = await Individual.findOne({ where: { id } });

            if (!individual) {
                logger.warn(`Individual not found: ${id}`);
                return Err(new Error('Individual not found'));
            }

            await individual.remove();

            logger.info(`Individual deleted successfully: ${individual.primary_designation}`);
            return Ok(undefined);
        } catch (error) {
            logger.error('Error deleting individual:', error);
            return Err(error as Error);
        }
    }

    /**
     * Lists all individuals with pagination.
     * @param {number} page - Page number (1-based)
     * @param {number} limit - Items per page
     * @returns {Promise<Result<{ individuals: Individual[], total: number }, Error>>} Paginated results
     */
    async listIndividuals(page: number = 1, limit: number = 20): Promise<Result<{ individuals: Individual[], total: number }, Error>> {
        try {
            logger.info(`Listing individuals - page: ${page}, limit: ${limit}`);

            const skip = (page - 1) * limit;

            const [individuals, total] = await Individual.findAndCount({
                relations: ['origin_planet', 'current_location', 'abilities', 'affiliations'],
                skip,
                take: limit,
                order: { primary_designation: 'ASC' }
            });

            logger.info(`Listed ${individuals.length} individuals out of ${total} total`);
            return Ok({ individuals, total });
        } catch (error) {
            logger.error('Error listing individuals:', error);
            return Err(error as Error);
        }
    }
}