# Sybyl — Obsidian Plugin: LLM Implementation Spec

## Overview

Build an Obsidian plugin called **Sybyl** (`sybyl`) that enables solo tabletop role-playing directly inside Obsidian notes. The plugin supports multiple AI providers (Gemini, OpenAI, Anthropic Claude, Ollama) through a unified provider interface. Configuration lives entirely in the YAML front-matter of each note. All interactions happen inline in the active note.

The plugin enforces a strict neutral, third-person, non-directive AI persona: it never narrates the player character, never uses second person, never invents lore. It is a referee tool, not a storyteller.

---

## Tech Stack

- **Language**: TypeScript (strict mode)
- **Runtime**: Obsidian Plugin API (`obsidian` npm package)
- **AI**: Pluggable provider system — Gemini, OpenAI, Anthropic Claude, Ollama (local)
- **Build**: `esbuild` (standard Obsidian plugin toolchain)
- **Node**: ≥ 18

All providers use raw `fetch` — no vendor SDKs as runtime dependencies. This keeps the bundle lean and avoids version conflicts.

### Dependencies

```json
{
  "devDependencies": {
    "@types/node": "^18.0.0",
    "builtin-modules": "^3.3.0",
    "esbuild": "0.17.3",
    "obsidian": "latest",
    "tslib": "2.4.0",
    "typescript": "4.7.4"
  }
}
```

---

## Repository Structure

```
obsidian-sybyl/
├── src/
│   ├── main.ts                    # Plugin entry point
│   ├── commands.ts                # All command definitions
│   ├── providers/
│   │   ├── index.ts               # Provider factory: getProvider(settings)
│   │   ├── base.ts                # AIProvider abstract interface
│   │   ├── gemini.ts              # Gemini provider (generation + File API)
│   │   ├── openai.ts              # OpenAI provider (generation + vault_path grounding)
│   │   ├── anthropic.ts           # Anthropic Claude provider (generation + base64 PDF)
│   │   └── ollama.ts              # Ollama local provider (generation + vault_path text grounding)
│   ├── frontmatter.ts             # YAML front-matter read/write helpers
│   ├── editor.ts                  # Editor insertion / cursor helpers
│   ├── promptBuilder.ts           # System prompt + context assembly
│   ├── settings.ts                # Plugin settings schema + settings tab UI
│   └── types.ts                   # Shared TypeScript interfaces
├── manifest.json
├── package.json
├── tsconfig.json
└── esbuild.config.mjs
```

---

## manifest.json

```json
{
  "id": "sybyl",
  "name": "Sybyl",
  "version": "0.1.0",
  "minAppVersion": "1.4.0",
  "description": "Solo tabletop role-playing inside Obsidian, powered by Gemini. The Sybyl speaks — you decide.",
  "author": "Your Name",
  "authorUrl": "",
  "isDesktopOnly": false
}
```

---

## types.ts — Shared Interfaces

```typescript
// ─── Provider identity ────────────────────────────────────────────────────────

export type ProviderID = "gemini" | "openai" | "anthropic" | "ollama";

// ─── Global plugin settings ──────────────────────────────────────────────────

export interface SybylSettings {
  activeProvider: ProviderID;

  // Per-provider credentials and defaults
  providers: {
    gemini:    GeminiProviderConfig;
    openai:    OpenAIProviderConfig;
    anthropic: AnthropicProviderConfig;
    ollama:    OllamaProviderConfig;
  };

  // Global UX settings
  insertionMode:  "cursor" | "end-of-note";
  showTokenCount: boolean;
  defaultTemperature: number;   // 0.0–1.0, default 0.7
}

// ─── Per-provider config blocks ──────────────────────────────────────────────

export interface GeminiProviderConfig {
  apiKey:       string;
  defaultModel: string;  // "gemini-2.0-flash" | "gemini-1.5-pro" | "gemini-2.0-pro"
}

export interface OpenAIProviderConfig {
  apiKey:       string;
  defaultModel: string;  // "gpt-4o" | "gpt-4o-mini" | "gpt-4-turbo"
  baseUrl:      string;  // default "https://api.openai.com/v1" — overridable for Azure/proxies
}

export interface AnthropicProviderConfig {
  apiKey:       string;
  defaultModel: string;  // "claude-3-5-sonnet-20241022" | "claude-3-haiku-20240307"
}

export interface OllamaProviderConfig {
  baseUrl:      string;  // default "http://localhost:11434"
  defaultModel: string;  // e.g. "llama3.2" | "mistral" | "gemma3"
}

// ─── Note front-matter (provider-agnostic) ────────────────────────────────────

export interface NoteFrontMatter {
  game?:                   string;        // e.g. "Ironsworn"
  system_prompt_override?: string;        // fully replaces built-in system prompt
  provider?:               ProviderID;    // per-note provider override
  model?:                  string;        // per-note model override
  temperature?:            number;        // per-note temperature override
  sources?:                SourceRef[];   // grounding sources (provider-agnostic)
  scene_context?:          string;        // running scene summary (trimmed by user)
  pc_name?:                string;        // player character name
  pc_notes?:               string;        // brief PC summary for context
  oracle_mode?:            OracleMode;
  language?:               string;        // "en" | "it" | etc.
}

// ─── Provider-agnostic source reference ──────────────────────────────────────
// Stored in front-matter. Each provider populates the fields it uses.

export interface SourceRef {
  label:        string;        // human-readable, e.g. "Ironsworn Rulebook"
  provider:     ProviderID;    // which provider this ref belongs to
  mime_type:    string;        // "application/pdf" | "text/plain"
  // Gemini
  file_uri?:    string;        // "files/abc123def"
  // Reserved for future providers or future OpenAI file-store support
  file_id?:     string;        // "file-abc123"
  // OpenAI v1, Anthropic, and Ollama use vault_path and re-read at call time
  vault_path?:  string;        // relative path inside Obsidian vault
}

export type OracleMode = "yes-no" | "fate" | "custom";

// ─── Canonical generation request/response (provider-agnostic) ───────────────

export interface GenerationRequest {
  systemPrompt:    string;
  userMessage:     string;
  sources:         SourceRef[];
  temperature:     number;
  maxOutputTokens: number;
}

export interface GenerationResponse {
  text:        string;
  inputTokens?:  number;
  outputTokens?: number;
}

// ─── File upload result (providers that support persistent upload) ────────────

export interface UploadedFileInfo {
  provider:     ProviderID;
  label:        string;
  file_uri?:    string;   // Gemini
  file_id?:     string;   // OpenAI
  mime_type:    string;
  expiresAt?:   string;   // ISO date string — Gemini: 48h; OpenAI: no expiry
}
```

---

## providers/base.ts — AIProvider Interface

Every provider implements this interface. `main.ts` only ever calls these methods — it never imports a concrete provider directly.

