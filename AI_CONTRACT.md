# FinanceOS AI Contract

This document defines how AI-assisted development should be used in the FinanceOS project.

## Purpose

AI tools can improve speed and quality when used responsibly. This contract sets expectations for transparency, safety, and reviewability.

## Principles

- **Human accountable**: maintainers are always responsible for final outcomes.
- **Transparent usage**: AI-assisted contributions should be disclosed.
- **Privacy first**: never expose user financial data or secrets to external AI services.
- **Review required**: no AI-generated code is merged without human review.
- **Security-aware**: authentication, encryption, and backup paths require extra scrutiny.

## Allowed AI usage

- Drafting documentation
- Refactoring boilerplate
- Generating test scaffolding
- Producing implementation alternatives for maintainer review

## Restricted or prohibited usage

- Uploading production secrets, private keys, or sensitive data into AI tools
- Blindly merging AI output without validation
- Using AI output that violates project license or attribution requirements

## Contribution requirements for AI-assisted PRs

Contributors must:

1. State that AI assistance was used.
2. Summarize which parts were AI-assisted.
3. Confirm manual review and testing were performed.
4. Confirm no sensitive data was shared with external services.

## Maintainer review checklist

- Does the change align with project architecture and principles?
- Is the implementation secure and test-covered?
- Are docs and changelog entries included where needed?
- Is AI usage disclosure present and sufficient?

## Model behavior expectations

AI-generated suggestions should prioritize:

- readability
- deterministic behavior
- explicit error handling
- minimal hidden complexity
- clear user-facing failure modes

## Updates

This AI Contract may evolve as tooling and governance practices mature.
