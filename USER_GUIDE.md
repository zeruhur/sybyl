# Sybyl User Guide

Sybyl is an Obsidian plugin for solo tabletop play. It can help start scenes, interpret oracle results, suggest consequences, and format output in either a generic inline style or Lonelog notation.

## What Sybyl Does

Sybyl works inside the active markdown note.

It can:

- generate scene openings
- interpret declared actions and dice outcomes
- interpret oracle answers
- suggest complications
- expand a scene into prose
- attach source documents to a note
- parse Lonelog notes into compact AI context

It does not maintain a chat thread. Each request is stateless and uses:

- the note frontmatter
- optional attached sources
- optional `scene_context`
- optional Lonelog parsing of the current note body

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

If the GitHub repo has a release with these assets:

- `main.js`
- `manifest.json`
- `versions.json`

then BRAT can install it from the repository.

## First-Time Setup

Open `Settings -> Sybyl`.

### 1. Pick an Active Provider

Choose one of:

- Gemini
- OpenAI
- Anthropic
- Ollama

This is the default provider unless a note overrides it in frontmatter.

### 2. Configure the Provider

Set the relevant credentials:

- Gemini: API key
- OpenAI: API key and optional base URL
- Anthropic: API key
- Ollama: base URL only

### 3. Set Global Behavior

You can configure:

- default temperature
- insertion mode
- token comment logging
- Lonelog mode

## YAML Frontmatter

Frontmatter is not strictly required for the plugin to run, because Sybyl can fall back to plugin settings and a generic prompt. But in practice, frontmatter is the main control surface for note-specific behavior, so you should treat it as the normal way to use the plugin.

Without frontmatter, Sybyl can still:

- use the globally active provider
- use the provider default model from plugin settings
- generate based only on the immediate command prompt

With frontmatter, Sybyl can:

- know which game is being played
- know the PC name and notes
- override provider and model per note
- store sources attached to that note
- keep or override scene context
- enable Lonelog mode per note
- manage scene and session counters for Lonelog notes

### Recommended Minimal Frontmatter

This is the smallest useful setup for normal play:

```yaml
---
game: "Ironsworn"
pc_name: "Kira Voss"
oracle_mode: "yes-no"
language: "en"
---
```

### Recommended Expanded Frontmatter

This is a good starting point if you want note-level control:

```yaml
---
game: "Ironsworn"
pc_name: "Kira Voss"
pc_notes: "Dangerous rank. Vow: recover the relic."
oracle_mode: "yes-no"
language: "en"
provider: "gemini"
model: "gemini-3.1-pro-preview"
temperature: 0.7
system_prompt_override: ""
scene_context: ""
sources: []
---
```

### Full Frontmatter Reference

All currently supported frontmatter keys are shown below.

```yaml
---
# Strongly recommended. Used in the base system prompt.
game: "Ironsworn"

# Optional PC identity fields.
pc_name: "Kira Voss"
pc_notes: "Dangerous rank. Vow: recover the relic."

# Optional oracle mode hint used by Ask Oracle.
# Supported values: "yes-no", "fate", "custom"
oracle_mode: "yes-no"

# Optional language instruction.
# Example values: "en", "it"
language: "en"

# Optional per-note provider override.
# Supported values: "gemini", "openai", "anthropic", "ollama"
provider: "gemini"

# Optional per-note model override.
# This should be a valid model ID for the selected provider.
model: "gemini-3.1-pro-preview"

# Optional per-note temperature override.
temperature: 0.7

# Optional full replacement for the built-in system prompt.
# If set, this overrides the default Sybyl prompt logic.
system_prompt_override: ""

# Optional explicit context block.
# If non-empty, this takes precedence over Lonelog auto-parsing.
scene_context: ""

# Optional note-specific source list.
# Managed mainly through plugin commands, not by hand.
sources:
  - label: "Ironsworn Rulebook"
    provider: "gemini"
    mime_type: "application/pdf"
    file_uri: "files/abc123"
    expiresAt: "2026-04-14T10:00:00Z"

  - label: "Oracle Tables"
    provider: "openai"
    mime_type: "text/plain"
    vault_path: "rpg/oracles/ironsworn-oracles.txt"

# Optional Lonelog override for this note.
lonelog: false

# Optional Lonelog counters.
# Mainly managed by commands, not by hand.
scene_counter: 1
session_number: 1
---
```

### Frontmatter Fields Explained

#### `game`

This is the most important field for normal play. It tells Sybyl what game it is assisting with and is injected into the base prompt.

If omitted, Sybyl falls back to a generic phrase like `the game`, which works but is less useful.

#### `pc_name`

