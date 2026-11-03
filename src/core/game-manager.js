const TRIVIA = [
  { question: 'Planet apa yang dikenal sebagai Planet Merah?', answer: 'mars' },
  { question: 'Berapa jumlah sisi pada segi enam?', answer: '6' },
  { question: 'Apa ibu kota Jepang?', answer: 'tokyo' },
  { question: 'Hewan darat tercepat di dunia adalah?', answer: 'citah' },
  { question: 'Berapa hasil 12 × 8?', answer: '96' },
  { question: 'Samudra terbesar di dunia adalah?', answer: 'pasifik' },
  { question: 'Apa nama proses tumbuhan membuat makanan?', answer: 'fotosintesis' },
  { question: 'Berapa jumlah warna pada pelangi yang umum diajarkan?', answer: '7' },
  { question: 'Benua terbesar di dunia adalah?', answer: 'asia' },
  { question: 'Apa lambang kimia untuk air?', answer: 'h2o' },
];

const WORDS = [
  'KOMPUTER', 'SEKOLAH', 'INDONESIA', 'MATAHARI',
  'TEKNOLOGI', 'PERPUSTAKAAN', 'KELUARGA', 'PETUALANGAN',
];

function normalizeAnswer(value) {
  return String(value).trim().toLowerCase().replace(/[.!?,\s]+/g, '');
}

function shuffleWord(word, random) {
  const letters = [...word];
  for (let index = letters.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [letters[index], letters[target]] = [letters[target], letters[index]];
  }
  const shuffled = letters.join('');
  return shuffled === word ? word.slice(1) + word[0] : shuffled;
}

export class GameManager {
  #games = new Map();
  #random;
  #timeoutMs;

  constructor({ random = Math.random, timeoutMs = 60_000 } = {}) {
    if (typeof random !== 'function') throw new TypeError('random must be a function.');
    this.#random = random;
    this.#timeoutMs = timeoutMs;
  }

  async startTrivia(chat, sock) {
    const item = TRIVIA[Math.floor(this.#random() * TRIVIA.length)];
    return this.#start(chat, sock, {
      type: 'trivia',
      answer: item.answer,
      attempts: 0,
      maxAttempts: 3,
      prompt: '🧠 *TRIVIA*\n' + item.question + '\n\nKetik jawabanmu. Kesempatan: 3.',
    });
  }

  async startNumber(chat, sock) {
    const answer = Math.floor(this.#random() * 20) + 1;
    return this.#start(chat, sock, {
      type: 'number',
      answer: String(answer),
      attempts: 0,
      maxAttempts: 5,
      prompt: '🔢 *TEBAK ANGKA*\nAku memilih angka dari 1 sampai 20.\nKetik tebakanmu! Kesempatan: 5.',
    });
  }

  async startScramble(chat, sock) {
    const word = WORDS[Math.floor(this.#random() * WORDS.length)];
    const scrambled = shuffleWord(word, this.#random);
    return this.#start(chat, sock, {
      type: 'scramble',
      answer: word.toLowerCase(),
      attempts: 0,
      maxAttempts: 3,
      prompt: '🔤 *SUSUN KATA*\nSusun huruf berikut menjadi kata yang benar:\n\n*' +
        [...scrambled].join(' ') + '*\n\nKesempatan: 3.',
    });
  }

  async #start(chat, sock, game) {
    if (this.#games.has(chat)) {
      await sock.sendMessage(chat, {
        text: 'Masih ada permainan aktif di chat ini. Selesaikan atau gunakan .stopgame dahulu.',
      });
      return false;
    }

    const state = { ...game, timer: null };
    state.timer = setTimeout(() => {
      if (this.#games.get(chat) !== state) return;
      this.#games.delete(chat);
      void sock.sendMessage(chat, {
        text: '⏱️ Waktu permainan habis. Jawabannya: *' + state.answer + '*.',
      });
    }, this.#timeoutMs);
    state.timer.unref?.();
    this.#games.set(chat, state);

    await sock.sendMessage(chat, { text: game.prompt });
    return true;
  }

  async handleMessage(chat, text, sock) {
    const game = this.#games.get(chat);
    if (!game) return false;

    const answer = normalizeAnswer(text);
    if (!answer) return true;

    if (answer === normalizeAnswer(game.answer)) {
      this.#finish(chat, game);
      await sock.sendMessage(chat, { text: '🎉 Benar! Jawabannya *' + game.answer + '*.' });
      return true;
    }

    game.attempts += 1;
    if (game.attempts >= game.maxAttempts) {
      this.#finish(chat, game);
      await sock.sendMessage(chat, {
        text: 'Kesempatan habis. Jawabannya adalah *' + game.answer + '*.',
      });
      return true;
    }

    if (game.type === 'number') {
      const hint = Number(answer) < Number(game.answer) ? 'Terlalu kecil.' : 'Terlalu besar.';
      await sock.sendMessage(chat, {
        text: hint + ' Sisa kesempatan: ' + (game.maxAttempts - game.attempts) + '.',
      });
    } else {
      await sock.sendMessage(chat, {
        text: 'Belum tepat. Sisa kesempatan: ' + (game.maxAttempts - game.attempts) + '.',
      });
    }
    return true;
  }

  async stop(chat, sock) {
    const game = this.#games.get(chat);
    if (!game) {
      await sock.sendMessage(chat, { text: 'Tidak ada permainan aktif di chat ini.' });
      return false;
    }

    this.#finish(chat, game);
    await sock.sendMessage(chat, { text: 'Permainan dihentikan.' });
    return true;
  }

  #finish(chat, game) {
    clearTimeout(game.timer);
    if (this.#games.get(chat) === game) this.#games.delete(chat);
  }

  close() {
    for (const game of this.#games.values()) clearTimeout(game.timer);
    this.#games.clear();
  }
}
