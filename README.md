# Sybyl

Sybyl is an Obsidian plugin for solo tabletop play with provider-backed AI assistance and Lonelog-aware note formatting.

For usage, commands, frontmatter reference, and workflows see **[USER_GUIDE.md](USER_GUIDE.md)**.

## Supported Providers

- Gemini
- OpenAI
- Anthropic (Claude)
- Ollama (local)

## How It Works

Sybyl works inside the active note. Each request is stateless and built from:

- note frontmatter (`game`, `pc_name`, `game_context`, `scene_context`, etc.)
- the current scene context
- the command-specific prompt

Source files are distilled once into a compact `game_context` block via the **Digest Source into Game Context** command. That result is reused on every subsequent request without per-request file overhead.

## Development

```bash
npm ci
npm run check
npm run build
```

## BRAT Release Flow

BRAT installs plugin builds from GitHub releases. The release job uploads:

- `main.js`
- `manifest.json`
- `versions.json`

To publish a BRAT-installable build:

1. Update `manifest.json` and `package.json` to the release version.
2. Update `versions.json` with the plugin version and minimum Obsidian version.
3. Commit and push to GitHub.
4. Create and push a matching tag, for example `0.2.0`.

The release workflow verifies that the tag version matches `manifest.json`, builds the plugin, and attaches the release assets automatically.
