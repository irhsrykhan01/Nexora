# Nexora

An independent, modular WhatsApp automation bot built with Node.js and Baileys.

Nexora is developed as its own project. Other projects may be studied for general ideas, but their protected source code, branding, and assets are not copied.

## Requirements

- Node.js 20.18.1 or newer
- npm
- A WhatsApp account for linking the bot as a companion device

## Install

```bash
git clone https://github.com/irhsrykhan01/Nexora.git
cd Nexora
npm install
cp .env.example .env
npm start
```

On Android/Termux, install a supported Node.js version and Git first. On a Pterodactyl panel, use a Node.js 20 or newer runtime and run `npm install` followed by `npm start`.

## First connection

1. Start Nexora with `npm start`.
2. A QR code will appear in the terminal.
3. In WhatsApp, open **Linked devices** and scan the QR code.
4. Keep the `data/auth` directory private. It contains account credentials.

If the session is logged out, remove the local `data/auth` directory and pair the device again. Do not upload session files to GitHub or share them with anyone.

## Commands

The initial build includes:

| Command | Description |
| --- | --- |
| `.ping` | Check whether Nexora is responding |
| `.menu` | Show available commands |
| `.help` | Alias for menu |
| `.info` | Show basic bot information |

The command prefix can be changed with `PREFIX` in `.env`.

## Configuration

Copy `.env.example` to `.env` and edit the values if needed.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PREFIX` | `.` | Command prefix |
| `BOT_NAME` | `Nexora` | Display name |
| `AUTH_DIR` | `./data/auth` | Local WhatsApp session directory |
| `LOG_LEVEL` | `info` | Log verbosity |

No paid API key or subscription is required for the core bot. Optional future integrations will be clearly marked and must not be required to start the core bot.

## Development checks

```bash
npm test
npm run check
```

Tests use Node.js's built-in test runner and do not require API credentials.

## Project status

This is the initial foundation release. The core connection, command registry, message parsing, basic commands, and automated tests are included. Media tools, group administration, games, and downloaders are not claimed as implemented yet.

## Important notes

- Nexora is an unofficial third-party project and is not affiliated with WhatsApp or Meta.
- Use responsibly and respect WhatsApp's terms and other people's privacy. Do not use the bot for spam or unsolicited bulk messaging.
- Baileys is an independent open-source library. See its repository and license: https://github.com/WhiskeySockets/Baileys
- WhatsApp is a trademark of its respective owner.

## License

Nexora is distributed under the Apache License 2.0. See [LICENSE](LICENSE).
