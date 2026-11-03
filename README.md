# Nexora

Nexora is an independent, modular WhatsApp automation bot built with Node.js and Baileys. The V1 foundation focuses on useful built-in features, local-first configuration, and predictable behavior without paid API keys.

Nexora is developed as its own project. Other projects may be studied for general ideas, but protected source code, branding, and assets are not copied.

## Requirements

- Node.js 20.18.1 or newer
- npm and Git
- A WhatsApp account for linking the bot as a companion device

## Install

```bash
git clone https://github.com/irhsrykhan01/Nexora.git
cd Nexora
npm install
cp .env.example .env
npm run check
npm start
```

On Android/Termux, install Node.js and Git first. On a Pterodactyl panel, use a supported Node.js runtime and run the same install and start commands.

## First connection

1. Start Nexora with `npm start`.
2. If a QR code appears, scan it from WhatsApp → Linked devices.
3. Keep the `data/auth` directory private. It contains WhatsApp credentials.
4. Keep the process running while you want the bot online.

Never upload the auth directory, QR codes, or pairing codes to GitHub or share them with anyone. If a session is exposed, unlink the device in WhatsApp and pair again.

## Terminal dashboard

In an interactive terminal such as Termux, Nexora shows connection status, uptime, incoming message and recognized command counters, and recent activity. In non-interactive environments, structured logs are printed as readable text. The dashboard adds no UI dependency.

## Built-in commands

Use the configured prefix (default `.`).

### General and tools

| Command | Description |
| --- | --- |
| `.ping` / `.p` | Check whether Nexora responds |
| `.menu` / `.help` / `.allmenu` | List available commands by category |
| `.info` | Show bot and runtime information |
| `.uptime` | Show how long Nexora has been running |
| `.calc 12 * (3 + 2)` | Safely calculate arithmetic expressions |
| `.speed` | Show a lightweight response check |

The calculator supports parentheses, decimals, unary signs, addition, subtraction, multiplication, division, modulo, and powers. It does not execute JavaScript or use `eval`.

### Fun and games

| Command | Description |
| --- | --- |
| `.roll 2d6` | Roll 1–20 dice with 2–1,000 sides |
| `.coinflip` | Flip a virtual coin |
| `.choose A | B | C` | Choose one of 2–10 options |
| `.8ball question` | Get a lighthearted random response |
| `.trivia` | Start a general-knowledge quiz |
| `.tebakangka` | Guess a number from 1 to 20 |
| `.susunkata` | Unscramble an Indonesian word |
| `.stopgame` | Stop the active game in the chat |

Only one game session can run in each chat at a time. Game sessions expire automatically.

### Group tools

| Command | Description |
| --- | --- |
| `.groupinfo` | Show group name, member count, admins, and description |
| `.admins` | Mention group admins |
| `.grouplink` | Get the group invite link (group admins only) |
| `.groupname new name` | Change group name (group admin and bot admin required) |
| `.groupdesc new description` | Change group description (group admin and bot admin required) |
| `.setwelcome on/off` | Toggle welcome messages (group admins only) |
| `.setgoodbye on/off` | Toggle goodbye messages (group admins only) |

Group administration commands validate the sender's admin role. Editing the group name or description also requires Nexora to be an admin. Nexora does not include mass-kick, mass-message, or unsolicited bulk-messaging commands.

## Configuration

Copy `.env.example` to `.env`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PREFIX` | `.` | Command prefix (1–3 characters, no spaces) |
| `BOT_NAME` | `Nexora` | Display name |
| `AUTH_DIR` | `./data/auth` | WhatsApp session directory |
| `DATA_FILE` | `./data/nexora.json` | Local group settings file |
| `LOG_LEVEL` | `info` | Pino log level |
| `COMMAND_COOLDOWN_MS` | `1000` | Per-sender command cooldown; set to 0 to disable |

Group welcome/goodbye settings are stored locally in `DATA_FILE`. The auth directory and data directory are ignored by Git.

## Development and tests

```bash
npm run check
npm test
npm audit
```

The automated tests cover command registration, message parsing, calculator safety, local data persistence, game sessions, group permissions, and message-handler behavior. GitHub Actions runs the checks on Node.js 22, 24, and 26.

## Scope and limitations

The V1 built-in commands work without paid APIs or API keys. Media downloading, AI chat, image generation, and third-party API integrations are not included in this release; they should only be added with a verified provider, documented terms, and explicit configuration. No command is registered as a placeholder.

## Important notes

- Nexora is an unofficial third-party project and is not affiliated with WhatsApp or Meta.
- Use responsibly and respect WhatsApp's terms and other people's privacy. Do not use the bot for spam or unsolicited bulk messaging.
- Baileys is an independent open-source library. See the upstream repository and its license: https://github.com/WhiskeySockets/Baileys
- WhatsApp is a trademark of its respective owner.

## License

Nexora is distributed under the Apache License 2.0. See [LICENSE](LICENSE).
