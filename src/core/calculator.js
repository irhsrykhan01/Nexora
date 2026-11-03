const OPERATORS = {
  '+': { precedence: 1, apply: (left, right) => left + right },
  '-': { precedence: 1, apply: (left, right) => left - right },
  '*': { precedence: 2, apply: (left, right) => left * right },
  '/': { precedence: 2, apply: (left, right) => {
    if (right === 0) throw new Error('Tidak bisa membagi dengan nol.');
    return left / right;
  } },
  '%': { precedence: 2, apply: (left, right) => {
    if (right === 0) throw new Error('Tidak bisa memakai sisa bagi nol.');
    return left % right;
  } },
  '^': { precedence: 3, apply: (left, right) => left ** right },
};

export function calculateExpression(input) {
  if (typeof input !== 'string' || !input.trim()) {
    throw new Error('Masukkan ekspresi matematika.');
  }
  const expression = input.trim();
  if (expression.length > 120) {
    throw new Error('Ekspresi terlalu panjang (maksimal 120 karakter).');
  }

  const tokens = [];
  const pattern = /\s*(?:(\d+(?:\.\d*)?|\.\d+)|([()+\-*/%^]))/y;
  let position = 0;

  while (position < expression.length) {
    pattern.lastIndex = position;
    const match = pattern.exec(expression);
    if (!match) throw new Error('Ada karakter atau operator yang tidak valid.');
    tokens.push(match[1] ?? match[2]);
    position = pattern.lastIndex;
  }

  let cursor = 0;

  function parsePrimary(depth) {
    if (depth > 24) throw new Error('Tanda kurung terlalu dalam.');
    const token = tokens[cursor];
    if (token === undefined) throw new Error('Ekspresi belum lengkap.');

    if (token === '(') {
      cursor += 1;
      const value = parseExpression(0, depth + 1);
      if (tokens[cursor] !== ')') throw new Error('Tanda kurung belum ditutup.');
      cursor += 1;
      return value;
    }
    if (token === ')') throw new Error('Susunan tanda kurung tidak valid.');
    if (/^\d/.test(token) || token.startsWith('.')) {
      cursor += 1;
      const value = Number(token);
      if (!Number.isFinite(value)) throw new Error('Angka tidak valid.');
      return value;
    }
    throw new Error('Ekspresi tidak valid di dekat "' + token + '".');
  }

  function parseUnary(depth) {
    const token = tokens[cursor];
    if (token === '+' || token === '-') {
      cursor += 1;
      const value = parseUnary(depth + 1);
      return token === '-' ? -value : value;
    }
    return parsePrimary(depth);
  }

  function parseExpression(minPrecedence, depth = 0) {
    let left = parseUnary(depth);
    while (cursor < tokens.length) {
      const operator = tokens[cursor];
      const definition = OPERATORS[operator];
      if (!definition || definition.precedence < minPrecedence) break;

      cursor += 1;
      const nextPrecedence = definition.precedence + (operator === '^' ? 0 : 1);
      const right = parseExpression(nextPrecedence, depth + 1);
      left = definition.apply(left, right);
      if (!Number.isFinite(left)) {
        throw new Error('Hasil di luar batas angka yang dapat dihitung.');
      }
    }
    return left;
  }

  const result = parseExpression(0);
  if (cursor !== tokens.length) throw new Error('Ada bagian ekspresi yang belum terbaca.');
  if (!Number.isFinite(result)) throw new Error('Hasil perhitungan tidak valid.');
  return Object.is(result, -0) ? 0 : Number(result.toPrecision(12));
}
