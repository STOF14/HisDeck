# HisDeck

Pixel-art terminal study assistant with per-person setup and a Gemini-powered copilot.

[![CI](https://github.com/STOF14/HisDeck/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/STOF14/HisDeck/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](package.json)

## Features
- First-run setup wizard for each user
- Per-user plan and config stored locally
- Gemini copilot with offline fallback
- Usage meter for daily requests and tokens
- Pixel-art inspired TUI layout

## Quick start
```bash
npm install
npm start
```

## Global usage (run from anywhere)
Install globally:
```bash
npm install -g hisdeck
```
Then run:
```bash
HisDeck
```

Lowercase also works:
```bash
hisdeck
```

For local development, link the command:
```bash
npm install
npm link
HisDeck
```

## Requirements
- Node.js >= 18 (see .nvmrc)

The first run opens a setup wizard that creates:
- `~/.study-tui/config.json`
- `~/.study-tui/plan.json`

## Setup wizard
The wizard asks for:
- Name
- Institution (optional)
- Term label (optional)
- Gemini API key (optional)
- Plan source (sample plan or import JSON)

If you skip the API key, the assistant runs in offline mode using local logic.

## Plan format
Plans are plain JSON. Example:
```json
{
  "profile": {
    "name": "Sample Student",
    "institution": "Sample University",
    "term": "2026 Semester 1"
  },
  "rules": [
    "3 blocks per day, about 2 hours each",
    "50 min on / 10 min break"
  ],
  "exams": [
    {
      "module": "MATH 101",
      "date": "2026-06-01",
      "time": "09:00",
      "venue": "Main Hall",
      "credits": 12
    }
  ],
  "schedule": {
    "2026-05-28": ["MATH 101", "PHYS 101", "CS 101"]
  }
}
```

A full sample is in `examples/plan.sample.json`.

## Config format
`~/.study-tui/config.json` controls runtime options:
```json
{
  "version": 1,
  "planPath": "/home/user/.study-tui/plan.json",
  "geminiApiKey": "YOUR_KEY",
  "preferredModel": "gemini-2.5-flash",
  "requestLimitPerDay": 1500,
  "tokenLimitPerDay": 1000000
}
```

## Reset setup
Delete the config file to rerun the wizard:
```bash
rm ~/.study-tui/config.json
```

## Usage meter
The dashboard shows estimated tokens and request usage for the current day.
Token usage is an estimate based on prompt and reply length.

## Scripts
- `npm start` - run the TUI
- `npm run typecheck` - TypeScript type check
- `npm run build` - build the CLI bundle

## Publishing (maintainers)
```bash
npm login
npm publish --access public
```

## Project structure
```
src/
  app.tsx
  data/
    studyPlan.ts
  lib/
    gemini.ts
    localAgent.ts
    pixel.tsx
    storage.ts
    systemPrompt.ts
    usage.ts
  screens/
    Agent.tsx
    Dashboard.tsx
    Setup.tsx
examples/
```

## Contributing
See `CONTRIBUTING.md`.

## Changelog
See `CHANGELOG.md`.

## License
MIT. See `LICENSE`.
