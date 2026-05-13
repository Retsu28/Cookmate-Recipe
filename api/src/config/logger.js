const pino = require('pino');

const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    base: { pid: process.pid, service: 'cookmate-api' },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.password_hash', '*.token'],
      censor: '[REDACTED]',
    },
  },
  process.env.NODE_ENV !== 'production'
    ? pino.transport({ target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname,service' } })
    : undefined
);

module.exports = logger;
