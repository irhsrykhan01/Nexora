import {
  getGroupMetadata,
  requireBotAdmin,
} from '../core/group-permissions.js';

function adminParticipants(metadata) {
  return (metadata.participants ?? []).filter((participant) =>
    participant.admin === 'admin' || participant.admin === 'superadmin'
  );
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
