import winston from 'winston';

const bigIntFormat = winston.format((info) => {
  // We call `convertBigInts` on `info` itself,
  // ensuring that any nested BigInt is converted to string.
  const converted = convertBigInts(info);

  // We merge converted properties back into `info`.
  // (Or you could just `return converted;` if needed.)
  Object.assign(info, converted);
  return info;
});

function convertBigInts(value: any): any {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(convertBigInts);
  }
  if (typeof value === 'object' && value.constructor === Object) {
    const newObj: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      newObj[key] = convertBigInts(val);
    }
    return newObj;
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
}

const customFormats = winston.format.combine(
  bigIntFormat(),
  // You can add more formats here, e.g. timestamp, printf, json, etc.
  winston.format.printf(({ level, message, ...meta }) => {
    // Example: simple text log with JSON-serialized meta
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `[${level.toUpperCase()}] ${message} ${metaStr}`;
  })
);

export const Logger = winston.createLogger({
  level: 'info',
  format: customFormats,
  transports: [
    new winston.transports.Console(),
  ],
});