```typescript
import { GenerationRequest, GenerationResponse, UploadedFileInfo } from "../types";

export interface AIProvider {
  readonly id: string;
  readonly name: string;

  /**
   * Generate a response given a fully assembled request.
   * The provider translates GenerationRequest into its own wire format.
   */
  generate(request: GenerationRequest): Promise<GenerationResponse>;

  /**
   * Upload a source file for grounding. Returns an UploadedFileInfo
   * whose fields (file_uri, file_id) can be stored in front-matter.
   *
   * Providers that do not support persistent upload (Anthropic, Ollama)
   * should throw: new Error("This provider does not support file upload.")
   */
  uploadSource(
    fileContent: ArrayBuffer,
    mimeType: string,
    displayName: string
  ): Promise<UploadedFileInfo>;

  /**
   * List all files uploaded under this provider's credentials.
   * Return empty array for providers without persistent upload.
   */
  listSources(): Promise<UploadedFileInfo[]>;

  /**
   * Delete a previously uploaded file. No-op for providers without upload.
   */
  deleteSource(ref: UploadedFileInfo): Promise<void>;

  /**
   * Quick connectivity + auth check. Resolves true on success.
   * Used by the settings tab to show ✓ / ✗ next to each API key.
   */
  validate(): Promise<boolean>;
}
```

---

## providers/index.ts — Provider Factory

```typescript
import { SybylSettings, ProviderID } from "../types";
import { AIProvider } from "./base";
import { GeminiProvider } from "./gemini";
import { OpenAIProvider } from "./openai";
import { AnthropicProvider } from "./anthropic";
import { OllamaProvider } from "./ollama";

export function getProvider(settings: SybylSettings, overrideId?: ProviderID): AIProvider {
  const id = overrideId ?? settings.activeProvider;
  switch (id) {
    case "gemini":    return new GeminiProvider(settings.providers.gemini);
    case "openai":    return new OpenAIProvider(settings.providers.openai);
    case "anthropic": return new AnthropicProvider(settings.providers.anthropic);
    case "ollama":    return new OllamaProvider(settings.providers.ollama);
    default:          throw new Error(`Unknown provider: ${id}`);
  }
}
```

---

## providers/gemini.ts — Gemini Provider

### Generation

Endpoint: `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}`

Request format:
```json
{
  "system_instruction": { "parts": [{ "text": "..." }] },
  "contents": [{
    "role": "user",
    "parts": [
      { "file_data": { "mime_type": "application/pdf", "file_uri": "files/abc123" } },
      { "text": "SCENE CONTEXT:\n...\n\nUser message" }
    ]
  }],
  "generationConfig": { "temperature": 0.7, "maxOutputTokens": 512 }
}
```

Response: extract `candidates[0].content.parts[].text`, join. Token counts from `usageMetadata.promptTokenCount` / `candidatesTokenCount`.

### File Upload (Gemini File API)

Three-step resumable upload. Files expire after **48 hours**. Surface expiry in UI.

```
Step 1 — POST /upload/v1beta/files?key={apiKey}
  Headers:
    X-Goog-Upload-Protocol: resumable
    X-Goog-Upload-Command: start
    X-Goog-Upload-Header-Content-Length: {bytes}
    X-Goog-Upload-Header-Content-Type: {mimeType}
  Body: { "file": { "display_name": "{displayName}" } }
  → Extract X-Goog-Upload-URL from response headers

Step 2 — POST {uploadUrl}
  Headers:
    Content-Length: {bytes}
    X-Goog-Upload-Offset: 0
    X-Goog-Upload-Command: upload, finalize
  Body: {raw file bytes}
  → Returns file metadata JSON

Step 3 — Poll GET /v1beta/{file.name}?key={apiKey}
  every 2s until state === "ACTIVE" (timeout: 30s)
```

`uploadSource()` returns `UploadedFileInfo` with `file_uri = file.uri`, `expiresAt = file.expirationTime`.

**List**: `GET /v1beta/files?key={apiKey}` → `files[]`
**Delete**: `DELETE /v1beta/{name}?key={apiKey}`
**Validate**: `GET /v1beta/models?key={apiKey}` — 200 = valid key.

---

## providers/openai.ts — OpenAI Provider

### Generation

Endpoint: `POST {baseUrl}/chat/completions`
Auth header: `Authorization: Bearer {apiKey}`

Request format:
```json
{
  "model": "gpt-4o",
  "temperature": 0.7,
  "max_tokens": 512,
  "messages": [
    { "role": "system", "content": "..." },
    {
      "role": "user",
      "content": [
        { "type": "text", "text": "SCENE CONTEXT:\n...\n\nUser message" }
      ]
    }
  ]
}
```

**Note on file grounding**: OpenAI's Assistants API supports file search, but it requires creating an Assistant and Thread per session — too heavy for Sybyl's stateless model. Instead, for OpenAI sources: read the file content from the vault (`vault_path`), extract text (for PDFs, instruct the user to also provide a `.txt` version), and prepend it as a `text` block in the user message. Store only `vault_path` in front-matter for OpenAI sources (no persistent upload).

Alternatively, if the user uploads to the Assistants file store, store `file_id` but note this requires an Assistant context that Sybyl does not maintain. **Recommended for v1: vault_path approach only for OpenAI — no upload UI for this provider.**

Response: `choices[0].message.content`. Token counts: `usage.prompt_tokens` / `completion_tokens`.

**Validate**: `GET {baseUrl}/models` — 200 = valid key.

**Default models**: `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`.

---

## providers/anthropic.ts — Anthropic Provider

### Generation

Endpoint: `POST https://api.anthropic.com/v1/messages`
Auth headers:
```
x-api-key: {apiKey}
anthropic-version: 2023-06-01
Content-Type: application/json
```

Request format:
```json
{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 512,
  "temperature": 0.7,
  "system": "...",
  "messages": [{
    "role": "user",
    "content": [
      {
        "type": "document",
        "source": {
          "type": "base64",
          "media_type": "application/pdf",
          "data": "{base64EncodedPDF}"
        }
      },
      { "type": "text", "text": "SCENE CONTEXT:\n...\n\nUser message" }
    ]
  }]
}
```

**File grounding for Anthropic**: PDFs are encoded as base64 and sent inline per request — there is no persistent upload. At call time, the plugin reads the file from `vault_path` (must be inside the Obsidian vault), encodes it as base64, and injects it into the message. This counts against input tokens, so the user should use small/excerpt PDFs.

`uploadSource()` throws `"Anthropic does not support persistent file upload. Use vault_path instead."` — the UI should handle this gracefully (show vault file picker instead of upload flow).

Response: `content[0].text`. Token counts: `usage.input_tokens` / `output_tokens`.

**Validate**: `POST /v1/messages` with a minimal 1-token request — 200 = valid key.

**Default models**: `claude-3-5-sonnet-20241022`, `claude-3-haiku-20240307`, `claude-3-opus-20240229`.

---

## providers/ollama.ts — Ollama Local Provider

### Generation

Endpoint: `POST {baseUrl}/api/chat`
No auth header required.

Request format (OpenAI-compatible chat endpoint):
```json
{
  "model": "llama3.2",
  "stream": false,
  "options": { "temperature": 0.7, "num_predict": 512 },
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "SCENE CONTEXT:\n...\n\nUser message" }
  ]
}
```

**File grounding for Ollama**: No persistent upload. If a source has a `vault_path`, read the file from the vault, extract its text content, and prepend it to the user message as a labelled block:

```
[SOURCE: Ironsworn Rulebook]
{extracted text, truncated to 4000 chars}
[END SOURCE]

SCENE CONTEXT: ...
```

Text extraction: for `.txt` files, read directly. For PDFs, extract using the Obsidian PDF plugin's text layer if available, or instruct the user to provide a `.txt` companion file. Clearly document this limitation.

`uploadSource()` throws `"Ollama does not support file upload. Add a vault_path source instead."`.

