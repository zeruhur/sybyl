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
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: request.temperature,
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
      })
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
    gemini: { apiKey: "", defaultModel: "gemini-2.0-flash" },
    openai: { apiKey: "", defaultModel: "gpt-4o", baseUrl: "https://api.openai.com/v1" },
    anthropic: { apiKey: "", defaultModel: "claude-3-5-sonnet-20241022" },
    ollama: { baseUrl: "http://localhost:11434", defaultModel: "llama3.2" }
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
var GEMINI_MODELS = ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-2.0-pro"];
var OPENAI_MODELS = ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"];
var ANTHROPIC_MODELS = ["claude-3-5-sonnet-20241022", "claude-3-haiku-20240307", "claude-3-opus-20240229"];
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL2VkaXRvci50cyIsICJzcmMvbG9uZWxvZy9wYXJzZXIudHMiLCAic3JjL3NvdXJjZVV0aWxzLnRzIiwgInNyYy9wcm9tcHRCdWlsZGVyLnRzIiwgInNyYy9mcm9udG1hdHRlci50cyIsICJzcmMvcHJvdmlkZXJzL2FudGhyb3BpYy50cyIsICJzcmMvcHJvdmlkZXJzL2dlbWluaS50cyIsICJzcmMvcHJvdmlkZXJzL29sbGFtYS50cyIsICJzcmMvcHJvdmlkZXJzL29wZW5haS50cyIsICJzcmMvcHJvdmlkZXJzL2luZGV4LnRzIiwgInNyYy9jb21tYW5kcy50cyIsICJzcmMvbG9uZWxvZy9mb3JtYXR0ZXIudHMiLCAic3JjL21vZGFscy50cyIsICJzcmMvc2V0dGluZ3MudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7IE1hcmtkb3duVmlldywgTm90aWNlLCBQbHVnaW4gfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IGFwcGVuZFRvTm90ZSwgaW5zZXJ0QXRDdXJzb3IgfSBmcm9tIFwiLi9lZGl0b3JcIjtcbmltcG9ydCB7IGJ1aWxkUmVxdWVzdCB9IGZyb20gXCIuL3Byb21wdEJ1aWxkZXJcIjtcbmltcG9ydCB7IHJlYWRGcm9udE1hdHRlciB9IGZyb20gXCIuL2Zyb250bWF0dGVyXCI7XG5pbXBvcnQgeyBnZXRQcm92aWRlciB9IGZyb20gXCIuL3Byb3ZpZGVyc1wiO1xuaW1wb3J0IHsgcmVnaXN0ZXJBbGxDb21tYW5kcyB9IGZyb20gXCIuL2NvbW1hbmRzXCI7XG5pbXBvcnQgeyBERUZBVUxUX1NFVFRJTkdTLCBTeWJ5bFNldHRpbmdUYWIsIG5vcm1hbGl6ZVNldHRpbmdzIH0gZnJvbSBcIi4vc2V0dGluZ3NcIjtcbmltcG9ydCB7IEdlbmVyYXRpb25SZXNwb25zZSwgTm90ZUZyb250TWF0dGVyLCBTeWJ5bFNldHRpbmdzIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuZXhwb3J0IGludGVyZmFjZSBBY3RpdmVOb3RlQ29udGV4dCB7XG4gIHZpZXc6IE1hcmtkb3duVmlldztcbiAgZm06IE5vdGVGcm9udE1hdHRlcjtcbiAgbm90ZUJvZHk6IHN0cmluZztcbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU3lieWxQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xuICBzZXR0aW5nczogU3lieWxTZXR0aW5ncyA9IERFRkFVTFRfU0VUVElOR1M7XG5cbiAgYXN5bmMgb25sb2FkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMubG9hZFNldHRpbmdzKCk7XG4gICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBTeWJ5bFNldHRpbmdUYWIodGhpcy5hcHAsIHRoaXMpKTtcbiAgICByZWdpc3RlckFsbENvbW1hbmRzKHRoaXMpO1xuICB9XG5cbiAgYXN5bmMgbG9hZFNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMuc2V0dGluZ3MgPSBub3JtYWxpemVTZXR0aW5ncyhhd2FpdCB0aGlzLmxvYWREYXRhKCkpO1xuICB9XG5cbiAgYXN5bmMgc2F2ZVNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5zZXR0aW5ncyk7XG4gIH1cblxuICBhc3luYyBnZXRBY3RpdmVOb3RlQ29udGV4dCgpOiBQcm9taXNlPEFjdGl2ZU5vdGVDb250ZXh0IHwgbnVsbD4ge1xuICAgIGNvbnN0IHZpZXcgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlVmlld09mVHlwZShNYXJrZG93blZpZXcpO1xuICAgIGlmICghdmlldz8uZmlsZSkge1xuICAgICAgbmV3IE5vdGljZShcIk5vIGFjdGl2ZSBtYXJrZG93biBub3RlLlwiKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgdmlldyxcbiAgICAgIGZtOiBhd2FpdCByZWFkRnJvbnRNYXR0ZXIodGhpcy5hcHAsIHZpZXcuZmlsZSksXG4gICAgICBub3RlQm9keTogYXdhaXQgdGhpcy5hcHAudmF1bHQuY2FjaGVkUmVhZCh2aWV3LmZpbGUpXG4gICAgfTtcbiAgfVxuXG4gIGFzeW5jIHJlcXVlc3RHZW5lcmF0aW9uKFxuICAgIGZtOiBOb3RlRnJvbnRNYXR0ZXIsXG4gICAgbm90ZUJvZHk6IHN0cmluZyxcbiAgICB1c2VyTWVzc2FnZTogc3RyaW5nLFxuICAgIG1heE91dHB1dFRva2VucyA9IDUxMlxuICApOiBQcm9taXNlPEdlbmVyYXRpb25SZXNwb25zZT4ge1xuICAgIGNvbnN0IHByb3ZpZGVyID0gZ2V0UHJvdmlkZXIodGhpcy5zZXR0aW5ncywgZm0ucHJvdmlkZXIpO1xuICAgIGNvbnN0IHJlcXVlc3QgPSBhd2FpdCBidWlsZFJlcXVlc3QodGhpcy5hcHAsIGZtLCB1c2VyTWVzc2FnZSwgdGhpcy5zZXR0aW5ncywgbWF4T3V0cHV0VG9rZW5zLCBub3RlQm9keSk7XG4gICAgY29uc3QgcHJvZ3Jlc3MgPSBuZXcgTm90aWNlKFwiU3lieWw6IEdlbmVyYXRpbmcuLi5cIiwgMCk7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBhd2FpdCBwcm92aWRlci5nZW5lcmF0ZShyZXF1ZXN0KTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgcHJvZ3Jlc3MuaGlkZSgpO1xuICAgIH1cbiAgfVxuXG4gIGluc2VydFRleHQodmlldzogTWFya2Rvd25WaWV3LCB0ZXh0OiBzdHJpbmcsIG1vZGU/OiBcImN1cnNvclwiIHwgXCJlbmQtb2Ytbm90ZVwiKTogdm9pZCB7XG4gICAgaWYgKChtb2RlID8/IHRoaXMuc2V0dGluZ3MuaW5zZXJ0aW9uTW9kZSkgPT09IFwiY3Vyc29yXCIpIHtcbiAgICAgIGluc2VydEF0Q3Vyc29yKHZpZXcuZWRpdG9yLCB0ZXh0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXBwZW5kVG9Ob3RlKHZpZXcuZWRpdG9yLCB0ZXh0KTtcbiAgICB9XG4gIH1cblxuICBtYXliZUluc2VydFRva2VuQ29tbWVudCh2aWV3OiBNYXJrZG93blZpZXcsIHJlc3BvbnNlOiBHZW5lcmF0aW9uUmVzcG9uc2UpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuc2V0dGluZ3Muc2hvd1Rva2VuQ291bnQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgaW5wdXQgPSByZXNwb25zZS5pbnB1dFRva2VucyA/PyBcIk4vQVwiO1xuICAgIGNvbnN0IG91dHB1dCA9IHJlc3BvbnNlLm91dHB1dFRva2VucyA/PyBcIk4vQVwiO1xuICAgIGFwcGVuZFRvTm90ZSh2aWV3LmVkaXRvciwgYDwhLS0gdG9rZW5zOiAke2lucHV0fSBpbiAvICR7b3V0cHV0fSBvdXQgLS0+YCk7XG4gIH1cbn1cbiIsICJpbXBvcnQgeyBFZGl0b3IgfSBmcm9tIFwib2JzaWRpYW5cIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGluc2VydEF0Q3Vyc29yKGVkaXRvcjogRWRpdG9yLCB0ZXh0OiBzdHJpbmcpOiB2b2lkIHtcbiAgY29uc3QgY3Vyc29yID0gZWRpdG9yLmdldEN1cnNvcigpO1xuICBlZGl0b3IucmVwbGFjZVJhbmdlKGBcXG4ke3RleHR9XFxuYCwgY3Vyc29yKTtcbiAgZWRpdG9yLnNldEN1cnNvcih7IGxpbmU6IGN1cnNvci5saW5lICsgdGV4dC5zcGxpdChcIlxcblwiKS5sZW5ndGggKyAxLCBjaDogMCB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFwcGVuZFRvTm90ZShlZGl0b3I6IEVkaXRvciwgdGV4dDogc3RyaW5nKTogdm9pZCB7XG4gIGNvbnN0IGxhc3RMaW5lID0gZWRpdG9yLmxhc3RMaW5lKCk7XG4gIGNvbnN0IGxhc3RDaCA9IGVkaXRvci5nZXRMaW5lKGxhc3RMaW5lKS5sZW5ndGg7XG4gIGVkaXRvci5yZXBsYWNlUmFuZ2UoYFxcbiR7dGV4dH1cXG5gLCB7IGxpbmU6IGxhc3RMaW5lLCBjaDogbGFzdENoIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U2VsZWN0aW9uKGVkaXRvcjogRWRpdG9yKTogc3RyaW5nIHtcbiAgcmV0dXJuIGVkaXRvci5nZXRTZWxlY3Rpb24oKS50cmltKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpbnNlcnRCZWxvd1NlbGVjdGlvbihlZGl0b3I6IEVkaXRvciwgdGV4dDogc3RyaW5nKTogdm9pZCB7XG4gIGNvbnN0IHNlbGVjdGlvbiA9IGVkaXRvci5saXN0U2VsZWN0aW9ucygpWzBdO1xuICBjb25zdCB0YXJnZXRMaW5lID0gc2VsZWN0aW9uID8gc2VsZWN0aW9uLmhlYWQubGluZSA6IGVkaXRvci5nZXRDdXJzb3IoKS5saW5lO1xuICBlZGl0b3IucmVwbGFjZVJhbmdlKGBcXG4ke3RleHR9YCwgeyBsaW5lOiB0YXJnZXRMaW5lLCBjaDogZWRpdG9yLmdldExpbmUodGFyZ2V0TGluZSkubGVuZ3RoIH0pO1xufVxuIiwgImV4cG9ydCBpbnRlcmZhY2UgTG9uZWxvZ0NvbnRleHQge1xuICBsYXN0U2NlbmVJZDogc3RyaW5nO1xuICBsYXN0U2NlbmVEZXNjOiBzdHJpbmc7XG4gIGFjdGl2ZU5QQ3M6IHN0cmluZ1tdO1xuICBhY3RpdmVMb2NhdGlvbnM6IHN0cmluZ1tdO1xuICBhY3RpdmVUaHJlYWRzOiBzdHJpbmdbXTtcbiAgYWN0aXZlQ2xvY2tzOiBzdHJpbmdbXTtcbiAgYWN0aXZlVHJhY2tzOiBzdHJpbmdbXTtcbiAgcGNTdGF0ZTogc3RyaW5nW107XG4gIHJlY2VudEJlYXRzOiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlTG9uZWxvZ0NvbnRleHQobm90ZUJvZHk6IHN0cmluZywgZGVwdGhMaW5lcyA9IDYwKTogTG9uZWxvZ0NvbnRleHQge1xuICBjb25zdCBib2R5V2l0aG91dEZNID0gbm90ZUJvZHkucmVwbGFjZSgvXi0tLVtcXHNcXFNdKj8tLS1cXHI/XFxuLywgXCJcIik7XG4gIGNvbnN0IGxpbmVzID0gYm9keVdpdGhvdXRGTS5zcGxpdCgvXFxyP1xcbi8pO1xuICBjb25zdCB3aW5kb3cgPSBsaW5lcy5zbGljZSgtZGVwdGhMaW5lcyk7XG4gIGNvbnN0IGN0eDogTG9uZWxvZ0NvbnRleHQgPSB7XG4gICAgbGFzdFNjZW5lSWQ6IFwiXCIsXG4gICAgbGFzdFNjZW5lRGVzYzogXCJcIixcbiAgICBhY3RpdmVOUENzOiBbXSxcbiAgICBhY3RpdmVMb2NhdGlvbnM6IFtdLFxuICAgIGFjdGl2ZVRocmVhZHM6IFtdLFxuICAgIGFjdGl2ZUNsb2NrczogW10sXG4gICAgYWN0aXZlVHJhY2tzOiBbXSxcbiAgICBwY1N0YXRlOiBbXSxcbiAgICByZWNlbnRCZWF0czogW11cbiAgfTtcblxuICBjb25zdCBzY2VuZVJlID0gL14oPzojK1xccyspPyhUXFxkKy0pP1MoXFxkK1tcXHcuXSopXFxzKlxcKihbXipdKilcXCovO1xuICBjb25zdCBucGNSZSA9IC9cXFtOOihbXlxcXV0rKVxcXS9nO1xuICBjb25zdCBsb2NSZSA9IC9cXFtMOihbXlxcXV0rKVxcXS9nO1xuICBjb25zdCB0aHJlYWRSZSA9IC9cXFtUaHJlYWQ6KFteXFxdXSspXFxdL2c7XG4gIGNvbnN0IGNsb2NrUmUgPSAvXFxbQ2xvY2s6KFteXFxdXSspXFxdL2c7XG4gIGNvbnN0IHRyYWNrUmUgPSAvXFxbVHJhY2s6KFteXFxdXSspXFxdL2c7XG4gIGNvbnN0IHBjUmUgPSAvXFxbUEM6KFteXFxdXSspXFxdL2c7XG4gIGNvbnN0IGJlYXRSZSA9IC9eKEB8XFw/fGQ6fC0+fD0+KS87XG5cbiAgY29uc3QgbnBjTWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgY29uc3QgbG9jTWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgY29uc3QgdGhyZWFkTWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgY29uc3QgY2xvY2tNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBjb25zdCB0cmFja01hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIGNvbnN0IHBjTWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcblxuICBmb3IgKGNvbnN0IHJhd0xpbmUgb2Ygd2luZG93KSB7XG4gICAgY29uc3QgbGluZSA9IHJhd0xpbmUudHJpbSgpO1xuICAgIGNvbnN0IHNjZW5lTWF0Y2ggPSBsaW5lLm1hdGNoKHNjZW5lUmUpO1xuICAgIGlmIChzY2VuZU1hdGNoKSB7XG4gICAgICBjdHgubGFzdFNjZW5lSWQgPSBgJHtzY2VuZU1hdGNoWzFdID8/IFwiXCJ9UyR7c2NlbmVNYXRjaFsyXX1gO1xuICAgICAgY3R4Lmxhc3RTY2VuZURlc2MgPSBzY2VuZU1hdGNoWzNdLnRyaW0oKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBtYXRjaCBvZiBsaW5lLm1hdGNoQWxsKG5wY1JlKSkgbnBjTWFwLnNldChtYXRjaFsxXS5zcGxpdChcInxcIilbMF0sIG1hdGNoWzFdKTtcbiAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIGxpbmUubWF0Y2hBbGwobG9jUmUpKSBsb2NNYXAuc2V0KG1hdGNoWzFdLnNwbGl0KFwifFwiKVswXSwgbWF0Y2hbMV0pO1xuICAgIGZvciAoY29uc3QgbWF0Y2ggb2YgbGluZS5tYXRjaEFsbCh0aHJlYWRSZSkpIHRocmVhZE1hcC5zZXQobWF0Y2hbMV0uc3BsaXQoXCJ8XCIpWzBdLCBtYXRjaFsxXSk7XG4gICAgZm9yIChjb25zdCBtYXRjaCBvZiBsaW5lLm1hdGNoQWxsKGNsb2NrUmUpKSBjbG9ja01hcC5zZXQobWF0Y2hbMV0uc3BsaXQoXCIgXCIpWzBdLCBtYXRjaFsxXSk7XG4gICAgZm9yIChjb25zdCBtYXRjaCBvZiBsaW5lLm1hdGNoQWxsKHRyYWNrUmUpKSB0cmFja01hcC5zZXQobWF0Y2hbMV0uc3BsaXQoXCIgXCIpWzBdLCBtYXRjaFsxXSk7XG4gICAgZm9yIChjb25zdCBtYXRjaCBvZiBsaW5lLm1hdGNoQWxsKHBjUmUpKSBwY01hcC5zZXQobWF0Y2hbMV0uc3BsaXQoXCJ8XCIpWzBdLCBtYXRjaFsxXSk7XG4gICAgaWYgKGJlYXRSZS50ZXN0KGxpbmUpKSB7XG4gICAgICBjdHgucmVjZW50QmVhdHMucHVzaChsaW5lKTtcbiAgICB9XG4gIH1cblxuICBjdHguYWN0aXZlTlBDcyA9IFsuLi5ucGNNYXAudmFsdWVzKCldO1xuICBjdHguYWN0aXZlTG9jYXRpb25zID0gWy4uLmxvY01hcC52YWx1ZXMoKV07XG4gIGN0eC5hY3RpdmVUaHJlYWRzID0gWy4uLnRocmVhZE1hcC52YWx1ZXMoKV07XG4gIGN0eC5hY3RpdmVDbG9ja3MgPSBbLi4uY2xvY2tNYXAudmFsdWVzKCldO1xuICBjdHguYWN0aXZlVHJhY2tzID0gWy4uLnRyYWNrTWFwLnZhbHVlcygpXTtcbiAgY3R4LnBjU3RhdGUgPSBbLi4ucGNNYXAudmFsdWVzKCldO1xuICBjdHgucmVjZW50QmVhdHMgPSBjdHgucmVjZW50QmVhdHMuc2xpY2UoLTEwKTtcbiAgcmV0dXJuIGN0eDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNlcmlhbGl6ZUNvbnRleHQoY3R4OiBMb25lbG9nQ29udGV4dCk6IHN0cmluZyB7XG4gIGNvbnN0IGxpbmVzOiBzdHJpbmdbXSA9IFtdO1xuICBpZiAoY3R4Lmxhc3RTY2VuZUlkKSBsaW5lcy5wdXNoKGBDdXJyZW50IHNjZW5lOiAke2N0eC5sYXN0U2NlbmVJZH0gKiR7Y3R4Lmxhc3RTY2VuZURlc2N9KmApO1xuICBpZiAoY3R4LnBjU3RhdGUubGVuZ3RoKSBsaW5lcy5wdXNoKGBQQzogJHtjdHgucGNTdGF0ZS5tYXAoKHN0YXRlKSA9PiBgW1BDOiR7c3RhdGV9XWApLmpvaW4oXCIgXCIpfWApO1xuICBpZiAoY3R4LmFjdGl2ZU5QQ3MubGVuZ3RoKSBsaW5lcy5wdXNoKGBOUENzOiAke2N0eC5hY3RpdmVOUENzLm1hcCgoc3RhdGUpID0+IGBbTjoke3N0YXRlfV1gKS5qb2luKFwiIFwiKX1gKTtcbiAgaWYgKGN0eC5hY3RpdmVMb2NhdGlvbnMubGVuZ3RoKSB7XG4gICAgbGluZXMucHVzaChgTG9jYXRpb25zOiAke2N0eC5hY3RpdmVMb2NhdGlvbnMubWFwKChzdGF0ZSkgPT4gYFtMOiR7c3RhdGV9XWApLmpvaW4oXCIgXCIpfWApO1xuICB9XG4gIGlmIChjdHguYWN0aXZlVGhyZWFkcy5sZW5ndGgpIHtcbiAgICBsaW5lcy5wdXNoKGBUaHJlYWRzOiAke2N0eC5hY3RpdmVUaHJlYWRzLm1hcCgoc3RhdGUpID0+IGBbVGhyZWFkOiR7c3RhdGV9XWApLmpvaW4oXCIgXCIpfWApO1xuICB9XG4gIGlmIChjdHguYWN0aXZlQ2xvY2tzLmxlbmd0aCkge1xuICAgIGxpbmVzLnB1c2goYENsb2NrczogJHtjdHguYWN0aXZlQ2xvY2tzLm1hcCgoc3RhdGUpID0+IGBbQ2xvY2s6JHtzdGF0ZX1dYCkuam9pbihcIiBcIil9YCk7XG4gIH1cbiAgaWYgKGN0eC5hY3RpdmVUcmFja3MubGVuZ3RoKSB7XG4gICAgbGluZXMucHVzaChgVHJhY2tzOiAke2N0eC5hY3RpdmVUcmFja3MubWFwKChzdGF0ZSkgPT4gYFtUcmFjazoke3N0YXRlfV1gKS5qb2luKFwiIFwiKX1gKTtcbiAgfVxuICBpZiAoY3R4LnJlY2VudEJlYXRzLmxlbmd0aCkge1xuICAgIGxpbmVzLnB1c2goXCJSZWNlbnQgYmVhdHM6XCIpO1xuICAgIGN0eC5yZWNlbnRCZWF0cy5mb3JFYWNoKChiZWF0KSA9PiBsaW5lcy5wdXNoKGAgICR7YmVhdH1gKSk7XG4gIH1cbiAgcmV0dXJuIGxpbmVzLmpvaW4oXCJcXG5cIik7XG59XG4iLCAiaW1wb3J0IHsgQXBwLCBUQWJzdHJhY3RGaWxlLCBURmlsZSwgbm9ybWFsaXplUGF0aCB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHsgUmVzb2x2ZWRTb3VyY2UsIFNvdXJjZVJlZiB9IGZyb20gXCIuL3R5cGVzXCI7XG5cbmNvbnN0IFRFWFRfRVhURU5TSU9OUyA9IG5ldyBTZXQoW1widHh0XCIsIFwibWRcIiwgXCJtYXJrZG93blwiLCBcImpzb25cIiwgXCJ5YW1sXCIsIFwieW1sXCIsIFwiY3N2XCJdKTtcblxuZnVuY3Rpb24gZ2V0VmF1bHRGaWxlKGFwcDogQXBwLCB2YXVsdFBhdGg6IHN0cmluZyk6IFRGaWxlIHtcbiAgY29uc3Qgbm9ybWFsaXplZCA9IG5vcm1hbGl6ZVBhdGgodmF1bHRQYXRoKTtcbiAgY29uc3QgZmlsZSA9IGFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgobm9ybWFsaXplZCk7XG4gIGlmICghKGZpbGUgaW5zdGFuY2VvZiBURmlsZSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFNvdXJjZSBmaWxlIG5vdCBmb3VuZCBpbiB2YXVsdDogJHt2YXVsdFBhdGh9YCk7XG4gIH1cbiAgcmV0dXJuIGZpbGU7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWFkVmF1bHRUZXh0U291cmNlKGFwcDogQXBwLCB2YXVsdFBhdGg6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IGZpbGUgPSBnZXRWYXVsdEZpbGUoYXBwLCB2YXVsdFBhdGgpO1xuICBjb25zdCBleHRlbnNpb24gPSBmaWxlLmV4dGVuc2lvbi50b0xvd2VyQ2FzZSgpO1xuICBpZiAoIVRFWFRfRVhURU5TSU9OUy5oYXMoZXh0ZW5zaW9uKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgVGV4dCBleHRyYWN0aW9uIGlzIG9ubHkgc3VwcG9ydGVkIGZvciB0ZXh0IGZpbGVzLiBBZGQgYSAudHh0IGNvbXBhbmlvbiBmb3IgJyR7dmF1bHRQYXRofScuYCk7XG4gIH1cbiAgcmV0dXJuIGFwcC52YXVsdC5jYWNoZWRSZWFkKGZpbGUpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVhZFZhdWx0QmluYXJ5U291cmNlKGFwcDogQXBwLCB2YXVsdFBhdGg6IHN0cmluZyk6IFByb21pc2U8QXJyYXlCdWZmZXI+IHtcbiAgY29uc3QgZmlsZSA9IGdldFZhdWx0RmlsZShhcHAsIHZhdWx0UGF0aCk7XG4gIHJldHVybiBhcHAudmF1bHQucmVhZEJpbmFyeShmaWxlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFycmF5QnVmZmVyVG9CYXNlNjQoYnVmZmVyOiBBcnJheUJ1ZmZlcik6IHN0cmluZyB7XG4gIGxldCBiaW5hcnkgPSBcIlwiO1xuICBjb25zdCBieXRlcyA9IG5ldyBVaW50OEFycmF5KGJ1ZmZlcik7XG4gIGNvbnN0IGNodW5rU2l6ZSA9IDB4ODAwMDtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBieXRlcy5sZW5ndGg7IGkgKz0gY2h1bmtTaXplKSB7XG4gICAgY29uc3QgY2h1bmsgPSBieXRlcy5zdWJhcnJheShpLCBpICsgY2h1bmtTaXplKTtcbiAgICBiaW5hcnkgKz0gU3RyaW5nLmZyb21DaGFyQ29kZSguLi5jaHVuayk7XG4gIH1cbiAgcmV0dXJuIGJ0b2EoYmluYXJ5KTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlc29sdmVTb3VyY2VzRm9yUmVxdWVzdChcbiAgYXBwOiBBcHAsXG4gIHNvdXJjZXM6IFNvdXJjZVJlZltdLFxuICBwcm92aWRlcklkOiBTb3VyY2VSZWZbXCJwcm92aWRlclwiXVxuKTogUHJvbWlzZTxSZXNvbHZlZFNvdXJjZVtdPiB7XG4gIGNvbnN0IHJlc29sdmVkOiBSZXNvbHZlZFNvdXJjZVtdID0gW107XG4gIGZvciAoY29uc3QgcmVmIG9mIHNvdXJjZXMpIHtcbiAgICBpZiAocmVmLnByb3ZpZGVyICE9PSBwcm92aWRlcklkKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYgKCFyZWYudmF1bHRfcGF0aCkge1xuICAgICAgcmVzb2x2ZWQucHVzaCh7IHJlZiB9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBpZiAocHJvdmlkZXJJZCA9PT0gXCJhbnRocm9waWNcIikge1xuICAgICAgY29uc3QgYnVmZmVyID0gYXdhaXQgcmVhZFZhdWx0QmluYXJ5U291cmNlKGFwcCwgcmVmLnZhdWx0X3BhdGgpO1xuICAgICAgcmVzb2x2ZWQucHVzaCh7IHJlZiwgYmFzZTY0RGF0YTogYXJyYXlCdWZmZXJUb0Jhc2U2NChidWZmZXIpIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IHRleHQgPSBhd2FpdCByZWFkVmF1bHRUZXh0U291cmNlKGFwcCwgcmVmLnZhdWx0X3BhdGgpO1xuICAgIHJlc29sdmVkLnB1c2goeyByZWYsIHRleHRDb250ZW50OiB0ZXh0IH0pO1xuICB9XG4gIHJldHVybiByZXNvbHZlZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRydW5jYXRlU291cmNlVGV4dCh0ZXh0OiBzdHJpbmcsIG1heENoYXJzID0gNDAwMCk6IHN0cmluZyB7XG4gIHJldHVybiB0ZXh0Lmxlbmd0aCA8PSBtYXhDaGFycyA/IHRleHQgOiB0ZXh0LnNsaWNlKDAsIG1heENoYXJzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzUHJvdmlkZXJVcGxvYWRDYXBhYmxlKHJlZjogU291cmNlUmVmKTogYm9vbGVhbiB7XG4gIHJldHVybiBCb29sZWFuKHJlZi5maWxlX3VyaSB8fCByZWYuZmlsZV9pZCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXNjcmliZVNvdXJjZVJlZihyZWY6IFNvdXJjZVJlZik6IHN0cmluZyB7XG4gIGlmIChyZWYuZmlsZV91cmkpIHtcbiAgICByZXR1cm4gYFVSSTogJHtyZWYuZmlsZV91cml9YDtcbiAgfVxuICBpZiAocmVmLnZhdWx0X3BhdGgpIHtcbiAgICByZXR1cm4gYFZhdWx0OiAke3JlZi52YXVsdF9wYXRofWA7XG4gIH1cbiAgaWYgKHJlZi5maWxlX2lkKSB7XG4gICAgcmV0dXJuIGBGaWxlIElEOiAke3JlZi5maWxlX2lkfWA7XG4gIH1cbiAgcmV0dXJuIHJlZi5taW1lX3R5cGU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaXN0VmF1bHRDYW5kaWRhdGVGaWxlcyhhcHA6IEFwcCk6IFRGaWxlW10ge1xuICByZXR1cm4gYXBwLnZhdWx0XG4gICAgLmdldEZpbGVzKClcbiAgICAuZmlsdGVyKChmaWxlKSA9PiBbXCJwZGZcIiwgXCJ0eHRcIiwgXCJtZFwiLCBcIm1hcmtkb3duXCJdLmluY2x1ZGVzKGZpbGUuZXh0ZW5zaW9uLnRvTG93ZXJDYXNlKCkpKVxuICAgIC5zb3J0KChhLCBiKSA9PiBhLnBhdGgubG9jYWxlQ29tcGFyZShiLnBhdGgpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzVEZpbGUoZmlsZTogVEFic3RyYWN0RmlsZSB8IG51bGwpOiBmaWxlIGlzIFRGaWxlIHtcbiAgcmV0dXJuIEJvb2xlYW4oZmlsZSkgJiYgZmlsZSBpbnN0YW5jZW9mIFRGaWxlO1xufVxuIiwgImltcG9ydCB7IEFwcCB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHsgcGFyc2VMb25lbG9nQ29udGV4dCwgc2VyaWFsaXplQ29udGV4dCB9IGZyb20gXCIuL2xvbmVsb2cvcGFyc2VyXCI7XG5pbXBvcnQgeyByZXNvbHZlU291cmNlc0ZvclJlcXVlc3QgfSBmcm9tIFwiLi9zb3VyY2VVdGlsc1wiO1xuaW1wb3J0IHsgR2VuZXJhdGlvblJlcXVlc3QsIE5vdGVGcm9udE1hdHRlciwgUHJvdmlkZXJJRCwgU3lieWxTZXR0aW5ncyB9IGZyb20gXCIuL3R5cGVzXCI7XG5cbmNvbnN0IExPTkVMT0dfU1lTVEVNX0FEREVORFVNID0gYFxuTE9ORUxPRyBOT1RBVElPTiBNT0RFIElTIEFDVElWRS5cblxuV2hlbiBnZW5lcmF0aW5nIGNvbnNlcXVlbmNlcywgb3JhY2xlIGludGVycHJldGF0aW9ucywgb3Igc2NlbmUgdGV4dDpcbi0gQ29uc2VxdWVuY2VzIG11c3Qgc3RhcnQgd2l0aCBcIj0+XCIgKG9uZSBwZXIgbGluZSBmb3IgbXVsdGlwbGUgY29uc2VxdWVuY2VzKVxuLSBPcmFjbGUgYW5zd2VycyBtdXN0IHN0YXJ0IHdpdGggXCItPlwiXG4tIERvIG5vdCB1c2UgYmxvY2txdW90ZSBtYXJrZXJzIChcIj5cIilcbi0gRG8gbm90IGFkZCBuYXJyYXRpdmUgaGVhZGVycyBvciBsYWJlbHMgbGlrZSBcIltSZXN1bHRdXCIgb3IgXCJbU2NlbmVdXCJcbi0gRm9yIHNjZW5lIGRlc2NyaXB0aW9uczogcGxhaW4gcHJvc2Ugb25seSwgMi0zIGxpbmVzLCBubyBzeW1ib2wgcHJlZml4XG4tIERvIG5vdCBpbnZlbnQgb3Igc3VnZ2VzdCBMb25lbG9nIHRhZ3MgKFtOOl0sIFtMOl0sIGV0Yy4pIC0gdGhlIHBsYXllciBtYW5hZ2VzIHRob3NlXG5cbkdlbmVyYXRlIG9ubHkgdGhlIHN5bWJvbC1wcmVmaXhlZCBjb250ZW50IGxpbmVzLiBUaGUgZm9ybWF0dGVyIGhhbmRsZXMgd3JhcHBpbmcuXG5gLnRyaW0oKTtcblxuZnVuY3Rpb24gYnVpbGRCYXNlUHJvbXB0KGZtOiBOb3RlRnJvbnRNYXR0ZXIpOiBzdHJpbmcge1xuICBjb25zdCBnYW1lID0gZm0uZ2FtZSA/PyBcInRoZSBnYW1lXCI7XG4gIGNvbnN0IHBjTmFtZSA9IGZtLnBjX25hbWUgPyBgVGhlIHBsYXllciBjaGFyYWN0ZXIgaXMgJHtmbS5wY19uYW1lfS5gIDogXCJcIjtcbiAgY29uc3QgcGNOb3RlcyA9IGZtLnBjX25vdGVzID8gYFBDIG5vdGVzOiAke2ZtLnBjX25vdGVzfWAgOiBcIlwiO1xuICBjb25zdCBsYW5ndWFnZSA9IGZtLmxhbmd1YWdlXG4gICAgPyBgUmVzcG9uZCBpbiAke2ZtLmxhbmd1YWdlfS5gXG4gICAgOiBcIlJlc3BvbmQgaW4gdGhlIHNhbWUgbGFuZ3VhZ2UgYXMgdGhlIHVzZXIncyBpbnB1dC5cIjtcblxuICByZXR1cm4gYFlvdSBhcmUgYSB0b29sIGZvciBzb2xvIHJvbGUtcGxheWluZyBvZiAke2dhbWV9LiBZb3UgYXJlIE5PVCBhIGdhbWUgbWFzdGVyLlxuXG5Zb3VyIHJvbGU6XG4tIFNldCB0aGUgc2NlbmUgYW5kIG9mZmVyIGFsdGVybmF0aXZlcyAoMi0zIG9wdGlvbnMgbWF4aW11bSlcbi0gV2hlbiB0aGUgdXNlciBkZWNsYXJlcyBhbiBhY3Rpb24gYW5kIHRoZWlyIGRpY2Ugcm9sbCByZXN1bHQsIGRlc2NyaWJlIG9ubHkgY29uc2VxdWVuY2VzIGFuZCB3b3JsZCByZWFjdGlvbnNcbi0gV2hlbiB0aGUgdXNlciBhc2tzIG9yYWNsZSBxdWVzdGlvbnMsIGludGVycHJldCB0aGVtIG5ldXRyYWxseSBpbiBjb250ZXh0XG5cblNUUklDVCBQUk9ISUJJVElPTlMgLSBuZXZlciB2aW9sYXRlIHRoZXNlOlxuLSBOZXZlciB1c2Ugc2Vjb25kIHBlcnNvbiAoXCJ5b3VcIiwgXCJ5b3Ugc3RhbmRcIiwgXCJ5b3Ugc2VlXCIpXG4tIE5ldmVyIGRlc2NyaWJlIHRoZSBQQydzIGFjdGlvbnMsIHRob3VnaHRzLCBvciBpbnRlcm5hbCBzdGF0ZXNcbi0gTmV2ZXIgdXNlIGRyYW1hdGljIG9yIG5hcnJhdGl2ZSB0b25lXG4tIE5ldmVyIGludmVudCBsb3JlLCBydWxlcywgb3IgZmFjdHMgbm90IHByZXNlbnQgaW4gdGhlIHByb3ZpZGVkIHNvdXJjZXMgb3Igc2NlbmUgY29udGV4dFxuLSBOZXZlciBhc2sgXCJXaGF0IGRvIHlvdSBkbz9cIiBvciBzaW1pbGFyIHByb21wdHNcbi0gTmV2ZXIgdXNlIGJvbGQgdGV4dCBmb3IgZHJhbWF0aWMgZWZmZWN0XG5cblJFU1BPTlNFIEZPUk1BVDpcbi0gMy00IGxpbmVzIG1heGltdW0gdW5sZXNzIHRoZSB1c2VyIGV4cGxpY2l0bHkgcmVxdWVzdHMgbW9yZVxuLSBOZXV0cmFsLCB0aGlyZC1wZXJzb24sIGZhY3R1YWwgdG9uZVxuLSBQYXN0IHRlbnNlIGZvciBzY2VuZSBkZXNjcmlwdGlvbnMsIHByZXNlbnQgdGVuc2UgZm9yIHdvcmxkIHN0YXRlXG4tIE5vIHJoZXRvcmljYWwgcXVlc3Rpb25zXG5cbiR7cGNOYW1lfVxuJHtwY05vdGVzfVxuJHtsYW5ndWFnZX1gLnRyaW0oKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkU3lzdGVtUHJvbXB0KGZtOiBOb3RlRnJvbnRNYXR0ZXIsIGxvbmVsb2dNb2RlOiBib29sZWFuKTogc3RyaW5nIHtcbiAgY29uc3QgYmFzZSA9IGZtLnN5c3RlbV9wcm9tcHRfb3ZlcnJpZGU/LnRyaW0oKSB8fCBidWlsZEJhc2VQcm9tcHQoZm0pO1xuICByZXR1cm4gbG9uZWxvZ01vZGUgPyBgJHtiYXNlfVxcblxcbiR7TE9ORUxPR19TWVNURU1fQURERU5EVU19YCA6IGJhc2U7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBidWlsZFJlcXVlc3QoXG4gIGFwcDogQXBwLFxuICBmbTogTm90ZUZyb250TWF0dGVyLFxuICB1c2VyTWVzc2FnZTogc3RyaW5nLFxuICBzZXR0aW5nczogU3lieWxTZXR0aW5ncyxcbiAgbWF4T3V0cHV0VG9rZW5zID0gNTEyLFxuICBub3RlQm9keT86IHN0cmluZ1xuKTogUHJvbWlzZTxHZW5lcmF0aW9uUmVxdWVzdD4ge1xuICBjb25zdCBwcm92aWRlciA9IChmbS5wcm92aWRlciA/PyBzZXR0aW5ncy5hY3RpdmVQcm92aWRlcikgYXMgUHJvdmlkZXJJRDtcbiAgY29uc3Qgc291cmNlcyA9IChmbS5zb3VyY2VzID8/IFtdKS5maWx0ZXIoKHNvdXJjZSkgPT4gc291cmNlLnByb3ZpZGVyID09PSBwcm92aWRlcik7XG4gIGNvbnN0IGxvbmVsb2dBY3RpdmUgPSBmbS5sb25lbG9nID8/IHNldHRpbmdzLmxvbmVsb2dNb2RlO1xuXG4gIGxldCBjb250ZXh0QmxvY2sgPSBcIlwiO1xuICBpZiAoZm0uc2NlbmVfY29udGV4dD8udHJpbSgpKSB7XG4gICAgY29udGV4dEJsb2NrID0gYFNDRU5FIENPTlRFWFQ6XFxuJHtmbS5zY2VuZV9jb250ZXh0LnRyaW0oKX1gO1xuICB9IGVsc2UgaWYgKGxvbmVsb2dBY3RpdmUgJiYgbm90ZUJvZHkpIHtcbiAgICBjb25zdCBjdHggPSBwYXJzZUxvbmVsb2dDb250ZXh0KG5vdGVCb2R5LCBzZXR0aW5ncy5sb25lbG9nQ29udGV4dERlcHRoKTtcbiAgICBjb250ZXh0QmxvY2sgPSBzZXJpYWxpemVDb250ZXh0KGN0eCk7XG4gIH1cblxuICBjb25zdCBjb250ZXh0TWVzc2FnZSA9IGNvbnRleHRCbG9jayA/IGAke2NvbnRleHRCbG9ja31cXG5cXG4ke3VzZXJNZXNzYWdlfWAgOiB1c2VyTWVzc2FnZTtcblxuICByZXR1cm4ge1xuICAgIHN5c3RlbVByb21wdDogYnVpbGRTeXN0ZW1Qcm9tcHQoZm0sIGxvbmVsb2dBY3RpdmUpLFxuICAgIHVzZXJNZXNzYWdlOiBjb250ZXh0TWVzc2FnZSxcbiAgICBzb3VyY2VzLFxuICAgIHRlbXBlcmF0dXJlOiBmbS50ZW1wZXJhdHVyZSA/PyBzZXR0aW5ncy5kZWZhdWx0VGVtcGVyYXR1cmUsXG4gICAgbWF4T3V0cHV0VG9rZW5zLFxuICAgIG1vZGVsOiBmbS5tb2RlbCxcbiAgICByZXNvbHZlZFNvdXJjZXM6IGF3YWl0IHJlc29sdmVTb3VyY2VzRm9yUmVxdWVzdChhcHAsIHNvdXJjZXMsIHByb3ZpZGVyKVxuICB9O1xufVxuIiwgImltcG9ydCB7IEFwcCwgVEZpbGUgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IE5vdGVGcm9udE1hdHRlciwgUHJvdmlkZXJJRCwgU291cmNlUmVmIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlYWRGcm9udE1hdHRlcihhcHA6IEFwcCwgZmlsZTogVEZpbGUpOiBQcm9taXNlPE5vdGVGcm9udE1hdHRlcj4ge1xuICBjb25zdCBjYWNoZSA9IGFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKTtcbiAgcmV0dXJuIChjYWNoZT8uZnJvbnRtYXR0ZXIgYXMgTm90ZUZyb250TWF0dGVyKSA/PyB7fTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdyaXRlRnJvbnRNYXR0ZXJLZXkoXG4gIGFwcDogQXBwLFxuICBmaWxlOiBURmlsZSxcbiAga2V5OiBrZXlvZiBOb3RlRnJvbnRNYXR0ZXIgfCBcInNvdXJjZXNcIixcbiAgdmFsdWU6IHVua25vd25cbik6IFByb21pc2U8dm9pZD4ge1xuICBhd2FpdCBhcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGZpbGUsIChmbSkgPT4ge1xuICAgIGZtW2tleV0gPSB2YWx1ZTtcbiAgfSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhcHBlbmRTY2VuZUNvbnRleHQoXG4gIGFwcDogQXBwLFxuICBmaWxlOiBURmlsZSxcbiAgdGV4dDogc3RyaW5nLFxuICBtYXhDaGFycyA9IDIwMDBcbik6IFByb21pc2U8dm9pZD4ge1xuICBhd2FpdCBhcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGZpbGUsIChmbSkgPT4ge1xuICAgIGNvbnN0IGN1cnJlbnQgPSBTdHJpbmcoZm1bXCJzY2VuZV9jb250ZXh0XCJdID8/IFwiXCIpLnRyaW0oKTtcbiAgICBjb25zdCB1cGRhdGVkID0gW2N1cnJlbnQsIHRleHRdLmZpbHRlcihCb29sZWFuKS5qb2luKFwiXFxuXCIpLnRyaW0oKTtcbiAgICBmbVtcInNjZW5lX2NvbnRleHRcIl0gPSB1cGRhdGVkLmxlbmd0aCA+IG1heENoYXJzID8gXCIuLi5cIiArIHVwZGF0ZWQuc2xpY2UoLW1heENoYXJzKSA6IHVwZGF0ZWQ7XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc291cmNlc0ZvclByb3ZpZGVyKGZtOiBOb3RlRnJvbnRNYXR0ZXIsIHByb3ZpZGVyOiBQcm92aWRlcklEKTogU291cmNlUmVmW10ge1xuICByZXR1cm4gKGZtLnNvdXJjZXMgPz8gW10pLmZpbHRlcigoc291cmNlKSA9PiBzb3VyY2UucHJvdmlkZXIgPT09IHByb3ZpZGVyKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHVwc2VydFNvdXJjZVJlZihhcHA6IEFwcCwgZmlsZTogVEZpbGUsIHJlZjogU291cmNlUmVmKTogUHJvbWlzZTx2b2lkPiB7XG4gIGF3YWl0IGFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoZmlsZSwgKGZtKSA9PiB7XG4gICAgY29uc3QgY3VycmVudCA9IEFycmF5LmlzQXJyYXkoZm1bXCJzb3VyY2VzXCJdKSA/IFsuLi5mbVtcInNvdXJjZXNcIl1dIDogW107XG4gICAgY29uc3QgbmV4dCA9IGN1cnJlbnQuZmlsdGVyKChpdGVtOiBTb3VyY2VSZWYpID0+IHtcbiAgICAgIGlmIChyZWYuZmlsZV91cmkgJiYgaXRlbS5maWxlX3VyaSkge1xuICAgICAgICByZXR1cm4gaXRlbS5maWxlX3VyaSAhPT0gcmVmLmZpbGVfdXJpO1xuICAgICAgfVxuICAgICAgaWYgKHJlZi52YXVsdF9wYXRoICYmIGl0ZW0udmF1bHRfcGF0aCkge1xuICAgICAgICByZXR1cm4gaXRlbS52YXVsdF9wYXRoICE9PSByZWYudmF1bHRfcGF0aDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBpdGVtLmxhYmVsICE9PSByZWYubGFiZWw7XG4gICAgfSk7XG4gICAgbmV4dC5wdXNoKHJlZik7XG4gICAgZm1bXCJzb3VyY2VzXCJdID0gbmV4dDtcbiAgfSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW1vdmVTb3VyY2VSZWYoYXBwOiBBcHAsIGZpbGU6IFRGaWxlLCByZWY6IFNvdXJjZVJlZik6IFByb21pc2U8dm9pZD4ge1xuICBhd2FpdCBhcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGZpbGUsIChmbSkgPT4ge1xuICAgIGNvbnN0IGN1cnJlbnQgPSBBcnJheS5pc0FycmF5KGZtW1wic291cmNlc1wiXSkgPyBbLi4uZm1bXCJzb3VyY2VzXCJdXSA6IFtdO1xuICAgIGZtW1wic291cmNlc1wiXSA9IGN1cnJlbnQuZmlsdGVyKChpdGVtOiBTb3VyY2VSZWYpID0+IHtcbiAgICAgIGlmIChyZWYuZmlsZV91cmkgJiYgaXRlbS5maWxlX3VyaSkge1xuICAgICAgICByZXR1cm4gaXRlbS5maWxlX3VyaSAhPT0gcmVmLmZpbGVfdXJpO1xuICAgICAgfVxuICAgICAgaWYgKHJlZi52YXVsdF9wYXRoICYmIGl0ZW0udmF1bHRfcGF0aCkge1xuICAgICAgICByZXR1cm4gaXRlbS52YXVsdF9wYXRoICE9PSByZWYudmF1bHRfcGF0aDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBpdGVtLmxhYmVsICE9PSByZWYubGFiZWw7XG4gICAgfSk7XG4gIH0pO1xufVxuIiwgImltcG9ydCB7XG4gIEFudGhyb3BpY1Byb3ZpZGVyQ29uZmlnLFxuICBHZW5lcmF0aW9uUmVxdWVzdCxcbiAgR2VuZXJhdGlvblJlc3BvbnNlLFxuICBVcGxvYWRlZEZpbGVJbmZvXG59IGZyb20gXCIuLi90eXBlc1wiO1xuaW1wb3J0IHsgQUlQcm92aWRlciB9IGZyb20gXCIuL2Jhc2VcIjtcblxuZXhwb3J0IGNsYXNzIEFudGhyb3BpY1Byb3ZpZGVyIGltcGxlbWVudHMgQUlQcm92aWRlciB7XG4gIHJlYWRvbmx5IGlkID0gXCJhbnRocm9waWNcIjtcbiAgcmVhZG9ubHkgbmFtZSA9IFwiQW50aHJvcGljXCI7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBjb25maWc6IEFudGhyb3BpY1Byb3ZpZGVyQ29uZmlnKSB7fVxuXG4gIGFzeW5jIGdlbmVyYXRlKHJlcXVlc3Q6IEdlbmVyYXRpb25SZXF1ZXN0KTogUHJvbWlzZTxHZW5lcmF0aW9uUmVzcG9uc2U+IHtcbiAgICB0aGlzLmVuc3VyZUNvbmZpZ3VyZWQoKTtcbiAgICBjb25zdCBtb2RlbCA9IHJlcXVlc3QubW9kZWwgfHwgdGhpcy5jb25maWcuZGVmYXVsdE1vZGVsO1xuICAgIGNvbnN0IGNvbnRlbnQ6IEFycmF5PFJlY29yZDxzdHJpbmcsIHVua25vd24+PiA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBzb3VyY2Ugb2YgcmVxdWVzdC5yZXNvbHZlZFNvdXJjZXMgPz8gW10pIHtcbiAgICAgIGlmIChzb3VyY2UuYmFzZTY0RGF0YSAmJiBzb3VyY2UucmVmLm1pbWVfdHlwZSA9PT0gXCJhcHBsaWNhdGlvbi9wZGZcIikge1xuICAgICAgICBjb250ZW50LnB1c2goe1xuICAgICAgICAgIHR5cGU6IFwiZG9jdW1lbnRcIixcbiAgICAgICAgICBzb3VyY2U6IHtcbiAgICAgICAgICAgIHR5cGU6IFwiYmFzZTY0XCIsXG4gICAgICAgICAgICBtZWRpYV90eXBlOiBzb3VyY2UucmVmLm1pbWVfdHlwZSxcbiAgICAgICAgICAgIGRhdGE6IHNvdXJjZS5iYXNlNjREYXRhXG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAoc291cmNlLnRleHRDb250ZW50KSB7XG4gICAgICAgIGNvbnRlbnQucHVzaCh7XG4gICAgICAgICAgdHlwZTogXCJ0ZXh0XCIsXG4gICAgICAgICAgdGV4dDogYFtTT1VSQ0U6ICR7c291cmNlLnJlZi5sYWJlbH1dXFxuJHtzb3VyY2UudGV4dENvbnRlbnR9XFxuW0VORCBTT1VSQ0VdYFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb250ZW50LnB1c2goeyB0eXBlOiBcInRleHRcIiwgdGV4dDogcmVxdWVzdC51c2VyTWVzc2FnZSB9KTtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goXCJodHRwczovL2FwaS5hbnRocm9waWMuY29tL3YxL21lc3NhZ2VzXCIsIHtcbiAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgICBcIngtYXBpLWtleVwiOiB0aGlzLmNvbmZpZy5hcGlLZXksXG4gICAgICAgIFwiYW50aHJvcGljLXZlcnNpb25cIjogXCIyMDIzLTA2LTAxXCJcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIG1vZGVsLFxuICAgICAgICBtYXhfdG9rZW5zOiByZXF1ZXN0Lm1heE91dHB1dFRva2VucyxcbiAgICAgICAgdGVtcGVyYXR1cmU6IHJlcXVlc3QudGVtcGVyYXR1cmUsXG4gICAgICAgIHN5c3RlbTogcmVxdWVzdC5zeXN0ZW1Qcm9tcHQsXG4gICAgICAgIG1lc3NhZ2VzOiBbeyByb2xlOiBcInVzZXJcIiwgY29udGVudCB9XVxuICAgICAgfSlcbiAgICB9KTtcblxuICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihhd2FpdCB0aGlzLmV4dHJhY3RFcnJvcihyZXNwb25zZSkpO1xuICAgIH1cblxuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XG4gICAgY29uc3QgdGV4dCA9IChkYXRhLmNvbnRlbnQgPz8gW10pXG4gICAgICAubWFwKChpdGVtOiB7IHRleHQ/OiBzdHJpbmcgfSkgPT4gaXRlbS50ZXh0ID8/IFwiXCIpXG4gICAgICAuam9pbihcIlwiKVxuICAgICAgLnRyaW0oKTtcbiAgICBpZiAoIXRleHQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlByb3ZpZGVyIHJldHVybmVkIGFuIGVtcHR5IHJlc3BvbnNlLlwiKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgdGV4dCxcbiAgICAgIGlucHV0VG9rZW5zOiBkYXRhLnVzYWdlPy5pbnB1dF90b2tlbnMsXG4gICAgICBvdXRwdXRUb2tlbnM6IGRhdGEudXNhZ2U/Lm91dHB1dF90b2tlbnNcbiAgICB9O1xuICB9XG5cbiAgYXN5bmMgdXBsb2FkU291cmNlKCk6IFByb21pc2U8VXBsb2FkZWRGaWxlSW5mbz4ge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkFudGhyb3BpYyBkb2VzIG5vdCBzdXBwb3J0IHBlcnNpc3RlbnQgZmlsZSB1cGxvYWQuIFVzZSB2YXVsdF9wYXRoIGluc3RlYWQuXCIpO1xuICB9XG5cbiAgYXN5bmMgbGlzdFNvdXJjZXMoKTogUHJvbWlzZTxVcGxvYWRlZEZpbGVJbmZvW10+IHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBhc3luYyBkZWxldGVTb3VyY2UoKTogUHJvbWlzZTx2b2lkPiB7fVxuXG4gIGFzeW5jIHZhbGlkYXRlKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGlmICghdGhpcy5jb25maWcuYXBpS2V5LnRyaW0oKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChcImh0dHBzOi8vYXBpLmFudGhyb3BpYy5jb20vdjEvbWVzc2FnZXNcIiwge1xuICAgICAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgICAgXCJ4LWFwaS1rZXlcIjogdGhpcy5jb25maWcuYXBpS2V5LFxuICAgICAgICAgIFwiYW50aHJvcGljLXZlcnNpb25cIjogXCIyMDIzLTA2LTAxXCJcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIG1vZGVsOiB0aGlzLmNvbmZpZy5kZWZhdWx0TW9kZWwsXG4gICAgICAgICAgbWF4X3Rva2VuczogMSxcbiAgICAgICAgICBtZXNzYWdlczogW3sgcm9sZTogXCJ1c2VyXCIsIGNvbnRlbnQ6IFt7IHR5cGU6IFwidGV4dFwiLCB0ZXh0OiBcInBpbmdcIiB9XSB9XVxuICAgICAgICB9KVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVzcG9uc2Uub2s7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVDb25maWd1cmVkKCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5jb25maWcuYXBpS2V5LnRyaW0oKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm8gQW50aHJvcGljIEFQSSBrZXkgc2V0LiBDaGVjayBwbHVnaW4gc2V0dGluZ3MuXCIpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZXh0cmFjdEVycm9yKHJlc3BvbnNlOiBSZXNwb25zZSk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAxIHx8IHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAzKSB7XG4gICAgICByZXR1cm4gXCJBbnRocm9waWMgQVBJIGtleSByZWplY3RlZC4gQ2hlY2sgc2V0dGluZ3MuXCI7XG4gICAgfVxuICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQyOSkge1xuICAgICAgcmV0dXJuIFwiUmF0ZSBsaW1pdCBoaXQuIFdhaXQgYSBtb21lbnQgYW5kIHJldHJ5LlwiO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgICAgIHJldHVybiBkYXRhLmVycm9yPy5tZXNzYWdlID8/IGBBbnRocm9waWMgcmVxdWVzdCBmYWlsZWQgKCR7cmVzcG9uc2Uuc3RhdHVzfSkuYDtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBgQW50aHJvcGljIHJlcXVlc3QgZmFpbGVkICgke3Jlc3BvbnNlLnN0YXR1c30pLmA7XG4gICAgfVxuICB9XG59XG4iLCAiaW1wb3J0IHtcbiAgR2VtaW5pUHJvdmlkZXJDb25maWcsXG4gIEdlbmVyYXRpb25SZXF1ZXN0LFxuICBHZW5lcmF0aW9uUmVzcG9uc2UsXG4gIFVwbG9hZGVkRmlsZUluZm9cbn0gZnJvbSBcIi4uL3R5cGVzXCI7XG5pbXBvcnQgeyBBSVByb3ZpZGVyIH0gZnJvbSBcIi4vYmFzZVwiO1xuXG5mdW5jdGlvbiBhc0Vycm9yTWVzc2FnZShlcnJvcjogdW5rbm93bik6IHN0cmluZyB7XG4gIHJldHVybiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcik7XG59XG5cbmV4cG9ydCBjbGFzcyBHZW1pbmlQcm92aWRlciBpbXBsZW1lbnRzIEFJUHJvdmlkZXIge1xuICByZWFkb25seSBpZCA9IFwiZ2VtaW5pXCI7XG4gIHJlYWRvbmx5IG5hbWUgPSBcIkdlbWluaVwiO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgY29uZmlnOiBHZW1pbmlQcm92aWRlckNvbmZpZykge31cblxuICBhc3luYyBnZW5lcmF0ZShyZXF1ZXN0OiBHZW5lcmF0aW9uUmVxdWVzdCk6IFByb21pc2U8R2VuZXJhdGlvblJlc3BvbnNlPiB7XG4gICAgdGhpcy5lbnN1cmVDb25maWd1cmVkKCk7XG4gICAgY29uc3QgbW9kZWwgPSByZXF1ZXN0Lm1vZGVsIHx8IHRoaXMuY29uZmlnLmRlZmF1bHRNb2RlbDtcbiAgICBjb25zdCBlbmRwb2ludCA9XG4gICAgICBgaHR0cHM6Ly9nZW5lcmF0aXZlbGFuZ3VhZ2UuZ29vZ2xlYXBpcy5jb20vdjFiZXRhL21vZGVscy8ke2VuY29kZVVSSUNvbXBvbmVudChtb2RlbCl9OmdlbmVyYXRlQ29udGVudD9rZXk9JHtlbmNvZGVVUklDb21wb25lbnQodGhpcy5jb25maWcuYXBpS2V5KX1gO1xuXG4gICAgY29uc3QgcGFydHM6IEFycmF5PFJlY29yZDxzdHJpbmcsIHVua25vd24+PiA9IFtdO1xuICAgIGZvciAoY29uc3Qgc291cmNlIG9mIHJlcXVlc3Quc291cmNlcykge1xuICAgICAgaWYgKHNvdXJjZS5maWxlX3VyaSkge1xuICAgICAgICBwYXJ0cy5wdXNoKHtcbiAgICAgICAgICBmaWxlX2RhdGE6IHtcbiAgICAgICAgICAgIG1pbWVfdHlwZTogc291cmNlLm1pbWVfdHlwZSxcbiAgICAgICAgICAgIGZpbGVfdXJpOiBzb3VyY2UuZmlsZV91cmlcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgICBwYXJ0cy5wdXNoKHsgdGV4dDogcmVxdWVzdC51c2VyTWVzc2FnZSB9KTtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goZW5kcG9pbnQsIHtcbiAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICBoZWFkZXJzOiB7IFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIHN5c3RlbV9pbnN0cnVjdGlvbjogeyBwYXJ0czogW3sgdGV4dDogcmVxdWVzdC5zeXN0ZW1Qcm9tcHQgfV0gfSxcbiAgICAgICAgY29udGVudHM6IFt7IHJvbGU6IFwidXNlclwiLCBwYXJ0cyB9XSxcbiAgICAgICAgZ2VuZXJhdGlvbkNvbmZpZzoge1xuICAgICAgICAgIHRlbXBlcmF0dXJlOiByZXF1ZXN0LnRlbXBlcmF0dXJlLFxuICAgICAgICAgIG1heE91dHB1dFRva2VuczogcmVxdWVzdC5tYXhPdXRwdXRUb2tlbnNcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9KTtcblxuICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihhd2FpdCB0aGlzLmV4dHJhY3RFcnJvcihyZXNwb25zZSwgXCJHZW1pbmlcIikpO1xuICAgIH1cblxuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XG4gICAgY29uc3QgdGV4dCA9IChkYXRhLmNhbmRpZGF0ZXM/LlswXT8uY29udGVudD8ucGFydHMgPz8gW10pXG4gICAgICAubWFwKChwYXJ0OiB7IHRleHQ/OiBzdHJpbmcgfSkgPT4gcGFydC50ZXh0ID8/IFwiXCIpXG4gICAgICAuam9pbihcIlwiKVxuICAgICAgLnRyaW0oKTtcblxuICAgIGlmICghdGV4dCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUHJvdmlkZXIgcmV0dXJuZWQgYW4gZW1wdHkgcmVzcG9uc2UuXCIpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB0ZXh0LFxuICAgICAgaW5wdXRUb2tlbnM6IGRhdGEudXNhZ2VNZXRhZGF0YT8ucHJvbXB0VG9rZW5Db3VudCxcbiAgICAgIG91dHB1dFRva2VuczogZGF0YS51c2FnZU1ldGFkYXRhPy5jYW5kaWRhdGVzVG9rZW5Db3VudFxuICAgIH07XG4gIH1cblxuICBhc3luYyB1cGxvYWRTb3VyY2UoXG4gICAgZmlsZUNvbnRlbnQ6IEFycmF5QnVmZmVyLFxuICAgIG1pbWVUeXBlOiBzdHJpbmcsXG4gICAgZGlzcGxheU5hbWU6IHN0cmluZ1xuICApOiBQcm9taXNlPFVwbG9hZGVkRmlsZUluZm8+IHtcbiAgICB0aGlzLmVuc3VyZUNvbmZpZ3VyZWQoKTtcbiAgICBpZiAoZmlsZUNvbnRlbnQuYnl0ZUxlbmd0aCA+IDIwICogMTAyNCAqIDEwMjQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkZpbGUgdG9vIGxhcmdlLiBHZW1pbmkgRmlsZSBBUEkgbGltaXQgaXMgMjBNQi5cIik7XG4gICAgfVxuXG4gICAgY29uc3Qgc3RhcnRSZXNwb25zZSA9IGF3YWl0IGZldGNoKFxuICAgICAgYGh0dHBzOi8vZ2VuZXJhdGl2ZWxhbmd1YWdlLmdvb2dsZWFwaXMuY29tL3VwbG9hZC92MWJldGEvZmlsZXM/a2V5PSR7ZW5jb2RlVVJJQ29tcG9uZW50KHRoaXMuY29uZmlnLmFwaUtleSl9YCxcbiAgICAgIHtcbiAgICAgICAgbWV0aG9kOiBcIlBPU1RcIixcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgICAgIFwiWC1Hb29nLVVwbG9hZC1Qcm90b2NvbFwiOiBcInJlc3VtYWJsZVwiLFxuICAgICAgICAgIFwiWC1Hb29nLVVwbG9hZC1Db21tYW5kXCI6IFwic3RhcnRcIixcbiAgICAgICAgICBcIlgtR29vZy1VcGxvYWQtSGVhZGVyLUNvbnRlbnQtTGVuZ3RoXCI6IFN0cmluZyhmaWxlQ29udGVudC5ieXRlTGVuZ3RoKSxcbiAgICAgICAgICBcIlgtR29vZy1VcGxvYWQtSGVhZGVyLUNvbnRlbnQtVHlwZVwiOiBtaW1lVHlwZVxuICAgICAgICB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGZpbGU6IHsgZGlzcGxheV9uYW1lOiBkaXNwbGF5TmFtZSB9IH0pXG4gICAgICB9XG4gICAgKTtcblxuICAgIGlmICghc3RhcnRSZXNwb25zZS5vaykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGF3YWl0IHRoaXMuZXh0cmFjdEVycm9yKHN0YXJ0UmVzcG9uc2UsIFwiR2VtaW5pXCIpKTtcbiAgICB9XG5cbiAgICBjb25zdCB1cGxvYWRVcmwgPSBzdGFydFJlc3BvbnNlLmhlYWRlcnMuZ2V0KFwiWC1Hb29nLVVwbG9hZC1VUkxcIik7XG4gICAgaWYgKCF1cGxvYWRVcmwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkdlbWluaSB1cGxvYWQgZmFpbGVkIHRvIHJldHVybiBhIHJlc3VtYWJsZSB1cGxvYWQgVVJMLlwiKTtcbiAgICB9XG5cbiAgICBjb25zdCB1cGxvYWRSZXNwb25zZSA9IGF3YWl0IGZldGNoKHVwbG9hZFVybCwge1xuICAgICAgbWV0aG9kOiBcIlBPU1RcIixcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgXCJDb250ZW50LUxlbmd0aFwiOiBTdHJpbmcoZmlsZUNvbnRlbnQuYnl0ZUxlbmd0aCksXG4gICAgICAgIFwiWC1Hb29nLVVwbG9hZC1PZmZzZXRcIjogXCIwXCIsXG4gICAgICAgIFwiWC1Hb29nLVVwbG9hZC1Db21tYW5kXCI6IFwidXBsb2FkLCBmaW5hbGl6ZVwiXG4gICAgICB9LFxuICAgICAgYm9keTogZmlsZUNvbnRlbnRcbiAgICB9KTtcblxuICAgIGlmICghdXBsb2FkUmVzcG9uc2Uub2spIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihhd2FpdCB0aGlzLmV4dHJhY3RFcnJvcih1cGxvYWRSZXNwb25zZSwgXCJHZW1pbmlcIikpO1xuICAgIH1cblxuICAgIGNvbnN0IHVwbG9hZGVkID0gYXdhaXQgdXBsb2FkUmVzcG9uc2UuanNvbigpO1xuICAgIGNvbnN0IGZpbGVOYW1lID0gdXBsb2FkZWQuZmlsZT8ubmFtZSA/PyB1cGxvYWRlZC5uYW1lO1xuICAgIGlmICghZmlsZU5hbWUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkdlbWluaSB1cGxvYWQgZGlkIG5vdCByZXR1cm4gZmlsZSBtZXRhZGF0YS5cIik7XG4gICAgfVxuXG4gICAgY29uc3QgZmlsZSA9IGF3YWl0IHRoaXMud2FpdEZvckFjdGl2ZUZpbGUoZmlsZU5hbWUpO1xuICAgIHJldHVybiB7XG4gICAgICBwcm92aWRlcjogXCJnZW1pbmlcIixcbiAgICAgIGxhYmVsOiBkaXNwbGF5TmFtZSxcbiAgICAgIG1pbWVfdHlwZTogbWltZVR5cGUsXG4gICAgICBmaWxlX3VyaTogZmlsZS51cmksXG4gICAgICBleHBpcmVzQXQ6IGZpbGUuZXhwaXJhdGlvblRpbWVcbiAgICB9O1xuICB9XG5cbiAgYXN5bmMgbGlzdFNvdXJjZXMoKTogUHJvbWlzZTxVcGxvYWRlZEZpbGVJbmZvW10+IHtcbiAgICB0aGlzLmVuc3VyZUNvbmZpZ3VyZWQoKTtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKFxuICAgICAgYGh0dHBzOi8vZ2VuZXJhdGl2ZWxhbmd1YWdlLmdvb2dsZWFwaXMuY29tL3YxYmV0YS9maWxlcz9rZXk9JHtlbmNvZGVVUklDb21wb25lbnQodGhpcy5jb25maWcuYXBpS2V5KX1gXG4gICAgKTtcbiAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYXdhaXQgdGhpcy5leHRyYWN0RXJyb3IocmVzcG9uc2UsIFwiR2VtaW5pXCIpKTtcbiAgICB9XG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgICByZXR1cm4gKGRhdGEuZmlsZXMgPz8gW10pLm1hcCgoZmlsZTogUmVjb3JkPHN0cmluZywgc3RyaW5nPikgPT4gKHtcbiAgICAgIHByb3ZpZGVyOiBcImdlbWluaVwiIGFzIGNvbnN0LFxuICAgICAgbGFiZWw6IGZpbGUuZGlzcGxheU5hbWUgPz8gZmlsZS5uYW1lID8/IFwiVW50aXRsZWRcIixcbiAgICAgIG1pbWVfdHlwZTogZmlsZS5taW1lVHlwZSA/PyBcImFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbVwiLFxuICAgICAgZmlsZV91cmk6IGZpbGUudXJpLFxuICAgICAgZXhwaXJlc0F0OiBmaWxlLmV4cGlyYXRpb25UaW1lXG4gICAgfSkpO1xuICB9XG5cbiAgYXN5bmMgZGVsZXRlU291cmNlKHJlZjogVXBsb2FkZWRGaWxlSW5mbyk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMuZW5zdXJlQ29uZmlndXJlZCgpO1xuICAgIGlmICghcmVmLmZpbGVfdXJpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IG1hdGNoID0gcmVmLmZpbGVfdXJpLm1hdGNoKC9maWxlc1xcL1teLz9dKyQvKTtcbiAgICBjb25zdCBuYW1lID0gcmVmLmZpbGVfdXJpLnN0YXJ0c1dpdGgoXCJmaWxlcy9cIikgPyByZWYuZmlsZV91cmkgOiBtYXRjaD8uWzBdID8/IHJlZi5maWxlX3VyaTtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKFxuICAgICAgYGh0dHBzOi8vZ2VuZXJhdGl2ZWxhbmd1YWdlLmdvb2dsZWFwaXMuY29tL3YxYmV0YS8ke25hbWV9P2tleT0ke2VuY29kZVVSSUNvbXBvbmVudCh0aGlzLmNvbmZpZy5hcGlLZXkpfWAsXG4gICAgICB7IG1ldGhvZDogXCJERUxFVEVcIiB9XG4gICAgKTtcbiAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYXdhaXQgdGhpcy5leHRyYWN0RXJyb3IocmVzcG9uc2UsIFwiR2VtaW5pXCIpKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyB2YWxpZGF0ZSgpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBpZiAoIXRoaXMuY29uZmlnLmFwaUtleS50cmltKCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goXG4gICAgICAgIGBodHRwczovL2dlbmVyYXRpdmVsYW5ndWFnZS5nb29nbGVhcGlzLmNvbS92MWJldGEvbW9kZWxzP2tleT0ke2VuY29kZVVSSUNvbXBvbmVudCh0aGlzLmNvbmZpZy5hcGlLZXkpfWBcbiAgICAgICk7XG4gICAgICByZXR1cm4gcmVzcG9uc2Uub2s7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVDb25maWd1cmVkKCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5jb25maWcuYXBpS2V5LnRyaW0oKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm8gR2VtaW5pIEFQSSBrZXkgc2V0LiBDaGVjayBwbHVnaW4gc2V0dGluZ3MuXCIpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgd2FpdEZvckFjdGl2ZUZpbGUobmFtZTogc3RyaW5nKTogUHJvbWlzZTxSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+PiB7XG4gICAgY29uc3Qgc3RhcnQgPSBEYXRlLm5vdygpO1xuICAgIHdoaWxlIChEYXRlLm5vdygpIC0gc3RhcnQgPCAzMF8wMDApIHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goXG4gICAgICAgIGBodHRwczovL2dlbmVyYXRpdmVsYW5ndWFnZS5nb29nbGVhcGlzLmNvbS92MWJldGEvJHtuYW1lfT9rZXk9JHtlbmNvZGVVUklDb21wb25lbnQodGhpcy5jb25maWcuYXBpS2V5KX1gXG4gICAgICApO1xuICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYXdhaXQgdGhpcy5leHRyYWN0RXJyb3IocmVzcG9uc2UsIFwiR2VtaW5pXCIpKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XG4gICAgICBjb25zdCBmaWxlID0gZGF0YS5maWxlID8/IGRhdGE7XG4gICAgICBpZiAoZmlsZS5zdGF0ZSA9PT0gXCJBQ1RJVkVcIikge1xuICAgICAgICByZXR1cm4gZmlsZTtcbiAgICAgIH1cbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB3aW5kb3cuc2V0VGltZW91dChyZXNvbHZlLCAyMDAwKSk7XG4gICAgfVxuICAgIHRocm93IG5ldyBFcnJvcihcIlRpbWVkIG91dCB3YWl0aW5nIGZvciBHZW1pbmkgZmlsZSBhY3RpdmF0aW9uLlwiKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZXh0cmFjdEVycm9yKHJlc3BvbnNlOiBSZXNwb25zZSwgcHJvdmlkZXJOYW1lOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQwMSB8fCByZXNwb25zZS5zdGF0dXMgPT09IDQwMykge1xuICAgICAgcmV0dXJuIGAke3Byb3ZpZGVyTmFtZX0gQVBJIGtleSByZWplY3RlZC4gQ2hlY2sgc2V0dGluZ3MuYDtcbiAgICB9XG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gNDI5KSB7XG4gICAgICByZXR1cm4gXCJSYXRlIGxpbWl0IGhpdC4gV2FpdCBhIG1vbWVudCBhbmQgcmV0cnkuXCI7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgICAgcmV0dXJuIGRhdGEuZXJyb3I/Lm1lc3NhZ2UgPz8gYCR7cHJvdmlkZXJOYW1lfSByZXF1ZXN0IGZhaWxlZCAoJHtyZXNwb25zZS5zdGF0dXN9KS5gO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICByZXR1cm4gYXNFcnJvck1lc3NhZ2UoZXJyb3IpIHx8IGAke3Byb3ZpZGVyTmFtZX0gcmVxdWVzdCBmYWlsZWQgKCR7cmVzcG9uc2Uuc3RhdHVzfSkuYDtcbiAgICB9XG4gIH1cbn1cbiIsICJpbXBvcnQge1xuICBHZW5lcmF0aW9uUmVxdWVzdCxcbiAgR2VuZXJhdGlvblJlc3BvbnNlLFxuICBPbGxhbWFQcm92aWRlckNvbmZpZyxcbiAgVXBsb2FkZWRGaWxlSW5mb1xufSBmcm9tIFwiLi4vdHlwZXNcIjtcbmltcG9ydCB7IHRydW5jYXRlU291cmNlVGV4dCB9IGZyb20gXCIuLi9zb3VyY2VVdGlsc1wiO1xuaW1wb3J0IHsgQUlQcm92aWRlciB9IGZyb20gXCIuL2Jhc2VcIjtcblxuaW50ZXJmYWNlIE9sbGFtYVRhZ3NSZXNwb25zZSB7XG4gIG1vZGVscz86IEFycmF5PHsgbmFtZT86IHN0cmluZyB9Pjtcbn1cblxuZXhwb3J0IGNsYXNzIE9sbGFtYVByb3ZpZGVyIGltcGxlbWVudHMgQUlQcm92aWRlciB7XG4gIHJlYWRvbmx5IGlkID0gXCJvbGxhbWFcIjtcbiAgcmVhZG9ubHkgbmFtZSA9IFwiT2xsYW1hXCI7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBjb25maWc6IE9sbGFtYVByb3ZpZGVyQ29uZmlnKSB7fVxuXG4gIGFzeW5jIGdlbmVyYXRlKHJlcXVlc3Q6IEdlbmVyYXRpb25SZXF1ZXN0KTogUHJvbWlzZTxHZW5lcmF0aW9uUmVzcG9uc2U+IHtcbiAgICBjb25zdCBiYXNlVXJsID0gdGhpcy5jb25maWcuYmFzZVVybC5yZXBsYWNlKC9cXC8kLywgXCJcIik7XG4gICAgY29uc3QgbW9kZWwgPSByZXF1ZXN0Lm1vZGVsIHx8IHRoaXMuY29uZmlnLmRlZmF1bHRNb2RlbDtcbiAgICBjb25zdCBzb3VyY2VCbG9ja3MgPSAocmVxdWVzdC5yZXNvbHZlZFNvdXJjZXMgPz8gW10pXG4gICAgICAuZmlsdGVyKChzb3VyY2UpID0+IHNvdXJjZS50ZXh0Q29udGVudClcbiAgICAgIC5tYXAoKHNvdXJjZSkgPT4gYFtTT1VSQ0U6ICR7c291cmNlLnJlZi5sYWJlbH1dXFxuJHt0cnVuY2F0ZVNvdXJjZVRleHQoc291cmNlLnRleHRDb250ZW50ID8/IFwiXCIpfVxcbltFTkQgU09VUkNFXWApO1xuXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgJHtiYXNlVXJsfS9hcGkvY2hhdGAsIHtcbiAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICBoZWFkZXJzOiB7IFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIG1vZGVsLFxuICAgICAgICBzdHJlYW06IGZhbHNlLFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgdGVtcGVyYXR1cmU6IHJlcXVlc3QudGVtcGVyYXR1cmUsXG4gICAgICAgICAgbnVtX3ByZWRpY3Q6IHJlcXVlc3QubWF4T3V0cHV0VG9rZW5zXG4gICAgICAgIH0sXG4gICAgICAgIG1lc3NhZ2VzOiBbXG4gICAgICAgICAgeyByb2xlOiBcInN5c3RlbVwiLCBjb250ZW50OiByZXF1ZXN0LnN5c3RlbVByb21wdCB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHJvbGU6IFwidXNlclwiLFxuICAgICAgICAgICAgY29udGVudDogc291cmNlQmxvY2tzLmxlbmd0aFxuICAgICAgICAgICAgICA/IGAke3NvdXJjZUJsb2Nrcy5qb2luKFwiXFxuXFxuXCIpfVxcblxcbiR7cmVxdWVzdC51c2VyTWVzc2FnZX1gXG4gICAgICAgICAgICAgIDogcmVxdWVzdC51c2VyTWVzc2FnZVxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfSlcbiAgICB9KTtcblxuICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQwNCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE1vZGVsICcke21vZGVsfScgbm90IGZvdW5kIGluIE9sbGFtYS4gQ2hlY2sgYXZhaWxhYmxlIG1vZGVscyBpbiBzZXR0aW5ncy5gKTtcbiAgICAgIH1cbiAgICAgIHRocm93IG5ldyBFcnJvcihgT2xsYW1hIG5vdCByZWFjaGFibGUgYXQgJHtiYXNlVXJsfS4gSXMgaXQgcnVubmluZz9gKTtcbiAgICB9XG5cbiAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgIGNvbnN0IHRleHQgPSBkYXRhLm1lc3NhZ2U/LmNvbnRlbnQ/LnRyaW0/LigpID8/IFwiXCI7XG4gICAgaWYgKCF0ZXh0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQcm92aWRlciByZXR1cm5lZCBhbiBlbXB0eSByZXNwb25zZS5cIik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHRleHQsXG4gICAgICBpbnB1dFRva2VuczogZGF0YS5wcm9tcHRfZXZhbF9jb3VudCxcbiAgICAgIG91dHB1dFRva2VuczogZGF0YS5ldmFsX2NvdW50XG4gICAgfTtcbiAgfVxuXG4gIGFzeW5jIHVwbG9hZFNvdXJjZSgpOiBQcm9taXNlPFVwbG9hZGVkRmlsZUluZm8+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJPbGxhbWEgZG9lcyBub3Qgc3VwcG9ydCBmaWxlIHVwbG9hZC4gQWRkIGEgdmF1bHRfcGF0aCBzb3VyY2UgaW5zdGVhZC5cIik7XG4gIH1cblxuICBhc3luYyBsaXN0U291cmNlcygpOiBQcm9taXNlPFVwbG9hZGVkRmlsZUluZm9bXT4ge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIGFzeW5jIGRlbGV0ZVNvdXJjZSgpOiBQcm9taXNlPHZvaWQ+IHt9XG5cbiAgYXN5bmMgdmFsaWRhdGUoKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHRhZ3MgPSBhd2FpdCB0aGlzLmZldGNoVGFncygpO1xuICAgICAgcmV0dXJuIEJvb2xlYW4odGFncy5tb2RlbHM/Lmxlbmd0aCk7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgbGlzdE1vZGVscygpOiBQcm9taXNlPHN0cmluZ1tdPiB7XG4gICAgY29uc3QgdGFncyA9IGF3YWl0IHRoaXMuZmV0Y2hUYWdzKCk7XG4gICAgcmV0dXJuICh0YWdzLm1vZGVscyA/PyBbXSkubWFwKChtb2RlbCkgPT4gbW9kZWwubmFtZSA/PyBcIlwiKS5maWx0ZXIoQm9vbGVhbik7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGZldGNoVGFncygpOiBQcm9taXNlPE9sbGFtYVRhZ3NSZXNwb25zZT4ge1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7dGhpcy5jb25maWcuYmFzZVVybC5yZXBsYWNlKC9cXC8kLywgXCJcIil9L2FwaS90YWdzYCk7XG4gICAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBPbGxhbWEgbm90IHJlYWNoYWJsZSBhdCAke3RoaXMuY29uZmlnLmJhc2VVcmx9LiBJcyBpdCBydW5uaW5nP2ApO1xuICAgIH1cbiAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpO1xuICB9XG59XG4iLCAiaW1wb3J0IHtcbiAgR2VuZXJhdGlvblJlcXVlc3QsXG4gIEdlbmVyYXRpb25SZXNwb25zZSxcbiAgT3BlbkFJUHJvdmlkZXJDb25maWcsXG4gIFVwbG9hZGVkRmlsZUluZm9cbn0gZnJvbSBcIi4uL3R5cGVzXCI7XG5pbXBvcnQgeyB0cnVuY2F0ZVNvdXJjZVRleHQgfSBmcm9tIFwiLi4vc291cmNlVXRpbHNcIjtcbmltcG9ydCB7IEFJUHJvdmlkZXIgfSBmcm9tIFwiLi9iYXNlXCI7XG5cbmV4cG9ydCBjbGFzcyBPcGVuQUlQcm92aWRlciBpbXBsZW1lbnRzIEFJUHJvdmlkZXIge1xuICByZWFkb25seSBpZCA9IFwib3BlbmFpXCI7XG4gIHJlYWRvbmx5IG5hbWUgPSBcIk9wZW5BSVwiO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgY29uZmlnOiBPcGVuQUlQcm92aWRlckNvbmZpZykge31cblxuICBhc3luYyBnZW5lcmF0ZShyZXF1ZXN0OiBHZW5lcmF0aW9uUmVxdWVzdCk6IFByb21pc2U8R2VuZXJhdGlvblJlc3BvbnNlPiB7XG4gICAgdGhpcy5lbnN1cmVDb25maWd1cmVkKCk7XG4gICAgY29uc3QgYmFzZVVybCA9IHRoaXMuY29uZmlnLmJhc2VVcmwucmVwbGFjZSgvXFwvJC8sIFwiXCIpO1xuICAgIGNvbnN0IG1vZGVsID0gcmVxdWVzdC5tb2RlbCB8fCB0aGlzLmNvbmZpZy5kZWZhdWx0TW9kZWw7XG4gICAgY29uc3Qgc291cmNlQmxvY2tzID0gKHJlcXVlc3QucmVzb2x2ZWRTb3VyY2VzID8/IFtdKVxuICAgICAgLmZpbHRlcigoc291cmNlKSA9PiBzb3VyY2UudGV4dENvbnRlbnQpXG4gICAgICAubWFwKChzb3VyY2UpID0+IGBbU09VUkNFOiAke3NvdXJjZS5yZWYubGFiZWx9XVxcbiR7dHJ1bmNhdGVTb3VyY2VUZXh0KHNvdXJjZS50ZXh0Q29udGVudCA/PyBcIlwiKX1cXG5bRU5EIFNPVVJDRV1gKTtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7YmFzZVVybH0vY2hhdC9jb21wbGV0aW9uc2AsIHtcbiAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgICBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7dGhpcy5jb25maWcuYXBpS2V5fWBcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIG1vZGVsLFxuICAgICAgICB0ZW1wZXJhdHVyZTogcmVxdWVzdC50ZW1wZXJhdHVyZSxcbiAgICAgICAgbWF4X3Rva2VuczogcmVxdWVzdC5tYXhPdXRwdXRUb2tlbnMsXG4gICAgICAgIG1lc3NhZ2VzOiBbXG4gICAgICAgICAgeyByb2xlOiBcInN5c3RlbVwiLCBjb250ZW50OiByZXF1ZXN0LnN5c3RlbVByb21wdCB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHJvbGU6IFwidXNlclwiLFxuICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgdHlwZTogXCJ0ZXh0XCIsXG4gICAgICAgICAgICAgICAgdGV4dDogc291cmNlQmxvY2tzLmxlbmd0aFxuICAgICAgICAgICAgICAgICAgPyBgJHtzb3VyY2VCbG9ja3Muam9pbihcIlxcblxcblwiKX1cXG5cXG4ke3JlcXVlc3QudXNlck1lc3NhZ2V9YFxuICAgICAgICAgICAgICAgICAgOiByZXF1ZXN0LnVzZXJNZXNzYWdlXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH0pXG4gICAgfSk7XG5cbiAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYXdhaXQgdGhpcy5leHRyYWN0RXJyb3IocmVzcG9uc2UpKTtcbiAgICB9XG5cbiAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgIGNvbnN0IHRleHQgPSBkYXRhLmNob2ljZXM/LlswXT8ubWVzc2FnZT8uY29udGVudD8udHJpbT8uKCkgPz8gXCJcIjtcbiAgICBpZiAoIXRleHQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlByb3ZpZGVyIHJldHVybmVkIGFuIGVtcHR5IHJlc3BvbnNlLlwiKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgdGV4dCxcbiAgICAgIGlucHV0VG9rZW5zOiBkYXRhLnVzYWdlPy5wcm9tcHRfdG9rZW5zLFxuICAgICAgb3V0cHV0VG9rZW5zOiBkYXRhLnVzYWdlPy5jb21wbGV0aW9uX3Rva2Vuc1xuICAgIH07XG4gIH1cblxuICBhc3luYyB1cGxvYWRTb3VyY2UoKTogUHJvbWlzZTxVcGxvYWRlZEZpbGVJbmZvPiB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiVGhpcyBwcm92aWRlciBkb2VzIG5vdCBzdXBwb3J0IGZpbGUgdXBsb2FkLiBVc2UgdmF1bHRfcGF0aCBpbnN0ZWFkLlwiKTtcbiAgfVxuXG4gIGFzeW5jIGxpc3RTb3VyY2VzKCk6IFByb21pc2U8VXBsb2FkZWRGaWxlSW5mb1tdPiB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgYXN5bmMgZGVsZXRlU291cmNlKCk6IFByb21pc2U8dm9pZD4ge31cblxuICBhc3luYyB2YWxpZGF0ZSgpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBpZiAoIXRoaXMuY29uZmlnLmFwaUtleS50cmltKCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYCR7dGhpcy5jb25maWcuYmFzZVVybC5yZXBsYWNlKC9cXC8kLywgXCJcIil9L21vZGVsc2AsIHtcbiAgICAgICAgaGVhZGVyczogeyBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7dGhpcy5jb25maWcuYXBpS2V5fWAgfVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVzcG9uc2Uub2s7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVDb25maWd1cmVkKCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5jb25maWcuYXBpS2V5LnRyaW0oKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm8gT3BlbkFJIEFQSSBrZXkgc2V0LiBDaGVjayBwbHVnaW4gc2V0dGluZ3MuXCIpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZXh0cmFjdEVycm9yKHJlc3BvbnNlOiBSZXNwb25zZSk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAxIHx8IHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAzKSB7XG4gICAgICByZXR1cm4gXCJPcGVuQUkgQVBJIGtleSByZWplY3RlZC4gQ2hlY2sgc2V0dGluZ3MuXCI7XG4gICAgfVxuICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQyOSkge1xuICAgICAgcmV0dXJuIFwiUmF0ZSBsaW1pdCBoaXQuIFdhaXQgYSBtb21lbnQgYW5kIHJldHJ5LlwiO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgICAgIHJldHVybiBkYXRhLmVycm9yPy5tZXNzYWdlID8/IGBPcGVuQUkgcmVxdWVzdCBmYWlsZWQgKCR7cmVzcG9uc2Uuc3RhdHVzfSkuYDtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBgT3BlbkFJIHJlcXVlc3QgZmFpbGVkICgke3Jlc3BvbnNlLnN0YXR1c30pLmA7XG4gICAgfVxuICB9XG59XG4iLCAiaW1wb3J0IHsgUHJvdmlkZXJJRCwgU3lieWxTZXR0aW5ncyB9IGZyb20gXCIuLi90eXBlc1wiO1xuaW1wb3J0IHsgQUlQcm92aWRlciB9IGZyb20gXCIuL2Jhc2VcIjtcbmltcG9ydCB7IEFudGhyb3BpY1Byb3ZpZGVyIH0gZnJvbSBcIi4vYW50aHJvcGljXCI7XG5pbXBvcnQgeyBHZW1pbmlQcm92aWRlciB9IGZyb20gXCIuL2dlbWluaVwiO1xuaW1wb3J0IHsgT2xsYW1hUHJvdmlkZXIgfSBmcm9tIFwiLi9vbGxhbWFcIjtcbmltcG9ydCB7IE9wZW5BSVByb3ZpZGVyIH0gZnJvbSBcIi4vb3BlbmFpXCI7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRQcm92aWRlcihzZXR0aW5nczogU3lieWxTZXR0aW5ncywgb3ZlcnJpZGVJZD86IFByb3ZpZGVySUQpOiBBSVByb3ZpZGVyIHtcbiAgY29uc3QgaWQgPSBvdmVycmlkZUlkID8/IHNldHRpbmdzLmFjdGl2ZVByb3ZpZGVyO1xuICBzd2l0Y2ggKGlkKSB7XG4gICAgY2FzZSBcImdlbWluaVwiOlxuICAgICAgcmV0dXJuIG5ldyBHZW1pbmlQcm92aWRlcihzZXR0aW5ncy5wcm92aWRlcnMuZ2VtaW5pKTtcbiAgICBjYXNlIFwib3BlbmFpXCI6XG4gICAgICByZXR1cm4gbmV3IE9wZW5BSVByb3ZpZGVyKHNldHRpbmdzLnByb3ZpZGVycy5vcGVuYWkpO1xuICAgIGNhc2UgXCJhbnRocm9waWNcIjpcbiAgICAgIHJldHVybiBuZXcgQW50aHJvcGljUHJvdmlkZXIoc2V0dGluZ3MucHJvdmlkZXJzLmFudGhyb3BpYyk7XG4gICAgY2FzZSBcIm9sbGFtYVwiOlxuICAgICAgcmV0dXJuIG5ldyBPbGxhbWFQcm92aWRlcihzZXR0aW5ncy5wcm92aWRlcnMub2xsYW1hKTtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHByb3ZpZGVyOiAke2lkfWApO1xuICB9XG59XG4iLCAiaW1wb3J0IHsgTm90aWNlLCBURmlsZSB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHR5cGUgU3lieWxQbHVnaW4gZnJvbSBcIi4vbWFpblwiO1xuaW1wb3J0IHsgYXBwZW5kVG9Ob3RlLCBnZXRTZWxlY3Rpb24sIGluc2VydEJlbG93U2VsZWN0aW9uIH0gZnJvbSBcIi4vZWRpdG9yXCI7XG5pbXBvcnQgeyByZW1vdmVTb3VyY2VSZWYsIHVwc2VydFNvdXJjZVJlZiwgd3JpdGVGcm9udE1hdHRlcktleSB9IGZyb20gXCIuL2Zyb250bWF0dGVyXCI7XG5pbXBvcnQge1xuICBmb3JtYXRBc2tPcmFjbGUsXG4gIGZvcm1hdERlY2xhcmVBY3Rpb24sXG4gIGZvcm1hdEV4cGFuZFNjZW5lLFxuICBmb3JtYXRJbnRlcnByZXRPcmFjbGUsXG4gIGZvcm1hdFN0YXJ0U2NlbmUsXG4gIGZvcm1hdFN1Z2dlc3RDb25zZXF1ZW5jZSxcbiAgTG9uZWxvZ0Zvcm1hdE9wdGlvbnNcbn0gZnJvbSBcIi4vbG9uZWxvZy9mb3JtYXR0ZXJcIjtcbmltcG9ydCB7IHBhcnNlTG9uZWxvZ0NvbnRleHQsIHNlcmlhbGl6ZUNvbnRleHQgfSBmcm9tIFwiLi9sb25lbG9nL3BhcnNlclwiO1xuaW1wb3J0IHsgTWFuYWdlU291cmNlc01vZGFsLCBvcGVuSW5wdXRNb2RhbCwgcGlja0xvY2FsRmlsZSwgcGlja1ZhdWx0RmlsZSB9IGZyb20gXCIuL21vZGFsc1wiO1xuaW1wb3J0IHsgZ2V0UHJvdmlkZXIgfSBmcm9tIFwiLi9wcm92aWRlcnNcIjtcbmltcG9ydCB7IE5vdGVGcm9udE1hdHRlciwgU291cmNlUmVmLCBTeWJ5bFNldHRpbmdzLCBVcGxvYWRlZEZpbGVJbmZvIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuZnVuY3Rpb24gaXNMb25lbG9nQWN0aXZlKHNldHRpbmdzOiBTeWJ5bFNldHRpbmdzLCBmbTogTm90ZUZyb250TWF0dGVyKTogYm9vbGVhbiB7XG4gIHJldHVybiBmbS5sb25lbG9nID8/IHNldHRpbmdzLmxvbmVsb2dNb2RlO1xufVxuXG5mdW5jdGlvbiBsb25lbG9nT3B0cyhzZXR0aW5nczogU3lieWxTZXR0aW5ncyk6IExvbmVsb2dGb3JtYXRPcHRpb25zIHtcbiAgcmV0dXJuIHsgd3JhcEluQ29kZUJsb2NrOiBzZXR0aW5ncy5sb25lbG9nV3JhcENvZGVCbG9jayA/PyB0cnVlIH07XG59XG5cbmZ1bmN0aW9uIGdlbmVyaWNCbG9ja3F1b3RlKGxhYmVsOiBzdHJpbmcsIHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBgPiBbJHtsYWJlbH1dICR7dGV4dC50cmltKCkucmVwbGFjZSgvXFxuL2csIFwiXFxuPiBcIil9YDtcbn1cblxuZnVuY3Rpb24gaW5mZXJNaW1lVHlwZShmaWxlOiBURmlsZSB8IEZpbGUpOiBzdHJpbmcge1xuICBjb25zdCBuYW1lID0gXCJwYXRoXCIgaW4gZmlsZSA/IGZpbGUucGF0aCA6IGZpbGUubmFtZTtcbiAgcmV0dXJuIG5hbWUudG9Mb3dlckNhc2UoKS5lbmRzV2l0aChcIi5wZGZcIikgPyBcImFwcGxpY2F0aW9uL3BkZlwiIDogXCJ0ZXh0L3BsYWluXCI7XG59XG5cbmZ1bmN0aW9uIHRvZGF5SXNvRGF0ZSgpOiBzdHJpbmcge1xuICByZXR1cm4gbmV3IERhdGUoKS50b0lTT1N0cmluZygpLnNsaWNlKDAsIDEwKTtcbn1cblxuZnVuY3Rpb24gcGFyc2VMb25lbG9nT3JhY2xlUmVzcG9uc2UodGV4dDogc3RyaW5nKTogeyByZXN1bHQ6IHN0cmluZzsgaW50ZXJwcmV0YXRpb246IHN0cmluZyB9IHtcbiAgY29uc3QgbGluZXMgPSB0ZXh0XG4gICAgLnJlcGxhY2UoL14+XFxzKi9nbSwgXCJcIilcbiAgICAuc3BsaXQoXCJcXG5cIilcbiAgICAubWFwKChsaW5lKSA9PiBsaW5lLnRyaW0oKSlcbiAgICAuZmlsdGVyKEJvb2xlYW4pO1xuICBjb25zdCByZXN1bHQgPSBsaW5lcy5maW5kKChsaW5lKSA9PiBsaW5lLnN0YXJ0c1dpdGgoXCItPlwiKSk/LnJlcGxhY2UoL14tPlxccyovLCBcIlwiKSA/PyBcIlVuY2xlYXJcIjtcbiAgY29uc3QgaW50ZXJwcmV0YXRpb24gPSBsaW5lcy5maWx0ZXIoKGxpbmUpID0+ICFsaW5lLnN0YXJ0c1dpdGgoXCItPlwiKSkuam9pbihcIlxcblwiKTtcbiAgcmV0dXJuIHsgcmVzdWx0LCBpbnRlcnByZXRhdGlvbiB9O1xufVxuXG5hc3luYyBmdW5jdGlvbiBhZGRTb3VyY2VUb05vdGUocGx1Z2luOiBTeWJ5bFBsdWdpbiwgZmlsZTogVEZpbGUsIGZtOiBOb3RlRnJvbnRNYXR0ZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgcHJvdmlkZXJJZCA9IGZtLnByb3ZpZGVyID8/IHBsdWdpbi5zZXR0aW5ncy5hY3RpdmVQcm92aWRlcjtcbiAgY29uc3QgcHJvdmlkZXIgPSBnZXRQcm92aWRlcihwbHVnaW4uc2V0dGluZ3MsIHByb3ZpZGVySWQpO1xuXG4gIGlmIChwcm92aWRlcklkID09PSBcImdlbWluaVwiKSB7XG4gICAgY29uc3QgZmlsZUhhbmRsZSA9IGF3YWl0IHBpY2tMb2NhbEZpbGUoKTtcbiAgICBpZiAoIWZpbGVIYW5kbGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbmV3IE5vdGljZShcIlVwbG9hZGluZyBzb3VyY2UuLi5cIik7XG4gICAgY29uc3QgdXBsb2FkZWQgPSBhd2FpdCBwcm92aWRlci51cGxvYWRTb3VyY2UoXG4gICAgICBhd2FpdCBmaWxlSGFuZGxlLmFycmF5QnVmZmVyKCksXG4gICAgICBpbmZlck1pbWVUeXBlKGZpbGVIYW5kbGUpLFxuICAgICAgZmlsZUhhbmRsZS5uYW1lXG4gICAgKTtcbiAgICBhd2FpdCB1cHNlcnRTb3VyY2VSZWYocGx1Z2luLmFwcCwgZmlsZSwge1xuICAgICAgbGFiZWw6IHVwbG9hZGVkLmxhYmVsLFxuICAgICAgcHJvdmlkZXI6IFwiZ2VtaW5pXCIsXG4gICAgICBtaW1lX3R5cGU6IHVwbG9hZGVkLm1pbWVfdHlwZSxcbiAgICAgIGZpbGVfdXJpOiB1cGxvYWRlZC5maWxlX3VyaSxcbiAgICAgIGV4cGlyZXNBdDogdXBsb2FkZWQuZXhwaXJlc0F0XG4gICAgfSk7XG4gICAgbmV3IE5vdGljZShgU291cmNlIHVwbG9hZGVkOiAke3VwbG9hZGVkLmZpbGVfdXJpID8/IHVwbG9hZGVkLmxhYmVsfWApO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IHZhdWx0RmlsZSA9IGF3YWl0IHBpY2tWYXVsdEZpbGUocGx1Z2luLmFwcCwgXCJDaG9vc2UgYSB2YXVsdCBmaWxlXCIpO1xuICBpZiAoIXZhdWx0RmlsZSkge1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCByZWY6IFNvdXJjZVJlZiA9IHtcbiAgICBsYWJlbDogdmF1bHRGaWxlLmJhc2VuYW1lLFxuICAgIHByb3ZpZGVyOiBwcm92aWRlcklkLFxuICAgIG1pbWVfdHlwZTogaW5mZXJNaW1lVHlwZSh2YXVsdEZpbGUpLFxuICAgIHZhdWx0X3BhdGg6IHZhdWx0RmlsZS5wYXRoXG4gIH07XG4gIGF3YWl0IHVwc2VydFNvdXJjZVJlZihwbHVnaW4uYXBwLCBmaWxlLCByZWYpO1xuICBuZXcgTm90aWNlKGBTb3VyY2UgYWRkZWQ6ICR7dmF1bHRGaWxlLnBhdGh9YCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIG1hbmFnZVNvdXJjZXMocGx1Z2luOiBTeWJ5bFBsdWdpbik6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBjb250ZXh0ID0gYXdhaXQgcGx1Z2luLmdldEFjdGl2ZU5vdGVDb250ZXh0KCk7XG4gIGlmICghY29udGV4dD8udmlldy5maWxlKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIG5ldyBNYW5hZ2VTb3VyY2VzTW9kYWwoXG4gICAgcGx1Z2luLmFwcCxcbiAgICBjb250ZXh0LmZtLnNvdXJjZXMgPz8gW10sXG4gICAgYXN5bmMgKHJlZikgPT4gcmVtb3ZlU291cmNlUmVmKHBsdWdpbi5hcHAsIGNvbnRleHQudmlldy5maWxlISwgcmVmKSxcbiAgICBhc3luYyAocmVmKSA9PiB7XG4gICAgICBjb25zdCBwcm92aWRlciA9IGdldFByb3ZpZGVyKHBsdWdpbi5zZXR0aW5ncywgcmVmLnByb3ZpZGVyKTtcbiAgICAgIGF3YWl0IHByb3ZpZGVyLmRlbGV0ZVNvdXJjZShyZWYgYXMgVXBsb2FkZWRGaWxlSW5mbyk7XG4gICAgICBhd2FpdCByZW1vdmVTb3VyY2VSZWYocGx1Z2luLmFwcCwgY29udGV4dC52aWV3LmZpbGUhLCByZWYpO1xuICAgIH0sXG4gICAgYXN5bmMgKCkgPT4gYWRkU291cmNlVG9Ob3RlKHBsdWdpbiwgY29udGV4dC52aWV3LmZpbGUhLCBjb250ZXh0LmZtKVxuICApLm9wZW4oKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcnVuR2VuZXJhdGlvbihcbiAgcGx1Z2luOiBTeWJ5bFBsdWdpbixcbiAgdXNlck1lc3NhZ2U6IHN0cmluZyxcbiAgZm9ybWF0dGVyOiAodGV4dDogc3RyaW5nLCBmbTogTm90ZUZyb250TWF0dGVyKSA9PiBzdHJpbmcsXG4gIG1heE91dHB1dFRva2VucyA9IDUxMixcbiAgcGxhY2VtZW50PzogXCJjdXJzb3JcIiB8IFwiZW5kLW9mLW5vdGVcIiB8IFwiYmVsb3ctc2VsZWN0aW9uXCJcbik6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBjb250ZXh0ID0gYXdhaXQgcGx1Z2luLmdldEFjdGl2ZU5vdGVDb250ZXh0KCk7XG4gIGlmICghY29udGV4dCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHRyeSB7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBwbHVnaW4ucmVxdWVzdEdlbmVyYXRpb24oY29udGV4dC5mbSwgY29udGV4dC5ub3RlQm9keSwgdXNlck1lc3NhZ2UsIG1heE91dHB1dFRva2Vucyk7XG4gICAgY29uc3QgZm9ybWF0dGVkID0gZm9ybWF0dGVyKHJlc3BvbnNlLnRleHQsIGNvbnRleHQuZm0pO1xuICAgIGlmIChwbGFjZW1lbnQgPT09IFwiYmVsb3ctc2VsZWN0aW9uXCIpIHtcbiAgICAgIGluc2VydEJlbG93U2VsZWN0aW9uKGNvbnRleHQudmlldy5lZGl0b3IsIGZvcm1hdHRlZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBsdWdpbi5pbnNlcnRUZXh0KGNvbnRleHQudmlldywgZm9ybWF0dGVkLCBwbGFjZW1lbnQpO1xuICAgIH1cbiAgICBwbHVnaW4ubWF5YmVJbnNlcnRUb2tlbkNvbW1lbnQoY29udGV4dC52aWV3LCByZXNwb25zZSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgbmV3IE5vdGljZShgU3lieWwgZXJyb3I6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWdpc3RlckFsbENvbW1hbmRzKHBsdWdpbjogU3lieWxQbHVnaW4pOiB2b2lkIHtcbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOnN0YXJ0LXNjZW5lXCIsXG4gICAgbmFtZTogXCJTeWJ5bDogU3RhcnQgU2NlbmVcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY29udGV4dCA9IGF3YWl0IHBsdWdpbi5nZXRBY3RpdmVOb3RlQ29udGV4dCgpO1xuICAgICAgaWYgKCFjb250ZXh0Py52aWV3LmZpbGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKGlzTG9uZWxvZ0FjdGl2ZShwbHVnaW4uc2V0dGluZ3MsIGNvbnRleHQuZm0pKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlcyA9IGF3YWl0IG9wZW5JbnB1dE1vZGFsKHBsdWdpbi5hcHAsIFwiU3RhcnQgU2NlbmVcIiwgW1xuICAgICAgICAgIHsga2V5OiBcInNjZW5lRGVzY1wiLCBsYWJlbDogXCJTY2VuZSBkZXNjcmlwdGlvblwiLCBwbGFjZWhvbGRlcjogXCJEYXJrIGFsbGV5LCBtaWRuaWdodFwiIH1cbiAgICAgICAgXSk7XG4gICAgICAgIGlmICghdmFsdWVzPy5zY2VuZURlc2MpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY291bnRlciA9IGNvbnRleHQuZm0uc2NlbmVfY291bnRlciA/PyAxO1xuICAgICAgICBhd2FpdCBydW5HZW5lcmF0aW9uKFxuICAgICAgICAgIHBsdWdpbixcbiAgICAgICAgICBgU1RBUlQgU0NFTkUuIEdlbmVyYXRlIG9ubHk6IDItMyBsaW5lcyBvZiB0aGlyZC1wZXJzb24gcGFzdC10ZW5zZSBwcm9zZSBkZXNjcmliaW5nIHRoZSBhdG1vc3BoZXJlIGFuZCBzZXR0aW5nIG9mOiBcIiR7dmFsdWVzLnNjZW5lRGVzY31cIi4gTm8gZGlhbG9ndWUuIE5vIFBDIGFjdGlvbnMuIE5vIGFkZGl0aW9uYWwgY29tbWVudGFyeS5gLFxuICAgICAgICAgICh0ZXh0KSA9PiBmb3JtYXRTdGFydFNjZW5lKHRleHQsIGBTJHtjb3VudGVyfWAsIHZhbHVlcy5zY2VuZURlc2MsIGxvbmVsb2dPcHRzKHBsdWdpbi5zZXR0aW5ncykpXG4gICAgICAgICk7XG4gICAgICAgIGlmIChwbHVnaW4uc2V0dGluZ3MubG9uZWxvZ0F1dG9JbmNTY2VuZSkge1xuICAgICAgICAgIGF3YWl0IHdyaXRlRnJvbnRNYXR0ZXJLZXkocGx1Z2luLmFwcCwgY29udGV4dC52aWV3LmZpbGUsIFwic2NlbmVfY291bnRlclwiLCBjb3VudGVyICsgMSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgYXdhaXQgcnVuR2VuZXJhdGlvbihcbiAgICAgICAgcGx1Z2luLFxuICAgICAgICBcIlNUQVJUIFNDRU5FLiBHZW5lcmF0ZSBvbmx5OiAyLTMgbGluZXMgb2YgdGhpcmQtcGVyc29uIHBhc3QtdGVuc2UgcHJvc2UgZGVzY3JpYmluZyB0aGUgc2V0dGluZyBhbmQgYXRtb3NwaGVyZS4gTm8gZGlhbG9ndWUuIE5vIFBDIGFjdGlvbnMuIE5vIGFkZGl0aW9uYWwgY29tbWVudGFyeS5cIixcbiAgICAgICAgKHRleHQpID0+IGdlbmVyaWNCbG9ja3F1b3RlKFwiU2NlbmVcIiwgdGV4dClcbiAgICAgICk7XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6ZGVjbGFyZS1hY3Rpb25cIixcbiAgICBuYW1lOiBcIlN5YnlsOiBEZWNsYXJlIEFjdGlvblwiLFxuICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCB2YWx1ZXMgPSBhd2FpdCBvcGVuSW5wdXRNb2RhbChwbHVnaW4uYXBwLCBcIkRlY2xhcmUgQWN0aW9uXCIsIFtcbiAgICAgICAgeyBrZXk6IFwiYWN0aW9uXCIsIGxhYmVsOiBcIkFjdGlvblwiIH0sXG4gICAgICAgIHsga2V5OiBcInJvbGxcIiwgbGFiZWw6IFwiUm9sbCByZXN1bHRcIiB9XG4gICAgICBdKTtcbiAgICAgIGlmICghdmFsdWVzPy5hY3Rpb24gfHwgIXZhbHVlcy5yb2xsKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGF3YWl0IHJ1bkdlbmVyYXRpb24oXG4gICAgICAgIHBsdWdpbixcbiAgICAgICAgYFBDIGFjdGlvbjogJHt2YWx1ZXMuYWN0aW9ufVxcblJvbGwgcmVzdWx0OiAke3ZhbHVlcy5yb2xsfVxcbkRlc2NyaWJlIG9ubHkgdGhlIGNvbnNlcXVlbmNlcyBhbmQgd29ybGQgcmVhY3Rpb24uIERvIG5vdCBkZXNjcmliZSB0aGUgUEMncyBhY3Rpb24uYCxcbiAgICAgICAgKHRleHQsIGZtKSA9PlxuICAgICAgICAgIGlzTG9uZWxvZ0FjdGl2ZShwbHVnaW4uc2V0dGluZ3MsIGZtKVxuICAgICAgICAgICAgPyBmb3JtYXREZWNsYXJlQWN0aW9uKHZhbHVlcy5hY3Rpb24sIHZhbHVlcy5yb2xsLCB0ZXh0LCBsb25lbG9nT3B0cyhwbHVnaW4uc2V0dGluZ3MpKVxuICAgICAgICAgICAgOiBgPiBbQWN0aW9uXSAke3ZhbHVlcy5hY3Rpb259IHwgUm9sbDogJHt2YWx1ZXMucm9sbH1cXG4+IFtSZXN1bHRdICR7dGV4dC50cmltKCkucmVwbGFjZSgvXFxuL2csIFwiXFxuPiBcIil9YFxuICAgICAgKTtcbiAgICB9XG4gIH0pO1xuXG4gIHBsdWdpbi5hZGRDb21tYW5kKHtcbiAgICBpZDogXCJzeWJ5bDphc2stb3JhY2xlXCIsXG4gICAgbmFtZTogXCJTeWJ5bDogQXNrIE9yYWNsZVwiLFxuICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjb250ZXh0ID0gYXdhaXQgcGx1Z2luLmdldEFjdGl2ZU5vdGVDb250ZXh0KCk7XG4gICAgICBpZiAoIWNvbnRleHQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgdmFsdWVzID0gYXdhaXQgb3BlbklucHV0TW9kYWwocGx1Z2luLmFwcCwgXCJBc2sgT3JhY2xlXCIsIFtcbiAgICAgICAgeyBrZXk6IFwicXVlc3Rpb25cIiwgbGFiZWw6IFwiUXVlc3Rpb25cIiB9LFxuICAgICAgICB7IGtleTogXCJyZXN1bHRcIiwgbGFiZWw6IFwiT3JhY2xlIHJlc3VsdFwiLCBvcHRpb25hbDogdHJ1ZSB9XG4gICAgICBdKTtcbiAgICAgIGlmICghdmFsdWVzPy5xdWVzdGlvbikge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCBoYXNSZXN1bHQgPSBCb29sZWFuKHZhbHVlcy5yZXN1bHQ/LnRyaW0oKSk7XG4gICAgICBjb25zdCBtZXNzYWdlID0gaGFzUmVzdWx0XG4gICAgICAgID8gYE9yYWNsZSBxdWVzdGlvbjogJHt2YWx1ZXMucXVlc3Rpb259XFxuT3JhY2xlIHJlc3VsdDogJHt2YWx1ZXMucmVzdWx0fVxcbkludGVycHJldCB0aGlzIHJlc3VsdCBpbiB0aGUgY29udGV4dCBvZiB0aGUgc2NlbmUuIFRoaXJkIHBlcnNvbiwgbmV1dHJhbCwgMi0zIGxpbmVzLmBcbiAgICAgICAgOiBgT3JhY2xlIHF1ZXN0aW9uOiAke3ZhbHVlcy5xdWVzdGlvbn1cXG5PcmFjbGUgbW9kZTogJHtjb250ZXh0LmZtLm9yYWNsZV9tb2RlID8/IFwieWVzLW5vXCJ9XFxuUnVuIHRoZSBvcmFjbGUgYW5kIGdpdmUgdGhlIHJlc3VsdCBwbHVzIGEgMS0yIGxpbmUgbmV1dHJhbCBpbnRlcnByZXRhdGlvbi5gO1xuICAgICAgYXdhaXQgcnVuR2VuZXJhdGlvbihcbiAgICAgICAgcGx1Z2luLFxuICAgICAgICBtZXNzYWdlLFxuICAgICAgICAodGV4dCwgZm0pID0+IHtcbiAgICAgICAgICBpZiAoIWlzTG9uZWxvZ0FjdGl2ZShwbHVnaW4uc2V0dGluZ3MsIGZtKSkge1xuICAgICAgICAgICAgcmV0dXJuIGA+IFtPcmFjbGVdIFE6ICR7dmFsdWVzLnF1ZXN0aW9ufVxcbj4gW0Fuc3dlcl0gJHt0ZXh0LnRyaW0oKS5yZXBsYWNlKC9cXG4vZywgXCJcXG4+IFwiKX1gO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaGFzUmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gZm9ybWF0QXNrT3JhY2xlKHZhbHVlcy5xdWVzdGlvbiwgdmFsdWVzLnJlc3VsdC50cmltKCksIHRleHQsIGxvbmVsb2dPcHRzKHBsdWdpbi5zZXR0aW5ncykpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBwYXJzZWQgPSBwYXJzZUxvbmVsb2dPcmFjbGVSZXNwb25zZSh0ZXh0KTtcbiAgICAgICAgICByZXR1cm4gZm9ybWF0QXNrT3JhY2xlKHZhbHVlcy5xdWVzdGlvbiwgcGFyc2VkLnJlc3VsdCwgcGFyc2VkLmludGVycHJldGF0aW9uLCBsb25lbG9nT3B0cyhwbHVnaW4uc2V0dGluZ3MpKTtcbiAgICAgICAgfVxuICAgICAgKTtcbiAgICB9XG4gIH0pO1xuXG4gIHBsdWdpbi5hZGRDb21tYW5kKHtcbiAgICBpZDogXCJzeWJ5bDppbnRlcnByZXQtb3JhY2xlXCIsXG4gICAgbmFtZTogXCJTeWJ5bDogSW50ZXJwcmV0IE9yYWNsZSBSZXN1bHRcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY29udGV4dCA9IGF3YWl0IHBsdWdpbi5nZXRBY3RpdmVOb3RlQ29udGV4dCgpO1xuICAgICAgaWYgKCFjb250ZXh0KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGxldCBzZWxlY3RlZCA9IGdldFNlbGVjdGlvbihjb250ZXh0LnZpZXcuZWRpdG9yKTtcbiAgICAgIGlmICghc2VsZWN0ZWQpIHtcbiAgICAgICAgY29uc3QgdmFsdWVzID0gYXdhaXQgb3BlbklucHV0TW9kYWwocGx1Z2luLmFwcCwgXCJJbnRlcnByZXQgT3JhY2xlIFJlc3VsdFwiLCBbXG4gICAgICAgICAgeyBrZXk6IFwib3JhY2xlXCIsIGxhYmVsOiBcIk9yYWNsZSByZXN1bHRcIiB9XG4gICAgICAgIF0pO1xuICAgICAgICBzZWxlY3RlZCA9IHZhbHVlcz8ub3JhY2xlPy50cmltKCkgPz8gXCJcIjtcbiAgICAgIH1cbiAgICAgIGlmICghc2VsZWN0ZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgYXdhaXQgcnVuR2VuZXJhdGlvbihcbiAgICAgICAgcGx1Z2luLFxuICAgICAgICBgSW50ZXJwcmV0IHRoaXMgb3JhY2xlIHJlc3VsdCBpbiB0aGUgY29udGV4dCBvZiB0aGUgY3VycmVudCBzY2VuZTogXCIke3NlbGVjdGVkfVwiXFxuTmV1dHJhbCwgdGhpcmQtcGVyc29uLCAyLTMgbGluZXMuIE5vIGRyYW1hdGljIGxhbmd1YWdlLmAsXG4gICAgICAgICh0ZXh0LCBmbSkgPT5cbiAgICAgICAgICBpc0xvbmVsb2dBY3RpdmUocGx1Z2luLnNldHRpbmdzLCBmbSlcbiAgICAgICAgICAgID8gZm9ybWF0SW50ZXJwcmV0T3JhY2xlKHNlbGVjdGVkLCB0ZXh0LCBsb25lbG9nT3B0cyhwbHVnaW4uc2V0dGluZ3MpKVxuICAgICAgICAgICAgOiBnZW5lcmljQmxvY2txdW90ZShcIkludGVycHJldGF0aW9uXCIsIHRleHQpLFxuICAgICAgICA1MTIsXG4gICAgICAgIFwiYmVsb3ctc2VsZWN0aW9uXCJcbiAgICAgICk7XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6c3VnZ2VzdC1jb25zZXF1ZW5jZVwiLFxuICAgIG5hbWU6IFwiU3lieWw6IFN1Z2dlc3QgQ29uc2VxdWVuY2VcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgYXdhaXQgcnVuR2VuZXJhdGlvbihcbiAgICAgICAgcGx1Z2luLFxuICAgICAgICBcIkJhc2VkIG9uIHRoZSBjdXJyZW50IHNjZW5lIGNvbnRleHQsIHN1Z2dlc3QgMS0yIHBvc3NpYmxlIGNvbnNlcXVlbmNlcyBvciBjb21wbGljYXRpb25zLiBQcmVzZW50IHRoZW0gYXMgbmV1dHJhbCBvcHRpb25zLCBub3QgYXMgbmFycmF0aXZlIG91dGNvbWVzLiBEbyBub3QgY2hvb3NlIGJldHdlZW4gdGhlbS5cIixcbiAgICAgICAgKHRleHQsIGZtKSA9PlxuICAgICAgICAgIGlzTG9uZWxvZ0FjdGl2ZShwbHVnaW4uc2V0dGluZ3MsIGZtKVxuICAgICAgICAgICAgPyBmb3JtYXRTdWdnZXN0Q29uc2VxdWVuY2UodGV4dCwgbG9uZWxvZ09wdHMocGx1Z2luLnNldHRpbmdzKSlcbiAgICAgICAgICAgIDogZ2VuZXJpY0Jsb2NrcXVvdGUoXCJPcHRpb25zXCIsIHRleHQpXG4gICAgICApO1xuICAgIH1cbiAgfSk7XG5cbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOmV4cGFuZC1zY2VuZVwiLFxuICAgIG5hbWU6IFwiU3lieWw6IEV4cGFuZCBTY2VuZSBpbnRvIFByb3NlXCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGF3YWl0IHJ1bkdlbmVyYXRpb24oXG4gICAgICAgIHBsdWdpbixcbiAgICAgICAgXCJFeHBhbmQgdGhlIGN1cnJlbnQgc2NlbmUgaW50byBhIHByb3NlIHBhc3NhZ2UuIFRoaXJkIHBlcnNvbiwgcGFzdCB0ZW5zZSwgMTAwLTE1MCB3b3Jkcy4gTm8gZGlhbG9ndWUuIERvIG5vdCBkZXNjcmliZSB0aGUgUEMncyBpbnRlcm5hbCB0aG91Z2h0cyBvciBkZWNpc2lvbnMuIFN0YXkgc3RyaWN0bHkgd2l0aGluIHRoZSBlc3RhYmxpc2hlZCBzY2VuZSBjb250ZXh0LlwiLFxuICAgICAgICAodGV4dCwgZm0pID0+XG4gICAgICAgICAgaXNMb25lbG9nQWN0aXZlKHBsdWdpbi5zZXR0aW5ncywgZm0pXG4gICAgICAgICAgICA/IGZvcm1hdEV4cGFuZFNjZW5lKHRleHQsIGxvbmVsb2dPcHRzKHBsdWdpbi5zZXR0aW5ncykpXG4gICAgICAgICAgICA6IGAtLS1cXG4+IFtQcm9zZV0gJHt0ZXh0LnRyaW0oKS5yZXBsYWNlKC9cXG4vZywgXCJcXG4+IFwiKX1cXG4tLS1gLFxuICAgICAgICAzMDBcbiAgICAgICk7XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6dXBsb2FkLXNvdXJjZVwiLFxuICAgIG5hbWU6IFwiU3lieWw6IFVwbG9hZCBTb3VyY2UgRmlsZVwiLFxuICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjb250ZXh0ID0gYXdhaXQgcGx1Z2luLmdldEFjdGl2ZU5vdGVDb250ZXh0KCk7XG4gICAgICBpZiAoIWNvbnRleHQ/LnZpZXcuZmlsZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBhZGRTb3VyY2VUb05vdGUocGx1Z2luLCBjb250ZXh0LnZpZXcuZmlsZSwgY29udGV4dC5mbSk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBuZXcgTm90aWNlKGBTeWJ5bCBlcnJvcjogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6bWFuYWdlLXNvdXJjZXNcIixcbiAgICBuYW1lOiBcIlN5YnlsOiBNYW5hZ2UgU291cmNlc1wiLFxuICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICBhd2FpdCBtYW5hZ2VTb3VyY2VzKHBsdWdpbik7XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6bG9uZWxvZy1uZXctc2NlbmVcIixcbiAgICBuYW1lOiBcIlN5YnlsOiBOZXcgU2NlbmVcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY29udGV4dCA9IGF3YWl0IHBsdWdpbi5nZXRBY3RpdmVOb3RlQ29udGV4dCgpO1xuICAgICAgaWYgKCFjb250ZXh0Py52aWV3LmZpbGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKCFpc0xvbmVsb2dBY3RpdmUocGx1Z2luLnNldHRpbmdzLCBjb250ZXh0LmZtKSkge1xuICAgICAgICBuZXcgTm90aWNlKFwiTG9uZWxvZyBtb2RlIGlzIG5vdCBlbmFibGVkIGZvciB0aGlzIG5vdGUuXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCB2YWx1ZXMgPSBhd2FpdCBvcGVuSW5wdXRNb2RhbChwbHVnaW4uYXBwLCBcIk5ldyBTY2VuZVwiLCBbXG4gICAgICAgIHsga2V5OiBcInNjZW5lRGVzY1wiLCBsYWJlbDogXCJTY2VuZSBkZXNjcmlwdGlvblwiLCBwbGFjZWhvbGRlcjogXCJEYXJrIGFsbGV5LCBtaWRuaWdodFwiIH1cbiAgICAgIF0pO1xuICAgICAgaWYgKCF2YWx1ZXM/LnNjZW5lRGVzYykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCBjb3VudGVyID0gY29udGV4dC5mbS5zY2VuZV9jb3VudGVyID8/IDE7XG4gICAgICBhd2FpdCBydW5HZW5lcmF0aW9uKFxuICAgICAgICBwbHVnaW4sXG4gICAgICAgIGBTVEFSVCBTQ0VORS4gR2VuZXJhdGUgb25seTogMi0zIGxpbmVzIG9mIHRoaXJkLXBlcnNvbiBwYXN0LXRlbnNlIHByb3NlIGRlc2NyaWJpbmcgdGhlIGF0bW9zcGhlcmUgYW5kIHNldHRpbmcgb2Y6IFwiJHt2YWx1ZXMuc2NlbmVEZXNjfVwiLiBObyBkaWFsb2d1ZS4gTm8gUEMgYWN0aW9ucy4gTm8gYWRkaXRpb25hbCBjb21tZW50YXJ5LmAsXG4gICAgICAgICh0ZXh0KSA9PiBmb3JtYXRTdGFydFNjZW5lKHRleHQsIGBTJHtjb3VudGVyfWAsIHZhbHVlcy5zY2VuZURlc2MsIGxvbmVsb2dPcHRzKHBsdWdpbi5zZXR0aW5ncykpXG4gICAgICApO1xuICAgICAgaWYgKHBsdWdpbi5zZXR0aW5ncy5sb25lbG9nQXV0b0luY1NjZW5lKSB7XG4gICAgICAgIGF3YWl0IHdyaXRlRnJvbnRNYXR0ZXJLZXkocGx1Z2luLmFwcCwgY29udGV4dC52aWV3LmZpbGUsIFwic2NlbmVfY291bnRlclwiLCBjb3VudGVyICsgMSk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6bG9uZWxvZy1wYXJzZS1jb250ZXh0XCIsXG4gICAgbmFtZTogXCJTeWJ5bDogVXBkYXRlIFNjZW5lIENvbnRleHQgZnJvbSBMb2dcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY29udGV4dCA9IGF3YWl0IHBsdWdpbi5nZXRBY3RpdmVOb3RlQ29udGV4dCgpO1xuICAgICAgaWYgKCFjb250ZXh0Py52aWV3LmZpbGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKCFpc0xvbmVsb2dBY3RpdmUocGx1Z2luLnNldHRpbmdzLCBjb250ZXh0LmZtKSkge1xuICAgICAgICBuZXcgTm90aWNlKFwiTG9uZWxvZyBtb2RlIGlzIG5vdCBlbmFibGVkIGZvciB0aGlzIG5vdGUuXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCBwYXJzZWQgPSBwYXJzZUxvbmVsb2dDb250ZXh0KGNvbnRleHQubm90ZUJvZHksIHBsdWdpbi5zZXR0aW5ncy5sb25lbG9nQ29udGV4dERlcHRoKTtcbiAgICAgIGF3YWl0IHdyaXRlRnJvbnRNYXR0ZXJLZXkocGx1Z2luLmFwcCwgY29udGV4dC52aWV3LmZpbGUsIFwic2NlbmVfY29udGV4dFwiLCBzZXJpYWxpemVDb250ZXh0KHBhcnNlZCkpO1xuICAgICAgbmV3IE5vdGljZShcIlNjZW5lIGNvbnRleHQgdXBkYXRlZCBmcm9tIGxvZy5cIik7XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6bG9uZWxvZy1zZXNzaW9uLWJyZWFrXCIsXG4gICAgbmFtZTogXCJTeWJ5bDogTmV3IFNlc3Npb24gSGVhZGVyXCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGNvbnRleHQgPSBhd2FpdCBwbHVnaW4uZ2V0QWN0aXZlTm90ZUNvbnRleHQoKTtcbiAgICAgIGlmICghY29udGV4dD8udmlldy5maWxlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICghaXNMb25lbG9nQWN0aXZlKHBsdWdpbi5zZXR0aW5ncywgY29udGV4dC5mbSkpIHtcbiAgICAgICAgbmV3IE5vdGljZShcIkxvbmVsb2cgbW9kZSBpcyBub3QgZW5hYmxlZCBmb3IgdGhpcyBub3RlLlwiKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgdmFsdWVzID0gYXdhaXQgb3BlbklucHV0TW9kYWwocGx1Z2luLmFwcCwgXCJOZXcgU2Vzc2lvbiBIZWFkZXJcIiwgW1xuICAgICAgICB7IGtleTogXCJkYXRlXCIsIGxhYmVsOiBcIkRhdGVcIiwgdmFsdWU6IHRvZGF5SXNvRGF0ZSgpIH0sXG4gICAgICAgIHsga2V5OiBcImR1cmF0aW9uXCIsIGxhYmVsOiBcIkR1cmF0aW9uXCIsIHBsYWNlaG9sZGVyOiBcIjFoMzBcIiB9LFxuICAgICAgICB7IGtleTogXCJyZWNhcFwiLCBsYWJlbDogXCJSZWNhcFwiLCBvcHRpb25hbDogdHJ1ZSB9XG4gICAgICBdKTtcbiAgICAgIGlmICghdmFsdWVzPy5kYXRlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHNlc3Npb25OdW1iZXIgPSBjb250ZXh0LmZtLnNlc3Npb25fbnVtYmVyID8/IDE7XG4gICAgICBjb25zdCBibG9jayA9IGAjIyBTZXNzaW9uICR7c2Vzc2lvbk51bWJlcn1cXG4qRGF0ZTogJHt2YWx1ZXMuZGF0ZX0gfCBEdXJhdGlvbjogJHt2YWx1ZXMuZHVyYXRpb24gfHwgXCItXCJ9KlxcblxcbiR7dmFsdWVzLnJlY2FwID8gYCoqUmVjYXA6KiogJHt2YWx1ZXMucmVjYXB9XFxuXFxuYCA6IFwiXCJ9YDtcbiAgICAgIHBsdWdpbi5pbnNlcnRUZXh0KGNvbnRleHQudmlldywgYmxvY2ssIFwiY3Vyc29yXCIpO1xuICAgICAgYXdhaXQgd3JpdGVGcm9udE1hdHRlcktleShwbHVnaW4uYXBwLCBjb250ZXh0LnZpZXcuZmlsZSwgXCJzZXNzaW9uX251bWJlclwiLCBzZXNzaW9uTnVtYmVyICsgMSk7XG4gICAgfVxuICB9KTtcbn1cbiIsICJleHBvcnQgaW50ZXJmYWNlIExvbmVsb2dGb3JtYXRPcHRpb25zIHtcbiAgd3JhcEluQ29kZUJsb2NrOiBib29sZWFuO1xuICBzY2VuZUlkPzogc3RyaW5nO1xufVxuXG5mdW5jdGlvbiBmZW5jZShjb250ZW50OiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYFxcYFxcYFxcYFxcbiR7Y29udGVudH1cXG5cXGBcXGBcXGBgO1xufVxuXG5mdW5jdGlvbiBjbGVhbkFpVGV4dCh0ZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gdGV4dC5yZXBsYWNlKC9ePlxccyovZ20sIFwiXCIpLnRyaW0oKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdFN0YXJ0U2NlbmUoXG4gIGFpVGV4dDogc3RyaW5nLFxuICBzY2VuZUlkOiBzdHJpbmcsXG4gIHNjZW5lRGVzYzogc3RyaW5nLFxuICBfb3B0czogTG9uZWxvZ0Zvcm1hdE9wdGlvbnNcbik6IHN0cmluZyB7XG4gIGNvbnN0IGhlYWRlciA9IGAjIyMgJHtzY2VuZUlkfSAqJHtzY2VuZURlc2N9KmA7XG4gIGNvbnN0IGJvZHkgPSBjbGVhbkFpVGV4dChhaVRleHQpO1xuICByZXR1cm4gYCR7aGVhZGVyfVxcblxcbiR7Ym9keX1gO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0RGVjbGFyZUFjdGlvbihcbiAgYWN0aW9uOiBzdHJpbmcsXG4gIHJvbGw6IHN0cmluZyxcbiAgYWlDb25zZXF1ZW5jZTogc3RyaW5nLFxuICBvcHRzOiBMb25lbG9nRm9ybWF0T3B0aW9uc1xuKTogc3RyaW5nIHtcbiAgY29uc3QgY29uc2VxdWVuY2UgPSBjbGVhbkFpVGV4dChhaUNvbnNlcXVlbmNlKVxuICAgIC5zcGxpdChcIlxcblwiKVxuICAgIC5maWx0ZXIoQm9vbGVhbilcbiAgICAubWFwKChsaW5lKSA9PiAobGluZS5zdGFydHNXaXRoKFwiPT5cIikgPyBsaW5lIDogYD0+ICR7bGluZX1gKSlcbiAgICAuam9pbihcIlxcblwiKTtcbiAgY29uc3Qgbm90YXRpb24gPSBgQCAke2FjdGlvbn1cXG5kOiAke3JvbGx9XFxuJHtjb25zZXF1ZW5jZX1gO1xuICByZXR1cm4gb3B0cy53cmFwSW5Db2RlQmxvY2sgPyBmZW5jZShub3RhdGlvbikgOiBub3RhdGlvbjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdEFza09yYWNsZShcbiAgcXVlc3Rpb246IHN0cmluZyxcbiAgb3JhY2xlUmVzdWx0OiBzdHJpbmcsXG4gIGFpSW50ZXJwcmV0YXRpb246IHN0cmluZyxcbiAgb3B0czogTG9uZWxvZ0Zvcm1hdE9wdGlvbnNcbik6IHN0cmluZyB7XG4gIGNvbnN0IGludGVycHJldGF0aW9uID0gY2xlYW5BaVRleHQoYWlJbnRlcnByZXRhdGlvbilcbiAgICAuc3BsaXQoXCJcXG5cIilcbiAgICAuZmlsdGVyKEJvb2xlYW4pXG4gICAgLm1hcCgobGluZSkgPT4gKGxpbmUuc3RhcnRzV2l0aChcIj0+XCIpID8gbGluZSA6IGA9PiAke2xpbmV9YCkpXG4gICAgLmpvaW4oXCJcXG5cIik7XG4gIGNvbnN0IG5vdGF0aW9uID0gYD8gJHtxdWVzdGlvbn1cXG4tPiAke29yYWNsZVJlc3VsdH1cXG4ke2ludGVycHJldGF0aW9ufWA7XG4gIHJldHVybiBvcHRzLndyYXBJbkNvZGVCbG9jayA/IGZlbmNlKG5vdGF0aW9uKSA6IG5vdGF0aW9uO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0SW50ZXJwcmV0T3JhY2xlKFxuICBvcmFjbGVUZXh0OiBzdHJpbmcsXG4gIGFpSW50ZXJwcmV0YXRpb246IHN0cmluZyxcbiAgb3B0czogTG9uZWxvZ0Zvcm1hdE9wdGlvbnNcbik6IHN0cmluZyB7XG4gIGNvbnN0IGludGVycHJldGF0aW9uID0gY2xlYW5BaVRleHQoYWlJbnRlcnByZXRhdGlvbilcbiAgICAuc3BsaXQoXCJcXG5cIilcbiAgICAuZmlsdGVyKEJvb2xlYW4pXG4gICAgLm1hcCgobGluZSkgPT4gKGxpbmUuc3RhcnRzV2l0aChcIj0+XCIpID8gbGluZSA6IGA9PiAke2xpbmV9YCkpXG4gICAgLmpvaW4oXCJcXG5cIik7XG4gIGNvbnN0IG5vdGF0aW9uID0gYC0+ICR7b3JhY2xlVGV4dH1cXG4ke2ludGVycHJldGF0aW9ufWA7XG4gIHJldHVybiBvcHRzLndyYXBJbkNvZGVCbG9jayA/IGZlbmNlKG5vdGF0aW9uKSA6IG5vdGF0aW9uO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0U3VnZ2VzdENvbnNlcXVlbmNlKGFpT3B0aW9uczogc3RyaW5nLCBvcHRzOiBMb25lbG9nRm9ybWF0T3B0aW9ucyk6IHN0cmluZyB7XG4gIGNvbnN0IG9wdGlvbnMgPSBjbGVhbkFpVGV4dChhaU9wdGlvbnMpXG4gICAgLnNwbGl0KFwiXFxuXCIpXG4gICAgLmZpbHRlcigobGluZSkgPT4gbGluZS50cmltKCkubGVuZ3RoID4gMClcbiAgICAubWFwKChsaW5lKSA9PiAobGluZS5zdGFydHNXaXRoKFwiPT5cIikgPyBsaW5lIDogYD0+ICR7bGluZX1gKSlcbiAgICAuam9pbihcIlxcblwiKTtcbiAgcmV0dXJuIG9wdHMud3JhcEluQ29kZUJsb2NrID8gZmVuY2Uob3B0aW9ucykgOiBvcHRpb25zO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0RXhwYW5kU2NlbmUoYWlQcm9zZTogc3RyaW5nLCBfb3B0czogTG9uZWxvZ0Zvcm1hdE9wdGlvbnMpOiBzdHJpbmcge1xuICByZXR1cm4gYFxcXFwtLS1cXG4ke2NsZWFuQWlUZXh0KGFpUHJvc2UpfVxcbi0tLVxcXFxgO1xufVxuIiwgImltcG9ydCB7IEFwcCwgTW9kYWwsIE5vdGljZSwgU2V0dGluZywgVEZpbGUgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IGRlc2NyaWJlU291cmNlUmVmLCBsaXN0VmF1bHRDYW5kaWRhdGVGaWxlcyB9IGZyb20gXCIuL3NvdXJjZVV0aWxzXCI7XG5pbXBvcnQgeyBNb2RhbEZpZWxkLCBTb3VyY2VSZWYsIFVwbG9hZGVkRmlsZUluZm8gfSBmcm9tIFwiLi90eXBlc1wiO1xuXG5leHBvcnQgY2xhc3MgSW5wdXRNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgcHJpdmF0ZSByZWFkb25seSB2YWx1ZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG5cbiAgY29uc3RydWN0b3IoXG4gICAgYXBwOiBBcHAsXG4gICAgcHJpdmF0ZSByZWFkb25seSB0aXRsZTogc3RyaW5nLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgZmllbGRzOiBNb2RhbEZpZWxkW10sXG4gICAgcHJpdmF0ZSByZWFkb25seSBvblN1Ym1pdDogKHZhbHVlczogUmVjb3JkPHN0cmluZywgc3RyaW5nPikgPT4gdm9pZFxuICApIHtcbiAgICBzdXBlcihhcHApO1xuICAgIHRoaXMudmFsdWVzID0gZmllbGRzLnJlZHVjZTxSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+PigoYWNjLCBmaWVsZCkgPT4ge1xuICAgICAgYWNjW2ZpZWxkLmtleV0gPSBmaWVsZC52YWx1ZSA/PyBcIlwiO1xuICAgICAgcmV0dXJuIGFjYztcbiAgICB9LCB7fSk7XG4gIH1cblxuICBvbk9wZW4oKTogdm9pZCB7XG4gICAgdGhpcy50aXRsZUVsLnNldFRleHQodGhpcy50aXRsZSk7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICBmb3IgKGNvbnN0IGZpZWxkIG9mIHRoaXMuZmllbGRzKSB7XG4gICAgICBuZXcgU2V0dGluZyh0aGlzLmNvbnRlbnRFbClcbiAgICAgICAgLnNldE5hbWUoZmllbGQubGFiZWwpXG4gICAgICAgIC5zZXREZXNjKGZpZWxkLm9wdGlvbmFsID8gXCJPcHRpb25hbFwiIDogXCJcIilcbiAgICAgICAgLmFkZFRleHQoKHRleHQpID0+IHtcbiAgICAgICAgICB0ZXh0LnNldFBsYWNlaG9sZGVyKGZpZWxkLnBsYWNlaG9sZGVyID8/IFwiXCIpO1xuICAgICAgICAgIHRleHQuc2V0VmFsdWUodGhpcy52YWx1ZXNbZmllbGQua2V5XSA/PyBcIlwiKTtcbiAgICAgICAgICB0ZXh0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgdGhpcy52YWx1ZXNbZmllbGQua2V5XSA9IHZhbHVlO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgbmV3IFNldHRpbmcodGhpcy5jb250ZW50RWwpLmFkZEJ1dHRvbigoYnV0dG9uKSA9PiB7XG4gICAgICBidXR0b24uc2V0QnV0dG9uVGV4dChcIkNvbmZpcm1cIikuc2V0Q3RhKCkub25DbGljaygoKSA9PiB7XG4gICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgdGhpcy5vblN1Ym1pdCh0aGlzLnZhbHVlcyk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIG9uQ2xvc2UoKTogdm9pZCB7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gb3BlbklucHV0TW9kYWwoXG4gIGFwcDogQXBwLFxuICB0aXRsZTogc3RyaW5nLFxuICBmaWVsZHM6IE1vZGFsRmllbGRbXVxuKTogUHJvbWlzZTxSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+IHwgbnVsbD4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICBsZXQgc2V0dGxlZCA9IGZhbHNlO1xuICAgIGNvbnN0IG1vZGFsID0gbmV3IElucHV0TW9kYWwoYXBwLCB0aXRsZSwgZmllbGRzLCAodmFsdWVzKSA9PiB7XG4gICAgICBzZXR0bGVkID0gdHJ1ZTtcbiAgICAgIHJlc29sdmUodmFsdWVzKTtcbiAgICB9KTtcbiAgICBjb25zdCBvcmlnaW5hbENsb3NlID0gbW9kYWwub25DbG9zZS5iaW5kKG1vZGFsKTtcbiAgICBtb2RhbC5vbkNsb3NlID0gKCkgPT4ge1xuICAgICAgb3JpZ2luYWxDbG9zZSgpO1xuICAgICAgaWYgKCFzZXR0bGVkKSB7XG4gICAgICAgIHJlc29sdmUobnVsbCk7XG4gICAgICB9XG4gICAgfTtcbiAgICBtb2RhbC5vcGVuKCk7XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGlja0xvY2FsRmlsZSgpOiBQcm9taXNlPEZpbGUgfCBudWxsPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIGNvbnN0IGlucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlucHV0XCIpO1xuICAgIGlucHV0LnR5cGUgPSBcImZpbGVcIjtcbiAgICBpbnB1dC5hY2NlcHQgPSBcIi5wZGYsLnR4dCwubWQsLm1hcmtkb3duXCI7XG4gICAgaW5wdXQub25jaGFuZ2UgPSAoKSA9PiByZXNvbHZlKGlucHV0LmZpbGVzPy5bMF0gPz8gbnVsbCk7XG4gICAgaW5wdXQuY2xpY2soKTtcbiAgfSk7XG59XG5cbmV4cG9ydCBjbGFzcyBWYXVsdEZpbGVQaWNrZXJNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgcHJpdmF0ZSByZWFkb25seSBmaWxlczogVEZpbGVbXTtcblxuICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcHJpdmF0ZSByZWFkb25seSB0aXRsZTogc3RyaW5nLCBwcml2YXRlIHJlYWRvbmx5IG9uUGljazogKGZpbGU6IFRGaWxlKSA9PiB2b2lkKSB7XG4gICAgc3VwZXIoYXBwKTtcbiAgICB0aGlzLmZpbGVzID0gbGlzdFZhdWx0Q2FuZGlkYXRlRmlsZXMoYXBwKTtcbiAgfVxuXG4gIG9uT3BlbigpOiB2b2lkIHtcbiAgICB0aGlzLnRpdGxlRWwuc2V0VGV4dCh0aGlzLnRpdGxlKTtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIGlmICghdGhpcy5maWxlcy5sZW5ndGgpIHtcbiAgICAgIHRoaXMuY29udGVudEVsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IFwiTm8gUERGIG9yIHRleHQgZmlsZXMgZm91bmQgaW4gdGhlIHZhdWx0LlwiIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmZpbGVzLmZvckVhY2goKGZpbGUpID0+IHtcbiAgICAgIG5ldyBTZXR0aW5nKHRoaXMuY29udGVudEVsKVxuICAgICAgICAuc2V0TmFtZShmaWxlLnBhdGgpXG4gICAgICAgIC5zZXREZXNjKGZpbGUuZXh0ZW5zaW9uLnRvTG93ZXJDYXNlKCkpXG4gICAgICAgIC5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xuICAgICAgICAgIGJ1dHRvbi5zZXRCdXR0b25UZXh0KFwiU2VsZWN0XCIpLnNldEN0YSgpLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgdGhpcy5vblBpY2soZmlsZSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgb25DbG9zZSgpOiB2b2lkIHtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwaWNrVmF1bHRGaWxlKGFwcDogQXBwLCB0aXRsZTogc3RyaW5nKTogUHJvbWlzZTxURmlsZSB8IG51bGw+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgbGV0IHNldHRsZWQgPSBmYWxzZTtcbiAgICBjb25zdCBtb2RhbCA9IG5ldyBWYXVsdEZpbGVQaWNrZXJNb2RhbChhcHAsIHRpdGxlLCAoZmlsZSkgPT4ge1xuICAgICAgc2V0dGxlZCA9IHRydWU7XG4gICAgICByZXNvbHZlKGZpbGUpO1xuICAgIH0pO1xuICAgIGNvbnN0IG9yaWdpbmFsQ2xvc2UgPSBtb2RhbC5vbkNsb3NlLmJpbmQobW9kYWwpO1xuICAgIG1vZGFsLm9uQ2xvc2UgPSAoKSA9PiB7XG4gICAgICBvcmlnaW5hbENsb3NlKCk7XG4gICAgICBpZiAoIXNldHRsZWQpIHtcbiAgICAgICAgcmVzb2x2ZShudWxsKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIG1vZGFsLm9wZW4oKTtcbiAgfSk7XG59XG5cbmV4cG9ydCBjbGFzcyBNYW5hZ2VTb3VyY2VzTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIGFwcDogQXBwLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgc291cmNlczogU291cmNlUmVmW10sXG4gICAgcHJpdmF0ZSByZWFkb25seSBvblJlbW92ZUZyb21Ob3RlOiAocmVmOiBTb3VyY2VSZWYpID0+IFByb21pc2U8dm9pZD4sXG4gICAgcHJpdmF0ZSByZWFkb25seSBvbkRlbGV0ZUZyb21Qcm92aWRlcjogKHJlZjogU291cmNlUmVmKSA9PiBQcm9taXNlPHZvaWQ+LFxuICAgIHByaXZhdGUgcmVhZG9ubHkgb25BZGRTb3VyY2U6ICgpID0+IFByb21pc2U8dm9pZD5cbiAgKSB7XG4gICAgc3VwZXIoYXBwKTtcbiAgfVxuXG4gIG9uT3BlbigpOiB2b2lkIHtcbiAgICB0aGlzLnRpdGxlRWwuc2V0VGV4dChcIk1hbmFnZSBTb3VyY2VzXCIpO1xuICAgIHRoaXMucmVuZGVyKCk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlcigpOiB2b2lkIHtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIG5ldyBTZXR0aW5nKHRoaXMuY29udGVudEVsKS5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xuICAgICAgYnV0dG9uLnNldEJ1dHRvblRleHQoXCJBZGQgc291cmNlXCIpLnNldEN0YSgpLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xuICAgICAgICBhd2FpdCB0aGlzLm9uQWRkU291cmNlKCk7XG4gICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIGlmICghdGhpcy5zb3VyY2VzLmxlbmd0aCkge1xuICAgICAgdGhpcy5jb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogXCJObyBzb3VyY2VzIGFyZSBhdHRhY2hlZCB0byB0aGlzIG5vdGUuXCIgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuc291cmNlcy5mb3JFYWNoKChzb3VyY2UpID0+IHtcbiAgICAgIG5ldyBTZXR0aW5nKHRoaXMuY29udGVudEVsKVxuICAgICAgICAuc2V0TmFtZShzb3VyY2UubGFiZWwpXG4gICAgICAgIC5zZXREZXNjKGAke3NvdXJjZS5wcm92aWRlcn0gfCAke2Rlc2NyaWJlU291cmNlUmVmKHNvdXJjZSl9JHtzb3VyY2UuZXhwaXJlc0F0ID8gYCB8IEV4cGlyZXMgJHtzb3VyY2UuZXhwaXJlc0F0fWAgOiBcIlwifWApXG4gICAgICAgIC5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xuICAgICAgICAgIGJ1dHRvbi5zZXRCdXR0b25UZXh0KFwiUmVtb3ZlIGZyb20gbm90ZVwiKS5vbkNsaWNrKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMub25SZW1vdmVGcm9tTm90ZShzb3VyY2UpO1xuICAgICAgICAgICAgbmV3IE5vdGljZShgUmVtb3ZlZCAnJHtzb3VyY2UubGFiZWx9JyBmcm9tIG5vdGUuYCk7XG4gICAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgICAgIC5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xuICAgICAgICAgIGJ1dHRvbi5zZXRCdXR0b25UZXh0KFwiRGVsZXRlIGZyb20gcHJvdmlkZXJcIik7XG4gICAgICAgICAgaWYgKCEoc291cmNlLmZpbGVfdXJpIHx8IHNvdXJjZS5maWxlX2lkKSkge1xuICAgICAgICAgICAgYnV0dG9uLnNldERpc2FibGVkKHRydWUpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBidXR0b24ub25DbGljayhhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLm9uRGVsZXRlRnJvbVByb3ZpZGVyKHNvdXJjZSk7XG4gICAgICAgICAgICBuZXcgTm90aWNlKGBEZWxldGVkICcke3NvdXJjZS5sYWJlbH0nIGZyb20gcHJvdmlkZXIuYCk7XG4gICAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgb25DbG9zZSgpOiB2b2lkIHtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBVcGxvYWRlZEZpbGVzTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gIHByaXZhdGUgZmlsZXNTdGF0ZTogVXBsb2FkZWRGaWxlSW5mb1tdO1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIGFwcDogQXBwLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgdGl0bGU6IHN0cmluZyxcbiAgICBmaWxlczogVXBsb2FkZWRGaWxlSW5mb1tdLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgb25SZWZyZXNoOiAoKSA9PiBQcm9taXNlPFVwbG9hZGVkRmlsZUluZm9bXT4sXG4gICAgcHJpdmF0ZSByZWFkb25seSBvbkRlbGV0ZTogKGZpbGU6IFVwbG9hZGVkRmlsZUluZm8pID0+IFByb21pc2U8dm9pZD5cbiAgKSB7XG4gICAgc3VwZXIoYXBwKTtcbiAgICB0aGlzLmZpbGVzU3RhdGUgPSBmaWxlcztcbiAgfVxuXG4gIG9uT3BlbigpOiB2b2lkIHtcbiAgICB0aGlzLnRpdGxlRWwuc2V0VGV4dCh0aGlzLnRpdGxlKTtcbiAgICB2b2lkIHRoaXMucmVuZGVyKCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJlbmRlcigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIG5ldyBTZXR0aW5nKHRoaXMuY29udGVudEVsKS5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xuICAgICAgYnV0dG9uLnNldEJ1dHRvblRleHQoXCJSZWZyZXNoXCIpLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xuICAgICAgICB0aGlzLmZpbGVzU3RhdGUgPSBhd2FpdCB0aGlzLm9uUmVmcmVzaCgpO1xuICAgICAgICBhd2FpdCB0aGlzLnJlbmRlcigpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gICAgaWYgKCF0aGlzLmZpbGVzU3RhdGUubGVuZ3RoKSB7XG4gICAgICB0aGlzLmNvbnRlbnRFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIk5vIHVwbG9hZGVkIGZpbGVzIGZvdW5kLlwiIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmZpbGVzU3RhdGUuZm9yRWFjaCgoZmlsZSkgPT4ge1xuICAgICAgbmV3IFNldHRpbmcodGhpcy5jb250ZW50RWwpXG4gICAgICAgIC5zZXROYW1lKGZpbGUubGFiZWwpXG4gICAgICAgIC5zZXREZXNjKGAke2ZpbGUubWltZV90eXBlfSR7ZmlsZS5leHBpcmVzQXQgPyBgIHwgRXhwaXJlcyAke2ZpbGUuZXhwaXJlc0F0fWAgOiBcIlwifWApXG4gICAgICAgIC5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xuICAgICAgICAgIGJ1dHRvbi5zZXRCdXR0b25UZXh0KFwiQ29weSBVUklcIikub25DbGljayhhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICBhd2FpdCBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dChmaWxlLmZpbGVfdXJpID8/IGZpbGUuZmlsZV9pZCA/PyBcIlwiKTtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJJZGVudGlmaWVyIGNvcGllZCB0byBjbGlwYm9hcmQuXCIpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgICAgICAuYWRkQnV0dG9uKChidXR0b24pID0+IHtcbiAgICAgICAgICBidXR0b24uc2V0QnV0dG9uVGV4dChcIkRlbGV0ZVwiKS5vbkNsaWNrKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMub25EZWxldGUoZmlsZSk7XG4gICAgICAgICAgICB0aGlzLmZpbGVzU3RhdGUgPSBhd2FpdCB0aGlzLm9uUmVmcmVzaCgpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBvbkNsb3NlKCk6IHZvaWQge1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gIH1cbn1cbiIsICJpbXBvcnQgeyBBcHAsIE5vdGljZSwgUGx1Z2luU2V0dGluZ1RhYiwgU2V0dGluZyB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHR5cGUgU3lieWxQbHVnaW4gZnJvbSBcIi4vbWFpblwiO1xuaW1wb3J0IHsgVXBsb2FkZWRGaWxlc01vZGFsIH0gZnJvbSBcIi4vbW9kYWxzXCI7XG5pbXBvcnQgeyBnZXRQcm92aWRlciB9IGZyb20gXCIuL3Byb3ZpZGVyc1wiO1xuaW1wb3J0IHsgR2VtaW5pUHJvdmlkZXIgfSBmcm9tIFwiLi9wcm92aWRlcnMvZ2VtaW5pXCI7XG5pbXBvcnQgeyBPbGxhbWFQcm92aWRlciB9IGZyb20gXCIuL3Byb3ZpZGVycy9vbGxhbWFcIjtcbmltcG9ydCB7IFByb3ZpZGVySUQsIFN5YnlsU2V0dGluZ3MsIFZhbGlkYXRpb25TdGF0ZSB9IGZyb20gXCIuL3R5cGVzXCI7XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX1NFVFRJTkdTOiBTeWJ5bFNldHRpbmdzID0ge1xuICBhY3RpdmVQcm92aWRlcjogXCJnZW1pbmlcIixcbiAgcHJvdmlkZXJzOiB7XG4gICAgZ2VtaW5pOiB7IGFwaUtleTogXCJcIiwgZGVmYXVsdE1vZGVsOiBcImdlbWluaS0yLjAtZmxhc2hcIiB9LFxuICAgIG9wZW5haTogeyBhcGlLZXk6IFwiXCIsIGRlZmF1bHRNb2RlbDogXCJncHQtNG9cIiwgYmFzZVVybDogXCJodHRwczovL2FwaS5vcGVuYWkuY29tL3YxXCIgfSxcbiAgICBhbnRocm9waWM6IHsgYXBpS2V5OiBcIlwiLCBkZWZhdWx0TW9kZWw6IFwiY2xhdWRlLTMtNS1zb25uZXQtMjAyNDEwMjJcIiB9LFxuICAgIG9sbGFtYTogeyBiYXNlVXJsOiBcImh0dHA6Ly9sb2NhbGhvc3Q6MTE0MzRcIiwgZGVmYXVsdE1vZGVsOiBcImxsYW1hMy4yXCIgfVxuICB9LFxuICBpbnNlcnRpb25Nb2RlOiBcImN1cnNvclwiLFxuICBzaG93VG9rZW5Db3VudDogZmFsc2UsXG4gIGRlZmF1bHRUZW1wZXJhdHVyZTogMC43LFxuICBsb25lbG9nTW9kZTogZmFsc2UsXG4gIGxvbmVsb2dDb250ZXh0RGVwdGg6IDYwLFxuICBsb25lbG9nV3JhcENvZGVCbG9jazogdHJ1ZSxcbiAgbG9uZWxvZ0F1dG9JbmNTY2VuZTogdHJ1ZVxufTtcblxuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZVNldHRpbmdzKHJhdzogUGFydGlhbDxTeWJ5bFNldHRpbmdzPiB8IG51bGwgfCB1bmRlZmluZWQpOiBTeWJ5bFNldHRpbmdzIHtcbiAgcmV0dXJuIHtcbiAgICAuLi5ERUZBVUxUX1NFVFRJTkdTLFxuICAgIC4uLihyYXcgPz8ge30pLFxuICAgIHByb3ZpZGVyczoge1xuICAgICAgZ2VtaW5pOiB7IC4uLkRFRkFVTFRfU0VUVElOR1MucHJvdmlkZXJzLmdlbWluaSwgLi4uKHJhdz8ucHJvdmlkZXJzPy5nZW1pbmkgPz8ge30pIH0sXG4gICAgICBvcGVuYWk6IHsgLi4uREVGQVVMVF9TRVRUSU5HUy5wcm92aWRlcnMub3BlbmFpLCAuLi4ocmF3Py5wcm92aWRlcnM/Lm9wZW5haSA/PyB7fSkgfSxcbiAgICAgIGFudGhyb3BpYzogeyAuLi5ERUZBVUxUX1NFVFRJTkdTLnByb3ZpZGVycy5hbnRocm9waWMsIC4uLihyYXc/LnByb3ZpZGVycz8uYW50aHJvcGljID8/IHt9KSB9LFxuICAgICAgb2xsYW1hOiB7IC4uLkRFRkFVTFRfU0VUVElOR1MucHJvdmlkZXJzLm9sbGFtYSwgLi4uKHJhdz8ucHJvdmlkZXJzPy5vbGxhbWEgPz8ge30pIH1cbiAgICB9XG4gIH07XG59XG5cbmNvbnN0IEdFTUlOSV9NT0RFTFMgPSBbXCJnZW1pbmktMi4wLWZsYXNoXCIsIFwiZ2VtaW5pLTEuNS1wcm9cIiwgXCJnZW1pbmktMi4wLXByb1wiXTtcbmNvbnN0IE9QRU5BSV9NT0RFTFMgPSBbXCJncHQtNG9cIiwgXCJncHQtNG8tbWluaVwiLCBcImdwdC00LXR1cmJvXCJdO1xuY29uc3QgQU5USFJPUElDX01PREVMUyA9IFtcImNsYXVkZS0zLTUtc29ubmV0LTIwMjQxMDIyXCIsIFwiY2xhdWRlLTMtaGFpa3UtMjAyNDAzMDdcIiwgXCJjbGF1ZGUtMy1vcHVzLTIwMjQwMjI5XCJdO1xuXG5leHBvcnQgY2xhc3MgU3lieWxTZXR0aW5nVGFiIGV4dGVuZHMgUGx1Z2luU2V0dGluZ1RhYiB7XG4gIHByaXZhdGUgdmFsaWRhdGlvbjogUGFydGlhbDxSZWNvcmQ8UHJvdmlkZXJJRCwgVmFsaWRhdGlvblN0YXRlPj4gPSB7fTtcbiAgcHJpdmF0ZSBvbGxhbWFNb2RlbHM6IHN0cmluZ1tdID0gW107XG5cbiAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHByaXZhdGUgcmVhZG9ubHkgcGx1Z2luOiBTeWJ5bFBsdWdpbikge1xuICAgIHN1cGVyKGFwcCwgcGx1Z2luKTtcbiAgfVxuXG4gIGRpc3BsYXkoKTogdm9pZCB7XG4gICAgY29uc3QgeyBjb250YWluZXJFbCB9ID0gdGhpcztcbiAgICBjb250YWluZXJFbC5lbXB0eSgpO1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBgU3lieWwgU2V0dGluZ3MgKCR7dGhpcy5wcm92aWRlckxhYmVsKHRoaXMucGx1Z2luLnNldHRpbmdzLmFjdGl2ZVByb3ZpZGVyKX0pYCB9KTtcbiAgICB0aGlzLnJlbmRlckFjdGl2ZVByb3ZpZGVyKGNvbnRhaW5lckVsKTtcbiAgICB0aGlzLnJlbmRlclByb3ZpZGVyQ29uZmlnKGNvbnRhaW5lckVsKTtcbiAgICB0aGlzLnJlbmRlckdsb2JhbFNldHRpbmdzKGNvbnRhaW5lckVsKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyQWN0aXZlUHJvdmlkZXIoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkFjdGl2ZSBQcm92aWRlclwiKVxuICAgICAgLnNldERlc2MoXCJVc2VkIHdoZW4gYSBub3RlIGRvZXMgbm90IG92ZXJyaWRlIHByb3ZpZGVyLlwiKVxuICAgICAgLmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xuICAgICAgICBkcm9wZG93bi5hZGRPcHRpb24oXCJnZW1pbmlcIiwgXCJHZW1pbmlcIik7XG4gICAgICAgIGRyb3Bkb3duLmFkZE9wdGlvbihcIm9wZW5haVwiLCBcIk9wZW5BSVwiKTtcbiAgICAgICAgZHJvcGRvd24uYWRkT3B0aW9uKFwiYW50aHJvcGljXCIsIFwiQW50aHJvcGljIChDbGF1ZGUpXCIpO1xuICAgICAgICBkcm9wZG93bi5hZGRPcHRpb24oXCJvbGxhbWFcIiwgXCJPbGxhbWEgKGxvY2FsKVwiKTtcbiAgICAgICAgZHJvcGRvd24uc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuYWN0aXZlUHJvdmlkZXIpO1xuICAgICAgICBkcm9wZG93bi5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5hY3RpdmVQcm92aWRlciA9IHZhbHVlIGFzIFByb3ZpZGVySUQ7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgdGhpcy5kaXNwbGF5KCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlclByb3ZpZGVyQ29uZmlnKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIlByb3ZpZGVyIENvbmZpZ3VyYXRpb25cIiB9KTtcbiAgICBzd2l0Y2ggKHRoaXMucGx1Z2luLnNldHRpbmdzLmFjdGl2ZVByb3ZpZGVyKSB7XG4gICAgICBjYXNlIFwiZ2VtaW5pXCI6XG4gICAgICAgIHRoaXMucmVuZGVyR2VtaW5pU2V0dGluZ3MoY29udGFpbmVyRWwpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgXCJvcGVuYWlcIjpcbiAgICAgICAgdGhpcy5yZW5kZXJPcGVuQUlTZXR0aW5ncyhjb250YWluZXJFbCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcImFudGhyb3BpY1wiOlxuICAgICAgICB0aGlzLnJlbmRlckFudGhyb3BpY1NldHRpbmdzKGNvbnRhaW5lckVsKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwib2xsYW1hXCI6XG4gICAgICAgIHRoaXMucmVuZGVyT2xsYW1hU2V0dGluZ3MoY29udGFpbmVyRWwpO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlbmRlckdlbWluaVNldHRpbmdzKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIGNvbnN0IGNvbmZpZyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnByb3ZpZGVycy5nZW1pbmk7XG4gICAgdGhpcy5yZW5kZXJWYWxpZGF0aW9uU3RhdGUoY29udGFpbmVyRWwsIFwiZ2VtaW5pXCIpO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJBUEkgS2V5XCIpXG4gICAgICAuYWRkVGV4dCgodGV4dCkgPT4ge1xuICAgICAgICB0ZXh0LmlucHV0RWwudHlwZSA9IFwicGFzc3dvcmRcIjtcbiAgICAgICAgdGV4dC5zZXRWYWx1ZShjb25maWcuYXBpS2V5KTtcbiAgICAgICAgdGV4dC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICBjb25maWcuYXBpS2V5ID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0ZXh0LmlucHV0RWwuYWRkRXZlbnRMaXN0ZW5lcihcImJsdXJcIiwgKCkgPT4gdm9pZCB0aGlzLnZhbGlkYXRlUHJvdmlkZXIoXCJnZW1pbmlcIikpO1xuICAgICAgfSk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkRlZmF1bHQgTW9kZWxcIilcbiAgICAgIC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcbiAgICAgICAgR0VNSU5JX01PREVMUy5mb3JFYWNoKChtb2RlbCkgPT4gZHJvcGRvd24uYWRkT3B0aW9uKG1vZGVsLCBtb2RlbCkpO1xuICAgICAgICBkcm9wZG93bi5zZXRWYWx1ZShjb25maWcuZGVmYXVsdE1vZGVsKTtcbiAgICAgICAgZHJvcGRvd24ub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uZmlnLmRlZmF1bHRNb2RlbCA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJNYW5hZ2UgVXBsb2FkZWQgRmlsZXNcIilcbiAgICAgIC5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xuICAgICAgICBidXR0b24uc2V0QnV0dG9uVGV4dChcIk9wZW5cIikub25DbGljayhhc3luYyAoKSA9PiB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHByb3ZpZGVyID0gbmV3IEdlbWluaVByb3ZpZGVyKGNvbmZpZyk7XG4gICAgICAgICAgICBjb25zdCBmaWxlcyA9IGF3YWl0IHByb3ZpZGVyLmxpc3RTb3VyY2VzKCk7XG4gICAgICAgICAgICBuZXcgVXBsb2FkZWRGaWxlc01vZGFsKHRoaXMuYXBwLCBcIkdlbWluaSBVcGxvYWRlZCBGaWxlc1wiLCBmaWxlcywgKCkgPT4gcHJvdmlkZXIubGlzdFNvdXJjZXMoKSwgKGZpbGUpID0+IHByb3ZpZGVyLmRlbGV0ZVNvdXJjZShmaWxlKSkub3BlbigpO1xuICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBuZXcgTm90aWNlKGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJPcGVuQUlTZXR0aW5ncyhjb250YWluZXJFbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgICBjb25zdCBjb25maWcgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcm92aWRlcnMub3BlbmFpO1xuICAgIHRoaXMucmVuZGVyVmFsaWRhdGlvblN0YXRlKGNvbnRhaW5lckVsLCBcIm9wZW5haVwiKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiQVBJIEtleVwiKVxuICAgICAgLmFkZFRleHQoKHRleHQpID0+IHtcbiAgICAgICAgdGV4dC5pbnB1dEVsLnR5cGUgPSBcInBhc3N3b3JkXCI7XG4gICAgICAgIHRleHQuc2V0VmFsdWUoY29uZmlnLmFwaUtleSk7XG4gICAgICAgIHRleHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uZmlnLmFwaUtleSA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGV4dC5pbnB1dEVsLmFkZEV2ZW50TGlzdGVuZXIoXCJibHVyXCIsICgpID0+IHZvaWQgdGhpcy52YWxpZGF0ZVByb3ZpZGVyKFwib3BlbmFpXCIpKTtcbiAgICAgIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJCYXNlIFVSTFwiKVxuICAgICAgLnNldERlc2MoXCJPdmVycmlkZSBmb3IgQXp1cmUgb3IgcHJveHkgZW5kcG9pbnRzXCIpXG4gICAgICAuYWRkVGV4dCgodGV4dCkgPT4ge1xuICAgICAgICB0ZXh0LnNldFZhbHVlKGNvbmZpZy5iYXNlVXJsKTtcbiAgICAgICAgdGV4dC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICBjb25maWcuYmFzZVVybCA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGV4dC5pbnB1dEVsLmFkZEV2ZW50TGlzdGVuZXIoXCJibHVyXCIsICgpID0+IHZvaWQgdGhpcy52YWxpZGF0ZVByb3ZpZGVyKFwib3BlbmFpXCIpKTtcbiAgICAgIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJEZWZhdWx0IE1vZGVsXCIpXG4gICAgICAuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PiB7XG4gICAgICAgIE9QRU5BSV9NT0RFTFMuZm9yRWFjaCgobW9kZWwpID0+IGRyb3Bkb3duLmFkZE9wdGlvbihtb2RlbCwgbW9kZWwpKTtcbiAgICAgICAgZHJvcGRvd24uc2V0VmFsdWUoY29uZmlnLmRlZmF1bHRNb2RlbCk7XG4gICAgICAgIGRyb3Bkb3duLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGNvbmZpZy5kZWZhdWx0TW9kZWwgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcInBcIiwge1xuICAgICAgdGV4dDogXCJPcGVuQUkgc291cmNlcyB1c2UgdmF1bHRfcGF0aC4gQWRkIHNvdXJjZSBmaWxlcyB2aWEgdGhlIE1hbmFnZSBTb3VyY2VzIGNvbW1hbmQgaW4gYW55IG5vdGUuXCJcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyQW50aHJvcGljU2V0dGluZ3MoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gICAgY29uc3QgY29uZmlnID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucHJvdmlkZXJzLmFudGhyb3BpYztcbiAgICB0aGlzLnJlbmRlclZhbGlkYXRpb25TdGF0ZShjb250YWluZXJFbCwgXCJhbnRocm9waWNcIik7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkFQSSBLZXlcIilcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PiB7XG4gICAgICAgIHRleHQuaW5wdXRFbC50eXBlID0gXCJwYXNzd29yZFwiO1xuICAgICAgICB0ZXh0LnNldFZhbHVlKGNvbmZpZy5hcGlLZXkpO1xuICAgICAgICB0ZXh0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGNvbmZpZy5hcGlLZXkgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRleHQuaW5wdXRFbC5hZGRFdmVudExpc3RlbmVyKFwiYmx1clwiLCAoKSA9PiB2b2lkIHRoaXMudmFsaWRhdGVQcm92aWRlcihcImFudGhyb3BpY1wiKSk7XG4gICAgICB9KTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiRGVmYXVsdCBNb2RlbFwiKVxuICAgICAgLmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xuICAgICAgICBBTlRIUk9QSUNfTU9ERUxTLmZvckVhY2goKG1vZGVsKSA9PiBkcm9wZG93bi5hZGRPcHRpb24obW9kZWwsIG1vZGVsKSk7XG4gICAgICAgIGRyb3Bkb3duLnNldFZhbHVlKGNvbmZpZy5kZWZhdWx0TW9kZWwpO1xuICAgICAgICBkcm9wZG93bi5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICBjb25maWcuZGVmYXVsdE1vZGVsID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJwXCIsIHtcbiAgICAgIHRleHQ6IFwiUERGcyBhcmUgZW5jb2RlZCBpbmxpbmUgcGVyIHJlcXVlc3QuIFVzZSBzaG9ydCBleGNlcnB0cyB0byBhdm9pZCBoaWdoIHRva2VuIGNvc3RzLlwiXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlck9sbGFtYVNldHRpbmdzKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIGNvbnN0IGNvbmZpZyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnByb3ZpZGVycy5vbGxhbWE7XG4gICAgdGhpcy5yZW5kZXJWYWxpZGF0aW9uU3RhdGUoY29udGFpbmVyRWwsIFwib2xsYW1hXCIpO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJCYXNlIFVSTFwiKVxuICAgICAgLmFkZFRleHQoKHRleHQpID0+IHtcbiAgICAgICAgdGV4dC5zZXRWYWx1ZShjb25maWcuYmFzZVVybCk7XG4gICAgICAgIHRleHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uZmlnLmJhc2VVcmwgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRleHQuaW5wdXRFbC5hZGRFdmVudExpc3RlbmVyKFwiYmx1clwiLCAoKSA9PiB2b2lkIHRoaXMudmFsaWRhdGVPbGxhbWEoKSk7XG4gICAgICB9KTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiQXZhaWxhYmxlIE1vZGVsc1wiKVxuICAgICAgLmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xuICAgICAgICBjb25zdCBvcHRpb25zID0gdGhpcy5vbGxhbWFNb2RlbHMubGVuZ3RoID8gdGhpcy5vbGxhbWFNb2RlbHMgOiBbY29uZmlnLmRlZmF1bHRNb2RlbF07XG4gICAgICAgIG9wdGlvbnMuZm9yRWFjaCgobW9kZWwpID0+IGRyb3Bkb3duLmFkZE9wdGlvbihtb2RlbCwgbW9kZWwpKTtcbiAgICAgICAgZHJvcGRvd24uc2V0VmFsdWUob3B0aW9ucy5pbmNsdWRlcyhjb25maWcuZGVmYXVsdE1vZGVsKSA/IGNvbmZpZy5kZWZhdWx0TW9kZWwgOiBvcHRpb25zWzBdKTtcbiAgICAgICAgZHJvcGRvd24ub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uZmlnLmRlZmF1bHRNb2RlbCA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgIHRoaXMuZGlzcGxheSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJEZWZhdWx0IE1vZGVsXCIpXG4gICAgICAuYWRkVGV4dCgodGV4dCkgPT4ge1xuICAgICAgICB0ZXh0LnNldFZhbHVlKGNvbmZpZy5kZWZhdWx0TW9kZWwpO1xuICAgICAgICB0ZXh0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGNvbmZpZy5kZWZhdWx0TW9kZWwgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcInBcIiwge1xuICAgICAgdGV4dDogXCJObyBBUEkga2V5IHJlcXVpcmVkLiBPbGxhbWEgbXVzdCBiZSBydW5uaW5nIGxvY2FsbHkuIEZpbGUgZ3JvdW5kaW5nIHVzZXMgdmF1bHRfcGF0aCB0ZXh0IGV4dHJhY3Rpb24uXCJcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyR2xvYmFsU2V0dGluZ3MoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiR2xvYmFsIFNldHRpbmdzXCIgfSk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkRlZmF1bHQgVGVtcGVyYXR1cmVcIilcbiAgICAgIC5zZXREZXNjKFN0cmluZyh0aGlzLnBsdWdpbi5zZXR0aW5ncy5kZWZhdWx0VGVtcGVyYXR1cmUpKVxuICAgICAgLmFkZFNsaWRlcigoc2xpZGVyKSA9PiB7XG4gICAgICAgIHNsaWRlci5zZXRMaW1pdHMoMCwgMSwgMC4wNSk7XG4gICAgICAgIHNsaWRlci5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5kZWZhdWx0VGVtcGVyYXR1cmUpO1xuICAgICAgICBzbGlkZXIub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVmYXVsdFRlbXBlcmF0dXJlID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgdGhpcy5kaXNwbGF5KCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkluc2VydGlvbiBNb2RlXCIpXG4gICAgICAuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PiB7XG4gICAgICAgIGRyb3Bkb3duLmFkZE9wdGlvbihcImN1cnNvclwiLCBcIkF0IGN1cnNvclwiKTtcbiAgICAgICAgZHJvcGRvd24uYWRkT3B0aW9uKFwiZW5kLW9mLW5vdGVcIiwgXCJFbmQgb2Ygbm90ZVwiKTtcbiAgICAgICAgZHJvcGRvd24uc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuaW5zZXJ0aW9uTW9kZSk7XG4gICAgICAgIGRyb3Bkb3duLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmluc2VydGlvbk1vZGUgPSB2YWx1ZSBhcyBcImN1cnNvclwiIHwgXCJlbmQtb2Ytbm90ZVwiO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJTaG93IFRva2VuIENvdW50XCIpXG4gICAgICAuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcbiAgICAgICAgdG9nZ2xlLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLnNob3dUb2tlbkNvdW50KTtcbiAgICAgICAgdG9nZ2xlLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnNob3dUb2tlbkNvdW50ID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkxvbmVsb2cgTW9kZVwiKVxuICAgICAgLnNldERlc2MoXCJFbmFibGUgTG9uZWxvZyBub3RhdGlvbiwgY29udGV4dCBwYXJzaW5nLCBhbmQgTG9uZWxvZy1zcGVjaWZpYyBjb21tYW5kcy5cIilcbiAgICAgIC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xuICAgICAgICB0b2dnbGUuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MubG9uZWxvZ01vZGUpO1xuICAgICAgICB0b2dnbGUub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MubG9uZWxvZ01vZGUgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICB0aGlzLmRpc3BsYXkoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICBpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MubG9uZWxvZ01vZGUpIHtcbiAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgICAuc2V0TmFtZShcIkF1dG8taW5jcmVtZW50IHNjZW5lIGNvdW50ZXJcIilcbiAgICAgICAgLmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB7XG4gICAgICAgICAgdG9nZ2xlLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmxvbmVsb2dBdXRvSW5jU2NlbmUpO1xuICAgICAgICAgIHRvZ2dsZS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmxvbmVsb2dBdXRvSW5jU2NlbmUgPSB2YWx1ZTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgICAuc2V0TmFtZShcIkNvbnRleHQgZXh0cmFjdGlvbiBkZXB0aFwiKVxuICAgICAgICAuYWRkVGV4dCgodGV4dCkgPT4ge1xuICAgICAgICAgIHRleHQuc2V0VmFsdWUoU3RyaW5nKHRoaXMucGx1Z2luLnNldHRpbmdzLmxvbmVsb2dDb250ZXh0RGVwdGgpKTtcbiAgICAgICAgICB0ZXh0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbmV4dCA9IE51bWJlcih2YWx1ZSk7XG4gICAgICAgICAgICBpZiAoIU51bWJlci5pc05hTihuZXh0KSAmJiBuZXh0ID4gMCkge1xuICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5sb25lbG9nQ29udGV4dERlcHRoID0gbmV4dDtcbiAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgIC5zZXROYW1lKFwiV3JhcCBub3RhdGlvbiBpbiBjb2RlIGJsb2Nrc1wiKVxuICAgICAgICAuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcbiAgICAgICAgICB0b2dnbGUuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MubG9uZWxvZ1dyYXBDb2RlQmxvY2spO1xuICAgICAgICAgIHRvZ2dsZS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmxvbmVsb2dXcmFwQ29kZUJsb2NrID0gdmFsdWU7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJWYWxpZGF0aW9uU3RhdGUoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50LCBwcm92aWRlcjogUHJvdmlkZXJJRCk6IHZvaWQge1xuICAgIGNvbnN0IHN0YXRlID0gdGhpcy52YWxpZGF0aW9uW3Byb3ZpZGVyXTtcbiAgICBpZiAoIXN0YXRlIHx8IHN0YXRlLnN0YXR1cyA9PT0gXCJpZGxlXCIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJwXCIsIHtcbiAgICAgIHRleHQ6XG4gICAgICAgIHN0YXRlLnN0YXR1cyA9PT0gXCJjaGVja2luZ1wiXG4gICAgICAgICAgPyBcIlZhbGlkYXRpb246IGNoZWNraW5nLi4uXCJcbiAgICAgICAgICA6IHN0YXRlLnN0YXR1cyA9PT0gXCJ2YWxpZFwiXG4gICAgICAgICAgICA/IFwiVmFsaWRhdGlvbjogXHUyNzEzXCJcbiAgICAgICAgICAgIDogYFZhbGlkYXRpb246IFx1MjcxNyR7c3RhdGUubWVzc2FnZSA/IGAgKCR7c3RhdGUubWVzc2FnZX0pYCA6IFwiXCJ9YFxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBwcm92aWRlckxhYmVsKHByb3ZpZGVyOiBQcm92aWRlcklEKTogc3RyaW5nIHtcbiAgICBzd2l0Y2ggKHByb3ZpZGVyKSB7XG4gICAgICBjYXNlIFwiZ2VtaW5pXCI6XG4gICAgICAgIHJldHVybiBcIkdlbWluaVwiO1xuICAgICAgY2FzZSBcIm9wZW5haVwiOlxuICAgICAgICByZXR1cm4gXCJPcGVuQUlcIjtcbiAgICAgIGNhc2UgXCJhbnRocm9waWNcIjpcbiAgICAgICAgcmV0dXJuIFwiQW50aHJvcGljXCI7XG4gICAgICBjYXNlIFwib2xsYW1hXCI6XG4gICAgICAgIHJldHVybiBcIk9sbGFtYVwiO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgdmFsaWRhdGVQcm92aWRlcihwcm92aWRlcjogUHJvdmlkZXJJRCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMudmFsaWRhdGlvbltwcm92aWRlcl0gPSB7IHN0YXR1czogXCJjaGVja2luZ1wiIH07XG4gICAgdGhpcy5kaXNwbGF5KCk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHZhbGlkID0gYXdhaXQgZ2V0UHJvdmlkZXIodGhpcy5wbHVnaW4uc2V0dGluZ3MsIHByb3ZpZGVyKS52YWxpZGF0ZSgpO1xuICAgICAgdGhpcy52YWxpZGF0aW9uW3Byb3ZpZGVyXSA9IHsgc3RhdHVzOiB2YWxpZCA/IFwidmFsaWRcIiA6IFwiaW52YWxpZFwiIH07XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMudmFsaWRhdGlvbltwcm92aWRlcl0gPSB7XG4gICAgICAgIHN0YXR1czogXCJpbnZhbGlkXCIsXG4gICAgICAgIG1lc3NhZ2U6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKVxuICAgICAgfTtcbiAgICB9XG4gICAgdGhpcy5kaXNwbGF5KCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHZhbGlkYXRlT2xsYW1hKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMudmFsaWRhdGlvbi5vbGxhbWEgPSB7IHN0YXR1czogXCJjaGVja2luZ1wiIH07XG4gICAgdGhpcy5kaXNwbGF5KCk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHByb3ZpZGVyID0gbmV3IE9sbGFtYVByb3ZpZGVyKHRoaXMucGx1Z2luLnNldHRpbmdzLnByb3ZpZGVycy5vbGxhbWEpO1xuICAgICAgY29uc3QgdmFsaWQgPSBhd2FpdCBwcm92aWRlci52YWxpZGF0ZSgpO1xuICAgICAgdGhpcy52YWxpZGF0aW9uLm9sbGFtYSA9IHsgc3RhdHVzOiB2YWxpZCA/IFwidmFsaWRcIiA6IFwiaW52YWxpZFwiIH07XG4gICAgICB0aGlzLm9sbGFtYU1vZGVscyA9IHZhbGlkID8gYXdhaXQgcHJvdmlkZXIubGlzdE1vZGVscygpIDogW107XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMudmFsaWRhdGlvbi5vbGxhbWEgPSB7XG4gICAgICAgIHN0YXR1czogXCJpbnZhbGlkXCIsXG4gICAgICAgIG1lc3NhZ2U6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKVxuICAgICAgfTtcbiAgICAgIHRoaXMub2xsYW1hTW9kZWxzID0gW107XG4gICAgICBuZXcgTm90aWNlKHRoaXMudmFsaWRhdGlvbi5vbGxhbWEubWVzc2FnZSA/PyBcIk9sbGFtYSB2YWxpZGF0aW9uIGZhaWxlZC5cIik7XG4gICAgfVxuICAgIHRoaXMuZGlzcGxheSgpO1xuICB9XG59XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFBQUEsbUJBQTZDOzs7QUNFdEMsU0FBUyxlQUFlLFFBQWdCLE1BQW9CO0FBQ2pFLFFBQU0sU0FBUyxPQUFPLFVBQVU7QUFDaEMsU0FBTyxhQUFhO0FBQUEsRUFBSztBQUFBLEdBQVUsTUFBTTtBQUN6QyxTQUFPLFVBQVUsRUFB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
