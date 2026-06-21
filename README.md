# Pi Agent Setup

Reusable [Pi](https://pi.dev) coding agent setup.

## What's included

- `ask_user_tui` tool: lets the agent ask one or more clarification questions in Pi's terminal UI.
- `question` tool: single-choice question UI with an optional custom answer.
- `questionnaire` tool: multi-question/tabbed questionnaire UI.
- `tps-tracker` extension: shows generation tokens/second while the model streams.
- `/yeet` command: stages, commits, and pushes current repository changes with a concise commit message.

## Install from GitHub

Once this repo is pushed, install it with:

```bash
pi install git:github.com/flashruler/pi-agent
```

Or install locally while developing:

```bash
pi install ~/dev/pi-agent-setup
```

Restart Pi or run `/reload` after installing.

## Optional settings

This package does not include auth, sessions, API keys, or machine-local state. If you want similar defaults, copy values from `docs/settings.example.json` into `~/.pi/agent/settings.json`.

## Security notes

Pi packages run with full system access. Review extensions before installing. This repo intentionally excludes:

- `~/.pi/agent/auth.json`
- `~/.pi/agent/sessions/`
- local binaries and caches
- project-specific files and secrets