Response: `message.content`. Token counts: not always available — use `eval_count` + `prompt_eval_count` if present.

**Validate**: `GET {baseUrl}/api/tags` — 200 and non-empty models list = Ollama running.

**Default models**: populated dynamically by calling `GET {baseUrl}/api/tags` and listing available models.

---

## settings.ts — Plugin Settings

### Default Settings

```typescript
export const DEFAULT_SETTINGS: SybylSettings = {
  activeProvider: "gemini",
  providers: {
    gemini:    { apiKey: "", defaultModel: "gemini-2.0-flash" },
    openai:    { apiKey: "", defaultModel: "gpt-4o", baseUrl: "https://api.openai.com/v1" },
    anthropic: { apiKey: "", defaultModel: "claude-3-5-sonnet-20241022" },
    ollama:    { baseUrl: "http://localhost:11434", defaultModel: "llama3.2" },
  },
  insertionMode:      "cursor",
  showTokenCount:     false,
  defaultTemperature: 0.7,
};
```

### Settings Tab UI Structure

The settings tab is divided into three sections: **Active Provider**, **Provider Configuration**, and **Global Settings**.

---

#### Section 1 — Active Provider

A prominent dropdown at the top:

```
Active Provider: [ Gemini ▾ ]
```

Options: `Gemini`, `OpenAI`, `Anthropic (Claude)`, `Ollama (local)`.

Changing this dropdown immediately re-renders Section 2 to show only the selected provider's config block. The currently active provider name should appear as a badge in the settings tab header.

---

#### Section 2 — Provider Configuration

Rendered dynamically based on the selected provider. All four blocks are always stored in settings; only the active one is displayed.

**Gemini**
- API Key — password input + blur validation (ping `/v1beta/models`) → ✓ / ✗ status
- Default Model — dropdown: `gemini-2.0-flash`, `gemini-1.5-pro`, `gemini-2.0-pro`
- Manage Uploaded Files — button → opens File Manager Modal (list / delete files, copy URI)

**OpenAI**
- API Key — password input + blur validation (ping `/models`) → ✓ / ✗ status
- Base URL — text input (default `https://api.openai.com/v1`). Label: "Override for Azure or proxy endpoints"
- Default Model — dropdown: `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`
- Note (read-only text): "OpenAI sources use vault_path. Add source files via the Manage Sources command in any note."

**Anthropic (Claude)**
- API Key — password input + blur validation → ✓ / ✗ status
- Default Model — dropdown: `claude-3-5-sonnet-20241022`, `claude-3-haiku-20240307`, `claude-3-opus-20240229`
- Note (read-only text): "PDFs are encoded inline per request. Use short excerpts to avoid high token costs."

**Ollama (local)**
- Base URL — text input (default `http://localhost:11434`) + blur validation (ping `/api/tags`) → ✓ / ✗ status
- Available Models — populated dynamically on validation success; dropdown listing detected local models
- Default Model — text input (editable, pre-filled from dropdown selection)
- Note (read-only text): "No API key required. Ollama must be running locally. File grounding uses vault_path text extraction."

---

#### Section 3 — Global Settings

These apply regardless of active provider:

- **Default Temperature** — slider 0.0–1.0, step 0.05. Current value shown inline.
- **Insertion Mode** — dropdown: `At cursor`, `End of note`.
- **Show Token Count** — toggle. When enabled, appends `<!-- tokens: N in / M out -->` after each insertion. (Shows `N/A` for providers that don't return counts.)

---

## frontmatter.ts — Front-Matter Helpers

```typescript
import { App, TFile } from "obsidian";
import { NoteFrontMatter, ProviderID } from "./types";

export async function readFrontMatter(app: App, file: TFile): Promise<NoteFrontMatter> {
  const cache = app.metadataCache.getFileCache(file);
  return (cache?.frontmatter as NoteFrontMatter) ?? {};
}

export async function writeFrontMatterKey(
  app: App,
  file: TFile,
  key: string,
  value: unknown
): Promise<void> {
  await app.fileManager.processFrontMatter(file, (fm) => {
    fm[key] = value;
  });
}

export async function appendSceneContext(
  app: App,
  file: TFile,
  text: string,
  maxChars = 2000
): Promise<void> {
  await app.fileManager.processFrontMatter(file, (fm) => {
    const current: string = fm["scene_context"] ?? "";
    const updated = (current + "\n" + text).trim();
    fm["scene_context"] = updated.length > maxChars
      ? "..." + updated.slice(-maxChars)
      : updated;
  });
}

// Filter sources for the active provider only
export function sourcesForProvider(fm: NoteFrontMatter, provider: ProviderID) {
  return (fm.sources ?? []).filter((s) => s.provider === provider);
}
```

---

## promptBuilder.ts — System Prompt & Context Assembly

```typescript
import { NoteFrontMatter, GenerationRequest, SourceRef, ProviderID } from "./types";
import { SybylSettings } from "./types";

export function buildSystemPrompt(fm: NoteFrontMatter): string {
  if (fm.system_prompt_override) return fm.system_prompt_override;

  const game    = fm.game ?? "the game";
  const pcName  = fm.pc_name  ? `The player character is ${fm.pc_name}.`    : "";
  const pcNotes = fm.pc_notes ? `PC notes: ${fm.pc_notes}`                  : "";
  const lang    = fm.language
    ? `Respond in ${fm.language}.`
    : "Respond in the same language as the user's input.";

  return `You are a tool for solo role-playing of ${game}. You are NOT a game master.

Your role:
- Set the scene and offer alternatives (2-3 options maximum)
- When the user declares an action and their dice roll result, describe only consequences and world reactions
- When the user asks oracle questions, interpret them neutrally in context

STRICT PROHIBITIONS — never violate these:
- Never use second person ("you", "you stand", "you see")
- Never describe the PC's actions, thoughts, or internal states
- Never use dramatic or narrative tone
- Never invent lore, rules, or facts not present in the provided sources or scene context
- Never ask "What do you do?" or similar prompts
- Never use bold text for dramatic effect

RESPONSE FORMAT:
- 3-4 lines maximum unless the user explicitly requests more
- Neutral, third-person, factual tone
- Past tense for scene descriptions, present tense for world state
- No rhetorical questions

${pcName}
${pcNotes}
${lang}`.trim();
}

export function buildRequest(
  fm: NoteFrontMatter,
  userMessage: string,
  settings: SybylSettings,
  maxOutputTokens = 512
): GenerationRequest {
  const provider: ProviderID = fm.provider ?? settings.activeProvider;
  const sources = (fm.sources ?? []).filter((s) => s.provider === provider);
  const contextMessage = fm.scene_context?.trim()
    ? `SCENE CONTEXT:\n${fm.scene_context.trim()}\n\n${userMessage}`
    : userMessage;

  return {
    systemPrompt:    buildSystemPrompt(fm),
    userMessage:     contextMessage,
    sources,
    temperature:     fm.temperature ?? settings.defaultTemperature,
    maxOutputTokens,
  };
}
```

---

## editor.ts — Editor Insertion Helpers

```typescript
import { Editor } from "obsidian";

export function insertAtCursor(editor: Editor, text: string): void {
  const cursor = editor.getCursor();
  editor.replaceRange("\n" + text + "\n", cursor);
  editor.setCursor({ line: cursor.line + text.split("\n").length + 1, ch: 0 });
}

export function appendToNote(editor: Editor, text: string): void {
  const lastLine = editor.lastLine();
  const lastCh   = editor.getLine(lastLine).length;
  editor.replaceRange("\n" + text + "\n", { line: lastLine, ch: lastCh });
}

export function getSelection(editor: Editor): string {
  return editor.getSelection().trim();
}

export function insertBelowSelection(editor: Editor, text: string): void {
  const { to } = editor.listSelections()[0];
  editor.replaceRange("\n" + text, { line: to.line, ch: editor.getLine(to.line).length });
}
```

---

## commands.ts — Command Definitions

All 8 commands follow the same pattern:
1. Get active file and editor
2. Read front-matter
3. Build `GenerationRequest` via `promptBuilder.ts`
4. Resolve the correct provider via `getProvider()` — respecting per-note `provider` override
5. Call `provider.generate(request)`
6. Insert formatted result

---

### 1. `sybyl:start-scene`
**Name**: Sybyl: Start Scene

User message:
```
START SCENE. Generate only: 2-3 lines of third-person past-tense prose describing the setting and atmosphere. No dialogue. No PC actions. No additional commentary.
```
Insertion format: `> [Scene] {text}`

---

### 2. `sybyl:declare-action`
**Name**: Sybyl: Declare Action

Opens `InputModal` with fields: `Action` (text), `Roll result` (text).

User message:
```
PC action: {action}
Roll result: {roll}
Describe only the consequences and world reaction. Do not describe the PC's action.
```
Insertion format:
```
> [Action] {action} | Roll: {roll}
> [Result] {text}
```

---

### 3. `sybyl:ask-oracle`
**Name**: Sybyl: Ask Oracle

Opens `InputModal` with fields: `Question` (text), `Oracle result` (optional text).

User message (with result):
```
Oracle question: {question}
Oracle result: {result}
Interpret this result in the context of the scene. Third person, neutral, 2-3 lines.
```
User message (without result):
```
Oracle question: {question}
Oracle mode: {oracle_mode}
Run the oracle and give the result plus a 1-2 line neutral interpretation.
```
Insertion format:
```
> [Oracle] Q: {question}
> [Answer] {text}
```

---

### 4. `sybyl:interpret-oracle`
**Name**: Sybyl: Interpret Oracle Result

Uses selected editor text. Falls back to `InputModal` if no selection.

User message:
```
Interpret this oracle result in the context of the current scene: "{selected_text}"
Neutral, third-person, 2-3 lines. No dramatic language.
```
Inserts below selection.

---

### 5. `sybyl:suggest-consequence`
**Name**: Sybyl: Suggest Consequence

User message:
```
Based on the current scene context, suggest 1-2 possible consequences or complications. Present them as neutral options, not as narrative outcomes. Do not choose between them.
```
Insertion format: `> [Options] {text}`

---

### 6. `sybyl:expand-scene`
**Name**: Sybyl: Expand Scene into Prose

Override `maxOutputTokens: 300`.

User message:
```
Expand the current scene into a prose passage. Third person, past tense, 100-150 words. No dialogue. Do not describe the PC's internal thoughts or decisions. Stay strictly within the established scene context.
```
Insertion format:
```
---
> [Prose] {text}
---
```

---

### 7. `sybyl:upload-source`
**Name**: Sybyl: Upload Source File

Flow:
1. Read active note's front-matter — resolve `provider` (note override or plugin active provider)
2. Check provider capability:
   - **Gemini**: full upload flow (File API)
   - **OpenAI**: show vault file picker — store `vault_path`, no API upload (v1)
   - **Anthropic**: show vault file picker — store `vault_path`, note inline encoding
   - **Ollama**: show vault file picker — store `vault_path`, note text extraction
3. For Gemini: show OS file picker, call `provider.uploadSource()`, poll for ACTIVE, write `SourceRef` to front-matter `sources` array
4. For others: show Obsidian vault file picker (suggest PDF or TXT), write `SourceRef` with `vault_path` to front-matter

Show progress notice during upload. On completion, show file URI or vault path confirmation.

---

### 8. `sybyl:manage-sources`
**Name**: Sybyl: Manage Sources

Opens a modal listing all entries in the note's `sources` array:
- Label, provider badge, type (URI / vault path), expiry (Gemini only)
- **Remove from note** button — removes from front-matter only
- **Delete from provider** button — calls `provider.deleteSource()` and removes from front-matter (disabled for Anthropic/Ollama/OpenAI vault-path sources)
- **Add source** button → triggers `upload-source` flow

---

## main.ts — Plugin Entry Point

```typescript
import { Plugin, Notice, MarkdownView } from "obsidian";
import { SybylSettings, DEFAULT_SETTINGS } from "./settings";
import { SybylSettingTab } from "./settings";
import { readFrontMatter } from "./frontmatter";
import { buildRequest } from "./promptBuilder";
import { getProvider } from "./providers/index";
import { insertAtCursor, appendToNote } from "./editor";
import { registerAllCommands } from "./commands";

export default class SybylPlugin extends Plugin {
  settings: SybylSettings;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new SybylSettingTab(this.app, this));
    registerAllCommands(this);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    // Ensure nested provider objects are always fully populated
    this.settings.providers = Object.assign(
      {},
      DEFAULT_SETTINGS.providers,
      this.settings.providers
    );
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async generate(
    userMessage: string,
    insertionFormatter: (text: string) => string,
    maxOutputTokens = 512
  ): Promise<void> {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) { new Notice("No active markdown note."); return; }

    const fm       = await readFrontMatter(this.app, view.file);
    const provider = getProvider(this.settings, fm.provider);
    const request  = buildRequest(fm, userMessage, this.settings, maxOutputTokens);

    const notice = new Notice("Sybyl: Generating…", 0);
    try {
      const response  = await provider.generate(request);
      const formatted = insertionFormatter(response.text);
      const editor    = view.editor;

      if (this.settings.insertionMode === "cursor") {
        insertAtCursor(editor, formatted);
      } else {
        appendToNote(editor, formatted);
      }

      if (this.settings.showTokenCount) {
        const inT  = response.inputTokens  ?? "N/A";
        const outT = response.outputTokens ?? "N/A";
        appendToNote(editor, `<!-- tokens: ${inT} in / ${outT} out -->`);
      }
    } catch (err) {
      new Notice(`Sybyl error: ${(err as Error).message}`);
      console.error(err);
    } finally {
      notice.hide();
    }
  }
}
```

---

## Note Front-Matter Schema (Full Reference)

Complete YAML schema for a Sybyl note. All fields optional except `game`.

```yaml
---
game: "Ironsworn"
pc_name: "Kira Voss"
pc_notes: "Rank: Dangerous. Bond: Iron Road settlement. Vow: Find the stolen relic."
oracle_mode: "yes-no"
language: "en"

# Provider override for this note (optional — defaults to plugin active provider)
provider: "gemini"
model: "gemini-2.0-flash"
temperature: 0.7

system_prompt_override: ""   # Leave blank to use built-in prompt

sources:
  # Gemini source (persistent upload, 48h expiry)
  - label: "Ironsworn Rulebook"
    provider: "gemini"
    mime_type: "application/pdf"
    file_uri: "files/abc123def456"

  # Anthropic / Ollama / OpenAI source (vault path, re-read at call time)
  - label: "Oracle Tables"
    provider: "anthropic"
    mime_type: "text/plain"
    vault_path: "rpg/ironsworn-oracles.txt"

scene_context: |
  Act 1: The Veiled Mountains.
  Kira followed the wagon tracks into the pass.
  Oracle: Danger ahead — Yes, and. Two armed figures block the path.
  Last action: Kira bluffed past them. Strong Hit. They let her through, warily.
---
```

---

## Modals

### InputModal (reusable)

```typescript
import { App, Modal, Setting } from "obsidian";

export class InputModal extends Modal {
  private fields: { label: string; placeholder?: string; key: string }[];
  private values: Record<string, string> = {};
  private onSubmit: (values: Record<string, string>) => void;

  constructor(
    app: App,
    fields: { label: string; placeholder?: string; key: string }[],
    onSubmit: (values: Record<string, string>) => void
  ) {
    super(app);
    this.fields   = fields;
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    for (const field of this.fields) {
      new Setting(contentEl)
        .setName(field.label)
        .addText((text) => {
          text.setPlaceholder(field.placeholder ?? "");
          text.onChange((v) => { this.values[field.key] = v; });
        });
    }
    new Setting(contentEl).addButton((btn) => {
      btn.setButtonText("Confirm").setCta().onClick(() => {
        this.close();
        this.onSubmit(this.values);
      });
    });
  }

  onClose() { this.contentEl.empty(); }
}
```

---

## Error Handling Requirements

| Condition | Notice text |
|---|---|
| No active note | "No active markdown note." |
| No API key (cloud provider) | "No {Provider} API key set. Check plugin settings." |
| Invalid API key (401/403) | "{Provider} API key rejected. Check settings." |
| Ollama not running | "Ollama not reachable at {baseUrl}. Is it running?" |
| Gemini file URI expired | "Source '{label}' has expired (Gemini 48h limit). Re-upload via Manage Sources." |
| File too large (> 20MB Gemini) | "File too large. Gemini File API limit is 20MB." |
| Anthropic PDF too large (inline) | "PDF too large for inline encoding. Use a shorter excerpt." |
| Rate limit (429) | "Rate limit hit. Wait a moment and retry." |
| Network failure | "Network error. Check your connection." |
| Empty AI response | "Provider returned an empty response." |
| Provider capability mismatch | "This provider does not support file upload. Use vault_path instead." |
| Ollama model not found | "Model '{model}' not found in Ollama. Check available models in settings." |

---

## Token Optimization Strategy

1. **System prompt** built at call time from front-matter — no redundant boilerplate. Target: ≤ 300 tokens.
2. **Scene context** capped at 2000 chars — oldest beats trimmed automatically.
3. **File grounding**: Gemini uses `file_data` parts (server-side, not pasted). Anthropic/Ollama prepend source text truncated to 4000 chars per source.
4. **`maxOutputTokens: 512`** globally. Only `expand-scene` uses 300 (note: this is output tokens — set to 300 for ~150 words).
5. **Stateless calls** — no conversation history maintained. Scene context in front-matter is the memory layer.
6. **Provider-aware defaults**: `gemini-2.0-flash` and `claude-3-haiku` are fastest/cheapest for this task pattern; surface them as defaults.
7. **Token count logging** surfaced per call when enabled in settings.

---

## esbuild.config.mjs

```javascript
import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";

const prod = process.argv[2] === "production";

esbuild.build({
  banner:      { js: "/* Sybyl Plugin */" },
  entryPoints: ["src/main.ts"],
  bundle:      true,
  external:    ["obsidian", "electron", ...builtins],
  format:      "cjs",
  target:      "es2018",
  logLevel:    "info",
  sourcemap:   prod ? false : "inline",
  treeShaking: true,
  outfile:     "main.js",
  minify:      prod,
}).catch(() => process.exit(1));
```

---

## tsconfig.json

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "inlineSourceMap": true,
    "inlineSources": true,
    "module": "ESNext",
    "target": "ES2018",
    "allowImportingTsExtensions": true,
    "allowSyntheticDefaultImports": true,
    "moduleResolution": "bundler",
    "importHelpers": true,
    "isolatedModules": true,
    "strictNullChecks": true,
    "noEmit": true,
    "lib": ["DOM", "ES2018"]
  },
  "include": ["src/**/*.ts"]
}
```

---

## Implementation Order

1. **Scaffold** — `manifest.json`, `package.json`, `tsconfig.json`, `esbuild.config.mjs`, empty `src/main.ts` loading without error.
2. **`types.ts`** — All interfaces including `ProviderID`, `SybylSettings`, `SourceRef`, `GenerationRequest/Response`.
3. **`providers/base.ts`** — `AIProvider` interface.
4. **`providers/gemini.ts`** — Generation + File API. Test with a hardcoded request.
5. **`providers/index.ts`** — Factory function. Stub out other providers as `throw new Error("Not implemented")`.
6. **`settings.ts`** — Schema + settings tab with Gemini block only. Verify save/load.
7. **`frontmatter.ts`** — Helpers. Test with a sample note.
8. **`promptBuilder.ts`** — `buildSystemPrompt` + `buildRequest`. Unit-test with mock front-matter.
9. **`editor.ts`** — Insertion helpers.
10. **`commands.ts`** — Implement all 8 commands (start with `start-scene`, then the rest).
11. **Settings tab: provider switching** — Add Ollama, OpenAI, Anthropic config blocks. Wire the provider dropdown so it re-renders Section 2.
12. **`providers/ollama.ts`** — Generation + vault_path text injection.
13. **`providers/openai.ts`** — Generation + vault_path text injection.
14. **`providers/anthropic.ts`** — Generation + base64 inline PDF.
15. **Source management** — `upload-source` with provider-aware flow + `manage-sources` modal.
16. **Error handling pass** — All cases in the error table.
17. **Token optimization pass** — Verify caps, trimming, token count logging.

---

## Testing Checklist

- [ ] Plugin loads without console errors
- [ ] Settings save and persist across Obsidian restarts
- [ ] Active provider dropdown re-renders Section 2 correctly
- [ ] Each provider's API key / URL validates on blur with ✓ / ✗
- [ ] Ollama model list populates from live `/api/tags`
- [ ] `start-scene` generates 2-3 lines, inserts as blockquote
- [ ] `declare-action` modal collects action + roll, inserts formatted result
- [ ] `ask-oracle` with result interprets neutrally; without result runs oracle
- [ ] `interpret-oracle` uses selected text when available
- [ ] `suggest-consequence` returns 1-2 options, no narrative choice made
- [ ] `expand-scene` returns longer prose on explicit command only
- [ ] Per-note `provider:` override correctly routes to that provider
- [ ] Gemini: file upload completes, polls ACTIVE, appends `file_uri` to front-matter
- [ ] Anthropic: vault_path source encodes inline at call time
- [ ] Ollama: vault_path source prepends truncated text to user message
- [ ] Expired Gemini file URI produces correct error notice
- [ ] `scene_context` > 2000 chars is trimmed from the top
- [ ] Token count comment appended only when setting is enabled
- [ ] All commands fail gracefully (correct notice) when config is missing
- [ ] Dark and light Obsidian theme: no UI breakage in settings tab or modals

---

## Lonelog Mode

Lonelog is a standard notation for solo RPG session logging created by Roberto Bisceglie (v1.4.0, CC BY-SA 4.0). When **Lonelog Mode** is enabled in the plugin settings, Sybyl operates in two additional ways:

1. **Input**: the note body is parsed to extract structured scene context (active NPCs, threads, clocks, last scene beats) when `scene_context` is empty. If `scene_context` is present in front-matter, it takes precedence and is used verbatim.
2. **Output**: all command responses are formatted in Lonelog notation instead of generic blockquotes

Lonelog Mode is **opt-in** — controlled by a global default and overridable per note via front-matter.

---

### Core Lonelog Symbols (reference)

These are the symbols the parser recognizes and the formatter produces:

| Symbol | Meaning |
|---|---|
| `@` | Player action (primary PC) |
| `@(Name)` | Action attributed to named actor |
| `?` | Oracle question |
| `d:` | Mechanics roll |
| `->` | Resolution result (dice or oracle) |
| `=>` | Consequence / outcome |
| `[N:Name\|tags]` | NPC tag |
| `[L:Name\|tags]` | Location tag |
| `[E:Name X/Y]` | Event / clock |
| `[Thread:Name\|state]` | Story thread |
| `[PC:Name\|stats]` | Player character state |
| `[Clock:Name X/Y]` | Clock (threat accumulator) |
| `[Track:Name X/Y]` | Progress track |
| `[Timer:Name X]` | Countdown timer |
| `S#` | Scene marker |
| `(note: ...)` | Meta note |