Adds the player character name to the system prompt.

This helps the model avoid ambiguous references and makes scene interpretation more grounded.

#### `pc_notes`

Adds a short description of the PC to the prompt.

Use this for:

- rank or playbook
- vows
- key traits
- current injuries or conditions
- important relationships

Keep it short. This is part of the repeated prompt context.

#### `oracle_mode`

Used by the `Ask Oracle` command when you leave the oracle result blank.

Supported values:

- `yes-no`
- `fate`
- `custom`

This is a hint to the model about how to frame the answer.

#### `language`

Tells Sybyl which language to answer in.

If omitted, the plugin prompt instructs the model to respond in the same language as the user input.

#### `provider`

Overrides the plugin-wide active provider for this specific note.

Supported values:

- `gemini`
- `openai`
- `anthropic`
- `ollama`

Use this when different campaign notes should use different providers.

#### `model`

Overrides the provider default model for this note.

Examples:

- `gemini-3.1-pro-preview`
- `gpt-5.2`
- `claude-sonnet-4-6`
- `gemma3`

The plugin does not validate this in frontmatter before the request is sent, so the model string must match a real model available for that provider.

#### `temperature`

Overrides the global temperature for this note.

Typical values:

- `0.2` for tighter, more deterministic phrasing
- `0.7` for balanced output
- `0.9` for looser variation

Use conservative values for oracle interpretation and consequence generation.

#### `system_prompt_override`

Completely replaces the built-in Sybyl system prompt.

This is powerful and risky. If you set it, you are bypassing the plugin’s normal guardrails and behavior instructions.

Use this only if you want deliberate custom behavior for a specific note.

#### `scene_context`

Stores a compact running summary of the current situation.

This is useful when:

- you are not using Lonelog mode
- you want stable manual context
- you want to freeze context instead of relying on note-body parsing

If this field is non-empty, it takes precedence over Lonelog parsing.

#### `sources`

This is the list of source files attached to the current note.

You usually should not edit this by hand. The plugin commands manage it for you.

Each entry is provider-specific:

- Gemini typically stores `file_uri`
- OpenAI typically stores `vault_path`
- Anthropic typically stores `vault_path`
- Ollama typically stores `vault_path`

Common fields:

- `label`
- `provider`
- `mime_type`

Possible provider-specific fields:

- `file_uri`
- `file_id`
- `vault_path`
- `expiresAt`

#### `lonelog`

Enables or disables Lonelog mode for this specific note.

This overrides the global plugin setting.

If omitted, the plugin uses the global Lonelog toggle from settings.

#### `scene_counter`

Used by Lonelog scene commands.

The plugin increments this automatically when you use `Sybyl: New Scene` or Lonelog-aware scene start flows, if auto-increment is enabled.

#### `session_number`

Used by the Lonelog session header command.

The plugin increments this automatically when you create a new session header.

### Normal Note Example

```yaml
---
game: "Ironsworn"
pc_name: "Kira Voss"
pc_notes: "Dangerous rank. Vow: recover the relic."
oracle_mode: "yes-no"
language: "en"
provider: "anthropic"
model: "claude-sonnet-4-6"
temperature: 0.6
scene_context: |
  Kira crossed the old pass at dusk.
  Two armed strangers were seen near the bridge.
  One carried a red pennant tied to a spear.
sources:
  - label: "Oracle Tables"
    provider: "anthropic"
    mime_type: "text/plain"
    vault_path: "rpg/ironsworn/oracles.txt"
---
```

### Lonelog Note Example

```yaml
---
game: "Ironsworn"
pc_name: "Kira Voss"
oracle_mode: "yes-no"
language: "en"
provider: "gemini"
model: "gemini-3.1-pro-preview"
temperature: 0.7
lonelog: true
scene_counter: 3
session_number: 2
scene_context: ""
sources:
  - label: "Ironsworn Rulebook"
    provider: "gemini"
    mime_type: "application/pdf"
    file_uri: "files/abc123"
    expiresAt: "2026-04-14T10:00:00Z"
---
```

### Should You Edit Frontmatter By Hand?

Yes for:

- `game`
- `pc_name`
- `pc_notes`
- `oracle_mode`
- `language`
- `provider`
- `model`
- `temperature`
- `lonelog`

Usually no for:

- `sources`
- `scene_counter`
- `session_number`

Only if you know what you are doing for:

- `system_prompt_override`
- large manual `scene_context`

## Commands

### Sybyl: Start Scene

Creates a short scene opening.

- Normal mode: inserts a blockquote-style scene line
- Lonelog mode: asks for a scene description and inserts a scene header plus prose

### Sybyl: Declare Action

