import { Affiliation } from '../../domain/entities/Affiliation';
import { AffiliationMember } from '../../domain/entities/AffiliationMember';
import { Individual } from '../../domain/entities/Individual';
import { Location } from '../../domain/entities/Location';
import { Result, Ok, Err } from '../../../../shared/core/Result';
import logger from '../../../../shared/utils/logger';
import { ICreateAffiliationRequest, IUpdateAffiliationRequest, ICreateAffiliationMemberRequest, IUpdateAffiliationMemberRequest, IAffiliationQueryParams } from '../../domain/dtos/dcu.dto';
import { FindOptionsWhere } from 'typeorm';

/**
 * Service class for managing Affiliation and AffiliationMember operations in the DCU system.
 * Handles CRUD operations for organizations, teams, and their members.
 */
export class AffiliationService {
    /**
     * Creates a new affiliation (team/organization).
     * @param {ICreateAffiliationRequest} data - The affiliation creation data
     * @returns {Promise<Result<Affiliation, Error>>} The created affiliation or error
     */
    async createAffiliation(data: ICreateAffiliationRequest): Promise<Result<Affiliation, Error>> {
        try {
            logger.info(`Creating new affiliation: ${data.name}`);

            /** Check if affiliation with same name already exists */
            const existing = await Affiliation.findOne({ 
                where: { name: data.name } 
            });

            if (existing) {
                logger.warn(`Affiliation already exists: ${data.name}`);
                return Err(new Error('Affiliation with this name already exists'));
            }

            /** Validate leader if provided */
            if (data.known_leader_id) {
                const leader = await Individual.findOne({ 
                    where: { id: data.known_leader_id } 
                });
                if (!leader) {
                    return Err(new Error('Leader not found'));
                }
            }

            /** Validate base of operations if provided */
            if (data.base_of_operations_id) {
                const location = await Location.findOne({ 
                    where: { id: data.base_of_operations_id } 
                });
                if (!location) {
                    return Err(new Error('Base of operations not found'));
                }
            }

            /** Create affiliation */
            const affiliation = Affiliation.create({
                ...data,
                known_leader: data.known_leader_id ? { id: data.known_leader_id } as Individual : undefined,
                base_of_operations: data.base_of_operations_id ? { id: data.base_of_operations_id } as Location : undefined
            });

            await affiliation.save();

            /** Reload with relations */
            const savedAffiliation = await Affiliation.findOne({
                where: { id: affiliation.id },
                relations: ['known_leader', 'base_of_operations', 'members']
            });

            logger.info(`Affiliation created successfully: ${affiliation.name}`);
            return Ok(savedAffiliation!);
        } catch (error) {
            logger.error('Error creating affiliation:', error);
            return Err(error as Error);
        }
    }

    /**
     * Updates an existing affiliation.
     * @param {string} id - The affiliation's UUID
     * @param {IUpdateAffiliationRequest} data - The update data
     * @returns {Promise<Result<Affiliation, Error>>} The updated affiliation or error
     */
    async updateAffiliation(id: string, data: IUpdateAffiliationRequest): Promise<Result<Affiliation, Error>> {
        try {
            logger.info(`Updating affiliation: ${id}`);

            const affiliation = await Affiliation.findOne({ where: { id } });

            if (!affiliation) {
                logger.warn(`Affiliation not found: ${id}`);
                return Err(new Error('Affiliation not found'));
            }

            /** Check if new name is unique */
            if (data.name && data.name !== affiliation.name) {
                const existing = await Affiliation.findOne({ 
                    where: { name: data.name } 
                });
                if (existing) {
                    return Err(new Error('Another affiliation with this name already exists'));
                }
            }

            /** Validate leader if provided */
            if (data.known_leader_id) {
                const leader = await Individual.findOne({ 
                    where: { id: data.known_leader_id } 
                });
                if (!leader) {
                    return Err(new Error('Leader not found'));
                }
            }

            /** Validate base of operations if provided */
            if (data.base_of_operations_id) {
                const location = await Location.findOne({ 
                    where: { id: data.base_of_operations_id } 
                });
                if (!location) {
                    return Err(new Error('Base of operations not found'));
                }
            }

            /** Update affiliation */
            Object.assign(affiliation, {
                ...data,
                known_leader: data.known_leader_id ? { id: data.known_leader_id } as Individual : affiliation.known_leader,
                base_of_operations: data.base_of_operations_id ? { id: data.base_of_operations_id } as Location : affiliation.base_of_operations
            });

            await affiliation.save();

            /** Reload with relations */
            const updatedAffiliation = await Affiliation.findOne({
                where: { id: affiliation.id },
                relations: ['known_leader', 'base_of_operations', 'members', 'members.individual']
            });

            logger.info(`Affiliation updated successfully: ${affiliation.name}`);
            return Ok(updatedAffiliation!);
        } catch (error) {
            logger.error('Error updating affiliation:', error);
            return Err(error as Error);
        }
    }

    /**
     * Retrieves an affiliation by ID with all members.
     * @param {string} id - The affiliation's UUID
     * @returns {Promise<Result<Affiliation, Error>>} The affiliation or error
     */
    async getAffiliationById(id: string): Promise<Result<Affiliation, Error>> {
        try {
            logger.info(`Fetching affiliation by ID: ${id}`);

            const affiliation = await Affiliation.findOne({
                where: { id },
                relations: ['known_leader', 'base_of_operations', 'members', 'members.individual']
            });

            if (!affiliation) {
                logger.warn(`Affiliation not found: ${id}`);
                return Err(new Error('Affiliation not found'));
            }

            logger.info(`Affiliation retrieved: ${affiliation.name}`);
            return Ok(affiliation);
        } catch (error) {
            logger.error('Error fetching affiliation:', error);
            return Err(error as Error);
        }
    }

