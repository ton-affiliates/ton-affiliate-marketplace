import winston from 'winston';

/**
 * Recursively convert all BigInts within an object (or array) to strings.
 */
function convertBigInts(value: any): any {
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map(convertBigInts);
  }

  if (typeof value === 'object' && value.constructor === Object) {
    const newObj: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      newObj[k] = convertBigInts(v);
    }
    return newObj;
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  return value;
}

/**
 * Winston custom format to handle BigInts before printing.
 */
const bigIntFormat = winston.format((info) => {
  Object.assign(info, convertBigInts(info));
  return info;
});

/**
 * Create and export a single Winston logger instance.
 */
export const Logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    // Add timestamps like 2025-01-12 14:43:43
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    // Convert BigInts
    bigIntFormat(),
    // Final text output
    winston.format.printf(({ level, message, timestamp }) => {
      return `${timestamp} [${level.toUpperCase()}] ${message}`;
    }),
  ),
  transports: [
    new winston.transports.Console(),
  ],
});