---

### Repository Structure — Lonelog Additions

Add a `lonelog/` subfolder under `src/`:

```
src/
├── lonelog/
│   ├── parser.ts      # extract structured context from note body
│   └── formatter.ts   # format AI output in Lonelog notation
```

---

### types.ts — Lonelog Additions

Extend `SybylSettings`:

```typescript
export interface SybylSettings {
  // ... existing fields ...
  lonelogMode: boolean;           // global opt-in flag
}
```

Extend `NoteFrontMatter`:

```typescript
export interface NoteFrontMatter {
  // ... existing fields ...
  lonelog?:         boolean;  // per-note override of global lonelogMode
  scene_counter?:   number;   // current scene number, incremented by new-scene when auto-increment is enabled
  session_number?:  number;   // current session number
}
```

Add to `DEFAULT_SETTINGS`:

```typescript
lonelogMode: false,
```

---

### settings.ts — Lonelog Toggle

Add to **Section 3 — Global Settings**:

- **Lonelog Mode** — toggle. When enabled:
  - All command outputs use Lonelog notation instead of generic blockquotes
  - Note body is parsed for structured context before each generation
  - Three additional Lonelog-specific commands become available
  - A sub-section appears with Lonelog options:
    - **Auto-increment scene counter** — toggle (default: on). When on, `new-scene` command auto-increments `scene_counter` in front-matter.
    - **Context extraction depth** — number input (default: 60). How many trailing lines of the note body to scan for Lonelog context when `scene_context` is empty.
    - **Wrap notation in code blocks** — toggle (default: on). Wraps `@`, `d:`, `->`, `=>` lines in ` ``` ` fences as per Lonelog's digital markdown spec.

---

### lonelog/parser.ts

The parser scans the raw note body (excluding YAML front-matter) to extract a structured context summary. This replaces the need for a manually maintained `scene_context` field when Lonelog mode is active.

```typescript
export interface LonelogContext {
  lastSceneId:    string;         // e.g. "S7", "T2-S3"
  lastSceneDesc:  string;         // scene description text
  activeNPCs:     string[];       // last-seen tag for each NPC
  activeLocations: string[];
  activeThreads:  string[];       // name + state
  activeClocks:   string[];       // name + progress
  activeTracks:   string[];
  pcState:        string[];       // PC tags
  recentBeats:    string[];       // last N action/oracle/consequence lines
}

