import { ProjectIncident } from '../../domain/entities/ProjectIncident';
import { InvolvementLog } from '../../domain/entities/InvolvementLog';
import { Individual } from '../../domain/entities/Individual';
import { Location } from '../../domain/entities/Location';
import { Result, Ok, Err } from '../../../../shared/core/Result';
import logger from '../../../../shared/utils/logger';
import { ICreateProjectIncidentRequest, IUpdateProjectIncidentRequest, ICreateInvolvementLogRequest, IUpdateInvolvementLogRequest, IProjectIncidentQueryParams } from '../../domain/dtos/dcu.dto';
import { IncidentResult } from '../../domain/types/dcu.enums';

/**
 * Service class for managing Project/Incident operations in the DCU system.
 * Handles CRUD operations for missions, events, and participant involvement.
 */
export class ProjectIncidentService {
    /**
     * Creates a new project/incident.
     * @param {ICreateProjectIncidentRequest} data - The incident creation data
     * @returns {Promise<Result<ProjectIncident, Error>>} The created incident or error
     */
    async createProjectIncident(data: ICreateProjectIncidentRequest): Promise<Result<ProjectIncident, Error>> {
        try {
            logger.info(`Creating new project/incident: ${data.codename}`);

            /** Check if incident with same codename already exists */
            const existing = await ProjectIncident.findOne({
                where: { codename: data.codename }
            });

            if (existing) {
                logger.warn(`Incident already exists: ${data.codename}`);
                return Err(new Error('Incident with this codename already exists'));
            }

            /** Validate primary location */
            const location = await Location.findOne({
                where: { id: data.primary_location_id }
            });
            if (!location) {
                return Err(new Error('Primary location not found'));
            }

            /** Create incident */
            const incident = ProjectIncident.create({
                ...data,
                primary_location: { id: data.primary_location_id } as Location
            });

            await incident.save();

            /** Reload with relations */
            const savedIncident = await ProjectIncident.findOne({
                where: { id: incident.id },
                relations: ['primary_location', 'participants']
            });

            logger.info(`Incident created successfully: ${incident.codename}`);
            return Ok(savedIncident!);
        } catch (error) {
            logger.error('Error creating incident:', error);
            return Err(error as Error);
        }
    }

    /**
     * Updates an existing project/incident.
     * @param {string} id - The incident's UUID
     * @param {IUpdateProjectIncidentRequest} data - The update data
     * @returns {Promise<Result<ProjectIncident, Error>>} The updated incident or error
     */
    async updateProjectIncident(id: string, data: IUpdateProjectIncidentRequest): Promise<Result<ProjectIncident, Error>> {
        try {
            logger.info(`Updating incident: ${id}`);

            const incident = await ProjectIncident.findOne({ where: { id } });

            if (!incident) {
                logger.warn(`Incident not found: ${id}`);
                return Err(new Error('Incident not found'));
            }

            /** Check if new codename is unique */
            if (data.codename && data.codename !== incident.codename) {
                const existing = await ProjectIncident.findOne({
                    where: { codename: data.codename }
                });
                if (existing) {
                    return Err(new Error('Another incident with this codename already exists'));
                }
            }

            /** Validate primary location if changed */
            if (data.primary_location_id) {
                const location = await Location.findOne({
                    where: { id: data.primary_location_id }
                });
                if (!location) {
                    return Err(new Error('Primary location not found'));
                }
            }

            /** Update incident */
            Object.assign(incident, {
                ...data,
                primary_location: data.primary_location_id ? { id: data.primary_location_id } as Location : incident.primary_location
            });

            await incident.save();

            /** Reload with relations */
            const updatedIncident = await ProjectIncident.findOne({
                where: { id: incident.id },
                relations: ['primary_location', 'participants', 'participants.individual']
            });

            logger.info(`Incident updated successfully: ${incident.codename}`);
            return Ok(updatedIncident!);
        } catch (error) {
            logger.error('Error updating incident:', error);
            return Err(error as Error);
        }
    }

