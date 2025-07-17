import { Ability } from '../../domain/entities/Ability';
import { AbilityRegistry } from '../../domain/entities/AbilityRegistry';
import { Individual } from '../../domain/entities/Individual';
import { Result, Ok, Err } from '../../../../shared/core/Result';
import logger from '../../../../shared/utils/logger';
import { ICreateAbilityRequest, IUpdateAbilityRequest, ICreateAbilityRegistryRequest, IUpdateAbilityRegistryRequest } from '../../domain/dtos/dcu.dto';
import { Like } from 'typeorm';

/**
 * Service class for managing Ability and AbilityRegistry operations in the DCU system.
 * Handles CRUD operations for abilities and their associations with individuals.
 */
export class AbilityService {
    /**
     * Creates a new ability in the database.
     * @param {ICreateAbilityRequest} data - The ability creation data
     * @returns {Promise<Result<Ability, Error>>} The created ability or error
     */
    async createAbility(data: ICreateAbilityRequest): Promise<Result<Ability, Error>> {
        try {
            logger.info(`Creating new ability: ${data.name}`);

            /** Check if ability with same name already exists */
            const existing = await Ability.findOne({ 
                where: { name: data.name } 
            });

            if (existing) {
                logger.warn(`Ability already exists: ${data.name}`);
                return Err(new Error('Ability with this name already exists'));
            }

            const ability = Ability.create(data as import('typeorm').DeepPartial<Ability>);
            await ability.save();

            logger.info(`Ability created successfully: ${ability.name}`);
            return Ok(ability);
        } catch (error) {
            logger.error('Error creating ability:', error);
            return Err(error as Error);
        }
    }

    /**
     * Updates an existing ability.
     * @param {string} id - The ability's UUID
     * @param {IUpdateAbilityRequest} data - The update data
     * @returns {Promise<Result<Ability, Error>>} The updated ability or error
     */
    async updateAbility(id: string, data: IUpdateAbilityRequest): Promise<Result<Ability, Error>> {
        try {
            logger.info(`Updating ability: ${id}`);

            const ability = await Ability.findOne({ where: { id } });

            if (!ability) {
                logger.warn(`Ability not found: ${id}`);
                return Err(new Error('Ability not found'));
            }

            /** Check if new name is unique */
            if (data.name && data.name !== ability.name) {
                const existing = await Ability.findOne({ 
                    where: { name: data.name } 
                });
                if (existing) {
                    return Err(new Error('Another ability with this name already exists'));
                }
            }

            Object.assign(ability, data);
            await ability.save();

            logger.info(`Ability updated successfully: ${ability.name}`);
            return Ok(ability);
        } catch (error) {
            logger.error('Error updating ability:', error);
            return Err(error as Error);
        }
    }

    /**
     * Retrieves an ability by ID.
     * @param {string} id - The ability's UUID
     * @returns {Promise<Result<Ability, Error>>} The ability or error
     */
    async getAbilityById(id: string): Promise<Result<Ability, Error>> {
        try {
            logger.info(`Fetching ability by ID: ${id}`);

            const ability = await Ability.findOne({ where: { id } });

            if (!ability) {
                logger.warn(`Ability not found: ${id}`);
                return Err(new Error('Ability not found'));
            }

            logger.info(`Ability retrieved: ${ability.name}`);
            return Ok(ability);
        } catch (error) {
            logger.error('Error fetching ability:', error);
            return Err(error as Error);
        }
    }

    /**
     * Searches abilities by name or power origin.
     * @param {string} search - Search term
     * @returns {Promise<Result<Ability[], Error>>} Array of abilities or error
     */
    async searchAbilities(search: string): Promise<Result<Ability[], Error>> {
        try {
            logger.info(`Searching abilities with term: ${search}`);

            const abilities = await Ability.find({
                where: [
                    { name: Like(`%${search}%`) },
                    { power_origin: Like(`%${search}%`) }
                ]
            });

            logger.info(`Found ${abilities.length} abilities`);
            return Ok(abilities);
        } catch (error) {
            logger.error('Error searching abilities:', error);
            return Err(error as Error);
        }
    }

    /**
     * Lists all abilities.
     * @returns {Promise<Result<Ability[], Error>>} Array of all abilities or error
     */
    async listAbilities(): Promise<Result<Ability[], Error>> {
        try {
            logger.info('Listing all abilities');

            const abilities = await Ability.find({
                order: { name: 'ASC' }
            });

            logger.info(`Listed ${abilities.length} abilities`);
            return Ok(abilities);
        } catch (error) {
            logger.error('Error listing abilities:', error);
            return Err(error as Error);
        }
    }

