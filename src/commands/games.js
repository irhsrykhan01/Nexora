export function createGameCommands({ gameManager } = {}) {
  const getManager = async (sock, chat) => {
    if (!gameManager) {
      await sock.sendMessage(chat, { text: 'Modul permainan belum siap.' });
      return null;
    }
    return gameManager;
  };

  return [
    {
      name: 'trivia',
      aliases: ['kuis'],
      category: 'games',
      description: 'Mulai kuis pengetahuan umum.',
      usage: 'trivia',
      async execute({ sock, chat }) {
        const manager = await getManager(sock, chat);
        if (manager) await manager.startTrivia(chat, sock);
      },
    },
    {
      name: 'tebakangka',
      aliases: ['guessnumber'],
      category: 'games',
      description: 'Tebak angka rahasia dari 1 sampai 20.',
      usage: 'tebakangka',
      async execute({ sock, chat }) {
        const manager = await getManager(sock, chat);
        if (manager) await manager.startNumber(chat, sock);
      },
    },
    {
      name: 'susunkata',
      aliases: ['scramble'],
      category: 'games',
      description: 'Susun huruf acak menjadi sebuah kata.',
      usage: 'susunkata',
      async execute({ sock, chat }) {
        const manager = await getManager(sock, chat);
        if (manager) await manager.startScramble(chat, sock);
      },
    },
    {
      name: 'stopgame',
      aliases: ['akhiri game'],
      category: 'games',
      description: 'Hentikan permainan yang sedang berjalan.',
      usage: 'stopgame',
      async execute({ sock, chat }) {
        const manager = await getManager(sock, chat);
        if (manager) await manager.stop(chat, sock);
      },
    },
  ];
}
