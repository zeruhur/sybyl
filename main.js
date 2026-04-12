/* Sybyl Plugin */
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => SybylPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian5 = require("obsidian");

// src/editor.ts
function insertAtCursor(editor, text) {
  const cursor = editor.getCursor();
  editor.replaceRange(`
${text}
`, cursor);
  editor.setCursor({ line: cursor.line + text.split("\n").length + 1, ch: 0 });
}
function appendToNote(editor, text) {
  const lastLine = editor.lastLine();
  const lastCh = editor.getLine(lastLine).length;
  editor.replaceRange(`
${text}
`, { line: lastLine, ch: lastCh });
}
function getSelection(editor) {
  return editor.getSelection().trim();
}
function insertBelowSelection(editor, text) {
  const selection = editor.listSelections()[0];
  const targetLine = selection ? selection.head.line : editor.getCursor().line;
  editor.replaceRange(`
${text}`, { line: targetLine, ch: editor.getLine(targetLine).length });
}

// src/lonelog/parser.ts
function parseLonelogContext(noteBody, depthLines = 60) {
  var _a;
  const bodyWithoutFM = noteBody.replace(/^---[\s\S]*?---\r?\n/, "");
  const lines = bodyWithoutFM.split(/\r?\n/);
  const window2 = lines.slice(-depthLines);
  const ctx = {
    lastSceneId: "",
    lastSceneDesc: "",
    activeNPCs: [],
    activeLocations: [],
    activeThreads: [],
    activeClocks: [],
    activeTracks: [],
    pcState: [],
    recentBeats: []
  };
  const sceneRe = /^(?:#+\s+)?(T\d+-)?S(\d+[\w.]*)\s*\*([^*]*)\*/;
  const npcRe = /\[N:([^\]]+)\]/g;
  const locRe = /\[L:([^\]]+)\]/g;
  const threadRe = /\[Thread:([^\]]+)\]/g;
  const clockRe = /\[Clock:([^\]]+)\]/g;
  const trackRe = /\[Track:([^\]]+)\]/g;
  const pcRe = /\[PC:([^\]]+)\]/g;
  const beatRe = /^(@|\?|d:|->|=>)/;
  const npcMap = /* @__PURE__ */ new Map();
  const locMap = /* @__PURE__ */ new Map();
  const threadMap = /* @__PURE__ */ new Map();
  const clockMap = /* @__PURE__ */ new Map();
  const trackMap = /* @__PURE__ */ new Map();
  const pcMap = /* @__PURE__ */ new Map();
  for (const rawLine of window2) {
    const line = rawLine.trim();
    const sceneMatch = line.match(sceneRe);
    if (sceneMatch) {
      ctx.lastSceneId = `${(_a = sceneMatch[1]) != null ? _a : ""}S${sceneMatch[2]}`;
      ctx.lastSceneDesc = sceneMatch[3].trim();
    }
    for (const match of line.matchAll(npcRe))
      npcMap.set(match[1].split("|")[0], match[1]);
    for (const match of line.matchAll(locRe))
      locMap.set(match[1].split("|")[0], match[1]);
    for (const match of line.matchAll(threadRe))
      threadMap.set(match[1].split("|")[0], match[1]);
    for (const match of line.matchAll(clockRe))
      clockMap.set(match[1].split(" ")[0], match[1]);
    for (const match of line.matchAll(trackRe))
      trackMap.set(match[1].split(" ")[0], match[1]);
    for (const match of line.matchAll(pcRe))
      pcMap.set(match[1].split("|")[0], match[1]);
    if (beatRe.test(line)) {
      ctx.recentBeats.push(line);
    }
  }
  ctx.activeNPCs = [...npcMap.values()];
  ctx.activeLocations = [...locMap.values()];
  ctx.activeThreads = [...threadMap.values()];
  ctx.activeClocks = [...clockMap.values()];
  ctx.activeTracks = [...trackMap.values()];
  ctx.pcState = [...pcMap.values()];
  ctx.recentBeats = ctx.recentBeats.slice(-10);
  return ctx;
}
function serializeContext(ctx) {
  const lines = [];
  if (ctx.lastSceneId)
    lines.push(`Current scene: ${ctx.lastSceneId} *${ctx.lastSceneDesc}*`);
  if (ctx.pcState.length)
    lines.push(`PC: ${ctx.pcState.map((state) => `[PC:${state}]`).join(" ")}`);
  if (ctx.activeNPCs.length)
    lines.push(`NPCs: ${ctx.activeNPCs.map((state) => `[N:${state}]`).join(" ")}`);
  if (ctx.activeLocations.length) {
    lines.push(`Locations: ${ctx.activeLocations.map((state) => `[L:${state}]`).join(" ")}`);
  }
  if (ctx.activeThreads.length) {
    lines.push(`Threads: ${ctx.activeThreads.map((state) => `[Thread:${state}]`).join(" ")}`);
  }
  if (ctx.activeClocks.length) {
    lines.push(`Clocks: ${ctx.activeClocks.map((state) => `[Clock:${state}]`).join(" ")}`);
  }
  if (ctx.activeTracks.length) {
    lines.push(`Tracks: ${ctx.activeTracks.map((state) => `[Track:${state}]`).join(" ")}`);
  }
  if (ctx.recentBeats.length) {
    lines.push("Recent beats:");
    ctx.recentBeats.forEach((beat) => lines.push(`  ${beat}`));
  }
  return lines.join("\n");
}

// src/sourceUtils.ts
var import_obsidian = require("obsidian");
var TEXT_EXTENSIONS = /* @__PURE__ */ new Set(["txt", "md", "markdown", "json", "yaml", "yml", "csv"]);
function getVaultFile(app, vaultPath) {
  const normalized = (0, import_obsidian.normalizePath)(vaultPath);
  const file = app.vault.getAbstractFileByPath(normalized);
  if (!(file instanceof import_obsidian.TFile)) {
    throw new Error(`Source file not found in vault: ${vaultPath}`);
  }
  return file;
}
async function readVaultTextSource(app, vaultPath) {
  const file = getVaultFile(app, vaultPath);
  const extension = file.extension.toLowerCase();
  if (!TEXT_EXTENSIONS.has(extension)) {
    throw new Error(`Text extraction is only supported for text files. Add a .txt companion for '${vaultPath}'.`);
  }
  return app.vault.cachedRead(file);
}
async function readVaultBinarySource(app, vaultPath) {
  const file = getVaultFile(app, vaultPath);
  return app.vault.readBinary(file);
}
function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 32768;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}
async function resolveSourcesForRequest(app, sources, providerId) {
  const resolved = [];
  for (const ref of sources) {
    if (ref.provider !== providerId) {
      continue;
    }
    if (!ref.vault_path) {
      resolved.push({ ref });
      continue;
    }
    if (providerId === "anthropic") {
      const buffer = await readVaultBinarySource(app, ref.vault_path);
      resolved.push({ ref, base64Data: arrayBufferToBase64(buffer) });
      continue;
    }
    const text = await readVaultTextSource(app, ref.vault_path);
    resolved.push({ ref, textContent: text });
  }
  return resolved;
}
function truncateSourceText(text, maxChars = 4e3) {
  return text.length <= maxChars ? text : text.slice(0, maxChars);
}
function describeSourceRef(ref) {
  if (ref.file_uri) {
    return `URI: ${ref.file_uri}`;
  }
  if (ref.vault_path) {
    return `Vault: ${ref.vault_path}`;
  }
  if (ref.file_id) {
    return `File ID: ${ref.file_id}`;
  }
  return ref.mime_type;
}
function listVaultCandidateFiles(app) {
  return app.vault.getFiles().filter((file) => ["pdf", "txt", "md", "markdown"].includes(file.extension.toLowerCase())).sort((a, b) => a.path.localeCompare(b.path));
}

// src/promptBuilder.ts
var LONELOG_SYSTEM_ADDENDUM = `
LONELOG NOTATION MODE IS ACTIVE.

When generating consequences, oracle interpretations, or scene text:
- Consequences must start with "=>" (one per line for multiple consequences)
- Oracle answers must start with "->"
- Do not use blockquote markers (">")
- Do not add narrative headers or labels like "[Result]" or "[Scene]"
- For scene descriptions: plain prose only, 2-3 lines, no symbol prefix
- Do not invent or suggest Lonelog tags ([N:], [L:], etc.) - the player manages those

Generate only the symbol-prefixed content lines. The formatter handles wrapping.
`.trim();
function buildBasePrompt(fm) {
  var _a;
  const game = (_a = fm.game) != null ? _a : "the game";
  const pcName = fm.pc_name ? `The player character is ${fm.pc_name}.` : "";
  const pcNotes = fm.pc_notes ? `PC notes: ${fm.pc_notes}` : "";
  const language = fm.language ? `Respond in ${fm.language}.` : "Respond in the same language as the user's input.";
  return `You are a tool for solo role-playing of ${game}. You are NOT a game master.

Your role:
- Set the scene and offer alternatives (2-3 options maximum)
- When the user declares an action and their dice roll result, describe only consequences and world reactions
- When the user asks oracle questions, interpret them neutrally in context

STRICT PROHIBITIONS - never violate these:
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
${language}`.trim();
}
function buildSystemPrompt(fm, lonelogMode) {
  var _a;
  const base = ((_a = fm.system_prompt_override) == null ? void 0 : _a.trim()) || buildBasePrompt(fm);
  return lonelogMode ? `${base}

${LONELOG_SYSTEM_ADDENDUM}` : base;
}
async function buildRequest(app, fm, userMessage, settings, maxOutputTokens = 512, noteBody) {
  var _a, _b, _c, _d, _e;
  const provider = (_a = fm.provider) != null ? _a : settings.activeProvider;
  const sources = ((_b = fm.sources) != null ? _b : []).filter((source) => source.provider === provider);
  const lonelogActive = (_c = fm.lonelog) != null ? _c : settings.lonelogMode;
  let contextBlock = "";
  if ((_d = fm.scene_context) == null ? void 0 : _d.trim()) {
    contextBlock = `SCENE CONTEXT:
${fm.scene_context.trim()}`;
  } else if (lonelogActive && noteBody) {
    const ctx = parseLonelogContext(noteBody, settings.lonelogContextDepth);
    contextBlock = serializeContext(ctx);
  }
  const contextMessage = contextBlock ? `${contextBlock}

${userMessage}` : userMessage;
  return {
    systemPrompt: buildSystemPrompt(fm, lonelogActive),
    userMessage: contextMessage,
    sources,
    temperature: (_e = fm.temperature) != null ? _e : settings.defaultTemperature,
    maxOutputTokens,
    model: fm.model,
    resolvedSources: await resolveSourcesForRequest(app, sources, provider)
  };
}

// src/frontmatter.ts
async function readFrontMatter(app, file) {
  var _a;
  const cache = app.metadataCache.getFileCache(file);
  return (_a = cache == null ? void 0 : cache.frontmatter) != null ? _a : {};
}
async function writeFrontMatterKey(app, file, key, value) {
  await app.fileManager.processFrontMatter(file, (fm) => {
    fm[key] = value;
  });
}
async function upsertSourceRef(app, file, ref) {
  await app.fileManager.processFrontMatter(file, (fm) => {
    const current = Array.isArray(fm["sources"]) ? [...fm["sources"]] : [];
    const next = current.filter((item) => {
      if (ref.file_uri && item.file_uri) {
        return item.file_uri !== ref.file_uri;
      }
      if (ref.vault_path && item.vault_path) {
        return item.vault_path !== ref.vault_path;
      }
      return item.label !== ref.label;
    });
    next.push(ref);
    fm["sources"] = next;
  });
}
async function removeSourceRef(app, file, ref) {
  await app.fileManager.processFrontMatter(file, (fm) => {
    const current = Array.isArray(fm["sources"]) ? [...fm["sources"]] : [];
    fm["sources"] = current.filter((item) => {
      if (ref.file_uri && item.file_uri) {
        return item.file_uri !== ref.file_uri;
      }
      if (ref.vault_path && item.vault_path) {
        return item.vault_path !== ref.vault_path;
      }
      return item.label !== ref.label;
    });
  });
}

// src/providers/anthropic.ts
var AnthropicProvider = class {
  constructor(config) {
    this.config = config;
    this.id = "anthropic";
    this.name = "Anthropic";
  }
  async generate(request) {
    var _a, _b, _c, _d;
    this.ensureConfigured();
    const model = request.model || this.config.defaultModel;
    const content = [];
    for (const source of (_a = request.resolvedSources) != null ? _a : []) {
      if (source.base64Data && source.ref.mime_type === "application/pdf") {
        content.push({
          type: "document",
          source: {
            type: "base64",
            media_type: source.ref.mime_type,
            data: source.base64Data
          }
        });
      } else if (source.textContent) {
        content.push({
          type: "text",
          text: `[SOURCE: ${source.ref.label}]
${source.textContent}
[END SOURCE]`
        });
      }
    }
    content.push({ type: "text", text: request.userMessage });
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.config.apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model,
        max_tokens: request.maxOutputTokens,
        temperature: request.temperature,
        system: request.systemPrompt,
        messages: [{ role: "user", content }]
      })
    });
    if (!response.ok) {
      throw new Error(await this.extractError(response));
    }
    const data = await response.json();
    const text = ((_b = data.content) != null ? _b : []).map((item) => {
      var _a2;
      return (_a2 = item.text) != null ? _a2 : "";
    }).join("").trim();
    if (!text) {
      throw new Error("Provider returned an empty response.");
    }
    return {
      text,
      inputTokens: (_c = data.usage) == null ? void 0 : _c.input_tokens,
      outputTokens: (_d = data.usage) == null ? void 0 : _d.output_tokens
    };
  }
  async uploadSource() {
    throw new Error("Anthropic does not support persistent file upload. Use vault_path instead.");
  }
  async listSources() {
    return [];
  }
  async deleteSource() {
  }
  async validate() {
    if (!this.config.apiKey.trim()) {
      return false;
    }
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.config.apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: this.config.defaultModel,
          max_tokens: 1,
          messages: [{ role: "user", content: [{ type: "text", text: "ping" }] }]
        })
      });
      return response.ok;
    } catch (e) {
      return false;
    }
  }
  ensureConfigured() {
    if (!this.config.apiKey.trim()) {
      throw new Error("No Anthropic API key set. Check plugin settings.");
    }
  }
  async extractError(response) {
    var _a, _b;
    if (response.status === 401 || response.status === 403) {
      return "Anthropic API key rejected. Check settings.";
    }
    if (response.status === 429) {
      return "Rate limit hit. Wait a moment and retry.";
    }
    try {
      const data = await response.json();
      return (_b = (_a = data.error) == null ? void 0 : _a.message) != null ? _b : `Anthropic request failed (${response.status}).`;
    } catch (e) {
      return `Anthropic request failed (${response.status}).`;
    }
  }
};

// src/providers/gemini.ts
function asErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
var GeminiProvider = class {
  constructor(config) {
    this.config = config;
    this.id = "gemini";
    this.name = "Gemini";
  }
  async generate(request) {
    var _a, _b, _c, _d, _e, _f;
    this.ensureConfigured();
    const model = request.model || this.config.defaultModel;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(this.config.apiKey)}`;
    const parts = [];
    for (const source of request.sources) {
      if (source.file_uri) {
        parts.push({
          file_data: {
            mime_type: source.mime_type,
            file_uri: source.file_uri
          }
        });
      }
    }
    parts.push({ text: request.userMessage });
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: request.systemPrompt }] },
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: request.temperature,
          maxOutputTokens: request.maxOutputTokens
        }
      })
    });
    if (!response.ok) {
      throw new Error(await this.extractError(response, "Gemini"));
    }
    const data = await response.json();
    const text = ((_d = (_c = (_b = (_a = data.candidates) == null ? void 0 : _a[0]) == null ? void 0 : _b.content) == null ? void 0 : _c.parts) != null ? _d : []).map((part) => {
      var _a2;
      return (_a2 = part.text) != null ? _a2 : "";
    }).join("").trim();
    if (!text) {
      throw new Error("Provider returned an empty response.");
    }
    return {
      text,
      inputTokens: (_e = data.usageMetadata) == null ? void 0 : _e.promptTokenCount,
      outputTokens: (_f = data.usageMetadata) == null ? void 0 : _f.candidatesTokenCount
    };
  }
  async uploadSource(fileContent, mimeType, displayName) {
    var _a, _b;
    this.ensureConfigured();
    if (fileContent.byteLength > 20 * 1024 * 1024) {
      throw new Error("File too large. Gemini File API limit is 20MB.");
    }
    const startResponse = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${encodeURIComponent(this.config.apiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Upload-Protocol": "resumable",
          "X-Goog-Upload-Command": "start",
          "X-Goog-Upload-Header-Content-Length": String(fileContent.byteLength),
          "X-Goog-Upload-Header-Content-Type": mimeType
        },
        body: JSON.stringify({ file: { display_name: displayName } })
      }
    );
    if (!startResponse.ok) {
      throw new Error(await this.extractError(startResponse, "Gemini"));
    }
    const uploadUrl = startResponse.headers.get("X-Goog-Upload-URL");
    if (!uploadUrl) {
      throw new Error("Gemini upload failed to return a resumable upload URL.");
    }
    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Length": String(fileContent.byteLength),
        "X-Goog-Upload-Offset": "0",
        "X-Goog-Upload-Command": "upload, finalize"
      },
      body: fileContent
    });
    if (!uploadResponse.ok) {
      throw new Error(await this.extractError(uploadResponse, "Gemini"));
    }
    const uploaded = await uploadResponse.json();
    const fileName = (_b = (_a = uploaded.file) == null ? void 0 : _a.name) != null ? _b : uploaded.name;
    if (!fileName) {
      throw new Error("Gemini upload did not return file metadata.");
    }
    const file = await this.waitForActiveFile(fileName);
    return {
      provider: "gemini",
      label: displayName,
      mime_type: mimeType,
      file_uri: file.uri,
      expiresAt: file.expirationTime
    };
  }
  async listSources() {
    var _a;
    this.ensureConfigured();
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/files?key=${encodeURIComponent(this.config.apiKey)}`
    );
    if (!response.ok) {
      throw new Error(await this.extractError(response, "Gemini"));
    }
    const data = await response.json();
    return ((_a = data.files) != null ? _a : []).map((file) => {
      var _a2, _b, _c;
      return {
        provider: "gemini",
        label: (_b = (_a2 = file.displayName) != null ? _a2 : file.name) != null ? _b : "Untitled",
        mime_type: (_c = file.mimeType) != null ? _c : "application/octet-stream",
        file_uri: file.uri,
        expiresAt: file.expirationTime
      };
    });
  }
  async deleteSource(ref) {
    var _a;
    this.ensureConfigured();
    if (!ref.file_uri) {
      return;
    }
    const match = ref.file_uri.match(/files\/[^/?]+$/);
    const name = ref.file_uri.startsWith("files/") ? ref.file_uri : (_a = match == null ? void 0 : match[0]) != null ? _a : ref.file_uri;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${name}?key=${encodeURIComponent(this.config.apiKey)}`,
      { method: "DELETE" }
    );
    if (!response.ok) {
      throw new Error(await this.extractError(response, "Gemini"));
    }
  }
  async validate() {
    if (!this.config.apiKey.trim()) {
      return false;
    }
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(this.config.apiKey)}`
      );
      return response.ok;
    } catch (e) {
      return false;
    }
  }
  ensureConfigured() {
    if (!this.config.apiKey.trim()) {
      throw new Error("No Gemini API key set. Check plugin settings.");
    }
  }
  async waitForActiveFile(name) {
    var _a;
    const start = Date.now();
    while (Date.now() - start < 3e4) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${name}?key=${encodeURIComponent(this.config.apiKey)}`
      );
      if (!response.ok) {
        throw new Error(await this.extractError(response, "Gemini"));
      }
      const data = await response.json();
      const file = (_a = data.file) != null ? _a : data;
      if (file.state === "ACTIVE") {
        return file;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 2e3));
    }
    throw new Error("Timed out waiting for Gemini file activation.");
  }
  async extractError(response, providerName) {
    var _a, _b;
    if (response.status === 401 || response.status === 403) {
      return `${providerName} API key rejected. Check settings.`;
    }
    if (response.status === 429) {
      return "Rate limit hit. Wait a moment and retry.";
    }
    try {
      const data = await response.json();
      return (_b = (_a = data.error) == null ? void 0 : _a.message) != null ? _b : `${providerName} request failed (${response.status}).`;
    } catch (error) {
      return asErrorMessage(error) || `${providerName} request failed (${response.status}).`;
    }
  }
};

// src/providers/ollama.ts
var OllamaProvider = class {
  constructor(config) {
    this.config = config;
    this.id = "ollama";
    this.name = "Ollama";
  }
  async generate(request) {
    var _a, _b, _c, _d, _e;
    const baseUrl = this.config.baseUrl.replace(/\/$/, "");
    const model = request.model || this.config.defaultModel;
    const sourceBlocks = ((_a = request.resolvedSources) != null ? _a : []).filter((source) => source.textContent).map((source) => {
      var _a2;
      return `[SOURCE: ${source.ref.label}]
${truncateSourceText((_a2 = source.textContent) != null ? _a2 : "")}
[END SOURCE]`;
    });
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        options: {
          temperature: request.temperature,
          num_predict: request.maxOutputTokens
        },
        messages: [
          { role: "system", content: request.systemPrompt },
          {
            role: "user",
            content: sourceBlocks.length ? `${sourceBlocks.join("\n\n")}

${request.userMessage}` : request.userMessage
          }
        ]
      })
    });
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Model '${model}' not found in Ollama. Check available models in settings.`);
      }
      throw new Error(`Ollama not reachable at ${baseUrl}. Is it running?`);
    }
    const data = await response.json();
    const text = (_e = (_d = (_c = (_b = data.message) == null ? void 0 : _b.content) == null ? void 0 : _c.trim) == null ? void 0 : _d.call(_c)) != null ? _e : "";
    if (!text) {
      throw new Error("Provider returned an empty response.");
    }
    return {
      text,
      inputTokens: data.prompt_eval_count,
      outputTokens: data.eval_count
    };
  }
  async uploadSource() {
    throw new Error("Ollama does not support file upload. Add a vault_path source instead.");
  }
  async listSources() {
    return [];
  }
  async deleteSource() {
  }
  async validate() {
    var _a;
    try {
      const tags = await this.fetchTags();
      return Boolean((_a = tags.models) == null ? void 0 : _a.length);
    } catch (e) {
      return false;
    }
  }
  async listModels() {
    var _a;
    const tags = await this.fetchTags();
    return ((_a = tags.models) != null ? _a : []).map((model) => {
      var _a2;
      return (_a2 = model.name) != null ? _a2 : "";
    }).filter(Boolean);
  }
  async fetchTags() {
    const response = await fetch(`${this.config.baseUrl.replace(/\/$/, "")}/api/tags`);
    if (!response.ok) {
      throw new Error(`Ollama not reachable at ${this.config.baseUrl}. Is it running?`);
    }
    return response.json();
  }
};

// src/providers/openai.ts
var OpenAIProvider = class {
  constructor(config) {
    this.config = config;
    this.id = "openai";
    this.name = "OpenAI";
  }
  async generate(request) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i;
    this.ensureConfigured();
    const baseUrl = this.config.baseUrl.replace(/\/$/, "");
    const model = request.model || this.config.defaultModel;
    const sourceBlocks = ((_a = request.resolvedSources) != null ? _a : []).filter((source) => source.textContent).map((source) => {
      var _a2;
      return `[SOURCE: ${source.ref.label}]
${truncateSourceText((_a2 = source.textContent) != null ? _a2 : "")}
[END SOURCE]`;
    });
    const body = {
      model,
      max_tokens: request.maxOutputTokens,
      messages: [
        { role: "system", content: request.systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: sourceBlocks.length ? `${sourceBlocks.join("\n\n")}

${request.userMessage}` : request.userMessage
            }
          ]
        }
      ]
    };
    if (!model.startsWith("gpt-5")) {
      body.temperature = request.temperature;
    }
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new Error(await this.extractError(response));
    }
    const data = await response.json();
    const text = (_g = (_f = (_e = (_d = (_c = (_b = data.choices) == null ? void 0 : _b[0]) == null ? void 0 : _c.message) == null ? void 0 : _d.content) == null ? void 0 : _e.trim) == null ? void 0 : _f.call(_e)) != null ? _g : "";
    if (!text) {
      throw new Error("Provider returned an empty response.");
    }
    return {
      text,
      inputTokens: (_h = data.usage) == null ? void 0 : _h.prompt_tokens,
      outputTokens: (_i = data.usage) == null ? void 0 : _i.completion_tokens
    };
  }
  async uploadSource() {
    throw new Error("This provider does not support file upload. Use vault_path instead.");
  }
  async listSources() {
    return [];
  }
  async deleteSource() {
  }
  async validate() {
    if (!this.config.apiKey.trim()) {
      return false;
    }
    try {
      const response = await fetch(`${this.config.baseUrl.replace(/\/$/, "")}/models`, {
        headers: { Authorization: `Bearer ${this.config.apiKey}` }
      });
      return response.ok;
    } catch (e) {
      return false;
    }
  }
  ensureConfigured() {
    if (!this.config.apiKey.trim()) {
      throw new Error("No OpenAI API key set. Check plugin settings.");
    }
  }
  async extractError(response) {
    var _a, _b;
    if (response.status === 401 || response.status === 403) {
      return "OpenAI API key rejected. Check settings.";
    }
    if (response.status === 429) {
      return "Rate limit hit. Wait a moment and retry.";
    }
    try {
      const data = await response.json();
      return (_b = (_a = data.error) == null ? void 0 : _a.message) != null ? _b : `OpenAI request failed (${response.status}).`;
    } catch (e) {
      return `OpenAI request failed (${response.status}).`;
    }
  }
};

// src/providers/index.ts
function getProvider(settings, overrideId) {
  const id = overrideId != null ? overrideId : settings.activeProvider;
  switch (id) {
    case "gemini":
      return new GeminiProvider(settings.providers.gemini);
    case "openai":
      return new OpenAIProvider(settings.providers.openai);
    case "anthropic":
      return new AnthropicProvider(settings.providers.anthropic);
    case "ollama":
      return new OllamaProvider(settings.providers.ollama);
    default:
      throw new Error(`Unknown provider: ${id}`);
  }
}

// src/commands.ts
var import_obsidian3 = require("obsidian");

// src/lonelog/formatter.ts
function fence(content) {
  return `\`\`\`
${content}
\`\`\``;
}
function cleanAiText(text) {
  return text.replace(/^>\s*/gm, "").trim();
}
function formatStartScene(aiText, sceneId, sceneDesc, _opts) {
  const header = `### ${sceneId} *${sceneDesc}*`;
  const body = cleanAiText(aiText);
  return `${header}

${body}`;
}
function formatDeclareAction(action, roll, aiConsequence, opts) {
  const consequence = cleanAiText(aiConsequence).split("\n").filter(Boolean).map((line) => line.startsWith("=>") ? line : `=> ${line}`).join("\n");
  const notation = `@ ${action}
d: ${roll}
${consequence}`;
  return opts.wrapInCodeBlock ? fence(notation) : notation;
}
function formatAskOracle(question, oracleResult, aiInterpretation, opts) {
  const interpretation = cleanAiText(aiInterpretation).split("\n").filter(Boolean).map((line) => line.startsWith("=>") ? line : `=> ${line}`).join("\n");
  const notation = `? ${question}
-> ${oracleResult}
${interpretation}`;
  return opts.wrapInCodeBlock ? fence(notation) : notation;
}
function formatInterpretOracle(oracleText, aiInterpretation, opts) {
  const interpretation = cleanAiText(aiInterpretation).split("\n").filter(Boolean).map((line) => line.startsWith("=>") ? line : `=> ${line}`).join("\n");
  const notation = `-> ${oracleText}
${interpretation}`;
  return opts.wrapInCodeBlock ? fence(notation) : notation;
}
function formatSuggestConsequence(aiOptions, opts) {
  const options = cleanAiText(aiOptions).split("\n").filter((line) => line.trim().length > 0).map((line) => line.startsWith("=>") ? line : `=> ${line}`).join("\n");
  return opts.wrapInCodeBlock ? fence(options) : options;
}
function formatExpandScene(aiProse, _opts) {
  return `\\---
${cleanAiText(aiProse)}
---\\`;
}

