# Sybyl User Guide

Sybyl is an Obsidian plugin for solo tabletop play. It helps start scenes, interpret oracle results, suggest consequences, and format output in either a generic inline style or Lonelog notation.

For full details see [USER_GUIDE.md](USER_GUIDE.md). The sections below cover installation, setup, and reference.

---

## What Sybyl Does

Sybyl works inside the active markdown note. Each request is stateless. There is no persistent chat thread.

It can:

- generate scene openings
- interpret declared actions and dice outcomes
- interpret oracle answers
- suggest complications
- expand a scene into prose
- distill source documents into a compact `game_context` block stored in frontmatter
- parse Lonelog notes into compact AI context

Each request is built from:

- the note frontmatter (`game`, `pc_name`, `game_context`, `scene_context`, etc.)
- the current scene context (from `scene_context` or Lonelog parsing)
- the command-specific prompt

Source files are **not** injected into every request. They are used once via the **Digest Source into Game Context** command, which distils them into `game_context` and stores the result in frontmatter.

---

## Installation

### Manual

1. Build the plugin:

```bash
npm ci
npm run build
```

2. Copy these files into your vault plugin folder:

- `main.js`
- `manifest.json`
- `versions.json`

Target folder example:

```text
.obsidian/plugins/sybyl/
```

3. Enable the plugin in Obsidian.

### BRAT

If the GitHub repo has a release with `main.js`, `manifest.json`, and `versions.json`, BRAT can install it directly from the repository URL.

---

## First-Time Setup

Open **Settings → Sybyl**.

### 1. Pick an Active Provider

Choose one of:

- Gemini
- OpenAI
- Anthropic (Claude)
- Ollama

This is the default provider unless a note overrides it in frontmatter.

### 2. Configure the Provider

| Provider  | Required           |
|-----------|--------------------|
| Gemini    | API key            |
| OpenAI    | API key            |
| Anthropic | API key            |
| Ollama    | Base URL           |

### 3. Set Global Behavior

- **Default temperature** — affects all generation unless overridden per note
- **Insertion mode** — at cursor or end of note
- **Show token count** — appends a HTML comment with token usage after each response
- **Lonelog mode** — global toggle; can also be set per note in frontmatter

---

## YAML Frontmatter

Frontmatter is not strictly required, but it is the primary control surface for note-specific behavior and should be treated as the normal way to use the plugin.

Without frontmatter, Sybyl still works using the globally active provider, its default model, and a generic prompt.

### Quick Setup

Run **Sybyl: Insert Note Frontmatter** on any note. It asks for a game name and optional PC details, then writes a complete frontmatter block with sensible defaults.