Prompts for:

- action
- roll result

Sybyl returns consequences and world reaction only.

### Sybyl: Ask Oracle

Prompts for:

- question
- optional oracle result

If you provide a result, Sybyl interprets it.

If you leave it blank, Sybyl generates an answer and interpretation.

### Sybyl: Interpret Oracle Result

Uses the current selection if available.

If nothing is selected, it asks for oracle text.

### Sybyl: Suggest Consequence

Generates 1 or 2 neutral complications or consequences.

### Sybyl: Expand Scene into Prose

Generates a longer prose passage from the current context.

### Sybyl: Upload Source File

Attaches a source to the current note.

Behavior depends on provider:

- Gemini: uploads the file to Gemini and stores the returned `file_uri` in note frontmatter
- OpenAI: stores a `vault_path` reference to a vault file
- Anthropic: stores a `vault_path` reference to a vault file
- Ollama: stores a `vault_path` reference to a vault file

### Sybyl: Manage Sources

Manages the `sources` attached to the current note.

You can:

- remove a source from the note
- delete an uploaded Gemini source from the provider
- add a new source

This is the command you use for note-level source management.

## Important Source Management Distinction

This is the part that is easiest to misunderstand.

### `Manage Uploaded Files` in Settings

This exists only under the Gemini provider settings.

It shows the Gemini files already uploaded under your API key. It is provider-level inventory, not note-level attachment.

You use it to:

- view Gemini uploads
- copy a Gemini file URI
- delete a Gemini upload from the provider

You do not use it to attach a source to the current note.

### `Sybyl: Upload Source File`

This is how you attach a source to the active note.

### `Sybyl: Manage Sources`

This is how you manage sources already attached to the active note.

## Lonelog Mode

Enable Lonelog mode in settings, or set it per note in frontmatter:

```yaml
---
lonelog: true
scene_counter: 1
session_number: 1
scene_context: ""
---
```

When Lonelog mode is active:

- command outputs use Lonelog formatting
- the note body can be parsed automatically for context
- Lonelog-specific commands are enabled

### Lonelog Commands

#### Sybyl: New Scene

- uses `scene_counter`
- inserts a Lonelog scene header and prose
- increments the scene counter if auto-increment is enabled

#### Sybyl: Update Scene Context from Log

- parses the current note
- writes the parsed summary into `scene_context`
- does not call the AI

#### Sybyl: New Session Header

- inserts a session header block
- increments `session_number`

## How Context Works

Sybyl resolves context in this order:

1. explicit `scene_context` in frontmatter, if non-empty
2. Lonelog parsing of the current note body, if Lonelog mode is active
3. only the direct command prompt, if neither of the above is available

This means you do not have to maintain `scene_context` manually when using Lonelog unless you want to.

## Provider Notes

### Gemini

- supports direct file upload
- uploaded files expire on the provider side
- best option if you want provider-managed file references

### OpenAI

- uses `vault_path` sources
- reads source text from vault files at request time
- best to use `.txt` sources for predictable results

### Anthropic

- uses `vault_path` sources
- PDFs are encoded inline per request
- smaller excerpts are better

### Ollama

- local only
- uses `vault_path` sources
- plain text files are the safest source format

## Recommended Workflow

For a normal note:

1. create a note with minimal frontmatter
2. set provider and model if needed
3. optionally attach sources with `Sybyl: Upload Source File`
4. use `Start Scene`, `Declare Action`, `Ask Oracle`, and `Suggest Consequence`

For a Lonelog note:

1. enable `lonelog: true`
2. use `Sybyl: New Scene`
3. log play in Lonelog notation
4. use `Sybyl: Update Scene Context from Log` if you want a frozen context snapshot
5. continue using Sybyl commands inside the same note

## Troubleshooting

### No response or provider error

Check:

- API key or base URL
- provider is reachable
- per-note `provider` override is not pointing at a different provider than expected
- selected model exists for that provider

### Source file does not help the model

Check:

- the source is attached to the current note
- the source provider matches the note provider
- the source format is suitable for that provider

### Lonelog commands say Lonelog is not enabled

Either:

- enable Lonelog globally in settings

or:

- set `lonelog: true` in the current note frontmatter

## Files Most Users May Want to Inspect

- [README.md](C:/Users/utente/Documents/GitHub/sybyl/README.md)
- [manifest.json](C:/Users/utente/Documents/GitHub/sybyl/manifest.json)
- [settings.ts](C:/Users/utente/Documents/GitHub/sybyl/src/settings.ts)
- [commands.ts](C:/Users/utente/Documents/GitHub/sybyl/src/commands.ts)
