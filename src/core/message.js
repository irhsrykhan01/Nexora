const TEXT_FIELDS = [
  'conversation',
  'extendedTextMessage',
  'imageMessage',
  'videoMessage',
  'documentMessage',
  'buttonsResponseMessage',
  'listResponseMessage',
  'templateButtonReplyMessage',
];

function unwrapMessage(message) {
  let current = message;

  for (let depth = 0; depth < 5 && current; depth += 1) {
    const wrapper =
      current.ephemeralMessage?.message ??
      current.viewOnceMessage?.message ??
      current.viewOnceMessageV2?.message ??
      current.viewOnceMessageV2Extension?.message ??
      current.documentWithCaptionMessage?.message;

    if (!wrapper) break;
    current = wrapper;
  }

  return current;
}

function extractText(message) {
  for (const field of TEXT_FIELDS) {
    const value = message?.[field];
    if (typeof value === 'string') return value;

    if (value && typeof value.text === 'string') return value.text;
    if (value && typeof value.caption === 'string') return value.caption;
    if (value && typeof value.selectedDisplayText === 'string') return value.selectedDisplayText;
    if (value && typeof value.selectedButtonId === 'string') return value.selectedButtonId;
    if (value && typeof value.selectedRowId === 'string') return value.selectedRowId;
    if (value && typeof value.selectedId === 'string') return value.selectedId;
    if (value && typeof value.singleSelectReply?.selectedRowId === 'string') {
      return value.singleSelectReply.selectedRowId;
    }
  }

  const nativeFlow = message?.interactiveResponseMessage?.nativeFlowResponseMessage;
  if (typeof nativeFlow?.paramsJson === 'string') {
    try {
      const parsed = JSON.parse(nativeFlow.paramsJson);
      if (typeof parsed.id === 'string') return parsed.id;
      if (typeof parsed.selectedId === 'string') return parsed.selectedId;
    } catch {
      return '';
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
    timestamp: upsertMessage.messageTimestamp ?? null,
    message: upsertMessage.message,
  };
}

export function parseCommand(text, prefix) {
  if (typeof text !== 'string' || typeof prefix !== 'string' || !prefix) return null;
  if (!text.startsWith(prefix)) return null;

  const body = text.slice(prefix.length).trim();
  if (!body) return null;

  const [rawName, ...args] = body.split(/\s+/);
  const name = rawName.toLowerCase();
  if (!/^[a-z0-9_-]+$/.test(name)) return null;

  return { name, args, argumentText: args.join(' ') };
}
