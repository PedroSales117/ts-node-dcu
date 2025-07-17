import { IRouter } from "../../../shared/router/interfaces/IRouter";
import { Router } from "../../../shared/router/Router";
import { IndividualController } from "../application/controllers/Individual.controller";
import { AbilityController } from "../application/controllers/Ability.controller";
import { AffiliationController } from "../application/controllers/Affiliation.controller";
import { LocationController } from "../application/controllers/Location.controller";
import { ProjectIncidentController } from "../application/controllers/ProjectIncident.controller";
import { AuthMiddleware } from "../../../shared/middlewares/Auth.middleware";
import { AdapterRequest, AdapterReply } from "../../../shared/configurations/adapters/server.adapter";

/**
 * Creates and returns a router configured with all DCU-related routes.
 * These routes handle operations for individuals, abilities, affiliations, locations, and incidents.
 * 
 * @returns {IRouter} The DCU router configured with all DCU-related routes.
 */
export const dcuRoute = (): IRouter => {
    const dcu_router = new Router();
    
    /** Initialize controllers */
    const individualController = new IndividualController();
    const abilityController = new AbilityController();
    const affiliationController = new AffiliationController();
    const locationController = new LocationController();
    const projectIncidentController = new ProjectIncidentController();
    
    /** Initialize middleware */
    const authMiddleware = new AuthMiddleware();

    /**
     * Middleware to validate authentication for protected routes.
     */
    const authGuard = async (request: AdapterRequest, reply: AdapterReply) => {
        await authMiddleware.authenticate(request, reply);
    };

    /** ===== INDIVIDUAL ROUTES ===== */
    
    /** Create a new individual */
    dcu_router.addRoute({
        path: "/dcu/individuals",
        method: "POST",
        middlewares: [authGuard],
        handler: async (request, reply) => {
            await individualController.createIndividual(request, reply);
        },
    });

    /** List all individuals with pagination */
    dcu_router.addRoute({
        path: "/dcu/individuals",
        method: "GET",
        handler: async (request, reply) => {
            await individualController.listIndividuals(request, reply);
        },
    });

    /** Search individuals */
    dcu_router.addRoute({
        path: "/dcu/individuals/search",
        method: "GET",
        handler: async (request, reply) => {
            await individualController.searchIndividuals(request, reply);
        },
    });

    /** Get individual by ID */
    dcu_router.addRoute({
        path: "/dcu/individuals/:id",
        method: "GET",
        handler: async (request, reply) => {
            await individualController.getIndividualById(request, reply);
        },
    });

    /** Update individual */
    dcu_router.addRoute({
        path: "/dcu/individuals/:id",
        method: "PUT",
        middlewares: [authGuard],
        handler: async (request, reply) => {
            await individualController.updateIndividual(request, reply);
        },
    });

    /** Delete individual */
    dcu_router.addRoute({
        path: "/dcu/individuals/:id",
        method: "DELETE",
        middlewares: [authGuard],
        handler: async (request, reply) => {
            await individualController.deleteIndividual(request, reply);
        },
    });

    /** Get incidents by individual */
    dcu_router.addRoute({
        path: "/dcu/individuals/:individualId/incidents",
        method: "GET",
        handler: async (request, reply) => {
            await projectIncidentController.getIncidentsByIndividual(request, reply);
        },
    });

    /** ===== ABILITY ROUTES ===== */
    
    /** Create a new ability */
    dcu_router.addRoute({
        path: "/dcu/abilities",
        method: "POST",
        middlewares: [authGuard],
        handler: async (request, reply) => {
            await abilityController.createAbility(request, reply);
        },
    });

    /** List all abilities */
    dcu_router.addRoute({
        path: "/dcu/abilities",
        method: "GET",
        handler: async (request, reply) => {
            await abilityController.listAbilities(request, reply);
        },
    });

    /** Search abilities */
    dcu_router.addRoute({
        path: "/dcu/abilities/search",
        method: "GET",
        handler: async (request, reply) => {
            await abilityController.searchAbilities(request, reply);
        },
    });

    /** Assign ability to individual */
    dcu_router.addRoute({
        path: "/dcu/abilities/assign",
        method: "POST",
        middlewares: [authGuard],
        handler: async (request, reply) => {
            await abilityController.assignAbilityToIndividual(request, reply);
        },
    });

    /** Get ability by ID */
    dcu_router.addRoute({
        path: "/dcu/abilities/:id",
        method: "GET",
        handler: async (request, reply) => {
            await abilityController.getAbilityById(request, reply);
        },
    });

    /** Update ability */
    dcu_router.addRoute({
        path: "/dcu/abilities/:id",
        method: "PUT",
        middlewares: [authGuard],
        handler: async (request, reply) => {
            await abilityController.updateAbility(request, reply);
        },
    });

    /** Get individuals by ability */
    dcu_router.addRoute({
        path: "/dcu/abilities/:abilityId/individuals",
        method: "GET",
        handler: async (request, reply) => {
            await abilityController.getIndividualsByAbility(request, reply);
        },
    });

    /** Update ability mastery */
    dcu_router.addRoute({
        path: "/dcu/abilities/registry/:registryId",
        method: "PUT",
        middlewares: [authGuard],
        handler: async (request, reply) => {
            await abilityController.updateAbilityMastery(request, reply);
        },
    });

    /** Remove ability from individual */
    dcu_router.addRoute({
        path: "/dcu/abilities/registry/:registryId",
        method: "DELETE",
        middlewares: [authGuard],
        handler: async (request, reply) => {
            await abilityController.removeAbilityFromIndividual(request, reply);
        },
    });

    /** ===== AFFILIATION ROUTES ===== */
    
    /** Create a new affiliation */
    dcu_router.addRoute({
        path: "/dcu/affiliations",
        method: "POST",
        middlewares: [authGuard],
        handler: async (request, reply) => {
            await affiliationController.createAffiliation(request, reply);
        },
    });

    /** List all affiliations */
    dcu_router.addRoute({
        path: "/dcu/affiliations",
        method: "GET",
        handler: async (request, reply) => {
            await affiliationController.listAffiliations(request, reply);
        },
    });

    /** Search affiliations */
    dcu_router.addRoute({
        path: "/dcu/affiliations/search",
        method: "GET",
        handler: async (request, reply) => {
            await affiliationController.searchAffiliations(request, reply);
        },
    });

    /** Add member to affiliation */
    dcu_router.addRoute({
        path: "/dcu/affiliations/members",
        method: "POST",
        middlewares: [authGuard],
        handler: async (request, reply) => {
            await affiliationController.addMemberToAffiliation(request, reply);
        },
    });

    /** Get affiliation by ID */
    dcu_router.addRoute({
        path: "/dcu/affiliations/:id",
        method: "GET",
        handler: async (request, reply) => {
            await affiliationController.getAffiliationById(request, reply);
        },
    });

    /** Update affiliation */
    dcu_router.addRoute({
        path: "/dcu/affiliations/:id",
        method: "PUT",
        middlewares: [authGuard],
        handler: async (request, reply) => {
            await affiliationController.updateAffiliation(request, reply);
        },
    });

    /** Get active members of affiliation */
    dcu_router.addRoute({
        path: "/dcu/affiliations/:affiliationId/members",
        method: "GET",
        handler: async (request, reply) => {
            await affiliationController.getActiveMembers(request, reply);
        },
    });

    /** Update membership */
    dcu_router.addRoute({
        path: "/dcu/affiliations/members/:memberId",
        method: "PUT",
        middlewares: [authGuard],
        handler: async (request, reply) => {
            await affiliationController.updateMembership(request, reply);
        },
    });

    /** ===== LOCATION ROUTES ===== */
    
    /** Create a new location */
    dcu_router.addRoute({
        path: "/dcu/locations",
        method: "POST",
        middlewares: [authGuard],
        handler: async (request, reply) => {
            await locationController.createLocation(request, reply);
        },
    });

    /** List all locations */
    dcu_router.addRoute({
        path: "/dcu/locations",
        method: "GET",
        handler: async (request, reply) => {
            await locationController.listLocations(request, reply);
        },
    });

    /** Search locations */
    dcu_router.addRoute({
        path: "/dcu/locations/search",
        method: "GET",
        handler: async (request, reply) => {
            await locationController.searchLocations(request, reply);
        },
    });

    /** Get location by ID */
    dcu_router.addRoute({
        path: "/dcu/locations/:id",
        method: "GET",
        handler: async (request, reply) => {
            await locationController.getLocationById(request, reply);
        },
    });

    /** Update location */
    dcu_router.addRoute({
        path: "/dcu/locations/:id",
        method: "PUT",
        middlewares: [authGuard],
        handler: async (request, reply) => {
            await locationController.updateLocation(request, reply);
        },
    });

    /** Delete location */
    dcu_router.addRoute({
        path: "/dcu/locations/:id",
        method: "DELETE",
        middlewares: [authGuard],
        handler: async (request, reply) => {
            await locationController.deleteLocation(request, reply);
        },
    });

    /** Get child locations */
    dcu_router.addRoute({
        path: "/dcu/locations/:parentId/children",
        method: "GET",
        handler: async (request, reply) => {
            await locationController.getChildLocations(request, reply);
        },
    });

    /** Get location hierarchy */
    dcu_router.addRoute({
        path: "/dcu/locations/:locationId/hierarchy",
        method: "GET",
        handler: async (request, reply) => {
            await locationController.getLocationHierarchy(request, reply);
        },
    });

    /** ===== PROJECT/INCIDENT ROUTES ===== */
    
    /** Create a new incident */
    dcu_router.addRoute({
        path: "/dcu/incidents",
        method: "POST",
        middlewares: [authGuard],
        handler: async (request, reply) => {
            await projectIncidentController.createProjectIncident(request, reply);
        },
    });

    /** Search incidents */
    dcu_router.addRoute({
        path: "/dcu/incidents/search",
        method: "GET",
        handler: async (request, reply) => {
            await projectIncidentController.searchProjectIncidents(request, reply);
        },
    });

    /** List ongoing incidents */
    dcu_router.addRoute({
        path: "/dcu/incidents/ongoing",
        method: "GET",
        handler: async (request, reply) => {
            await projectIncidentController.listOngoingIncidents(request, reply);
        },
    });

    /** Add participant to incident */
    dcu_router.addRoute({
        path: "/dcu/incidents/participants",
        method: "POST",
        middlewares: [authGuard],
        handler: async (request, reply) => {
            await projectIncidentController.addParticipantToIncident(request, reply);
        },
    });

    /** Get incident by ID */
    dcu_router.addRoute({
        path: "/dcu/incidents/:id",
        method: "GET",
        handler: async (request, reply) => {
            await projectIncidentController.getProjectIncidentById(request, reply);
        },
    });

    /** Update incident */
    dcu_router.addRoute({
        path: "/dcu/incidents/:id",
        method: "PUT",
        middlewares: [authGuard],
        handler: async (request, reply) => {
            await projectIncidentController.updateProjectIncident(request, reply);
        },
    });

    /** Update participant involvement */
    dcu_router.addRoute({
        path: "/dcu/incidents/participants/:involvementId",
        method: "PUT",
        middlewares: [authGuard],
        handler: async (request, reply) => {
            await projectIncidentController.updateInvolvement(request, reply);
        },
    });

    /** Remove participant from incident */
    dcu_router.addRoute({
        path: "/dcu/incidents/participants/:involvementId",
        method: "DELETE",
        middlewares: [authGuard],
        handler: async (request, reply) => {
            await projectIncidentController.removeParticipantFromIncident(request, reply);
        },
    });

    return dcu_router;
};