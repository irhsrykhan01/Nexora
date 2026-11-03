import {
  getGroupMetadata,
  normalizeJid,
  requireBotAdmin,
} from '../core/group-permissions.js';

function adminParticipants(metadata) {
  return (metadata.participants ?? []).filter((participant) =>
    participant.admin === 'admin' || participant.admin === 'superadmin'
  );
}

function getMentionedTargets(message) {
  const content = message?.message ?? {};
  const extended = content.extendedTextMessage?.contextInfo
    ?? content.imageMessage?.contextInfo
    ?? content.videoMessage?.contextInfo
    ?? content.documentMessage?.contextInfo;
  const mentioned = Array.isArray(extended?.mentionedJid) ? extended.mentionedJid : [];
  const quoted = extended?.participant ? [extended.participant] : [];
  return [...new Set([...mentioned, ...quoted].filter((jid) => typeof jid === 'string'))];
}

function getPhoneTargets(argumentText) {
  const numbers = (argumentText || '').split(/[\s,]+/).filter(Boolean);
  if (!numbers.length || numbers.length > 10) return [];
  if (!numbers.every((number) => /^\+?\d{8,15}$/.test(number))) return [];
  return numbers.map((number) => number.replace(/^\+/, '') + '@s.whatsapp.net');
}

function assertSafeTargets(sock, chat, targets) {
  if (!targets.length) throw new Error('Tag anggota atau balas pesannya terlebih dahulu.');
  const botJid = normalizeJid(sock.user?.id);
  if (targets.some((jid) => normalizeJid(jid) === botJid)) {
    throw new Error('Nexora tidak boleh menjadi target perintah ini.');
  }
  if (targets.some((jid) => !jid.endsWith('@s.whatsapp.net'))) {
    throw new Error('Target anggota tidak valid.');
  }
  return [...new Set(targets.map(normalizeJid))];
}

