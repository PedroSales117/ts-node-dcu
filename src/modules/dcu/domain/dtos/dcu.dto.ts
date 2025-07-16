import { ThreatLevel, BiologicalStatus, MasteryLevel, AffiliationType, LocationType, IncidentType, IncidentResult } from '../types/dcu.enums';

/**
 * DTOs for Individual operations
 */
export interface ICreateIndividualRequest {
    primary_designation: string;
    civilian_identity?: string;
    known_aliases?: string[];
    species: string;
    profession?: string;
    biological_status?: BiologicalStatus;
    psychological_profile: string;
    threat_level?: ThreatLevel;
    first_appearance?: Date;
    notes?: string;
    origin_planet_id?: string;
    current_location_id?: string;
}

export interface IUpdateIndividualRequest extends Partial<ICreateIndividualRequest> {}

/**
 * DTOs for Ability operations
 */
export interface ICreateAbilityRequest {
    name: string;
    description: string;
    power_origin: string;
}

export interface IUpdateAbilityRequest extends Partial<ICreateAbilityRequest> {}

/**
 * DTOs for AbilityRegistry operations
 */
export interface ICreateAbilityRegistryRequest {
    individual_id: string;
    ability_id: string;
    mastery_level: MasteryLevel;
}

export interface IUpdateAbilityRegistryRequest {
    mastery_level: MasteryLevel;
}

/**
 * DTOs for Location operations
 */
export interface ICreateLocationRequest {
    name: string;
    type: LocationType;
    description?: string;
    latitude?: number;
    longitude?: number;
    parent_location_id?: string;
    is_accessible?: boolean;
}

export interface IUpdateLocationRequest extends Partial<ICreateLocationRequest> {}

/**
 * DTOs for Affiliation operations
 */
export interface ICreateAffiliationRequest {
    name: string;
    affiliation_type: AffiliationType;
    modus_operandi: string;
    mission_statement?: string;
    is_active?: boolean;
    known_leader_id?: string;
    base_of_operations_id?: string;
}

export interface IUpdateAffiliationRequest extends Partial<ICreateAffiliationRequest> {}

/**
 * DTOs for AffiliationMember operations
 */
export interface ICreateAffiliationMemberRequest {
    individual_id: string;
    affiliation_id: string;
    role: string;
    join_date: Date;
}

export interface IUpdateAffiliationMemberRequest {
    role?: string;
    exit_date?: Date;
}

/**
 * DTOs for ProjectIncident operations
 */
export interface ICreateProjectIncidentRequest {
    codename: string;
    incident_type: IncidentType;
    start_date: Date;
    end_date?: Date;
    primary_objective: string;
    operational_summary: string;
    result?: IncidentResult;
    primary_location_id: string;
}

export interface IUpdateProjectIncidentRequest extends Partial<ICreateProjectIncidentRequest> {}

/**
 * DTOs for InvolvementLog operations
 */
export interface ICreateInvolvementLogRequest {
    individual_id: string;
    incident_id: string;
    role_in_incident: string;
    performance_notes?: string;
}

export interface IUpdateInvolvementLogRequest {
    role_in_incident?: string;
    performance_notes?: string;
}

/**
 * Query DTOs
 */
export interface IIndividualQueryParams {
    threat_level?: ThreatLevel;
    species?: string;
    biological_status?: BiologicalStatus;
    affiliation_id?: string;
    location_id?: string;
    has_abilities?: boolean;
}

export interface IAffiliationQueryParams {
    affiliation_type?: AffiliationType;
    is_active?: boolean;
    leader_id?: string;
    location_id?: string;
}

export interface IProjectIncidentQueryParams {
    incident_type?: IncidentType;
    result?: IncidentResult;
    location_id?: string;
    start_date_from?: Date;
    start_date_to?: Date;
    participant_id?: string;
}
