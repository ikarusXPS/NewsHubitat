import winston from 'winston';
import path from 'path';
import { scrubObject, scrubString } from './scrub';

const logDir = 'logs';

// GDPR PII redaction (TOM-FIX-05 / Plan 41-07).
// Winston exposes its info object as the format pipeline value. We deep-scrub
// any nested object metadata and rewrite string fields (message, stack) to
// strip emails + sensitive URL params before any transport runs.
const scrubFormat = winston.format((info) => {
  const scrubbed = scrubObject(info as unknown as Record<string, unknown>);
  if (typeof scrubbed.message === 'string') {
    scrubbed.message = scrubString(scrubbed.message);
  }
  if (typeof scrubbed.stack === 'string') {
    scrubbed.stack = scrubString(scrubbed.stack);
  }
  return scrubbed as winston.Logform.TransformableInfo;
});

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    scrubFormat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'newshub-server' },
  transports: [
    // Write all logs with level 'error' and below to 'error.log'
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error'
    }),
    // Write all logs with level 'info' and below to 'combined.log'
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log')
    }),
  ],
});

// If we're not in production then log to the console with colors
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      scrubFormat(),
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

export default logger;
