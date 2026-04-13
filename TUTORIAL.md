# Sybyl Tutorial: Your First Solo Session

This tutorial walks you through Sybyl from a cold start to your first complete scene. It uses **Ironsworn** as the example ruleset, but every step applies to any game.

You will learn:

- How to install and configure the plugin
- How to set up a note for play
- How to run a session using the ribbon and command palette
- How context works and why it matters
- What Lonelog mode is and when to enable it

---

## Part 1 — Installation

### Manual install

1. In your Sybyl repo folder, build the plugin:

   ```bash
   npm ci
   npm run build
   ```

2. Copy these three files into your vault's plugin folder:

   ```
   main.js
   manifest.json
   versions.json
   ```

   Target path inside your vault:

   ```
   .obsidian/plugins/sybyl/
   ```

3. In Obsidian: **Settings → Community Plugins → Installed plugins**, find Sybyl, toggle it on.

### Via BRAT

If the GitHub repository has a published release:

1. Install the BRAT plugin from the community plugin browser.
2. In BRAT settings, choose **Add Beta Plugin** and paste the Sybyl repository URL.
3. BRAT downloads and installs the latest release automatically.

---

## Part 2 — First-Time Configuration

Open **Settings → Sybyl**.

### Choose a provider

Pick the AI service you want to use. Each one requires different credentials:

| Provider | What you need |
|---|---|
| Gemini | [Google AI Studio API key](https://aistudio.google.com/app/api-keys) |
| OpenAI | [OpenAI API key](https://platform.openai.com/api-keys) |
| Anthropic | [Anthropic API key](https://platform.claude.com/settings/keys) |
| OpenRouter | [OpenRouter API key](https://openrouter.ai/workspaces/default/keys) (free tier available) |
| Ollama | Ollama running locally — no key needed |

Select your provider from the **Active Provider** dropdown, then paste your API key (or base URL for Ollama) in the field that appears.

> **Tip:** If you don't have an API key yet, OpenRouter has a free tier with several capable models. Create an account at openrouter.ai and use the API key it provides.

### Choose a default model

After entering an API key, tab out of the field. Sybyl will validate the key and fetch the list of available models. Use the **Default Model** dropdown to pick one.

Recommended starting points:

- Gemini: `gemini-2.5-flash`
- OpenAI: `gpt-4o-mini`
- Anthropic: `claude-haiku-4-5-20251001`
- OpenRouter (free): `meta-llama/llama-3.3-70b-instruct:free`

### Other settings

Leave everything else at its default for now. You can return here later to adjust insertion mode, temperature, and Lonelog options.

---

## Part 3 — Setting Up a Play Note

Every Sybyl session lives inside a single Obsidian note. The note is your play log, your character sheet, and your oracle roll history all in one.

### Create a new note

Create a blank markdown note. Name it something like `Ironsworn - Kira Voss campaign`.

### Run Insert Note Frontmatter

Open the command palette (`Ctrl+P` / `Cmd+P`) and run:

```
Sybyl: Insert Note Frontmatter
```

A dialog asks for:

- **Game name** — type `Ironsworn`
- **PC details** — type something like `Kira Voss, dangerous rank, vow: find her missing brother`

Sybyl writes a frontmatter block at the top of the note:

```yaml
---
ruleset: "Ironsworn"
pcs: "Kira Voss, dangerous rank, vow: find her missing brother"
oracle_mode: "yes-no"
language: "en"
provider: "gemini"
model: "gemini-2.5-flash"
temperature: 0.7
game_context: ""
scene_context: ""
---
```

You can edit any of these values by hand at any time. The most commonly hand-edited fields are `pcs` (update it as your character changes), `scene_context` (a running summary of the current situation), and `tone` (add it if you want a specific atmosphere).

### Optional: digest a rulebook

If you have the Ironsworn PDF or a rules summary as a text file, you can feed it to Sybyl once so it understands the game's mechanics, oracle tables, and vocabulary.

1. Run **Sybyl: Add Source File** and attach your rulebook file.
2. Run **Sybyl: Digest Source into Game Context**.

Sybyl reads the file, condenses the relevant rules into a compact summary, and stores it in `game_context` in your frontmatter. From that point on, every request automatically includes that context — no need to re-attach the file each time.

> **Skip this for now if you don't have a source file.** Sybyl works fine without it, especially if your `ruleset` and `pcs` fields are descriptive.

---

## Part 4 — Your First Scene

You're ready to play. Open the note and use the ribbon icon (a dice symbol, left sidebar) to access the quick-command menu. Alternatively, every command is available in the command palette.

### Start the scene

Click the ribbon icon and choose **Start Scene** (or run `Sybyl: Start Scene` from the palette).

Sybyl generates a short scene opening based on your ruleset and PC details and inserts it at the cursor. Example output:

> [Scene] The road into Saltmarsh is quiet — too quiet. A cart overturned at the crossroads, its cargo of grain scattered and trampled. No bodies, no sounds, only the wind.

This sets the stage. You are now playing.

### Declare an action and roll

Your character tries to do something. You roll the dice (physically or using an app), then tell Sybyl what happened.

Run **Declare Action** from the ribbon or palette. A dialog asks for:

- **Action** — what your character attempted: `Track the cart's attackers into the forest`
- **Roll result** — what the dice said: `Weak Hit (7)`

Sybyl returns the consequence — what the world does in response — without describing your character's action (that is your job as the player):

> [Action] A trail of broken branches and smeared mud leads into the pines. You find it — but you also find something else: a second set of tracks, human, following the same path. Someone is ahead of you.

Write down anything you want to keep. Then continue.

### Ask an oracle

When you face uncertainty — *is the forest path safe? is the NPC trustworthy?* — consult the oracle.

Run **Ask Oracle** from the ribbon. A dialog asks for:

- **Question** — `Is someone waiting for me on the path?`
- **Oracle result** — what you rolled, e.g. `Yes, but...` (or leave blank to let Sybyl generate one)

Sybyl interprets the result in the context of the current scene:

> [Oracle] Yes — but they are not hostile. An old trapper, Bram, has been watching the forest for days. He's frightened and has information, but he won't speak freely until he trusts you.

### What to do when you're stuck

If you can't think of what to do next, use **What Now** (world possibilities) or **What Can I Do** (PC options).

- **What Now** — Sybyl suggests 1–2 neutral things the world might do next. Use it to move scenes forward when momentum stalls.
- **What Can I Do** — Sybyl suggests 3 concrete actions your PC could take. Use it when you genuinely have no idea which way to go.

Neither command makes a choice for you. They give you raw material.

### Expand a scene into prose

At any point — during or after a scene — run **Expand Scene**. Sybyl writes a 100–150 word prose passage from the current context. Third person, past tense, no dialogue. Good for recording a moment you want to remember.

---

## Part 5 — Managing Context

Sybyl builds every request from three layers, in order:

| Layer | Where it comes from | Purpose |
|---|---|---|
| System prompt | `ruleset`, `pcs`, `tone`, `game_context` | Tells the AI what game you're playing and who the PC is |
| Scene context | `scene_context` frontmatter field | Tells the AI what's happening right now |
| Command | The specific command you ran | The actual request |

### Keeping scene context current

`scene_context` is the most important field during active play. It is the AI's only knowledge of what has happened in the current scene. Without it, every command starts cold.

Update it regularly. You can:

- Edit it by hand directly in the frontmatter (fastest)
- Run **Sybyl: Update Scene Context** — this parses your note and writes a compact summary automatically (Lonelog mode only)

A good `scene_context` entry looks like:

```yaml
scene_context: "Kira is following tracks through Saltmarsh forest. She has encountered the trapper Bram, who is frightened and holding information about the cart attack."
```

One or two sentences is enough. Keep it current as scenes develop.

---

## Part 6 — Lonelog Mode (Optional)

Lonelog is a structured notation system for solo play logs. Instead of freeform prose, you record play using compact symbols:

```
@ Scout the crossroads
d: Scout d6 = 4 -> Weak Hit
=> Tracks found, but someone is following you too
? Is someone waiting on the path?
-> Yes, but...
=> Bram the trapper — frightened, has information
```

Enable it globally in **Settings → Sybyl → Lonelog Mode**, or per-note by adding `lonelog: true` to frontmatter.

With Lonelog active:

- **Start Scene** asks for a scene description and inserts a formatted scene header
- **Declare Action** inserts notation (`@`, `d:`, `=>`) in a code block
- **Ask Oracle** inserts notation (`?`, `->`, `=>`) in a code block
- **Expand Scene** inserts a `\---` / `---\` narrative block
- **Adventure Seed** inserts a `gen: Adventure Seed` result block
- **Generate Character** outputs a `[PC:Name|stat|gear|trait]` Lonelog tag

If you are new to Lonelog, start without it. Switch it on once you want more structure in your logs.

---

## Part 7 — Pre-Session Setup Commands

These commands are used once at the start of a campaign or session, not during active play.

### Adventure Seed

No idea how to start? Run **Sybyl: Adventure Seed**.

Optionally type a theme (e.g. `political intrigue`, `revenge journey`). Sybyl generates a structured pitch — Premise, Conflict, Hook, Tone — using your ruleset and any `game_context` you have loaded.

Use the output as a campaign starting point, then begin play.

### Generate Character

Run **Sybyl: Generate Character** to create a character by strictly following the rules in your attached source file.

- Requires at least one source attached to the note (added via **Add Source File**)
- Optionally accepts a concept: `wandering healer`, `disgraced noble`, etc.
- Uses the full source text to get stat ranges, starting equipment, and creation procedures right — not the condensed `game_context`

### Ask the Rules

Use **Sybyl: Ask the Rules** when you need a precise rules answer. Type your question and Sybyl reads the full source file to answer it.

---

## Quick Reference: What to Use When

| Situation | Command |
|---|---|
| Starting a new campaign with no idea | Adventure Seed |
| Creating a character following the rules | Generate Character |
| Opening a scene | Start Scene |
| You rolled dice and need consequences | Declare Action |
| Uncertainty about the world | Ask Oracle |
| Oracle result on the page you want explained | Interpret Oracle Roll |
| Scene feels stuck, world needs to act | What Now |
| You have no idea what your PC should do | What Can I Do |
| You want a prose record of the scene | Expand Scene |
| Rules question during play | Ask the Rules |

---

## Common Issues

**No response / provider error**

Check that your API key is saved in settings. Confirm the model name in your note's frontmatter (or the default in settings) is valid for the provider you selected.

**Output is short or cut off (Gemini)**

Gemini 2.5 Flash uses "thinking tokens" by default. Sybyl disables this automatically. If you are using a different Gemini model and seeing truncated output, try switching to `gemini-2.5-flash`.

**Lonelog commands say Lonelog is not enabled**

Either enable it globally in settings, or add `lonelog: true` to the note frontmatter.

**The AI doesn't know what's happening in the scene**

Update `scene_context` in frontmatter. Without it, Sybyl has no memory of earlier events in the session.

**Digest command fails on a PDF**

PDF inline encoding is supported by Gemini and Anthropic only. For OpenAI, OpenRouter, and Ollama, export the relevant pages as a `.txt` file instead.

---

For a full reference of every frontmatter field, command, and provider option, see [USER_GUIDE.md](USER_GUIDE.md).
