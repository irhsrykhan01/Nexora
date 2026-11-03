const TEXT_FIELDS = [
  'conversation',
  'extendedTextMessage',
  'imageMessage',
  'videoMessage',
  'documentMessage',
];

function unwrapMessage(message) {
  let current = message;

  for (let depth = 0; depth < 5 && current; depth += 1) {
    const wrapper =
      current.ephemeralMessage?.message ??
      current.viewOnceMessage?.message ??
      current.viewOnceMessageV2?.message ??
      current.documentWithCaptionMessage?.message;

    if (!wrapper) break;
    current = wrapper;
  }

  return current;
}

function extractText(message) {
  for (const field of TEXT_FIELDS) {
    const value = message?.[field];

    if (field === 'conversation' && typeof value === 'string') {
      return value;
    }

    if (value && typeof value.caption === 'string') {
      return value.caption;
    }

    if (value && typeof value.text === 'string') {
      return value.text;
    }
  }

  return '';
}

export function normalizeMessage(upsertMessage) {
  if (!upsertMessage || typeof upsertMessage !== 'object') return null;

  const key = upsertMessage.key;
  const remoteJid = key?.remoteJid;

  if (!remoteJid || !upsertMessage.message) return null;

  const message = unwrapMessage(upsertMessage.message);
  const sender = key.participant ?? remoteJid;

  return {
    id: key.id ?? '',
    key,
    remoteJid,
    sender,
    pushName: upsertMessage.pushName ?? 'Unknown',
    isGroup: remoteJid.endsWith('@g.us'),
    isFromMe: Boolean(key.fromMe),
    text: extractText(message).trim(),
    message: upsertMessage.message,
  };
}

export function parseCommand(text, prefix) {
  if (typeof text !== 'string' || !text.startsWith(prefix)) return null;

  const body = text.slice(prefix.length).trim();
  if (!body) return null;

  const [rawName, ...args] = body.split(/\s+/);
  const name = rawName.toLowerCase();

  if (!/^[a-z0-9_-]+$/.test(name)) return null;

  return { name, args, argumentText: args.join(' ') };
}