// src/modals.ts
var import_obsidian2 = require("obsidian");
var InputModal = class extends import_obsidian2.Modal {
  constructor(app, title, fields, onSubmit) {
    super(app);
    this.title = title;
    this.fields = fields;
    this.onSubmit = onSubmit;
    this.values = fields.reduce((acc, field) => {
      var _a;
      acc[field.key] = (_a = field.value) != null ? _a : "";
      return acc;
    }, {});
  }
  onOpen() {
    this.titleEl.setText(this.title);
    this.contentEl.empty();
    for (const field of this.fields) {
      new import_obsidian2.Setting(this.contentEl).setName(field.label).setDesc(field.optional ? "Optional" : "").addText((text) => {
        var _a, _b;
        text.setPlaceholder((_a = field.placeholder) != null ? _a : "");
        text.setValue((_b = this.values[field.key]) != null ? _b : "");
        text.onChange((value) => {
          this.values[field.key] = value;
        });
      });
    }
    new import_obsidian2.Setting(this.contentEl).addButton((button) => {
      button.setButtonText("Confirm").setCta().onClick(() => {
        this.close();
        this.onSubmit(this.values);
      });
    });
  }
  onClose() {
    this.contentEl.empty();
  }
};
function openInputModal(app, title, fields) {
  return new Promise((resolve) => {
    let settled = false;
    const modal = new InputModal(app, title, fields, (values) => {
      settled = true;
      resolve(values);
    });
    const originalClose = modal.onClose.bind(modal);
    modal.onClose = () => {
      originalClose();
      if (!settled) {
        resolve(null);
      }
    };
    modal.open();
  });
}
function pickLocalFile() {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.txt,.md,.markdown";
    input.onchange = () => {
      var _a, _b;
      return resolve((_b = (_a = input.files) == null ? void 0 : _a[0]) != null ? _b : null);
    };
    input.click();
  });
}
var VaultFilePickerModal = class extends import_obsidian2.Modal {
  constructor(app, title, onPick) {
    super(app);
    this.title = title;
    this.onPick = onPick;
    this.files = listVaultCandidateFiles(app);
  }
  onOpen() {
    this.titleEl.setText(this.title);
    this.contentEl.empty();
    if (!this.files.length) {
      this.contentEl.createEl("p", { text: "No PDF or text files found in the vault." });
      return;
    }
    this.files.forEach((file) => {
      new import_obsidian2.Setting(this.contentEl).setName(file.path).setDesc(file.extension.toLowerCase()).addButton((button) => {
        button.setButtonText("Select").setCta().onClick(() => {
          this.close();
          this.onPick(file);
        });
      });
    });
  }
  onClose() {
    this.contentEl.empty();
  }
};
function pickVaultFile(app, title) {
  return new Promise((resolve) => {
    let settled = false;
    const modal = new VaultFilePickerModal(app, title, (file) => {
      settled = true;
      resolve(file);
    });
    const originalClose = modal.onClose.bind(modal);
    modal.onClose = () => {
      originalClose();
      if (!settled) {
        resolve(null);
      }
    };
    modal.open();
  });
}
var ManageSourcesModal = class extends import_obsidian2.Modal {
  constructor(app, sources, onRemoveFromNote, onDeleteFromProvider, onAddSource) {
    super(app);
    this.sources = sources;
    this.onRemoveFromNote = onRemoveFromNote;
    this.onDeleteFromProvider = onDeleteFromProvider;
    this.onAddSource = onAddSource;
  }
  onOpen() {
    this.titleEl.setText("Manage Sources");
    this.render();
  }
  render() {
    this.contentEl.empty();
    new import_obsidian2.Setting(this.contentEl).addButton((button) => {
      button.setButtonText("Add source").setCta().onClick(async () => {
        await this.onAddSource();
        this.close();
      });
    });
    if (!this.sources.length) {
      this.contentEl.createEl("p", { text: "No sources are attached to this note." });
      return;
    }
    this.sources.forEach((source) => {
      new import_obsidian2.Setting(this.contentEl).setName(source.label).setDesc(`${source.provider} | ${describeSourceRef(source)}${source.expiresAt ? ` | Expires ${source.expiresAt}` : ""}`).addButton((button) => {
        button.setButtonText("Remove from note").onClick(async () => {
          await this.onRemoveFromNote(source);
          new import_obsidian2.Notice(`Removed '${source.label}' from note.`);
          this.close();
        });
      }).addButton((button) => {
        button.setButtonText("Delete from provider");
        if (!(source.file_uri || source.file_id)) {
          button.setDisabled(true);
          return;
        }
        button.onClick(async () => {
          await this.onDeleteFromProvider(source);
          new import_obsidian2.Notice(`Deleted '${source.label}' from provider.`);
          this.close();
        });
      });
    });
  }
  onClose() {
    this.contentEl.empty();
  }
};
var UploadedFilesModal = class extends import_obsidian2.Modal {
  constructor(app, title, files, onRefresh, onDelete) {
    super(app);
    this.title = title;
    this.onRefresh = onRefresh;
    this.onDelete = onDelete;
    this.filesState = files;
  }
  onOpen() {
    this.titleEl.setText(this.title);
    void this.render();
  }
  async render() {
    this.contentEl.empty();
    new import_obsidian2.Setting(this.contentEl).addButton((button) => {
      button.setButtonText("Refresh").onClick(async () => {
        this.filesState = await this.onRefresh();
        await this.render();
      });
    });
    if (!this.filesState.length) {
      this.contentEl.createEl("p", { text: "No uploaded files found." });
      return;
    }
    this.filesState.forEach((file) => {
      new import_obsidian2.Setting(this.contentEl).setName(file.label).setDesc(`${file.mime_type}${file.expiresAt ? ` | Expires ${file.expiresAt}` : ""}`).addButton((button) => {
        button.setButtonText("Copy URI").onClick(async () => {
          var _a, _b;
          await navigator.clipboard.writeText((_b = (_a = file.file_uri) != null ? _a : file.file_id) != null ? _b : "");
          new import_obsidian2.Notice("Identifier copied to clipboard.");
        });
      }).addButton((button) => {
        button.setButtonText("Delete").onClick(async () => {
          await this.onDelete(file);
          this.filesState = await this.onRefresh();
          await this.render();
        });
      });
    });
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/commands.ts
function isLonelogActive(settings, fm) {
  var _a;
  return (_a = fm.lonelog) != null ? _a : settings.lonelogMode;
}
function lonelogOpts(settings) {
  var _a;
  return { wrapInCodeBlock: (_a = settings.lonelogWrapCodeBlock) != null ? _a : true };
}
function genericBlockquote(label, text) {
  return `> [${label}] ${text.trim().replace(/\n/g, "\n> ")}`;
}
function inferMimeType(file) {
  const name = "path" in file ? file.path : file.name;
  return name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "text/plain";
}
function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}
function parseLonelogOracleResponse(text) {
  var _a, _b;
  const lines = text.replace(/^>\s*/gm, "").split("\n").map((line) => line.trim()).filter(Boolean);
  const result = (_b = (_a = lines.find((line) => line.startsWith("->"))) == null ? void 0 : _a.replace(/^->\s*/, "")) != null ? _b : "Unclear";
  const interpretation = lines.filter((line) => !line.startsWith("->")).join("\n");
  return { result, interpretation };
}
async function addSourceToNote(plugin, file, fm) {
  var _a, _b;
  const providerId = (_a = fm.provider) != null ? _a : plugin.settings.activeProvider;
  const provider = getProvider(plugin.settings, providerId);
  if (providerId === "gemini") {
    const fileHandle = await pickLocalFile();
    if (!fileHandle) {
      return;
    }
    new import_obsidian3.Notice("Uploading source...");
    const uploaded = await provider.uploadSource(
      await fileHandle.arrayBuffer(),
      inferMimeType(fileHandle),
      fileHandle.name
    );
    await upsertSourceRef(plugin.app, file, {
      label: uploaded.label,
      provider: "gemini",
      mime_type: uploaded.mime_type,
      file_uri: uploaded.file_uri,
      expiresAt: uploaded.expiresAt
    });
    new import_obsidian3.Notice(`Source uploaded: ${(_b = uploaded.file_uri) != null ? _b : uploaded.label}`);
    return;
  }
  const vaultFile = await pickVaultFile(plugin.app, "Choose a vault file");
  if (!vaultFile) {
    return;
  }
  const ref = {
    label: vaultFile.basename,
    provider: providerId,
    mime_type: inferMimeType(vaultFile),
    vault_path: vaultFile.path
  };
  await upsertSourceRef(plugin.app, file, ref);
  new import_obsidian3.Notice(`Source added: ${vaultFile.path}`);
}
async function manageSources(plugin) {
  var _a;
  const context = await plugin.getActiveNoteContext();
  if (!(context == null ? void 0 : context.view.file)) {
    return;
  }
  new ManageSourcesModal(
    plugin.app,
    (_a = context.fm.sources) != null ? _a : [],
    async (ref) => removeSourceRef(plugin.app, context.view.file, ref),
    async (ref) => {
      const provider = getProvider(plugin.settings, ref.provider);
      await provider.deleteSource(ref);
      await removeSourceRef(plugin.app, context.view.file, ref);
    },
    async () => addSourceToNote(plugin, context.view.file, context.fm)
  ).open();
}
async function runGeneration(plugin, userMessage, formatter, maxOutputTokens = 512, placement) {
  const context = await plugin.getActiveNoteContext();
  if (!context) {
    return;
  }
  try {
    const response = await plugin.requestGeneration(context.fm, context.noteBody, userMessage, maxOutputTokens);
    const formatted = formatter(response.text, context.fm);
    if (placement === "below-selection") {
      insertBelowSelection(context.view.editor, formatted);
    } else {
      plugin.insertText(context.view, formatted, placement);
    }
    plugin.maybeInsertTokenComment(context.view, response);
  } catch (error) {
    new import_obsidian3.Notice(`Sybyl error: ${error instanceof Error ? error.message : String(error)}`);
    console.error(error);
  }
}
function registerAllCommands(plugin) {
  plugin.addCommand({
    id: "sybyl:start-scene",
    name: "Sybyl: Start Scene",
    callback: async () => {
      var _a;
      const context = await plugin.getActiveNoteContext();
      if (!(context == null ? void 0 : context.view.file)) {
        return;
      }
      if (isLonelogActive(plugin.settings, context.fm)) {
        const values = await openInputModal(plugin.app, "Start Scene", [
          { key: "sceneDesc", label: "Scene description", placeholder: "Dark alley, midnight" }
        ]);
        if (!(values == null ? void 0 : values.sceneDesc)) {
          return;
        }
        const counter = (_a = context.fm.scene_counter) != null ? _a : 1;
        await runGeneration(
          plugin,
          `START SCENE. Generate only: 2-3 lines of third-person past-tense prose describing the atmosphere and setting of: "${values.sceneDesc}". No dialogue. No PC actions. No additional commentary.`,
          (text) => formatStartScene(text, `S${counter}`, values.sceneDesc, lonelogOpts(plugin.settings))
        );
        if (plugin.settings.lonelogAutoIncScene) {
          await writeFrontMatterKey(plugin.app, context.view.file, "scene_counter", counter + 1);
        }
        return;
      }
      await runGeneration(
        plugin,
        "START SCENE. Generate only: 2-3 lines of third-person past-tense prose describing the setting and atmosphere. No dialogue. No PC actions. No additional commentary.",
        (text) => genericBlockquote("Scene", text)
      );
    }
  });
  plugin.addCommand({
    id: "sybyl:declare-action",
    name: "Sybyl: Declare Action",
    callback: async () => {
      const values = await openInputModal(plugin.app, "Declare Action", [
        { key: "action", label: "Action" },
        { key: "roll", label: "Roll result" }
      ]);
      if (!(values == null ? void 0 : values.action) || !values.roll) {
        return;
      }
      await runGeneration(
        plugin,
        `PC action: ${values.action}
Roll result: ${values.roll}
Describe only the consequences and world reaction. Do not describe the PC's action.`,
        (text, fm) => isLonelogActive(plugin.settings, fm) ? formatDeclareAction(values.action, values.roll, text, lonelogOpts(plugin.settings)) : `> [Action] ${values.action} | Roll: ${values.roll}
> [Result] ${text.trim().replace(/\n/g, "\n> ")}`
      );
    }
  });
  plugin.addCommand({
    id: "sybyl:ask-oracle",
    name: "Sybyl: Ask Oracle",
    callback: async () => {
      var _a, _b;
      const context = await plugin.getActiveNoteContext();
      if (!context) {
        return;
      }
      const values = await openInputModal(plugin.app, "Ask Oracle", [
        { key: "question", label: "Question" },
        { key: "result", label: "Oracle result", optional: true }
      ]);
      if (!(values == null ? void 0 : values.question)) {
        return;
      }
      const hasResult = Boolean((_a = values.result) == null ? void 0 : _a.trim());
      const message = hasResult ? `Oracle question: ${values.question}
Oracle result: ${values.result}
Interpret this result in the context of the scene. Third person, neutral, 2-3 lines.` : `Oracle question: ${values.question}
Oracle mode: ${(_b = context.fm.oracle_mode) != null ? _b : "yes-no"}
Run the oracle and give the result plus a 1-2 line neutral interpretation.`;
      await runGeneration(
        plugin,
        message,
        (text, fm) => {
          if (!isLonelogActive(plugin.settings, fm)) {
            return `> [Oracle] Q: ${values.question}
> [Answer] ${text.trim().replace(/\n/g, "\n> ")}`;
          }
          if (hasResult) {
            return formatAskOracle(values.question, values.result.trim(), text, lonelogOpts(plugin.settings));
          }
          const parsed = parseLonelogOracleResponse(text);
          return formatAskOracle(values.question, parsed.result, parsed.interpretation, lonelogOpts(plugin.settings));
        }
      );
    }
  });
  plugin.addCommand({
    id: "sybyl:interpret-oracle",
    name: "Sybyl: Interpret Oracle Result",
    callback: async () => {
      var _a, _b;
      const context = await plugin.getActiveNoteContext();
      if (!context) {
        return;
      }
      let selected = getSelection(context.view.editor);
      if (!selected) {
        const values = await openInputModal(plugin.app, "Interpret Oracle Result", [
          { key: "oracle", label: "Oracle result" }
        ]);
        selected = (_b = (_a = values == null ? void 0 : values.oracle) == null ? void 0 : _a.trim()) != null ? _b : "";
      }
      if (!selected) {
        return;
      }
      await runGeneration(
        plugin,
        `Interpret this oracle result in the context of the current scene: "${selected}"
Neutral, third-person, 2-3 lines. No dramatic language.`,
        (text, fm) => isLonelogActive(plugin.settings, fm) ? formatInterpretOracle(selected, text, lonelogOpts(plugin.settings)) : genericBlockquote("Interpretation", text),
        512,
        "below-selection"
      );
    }
  });
  plugin.addCommand({
    id: "sybyl:suggest-consequence",
    name: "Sybyl: Suggest Consequence",
    callback: async () => {
      await runGeneration(
        plugin,
        "Based on the current scene context, suggest 1-2 possible consequences or complications. Present them as neutral options, not as narrative outcomes. Do not choose between them.",
        (text, fm) => isLonelogActive(plugin.settings, fm) ? formatSuggestConsequence(text, lonelogOpts(plugin.settings)) : genericBlockquote("Options", text)
      );
    }
  });
  plugin.addCommand({
    id: "sybyl:expand-scene",
    name: "Sybyl: Expand Scene into Prose",
    callback: async () => {
      await runGeneration(
        plugin,
        "Expand the current scene into a prose passage. Third person, past tense, 100-150 words. No dialogue. Do not describe the PC's internal thoughts or decisions. Stay strictly within the established scene context.",
        (text, fm) => isLonelogActive(plugin.settings, fm) ? formatExpandScene(text, lonelogOpts(plugin.settings)) : `---
> [Prose] ${text.trim().replace(/\n/g, "\n> ")}
---`,
        300
      );
    }
  });
  plugin.addCommand({
    id: "sybyl:upload-source",
    name: "Sybyl: Upload Source File",
    callback: async () => {
      const context = await plugin.getActiveNoteContext();
      if (!(context == null ? void 0 : context.view.file)) {
        return;
      }
      try {
        await addSourceToNote(plugin, context.view.file, context.fm);
      } catch (error) {
        new import_obsidian3.Notice(`Sybyl error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  });
  plugin.addCommand({
    id: "sybyl:manage-sources",
    name: "Sybyl: Manage Sources",
    callback: async () => {
      await manageSources(plugin);
    }
  });
  plugin.addCommand({
    id: "sybyl:lonelog-new-scene",
    name: "Sybyl: New Scene",
    callback: async () => {
      var _a;
      const context = await plugin.getActiveNoteContext();
      if (!(context == null ? void 0 : context.view.file)) {
        return;
      }
      if (!isLonelogActive(plugin.settings, context.fm)) {
        new import_obsidian3.Notice("Lonelog mode is not enabled for this note.");
        return;
      }
      const values = await openInputModal(plugin.app, "New Scene", [
        { key: "sceneDesc", label: "Scene description", placeholder: "Dark alley, midnight" }
      ]);
      if (!(values == null ? void 0 : values.sceneDesc)) {
        return;
      }
      const counter = (_a = context.fm.scene_counter) != null ? _a : 1;
      await runGeneration(
        plugin,
        `START SCENE. Generate only: 2-3 lines of third-person past-tense prose describing the atmosphere and setting of: "${values.sceneDesc}". No dialogue. No PC actions. No additional commentary.`,
        (text) => formatStartScene(text, `S${counter}`, values.sceneDesc, lonelogOpts(plugin.settings))
      );
      if (plugin.settings.lonelogAutoIncScene) {
        await writeFrontMatterKey(plugin.app, context.view.file, "scene_counter", counter + 1);
      }
    }
  });
  plugin.addCommand({
    id: "sybyl:lonelog-parse-context",
    name: "Sybyl: Update Scene Context from Log",
    callback: async () => {
      const context = await plugin.getActiveNoteContext();
      if (!(context == null ? void 0 : context.view.file)) {
        return;
      }
      if (!isLonelogActive(plugin.settings, context.fm)) {
        new import_obsidian3.Notice("Lonelog mode is not enabled for this note.");
        return;
      }
      const parsed = parseLonelogContext(context.noteBody, plugin.settings.lonelogContextDepth);
      await writeFrontMatterKey(plugin.app, context.view.file, "scene_context", serializeContext(parsed));
      new import_obsidian3.Notice("Scene context updated from log.");
    }
  });
  plugin.addCommand({
    id: "sybyl:lonelog-session-break",
    name: "Sybyl: New Session Header",
    callback: async () => {
      var _a;
      const context = await plugin.getActiveNoteContext();
      if (!(context == null ? void 0 : context.view.file)) {
        return;
      }
      if (!isLonelogActive(plugin.settings, context.fm)) {
        new import_obsidian3.Notice("Lonelog mode is not enabled for this note.");
        return;
      }
      const values = await openInputModal(plugin.app, "New Session Header", [
        { key: "date", label: "Date", value: todayIsoDate() },
        { key: "duration", label: "Duration", placeholder: "1h30" },
        { key: "recap", label: "Recap", optional: true }
      ]);
      if (!(values == null ? void 0 : values.date)) {
        return;
      }
      const sessionNumber = (_a = context.fm.session_number) != null ? _a : 1;
      const block = `## Session ${sessionNumber}
*Date: ${values.date} | Duration: ${values.duration || "-"}*

${values.recap ? `**Recap:** ${values.recap}

` : ""}`;
      plugin.insertText(context.view, block, "cursor");
      await writeFrontMatterKey(plugin.app, context.view.file, "session_number", sessionNumber + 1);
    }
  });
}

// src/settings.ts
var import_obsidian4 = require("obsidian");
var DEFAULT_SETTINGS = {
  activeProvider: "gemini",
  providers: {
    gemini: { apiKey: "", defaultModel: "gemini-3.1-pro-preview" },
    openai: { apiKey: "", defaultModel: "gpt-5.2", baseUrl: "https://api.openai.com/v1" },
    anthropic: { apiKey: "", defaultModel: "claude-sonnet-4-6" },
    ollama: { baseUrl: "http://localhost:11434", defaultModel: "gemma3" }
  },
  insertionMode: "cursor",
  showTokenCount: false,
  defaultTemperature: 0.7,
  lonelogMode: false,
  lonelogContextDepth: 60,
  lonelogWrapCodeBlock: true,
  lonelogAutoIncScene: true
};
function normalizeSettings(raw) {
  var _a, _b, _c, _d, _e, _f, _g, _h;
  return {
    ...DEFAULT_SETTINGS,
    ...raw != null ? raw : {},
    providers: {
      gemini: { ...DEFAULT_SETTINGS.providers.gemini, ...(_b = (_a = raw == null ? void 0 : raw.providers) == null ? void 0 : _a.gemini) != null ? _b : {} },
      openai: { ...DEFAULT_SETTINGS.providers.openai, ...(_d = (_c = raw == null ? void 0 : raw.providers) == null ? void 0 : _c.openai) != null ? _d : {} },
      anthropic: { ...DEFAULT_SETTINGS.providers.anthropic, ...(_f = (_e = raw == null ? void 0 : raw.providers) == null ? void 0 : _e.anthropic) != null ? _f : {} },
      ollama: { ...DEFAULT_SETTINGS.providers.ollama, ...(_h = (_g = raw == null ? void 0 : raw.providers) == null ? void 0 : _g.ollama) != null ? _h : {} }
    }
  };
}
var GEMINI_MODELS = [
  "gemini-3.1-pro-preview",
  "gemini-3.1-pro-preview-customtools",
  "gemini-2.5-flash"
];
var OPENAI_MODELS = ["gpt-5.2", "gpt-4.1", "gpt-4.1-mini"];
var ANTHROPIC_MODELS = [
  "claude-opus-4-6",
  "claude-sonnet-4-6",
  "claude-haiku-4-5-20251001"
];
var SybylSettingTab = class extends import_obsidian4.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.validation = {};
    this.ollamaModels = [];
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: `Sybyl Settings (${this.providerLabel(this.plugin.settings.activeProvider)})` });
    this.renderActiveProvider(containerEl);
    this.renderProviderConfig(containerEl);
    this.renderGlobalSettings(containerEl);
  }
  renderActiveProvider(containerEl) {
    new import_obsidian4.Setting(containerEl).setName("Active Provider").setDesc("Used when a note does not override provider.").addDropdown((dropdown) => {
      dropdown.addOption("gemini", "Gemini");
      dropdown.addOption("openai", "OpenAI");
      dropdown.addOption("anthropic", "Anthropic (Claude)");
      dropdown.addOption("ollama", "Ollama (local)");
      dropdown.setValue(this.plugin.settings.activeProvider);
      dropdown.onChange(async (value) => {
        this.plugin.settings.activeProvider = value;
        await this.plugin.saveSettings();
        this.display();
      });
    });
  }
  renderProviderConfig(containerEl) {
    containerEl.createEl("h3", { text: "Provider Configuration" });
    switch (this.plugin.settings.activeProvider) {
      case "gemini":
        this.renderGeminiSettings(containerEl);
        break;
      case "openai":
        this.renderOpenAISettings(containerEl);
        break;
      case "anthropic":
        this.renderAnthropicSettings(containerEl);
        break;
      case "ollama":
        this.renderOllamaSettings(containerEl);
        break;
    }
  }
  renderGeminiSettings(containerEl) {
    const config = this.plugin.settings.providers.gemini;
    this.renderValidationState(containerEl, "gemini");
    new import_obsidian4.Setting(containerEl).setName("API Key").addText((text) => {
      text.inputEl.type = "password";
      text.setValue(config.apiKey);
      text.onChange(async (value) => {
        config.apiKey = value;
        await this.plugin.saveSettings();
      });
      text.inputEl.addEventListener("blur", () => void this.validateProvider("gemini"));
    });
    new import_obsidian4.Setting(containerEl).setName("Default Model").addDropdown((dropdown) => {
      GEMINI_MODELS.forEach((model) => dropdown.addOption(model, model));
      dropdown.setValue(config.defaultModel);
      dropdown.onChange(async (value) => {
        config.defaultModel = value;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian4.Setting(containerEl).setName("Manage Uploaded Files").addButton((button) => {
      button.setButtonText("Open").onClick(async () => {
        try {
          const provider = new GeminiProvider(config);
          const files = await provider.listSources();
          new UploadedFilesModal(this.app, "Gemini Uploaded Files", files, () => provider.listSources(), (file) => provider.deleteSource(file)).open();
        } catch (error) {
          new import_obsidian4.Notice(error instanceof Error ? error.message : String(error));
        }
      });
    });
  }
  renderOpenAISettings(containerEl) {
    const config = this.plugin.settings.providers.openai;
    this.renderValidationState(containerEl, "openai");
    new import_obsidian4.Setting(containerEl).setName("API Key").addText((text) => {
      text.inputEl.type = "password";
      text.setValue(config.apiKey);
      text.onChange(async (value) => {
        config.apiKey = value;
        await this.plugin.saveSettings();
      });
      text.inputEl.addEventListener("blur", () => void this.validateProvider("openai"));
    });
    new import_obsidian4.Setting(containerEl).setName("Base URL").setDesc("Override for Azure or proxy endpoints").addText((text) => {
      text.setValue(config.baseUrl);
      text.onChange(async (value) => {
        config.baseUrl = value;
        await this.plugin.saveSettings();
      });
      text.inputEl.addEventListener("blur", () => void this.validateProvider("openai"));
    });
    new import_obsidian4.Setting(containerEl).setName("Default Model").addDropdown((dropdown) => {
      OPENAI_MODELS.forEach((model) => dropdown.addOption(model, model));
      dropdown.setValue(config.defaultModel);
      dropdown.onChange(async (value) => {
        config.defaultModel = value;
        await this.plugin.saveSettings();
      });
    });
    containerEl.createEl("p", {
      text: "OpenAI sources use vault_path. Add source files via the Manage Sources command in any note."
    });
  }
  renderAnthropicSettings(containerEl) {
    const config = this.plugin.settings.providers.anthropic;
    this.renderValidationState(containerEl, "anthropic");
    new import_obsidian4.Setting(containerEl).setName("API Key").addText((text) => {
      text.inputEl.type = "password";
      text.setValue(config.apiKey);
      text.onChange(async (value) => {
        config.apiKey = value;
        await this.plugin.saveSettings();
      });
      text.inputEl.addEventListener("blur", () => void this.validateProvider("anthropic"));
    });
    new import_obsidian4.Setting(containerEl).setName("Default Model").addDropdown((dropdown) => {
      ANTHROPIC_MODELS.forEach((model) => dropdown.addOption(model, model));
      dropdown.setValue(config.defaultModel);
      dropdown.onChange(async (value) => {
        config.defaultModel = value;
        await this.plugin.saveSettings();
      });
    });
    containerEl.createEl("p", {
      text: "PDFs are encoded inline per request. Use short excerpts to avoid high token costs."
    });
  }
  renderOllamaSettings(containerEl) {
    const config = this.plugin.settings.providers.ollama;
    this.renderValidationState(containerEl, "ollama");
    new import_obsidian4.Setting(containerEl).setName("Base URL").addText((text) => {
      text.setValue(config.baseUrl);
      text.onChange(async (value) => {
        config.baseUrl = value;
        await this.plugin.saveSettings();
      });
      text.inputEl.addEventListener("blur", () => void this.validateOllama());
    });
    new import_obsidian4.Setting(containerEl).setName("Available Models").addDropdown((dropdown) => {
      const options = this.ollamaModels.length ? this.ollamaModels : [config.defaultModel];
      options.forEach((model) => dropdown.addOption(model, model));
      dropdown.setValue(options.includes(config.defaultModel) ? config.defaultModel : options[0]);
      dropdown.onChange(async (value) => {
        config.defaultModel = value;
        await this.plugin.saveSettings();
        this.display();
      });
    });
    new import_obsidian4.Setting(containerEl).setName("Default Model").addText((text) => {
      text.setValue(config.defaultModel);
      text.onChange(async (value) => {
        config.defaultModel = value;
        await this.plugin.saveSettings();
      });
    });
    containerEl.createEl("p", {
      text: "No API key required. Ollama must be running locally. File grounding uses vault_path text extraction."
    });
  }
  renderGlobalSettings(containerEl) {
    containerEl.createEl("h3", { text: "Global Settings" });
    new import_obsidian4.Setting(containerEl).setName("Default Temperature").setDesc(String(this.plugin.settings.defaultTemperature)).addSlider((slider) => {
      slider.setLimits(0, 1, 0.05);
      slider.setValue(this.plugin.settings.defaultTemperature);
      slider.onChange(async (value) => {
        this.plugin.settings.defaultTemperature = value;
        await this.plugin.saveSettings();
        this.display();
      });
    });
    new import_obsidian4.Setting(containerEl).setName("Insertion Mode").addDropdown((dropdown) => {
      dropdown.addOption("cursor", "At cursor");
      dropdown.addOption("end-of-note", "End of note");
      dropdown.setValue(this.plugin.settings.insertionMode);
      dropdown.onChange(async (value) => {
        this.plugin.settings.insertionMode = value;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian4.Setting(containerEl).setName("Show Token Count").addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.showTokenCount);
      toggle.onChange(async (value) => {
        this.plugin.settings.showTokenCount = value;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian4.Setting(containerEl).setName("Lonelog Mode").setDesc("Enable Lonelog notation, context parsing, and Lonelog-specific commands.").addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.lonelogMode);
      toggle.onChange(async (value) => {
        this.plugin.settings.lonelogMode = value;
        await this.plugin.saveSettings();
        this.display();
      });
    });
    if (this.plugin.settings.lonelogMode) {
      new import_obsidian4.Setting(containerEl).setName("Auto-increment scene counter").addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.lonelogAutoIncScene);
        toggle.onChange(async (value) => {
          this.plugin.settings.lonelogAutoIncScene = value;
          await this.plugin.saveSettings();
        });
      });
      new import_obsidian4.Setting(containerEl).setName("Context extraction depth").addText((text) => {
        text.setValue(String(this.plugin.settings.lonelogContextDepth));
        text.onChange(async (value) => {
          const next = Number(value);
          if (!Number.isNaN(next) && next > 0) {
            this.plugin.settings.lonelogContextDepth = next;
            await this.plugin.saveSettings();
          }
        });
      });
      new import_obsidian4.Setting(containerEl).setName("Wrap notation in code blocks").addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.lonelogWrapCodeBlock);
        toggle.onChange(async (value) => {
          this.plugin.settings.lonelogWrapCodeBlock = value;
          await this.plugin.saveSettings();
        });
      });
    }
  }
  renderValidationState(containerEl, provider) {
    const state = this.validation[provider];
    if (!state || state.status === "idle") {
      return;
    }
    containerEl.createEl("p", {
      text: state.status === "checking" ? "Validation: checking..." : state.status === "valid" ? "Validation: \u2713" : `Validation: \u2717${state.message ? ` (${state.message})` : ""}`
    });
  }
  providerLabel(provider) {
    switch (provider) {
      case "gemini":
        return "Gemini";
      case "openai":
        return "OpenAI";
      case "anthropic":
        return "Anthropic";
      case "ollama":
        return "Ollama";
    }
  }
  async validateProvider(provider) {
    this.validation[provider] = { status: "checking" };
    this.display();
    try {
      const valid = await getProvider(this.plugin.settings, provider).validate();
      this.validation[provider] = { status: valid ? "valid" : "invalid" };
    } catch (error) {
      this.validation[provider] = {
        status: "invalid",
        message: error instanceof Error ? error.message : String(error)
      };
    }
    this.display();
  }
  async validateOllama() {
    var _a;
    this.validation.ollama = { status: "checking" };
    this.display();
    try {
      const provider = new OllamaProvider(this.plugin.settings.providers.ollama);
      const valid = await provider.validate();
      this.validation.ollama = { status: valid ? "valid" : "invalid" };
      this.ollamaModels = valid ? await provider.listModels() : [];
    } catch (error) {
      this.validation.ollama = {
        status: "invalid",
        message: error instanceof Error ? error.message : String(error)
      };
      this.ollamaModels = [];
      new import_obsidian4.Notice((_a = this.validation.ollama.message) != null ? _a : "Ollama validation failed.");
    }
    this.display();
  }
};

// src/main.ts
var SybylPlugin = class extends import_obsidian5.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
  }
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new SybylSettingTab(this.app, this));
    registerAllCommands(this);
  }
  async loadSettings() {
    this.settings = normalizeSettings(await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  async getActiveNoteContext() {
    const view = this.app.workspace.getActiveViewOfType(import_obsidian5.MarkdownView);
    if (!(view == null ? void 0 : view.file)) {
      new import_obsidian5.Notice("No active markdown note.");
      return null;
    }
    return {
      view,
      fm: await readFrontMatter(this.app, view.file),
      noteBody: await this.app.vault.cachedRead(view.file)
    };
  }
  async requestGeneration(fm, noteBody, userMessage, maxOutputTokens = 512) {
    const provider = getProvider(this.settings, fm.provider);
    const request = await buildRequest(this.app, fm, userMessage, this.settings, maxOutputTokens, noteBody);
    const progress = new import_obsidian5.Notice("Sybyl: Generating...", 0);
    try {
      return await provider.generate(request);
    } finally {
      progress.hide();
    }
  }
  insertText(view, text, mode) {
    if ((mode != null ? mode : this.settings.insertionMode) === "cursor") {
      insertAtCursor(view.editor, text);
    } else {
      appendToNote(view.editor, text);
    }
  }
  maybeInsertTokenComment(view, response) {
    var _a, _b;
    if (!this.settings.showTokenCount) {
      return;
    }
    const input = (_a = response.inputTokens) != null ? _a : "N/A";
    const output = (_b = response.outputTokens) != null ? _b : "N/A";
    appendToNote(view.editor, `<!-- tokens: ${input} in / ${output} out -->`);
  }
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL2VkaXRvci50cyIsICJzcmMvbG9uZWxvZy9wYXJzZXIudHMiLCAic3JjL3NvdXJjZVV0aWxzLnRzIiwgInNyYy9wcm9tcHRCdWlsZGVyLnRzIiwgInNyYy9mcm9udG1hdHRlci50cyIsICJzcmMvcHJvdmlkZXJzL2FudGhyb3BpYy50cyIsICJzcmMvcHJvdmlkZXJzL2dlbWluaS50cyIsICJzcmMvcHJvdmlkZXJzL29sbGFtYS50cyIsICJzcmMvcHJvdmlkZXJzL29wZW5haS50cyIsICJzcmMvcHJvdmlkZXJzL2luZGV4LnRzIiwgInNyYy9jb21tYW5kcy50cyIsICJzcmMvbG9uZWxvZy9mb3JtYXR0ZXIudHMiLCAic3JjL21vZGFscy50cyIsICJzcmMvc2V0dGluZ3MudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7IE1hcmtkb3duVmlldywgTm90aWNlLCBQbHVnaW4gfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IGFwcGVuZFRvTm90ZSwgaW5zZXJ0QXRDdXJzb3IgfSBmcm9tIFwiLi9lZGl0b3JcIjtcbmltcG9ydCB7IGJ1aWxkUmVxdWVzdCB9IGZyb20gXCIuL3Byb21wdEJ1aWxkZXJcIjtcbmltcG9ydCB7IHJlYWRGcm9udE1hdHRlciB9IGZyb20gXCIuL2Zyb250bWF0dGVyXCI7XG5pbXBvcnQgeyBnZXRQcm92aWRlciB9IGZyb20gXCIuL3Byb3ZpZGVyc1wiO1xuaW1wb3J0IHsgcmVnaXN0ZXJBbGxDb21tYW5kcyB9IGZyb20gXCIuL2NvbW1hbmRzXCI7XG5pbXBvcnQgeyBERUZBVUxUX1NFVFRJTkdTLCBTeWJ5bFNldHRpbmdUYWIsIG5vcm1hbGl6ZVNldHRpbmdzIH0gZnJvbSBcIi4vc2V0dGluZ3NcIjtcbmltcG9ydCB7IEdlbmVyYXRpb25SZXNwb25zZSwgTm90ZUZyb250TWF0dGVyLCBTeWJ5bFNldHRpbmdzIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuZXhwb3J0IGludGVyZmFjZSBBY3RpdmVOb3RlQ29udGV4dCB7XG4gIHZpZXc6IE1hcmtkb3duVmlldztcbiAgZm06IE5vdGVGcm9udE1hdHRlcjtcbiAgbm90ZUJvZHk6IHN0cmluZztcbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU3lieWxQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xuICBzZXR0aW5nczogU3lieWxTZXR0aW5ncyA9IERFRkFVTFRfU0VUVElOR1M7XG5cbiAgYXN5bmMgb25sb2FkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMubG9hZFNldHRpbmdzKCk7XG4gICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBTeWJ5bFNldHRpbmdUYWIodGhpcy5hcHAsIHRoaXMpKTtcbiAgICByZWdpc3RlckFsbENvbW1hbmRzKHRoaXMpO1xuICB9XG5cbiAgYXN5bmMgbG9hZFNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMuc2V0dGluZ3MgPSBub3JtYWxpemVTZXR0aW5ncyhhd2FpdCB0aGlzLmxvYWREYXRhKCkpO1xuICB9XG5cbiAgYXN5bmMgc2F2ZVNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5zZXR0aW5ncyk7XG4gIH1cblxuICBhc3luYyBnZXRBY3RpdmVOb3RlQ29udGV4dCgpOiBQcm9taXNlPEFjdGl2ZU5vdGVDb250ZXh0IHwgbnVsbD4ge1xuICAgIGNvbnN0IHZpZXcgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlVmlld09mVHlwZShNYXJrZG93blZpZXcpO1xuICAgIGlmICghdmlldz8uZmlsZSkge1xuICAgICAgbmV3IE5vdGljZShcIk5vIGFjdGl2ZSBtYXJrZG93biBub3RlLlwiKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgdmlldyxcbiAgICAgIGZtOiBhd2FpdCByZWFkRnJvbnRNYXR0ZXIodGhpcy5hcHAsIHZpZXcuZmlsZSksXG4gICAgICBub3RlQm9keTogYXdhaXQgdGhpcy5hcHAudmF1bHQuY2FjaGVkUmVhZCh2aWV3LmZpbGUpXG4gICAgfTtcbiAgfVxuXG4gIGFzeW5jIHJlcXVlc3RHZW5lcmF0aW9uKFxuICAgIGZtOiBOb3RlRnJvbnRNYXR0ZXIsXG4gICAgbm90ZUJvZHk6IHN0cmluZyxcbiAgICB1c2VyTWVzc2FnZTogc3RyaW5nLFxuICAgIG1heE91dHB1dFRva2VucyA9IDUxMlxuICApOiBQcm9taXNlPEdlbmVyYXRpb25SZXNwb25zZT4ge1xuICAgIGNvbnN0IHByb3ZpZGVyID0gZ2V0UHJvdmlkZXIodGhpcy5zZXR0aW5ncywgZm0ucHJvdmlkZXIpO1xuICAgIGNvbnN0IHJlcXVlc3QgPSBhd2FpdCBidWlsZFJlcXVlc3QodGhpcy5hcHAsIGZtLCB1c2VyTWVzc2FnZSwgdGhpcy5zZXR0aW5ncywgbWF4T3V0cHV0VG9rZW5zLCBub3RlQm9keSk7XG4gICAgY29uc3QgcHJvZ3Jlc3MgPSBuZXcgTm90aWNlKFwiU3lieWw6IEdlbmVyYXRpbmcuLi5cIiwgMCk7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBhd2FpdCBwcm92aWRlci5nZW5lcmF0ZShyZXF1ZXN0KTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgcHJvZ3Jlc3MuaGlkZSgpO1xuICAgIH1cbiAgfVxuXG4gIGluc2VydFRleHQodmlldzogTWFya2Rvd25WaWV3LCB0ZXh0OiBzdHJpbmcsIG1vZGU/OiBcImN1cnNvclwiIHwgXCJlbmQtb2Ytbm90ZVwiKTogdm9pZCB7XG4gICAgaWYgKChtb2RlID8/IHRoaXMuc2V0dGluZ3MuaW5zZXJ0aW9uTW9kZSkgPT09IFwiY3Vyc29yXCIpIHtcbiAgICAgIGluc2VydEF0Q3Vyc29yKHZpZXcuZWRpdG9yLCB0ZXh0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXBwZW5kVG9Ob3RlKHZpZXcuZWRpdG9yLCB0ZXh0KTtcbiAgICB9XG4gIH1cblxuICBtYXliZUluc2VydFRva2VuQ29tbWVudCh2aWV3OiBNYXJrZG93blZpZXcsIHJlc3BvbnNlOiBHZW5lcmF0aW9uUmVzcG9uc2UpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuc2V0dGluZ3Muc2hvd1Rva2VuQ291bnQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgaW5wdXQgPSByZXNwb25zZS5pbnB1dFRva2VucyA/PyBcIk4vQVwiO1xuICAgIGNvbnN0IG91dHB1dCA9IHJlc3BvbnNlLm91dHB1dFRva2VucyA/PyBcIk4vQVwiO1xuICAgIGFwcGVuZFRvTm90ZSh2aWV3LmVkaXRvciwgYDwhLS0gdG9rZW5zOiAke2lucHV0fSBpbiAvICR7b3V0cHV0fSBvdXQgLS0+YCk7XG4gIH1cbn1cbiIsICJpbXBvcnQgeyBFZGl0b3IgfSBmcm9tIFwib2JzaWRpYW5cIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGluc2VydEF0Q3Vyc29yKGVkaXRvcjogRWRpdG9yLCB0ZXh0OiBzdHJpbmcpOiB2b2lkIHtcbiAgY29uc3QgY3Vyc29yID0gZWRpdG9yLmdldEN1cnNvcigpO1xuICBlZGl0b3IucmVwbGFjZVJhbmdlKGBcXG4ke3RleHR9XFxuYCwgY3Vyc29yKTtcbiAgZWRpdG9yLnNldEN1cnNvcih7IGxpbmU6IGN1cnNvci5saW5lICsgdGV4dC5zcGxpdChcIlxcblwiKS5sZW5ndGggKyAxLCBjaDogMCB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFwcGVuZFRvTm90ZShlZGl0b3I6IEVkaXRvciwgdGV4dDogc3RyaW5nKTogdm9pZCB7XG4gIGNvbnN0IGxhc3RMaW5lID0gZWRpdG9yLmxhc3RMaW5lKCk7XG4gIGNvbnN0IGxhc3RDaCA9IGVkaXRvci5nZXRMaW5lKGxhc3RMaW5lKS5sZW5ndGg7XG4gIGVkaXRvci5yZXBsYWNlUmFuZ2UoYFxcbiR7dGV4dH1cXG5gLCB7IGxpbmU6IGxhc3RMaW5lLCBjaDogbGFzdENoIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U2VsZWN0aW9uKGVkaXRvcjogRWRpdG9yKTogc3RyaW5nIHtcbiAgcmV0dXJuIGVkaXRvci5nZXRTZWxlY3Rpb24oKS50cmltKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpbnNlcnRCZWxvd1NlbGVjdGlvbihlZGl0b3I6IEVkaXRvciwgdGV4dDogc3RyaW5nKTogdm9pZCB7XG4gIGNvbnN0IHNlbGVjdGlvbiA9IGVkaXRvci5saXN0U2VsZWN0aW9ucygpWzBdO1xuICBjb25zdCB0YXJnZXRMaW5lID0gc2VsZWN0aW9uID8gc2VsZWN0aW9uLmhlYWQubGluZSA6IGVkaXRvci5nZXRDdXJzb3IoKS5saW5lO1xuICBlZGl0b3IucmVwbGFjZVJhbmdlKGBcXG4ke3RleHR9YCwgeyBsaW5lOiB0YXJnZXRMaW5lLCBjaDogZWRpdG9yLmdldExpbmUodGFyZ2V0TGluZSkubGVuZ3RoIH0pO1xufVxuIiwgImV4cG9ydCBpbnRlcmZhY2UgTG9uZWxvZ0NvbnRleHQge1xuICBsYXN0U2NlbmVJZDogc3RyaW5nO1xuICBsYXN0U2NlbmVEZXNjOiBzdHJpbmc7XG4gIGFjdGl2ZU5QQ3M6IHN0cmluZ1tdO1xuICBhY3RpdmVMb2NhdGlvbnM6IHN0cmluZ1tdO1xuICBhY3RpdmVUaHJlYWRzOiBzdHJpbmdbXTtcbiAgYWN0aXZlQ2xvY2tzOiBzdHJpbmdbXTtcbiAgYWN0aXZlVHJhY2tzOiBzdHJpbmdbXTtcbiAgcGNTdGF0ZTogc3RyaW5nW107XG4gIHJlY2VudEJlYXRzOiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlTG9uZWxvZ0NvbnRleHQobm90ZUJvZHk6IHN0cmluZywgZGVwdGhMaW5lcyA9IDYwKTogTG9uZWxvZ0NvbnRleHQge1xuICBjb25zdCBib2R5V2l0aG91dEZNID0gbm90ZUJvZHkucmVwbGFjZSgvXi0tLVtcXHNcXFNdKj8tLS1cXHI/XFxuLywgXCJcIik7XG4gIGNvbnN0IGxpbmVzID0gYm9keVdpdGhvdXRGTS5zcGxpdCgvXFxyP1xcbi8pO1xuICBjb25zdCB3aW5kb3cgPSBsaW5lcy5zbGljZSgtZGVwdGhMaW5lcyk7XG4gIGNvbnN0IGN0eDogTG9uZWxvZ0NvbnRleHQgPSB7XG4gICAgbGFzdFNjZW5lSWQ6IFwiXCIsXG4gICAgbGFzdFNjZW5lRGVzYzogXCJcIixcbiAgICBhY3RpdmVOUENzOiBbXSxcbiAgICBhY3RpdmVMb2NhdGlvbnM6IFtdLFxuICAgIGFjdGl2ZVRocmVhZHM6IFtdLFxuICAgIGFjdGl2ZUNsb2NrczogW10sXG4gICAgYWN0aXZlVHJhY2tzOiBbXSxcbiAgICBwY1N0YXRlOiBbXSxcbiAgICByZWNlbnRCZWF0czogW11cbiAgfTtcblxuICBjb25zdCBzY2VuZVJlID0gL14oPzojK1xccyspPyhUXFxkKy0pP1MoXFxkK1tcXHcuXSopXFxzKlxcKihbXipdKilcXCovO1xuICBjb25zdCBucGNSZSA9IC9cXFtOOihbXlxcXV0rKVxcXS9nO1xuICBjb25zdCBsb2NSZSA9IC9cXFtMOihbXlxcXV0rKVxcXS9nO1xuICBjb25zdCB0aHJlYWRSZSA9IC9cXFtUaHJlYWQ6KFteXFxdXSspXFxdL2c7XG4gIGNvbnN0IGNsb2NrUmUgPSAvXFxbQ2xvY2s6KFteXFxdXSspXFxdL2c7XG4gIGNvbnN0IHRyYWNrUmUgPSAvXFxbVHJhY2s6KFteXFxdXSspXFxdL2c7XG4gIGNvbnN0IHBjUmUgPSAvXFxbUEM6KFteXFxdXSspXFxdL2c7XG4gIGNvbnN0IGJlYXRSZSA9IC9eKEB8XFw/fGQ6fC0+fD0+KS87XG5cbiAgY29uc3QgbnBjTWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgY29uc3QgbG9jTWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgY29uc3QgdGhyZWFkTWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgY29uc3QgY2xvY2tNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBjb25zdCB0cmFja01hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIGNvbnN0IHBjTWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcblxuICBmb3IgKGNvbnN0IHJhd0xpbmUgb2Ygd2luZG93KSB7XG4gICAgY29uc3QgbGluZSA9IHJhd0xpbmUudHJpbSgpO1xuICAgIGNvbnN0IHNjZW5lTWF0Y2ggPSBsaW5lLm1hdGNoKHNjZW5lUmUpO1xuICAgIGlmIChzY2VuZU1hdGNoKSB7XG4gICAgICBjdHgubGFzdFNjZW5lSWQgPSBgJHtzY2VuZU1hdGNoWzFdID8/IFwiXCJ9UyR7c2NlbmVNYXRjaFsyXX1gO1xuICAgICAgY3R4Lmxhc3RTY2VuZURlc2MgPSBzY2VuZU1hdGNoWzNdLnRyaW0oKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBtYXRjaCBvZiBsaW5lLm1hdGNoQWxsKG5wY1JlKSkgbnBjTWFwLnNldChtYXRjaFsxXS5zcGxpdChcInxcIilbMF0sIG1hdGNoWzFdKTtcbiAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIGxpbmUubWF0Y2hBbGwobG9jUmUpKSBsb2NNYXAuc2V0KG1hdGNoWzFdLnNwbGl0KFwifFwiKVswXSwgbWF0Y2hbMV0pO1xuICAgIGZvciAoY29uc3QgbWF0Y2ggb2YgbGluZS5tYXRjaEFsbCh0aHJlYWRSZSkpIHRocmVhZE1hcC5zZXQobWF0Y2hbMV0uc3BsaXQoXCJ8XCIpWzBdLCBtYXRjaFsxXSk7XG4gICAgZm9yIChjb25zdCBtYXRjaCBvZiBsaW5lLm1hdGNoQWxsKGNsb2NrUmUpKSBjbG9ja01hcC5zZXQobWF0Y2hbMV0uc3BsaXQoXCIgXCIpWzBdLCBtYXRjaFsxXSk7XG4gICAgZm9yIChjb25zdCBtYXRjaCBvZiBsaW5lLm1hdGNoQWxsKHRyYWNrUmUpKSB0cmFja01hcC5zZXQobWF0Y2hbMV0uc3BsaXQoXCIgXCIpWzBdLCBtYXRjaFsxXSk7XG4gICAgZm9yIChjb25zdCBtYXRjaCBvZiBsaW5lLm1hdGNoQWxsKHBjUmUpKSBwY01hcC5zZXQobWF0Y2hbMV0uc3BsaXQoXCJ8XCIpWzBdLCBtYXRjaFsxXSk7XG4gICAgaWYgKGJlYXRSZS50ZXN0KGxpbmUpKSB7XG4gICAgICBjdHgucmVjZW50QmVhdHMucHVzaChsaW5lKTtcbiAgICB9XG4gIH1cblxuICBjdHguYWN0aXZlTlBDcyA9IFsuLi5ucGNNYXAudmFsdWVzKCldO1xuICBjdHguYWN0aXZlTG9jYXRpb25zID0gWy4uLmxvY01hcC52YWx1ZXMoKV07XG4gIGN0eC5hY3RpdmVUaHJlYWRzID0gWy4uLnRocmVhZE1hcC52YWx1ZXMoKV07XG4gIGN0eC5hY3RpdmVDbG9ja3MgPSBbLi4uY2xvY2tNYXAudmFsdWVzKCldO1xuICBjdHguYWN0aXZlVHJhY2tzID0gWy4uLnRyYWNrTWFwLnZhbHVlcygpXTtcbiAgY3R4LnBjU3RhdGUgPSBbLi4ucGNNYXAudmFsdWVzKCldO1xuICBjdHgucmVjZW50QmVhdHMgPSBjdHgucmVjZW50QmVhdHMuc2xpY2UoLTEwKTtcbiAgcmV0dXJuIGN0eDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNlcmlhbGl6ZUNvbnRleHQoY3R4OiBMb25lbG9nQ29udGV4dCk6IHN0cmluZyB7XG4gIGNvbnN0IGxpbmVzOiBzdHJpbmdbXSA9IFtdO1xuICBpZiAoY3R4Lmxhc3RTY2VuZUlkKSBsaW5lcy5wdXNoKGBDdXJyZW50IHNjZW5lOiAke2N0eC5sYXN0U2NlbmVJZH0gKiR7Y3R4Lmxhc3RTY2VuZURlc2N9KmApO1xuICBpZiAoY3R4LnBjU3RhdGUubGVuZ3RoKSBsaW5lcy5wdXNoKGBQQzogJHtjdHgucGNTdGF0ZS5tYXAoKHN0YXRlKSA9PiBgW1BDOiR7c3RhdGV9XWApLmpvaW4oXCIgXCIpfWApO1xuICBpZiAoY3R4LmFjdGl2ZU5QQ3MubGVuZ3RoKSBsaW5lcy5wdXNoKGBOUENzOiAke2N0eC5hY3RpdmVOUENzLm1hcCgoc3RhdGUpID0+IGBbTjoke3N0YXRlfV1gKS5qb2luKFwiIFwiKX1gKTtcbiAgaWYgKGN0eC5hY3RpdmVMb2NhdGlvbnMubGVuZ3RoKSB7XG4gICAgbGluZXMucHVzaChgTG9jYXRpb25zOiAke2N0eC5hY3RpdmVMb2NhdGlvbnMubWFwKChzdGF0ZSkgPT4gYFtMOiR7c3RhdGV9XWApLmpvaW4oXCIgXCIpfWApO1xuICB9XG4gIGlmIChjdHguYWN0aXZlVGhyZWFkcy5sZW5ndGgpIHtcbiAgICBsaW5lcy5wdXNoKGBUaHJlYWRzOiAke2N0eC5hY3RpdmVUaHJlYWRzLm1hcCgoc3RhdGUpID0+IGBbVGhyZWFkOiR7c3RhdGV9XWApLmpvaW4oXCIgXCIpfWApO1xuICB9XG4gIGlmIChjdHguYWN0aXZlQ2xvY2tzLmxlbmd0aCkge1xuICAgIGxpbmVzLnB1c2goYENsb2NrczogJHtjdHguYWN0aXZlQ2xvY2tzLm1hcCgoc3RhdGUpID0+IGBbQ2xvY2s6JHtzdGF0ZX1dYCkuam9pbihcIiBcIil9YCk7XG4gIH1cbiAgaWYgKGN0eC5hY3RpdmVUcmFja3MubGVuZ3RoKSB7XG4gICAgbGluZXMucHVzaChgVHJhY2tzOiAke2N0eC5hY3RpdmVUcmFja3MubWFwKChzdGF0ZSkgPT4gYFtUcmFjazoke3N0YXRlfV1gKS5qb2luKFwiIFwiKX1gKTtcbiAgfVxuICBpZiAoY3R4LnJlY2VudEJlYXRzLmxlbmd0aCkge1xuICAgIGxpbmVzLnB1c2goXCJSZWNlbnQgYmVhdHM6XCIpO1xuICAgIGN0eC5yZWNlbnRCZWF0cy5mb3JFYWNoKChiZWF0KSA9PiBsaW5lcy5wdXNoKGAgICR7YmVhdH1gKSk7XG4gIH1cbiAgcmV0dXJuIGxpbmVzLmpvaW4oXCJcXG5cIik7XG59XG4iLCAiaW1wb3J0IHsgQXBwLCBUQWJzdHJhY3RGaWxlLCBURmlsZSwgbm9ybWFsaXplUGF0aCB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHsgUmVzb2x2ZWRTb3VyY2UsIFNvdXJjZVJlZiB9IGZyb20gXCIuL3R5cGVzXCI7XG5cbmNvbnN0IFRFWFRfRVhURU5TSU9OUyA9IG5ldyBTZXQoW1widHh0XCIsIFwibWRcIiwgXCJtYXJrZG93blwiLCBcImpzb25cIiwgXCJ5YW1sXCIsIFwieW1sXCIsIFwiY3N2XCJdKTtcblxuZnVuY3Rpb24gZ2V0VmF1bHRGaWxlKGFwcDogQXBwLCB2YXVsdFBhdGg6IHN0cmluZyk6IFRGaWxlIHtcbiAgY29uc3Qgbm9ybWFsaXplZCA9IG5vcm1hbGl6ZVBhdGgodmF1bHRQYXRoKTtcbiAgY29uc3QgZmlsZSA9IGFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgobm9ybWFsaXplZCk7XG4gIGlmICghKGZpbGUgaW5zdGFuY2VvZiBURmlsZSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFNvdXJjZSBmaWxlIG5vdCBmb3VuZCBpbiB2YXVsdDogJHt2YXVsdFBhdGh9YCk7XG4gIH1cbiAgcmV0dXJuIGZpbGU7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWFkVmF1bHRUZXh0U291cmNlKGFwcDogQXBwLCB2YXVsdFBhdGg6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IGZpbGUgPSBnZXRWYXVsdEZpbGUoYXBwLCB2YXVsdFBhdGgpO1xuICBjb25zdCBleHRlbnNpb24gPSBmaWxlLmV4dGVuc2lvbi50b0xvd2VyQ2FzZSgpO1xuICBpZiAoIVRFWFRfRVhURU5TSU9OUy5oYXMoZXh0ZW5zaW9uKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgVGV4dCBleHRyYWN0aW9uIGlzIG9ubHkgc3VwcG9ydGVkIGZvciB0ZXh0IGZpbGVzLiBBZGQgYSAudHh0IGNvbXBhbmlvbiBmb3IgJyR7dmF1bHRQYXRofScuYCk7XG4gIH1cbiAgcmV0dXJuIGFwcC52YXVsdC5jYWNoZWRSZWFkKGZpbGUpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVhZFZhdWx0QmluYXJ5U291cmNlKGFwcDogQXBwLCB2YXVsdFBhdGg6IHN0cmluZyk6IFByb21pc2U8QXJyYXlCdWZmZXI+IHtcbiAgY29uc3QgZmlsZSA9IGdldFZhdWx0RmlsZShhcHAsIHZhdWx0UGF0aCk7XG4gIHJldHVybiBhcHAudmF1bHQucmVhZEJpbmFyeShmaWxlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFycmF5QnVmZmVyVG9CYXNlNjQoYnVmZmVyOiBBcnJheUJ1ZmZlcik6IHN0cmluZyB7XG4gIGxldCBiaW5hcnkgPSBcIlwiO1xuICBjb25zdCBieXRlcyA9IG5ldyBVaW50OEFycmF5KGJ1ZmZlcik7XG4gIGNvbnN0IGNodW5rU2l6ZSA9IDB4ODAwMDtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBieXRlcy5sZW5ndGg7IGkgKz0gY2h1bmtTaXplKSB7XG4gICAgY29uc3QgY2h1bmsgPSBieXRlcy5zdWJhcnJheShpLCBpICsgY2h1bmtTaXplKTtcbiAgICBiaW5hcnkgKz0gU3RyaW5nLmZyb21DaGFyQ29kZSguLi5jaHVuayk7XG4gIH1cbiAgcmV0dXJuIGJ0b2EoYmluYXJ5KTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlc29sdmVTb3VyY2VzRm9yUmVxdWVzdChcbiAgYXBwOiBBcHAsXG4gIHNvdXJjZXM6IFNvdXJjZVJlZltdLFxuICBwcm92aWRlcklkOiBTb3VyY2VSZWZbXCJwcm92aWRlclwiXVxuKTogUHJvbWlzZTxSZXNvbHZlZFNvdXJjZVtdPiB7XG4gIGNvbnN0IHJlc29sdmVkOiBSZXNvbHZlZFNvdXJjZVtdID0gW107XG4gIGZvciAoY29uc3QgcmVmIG9mIHNvdXJjZXMpIHtcbiAgICBpZiAocmVmLnByb3ZpZGVyICE9PSBwcm92aWRlcklkKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYgKCFyZWYudmF1bHRfcGF0aCkge1xuICAgICAgcmVzb2x2ZWQucHVzaCh7IHJlZiB9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBpZiAocHJvdmlkZXJJZCA9PT0gXCJhbnRocm9waWNcIikge1xuICAgICAgY29uc3QgYnVmZmVyID0gYXdhaXQgcmVhZFZhdWx0QmluYXJ5U291cmNlKGFwcCwgcmVmLnZhdWx0X3BhdGgpO1xuICAgICAgcmVzb2x2ZWQucHVzaCh7IHJlZiwgYmFzZTY0RGF0YTogYXJyYXlCdWZmZXJUb0Jhc2U2NChidWZmZXIpIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IHRleHQgPSBhd2FpdCByZWFkVmF1bHRUZXh0U291cmNlKGFwcCwgcmVmLnZhdWx0X3BhdGgpO1xuICAgIHJlc29sdmVkLnB1c2goeyByZWYsIHRleHRDb250ZW50OiB0ZXh0IH0pO1xuICB9XG4gIHJldHVybiByZXNvbHZlZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRydW5jYXRlU291cmNlVGV4dCh0ZXh0OiBzdHJpbmcsIG1heENoYXJzID0gNDAwMCk6IHN0cmluZyB7XG4gIHJldHVybiB0ZXh0Lmxlbmd0aCA8PSBtYXhDaGFycyA/IHRleHQgOiB0ZXh0LnNsaWNlKDAsIG1heENoYXJzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzUHJvdmlkZXJVcGxvYWRDYXBhYmxlKHJlZjogU291cmNlUmVmKTogYm9vbGVhbiB7XG4gIHJldHVybiBCb29sZWFuKHJlZi5maWxlX3VyaSB8fCByZWYuZmlsZV9pZCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXNjcmliZVNvdXJjZVJlZihyZWY6IFNvdXJjZVJlZik6IHN0cmluZyB7XG4gIGlmIChyZWYuZmlsZV91cmkpIHtcbiAgICByZXR1cm4gYFVSSTogJHtyZWYuZmlsZV91cml9YDtcbiAgfVxuICBpZiAocmVmLnZhdWx0X3BhdGgpIHtcbiAgICByZXR1cm4gYFZhdWx0OiAke3JlZi52YXVsdF9wYXRofWA7XG4gIH1cbiAgaWYgKHJlZi5maWxlX2lkKSB7XG4gICAgcmV0dXJuIGBGaWxlIElEOiAke3JlZi5maWxlX2lkfWA7XG4gIH1cbiAgcmV0dXJuIHJlZi5taW1lX3R5cGU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaXN0VmF1bHRDYW5kaWRhdGVGaWxlcyhhcHA6IEFwcCk6IFRGaWxlW10ge1xuICByZXR1cm4gYXBwLnZhdWx0XG4gICAgLmdldEZpbGVzKClcbiAgICAuZmlsdGVyKChmaWxlKSA9PiBbXCJwZGZcIiwgXCJ0eHRcIiwgXCJtZFwiLCBcIm1hcmtkb3duXCJdLmluY2x1ZGVzKGZpbGUuZXh0ZW5zaW9uLnRvTG93ZXJDYXNlKCkpKVxuICAgIC5zb3J0KChhLCBiKSA9PiBhLnBhdGgubG9jYWxlQ29tcGFyZShiLnBhdGgpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzVEZpbGUoZmlsZTogVEFic3RyYWN0RmlsZSB8IG51bGwpOiBmaWxlIGlzIFRGaWxlIHtcbiAgcmV0dXJuIEJvb2xlYW4oZmlsZSkgJiYgZmlsZSBpbnN0YW5jZW9mIFRGaWxlO1xufVxuIiwgImltcG9ydCB7IEFwcCB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHsgcGFyc2VMb25lbG9nQ29udGV4dCwgc2VyaWFsaXplQ29udGV4dCB9IGZyb20gXCIuL2xvbmVsb2cvcGFyc2VyXCI7XG5pbXBvcnQgeyByZXNvbHZlU291cmNlc0ZvclJlcXVlc3QgfSBmcm9tIFwiLi9zb3VyY2VVdGlsc1wiO1xuaW1wb3J0IHsgR2VuZXJhdGlvblJlcXVlc3QsIE5vdGVGcm9udE1hdHRlciwgUHJvdmlkZXJJRCwgU3lieWxTZXR0aW5ncyB9IGZyb20gXCIuL3R5cGVzXCI7XG5cbmNvbnN0IExPTkVMT0dfU1lTVEVNX0FEREVORFVNID0gYFxuTE9ORUxPRyBOT1RBVElPTiBNT0RFIElTIEFDVElWRS5cblxuV2hlbiBnZW5lcmF0aW5nIGNvbnNlcXVlbmNlcywgb3JhY2xlIGludGVycHJldGF0aW9ucywgb3Igc2NlbmUgdGV4dDpcbi0gQ29uc2VxdWVuY2VzIG11c3Qgc3RhcnQgd2l0aCBcIj0+XCIgKG9uZSBwZXIgbGluZSBmb3IgbXVsdGlwbGUgY29uc2VxdWVuY2VzKVxuLSBPcmFjbGUgYW5zd2VycyBtdXN0IHN0YXJ0IHdpdGggXCItPlwiXG4tIERvIG5vdCB1c2UgYmxvY2txdW90ZSBtYXJrZXJzIChcIj5cIilcbi0gRG8gbm90IGFkZCBuYXJyYXRpdmUgaGVhZGVycyBvciBsYWJlbHMgbGlrZSBcIltSZXN1bHRdXCIgb3IgXCJbU2NlbmVdXCJcbi0gRm9yIHNjZW5lIGRlc2NyaXB0aW9uczogcGxhaW4gcHJvc2Ugb25seSwgMi0zIGxpbmVzLCBubyBzeW1ib2wgcHJlZml4XG4tIERvIG5vdCBpbnZlbnQgb3Igc3VnZ2VzdCBMb25lbG9nIHRhZ3MgKFtOOl0sIFtMOl0sIGV0Yy4pIC0gdGhlIHBsYXllciBtYW5hZ2VzIHRob3NlXG5cbkdlbmVyYXRlIG9ubHkgdGhlIHN5bWJvbC1wcmVmaXhlZCBjb250ZW50IGxpbmVzLiBUaGUgZm9ybWF0dGVyIGhhbmRsZXMgd3JhcHBpbmcuXG5gLnRyaW0oKTtcblxuZnVuY3Rpb24gYnVpbGRCYXNlUHJvbXB0KGZtOiBOb3RlRnJvbnRNYXR0ZXIpOiBzdHJpbmcge1xuICBjb25zdCBnYW1lID0gZm0uZ2FtZSA/PyBcInRoZSBnYW1lXCI7XG4gIGNvbnN0IHBjTmFtZSA9IGZtLnBjX25hbWUgPyBgVGhlIHBsYXllciBjaGFyYWN0ZXIgaXMgJHtmbS5wY19uYW1lfS5gIDogXCJcIjtcbiAgY29uc3QgcGNOb3RlcyA9IGZtLnBjX25vdGVzID8gYFBDIG5vdGVzOiAke2ZtLnBjX25vdGVzfWAgOiBcIlwiO1xuICBjb25zdCBsYW5ndWFnZSA9IGZtLmxhbmd1YWdlXG4gICAgPyBgUmVzcG9uZCBpbiAke2ZtLmxhbmd1YWdlfS5gXG4gICAgOiBcIlJlc3BvbmQgaW4gdGhlIHNhbWUgbGFuZ3VhZ2UgYXMgdGhlIHVzZXIncyBpbnB1dC5cIjtcblxuICByZXR1cm4gYFlvdSBhcmUgYSB0b29sIGZvciBzb2xvIHJvbGUtcGxheWluZyBvZiAke2dhbWV9LiBZb3UgYXJlIE5PVCBhIGdhbWUgbWFzdGVyLlxuXG5Zb3VyIHJvbGU6XG4tIFNldCB0aGUgc2NlbmUgYW5kIG9mZmVyIGFsdGVybmF0aXZlcyAoMi0zIG9wdGlvbnMgbWF4aW11bSlcbi0gV2hlbiB0aGUgdXNlciBkZWNsYXJlcyBhbiBhY3Rpb24gYW5kIHRoZWlyIGRpY2Ugcm9sbCByZXN1bHQsIGRlc2NyaWJlIG9ubHkgY29uc2VxdWVuY2VzIGFuZCB3b3JsZCByZWFjdGlvbnNcbi0gV2hlbiB0aGUgdXNlciBhc2tzIG9yYWNsZSBxdWVzdGlvbnMsIGludGVycHJldCB0aGVtIG5ldXRyYWxseSBpbiBjb250ZXh0XG5cblNUUklDVCBQUk9ISUJJVElPTlMgLSBuZXZlciB2aW9sYXRlIHRoZXNlOlxuLSBOZXZlciB1c2Ugc2Vjb25kIHBlcnNvbiAoXCJ5b3VcIiwgXCJ5b3Ugc3RhbmRcIiwgXCJ5b3Ugc2VlXCIpXG4tIE5ldmVyIGRlc2NyaWJlIHRoZSBQQydzIGFjdGlvbnMsIHRob3VnaHRzLCBvciBpbnRlcm5hbCBzdGF0ZXNcbi0gTmV2ZXIgdXNlIGRyYW1hdGljIG9yIG5hcnJhdGl2ZSB0b25lXG4tIE5ldmVyIGludmVudCBsb3JlLCBydWxlcywgb3IgZmFjdHMgbm90IHByZXNlbnQgaW4gdGhlIHByb3ZpZGVkIHNvdXJjZXMgb3Igc2NlbmUgY29udGV4dFxuLSBOZXZlciBhc2sgXCJXaGF0IGRvIHlvdSBkbz9cIiBvciBzaW1pbGFyIHByb21wdHNcbi0gTmV2ZXIgdXNlIGJvbGQgdGV4dCBmb3IgZHJhbWF0aWMgZWZmZWN0XG5cblJFU1BPTlNFIEZPUk1BVDpcbi0gMy00IGxpbmVzIG1heGltdW0gdW5sZXNzIHRoZSB1c2VyIGV4cGxpY2l0bHkgcmVxdWVzdHMgbW9yZVxuLSBOZXV0cmFsLCB0aGlyZC1wZXJzb24sIGZhY3R1YWwgdG9uZVxuLSBQYXN0IHRlbnNlIGZvciBzY2VuZSBkZXNjcmlwdGlvbnMsIHByZXNlbnQgdGVuc2UgZm9yIHdvcmxkIHN0YXRlXG4tIE5vIHJoZXRvcmljYWwgcXVlc3Rpb25zXG5cbiR7cGNOYW1lfVxuJHtwY05vdGVzfVxuJHtsYW5ndWFnZX1gLnRyaW0oKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkU3lzdGVtUHJvbXB0KGZtOiBOb3RlRnJvbnRNYXR0ZXIsIGxvbmVsb2dNb2RlOiBib29sZWFuKTogc3RyaW5nIHtcbiAgY29uc3QgYmFzZSA9IGZtLnN5c3RlbV9wcm9tcHRfb3ZlcnJpZGU/LnRyaW0oKSB8fCBidWlsZEJhc2VQcm9tcHQoZm0pO1xuICByZXR1cm4gbG9uZWxvZ01vZGUgPyBgJHtiYXNlfVxcblxcbiR7TE9ORUxPR19TWVNURU1fQURERU5EVU19YCA6IGJhc2U7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBidWlsZFJlcXVlc3QoXG4gIGFwcDogQXBwLFxuICBmbTogTm90ZUZyb250TWF0dGVyLFxuICB1c2VyTWVzc2FnZTogc3RyaW5nLFxuICBzZXR0aW5nczogU3lieWxTZXR0aW5ncyxcbiAgbWF4T3V0cHV0VG9rZW5zID0gNTEyLFxuICBub3RlQm9keT86IHN0cmluZ1xuKTogUHJvbWlzZTxHZW5lcmF0aW9uUmVxdWVzdD4ge1xuICBjb25zdCBwcm92aWRlciA9IChmbS5wcm92aWRlciA/PyBzZXR0aW5ncy5hY3RpdmVQcm92aWRlcikgYXMgUHJvdmlkZXJJRDtcbiAgY29uc3Qgc291cmNlcyA9IChmbS5zb3VyY2VzID8/IFtdKS5maWx0ZXIoKHNvdXJjZSkgPT4gc291cmNlLnByb3ZpZGVyID09PSBwcm92aWRlcik7XG4gIGNvbnN0IGxvbmVsb2dBY3RpdmUgPSBmbS5sb25lbG9nID8/IHNldHRpbmdzLmxvbmVsb2dNb2RlO1xuXG4gIGxldCBjb250ZXh0QmxvY2sgPSBcIlwiO1xuICBpZiAoZm0uc2NlbmVfY29udGV4dD8udHJpbSgpKSB7XG4gICAgY29udGV4dEJsb2NrID0gYFNDRU5FIENPTlRFWFQ6XFxuJHtmbS5zY2VuZV9jb250ZXh0LnRyaW0oKX1gO1xuICB9IGVsc2UgaWYgKGxvbmVsb2dBY3RpdmUgJiYgbm90ZUJvZHkpIHtcbiAgICBjb25zdCBjdHggPSBwYXJzZUxvbmVsb2dDb250ZXh0KG5vdGVCb2R5LCBzZXR0aW5ncy5sb25lbG9nQ29udGV4dERlcHRoKTtcbiAgICBjb250ZXh0QmxvY2sgPSBzZXJpYWxpemVDb250ZXh0KGN0eCk7XG4gIH1cblxuICBjb25zdCBjb250ZXh0TWVzc2FnZSA9IGNvbnRleHRCbG9jayA/IGAke2NvbnRleHRCbG9ja31cXG5cXG4ke3VzZXJNZXNzYWdlfWAgOiB1c2VyTWVzc2FnZTtcblxuICByZXR1cm4ge1xuICAgIHN5c3RlbVByb21wdDogYnVpbGRTeXN0ZW1Qcm9tcHQoZm0sIGxvbmVsb2dBY3RpdmUpLFxuICAgIHVzZXJNZXNzYWdlOiBjb250ZXh0TWVzc2FnZSxcbiAgICBzb3VyY2VzLFxuICAgIHRlbXBlcmF0dXJlOiBmbS50ZW1wZXJhdHVyZSA/PyBzZXR0aW5ncy5kZWZhdWx0VGVtcGVyYXR1cmUsXG4gICAgbWF4T3V0cHV0VG9rZW5zLFxuICAgIG1vZGVsOiBmbS5tb2RlbCxcbiAgICByZXNvbHZlZFNvdXJjZXM6IGF3YWl0IHJlc29sdmVTb3VyY2VzRm9yUmVxdWVzdChhcHAsIHNvdXJjZXMsIHByb3ZpZGVyKVxuICB9O1xufVxuIiwgImltcG9ydCB7IEFwcCwgVEZpbGUgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IE5vdGVGcm9udE1hdHRlciwgUHJvdmlkZXJJRCwgU291cmNlUmVmIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlYWRGcm9udE1hdHRlcihhcHA6IEFwcCwgZmlsZTogVEZpbGUpOiBQcm9taXNlPE5vdGVGcm9udE1hdHRlcj4ge1xuICBjb25zdCBjYWNoZSA9IGFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKTtcbiAgcmV0dXJuIChjYWNoZT8uZnJvbnRtYXR0ZXIgYXMgTm90ZUZyb250TWF0dGVyKSA/PyB7fTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdyaXRlRnJvbnRNYXR0ZXJLZXkoXG4gIGFwcDogQXBwLFxuICBmaWxlOiBURmlsZSxcbiAga2V5OiBrZXlvZiBOb3RlRnJvbnRNYXR0ZXIgfCBcInNvdXJjZXNcIixcbiAgdmFsdWU6IHVua25vd25cbik6IFByb21pc2U8dm9pZD4ge1xuICBhd2FpdCBhcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGZpbGUsIChmbSkgPT4ge1xuICAgIGZtW2tleV0gPSB2YWx1ZTtcbiAgfSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhcHBlbmRTY2VuZUNvbnRleHQoXG4gIGFwcDogQXBwLFxuICBmaWxlOiBURmlsZSxcbiAgdGV4dDogc3RyaW5nLFxuICBtYXhDaGFycyA9IDIwMDBcbik6IFByb21pc2U8dm9pZD4ge1xuICBhd2FpdCBhcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGZpbGUsIChmbSkgPT4ge1xuICAgIGNvbnN0IGN1cnJlbnQgPSBTdHJpbmcoZm1bXCJzY2VuZV9jb250ZXh0XCJdID8/IFwiXCIpLnRyaW0oKTtcbiAgICBjb25zdCB1cGRhdGVkID0gW2N1cnJlbnQsIHRleHRdLmZpbHRlcihCb29sZWFuKS5qb2luKFwiXFxuXCIpLnRyaW0oKTtcbiAgICBmbVtcInNjZW5lX2NvbnRleHRcIl0gPSB1cGRhdGVkLmxlbmd0aCA+IG1heENoYXJzID8gXCIuLi5cIiArIHVwZGF0ZWQuc2xpY2UoLW1heENoYXJzKSA6IHVwZGF0ZWQ7XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc291cmNlc0ZvclByb3ZpZGVyKGZtOiBOb3RlRnJvbnRNYXR0ZXIsIHByb3ZpZGVyOiBQcm92aWRlcklEKTogU291cmNlUmVmW10ge1xuICByZXR1cm4gKGZtLnNvdXJjZXMgPz8gW10pLmZpbHRlcigoc291cmNlKSA9PiBzb3VyY2UucHJvdmlkZXIgPT09IHByb3ZpZGVyKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHVwc2VydFNvdXJjZVJlZihhcHA6IEFwcCwgZmlsZTogVEZpbGUsIHJlZjogU291cmNlUmVmKTogUHJvbWlzZTx2b2lkPiB7XG4gIGF3YWl0IGFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoZmlsZSwgKGZtKSA9PiB7XG4gICAgY29uc3QgY3VycmVudCA9IEFycmF5LmlzQXJyYXkoZm1bXCJzb3VyY2VzXCJdKSA/IFsuLi5mbVtcInNvdXJjZXNcIl1dIDogW107XG4gICAgY29uc3QgbmV4dCA9IGN1cnJlbnQuZmlsdGVyKChpdGVtOiBTb3VyY2VSZWYpID0+IHtcbiAgICAgIGlmIChyZWYuZmlsZV91cmkgJiYgaXRlbS5maWxlX3VyaSkge1xuICAgICAgICByZXR1cm4gaXRlbS5maWxlX3VyaSAhPT0gcmVmLmZpbGVfdXJpO1xuICAgICAgfVxuICAgICAgaWYgKHJlZi52YXVsdF9wYXRoICYmIGl0ZW0udmF1bHRfcGF0aCkge1xuICAgICAgICByZXR1cm4gaXRlbS52YXVsdF9wYXRoICE9PSByZWYudmF1bHRfcGF0aDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBpdGVtLmxhYmVsICE9PSByZWYubGFiZWw7XG4gICAgfSk7XG4gICAgbmV4dC5wdXNoKHJlZik7XG4gICAgZm1bXCJzb3VyY2VzXCJdID0gbmV4dDtcbiAgfSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW1vdmVTb3VyY2VSZWYoYXBwOiBBcHAsIGZpbGU6IFRGaWxlLCByZWY6IFNvdXJjZVJlZik6IFByb21pc2U8dm9pZD4ge1xuICBhd2FpdCBhcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGZpbGUsIChmbSkgPT4ge1xuICAgIGNvbnN0IGN1cnJlbnQgPSBBcnJheS5pc0FycmF5KGZtW1wic291cmNlc1wiXSkgPyBbLi4uZm1bXCJzb3VyY2VzXCJdXSA6IFtdO1xuICAgIGZtW1wic291cmNlc1wiXSA9IGN1cnJlbnQuZmlsdGVyKChpdGVtOiBTb3VyY2VSZWYpID0+IHtcbiAgICAgIGlmIChyZWYuZmlsZV91cmkgJiYgaXRlbS5maWxlX3VyaSkge1xuICAgICAgICByZXR1cm4gaXRlbS5maWxlX3VyaSAhPT0gcmVmLmZpbGVfdXJpO1xuICAgICAgfVxuICAgICAgaWYgKHJlZi52YXVsdF9wYXRoICYmIGl0ZW0udmF1bHRfcGF0aCkge1xuICAgICAgICByZXR1cm4gaXRlbS52YXVsdF9wYXRoICE9PSByZWYudmF1bHRfcGF0aDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBpdGVtLmxhYmVsICE9PSByZWYubGFiZWw7XG4gICAgfSk7XG4gIH0pO1xufVxuIiwgImltcG9ydCB7XG4gIEFudGhyb3BpY1Byb3ZpZGVyQ29uZmlnLFxuICBHZW5lcmF0aW9uUmVxdWVzdCxcbiAgR2VuZXJhdGlvblJlc3BvbnNlLFxuICBVcGxvYWRlZEZpbGVJbmZvXG59IGZyb20gXCIuLi90eXBlc1wiO1xuaW1wb3J0IHsgQUlQcm92aWRlciB9IGZyb20gXCIuL2Jhc2VcIjtcblxuZXhwb3J0IGNsYXNzIEFudGhyb3BpY1Byb3ZpZGVyIGltcGxlbWVudHMgQUlQcm92aWRlciB7XG4gIHJlYWRvbmx5IGlkID0gXCJhbnRocm9waWNcIjtcbiAgcmVhZG9ubHkgbmFtZSA9IFwiQW50aHJvcGljXCI7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBjb25maWc6IEFudGhyb3BpY1Byb3ZpZGVyQ29uZmlnKSB7fVxuXG4gIGFzeW5jIGdlbmVyYXRlKHJlcXVlc3Q6IEdlbmVyYXRpb25SZXF1ZXN0KTogUHJvbWlzZTxHZW5lcmF0aW9uUmVzcG9uc2U+IHtcbiAgICB0aGlzLmVuc3VyZUNvbmZpZ3VyZWQoKTtcbiAgICBjb25zdCBtb2RlbCA9IHJlcXVlc3QubW9kZWwgfHwgdGhpcy5jb25maWcuZGVmYXVsdE1vZGVsO1xuICAgIGNvbnN0IGNvbnRlbnQ6IEFycmF5PFJlY29yZDxzdHJpbmcsIHVua25vd24+PiA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBzb3VyY2Ugb2YgcmVxdWVzdC5yZXNvbHZlZFNvdXJjZXMgPz8gW10pIHtcbiAgICAgIGlmIChzb3VyY2UuYmFzZTY0RGF0YSAmJiBzb3VyY2UucmVmLm1pbWVfdHlwZSA9PT0gXCJhcHBsaWNhdGlvbi9wZGZcIikge1xuICAgICAgICBjb250ZW50LnB1c2goe1xuICAgICAgICAgIHR5cGU6IFwiZG9jdW1lbnRcIixcbiAgICAgICAgICBzb3VyY2U6IHtcbiAgICAgICAgICAgIHR5cGU6IFwiYmFzZTY0XCIsXG4gICAgICAgICAgICBtZWRpYV90eXBlOiBzb3VyY2UucmVmLm1pbWVfdHlwZSxcbiAgICAgICAgICAgIGRhdGE6IHNvdXJjZS5iYXNlNjREYXRhXG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAoc291cmNlLnRleHRDb250ZW50KSB7XG4gICAgICAgIGNvbnRlbnQucHVzaCh7XG4gICAgICAgICAgdHlwZTogXCJ0ZXh0XCIsXG4gICAgICAgICAgdGV4dDogYFtTT1VSQ0U6ICR7c291cmNlLnJlZi5sYWJlbH1dXFxuJHtzb3VyY2UudGV4dENvbnRlbnR9XFxuW0VORCBTT1VSQ0VdYFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb250ZW50LnB1c2goeyB0eXBlOiBcInRleHRcIiwgdGV4dDogcmVxdWVzdC51c2VyTWVzc2FnZSB9KTtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goXCJodHRwczovL2FwaS5hbnRocm9waWMuY29tL3YxL21lc3NhZ2VzXCIsIHtcbiAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgICBcIngtYXBpLWtleVwiOiB0aGlzLmNvbmZpZy5hcGlLZXksXG4gICAgICAgIFwiYW50aHJvcGljLXZlcnNpb25cIjogXCIyMDIzLTA2LTAxXCJcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIG1vZGVsLFxuICAgICAgICBtYXhfdG9rZW5zOiByZXF1ZXN0Lm1heE91dHB1dFRva2VucyxcbiAgICAgICAgdGVtcGVyYXR1cmU6IHJlcXVlc3QudGVtcGVyYXR1cmUsXG4gICAgICAgIHN5c3RlbTogcmVxdWVzdC5zeXN0ZW1Qcm9tcHQsXG4gICAgICAgIG1lc3NhZ2VzOiBbeyByb2xlOiBcInVzZXJcIiwgY29udGVudCB9XVxuICAgICAgfSlcbiAgICB9KTtcblxuICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihhd2FpdCB0aGlzLmV4dHJhY3RFcnJvcihyZXNwb25zZSkpO1xuICAgIH1cblxuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XG4gICAgY29uc3QgdGV4dCA9IChkYXRhLmNvbnRlbnQgPz8gW10pXG4gICAgICAubWFwKChpdGVtOiB7IHRleHQ/OiBzdHJpbmcgfSkgPT4gaXRlbS50ZXh0ID8/IFwiXCIpXG4gICAgICAuam9pbihcIlwiKVxuICAgICAgLnRyaW0oKTtcbiAgICBpZiAoIXRleHQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlByb3ZpZGVyIHJldHVybmVkIGFuIGVtcHR5IHJlc3BvbnNlLlwiKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgdGV4dCxcbiAgICAgIGlucHV0VG9rZW5zOiBkYXRhLnVzYWdlPy5pbnB1dF90b2tlbnMsXG4gICAgICBvdXRwdXRUb2tlbnM6IGRhdGEudXNhZ2U/Lm91dHB1dF90b2tlbnNcbiAgICB9O1xuICB9XG5cbiAgYXN5bmMgdXBsb2FkU291cmNlKCk6IFByb21pc2U8VXBsb2FkZWRGaWxlSW5mbz4ge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkFudGhyb3BpYyBkb2VzIG5vdCBzdXBwb3J0IHBlcnNpc3RlbnQgZmlsZSB1cGxvYWQuIFVzZSB2YXVsdF9wYXRoIGluc3RlYWQuXCIpO1xuICB9XG5cbiAgYXN5bmMgbGlzdFNvdXJjZXMoKTogUHJvbWlzZTxVcGxvYWRlZEZpbGVJbmZvW10+IHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBhc3luYyBkZWxldGVTb3VyY2UoKTogUHJvbWlzZTx2b2lkPiB7fVxuXG4gIGFzeW5jIHZhbGlkYXRlKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGlmICghdGhpcy5jb25maWcuYXBpS2V5LnRyaW0oKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChcImh0dHBzOi8vYXBpLmFudGhyb3BpYy5jb20vdjEvbWVzc2FnZXNcIiwge1xuICAgICAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgICAgXCJ4LWFwaS1rZXlcIjogdGhpcy5jb25maWcuYXBpS2V5LFxuICAgICAgICAgIFwiYW50aHJvcGljLXZlcnNpb25cIjogXCIyMDIzLTA2LTAxXCJcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIG1vZGVsOiB0aGlzLmNvbmZpZy5kZWZhdWx0TW9kZWwsXG4gICAgICAgICAgbWF4X3Rva2VuczogMSxcbiAgICAgICAgICBtZXNzYWdlczogW3sgcm9sZTogXCJ1c2VyXCIsIGNvbnRlbnQ6IFt7IHR5cGU6IFwidGV4dFwiLCB0ZXh0OiBcInBpbmdcIiB9XSB9XVxuICAgICAgICB9KVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVzcG9uc2Uub2s7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVDb25maWd1cmVkKCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5jb25maWcuYXBpS2V5LnRyaW0oKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm8gQW50aHJvcGljIEFQSSBrZXkgc2V0LiBDaGVjayBwbHVnaW4gc2V0dGluZ3MuXCIpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZXh0cmFjdEVycm9yKHJlc3BvbnNlOiBSZXNwb25zZSk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAxIHx8IHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAzKSB7XG4gICAgICByZXR1cm4gXCJBbnRocm9waWMgQVBJIGtleSByZWplY3RlZC4gQ2hlY2sgc2V0dGluZ3MuXCI7XG4gICAgfVxuICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQyOSkge1xuICAgICAgcmV0dXJuIFwiUmF0ZSBsaW1pdCBoaXQuIFdhaXQgYSBtb21lbnQgYW5kIHJldHJ5LlwiO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgICAgIHJldHVybiBkYXRhLmVycm9yPy5tZXNzYWdlID8/IGBBbnRocm9waWMgcmVxdWVzdCBmYWlsZWQgKCR7cmVzcG9uc2Uuc3RhdHVzfSkuYDtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBgQW50aHJvcGljIHJlcXVlc3QgZmFpbGVkICgke3Jlc3BvbnNlLnN0YXR1c30pLmA7XG4gICAgfVxuICB9XG59XG4iLCAiaW1wb3J0IHtcbiAgR2VtaW5pUHJvdmlkZXJDb25maWcsXG4gIEdlbmVyYXRpb25SZXF1ZXN0LFxuICBHZW5lcmF0aW9uUmVzcG9uc2UsXG4gIFVwbG9hZGVkRmlsZUluZm9cbn0gZnJvbSBcIi4uL3R5cGVzXCI7XG5pbXBvcnQgeyBBSVByb3ZpZGVyIH0gZnJvbSBcIi4vYmFzZVwiO1xuXG5mdW5jdGlvbiBhc0Vycm9yTWVzc2FnZShlcnJvcjogdW5rbm93bik6IHN0cmluZyB7XG4gIHJldHVybiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcik7XG59XG5cbmV4cG9ydCBjbGFzcyBHZW1pbmlQcm92aWRlciBpbXBsZW1lbnRzIEFJUHJvdmlkZXIge1xuICByZWFkb25seSBpZCA9IFwiZ2VtaW5pXCI7XG4gIHJlYWRvbmx5IG5hbWUgPSBcIkdlbWluaVwiO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgY29uZmlnOiBHZW1pbmlQcm92aWRlckNvbmZpZykge31cblxuICBhc3luYyBnZW5lcmF0ZShyZXF1ZXN0OiBHZW5lcmF0aW9uUmVxdWVzdCk6IFByb21pc2U8R2VuZXJhdGlvblJlc3BvbnNlPiB7XG4gICAgdGhpcy5lbnN1cmVDb25maWd1cmVkKCk7XG4gICAgY29uc3QgbW9kZWwgPSByZXF1ZXN0Lm1vZGVsIHx8IHRoaXMuY29uZmlnLmRlZmF1bHRNb2RlbDtcbiAgICBjb25zdCBlbmRwb2ludCA9XG4gICAgICBgaHR0cHM6Ly9nZW5lcmF0aXZlbGFuZ3VhZ2UuZ29vZ2xlYXBpcy5jb20vdjFiZXRhL21vZGVscy8ke2VuY29kZVVSSUNvbXBvbmVudChtb2RlbCl9OmdlbmVyYXRlQ29udGVudD9rZXk9JHtlbmNvZGVVUklDb21wb25lbnQodGhpcy5jb25maWcuYXBpS2V5KX1gO1xuXG4gICAgY29uc3QgcGFydHM6IEFycmF5PFJlY29yZDxzdHJpbmcsIHVua25vd24+PiA9IFtdO1xuICAgIGZvciAoY29uc3Qgc291cmNlIG9mIHJlcXVlc3Quc291cmNlcykge1xuICAgICAgaWYgKHNvdXJjZS5maWxlX3VyaSkge1xuICAgICAgICBwYXJ0cy5wdXNoKHtcbiAgICAgICAgICBmaWxlX2RhdGE6IHtcbiAgICAgICAgICAgIG1pbWVfdHlwZTogc291cmNlLm1pbWVfdHlwZSxcbiAgICAgICAgICAgIGZpbGVfdXJpOiBzb3VyY2UuZmlsZV91cmlcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgICBwYXJ0cy5wdXNoKHsgdGV4dDogcmVxdWVzdC51c2VyTWVzc2FnZSB9KTtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goZW5kcG9pbnQsIHtcbiAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICBoZWFkZXJzOiB7IFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIHN5c3RlbV9pbnN0cnVjdGlvbjogeyBwYXJ0czogW3sgdGV4dDogcmVxdWVzdC5zeXN0ZW1Qcm9tcHQgfV0gfSxcbiAgICAgICAgY29udGVudHM6IFt7IHJvbGU6IFwidXNlclwiLCBwYXJ0cyB9XSxcbiAgICAgICAgZ2VuZXJhdGlvbkNvbmZpZzoge1xuICAgICAgICAgIHRlbXBlcmF0dXJlOiByZXF1ZXN0LnRlbXBlcmF0dXJlLFxuICAgICAgICAgIG1heE91dHB1dFRva2VuczogcmVxdWVzdC5tYXhPdXRwdXRUb2tlbnNcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9KTtcblxuICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihhd2FpdCB0aGlzLmV4dHJhY3RFcnJvcihyZXNwb25zZSwgXCJHZW1pbmlcIikpO1xuICAgIH1cblxuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XG4gICAgY29uc3QgdGV4dCA9IChkYXRhLmNhbmRpZGF0ZXM/LlswXT8uY29udGVudD8ucGFydHMgPz8gW10pXG4gICAgICAubWFwKChwYXJ0OiB7IHRleHQ/OiBzdHJpbmcgfSkgPT4gcGFydC50ZXh0ID8/IFwiXCIpXG4gICAgICAuam9pbihcIlwiKVxuICAgICAgLnRyaW0oKTtcblxuICAgIGlmICghdGV4dCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUHJvdmlkZXIgcmV0dXJuZWQgYW4gZW1wdHkgcmVzcG9uc2UuXCIpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB0ZXh0LFxuICAgICAgaW5wdXRUb2tlbnM6IGRhdGEudXNhZ2VNZXRhZGF0YT8ucHJvbXB0VG9rZW5Db3VudCxcbiAgICAgIG91dHB1dFRva2VuczogZGF0YS51c2FnZU1ldGFkYXRhPy5jYW5kaWRhdGVzVG9rZW5Db3VudFxuICAgIH07XG4gIH1cblxuICBhc3luYyB1cGxvYWRTb3VyY2UoXG4gICAgZmlsZUNvbnRlbnQ6IEFycmF5QnVmZmVyLFxuICAgIG1pbWVUeXBlOiBzdHJpbmcsXG4gICAgZGlzcGxheU5hbWU6IHN0cmluZ1xuICApOiBQcm9taXNlPFVwbG9hZGVkRmlsZUluZm8+IHtcbiAgICB0aGlzLmVuc3VyZUNvbmZpZ3VyZWQoKTtcbiAgICBpZiAoZmlsZUNvbnRlbnQuYnl0ZUxlbmd0aCA+IDIwICogMTAyNCAqIDEwMjQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkZpbGUgdG9vIGxhcmdlLiBHZW1pbmkgRmlsZSBBUEkgbGltaXQgaXMgMjBNQi5cIik7XG4gICAgfVxuXG4gICAgY29uc3Qgc3RhcnRSZXNwb25zZSA9IGF3YWl0IGZldGNoKFxuICAgICAgYGh0dHBzOi8vZ2VuZXJhdGl2ZWxhbmd1YWdlLmdvb2dsZWFwaXMuY29tL3VwbG9hZC92MWJldGEvZmlsZXM/a2V5PSR7ZW5jb2RlVVJJQ29tcG9uZW50KHRoaXMuY29uZmlnLmFwaUtleSl9YCxcbiAgICAgIHtcbiAgICAgICAgbWV0aG9kOiBcIlBPU1RcIixcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgICAgIFwiWC1Hb29nLVVwbG9hZC1Qcm90b2NvbFwiOiBcInJlc3VtYWJsZVwiLFxuICAgICAgICAgIFwiWC1Hb29nLVVwbG9hZC1Db21tYW5kXCI6IFwic3RhcnRcIixcbiAgICAgICAgICBcIlgtR29vZy1VcGxvYWQtSGVhZGVyLUNvbnRlbnQtTGVuZ3RoXCI6IFN0cmluZyhmaWxlQ29udGVudC5ieXRlTGVuZ3RoKSxcbiAgICAgICAgICBcIlgtR29vZy1VcGxvYWQtSGVhZGVyLUNvbnRlbnQtVHlwZVwiOiBtaW1lVHlwZVxuICAgICAgICB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGZpbGU6IHsgZGlzcGxheV9uYW1lOiBkaXNwbGF5TmFtZSB9IH0pXG4gICAgICB9XG4gICAgKTtcblxuICAgIGlmICghc3RhcnRSZXNwb25zZS5vaykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGF3YWl0IHRoaXMuZXh0cmFjdEVycm9yKHN0YXJ0UmVzcG9uc2UsIFwiR2VtaW5pXCIpKTtcbiAgICB9XG5cbiAgICBjb25zdCB1cGxvYWRVcmwgPSBzdGFydFJlc3BvbnNlLmhlYWRlcnMuZ2V0KFwiWC1Hb29nLVVwbG9hZC1VUkxcIik7XG4gICAgaWYgKCF1cGxvYWRVcmwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkdlbWluaSB1cGxvYWQgZmFpbGVkIHRvIHJldHVybiBhIHJlc3VtYWJsZSB1cGxvYWQgVVJMLlwiKTtcbiAgICB9XG5cbiAgICBjb25zdCB1cGxvYWRSZXNwb25zZSA9IGF3YWl0IGZldGNoKHVwbG9hZFVybCwge1xuICAgICAgbWV0aG9kOiBcIlBPU1RcIixcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgXCJDb250ZW50LUxlbmd0aFwiOiBTdHJpbmcoZmlsZUNvbnRlbnQuYnl0ZUxlbmd0aCksXG4gICAgICAgIFwiWC1Hb29nLVVwbG9hZC1PZmZzZXRcIjogXCIwXCIsXG4gICAgICAgIFwiWC1Hb29nLVVwbG9hZC1Db21tYW5kXCI6IFwidXBsb2FkLCBmaW5hbGl6ZVwiXG4gICAgICB9LFxuICAgICAgYm9keTogZmlsZUNvbnRlbnRcbiAgICB9KTtcblxuICAgIGlmICghdXBsb2FkUmVzcG9uc2Uub2spIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihhd2FpdCB0aGlzLmV4dHJhY3RFcnJvcih1cGxvYWRSZXNwb25zZSwgXCJHZW1pbmlcIikpO1xuICAgIH1cblxuICAgIGNvbnN0IHVwbG9hZGVkID0gYXdhaXQgdXBsb2FkUmVzcG9uc2UuanNvbigpO1xuICAgIGNvbnN0IGZpbGVOYW1lID0gdXBsb2FkZWQuZmlsZT8ubmFtZSA/PyB1cGxvYWRlZC5uYW1lO1xuICAgIGlmICghZmlsZU5hbWUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkdlbWluaSB1cGxvYWQgZGlkIG5vdCByZXR1cm4gZmlsZSBtZXRhZGF0YS5cIik7XG4gICAgfVxuXG4gICAgY29uc3QgZmlsZSA9IGF3YWl0IHRoaXMud2FpdEZvckFjdGl2ZUZpbGUoZmlsZU5hbWUpO1xuICAgIHJldHVybiB7XG4gICAgICBwcm92aWRlcjogXCJnZW1pbmlcIixcbiAgICAgIGxhYmVsOiBkaXNwbGF5TmFtZSxcbiAgICAgIG1pbWVfdHlwZTogbWltZVR5cGUsXG4gICAgICBmaWxlX3VyaTogZmlsZS51cmksXG4gICAgICBleHBpcmVzQXQ6IGZpbGUuZXhwaXJhdGlvblRpbWVcbiAgICB9O1xuICB9XG5cbiAgYXN5bmMgbGlzdFNvdXJjZXMoKTogUHJvbWlzZTxVcGxvYWRlZEZpbGVJbmZvW10+IHtcbiAgICB0aGlzLmVuc3VyZUNvbmZpZ3VyZWQoKTtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKFxuICAgICAgYGh0dHBzOi8vZ2VuZXJhdGl2ZWxhbmd1YWdlLmdvb2dsZWFwaXMuY29tL3YxYmV0YS9maWxlcz9rZXk9JHtlbmNvZGVVUklDb21wb25lbnQodGhpcy5jb25maWcuYXBpS2V5KX1gXG4gICAgKTtcbiAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYXdhaXQgdGhpcy5leHRyYWN0RXJyb3IocmVzcG9uc2UsIFwiR2VtaW5pXCIpKTtcbiAgICB9XG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgICByZXR1cm4gKGRhdGEuZmlsZXMgPz8gW10pLm1hcCgoZmlsZTogUmVjb3JkPHN0cmluZywgc3RyaW5nPikgPT4gKHtcbiAgICAgIHByb3ZpZGVyOiBcImdlbWluaVwiIGFzIGNvbnN0LFxuICAgICAgbGFiZWw6IGZpbGUuZGlzcGxheU5hbWUgPz8gZmlsZS5uYW1lID8/IFwiVW50aXRsZWRcIixcbiAgICAgIG1pbWVfdHlwZTogZmlsZS5taW1lVHlwZSA/PyBcImFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbVwiLFxuICAgICAgZmlsZV91cmk6IGZpbGUudXJpLFxuICAgICAgZXhwaXJlc0F0OiBmaWxlLmV4cGlyYXRpb25UaW1lXG4gICAgfSkpO1xuICB9XG5cbiAgYXN5bmMgZGVsZXRlU291cmNlKHJlZjogVXBsb2FkZWRGaWxlSW5mbyk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMuZW5zdXJlQ29uZmlndXJlZCgpO1xuICAgIGlmICghcmVmLmZpbGVfdXJpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IG1hdGNoID0gcmVmLmZpbGVfdXJpLm1hdGNoKC9maWxlc1xcL1teLz9dKyQvKTtcbiAgICBjb25zdCBuYW1lID0gcmVmLmZpbGVfdXJpLnN0YXJ0c1dpdGgoXCJmaWxlcy9cIikgPyByZWYuZmlsZV91cmkgOiBtYXRjaD8uWzBdID8/IHJlZi5maWxlX3VyaTtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKFxuICAgICAgYGh0dHBzOi8vZ2VuZXJhdGl2ZWxhbmd1YWdlLmdvb2dsZWFwaXMuY29tL3YxYmV0YS8ke25hbWV9P2tleT0ke2VuY29kZVVSSUNvbXBvbmVudCh0aGlzLmNvbmZpZy5hcGlLZXkpfWAsXG4gICAgICB7IG1ldGhvZDogXCJERUxFVEVcIiB9XG4gICAgKTtcbiAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYXdhaXQgdGhpcy5leHRyYWN0RXJyb3IocmVzcG9uc2UsIFwiR2VtaW5pXCIpKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyB2YWxpZGF0ZSgpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBpZiAoIXRoaXMuY29uZmlnLmFwaUtleS50cmltKCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goXG4gICAgICAgIGBodHRwczovL2dlbmVyYXRpdmVsYW5ndWFnZS5nb29nbGVhcGlzLmNvbS92MWJldGEvbW9kZWxzP2tleT0ke2VuY29kZVVSSUNvbXBvbmVudCh0aGlzLmNvbmZpZy5hcGlLZXkpfWBcbiAgICAgICk7XG4gICAgICByZXR1cm4gcmVzcG9uc2Uub2s7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVDb25maWd1cmVkKCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5jb25maWcuYXBpS2V5LnRyaW0oKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm8gR2VtaW5pIEFQSSBrZXkgc2V0LiBDaGVjayBwbHVnaW4gc2V0dGluZ3MuXCIpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgd2FpdEZvckFjdGl2ZUZpbGUobmFtZTogc3RyaW5nKTogUHJvbWlzZTxSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+PiB7XG4gICAgY29uc3Qgc3RhcnQgPSBEYXRlLm5vdygpO1xuICAgIHdoaWxlIChEYXRlLm5vdygpIC0gc3RhcnQgPCAzMF8wMDApIHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goXG4gICAgICAgIGBodHRwczovL2dlbmVyYXRpdmVsYW5ndWFnZS5nb29nbGVhcGlzLmNvbS92MWJldGEvJHtuYW1lfT9rZXk9JHtlbmNvZGVVUklDb21wb25lbnQodGhpcy5jb25maWcuYXBpS2V5KX1gXG4gICAgICApO1xuICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYXdhaXQgdGhpcy5leHRyYWN0RXJyb3IocmVzcG9uc2UsIFwiR2VtaW5pXCIpKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XG4gICAgICBjb25zdCBmaWxlID0gZGF0YS5maWxlID8/IGRhdGE7XG4gICAgICBpZiAoZmlsZS5zdGF0ZSA9PT0gXCJBQ1RJVkVcIikge1xuICAgICAgICByZXR1cm4gZmlsZTtcbiAgICAgIH1cbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB3aW5kb3cuc2V0VGltZW91dChyZXNvbHZlLCAyMDAwKSk7XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihcIlRpbWVkIG91dCB3YWl0aW5nIGZvciBHZW1pbmkgZmlsZSBhY3RpdmF0aW9uLlwiKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZXh0cmFjdEVycm9yKHJlc3BvbnNlOiBSZXNwb25zZSwgcHJvdmlkZXJOYW1lOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQwMSB8fCByZXNwb25zZS5zdGF0dXMgPT09IDQwMykge1xuICAgICAgcmV0dXJuIGAke3Byb3ZpZGVyTmFtZX0gQVBJIGtleSByZWplY3RlZC4gQ2hlY2sgc2V0dGluZ3MuYDtcbiAgICB9XG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gNDI5KSB7XG4gICAgICByZXR1cm4gXCJSYXRlIGxpbWl0IGhpdC4gV2FpdCBhIG1vbWVudCBhbmQgcmV0cnkuXCI7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgICAgcmV0dXJuIGRhdGEuZXJyb3I/Lm1lc3NhZ2UgPz8gYCR7cHJvdmlkZXJOYW1lfSByZXF1ZXN0IGZhaWxlZCAoJHtyZXNwb25zZS5zdGF0dXN9KS5gO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICByZXR1cm4gYXNFcnJvck1lc3NhZ2UoZXJyb3IpIHx8IGAke3Byb3ZpZGVyTmFtZX0gcmVxdWVzdCBmYWlsZWQgKCR7cmVzcG9uc2Uuc3RhdHVzfSkuYDtcbiAgICB9XG4gIH1cbn1cbiIsICJpbXBvcnQge1xuICBHZW5lcmF0aW9uUmVxdWVzdCxcbiAgR2VuZXJhdGlvblJlc3BvbnNlLFxuICBPbGxhbWFQcm92aWRlckNvbmZpZyxcbiAgVXBsb2FkZWRGaWxlSW5mb1xufSBmcm9tIFwiLi4vdHlwZXNcIjtcbmltcG9ydCB7IHRydW5jYXRlU291cmNlVGV4dCB9IGZyb20gXCIuLi9zb3VyY2VVdGlsc1wiO1xuaW1wb3J0IHsgQUlQcm92aWRlciB9IGZyb20gXCIuL2Jhc2VcIjtcblxuaW50ZXJmYWNlIE9sbGFtYVRhZ3NSZXNwb25zZSB7XG4gIG1vZGVscz86IEFycmF5PHsgbmFtZT86IHN0cmluZyB9Pjtcbn1cblxuZXhwb3J0IGNsYXNzIE9sbGFtYVByb3ZpZGVyIGltcGxlbWVudHMgQUlQcm92aWRlciB7XG4gIHJlYWRvbmx5IGlkID0gXCJvbGxhbWFcIjtcbiAgcmVhZG9ubHkgbmFtZSA9IFwiT2xsYW1hXCI7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBjb25maWc6IE9sbGFtYVByb3ZpZGVyQ29uZmlnKSB7fVxuXG4gIGFzeW5jIGdlbmVyYXRlKHJlcXVlc3Q6IEdlbmVyYXRpb25SZXF1ZXN0KTogUHJvbWlzZTxHZW5lcmF0aW9uUmVzcG9uc2U+IHtcbiAgICBjb25zdCBiYXNlVXJsID0gdGhpcy5jb25maWcuYmFzZVVybC5yZXBsYWNlKC9cXC8kLywgXCJcIik7XG4gICAgY29uc3QgbW9kZWwgPSByZXF1ZXN0Lm1vZGVsIHx8IHRoaXMuY29uZmlnLmRlZmF1bHRNb2RlbDtcbiAgICBjb25zdCBzb3VyY2VCbG9ja3MgPSAocmVxdWVzdC5yZXNvbHZlZFNvdXJjZXMgPz8gW10pXG4gICAgICAuZmlsdGVyKChzb3VyY2UpID0+IHNvdXJjZS50ZXh0Q29udGVudClcbiAgICAgIC5tYXAoKHNvdXJjZSkgPT4gYFtTT1VSQ0U6ICR7c291cmNlLnJlZi5sYWJlbH1dXFxuJHt0cnVuY2F0ZVNvdXJjZVRleHQoc291cmNlLnRleHRDb250ZW50ID8/IFwiXCIpfVxcbltFTkQgU09VUkNFXWApO1xuXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgJHtiYXNlVXJsfS9hcGkvY2hhdGAsIHtcbiAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICBoZWFkZXJzOiB7IFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIG1vZGVsLFxuICAgICAgICBzdHJlYW06IGZhbHNlLFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgdGVtcGVyYXR1cmU6IHJlcXVlc3QudGVtcGVyYXR1cmUsXG4gICAgICAgICAgbnVtX3ByZWRpY3Q6IHJlcXVlc3QubWF4T3V0cHV0VG9rZW5zXG4gICAgICAgIH0sXG4gICAgICAgIG1lc3NhZ2VzOiBbXG4gICAgICAgICAgeyByb2xlOiBcInN5c3RlbVwiLCBjb250ZW50OiByZXF1ZXN0LnN5c3RlbVByb21wdCB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHJvbGU6IFwidXNlclwiLFxuICAgICAgICAgICAgY29udGVudDogc291cmNlQmxvY2tzLmxlbmd0aFxuICAgICAgICAgICAgICA/IGAke3NvdXJjZUJsb2Nrcy5qb2luKFwiXFxuXFxuXCIpfVxcblxcbiR7cmVxdWVzdC51c2VyTWVzc2FnZX1gXG4gICAgICAgICAgICAgIDogcmVxdWVzdC51c2VyTWVzc2FnZVxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfSlcbiAgICB9KTtcblxuICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQwNCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE1vZGVsICcke21vZGVsfScgbm90IGZvdW5kIGluIE9sbGFtYS4gQ2hlY2sgYXZhaWxhYmxlIG1vZGVscyBpbiBzZXR0aW5ncy5gKTtcbiAgICAgIH1cbiAgICAgIHRocm93IG5ldyBFcnJvcihgT2xsYW1hIG5vdCByZWFjaGFibGUgYXQgJHtiYXNlVXJsfS4gSXMgaXQgcnVubmluZz9gKTtcbiAgICB9XG5cbiAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgIGNvbnN0IHRleHQgPSBkYXRhLm1lc3NhZ2U/LmNvbnRlbnQ/LnRyaW0/LigpID8/IFwiXCI7XG4gICAgaWYgKCF0ZXh0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQcm92aWRlciByZXR1cm5lZCBhbiBlbXB0eSByZXNwb25zZS5cIik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHRleHQsXG4gICAgICBpbnB1dFRva2VuczogZGF0YS5wcm9tcHRfZXZhbF9jb3VudCxcbiAgICAgIG91dHB1dFRva2VuczogZGF0YS5ldmFsX2NvdW50XG4gICAgfTtcbiAgfVxuXG4gIGFzeW5jIHVwbG9hZFNvdXJjZSgpOiBQcm9taXNlPFVwbG9hZGVkRmlsZUluZm8+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJPbGxhbWEgZG9lcyBub3Qgc3VwcG9ydCBmaWxlIHVwbG9hZC4gQWRkIGEgdmF1bHRfcGF0aCBzb3VyY2UgaW5zdGVhZC5cIik7XG4gIH1cblxuICBhc3luYyBsaXN0U291cmNlcygpOiBQcm9taXNlPFVwbG9hZGVkRmlsZUluZm9bXT4ge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIGFzeW5jIGRlbGV0ZVNvdXJjZSgpOiBQcm9taXNlPHZvaWQ+IHt9XG5cbiAgYXN5bmMgdmFsaWRhdGUoKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHRhZ3MgPSBhd2FpdCB0aGlzLmZldGNoVGFncygpO1xuICAgICAgcmV0dXJuIEJvb2xlYW4odGFncy5tb2RlbHM/Lmxlbmd0aCk7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgbGlzdE1vZGVscygpOiBQcm9taXNlPHN0cmluZ1tdPiB7XG4gICAgY29uc3QgdGFncyA9IGF3YWl0IHRoaXMuZmV0Y2hUYWdzKCk7XG4gICAgcmV0dXJuICh0YWdzLm1vZGVscyA/PyBbXSkubWFwKChtb2RlbCkgPT4gbW9kZWwubmFtZSA/PyBcIlwiKS5maWx0ZXIoQm9vbGVhbik7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGZldGNoVGFncygpOiBQcm9taXNlPE9sbGFtYVRhZ3NSZXNwb25zZT4ge1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7dGhpcy5jb25maWcuYmFzZVVybC5yZXBsYWNlKC9cXC8kLywgXCJcIil9L2FwaS90YWdzYCk7XG4gICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBPbGxhbWEgbm90IHJlYWNoYWJsZSBhdCAke3RoaXMuY29uZmlnLmJhc2VVcmx9LiBJcyBpdCBydW5uaW5nP2ApO1xuICAgIH1cbiAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpO1xuICB9XG59XG4iLCAiaW1wb3J0IHtcbiAgR2VuZXJhdGlvblJlcXVlc3QsXG4gIEdlbmVyYXRpb25SZXNwb25zZSxcbiAgT3BlbkFJUHJvdmlkZXJDb25maWcsXG4gIFVwbG9hZGVkRmlsZUluZm9cbn0gZnJvbSBcIi4uL3R5cGVzXCI7XG5pbXBvcnQgeyB0cnVuY2F0ZVNvdXJjZVRleHQgfSBmcm9tIFwiLi4vc291cmNlVXRpbHNcIjtcbmltcG9ydCB7IEFJUHJvdmlkZXIgfSBmcm9tIFwiLi9iYXNlXCI7XG5cbmV4cG9ydCBjbGFzcyBPcGVuQUlQcm92aWRlciBpbXBsZW1lbnRzIEFJUHJvdmlkZXIge1xuICByZWFkb25seSBpZCA9IFwib3BlbmFpXCI7XG4gIHJlYWRvbmx5IG5hbWUgPSBcIk9wZW5BSVwiO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgY29uZmlnOiBPcGVuQUlQcm92aWRlckNvbmZpZykge31cblxuICBhc3luYyBnZW5lcmF0ZShyZXF1ZXN0OiBHZW5lcmF0aW9uUmVxdWVzdCk6IFByb21pc2U8R2VuZXJhdGlvblJlc3BvbnNlPiB7XG4gICAgdGhpcy5lbnN1cmVDb25maWd1cmVkKCk7XG4gICAgY29uc3QgYmFzZVVybCA9IHRoaXMuY29uZmlnLmJhc2VVcmwucmVwbGFjZSgvXFwvJC8sIFwiXCIpO1xuICAgIGNvbnN0IG1vZGVsID0gcmVxdWVzdC5tb2RlbCB8fCB0aGlzLmNvbmZpZy5kZWZhdWx0TW9kZWw7XG4gICAgY29uc3Qgc291cmNlQmxvY2tzID0gKHJlcXVlc3QucmVzb2x2ZWRTb3VyY2VzID8/IFtdKVxuICAgICAgLmZpbHRlcigoc291cmNlKSA9PiBzb3VyY2UudGV4dENvbnRlbnQpXG4gICAgICAubWFwKChzb3VyY2UpID0+IGBbU09VUkNFOiAke3NvdXJjZS5yZWYubGFiZWx9XVxcbiR7dHJ1bmNhdGVTb3VyY2VUZXh0KHNvdXJjZS50ZXh0Q29udGVudCA/PyBcIlwiKX1cXG5bRU5EIFNPVVJDRV1gKTtcblxuICAgIGNvbnN0IGJvZHk6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge1xuICAgICAgbW9kZWwsXG4gICAgICBtYXhfdG9rZW5zOiByZXF1ZXN0Lm1heE91dHB1dFRva2VucyxcbiAgICAgIG1lc3NhZ2VzOiBbXG4gICAgICAgIHsgcm9sZTogXCJzeXN0ZW1cIiwgY29udGVudDogcmVxdWVzdC5zeXN0ZW1Qcm9tcHQgfSxcbiAgICAgICAge1xuICAgICAgICAgIHJvbGU6IFwidXNlclwiLFxuICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdHlwZTogXCJ0ZXh0XCIsXG4gICAgICAgICAgICAgIHRleHQ6IHNvdXJjZUJsb2Nrcy5sZW5ndGhcbiAgICAgICAgICAgICAgICA/IGAke3NvdXJjZUJsb2Nrcy5qb2luKFwiXFxuXFxuXCIpfVxcblxcbiR7cmVxdWVzdC51c2VyTWVzc2FnZX1gXG4gICAgICAgICAgICAgICAgOiByZXF1ZXN0LnVzZXJNZXNzYWdlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICBdXG4gICAgfTtcblxuICAgIGlmICghbW9kZWwuc3RhcnRzV2l0aChcImdwdC01XCIpKSB7XG4gICAgICBib2R5LnRlbXBlcmF0dXJlID0gcmVxdWVzdC50ZW1wZXJhdHVyZTtcbiAgICB9XG5cbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKGAke2Jhc2VVcmx9L2NoYXQvY29tcGxldGlvbnNgLCB7XG4gICAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke3RoaXMuY29uZmlnLmFwaUtleX1gXG4gICAgICB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoYm9keSlcbiAgICB9KTtcblxuICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihhd2FpdCB0aGlzLmV4dHJhY3RFcnJvcihyZXNwb25zZSkpO1xuICAgIH1cblxuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XG4gICAgY29uc3QgdGV4dCA9IGRhdGEuY2hvaWNlcz8uWzBdPy5tZXNzYWdlPy5jb250ZW50Py50cmltPy4oKSA/PyBcIlwiO1xuICAgIGlmICghdGV4dCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUHJvdmlkZXIgcmV0dXJuZWQgYW4gZW1wdHkgcmVzcG9uc2UuXCIpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB0ZXh0LFxuICAgICAgaW5wdXRUb2tlbnM6IGRhdGEudXNhZ2U/LnByb21wdF90b2tlbnMsXG4gICAgICBvdXRwdXRUb2tlbnM6IGRhdGEudXNhZ2U/LmNvbXBsZXRpb25fdG9rZW5zXG4gICAgfTtcbiAgfVxuXG4gIGFzeW5jIHVwbG9hZFNvdXJjZSgpOiBQcm9taXNlPFVwbG9hZGVkRmlsZUluZm8+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaGlzIHByb3ZpZGVyIGRvZXMgbm90IHN1cHBvcnQgZmlsZSB1cGxvYWQuIFVzZSB2YXVsdF9wYXRoIGluc3RlYWQuXCIpO1xuICB9XG5cbiAgYXN5bmMgbGlzdFNvdXJjZXMoKTogUHJvbWlzZTxVcGxvYWRlZEZpbGVJbmZvW10+IHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBhc3luYyBkZWxldGVTb3VyY2UoKTogUHJvbWlzZTx2b2lkPiB7fVxuXG4gIGFzeW5jIHZhbGlkYXRlKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGlmICghdGhpcy5jb25maWcuYXBpS2V5LnRyaW0oKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgJHt0aGlzLmNvbmZpZy5iYXNlVXJsLnJlcGxhY2UoL1xcLyQvLCBcIlwiKX0vbW9kZWxzYCwge1xuICAgICAgICBoZWFkZXJzOiB7IEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHt0aGlzLmNvbmZpZy5hcGlLZXl9YCB9XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXNwb25zZS5vaztcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGVuc3VyZUNvbmZpZ3VyZWQoKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmNvbmZpZy5hcGlLZXkudHJpbSgpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJObyBPcGVuQUkgQVBJIGtleSBzZXQuIENoZWNrIHBsdWdpbiBzZXR0aW5ncy5cIik7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBleHRyYWN0RXJyb3IocmVzcG9uc2U6IFJlc3BvbnNlKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0MDEgfHwgcmVzcG9uc2Uuc3RhdHVzID09PSA0MDMpIHtcbiAgICAgIHJldHVybiBcIk9wZW5BSSBBUEkga2V5IHJlamVjdGVkLiBDaGVjayBzZXR0aW5ncy5cIjtcbiAgICB9XG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gNDI5KSB7XG4gICAgICByZXR1cm4gXCJSYXRlIGxpbWl0IGhpdC4gV2FpdCBhIG1vbWVudCBhbmQgcmV0cnkuXCI7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgICAgcmV0dXJuIGRhdGEuZXJyb3I/Lm1lc3NhZ2UgPz8gYE9wZW5BSSByZXF1ZXN0IGZhaWxlZCAoJHtyZXNwb25zZS5zdGF0dXN9KS5gO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIGBPcGVuQUkgcmVxdWVzdCBmYWlsZWQgKCR7cmVzcG9uc2Uuc3RhdHVzfSkuYDtcbiAgICB9XG4gIH1cbn1cbiIsICJpbXBvcnQgeyBQcm92aWRlcklELCBTeWJ5bFNldHRpbmdzIH0gZnJvbSBcIi4uL3R5cGVzXCI7XG5pbXBvcnQgeyBBSVByb3ZpZGVyIH0gZnJvbSBcIi4vYmFzZVwiO1xuaW1wb3J0IHsgQW50aHJvcGljUHJvdmlkZXIgfSBmcm9tIFwiLi9hbnRocm9waWNcIjtcbmltcG9ydCB7IEdlbWluaVByb3ZpZGVyIH0gZnJvbSBcIi4vZ2VtaW5pXCI7XG5pbXBvcnQgeyBPbGxhbWFQcm92aWRlciB9IGZyb20gXCIuL29sbGFtYVwiO1xuaW1wb3J0IHsgT3BlbkFJUHJvdmlkZXIgfSBmcm9tIFwiLi9vcGVuYWlcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldFByb3ZpZGVyKHNldHRpbmdzOiBTeWJ5bFNldHRpbmdzLCBvdmVycmlkZUlkPzogUHJvdmlkZXJJRCk6IEFJUHJvdmlkZXIge1xuICBjb25zdCBpZCA9IG92ZXJyaWRlSWQgPz8gc2V0dGluZ3MuYWN0aXZlUHJvdmlkZXI7XG4gIHN3aXRjaCAoaWQpIHtcbiAgICBjYXNlIFwiZ2VtaW5pXCI6XG4gICAgICByZXR1cm4gbmV3IEdlbWluaVByb3ZpZGVyKHNldHRpbmdzLnByb3ZpZGVycy5nZW1pbmkpO1xuICAgIGNhc2UgXCJvcGVuYWlcIjpcbiAgICAgIHJldHVybiBuZXcgT3BlbkFJUHJvdmlkZXIoc2V0dGluZ3MucHJvdmlkZXJzLm9wZW5haSk7XG4gICAgY2FzZSBcImFudGhyb3BpY1wiOlxuICAgICAgcmV0dXJuIG5ldyBBbnRocm9waWNQcm92aWRlcihzZXR0aW5ncy5wcm92aWRlcnMuYW50aHJvcGljKTtcbiAgICBjYXNlIFwib2xsYW1hXCI6XG4gICAgICByZXR1cm4gbmV3IE9sbGFtYVByb3ZpZGVyKHNldHRpbmdzLnByb3ZpZGVycy5vbGxhbWEpO1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gcHJvdmlkZXI6ICR7aWR9YCk7XG4gIH1cbn1cbiIsICJpbXBvcnQgeyBOb3RpY2UsIFRGaWxlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgdHlwZSBTeWJ5bFBsdWdpbiBmcm9tIFwiLi9tYWluXCI7XG5pbXBvcnQgeyBhcHBlbmRUb05vdGUsIGdldFNlbGVjdGlvbiwgaW5zZXJ0QmVsb3dTZWxlY3Rpb24gfSBmcm9tIFwiLi9lZGl0b3JcIjtcbmltcG9ydCB7IHJlbW92ZVNvdXJjZVJlZiwgdXBzZXJ0U291cmNlUmVmLCB3cml0ZUZyb250TWF0dGVyS2V5IH0gZnJvbSBcIi4vZnJvbnRtYXR0ZXJcIjtcbmltcG9ydCB7XG4gIGZvcm1hdEFza09yYWNsZSxcbiAgZm9ybWF0RGVjbGFyZUFjdGlvbixcbiAgZm9ybWF0RXhwYW5kU2NlbmUsXG4gIGZvcm1hdEludGVycHJldE9yYWNsZSxcbiAgZm9ybWF0U3RhcnRTY2VuZSxcbiAgZm9ybWF0U3VnZ2VzdENvbnNlcXVlbmNlLFxuICBMb25lbG9nRm9ybWF0T3B0aW9uc1xufSBmcm9tIFwiLi9sb25lbG9nL2Zvcm1hdHRlclwiO1xuaW1wb3J0IHsgcGFyc2VMb25lbG9nQ29udGV4dCwgc2VyaWFsaXplQ29udGV4dCB9IGZyb20gXCIuL2xvbmVsb2cvcGFyc2VyXCI7XG5pbXBvcnQgeyBNYW5hZ2VTb3VyY2VzTW9kYWwsIG9wZW5JbnB1dE1vZGFsLCBwaWNrTG9jYWxGaWxlLCBwaWNrVmF1bHRGaWxlIH0gZnJvbSBcIi4vbW9kYWxzXCI7XG5pbXBvcnQgeyBnZXRQcm92aWRlciB9IGZyb20gXCIuL3Byb3ZpZGVyc1wiO1xuaW1wb3J0IHsgTm90ZUZyb250TWF0dGVyLCBTb3VyY2VSZWYsIFN5YnlsU2V0dGluZ3MsIFVwbG9hZGVkRmlsZUluZm8gfSBmcm9tIFwiLi90eXBlc1wiO1xuXG5mdW5jdGlvbiBpc0xvbmVsb2dBY3RpdmUoc2V0dGluZ3M6IFN5YnlsU2V0dGluZ3MsIGZtOiBOb3RlRnJvbnRNYXR0ZXIpOiBib29sZWFuIHtcbiAgcmV0dXJuIGZtLmxvbmVsb2cgPz8gc2V0dGluZ3MubG9uZWxvZ01vZGU7XG59XG5cbmZ1bmN0aW9uIGxvbmVsb2dPcHRzKHNldHRpbmdzOiBTeWJ5bFNldHRpbmdzKTogTG9uZWxvZ0Zvcm1hdE9wdGlvbnMge1xuICByZXR1cm4geyB3cmFwSW5Db2RlQmxvY2s6IHNldHRpbmdzLmxvbmVsb2dXcmFwQ29kZUJsb2NrID8/IHRydWUgfTtcbn1cblxuZnVuY3Rpb24gZ2VuZXJpY0Jsb2NrcXVvdGUobGFiZWw6IHN0cmluZywgdGV4dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGA+IFske2xhYmVsfV0gJHt0ZXh0LnRyaW0oKS5yZXBsYWNlKC9cXG4vZywgXCJcXG4+IFwiKX1gO1xufVxuXG5mdW5jdGlvbiBpbmZlck1pbWVUeXBlKGZpbGU6IFRGaWxlIHwgRmlsZSk6IHN0cmluZyB7XG4gIGNvbnN0IG5hbWUgPSBcInBhdGhcIiBpbiBmaWxlID8gZmlsZS5wYXRoIDogZmlsZS5uYW1lO1xuICByZXR1cm4gbmFtZS50b0xvd2VyQ2FzZSgpLmVuZHNXaXRoKFwiLnBkZlwiKSA/IFwiYXBwbGljYXRpb24vcGRmXCIgOiBcInRleHQvcGxhaW5cIjtcbn1cblxuZnVuY3Rpb24gdG9kYXlJc29EYXRlKCk6IHN0cmluZyB7XG4gIHJldHVybiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc2xpY2UoMCwgMTApO1xufVxuXG5mdW5jdGlvbiBwYXJzZUxvbmVsb2dPcmFjbGVSZXNwb25zZSh0ZXh0OiBzdHJpbmcpOiB7IHJlc3VsdDogc3RyaW5nOyBpbnRlcnByZXRhdGlvbjogc3RyaW5nIH0ge1xuICBjb25zdCBsaW5lcyA9IHRleHRcbiAgICAucmVwbGFjZSgvXj5cXHMqL2dtLCBcIlwiKVxuICAgIC5zcGxpdChcIlxcblwiKVxuICAgIC5tYXAoKGxpbmUpID0+IGxpbmUudHJpbSgpKVxuICAgIC5maWx0ZXIoQm9vbGVhbik7XG4gIGNvbnN0IHJlc3VsdCA9IGxpbmVzLmZpbmQoKGxpbmUpID0+IGxpbmUuc3RhcnRzV2l0aChcIi0+XCIpKT8ucmVwbGFjZSgvXi0+XFxzKi8sIFwiXCIpID8/IFwiVW5jbGVhclwiO1xuICBjb25zdCBpbnRlcnByZXRhdGlvbiA9IGxpbmVzLmZpbHRlcigobGluZSkgPT4gIWxpbmUuc3RhcnRzV2l0aChcIi0+XCIpKS5qb2luKFwiXFxuXCIpO1xuICByZXR1cm4geyByZXN1bHQsIGludGVycHJldGF0aW9uIH07XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGFkZFNvdXJjZVRvTm90ZShwbHVnaW46IFN5YnlsUGx1Z2luLCBmaWxlOiBURmlsZSwgZm06IE5vdGVGcm9udE1hdHRlcik6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBwcm92aWRlcklkID0gZm0ucHJvdmlkZXIgPz8gcGx1Z2luLnNldHRpbmdzLmFjdGl2ZVByb3ZpZGVyO1xuICBjb25zdCBwcm92aWRlciA9IGdldFByb3ZpZGVyKHBsdWdpbi5zZXR0aW5ncywgcHJvdmlkZXJJZCk7XG5cbiAgaWYgKHByb3ZpZGVySWQgPT09IFwiZ2VtaW5pXCIpIHtcbiAgICBjb25zdCBmaWxlSGFuZGxlID0gYXdhaXQgcGlja0xvY2FsRmlsZSgpO1xuICAgIGlmICghZmlsZUhhbmRsZSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBuZXcgTm90aWNlKFwiVXBsb2FkaW5nIHNvdXJjZS4uLlwiKTtcbiAgICBjb25zdCB1cGxvYWRlZCA9IGF3YWl0IHByb3ZpZGVyLnVwbG9hZFNvdXJjZShcbiAgICAgIGF3YWl0IGZpbGVIYW5kbGUuYXJyYXlCdWZmZXIoKSxcbiAgICAgIGluZmVyTWltZVR5cGUoZmlsZUhhbmRsZSksXG4gICAgICBmaWxlSGFuZGxlLm5hbWVcbiAgICApO1xuICAgIGF3YWl0IHVwc2VydFNvdXJjZVJlZihwbHVnaW4uYXBwLCBmaWxlLCB7XG4gICAgICBsYWJlbDogdXBsb2FkZWQubGFiZWwsXG4gICAgICBwcm92aWRlcjogXCJnZW1pbmlcIixcbiAgICAgIG1pbWVfdHlwZTogdXBsb2FkZWQubWltZV90eXBlLFxuICAgICAgZmlsZV91cmk6IHVwbG9hZGVkLmZpbGVfdXJpLFxuICAgICAgZXhwaXJlc0F0OiB1cGxvYWRlZC5leHBpcmVzQXRcbiAgICB9KTtcbiAgICBuZXcgTm90aWNlKGBTb3VyY2UgdXBsb2FkZWQ6ICR7dXBsb2FkZWQuZmlsZV91cmkgPz8gdXBsb2FkZWQubGFiZWx9YCk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3QgdmF1bHRGaWxlID0gYXdhaXQgcGlja1ZhdWx0RmlsZShwbHVnaW4uYXBwLCBcIkNob29zZSBhIHZhdWx0IGZpbGVcIik7XG4gIGlmICghdmF1bHRGaWxlKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHJlZjogU291cmNlUmVmID0ge1xuICAgIGxhYmVsOiB2YXVsdEZpbGUuYmFzZW5hbWUsXG4gICAgcHJvdmlkZXI6IHByb3ZpZGVySWQsXG4gICAgbWltZV90eXBlOiBpbmZlck1pbWVUeXBlKHZhdWx0RmlsZSksXG4gICAgdmF1bHRfcGF0aDogdmF1bHRGaWxlLnBhdGhcbiAgfTtcbiAgYXdhaXQgdXBzZXJ0U291cmNlUmVmKHBsdWdpbi5hcHAsIGZpbGUsIHJlZik7XG4gIG5ldyBOb3RpY2UoYFNvdXJjZSBhZGRlZDogJHt2YXVsdEZpbGUucGF0aH1gKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gbWFuYWdlU291cmNlcyhwbHVnaW46IFN5YnlsUGx1Z2luKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IGNvbnRleHQgPSBhd2FpdCBwbHVnaW4uZ2V0QWN0aXZlTm90ZUNvbnRleHQoKTtcbiAgaWYgKCFjb250ZXh0Py52aWV3LmZpbGUpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgbmV3IE1hbmFnZVNvdXJjZXNNb2RhbChcbiAgICBwbHVnaW4uYXBwLFxuICAgIGNvbnRleHQuZm0uc291cmNlcyA/PyBbXSxcbiAgICBhc3luYyAocmVmKSA9PiByZW1vdmVTb3VyY2VSZWYocGx1Z2luLmFwcCwgY29udGV4dC52aWV3LmZpbGUhLCByZWYpLFxuICAgIGFzeW5jIChyZWYpID0+IHtcbiAgICAgIGNvbnN0IHByb3ZpZGVyID0gZ2V0UHJvdmlkZXIocGx1Z2luLnNldHRpbmdzLCByZWYucHJvdmlkZXIpO1xuICAgICAgYXdhaXQgcHJvdmlkZXIuZGVsZXRlU291cmNlKHJlZiBhcyBVcGxvYWRlZEZpbGVJbmZvKTtcbiAgICAgIGF3YWl0IHJlbW92ZVNvdXJjZVJlZihwbHVnaW4uYXBwLCBjb250ZXh0LnZpZXcuZmlsZSEsIHJlZik7XG4gICAgfSxcbiAgICBhc3luYyAoKSA9PiBhZGRTb3VyY2VUb05vdGUocGx1Z2luLCBjb250ZXh0LnZpZXcuZmlsZSEsIGNvbnRleHQuZm0pXG4gICkub3BlbigpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBydW5HZW5lcmF0aW9uKFxuICBwbHVnaW46IFN5YnlsUGx1Z2luLFxuICB1c2VyTWVzc2FnZTogc3RyaW5nLFxuICBmb3JtYXR0ZXI6ICh0ZXh0OiBzdHJpbmcsIGZtOiBOb3RlRnJvbnRNYXR0ZXIpID0+IHN0cmluZyxcbiAgbWF4T3V0cHV0VG9rZW5zID0gNTEyLFxuICBwbGFjZW1lbnQ/OiBcImN1cnNvclwiIHwgXCJlbmQtb2Ytbm90ZVwiIHwgXCJiZWxvdy1zZWxlY3Rpb25cIlxuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IGNvbnRleHQgPSBhd2FpdCBwbHVnaW4uZ2V0QWN0aXZlTm90ZUNvbnRleHQoKTtcbiAgaWYgKCFjb250ZXh0KSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHBsdWdpbi5yZXF1ZXN0R2VuZXJhdGlvbihjb250ZXh0LmZtLCBjb250ZXh0Lm5vdGVCb2R5LCB1c2VyTWVzc2FnZSwgbWF4T3V0cHV0VG9rZW5zKTtcbiAgICBjb25zdCBmb3JtYXR0ZWQgPSBmb3JtYXR0ZXIocmVzcG9uc2UudGV4dCwgY29udGV4dC5mbSk7XG4gICAgaWYgKHBsYWNlbWVudCA9PT0gXCJiZWxvdy1zZWxlY3Rpb25cIikge1xuICAgICAgaW5zZXJ0QmVsb3dTZWxlY3Rpb24oY29udGV4dC52aWV3LmVkaXRvciwgZm9ybWF0dGVkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGx1Z2luLmluc2VydFRleHQoY29udGV4dC52aWV3LCBmb3JtYXR0ZWQsIHBsYWNlbWVudCk7XG4gICAgfVxuICAgIHBsdWdpbi5tYXliZUluc2VydFRva2VuQ29tbWVudChjb250ZXh0LnZpZXcsIHJlc3BvbnNlKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBuZXcgTm90aWNlKGBTeWJ5bCBlcnJvcjogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XG4gICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyQWxsQ29tbWFuZHMocGx1Z2luOiBTeWJ5bFBsdWdpbik6IHZvaWQge1xuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6c3RhcnQtc2NlbmVcIixcbiAgICBuYW1lOiBcIlN5YnlsOiBTdGFydCBTY2VuZVwiLFxuICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjb250ZXh0ID0gYXdhaXQgcGx1Z2luLmdldEFjdGl2ZU5vdGVDb250ZXh0KCk7XG4gICAgICBpZiAoIWNvbnRleHQ/LnZpZXcuZmlsZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAoaXNMb25lbG9nQWN0aXZlKHBsdWdpbi5zZXR0aW5ncywgY29udGV4dC5mbSkpIHtcbiAgICAgICAgY29uc3QgdmFsdWVzID0gYXdhaXQgb3BlbklucHV0TW9kYWwocGx1Z2luLmFwcCwgXCJTdGFydCBTY2VuZVwiLCBbXG4gICAgICAgICAgeyBrZXk6IFwic2NlbmVEZXNjXCIsIGxhYmVsOiBcIlNjZW5lIGRlc2NyaXB0aW9uXCIsIHBsYWNlaG9sZGVyOiBcIkRhcmsgYWxsZXksIG1pZG5pZ2h0XCIgfVxuICAgICAgICBdKTtcbiAgICAgICAgaWYgKCF2YWx1ZXM/LnNjZW5lRGVzYykge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjb3VudGVyID0gY29udGV4dC5mbS5zY2VuZV9jb3VudGVyID8/IDE7XG4gICAgICAgIGF3YWl0IHJ1bkdlbmVyYXRpb24oXG4gICAgICAgICAgcGx1Z2luLFxuICAgICAgICAgIGBTVEFSVCBTQ0VORS4gR2VuZXJhdGUgb25seTogMi0zIGxpbmVzIG9mIHRoaXJkLXBlcnNvbiBwYXN0LXRlbnNlIHByb3NlIGRlc2NyaWJpbmcgdGhlIGF0bW9zcGhlcmUgYW5kIHNldHRpbmcgb2Y6IFwiJHt2YWx1ZXMuc2NlbmVEZXNjfVwiLiBObyBkaWFsb2d1ZS4gTm8gUEMgYWN0aW9ucy4gTm8gYWRkaXRpb25hbCBjb21tZW50YXJ5LmAsXG4gICAgICAgICAgKHRleHQpID0+IGZvcm1hdFN0YXJ0U2NlbmUodGV4dCwgYFMke2NvdW50ZXJ9YCwgdmFsdWVzLnNjZW5lRGVzYywgbG9uZWxvZ09wdHMocGx1Z2luLnNldHRpbmdzKSlcbiAgICAgICAgKTtcbiAgICAgICAgaWYgKHBsdWdpbi5zZXR0aW5ncy5sb25lbG9nQXV0b0luY1NjZW5lKSB7XG4gICAgICAgICAgYXdhaXQgd3JpdGVGcm9udE1hdHRlcktleShwbHVnaW4uYXBwLCBjb250ZXh0LnZpZXcuZmlsZSwgXCJzY2VuZV9jb3VudGVyXCIsIGNvdW50ZXIgKyAxKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBhd2FpdCBydW5HZW5lcmF0aW9uKFxuICAgICAgICBwbHVnaW4sXG4gICAgICAgIFwiU1RBUlQgU0NFTkUuIEdlbmVyYXRlIG9ubHk6IDItMyBsaW5lcyBvZiB0aGlyZC1wZXJzb24gcGFzdC10ZW5zZSBwcm9zZSBkZXNjcmliaW5nIHRoZSBzZXR0aW5nIGFuZCBhdG1vc3BoZXJlLiBObyBkaWFsb2d1ZS4gTm8gUEMgYWN0aW9ucy4gTm8gYWRkaXRpb25hbCBjb21tZW50YXJ5LlwiLFxuICAgICAgICAodGV4dCkgPT4gZ2VuZXJpY0Jsb2NrcXVvdGUoXCJTY2VuZVwiLCB0ZXh0KVxuICAgICAgKTtcbiAgICB9XG4gIH0pO1xuXG4gIHBsdWdpbi5hZGRDb21tYW5kKHtcbiAgICBpZDogXCJzeWJ5bDpkZWNsYXJlLWFjdGlvblwiLFxuICAgIG5hbWU6IFwiU3lieWw6IERlY2xhcmUgQWN0aW9uXCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlcyA9IGF3YWl0IG9wZW5JbnB1dE1vZGFsKHBsdWdpbi5hcHAsIFwiRGVjbGFyZSBBY3Rpb25cIiwgW1xuICAgICAgICB7IGtleTogXCJhY3Rpb25cIiwgbGFiZWw6IFwiQWN0aW9uXCIgfSxcbiAgICAgICAgeyBrZXk6IFwicm9sbFwiLCBsYWJlbDogXCJSb2xsIHJlc3VsdFwiIH1cbiAgICAgIF0pO1xuICAgICAgaWYgKCF2YWx1ZXM/LmFjdGlvbiB8fCAhdmFsdWVzLnJvbGwpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgYXdhaXQgcnVuR2VuZXJhdGlvbihcbiAgICAgICAgcGx1Z2luLFxuICAgICAgICBgUEMgYWN0aW9uOiAke3ZhbHVlcy5hY3Rpb259XFxuUm9sbCByZXN1bHQ6ICR7dmFsdWVzLnJvbGx9XFxuRGVzY3JpYmUgb25seSB0aGUgY29uc2VxdWVuY2VzIGFuZCB3b3JsZCByZWFjdGlvbi4gRG8gbm90IGRlc2NyaWJlIHRoZSBQQydzIGFjdGlvbi5gLFxuICAgICAgICAodGV4dCwgZm0pID0+XG4gICAgICAgICAgaXNMb25lbG9nQWN0aXZlKHBsdWdpbi5zZXR0aW5ncywgZm0pXG4gICAgICAgICAgICA/IGZvcm1hdERlY2xhcmVBY3Rpb24odmFsdWVzLmFjdGlvbiwgdmFsdWVzLnJvbGwsIHRleHQsIGxvbmVsb2dPcHRzKHBsdWdpbi5zZXR0aW5ncykpXG4gICAgICAgICAgICA6IGA+IFtBY3Rpb25dICR7dmFsdWVzLmFjdGlvbn0gfCBSb2xsOiAke3ZhbHVlcy5yb2xsfVxcbj4gW1Jlc3VsdF0gJHt0ZXh0LnRyaW0oKS5yZXBsYWNlKC9cXG4vZywgXCJcXG4+IFwiKX1gXG4gICAgICApO1xuICAgIH1cbiAgfSk7XG5cbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOmFzay1vcmFjbGVcIixcbiAgICBuYW1lOiBcIlN5YnlsOiBBc2sgT3JhY2xlXCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGNvbnRleHQgPSBhd2FpdCBwbHVnaW4uZ2V0QWN0aXZlTm90ZUNvbnRleHQoKTtcbiAgICAgIGlmICghY29udGV4dCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCB2YWx1ZXMgPSBhd2FpdCBvcGVuSW5wdXRNb2RhbChwbHVnaW4uYXBwLCBcIkFzayBPcmFjbGVcIiwgW1xuICAgICAgICB7IGtleTogXCJxdWVzdGlvblwiLCBsYWJlbDogXCJRdWVzdGlvblwiIH0sXG4gICAgICAgIHsga2V5OiBcInJlc3VsdFwiLCBsYWJlbDogXCJPcmFjbGUgcmVzdWx0XCIsIG9wdGlvbmFsOiB0cnVlIH1cbiAgICAgIF0pO1xuICAgICAgaWYgKCF2YWx1ZXM/LnF1ZXN0aW9uKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGhhc1Jlc3VsdCA9IEJvb2xlYW4odmFsdWVzLnJlc3VsdD8udHJpbSgpKTtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBoYXNSZXN1bHRcbiAgICAgICAgPyBgT3JhY2xlIHF1ZXN0aW9uOiAke3ZhbHVlcy5xdWVzdGlvbn1cXG5PcmFjbGUgcmVzdWx0OiAke3ZhbHVlcy5yZXN1bHR9XFxuSW50ZXJwcmV0IHRoaXMgcmVzdWx0IGluIHRoZSBjb250ZXh0IG9mIHRoZSBzY2VuZS4gVGhpcmQgcGVyc29uLCBuZXV0cmFsLCAyLTMgbGluZXMuYFxuICAgICAgICA6IGBPcmFjbGUgcXVlc3Rpb246ICR7dmFsdWVzLnF1ZXN0aW9ufVxcbk9yYWNsZSBtb2RlOiAke2NvbnRleHQuZm0ub3JhY2xlX21vZGUgPz8gXCJ5ZXMtbm9cIn1cXG5SdW4gdGhlIG9yYWNsZSBhbmQgZ2l2ZSB0aGUgcmVzdWx0IHBsdXMgYSAxLTIgbGluZSBuZXV0cmFsIGludGVycHJldGF0aW9uLmA7XG4gICAgICBhd2FpdCBydW5HZW5lcmF0aW9uKFxuICAgICAgICBwbHVnaW4sXG4gICAgICAgIG1lc3NhZ2UsXG4gICAgICAgICh0ZXh0LCBmbSkgPT4ge1xuICAgICAgICAgIGlmICghaXNMb25lbG9nQWN0aXZlKHBsdWdpbi5zZXR0aW5ncywgZm0pKSB7XG4gICAgICAgICAgICByZXR1cm4gYD4gW09yYWNsZV0gUTogJHt2YWx1ZXMucXVlc3Rpb259XFxuPiBbQW5zd2VyXSAke3RleHQudHJpbSgpLnJlcGxhY2UoL1xcbi9nLCBcIlxcbj4gXCIpfWA7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChoYXNSZXN1bHQpIHtcbiAgICAgICAgICAgIHJldHVybiBmb3JtYXRBc2tPcmFjbGUodmFsdWVzLnF1ZXN0aW9uLCB2YWx1ZXMucmVzdWx0LnRyaW0oKSwgdGV4dCwgbG9uZWxvZ09wdHMocGx1Z2luLnNldHRpbmdzKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IHBhcnNlZCA9IHBhcnNlTG9uZWxvZ09yYWNsZVJlc3BvbnNlKHRleHQpO1xuICAgICAgICAgIHJldHVybiBmb3JtYXRBc2tPcmFjbGUodmFsdWVzLnF1ZXN0aW9uLCBwYXJzZWQucmVzdWx0LCBwYXJzZWQuaW50ZXJwcmV0YXRpb24sIGxvbmVsb2dPcHRzKHBsdWdpbi5zZXR0aW5ncykpO1xuICAgICAgICB9XG4gICAgICApO1xuICAgIH1cbiAgfSk7XG5cbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOmludGVycHJldC1vcmFjbGVcIixcbiAgICBuYW1lOiBcIlN5YnlsOiBJbnRlcnByZXQgT3JhY2xlIFJlc3VsdFwiLFxuICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjb250ZXh0ID0gYXdhaXQgcGx1Z2luLmdldEFjdGl2ZU5vdGVDb250ZXh0KCk7XG4gICAgICBpZiAoIWNvbnRleHQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgbGV0IHNlbGVjdGVkID0gZ2V0U2VsZWN0aW9uKGNvbnRleHQudmlldy5lZGl0b3IpO1xuICAgICAgaWYgKCFzZWxlY3RlZCkge1xuICAgICAgICBjb25zdCB2YWx1ZXMgPSBhd2FpdCBvcGVuSW5wdXRNb2RhbChwbHVnaW4uYXBwLCBcIkludGVycHJldCBPcmFjbGUgUmVzdWx0XCIsIFtcbiAgICAgICAgICB7IGtleTogXCJvcmFjbGVcIiwgbGFiZWw6IFwiT3JhY2xlIHJlc3VsdFwiIH1cbiAgICAgICAgXSk7XG4gICAgICAgIHNlbGVjdGVkID0gdmFsdWVzPy5vcmFjbGU/LnRyaW0oKSA/PyBcIlwiO1xuICAgICAgfVxuICAgICAgaWYgKCFzZWxlY3RlZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBhd2FpdCBydW5HZW5lcmF0aW9uKFxuICAgICAgICBwbHVnaW4sXG4gICAgICAgIGBJbnRlcnByZXQgdGhpcyBvcmFjbGUgcmVzdWx0IGluIHRoZSBjb250ZXh0IG9mIHRoZSBjdXJyZW50IHNjZW5lOiBcIiR7c2VsZWN0ZWR9XCJcXG5OZXV0cmFsLCB0aGlyZC1wZXJzb24sIDItMyBsaW5lcy4gTm8gZHJhbWF0aWMgbGFuZ3VhZ2UuYCxcbiAgICAgICAgKHRleHQsIGZtKSA9PlxuICAgICAgICAgIGlzTG9uZWxvZ0FjdGl2ZShwbHVnaW4uc2V0dGluZ3MsIGZtKVxuICAgICAgICAgICAgPyBmb3JtYXRJbnRlcnByZXRPcmFjbGUoc2VsZWN0ZWQsIHRleHQsIGxvbmVsb2dPcHRzKHBsdWdpbi5zZXR0aW5ncykpXG4gICAgICAgICAgICA6IGdlbmVyaWNCbG9ja3F1b3RlKFwiSW50ZXJwcmV0YXRpb25cIiwgdGV4dCksXG4gICAgICAgIDUxMixcbiAgICAgICAgXCJiZWxvdy1zZWxlY3Rpb25cIlxuICAgICAgKTtcbiAgICB9XG4gIH0pO1xuXG4gIHBsdWdpbi5hZGRDb21tYW5kKHtcbiAgICBpZDogXCJzeWJ5bDpzdWdnZXN0LWNvbnNlcXVlbmNlXCIsXG4gICAgbmFtZTogXCJTeWJ5bDogU3VnZ2VzdCBDb25zZXF1ZW5jZVwiLFxuICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICBhd2FpdCBydW5HZW5lcmF0aW9uKFxuICAgICAgICBwbHVnaW4sXG4gICAgICAgIFwiQmFzZWQgb24gdGhlIGN1cnJlbnQgc2NlbmUgY29udGV4dCwgc3VnZ2VzdCAxLTIgcG9zc2libGUgY29uc2VxdWVuY2VzIG9yIGNvbXBsaWNhdGlvbnMuIFByZXNlbnQgdGhlbSBhcyBuZXV0cmFsIG9wdGlvbnMsIG5vdCBhcyBuYXJyYXRpdmUgb3V0Y29tZXMuIERvIG5vdCBjaG9vc2UgYmV0d2VlbiB0aGVtLlwiLFxuICAgICAgICAodGV4dCwgZm0pID0+XG4gICAgICAgICAgaXNMb25lbG9nQWN0aXZlKHBsdWdpbi5zZXR0aW5ncywgZm0pXG4gICAgICAgICAgICA/IGZvcm1hdFN1Z2dlc3RDb25zZXF1ZW5jZSh0ZXh0LCBsb25lbG9nT3B0cyhwbHVnaW4uc2V0dGluZ3MpKVxuICAgICAgICAgICAgOiBnZW5lcmljQmxvY2txdW90ZShcIk9wdGlvbnNcIiwgdGV4dClcbiAgICAgICk7XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6ZXhwYW5kLXNjZW5lXCIsXG4gICAgbmFtZTogXCJTeWJ5bDogRXhwYW5kIFNjZW5lIGludG8gUHJvc2VcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgYXdhaXQgcnVuR2VuZXJhdGlvbihcbiAgICAgICAgcGx1Z2luLFxuICAgICAgICBcIkV4cGFuZCB0aGUgY3VycmVudCBzY2VuZSBpbnRvIGEgcHJvc2UgcGFzc2FnZS4gVGhpcmQgcGVyc29uLCBwYXN0IHRlbnNlLCAxMDAtMTUwIHdvcmRzLiBObyBkaWFsb2d1ZS4gRG8gbm90IGRlc2NyaWJlIHRoZSBQQydzIGludGVybmFsIHRob3VnaHRzIG9yIGRlY2lzaW9ucy4gU3RheSBzdHJpY3RseSB3aXRoaW4gdGhlIGVzdGFibGlzaGVkIHNjZW5lIGNvbnRleHQuXCIsXG4gICAgICAgICh0ZXh0LCBmbSkgPT5cbiAgICAgICAgICBpc0xvbmVsb2dBY3RpdmUocGx1Z2luLnNldHRpbmdzLCBmbSlcbiAgICAgICAgICAgID8gZm9ybWF0RXhwYW5kU2NlbmUodGV4dCwgbG9uZWxvZ09wdHMocGx1Z2luLnNldHRpbmdzKSlcbiAgICAgICAgICAgIDogYC0tLVxcbj4gW1Byb3NlXSAke3RleHQudHJpbSgpLnJlcGxhY2UoL1xcbi9nLCBcIlxcbj4gXCIpfVxcbi0tLWAsXG4gICAgICAgIDMwMFxuICAgICAgKTtcbiAgICB9XG4gIH0pO1xuXG4gIHBsdWdpbi5hZGRDb21tYW5kKHtcbiAgICBpZDogXCJzeWJ5bDp1cGxvYWQtc291cmNlXCIsXG4gICAgbmFtZTogXCJTeWJ5bDogVXBsb2FkIFNvdXJjZSBGaWxlXCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGNvbnRleHQgPSBhd2FpdCBwbHVnaW4uZ2V0QWN0aXZlTm90ZUNvbnRleHQoKTtcbiAgICAgIGlmICghY29udGV4dD8udmlldy5maWxlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGFkZFNvdXJjZVRvTm90ZShwbHVnaW4sIGNvbnRleHQudmlldy5maWxlLCBjb250ZXh0LmZtKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoYFN5YnlsIGVycm9yOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIHBsdWdpbi5hZGRDb21tYW5kKHtcbiAgICBpZDogXCJzeWJ5bDptYW5hZ2Utc291cmNlc1wiLFxuICAgIG5hbWU6IFwiU3lieWw6IE1hbmFnZSBTb3VyY2VzXCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGF3YWl0IG1hbmFnZVNvdXJjZXMocGx1Z2luKTtcbiAgICB9XG4gIH0pO1xuXG4gIHBsdWdpbi5hZGRDb21tYW5kKHtcbiAgICBpZDogXCJzeWJ5bDpsb25lbG9nLW5ldy1zY2VuZVwiLFxuICAgIG5hbWU6IFwiU3lieWw6IE5ldyBTY2VuZVwiLFxuICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjb250ZXh0ID0gYXdhaXQgcGx1Z2luLmdldEFjdGl2ZU5vdGVDb250ZXh0KCk7XG4gICAgICBpZiAoIWNvbnRleHQ/LnZpZXcuZmlsZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAoIWlzTG9uZWxvZ0FjdGl2ZShwbHVnaW4uc2V0dGluZ3MsIGNvbnRleHQuZm0pKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoXCJMb25lbG9nIG1vZGUgaXMgbm90IGVuYWJsZWQgZm9yIHRoaXMgbm90ZS5cIik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHZhbHVlcyA9IGF3YWl0IG9wZW5JbnB1dE1vZGFsKHBsdWdpbi5hcHAsIFwiTmV3IFNjZW5lXCIsIFtcbiAgICAgICAgeyBrZXk6IFwic2NlbmVEZXNjXCIsIGxhYmVsOiBcIlNjZW5lIGRlc2NyaXB0aW9uXCIsIHBsYWNlaG9sZGVyOiBcIkRhcmsgYWxsZXksIG1pZG5pZ2h0XCIgfVxuICAgICAgXSk7XG4gICAgICBpZiAoIXZhbHVlcz8uc2NlbmVEZXNjKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGNvdW50ZXIgPSBjb250ZXh0LmZtLnNjZW5lX2NvdW50ZXIgPz8gMTtcbiAgICAgIGF3YWl0IHJ1bkdlbmVyYXRpb24oXG4gICAgICAgIHBsdWdpbixcbiAgICAgICAgYFNUQVJUIFNDRU5FLiBHZW5lcmF0ZSBvbmx5OiAyLTMgbGluZXMgb2YgdGhpcmQtcGVyc29uIHBhc3QtdGVuc2UgcHJvc2UgZGVzY3JpYmluZyB0aGUgYXRtb3NwaGVyZSBhbmQgc2V0dGluZyBvZjogXCIke3ZhbHVlcy5zY2VuZURlc2N9XCIuIE5vIGRpYWxvZ3VlLiBObyBQQyBhY3Rpb25zLiBObyBhZGRpdGlvbmFsIGNvbW1lbnRhcnkuYCxcbiAgICAgICAgKHRleHQpID0+IGZvcm1hdFN0YXJ0U2NlbmUodGV4dCwgYFMke2NvdW50ZXJ9YCwgdmFsdWVzLnNjZW5lRGVzYywgbG9uZWxvZ09wdHMocGx1Z2luLnNldHRpbmdzKSlcbiAgICAgICk7XG4gICAgICBpZiAocGx1Z2luLnNldHRpbmdzLmxvbmVsb2dBdXRvSW5jU2NlbmUpIHtcbiAgICAgICAgYXdhaXQgd3JpdGVGcm9udE1hdHRlcktleShwbHVnaW4uYXBwLCBjb250ZXh0LnZpZXcuZmlsZSwgXCJzY2VuZV9jb3VudGVyXCIsIGNvdW50ZXIgKyAxKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIHBsdWdpbi5hZGRDb21tYW5kKHtcbiAgICBpZDogXCJzeWJ5bDpsb25lbG9nLXBhcnNlLWNvbnRleHRcIixcbiAgICBuYW1lOiBcIlN5YnlsOiBVcGRhdGUgU2NlbmUgQ29udGV4dCBmcm9tIExvZ1wiLFxuICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjb250ZXh0ID0gYXdhaXQgcGx1Z2luLmdldEFjdGl2ZU5vdGVDb250ZXh0KCk7XG4gICAgICBpZiAoIWNvbnRleHQ/LnZpZXcuZmlsZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAoIWlzTG9uZWxvZ0FjdGl2ZShwbHVnaW4uc2V0dGluZ3MsIGNvbnRleHQuZm0pKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoXCJMb25lbG9nIG1vZGUgaXMgbm90IGVuYWJsZWQgZm9yIHRoaXMgbm90ZS5cIik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHBhcnNlZCA9IHBhcnNlTG9uZWxvZ0NvbnRleHQoY29udGV4dC5ub3RlQm9keSwgcGx1Z2luLnNldHRpbmdzLmxvbmVsb2dDb250ZXh0RGVwdGgpO1xuICAgICAgYXdhaXQgd3JpdGVGcm9udE1hdHRlcktleShwbHVnaW4uYXBwLCBjb250ZXh0LnZpZXcuZmlsZSwgXCJzY2VuZV9jb250ZXh0XCIsIHNlcmlhbGl6ZUNvbnRleHQocGFyc2VkKSk7XG4gICAgICBuZXcgTm90aWNlKFwiU2NlbmUgY29udGV4dCB1cGRhdGVkIGZyb20gbG9nLlwiKTtcbiAgICB9XG4gIH0pO1xuXG4gIHBsdWdpbi5hZGRDb21tYW5kKHtcbiAgICBpZDogXCJzeWJ5bDpsb25lbG9nLXNlc3Npb24tYnJlYWtcIixcbiAgICBuYW1lOiBcIlN5YnlsOiBOZXcgU2Vzc2lvbiBIZWFkZXJcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY29udGV4dCA9IGF3YWl0IHBsdWdpbi5nZXRBY3RpdmVOb3RlQ29udGV4dCgpO1xuICAgICAgaWYgKCFjb250ZXh0Py52aWV3LmZpbGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKCFpc0xvbmVsb2dBY3RpdmUocGx1Z2luLnNldHRpbmdzLCBjb250ZXh0LmZtKSkge1xuICAgICAgICBuZXcgTm90aWNlKFwiTG9uZWxvZyBtb2RlIGlzIG5vdCBlbmFibGVkIGZvciB0aGlzIG5vdGUuXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCB2YWx1ZXMgPSBhd2FpdCBvcGVuSW5wdXRNb2RhbChwbHVnaW4uYXBwLCBcIk5ldyBTZXNzaW9uIEhlYWRlclwiLCBbXG4gICAgICAgIHsga2V5OiBcImRhdGVcIiwgbGFiZWw6IFwiRGF0ZVwiLCB2YWx1ZTogdG9kYXlJc29EYXRlKCkgfSxcbiAgICAgICAgeyBrZXk6IFwiZHVyYXRpb25cIiwgbGFiZWw6IFwiRHVyYXRpb25cIiwgcGxhY2Vob2xkZXI6IFwiMWgzMFwiIH0sXG4gICAgICAgIHsga2V5OiBcInJlY2FwXCIsIGxhYmVsOiBcIlJlY2FwXCIsIG9wdGlvbmFsOiB0cnVlIH1cbiAgICAgIF0pO1xuICAgICAgaWYgKCF2YWx1ZXM/LmRhdGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3Qgc2Vzc2lvbk51bWJlciA9IGNvbnRleHQuZm0uc2Vzc2lvbl9udW1iZXIgPz8gMTtcbiAgICAgIGNvbnN0IGJsb2NrID0gYCMjIFNlc3Npb24gJHtzZXNzaW9uTnVtYmVyfVxcbipEYXRlOiAke3ZhbHVlcy5kYXRlfSB8IER1cmF0aW9uOiAke3ZhbHVlcy5kdXJhdGlvbiB8fCBcIi1cIn0qXFxuXFxuJHt2YWx1ZXMucmVjYXAgPyBgKipSZWNhcDoqKiAke3ZhbHVlcy5yZWNhcH1cXG5cXG5gIDogXCJcIn1gO1xuICAgICAgcGx1Z2luLmluc2VydFRleHQoY29udGV4dC52aWV3LCBibG9jaywgXCJjdXJzb3JcIik7XG4gICAgICBhd2FpdCB3cml0ZUZyb250TWF0dGVyS2V5KHBsdWdpbi5hcHAsIGNvbnRleHQudmlldy5maWxlLCBcInNlc3Npb25fbnVtYmVyXCIsIHNlc3Npb25OdW1iZXIgKyAxKTtcbiAgICB9XG4gIH0pO1xufVxuIiwgImV4cG9ydCBpbnRlcmZhY2UgTG9uZWxvZ0Zvcm1hdE9wdGlvbnMge1xuICB3cmFwSW5Db2RlQmxvY2s6IGJvb2xlYW47XG4gIHNjZW5lSWQ/OiBzdHJpbmc7XG59XG5cbmZ1bmN0aW9uIGZlbmNlKGNvbnRlbnQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBgXFxgXFxgXFxgXFxuJHtjb250ZW50fVxcblxcYFxcYFxcYGA7XG59XG5cbmZ1bmN0aW9uIGNsZWFuQWlUZXh0KHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiB0ZXh0LnJlcGxhY2UoL14+XFxzKi9nbSwgXCJcIikudHJpbSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0U3RhcnRTY2VuZShcbiAgYWlUZXh0OiBzdHJpbmcsXG4gIHNjZW5lSWQ6IHN0cmluZyxcbiAgc2NlbmVEZXNjOiBzdHJpbmcsXG4gIF9vcHRzOiBMb25lbG9nRm9ybWF0T3B0aW9uc1xuKTogc3RyaW5nIHtcbiAgY29uc3QgaGVhZGVyID0gYCMjIyAke3NjZW5lSWR9ICoke3NjZW5lRGVzY30qYDtcbiAgY29uc3QgYm9keSA9IGNsZWFuQWlUZXh0KGFpVGV4dCk7XG4gIHJldHVybiBgJHtoZWFkZXJ9XFxuXFxuJHtib2R5fWA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXREZWNsYXJlQWN0aW9uKFxuICBhY3Rpb246IHN0cmluZyxcbiAgcm9sbDogc3RyaW5nLFxuICBhaUNvbnNlcXVlbmNlOiBzdHJpbmcsXG4gIG9wdHM6IExvbmVsb2dGb3JtYXRPcHRpb25zXG4pOiBzdHJpbmcge1xuICBjb25zdCBjb25zZXF1ZW5jZSA9IGNsZWFuQWlUZXh0KGFpQ29uc2VxdWVuY2UpXG4gICAgLnNwbGl0KFwiXFxuXCIpXG4gICAgLmZpbHRlcihCb29sZWFuKVxuICAgIC5tYXAoKGxpbmUpID0+IChsaW5lLnN0YXJ0c1dpdGgoXCI9PlwiKSA/IGxpbmUgOiBgPT4gJHtsaW5lfWApKVxuICAgIC5qb2luKFwiXFxuXCIpO1xuICBjb25zdCBub3RhdGlvbiA9IGBAICR7YWN0aW9ufVxcbmQ6ICR7cm9sbH1cXG4ke2NvbnNlcXVlbmNlfWA7XG4gIHJldHVybiBvcHRzLndyYXBJbkNvZGVCbG9jayA/IGZlbmNlKG5vdGF0aW9uKSA6IG5vdGF0aW9uO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0QXNrT3JhY2xlKFxuICBxdWVzdGlvbjogc3RyaW5nLFxuICBvcmFjbGVSZXN1bHQ6IHN0cmluZyxcbiAgYWlJbnRlcnByZXRhdGlvbjogc3RyaW5nLFxuICBvcHRzOiBMb25lbG9nRm9ybWF0T3B0aW9uc1xuKTogc3RyaW5nIHtcbiAgY29uc3QgaW50ZXJwcmV0YXRpb24gPSBjbGVhbkFpVGV4dChhaUludGVycHJldGF0aW9uKVxuICAgIC5zcGxpdChcIlxcblwiKVxuICAgIC5maWx0ZXIoQm9vbGVhbilcbiAgICAubWFwKChsaW5lKSA9PiAobGluZS5zdGFydHNXaXRoKFwiPT5cIikgPyBsaW5lIDogYD0+ICR7bGluZX1gKSlcbiAgICAuam9pbihcIlxcblwiKTtcbiAgY29uc3Qgbm90YXRpb24gPSBgPyAke3F1ZXN0aW9ufVxcbi0+ICR7b3JhY2xlUmVzdWx0fVxcbiR7aW50ZXJwcmV0YXRpb259YDtcbiAgcmV0dXJuIG9wdHMud3JhcEluQ29kZUJsb2NrID8gZmVuY2Uobm90YXRpb24pIDogbm90YXRpb247XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRJbnRlcnByZXRPcmFjbGUoXG4gIG9yYWNsZVRleHQ6IHN0cmluZyxcbiAgYWlJbnRlcnByZXRhdGlvbjogc3RyaW5nLFxuICBvcHRzOiBMb25lbG9nRm9ybWF0T3B0aW9uc1xuKTogc3RyaW5nIHtcbiAgY29uc3QgaW50ZXJwcmV0YXRpb24gPSBjbGVhbkFpVGV4dChhaUludGVycHJldGF0aW9uKVxuICAgIC5zcGxpdChcIlxcblwiKVxuICAgIC5maWx0ZXIoQm9vbGVhbilcbiAgICAubWFwKChsaW5lKSA9PiAobGluZS5zdGFydHNXaXRoKFwiPT5cIikgPyBsaW5lIDogYD0+ICR7bGluZX1gKSlcbiAgICAuam9pbihcIlxcblwiKTtcbiAgY29uc3Qgbm90YXRpb24gPSBgLT4gJHtvcmFjbGVUZXh0fVxcbiR7aW50ZXJwcmV0YXRpb259YDtcbiAgcmV0dXJuIG9wdHMud3JhcEluQ29kZUJsb2NrID8gZmVuY2Uobm90YXRpb24pIDogbm90YXRpb247XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRTdWdnZXN0Q29uc2VxdWVuY2UoYWlPcHRpb25zOiBzdHJpbmcsIG9wdHM6IExvbmVsb2dGb3JtYXRPcHRpb25zKTogc3RyaW5nIHtcbiAgY29uc3Qgb3B0aW9ucyA9IGNsZWFuQWlUZXh0KGFpT3B0aW9ucylcbiAgICAuc3BsaXQoXCJcXG5cIilcbiAgICAuZmlsdGVyKChsaW5lKSA9PiBsaW5lLnRyaW0oKS5sZW5ndGggPiAwKVxuICAgIC5tYXAoKGxpbmUpID0+IChsaW5lLnN0YXJ0c1dpdGgoXCI9PlwiKSA/IGxpbmUgOiBgPT4gJHtsaW5lfWApKVxuICAgIC5qb2luKFwiXFxuXCIpO1xuICByZXR1cm4gb3B0cy53cmFwSW5Db2RlQmxvY2sgPyBmZW5jZShvcHRpb25zKSA6IG9wdGlvbnM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRFeHBhbmRTY2VuZShhaVByb3NlOiBzdHJpbmcsIF9vcHRzOiBMb25lbG9nRm9ybWF0T3B0aW9ucyk6IHN0cmluZyB7XG4gIHJldHVybiBgXFxcXC0tLVxcbiR7Y2xlYW5BaVRleHQoYWlQcm9zZSl9XFxuLS0tXFxcXGA7XG59XG4iLCAiaW1wb3J0IHsgQXBwLCBNb2RhbCwgTm90aWNlLCBTZXR0aW5nLCBURmlsZSB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHsgZGVzY3JpYmVTb3VyY2VSZWYsIGxpc3RWYXVsdENhbmRpZGF0ZUZpbGVzIH0gZnJvbSBcIi4vc291cmNlVXRpbHNcIjtcbmltcG9ydCB7IE1vZGFsRmllbGQsIFNvdXJjZVJlZiwgVXBsb2FkZWRGaWxlSW5mbyB9IGZyb20gXCIuL3R5cGVzXCI7XG5cbmV4cG9ydCBjbGFzcyBJbnB1dE1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICBwcml2YXRlIHJlYWRvbmx5IHZhbHVlczogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBhcHA6IEFwcCxcbiAgICBwcml2YXRlIHJlYWRvbmx5IHRpdGxlOiBzdHJpbmcsXG4gICAgcHJpdmF0ZSByZWFkb25seSBmaWVsZHM6IE1vZGFsRmllbGRbXSxcbiAgICBwcml2YXRlIHJlYWRvbmx5IG9uU3VibWl0OiAodmFsdWVzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KSA9PiB2b2lkXG4gICkge1xuICAgIHN1cGVyKGFwcCk7XG4gICAgdGhpcy52YWx1ZXMgPSBmaWVsZHMucmVkdWNlPFJlY29yZDxzdHJpbmcsIHN0cmluZz4+KChhY2MsIGZpZWxkKSA9PiB7XG4gICAgICBhY2NbZmllbGQua2V5XSA9IGZpZWxkLnZhbHVlID8/IFwiXCI7XG4gICAgICByZXR1cm4gYWNjO1xuICAgIH0sIHt9KTtcbiAgfVxuXG4gIG9uT3BlbigpOiB2b2lkIHtcbiAgICB0aGlzLnRpdGxlRWwuc2V0VGV4dCh0aGlzLnRpdGxlKTtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIGZvciAoY29uc3QgZmllbGQgb2YgdGhpcy5maWVsZHMpIHtcbiAgICAgIG5ldyBTZXR0aW5nKHRoaXMuY29udGVudEVsKVxuICAgICAgICAuc2V0TmFtZShmaWVsZC5sYWJlbClcbiAgICAgICAgLnNldERlc2MoZmllbGQub3B0aW9uYWwgPyBcIk9wdGlvbmFsXCIgOiBcIlwiKVxuICAgICAgICAuYWRkVGV4dCgodGV4dCkgPT4ge1xuICAgICAgICAgIHRleHQuc2V0UGxhY2Vob2xkZXIoZmllbGQucGxhY2Vob2xkZXIgPz8gXCJcIik7XG4gICAgICAgICAgdGV4dC5zZXRWYWx1ZSh0aGlzLnZhbHVlc1tmaWVsZC5rZXldID8/IFwiXCIpO1xuICAgICAgICAgIHRleHQub25DaGFuZ2UoKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnZhbHVlc1tmaWVsZC5rZXldID0gdmFsdWU7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBuZXcgU2V0dGluZyh0aGlzLmNvbnRlbnRFbCkuYWRkQnV0dG9uKChidXR0b24pID0+IHtcbiAgICAgIGJ1dHRvbi5zZXRCdXR0b25UZXh0KFwiQ29uZmlybVwiKS5zZXRDdGEoKS5vbkNsaWNrKCgpID0+IHtcbiAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICB0aGlzLm9uU3VibWl0KHRoaXMudmFsdWVzKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgb25DbG9zZSgpOiB2b2lkIHtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvcGVuSW5wdXRNb2RhbChcbiAgYXBwOiBBcHAsXG4gIHRpdGxlOiBzdHJpbmcsXG4gIGZpZWxkczogTW9kYWxGaWVsZFtdXG4pOiBQcm9taXNlPFJlY29yZDxzdHJpbmcsIHN0cmluZz4gfCBudWxsPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIGxldCBzZXR0bGVkID0gZmFsc2U7XG4gICAgY29uc3QgbW9kYWwgPSBuZXcgSW5wdXRNb2RhbChhcHAsIHRpdGxlLCBmaWVsZHMsICh2YWx1ZXMpID0+IHtcbiAgICAgIHNldHRsZWQgPSB0cnVlO1xuICAgICAgcmVzb2x2ZSh2YWx1ZXMpO1xuICAgIH0pO1xuICAgIGNvbnN0IG9yaWdpbmFsQ2xvc2UgPSBtb2RhbC5vbkNsb3NlLmJpbmQobW9kYWwpO1xuICAgIG1vZGFsLm9uQ2xvc2UgPSAoKSA9PiB7XG4gICAgICBvcmlnaW5hbENsb3NlKCk7XG4gICAgICBpZiAoIXNldHRsZWQpIHtcbiAgICAgICAgcmVzb2x2ZShudWxsKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIG1vZGFsLm9wZW4oKTtcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwaWNrTG9jYWxGaWxlKCk6IFByb21pc2U8RmlsZSB8IG51bGw+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgY29uc3QgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIik7XG4gICAgaW5wdXQudHlwZSA9IFwiZmlsZVwiO1xuICAgIGlucHV0LmFjY2VwdCA9IFwiLnBkZiwudHh0LC5tZCwubWFya2Rvd25cIjtcbiAgICBpbnB1dC5vbmNoYW5nZSA9ICgpID0+IHJlc29sdmUoaW5wdXQuZmlsZXM/LlswXSA/PyBudWxsKTtcbiAgICBpbnB1dC5jbGljaygpO1xuICB9KTtcbn1cblxuZXhwb3J0IGNsYXNzIFZhdWx0RmlsZVBpY2tlck1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICBwcml2YXRlIHJlYWRvbmx5IGZpbGVzOiBURmlsZVtdO1xuXG4gIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwcml2YXRlIHJlYWRvbmx5IHRpdGxlOiBzdHJpbmcsIHByaXZhdGUgcmVhZG9ubHkgb25QaWNrOiAoZmlsZTogVEZpbGUpID0+IHZvaWQpIHtcbiAgICBzdXBlcihhcHApO1xuICAgIHRoaXMuZmlsZXMgPSBsaXN0VmF1bHRDYW5kaWRhdGVGaWxlcyhhcHApO1xuICB9XG5cbiAgb25PcGVuKCk6IHZvaWQge1xuICAgIHRoaXMudGl0bGVFbC5zZXRUZXh0KHRoaXMudGl0bGUpO1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gICAgaWYgKCF0aGlzLmZpbGVzLmxlbmd0aCkge1xuICAgICAgdGhpcy5jb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogXCJObyBQREYgb3IgdGV4dCBmaWxlcyBmb3VuZCBpbiB0aGUgdmF1bHQuXCIgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuZmlsZXMuZm9yRWFjaCgoZmlsZSkgPT4ge1xuICAgICAgbmV3IFNldHRpbmcodGhpcy5jb250ZW50RWwpXG4gICAgICAgIC5zZXROYW1lKGZpbGUucGF0aClcbiAgICAgICAgLnNldERlc2MoZmlsZS5leHRlbnNpb24udG9Mb3dlckNhc2UoKSlcbiAgICAgICAgLmFkZEJ1dHRvbigoYnV0dG9uKSA9PiB7XG4gICAgICAgICAgYnV0dG9uLnNldEJ1dHRvblRleHQoXCJTZWxlY3RcIikuc2V0Q3RhKCkub25DbGljaygoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICB0aGlzLm9uUGljayhmaWxlKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBvbkNsb3NlKCk6IHZvaWQge1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBpY2tWYXVsdEZpbGUoYXBwOiBBcHAsIHRpdGxlOiBzdHJpbmcpOiBQcm9taXNlPFRGaWxlIHwgbnVsbD4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICBsZXQgc2V0dGxlZCA9IGZhbHNlO1xuICAgIGNvbnN0IG1vZGFsID0gbmV3IFZhdWx0RmlsZVBpY2tlck1vZGFsKGFwcCwgdGl0bGUsIChmaWxlKSA9PiB7XG4gICAgICBzZXR0bGVkID0gdHJ1ZTtcbiAgICAgIHJlc29sdmUoZmlsZSk7XG4gICAgfSk7XG4gICAgY29uc3Qgb3JpZ2luYWxDbG9zZSA9IG1vZGFsLm9uQ2xvc2UuYmluZChtb2RhbCk7XG4gICAgbW9kYWwub25DbG9zZSA9ICgpID0+IHtcbiAgICAgIG9yaWdpbmFsQ2xvc2UoKTtcbiAgICAgIGlmICghc2V0dGxlZCkge1xuICAgICAgICByZXNvbHZlKG51bGwpO1xuICAgICAgfVxuICAgIH07XG4gICAgbW9kYWwub3BlbigpO1xuICB9KTtcbn1cblxuZXhwb3J0IGNsYXNzIE1hbmFnZVNvdXJjZXNNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgY29uc3RydWN0b3IoXG4gICAgYXBwOiBBcHAsXG4gICAgcHJpdmF0ZSByZWFkb25seSBzb3VyY2VzOiBTb3VyY2VSZWZbXSxcbiAgICBwcml2YXRlIHJlYWRvbmx5IG9uUmVtb3ZlRnJvbU5vdGU6IChyZWY6IFNvdXJjZVJlZikgPT4gUHJvbWlzZTx2b2lkPixcbiAgICBwcml2YXRlIHJlYWRvbmx5IG9uRGVsZXRlRnJvbVByb3ZpZGVyOiAocmVmOiBTb3VyY2VSZWYpID0+IFByb21pc2U8dm9pZD4sXG4gICAgcHJpdmF0ZSByZWFkb25seSBvbkFkZFNvdXJjZTogKCkgPT4gUHJvbWlzZTx2b2lkPlxuICApIHtcbiAgICBzdXBlcihhcHApO1xuICB9XG5cbiAgb25PcGVuKCk6IHZvaWQge1xuICAgIHRoaXMudGl0bGVFbC5zZXRUZXh0KFwiTWFuYWdlIFNvdXJjZXNcIik7XG4gICAgdGhpcy5yZW5kZXIoKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyKCk6IHZvaWQge1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gICAgbmV3IFNldHRpbmcodGhpcy5jb250ZW50RWwpLmFkZEJ1dHRvbigoYnV0dG9uKSA9PiB7XG4gICAgICBidXR0b24uc2V0QnV0dG9uVGV4dChcIkFkZCBzb3VyY2VcIikuc2V0Q3RhKCkub25DbGljayhhc3luYyAoKSA9PiB7XG4gICAgICAgIGF3YWl0IHRoaXMub25BZGRTb3VyY2UoKTtcbiAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gICAgaWYgKCF0aGlzLnNvdXJjZXMubGVuZ3RoKSB7XG4gICAgICB0aGlzLmNvbnRlbnRFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIk5vIHNvdXJjZXMgYXJlIGF0dGFjaGVkIHRvIHRoaXMgbm90ZS5cIiB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5zb3VyY2VzLmZvckVhY2goKHNvdXJjZSkgPT4ge1xuICAgICAgbmV3IFNldHRpbmcodGhpcy5jb250ZW50RWwpXG4gICAgICAgIC5zZXROYW1lKHNvdXJjZS5sYWJlbClcbiAgICAgICAgLnNldERlc2MoYCR7c291cmNlLnByb3ZpZGVyfSB8ICR7ZGVzY3JpYmVTb3VyY2VSZWYoc291cmNlKX0ke3NvdXJjZS5leHBpcmVzQXQgPyBgIHwgRXhwaXJlcyAke3NvdXJjZS5leHBpcmVzQXR9YCA6IFwiXCJ9YClcbiAgICAgICAgLmFkZEJ1dHRvbigoYnV0dG9uKSA9PiB7XG4gICAgICAgICAgYnV0dG9uLnNldEJ1dHRvblRleHQoXCJSZW1vdmUgZnJvbSBub3RlXCIpLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5vblJlbW92ZUZyb21Ob3RlKHNvdXJjZSk7XG4gICAgICAgICAgICBuZXcgTm90aWNlKGBSZW1vdmVkICcke3NvdXJjZS5sYWJlbH0nIGZyb20gbm90ZS5gKTtcbiAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICAgICAgLmFkZEJ1dHRvbigoYnV0dG9uKSA9PiB7XG4gICAgICAgICAgYnV0dG9uLnNldEJ1dHRvblRleHQoXCJEZWxldGUgZnJvbSBwcm92aWRlclwiKTtcbiAgICAgICAgICBpZiAoIShzb3VyY2UuZmlsZV91cmkgfHwgc291cmNlLmZpbGVfaWQpKSB7XG4gICAgICAgICAgICBidXR0b24uc2V0RGlzYWJsZWQodHJ1ZSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGJ1dHRvbi5vbkNsaWNrKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMub25EZWxldGVGcm9tUHJvdmlkZXIoc291cmNlKTtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoYERlbGV0ZWQgJyR7c291cmNlLmxhYmVsfScgZnJvbSBwcm92aWRlci5gKTtcbiAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBvbkNsb3NlKCk6IHZvaWQge1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFVwbG9hZGVkRmlsZXNNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgcHJpdmF0ZSBmaWxlc1N0YXRlOiBVcGxvYWRlZEZpbGVJbmZvW107XG5cbiAgY29uc3RydWN0b3IoXG4gICAgYXBwOiBBcHAsXG4gICAgcHJpdmF0ZSByZWFkb25seSB0aXRsZTogc3RyaW5nLFxuICAgIGZpbGVzOiBVcGxvYWRlZEZpbGVJbmZvW10sXG4gICAgcHJpdmF0ZSByZWFkb25seSBvblJlZnJlc2g6ICgpID0+IFByb21pc2U8VXBsb2FkZWRGaWxlSW5mb1tdPixcbiAgICBwcml2YXRlIHJlYWRvbmx5IG9uRGVsZXRlOiAoZmlsZTogVXBsb2FkZWRGaWxlSW5mbykgPT4gUHJvbWlzZTx2b2lkPlxuICApIHtcbiAgICBzdXBlcihhcHApO1xuICAgIHRoaXMuZmlsZXNTdGF0ZSA9IGZpbGVzO1xuICB9XG5cbiAgb25PcGVuKCk6IHZvaWQge1xuICAgIHRoaXMudGl0bGVFbC5zZXRUZXh0KHRoaXMudGl0bGUpO1xuICAgIHZvaWQgdGhpcy5yZW5kZXIoKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcmVuZGVyKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gICAgbmV3IFNldHRpbmcodGhpcy5jb250ZW50RWwpLmFkZEJ1dHRvbigoYnV0dG9uKSA9PiB7XG4gICAgICBidXR0b24uc2V0QnV0dG9uVGV4dChcIlJlZnJlc2hcIikub25DbGljayhhc3luYyAoKSA9PiB7XG4gICAgICAgIHRoaXMuZmlsZXNTdGF0ZSA9IGF3YWl0IHRoaXMub25SZWZyZXNoKCk7XG4gICAgICAgIGF3YWl0IHRoaXMucmVuZGVyKCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICBpZiAoIXRoaXMuZmlsZXNTdGF0ZS5sZW5ndGgpIHtcbiAgICAgIHRoaXMuY29udGVudEVsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IFwiTm8gdXBsb2FkZWQgZmlsZXMgZm91bmQuXCIgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuZmlsZXNTdGF0ZS5mb3JFYWNoKChmaWxlKSA9PiB7XG4gICAgICBuZXcgU2V0dGluZyh0aGlzLmNvbnRlbnRFbClcbiAgICAgICAgLnNldE5hbWUoZmlsZS5sYWJlbClcbiAgICAgICAgLnNldERlc2MoYCR7ZmlsZS5taW1lX3R5cGV9JHtmaWxlLmV4cGlyZXNBdCA/IGAgfCBFeHBpcmVzICR7ZmlsZS5leHBpcmVzQXR9YCA6IFwiXCJ9YClcbiAgICAgICAgLmFkZEJ1dHRvbigoYnV0dG9uKSA9PiB7XG4gICAgICAgICAgYnV0dG9uLnNldEJ1dHRvblRleHQoXCJDb3B5IFVSSVwiKS5vbkNsaWNrKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIGF3YWl0IG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KGZpbGUuZmlsZV91cmkgPz8gZmlsZS5maWxlX2lkID8/IFwiXCIpO1xuICAgICAgICAgICAgbmV3IE5vdGljZShcIklkZW50aWZpZXIgY29waWVkIHRvIGNsaXBib2FyZC5cIik7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgICAgIC5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xuICAgICAgICAgIGJ1dHRvbi5zZXRCdXR0b25UZXh0KFwiRGVsZXRlXCIpLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5vbkRlbGV0ZShmaWxlKTtcbiAgICAgICAgICAgIHRoaXMuZmlsZXNTdGF0ZSA9IGF3YWl0IHRoaXMub25SZWZyZXNoKCk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnJlbmRlcigpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIG9uQ2xvc2UoKTogdm9pZCB7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgfVxufVxuIiwgImltcG9ydCB7IEFwcCwgTm90aWNlLCBQbHVnaW5TZXR0aW5nVGFiLCBTZXR0aW5nIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgdHlwZSBTeWJ5bFBsdWdpbiBmcm9tIFwiLi9tYWluXCI7XG5pbXBvcnQgeyBVcGxvYWRlZEZpbGVzTW9kYWwgfSBmcm9tIFwiLi9tb2RhbHNcIjtcbmltcG9ydCB7IGdldFByb3ZpZGVyIH0gZnJvbSBcIi4vcHJvdmlkZXJzXCI7XG5pbXBvcnQgeyBHZW1pbmlQcm92aWRlciB9IGZyb20gXCIuL3Byb3ZpZGVycy9nZW1pbmlcIjtcbmltcG9ydCB7IE9sbGFtYVByb3ZpZGVyIH0gZnJvbSBcIi4vcHJvdmlkZXJzL29sbGFtYVwiO1xuaW1wb3J0IHsgUHJvdmlkZXJJRCwgU3lieWxTZXR0aW5ncywgVmFsaWRhdGlvblN0YXRlIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuZXhwb3J0IGNvbnN0IERFRkFVTFRfU0VUVElOR1M6IFN5YnlsU2V0dGluZ3MgPSB7XG4gIGFjdGl2ZVByb3ZpZGVyOiBcImdlbWluaVwiLFxuICBwcm92aWRlcnM6IHtcbiAgICBnZW1pbmk6IHsgYXBpS2V5OiBcIlwiLCBkZWZhdWx0TW9kZWw6IFwiZ2VtaW5pLTMuMS1wcm8tcHJldmlld1wiIH0sXG4gICAgb3BlbmFpOiB7IGFwaUtleTogXCJcIiwgZGVmYXVsdE1vZGVsOiBcImdwdC01LjJcIiwgYmFzZVVybDogXCJodHRwczovL2FwaS5vcGVuYWkuY29tL3YxXCIgfSxcbiAgICBhbnRocm9waWM6IHsgYXBpS2V5OiBcIlwiLCBkZWZhdWx0TW9kZWw6IFwiY2xhdWRlLXNvbm5ldC00LTZcIiB9LFxuICAgIG9sbGFtYTogeyBiYXNlVXJsOiBcImh0dHA6Ly9sb2NhbGhvc3Q6MTE0MzRcIiwgZGVmYXVsdE1vZGVsOiBcImdlbW1hM1wiIH1cbiAgfSxcbiAgaW5zZXJ0aW9uTW9kZTogXCJjdXJzb3JcIixcbiAgc2hvd1Rva2VuQ291bnQ6IGZhbHNlLFxuICBkZWZhdWx0VGVtcGVyYXR1cmU6IDAuNyxcbiAgbG9uZWxvZ01vZGU6IGZhbHNlLFxuICBsb25lbG9nQ29udGV4dERlcHRoOiA2MCxcbiAgbG9uZWxvZ1dyYXBDb2RlQmxvY2s6IHRydWUsXG4gIGxvbmVsb2dBdXRvSW5jU2NlbmU6IHRydWVcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVTZXR0aW5ncyhyYXc6IFBhcnRpYWw8U3lieWxTZXR0aW5ncz4gfCBudWxsIHwgdW5kZWZpbmVkKTogU3lieWxTZXR0aW5ncyB7XG4gIHJldHVybiB7XG4gICAgLi4uREVGQVVMVF9TRVRUSU5HUyxcbiAgICAuLi4ocmF3ID8/IHt9KSxcbiAgICBwcm92aWRlcnM6IHtcbiAgICAgIGdlbWluaTogeyAuLi5ERUZBVUxUX1NFVFRJTkdTLnByb3ZpZGVycy5nZW1pbmksIC4uLihyYXc/LnByb3ZpZGVycz8uZ2VtaW5pID8/IHt9KSB9LFxuICAgICAgb3BlbmFpOiB7IC4uLkRFRkFVTFRfU0VUVElOR1MucHJvdmlkZXJzLm9wZW5haSwgLi4uKHJhdz8ucHJvdmlkZXJzPy5vcGVuYWkgPz8ge30pIH0sXG4gICAgICBhbnRocm9waWM6IHsgLi4uREVGQVVMVF9TRVRUSU5HUy5wcm92aWRlcnMuYW50aHJvcGljLCAuLi4ocmF3Py5wcm92aWRlcnM/LmFudGhyb3BpYyA/PyB7fSkgfSxcbiAgICAgIG9sbGFtYTogeyAuLi5ERUZBVUxUX1NFVFRJTkdTLnByb3ZpZGVycy5vbGxhbWEsIC4uLihyYXc/LnByb3ZpZGVycz8ub2xsYW1hID8/IHt9KSB9XG4gICAgfVxuICB9O1xufVxuXG5jb25zdCBHRU1JTklfTU9ERUxTID0gW1xuICBcImdlbWluaS0zLjEtcHJvLXByZXZpZXdcIixcbiAgXCJnZW1pbmktMy4xLXByby1wcmV2aWV3LWN1c3RvbXRvb2xzXCIsXG4gIFwiZ2VtaW5pLTIuNS1mbGFzaFwiXG5dO1xuY29uc3QgT1BFTkFJX01PREVMUyA9IFtcImdwdC01LjJcIiwgXCJncHQtNC4xXCIsIFwiZ3B0LTQuMS1taW5pXCJdO1xuY29uc3QgQU5USFJPUElDX01PREVMUyA9IFtcbiAgXCJjbGF1ZGUtb3B1cy00LTZcIixcbiAgXCJjbGF1ZGUtc29ubmV0LTQtNlwiLFxuICBcImNsYXVkZS1oYWlrdS00LTUtMjAyNTEwMDFcIlxuXTtcblxuZXhwb3J0IGNsYXNzIFN5YnlsU2V0dGluZ1RhYiBleHRlbmRzIFBsdWdpblNldHRpbmdUYWIge1xuICBwcml2YXRlIHZhbGlkYXRpb246IFBhcnRpYWw8UmVjb3JkPFByb3ZpZGVySUQsIFZhbGlkYXRpb25TdGF0ZT4+ID0ge307XG4gIHByaXZhdGUgb2xsYW1hTW9kZWxzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwcml2YXRlIHJlYWRvbmx5IHBsdWdpbjogU3lieWxQbHVnaW4pIHtcbiAgICBzdXBlcihhcHAsIHBsdWdpbik7XG4gIH1cblxuICBkaXNwbGF5KCk6IHZvaWQge1xuICAgIGNvbnN0IHsgY29udGFpbmVyRWwgfSA9IHRoaXM7XG4gICAgY29udGFpbmVyRWwuZW1wdHkoKTtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogYFN5YnlsIFNldHRpbmdzICgke3RoaXMucHJvdmlkZXJMYWJlbCh0aGlzLnBsdWdpbi5zZXR0aW5ncy5hY3RpdmVQcm92aWRlcil9KWAgfSk7XG4gICAgdGhpcy5yZW5kZXJBY3RpdmVQcm92aWRlcihjb250YWluZXJFbCk7XG4gICAgdGhpcy5yZW5kZXJQcm92aWRlckNvbmZpZyhjb250YWluZXJFbCk7XG4gICAgdGhpcy5yZW5kZXJHbG9iYWxTZXR0aW5ncyhjb250YWluZXJFbCk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlckFjdGl2ZVByb3ZpZGVyKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJBY3RpdmUgUHJvdmlkZXJcIilcbiAgICAgIC5zZXREZXNjKFwiVXNlZCB3aGVuIGEgbm90ZSBkb2VzIG5vdCBvdmVycmlkZSBwcm92aWRlci5cIilcbiAgICAgIC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcbiAgICAgICAgZHJvcGRvd24uYWRkT3B0aW9uKFwiZ2VtaW5pXCIsIFwiR2VtaW5pXCIpO1xuICAgICAgICBkcm9wZG93bi5hZGRPcHRpb24oXCJvcGVuYWlcIiwgXCJPcGVuQUlcIik7XG4gICAgICAgIGRyb3Bkb3duLmFkZE9wdGlvbihcImFudGhyb3BpY1wiLCBcIkFudGhyb3BpYyAoQ2xhdWRlKVwiKTtcbiAgICAgICAgZHJvcGRvd24uYWRkT3B0aW9uKFwib2xsYW1hXCIsIFwiT2xsYW1hIChsb2NhbClcIik7XG4gICAgICAgIGRyb3Bkb3duLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmFjdGl2ZVByb3ZpZGVyKTtcbiAgICAgICAgZHJvcGRvd24ub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuYWN0aXZlUHJvdmlkZXIgPSB2YWx1ZSBhcyBQcm92aWRlcklEO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgIHRoaXMuZGlzcGxheSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJQcm92aWRlckNvbmZpZyhjb250YWluZXJFbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJQcm92aWRlciBDb25maWd1cmF0aW9uXCIgfSk7XG4gICAgc3dpdGNoICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5hY3RpdmVQcm92aWRlcikge1xuICAgICAgY2FzZSBcImdlbWluaVwiOlxuICAgICAgICB0aGlzLnJlbmRlckdlbWluaVNldHRpbmdzKGNvbnRhaW5lckVsKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwib3BlbmFpXCI6XG4gICAgICAgIHRoaXMucmVuZGVyT3BlbkFJU2V0dGluZ3MoY29udGFpbmVyRWwpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgXCJhbnRocm9waWNcIjpcbiAgICAgICAgdGhpcy5yZW5kZXJBbnRocm9waWNTZXR0aW5ncyhjb250YWluZXJFbCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcIm9sbGFtYVwiOlxuICAgICAgICB0aGlzLnJlbmRlck9sbGFtYVNldHRpbmdzKGNvbnRhaW5lckVsKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJHZW1pbmlTZXR0aW5ncyhjb250YWluZXJFbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgICBjb25zdCBjb25maWcgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcm92aWRlcnMuZ2VtaW5pO1xuICAgIHRoaXMucmVuZGVyVmFsaWRhdGlvblN0YXRlKGNvbnRhaW5lckVsLCBcImdlbWluaVwiKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiQVBJIEtleVwiKVxuICAgICAgLmFkZFRleHQoKHRleHQpID0+IHtcbiAgICAgICAgdGV4dC5pbnB1dEVsLnR5cGUgPSBcInBhc3N3b3JkXCI7XG4gICAgICAgIHRleHQuc2V0VmFsdWUoY29uZmlnLmFwaUtleSk7XG4gICAgICAgIHRleHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uZmlnLmFwaUtleSA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGV4dC5pbnB1dEVsLmFkZEV2ZW50TGlzdGVuZXIoXCJibHVyXCIsICgpID0+IHZvaWQgdGhpcy52YWxpZGF0ZVByb3ZpZGVyKFwiZ2VtaW5pXCIpKTtcbiAgICAgIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJEZWZhdWx0IE1vZGVsXCIpXG4gICAgICAuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PiB7XG4gICAgICAgIEdFTUlOSV9NT0RFTFMuZm9yRWFjaCgobW9kZWwpID0+IGRyb3Bkb3duLmFkZE9wdGlvbihtb2RlbCwgbW9kZWwpKTtcbiAgICAgICAgZHJvcGRvd24uc2V0VmFsdWUoY29uZmlnLmRlZmF1bHRNb2RlbCk7XG4gICAgICAgIGRyb3Bkb3duLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGNvbmZpZy5kZWZhdWx0TW9kZWwgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiTWFuYWdlIFVwbG9hZGVkIEZpbGVzXCIpXG4gICAgICAuYWRkQnV0dG9uKChidXR0b24pID0+IHtcbiAgICAgICAgYnV0dG9uLnNldEJ1dHRvblRleHQoXCJPcGVuXCIpLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBwcm92aWRlciA9IG5ldyBHZW1pbmlQcm92aWRlcihjb25maWcpO1xuICAgICAgICAgICAgY29uc3QgZmlsZXMgPSBhd2FpdCBwcm92aWRlci5saXN0U291cmNlcygpO1xuICAgICAgICAgICAgbmV3IFVwbG9hZGVkRmlsZXNNb2RhbCh0aGlzLmFwcCwgXCJHZW1pbmkgVXBsb2FkZWQgRmlsZXNcIiwgZmlsZXMsICgpID0+IHByb3ZpZGVyLmxpc3RTb3VyY2VzKCksIChmaWxlKSA9PiBwcm92aWRlci5kZWxldGVTb3VyY2UoZmlsZSkpLm9wZW4oKTtcbiAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgbmV3IE5vdGljZShlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcikpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyT3BlbkFJU2V0dGluZ3MoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gICAgY29uc3QgY29uZmlnID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucHJvdmlkZXJzLm9wZW5haTtcbiAgICB0aGlzLnJlbmRlclZhbGlkYXRpb25TdGF0ZShjb250YWluZXJFbCwgXCJvcGVuYWlcIik7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkFQSSBLZXlcIilcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PiB7XG4gICAgICAgIHRleHQuaW5wdXRFbC50eXBlID0gXCJwYXNzd29yZFwiO1xuICAgICAgICB0ZXh0LnNldFZhbHVlKGNvbmZpZy5hcGlLZXkpO1xuICAgICAgICB0ZXh0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGNvbmZpZy5hcGlLZXkgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRleHQuaW5wdXRFbC5hZGRFdmVudExpc3RlbmVyKFwiYmx1clwiLCAoKSA9PiB2b2lkIHRoaXMudmFsaWRhdGVQcm92aWRlcihcIm9wZW5haVwiKSk7XG4gICAgICB9KTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiQmFzZSBVUkxcIilcbiAgICAgIC5zZXREZXNjKFwiT3ZlcnJpZGUgZm9yIEF6dXJlIG9yIHByb3h5IGVuZHBvaW50c1wiKVxuICAgICAgLmFkZFRleHQoKHRleHQpID0+IHtcbiAgICAgICAgdGV4dC5zZXRWYWx1ZShjb25maWcuYmFzZVVybCk7XG4gICAgICAgIHRleHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uZmlnLmJhc2VVcmwgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRleHQuaW5wdXRFbC5hZGRFdmVudExpc3RlbmVyKFwiYmx1clwiLCAoKSA9PiB2b2lkIHRoaXMudmFsaWRhdGVQcm92aWRlcihcIm9wZW5haVwiKSk7XG4gICAgICB9KTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiRGVmYXVsdCBNb2RlbFwiKVxuICAgICAgLmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xuICAgICAgICBPUEVOQUlfTU9ERUxTLmZvckVhY2goKG1vZGVsKSA9PiBkcm9wZG93bi5hZGRPcHRpb24obW9kZWwsIG1vZGVsKSk7XG4gICAgICAgIGRyb3Bkb3duLnNldFZhbHVlKGNvbmZpZy5kZWZhdWx0TW9kZWwpO1xuICAgICAgICBkcm9wZG93bi5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICBjb25maWcuZGVmYXVsdE1vZGVsID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJwXCIsIHtcbiAgICAgIHRleHQ6IFwiT3BlbkFJIHNvdXJjZXMgdXNlIHZhdWx0X3BhdGguIEFkZCBzb3VyY2UgZmlsZXMgdmlhIHRoZSBNYW5hZ2UgU291cmNlcyBjb21tYW5kIGluIGFueSBub3RlLlwiXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlckFudGhyb3BpY1NldHRpbmdzKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIGNvbnN0IGNvbmZpZyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnByb3ZpZGVycy5hbnRocm9waWM7XG4gICAgdGhpcy5yZW5kZXJWYWxpZGF0aW9uU3RhdGUoY29udGFpbmVyRWwsIFwiYW50aHJvcGljXCIpO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJBUEkgS2V5XCIpXG4gICAgICAuYWRkVGV4dCgodGV4dCkgPT4ge1xuICAgICAgICB0ZXh0LmlucHV0RWwudHlwZSA9IFwicGFzc3dvcmRcIjtcbiAgICAgICAgdGV4dC5zZXRWYWx1ZShjb25maWcuYXBpS2V5KTtcbiAgICAgICAgdGV4dC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICBjb25maWcuYXBpS2V5ID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0ZXh0LmlucHV0RWwuYWRkRXZlbnRMaXN0ZW5lcihcImJsdXJcIiwgKCkgPT4gdm9pZCB0aGlzLnZhbGlkYXRlUHJvdmlkZXIoXCJhbnRocm9waWNcIikpO1xuICAgICAgfSk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkRlZmF1bHQgTW9kZWxcIilcbiAgICAgIC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcbiAgICAgICAgQU5USFJPUElDX01PREVMUy5mb3JFYWNoKChtb2RlbCkgPT4gZHJvcGRvd24uYWRkT3B0aW9uKG1vZGVsLCBtb2RlbCkpO1xuICAgICAgICBkcm9wZG93bi5zZXRWYWx1ZShjb25maWcuZGVmYXVsdE1vZGVsKTtcbiAgICAgICAgZHJvcGRvd24ub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uZmlnLmRlZmF1bHRNb2RlbCA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwicFwiLCB7XG4gICAgICB0ZXh0OiBcIlBERnMgYXJlIGVuY29kZWQgaW5saW5lIHBlciByZXF1ZXN0LiBVc2Ugc2hvcnQgZXhjZXJwdHMgdG8gYXZvaWQgaGlnaCB0b2tlbiBjb3N0cy5cIlxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJPbGxhbWFTZXR0aW5ncyhjb250YWluZXJFbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgICBjb25zdCBjb25maWcgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcm92aWRlcnMub2xsYW1hO1xuICAgIHRoaXMucmVuZGVyVmFsaWRhdGlvblN0YXRlKGNvbnRhaW5lckVsLCBcIm9sbGFtYVwiKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiQmFzZSBVUkxcIilcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PiB7XG4gICAgICAgIHRleHQuc2V0VmFsdWUoY29uZmlnLmJhc2VVcmwpO1xuICAgICAgICB0ZXh0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGNvbmZpZy5iYXNlVXJsID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0ZXh0LmlucHV0RWwuYWRkRXZlbnRMaXN0ZW5lcihcImJsdXJcIiwgKCkgPT4gdm9pZCB0aGlzLnZhbGlkYXRlT2xsYW1hKCkpO1xuICAgICAgfSk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkF2YWlsYWJsZSBNb2RlbHNcIilcbiAgICAgIC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHRoaXMub2xsYW1hTW9kZWxzLmxlbmd0aCA/IHRoaXMub2xsYW1hTW9kZWxzIDogW2NvbmZpZy5kZWZhdWx0TW9kZWxdO1xuICAgICAgICBvcHRpb25zLmZvckVhY2goKG1vZGVsKSA9PiBkcm9wZG93bi5hZGRPcHRpb24obW9kZWwsIG1vZGVsKSk7XG4gICAgICAgIGRyb3Bkb3duLnNldFZhbHVlKG9wdGlvbnMuaW5jbHVkZXMoY29uZmlnLmRlZmF1bHRNb2RlbCkgPyBjb25maWcuZGVmYXVsdE1vZGVsIDogb3B0aW9uc1swXSk7XG4gICAgICAgIGRyb3Bkb3duLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGNvbmZpZy5kZWZhdWx0TW9kZWwgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICB0aGlzLmRpc3BsYXkoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiRGVmYXVsdCBNb2RlbFwiKVxuICAgICAgLmFkZFRleHQoKHRleHQpID0+IHtcbiAgICAgICAgdGV4dC5zZXRWYWx1ZShjb25maWcuZGVmYXVsdE1vZGVsKTtcbiAgICAgICAgdGV4dC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICBjb25maWcuZGVmYXVsdE1vZGVsID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJwXCIsIHtcbiAgICAgIHRleHQ6IFwiTm8gQVBJIGtleSByZXF1aXJlZC4gT2xsYW1hIG11c3QgYmUgcnVubmluZyBsb2NhbGx5LiBGaWxlIGdyb3VuZGluZyB1c2VzIHZhdWx0X3BhdGggdGV4dCBleHRyYWN0aW9uLlwiXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlckdsb2JhbFNldHRpbmdzKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIkdsb2JhbCBTZXR0aW5nc1wiIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJEZWZhdWx0IFRlbXBlcmF0dXJlXCIpXG4gICAgICAuc2V0RGVzYyhTdHJpbmcodGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVmYXVsdFRlbXBlcmF0dXJlKSlcbiAgICAgIC5hZGRTbGlkZXIoKHNsaWRlcikgPT4ge1xuICAgICAgICBzbGlkZXIuc2V0TGltaXRzKDAsIDEsIDAuMDUpO1xuICAgICAgICBzbGlkZXIuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVmYXVsdFRlbXBlcmF0dXJlKTtcbiAgICAgICAgc2xpZGVyLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmRlZmF1bHRUZW1wZXJhdHVyZSA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgIHRoaXMuZGlzcGxheSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJJbnNlcnRpb24gTW9kZVwiKVxuICAgICAgLmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xuICAgICAgICBkcm9wZG93bi5hZGRPcHRpb24oXCJjdXJzb3JcIiwgXCJBdCBjdXJzb3JcIik7XG4gICAgICAgIGRyb3Bkb3duLmFkZE9wdGlvbihcImVuZC1vZi1ub3RlXCIsIFwiRW5kIG9mIG5vdGVcIik7XG4gICAgICAgIGRyb3Bkb3duLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmluc2VydGlvbk1vZGUpO1xuICAgICAgICBkcm9wZG93bi5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5pbnNlcnRpb25Nb2RlID0gdmFsdWUgYXMgXCJjdXJzb3JcIiB8IFwiZW5kLW9mLW5vdGVcIjtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiU2hvdyBUb2tlbiBDb3VudFwiKVxuICAgICAgLmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB7XG4gICAgICAgIHRvZ2dsZS5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5zaG93VG9rZW5Db3VudCk7XG4gICAgICAgIHRvZ2dsZS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zaG93VG9rZW5Db3VudCA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJMb25lbG9nIE1vZGVcIilcbiAgICAgIC5zZXREZXNjKFwiRW5hYmxlIExvbmVsb2cgbm90YXRpb24sIGNvbnRleHQgcGFyc2luZywgYW5kIExvbmVsb2ctc3BlY2lmaWMgY29tbWFuZHMuXCIpXG4gICAgICAuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcbiAgICAgICAgdG9nZ2xlLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmxvbmVsb2dNb2RlKTtcbiAgICAgICAgdG9nZ2xlLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmxvbmVsb2dNb2RlID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgdGhpcy5kaXNwbGF5KCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgaWYgKHRoaXMucGx1Z2luLnNldHRpbmdzLmxvbmVsb2dNb2RlKSB7XG4gICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgICAgLnNldE5hbWUoXCJBdXRvLWluY3JlbWVudCBzY2VuZSBjb3VudGVyXCIpXG4gICAgICAgIC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xuICAgICAgICAgIHRvZ2dsZS5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5sb25lbG9nQXV0b0luY1NjZW5lKTtcbiAgICAgICAgICB0b2dnbGUub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5sb25lbG9nQXV0b0luY1NjZW5lID0gdmFsdWU7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgICAgLnNldE5hbWUoXCJDb250ZXh0IGV4dHJhY3Rpb24gZGVwdGhcIilcbiAgICAgICAgLmFkZFRleHQoKHRleHQpID0+IHtcbiAgICAgICAgICB0ZXh0LnNldFZhbHVlKFN0cmluZyh0aGlzLnBsdWdpbi5zZXR0aW5ncy5sb25lbG9nQ29udGV4dERlcHRoKSk7XG4gICAgICAgICAgdGV4dC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG5leHQgPSBOdW1iZXIodmFsdWUpO1xuICAgICAgICAgICAgaWYgKCFOdW1iZXIuaXNOYU4obmV4dCkgJiYgbmV4dCA+IDApIHtcbiAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MubG9uZWxvZ0NvbnRleHREZXB0aCA9IG5leHQ7XG4gICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgICAuc2V0TmFtZShcIldyYXAgbm90YXRpb24gaW4gY29kZSBibG9ja3NcIilcbiAgICAgICAgLmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB7XG4gICAgICAgICAgdG9nZ2xlLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmxvbmVsb2dXcmFwQ29kZUJsb2NrKTtcbiAgICAgICAgICB0b2dnbGUub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5sb25lbG9nV3JhcENvZGVCbG9jayA9IHZhbHVlO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyVmFsaWRhdGlvblN0YXRlKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCwgcHJvdmlkZXI6IFByb3ZpZGVySUQpOiB2b2lkIHtcbiAgICBjb25zdCBzdGF0ZSA9IHRoaXMudmFsaWRhdGlvbltwcm92aWRlcl07XG4gICAgaWYgKCFzdGF0ZSB8fCBzdGF0ZS5zdGF0dXMgPT09IFwiaWRsZVwiKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwicFwiLCB7XG4gICAgICB0ZXh0OlxuICAgICAgICBzdGF0ZS5zdGF0dXMgPT09IFwiY2hlY2tpbmdcIlxuICAgICAgICAgID8gXCJWYWxpZGF0aW9uOiBjaGVja2luZy4uLlwiXG4gICAgICAgICAgOiBzdGF0ZS5zdGF0dXMgPT09IFwidmFsaWRcIlxuICAgICAgICAgICAgPyBcIlZhbGlkYXRpb246IFx1MjcxM1wiXG4gICAgICAgICAgICA6IGBWYWxpZGF0aW9uOiBcdTI3MTcke3N0YXRlLm1lc3NhZ2UgPyBgICgke3N0YXRlLm1lc3NhZ2V9KWAgOiBcIlwifWBcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcHJvdmlkZXJMYWJlbChwcm92aWRlcjogUHJvdmlkZXJJRCk6IHN0cmluZyB7XG4gICAgc3dpdGNoIChwcm92aWRlcikge1xuICAgICAgY2FzZSBcImdlbWluaVwiOlxuICAgICAgICByZXR1cm4gXCJHZW1pbmlcIjtcbiAgICAgIGNhc2UgXCJvcGVuYWlcIjpcbiAgICAgICAgcmV0dXJuIFwiT3BlbkFJXCI7XG4gICAgICBjYXNlIFwiYW50aHJvcGljXCI6XG4gICAgICAgIHJldHVybiBcIkFudGhyb3BpY1wiO1xuICAgICAgY2FzZSBcIm9sbGFtYVwiOlxuICAgICAgICByZXR1cm4gXCJPbGxhbWFcIjtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHZhbGlkYXRlUHJvdmlkZXIocHJvdmlkZXI6IFByb3ZpZGVySUQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLnZhbGlkYXRpb25bcHJvdmlkZXJdID0geyBzdGF0dXM6IFwiY2hlY2tpbmdcIiB9O1xuICAgIHRoaXMuZGlzcGxheSgpO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB2YWxpZCA9IGF3YWl0IGdldFByb3ZpZGVyKHRoaXMucGx1Z2luLnNldHRpbmdzLCBwcm92aWRlcikudmFsaWRhdGUoKTtcbiAgICAgIHRoaXMudmFsaWRhdGlvbltwcm92aWRlcl0gPSB7IHN0YXR1czogdmFsaWQgPyBcInZhbGlkXCIgOiBcImludmFsaWRcIiB9O1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLnZhbGlkYXRpb25bcHJvdmlkZXJdID0ge1xuICAgICAgICBzdGF0dXM6IFwiaW52YWxpZFwiLFxuICAgICAgICBtZXNzYWdlOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcilcbiAgICAgIH07XG4gICAgfVxuICAgIHRoaXMuZGlzcGxheSgpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyB2YWxpZGF0ZU9sbGFtYSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLnZhbGlkYXRpb24ub2xsYW1hID0geyBzdGF0dXM6IFwiY2hlY2tpbmdcIiB9O1xuICAgIHRoaXMuZGlzcGxheSgpO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBwcm92aWRlciA9IG5ldyBPbGxhbWFQcm92aWRlcih0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcm92aWRlcnMub2xsYW1hKTtcbiAgICAgIGNvbnN0IHZhbGlkID0gYXdhaXQgcHJvdmlkZXIudmFsaWRhdGUoKTtcbiAgICAgIHRoaXMudmFsaWRhdGlvbi5vbGxhbWEgPSB7IHN0YXR1czogdmFsaWQgPyBcInZhbGlkXCIgOiBcImludmFsaWRcIiB9O1xuICAgICAgdGhpcy5vbGxhbWFNb2RlbHMgPSB2YWxpZCA/IGF3YWl0IHByb3ZpZGVyLmxpc3RNb2RlbHMoKSA6IFtdO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLnZhbGlkYXRpb24ub2xsYW1hID0ge1xuICAgICAgICBzdGF0dXM6IFwiaW52YWxpZFwiLFxuICAgICAgICBtZXNzYWdlOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcilcbiAgICAgIH07XG4gICAgICB0aGlzLm9sbGFtYU1vZGVscyA9IFtdO1xuICAgICAgbmV3IE5vdGljZSh0aGlzLnZhbGlkYXRpb24ub2xsYW1hLm1lc3NhZ2UgPz8gXCJPbGxhbWEgdmFsaWRhdGlvbiBmYWlsZWQuXCIpO1xuICAgIH1cbiAgICB0aGlzLmRpc3BsYXkoKTtcbiAgfVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBQUFBLG1CQUE2Qzs7O0FDRXRDLFNBQVMs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Q0FBQztBQUFBLEVBQ3pEO0FBQUEsRUFFQSxNQUFNLGVBQThCO0FBQ2xDLFVBQU0sS0FBSyxTQUFTLEtBQUssUUFBUTtBQUFBLEVBQ25DO0FBQUEsRUFFQSxNQUFNLHVCQUEwRDtBQUM5RCxVQUFNLE9BQU8sS0FBSyxJQUFJLFVBQVUsb0JBQW9CLDZCQUFZO0FBQ2hFLFFBQUksRUFBQyw2QkFBTSxPQUFNO0FBQ2YsVUFBSSx3QkFBTywwQkFBMEI7QUFDckMsYUFBTztBQUFBLElBQ1Q7QUFDQSxXQUFPO0FBQUEsTUFDTDtBQUFBLE1BQ0EsSUFBSSxNQUFNLGdCQUFnQixLQUFLLEtBQUssS0FBSyxJQUFJO0FBQUEsTUFDN0MsVUFBVSxNQUFNLEtBQUssSUFBSSxNQUFNLFdBQVcsS0FBSyxJQUFJO0FBQUEsSUFDckQ7QUFBQSxFQUNGO0FBQUEsRUFFQSxNQUFNLGtCQUNKLElBQ0EsVUFDQSxhQUNBLGtCQUFrQixLQUNXO0FBQzdCLFVBQU0sV0FBVyxZQUFZLEtBQUssVUFBVSxHQUFHLFFBQVE7QUFDdkQsVUFBTSxVQUFVLE1BQU0sYUFBYSxLQUFLLEtBQUssSUFBSSxhQUFhLEtBQUssVUFBVSxpQkFBaUIsUUFBUTtBQUN0RyxVQUFNLFdBQVcsSUFBSSx3QkFBTyx3QkFBd0IsQ0FBQztBQUNyRCxRQUFJO0FBQ0YsYUFBTyxNQUFNLFNBQVMsU0FBUyxPQUFPO0FBQUEsSUFDeEMsVUFBRTtBQUNBLGVBQVMsS0FBSztBQUFBLElBQ2hCO0FBQUEsRUFDRjtBQUFBLEVBRUEsV0FBVyxNQUFvQixNQUFjLE1BQXVDO0FBQ2xGLFNBQUssc0JBQVEsS0FBSyxTQUFTLG1CQUFtQixVQUFVO0FBQ3RELHFCQUFlLEtBQUssUUFBUSxJQUFJO0FBQUEsSUFDbEMsT0FBTztBQUNMLG1CQUFhLEtBQUssUUFBUSxJQUFJO0FBQUEsSUFDaEM7QUFBQSxFQUNGO0FBQUEsRUFFQSx3QkFBd0IsTUFBb0IsVUFBb0M7QUFyRWxGO0FBc0VJLFFBQUksQ0FBQyxLQUFLLFNBQVMsZ0JBQWdCO0FBQ2pDO0FBQUEsSUFDRjtBQUNBLFVBQU0sU0FBUSxjQUFTLGdCQUFULFlBQXdCO0FBQ3RDLFVBQU0sVUFBUyxjQUFTLGlCQUFULFlBQXlCO0FBQ3hDLGlCQUFhLEtBQUssUUFBUSxnQkFBZ0IsY0FBYyxnQkFBZ0I7QUFBQSxFQUMxRTtBQUNGOyIsCiAgIm5hbWVzIjogWyJpbXBvcnRfb2JzaWRpYW4iLCAid2luZG93IiwgIl9hIiwgIl9hIiwgIl9hIiwgIl9hIiwgImltcG9ydF9vYnNpZGlhbiIsICJpbXBvcnRfb2JzaWRpYW4iLCAiaW1wb3J0X29ic2lkaWFuIl0KfQo=
