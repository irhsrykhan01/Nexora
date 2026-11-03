import test from 'node:test';
import assert from 'node:assert/strict';
import { TerminalUI } from '../src/core/terminal-ui.js';

test('terminal log stream handles partial and multiple JSON log chunks', async () => {
  const ui = new TerminalUI({ botName: 'Nexora Test' });
  const stream = ui.createLogStream();
  const originalWrite = process.stdout.write;
  let output = '';

  process.stdout.write = function capture(chunk, encoding, callback) {
    output += chunk.toString();
    if (typeof encoding === 'function') encoding();
    else if (typeof callback === 'function') callback();
    return true;
  };

  try {
    stream.write('{"level":30,"msg":"Start ');
    stream.write('Nexora"}\n{"level":50,"msg":"Example failure"}\n');
    await new Promise((resolve, reject) => {
      stream.once('error', reject);
      stream.end(resolve);
    });
    assert.match(output, /\[INFO\] Start Nexora/);
    assert.match(output, /\[ERROR\] Example failure/);
  } finally {
    process.stdout.write = originalWrite;
    ui.stop();
  }
});