Sybyl frontmatter aligns with the [Lonelog](https://zeruhur.itch.io/lonelog) campaign header standard where possible, so a note that is already a Lonelog campaign log needs only the Sybyl-specific fields added — not a parallel set of renamed duplicates.

### Recommended Minimal Frontmatter

```yaml
---
ruleset: "Ironsworn"
pcs: "Kira Voss"
oracle_mode: "yes-no"
---
```

### Recommended Expanded Frontmatter

```yaml
---
ruleset: "Ironsworn"
pcs: "Kira Voss, dangerous rank, vow: recover the relic"
tone: "Gritty, hopeful"
oracle_mode: "yes-no"
language: "en"
provider: "gemini"
model: "gemini-2.5-flash"
temperature: 0.7
game_context: ""
scene_context: ""
---
```

### Full Frontmatter Reference

```yaml
---
# ── Lonelog standard fields ──────────────────────────────────────
# Game system or ruleset. Used in the base system prompt.
ruleset: "Ironsworn"

# Player character(s). Name, rank, vows, traits — anything relevant.
pcs: "Kira Voss, dangerous rank, vow: recover the relic"

# Creative tone. Injected into the system prompt.
tone: "Gritty, hopeful"

# ── Sybyl-specific fields ─────────────────────────────────────────
# Optional oracle mode hint used by Ask Oracle.
# Supported values: "yes-no", "fate", "custom"
oracle_mode: "yes-no"

# Optional language instruction.
# If omitted, Sybyl responds in the same language as the input.
language: "en"

# Optional per-note provider override.
# Supported values: "gemini", "openai", "anthropic", "ollama"
provider: "gemini"

# Optional per-note model override.
model: "gemini-2.5-flash"

# Optional per-note temperature override.
temperature: 0.7

# Optional full replacement for the built-in system prompt.
# If set, this bypasses all default Sybyl prompt logic.
system_prompt_override: ""

# Static game rules and world facts, distilled from source material.
# Populated by the "Digest Source into Game Context" command.
# Injected into the system prompt on every request.
game_context: ""

# Dynamic scene state — the current situation in play.
# If non-empty, takes precedence over Lonelog auto-parsing.
# Updated by "Update Scene Context" or edited manually.
scene_context: ""

# Optional note-specific source list.
# Managed through plugin commands, not by hand.
# Used as input for "Digest Source into Game Context".
sources:
  - label: "Oracle Tables"
    provider: "gemini"
    mime_type: "text/plain"
    vault_path: "rpg/ironsworn/oracles.txt"

# Optional Lonelog override for this note.
lonelog: false

# Lonelog counters. Managed automatically by commands.
scene_counter: 1
session_number: 1
---
```

### Frontmatter Fields Explained

#### `ruleset` *(Lonelog standard)*

The game system or ruleset being played. Injected into the base system prompt.

If omitted, Sybyl falls back to a generic phrase like `the game`.

#### `pcs` *(Lonelog standard)*

Player character description. Name, rank, vows, key traits, injuries — anything that should ground the AI's responses. Keep it concise; it is included in every request.

#### `tone` *(Lonelog standard)*

Creative and genre tone. Injected into the system prompt. Examples: `"Gritty, hopeful"`, `"Eerie but playful"`, `"Low fantasy, grounded"`.

#### `oracle_mode`

Used by Ask Oracle when the oracle result field is left blank.

Supported values: `yes-no`, `fate`, `custom`.

#### `language`

Language instruction for model responses. If omitted, the model responds in the same language as the input.

#### `provider`

Overrides the plugin-wide active provider for this note.

Supported values: `gemini`, `openai`, `anthropic`, `ollama`.

#### `model`

Overrides the provider default model for this note. Must be a valid model ID for the selected provider.

#### `temperature`

Overrides the global temperature for this note. Typical range: 0.2 (tight) to 0.9 (loose).

#### `system_prompt_override`

Completely replaces the built-in Sybyl system prompt. Use only when you want deliberate custom behavior for a specific note.

#### `game_context`

Static knowledge about the game world and rules. Populated once by **Digest Source into Game Context** and injected into the system prompt on every request.

This replaces the old per-request source injection. Instead of sending a source file with every command, you distil it once and reuse the compact result.

#### `scene_context`

The current scene state. If non-empty, this takes precedence over Lonelog auto-parsing.

Updated by **Update Scene Context**, or edited manually.

#### `sources`

The list of source files attached to the current note. Managed by **Add Source File** and **Manage Sources**. Used as input to **Digest Source into Game Context**.

Sources are no longer injected directly into every request. Run the digest command to convert a source into `game_context`.

#### `lonelog`

Enables or disables Lonelog mode for this note, overriding the global setting.

#### `scene_counter` / `session_number`

Managed automatically by Lonelog commands.

### Should You Edit Frontmatter By Hand?

| Field | Hand-edit? |
|---|---|
| `ruleset`, `pcs`, `tone` | Yes |
| `oracle_mode`, `language` | Yes |
| `provider`, `model`, `temperature` | Yes |
| `lonelog` | Yes |
| `scene_context` | Yes, or via command |
| `game_context` | Only to clear or correct it |
| `sources` | Prefer commands |
| `scene_counter`, `session_number` | Prefer commands |
| `system_prompt_override` | Only if you know what you're doing |

---

## Commands

All commands appear in the Obsidian command palette as **Sybyl: \<name\>**.

### Insert Note Frontmatter

Asks for a game name and optional PC details, then writes a complete frontmatter block to the active note.

Safe to run on notes that already have partial frontmatter — existing values are not overwritten.

### Digest Source into Game Context

Picks a vault file, reads it, and sends it to the AI with a digest prompt tailored to the current game. The condensed result is stored in `game_context` in the note frontmatter.

Run this once at session setup. The `game_context` is then included in every subsequent request automatically, with no per-request file overhead.

Supported file types depend on the active provider:

- Text and Markdown: all providers
- PDF: Gemini and Anthropic only

### Start Scene

Generates a short scene opening.

- Normal mode: inserts a blockquote-style scene line
- Lonelog mode: asks for a scene description and inserts a scene header plus prose

### Declare Action

Prompts for an action and a roll result. Returns consequences and world reaction only. The PC's action is never described by the model.

### Ask Oracle

Prompts for a question and an optional oracle result.

- With a result: interprets it in context
- Without a result: generates an answer and interpretation based on `oracle_mode`

### Interpret Oracle Roll

Uses the current editor selection if available. If nothing is selected, asks for oracle text.

Inserts the interpretation below the selection.

### What Now

Generates 1–2 neutral possibilities for what the world does next, based on the current context.

### What Can I Do

For when you are stuck. Suggests 3 concrete actions the PC could take next, presented as neutral numbered options. Does not resolve any outcome or recommend one over another.

### Expand Scene

Generates a 100–150 word prose passage from the current context. Third person, past tense, no dialogue.

### Add Source File

Picks a vault file and attaches it to the current note's `sources` list. All providers use vault path references.

Attached sources are used as input for **Digest Source into Game Context**, not injected into generation directly.

### Manage Sources

Lists sources attached to the current note. Allows removing a source.

### Update Scene Context *(Lonelog only)*

Parses the current note body and writes a compact summary into `scene_context`. Does not call the AI.

### New Session Header *(Lonelog only)*

Inserts a formatted session header block and increments `session_number`.

---

## How Context Works

Sybyl assembles each request from three layers:

| Layer | Source | When active |
|---|---|---|
| System prompt | `game`, `pc_name`, `pc_notes`, `game_context` | Always |
| Scene context | `scene_context` or Lonelog parsing | If either is available |
| Command prompt | The specific command | Always |

**`game_context`** is injected into the system prompt. It is static — set it once with the digest command and it applies to every request without extra token cost.

**`scene_context`** is prepended to the user message. If non-empty, it takes precedence over Lonelog parsing. If empty and Lonelog mode is active, the current note body is parsed automatically.

If neither is available, Sybyl generates from the command prompt alone.

---

## Provider Notes

### Gemini

- Uses `requestUrl` (Obsidian's network API) — works correctly inside the desktop app
- Supports inline PDF via `inlineData` when used with the digest command
- No persistent file upload — sources are read from vault at digest time

### OpenAI

- Text files and Markdown only for sources
- Source content is read from vault at digest time

### Anthropic

- Supports inline PDF at digest time
- Source content encoded as base64 in the digest request only

### Ollama

- Local only, no API key required
- Text files and Markdown only

---

## Recommended Workflow

### Normal Note

1. Run **Insert Note Frontmatter** and fill in game and PC details
2. If you have source material, run **Add Source File** then **Digest Source into Game Context**
3. Use **Start Scene**, **Declare Action**, **Ask Oracle**, **What Now**, **What Can I Do** during play
4. Update `scene_context` manually or via **Update Scene Context** as needed

### Lonelog Note

1. Run **Insert Note Frontmatter** and enable `lonelog: true`
2. Optionally digest source material into `game_context`
3. Use **Start Scene** to start each scene
4. Log play in Lonelog notation
5. Use **Update Scene Context** to snapshot the current state
6. Use **New Session Header** at the start of each session

---

## Troubleshooting

### No response or provider error

- Check API key or base URL in settings
- Confirm the selected model exists for that provider
- Check that the per-note `provider` override is what you intended

### Digest command fails on a PDF

- Gemini and Anthropic support PDF inline; OpenAI and Ollama do not
- For OpenAI and Ollama, convert the relevant sections to a `.txt` or `.md` file

### Lonelog commands say Lonelog is not enabled

Enable Lonelog globally in settings, or set `lonelog: true` in the note frontmatter.

### `game_context` is stale

Re-run **Digest Source into Game Context** on the same or an updated source file. The command overwrites the existing value.