    /**
     * Retrieves an incident by ID with all participants.
     * @param {string} id - The incident's UUID
     * @returns {Promise<Result<ProjectIncident, Error>>} The incident or error
     */
    async getProjectIncidentById(id: string): Promise<Result<ProjectIncident, Error>> {
        try {
            logger.info(`Fetching incident by ID: ${id}`);

            const incident = await ProjectIncident.findOne({
                where: { id },
                relations: ['primary_location', 'participants', 'participants.individual']
            });

            if (!incident) {
                logger.warn(`Incident not found: ${id}`);
                return Err(new Error('Incident not found'));
            }

            logger.info(`Incident retrieved: ${incident.codename}`);
            return Ok(incident);
        } catch (error) {
            logger.error('Error fetching incident:', error);
            return Err(error as Error);
        }
    }

    /**
     * Searches incidents based on query parameters.
     * @param {IProjectIncidentQueryParams} query - The search parameters
     * @returns {Promise<Result<ProjectIncident[], Error>>} Array of incidents or error
     */
    async searchProjectIncidents(query: IProjectIncidentQueryParams): Promise<Result<ProjectIncident[], Error>> {
        try {
            logger.info('Searching incidents with query:', { query });

            let queryBuilder = ProjectIncident.createQueryBuilder('incident')
                .leftJoinAndSelect('incident.primary_location', 'location')
                .leftJoinAndSelect('incident.participants', 'participants')
                .leftJoinAndSelect('participants.individual', 'individual');

            /** Apply filters */
            if (query.incident_type) {
                queryBuilder = queryBuilder.andWhere('incident.incident_type = :type', { type: query.incident_type });
            }

            if (query.result) {
                queryBuilder = queryBuilder.andWhere('incident.result = :result', { result: query.result });
            }

            if (query.location_id) {
                queryBuilder = queryBuilder.andWhere('incident.primary_location_id = :location_id', { location_id: query.location_id });
            }

            /** Date range filters */
            if (query.start_date_from && query.start_date_to) {
                queryBuilder = queryBuilder.andWhere('incident.start_date BETWEEN :from AND :to', {
                    from: query.start_date_from,
                    to: query.start_date_to
                });
            } else if (query.start_date_from) {
                queryBuilder = queryBuilder.andWhere('incident.start_date >= :from', {
                    from: query.start_date_from
                });
            } else if (query.start_date_to) {
                queryBuilder = queryBuilder.andWhere('incident.start_date <= :to', {
                    to: query.start_date_to
                });
            }

            /** Filter by participant */
            if (query.participant_id) {
                queryBuilder = queryBuilder.andWhere('individual.id = :participant_id', { participant_id: query.participant_id });
            }

            queryBuilder = queryBuilder.orderBy('incident.start_date', 'DESC');

            const incidents = await queryBuilder.getMany();

            logger.info(`Found ${incidents.length} incidents`);
            return Ok(incidents);
        } catch (error) {
            logger.error('Error searching incidents:', error);
            return Err(error as Error);
        }
    }

    /**
     * Adds a participant to an incident.
     * @param {ICreateInvolvementLogRequest} data - The involvement data
     * @returns {Promise<Result<InvolvementLog, Error>>} The created involvement log or error
     */
    async addParticipantToIncident(data: ICreateInvolvementLogRequest): Promise<Result<InvolvementLog, Error>> {
        try {
            logger.info(`Adding participant ${data.individual_id} to incident ${data.incident_id}`);

            /** Validate individual exists */
            const individual = await Individual.findOne({
                where: { id: data.individual_id }
            });
            if (!individual) {
                return Err(new Error('Individual not found'));
            }

            /** Validate incident exists */
            const incident = await ProjectIncident.findOne({
                where: { id: data.incident_id }
            });
            if (!incident) {
                return Err(new Error('Incident not found'));
            }

            /** Check if already involved */
            const existing = await InvolvementLog.findOne({
                where: {
                    individual: { id: data.individual_id },
                    incident: { id: data.incident_id }
                }
            });

            if (existing) {
                return Err(new Error('Individual is already involved in this incident'));
            }

            /** Create involvement log */
            const involvement = InvolvementLog.create({
                individual: { id: data.individual_id } as Individual,
                incident: { id: data.incident_id } as ProjectIncident,
                role_in_incident: data.role_in_incident,
                performance_notes: data.performance_notes
            });

            await involvement.save();

            /** Reload with relations */
            const savedInvolvement = await InvolvementLog.findOne({
                where: { id: involvement.id },
                relations: ['individual', 'incident']
            });

            logger.info(`Participant added successfully`);
            return Ok(savedInvolvement!);
        } catch (error) {
            logger.error('Error adding participant:', error);
            return Err(error as Error);
        }
    }

