export function createGroupEventHandler({ store, logger }) {
  return async function handleGroupParticipants(update, sock) {
    try {
      const groupJid = update?.id;
      const participants = Array.isArray(update?.participants) ? update.participants : [];
      if (!groupJid?.endsWith('@g.us') || participants.length === 0) return;

      const settings = store.getGroupSettings(groupJid);
      const action = update.action;

      if (action !== 'add' && action !== 'remove') return;
      const enabled = action === 'add' ? settings.welcome : settings.goodbye;
      if (!enabled) return;

      const mentions = participants.filter((jid) => typeof jid === 'string');
      if (mentions.length === 0) return;

      const tags = mentions.map((jid) => '@' + jid.split('@')[0]);
      const text = action === 'add'
        ? '👋 Selamat datang ' + tags.join(', ') + '! Semoga nyaman di grup ini.'
        : '👋 Sampai jumpa ' + tags.join(', ') + '!';

      await sock.sendMessage(groupJid, { text, mentions });
    } catch (error) {
      logger.error({ err: error }, 'Failed to process group participant update');
    }
  };
}
