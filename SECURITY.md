# Security Policy

## WhatsApp session and local data

Nexora stores linked-device credentials in the configured auth directory (default: `data/auth`). These files can grant access to the linked WhatsApp session.

- Never commit or upload the auth directory.
- Never send session files, QR codes, or pairing codes to anyone.
- If you believe the session was exposed, unlink the device from WhatsApp's Linked devices screen and create a new session.
- Do not run modified builds from people you do not trust.

Nexora also stores non-secret group preferences (welcome/goodbye settings) in the configured data file (default: `data/nexora.json`). Keep local data directories private if you do not want to disclose your group configuration.

## Reporting

For a security issue, contact the repository owner privately through GitHub rather than publishing session data or exploit details in an issue.
