const { createLogger, format, transports } = require('winston');

const isProduction = process.env.NODE_ENV === 'production';

const logger = createLogger({
  level: isProduction ? 'info' : 'debug',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: isProduction
        ? format.combine(format.timestamp(), format.json())
        : format.combine(format.colorize(), format.simple())
    }),
    ...(isProduction
      ? [
          new transports.File({ filename: 'logs/didit-error.log', level: 'error' }),
          new transports.File({ filename: 'logs/didit-combined.log' })
        ]
      : [])
  ],
  exitOnError: false,
});

module.exports = logger; 