# Sybyl: An AI Referee for Solo Tabletop Play

*An Obsidian plugin for solo RPG sessions — stateless, neutral, and never in charge.*

---

## The Problem with AI at the Solo Table

If you have tried using an AI assistant for solo play, you have probably run into the same wall. You ask it to help you with an oracle result and it writes three paragraphs of plot. You ask for consequences of a failed roll and it decides what your character thinks about them. It calls you "you". It narrates your actions. It knows where the story is going before you do.

The AI wants to be the GM. And that is exactly the wrong thing.

Solo play works because *you* are in charge. The oracle, the dice, the rules — these are tools you use to interrogate the fiction. What you need from an AI is not a collaborator with its own ideas. You need something that answers questions, interprets results, and then gets out of the way.

That is the premise behind Sybyl.

---

## What Sybyl Is

Sybyl is an Obsidian plugin. It sits inside your campaign note — the same file where you keep your play log, your character stats, and your oracle rolls — and it responds to specific commands with short, neutral, third-person text.

It is not a chatbot. There is no persistent conversation. Every request is stateless, built from your note's frontmatter and the current scene context, sent to an AI provider, and returned as formatted text inserted directly into your note. Then it is done. It does not remember previous exchanges unless your note does.

The AI it uses is configured to be a referee tool, not a storyteller. It has explicit prohibitions baked into its system prompt:

- Never use second person. No "you stand", "you see", "you decide".
- Never describe the player character's actions, thoughts, or internal states.
- Never use dramatic or narrative tone.
- Never invent lore, rules, or facts not present in the source material or scene context.
- Never ask "What do you do?"

These are not suggestions. They are hard constraints. The result is an AI that behaves more like a well-trained oracle interpreter than a fiction engine — and that turns out to be exactly what solo play needs.

---

## Where It Lives

Sybyl is an Obsidian plugin. Your entire session lives in a single markdown note: the log, the character sheet, the oracle history, the game context. Sybyl reads that note's frontmatter to understand what game you are playing and who the PC is. It reads the note body (or a `scene_context` field) to understand what is currently happening. Then it answers commands.

It supports five AI providers out of the box: **Gemini**, **OpenAI**, **Anthropic** (Claude), **OpenRouter** (which offers a free tier with several capable models), and **Ollama** for fully local play. You pick one in settings, enter an API key or base URL, and from that point on the plugin handles everything.

---

## Setting Up a Note

Every Sybyl session is anchored to a note. You configure it through a YAML frontmatter block at the top. You can run `Sybyl: Insert Note Frontmatter` to scaffold it automatically, or write it by hand — it is just a few fields:

```yaml
---
ruleset: "Ironsworn"
genre: "Dark fantasy / survival"
pcs: "Kira Voss, dangerous rank, vow: find her missing brother"
tone: "Gritty, hopeful"
oracle_mode: "yes-no"
---
```

What each field does:

- **`ruleset`** — the game you are playing. Injected into the system prompt so the AI knows its frame of reference.
- **`genre`** — the genre or subgenre. Shapes the texture of responses.
- **`pcs`** — your character, as tightly or loosely as you want to describe them. This goes into every request.
- **`tone`** — the atmosphere you want. One or two adjectives is enough.
- **`oracle_mode`** — how the Ask Oracle command behaves when you do not supply a result. `yes-no`, `fate`, or `custom`.

There are more fields — per-note provider and model overrides, temperature, language, source management, Lonelog counters — but the above is all you need to start.

---

## A Session in Practice

Here is the core loop. Assume you are playing Ironsworn. You have a note, you have the frontmatter above, and you are sitting down to play.

### Start Scene

Run `Sybyl: Start Scene` (or click the ribbon icon and pick it from the quick menu). Sybyl generates a short scene opening — two or three lines of third-person prose — and inserts it at the cursor:

```
> [Scene] The road into Saltmarsh is quiet — too quiet. A cart overturned
> at the crossroads, its cargo of grain scattered and trampled. No bodies.
> No sounds. Only the wind carrying smoke from somewhere to the east.
```

That is the stage. You are playing now.

### Declare Action

Your character follows the smoke. You roll the dice. Weak hit — something happens, but with a cost or complication. Run `Sybyl: Declare Action`. A dialog asks what your character attempted and what the dice said:

- **Action:** *Track the source of the smoke*
- **Roll result:** *Weak Hit (7)*

Sybyl returns the consequence — world reaction only, no narration of what your character does:

```
> [Action] Track the source of the smoke | Roll: Weak Hit (7)
> [Result] The smoke leads to a farmstead, still standing but abandoned in
> haste — door left open, a pot still hanging over dead coals. Tracks in
> the mud suggest a large group moved north not long ago. The same tracks
> circle the building twice before leaving.
```

You decide what your character makes of this. Sybyl does not.

### Ask Oracle

Uncertainty. Is the farmstead truly empty, or is someone hiding inside? You consult your oracle. Run `Sybyl: Ask Oracle`, type your question, and enter what you rolled:

- **Question:** *Is anyone still inside the farmstead?*
- **Oracle result:** *Yes, but...*