// Extract context from note body (below YAML front-matter)
export function parseLonelogContext(
  noteBody: string,
  depthLines = 60
): LonelogContext {
  // Strip YAML front-matter block (content between --- markers)
  const bodyWithoutFM = noteBody.replace(/^---[\s\S]*?---\n/, "");

  // Work with the last `depthLines` lines only (configurable)
  const lines = bodyWithoutFM.split("\n");
  const window = lines.slice(-depthLines);

  const ctx: LonelogContext = {
    lastSceneId:     "",
    lastSceneDesc:   "",
    activeNPCs:      [],
    activeLocations: [],
    activeThreads:   [],
    activeClocks:    [],
    activeTracks:    [],
    pcState:         [],
    recentBeats:     [],
  };

  // Regex patterns
  const sceneRe    = /^(?:#+\s+)?(T\d+-)?S(\d+[\w.]*)\s*\*([^*]*)\*/;
  const npcRe      = /\[N:([^\]]+)\]/g;
  const locRe      = /\[L:([^\]]+)\]/g;
  const threadRe   = /\[Thread:([^\]]+)\]/g;
  const clockRe    = /\[Clock:([^\]]+)\]/g;
  const trackRe    = /\[Track:([^\]]+)\]/g;
  const pcRe       = /\[PC:([^\]]+)\]/g;
  const beatRe     = /^(@|\?|d:|->|=>)/;

  // NPC/location accumulator: last mention wins (most recent state)
  const npcMap    = new Map<string, string>();
  const locMap    = new Map<string, string>();
  const threadMap = new Map<string, string>();
  const clockMap  = new Map<string, string>();
  const trackMap  = new Map<string, string>();
  const pcMap     = new Map<string, string>();

  for (const line of window) {
    const sceneMatch = line.match(sceneRe);
    if (sceneMatch) {
      ctx.lastSceneId   = (sceneMatch[1] ?? "") + "S" + sceneMatch[2];
      ctx.lastSceneDesc = sceneMatch[3].trim();
    }

    for (const m of line.matchAll(npcRe))    npcMap.set(m[1].split("|")[0], m[1]);
    for (const m of line.matchAll(locRe))    locMap.set(m[1].split("|")[0], m[1]);
    for (const m of line.matchAll(threadRe)) threadMap.set(m[1].split("|")[0], m[1]);
    for (const m of line.matchAll(clockRe))  clockMap.set(m[1].split(" ")[0], m[1]);
    for (const m of line.matchAll(trackRe))  trackMap.set(m[1].split(" ")[0], m[1]);
    for (const m of line.matchAll(pcRe))     pcMap.set(m[1].split("|")[0], m[1]);

    if (beatRe.test(line.trim())) {
      ctx.recentBeats.push(line.trim());
    }
  }

  ctx.activeNPCs      = [...npcMap.values()];
  ctx.activeLocations = [...locMap.values()];
  ctx.activeThreads   = [...threadMap.values()];
  ctx.activeClocks    = [...clockMap.values()];
  ctx.activeTracks    = [...trackMap.values()];
  ctx.pcState         = [...pcMap.values()];

  // Keep last 10 beats only
  ctx.recentBeats = ctx.recentBeats.slice(-10);

  return ctx;
}

