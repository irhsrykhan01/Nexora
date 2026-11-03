import pino from 'pino';
import { config } from '../config.js';
import { TerminalUI } from './terminal-ui.js';

export const ui = new TerminalUI({ botName: config.botName });

export const logger = pino({
  level: config.logLevel,
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'password', '*.password',
      'token', '*.token',
      'apiKey', '*.apiKey',
      'session', '*.session',
      'chat', '*.chat',
      'sender', '*.sender',
      'remoteJid', '*.remoteJid',
    ],
    censor: '[REDACTED]',
  },
}, ui.createLogStream());
