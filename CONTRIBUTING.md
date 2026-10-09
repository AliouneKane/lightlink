# Contributing to LightLink

Golden rule: **nobody pushes directly to `main`**. Everything goes through a pull request (PR) that another member reviews and approves.

## The 6 steps of a task

1. Create one branch per task, e.g. `feature/12-report-screen`.
2. Make small commits, e.g. `feat: add report button`.
3. Open a pull request to `main`: explain what changed and how to test it.
4. Automatic checks (GitHub Actions) must be green.
5. Another member reviews and approves within 24 hours.
6. Merge, then delete the branch.

## Rules

- You cannot approve your own PR.
- A new commit after approval requires a new approval.
- All review comments must be resolved before merging.
- Formatting: Prettier and ESLint for web and React Native / Expo mobile. Run the project's TypeScript checks and tests before committing.
- Mobile checks from `mobile/`: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npx expo install --check`, `npm run export` and `npm run test:e2e`. Browser checks support frontend review; record native device checks separately.

## Secrets

This repository is **public**. Never commit passwords, API keys or tokens. Put them in a local `.env` file (ignored by Git) and keep only `.env.example` without any secret.
