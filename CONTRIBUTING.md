# Contributing to FinanceOS

## Development Setup

1. Fork and clone the repository.
2. Install dependencies:
   - `npm install`
3. Create environment files:
   - `.env` from `.env.example`
   - `financeos-ui/.env` from `financeos-ui/.env.example`

## Development Workflow

1. Create a branch from `main`:
   - `feature/<short-name>` for features
   - `fix/<short-name>` for bug fixes
2. Make focused changes with tests where relevant.
3. Run checks before opening a pull request:
   - `npm run test:api`
   - `npm run build:web`
4. Open a PR with:
   - Clear problem statement
   - Summary of changes
   - Testing notes

## Coding Standards

- Keep functions small and explicit.
- Prefer clear naming over clever abstractions.
- Avoid unrelated refactors in the same PR.
- Update documentation when behavior changes.

## Commit Guidance

- Use small, reviewable commits.
- Write descriptive commit messages in imperative mood.

## Pull Request Review Criteria

- Correctness and regressions
- Test coverage for changed behavior
- Backward compatibility
- Security and input validation
- Documentation completeness
