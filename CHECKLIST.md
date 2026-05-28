# Repo improvement checklist

## Branding and docs
- [x] Rename remaining "Study TUI" references to "HisDeck"
- [x] Add FAQ section to README
- [x] Add screenshots section to README
- [x] Add first release entry in CHANGELOG
- [x] Add maintainer contact to SECURITY and CODE_OF_CONDUCT
- [x] Add license holder name

## Repo hygiene
- [x] Expand .gitignore (.tsbuildinfo, coverage, .env.local)
- [x] Add .gitattributes
- [x] Add CODEOWNERS
- [x] Add Dependabot config

## Build and publish
- [x] Replace prepare with prepack
- [x] Add postinstall notice if dist is missing
- [x] Add npm pack smoke test to CI
- [x] Add build step to CI

## CLI and distribution
- [x] Add CLI flags (--help, --version, --config, --reset, --no-ai)
- [x] Add `hisdeck init` to force setup
- [x] Add friendly error when dist is missing
- [x] Keep lowercase command as primary

## Config and storage
- [x] Rename data directory to .hisdeck
- [x] Add XDG and APPDATA support
- [x] Add config and plan migrations
- [x] Add atomic writes for config/plan/usage
- [x] Add config overrides via env

## Plan format
- [x] Align default plan with sample
- [x] Add plan JSON schema
- [x] Show plan validation errors in setup

## Agent and AI
- [x] Add streaming API helper
- [x] Persist chat history to disk
- [x] Add model selection in setup
- [x] Improve offline agent coverage
- [x] Add privacy note

## UI polish
- [x] Add no-color mode
- [x] Show online/offline status on dashboard
- [x] Add compact header for narrow terminals
- [x] Fix quick prompt indentation

## Quality and testing
- [x] Add date helper tests
- [x] Add storage migration tests
- [x] Add ESLint config and lint script
