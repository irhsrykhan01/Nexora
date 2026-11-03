import pino from 'pino';
import { config } from '../config.js';
import { TerminalUI } from './terminal-ui.js';

export const ui = new TerminalUI({ botName: config.botName });

export const logger = pino({
  level: config.logLevel,
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: ['*.password', '*.token', '*.apiKey', '*.session'],
    censor: '[REDACTED]',
  },
}, ui.createLogStream());
