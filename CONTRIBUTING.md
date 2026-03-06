# Contributing to FinanceOS

Thanks for your interest in improving FinanceOS.

We welcome issues, bug reports, documentation updates, feature proposals, and code contributions.

## Ground rules

- Be respectful and collaborative.
- Keep user privacy and self-hosting principles central.
- Prefer small, reviewable pull requests.
- Include tests and docs for behavior changes.

## Ways to contribute

- Report bugs with reproduction steps.
- Improve docs and onboarding.
- Add or refine financial modules.
- Build integrations for additional brokers.
- Improve reliability, performance, and DX.

## Development prerequisites

- Node.js 18+
- npm 9+
- MongoDB 6+

## Local dev setup

1. Fork and clone this repository.
2. Create a feature branch:
   ```bash
   git checkout -b feat/short-description
   ```
3. Run backend and frontend locally.
4. Make your changes.
5. Run tests and linters.
6. Commit using clear, imperative messages.

## Security checks before commit

Enable the repository-managed git hooks:

```bash
chmod +x .githooks/pre-commit
git config core.hooksPath .githooks
```

The pre-commit hook runs `gitleaks` on staged changes and blocks commits if potential secrets are detected.

## Pull request checklist

Before opening a PR, ensure:

- [ ] Change is scoped and documented.
- [ ] Tests updated or added where relevant.
- [ ] Docs updated (`README`, architecture, or module docs).
- [ ] No secrets or sensitive data committed.
- [ ] PR description explains **why**, **what**, and **how tested**.

## Commit message guidance

Suggested format:

- `feat: add X`
- `fix: resolve Y`
- `docs: update Z`
- `refactor: simplify A`
- `test: cover B`

## Issue reporting template

Include:

- What happened
- What you expected
- Steps to reproduce
- Environment details
- Relevant logs/screenshots

## Feature request template

Include:

- Problem statement
- Proposed solution
- Alternatives considered
- User impact
- Potential implementation notes

## Questions and discussions

Use GitHub Discussions (or Issues if Discussions is not enabled) for design and roadmap conversations.
