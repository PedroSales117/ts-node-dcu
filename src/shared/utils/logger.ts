/** Defines the available log severity levels */
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/** Represents additional contextual information for log entries */
type LogMetadata = Record<string, unknown>;

/** Supported application environments */
type Environment = 'development' | 'production' | 'test';

/** Configuration interface for logger behavior */
interface LogConfig {
  /** List of sensitive field names that should be masked in logs */
  maskedFields: string[];
  /** Mapping of enabled log levels for each environment */
  enabledLevels: Record<Environment, LogLevel[]>;
  /** Indicates if running in production environment */
  isProd: boolean;
}

/** Logger configuration settings */
const LOG_CONFIG: LogConfig = {
  maskedFields: ['password', 'token', 'authorization', 'secret'],
  enabledLevels: {
    development: ['debug', 'info', 'warn', 'error', 'fatal'],
    production: ['warn', 'error', 'fatal'],
    test: ['error', 'fatal']
  },
  isProd: process.env.NODE_ENV === 'production'
};

/**
 * Generates current timestamp in ISO format
 * @returns {string} ISO formatted timestamp
 */
const getTimestamp = (): string => {
  const now = new Date();
  return now.toISOString();
};

/**
 * Recursively masks sensitive data in objects
 * @param {any} data - Data to be masked
 * @returns {any} Copy of data with sensitive fields masked
 */
const maskSensitiveData = (data: any): any => {
  if (!data) return data;

  if (typeof data === 'object') {
    const maskedData = { ...data };
    for (const key in maskedData) {
      if (LOG_CONFIG.maskedFields.includes(key.toLowerCase())) {
        maskedData[key] = '******';
      } else if (typeof maskedData[key] === 'object') {
        maskedData[key] = maskSensitiveData(maskedData[key]);
      }
    }
    return maskedData;
  }
  return data;
};

/**
 * Formats metadata object to string with sensitive data masked
 * @param {LogMetadata} [metadata] - Optional metadata to format
 * @returns {string} Formatted metadata string or empty string if no metadata
 */
const formatMetadata = (metadata?: LogMetadata): string => {
  if (!metadata || Object.keys(metadata).length === 0) {
    return '';
  }
  try {
    const maskedMetadata = maskSensitiveData(metadata);
    return ` ${JSON.stringify(maskedMetadata, getCircularReplacer())}`;
  } catch (error) {
    return ' [Unable to stringify metadata]';
  }
};

/**
 * Creates a replacer function for JSON.stringify that handles circular references
 * and Error objects appropriately
 * @returns {(key: string, value: any) => any} Replacer function for JSON.stringify
 */
const getCircularReplacer = () => {
  const seen = new WeakSet();
  return (key: string, value: any) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular Reference]';
      }
      seen.add(value);
    }
    if (value instanceof Error) {
      return {
        message: value.message,
        name: value.name,
        stack: LOG_CONFIG.isProd ? undefined : value.stack,
      };
    }
    return value;
  };
};

/**
 * Determines if a log level should be processed based on current environment
 * @param {LogLevel} level - Log level to check
 * @returns {boolean} Whether the log level is enabled in current environment
 */
const shouldLog = (level: LogLevel): boolean => {
  const env = (process.env.NODE_ENV as Environment) || 'development';
  return LOG_CONFIG.enabledLevels[env].includes(level);
};

/**
 * Core logging function that processes and outputs log messages
 * @param {LogLevel} level - Severity level of the log
 * @param {string} message - Main log message
 * @param {LogMetadata} [metadata] - Optional additional context
 */
const log = (level: LogLevel, message: string, metadata?: LogMetadata) => {
  if (!shouldLog(level)) return;

  const timestamp = getTimestamp();
  const formattedMetadata = formatMetadata(metadata);
  const logMessage = `[${timestamp}] [${level.toUpperCase()}]: ${message}${formattedMetadata}`;

  switch (level) {
    case 'debug':
      console.debug(logMessage);
      break;
    case 'info':
      console.info(logMessage);
      break;
    case 'warn':
      console.warn(logMessage);
      break;
    case 'error':
    case 'fatal':
      console.error(logMessage);
      break;
  }
};

/** Logger instance with methods for each log level */
const logger = {
  /**
   * Log debug message
   * @param {string} message - Debug message
   * @param {LogMetadata} [metadata] - Optional context data
   */
  debug: (message: string, metadata?: LogMetadata) => log('debug', message, metadata),

  /**
   * Log informational message
   * @param {string} message - Info message
   * @param {LogMetadata} [metadata] - Optional context data
   */
  info: (message: string, metadata?: LogMetadata) => log('info', message, metadata),

  /**
   * Log warning message
   * @param {string} message - Warning message
   * @param {LogMetadata} [metadata] - Optional context data
   */
  warn: (message: string, metadata?: LogMetadata) => log('warn', message, metadata),

  /**
   * Log error message
   * @param {string} message - Error message
   * @param {LogMetadata} [metadata] - Optional context data
   */
  error: (message: string, metadata?: LogMetadata) => log('error', message, metadata),

  /**
   * Log fatal error message
   * @param {string} message - Fatal error message
   * @param {LogMetadata} [metadata] - Optional context data
   */
  fatal: (message: string, metadata?: LogMetadata) => log('fatal', message, metadata),
};

export default logger;
