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
  #ui;
  #onMessages;
  #onParticipantsUpdate;
  #socket = null;
  #stopped = false;
  #reconnectTimer = null;
  #reconnectDelay = MIN_RECONNECT_DELAY;
  #starting = false;

  constructor({ logger, ui, onMessages, onParticipantsUpdate }) {
    this.#logger = logger;
    this.#ui = ui;
    this.#onMessages = onMessages;
    this.#onParticipantsUpdate = onParticipantsUpdate;
  }

  async start() {
    this.#stopped = false;
    this.#ui?.setStatus('CONNECTING');
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

    this.#ui?.setStatus('STOPPED');
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
        void this.#onMessages.call(socket, update);
      });
      socket.ev.on('group-participants.update', (update) => {
        if (this.#onParticipantsUpdate) {
          void this.#onParticipantsUpdate(update, socket);
        }
      });
      socket.ev.on('connection.update', (update) => {
        this.#handleConnectionUpdate(update, socket);
      });
    } catch (error) {
      this.#ui?.setStatus('DISCONNECTED');
      this.#logger.error({ err: error }, 'Unable to initialize WhatsApp connection');
      this.#scheduleReconnect();
    } finally {
      this.#starting = false;
    }
  }

  #handleConnectionUpdate(update, socket) {
    const { connection, lastDisconnect, qr } = update;

    if (connection === 'connecting') this.#ui?.setStatus('CONNECTING');

    if (qr) {
      this.#ui?.setStatus('WAITING FOR QR');
      this.#ui?.pause();
      process.stdout.write('Scan this QR code with WhatsApp > Linked devices:\n\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      this.#reconnectDelay = MIN_RECONNECT_DELAY;
      this.#ui?.resume();
      this.#ui?.setStatus('CONNECTED');
      this.#logger.info('WhatsApp connection established');
    }

    if (connection !== 'close') return;
    if (this.#socket !== socket) return;

    this.#socket = null;
    const statusCode = lastDisconnect?.error?.output?.statusCode;
    const loggedOut = statusCode === DisconnectReason.loggedOut;

    if (loggedOut) {
      this.#ui?.resume();
      this.#ui?.setStatus('LOGGED OUT');
      this.#logger.error(
        'WhatsApp session logged out. Remove the local auth directory and pair again.'
      );
      return;
    }

    this.#ui?.resume();
    this.#ui?.setStatus('DISCONNECTED');
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
      this.#ui?.setStatus('CONNECTING');
      void this.#connect();
    }, delay);
    this.#reconnectTimer.unref?.();
  }
}
