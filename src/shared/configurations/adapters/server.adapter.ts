import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { Result, Ok, Err } from '../../core/Result';
import { AppDataSource } from '../../../ormconfig';
import logger from '../../utils/logger';
import fastifyCookie from '@fastify/cookie';
import { IUseCallback } from '../interfaces/IFastifyCallback';
import { IRouter } from '../../router/interfaces/IRouter';

/**
 * ServerAdapter provides an abstraction layer over the Fastify framework,
 * allowing for the easy setup and management of routes, middlewares, and server configuration.
 */

export type AdapterRequest = FastifyRequest
export type AdapterReply = FastifyReply

export class ServerAdapter {
  private server: FastifyInstance; // The underlying Fastify server instance.
  private readonly errorMessages = {
    MIDDLEWARE_ERROR: 'Failed to register middleware',
    ROUTER_ERROR: 'Failed to register routes',
    SERVER_START_ERROR: 'Failed to start server',
    DB_CONNECTION_ERROR: 'Failed to initialize database connection',
    INVALID_PORT: 'Invalid port number provided',
    INVALID_MIDDLEWARE: 'Middleware must be a valid function',
    INVALID_ROUTERS: 'Invalid routers array provided',
  };

  /**
   * Initializes the server with Fastify, setting default configurations,
   * such as body size limits, JWT support, and CORS headers.
   */
  constructor() {
    this.server = Fastify({
      logger: true, // Enables built-in Fastify logging.
      bodyLimit: 30 * 1024 * 1024, // Sets the maximum request body size to 30 MB.
    });

    this.server.register(fastifyCookie, {
      secret: process.env.COOKIE_SECRET,
      hook: 'onRequest',
    });

    // Registering the fastify-jwt plugin for JWT validation.
    this.server.register(fastifyJwt, {
      secret: process.env.JWT_SECRET as string, // The secret key for signing and verifying tokens.
    });

    // Add a hook to handle CORS and OPTIONS requests.
    this.server.addHook('onRequest', async (request, reply) => {
      const allowedOrigins = process.env.ALLOW_ORIGINS
        ? process.env.ALLOW_ORIGINS.split(',').map(origin => origin.trim())
        : ['*']; // fallback to wildcard if ALLOW_ORIGINS is not defined

      const requestOrigin = request.headers.origin;

      if (allowedOrigins.includes('*')) {
        // If wildcard is allowed, reflect the requesting origin
        reply.header('Access-Control-Allow-Origin', requestOrigin || '*');
      } else if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
        // If the origin is in our allowed list, set it
        reply.header('Access-Control-Allow-Origin', requestOrigin);
      } else {
        // If the origin is not allowed, set null
        reply.header('Access-Control-Allow-Origin', 'null');
      }

      reply.header('Access-Control-Allow-Credentials', 'true');
      reply.header(
        'Access-Control-Allow-Headers',
        'Authorization, Origin, X-Requested-With, Content-Type, Accept, X-Slug, X-UID'
      );
      reply.header(
        'Access-Control-Allow-Methods',
        'OPTIONS, POST, PUT, PATCH, GET, DELETE'
      );

      if (request.method === 'OPTIONS') {
        return reply.send();
      }
    });

    // Enhanced error handler with more detailed logging
    this.server.setErrorHandler((error, request, reply) => {
      const errorContext = {
        method: request.method,
        url: request.url,
        ip: request.ip,
        params: request.params,
        query: request.query,
        errorMessage: error.message,
        errorStack: error.stack,
        timestamp: new Date().toISOString(),
      };

      logger.error('Request processing error:', errorContext);

      if (!reply.sent) {
        const statusCode = error.statusCode || 500;
        const errorResponse = {
          status: 'error',
          message: process.env.NODE_ENV === 'production'
            ? 'Internal Server Error'
            : error.message,
          code: statusCode,
          requestId: request.id
        };

        reply.status(statusCode).send(errorResponse);
      }
    });
  }

  /**
   * Registers a middleware or a series of middlewares to the server with an optional prefix.
   * Useful for modular configurations like authentication, logging, or validation logic.
   * 
   * @param prefix - The URL prefix for all paths associated with the middleware.
   * @param opts - Middleware function or object describing the middleware behavior.
   * @returns A Result indicating success (Ok) or an error message (Err).
   */
  async use(prefix: string, opts: IUseCallback): Promise<Result<void, string>> {
    if (!prefix || typeof prefix !== 'string') {
      logger.error('Invalid prefix provided for middleware', { prefix });
      return Err(`${this.errorMessages.MIDDLEWARE_ERROR}: Invalid prefix`);
    }

    if (!opts || typeof opts !== 'function') {
      logger.error('Invalid middleware provided', { middlewareType: typeof opts });
      return Err(`${this.errorMessages.INVALID_MIDDLEWARE}`);
    }

    try {
      logger.info('Registering middleware', { prefix });
      await this.server.register(opts, { prefix });
      logger.info('Successfully registered middleware', { prefix });
      return Ok(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Middleware registration failed', {
        prefix,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      return Err(`${this.errorMessages.MIDDLEWARE_ERROR}: ${errorMessage}`);
    }
  }

  /**
   * Registers an array of routers, each containing multiple routes, to the server.
   * The routes are automatically prefixed with `/api` for consistency.
   * 
   * @param routers - An array of IRouter instances managing multiple routes.
   * @returns A Result indicating success (Ok) or an error message (Err).
   */
  async useRouters(routers: IRouter[]): Promise<Result<void, string>> {
    if (!Array.isArray(routers)) {
      logger.error('Invalid routers array provided');
      return Err(this.errorMessages.INVALID_ROUTERS);
    }

    try {
      let routeCount = 0;
      for (const router of routers) {
        const routes = router.getRoutes();
        for (const route of routes) {
          if (!route.method || !route.path) {
            logger.warn('Invalid route configuration', { route });
            continue;
          }

          this.server.route({
            method: route.method, // The HTTP method (GET, POST, DELETE, etc.).
            url: `/api${route.path}`, // Prepend "/api" to all routes.
            preHandler: route.middlewares || [], // Attach any middlewares to the route.
            handler: route.handler, // The main handler for processing requests.
          });
          routeCount++;
        }
      }

      logger.info('Successfully registered all routes', { totalRoutes: routeCount });
      return Ok(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Route registration failed', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      return Err(`${this.errorMessages.ROUTER_ERROR}: ${errorMessage}`);
    }
  }

  /**
   * Starts the server, initializes the database connection, and listens on a specified port.
   * Handles database connection failures gracefully.
   * 
   * @param port - The port number on which the server will listen.
   * @returns A Result indicating success (Ok) or an error message (Err).
   */
  async listen(port: number): Promise<Result<void, string>> {
    if (!port || port < 0 || port > 65535) {
      logger.error('Invalid port number provided', { port });
      return Err(this.errorMessages.INVALID_PORT);
    }

    try {
      // Initialize the database connection using TypeORM's AppDataSource.
      await AppDataSource.initialize();

      if (process.env.NODE_ENV !== 'production') {
        logger.info(`Starting ------ ${process.env.NODE_ENV} ------ enviroment, happy debbuging.`)
      } else {
        logger.info(`Starting ------ ${process.env.NODE_ENV} ------ enviroment, time to get serious!`)
      }

      // Start the Fastify server on the specified port.
      await this.server.listen({ host: '0.0.0.0', port });
      return Ok(undefined);
    } catch (error) {
      logger.error(`Failed to start server: ${error instanceof Error ? error.message : String(error)}`);
      return Err(
        `Error starting server: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