    /**
     * Updates a participant's involvement in an incident.
     * @param {string} involvementId - The involvement log ID
     * @param {IUpdateInvolvementLogRequest} data - The update data
     * @returns {Promise<Result<InvolvementLog, Error>>} The updated involvement log or error
     */
    async updateInvolvement(involvementId: string, data: IUpdateInvolvementLogRequest): Promise<Result<InvolvementLog, Error>> {
        try {
            logger.info(`Updating involvement: ${involvementId}`);

            const involvement = await InvolvementLog.findOne({
                where: { id: involvementId },
                relations: ['individual', 'incident']
            });

            if (!involvement) {
                logger.warn(`Involvement log not found: ${involvementId}`);
                return Err(new Error('Involvement log not found'));
            }

            Object.assign(involvement, data);
            await involvement.save();

            logger.info(`Involvement updated successfully`);
            return Ok(involvement);
        } catch (error) {
            logger.error('Error updating involvement:', error);
            return Err(error as Error);
        }
    }

    /**
     * Removes a participant from an incident.
     * @param {string} involvementId - The involvement log ID
     * @returns {Promise<Result<void, Error>>} Success or error
     */
    async removeParticipantFromIncident(involvementId: string): Promise<Result<void, Error>> {
        try {
            logger.info(`Removing participant involvement: ${involvementId}`);

            const involvement = await InvolvementLog.findOne({
                where: { id: involvementId }
            });

            if (!involvement) {
                logger.warn(`Involvement log not found: ${involvementId}`);
                return Err(new Error('Involvement log not found'));
            }

            await involvement.remove();

            logger.info('Participant removed from incident successfully');
            return Ok(undefined);
        } catch (error) {
            logger.error('Error removing participant:', error);
            return Err(error as Error);
        }
    }

    /**
     * Gets all incidents involving a specific individual.
     * @param {string} individualId - The individual's ID
     * @returns {Promise<Result<InvolvementLog[], Error>>} Array of involvement logs or error
     */
    async getIncidentsByIndividual(individualId: string): Promise<Result<InvolvementLog[], Error>> {
        try {
            logger.info(`Getting incidents for individual: ${individualId}`);

            const involvements = await InvolvementLog.find({
                where: { individual: { id: individualId } },
                relations: ['incident', 'incident.primary_location'],
                order: { incident: { start_date: 'DESC' } }
            });

            logger.info(`Found ${involvements.length} incidents`);
            return Ok(involvements);
        } catch (error) {
            logger.error('Error getting incidents by individual:', error);
            return Err(error as Error);
        }
    }

    /**
     * Lists ongoing incidents.
     * @returns {Promise<Result<ProjectIncident[], Error>>} Array of ongoing incidents or error
     */
    async listOngoingIncidents(): Promise<Result<ProjectIncident[], Error>> {
        try {
            logger.info('Listing ongoing incidents');

            const incidents = await ProjectIncident.find({
                where: { result: IncidentResult.ONGOING },
                relations: ['primary_location', 'participants'],
                order: { start_date: 'DESC' }
            });

            logger.info(`Listed ${incidents.length} ongoing incidents`);
            return Ok(incidents);
        } catch (error) {
            logger.error('Error listing ongoing incidents:', error);
            return Err(error as Error);
        }
    }
}