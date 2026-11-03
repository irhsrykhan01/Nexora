import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import { config } from '../config.js';
import { clearWhatsAppAuthSession } from './auth-session.js';

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
  #resettingAuth = false;

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
    if (this.#stopped || this.#starting || this.#resettingAuth) return;
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
        void Promise.resolve(this.#onMessages.call(socket, update)).catch((error) => {
          this.#logger.error({ err: error }, 'Incoming message handler failed');
        });
      });
      socket.ev.on('group-participants.update', (update) => {
        if (!this.#onParticipantsUpdate) return;
        void Promise.resolve(this.#onParticipantsUpdate(update, socket)).catch((error) => {
          this.#logger.error({ err: error }, 'Group participant handler failed');
        });
      });
      socket.ev.on('connection.update', (update) => {
        void this.#handleConnectionUpdate(update, socket).catch((error) => {
          this.#logger.error({ err: error }, 'Connection update handler failed');
        });
      });
    } catch (error) {
      this.#ui?.setStatus('DISCONNECTED');
      this.#logger.error({ err: error }, 'Unable to initialize WhatsApp connection');
      this.#scheduleReconnect();
    } finally {
      this.#starting = false;
    }
  }

  async #handleConnectionUpdate(update, socket) {
    const { connection, lastDisconnect, qr } = update;

    if (connection === 'connecting') this.#ui?.setStatus('CONNECTING');

    if (qr) {
      this.#ui?.setStatus('WAITING FOR QR');
      this.#ui?.pause();
      process.stdout.write('\nScan QR baru melalui WhatsApp > Perangkat tertaut:\n\n');
      qrcode.generate(qr, { small: true });
      process.stdout.write('\nQR berlaku sementara. Jika kedaluwarsa, tunggu QR berikutnya.\n');
    }

    if (connection === 'open') {
      this.#reconnectDelay = MIN_RECONNECT_DELAY;
      this.#ui?.resume();
      this.#ui?.setStatus('CONNECTED');
      this.#logger.info('WhatsApp connection established');
    }

    if (connection !== 'close' || this.#socket !== socket) return;

    this.#socket = null;
    const statusCode = lastDisconnect?.error?.output?.statusCode;
    const loggedOut = statusCode === DisconnectReason.loggedOut;

    if (loggedOut) {
      this.#ui?.resume();
      this.#ui?.setStatus('RESETTING SESSION');
      this.#logger.warn(
        'WhatsApp session was unlinked. Clearing only the old auth session and requesting a new QR code.'
      );

      this.#resettingAuth = true;
      try {
        await clearWhatsAppAuthSession(config.authDir);
        this.#reconnectDelay = MIN_RECONNECT_DELAY;
      } catch (error) {
        this.#ui?.setStatus('AUTH RESET FAILED');
        this.#logger.error({ err: error }, 'Unable to clear the old WhatsApp auth session');
        return;
      } finally {
        this.#resettingAuth = false;
      }

      if (this.#stopped) return;
      this.#logger.info('Old WhatsApp session cleared. A fresh QR code will be generated.');
      this.#scheduleReconnect();
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