export function createGroupCommands({ store = null } = {}) {
  return [
    {
      name: 'groupinfo',
      aliases: ['infogrup'],
      category: 'group',
      groupOnly: true,
      description: 'Lihat ringkasan grup saat ini.',
      usage: 'groupinfo',
      async execute({ sock, chat }) {
        const metadata = await getGroupMetadata(sock, chat);
        const admins = adminParticipants(metadata).length;
        const text = [
          '👥 *INFORMASI GRUP*',
          '',
          '*Nama:* ' + (metadata.subject || 'Tidak diketahui'),
          '*Anggota:* ' + (metadata.participants?.length ?? 0),
          '*Admin:* ' + admins,
          '*Deskripsi:* ' + (metadata.desc || 'Belum ada deskripsi.'),
        ].join('\n');
        await sock.sendMessage(chat, { text });
      },
    },
    {
      name: 'admins',
      aliases: ['listadmin'],
      category: 'group',
      groupOnly: true,
      description: 'Tampilkan admin grup.',
      usage: 'admins',
      async execute({ sock, chat }) {
        const metadata = await getGroupMetadata(sock, chat);
        const admins = adminParticipants(metadata).filter((participant) =>
          typeof participant.id === 'string'
        );
        if (admins.length === 0) {
          await sock.sendMessage(chat, { text: 'Belum ada data admin grup.' });
          return;
        }
        const mentions = admins.map((participant) => participant.id);
        const lines = admins.map((participant, index) =>
          (index + 1) + '. @' + participant.id.split('@')[0] +
          (participant.admin === 'superadmin' ? ' (owner grup)' : '')
        );
        await sock.sendMessage(chat, {
          text: '🛡️ *ADMIN GRUP*\n' + lines.join('\n'),
          mentions,
        });
      },
    },
    {
      name: 'grouplink',
      aliases: ['linkgroup'],
      category: 'group',
      groupOnly: true,
      adminOnly: true,
      description: 'Ambil tautan undangan grup.',
      usage: 'grouplink',
      async execute({ sock, chat }) {
        await requireBotAdmin(sock, chat);
        const code = await sock.groupInviteCode(chat);
        await sock.sendMessage(chat, {
          text: '🔗 Tautan undangan grup:\nhttps://chat.whatsapp.com/' + code,
        });
      },
    },
    {
      name: 'resetgrouplink',
      aliases: ['revokeinvite'],
      category: 'group',
      groupOnly: true,
      adminOnly: true,
      description: 'Reset tautan undangan grup yang lama.',
      usage: 'resetgrouplink',
      async execute({ sock, chat }) {
        await requireBotAdmin(sock, chat);
        const code = await sock.groupRevokeInvite(chat);
        await sock.sendMessage(chat, {
          text: '🔄 Tautan undangan lama sudah dinonaktifkan.\nhttps://chat.whatsapp.com/' + code,
        });
      },
    },
    {
      name: 'groupname',
      aliases: ['setname'],
      category: 'group',
      groupOnly: true,
      adminOnly: true,
      description: 'Ubah nama grup (bot juga harus admin).',
      usage: 'groupname nama baru',
      async execute({ sock, chat, argumentText }) {
        const subject = (argumentText || '').trim();
        if (!subject || subject.length > 25) {
          await sock.sendMessage(chat, { text: 'Nama grup wajib diisi dan maksimal 25 karakter.' });
          return;
        }
        await requireBotAdmin(sock, chat);
        await sock.groupUpdateSubject(chat, subject);
        await sock.sendMessage(chat, { text: '✅ Nama grup berhasil diperbarui.' });
      },
    },
    {
      name: 'groupdesc',
      aliases: ['setdesc'],
      category: 'group',
      groupOnly: true,
      adminOnly: true,
      description: 'Ubah deskripsi grup (bot juga harus admin).',
      usage: 'groupdesc deskripsi baru',
      async execute({ sock, chat, argumentText }) {
        const description = (argumentText || '').trim();
        if (!description || description.length > 512) {
          await sock.sendMessage(chat, { text: 'Deskripsi wajib diisi dan maksimal 512 karakter.' });
          return;
        }
        await requireBotAdmin(sock, chat);
        await sock.groupUpdateDescription(chat, description);
        await sock.sendMessage(chat, { text: '✅ Deskripsi grup berhasil diperbarui.' });
      },
    },
    {
      name: 'kick',
      aliases: ['remove', 'keluarkan'],
      category: 'group',
      groupOnly: true,
      adminOnly: true,
      description: 'Keluarkan anggota yang ditandai atau dikutip.',
      usage: 'kick @anggota',
      async execute({ sock, chat, message }) {
        await requireBotAdmin(sock, chat);
        const mentioned = getMentionedTargets(message);
        if (!mentioned.length) {
          await sock.sendMessage(chat, { text: 'Tag anggota yang ingin dikeluarkan atau balas pesannya dengan .kick.' });
          return;
        }
        const targets = assertSafeTargets(sock, chat, mentioned);
        await sock.groupParticipantsUpdate(chat, targets, 'remove');
        await sock.sendMessage(chat, { text: '✅ Permintaan mengeluarkan anggota sudah dikirim.' });
      },
    },
    {
      name: 'add',
      aliases: ['invite', 'tambahanggota'],
      category: 'group',
      groupOnly: true,
      adminOnly: true,
      description: 'Undang anggota menggunakan nomor telepon.',
      usage: 'add 6281234567890',
      async execute({ sock, chat, argumentText }) {
        await requireBotAdmin(sock, chat);
        const phoneTargets = getPhoneTargets(argumentText);
        if (!phoneTargets.length) {
          await sock.sendMessage(chat, { text: 'Format: .add 6281234567890 (maksimal 10 nomor, 8–15 digit).' });
          return;
        }
        const targets = assertSafeTargets(sock, chat, phoneTargets);
        const result = await sock.groupParticipantsUpdate(chat, targets, 'add');
        const failed = Array.isArray(result)
          ? result.filter((item) => item.status && item.status !== '200').length
          : 0;
        await sock.sendMessage(chat, {
          text: failed
            ? '⚠️ Undangan diproses, tetapi ada ' + failed + ' nomor yang tidak berhasil ditambahkan.'
            : '✅ Permintaan undangan anggota sudah dikirim. Hasil akhir bergantung pada pengaturan privasi WhatsApp.',
        });
      },
    },
    {
      name: 'promote',
      aliases: ['angkatadmin'],
      category: 'group',
      groupOnly: true,
      adminOnly: true,
      description: 'Jadikan anggota sebagai admin grup.',
      usage: 'promote @anggota',
      async execute({ sock, chat, message }) {
        await requireBotAdmin(sock, chat);
        const mentioned = getMentionedTargets(message);
        if (!mentioned.length) {
          await sock.sendMessage(chat, { text: 'Tag anggota yang ingin dijadikan admin atau balas pesannya dengan .promote.' });
          return;
        }
        const targets = assertSafeTargets(sock, chat, mentioned);
        await sock.groupParticipantsUpdate(chat, targets, 'promote');
        await sock.sendMessage(chat, { text: '✅ Permintaan menjadikan admin sudah dikirim.' });
      },
    },
    {
      name: 'demote',
      aliases: ['turunkanadmin'],
      category: 'group',
      groupOnly: true,
      adminOnly: true,
      description: 'Cabut status admin anggota.',
      usage: 'demote @anggota',
      async execute({ sock, chat, message }) {
        await requireBotAdmin(sock, chat);
        const mentioned = getMentionedTargets(message);
        if (!mentioned.length) {
          await sock.sendMessage(chat, { text: 'Tag admin yang ingin diturunkan atau balas pesannya dengan .demote.' });
          return;
        }
        const targets = assertSafeTargets(sock, chat, mentioned);
        await sock.groupParticipantsUpdate(chat, targets, 'demote');
        await sock.sendMessage(chat, { text: '✅ Permintaan mencabut admin sudah dikirim.' });
      },
    },
    {
      name: 'groupopen',
      aliases: ['bukagrup'],
      category: 'group',
      groupOnly: true,
      adminOnly: true,
      description: 'Izinkan semua anggota mengirim pesan.',
      usage: 'groupopen',
      async execute({ sock, chat }) {
        await requireBotAdmin(sock, chat);
        await sock.groupSettingUpdate(chat, 'not_announcement');
        await sock.sendMessage(chat, { text: '🔓 Grup dibuka. Semua anggota dapat mengirim pesan.' });
      },
    },
    {
      name: 'groupclose',
      aliases: ['tutupgrup'],
      category: 'group',
      groupOnly: true,
      adminOnly: true,
      description: 'Batasi pengiriman pesan hanya untuk admin.',
      usage: 'groupclose',
      async execute({ sock, chat }) {
        await requireBotAdmin(sock, chat);
        await sock.groupSettingUpdate(chat, 'announcement');
        await sock.sendMessage(chat, { text: '🔒 Grup ditutup. Hanya admin yang dapat mengirim pesan.' });
      },
    },
    {
      name: 'setwelcome',
      category: 'group',
      groupOnly: true,
      adminOnly: true,
      description: 'Aktifkan atau matikan pesan sambutan.',
      usage: 'setwelcome on|off',
      async execute({ sock, chat, args }) {
        if (!store) {
          await sock.sendMessage(chat, { text: 'Penyimpanan pengaturan belum siap.' });
          return;
        }
        const mode = (args[0] || '').toLowerCase();
        if (mode !== 'on' && mode !== 'off') {
          await sock.sendMessage(chat, { text: 'Gunakan .setwelcome on atau .setwelcome off.' });
          return;
        }
        await store.setGroupSettings(chat, { welcome: mode === 'on' });
        await sock.sendMessage(chat, {
          text: '✅ Welcome ' + (mode === 'on' ? 'diaktifkan' : 'dimatikan') + '.',
        });
      },
    },
    {
      name: 'setgoodbye',
      category: 'group',
      groupOnly: true,
      adminOnly: true,
      description: 'Aktifkan atau matikan pesan perpisahan.',
      usage: 'setgoodbye on|off',
      async execute({ sock, chat, args }) {
        if (!store) {
          await sock.sendMessage(chat, { text: 'Penyimpanan pengaturan belum siap.' });
          return;
        }
        const mode = (args[0] || '').toLowerCase();
        if (mode !== 'on' && mode !== 'off') {
          await sock.sendMessage(chat, { text: 'Gunakan .setgoodbye on atau .setgoodbye off.' });
          return;
        }
        await store.setGroupSettings(chat, { goodbye: mode === 'on' });
        await sock.sendMessage(chat, {
          text: '✅ Goodbye ' + (mode === 'on' ? 'diaktifkan' : 'dimatikan') + '.',
        });
      },
    },
  ];
}
