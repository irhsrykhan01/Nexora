import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import { config } from '../config.js';

const MIN_RECONNECT_DELAY = 1_500;
const MAX_RECONNECT_DELAY = 30_000;

export class WhatsAppConnection {
  #logger;
  #onMessages;
  #socket = null;
  #stopped = false;
  #reconnectTimer = null;
  #reconnectDelay = MIN_RECONNECT_DELAY;
  #starting = false;

  constructor({ logger, onMessages }) {
    this.#logger = logger;
    this.#onMessages = onMessages;
  }

  async start() {
    this.#stopped = false;
    await this.#connect();
  }

  async stop() {
    this.#stopped = true;
    clearTimeout(this.#reconnectTimer);
    this.#reconnectTimer = null;

    const socket = this.#socket;
    this.#socket = null;

    if (socket) {
      try {
        socket.end(undefined);
      } catch (error) {
        this.#logger.warn({ err: error }, 'Error while closing WhatsApp socket');
      }
    }
  }

  async #connect() {
    if (this.#stopped || this.#starting) return;
    this.#starting = true;

    try {
      const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
      if (this.#stopped) return;

      const socket = makeWASocket({
        auth: state,
        logger: this.#logger.child({ component: 'baileys' }),
        printQRInTerminal: false,
        markOnlineOnConnect: false,
        syncFullHistory: false,
        browser: ['Nexora', 'Chrome', '1.0.0'],
      });

      this.#socket = socket;
      socket.ev.on('creds.update', saveCreds);
      socket.ev.on('messages.upsert', (update) => {
        this.#onMessages.call(socket, update);
      });

      socket.ev.on('connection.update', (update) => {
        this.#handleConnectionUpdate(update, socket);
      });
    } catch (error) {
      this.#logger.error({ err: error }, 'Unable to initialize WhatsApp connection');
      this.#scheduleReconnect();
    } finally {
      this.#starting = false;
    }
  }

  #handleConnectionUpdate(update, socket) {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      this.#logger.info('Scan this QR code with WhatsApp > Linked devices:');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      this.#reconnectDelay = MIN_RECONNECT_DELAY;
      this.#logger.info('WhatsApp connection established');
    }

    if (connection !== 'close') return;

    if (this.#socket === socket) this.#socket = null;

    const statusCode = lastDisconnect?.error?.output?.statusCode;
    const loggedOut = statusCode === DisconnectReason.loggedOut;

    if (loggedOut) {
      this.#logger.error(
        'WhatsApp session logged out. Remove the local auth directory and pair again.'
      );
      return;
    }

    this.#logger.warn(
      { statusCode },
      'WhatsApp connection closed; reconnecting'
    );
    this.#scheduleReconnect();
  }

  #scheduleReconnect() {
    if (this.#stopped || this.#reconnectTimer) return;

    const delay = this.#reconnectDelay;
    this.#reconnectDelay = Math.min(this.#reconnectDelay * 2, MAX_RECONNECT_DELAY);

    this.#logger.info({ delay }, 'Scheduling WhatsApp reconnect');

    this.#reconnectTimer = setTimeout(() => {
      this.#reconnectTimer = null;
      void this.#connect();
    }, delay);

    this.#reconnectTimer.unref?.();
  }
}
