# Contributing to RethinkSoft

Thanks for wanting to contribute! Here's what you need to know.

## Quick Start

```bash
git clone https://github.com/hanzili/rethinksoft-in-chrome
cd rethinksoft-in-chrome/server && npm install && npm run build
```

To test locally:
1. Load the extension: `chrome://extensions/` â†’ Load unpacked â†’ select the repo root
2. Start the relay: `node server/dist/relay/server.js`
3. Run CLI: `node server/dist/cli.js start "your task"`

## What We Love Getting

### New Skills (no code required!)
Skills are just SKILL.md files â€” structured prompts that guide the AI agent through a workflow. Look at `server/skills/linkedin-prospector/SKILL.md` for the pattern.

To add a skill:
1. Create `server/skills/{your-skill}/SKILL.md`
2. Define: goal, phases, safety rules, example prompts
3. Test by running it with a real agent
4. Submit a PR

### Tests
We need more test coverage. Patterns exist in `src/background/tool-handlers/computer-tool.test.js`. High-value areas:
- CLI commands (`server/src/cli.ts`)
- Setup wizard (`server/src/cli/setup.ts`)
- Session file handling (`server/src/cli/session-files.ts`)

### CLI Improvements
The CLI at `server/src/cli.ts` is self-contained. Good contributions:
- New commands
- Better output formatting
- Error message improvements

### Tool Handlers
Each handler in `src/background/tool-handlers/` is isolated. You can add new ones or improve existing ones without touching the agent loop.

### Landing Page
Pure HTML in `landing/`. No build step. PRs for copy, design, SEO, or new skill pages welcome.

### Platform Support
We're primarily tested on macOS. Windows and Linux contributions (setup wizard paths, browser detection, credential storage) are very welcome.

## What Needs Discussion First

Open an issue before working on:
- Changes to the service worker (`src/background/service-worker.js`)
- Changes to the MCP server entry point (`server/src/index.ts`)
- Changes to credential handling or OAuth flows
- New LLM provider integrations
- Anything touching `api.js` or `mcp-bridge.js`

These modules are tightly coupled and security-sensitive.

## PR Checklist

- [ ] Limited to one area (skill, test, CLI, tool handler, docs, or landing page)
- [ ] Tested locally
- [ ] No changes to security-sensitive modules without prior discussion
- [ ] Follows existing code style

## Questions?

Open a GitHub Discussion or reach out at hanzili0217@gmail.com.