// Serialize a LonelogContext into a compact string for the AI prompt
export function serializeContext(ctx: LonelogContext): string {
  const lines: string[] = [];

  if (ctx.lastSceneId)
    lines.push(`Current scene: ${ctx.lastSceneId} *${ctx.lastSceneDesc}*`);
  if (ctx.pcState.length)
    lines.push(`PC: ${ctx.pcState.map((s) => `[PC:${s}]`).join(" ")}`);
  if (ctx.activeNPCs.length)
    lines.push(`NPCs: ${ctx.activeNPCs.map((s) => `[N:${s}]`).join(" ")}`);
  if (ctx.activeLocations.length)
    lines.push(`Locations: ${ctx.activeLocations.map((s) => `[L:${s}]`).join(" ")}`);
  if (ctx.activeThreads.length)
    lines.push(`Threads: ${ctx.activeThreads.map((s) => `[Thread:${s}]`).join(" ")}`);
  if (ctx.activeClocks.length)
    lines.push(`Clocks: ${ctx.activeClocks.map((s) => `[Clock:${s}]`).join(" ")}`);
  if (ctx.activeTracks.length)
    lines.push(`Tracks: ${ctx.activeTracks.map((s) => `[Track:${s}]`).join(" ")}`);
  if (ctx.recentBeats.length) {
    lines.push(`Recent beats:`);
    ctx.recentBeats.forEach((b) => lines.push(`  ${b}`));
  }

  return lines.join("\n");
}
```

---

### lonelog/formatter.ts

Formats each command's AI output as valid Lonelog notation. The formatter receives the raw AI text and transforms it into the correct symbol-prefixed lines, optionally wrapped in code fences.

```typescript
export interface LonelogFormatOptions {
  wrapInCodeBlock: boolean;
  sceneId?:        string;   // e.g. "S8" — used by start-scene
}

// Wrap lines in ``` fences (Lonelog digital markdown spec)
function fence(content: string): string {
  return "```\n" + content + "\n```";
}

// Remove leading blockquote markers the AI might add
function cleanAiText(text: string): string {
  return text.replace(/^>\s*/gm, "").trim();
}

export function formatStartScene(
  aiText: string,
  sceneId: string,
  sceneDesc: string,
  opts: LonelogFormatOptions
): string {
  const header  = `### ${sceneId} *${sceneDesc}*`;
  const body    = cleanAiText(aiText);
  // Start scene is narrative — place outside code fence, preceded by scene header
  return `${header}\n\n${body}`;
}

export function formatDeclareAction(
  action: string,
  roll: string,
  aiConsequence: string,
  opts: LonelogFormatOptions
): string {
  const consequence = cleanAiText(aiConsequence)
    .split("\n")
    .map((l) => (l.startsWith("=>") ? l : `=> ${l}`))
    .join("\n");

  const notation = `@ ${action}\nd: ${roll}\n${consequence}`;
  return opts.wrapInCodeBlock ? fence(notation) : notation;
}

export function formatAskOracle(
  question: string,
  oracleResult: string,
  aiInterpretation: string,
  opts: LonelogFormatOptions
): string {
  const interpretation = cleanAiText(aiInterpretation)
    .split("\n")
    .map((l) => (l.startsWith("=>") ? l : `=> ${l}`))
    .join("\n");

  const notation = `? ${question}\n-> ${oracleResult}\n${interpretation}`;
  return opts.wrapInCodeBlock ? fence(notation) : notation;
}

export function formatInterpretOracle(
  oracleText: string,
  aiInterpretation: string,
  opts: LonelogFormatOptions
): string {
  const interpretation = cleanAiText(aiInterpretation)
    .split("\n")
    .map((l) => (l.startsWith("=>") ? l : `=> ${l}`))
    .join("\n");

  const notation = `-> ${oracleText}\n${interpretation}`;
  return opts.wrapInCodeBlock ? fence(notation) : notation;
}

export function formatSuggestConsequence(
  aiOptions: string,
  opts: LonelogFormatOptions
): string {
  // Each option becomes a separate => line
  const options = cleanAiText(aiOptions)
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => (l.startsWith("=>") ? l : `=> ${l}`))
    .join("\n");

  return opts.wrapInCodeBlock ? fence(options) : options;
}

export function formatExpandScene(
  aiProse: string,
  _opts: LonelogFormatOptions
): string {
  // Long narrative block — use Lonelog block delimiters \--- ... ---\
  const body = cleanAiText(aiProse);
  return `\\---\n${body}\n---\\`;
}
```

---

### promptBuilder.ts — Lonelog Addendum

When Lonelog mode is active, append this block to the system prompt (after the base system prompt text):

```typescript
const LONELOG_SYSTEM_ADDENDUM = `
LONELOG NOTATION MODE IS ACTIVE.

When generating consequences, oracle interpretations, or scene text:
- Consequences must start with "=>" (one per line for multiple consequences)
- Oracle answers must start with "->"
- Do not use blockquote markers (">")
- Do not add narrative headers or labels like "[Result]" or "[Scene]"
- For scene descriptions: plain prose only, 2-3 lines, no symbol prefix
- Do not invent or suggest Lonelog tags ([N:], [L:], etc.) — the player manages those

Generate only the symbol-prefixed content lines. The formatter handles wrapping.
`.trim();
```

Update `buildSystemPrompt` to append this when `lonelogMode` is true:

```typescript
export function buildSystemPrompt(
  fm: NoteFrontMatter,
  lonelogMode: boolean
): string {
  const base = fm.system_prompt_override ?? buildBasePrompt(fm);
  return lonelogMode ? base + "\n\n" + LONELOG_SYSTEM_ADDENDUM : base;
}
```

Update `buildRequest` to accept `noteBody?: string` and use `parseLonelogContext` + `serializeContext` when Lonelog mode is active and `scene_context` is not explicitly set:

```typescript
export function buildRequest(
  fm: NoteFrontMatter,
  userMessage: string,
  settings: SybylSettings,
  maxOutputTokens = 512,
  noteBody?: string        // pass full note body when Lonelog mode is active
): GenerationRequest {
  const provider    = fm.provider ?? settings.activeProvider;
  const sources     = (fm.sources ?? []).filter((s) => s.provider === provider);
  const lonelogActive = fm.lonelog ?? settings.lonelogMode;

  let contextBlock = "";
  if (fm.scene_context?.trim()) {
    contextBlock = `SCENE CONTEXT:\n${fm.scene_context.trim()}`;
  } else if (lonelogActive && noteBody) {
    const ctx = parseLonelogContext(noteBody, settings.lonelogContextDepth ?? 60);
    contextBlock = serializeContext(ctx);
  }

  const contextMessage = contextBlock
    ? `${contextBlock}\n\n${userMessage}`
    : userMessage;

  return {
    systemPrompt:    buildSystemPrompt(fm, lonelogActive),
    userMessage:     contextMessage,
    sources,
    temperature:     fm.temperature ?? settings.defaultTemperature,
    maxOutputTokens,
  };
}
```

Update the `main.ts` generation path accordingly:

```typescript
const noteBody = await this.app.vault.cachedRead(view.file);
const request  = buildRequest(fm, userMessage, this.settings, maxOutputTokens, noteBody);
```

Also add to `SybylSettings`:

```typescript
lonelogContextDepth:    number;   // default 60 — lines to scan for context
lonelogWrapCodeBlock:   boolean;  // default true
lonelogAutoIncScene:    boolean;  // default true
```

---

### commands.ts — Lonelog Command Changes

In each existing command, check whether Lonelog mode is active and use the appropriate formatter.

**Helper function** (add to `commands.ts`):

```typescript
function isLonelogActive(settings: SybylSettings, fm: NoteFrontMatter): boolean {
  return fm.lonelog ?? settings.lonelogMode;
}

