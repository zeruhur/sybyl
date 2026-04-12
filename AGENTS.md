# Repository Guidelines

## Project Structure & Module Organization
This repository is currently spec-first. The active documents are [`sybyl-plugin-spec-lonelog.md`](/C:/Users/utente/Documents/GitHub/sybyl/sybyl-plugin-spec-lonelog.md) and [`lonelog.md`](/C:/Users/utente/Documents/GitHub/sybyl/lonelog.md). The implementation target is an Obsidian plugin with this layout:

- `src/main.ts`: plugin entry point
- `src/commands.ts`: command registration and flows
- `src/providers/`: provider adapters (`gemini.ts`, `openai.ts`, `anthropic.ts`, `ollama.ts`)
- `src/frontmatter.ts`, `src/promptBuilder.ts`, `src/editor.ts`, `src/settings.ts`, `src/types.ts`
- Root files: `manifest.json`, `package.json`, `tsconfig.json`, `esbuild.config.mjs`

Keep new code aligned with the spec unless you are intentionally revising the spec in the same change.

## Build, Test, and Development Commands
The scaffold is not committed yet, but the spec assumes a standard TypeScript + esbuild Obsidian workflow.

- `npm install`: install TypeScript, esbuild, and Obsidian typings
- `npx tsc --noEmit`: run strict type-checking
- `node esbuild.config.mjs`: build `src/main.ts` into `main.js`
- `node esbuild.config.mjs production`: create a minified production build

If you add `package.json` scripts, keep them conventional: `build`, `dev`, `check`, `test`.

## Coding Style & Naming Conventions
Use TypeScript in strict mode, ES module syntax, and raw `fetch` for provider calls. Prefer 2-space indentation, semicolons, double quotes, and small focused modules. Use `PascalCase` for classes/interfaces, `camelCase` for functions and variables, and lowercase file names matching the spec such as `promptBuilder.ts` and `frontmatter.ts`.

## Testing Guidelines
No test runner is committed yet. When implementation begins, add unit tests for pure logic first: `promptBuilder`, frontmatter helpers, Lonelog parser/formatter, and provider request mapping. Name tests after the module under test, for example `promptBuilder.test.ts`. At minimum, run `npx tsc --noEmit` before opening a PR.

## Commit & Pull Request Guidelines
Current history uses short imperative subjects (`Initial commit`). Follow that pattern: `Add Gemini provider`, `Fix Lonelog context precedence`. Keep commits focused. PRs should include a short summary, affected files or commands, linked issues if any, and screenshots or sample note output for UI or formatting changes.

## Security & Configuration Tips
Do not commit API keys, vault contents, or provider secrets. Keep credentials in local plugin settings only. When changing provider behavior or frontmatter schema, update the spec and any user-facing notices in the same PR.