```
> [Oracle] Q: Is anyone still inside the farmstead?
> [Answer] A child — eight or nine years old — is hiding in the root
> cellar beneath the kitchen floor. She will not come out. She saw
> something happen to the others but she is not ready to say what.
```

If you do not enter a result, Sybyl rolls internally according to your `oracle_mode` and gives you both the result and its interpretation.

### Interpret Oracle Roll

Sometimes you have already written the oracle result in your log and just want the interpretation. Select the text of the result and run `Sybyl: Interpret Oracle Roll`. The interpretation is inserted directly below the selection — the oracle text stays where it is, the consequences follow it.

### What Now / What Can I Do

Scene momentum stalls. The child will not speak. You are not sure what to do next.

**`What Now`** gives you what the world might do — neutral possibilities for how the situation develops, not what your character should do:

```
> [Options] The tracks north begin to go cold — another hour and following
> them will be near impossible.
> A horseman appears on the road, moving fast toward the farmstead.
```

**`What Can I Do`** gives you three concrete PC options, numbered, with no recommendation:

```
> [Actions]
> 1. Attempt to earn the child's trust and find out what she witnessed.
> 2. Follow the tracks north before they disappear.
> 3. Hide and wait to see who the approaching horseman is.
```

Neither command makes the choice. They break the log-jam and hand it back to you.

### Expand Scene

After a meaningful moment — the child finally speaks, the horseman turns out to be a militia scout, you make camp for the night — you can run `Sybyl: Expand Scene` to generate a prose record of the current context. 100–150 words, third person, past tense, no dialogue:

```
> [Prose] The farmstead sat in early-afternoon silence, the kind that
> followed something terrible rather than preceded something peaceful.
> Kira had moved carefully through each room, cataloguing the evidence
> of departure: the half-eaten meal, the sewing left mid-stitch, the
> dog still tied to the fence post in the yard, confused and hungry
> but unharmed. In the cellar, the girl had not moved from the corner
> where Kira had first found her. She had accepted water. She had
> accepted a strip of dried meat. She watched Kira's hands more than
> her face, the way people watch for whether someone is about to do
> something sudden.
```

You can keep this as is, edit it, or fold it into your log however you like.

---

## How Sybyl Remembers

Every request is built from three layers:

| Layer | Source | What it carries |
|---|---|---|
| System prompt | `ruleset`, `genre`, `pcs`, `tone` | What game, who the PC is, what atmosphere |
| Scene context | `scene_context` field or note body | What is happening right now |
| Command | The specific command | The actual request |

**`game_context`** is where you put condensed rules and world knowledge. Run `Sybyl: Digest Source into Game Context` once on a rulebook or reference file and Sybyl distils it into a compact block stored in your frontmatter. From then on it is included in every request — no per-call file overhead.

**`scene_context`** is the running state of the current scene. Keep it updated as you play — a sentence or two is enough — and Sybyl will have the context it needs for each command. In Lonelog mode, it parses the note body automatically.

---

## Pre-Session Tools

Two commands are designed for before the session starts, not during it.

**`Adventure Seed`** generates a structured campaign premise — Premise, Conflict, Hook, Tone — when you have no idea where to begin. Optionally give it a theme or concept; otherwise it works from your ruleset and game context alone.

**`Generate Character`** follows the exact character creation procedure in an attached source file and produces a complete character: name, stats, starting equipment, everything the rules specify. It requires a source file attached to the note. It is intentionally token-intensive because it uses the full source text, not the condensed digest — mechanical precision matters more here than brevity.

---

## Lonelog Mode

[Lonelog](https://zeruhur.itch.io/lonelog) is a structured notation system for solo play logs. Instead of freeform prose, you record play with compact symbols:

```
@ action taken
d: die type = result → outcome
=> consequence
? oracle question
-> oracle answer
=> interpretation
```

Enable Lonelog mode globally in settings or per-note with `lonelog: true` in frontmatter. When active, Sybyl's output shifts from blockquotes to notation blocks.

The same Declare Action exchange from earlier looks like this in Lonelog mode:

```
@ Track the source of the smoke
d: Wits d6+iron = 7 → Weak Hit
=> Farmstead found abandoned in haste — tracks circle the building and head north
```

And an oracle:

```
? Is anyone still inside the farmstead?
-> Yes, but...
=> A child in the root cellar — will not come out, will not speak yet
```

The output is designed to slot directly into a Lonelog-format campaign log. Scene headers, session breaks, and character tags are all handled by their respective commands.

---

## The Quick Menu

The ribbon shows a dice icon in Obsidian's left sidebar. Click it to open a modal with the seven most-used in-session commands as one-click buttons: Start Scene, Declare Action, Ask Oracle, Interpret Oracle Roll, What Now, What Can I Do, Expand Scene. No command palette needed mid-session.

---

## How to Get It

Sybyl is available via [BRAT](https://github.com/TfTHacker/obsidian42-brat), the Obsidian beta plugin installer. Install BRAT from the community plugin browser, then add the Sybyl repository URL in BRAT settings — it downloads and installs the latest release automatically.

Full documentation is in the repository: `USER_GUIDE.md` covers every command and frontmatter field in detail, and `TUTORIAL.md` walks through a complete first session from a cold start.

The plugin is under active development. The current release is **v0.11.0**.
