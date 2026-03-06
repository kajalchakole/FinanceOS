# Security Policy

FinanceOS is privacy-first and self-hosted. Security issues are treated with high priority.

## Supported versions

Until versioned release channels are formalized, security fixes are applied to the default branch first.

## Reporting a vulnerability

Please **do not** open public GitHub issues for sensitive vulnerabilities.

Instead, report privately via:

- Security email: `financeos.project@gmail.com`

Include:

- A clear description of the issue
- Impact and affected components
- Reproduction steps or PoC
- Suggested mitigation (if available)

## Response process

We aim to:

1. Acknowledge report within 72 hours.
2. Validate and triage severity.
3. Develop and verify a fix.
4. Coordinate disclosure timeline with reporter.
5. Publish a security advisory/changelog entry.

## Security best practices for self-hosting

- Run behind TLS (reverse proxy).
- Keep MongoDB non-public and authenticated.
- Rotate credentials and secrets regularly.
- Use strong backup passphrases.
- Keep dependencies updated.
- Restrict host and network access.

## Scope highlights

High-priority areas include:

- Authentication and recovery flows
- Backup/restore and encryption boundaries
- Broker import parsing and validation
- Session handling and authorization

Thank you for helping make FinanceOS safer for everyone.
