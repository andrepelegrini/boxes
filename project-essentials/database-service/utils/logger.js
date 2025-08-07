import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const consoleFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let msg = `[${timestamp}] ${level}: ${message}`;
  
  if (Object.keys(metadata).length > 0) {
    msg += ` | ${JSON.stringify(metadata)}`;
  }
  
  if (stack) {
    msg += `\n${stack}`;
  }
  
  return msg;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  ),
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize(),
        consoleFormat
      )
    })
  ]
});