    /**
     * Searches affiliations based on query parameters.
     * @param {IAffiliationQueryParams} query - The search parameters
     * @returns {Promise<Result<Affiliation[], Error>>} Array of affiliations or error
     */
    async searchAffiliations(query: IAffiliationQueryParams): Promise<Result<Affiliation[], Error>> {
        try {
            logger.info('Searching affiliations with query:', { query });

            const whereConditions: FindOptionsWhere<Affiliation> = {};

            if (query.affiliation_type) {
                whereConditions.affiliation_type = query.affiliation_type;
            }

            if (query.is_active !== undefined) {
                whereConditions.is_active = query.is_active;
            }

            if (query.leader_id) {
                whereConditions.known_leader = { id: query.leader_id } as Individual;
            }

            if (query.location_id) {
                whereConditions.base_of_operations = { id: query.location_id } as Location;
            }

            const affiliations = await Affiliation.find({
                where: whereConditions,
                relations: ['known_leader', 'base_of_operations'],
                order: { name: 'ASC' }
            });

            logger.info(`Found ${affiliations.length} affiliations`);
            return Ok(affiliations);
        } catch (error) {
            logger.error('Error searching affiliations:', error);
            return Err(error as Error);
        }
    }

    /**
     * Adds a member to an affiliation.
     * @param {ICreateAffiliationMemberRequest} data - The membership data
     * @returns {Promise<Result<AffiliationMember, Error>>} The created membership or error
     */
    async addMemberToAffiliation(data: ICreateAffiliationMemberRequest): Promise<Result<AffiliationMember, Error>> {
        try {
            logger.info(`Adding member ${data.individual_id} to affiliation ${data.affiliation_id}`);

            /** Validate individual exists */
            const individual = await Individual.findOne({ 
                where: { id: data.individual_id } 
            });
            if (!individual) {
                return Err(new Error('Individual not found'));
            }

            /** Validate affiliation exists */
            const affiliation = await Affiliation.findOne({ 
                where: { id: data.affiliation_id } 
            });
            if (!affiliation) {
                return Err(new Error('Affiliation not found'));
            }

            /** Check if already a member */
            const existing = await AffiliationMember.findOne({
                where: {
                    individual: { id: data.individual_id },
                    affiliation: { id: data.affiliation_id }
                }
            });

            if (existing) {
                return Err(new Error('Individual is already an active member of this affiliation'));
            }

            /** Create membership */
            const member = AffiliationMember.create({
                individual: { id: data.individual_id } as Individual,
                affiliation: { id: data.affiliation_id } as Affiliation,
                role: data.role,
                join_date: data.join_date
            });

            await member.save();

            /** Reload with relations */
            const savedMember = await AffiliationMember.findOne({
                where: { id: member.id },
                relations: ['individual', 'affiliation']
            });

            logger.info(`Member added successfully`);
            return Ok(savedMember!);
        } catch (error) {
            logger.error('Error adding member:', error);
            return Err(error as Error);
        }
    }

    /**
     * Updates a member's role or marks them as having left.
     * @param {string} memberId - The membership ID
     * @param {IUpdateAffiliationMemberRequest} data - The update data
     * @returns {Promise<Result<AffiliationMember, Error>>} The updated membership or error
     */
    async updateMembership(memberId: string, data: IUpdateAffiliationMemberRequest): Promise<Result<AffiliationMember, Error>> {
        try {
            logger.info(`Updating membership: ${memberId}`);

            const member = await AffiliationMember.findOne({
                where: { id: memberId },
                relations: ['individual', 'affiliation']
            });

            if (!member) {
                logger.warn(`Membership not found: ${memberId}`);
                return Err(new Error('Membership not found'));
            }

            if (data.role) {
                member.role = data.role;
            }

            if (data.exit_date) {
                member.exit_date = data.exit_date;
            }

            await member.save();

            logger.info(`Membership updated successfully`);
            return Ok(member);
        } catch (error) {
            logger.error('Error updating membership:', error);
            return Err(error as Error);
        }
    }

    /**
     * Gets all active members of an affiliation.
     * @param {string} affiliationId - The affiliation ID
     * @returns {Promise<Result<AffiliationMember[], Error>>} Array of members or error
     */
    async getActiveMembers(affiliationId: string): Promise<Result<AffiliationMember[], Error>> {
        try {
            logger.info(`Getting active members for affiliation: ${affiliationId}`);

            const members = await AffiliationMember.find({
                where: {
                    affiliation: { id: affiliationId }
                },
                relations: ['individual']
            });

            logger.info(`Found ${members.length} active members`);
            return Ok(members);
        } catch (error) {
            logger.error('Error getting active members:', error);
            return Err(error as Error);
        }
    }

    /**
     * Lists all affiliations.
     * @returns {Promise<Result<Affiliation[], Error>>} Array of all affiliations or error
     */
    async listAffiliations(): Promise<Result<Affiliation[], Error>> {
        try {
            logger.info('Listing all affiliations');

            const affiliations = await Affiliation.find({
                relations: ['known_leader', 'base_of_operations'],
                order: { name: 'ASC' }
            });

            logger.info(`Listed ${affiliations.length} affiliations`);
            return Ok(affiliations);
        } catch (error) {
            logger.error('Error listing affiliations:', error);
            return Err(error as Error);
        }
    }
}