    /**
     * Assigns an ability to an individual.
     * @param {ICreateAbilityRegistryRequest} data - The registry creation data
     * @returns {Promise<Result<AbilityRegistry, Error>>} The created registry or error
     */
    async assignAbilityToIndividual(data: ICreateAbilityRegistryRequest): Promise<Result<AbilityRegistry, Error>> {
        try {
            logger.info(`Assigning ability ${data.ability_id} to individual ${data.individual_id}`);

            /** Validate individual exists */
            const individual = await Individual.findOne({ 
                where: { id: data.individual_id } 
            });
            if (!individual) {
                return Err(new Error('Individual not found'));
            }

            /** Validate ability exists */
            const ability = await Ability.findOne({ 
                where: { id: data.ability_id } 
            });
            if (!ability) {
                return Err(new Error('Ability not found'));
            }

            /** Check if already assigned */
            const existing = await AbilityRegistry.findOne({
                where: {
                    individual: { id: data.individual_id },
                    ability: { id: data.ability_id }
                }
            });

            if (existing) {
                return Err(new Error('This ability is already assigned to this individual'));
            }

            /** Create registry */
            const registry = AbilityRegistry.create({
                individual: { id: data.individual_id } as Individual,
                ability: { id: data.ability_id } as Ability,
                mastery_level: data.mastery_level
            });

            await registry.save();

            /** Reload with relations */
            const savedRegistry = await AbilityRegistry.findOne({
                where: { id: registry.id },
                relations: ['individual', 'ability']
            });

            logger.info(`Ability assigned successfully`);
            return Ok(savedRegistry!);
        } catch (error) {
            logger.error('Error assigning ability:', error);
            return Err(error as Error);
        }
    }

    /**
     * Updates an individual's mastery level for an ability.
     * @param {string} registryId - The registry ID
     * @param {IUpdateAbilityRegistryRequest} data - The update data
     * @returns {Promise<Result<AbilityRegistry, Error>>} The updated registry or error
     */
    async updateAbilityMastery(registryId: string, data: IUpdateAbilityRegistryRequest): Promise<Result<AbilityRegistry, Error>> {
        try {
            logger.info(`Updating ability mastery: ${registryId}`);

            const registry = await AbilityRegistry.findOne({
                where: { id: registryId },
                relations: ['individual', 'ability']
            });

            if (!registry) {
                logger.warn(`Ability registry not found: ${registryId}`);
                return Err(new Error('Ability registry not found'));
            }

            registry.mastery_level = data.mastery_level;
            await registry.save();

            logger.info(`Mastery level updated successfully`);
            return Ok(registry);
        } catch (error) {
            logger.error('Error updating mastery level:', error);
            return Err(error as Error);
        }
    }

    /**
     * Removes an ability from an individual.
     * @param {string} registryId - The registry ID
     * @returns {Promise<Result<void, Error>>} Success or error
     */
    async removeAbilityFromIndividual(registryId: string): Promise<Result<void, Error>> {
        try {
            logger.info(`Removing ability registry: ${registryId}`);

            const registry = await AbilityRegistry.findOne({
                where: { id: registryId }
            });

            if (!registry) {
                logger.warn(`Ability registry not found: ${registryId}`);
                return Err(new Error('Ability registry not found'));
            }

            await registry.remove();

            logger.info('Ability removed from individual successfully');
            return Ok(undefined);
        } catch (error) {
            logger.error('Error removing ability:', error);
            return Err(error as Error);
        }
    }

    /**
     * Gets all individuals with a specific ability.
     * @param {string} abilityId - The ability ID
     * @returns {Promise<Result<AbilityRegistry[], Error>>} Array of registries or error
     */
    async getIndividualsByAbility(abilityId: string): Promise<Result<AbilityRegistry[], Error>> {
        try {
            logger.info(`Getting individuals with ability: ${abilityId}`);

            const registries = await AbilityRegistry.find({
                where: { ability: { id: abilityId } },
                relations: ['individual', 'ability']
            });

            logger.info(`Found ${registries.length} individuals with this ability`);
            return Ok(registries);
        } catch (error) {
            logger.error('Error getting individuals by ability:', error);
            return Err(error as Error);
        }
    }
}