function lonelogOpts(settings: SybylSettings): LonelogFormatOptions {
  return { wrapInCodeBlock: settings.lonelogWrapCodeBlock ?? true };
}
```

**`start-scene` update**:

When Lonelog mode is active:
1. Read `scene_counter` from front-matter (default 1 if absent)
2. Pass `sceneId = "S" + scene_counter` and open a single-field modal for the scene description text
3. Use `formatStartScene(aiText, sceneId, sceneDesc, opts)` for insertion
4. After insertion, increment `scene_counter` in front-matter only if `settings.lonelogAutoIncScene` is true

When Lonelog mode is inactive: behavior unchanged.

**`declare-action` update**:

When Lonelog active:
- User message unchanged
- Use `formatDeclareAction(action, roll, response.text, opts)` for insertion

**`ask-oracle` update**:

When Lonelog active:
- User message unchanged
- Use `formatAskOracle(question, oracleResult, response.text, opts)` for insertion
- If no oracle result is provided, require the AI to return Lonelog-formatted text with exactly one leading `->` line followed by one or more `=>` lines. Parse `response.text` locally and pass the extracted result plus interpretation text into `formatAskOracle(...)`.

**`interpret-oracle` update**:

When Lonelog active:
- Use `formatInterpretOracle(selectedText, response.text, opts)` for insertion

**`suggest-consequence` update**:

When Lonelog active:
- Use `formatSuggestConsequence(response.text, opts)` for insertion

**`expand-scene` update**:

When Lonelog active:
- Use `formatExpandScene(response.text, opts)` — wraps in `\--- ... ---\` block delimiters

---

### New Lonelog Commands

Register these three commands unconditionally in `registerAllCommands`. In each callback, resolve `isLonelogActive(settings, fm)` against the active note; if Lonelog is inactive, show a notice such as `"Lonelog mode is not enabled for this note."` and abort. This preserves the per-note override model.

---

#### `sybyl:lonelog-new-scene`
**Name**: Sybyl: New Scene

**Behavior**:
1. Read `scene_counter` from front-matter (default: 1)
2. Open `InputModal` with one field: `Scene description` (brief location/time, e.g. "Dark alley, midnight")
3. Call `generate()` with message:
   ```
   START SCENE. Generate only: 2-3 lines of third-person past-tense prose describing the atmosphere and setting of: "{sceneDesc}". No dialogue. No PC actions. No additional commentary.
   ```
4. Format with `formatStartScene(aiText, "S" + scene_counter, sceneDesc, opts)`
5. Insert at cursor
6. If `settings.lonelogAutoIncScene` is true, increment `scene_counter` in front-matter

This is the Lonelog-native replacement for `start-scene` — it manages the scene ID automatically.

---

#### `sybyl:lonelog-parse-context`
**Name**: Sybyl: Update Scene Context from Log

**Behavior**: Runs the parser on the active note body, serializes the result, and writes it into `scene_context` in the front-matter. This is a **manual trigger** — it lets users who prefer the front-matter `scene_context` approach keep it in sync with their Lonelog log without doing so by hand.

No AI call. No insertion. Only a `Notice` on completion: "Scene context updated from log."

Useful as a fallback for providers that have tighter context budgets (Ollama) — update context manually before long sessions.

---

#### `sybyl:lonelog-session-break`
**Name**: Sybyl: New Session Header

**Behavior**:
1. Read `session_number` from front-matter (default: 1)
2. Open `InputModal` with fields:
   - `Date` (pre-filled with today's date in `YYYY-MM-DD` format)
   - `Duration` (placeholder: `1h30`)
   - `Recap` (optional: one-line summary of last session)
3. Insert the following at cursor (no AI call needed):
   ```markdown
   ## Session {session_number}
   *Date: {date} | Duration: {duration}*
   
   **Recap:** {recap}
   
   ```
4. Increment `session_number` in front-matter

---

### Note Front-Matter Schema — Lonelog Fields

Add to the full reference schema:

```yaml
---
# ... existing fields ...

# Lonelog Mode (optional — overrides global plugin setting)
lonelog: true

# Auto-managed by plugin when lonelog: true
scene_counter: 7       # current scene number (incremented by new-scene when auto-increment is enabled)
session_number: 2      # current session number (incremented by session-break command)

# scene_context is OPTIONAL when lonelog: true
# If present and non-empty, it takes precedence over live note parsing for AI context.
# If absent or empty, the plugin parses the note body automatically.
scene_context: ""
---
```

---

### Token Optimization — Lonelog Notes

- Live note parsing (`parseLonelogContext`) scans only the last `lonelogContextDepth` lines (default 60), not the entire note. This keeps the extracted context compact even in long campaign logs.
- The serialized context from `serializeContext()` is typically 150–400 chars — well within budget.
- The `LONELOG_SYSTEM_ADDENDUM` is ~120 tokens. Only injected when Lonelog mode is active.
- In Lonelog mode, `scene_context` in front-matter can be left empty — removing the need to maintain it manually.

---

### Implementation Order — Lonelog Steps

Add after step 10 of the existing order:

18. **`lonelog/parser.ts`** — Implement `parseLonelogContext` + `serializeContext`. Unit-test with a sample Lonelog log string.
19. **`lonelog/formatter.ts`** — Implement all formatters. Test each with mock AI text, with and without `wrapInCodeBlock`.
20. **Lonelog toggle in settings tab** — Add toggle + sub-settings. Verify show/hide of sub-section.
21. **Update `promptBuilder.ts`** — Inject `LONELOG_SYSTEM_ADDENDUM`, pass `noteBody` to `buildRequest`.
22. **Update existing commands** — Route through Lonelog formatters when active.
23. **New Lonelog commands** — `new-scene`, `parse-context`, `session-break`.
24. **Lonelog command gating** — Lonelog commands are always registered, but abort with a notice when Lonelog is inactive for the active note. Re-register on settings save only if command metadata changes.

---

### Testing Checklist — Lonelog

- [ ] Lonelog toggle shows/hides sub-settings correctly
- [ ] `parseLonelogContext` extracts last scene ID, NPCs, threads, clocks from a sample log
- [ ] `serializeContext` output is under 500 chars for a typical session window
- [ ] Per-note `lonelog: true` overrides global toggle correctly, including access to Lonelog-only commands
- [ ] `start-scene` in Lonelog mode inserts `### S# *desc*` header + prose (no blockquote)
- [ ] `declare-action` in Lonelog mode inserts `@` + `d:` + `=>` lines (code-fenced if setting on)
- [ ] `ask-oracle` in Lonelog mode inserts `?` + `->` + `=>` lines
- [ ] `interpret-oracle` in Lonelog mode inserts `->` + `=>` lines
- [ ] `suggest-consequence` in Lonelog mode produces `=>` lines, no narrative framing
- [ ] `expand-scene` in Lonelog mode produces `\--- ... ---\` block
- [ ] `new-scene` increments `scene_counter` in front-matter only when `lonelogAutoIncScene` is enabled
- [ ] `session-break` increments `session_number`, inserts correct markdown header
- [ ] `parse-context` writes serialized context to `scene_context` front-matter key
- [ ] `wrapInCodeBlock: false` produces bare symbol lines without fences
- [ ] Lonelog commands show a clear notice and make no edits when Lonelog mode is inactive for the active note
