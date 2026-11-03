export class PermissionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PermissionError';
  }
}

export function normalizeJid(jid) {
  if (typeof jid !== 'string' || !jid.includes('@')) return '';
  const [local, domain] = jid.split('@');
  return local.split(':')[0] + '@' + domain;
}

export function isGroupJid(jid) {
  return typeof jid === 'string' && jid.endsWith('@g.us');
}

export async function getGroupMetadata(sock, groupJid) {
  if (!isGroupJid(groupJid)) {
    throw new PermissionError('Perintah ini hanya bisa digunakan di grup.');
  }
  return sock.groupMetadata(groupJid);
}

export function isGroupAdmin(metadata, userJid) {
  const normalizedUser = normalizeJid(userJid);
  return (metadata?.participants ?? []).some((participant) => {
    return (
      normalizeJid(participant.id) === normalizedUser &&
      (participant.admin === 'admin' || participant.admin === 'superadmin')
    );
  });
}

export async function requireGroupAdmin(sock, groupJid, userJid) {
  const metadata = await getGroupMetadata(sock, groupJid);
  if (!isGroupAdmin(metadata, userJid)) {
    throw new PermissionError('Perintah ini hanya untuk admin grup.');
  }
  return metadata;
}

export async function requireBotAdmin(sock, groupJid) {
  const metadata = await getGroupMetadata(sock, groupJid);
  const botJid = normalizeJid(sock.user?.id);
  if (!botJid || !isGroupAdmin(metadata, botJid)) {
    throw new PermissionError('Jadikan Nexora sebagai admin grup terlebih dahulu.');
  }
  return metadata;
}
