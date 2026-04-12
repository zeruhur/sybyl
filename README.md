# Sybyl

Sybyl is an Obsidian plugin for solo tabletop play with provider-backed AI assistance and Lonelog-aware note formatting.

## Development

```bash
npm ci
npm run check
npm run build
```

## BRAT Release Flow

BRAT installs plugin builds from GitHub releases, so this repository is set up to publish release assets from a tagged workflow. The release job uploads:

- `main.js`
- `manifest.json`
- `versions.json`

To publish a BRAT-installable build:

1. Update `manifest.json` and `package.json` to the release version.
2. Update `versions.json` with the plugin version and minimum Obsidian version.
3. Commit and push to GitHub.
4. Create and push a matching tag, for example `0.1.0` or `v0.1.0`.

The release workflow verifies that the tag version matches `manifest.json`, builds the plugin, and attaches the release assets automatically.
