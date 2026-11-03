import { Writable } from 'node:stream';

const LEVEL_NAMES = {
  30: 'INFO',
  40: 'WARN',
  50: 'ERROR',
  60: 'FATAL',
};

const ANSI = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  muted: '\x1b[90m',
  bold: '\x1b[1m',
};

function formatDuration(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const hours = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const remainder = String(seconds % 60).padStart(2, '0');
  return [hours, minutes, remainder].join(':');
}

export class TerminalUI {
  #botName;
  #isTTY;
  #startedAt = Date.now();
  #status = 'INITIALIZING';
  #messages = 0;
  #commands = 0;
  #logs = [];
  #paused = false;
  #timer = null;
  #pending = '';

  constructor({ botName = 'Nexora' } = {}) {
    this.#botName = botName;
    this.#isTTY = Boolean(process.stdout.isTTY);
  }

  start() {
    if (!this.#isTTY) return;
    process.stdout.write('\x1b[?25l');
    this.render();
    this.#timer = setInterval(() => this.render(), 1000);
    this.#timer.unref?.();
  }

  stop() {
    clearInterval(this.#timer);
    this.#timer = null;
    if (this.#isTTY) process.stdout.write('\x1b[?25h\n');
  }

  setStatus(status) {
    this.#status = status;
    this.render();
  }

  incrementMessage() {
    this.#messages += 1;
    this.render();
  }

  incrementCommand() {
    this.#commands += 1;
    this.render();
  }

  pause() {
    this.#paused = true;
    if (!this.#isTTY) return;
    process.stdout.write('\x1b[2J\x1b[H');
    process.stdout.write('NEXORA · WHATSAPP LINK\n\n');
  }

  resume() {
    this.#paused = false;
    this.render();
  }

  createLogStream() {
    return new Writable({
      write: (chunk, _encoding, callback) => {
        try {
          this.#pending += chunk.toString();
          const lines = this.#pending.split('\n');
          this.#pending = lines.pop() ?? '';
          for (const line of lines) {
            if (line.trim()) this.#addLog(JSON.parse(line));
          }
          callback();
        } catch (error) {
          callback(error);
        }
      },
      final: (callback) => {
        try {
          if (this.#pending.trim()) this.#addLog(JSON.parse(this.#pending));
          this.#pending = '';
          callback();
        } catch (error) {
          callback(error);
        }
      },
    });
  }

  #addLog(entry) {
    const level = LEVEL_NAMES[entry.level] ?? 'LOG';
    const message = String(entry.msg ?? entry.err?.message ?? 'Activity');
    const component = entry.component ? '[' + entry.component + '] ' : '';
    const line = component + message;

    if (!this.#isTTY) {
      process.stdout.write('[' + level + '] ' + line + '\n');
      return;
    }

    this.#logs.push({ level, message: line });
    this.#logs = this.#logs.slice(-6);
    this.render();
  }

  #paint(color, value) {
    return this.#isTTY ? ANSI[color] + value + ANSI.reset : value;
  }

  render() {
    if (!this.#isTTY || this.#paused) return;

    const width = Math.min(Math.max((process.stdout.columns || 42) - 2, 36), 58);
    const contentWidth = width - 4;
    const line = (value = '') => {
      const raw = String(value);
      const plain = raw.replace(/\x1b\[[0-9;]*m/g, '');
      if (plain.length > contentWidth) {
        return '| ' + plain.slice(0, contentWidth - 1) + '… |';
      }
      return '| ' + raw + ' '.repeat(contentWidth - plain.length) + ' |';
    };
    const border = '+' + '-'.repeat(width - 2) + '+';
    const statusColor = this.#status === 'CONNECTED' ? 'green'
      : ['DISCONNECTED', 'LOGGED OUT'].includes(this.#status) ? 'red'
        : 'yellow';
    const status = this.#paint(statusColor, '● ' + this.#status);
    const logLines = this.#logs.length
      ? this.#logs.map(({ level, message }) => {
          const color = level === 'ERROR' || level === 'FATAL' ? 'red'
            : level === 'WARN' ? 'yellow'
              : 'muted';
          return line(this.#paint(color, '[' + level + ']') + ' ' + message);
        })
      : [line(this.#paint('muted', 'Belum ada aktivitas.'))];

    const output = [
      border,
      line(this.#paint('cyan', 'N E X O R A')),
      line(this.#paint('muted', 'WhatsApp Automation · Terminal')),
      border,
      line('Bot       ' + this.#botName),
      line('WhatsApp  ' + status),
      line('Uptime    ' + formatDuration(Date.now() - this.#startedAt)),
      line('Text msgs ' + this.#messages),
      line('Commands  ' + this.#commands),
      border,
      line(this.#paint('bold', 'ACTIVITY')),
      ...logLines,
      ...Array(Math.max(0, 6 - logLines.length)).fill(line()),
      border,
      line(this.#paint('muted', 'Ctrl+C untuk menghentikan Nexora')),
      border,
    ].join('\n');

    process.stdout.write('\x1b[2J\x1b[H' + output + '\n');
  }
}
