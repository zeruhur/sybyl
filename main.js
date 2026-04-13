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
var import_obsidian10 = require("obsidian");

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
function isInsideCodeBlock(editor, atLine) {
  const checkLine = atLine != null ? atLine : editor.getCursor().line;
  let inside = false;
  for (let i = 0; i < checkLine; i++) {
    if (/^```/.test(editor.getLine(i))) {
      inside = !inside;
    }
  }
  return inside;
}

// src/lonelog/parser.ts
function parseLonelogContext(noteBody, depthLines = 60) {
  var _a;
  const bodyWithoutFM = noteBody.replace(/^---[\s\S]*?---\r?\n/, "");
  const lines = bodyWithoutFM.split(/\r?\n/);
  const window = lines.slice(-depthLines);
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
  const skipRe = /^(#|---|>\s*\[|\[N:|\[L:|\[Thread:|\[Clock:|\[Track:|\[PC:)/;
  const npcMap = /* @__PURE__ */ new Map();
  const locMap = /* @__PURE__ */ new Map();
  const threadMap = /* @__PURE__ */ new Map();
  const clockMap = /* @__PURE__ */ new Map();
  const trackMap = /* @__PURE__ */ new Map();
  const pcMap = /* @__PURE__ */ new Map();
  for (const rawLine of window) {
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
    } else if (line.length > 0 && !skipRe.test(line) && !sceneRe.test(line)) {
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
  const ruleset = (_a = fm.ruleset) != null ? _a : "the game";
  const pcs = fm.pcs ? `Player character: ${fm.pcs}` : "";
  const genre = fm.genre ? `Genre: ${fm.genre}` : "";
  const tone = fm.tone ? `Tone: ${fm.tone}` : "";
  const language = fm.language ? `Respond in ${fm.language}.` : "Respond in the same language as the user's input.";
  return `You are a tool for solo role-playing of ${ruleset}. You are NOT a game master.

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
- Neutral, third-person, factual tone
- Past tense for scene descriptions, present tense for world state
- No rhetorical questions
- Be concise. Omit preamble, commentary, and closing remarks. Follow the length instruction in each request.

${pcs}
${genre}
${tone}
${language}`.trim();
}
function buildSystemPrompt(fm, lonelogMode) {
  var _a, _b;
  const base = ((_a = fm.system_prompt_override) == null ? void 0 : _a.trim()) || buildBasePrompt(fm);
  let prompt = lonelogMode ? `${base}

${LONELOG_SYSTEM_ADDENDUM}` : base;
  if ((_b = fm.game_context) == null ? void 0 : _b.trim()) {
    prompt = `${prompt}

GAME CONTEXT:
${fm.game_context.trim()}`;
  }
  return prompt;
}
function buildRequest(fm, userMessage, settings, maxOutputTokens = 512, noteBody) {
  var _a, _b, _c;
  const lonelogActive = (_a = fm.lonelog) != null ? _a : settings.lonelogMode;
  let contextBlock = "";
  if (lonelogActive && noteBody) {
    const ctx = parseLonelogContext(noteBody, settings.lonelogContextDepth);
    contextBlock = serializeContext(ctx);
  } else if ((_b = fm.scene_context) == null ? void 0 : _b.trim()) {
    contextBlock = `SCENE CONTEXT:
${fm.scene_context.trim()}`;
  }
  const contextMessage = contextBlock ? `${contextBlock}

${userMessage}` : userMessage;
  return {
    systemPrompt: buildSystemPrompt(fm, lonelogActive),
    userMessage: contextMessage,
    temperature: (_c = fm.temperature) != null ? _c : settings.defaultTemperature,
    maxOutputTokens,
    model: fm.model,
    resolvedSources: []
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
    const next = current.filter((item) => item.vault_path !== ref.vault_path);
    next.push(ref);
    fm["sources"] = next;
  });
}
async function removeSourceRef(app, file, ref) {
  await app.fileManager.processFrontMatter(file, (fm) => {
    const current = Array.isArray(fm["sources"]) ? [...fm["sources"]] : [];
    fm["sources"] = current.filter((item) => item.vault_path !== ref.vault_path);
  });
}

// src/providers/anthropic.ts
var import_obsidian = require("obsidian");
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
    const response = await (0, import_obsidian.requestUrl)({
      url: "https://api.anthropic.com/v1/messages",
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
      }),
      throw: false
    });
    if (response.status < 200 || response.status >= 300) {
      throw new Error(this.extractError(response));
    }
    const data = response.json;
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
  async listModels() {
    var _a;
    if (!this.config.apiKey.trim())
      return [];
    try {
      const response = await (0, import_obsidian.requestUrl)({
        url: "https://api.anthropic.com/v1/models",
        headers: {
          "x-api-key": this.config.apiKey,
          "anthropic-version": "2023-06-01"
        },
        throw: false
      });
      if (response.status < 200 || response.status >= 300)
        return [];
      const data = response.json;
      return ((_a = data.data) != null ? _a : []).map((m) => {
        var _a2;
        return (_a2 = m.id) != null ? _a2 : "";
      }).filter(Boolean);
    } catch (e) {
      return [];
    }
  }
  async validate() {
    if (!this.config.apiKey.trim()) {
      return false;
    }
    try {
      const response = await (0, import_obsidian.requestUrl)({
        url: "https://api.anthropic.com/v1/messages",
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
        }),
        throw: false
      });
      return response.status >= 200 && response.status < 300;
    } catch (e) {
      return false;
    }
  }
  ensureConfigured() {
    if (!this.config.apiKey.trim()) {
      throw new Error("No Anthropic API key set. Check plugin settings.");
    }
  }
  extractError(response) {
    var _a, _b;
    if (response.status === 401 || response.status === 403) {
      return "Anthropic API key rejected. Check settings.";
    }
    try {
      const data = response.json;
      const msg = (_b = (_a = data == null ? void 0 : data.error) == null ? void 0 : _a.message) != null ? _b : `Anthropic request failed (${response.status}).`;
      return response.status === 429 ? `Anthropic quota/rate error: ${msg}` : msg;
    } catch (e) {
      return `Anthropic request failed (${response.status}).`;
    }
  }
};

// src/providers/gemini.ts
var import_obsidian2 = require("obsidian");
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
    var _a, _b, _c, _d, _e, _f, _g;
    this.ensureConfigured();
    const model = request.model || this.config.defaultModel;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(this.config.apiKey)}`;
    const parts = [];
    for (const source of (_a = request.resolvedSources) != null ? _a : []) {
      if (source.base64Data) {
        parts.push({
          inlineData: {
            mimeType: source.ref.mime_type,
            data: source.base64Data
          }
        });
      } else if (source.textContent) {
        parts.push({ text: `[SOURCE: ${source.ref.label}]
${source.textContent}
[END SOURCE]` });
      }
    }
    parts.push({ text: request.userMessage });
    const response = await (0, import_obsidian2.requestUrl)({
      url: endpoint,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: request.systemPrompt }] },
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: request.temperature,
          maxOutputTokens: request.maxOutputTokens,
          thinkingConfig: { thinkingBudget: 0 }
        }
      }),
      throw: false
    });
    if (response.status < 200 || response.status >= 300) {
      throw new Error(this.extractError(response, "Gemini"));
    }
    const data = response.json;
    const text = ((_e = (_d = (_c = (_b = data.candidates) == null ? void 0 : _b[0]) == null ? void 0 : _c.content) == null ? void 0 : _d.parts) != null ? _e : []).map((part) => {
      var _a2;
      return (_a2 = part.text) != null ? _a2 : "";
    }).join("").trim();
    if (!text) {
      throw new Error("Provider returned an empty response.");
    }
    return {
      text,
      inputTokens: (_f = data.usageMetadata) == null ? void 0 : _f.promptTokenCount,
      outputTokens: (_g = data.usageMetadata) == null ? void 0 : _g.candidatesTokenCount
    };
  }
  async uploadSource() {
    throw new Error("Use 'Add Source' from the note to attach a vault file inline.");
  }
  async listSources() {
    return [];
  }
  async deleteSource() {
  }
  async listModels() {
    var _a;
    if (!this.config.apiKey.trim())
      return [];
    try {
      const response = await (0, import_obsidian2.requestUrl)({
        url: `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(this.config.apiKey)}`,
        throw: false
      });
      if (response.status < 200 || response.status >= 300)
        return [];
      const data = response.json;
      return ((_a = data.models) != null ? _a : []).filter((m) => {
        var _a2;
        return (_a2 = m.supportedGenerationMethods) == null ? void 0 : _a2.includes("generateContent");
      }).map((m) => {
        var _a2;
        return ((_a2 = m.name) != null ? _a2 : "").replace(/^models\//, "");
      }).filter(Boolean);
    } catch (e) {
      return [];
    }
  }
  async validate() {
    if (!this.config.apiKey.trim()) {
      return false;
    }
    try {
      const response = await (0, import_obsidian2.requestUrl)({
        url: `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(this.config.apiKey)}`,
        throw: false
      });
      return response.status >= 200 && response.status < 300;
    } catch (e) {
      return false;
    }
  }
  ensureConfigured() {
    if (!this.config.apiKey.trim()) {
      throw new Error("No Gemini API key set. Check plugin settings.");
    }
  }
  extractError(response, providerName) {
    var _a, _b;
    if (response.status === 401 || response.status === 403) {
      return `${providerName} API key rejected. Check settings.`;
    }
    try {
      const data = response.json;
      const msg = (_b = (_a = data == null ? void 0 : data.error) == null ? void 0 : _a.message) != null ? _b : `${providerName} request failed (${response.status}).`;
      return response.status === 429 ? `${providerName} quota/rate error: ${msg}` : msg;
    } catch (error) {
      return asErrorMessage(error) || `${providerName} request failed (${response.status}).`;
    }
  }
};

// src/providers/ollama.ts
var import_obsidian4 = require("obsidian");

// src/sourceUtils.ts
var import_obsidian3 = require("obsidian");
var TEXT_EXTENSIONS = /* @__PURE__ */ new Set(["txt", "md", "markdown", "json", "yaml", "yml", "csv"]);
function getVaultFile(app, vaultPath) {
  const normalized = (0, import_obsidian3.normalizePath)(vaultPath);
  const file = app.vault.getAbstractFileByPath(normalized);
  if (!(file instanceof import_obsidian3.TFile)) {
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
    if (providerId === "anthropic" || providerId === "gemini" && ref.mime_type === "application/pdf") {
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
  return ref.vault_path;
}
function listVaultCandidateFiles(app) {
  return app.vault.getFiles().filter((file) => ["pdf", "txt", "md", "markdown"].includes(file.extension.toLowerCase())).sort((a, b) => a.path.localeCompare(b.path));
}

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
    const response = await (0, import_obsidian4.requestUrl)({
      url: `${baseUrl}/api/chat`,
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
      }),
      throw: false
    });
    if (response.status < 200 || response.status >= 300) {
      if (response.status === 404) {
        throw new Error(`Model '${model}' not found in Ollama. Check available models in settings.`);
      }
      throw new Error(`Ollama not reachable at ${baseUrl}. Is it running?`);
    }
    const data = response.json;
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
    const response = await (0, import_obsidian4.requestUrl)({
      url: `${this.config.baseUrl.replace(/\/$/, "")}/api/tags`,
      throw: false
    });
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Ollama not reachable at ${this.config.baseUrl}. Is it running?`);
    }
    return response.json;
  }
};

// src/providers/openai.ts
var import_obsidian5 = require("obsidian");
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
    const response = await (0, import_obsidian5.requestUrl)({
      url: `${baseUrl}/chat/completions`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(body),
      throw: false
    });
    if (response.status < 200 || response.status >= 300) {
      throw new Error(this.extractError(response));
    }
    const data = response.json;
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
  async listModels() {
    var _a;
    if (!this.config.apiKey.trim())
      return [];
    try {
      const response = await (0, import_obsidian5.requestUrl)({
        url: `${this.config.baseUrl.replace(/\/$/, "")}/models`,
        headers: { Authorization: `Bearer ${this.config.apiKey}` },
        throw: false
      });
      if (response.status < 200 || response.status >= 300)
        return [];
      const data = response.json;
      const EXCLUDE = ["embedding", "whisper", "tts", "dall-e", "moderation", "text-search", "text-similarity"];
      return ((_a = data.data) != null ? _a : []).map((m) => {
        var _a2;
        return (_a2 = m.id) != null ? _a2 : "";
      }).filter((id) => id && !EXCLUDE.some((ex) => id.includes(ex))).sort();
    } catch (e) {
      return [];
    }
  }
  async validate() {
    if (!this.config.apiKey.trim()) {
      return false;
    }
    try {
      const response = await (0, import_obsidian5.requestUrl)({
        url: `${this.config.baseUrl.replace(/\/$/, "")}/models`,
        headers: { Authorization: `Bearer ${this.config.apiKey}` },
        throw: false
      });
      return response.status >= 200 && response.status < 300;
    } catch (e) {
      return false;
    }
  }
  ensureConfigured() {
    if (!this.config.apiKey.trim()) {
      throw new Error("No OpenAI API key set. Check plugin settings.");
    }
  }
  extractError(response) {
    var _a, _b;
    if (response.status === 401 || response.status === 403) {
      return "OpenAI API key rejected. Check settings.";
    }
    try {
      const data = response.json;
      const msg = (_b = (_a = data == null ? void 0 : data.error) == null ? void 0 : _a.message) != null ? _b : `OpenAI request failed (${response.status}).`;
      return response.status === 429 ? `OpenAI quota/rate error: ${msg}` : msg;
    } catch (e) {
      return `OpenAI request failed (${response.status}).`;
    }
  }
};

// src/providers/openrouter.ts
var import_obsidian6 = require("obsidian");
var BASE_URL = "https://openrouter.ai/api/v1";
function asErrorMessage2(error) {
  return error instanceof Error ? error.message : String(error);
}
var OpenRouterProvider = class {
  constructor(config) {
    this.config = config;
    this.id = "openrouter";
    this.name = "OpenRouter";
  }
  async generate(request) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i;
    this.ensureConfigured();
    const model = request.model || this.config.defaultModel;
    const sourceBlocks = ((_a = request.resolvedSources) != null ? _a : []).filter((source) => source.textContent).map((source) => {
      var _a2;
      return `[SOURCE: ${source.ref.label}]
${truncateSourceText((_a2 = source.textContent) != null ? _a2 : "")}
[END SOURCE]`;
    });
    const response = await (0, import_obsidian6.requestUrl)({
      url: `${BASE_URL}/chat/completions`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.config.apiKey}`,
        "HTTP-Referer": "obsidian-sybyl",
        "X-Title": "Sybyl"
      },
      body: JSON.stringify({
        model,
        max_tokens: request.maxOutputTokens,
        temperature: request.temperature,
        messages: [
          { role: "system", content: request.systemPrompt },
          {
            role: "user",
            content: sourceBlocks.length ? `${sourceBlocks.join("\n\n")}

${request.userMessage}` : request.userMessage
          }
        ]
      }),
      throw: false
    });
    if (response.status < 200 || response.status >= 300) {
      throw new Error(this.extractError(response));
    }
    const data = response.json;
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
    throw new Error("OpenRouter does not support file upload. Use vault_path instead.");
  }
  async listSources() {
    return [];
  }
  async deleteSource() {
  }
  async listModels() {
    var _a;
    if (!this.config.apiKey.trim())
      return [];
    try {
      const response = await (0, import_obsidian6.requestUrl)({
        url: `${BASE_URL}/models`,
        headers: {
          "Authorization": `Bearer ${this.config.apiKey}`
        },
        throw: false
      });
      if (response.status < 200 || response.status >= 300)
        return [];
      const data = response.json;
      return ((_a = data.data) != null ? _a : []).filter((m) => {
        var _a2, _b;
        return (_b = (_a2 = m.architecture) == null ? void 0 : _a2.modality) == null ? void 0 : _b.endsWith("->text");
      }).map((m) => {
        var _a2;
        return (_a2 = m.id) != null ? _a2 : "";
      }).filter(Boolean).sort();
    } catch (e) {
      return [];
    }
  }
  async validate() {
    if (!this.config.apiKey.trim())
      return false;
    try {
      const response = await (0, import_obsidian6.requestUrl)({
        url: `${BASE_URL}/models`,
        headers: { "Authorization": `Bearer ${this.config.apiKey}` },
        throw: false
      });
      return response.status >= 200 && response.status < 300;
    } catch (e) {
      return false;
    }
  }
  ensureConfigured() {
    if (!this.config.apiKey.trim()) {
      throw new Error("No OpenRouter API key set. Check plugin settings.");
    }
  }
  extractError(response) {
    var _a, _b;
    if (response.status === 401 || response.status === 403) {
      return "OpenRouter API key rejected. Check settings.";
    }
    try {
      const data = response.json;
      const msg = (_b = (_a = data == null ? void 0 : data.error) == null ? void 0 : _a.message) != null ? _b : `OpenRouter request failed (${response.status}).`;
      if (response.status === 429) {
        if (msg === "Provider returned error") {
          return "OpenRouter: free model endpoint at capacity. Retry in a moment or pick a different model.";
        }
        return `OpenRouter rate limit: ${msg}`;
      }
      return msg;
    } catch (error) {
      return asErrorMessage2(error) || `OpenRouter request failed (${response.status}).`;
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
    case "openrouter":
      return new OpenRouterProvider(settings.providers.openrouter);
    default:
      throw new Error(`Unknown provider: ${id}`);
  }
}

// src/commands.ts
var import_obsidian8 = require("obsidian");

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
function formatInterpretOracle(aiInterpretation, opts) {
  const interpretation = cleanAiText(aiInterpretation).split("\n").filter(Boolean).map((line) => line.startsWith("=>") ? line : `=> ${line}`).join("\n");
  return opts.wrapInCodeBlock ? fence(interpretation) : interpretation;
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
function formatAdventureSeed(aiText, opts) {
  const axes = cleanAiText(aiText).split("\n").filter(Boolean).map((line) => "  " + line.replace(/^[-*]\s*/, "")).join("\n");
  const notation = `gen: Adventure Seed
${axes}`;
  return opts.wrapInCodeBlock ? fence(notation) : notation;
}
function formatCharacter(aiText, _opts) {
  return cleanAiText(aiText);
}

// src/modals.ts
var import_obsidian7 = require("obsidian");
var InputModal = class extends import_obsidian7.Modal {
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
      new import_obsidian7.Setting(this.contentEl).setName(field.label).setDesc(field.optional ? "Optional" : "").addText((text) => {
        var _a, _b;
        text.setPlaceholder((_a = field.placeholder) != null ? _a : "");
        text.setValue((_b = this.values[field.key]) != null ? _b : "");
        text.onChange((value) => {
          this.values[field.key] = value;
        });
      });
    }
    new import_obsidian7.Setting(this.contentEl).addButton((button) => {
      button.setButtonText("Confirm").setCta().onClick(() => {
        this.onSubmit(this.values);
        this.close();
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
var VaultFilePickerModal = class extends import_obsidian7.Modal {
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
      new import_obsidian7.Setting(this.contentEl).setName(file.path).setDesc(file.extension.toLowerCase()).addButton((button) => {
        button.setButtonText("Select").setCta().onClick(() => {
          this.onPick(file);
          this.close();
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
var SourceOriginModal = class extends import_obsidian7.Modal {
  constructor(app, onPick) {
    super(app);
    this.onPick = onPick;
  }
  onOpen() {
    this.titleEl.setText("Add Source File");
    this.contentEl.empty();
    new import_obsidian7.Setting(this.contentEl).setName("Vault file").setDesc("Pick a file already in your vault").addButton((btn) => btn.setButtonText("Choose").setCta().onClick(() => {
      this.onPick("vault");
      this.close();
    }));
    new import_obsidian7.Setting(this.contentEl).setName("External file").setDesc("Import a file from your computer \u2014 saved into a sources/ subfolder next to this note").addButton((btn) => btn.setButtonText("Import").setCta().onClick(() => {
      this.onPick("external");
      this.close();
    }));
  }
  onClose() {
    this.contentEl.empty();
  }
};
function pickSourceOrigin(app) {
  return new Promise((resolve) => {
    let settled = false;
    const modal = new SourceOriginModal(app, (origin) => {
      settled = true;
      resolve(origin);
    });
    const originalClose = modal.onClose.bind(modal);
    modal.onClose = () => {
      originalClose();
      if (!settled)
        resolve(null);
    };
    modal.open();
  });
}
var SourcePickerModal = class extends import_obsidian7.Modal {
  constructor(app, title, sources, onPick) {
    super(app);
    this.title = title;
    this.sources = sources;
    this.onPick = onPick;
  }
  onOpen() {
    this.titleEl.setText(this.title);
    this.contentEl.empty();
    this.sources.forEach((source) => {
      new import_obsidian7.Setting(this.contentEl).setName(source.label).setDesc(`${source.mime_type} | ${describeSourceRef(source)}`).addButton((button) => {
        button.setButtonText("Select").setCta().onClick(() => {
          this.onPick(source);
          this.close();
        });
      });
    });
  }
  onClose() {
    this.contentEl.empty();
  }
};
function pickSourceRef(app, title, sources) {
  return new Promise((resolve) => {
    let settled = false;
    const modal = new SourcePickerModal(app, title, sources, (ref) => {
      settled = true;
      resolve(ref);
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
var QuickMenuModal = class extends import_obsidian7.Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
    this.items = [
      { label: "Start Scene", commandId: "sybyl:start-scene" },
      { label: "Declare Action", commandId: "sybyl:declare-action" },
      { label: "Ask Oracle", commandId: "sybyl:ask-oracle" },
      { label: "Interpret Oracle Roll", commandId: "sybyl:interpret-oracle-roll" },
      { label: "What Now", commandId: "sybyl:what-now" },
      { label: "What Can I Do", commandId: "sybyl:what-can-i-do" },
      { label: "Expand Scene", commandId: "sybyl:expand-scene" }
    ];
  }
  onOpen() {
    this.titleEl.setText("Sybyl");
    this.contentEl.empty();
    for (const item of this.items) {
      new import_obsidian7.Setting(this.contentEl).setName(item.label).addButton(
        (btn) => btn.setButtonText("Run").setCta().onClick(() => {
          this.close();
          this.plugin.app.commands.executeCommandById(item.commandId);
        })
      );
    }
  }
  onClose() {
    this.contentEl.empty();
  }
};
var ManageSourcesModal = class extends import_obsidian7.Modal {
  constructor(app, sources, onRemove) {
    super(app);
    this.sources = sources;
    this.onRemove = onRemove;
  }
  onOpen() {
    this.titleEl.setText("Manage Sources");
    this.render();
  }
  render() {
    this.contentEl.empty();
    if (!this.sources.length) {
      this.contentEl.createEl("p", { text: "No sources are attached to this note." });
      return;
    }
    this.sources.forEach((source) => {
      new import_obsidian7.Setting(this.contentEl).setName(source.label).setDesc(`${source.mime_type} | ${describeSourceRef(source)}`).addButton((button) => {
        button.setButtonText("Remove").onClick(async () => {
          await this.onRemove(source);
          new import_obsidian7.Notice(`Removed '${source.label}'.`);
          this.close();
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
function lonelogOpts(settings, noWrap = false) {
  var _a;
  return { wrapInCodeBlock: !noWrap && ((_a = settings.lonelogWrapCodeBlock) != null ? _a : true) };
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
async function addSourceToNote(plugin, file) {
  var _a, _b;
  const origin = await pickSourceOrigin(plugin.app);
  if (!origin)
    return;
  if (origin === "vault") {
    const vaultFile = await pickVaultFile(plugin.app, "Choose a vault file");
    if (!vaultFile)
      return;
    const ref2 = {
      label: vaultFile.basename,
      mime_type: inferMimeType(vaultFile),
      vault_path: vaultFile.path
    };
    await upsertSourceRef(plugin.app, file, ref2);
    new import_obsidian8.Notice(`Source added: ${vaultFile.path}`);
    return;
  }
  const localFile = await pickLocalFile();
  if (!localFile)
    return;
  const buffer = await localFile.arrayBuffer();
  const parentDir = (_b = (_a = file.parent) == null ? void 0 : _a.path) != null ? _b : "";
  const sourcesFolder = (0, import_obsidian8.normalizePath)(parentDir ? `${parentDir}/sources` : "sources");
  if (!plugin.app.vault.getAbstractFileByPath(sourcesFolder)) {
    await plugin.app.vault.createFolder(sourcesFolder);
  }
  const targetPath = (0, import_obsidian8.normalizePath)(`${sourcesFolder}/${localFile.name}`);
  const existing = plugin.app.vault.getAbstractFileByPath(targetPath);
  if (existing instanceof import_obsidian8.TFile) {
    await plugin.app.vault.modifyBinary(existing, buffer);
  } else {
    await plugin.app.vault.createBinary(targetPath, buffer);
  }
  const ref = {
    label: localFile.name.replace(/\.[^.]+$/, ""),
    mime_type: inferMimeType(localFile),
    vault_path: targetPath
  };
  await upsertSourceRef(plugin.app, file, ref);
  new import_obsidian8.Notice(`Source imported: ${targetPath}`);
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
    async (ref) => removeSourceRef(plugin.app, context.view.file, ref)
  ).open();
}
async function runGeneration(plugin, userMessage, formatter, maxOutputTokens = 512, placement) {
  var _a, _b;
  const context = await plugin.getActiveNoteContext();
  if (!context) {
    return;
  }
  try {
    const editor = context.view.editor;
    let targetLine;
    if (placement === "below-selection") {
      targetLine = (_b = (_a = editor.listSelections()[0]) == null ? void 0 : _a.head.line) != null ? _b : editor.getCursor().line;
    } else if (placement === "end-of-note") {
      targetLine = editor.lastLine();
    } else {
      targetLine = editor.getCursor().line;
    }
    const insideCodeBlock = isInsideCodeBlock(editor, targetLine);
    const response = await plugin.requestGeneration(context.fm, context.noteBody, userMessage, maxOutputTokens);
    const formatted = formatter(response.text, context.fm, insideCodeBlock);
    if (placement === "below-selection") {
      insertBelowSelection(editor, formatted);
    } else {
      plugin.insertText(context.view, formatted, placement);
    }
    plugin.maybeInsertTokenComment(context.view, response);
  } catch (error) {
    new import_obsidian8.Notice(`Sybyl error: ${error instanceof Error ? error.message : String(error)}`);
    console.error(error);
  }
}
function registerAllCommands(plugin) {
  plugin.addCommand({
    id: "sybyl:insert-frontmatter",
    name: "Insert Note Frontmatter",
    callback: async () => {
      const context = await plugin.getActiveNoteContext();
      if (!(context == null ? void 0 : context.view.file)) {
        return;
      }
      const values = await openInputModal(plugin.app, "Insert Sybyl Frontmatter", [
        { key: "ruleset", label: "Game / ruleset", placeholder: "Ironsworn" },
        { key: "genre", label: "Genre", optional: true, placeholder: "Dark fantasy / survival" },
        { key: "pcs", label: "PC", optional: true, placeholder: "Kira Voss, dangerous rank, vow: recover the relic" },
        { key: "tone", label: "Tone", optional: true, placeholder: "Gritty, hopeful" },
        { key: "language", label: "Language", optional: true, placeholder: "Leave blank for auto-detect" }
      ]);
      if (!values) {
        return;
      }
      if (!values.ruleset) {
        new import_obsidian8.Notice("Ruleset is required.");
        return;
      }
      await plugin.app.fileManager.processFrontMatter(context.view.file, (fm) => {
        var _a, _b, _c, _d, _e, _f, _g;
        fm["ruleset"] = values.ruleset;
        fm["provider"] = (_a = fm["provider"]) != null ? _a : plugin.settings.activeProvider;
        fm["oracle_mode"] = (_b = fm["oracle_mode"]) != null ? _b : "yes-no";
        fm["lonelog"] = (_c = fm["lonelog"]) != null ? _c : plugin.settings.lonelogMode;
        fm["scene_counter"] = (_d = fm["scene_counter"]) != null ? _d : 1;
        fm["session_number"] = (_e = fm["session_number"]) != null ? _e : 1;
        fm["game_context"] = (_f = fm["game_context"]) != null ? _f : "";
        fm["scene_context"] = (_g = fm["scene_context"]) != null ? _g : "";
        if (values.genre)
          fm["genre"] = values.genre;
        if (values.pcs)
          fm["pcs"] = values.pcs;
        if (values.tone)
          fm["tone"] = values.tone;
        if (values.language)
          fm["language"] = values.language;
      });
      new import_obsidian8.Notice("Sybyl frontmatter inserted.");
    }
  });
  plugin.addCommand({
    id: "sybyl:digest-source",
    name: "Digest Source into Game Context",
    callback: async () => {
      var _a, _b;
      const context = await plugin.getActiveNoteContext();
      if (!(context == null ? void 0 : context.view.file)) {
        return;
      }
      const vaultFile = await pickVaultFile(plugin.app, "Choose a source file to digest");
      if (!vaultFile) {
        return;
      }
      const ref = {
        label: vaultFile.basename,
        mime_type: inferMimeType(vaultFile),
        vault_path: vaultFile.path
      };
      const providerId = (_a = context.fm.provider) != null ? _a : plugin.settings.activeProvider;
      let resolvedSources;
      try {
        resolvedSources = await resolveSourcesForRequest(plugin.app, [ref], providerId);
      } catch (error) {
        new import_obsidian8.Notice(`Cannot read source: ${error instanceof Error ? error.message : String(error)}`);
        return;
      }
      const ruleset = (_b = context.fm.ruleset) != null ? _b : "the game";
      const digestPrompt = `Distill the following source material for use in a solo tabletop RPG session of "${ruleset}".

Extract and condense into a compact reference:
- Core rules and mechanics relevant to play
- Key factions, locations, characters, and world facts
- Tone, genre, and setting conventions
- Any tables, move lists, or random generators

Be concise and specific. Preserve game-mechanical details. Omit flavor prose and examples.`;
      try {
        const response = await plugin.requestRawGeneration(
          context.fm,
          digestPrompt,
          2e3,
          resolvedSources
        );
        await plugin.app.fileManager.processFrontMatter(context.view.file, (fm) => {
          fm["game_context"] = response.text;
        });
        new import_obsidian8.Notice("Game context updated.");
      } catch (error) {
        new import_obsidian8.Notice(`Sybyl error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  });
  plugin.addCommand({
    id: "sybyl:ask-the-rules",
    name: "Ask the Rules",
    callback: async () => {
      var _a, _b, _c;
      const context = await plugin.getActiveNoteContext();
      if (!(context == null ? void 0 : context.view.file)) {
        return;
      }
      const sources = (_a = context.fm.sources) != null ? _a : [];
      if (!sources.length) {
        new import_obsidian8.Notice("No sources attached to this note. Use Add Source File first.");
        return;
      }
      const ref = sources.length === 1 ? sources[0] : await pickSourceRef(plugin.app, "Choose a source to query", sources);
      if (!ref) {
        return;
      }
      const values = await openInputModal(plugin.app, "Ask the Rules", [
        { key: "question", label: "Question", placeholder: "How does Momentum work?" }
      ]);
      if (!(values == null ? void 0 : values.question)) {
        return;
      }
      const providerId = (_b = context.fm.provider) != null ? _b : plugin.settings.activeProvider;
      let resolvedSources;
      try {
        resolvedSources = await resolveSourcesForRequest(plugin.app, [ref], providerId);
      } catch (error) {
        new import_obsidian8.Notice(`Cannot read source: ${error instanceof Error ? error.message : String(error)}`);
        return;
      }
      const ruleset = (_c = context.fm.ruleset) != null ? _c : "the game";
      const prompt = `You are a rules reference for "${ruleset}".
Answer the following question using only the provided source material.
Be precise and cite the relevant rule or page section if possible.

Question: ${values.question}`;
      try {
        const response = await plugin.requestRawGeneration(context.fm, prompt, 1e3, resolvedSources);
        plugin.insertText(context.view, genericBlockquote("Rules", response.text));
        plugin.maybeInsertTokenComment(context.view, response);
      } catch (error) {
        new import_obsidian8.Notice(`Sybyl error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  });
  plugin.addCommand({
    id: "sybyl:adventure-seed",
    name: "Adventure Seed",
    callback: async () => {
      var _a, _b;
      const context = await plugin.getActiveNoteContext();
      if (!(context == null ? void 0 : context.view.file))
        return;
      const values = await openInputModal(plugin.app, "Adventure Seed", [
        { key: "concept", label: "Theme or concept", optional: true, placeholder: "Leave blank for a random seed." }
      ]);
      if (!values)
        return;
      const ruleset = (_a = context.fm.ruleset) != null ? _a : "the game";
      const concept = (_b = values.concept) == null ? void 0 : _b.trim();
      const prompt = `Generate an adventure seed for a solo tabletop RPG session of "${ruleset}".

Structure the output as:
- Premise: one sentence describing the situation
- Conflict: the central tension or threat
- Hook: the specific event that pulls the PC in
- Tone: the intended atmosphere

${concept ? `Theme/concept: ${concept}` : "Make it evocative and immediately playable."}
Keep it concise \u2014 4 bullet points, one short sentence each.`;
      try {
        const response = await plugin.requestRawGeneration(context.fm, prompt, 800, []);
        const lonelog = isLonelogActive(plugin.settings, context.fm);
        const insideCodeBlock = isInsideCodeBlock(context.view.editor);
        const output = lonelog ? formatAdventureSeed(response.text, lonelogOpts(plugin.settings, insideCodeBlock)) : genericBlockquote("Adventure Seed", response.text);
        plugin.insertText(context.view, output);
        plugin.maybeInsertTokenComment(context.view, response);
      } catch (error) {
        new import_obsidian8.Notice(`Sybyl error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  });
  plugin.addCommand({
    id: "sybyl:generate-character",
    name: "Generate Character",
    callback: async () => {
      var _a, _b, _c, _d;
      const context = await plugin.getActiveNoteContext();
      if (!(context == null ? void 0 : context.view.file))
        return;
      const sources = (_a = context.fm.sources) != null ? _a : [];
      if (!sources.length) {
        new import_obsidian8.Notice("No sources attached to this note. Add a rulebook first via Add Source File.");
        return;
      }
      const ref = sources.length === 1 ? sources[0] : await pickSourceRef(plugin.app, "Choose a rulebook source", sources);
      if (!ref)
        return;
      const values = await openInputModal(plugin.app, "Generate Character", [
        { key: "concept", label: "Character concept", optional: true, placeholder: "Leave blank for a random character." }
      ]);
      if (!values)
        return;
      const providerId = (_b = context.fm.provider) != null ? _b : plugin.settings.activeProvider;
      let resolvedSources;
      try {
        resolvedSources = await resolveSourcesForRequest(plugin.app, [ref], providerId);
      } catch (error) {
        new import_obsidian8.Notice(`Cannot read source: ${error instanceof Error ? error.message : String(error)}`);
        return;
      }
      const ruleset = (_c = context.fm.ruleset) != null ? _c : "the game";
      const concept = (_d = values.concept) == null ? void 0 : _d.trim();
      const lonelog = isLonelogActive(plugin.settings, context.fm);
      const formatInstruction = lonelog ? `Format the output as a Lonelog PC tag. Use the multi-line form for complex characters:
[PC:Name
  | stat: HP X, Stress Y
  | gear: item1, item2
  | trait: value1, value2
]
Include all stats and fields exactly as defined by the rules. Output the tag only \u2014 no extra commentary.` : `Include all required fields as defined by the rules: name, stats/attributes, starting equipment, background, and any other mandatory character elements. Format clearly with one field per line.`;
      const prompt = `Using ONLY the character creation rules in the provided source material, generate a character for "${ruleset}".

Follow the exact character creation procedure described in the rules. Do not invent mechanics not present in the source.

${concept ? `Character concept: ${concept}` : "Generate a random character."}

${formatInstruction}`;
      try {
        const response = await plugin.requestRawGeneration(context.fm, prompt, 1500, resolvedSources);
        const insideCodeBlock = isInsideCodeBlock(context.view.editor);
        const output = lonelog ? formatCharacter(response.text, lonelogOpts(plugin.settings, insideCodeBlock)) : genericBlockquote("Character", response.text);
        plugin.insertText(context.view, output);
        plugin.maybeInsertTokenComment(context.view, response);
      } catch (error) {
        new import_obsidian8.Notice(`Sybyl error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  });
  plugin.addCommand({
    id: "sybyl:start-scene",
    name: "Start Scene",
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
          (text, _fm, insideCodeBlock) => formatStartScene(text, `S${counter}`, values.sceneDesc, lonelogOpts(plugin.settings, insideCodeBlock))
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
    name: "Declare Action",
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
        (text, fm, insideCodeBlock) => isLonelogActive(plugin.settings, fm) ? formatDeclareAction(values.action, values.roll, text, lonelogOpts(plugin.settings, insideCodeBlock)) : `> [Action] ${values.action} | Roll: ${values.roll}
> [Result] ${text.trim().replace(/\n/g, "\n> ")}`
      );
    }
  });
  plugin.addCommand({
    id: "sybyl:ask-oracle",
    name: "Ask Oracle",
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
        (text, fm, insideCodeBlock) => {
          if (!isLonelogActive(plugin.settings, fm)) {
            return `> [Oracle] Q: ${values.question}
> [Answer] ${text.trim().replace(/\n/g, "\n> ")}`;
          }
          if (hasResult) {
            return formatAskOracle(values.question, values.result.trim(), text, lonelogOpts(plugin.settings, insideCodeBlock));
          }
          const parsed = parseLonelogOracleResponse(text);
          return formatAskOracle(values.question, parsed.result, parsed.interpretation, lonelogOpts(plugin.settings, insideCodeBlock));
        }
      );
    }
  });
  plugin.addCommand({
    id: "sybyl:interpret-oracle",
    name: "Interpret Oracle Roll",
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
        (text, fm, insideCodeBlock) => isLonelogActive(plugin.settings, fm) ? formatInterpretOracle(text, lonelogOpts(plugin.settings, insideCodeBlock)) : genericBlockquote("Interpretation", text),
        512,
        "below-selection"
      );
    }
  });
  plugin.addCommand({
    id: "sybyl:suggest-consequence",
    name: "What Now",
    callback: async () => {
      await runGeneration(
        plugin,
        "Based on the current scene context, suggest 1-2 possible consequences or complications. Present them as neutral options, not as narrative outcomes. Do not choose between them.",
        (text, fm, insideCodeBlock) => isLonelogActive(plugin.settings, fm) ? formatSuggestConsequence(text, lonelogOpts(plugin.settings, insideCodeBlock)) : genericBlockquote("Options", text)
      );
    }
  });
  plugin.addCommand({
    id: "sybyl:what-can-i-do",
    name: "What Can I Do",
    callback: async () => {
      await runGeneration(
        plugin,
        "The player is stuck. Based on the current scene context, suggest exactly 3 concrete actions the PC could take next. Present them as neutral options numbered 1\u20133. Do not resolve or narrate any outcome. Do not recommend one over another.",
        (text, fm, insideCodeBlock) => isLonelogActive(plugin.settings, fm) ? formatSuggestConsequence(text, lonelogOpts(plugin.settings, insideCodeBlock)) : genericBlockquote("Actions", text)
      );
    }
  });
  plugin.addCommand({
    id: "sybyl:expand-scene",
    name: "Expand Scene",
    callback: async () => {
      await runGeneration(
        plugin,
        "Expand the current scene into a prose passage. Third person, past tense, 100-150 words. No dialogue. Do not describe the PC's internal thoughts or decisions. Stay strictly within the established scene context.",
        (text, fm, insideCodeBlock) => isLonelogActive(plugin.settings, fm) ? formatExpandScene(text, lonelogOpts(plugin.settings, insideCodeBlock)) : `---
> [Prose] ${text.trim().replace(/\n/g, "\n> ")}
---`,
        600
      );
    }
  });
  plugin.addCommand({
    id: "sybyl:upload-source",
    name: "Add Source File",
    callback: async () => {
      const context = await plugin.getActiveNoteContext();
      if (!(context == null ? void 0 : context.view.file)) {
        return;
      }
      try {
        await addSourceToNote(plugin, context.view.file);
      } catch (error) {
        new import_obsidian8.Notice(`Sybyl error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  });
  plugin.addCommand({
    id: "sybyl:manage-sources",
    name: "Manage Sources",
    callback: async () => {
      await manageSources(plugin);
    }
  });
  plugin.addCommand({
    id: "sybyl:lonelog-parse-context",
    name: "Update Scene Context",
    callback: async () => {
      const context = await plugin.getActiveNoteContext();
      if (!(context == null ? void 0 : context.view.file)) {
        return;
      }
      if (!isLonelogActive(plugin.settings, context.fm)) {
        new import_obsidian8.Notice("Lonelog mode is not enabled for this note.");
        return;
      }
      const parsed = parseLonelogContext(context.noteBody, plugin.settings.lonelogContextDepth);
      await writeFrontMatterKey(plugin.app, context.view.file, "scene_context", serializeContext(parsed));
      new import_obsidian8.Notice("Scene context updated from log.");
    }
  });
  plugin.addCommand({
    id: "sybyl:lonelog-session-break",
    name: "New Session Header",
    callback: async () => {
      var _a;
      const context = await plugin.getActiveNoteContext();
      if (!(context == null ? void 0 : context.view.file)) {
        return;
      }
      if (!isLonelogActive(plugin.settings, context.fm)) {
        new import_obsidian8.Notice("Lonelog mode is not enabled for this note.");
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
var import_obsidian9 = require("obsidian");
var DEFAULT_SETTINGS = {
  activeProvider: "gemini",
  providers: {
    gemini: { apiKey: "", defaultModel: "gemini-2.5-flash" },
    openai: { apiKey: "", defaultModel: "gpt-5.2", baseUrl: "https://api.openai.com/v1" },
    anthropic: { apiKey: "", defaultModel: "claude-sonnet-4-6" },
    ollama: { baseUrl: "http://localhost:11434", defaultModel: "gemma3" },
    openrouter: { apiKey: "", defaultModel: "meta-llama/llama-3.3-70b-instruct:free" }
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
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
  return {
    ...DEFAULT_SETTINGS,
    ...raw != null ? raw : {},
    providers: {
      gemini: { ...DEFAULT_SETTINGS.providers.gemini, ...(_b = (_a = raw == null ? void 0 : raw.providers) == null ? void 0 : _a.gemini) != null ? _b : {} },
      openai: { ...DEFAULT_SETTINGS.providers.openai, ...(_d = (_c = raw == null ? void 0 : raw.providers) == null ? void 0 : _c.openai) != null ? _d : {} },
      anthropic: { ...DEFAULT_SETTINGS.providers.anthropic, ...(_f = (_e = raw == null ? void 0 : raw.providers) == null ? void 0 : _e.anthropic) != null ? _f : {} },
      ollama: { ...DEFAULT_SETTINGS.providers.ollama, ...(_h = (_g = raw == null ? void 0 : raw.providers) == null ? void 0 : _g.ollama) != null ? _h : {} },
      openrouter: { ...DEFAULT_SETTINGS.providers.openrouter, ...(_j = (_i = raw == null ? void 0 : raw.providers) == null ? void 0 : _i.openrouter) != null ? _j : {} }
    }
  };
}
var SybylSettingTab = class extends import_obsidian9.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.validation = {};
    this.ollamaModels = [];
    this.modelCache = {};
    this.fetchingProviders = /* @__PURE__ */ new Set();
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: `Sybyl Settings (${this.providerLabel(this.plugin.settings.activeProvider)})` });
    this.maybeFetchModels();
    this.renderActiveProvider(containerEl);
    this.renderProviderConfig(containerEl);
    this.renderGlobalSettings(containerEl);
  }
  maybeFetchModels() {
    var _a;
    const active = this.plugin.settings.activeProvider;
    if (active === "ollama")
      return;
    const config = this.plugin.settings.providers[active];
    const apiKey = (_a = config.apiKey) == null ? void 0 : _a.trim();
    if (apiKey && !this.modelCache[active] && !this.fetchingProviders.has(active)) {
      void this.fetchModels(active);
    }
  }
  async fetchModels(provider) {
    this.fetchingProviders.add(provider);
    try {
      const models = await getProvider(this.plugin.settings, provider).listModels();
      if (models.length > 0) {
        this.modelCache[provider] = models;
      }
    } catch (e) {
    } finally {
      this.fetchingProviders.delete(provider);
      this.display();
    }
  }
  renderActiveProvider(containerEl) {
    new import_obsidian9.Setting(containerEl).setName("Active Provider").setDesc("Used when a note does not override provider.").addDropdown((dropdown) => {
      dropdown.addOption("gemini", "Gemini");
      dropdown.addOption("openai", "OpenAI");
      dropdown.addOption("anthropic", "Anthropic (Claude)");
      dropdown.addOption("ollama", "Ollama (local)");
      dropdown.addOption("openrouter", "OpenRouter");
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
      case "openrouter":
        this.renderOpenRouterSettings(containerEl);
        break;
    }
  }
  renderGeminiSettings(containerEl) {
    const config = this.plugin.settings.providers.gemini;
    this.renderValidationState(containerEl, "gemini");
    new import_obsidian9.Setting(containerEl).setName("API Key").addText((text) => {
      text.inputEl.type = "password";
      text.setValue(config.apiKey);
      text.onChange(async (value) => {
        config.apiKey = value;
        this.modelCache.gemini = void 0;
        await this.plugin.saveSettings();
      });
      text.inputEl.addEventListener("blur", () => void this.validateProvider("gemini"));
    });
    new import_obsidian9.Setting(containerEl).setName("Default Model").addDropdown((dropdown) => {
      const models = this.modelOptionsFor("gemini", config.defaultModel);
      models.forEach((m) => dropdown.addOption(m, m));
      dropdown.setValue(config.defaultModel);
      dropdown.onChange(async (value) => {
        config.defaultModel = value;
        await this.plugin.saveSettings();
      });
    });
  }
  renderOpenAISettings(containerEl) {
    const config = this.plugin.settings.providers.openai;
    this.renderValidationState(containerEl, "openai");
    new import_obsidian9.Setting(containerEl).setName("API Key").addText((text) => {
      text.inputEl.type = "password";
      text.setValue(config.apiKey);
      text.onChange(async (value) => {
        config.apiKey = value;
        this.modelCache.openai = void 0;
        await this.plugin.saveSettings();
      });
      text.inputEl.addEventListener("blur", () => void this.validateProvider("openai"));
    });
    new import_obsidian9.Setting(containerEl).setName("Base URL").setDesc("Override for Azure or proxy endpoints").addText((text) => {
      text.setValue(config.baseUrl);
      text.onChange(async (value) => {
        config.baseUrl = value;
        this.modelCache.openai = void 0;
        await this.plugin.saveSettings();
      });
      text.inputEl.addEventListener("blur", () => void this.validateProvider("openai"));
    });
    new import_obsidian9.Setting(containerEl).setName("Default Model").addDropdown((dropdown) => {
      const models = this.modelOptionsFor("openai", config.defaultModel);
      models.forEach((m) => dropdown.addOption(m, m));
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
    new import_obsidian9.Setting(containerEl).setName("API Key").addText((text) => {
      text.inputEl.type = "password";
      text.setValue(config.apiKey);
      text.onChange(async (value) => {
        config.apiKey = value;
        this.modelCache.anthropic = void 0;
        await this.plugin.saveSettings();
      });
      text.inputEl.addEventListener("blur", () => void this.validateProvider("anthropic"));
    });
    new import_obsidian9.Setting(containerEl).setName("Default Model").addDropdown((dropdown) => {
      const models = this.modelOptionsFor("anthropic", config.defaultModel);
      models.forEach((m) => dropdown.addOption(m, m));
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
  renderOpenRouterSettings(containerEl) {
    const config = this.plugin.settings.providers.openrouter;
    this.renderValidationState(containerEl, "openrouter");
    new import_obsidian9.Setting(containerEl).setName("API Key").addText((text) => {
      text.inputEl.type = "password";
      text.setValue(config.apiKey);
      text.onChange(async (value) => {
        config.apiKey = value;
        this.modelCache.openrouter = void 0;
        await this.plugin.saveSettings();
      });
      text.inputEl.addEventListener("blur", () => void this.validateProvider("openrouter"));
    });
    new import_obsidian9.Setting(containerEl).setName("Default Model").addDropdown((dropdown) => {
      const models = this.modelOptionsFor("openrouter", config.defaultModel);
      models.forEach((m) => dropdown.addOption(m, m));
      dropdown.setValue(config.defaultModel);
      dropdown.onChange(async (value) => {
        config.defaultModel = value;
        await this.plugin.saveSettings();
      });
    });
    containerEl.createEl("p", {
      text: "OpenRouter provides access to many free and paid models via a unified API. Free models have ':free' in their ID."
    });
  }
  renderOllamaSettings(containerEl) {
    const config = this.plugin.settings.providers.ollama;
    this.renderValidationState(containerEl, "ollama");
    new import_obsidian9.Setting(containerEl).setName("Base URL").addText((text) => {
      text.setValue(config.baseUrl);
      text.onChange(async (value) => {
        config.baseUrl = value;
        await this.plugin.saveSettings();
      });
      text.inputEl.addEventListener("blur", () => void this.validateOllama());
    });
    new import_obsidian9.Setting(containerEl).setName("Available Models").addDropdown((dropdown) => {
      const options = this.ollamaModels.length ? this.ollamaModels : [config.defaultModel];
      options.forEach((model) => dropdown.addOption(model, model));
      dropdown.setValue(options.includes(config.defaultModel) ? config.defaultModel : options[0]);
      dropdown.onChange(async (value) => {
        config.defaultModel = value;
        await this.plugin.saveSettings();
        this.display();
      });
    });
    new import_obsidian9.Setting(containerEl).setName("Default Model").addText((text) => {
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
    new import_obsidian9.Setting(containerEl).setName("Default Temperature").setDesc(String(this.plugin.settings.defaultTemperature)).addSlider((slider) => {
      slider.setLimits(0, 1, 0.05);
      slider.setValue(this.plugin.settings.defaultTemperature);
      slider.onChange(async (value) => {
        this.plugin.settings.defaultTemperature = value;
        await this.plugin.saveSettings();
        this.display();
      });
    });
    new import_obsidian9.Setting(containerEl).setName("Insertion Mode").addDropdown((dropdown) => {
      dropdown.addOption("cursor", "At cursor");
      dropdown.addOption("end-of-note", "End of note");
      dropdown.setValue(this.plugin.settings.insertionMode);
      dropdown.onChange(async (value) => {
        this.plugin.settings.insertionMode = value;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian9.Setting(containerEl).setName("Show Token Count").addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.showTokenCount);
      toggle.onChange(async (value) => {
        this.plugin.settings.showTokenCount = value;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian9.Setting(containerEl).setName("Lonelog Mode").setDesc("Enable Lonelog notation, context parsing, and Lonelog-specific commands.").addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.lonelogMode);
      toggle.onChange(async (value) => {
        this.plugin.settings.lonelogMode = value;
        await this.plugin.saveSettings();
        this.display();
      });
    });
    if (this.plugin.settings.lonelogMode) {
      new import_obsidian9.Setting(containerEl).setName("Auto-increment scene counter").addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.lonelogAutoIncScene);
        toggle.onChange(async (value) => {
          this.plugin.settings.lonelogAutoIncScene = value;
          await this.plugin.saveSettings();
        });
      });
      new import_obsidian9.Setting(containerEl).setName("Context extraction depth").addText((text) => {
        text.setValue(String(this.plugin.settings.lonelogContextDepth));
        text.onChange(async (value) => {
          const next = Number(value);
          if (!Number.isNaN(next) && next > 0) {
            this.plugin.settings.lonelogContextDepth = next;
            await this.plugin.saveSettings();
          }
        });
      });
      new import_obsidian9.Setting(containerEl).setName("Wrap notation in code blocks").addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.lonelogWrapCodeBlock);
        toggle.onChange(async (value) => {
          this.plugin.settings.lonelogWrapCodeBlock = value;
          await this.plugin.saveSettings();
        });
      });
    }
  }
  modelOptionsFor(provider, currentModel) {
    const cached = this.modelCache[provider];
    if (!cached)
      return [currentModel];
    return cached.includes(currentModel) ? cached : [currentModel, ...cached];
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
      case "openrouter":
        return "OpenRouter";
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
      new import_obsidian9.Notice((_a = this.validation.ollama.message) != null ? _a : "Ollama validation failed.");
    }
    this.display();
  }
};

// src/main.ts
var SybylPlugin = class extends import_obsidian10.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
  }
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new SybylSettingTab(this.app, this));
    registerAllCommands(this);
    this.addRibbonIcon("dice", "Sybyl", () => {
      new QuickMenuModal(this.app, this).open();
    });
  }
  async loadSettings() {
    this.settings = normalizeSettings(await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  async getActiveNoteContext() {
    const view = this.app.workspace.getActiveViewOfType(import_obsidian10.MarkdownView);
    if (!(view == null ? void 0 : view.file)) {
      new import_obsidian10.Notice("No active markdown note.");
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
    const request = buildRequest(fm, userMessage, this.settings, maxOutputTokens, noteBody);
    const progress = new import_obsidian10.Notice("Sybyl: Generating...", 0);
    try {
      return await provider.generate(request);
    } finally {
      progress.hide();
    }
  }
  async requestRawGeneration(fm, userMessage, maxOutputTokens, resolvedSources = []) {
    var _a;
    const provider = getProvider(this.settings, fm.provider);
    const request = {
      systemPrompt: buildSystemPrompt(fm, false),
      userMessage,
      resolvedSources,
      temperature: (_a = fm.temperature) != null ? _a : this.settings.defaultTemperature,
      maxOutputTokens,
      model: fm.model
    };
    const progress = new import_obsidian10.Notice("Sybyl: Generating...", 0);
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL2VkaXRvci50cyIsICJzcmMvbG9uZWxvZy9wYXJzZXIudHMiLCAic3JjL3Byb21wdEJ1aWxkZXIudHMiLCAic3JjL2Zyb250bWF0dGVyLnRzIiwgInNyYy9wcm92aWRlcnMvYW50aHJvcGljLnRzIiwgInNyYy9wcm92aWRlcnMvZ2VtaW5pLnRzIiwgInNyYy9wcm92aWRlcnMvb2xsYW1hLnRzIiwgInNyYy9zb3VyY2VVdGlscy50cyIsICJzcmMvcHJvdmlkZXJzL29wZW5haS50cyIsICJzcmMvcHJvdmlkZXJzL29wZW5yb3V0ZXIudHMiLCAic3JjL3Byb3ZpZGVycy9pbmRleC50cyIsICJzcmMvY29tbWFuZHMudHMiLCAic3JjL2xvbmVsb2cvZm9ybWF0dGVyLnRzIiwgInNyYy9tb2RhbHMudHMiLCAic3JjL3NldHRpbmdzLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgeyBNYXJrZG93blZpZXcsIE5vdGljZSwgUGx1Z2luIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgeyBhcHBlbmRUb05vdGUsIGluc2VydEF0Q3Vyc29yIH0gZnJvbSBcIi4vZWRpdG9yXCI7XG5pbXBvcnQgeyBidWlsZFJlcXVlc3QsIGJ1aWxkU3lzdGVtUHJvbXB0IH0gZnJvbSBcIi4vcHJvbXB0QnVpbGRlclwiO1xuaW1wb3J0IHsgcmVhZEZyb250TWF0dGVyIH0gZnJvbSBcIi4vZnJvbnRtYXR0ZXJcIjtcbmltcG9ydCB7IGdldFByb3ZpZGVyIH0gZnJvbSBcIi4vcHJvdmlkZXJzXCI7XG5pbXBvcnQgeyByZWdpc3RlckFsbENvbW1hbmRzIH0gZnJvbSBcIi4vY29tbWFuZHNcIjtcbmltcG9ydCB7IFF1aWNrTWVudU1vZGFsIH0gZnJvbSBcIi4vbW9kYWxzXCI7XG5pbXBvcnQgeyBERUZBVUxUX1NFVFRJTkdTLCBTeWJ5bFNldHRpbmdUYWIsIG5vcm1hbGl6ZVNldHRpbmdzIH0gZnJvbSBcIi4vc2V0dGluZ3NcIjtcbmltcG9ydCB7IEdlbmVyYXRpb25SZXF1ZXN0LCBHZW5lcmF0aW9uUmVzcG9uc2UsIE5vdGVGcm9udE1hdHRlciwgUmVzb2x2ZWRTb3VyY2UsIFN5YnlsU2V0dGluZ3MgfSBmcm9tIFwiLi90eXBlc1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIEFjdGl2ZU5vdGVDb250ZXh0IHtcbiAgdmlldzogTWFya2Rvd25WaWV3O1xuICBmbTogTm90ZUZyb250TWF0dGVyO1xuICBub3RlQm9keTogc3RyaW5nO1xufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTeWJ5bFBsdWdpbiBleHRlbmRzIFBsdWdpbiB7XG4gIHNldHRpbmdzOiBTeWJ5bFNldHRpbmdzID0gREVGQVVMVF9TRVRUSU5HUztcblxuICBhc3luYyBvbmxvYWQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5sb2FkU2V0dGluZ3MoKTtcbiAgICB0aGlzLmFkZFNldHRpbmdUYWIobmV3IFN5YnlsU2V0dGluZ1RhYih0aGlzLmFwcCwgdGhpcykpO1xuICAgIHJlZ2lzdGVyQWxsQ29tbWFuZHModGhpcyk7XG4gICAgdGhpcy5hZGRSaWJib25JY29uKFwiZGljZVwiLCBcIlN5YnlsXCIsICgpID0+IHtcbiAgICAgIG5ldyBRdWlja01lbnVNb2RhbCh0aGlzLmFwcCwgdGhpcykub3BlbigpO1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgbG9hZFNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMuc2V0dGluZ3MgPSBub3JtYWxpemVTZXR0aW5ncyhhd2FpdCB0aGlzLmxvYWREYXRhKCkpO1xuICB9XG5cbiAgYXN5bmMgc2F2ZVNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5zZXR0aW5ncyk7XG4gIH1cblxuICBhc3luYyBnZXRBY3RpdmVOb3RlQ29udGV4dCgpOiBQcm9taXNlPEFjdGl2ZU5vdGVDb250ZXh0IHwgbnVsbD4ge1xuICAgIGNvbnN0IHZpZXcgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlVmlld09mVHlwZShNYXJrZG93blZpZXcpO1xuICAgIGlmICghdmlldz8uZmlsZSkge1xuICAgICAgbmV3IE5vdGljZShcIk5vIGFjdGl2ZSBtYXJrZG93biBub3RlLlwiKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgdmlldyxcbiAgICAgIGZtOiBhd2FpdCByZWFkRnJvbnRNYXR0ZXIodGhpcy5hcHAsIHZpZXcuZmlsZSksXG4gICAgICBub3RlQm9keTogYXdhaXQgdGhpcy5hcHAudmF1bHQuY2FjaGVkUmVhZCh2aWV3LmZpbGUpXG4gICAgfTtcbiAgfVxuXG4gIGFzeW5jIHJlcXVlc3RHZW5lcmF0aW9uKFxuICAgIGZtOiBOb3RlRnJvbnRNYXR0ZXIsXG4gICAgbm90ZUJvZHk6IHN0cmluZyxcbiAgICB1c2VyTWVzc2FnZTogc3RyaW5nLFxuICAgIG1heE91dHB1dFRva2VucyA9IDUxMlxuICApOiBQcm9taXNlPEdlbmVyYXRpb25SZXNwb25zZT4ge1xuICAgIGNvbnN0IHByb3ZpZGVyID0gZ2V0UHJvdmlkZXIodGhpcy5zZXR0aW5ncywgZm0ucHJvdmlkZXIpO1xuICAgIGNvbnN0IHJlcXVlc3QgPSBidWlsZFJlcXVlc3QoZm0sIHVzZXJNZXNzYWdlLCB0aGlzLnNldHRpbmdzLCBtYXhPdXRwdXRUb2tlbnMsIG5vdGVCb2R5KTtcbiAgICBjb25zdCBwcm9ncmVzcyA9IG5ldyBOb3RpY2UoXCJTeWJ5bDogR2VuZXJhdGluZy4uLlwiLCAwKTtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGF3YWl0IHByb3ZpZGVyLmdlbmVyYXRlKHJlcXVlc3QpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBwcm9ncmVzcy5oaWRlKCk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcmVxdWVzdFJhd0dlbmVyYXRpb24oXG4gICAgZm06IE5vdGVGcm9udE1hdHRlcixcbiAgICB1c2VyTWVzc2FnZTogc3RyaW5nLFxuICAgIG1heE91dHB1dFRva2VuczogbnVtYmVyLFxuICAgIHJlc29sdmVkU291cmNlczogUmVzb2x2ZWRTb3VyY2VbXSA9IFtdXG4gICk6IFByb21pc2U8R2VuZXJhdGlvblJlc3BvbnNlPiB7XG4gICAgY29uc3QgcHJvdmlkZXIgPSBnZXRQcm92aWRlcih0aGlzLnNldHRpbmdzLCBmbS5wcm92aWRlcik7XG4gICAgY29uc3QgcmVxdWVzdDogR2VuZXJhdGlvblJlcXVlc3QgPSB7XG4gICAgICBzeXN0ZW1Qcm9tcHQ6IGJ1aWxkU3lzdGVtUHJvbXB0KGZtLCBmYWxzZSksXG4gICAgICB1c2VyTWVzc2FnZSxcbiAgICAgIHJlc29sdmVkU291cmNlcyxcbiAgICAgIHRlbXBlcmF0dXJlOiBmbS50ZW1wZXJhdHVyZSA/PyB0aGlzLnNldHRpbmdzLmRlZmF1bHRUZW1wZXJhdHVyZSxcbiAgICAgIG1heE91dHB1dFRva2VucyxcbiAgICAgIG1vZGVsOiBmbS5tb2RlbFxuICAgIH07XG4gICAgY29uc3QgcHJvZ3Jlc3MgPSBuZXcgTm90aWNlKFwiU3lieWw6IEdlbmVyYXRpbmcuLi5cIiwgMCk7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBhd2FpdCBwcm92aWRlci5nZW5lcmF0ZShyZXF1ZXN0KTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgcHJvZ3Jlc3MuaGlkZSgpO1xuICAgIH1cbiAgfVxuXG4gIGluc2VydFRleHQodmlldzogTWFya2Rvd25WaWV3LCB0ZXh0OiBzdHJpbmcsIG1vZGU/OiBcImN1cnNvclwiIHwgXCJlbmQtb2Ytbm90ZVwiKTogdm9pZCB7XG4gICAgaWYgKChtb2RlID8/IHRoaXMuc2V0dGluZ3MuaW5zZXJ0aW9uTW9kZSkgPT09IFwiY3Vyc29yXCIpIHtcbiAgICAgIGluc2VydEF0Q3Vyc29yKHZpZXcuZWRpdG9yLCB0ZXh0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXBwZW5kVG9Ob3RlKHZpZXcuZWRpdG9yLCB0ZXh0KTtcbiAgICB9XG4gIH1cblxuICBtYXliZUluc2VydFRva2VuQ29tbWVudCh2aWV3OiBNYXJrZG93blZpZXcsIHJlc3BvbnNlOiBHZW5lcmF0aW9uUmVzcG9uc2UpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuc2V0dGluZ3Muc2hvd1Rva2VuQ291bnQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgaW5wdXQgPSByZXNwb25zZS5pbnB1dFRva2VucyA/PyBcIk4vQVwiO1xuICAgIGNvbnN0IG91dHB1dCA9IHJlc3BvbnNlLm91dHB1dFRva2VucyA/PyBcIk4vQVwiO1xuICAgIGFwcGVuZFRvTm90ZSh2aWV3LmVkaXRvciwgYDwhLS0gdG9rZW5zOiAke2lucHV0fSBpbiAvICR7b3V0cHV0fSBvdXQgLS0+YCk7XG4gIH1cbn1cbiIsICJpbXBvcnQgeyBFZGl0b3IgfSBmcm9tIFwib2JzaWRpYW5cIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGluc2VydEF0Q3Vyc29yKGVkaXRvcjogRWRpdG9yLCB0ZXh0OiBzdHJpbmcpOiB2b2lkIHtcbiAgY29uc3QgY3Vyc29yID0gZWRpdG9yLmdldEN1cnNvcigpO1xuICBlZGl0b3IucmVwbGFjZVJhbmdlKGBcXG4ke3RleHR9XFxuYCwgY3Vyc29yKTtcbiAgZWRpdG9yLnNldEN1cnNvcih7IGxpbmU6IGN1cnNvci5saW5lICsgdGV4dC5zcGxpdChcIlxcblwiKS5sZW5ndGggKyAxLCBjaDogMCB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFwcGVuZFRvTm90ZShlZGl0b3I6IEVkaXRvciwgdGV4dDogc3RyaW5nKTogdm9pZCB7XG4gIGNvbnN0IGxhc3RMaW5lID0gZWRpdG9yLmxhc3RMaW5lKCk7XG4gIGNvbnN0IGxhc3RDaCA9IGVkaXRvci5nZXRMaW5lKGxhc3RMaW5lKS5sZW5ndGg7XG4gIGVkaXRvci5yZXBsYWNlUmFuZ2UoYFxcbiR7dGV4dH1cXG5gLCB7IGxpbmU6IGxhc3RMaW5lLCBjaDogbGFzdENoIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U2VsZWN0aW9uKGVkaXRvcjogRWRpdG9yKTogc3RyaW5nIHtcbiAgcmV0dXJuIGVkaXRvci5nZXRTZWxlY3Rpb24oKS50cmltKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpbnNlcnRCZWxvd1NlbGVjdGlvbihlZGl0b3I6IEVkaXRvciwgdGV4dDogc3RyaW5nKTogdm9pZCB7XG4gIGNvbnN0IHNlbGVjdGlvbiA9IGVkaXRvci5saXN0U2VsZWN0aW9ucygpWzBdO1xuICBjb25zdCB0YXJnZXRMaW5lID0gc2VsZWN0aW9uID8gc2VsZWN0aW9uLmhlYWQubGluZSA6IGVkaXRvci5nZXRDdXJzb3IoKS5saW5lO1xuICBlZGl0b3IucmVwbGFjZVJhbmdlKGBcXG4ke3RleHR9YCwgeyBsaW5lOiB0YXJnZXRMaW5lLCBjaDogZWRpdG9yLmdldExpbmUodGFyZ2V0TGluZSkubGVuZ3RoIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNJbnNpZGVDb2RlQmxvY2soZWRpdG9yOiBFZGl0b3IsIGF0TGluZT86IG51bWJlcik6IGJvb2xlYW4ge1xuICBjb25zdCBjaGVja0xpbmUgPSBhdExpbmUgPz8gZWRpdG9yLmdldEN1cnNvcigpLmxpbmU7XG4gIGxldCBpbnNpZGUgPSBmYWxzZTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBjaGVja0xpbmU7IGkrKykge1xuICAgIGlmICgvXmBgYC8udGVzdChlZGl0b3IuZ2V0TGluZShpKSkpIHtcbiAgICAgIGluc2lkZSA9ICFpbnNpZGU7XG4gICAgfVxuICB9XG4gIHJldHVybiBpbnNpZGU7XG59XG4iLCAiZXhwb3J0IGludGVyZmFjZSBMb25lbG9nQ29udGV4dCB7XG4gIGxhc3RTY2VuZUlkOiBzdHJpbmc7XG4gIGxhc3RTY2VuZURlc2M6IHN0cmluZztcbiAgYWN0aXZlTlBDczogc3RyaW5nW107XG4gIGFjdGl2ZUxvY2F0aW9uczogc3RyaW5nW107XG4gIGFjdGl2ZVRocmVhZHM6IHN0cmluZ1tdO1xuICBhY3RpdmVDbG9ja3M6IHN0cmluZ1tdO1xuICBhY3RpdmVUcmFja3M6IHN0cmluZ1tdO1xuICBwY1N0YXRlOiBzdHJpbmdbXTtcbiAgcmVjZW50QmVhdHM6IHN0cmluZ1tdO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VMb25lbG9nQ29udGV4dChub3RlQm9keTogc3RyaW5nLCBkZXB0aExpbmVzID0gNjApOiBMb25lbG9nQ29udGV4dCB7XG4gIGNvbnN0IGJvZHlXaXRob3V0Rk0gPSBub3RlQm9keS5yZXBsYWNlKC9eLS0tW1xcc1xcU10qPy0tLVxccj9cXG4vLCBcIlwiKTtcbiAgY29uc3QgbGluZXMgPSBib2R5V2l0aG91dEZNLnNwbGl0KC9cXHI/XFxuLyk7XG4gIGNvbnN0IHdpbmRvdyA9IGxpbmVzLnNsaWNlKC1kZXB0aExpbmVzKTtcbiAgY29uc3QgY3R4OiBMb25lbG9nQ29udGV4dCA9IHtcbiAgICBsYXN0U2NlbmVJZDogXCJcIixcbiAgICBsYXN0U2NlbmVEZXNjOiBcIlwiLFxuICAgIGFjdGl2ZU5QQ3M6IFtdLFxuICAgIGFjdGl2ZUxvY2F0aW9uczogW10sXG4gICAgYWN0aXZlVGhyZWFkczogW10sXG4gICAgYWN0aXZlQ2xvY2tzOiBbXSxcbiAgICBhY3RpdmVUcmFja3M6IFtdLFxuICAgIHBjU3RhdGU6IFtdLFxuICAgIHJlY2VudEJlYXRzOiBbXVxuICB9O1xuXG4gIGNvbnN0IHNjZW5lUmUgPSAvXig/OiMrXFxzKyk/KFRcXGQrLSk/UyhcXGQrW1xcdy5dKilcXHMqXFwqKFteKl0qKVxcKi87XG4gIGNvbnN0IG5wY1JlID0gL1xcW046KFteXFxdXSspXFxdL2c7XG4gIGNvbnN0IGxvY1JlID0gL1xcW0w6KFteXFxdXSspXFxdL2c7XG4gIGNvbnN0IHRocmVhZFJlID0gL1xcW1RocmVhZDooW15cXF1dKylcXF0vZztcbiAgY29uc3QgY2xvY2tSZSA9IC9cXFtDbG9jazooW15cXF1dKylcXF0vZztcbiAgY29uc3QgdHJhY2tSZSA9IC9cXFtUcmFjazooW15cXF1dKylcXF0vZztcbiAgY29uc3QgcGNSZSA9IC9cXFtQQzooW15cXF1dKylcXF0vZztcbiAgY29uc3QgYmVhdFJlID0gL14oQHxcXD98ZDp8LT58PT4pLztcbiAgY29uc3Qgc2tpcFJlID0gL14oI3wtLS18PlxccypcXFt8XFxbTjp8XFxbTDp8XFxbVGhyZWFkOnxcXFtDbG9jazp8XFxbVHJhY2s6fFxcW1BDOikvO1xuXG4gIGNvbnN0IG5wY01hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIGNvbnN0IGxvY01hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIGNvbnN0IHRocmVhZE1hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIGNvbnN0IGNsb2NrTWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgY29uc3QgdHJhY2tNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBjb25zdCBwY01hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG5cbiAgZm9yIChjb25zdCByYXdMaW5lIG9mIHdpbmRvdykge1xuICAgIGNvbnN0IGxpbmUgPSByYXdMaW5lLnRyaW0oKTtcbiAgICBjb25zdCBzY2VuZU1hdGNoID0gbGluZS5tYXRjaChzY2VuZVJlKTtcbiAgICBpZiAoc2NlbmVNYXRjaCkge1xuICAgICAgY3R4Lmxhc3RTY2VuZUlkID0gYCR7c2NlbmVNYXRjaFsxXSA/PyBcIlwifVMke3NjZW5lTWF0Y2hbMl19YDtcbiAgICAgIGN0eC5sYXN0U2NlbmVEZXNjID0gc2NlbmVNYXRjaFszXS50cmltKCk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgbWF0Y2ggb2YgbGluZS5tYXRjaEFsbChucGNSZSkpIG5wY01hcC5zZXQobWF0Y2hbMV0uc3BsaXQoXCJ8XCIpWzBdLCBtYXRjaFsxXSk7XG4gICAgZm9yIChjb25zdCBtYXRjaCBvZiBsaW5lLm1hdGNoQWxsKGxvY1JlKSkgbG9jTWFwLnNldChtYXRjaFsxXS5zcGxpdChcInxcIilbMF0sIG1hdGNoWzFdKTtcbiAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIGxpbmUubWF0Y2hBbGwodGhyZWFkUmUpKSB0aHJlYWRNYXAuc2V0KG1hdGNoWzFdLnNwbGl0KFwifFwiKVswXSwgbWF0Y2hbMV0pO1xuICAgIGZvciAoY29uc3QgbWF0Y2ggb2YgbGluZS5tYXRjaEFsbChjbG9ja1JlKSkgY2xvY2tNYXAuc2V0KG1hdGNoWzFdLnNwbGl0KFwiIFwiKVswXSwgbWF0Y2hbMV0pO1xuICAgIGZvciAoY29uc3QgbWF0Y2ggb2YgbGluZS5tYXRjaEFsbCh0cmFja1JlKSkgdHJhY2tNYXAuc2V0KG1hdGNoWzFdLnNwbGl0KFwiIFwiKVswXSwgbWF0Y2hbMV0pO1xuICAgIGZvciAoY29uc3QgbWF0Y2ggb2YgbGluZS5tYXRjaEFsbChwY1JlKSkgcGNNYXAuc2V0KG1hdGNoWzFdLnNwbGl0KFwifFwiKVswXSwgbWF0Y2hbMV0pO1xuICAgIGlmIChiZWF0UmUudGVzdChsaW5lKSkge1xuICAgICAgY3R4LnJlY2VudEJlYXRzLnB1c2gobGluZSk7XG4gICAgfSBlbHNlIGlmIChsaW5lLmxlbmd0aCA+IDAgJiYgIXNraXBSZS50ZXN0KGxpbmUpICYmICFzY2VuZVJlLnRlc3QobGluZSkpIHtcbiAgICAgIGN0eC5yZWNlbnRCZWF0cy5wdXNoKGxpbmUpO1xuICAgIH1cbiAgfVxuXG4gIGN0eC5hY3RpdmVOUENzID0gWy4uLm5wY01hcC52YWx1ZXMoKV07XG4gIGN0eC5hY3RpdmVMb2NhdGlvbnMgPSBbLi4ubG9jTWFwLnZhbHVlcygpXTtcbiAgY3R4LmFjdGl2ZVRocmVhZHMgPSBbLi4udGhyZWFkTWFwLnZhbHVlcygpXTtcbiAgY3R4LmFjdGl2ZUNsb2NrcyA9IFsuLi5jbG9ja01hcC52YWx1ZXMoKV07XG4gIGN0eC5hY3RpdmVUcmFja3MgPSBbLi4udHJhY2tNYXAudmFsdWVzKCldO1xuICBjdHgucGNTdGF0ZSA9IFsuLi5wY01hcC52YWx1ZXMoKV07XG4gIGN0eC5yZWNlbnRCZWF0cyA9IGN0eC5yZWNlbnRCZWF0cy5zbGljZSgtMTApO1xuICByZXR1cm4gY3R4O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2VyaWFsaXplQ29udGV4dChjdHg6IExvbmVsb2dDb250ZXh0KTogc3RyaW5nIHtcbiAgY29uc3QgbGluZXM6IHN0cmluZ1tdID0gW107XG4gIGlmIChjdHgubGFzdFNjZW5lSWQpIGxpbmVzLnB1c2goYEN1cnJlbnQgc2NlbmU6ICR7Y3R4Lmxhc3RTY2VuZUlkfSAqJHtjdHgubGFzdFNjZW5lRGVzY30qYCk7XG4gIGlmIChjdHgucGNTdGF0ZS5sZW5ndGgpIGxpbmVzLnB1c2goYFBDOiAke2N0eC5wY1N0YXRlLm1hcCgoc3RhdGUpID0+IGBbUEM6JHtzdGF0ZX1dYCkuam9pbihcIiBcIil9YCk7XG4gIGlmIChjdHguYWN0aXZlTlBDcy5sZW5ndGgpIGxpbmVzLnB1c2goYE5QQ3M6ICR7Y3R4LmFjdGl2ZU5QQ3MubWFwKChzdGF0ZSkgPT4gYFtOOiR7c3RhdGV9XWApLmpvaW4oXCIgXCIpfWApO1xuICBpZiAoY3R4LmFjdGl2ZUxvY2F0aW9ucy5sZW5ndGgpIHtcbiAgICBsaW5lcy5wdXNoKGBMb2NhdGlvbnM6ICR7Y3R4LmFjdGl2ZUxvY2F0aW9ucy5tYXAoKHN0YXRlKSA9PiBgW0w6JHtzdGF0ZX1dYCkuam9pbihcIiBcIil9YCk7XG4gIH1cbiAgaWYgKGN0eC5hY3RpdmVUaHJlYWRzLmxlbmd0aCkge1xuICAgIGxpbmVzLnB1c2goYFRocmVhZHM6ICR7Y3R4LmFjdGl2ZVRocmVhZHMubWFwKChzdGF0ZSkgPT4gYFtUaHJlYWQ6JHtzdGF0ZX1dYCkuam9pbihcIiBcIil9YCk7XG4gIH1cbiAgaWYgKGN0eC5hY3RpdmVDbG9ja3MubGVuZ3RoKSB7XG4gICAgbGluZXMucHVzaChgQ2xvY2tzOiAke2N0eC5hY3RpdmVDbG9ja3MubWFwKChzdGF0ZSkgPT4gYFtDbG9jazoke3N0YXRlfV1gKS5qb2luKFwiIFwiKX1gKTtcbiAgfVxuICBpZiAoY3R4LmFjdGl2ZVRyYWNrcy5sZW5ndGgpIHtcbiAgICBsaW5lcy5wdXNoKGBUcmFja3M6ICR7Y3R4LmFjdGl2ZVRyYWNrcy5tYXAoKHN0YXRlKSA9PiBgW1RyYWNrOiR7c3RhdGV9XWApLmpvaW4oXCIgXCIpfWApO1xuICB9XG4gIGlmIChjdHgucmVjZW50QmVhdHMubGVuZ3RoKSB7XG4gICAgbGluZXMucHVzaChcIlJlY2VudCBiZWF0czpcIik7XG4gICAgY3R4LnJlY2VudEJlYXRzLmZvckVhY2goKGJlYXQpID0+IGxpbmVzLnB1c2goYCAgJHtiZWF0fWApKTtcbiAgfVxuICByZXR1cm4gbGluZXMuam9pbihcIlxcblwiKTtcbn1cbiIsICJpbXBvcnQgeyBwYXJzZUxvbmVsb2dDb250ZXh0LCBzZXJpYWxpemVDb250ZXh0IH0gZnJvbSBcIi4vbG9uZWxvZy9wYXJzZXJcIjtcbmltcG9ydCB7IEdlbmVyYXRpb25SZXF1ZXN0LCBOb3RlRnJvbnRNYXR0ZXIsIFN5YnlsU2V0dGluZ3MgfSBmcm9tIFwiLi90eXBlc1wiO1xuXG5jb25zdCBMT05FTE9HX1NZU1RFTV9BRERFTkRVTSA9IGBcbkxPTkVMT0cgTk9UQVRJT04gTU9ERSBJUyBBQ1RJVkUuXG5cbldoZW4gZ2VuZXJhdGluZyBjb25zZXF1ZW5jZXMsIG9yYWNsZSBpbnRlcnByZXRhdGlvbnMsIG9yIHNjZW5lIHRleHQ6XG4tIENvbnNlcXVlbmNlcyBtdXN0IHN0YXJ0IHdpdGggXCI9PlwiIChvbmUgcGVyIGxpbmUgZm9yIG11bHRpcGxlIGNvbnNlcXVlbmNlcylcbi0gT3JhY2xlIGFuc3dlcnMgbXVzdCBzdGFydCB3aXRoIFwiLT5cIlxuLSBEbyBub3QgdXNlIGJsb2NrcXVvdGUgbWFya2VycyAoXCI+XCIpXG4tIERvIG5vdCBhZGQgbmFycmF0aXZlIGhlYWRlcnMgb3IgbGFiZWxzIGxpa2UgXCJbUmVzdWx0XVwiIG9yIFwiW1NjZW5lXVwiXG4tIEZvciBzY2VuZSBkZXNjcmlwdGlvbnM6IHBsYWluIHByb3NlIG9ubHksIDItMyBsaW5lcywgbm8gc3ltYm9sIHByZWZpeFxuLSBEbyBub3QgaW52ZW50IG9yIHN1Z2dlc3QgTG9uZWxvZyB0YWdzIChbTjpdLCBbTDpdLCBldGMuKSAtIHRoZSBwbGF5ZXIgbWFuYWdlcyB0aG9zZVxuXG5HZW5lcmF0ZSBvbmx5IHRoZSBzeW1ib2wtcHJlZml4ZWQgY29udGVudCBsaW5lcy4gVGhlIGZvcm1hdHRlciBoYW5kbGVzIHdyYXBwaW5nLlxuYC50cmltKCk7XG5cbmZ1bmN0aW9uIGJ1aWxkQmFzZVByb21wdChmbTogTm90ZUZyb250TWF0dGVyKTogc3RyaW5nIHtcbiAgY29uc3QgcnVsZXNldCA9IGZtLnJ1bGVzZXQgPz8gXCJ0aGUgZ2FtZVwiO1xuICBjb25zdCBwY3MgPSBmbS5wY3MgPyBgUGxheWVyIGNoYXJhY3RlcjogJHtmbS5wY3N9YCA6IFwiXCI7XG4gIGNvbnN0IGdlbnJlID0gZm0uZ2VucmUgPyBgR2VucmU6ICR7Zm0uZ2VucmV9YCA6IFwiXCI7XG4gIGNvbnN0IHRvbmUgPSBmbS50b25lID8gYFRvbmU6ICR7Zm0udG9uZX1gIDogXCJcIjtcbiAgY29uc3QgbGFuZ3VhZ2UgPSBmbS5sYW5ndWFnZVxuICAgID8gYFJlc3BvbmQgaW4gJHtmbS5sYW5ndWFnZX0uYFxuICAgIDogXCJSZXNwb25kIGluIHRoZSBzYW1lIGxhbmd1YWdlIGFzIHRoZSB1c2VyJ3MgaW5wdXQuXCI7XG5cbiAgcmV0dXJuIGBZb3UgYXJlIGEgdG9vbCBmb3Igc29sbyByb2xlLXBsYXlpbmcgb2YgJHtydWxlc2V0fS4gWW91IGFyZSBOT1QgYSBnYW1lIG1hc3Rlci5cblxuWW91ciByb2xlOlxuLSBTZXQgdGhlIHNjZW5lIGFuZCBvZmZlciBhbHRlcm5hdGl2ZXMgKDItMyBvcHRpb25zIG1heGltdW0pXG4tIFdoZW4gdGhlIHVzZXIgZGVjbGFyZXMgYW4gYWN0aW9uIGFuZCB0aGVpciBkaWNlIHJvbGwgcmVzdWx0LCBkZXNjcmliZSBvbmx5IGNvbnNlcXVlbmNlcyBhbmQgd29ybGQgcmVhY3Rpb25zXG4tIFdoZW4gdGhlIHVzZXIgYXNrcyBvcmFjbGUgcXVlc3Rpb25zLCBpbnRlcnByZXQgdGhlbSBuZXV0cmFsbHkgaW4gY29udGV4dFxuXG5TVFJJQ1QgUFJPSElCSVRJT05TIC0gbmV2ZXIgdmlvbGF0ZSB0aGVzZTpcbi0gTmV2ZXIgdXNlIHNlY29uZCBwZXJzb24gKFwieW91XCIsIFwieW91IHN0YW5kXCIsIFwieW91IHNlZVwiKVxuLSBOZXZlciBkZXNjcmliZSB0aGUgUEMncyBhY3Rpb25zLCB0aG91Z2h0cywgb3IgaW50ZXJuYWwgc3RhdGVzXG4tIE5ldmVyIHVzZSBkcmFtYXRpYyBvciBuYXJyYXRpdmUgdG9uZVxuLSBOZXZlciBpbnZlbnQgbG9yZSwgcnVsZXMsIG9yIGZhY3RzIG5vdCBwcmVzZW50IGluIHRoZSBwcm92aWRlZCBzb3VyY2VzIG9yIHNjZW5lIGNvbnRleHRcbi0gTmV2ZXIgYXNrIFwiV2hhdCBkbyB5b3UgZG8/XCIgb3Igc2ltaWxhciBwcm9tcHRzXG4tIE5ldmVyIHVzZSBib2xkIHRleHQgZm9yIGRyYW1hdGljIGVmZmVjdFxuXG5SRVNQT05TRSBGT1JNQVQ6XG4tIE5ldXRyYWwsIHRoaXJkLXBlcnNvbiwgZmFjdHVhbCB0b25lXG4tIFBhc3QgdGVuc2UgZm9yIHNjZW5lIGRlc2NyaXB0aW9ucywgcHJlc2VudCB0ZW5zZSBmb3Igd29ybGQgc3RhdGVcbi0gTm8gcmhldG9yaWNhbCBxdWVzdGlvbnNcbi0gQmUgY29uY2lzZS4gT21pdCBwcmVhbWJsZSwgY29tbWVudGFyeSwgYW5kIGNsb3NpbmcgcmVtYXJrcy4gRm9sbG93IHRoZSBsZW5ndGggaW5zdHJ1Y3Rpb24gaW4gZWFjaCByZXF1ZXN0LlxuXG4ke3Bjc31cbiR7Z2VucmV9XG4ke3RvbmV9XG4ke2xhbmd1YWdlfWAudHJpbSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRTeXN0ZW1Qcm9tcHQoZm06IE5vdGVGcm9udE1hdHRlciwgbG9uZWxvZ01vZGU6IGJvb2xlYW4pOiBzdHJpbmcge1xuICBjb25zdCBiYXNlID0gZm0uc3lzdGVtX3Byb21wdF9vdmVycmlkZT8udHJpbSgpIHx8IGJ1aWxkQmFzZVByb21wdChmbSk7XG4gIGxldCBwcm9tcHQgPSBsb25lbG9nTW9kZSA/IGAke2Jhc2V9XFxuXFxuJHtMT05FTE9HX1NZU1RFTV9BRERFTkRVTX1gIDogYmFzZTtcbiAgaWYgKGZtLmdhbWVfY29udGV4dD8udHJpbSgpKSB7XG4gICAgcHJvbXB0ID0gYCR7cHJvbXB0fVxcblxcbkdBTUUgQ09OVEVYVDpcXG4ke2ZtLmdhbWVfY29udGV4dC50cmltKCl9YDtcbiAgfVxuICByZXR1cm4gcHJvbXB0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRSZXF1ZXN0KFxuICBmbTogTm90ZUZyb250TWF0dGVyLFxuICB1c2VyTWVzc2FnZTogc3RyaW5nLFxuICBzZXR0aW5nczogU3lieWxTZXR0aW5ncyxcbiAgbWF4T3V0cHV0VG9rZW5zID0gNTEyLFxuICBub3RlQm9keT86IHN0cmluZ1xuKTogR2VuZXJhdGlvblJlcXVlc3Qge1xuICBjb25zdCBsb25lbG9nQWN0aXZlID0gZm0ubG9uZWxvZyA/PyBzZXR0aW5ncy5sb25lbG9nTW9kZTtcblxuICBsZXQgY29udGV4dEJsb2NrID0gXCJcIjtcbiAgaWYgKGxvbmVsb2dBY3RpdmUgJiYgbm90ZUJvZHkpIHtcbiAgICAvLyBJbiBMb25lbG9nIG1vZGUgdGhlIGxpdmUgbm90ZSBib2R5IGlzIGFsd2F5cyB0aGUgc291cmNlIG9mIHRydXRoXG4gICAgY29uc3QgY3R4ID0gcGFyc2VMb25lbG9nQ29udGV4dChub3RlQm9keSwgc2V0dGluZ3MubG9uZWxvZ0NvbnRleHREZXB0aCk7XG4gICAgY29udGV4dEJsb2NrID0gc2VyaWFsaXplQ29udGV4dChjdHgpO1xuICB9IGVsc2UgaWYgKGZtLnNjZW5lX2NvbnRleHQ/LnRyaW0oKSkge1xuICAgIC8vIEZvciBub24tTG9uZWxvZyBub3RlcywgdXNlIHRoZSBtYW51YWxseSBtYWludGFpbmVkIHNjZW5lX2NvbnRleHRcbiAgICBjb250ZXh0QmxvY2sgPSBgU0NFTkUgQ09OVEVYVDpcXG4ke2ZtLnNjZW5lX2NvbnRleHQudHJpbSgpfWA7XG4gIH1cblxuICBjb25zdCBjb250ZXh0TWVzc2FnZSA9IGNvbnRleHRCbG9jayA/IGAke2NvbnRleHRCbG9ja31cXG5cXG4ke3VzZXJNZXNzYWdlfWAgOiB1c2VyTWVzc2FnZTtcblxuICByZXR1cm4ge1xuICAgIHN5c3RlbVByb21wdDogYnVpbGRTeXN0ZW1Qcm9tcHQoZm0sIGxvbmVsb2dBY3RpdmUpLFxuICAgIHVzZXJNZXNzYWdlOiBjb250ZXh0TWVzc2FnZSxcbiAgICB0ZW1wZXJhdHVyZTogZm0udGVtcGVyYXR1cmUgPz8gc2V0dGluZ3MuZGVmYXVsdFRlbXBlcmF0dXJlLFxuICAgIG1heE91dHB1dFRva2VucyxcbiAgICBtb2RlbDogZm0ubW9kZWwsXG4gICAgcmVzb2x2ZWRTb3VyY2VzOiBbXVxuICB9O1xufVxuIiwgImltcG9ydCB7IEFwcCwgVEZpbGUgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IE5vdGVGcm9udE1hdHRlciwgU291cmNlUmVmIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlYWRGcm9udE1hdHRlcihhcHA6IEFwcCwgZmlsZTogVEZpbGUpOiBQcm9taXNlPE5vdGVGcm9udE1hdHRlcj4ge1xuICBjb25zdCBjYWNoZSA9IGFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKTtcbiAgcmV0dXJuIChjYWNoZT8uZnJvbnRtYXR0ZXIgYXMgTm90ZUZyb250TWF0dGVyKSA/PyB7fTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdyaXRlRnJvbnRNYXR0ZXJLZXkoXG4gIGFwcDogQXBwLFxuICBmaWxlOiBURmlsZSxcbiAga2V5OiBrZXlvZiBOb3RlRnJvbnRNYXR0ZXIgfCBcInNvdXJjZXNcIixcbiAgdmFsdWU6IHVua25vd25cbik6IFByb21pc2U8dm9pZD4ge1xuICBhd2FpdCBhcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGZpbGUsIChmbSkgPT4ge1xuICAgIGZtW2tleV0gPSB2YWx1ZTtcbiAgfSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhcHBlbmRTY2VuZUNvbnRleHQoXG4gIGFwcDogQXBwLFxuICBmaWxlOiBURmlsZSxcbiAgdGV4dDogc3RyaW5nLFxuICBtYXhDaGFycyA9IDIwMDBcbik6IFByb21pc2U8dm9pZD4ge1xuICBhd2FpdCBhcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGZpbGUsIChmbSkgPT4ge1xuICAgIGNvbnN0IGN1cnJlbnQgPSBTdHJpbmcoZm1bXCJzY2VuZV9jb250ZXh0XCJdID8/IFwiXCIpLnRyaW0oKTtcbiAgICBjb25zdCB1cGRhdGVkID0gW2N1cnJlbnQsIHRleHRdLmZpbHRlcihCb29sZWFuKS5qb2luKFwiXFxuXCIpLnRyaW0oKTtcbiAgICBmbVtcInNjZW5lX2NvbnRleHRcIl0gPSB1cGRhdGVkLmxlbmd0aCA+IG1heENoYXJzID8gXCIuLi5cIiArIHVwZGF0ZWQuc2xpY2UoLW1heENoYXJzKSA6IHVwZGF0ZWQ7XG4gIH0pO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBzZXJ0U291cmNlUmVmKGFwcDogQXBwLCBmaWxlOiBURmlsZSwgcmVmOiBTb3VyY2VSZWYpOiBQcm9taXNlPHZvaWQ+IHtcbiAgYXdhaXQgYXBwLmZpbGVNYW5hZ2VyLnByb2Nlc3NGcm9udE1hdHRlcihmaWxlLCAoZm0pID0+IHtcbiAgICBjb25zdCBjdXJyZW50ID0gQXJyYXkuaXNBcnJheShmbVtcInNvdXJjZXNcIl0pID8gWy4uLmZtW1wic291cmNlc1wiXV0gOiBbXTtcbiAgICBjb25zdCBuZXh0ID0gY3VycmVudC5maWx0ZXIoKGl0ZW06IFNvdXJjZVJlZikgPT4gaXRlbS52YXVsdF9wYXRoICE9PSByZWYudmF1bHRfcGF0aCk7XG4gICAgbmV4dC5wdXNoKHJlZik7XG4gICAgZm1bXCJzb3VyY2VzXCJdID0gbmV4dDtcbiAgfSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW1vdmVTb3VyY2VSZWYoYXBwOiBBcHAsIGZpbGU6IFRGaWxlLCByZWY6IFNvdXJjZVJlZik6IFByb21pc2U8dm9pZD4ge1xuICBhd2FpdCBhcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGZpbGUsIChmbSkgPT4ge1xuICAgIGNvbnN0IGN1cnJlbnQgPSBBcnJheS5pc0FycmF5KGZtW1wic291cmNlc1wiXSkgPyBbLi4uZm1bXCJzb3VyY2VzXCJdXSA6IFtdO1xuICAgIGZtW1wic291cmNlc1wiXSA9IGN1cnJlbnQuZmlsdGVyKChpdGVtOiBTb3VyY2VSZWYpID0+IGl0ZW0udmF1bHRfcGF0aCAhPT0gcmVmLnZhdWx0X3BhdGgpO1xuICB9KTtcbn1cbiIsICJpbXBvcnQgeyByZXF1ZXN0VXJsLCBSZXF1ZXN0VXJsUmVzcG9uc2UgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7XG4gIEFudGhyb3BpY1Byb3ZpZGVyQ29uZmlnLFxuICBHZW5lcmF0aW9uUmVxdWVzdCxcbiAgR2VuZXJhdGlvblJlc3BvbnNlLFxuICBVcGxvYWRlZEZpbGVJbmZvXG59IGZyb20gXCIuLi90eXBlc1wiO1xuaW1wb3J0IHsgQUlQcm92aWRlciB9IGZyb20gXCIuL2Jhc2VcIjtcblxuZXhwb3J0IGNsYXNzIEFudGhyb3BpY1Byb3ZpZGVyIGltcGxlbWVudHMgQUlQcm92aWRlciB7XG4gIHJlYWRvbmx5IGlkID0gXCJhbnRocm9waWNcIjtcbiAgcmVhZG9ubHkgbmFtZSA9IFwiQW50aHJvcGljXCI7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBjb25maWc6IEFudGhyb3BpY1Byb3ZpZGVyQ29uZmlnKSB7fVxuXG4gIGFzeW5jIGdlbmVyYXRlKHJlcXVlc3Q6IEdlbmVyYXRpb25SZXF1ZXN0KTogUHJvbWlzZTxHZW5lcmF0aW9uUmVzcG9uc2U+IHtcbiAgICB0aGlzLmVuc3VyZUNvbmZpZ3VyZWQoKTtcbiAgICBjb25zdCBtb2RlbCA9IHJlcXVlc3QubW9kZWwgfHwgdGhpcy5jb25maWcuZGVmYXVsdE1vZGVsO1xuICAgIGNvbnN0IGNvbnRlbnQ6IEFycmF5PFJlY29yZDxzdHJpbmcsIHVua25vd24+PiA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBzb3VyY2Ugb2YgcmVxdWVzdC5yZXNvbHZlZFNvdXJjZXMgPz8gW10pIHtcbiAgICAgIGlmIChzb3VyY2UuYmFzZTY0RGF0YSAmJiBzb3VyY2UucmVmLm1pbWVfdHlwZSA9PT0gXCJhcHBsaWNhdGlvbi9wZGZcIikge1xuICAgICAgICBjb250ZW50LnB1c2goe1xuICAgICAgICAgIHR5cGU6IFwiZG9jdW1lbnRcIixcbiAgICAgICAgICBzb3VyY2U6IHtcbiAgICAgICAgICAgIHR5cGU6IFwiYmFzZTY0XCIsXG4gICAgICAgICAgICBtZWRpYV90eXBlOiBzb3VyY2UucmVmLm1pbWVfdHlwZSxcbiAgICAgICAgICAgIGRhdGE6IHNvdXJjZS5iYXNlNjREYXRhXG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAoc291cmNlLnRleHRDb250ZW50KSB7XG4gICAgICAgIGNvbnRlbnQucHVzaCh7XG4gICAgICAgICAgdHlwZTogXCJ0ZXh0XCIsXG4gICAgICAgICAgdGV4dDogYFtTT1VSQ0U6ICR7c291cmNlLnJlZi5sYWJlbH1dXFxuJHtzb3VyY2UudGV4dENvbnRlbnR9XFxuW0VORCBTT1VSQ0VdYFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb250ZW50LnB1c2goeyB0eXBlOiBcInRleHRcIiwgdGV4dDogcmVxdWVzdC51c2VyTWVzc2FnZSB9KTtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICB1cmw6IFwiaHR0cHM6Ly9hcGkuYW50aHJvcGljLmNvbS92MS9tZXNzYWdlc1wiLFxuICAgICAgbWV0aG9kOiBcIlBPU1RcIixcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgIFwieC1hcGkta2V5XCI6IHRoaXMuY29uZmlnLmFwaUtleSxcbiAgICAgICAgXCJhbnRocm9waWMtdmVyc2lvblwiOiBcIjIwMjMtMDYtMDFcIlxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgbW9kZWwsXG4gICAgICAgIG1heF90b2tlbnM6IHJlcXVlc3QubWF4T3V0cHV0VG9rZW5zLFxuICAgICAgICB0ZW1wZXJhdHVyZTogcmVxdWVzdC50ZW1wZXJhdHVyZSxcbiAgICAgICAgc3lzdGVtOiByZXF1ZXN0LnN5c3RlbVByb21wdCxcbiAgICAgICAgbWVzc2FnZXM6IFt7IHJvbGU6IFwidXNlclwiLCBjb250ZW50IH1dXG4gICAgICB9KSxcbiAgICAgIHRocm93OiBmYWxzZVxuICAgIH0pO1xuXG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA8IDIwMCB8fCByZXNwb25zZS5zdGF0dXMgPj0gMzAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IodGhpcy5leHRyYWN0RXJyb3IocmVzcG9uc2UpKTtcbiAgICB9XG5cbiAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuanNvbjtcbiAgICBjb25zdCB0ZXh0ID0gKGRhdGEuY29udGVudCA/PyBbXSlcbiAgICAgIC5tYXAoKGl0ZW06IHsgdGV4dD86IHN0cmluZyB9KSA9PiBpdGVtLnRleHQgPz8gXCJcIilcbiAgICAgIC5qb2luKFwiXCIpXG4gICAgICAudHJpbSgpO1xuICAgIGlmICghdGV4dCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUHJvdmlkZXIgcmV0dXJuZWQgYW4gZW1wdHkgcmVzcG9uc2UuXCIpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB0ZXh0LFxuICAgICAgaW5wdXRUb2tlbnM6IGRhdGEudXNhZ2U/LmlucHV0X3Rva2VucyxcbiAgICAgIG91dHB1dFRva2VuczogZGF0YS51c2FnZT8ub3V0cHV0X3Rva2Vuc1xuICAgIH07XG4gIH1cblxuICBhc3luYyB1cGxvYWRTb3VyY2UoKTogUHJvbWlzZTxVcGxvYWRlZEZpbGVJbmZvPiB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQW50aHJvcGljIGRvZXMgbm90IHN1cHBvcnQgcGVyc2lzdGVudCBmaWxlIHVwbG9hZC4gVXNlIHZhdWx0X3BhdGggaW5zdGVhZC5cIik7XG4gIH1cblxuICBhc3luYyBsaXN0U291cmNlcygpOiBQcm9taXNlPFVwbG9hZGVkRmlsZUluZm9bXT4ge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIGFzeW5jIGRlbGV0ZVNvdXJjZSgpOiBQcm9taXNlPHZvaWQ+IHt9XG5cbiAgYXN5bmMgbGlzdE1vZGVscygpOiBQcm9taXNlPHN0cmluZ1tdPiB7XG4gICAgaWYgKCF0aGlzLmNvbmZpZy5hcGlLZXkudHJpbSgpKSByZXR1cm4gW107XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICAgIHVybDogXCJodHRwczovL2FwaS5hbnRocm9waWMuY29tL3YxL21vZGVsc1wiLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgXCJ4LWFwaS1rZXlcIjogdGhpcy5jb25maWcuYXBpS2V5LFxuICAgICAgICAgIFwiYW50aHJvcGljLXZlcnNpb25cIjogXCIyMDIzLTA2LTAxXCJcbiAgICAgICAgfSxcbiAgICAgICAgdGhyb3c6IGZhbHNlXG4gICAgICB9KTtcbiAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPCAyMDAgfHwgcmVzcG9uc2Uuc3RhdHVzID49IDMwMCkgcmV0dXJuIFtdO1xuICAgICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmpzb247XG4gICAgICByZXR1cm4gKGRhdGEuZGF0YSA/PyBbXSlcbiAgICAgICAgLm1hcCgobTogeyBpZD86IHN0cmluZyB9KSA9PiBtLmlkID8/IFwiXCIpXG4gICAgICAgIC5maWx0ZXIoQm9vbGVhbik7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgdmFsaWRhdGUoKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgaWYgKCF0aGlzLmNvbmZpZy5hcGlLZXkudHJpbSgpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3RVcmwoe1xuICAgICAgICB1cmw6IFwiaHR0cHM6Ly9hcGkuYW50aHJvcGljLmNvbS92MS9tZXNzYWdlc1wiLFxuICAgICAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgICAgXCJ4LWFwaS1rZXlcIjogdGhpcy5jb25maWcuYXBpS2V5LFxuICAgICAgICAgIFwiYW50aHJvcGljLXZlcnNpb25cIjogXCIyMDIzLTA2LTAxXCJcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIG1vZGVsOiB0aGlzLmNvbmZpZy5kZWZhdWx0TW9kZWwsXG4gICAgICAgICAgbWF4X3Rva2VuczogMSxcbiAgICAgICAgICBtZXNzYWdlczogW3sgcm9sZTogXCJ1c2VyXCIsIGNvbnRlbnQ6IFt7IHR5cGU6IFwidGV4dFwiLCB0ZXh0OiBcInBpbmdcIiB9XSB9XVxuICAgICAgICB9KSxcbiAgICAgICAgdGhyb3c6IGZhbHNlXG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXNwb25zZS5zdGF0dXMgPj0gMjAwICYmIHJlc3BvbnNlLnN0YXR1cyA8IDMwMDtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGVuc3VyZUNvbmZpZ3VyZWQoKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmNvbmZpZy5hcGlLZXkudHJpbSgpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJObyBBbnRocm9waWMgQVBJIGtleSBzZXQuIENoZWNrIHBsdWdpbiBzZXR0aW5ncy5cIik7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBleHRyYWN0RXJyb3IocmVzcG9uc2U6IFJlcXVlc3RVcmxSZXNwb25zZSk6IHN0cmluZyB7XG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAxIHx8IHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAzKSB7XG4gICAgICByZXR1cm4gXCJBbnRocm9waWMgQVBJIGtleSByZWplY3RlZC4gQ2hlY2sgc2V0dGluZ3MuXCI7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuanNvbjtcbiAgICAgIGNvbnN0IG1zZyA9IGRhdGE/LmVycm9yPy5tZXNzYWdlID8/IGBBbnRocm9waWMgcmVxdWVzdCBmYWlsZWQgKCR7cmVzcG9uc2Uuc3RhdHVzfSkuYDtcbiAgICAgIHJldHVybiByZXNwb25zZS5zdGF0dXMgPT09IDQyOSA/IGBBbnRocm9waWMgcXVvdGEvcmF0ZSBlcnJvcjogJHttc2d9YCA6IG1zZztcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBgQW50aHJvcGljIHJlcXVlc3QgZmFpbGVkICgke3Jlc3BvbnNlLnN0YXR1c30pLmA7XG4gICAgfVxuICB9XG59XG4iLCAiaW1wb3J0IHsgcmVxdWVzdFVybCwgUmVxdWVzdFVybFJlc3BvbnNlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQge1xuICBHZW1pbmlQcm92aWRlckNvbmZpZyxcbiAgR2VuZXJhdGlvblJlcXVlc3QsXG4gIEdlbmVyYXRpb25SZXNwb25zZSxcbiAgVXBsb2FkZWRGaWxlSW5mb1xufSBmcm9tIFwiLi4vdHlwZXNcIjtcbmltcG9ydCB7IEFJUHJvdmlkZXIgfSBmcm9tIFwiLi9iYXNlXCI7XG5cbmZ1bmN0aW9uIGFzRXJyb3JNZXNzYWdlKGVycm9yOiB1bmtub3duKTogc3RyaW5nIHtcbiAgcmV0dXJuIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKTtcbn1cblxuZXhwb3J0IGNsYXNzIEdlbWluaVByb3ZpZGVyIGltcGxlbWVudHMgQUlQcm92aWRlciB7XG4gIHJlYWRvbmx5IGlkID0gXCJnZW1pbmlcIjtcbiAgcmVhZG9ubHkgbmFtZSA9IFwiR2VtaW5pXCI7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBjb25maWc6IEdlbWluaVByb3ZpZGVyQ29uZmlnKSB7fVxuXG4gIGFzeW5jIGdlbmVyYXRlKHJlcXVlc3Q6IEdlbmVyYXRpb25SZXF1ZXN0KTogUHJvbWlzZTxHZW5lcmF0aW9uUmVzcG9uc2U+IHtcbiAgICB0aGlzLmVuc3VyZUNvbmZpZ3VyZWQoKTtcbiAgICBjb25zdCBtb2RlbCA9IHJlcXVlc3QubW9kZWwgfHwgdGhpcy5jb25maWcuZGVmYXVsdE1vZGVsO1xuICAgIGNvbnN0IGVuZHBvaW50ID1cbiAgICAgIGBodHRwczovL2dlbmVyYXRpdmVsYW5ndWFnZS5nb29nbGVhcGlzLmNvbS92MWJldGEvbW9kZWxzLyR7ZW5jb2RlVVJJQ29tcG9uZW50KG1vZGVsKX06Z2VuZXJhdGVDb250ZW50P2tleT0ke2VuY29kZVVSSUNvbXBvbmVudCh0aGlzLmNvbmZpZy5hcGlLZXkpfWA7XG5cbiAgICBjb25zdCBwYXJ0czogQXJyYXk8UmVjb3JkPHN0cmluZywgdW5rbm93bj4+ID0gW107XG4gICAgZm9yIChjb25zdCBzb3VyY2Ugb2YgcmVxdWVzdC5yZXNvbHZlZFNvdXJjZXMgPz8gW10pIHtcbiAgICAgIGlmIChzb3VyY2UuYmFzZTY0RGF0YSkge1xuICAgICAgICBwYXJ0cy5wdXNoKHtcbiAgICAgICAgICBpbmxpbmVEYXRhOiB7XG4gICAgICAgICAgICBtaW1lVHlwZTogc291cmNlLnJlZi5taW1lX3R5cGUsXG4gICAgICAgICAgICBkYXRhOiBzb3VyY2UuYmFzZTY0RGF0YVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKHNvdXJjZS50ZXh0Q29udGVudCkge1xuICAgICAgICBwYXJ0cy5wdXNoKHsgdGV4dDogYFtTT1VSQ0U6ICR7c291cmNlLnJlZi5sYWJlbH1dXFxuJHtzb3VyY2UudGV4dENvbnRlbnR9XFxuW0VORCBTT1VSQ0VdYCB9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcGFydHMucHVzaCh7IHRleHQ6IHJlcXVlc3QudXNlck1lc3NhZ2UgfSk7XG5cbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3RVcmwoe1xuICAgICAgdXJsOiBlbmRwb2ludCxcbiAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICBoZWFkZXJzOiB7IFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIHN5c3RlbV9pbnN0cnVjdGlvbjogeyBwYXJ0czogW3sgdGV4dDogcmVxdWVzdC5zeXN0ZW1Qcm9tcHQgfV0gfSxcbiAgICAgICAgY29udGVudHM6IFt7IHJvbGU6IFwidXNlclwiLCBwYXJ0cyB9XSxcbiAgICAgICAgZ2VuZXJhdGlvbkNvbmZpZzoge1xuICAgICAgICAgIHRlbXBlcmF0dXJlOiByZXF1ZXN0LnRlbXBlcmF0dXJlLFxuICAgICAgICAgIG1heE91dHB1dFRva2VuczogcmVxdWVzdC5tYXhPdXRwdXRUb2tlbnMsXG4gICAgICAgICAgdGhpbmtpbmdDb25maWc6IHsgdGhpbmtpbmdCdWRnZXQ6IDAgfVxuICAgICAgICB9XG4gICAgICB9KSxcbiAgICAgIHRocm93OiBmYWxzZVxuICAgIH0pO1xuXG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA8IDIwMCB8fCByZXNwb25zZS5zdGF0dXMgPj0gMzAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IodGhpcy5leHRyYWN0RXJyb3IocmVzcG9uc2UsIFwiR2VtaW5pXCIpKTtcbiAgICB9XG5cbiAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuanNvbjtcbiAgICBjb25zdCB0ZXh0ID0gKGRhdGEuY2FuZGlkYXRlcz8uWzBdPy5jb250ZW50Py5wYXJ0cyA/PyBbXSlcbiAgICAgIC5tYXAoKHBhcnQ6IHsgdGV4dD86IHN0cmluZyB9KSA9PiBwYXJ0LnRleHQgPz8gXCJcIilcbiAgICAgIC5qb2luKFwiXCIpXG4gICAgICAudHJpbSgpO1xuXG4gICAgaWYgKCF0ZXh0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQcm92aWRlciByZXR1cm5lZCBhbiBlbXB0eSByZXNwb25zZS5cIik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHRleHQsXG4gICAgICBpbnB1dFRva2VuczogZGF0YS51c2FnZU1ldGFkYXRhPy5wcm9tcHRUb2tlbkNvdW50LFxuICAgICAgb3V0cHV0VG9rZW5zOiBkYXRhLnVzYWdlTWV0YWRhdGE/LmNhbmRpZGF0ZXNUb2tlbkNvdW50XG4gICAgfTtcbiAgfVxuXG4gIGFzeW5jIHVwbG9hZFNvdXJjZSgpOiBQcm9taXNlPFVwbG9hZGVkRmlsZUluZm8+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJVc2UgJ0FkZCBTb3VyY2UnIGZyb20gdGhlIG5vdGUgdG8gYXR0YWNoIGEgdmF1bHQgZmlsZSBpbmxpbmUuXCIpO1xuICB9XG5cbiAgYXN5bmMgbGlzdFNvdXJjZXMoKTogUHJvbWlzZTxVcGxvYWRlZEZpbGVJbmZvW10+IHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBhc3luYyBkZWxldGVTb3VyY2UoKTogUHJvbWlzZTx2b2lkPiB7fVxuXG4gIGFzeW5jIGxpc3RNb2RlbHMoKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICAgIGlmICghdGhpcy5jb25maWcuYXBpS2V5LnRyaW0oKSkgcmV0dXJuIFtdO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3RVcmwoe1xuICAgICAgICB1cmw6IGBodHRwczovL2dlbmVyYXRpdmVsYW5ndWFnZS5nb29nbGVhcGlzLmNvbS92MWJldGEvbW9kZWxzP2tleT0ke2VuY29kZVVSSUNvbXBvbmVudCh0aGlzLmNvbmZpZy5hcGlLZXkpfWAsXG4gICAgICAgIHRocm93OiBmYWxzZVxuICAgICAgfSk7XG4gICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzIDwgMjAwIHx8IHJlc3BvbnNlLnN0YXR1cyA+PSAzMDApIHJldHVybiBbXTtcbiAgICAgIGNvbnN0IGRhdGEgPSByZXNwb25zZS5qc29uO1xuICAgICAgcmV0dXJuIChkYXRhLm1vZGVscyA/PyBbXSlcbiAgICAgICAgLmZpbHRlcigobTogeyBzdXBwb3J0ZWRHZW5lcmF0aW9uTWV0aG9kcz86IHN0cmluZ1tdIH0pID0+XG4gICAgICAgICAgbS5zdXBwb3J0ZWRHZW5lcmF0aW9uTWV0aG9kcz8uaW5jbHVkZXMoXCJnZW5lcmF0ZUNvbnRlbnRcIikpXG4gICAgICAgIC5tYXAoKG06IHsgbmFtZT86IHN0cmluZyB9KSA9PiAobS5uYW1lID8/IFwiXCIpLnJlcGxhY2UoL15tb2RlbHNcXC8vLCBcIlwiKSlcbiAgICAgICAgLmZpbHRlcihCb29sZWFuKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gIH1cblxuICBhc3luYyB2YWxpZGF0ZSgpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBpZiAoIXRoaXMuY29uZmlnLmFwaUtleS50cmltKCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICAgIHVybDogYGh0dHBzOi8vZ2VuZXJhdGl2ZWxhbmd1YWdlLmdvb2dsZWFwaXMuY29tL3YxYmV0YS9tb2RlbHM/a2V5PSR7ZW5jb2RlVVJJQ29tcG9uZW50KHRoaXMuY29uZmlnLmFwaUtleSl9YCxcbiAgICAgICAgdGhyb3c6IGZhbHNlXG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXNwb25zZS5zdGF0dXMgPj0gMjAwICYmIHJlc3BvbnNlLnN0YXR1cyA8IDMwMDtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGVuc3VyZUNvbmZpZ3VyZWQoKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmNvbmZpZy5hcGlLZXkudHJpbSgpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJObyBHZW1pbmkgQVBJIGtleSBzZXQuIENoZWNrIHBsdWdpbiBzZXR0aW5ncy5cIik7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBleHRyYWN0RXJyb3IocmVzcG9uc2U6IFJlcXVlc3RVcmxSZXNwb25zZSwgcHJvdmlkZXJOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQwMSB8fCByZXNwb25zZS5zdGF0dXMgPT09IDQwMykge1xuICAgICAgcmV0dXJuIGAke3Byb3ZpZGVyTmFtZX0gQVBJIGtleSByZWplY3RlZC4gQ2hlY2sgc2V0dGluZ3MuYDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGRhdGEgPSByZXNwb25zZS5qc29uO1xuICAgICAgY29uc3QgbXNnID0gZGF0YT8uZXJyb3I/Lm1lc3NhZ2UgPz8gYCR7cHJvdmlkZXJOYW1lfSByZXF1ZXN0IGZhaWxlZCAoJHtyZXNwb25zZS5zdGF0dXN9KS5gO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLnN0YXR1cyA9PT0gNDI5ID8gYCR7cHJvdmlkZXJOYW1lfSBxdW90YS9yYXRlIGVycm9yOiAke21zZ31gIDogbXNnO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICByZXR1cm4gYXNFcnJvck1lc3NhZ2UoZXJyb3IpIHx8IGAke3Byb3ZpZGVyTmFtZX0gcmVxdWVzdCBmYWlsZWQgKCR7cmVzcG9uc2Uuc3RhdHVzfSkuYDtcbiAgICB9XG4gIH1cbn1cbiIsICJpbXBvcnQgeyByZXF1ZXN0VXJsLCBSZXF1ZXN0VXJsUmVzcG9uc2UgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7XG4gIEdlbmVyYXRpb25SZXF1ZXN0LFxuICBHZW5lcmF0aW9uUmVzcG9uc2UsXG4gIE9sbGFtYVByb3ZpZGVyQ29uZmlnLFxuICBVcGxvYWRlZEZpbGVJbmZvXG59IGZyb20gXCIuLi90eXBlc1wiO1xuaW1wb3J0IHsgdHJ1bmNhdGVTb3VyY2VUZXh0IH0gZnJvbSBcIi4uL3NvdXJjZVV0aWxzXCI7XG5pbXBvcnQgeyBBSVByb3ZpZGVyIH0gZnJvbSBcIi4vYmFzZVwiO1xuXG5pbnRlcmZhY2UgT2xsYW1hVGFnc1Jlc3BvbnNlIHtcbiAgbW9kZWxzPzogQXJyYXk8eyBuYW1lPzogc3RyaW5nIH0+O1xufVxuXG5leHBvcnQgY2xhc3MgT2xsYW1hUHJvdmlkZXIgaW1wbGVtZW50cyBBSVByb3ZpZGVyIHtcbiAgcmVhZG9ubHkgaWQgPSBcIm9sbGFtYVwiO1xuICByZWFkb25seSBuYW1lID0gXCJPbGxhbWFcIjtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IGNvbmZpZzogT2xsYW1hUHJvdmlkZXJDb25maWcpIHt9XG5cbiAgYXN5bmMgZ2VuZXJhdGUocmVxdWVzdDogR2VuZXJhdGlvblJlcXVlc3QpOiBQcm9taXNlPEdlbmVyYXRpb25SZXNwb25zZT4ge1xuICAgIGNvbnN0IGJhc2VVcmwgPSB0aGlzLmNvbmZpZy5iYXNlVXJsLnJlcGxhY2UoL1xcLyQvLCBcIlwiKTtcbiAgICBjb25zdCBtb2RlbCA9IHJlcXVlc3QubW9kZWwgfHwgdGhpcy5jb25maWcuZGVmYXVsdE1vZGVsO1xuICAgIGNvbnN0IHNvdXJjZUJsb2NrcyA9IChyZXF1ZXN0LnJlc29sdmVkU291cmNlcyA/PyBbXSlcbiAgICAgIC5maWx0ZXIoKHNvdXJjZSkgPT4gc291cmNlLnRleHRDb250ZW50KVxuICAgICAgLm1hcCgoc291cmNlKSA9PiBgW1NPVVJDRTogJHtzb3VyY2UucmVmLmxhYmVsfV1cXG4ke3RydW5jYXRlU291cmNlVGV4dChzb3VyY2UudGV4dENvbnRlbnQgPz8gXCJcIil9XFxuW0VORCBTT1VSQ0VdYCk7XG5cbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3RVcmwoe1xuICAgICAgdXJsOiBgJHtiYXNlVXJsfS9hcGkvY2hhdGAsXG4gICAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgICAgaGVhZGVyczogeyBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIiB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBtb2RlbCxcbiAgICAgICAgc3RyZWFtOiBmYWxzZSxcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIHRlbXBlcmF0dXJlOiByZXF1ZXN0LnRlbXBlcmF0dXJlLFxuICAgICAgICAgIG51bV9wcmVkaWN0OiByZXF1ZXN0Lm1heE91dHB1dFRva2Vuc1xuICAgICAgICB9LFxuICAgICAgICBtZXNzYWdlczogW1xuICAgICAgICAgIHsgcm9sZTogXCJzeXN0ZW1cIiwgY29udGVudDogcmVxdWVzdC5zeXN0ZW1Qcm9tcHQgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICByb2xlOiBcInVzZXJcIixcbiAgICAgICAgICAgIGNvbnRlbnQ6IHNvdXJjZUJsb2Nrcy5sZW5ndGhcbiAgICAgICAgICAgICAgPyBgJHtzb3VyY2VCbG9ja3Muam9pbihcIlxcblxcblwiKX1cXG5cXG4ke3JlcXVlc3QudXNlck1lc3NhZ2V9YFxuICAgICAgICAgICAgICA6IHJlcXVlc3QudXNlck1lc3NhZ2VcbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH0pLFxuICAgICAgdGhyb3c6IGZhbHNlXG4gICAgfSk7XG5cbiAgICBpZiAocmVzcG9uc2Uuc3RhdHVzIDwgMjAwIHx8IHJlc3BvbnNlLnN0YXR1cyA+PSAzMDApIHtcbiAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQwNCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE1vZGVsICcke21vZGVsfScgbm90IGZvdW5kIGluIE9sbGFtYS4gQ2hlY2sgYXZhaWxhYmxlIG1vZGVscyBpbiBzZXR0aW5ncy5gKTtcbiAgICAgIH1cbiAgICAgIHRocm93IG5ldyBFcnJvcihgT2xsYW1hIG5vdCByZWFjaGFibGUgYXQgJHtiYXNlVXJsfS4gSXMgaXQgcnVubmluZz9gKTtcbiAgICB9XG5cbiAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuanNvbjtcbiAgICBjb25zdCB0ZXh0ID0gZGF0YS5tZXNzYWdlPy5jb250ZW50Py50cmltPy4oKSA/PyBcIlwiO1xuICAgIGlmICghdGV4dCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUHJvdmlkZXIgcmV0dXJuZWQgYW4gZW1wdHkgcmVzcG9uc2UuXCIpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB0ZXh0LFxuICAgICAgaW5wdXRUb2tlbnM6IGRhdGEucHJvbXB0X2V2YWxfY291bnQsXG4gICAgICBvdXRwdXRUb2tlbnM6IGRhdGEuZXZhbF9jb3VudFxuICAgIH07XG4gIH1cblxuICBhc3luYyB1cGxvYWRTb3VyY2UoKTogUHJvbWlzZTxVcGxvYWRlZEZpbGVJbmZvPiB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiT2xsYW1hIGRvZXMgbm90IHN1cHBvcnQgZmlsZSB1cGxvYWQuIEFkZCBhIHZhdWx0X3BhdGggc291cmNlIGluc3RlYWQuXCIpO1xuICB9XG5cbiAgYXN5bmMgbGlzdFNvdXJjZXMoKTogUHJvbWlzZTxVcGxvYWRlZEZpbGVJbmZvW10+IHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBhc3luYyBkZWxldGVTb3VyY2UoKTogUHJvbWlzZTx2b2lkPiB7fVxuXG4gIGFzeW5jIHZhbGlkYXRlKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB0YWdzID0gYXdhaXQgdGhpcy5mZXRjaFRhZ3MoKTtcbiAgICAgIHJldHVybiBCb29sZWFuKHRhZ3MubW9kZWxzPy5sZW5ndGgpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGxpc3RNb2RlbHMoKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICAgIGNvbnN0IHRhZ3MgPSBhd2FpdCB0aGlzLmZldGNoVGFncygpO1xuICAgIHJldHVybiAodGFncy5tb2RlbHMgPz8gW10pLm1hcCgobW9kZWwpID0+IG1vZGVsLm5hbWUgPz8gXCJcIikuZmlsdGVyKEJvb2xlYW4pO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBmZXRjaFRhZ3MoKTogUHJvbWlzZTxPbGxhbWFUYWdzUmVzcG9uc2U+IHtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3RVcmwoe1xuICAgICAgdXJsOiBgJHt0aGlzLmNvbmZpZy5iYXNlVXJsLnJlcGxhY2UoL1xcLyQvLCBcIlwiKX0vYXBpL3RhZ3NgLFxuICAgICAgdGhyb3c6IGZhbHNlXG4gICAgfSk7XG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA8IDIwMCB8fCByZXNwb25zZS5zdGF0dXMgPj0gMzAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE9sbGFtYSBub3QgcmVhY2hhYmxlIGF0ICR7dGhpcy5jb25maWcuYmFzZVVybH0uIElzIGl0IHJ1bm5pbmc/YCk7XG4gICAgfVxuICAgIHJldHVybiByZXNwb25zZS5qc29uIGFzIE9sbGFtYVRhZ3NSZXNwb25zZTtcbiAgfVxufVxuIiwgImltcG9ydCB7IEFwcCwgVEFic3RyYWN0RmlsZSwgVEZpbGUsIG5vcm1hbGl6ZVBhdGggfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IFByb3ZpZGVySUQsIFJlc29sdmVkU291cmNlLCBTb3VyY2VSZWYgfSBmcm9tIFwiLi90eXBlc1wiO1xuXG5jb25zdCBURVhUX0VYVEVOU0lPTlMgPSBuZXcgU2V0KFtcInR4dFwiLCBcIm1kXCIsIFwibWFya2Rvd25cIiwgXCJqc29uXCIsIFwieWFtbFwiLCBcInltbFwiLCBcImNzdlwiXSk7XG5cbmZ1bmN0aW9uIGdldFZhdWx0RmlsZShhcHA6IEFwcCwgdmF1bHRQYXRoOiBzdHJpbmcpOiBURmlsZSB7XG4gIGNvbnN0IG5vcm1hbGl6ZWQgPSBub3JtYWxpemVQYXRoKHZhdWx0UGF0aCk7XG4gIGNvbnN0IGZpbGUgPSBhcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKG5vcm1hbGl6ZWQpO1xuICBpZiAoIShmaWxlIGluc3RhbmNlb2YgVEZpbGUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBTb3VyY2UgZmlsZSBub3QgZm91bmQgaW4gdmF1bHQ6ICR7dmF1bHRQYXRofWApO1xuICB9XG4gIHJldHVybiBmaWxlO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVhZFZhdWx0VGV4dFNvdXJjZShhcHA6IEFwcCwgdmF1bHRQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBmaWxlID0gZ2V0VmF1bHRGaWxlKGFwcCwgdmF1bHRQYXRoKTtcbiAgY29uc3QgZXh0ZW5zaW9uID0gZmlsZS5leHRlbnNpb24udG9Mb3dlckNhc2UoKTtcbiAgaWYgKCFURVhUX0VYVEVOU0lPTlMuaGFzKGV4dGVuc2lvbikpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFRleHQgZXh0cmFjdGlvbiBpcyBvbmx5IHN1cHBvcnRlZCBmb3IgdGV4dCBmaWxlcy4gQWRkIGEgLnR4dCBjb21wYW5pb24gZm9yICcke3ZhdWx0UGF0aH0nLmApO1xuICB9XG4gIHJldHVybiBhcHAudmF1bHQuY2FjaGVkUmVhZChmaWxlKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlYWRWYXVsdEJpbmFyeVNvdXJjZShhcHA6IEFwcCwgdmF1bHRQYXRoOiBzdHJpbmcpOiBQcm9taXNlPEFycmF5QnVmZmVyPiB7XG4gIGNvbnN0IGZpbGUgPSBnZXRWYXVsdEZpbGUoYXBwLCB2YXVsdFBhdGgpO1xuICByZXR1cm4gYXBwLnZhdWx0LnJlYWRCaW5hcnkoZmlsZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhcnJheUJ1ZmZlclRvQmFzZTY0KGJ1ZmZlcjogQXJyYXlCdWZmZXIpOiBzdHJpbmcge1xuICBsZXQgYmluYXJ5ID0gXCJcIjtcbiAgY29uc3QgYnl0ZXMgPSBuZXcgVWludDhBcnJheShidWZmZXIpO1xuICBjb25zdCBjaHVua1NpemUgPSAweDgwMDA7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgYnl0ZXMubGVuZ3RoOyBpICs9IGNodW5rU2l6ZSkge1xuICAgIGNvbnN0IGNodW5rID0gYnl0ZXMuc3ViYXJyYXkoaSwgaSArIGNodW5rU2l6ZSk7XG4gICAgYmluYXJ5ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoLi4uY2h1bmspO1xuICB9XG4gIHJldHVybiBidG9hKGJpbmFyeSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXNvbHZlU291cmNlc0ZvclJlcXVlc3QoXG4gIGFwcDogQXBwLFxuICBzb3VyY2VzOiBTb3VyY2VSZWZbXSxcbiAgcHJvdmlkZXJJZDogUHJvdmlkZXJJRFxuKTogUHJvbWlzZTxSZXNvbHZlZFNvdXJjZVtdPiB7XG4gIGNvbnN0IHJlc29sdmVkOiBSZXNvbHZlZFNvdXJjZVtdID0gW107XG4gIGZvciAoY29uc3QgcmVmIG9mIHNvdXJjZXMpIHtcbiAgICBpZiAocHJvdmlkZXJJZCA9PT0gXCJhbnRocm9waWNcIiB8fCAocHJvdmlkZXJJZCA9PT0gXCJnZW1pbmlcIiAmJiByZWYubWltZV90eXBlID09PSBcImFwcGxpY2F0aW9uL3BkZlwiKSkge1xuICAgICAgY29uc3QgYnVmZmVyID0gYXdhaXQgcmVhZFZhdWx0QmluYXJ5U291cmNlKGFwcCwgcmVmLnZhdWx0X3BhdGgpO1xuICAgICAgcmVzb2x2ZWQucHVzaCh7IHJlZiwgYmFzZTY0RGF0YTogYXJyYXlCdWZmZXJUb0Jhc2U2NChidWZmZXIpIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IHRleHQgPSBhd2FpdCByZWFkVmF1bHRUZXh0U291cmNlKGFwcCwgcmVmLnZhdWx0X3BhdGgpO1xuICAgIHJlc29sdmVkLnB1c2goeyByZWYsIHRleHRDb250ZW50OiB0ZXh0IH0pO1xuICB9XG4gIHJldHVybiByZXNvbHZlZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRydW5jYXRlU291cmNlVGV4dCh0ZXh0OiBzdHJpbmcsIG1heENoYXJzID0gNDAwMCk6IHN0cmluZyB7XG4gIHJldHVybiB0ZXh0Lmxlbmd0aCA8PSBtYXhDaGFycyA/IHRleHQgOiB0ZXh0LnNsaWNlKDAsIG1heENoYXJzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlc2NyaWJlU291cmNlUmVmKHJlZjogU291cmNlUmVmKTogc3RyaW5nIHtcbiAgcmV0dXJuIHJlZi52YXVsdF9wYXRoO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbGlzdFZhdWx0Q2FuZGlkYXRlRmlsZXMoYXBwOiBBcHApOiBURmlsZVtdIHtcbiAgcmV0dXJuIGFwcC52YXVsdFxuICAgIC5nZXRGaWxlcygpXG4gICAgLmZpbHRlcigoZmlsZSkgPT4gW1wicGRmXCIsIFwidHh0XCIsIFwibWRcIiwgXCJtYXJrZG93blwiXS5pbmNsdWRlcyhmaWxlLmV4dGVuc2lvbi50b0xvd2VyQ2FzZSgpKSlcbiAgICAuc29ydCgoYSwgYikgPT4gYS5wYXRoLmxvY2FsZUNvbXBhcmUoYi5wYXRoKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1RGaWxlKGZpbGU6IFRBYnN0cmFjdEZpbGUgfCBudWxsKTogZmlsZSBpcyBURmlsZSB7XG4gIHJldHVybiBCb29sZWFuKGZpbGUpICYmIGZpbGUgaW5zdGFuY2VvZiBURmlsZTtcbn1cbiIsICJpbXBvcnQgeyByZXF1ZXN0VXJsLCBSZXF1ZXN0VXJsUmVzcG9uc2UgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7XG4gIEdlbmVyYXRpb25SZXF1ZXN0LFxuICBHZW5lcmF0aW9uUmVzcG9uc2UsXG4gIE9wZW5BSVByb3ZpZGVyQ29uZmlnLFxuICBVcGxvYWRlZEZpbGVJbmZvXG59IGZyb20gXCIuLi90eXBlc1wiO1xuaW1wb3J0IHsgdHJ1bmNhdGVTb3VyY2VUZXh0IH0gZnJvbSBcIi4uL3NvdXJjZVV0aWxzXCI7XG5pbXBvcnQgeyBBSVByb3ZpZGVyIH0gZnJvbSBcIi4vYmFzZVwiO1xuXG5leHBvcnQgY2xhc3MgT3BlbkFJUHJvdmlkZXIgaW1wbGVtZW50cyBBSVByb3ZpZGVyIHtcbiAgcmVhZG9ubHkgaWQgPSBcIm9wZW5haVwiO1xuICByZWFkb25seSBuYW1lID0gXCJPcGVuQUlcIjtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IGNvbmZpZzogT3BlbkFJUHJvdmlkZXJDb25maWcpIHt9XG5cbiAgYXN5bmMgZ2VuZXJhdGUocmVxdWVzdDogR2VuZXJhdGlvblJlcXVlc3QpOiBQcm9taXNlPEdlbmVyYXRpb25SZXNwb25zZT4ge1xuICAgIHRoaXMuZW5zdXJlQ29uZmlndXJlZCgpO1xuICAgIGNvbnN0IGJhc2VVcmwgPSB0aGlzLmNvbmZpZy5iYXNlVXJsLnJlcGxhY2UoL1xcLyQvLCBcIlwiKTtcbiAgICBjb25zdCBtb2RlbCA9IHJlcXVlc3QubW9kZWwgfHwgdGhpcy5jb25maWcuZGVmYXVsdE1vZGVsO1xuICAgIGNvbnN0IHNvdXJjZUJsb2NrcyA9IChyZXF1ZXN0LnJlc29sdmVkU291cmNlcyA/PyBbXSlcbiAgICAgIC5maWx0ZXIoKHNvdXJjZSkgPT4gc291cmNlLnRleHRDb250ZW50KVxuICAgICAgLm1hcCgoc291cmNlKSA9PiBgW1NPVVJDRTogJHtzb3VyY2UucmVmLmxhYmVsfV1cXG4ke3RydW5jYXRlU291cmNlVGV4dChzb3VyY2UudGV4dENvbnRlbnQgPz8gXCJcIil9XFxuW0VORCBTT1VSQ0VdYCk7XG5cbiAgICBjb25zdCBib2R5OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHtcbiAgICAgIG1vZGVsLFxuICAgICAgbWF4X3Rva2VuczogcmVxdWVzdC5tYXhPdXRwdXRUb2tlbnMsXG4gICAgICBtZXNzYWdlczogW1xuICAgICAgICB7IHJvbGU6IFwic3lzdGVtXCIsIGNvbnRlbnQ6IHJlcXVlc3Quc3lzdGVtUHJvbXB0IH0sXG4gICAgICAgIHtcbiAgICAgICAgICByb2xlOiBcInVzZXJcIixcbiAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHR5cGU6IFwidGV4dFwiLFxuICAgICAgICAgICAgICB0ZXh0OiBzb3VyY2VCbG9ja3MubGVuZ3RoXG4gICAgICAgICAgICAgICAgPyBgJHtzb3VyY2VCbG9ja3Muam9pbihcIlxcblxcblwiKX1cXG5cXG4ke3JlcXVlc3QudXNlck1lc3NhZ2V9YFxuICAgICAgICAgICAgICAgIDogcmVxdWVzdC51c2VyTWVzc2FnZVxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgXVxuICAgIH07XG5cbiAgICBpZiAoIW1vZGVsLnN0YXJ0c1dpdGgoXCJncHQtNVwiKSkge1xuICAgICAgYm9keS50ZW1wZXJhdHVyZSA9IHJlcXVlc3QudGVtcGVyYXR1cmU7XG4gICAgfVxuXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCByZXF1ZXN0VXJsKHtcbiAgICAgIHVybDogYCR7YmFzZVVybH0vY2hhdC9jb21wbGV0aW9uc2AsXG4gICAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke3RoaXMuY29uZmlnLmFwaUtleX1gXG4gICAgICB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoYm9keSksXG4gICAgICB0aHJvdzogZmFsc2VcbiAgICB9KTtcblxuICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPCAyMDAgfHwgcmVzcG9uc2Uuc3RhdHVzID49IDMwMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKHRoaXMuZXh0cmFjdEVycm9yKHJlc3BvbnNlKSk7XG4gICAgfVxuXG4gICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmpzb247XG4gICAgY29uc3QgdGV4dCA9IGRhdGEuY2hvaWNlcz8uWzBdPy5tZXNzYWdlPy5jb250ZW50Py50cmltPy4oKSA/PyBcIlwiO1xuICAgIGlmICghdGV4dCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUHJvdmlkZXIgcmV0dXJuZWQgYW4gZW1wdHkgcmVzcG9uc2UuXCIpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB0ZXh0LFxuICAgICAgaW5wdXRUb2tlbnM6IGRhdGEudXNhZ2U/LnByb21wdF90b2tlbnMsXG4gICAgICBvdXRwdXRUb2tlbnM6IGRhdGEudXNhZ2U/LmNvbXBsZXRpb25fdG9rZW5zXG4gICAgfTtcbiAgfVxuXG4gIGFzeW5jIHVwbG9hZFNvdXJjZSgpOiBQcm9taXNlPFVwbG9hZGVkRmlsZUluZm8+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaGlzIHByb3ZpZGVyIGRvZXMgbm90IHN1cHBvcnQgZmlsZSB1cGxvYWQuIFVzZSB2YXVsdF9wYXRoIGluc3RlYWQuXCIpO1xuICB9XG5cbiAgYXN5bmMgbGlzdFNvdXJjZXMoKTogUHJvbWlzZTxVcGxvYWRlZEZpbGVJbmZvW10+IHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBhc3luYyBkZWxldGVTb3VyY2UoKTogUHJvbWlzZTx2b2lkPiB7fVxuXG4gIGFzeW5jIGxpc3RNb2RlbHMoKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICAgIGlmICghdGhpcy5jb25maWcuYXBpS2V5LnRyaW0oKSkgcmV0dXJuIFtdO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3RVcmwoe1xuICAgICAgICB1cmw6IGAke3RoaXMuY29uZmlnLmJhc2VVcmwucmVwbGFjZSgvXFwvJC8sIFwiXCIpfS9tb2RlbHNgLFxuICAgICAgICBoZWFkZXJzOiB7IEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHt0aGlzLmNvbmZpZy5hcGlLZXl9YCB9LFxuICAgICAgICB0aHJvdzogZmFsc2VcbiAgICAgIH0pO1xuICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA8IDIwMCB8fCByZXNwb25zZS5zdGF0dXMgPj0gMzAwKSByZXR1cm4gW107XG4gICAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuanNvbjtcbiAgICAgIGNvbnN0IEVYQ0xVREUgPSBbXCJlbWJlZGRpbmdcIiwgXCJ3aGlzcGVyXCIsIFwidHRzXCIsIFwiZGFsbC1lXCIsIFwibW9kZXJhdGlvblwiLCBcInRleHQtc2VhcmNoXCIsIFwidGV4dC1zaW1pbGFyaXR5XCJdO1xuICAgICAgcmV0dXJuIChkYXRhLmRhdGEgPz8gW10pXG4gICAgICAgIC5tYXAoKG06IHsgaWQ/OiBzdHJpbmcgfSkgPT4gbS5pZCA/PyBcIlwiKVxuICAgICAgICAuZmlsdGVyKChpZDogc3RyaW5nKSA9PiBpZCAmJiAhRVhDTFVERS5zb21lKChleCkgPT4gaWQuaW5jbHVkZXMoZXgpKSlcbiAgICAgICAgLnNvcnQoKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gIH1cblxuICBhc3luYyB2YWxpZGF0ZSgpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBpZiAoIXRoaXMuY29uZmlnLmFwaUtleS50cmltKCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICAgIHVybDogYCR7dGhpcy5jb25maWcuYmFzZVVybC5yZXBsYWNlKC9cXC8kLywgXCJcIil9L21vZGVsc2AsXG4gICAgICAgIGhlYWRlcnM6IHsgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke3RoaXMuY29uZmlnLmFwaUtleX1gIH0sXG4gICAgICAgIHRocm93OiBmYWxzZVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVzcG9uc2Uuc3RhdHVzID49IDIwMCAmJiByZXNwb25zZS5zdGF0dXMgPCAzMDA7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVDb25maWd1cmVkKCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5jb25maWcuYXBpS2V5LnRyaW0oKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm8gT3BlbkFJIEFQSSBrZXkgc2V0LiBDaGVjayBwbHVnaW4gc2V0dGluZ3MuXCIpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZXh0cmFjdEVycm9yKHJlc3BvbnNlOiBSZXF1ZXN0VXJsUmVzcG9uc2UpOiBzdHJpbmcge1xuICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQwMSB8fCByZXNwb25zZS5zdGF0dXMgPT09IDQwMykge1xuICAgICAgcmV0dXJuIFwiT3BlbkFJIEFQSSBrZXkgcmVqZWN0ZWQuIENoZWNrIHNldHRpbmdzLlwiO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmpzb247XG4gICAgICBjb25zdCBtc2cgPSBkYXRhPy5lcnJvcj8ubWVzc2FnZSA/PyBgT3BlbkFJIHJlcXVlc3QgZmFpbGVkICgke3Jlc3BvbnNlLnN0YXR1c30pLmA7XG4gICAgICByZXR1cm4gcmVzcG9uc2Uuc3RhdHVzID09PSA0MjkgPyBgT3BlbkFJIHF1b3RhL3JhdGUgZXJyb3I6ICR7bXNnfWAgOiBtc2c7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gYE9wZW5BSSByZXF1ZXN0IGZhaWxlZCAoJHtyZXNwb25zZS5zdGF0dXN9KS5gO1xuICAgIH1cbiAgfVxufVxuIiwgImltcG9ydCB7IHJlcXVlc3RVcmwsIFJlcXVlc3RVcmxSZXNwb25zZSB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHtcbiAgR2VuZXJhdGlvblJlcXVlc3QsXG4gIEdlbmVyYXRpb25SZXNwb25zZSxcbiAgT3BlblJvdXRlclByb3ZpZGVyQ29uZmlnLFxuICBVcGxvYWRlZEZpbGVJbmZvXG59IGZyb20gXCIuLi90eXBlc1wiO1xuaW1wb3J0IHsgdHJ1bmNhdGVTb3VyY2VUZXh0IH0gZnJvbSBcIi4uL3NvdXJjZVV0aWxzXCI7XG5pbXBvcnQgeyBBSVByb3ZpZGVyIH0gZnJvbSBcIi4vYmFzZVwiO1xuXG5jb25zdCBCQVNFX1VSTCA9IFwiaHR0cHM6Ly9vcGVucm91dGVyLmFpL2FwaS92MVwiO1xuXG5mdW5jdGlvbiBhc0Vycm9yTWVzc2FnZShlcnJvcjogdW5rbm93bik6IHN0cmluZyB7XG4gIHJldHVybiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcik7XG59XG5cbmV4cG9ydCBjbGFzcyBPcGVuUm91dGVyUHJvdmlkZXIgaW1wbGVtZW50cyBBSVByb3ZpZGVyIHtcbiAgcmVhZG9ubHkgaWQgPSBcIm9wZW5yb3V0ZXJcIjtcbiAgcmVhZG9ubHkgbmFtZSA9IFwiT3BlblJvdXRlclwiO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgY29uZmlnOiBPcGVuUm91dGVyUHJvdmlkZXJDb25maWcpIHt9XG5cbiAgYXN5bmMgZ2VuZXJhdGUocmVxdWVzdDogR2VuZXJhdGlvblJlcXVlc3QpOiBQcm9taXNlPEdlbmVyYXRpb25SZXNwb25zZT4ge1xuICAgIHRoaXMuZW5zdXJlQ29uZmlndXJlZCgpO1xuICAgIGNvbnN0IG1vZGVsID0gcmVxdWVzdC5tb2RlbCB8fCB0aGlzLmNvbmZpZy5kZWZhdWx0TW9kZWw7XG4gICAgY29uc3Qgc291cmNlQmxvY2tzID0gKHJlcXVlc3QucmVzb2x2ZWRTb3VyY2VzID8/IFtdKVxuICAgICAgLmZpbHRlcigoc291cmNlKSA9PiBzb3VyY2UudGV4dENvbnRlbnQpXG4gICAgICAubWFwKChzb3VyY2UpID0+IGBbU09VUkNFOiAke3NvdXJjZS5yZWYubGFiZWx9XVxcbiR7dHJ1bmNhdGVTb3VyY2VUZXh0KHNvdXJjZS50ZXh0Q29udGVudCA/PyBcIlwiKX1cXG5bRU5EIFNPVVJDRV1gKTtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICB1cmw6IGAke0JBU0VfVVJMfS9jaGF0L2NvbXBsZXRpb25zYCxcbiAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgICBcIkF1dGhvcml6YXRpb25cIjogYEJlYXJlciAke3RoaXMuY29uZmlnLmFwaUtleX1gLFxuICAgICAgICBcIkhUVFAtUmVmZXJlclwiOiBcIm9ic2lkaWFuLXN5YnlsXCIsXG4gICAgICAgIFwiWC1UaXRsZVwiOiBcIlN5YnlsXCJcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIG1vZGVsLFxuICAgICAgICBtYXhfdG9rZW5zOiByZXF1ZXN0Lm1heE91dHB1dFRva2VucyxcbiAgICAgICAgdGVtcGVyYXR1cmU6IHJlcXVlc3QudGVtcGVyYXR1cmUsXG4gICAgICAgIG1lc3NhZ2VzOiBbXG4gICAgICAgICAgeyByb2xlOiBcInN5c3RlbVwiLCBjb250ZW50OiByZXF1ZXN0LnN5c3RlbVByb21wdCB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHJvbGU6IFwidXNlclwiLFxuICAgICAgICAgICAgY29udGVudDogc291cmNlQmxvY2tzLmxlbmd0aFxuICAgICAgICAgICAgICA/IGAke3NvdXJjZUJsb2Nrcy5qb2luKFwiXFxuXFxuXCIpfVxcblxcbiR7cmVxdWVzdC51c2VyTWVzc2FnZX1gXG4gICAgICAgICAgICAgIDogcmVxdWVzdC51c2VyTWVzc2FnZVxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfSksXG4gICAgICB0aHJvdzogZmFsc2VcbiAgICB9KTtcblxuICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPCAyMDAgfHwgcmVzcG9uc2Uuc3RhdHVzID49IDMwMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKHRoaXMuZXh0cmFjdEVycm9yKHJlc3BvbnNlKSk7XG4gICAgfVxuXG4gICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmpzb247XG4gICAgY29uc3QgdGV4dCA9IGRhdGEuY2hvaWNlcz8uWzBdPy5tZXNzYWdlPy5jb250ZW50Py50cmltPy4oKSA/PyBcIlwiO1xuICAgIGlmICghdGV4dCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUHJvdmlkZXIgcmV0dXJuZWQgYW4gZW1wdHkgcmVzcG9uc2UuXCIpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB0ZXh0LFxuICAgICAgaW5wdXRUb2tlbnM6IGRhdGEudXNhZ2U/LnByb21wdF90b2tlbnMsXG4gICAgICBvdXRwdXRUb2tlbnM6IGRhdGEudXNhZ2U/LmNvbXBsZXRpb25fdG9rZW5zXG4gICAgfTtcbiAgfVxuXG4gIGFzeW5jIHVwbG9hZFNvdXJjZSgpOiBQcm9taXNlPFVwbG9hZGVkRmlsZUluZm8+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJPcGVuUm91dGVyIGRvZXMgbm90IHN1cHBvcnQgZmlsZSB1cGxvYWQuIFVzZSB2YXVsdF9wYXRoIGluc3RlYWQuXCIpO1xuICB9XG5cbiAgYXN5bmMgbGlzdFNvdXJjZXMoKTogUHJvbWlzZTxVcGxvYWRlZEZpbGVJbmZvW10+IHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBhc3luYyBkZWxldGVTb3VyY2UoKTogUHJvbWlzZTx2b2lkPiB7fVxuXG4gIGFzeW5jIGxpc3RNb2RlbHMoKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICAgIGlmICghdGhpcy5jb25maWcuYXBpS2V5LnRyaW0oKSkgcmV0dXJuIFtdO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3RVcmwoe1xuICAgICAgICB1cmw6IGAke0JBU0VfVVJMfS9tb2RlbHNgLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgXCJBdXRob3JpemF0aW9uXCI6IGBCZWFyZXIgJHt0aGlzLmNvbmZpZy5hcGlLZXl9YFxuICAgICAgICB9LFxuICAgICAgICB0aHJvdzogZmFsc2VcbiAgICAgIH0pO1xuICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA8IDIwMCB8fCByZXNwb25zZS5zdGF0dXMgPj0gMzAwKSByZXR1cm4gW107XG4gICAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuanNvbjtcbiAgICAgIHJldHVybiAoZGF0YS5kYXRhID8/IFtdKVxuICAgICAgICAuZmlsdGVyKChtOiB7IGFyY2hpdGVjdHVyZT86IHsgbW9kYWxpdHk/OiBzdHJpbmcgfSB9KSA9PlxuICAgICAgICAgIG0uYXJjaGl0ZWN0dXJlPy5tb2RhbGl0eT8uZW5kc1dpdGgoXCItPnRleHRcIikpXG4gICAgICAgIC5tYXAoKG06IHsgaWQ/OiBzdHJpbmcgfSkgPT4gbS5pZCA/PyBcIlwiKVxuICAgICAgICAuZmlsdGVyKEJvb2xlYW4pXG4gICAgICAgIC5zb3J0KCk7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgdmFsaWRhdGUoKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgaWYgKCF0aGlzLmNvbmZpZy5hcGlLZXkudHJpbSgpKSByZXR1cm4gZmFsc2U7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICAgIHVybDogYCR7QkFTRV9VUkx9L21vZGVsc2AsXG4gICAgICAgIGhlYWRlcnM6IHsgXCJBdXRob3JpemF0aW9uXCI6IGBCZWFyZXIgJHt0aGlzLmNvbmZpZy5hcGlLZXl9YCB9LFxuICAgICAgICB0aHJvdzogZmFsc2VcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLnN0YXR1cyA+PSAyMDAgJiYgcmVzcG9uc2Uuc3RhdHVzIDwgMzAwO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZW5zdXJlQ29uZmlndXJlZCgpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuY29uZmlnLmFwaUtleS50cmltKCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vIE9wZW5Sb3V0ZXIgQVBJIGtleSBzZXQuIENoZWNrIHBsdWdpbiBzZXR0aW5ncy5cIik7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBleHRyYWN0RXJyb3IocmVzcG9uc2U6IFJlcXVlc3RVcmxSZXNwb25zZSk6IHN0cmluZyB7XG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAxIHx8IHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAzKSB7XG4gICAgICByZXR1cm4gXCJPcGVuUm91dGVyIEFQSSBrZXkgcmVqZWN0ZWQuIENoZWNrIHNldHRpbmdzLlwiO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmpzb247XG4gICAgICBjb25zdCBtc2cgPSBkYXRhPy5lcnJvcj8ubWVzc2FnZSA/PyBgT3BlblJvdXRlciByZXF1ZXN0IGZhaWxlZCAoJHtyZXNwb25zZS5zdGF0dXN9KS5gO1xuICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gNDI5KSB7XG4gICAgICAgIGlmIChtc2cgPT09IFwiUHJvdmlkZXIgcmV0dXJuZWQgZXJyb3JcIikge1xuICAgICAgICAgIHJldHVybiBcIk9wZW5Sb3V0ZXI6IGZyZWUgbW9kZWwgZW5kcG9pbnQgYXQgY2FwYWNpdHkuIFJldHJ5IGluIGEgbW9tZW50IG9yIHBpY2sgYSBkaWZmZXJlbnQgbW9kZWwuXCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGBPcGVuUm91dGVyIHJhdGUgbGltaXQ6ICR7bXNnfWA7XG4gICAgICB9XG4gICAgICByZXR1cm4gbXNnO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICByZXR1cm4gYXNFcnJvck1lc3NhZ2UoZXJyb3IpIHx8IGBPcGVuUm91dGVyIHJlcXVlc3QgZmFpbGVkICgke3Jlc3BvbnNlLnN0YXR1c30pLmA7XG4gICAgfVxuICB9XG59XG4iLCAiaW1wb3J0IHsgUHJvdmlkZXJJRCwgU3lieWxTZXR0aW5ncyB9IGZyb20gXCIuLi90eXBlc1wiO1xuaW1wb3J0IHsgQUlQcm92aWRlciB9IGZyb20gXCIuL2Jhc2VcIjtcbmltcG9ydCB7IEFudGhyb3BpY1Byb3ZpZGVyIH0gZnJvbSBcIi4vYW50aHJvcGljXCI7XG5pbXBvcnQgeyBHZW1pbmlQcm92aWRlciB9IGZyb20gXCIuL2dlbWluaVwiO1xuaW1wb3J0IHsgT2xsYW1hUHJvdmlkZXIgfSBmcm9tIFwiLi9vbGxhbWFcIjtcbmltcG9ydCB7IE9wZW5BSVByb3ZpZGVyIH0gZnJvbSBcIi4vb3BlbmFpXCI7XG5pbXBvcnQgeyBPcGVuUm91dGVyUHJvdmlkZXIgfSBmcm9tIFwiLi9vcGVucm91dGVyXCI7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRQcm92aWRlcihzZXR0aW5nczogU3lieWxTZXR0aW5ncywgb3ZlcnJpZGVJZD86IFByb3ZpZGVySUQpOiBBSVByb3ZpZGVyIHtcbiAgY29uc3QgaWQgPSBvdmVycmlkZUlkID8/IHNldHRpbmdzLmFjdGl2ZVByb3ZpZGVyO1xuICBzd2l0Y2ggKGlkKSB7XG4gICAgY2FzZSBcImdlbWluaVwiOlxuICAgICAgcmV0dXJuIG5ldyBHZW1pbmlQcm92aWRlcihzZXR0aW5ncy5wcm92aWRlcnMuZ2VtaW5pKTtcbiAgICBjYXNlIFwib3BlbmFpXCI6XG4gICAgICByZXR1cm4gbmV3IE9wZW5BSVByb3ZpZGVyKHNldHRpbmdzLnByb3ZpZGVycy5vcGVuYWkpO1xuICAgIGNhc2UgXCJhbnRocm9waWNcIjpcbiAgICAgIHJldHVybiBuZXcgQW50aHJvcGljUHJvdmlkZXIoc2V0dGluZ3MucHJvdmlkZXJzLmFudGhyb3BpYyk7XG4gICAgY2FzZSBcIm9sbGFtYVwiOlxuICAgICAgcmV0dXJuIG5ldyBPbGxhbWFQcm92aWRlcihzZXR0aW5ncy5wcm92aWRlcnMub2xsYW1hKTtcbiAgICBjYXNlIFwib3BlbnJvdXRlclwiOlxuICAgICAgcmV0dXJuIG5ldyBPcGVuUm91dGVyUHJvdmlkZXIoc2V0dGluZ3MucHJvdmlkZXJzLm9wZW5yb3V0ZXIpO1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gcHJvdmlkZXI6ICR7aWR9YCk7XG4gIH1cbn1cbiIsICJpbXBvcnQgeyBOb3RpY2UsIFRGaWxlLCBub3JtYWxpemVQYXRoIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgdHlwZSBTeWJ5bFBsdWdpbiBmcm9tIFwiLi9tYWluXCI7XG5pbXBvcnQgeyBnZXRTZWxlY3Rpb24sIGluc2VydEJlbG93U2VsZWN0aW9uLCBpc0luc2lkZUNvZGVCbG9jayB9IGZyb20gXCIuL2VkaXRvclwiO1xuaW1wb3J0IHsgcmVtb3ZlU291cmNlUmVmLCB1cHNlcnRTb3VyY2VSZWYsIHdyaXRlRnJvbnRNYXR0ZXJLZXkgfSBmcm9tIFwiLi9mcm9udG1hdHRlclwiO1xuaW1wb3J0IHtcbiAgZm9ybWF0QWR2ZW50dXJlU2VlZCxcbiAgZm9ybWF0QXNrT3JhY2xlLFxuICBmb3JtYXRDaGFyYWN0ZXIsXG4gIGZvcm1hdERlY2xhcmVBY3Rpb24sXG4gIGZvcm1hdEV4cGFuZFNjZW5lLFxuICBmb3JtYXRJbnRlcnByZXRPcmFjbGUsXG4gIGZvcm1hdFN0YXJ0U2NlbmUsXG4gIGZvcm1hdFN1Z2dlc3RDb25zZXF1ZW5jZSxcbiAgTG9uZWxvZ0Zvcm1hdE9wdGlvbnNcbn0gZnJvbSBcIi4vbG9uZWxvZy9mb3JtYXR0ZXJcIjtcbmltcG9ydCB7IHBhcnNlTG9uZWxvZ0NvbnRleHQsIHNlcmlhbGl6ZUNvbnRleHQgfSBmcm9tIFwiLi9sb25lbG9nL3BhcnNlclwiO1xuaW1wb3J0IHsgTWFuYWdlU291cmNlc01vZGFsLCBvcGVuSW5wdXRNb2RhbCwgcGlja0xvY2FsRmlsZSwgcGlja1NvdXJjZU9yaWdpbiwgcGlja1NvdXJjZVJlZiwgcGlja1ZhdWx0RmlsZSB9IGZyb20gXCIuL21vZGFsc1wiO1xuaW1wb3J0IHsgcmVzb2x2ZVNvdXJjZXNGb3JSZXF1ZXN0IH0gZnJvbSBcIi4vc291cmNlVXRpbHNcIjtcbmltcG9ydCB7IE5vdGVGcm9udE1hdHRlciwgU291cmNlUmVmLCBTeWJ5bFNldHRpbmdzIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuZnVuY3Rpb24gaXNMb25lbG9nQWN0aXZlKHNldHRpbmdzOiBTeWJ5bFNldHRpbmdzLCBmbTogTm90ZUZyb250TWF0dGVyKTogYm9vbGVhbiB7XG4gIHJldHVybiBmbS5sb25lbG9nID8/IHNldHRpbmdzLmxvbmVsb2dNb2RlO1xufVxuXG5mdW5jdGlvbiBsb25lbG9nT3B0cyhzZXR0aW5nczogU3lieWxTZXR0aW5ncywgbm9XcmFwID0gZmFsc2UpOiBMb25lbG9nRm9ybWF0T3B0aW9ucyB7XG4gIHJldHVybiB7IHdyYXBJbkNvZGVCbG9jazogIW5vV3JhcCAmJiAoc2V0dGluZ3MubG9uZWxvZ1dyYXBDb2RlQmxvY2sgPz8gdHJ1ZSkgfTtcbn1cblxuZnVuY3Rpb24gZ2VuZXJpY0Jsb2NrcXVvdGUobGFiZWw6IHN0cmluZywgdGV4dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGA+IFske2xhYmVsfV0gJHt0ZXh0LnRyaW0oKS5yZXBsYWNlKC9cXG4vZywgXCJcXG4+IFwiKX1gO1xufVxuXG5mdW5jdGlvbiBpbmZlck1pbWVUeXBlKGZpbGU6IFRGaWxlIHwgRmlsZSk6IHN0cmluZyB7XG4gIGNvbnN0IG5hbWUgPSBcInBhdGhcIiBpbiBmaWxlID8gZmlsZS5wYXRoIDogZmlsZS5uYW1lO1xuICByZXR1cm4gbmFtZS50b0xvd2VyQ2FzZSgpLmVuZHNXaXRoKFwiLnBkZlwiKSA/IFwiYXBwbGljYXRpb24vcGRmXCIgOiBcInRleHQvcGxhaW5cIjtcbn1cblxuZnVuY3Rpb24gdG9kYXlJc29EYXRlKCk6IHN0cmluZyB7XG4gIHJldHVybiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc2xpY2UoMCwgMTApO1xufVxuXG5mdW5jdGlvbiBwYXJzZUxvbmVsb2dPcmFjbGVSZXNwb25zZSh0ZXh0OiBzdHJpbmcpOiB7IHJlc3VsdDogc3RyaW5nOyBpbnRlcnByZXRhdGlvbjogc3RyaW5nIH0ge1xuICBjb25zdCBsaW5lcyA9IHRleHRcbiAgICAucmVwbGFjZSgvXj5cXHMqL2dtLCBcIlwiKVxuICAgIC5zcGxpdChcIlxcblwiKVxuICAgIC5tYXAoKGxpbmUpID0+IGxpbmUudHJpbSgpKVxuICAgIC5maWx0ZXIoQm9vbGVhbik7XG4gIGNvbnN0IHJlc3VsdCA9IGxpbmVzLmZpbmQoKGxpbmUpID0+IGxpbmUuc3RhcnRzV2l0aChcIi0+XCIpKT8ucmVwbGFjZSgvXi0+XFxzKi8sIFwiXCIpID8/IFwiVW5jbGVhclwiO1xuICBjb25zdCBpbnRlcnByZXRhdGlvbiA9IGxpbmVzLmZpbHRlcigobGluZSkgPT4gIWxpbmUuc3RhcnRzV2l0aChcIi0+XCIpKS5qb2luKFwiXFxuXCIpO1xuICByZXR1cm4geyByZXN1bHQsIGludGVycHJldGF0aW9uIH07XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGFkZFNvdXJjZVRvTm90ZShwbHVnaW46IFN5YnlsUGx1Z2luLCBmaWxlOiBURmlsZSk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBvcmlnaW4gPSBhd2FpdCBwaWNrU291cmNlT3JpZ2luKHBsdWdpbi5hcHApO1xuICBpZiAoIW9yaWdpbikgcmV0dXJuO1xuXG4gIGlmIChvcmlnaW4gPT09IFwidmF1bHRcIikge1xuICAgIGNvbnN0IHZhdWx0RmlsZSA9IGF3YWl0IHBpY2tWYXVsdEZpbGUocGx1Z2luLmFwcCwgXCJDaG9vc2UgYSB2YXVsdCBmaWxlXCIpO1xuICAgIGlmICghdmF1bHRGaWxlKSByZXR1cm47XG4gICAgY29uc3QgcmVmOiBTb3VyY2VSZWYgPSB7XG4gICAgICBsYWJlbDogdmF1bHRGaWxlLmJhc2VuYW1lLFxuICAgICAgbWltZV90eXBlOiBpbmZlck1pbWVUeXBlKHZhdWx0RmlsZSksXG4gICAgICB2YXVsdF9wYXRoOiB2YXVsdEZpbGUucGF0aFxuICAgIH07XG4gICAgYXdhaXQgdXBzZXJ0U291cmNlUmVmKHBsdWdpbi5hcHAsIGZpbGUsIHJlZik7XG4gICAgbmV3IE5vdGljZShgU291cmNlIGFkZGVkOiAke3ZhdWx0RmlsZS5wYXRofWApO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIEV4dGVybmFsIGZpbGUgXHUyMDE0IGltcG9ydCBpbnRvIHZhdWx0XG4gIGNvbnN0IGxvY2FsRmlsZSA9IGF3YWl0IHBpY2tMb2NhbEZpbGUoKTtcbiAgaWYgKCFsb2NhbEZpbGUpIHJldHVybjtcblxuICBjb25zdCBidWZmZXIgPSBhd2FpdCBsb2NhbEZpbGUuYXJyYXlCdWZmZXIoKTtcbiAgY29uc3QgcGFyZW50RGlyID0gZmlsZS5wYXJlbnQ/LnBhdGggPz8gXCJcIjtcbiAgY29uc3Qgc291cmNlc0ZvbGRlciA9IG5vcm1hbGl6ZVBhdGgocGFyZW50RGlyID8gYCR7cGFyZW50RGlyfS9zb3VyY2VzYCA6IFwic291cmNlc1wiKTtcblxuICBpZiAoIXBsdWdpbi5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHNvdXJjZXNGb2xkZXIpKSB7XG4gICAgYXdhaXQgcGx1Z2luLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIoc291cmNlc0ZvbGRlcik7XG4gIH1cblxuICBjb25zdCB0YXJnZXRQYXRoID0gbm9ybWFsaXplUGF0aChgJHtzb3VyY2VzRm9sZGVyfS8ke2xvY2FsRmlsZS5uYW1lfWApO1xuICBjb25zdCBleGlzdGluZyA9IHBsdWdpbi5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHRhcmdldFBhdGgpO1xuICBpZiAoZXhpc3RpbmcgaW5zdGFuY2VvZiBURmlsZSkge1xuICAgIGF3YWl0IHBsdWdpbi5hcHAudmF1bHQubW9kaWZ5QmluYXJ5KGV4aXN0aW5nLCBidWZmZXIpO1xuICB9IGVsc2Uge1xuICAgIGF3YWl0IHBsdWdpbi5hcHAudmF1bHQuY3JlYXRlQmluYXJ5KHRhcmdldFBhdGgsIGJ1ZmZlcik7XG4gIH1cblxuICBjb25zdCByZWY6IFNvdXJjZVJlZiA9IHtcbiAgICBsYWJlbDogbG9jYWxGaWxlLm5hbWUucmVwbGFjZSgvXFwuW14uXSskLywgXCJcIiksXG4gICAgbWltZV90eXBlOiBpbmZlck1pbWVUeXBlKGxvY2FsRmlsZSksXG4gICAgdmF1bHRfcGF0aDogdGFyZ2V0UGF0aFxuICB9O1xuICBhd2FpdCB1cHNlcnRTb3VyY2VSZWYocGx1Z2luLmFwcCwgZmlsZSwgcmVmKTtcbiAgbmV3IE5vdGljZShgU291cmNlIGltcG9ydGVkOiAke3RhcmdldFBhdGh9YCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIG1hbmFnZVNvdXJjZXMocGx1Z2luOiBTeWJ5bFBsdWdpbik6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBjb250ZXh0ID0gYXdhaXQgcGx1Z2luLmdldEFjdGl2ZU5vdGVDb250ZXh0KCk7XG4gIGlmICghY29udGV4dD8udmlldy5maWxlKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIG5ldyBNYW5hZ2VTb3VyY2VzTW9kYWwoXG4gICAgcGx1Z2luLmFwcCxcbiAgICBjb250ZXh0LmZtLnNvdXJjZXMgPz8gW10sXG4gICAgYXN5bmMgKHJlZikgPT4gcmVtb3ZlU291cmNlUmVmKHBsdWdpbi5hcHAsIGNvbnRleHQudmlldy5maWxlISwgcmVmKVxuICApLm9wZW4oKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcnVuR2VuZXJhdGlvbihcbiAgcGx1Z2luOiBTeWJ5bFBsdWdpbixcbiAgdXNlck1lc3NhZ2U6IHN0cmluZyxcbiAgZm9ybWF0dGVyOiAodGV4dDogc3RyaW5nLCBmbTogTm90ZUZyb250TWF0dGVyLCBpbnNpZGVDb2RlQmxvY2s6IGJvb2xlYW4pID0+IHN0cmluZyxcbiAgbWF4T3V0cHV0VG9rZW5zID0gNTEyLFxuICBwbGFjZW1lbnQ/OiBcImN1cnNvclwiIHwgXCJlbmQtb2Ytbm90ZVwiIHwgXCJiZWxvdy1zZWxlY3Rpb25cIlxuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IGNvbnRleHQgPSBhd2FpdCBwbHVnaW4uZ2V0QWN0aXZlTm90ZUNvbnRleHQoKTtcbiAgaWYgKCFjb250ZXh0KSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCBlZGl0b3IgPSBjb250ZXh0LnZpZXcuZWRpdG9yO1xuICAgIGxldCB0YXJnZXRMaW5lOiBudW1iZXI7XG4gICAgaWYgKHBsYWNlbWVudCA9PT0gXCJiZWxvdy1zZWxlY3Rpb25cIikge1xuICAgICAgdGFyZ2V0TGluZSA9IGVkaXRvci5saXN0U2VsZWN0aW9ucygpWzBdPy5oZWFkLmxpbmUgPz8gZWRpdG9yLmdldEN1cnNvcigpLmxpbmU7XG4gICAgfSBlbHNlIGlmIChwbGFjZW1lbnQgPT09IFwiZW5kLW9mLW5vdGVcIikge1xuICAgICAgdGFyZ2V0TGluZSA9IGVkaXRvci5sYXN0TGluZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0YXJnZXRMaW5lID0gZWRpdG9yLmdldEN1cnNvcigpLmxpbmU7XG4gICAgfVxuICAgIGNvbnN0IGluc2lkZUNvZGVCbG9jayA9IGlzSW5zaWRlQ29kZUJsb2NrKGVkaXRvciwgdGFyZ2V0TGluZSk7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBwbHVnaW4ucmVxdWVzdEdlbmVyYXRpb24oY29udGV4dC5mbSwgY29udGV4dC5ub3RlQm9keSwgdXNlck1lc3NhZ2UsIG1heE91dHB1dFRva2Vucyk7XG4gICAgY29uc3QgZm9ybWF0dGVkID0gZm9ybWF0dGVyKHJlc3BvbnNlLnRleHQsIGNvbnRleHQuZm0sIGluc2lkZUNvZGVCbG9jayk7XG4gICAgaWYgKHBsYWNlbWVudCA9PT0gXCJiZWxvdy1zZWxlY3Rpb25cIikge1xuICAgICAgaW5zZXJ0QmVsb3dTZWxlY3Rpb24oZWRpdG9yLCBmb3JtYXR0ZWQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwbHVnaW4uaW5zZXJ0VGV4dChjb250ZXh0LnZpZXcsIGZvcm1hdHRlZCwgcGxhY2VtZW50KTtcbiAgICB9XG4gICAgcGx1Z2luLm1heWJlSW5zZXJ0VG9rZW5Db21tZW50KGNvbnRleHQudmlldywgcmVzcG9uc2UpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIG5ldyBOb3RpY2UoYFN5YnlsIGVycm9yOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gKTtcbiAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXJBbGxDb21tYW5kcyhwbHVnaW46IFN5YnlsUGx1Z2luKTogdm9pZCB7XG4gIHBsdWdpbi5hZGRDb21tYW5kKHtcbiAgICBpZDogXCJzeWJ5bDppbnNlcnQtZnJvbnRtYXR0ZXJcIixcbiAgICBuYW1lOiBcIkluc2VydCBOb3RlIEZyb250bWF0dGVyXCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGNvbnRleHQgPSBhd2FpdCBwbHVnaW4uZ2V0QWN0aXZlTm90ZUNvbnRleHQoKTtcbiAgICAgIGlmICghY29udGV4dD8udmlldy5maWxlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHZhbHVlcyA9IGF3YWl0IG9wZW5JbnB1dE1vZGFsKHBsdWdpbi5hcHAsIFwiSW5zZXJ0IFN5YnlsIEZyb250bWF0dGVyXCIsIFtcbiAgICAgICAgeyBrZXk6IFwicnVsZXNldFwiLCBsYWJlbDogXCJHYW1lIC8gcnVsZXNldFwiLCBwbGFjZWhvbGRlcjogXCJJcm9uc3dvcm5cIiB9LFxuICAgICAgICB7IGtleTogXCJnZW5yZVwiLCBsYWJlbDogXCJHZW5yZVwiLCBvcHRpb25hbDogdHJ1ZSwgcGxhY2Vob2xkZXI6IFwiRGFyayBmYW50YXN5IC8gc3Vydml2YWxcIiB9LFxuICAgICAgICB7IGtleTogXCJwY3NcIiwgbGFiZWw6IFwiUENcIiwgb3B0aW9uYWw6IHRydWUsIHBsYWNlaG9sZGVyOiBcIktpcmEgVm9zcywgZGFuZ2Vyb3VzIHJhbmssIHZvdzogcmVjb3ZlciB0aGUgcmVsaWNcIiB9LFxuICAgICAgICB7IGtleTogXCJ0b25lXCIsIGxhYmVsOiBcIlRvbmVcIiwgb3B0aW9uYWw6IHRydWUsIHBsYWNlaG9sZGVyOiBcIkdyaXR0eSwgaG9wZWZ1bFwiIH0sXG4gICAgICAgIHsga2V5OiBcImxhbmd1YWdlXCIsIGxhYmVsOiBcIkxhbmd1YWdlXCIsIG9wdGlvbmFsOiB0cnVlLCBwbGFjZWhvbGRlcjogXCJMZWF2ZSBibGFuayBmb3IgYXV0by1kZXRlY3RcIiB9XG4gICAgICBdKTtcbiAgICAgIGlmICghdmFsdWVzKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICghdmFsdWVzLnJ1bGVzZXQpIHtcbiAgICAgICAgbmV3IE5vdGljZShcIlJ1bGVzZXQgaXMgcmVxdWlyZWQuXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBhd2FpdCBwbHVnaW4uYXBwLmZpbGVNYW5hZ2VyLnByb2Nlc3NGcm9udE1hdHRlcihjb250ZXh0LnZpZXcuZmlsZSwgKGZtKSA9PiB7XG4gICAgICAgIGZtW1wicnVsZXNldFwiXSA9IHZhbHVlcy5ydWxlc2V0O1xuICAgICAgICBmbVtcInByb3ZpZGVyXCJdID0gZm1bXCJwcm92aWRlclwiXSA/PyBwbHVnaW4uc2V0dGluZ3MuYWN0aXZlUHJvdmlkZXI7XG4gICAgICAgIGZtW1wib3JhY2xlX21vZGVcIl0gPSBmbVtcIm9yYWNsZV9tb2RlXCJdID8/IFwieWVzLW5vXCI7XG4gICAgICAgIGZtW1wibG9uZWxvZ1wiXSA9IGZtW1wibG9uZWxvZ1wiXSA/PyBwbHVnaW4uc2V0dGluZ3MubG9uZWxvZ01vZGU7XG4gICAgICAgIGZtW1wic2NlbmVfY291bnRlclwiXSA9IGZtW1wic2NlbmVfY291bnRlclwiXSA/PyAxO1xuICAgICAgICBmbVtcInNlc3Npb25fbnVtYmVyXCJdID0gZm1bXCJzZXNzaW9uX251bWJlclwiXSA/PyAxO1xuICAgICAgICBmbVtcImdhbWVfY29udGV4dFwiXSA9IGZtW1wiZ2FtZV9jb250ZXh0XCJdID8/IFwiXCI7XG4gICAgICAgIGZtW1wic2NlbmVfY29udGV4dFwiXSA9IGZtW1wic2NlbmVfY29udGV4dFwiXSA/PyBcIlwiO1xuICAgICAgICBpZiAodmFsdWVzLmdlbnJlKSBmbVtcImdlbnJlXCJdID0gdmFsdWVzLmdlbnJlO1xuICAgICAgICBpZiAodmFsdWVzLnBjcykgZm1bXCJwY3NcIl0gPSB2YWx1ZXMucGNzO1xuICAgICAgICBpZiAodmFsdWVzLnRvbmUpIGZtW1widG9uZVwiXSA9IHZhbHVlcy50b25lO1xuICAgICAgICBpZiAodmFsdWVzLmxhbmd1YWdlKSBmbVtcImxhbmd1YWdlXCJdID0gdmFsdWVzLmxhbmd1YWdlO1xuICAgICAgfSk7XG4gICAgICBuZXcgTm90aWNlKFwiU3lieWwgZnJvbnRtYXR0ZXIgaW5zZXJ0ZWQuXCIpO1xuICAgIH1cbiAgfSk7XG5cbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOmRpZ2VzdC1zb3VyY2VcIixcbiAgICBuYW1lOiBcIkRpZ2VzdCBTb3VyY2UgaW50byBHYW1lIENvbnRleHRcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY29udGV4dCA9IGF3YWl0IHBsdWdpbi5nZXRBY3RpdmVOb3RlQ29udGV4dCgpO1xuICAgICAgaWYgKCFjb250ZXh0Py52aWV3LmZpbGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgdmF1bHRGaWxlID0gYXdhaXQgcGlja1ZhdWx0RmlsZShwbHVnaW4uYXBwLCBcIkNob29zZSBhIHNvdXJjZSBmaWxlIHRvIGRpZ2VzdFwiKTtcbiAgICAgIGlmICghdmF1bHRGaWxlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJlZjogU291cmNlUmVmID0ge1xuICAgICAgICBsYWJlbDogdmF1bHRGaWxlLmJhc2VuYW1lLFxuICAgICAgICBtaW1lX3R5cGU6IGluZmVyTWltZVR5cGUodmF1bHRGaWxlKSxcbiAgICAgICAgdmF1bHRfcGF0aDogdmF1bHRGaWxlLnBhdGhcbiAgICAgIH07XG4gICAgICBjb25zdCBwcm92aWRlcklkID0gY29udGV4dC5mbS5wcm92aWRlciA/PyBwbHVnaW4uc2V0dGluZ3MuYWN0aXZlUHJvdmlkZXI7XG4gICAgICBsZXQgcmVzb2x2ZWRTb3VyY2VzO1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzb2x2ZWRTb3VyY2VzID0gYXdhaXQgcmVzb2x2ZVNvdXJjZXNGb3JSZXF1ZXN0KHBsdWdpbi5hcHAsIFtyZWZdLCBwcm92aWRlcklkKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoYENhbm5vdCByZWFkIHNvdXJjZTogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJ1bGVzZXQgPSBjb250ZXh0LmZtLnJ1bGVzZXQgPz8gXCJ0aGUgZ2FtZVwiO1xuICAgICAgY29uc3QgZGlnZXN0UHJvbXB0ID0gYERpc3RpbGwgdGhlIGZvbGxvd2luZyBzb3VyY2UgbWF0ZXJpYWwgZm9yIHVzZSBpbiBhIHNvbG8gdGFibGV0b3AgUlBHIHNlc3Npb24gb2YgXCIke3J1bGVzZXR9XCIuXG5cbkV4dHJhY3QgYW5kIGNvbmRlbnNlIGludG8gYSBjb21wYWN0IHJlZmVyZW5jZTpcbi0gQ29yZSBydWxlcyBhbmQgbWVjaGFuaWNzIHJlbGV2YW50IHRvIHBsYXlcbi0gS2V5IGZhY3Rpb25zLCBsb2NhdGlvbnMsIGNoYXJhY3RlcnMsIGFuZCB3b3JsZCBmYWN0c1xuLSBUb25lLCBnZW5yZSwgYW5kIHNldHRpbmcgY29udmVudGlvbnNcbi0gQW55IHRhYmxlcywgbW92ZSBsaXN0cywgb3IgcmFuZG9tIGdlbmVyYXRvcnNcblxuQmUgY29uY2lzZSBhbmQgc3BlY2lmaWMuIFByZXNlcnZlIGdhbWUtbWVjaGFuaWNhbCBkZXRhaWxzLiBPbWl0IGZsYXZvciBwcm9zZSBhbmQgZXhhbXBsZXMuYDtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcGx1Z2luLnJlcXVlc3RSYXdHZW5lcmF0aW9uKFxuICAgICAgICAgIGNvbnRleHQuZm0sXG4gICAgICAgICAgZGlnZXN0UHJvbXB0LFxuICAgICAgICAgIDIwMDAsXG4gICAgICAgICAgcmVzb2x2ZWRTb3VyY2VzXG4gICAgICAgICk7XG4gICAgICAgIGF3YWl0IHBsdWdpbi5hcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGNvbnRleHQudmlldy5maWxlLCAoZm0pID0+IHtcbiAgICAgICAgICBmbVtcImdhbWVfY29udGV4dFwiXSA9IHJlc3BvbnNlLnRleHQ7XG4gICAgICAgIH0pO1xuICAgICAgICBuZXcgTm90aWNlKFwiR2FtZSBjb250ZXh0IHVwZGF0ZWQuXCIpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgbmV3IE5vdGljZShgU3lieWwgZXJyb3I6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOmFzay10aGUtcnVsZXNcIixcbiAgICBuYW1lOiBcIkFzayB0aGUgUnVsZXNcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY29udGV4dCA9IGF3YWl0IHBsdWdpbi5nZXRBY3RpdmVOb3RlQ29udGV4dCgpO1xuICAgICAgaWYgKCFjb250ZXh0Py52aWV3LmZpbGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3Qgc291cmNlcyA9IGNvbnRleHQuZm0uc291cmNlcyA/PyBbXTtcbiAgICAgIGlmICghc291cmNlcy5sZW5ndGgpIHtcbiAgICAgICAgbmV3IE5vdGljZShcIk5vIHNvdXJjZXMgYXR0YWNoZWQgdG8gdGhpcyBub3RlLiBVc2UgQWRkIFNvdXJjZSBGaWxlIGZpcnN0LlwiKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgcmVmID0gc291cmNlcy5sZW5ndGggPT09IDFcbiAgICAgICAgPyBzb3VyY2VzWzBdXG4gICAgICAgIDogYXdhaXQgcGlja1NvdXJjZVJlZihwbHVnaW4uYXBwLCBcIkNob29zZSBhIHNvdXJjZSB0byBxdWVyeVwiLCBzb3VyY2VzKTtcbiAgICAgIGlmICghcmVmKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHZhbHVlcyA9IGF3YWl0IG9wZW5JbnB1dE1vZGFsKHBsdWdpbi5hcHAsIFwiQXNrIHRoZSBSdWxlc1wiLCBbXG4gICAgICAgIHsga2V5OiBcInF1ZXN0aW9uXCIsIGxhYmVsOiBcIlF1ZXN0aW9uXCIsIHBsYWNlaG9sZGVyOiBcIkhvdyBkb2VzIE1vbWVudHVtIHdvcms/XCIgfVxuICAgICAgXSk7XG4gICAgICBpZiAoIXZhbHVlcz8ucXVlc3Rpb24pIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgcHJvdmlkZXJJZCA9IGNvbnRleHQuZm0ucHJvdmlkZXIgPz8gcGx1Z2luLnNldHRpbmdzLmFjdGl2ZVByb3ZpZGVyO1xuICAgICAgbGV0IHJlc29sdmVkU291cmNlcztcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc29sdmVkU291cmNlcyA9IGF3YWl0IHJlc29sdmVTb3VyY2VzRm9yUmVxdWVzdChwbHVnaW4uYXBwLCBbcmVmXSwgcHJvdmlkZXJJZCk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBuZXcgTm90aWNlKGBDYW5ub3QgcmVhZCBzb3VyY2U6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCBydWxlc2V0ID0gY29udGV4dC5mbS5ydWxlc2V0ID8/IFwidGhlIGdhbWVcIjtcbiAgICAgIGNvbnN0IHByb21wdCA9IGBZb3UgYXJlIGEgcnVsZXMgcmVmZXJlbmNlIGZvciBcIiR7cnVsZXNldH1cIi5cbkFuc3dlciB0aGUgZm9sbG93aW5nIHF1ZXN0aW9uIHVzaW5nIG9ubHkgdGhlIHByb3ZpZGVkIHNvdXJjZSBtYXRlcmlhbC5cbkJlIHByZWNpc2UgYW5kIGNpdGUgdGhlIHJlbGV2YW50IHJ1bGUgb3IgcGFnZSBzZWN0aW9uIGlmIHBvc3NpYmxlLlxuXG5RdWVzdGlvbjogJHt2YWx1ZXMucXVlc3Rpb259YDtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcGx1Z2luLnJlcXVlc3RSYXdHZW5lcmF0aW9uKGNvbnRleHQuZm0sIHByb21wdCwgMTAwMCwgcmVzb2x2ZWRTb3VyY2VzKTtcbiAgICAgICAgcGx1Z2luLmluc2VydFRleHQoY29udGV4dC52aWV3LCBnZW5lcmljQmxvY2txdW90ZShcIlJ1bGVzXCIsIHJlc3BvbnNlLnRleHQpKTtcbiAgICAgICAgcGx1Z2luLm1heWJlSW5zZXJ0VG9rZW5Db21tZW50KGNvbnRleHQudmlldywgcmVzcG9uc2UpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgbmV3IE5vdGljZShgU3lieWwgZXJyb3I6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOmFkdmVudHVyZS1zZWVkXCIsXG4gICAgbmFtZTogXCJBZHZlbnR1cmUgU2VlZFwiLFxuICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjb250ZXh0ID0gYXdhaXQgcGx1Z2luLmdldEFjdGl2ZU5vdGVDb250ZXh0KCk7XG4gICAgICBpZiAoIWNvbnRleHQ/LnZpZXcuZmlsZSkgcmV0dXJuO1xuICAgICAgY29uc3QgdmFsdWVzID0gYXdhaXQgb3BlbklucHV0TW9kYWwocGx1Z2luLmFwcCwgXCJBZHZlbnR1cmUgU2VlZFwiLCBbXG4gICAgICAgIHsga2V5OiBcImNvbmNlcHRcIiwgbGFiZWw6IFwiVGhlbWUgb3IgY29uY2VwdFwiLCBvcHRpb25hbDogdHJ1ZSwgcGxhY2Vob2xkZXI6IFwiTGVhdmUgYmxhbmsgZm9yIGEgcmFuZG9tIHNlZWQuXCIgfVxuICAgICAgXSk7XG4gICAgICBpZiAoIXZhbHVlcykgcmV0dXJuO1xuICAgICAgY29uc3QgcnVsZXNldCA9IGNvbnRleHQuZm0ucnVsZXNldCA/PyBcInRoZSBnYW1lXCI7XG4gICAgICBjb25zdCBjb25jZXB0ID0gdmFsdWVzLmNvbmNlcHQ/LnRyaW0oKTtcbiAgICAgIGNvbnN0IHByb21wdCA9IGBHZW5lcmF0ZSBhbiBhZHZlbnR1cmUgc2VlZCBmb3IgYSBzb2xvIHRhYmxldG9wIFJQRyBzZXNzaW9uIG9mIFwiJHtydWxlc2V0fVwiLlxuXG5TdHJ1Y3R1cmUgdGhlIG91dHB1dCBhczpcbi0gUHJlbWlzZTogb25lIHNlbnRlbmNlIGRlc2NyaWJpbmcgdGhlIHNpdHVhdGlvblxuLSBDb25mbGljdDogdGhlIGNlbnRyYWwgdGVuc2lvbiBvciB0aHJlYXRcbi0gSG9vazogdGhlIHNwZWNpZmljIGV2ZW50IHRoYXQgcHVsbHMgdGhlIFBDIGluXG4tIFRvbmU6IHRoZSBpbnRlbmRlZCBhdG1vc3BoZXJlXG5cbiR7Y29uY2VwdCA/IGBUaGVtZS9jb25jZXB0OiAke2NvbmNlcHR9YCA6IFwiTWFrZSBpdCBldm9jYXRpdmUgYW5kIGltbWVkaWF0ZWx5IHBsYXlhYmxlLlwifVxuS2VlcCBpdCBjb25jaXNlIFx1MjAxNCA0IGJ1bGxldCBwb2ludHMsIG9uZSBzaG9ydCBzZW50ZW5jZSBlYWNoLmA7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHBsdWdpbi5yZXF1ZXN0UmF3R2VuZXJhdGlvbihjb250ZXh0LmZtLCBwcm9tcHQsIDgwMCwgW10pO1xuICAgICAgICBjb25zdCBsb25lbG9nID0gaXNMb25lbG9nQWN0aXZlKHBsdWdpbi5zZXR0aW5ncywgY29udGV4dC5mbSk7XG4gICAgICAgIGNvbnN0IGluc2lkZUNvZGVCbG9jayA9IGlzSW5zaWRlQ29kZUJsb2NrKGNvbnRleHQudmlldy5lZGl0b3IpO1xuICAgICAgICBjb25zdCBvdXRwdXQgPSBsb25lbG9nXG4gICAgICAgICAgPyBmb3JtYXRBZHZlbnR1cmVTZWVkKHJlc3BvbnNlLnRleHQsIGxvbmVsb2dPcHRzKHBsdWdpbi5zZXR0aW5ncywgaW5zaWRlQ29kZUJsb2NrKSlcbiAgICAgICAgICA6IGdlbmVyaWNCbG9ja3F1b3RlKFwiQWR2ZW50dXJlIFNlZWRcIiwgcmVzcG9uc2UudGV4dCk7XG4gICAgICAgIHBsdWdpbi5pbnNlcnRUZXh0KGNvbnRleHQudmlldywgb3V0cHV0KTtcbiAgICAgICAgcGx1Z2luLm1heWJlSW5zZXJ0VG9rZW5Db21tZW50KGNvbnRleHQudmlldywgcmVzcG9uc2UpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgbmV3IE5vdGljZShgU3lieWwgZXJyb3I6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOmdlbmVyYXRlLWNoYXJhY3RlclwiLFxuICAgIG5hbWU6IFwiR2VuZXJhdGUgQ2hhcmFjdGVyXCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGNvbnRleHQgPSBhd2FpdCBwbHVnaW4uZ2V0QWN0aXZlTm90ZUNvbnRleHQoKTtcbiAgICAgIGlmICghY29udGV4dD8udmlldy5maWxlKSByZXR1cm47XG4gICAgICBjb25zdCBzb3VyY2VzID0gY29udGV4dC5mbS5zb3VyY2VzID8/IFtdO1xuICAgICAgaWYgKCFzb3VyY2VzLmxlbmd0aCkge1xuICAgICAgICBuZXcgTm90aWNlKFwiTm8gc291cmNlcyBhdHRhY2hlZCB0byB0aGlzIG5vdGUuIEFkZCBhIHJ1bGVib29rIGZpcnN0IHZpYSBBZGQgU291cmNlIEZpbGUuXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCByZWYgPSBzb3VyY2VzLmxlbmd0aCA9PT0gMVxuICAgICAgICA/IHNvdXJjZXNbMF1cbiAgICAgICAgOiBhd2FpdCBwaWNrU291cmNlUmVmKHBsdWdpbi5hcHAsIFwiQ2hvb3NlIGEgcnVsZWJvb2sgc291cmNlXCIsIHNvdXJjZXMpO1xuICAgICAgaWYgKCFyZWYpIHJldHVybjtcbiAgICAgIGNvbnN0IHZhbHVlcyA9IGF3YWl0IG9wZW5JbnB1dE1vZGFsKHBsdWdpbi5hcHAsIFwiR2VuZXJhdGUgQ2hhcmFjdGVyXCIsIFtcbiAgICAgICAgeyBrZXk6IFwiY29uY2VwdFwiLCBsYWJlbDogXCJDaGFyYWN0ZXIgY29uY2VwdFwiLCBvcHRpb25hbDogdHJ1ZSwgcGxhY2Vob2xkZXI6IFwiTGVhdmUgYmxhbmsgZm9yIGEgcmFuZG9tIGNoYXJhY3Rlci5cIiB9XG4gICAgICBdKTtcbiAgICAgIGlmICghdmFsdWVzKSByZXR1cm47XG4gICAgICBjb25zdCBwcm92aWRlcklkID0gY29udGV4dC5mbS5wcm92aWRlciA/PyBwbHVnaW4uc2V0dGluZ3MuYWN0aXZlUHJvdmlkZXI7XG4gICAgICBsZXQgcmVzb2x2ZWRTb3VyY2VzO1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzb2x2ZWRTb3VyY2VzID0gYXdhaXQgcmVzb2x2ZVNvdXJjZXNGb3JSZXF1ZXN0KHBsdWdpbi5hcHAsIFtyZWZdLCBwcm92aWRlcklkKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoYENhbm5vdCByZWFkIHNvdXJjZTogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJ1bGVzZXQgPSBjb250ZXh0LmZtLnJ1bGVzZXQgPz8gXCJ0aGUgZ2FtZVwiO1xuICAgICAgY29uc3QgY29uY2VwdCA9IHZhbHVlcy5jb25jZXB0Py50cmltKCk7XG4gICAgICBjb25zdCBsb25lbG9nID0gaXNMb25lbG9nQWN0aXZlKHBsdWdpbi5zZXR0aW5ncywgY29udGV4dC5mbSk7XG4gICAgICBjb25zdCBmb3JtYXRJbnN0cnVjdGlvbiA9IGxvbmVsb2dcbiAgICAgICAgPyBgRm9ybWF0IHRoZSBvdXRwdXQgYXMgYSBMb25lbG9nIFBDIHRhZy4gVXNlIHRoZSBtdWx0aS1saW5lIGZvcm0gZm9yIGNvbXBsZXggY2hhcmFjdGVyczpcbltQQzpOYW1lXG4gIHwgc3RhdDogSFAgWCwgU3RyZXNzIFlcbiAgfCBnZWFyOiBpdGVtMSwgaXRlbTJcbiAgfCB0cmFpdDogdmFsdWUxLCB2YWx1ZTJcbl1cbkluY2x1ZGUgYWxsIHN0YXRzIGFuZCBmaWVsZHMgZXhhY3RseSBhcyBkZWZpbmVkIGJ5IHRoZSBydWxlcy4gT3V0cHV0IHRoZSB0YWcgb25seSBcdTIwMTQgbm8gZXh0cmEgY29tbWVudGFyeS5gXG4gICAgICAgIDogYEluY2x1ZGUgYWxsIHJlcXVpcmVkIGZpZWxkcyBhcyBkZWZpbmVkIGJ5IHRoZSBydWxlczogbmFtZSwgc3RhdHMvYXR0cmlidXRlcywgc3RhcnRpbmcgZXF1aXBtZW50LCBiYWNrZ3JvdW5kLCBhbmQgYW55IG90aGVyIG1hbmRhdG9yeSBjaGFyYWN0ZXIgZWxlbWVudHMuIEZvcm1hdCBjbGVhcmx5IHdpdGggb25lIGZpZWxkIHBlciBsaW5lLmA7XG4gICAgICBjb25zdCBwcm9tcHQgPSBgVXNpbmcgT05MWSB0aGUgY2hhcmFjdGVyIGNyZWF0aW9uIHJ1bGVzIGluIHRoZSBwcm92aWRlZCBzb3VyY2UgbWF0ZXJpYWwsIGdlbmVyYXRlIGEgY2hhcmFjdGVyIGZvciBcIiR7cnVsZXNldH1cIi5cblxuRm9sbG93IHRoZSBleGFjdCBjaGFyYWN0ZXIgY3JlYXRpb24gcHJvY2VkdXJlIGRlc2NyaWJlZCBpbiB0aGUgcnVsZXMuIERvIG5vdCBpbnZlbnQgbWVjaGFuaWNzIG5vdCBwcmVzZW50IGluIHRoZSBzb3VyY2UuXG5cbiR7Y29uY2VwdCA/IGBDaGFyYWN0ZXIgY29uY2VwdDogJHtjb25jZXB0fWAgOiBcIkdlbmVyYXRlIGEgcmFuZG9tIGNoYXJhY3Rlci5cIn1cblxuJHtmb3JtYXRJbnN0cnVjdGlvbn1gO1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBwbHVnaW4ucmVxdWVzdFJhd0dlbmVyYXRpb24oY29udGV4dC5mbSwgcHJvbXB0LCAxNTAwLCByZXNvbHZlZFNvdXJjZXMpO1xuICAgICAgICBjb25zdCBpbnNpZGVDb2RlQmxvY2sgPSBpc0luc2lkZUNvZGVCbG9jayhjb250ZXh0LnZpZXcuZWRpdG9yKTtcbiAgICAgICAgY29uc3Qgb3V0cHV0ID0gbG9uZWxvZ1xuICAgICAgICAgID8gZm9ybWF0Q2hhcmFjdGVyKHJlc3BvbnNlLnRleHQsIGxvbmVsb2dPcHRzKHBsdWdpbi5zZXR0aW5ncywgaW5zaWRlQ29kZUJsb2NrKSlcbiAgICAgICAgICA6IGdlbmVyaWNCbG9ja3F1b3RlKFwiQ2hhcmFjdGVyXCIsIHJlc3BvbnNlLnRleHQpO1xuICAgICAgICBwbHVnaW4uaW5zZXJ0VGV4dChjb250ZXh0LnZpZXcsIG91dHB1dCk7XG4gICAgICAgIHBsdWdpbi5tYXliZUluc2VydFRva2VuQ29tbWVudChjb250ZXh0LnZpZXcsIHJlc3BvbnNlKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoYFN5YnlsIGVycm9yOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIHBsdWdpbi5hZGRDb21tYW5kKHtcbiAgICBpZDogXCJzeWJ5bDpzdGFydC1zY2VuZVwiLFxuICAgIG5hbWU6IFwiU3RhcnQgU2NlbmVcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY29udGV4dCA9IGF3YWl0IHBsdWdpbi5nZXRBY3RpdmVOb3RlQ29udGV4dCgpO1xuICAgICAgaWYgKCFjb250ZXh0Py52aWV3LmZpbGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKGlzTG9uZWxvZ0FjdGl2ZShwbHVnaW4uc2V0dGluZ3MsIGNvbnRleHQuZm0pKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlcyA9IGF3YWl0IG9wZW5JbnB1dE1vZGFsKHBsdWdpbi5hcHAsIFwiU3RhcnQgU2NlbmVcIiwgW1xuICAgICAgICAgIHsga2V5OiBcInNjZW5lRGVzY1wiLCBsYWJlbDogXCJTY2VuZSBkZXNjcmlwdGlvblwiLCBwbGFjZWhvbGRlcjogXCJEYXJrIGFsbGV5LCBtaWRuaWdodFwiIH1cbiAgICAgICAgXSk7XG4gICAgICAgIGlmICghdmFsdWVzPy5zY2VuZURlc2MpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY291bnRlciA9IGNvbnRleHQuZm0uc2NlbmVfY291bnRlciA/PyAxO1xuICAgICAgICBhd2FpdCBydW5HZW5lcmF0aW9uKFxuICAgICAgICAgIHBsdWdpbixcbiAgICAgICAgICBgU1RBUlQgU0NFTkUuIEdlbmVyYXRlIG9ubHk6IDItMyBsaW5lcyBvZiB0aGlyZC1wZXJzb24gcGFzdC10ZW5zZSBwcm9zZSBkZXNjcmliaW5nIHRoZSBhdG1vc3BoZXJlIGFuZCBzZXR0aW5nIG9mOiBcIiR7dmFsdWVzLnNjZW5lRGVzY31cIi4gTm8gZGlhbG9ndWUuIE5vIFBDIGFjdGlvbnMuIE5vIGFkZGl0aW9uYWwgY29tbWVudGFyeS5gLFxuICAgICAgICAgICh0ZXh0LCBfZm0sIGluc2lkZUNvZGVCbG9jaykgPT4gZm9ybWF0U3RhcnRTY2VuZSh0ZXh0LCBgUyR7Y291bnRlcn1gLCB2YWx1ZXMuc2NlbmVEZXNjLCBsb25lbG9nT3B0cyhwbHVnaW4uc2V0dGluZ3MsIGluc2lkZUNvZGVCbG9jaykpXG4gICAgICAgICk7XG4gICAgICAgIGlmIChwbHVnaW4uc2V0dGluZ3MubG9uZWxvZ0F1dG9JbmNTY2VuZSkge1xuICAgICAgICAgIGF3YWl0IHdyaXRlRnJvbnRNYXR0ZXJLZXkocGx1Z2luLmFwcCwgY29udGV4dC52aWV3LmZpbGUsIFwic2NlbmVfY291bnRlclwiLCBjb3VudGVyICsgMSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgYXdhaXQgcnVuR2VuZXJhdGlvbihcbiAgICAgICAgcGx1Z2luLFxuICAgICAgICBcIlNUQVJUIFNDRU5FLiBHZW5lcmF0ZSBvbmx5OiAyLTMgbGluZXMgb2YgdGhpcmQtcGVyc29uIHBhc3QtdGVuc2UgcHJvc2UgZGVzY3JpYmluZyB0aGUgc2V0dGluZyBhbmQgYXRtb3NwaGVyZS4gTm8gZGlhbG9ndWUuIE5vIFBDIGFjdGlvbnMuIE5vIGFkZGl0aW9uYWwgY29tbWVudGFyeS5cIixcbiAgICAgICAgKHRleHQpID0+IGdlbmVyaWNCbG9ja3F1b3RlKFwiU2NlbmVcIiwgdGV4dClcbiAgICAgICk7XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6ZGVjbGFyZS1hY3Rpb25cIixcbiAgICBuYW1lOiBcIkRlY2xhcmUgQWN0aW9uXCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlcyA9IGF3YWl0IG9wZW5JbnB1dE1vZGFsKHBsdWdpbi5hcHAsIFwiRGVjbGFyZSBBY3Rpb25cIiwgW1xuICAgICAgICB7IGtleTogXCJhY3Rpb25cIiwgbGFiZWw6IFwiQWN0aW9uXCIgfSxcbiAgICAgICAgeyBrZXk6IFwicm9sbFwiLCBsYWJlbDogXCJSb2xsIHJlc3VsdFwiIH1cbiAgICAgIF0pO1xuICAgICAgaWYgKCF2YWx1ZXM/LmFjdGlvbiB8fCAhdmFsdWVzLnJvbGwpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgYXdhaXQgcnVuR2VuZXJhdGlvbihcbiAgICAgICAgcGx1Z2luLFxuICAgICAgICBgUEMgYWN0aW9uOiAke3ZhbHVlcy5hY3Rpb259XFxuUm9sbCByZXN1bHQ6ICR7dmFsdWVzLnJvbGx9XFxuRGVzY3JpYmUgb25seSB0aGUgY29uc2VxdWVuY2VzIGFuZCB3b3JsZCByZWFjdGlvbi4gRG8gbm90IGRlc2NyaWJlIHRoZSBQQydzIGFjdGlvbi5gLFxuICAgICAgICAodGV4dCwgZm0sIGluc2lkZUNvZGVCbG9jaykgPT5cbiAgICAgICAgICBpc0xvbmVsb2dBY3RpdmUocGx1Z2luLnNldHRpbmdzLCBmbSlcbiAgICAgICAgICAgID8gZm9ybWF0RGVjbGFyZUFjdGlvbih2YWx1ZXMuYWN0aW9uLCB2YWx1ZXMucm9sbCwgdGV4dCwgbG9uZWxvZ09wdHMocGx1Z2luLnNldHRpbmdzLCBpbnNpZGVDb2RlQmxvY2spKVxuICAgICAgICAgICAgOiBgPiBbQWN0aW9uXSAke3ZhbHVlcy5hY3Rpb259IHwgUm9sbDogJHt2YWx1ZXMucm9sbH1cXG4+IFtSZXN1bHRdICR7dGV4dC50cmltKCkucmVwbGFjZSgvXFxuL2csIFwiXFxuPiBcIil9YFxuICAgICAgKTtcbiAgICB9XG4gIH0pO1xuXG4gIHBsdWdpbi5hZGRDb21tYW5kKHtcbiAgICBpZDogXCJzeWJ5bDphc2stb3JhY2xlXCIsXG4gICAgbmFtZTogXCJBc2sgT3JhY2xlXCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGNvbnRleHQgPSBhd2FpdCBwbHVnaW4uZ2V0QWN0aXZlTm90ZUNvbnRleHQoKTtcbiAgICAgIGlmICghY29udGV4dCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCB2YWx1ZXMgPSBhd2FpdCBvcGVuSW5wdXRNb2RhbChwbHVnaW4uYXBwLCBcIkFzayBPcmFjbGVcIiwgW1xuICAgICAgICB7IGtleTogXCJxdWVzdGlvblwiLCBsYWJlbDogXCJRdWVzdGlvblwiIH0sXG4gICAgICAgIHsga2V5OiBcInJlc3VsdFwiLCBsYWJlbDogXCJPcmFjbGUgcmVzdWx0XCIsIG9wdGlvbmFsOiB0cnVlIH1cbiAgICAgIF0pO1xuICAgICAgaWYgKCF2YWx1ZXM/LnF1ZXN0aW9uKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGhhc1Jlc3VsdCA9IEJvb2xlYW4odmFsdWVzLnJlc3VsdD8udHJpbSgpKTtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBoYXNSZXN1bHRcbiAgICAgICAgPyBgT3JhY2xlIHF1ZXN0aW9uOiAke3ZhbHVlcy5xdWVzdGlvbn1cXG5PcmFjbGUgcmVzdWx0OiAke3ZhbHVlcy5yZXN1bHR9XFxuSW50ZXJwcmV0IHRoaXMgcmVzdWx0IGluIHRoZSBjb250ZXh0IG9mIHRoZSBzY2VuZS4gVGhpcmQgcGVyc29uLCBuZXV0cmFsLCAyLTMgbGluZXMuYFxuICAgICAgICA6IGBPcmFjbGUgcXVlc3Rpb246ICR7dmFsdWVzLnF1ZXN0aW9ufVxcbk9yYWNsZSBtb2RlOiAke2NvbnRleHQuZm0ub3JhY2xlX21vZGUgPz8gXCJ5ZXMtbm9cIn1cXG5SdW4gdGhlIG9yYWNsZSBhbmQgZ2l2ZSB0aGUgcmVzdWx0IHBsdXMgYSAxLTIgbGluZSBuZXV0cmFsIGludGVycHJldGF0aW9uLmA7XG4gICAgICBhd2FpdCBydW5HZW5lcmF0aW9uKFxuICAgICAgICBwbHVnaW4sXG4gICAgICAgIG1lc3NhZ2UsXG4gICAgICAgICh0ZXh0LCBmbSwgaW5zaWRlQ29kZUJsb2NrKSA9PiB7XG4gICAgICAgICAgaWYgKCFpc0xvbmVsb2dBY3RpdmUocGx1Z2luLnNldHRpbmdzLCBmbSkpIHtcbiAgICAgICAgICAgIHJldHVybiBgPiBbT3JhY2xlXSBROiAke3ZhbHVlcy5xdWVzdGlvbn1cXG4+IFtBbnN3ZXJdICR7dGV4dC50cmltKCkucmVwbGFjZSgvXFxuL2csIFwiXFxuPiBcIil9YDtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGhhc1Jlc3VsdCkge1xuICAgICAgICAgICAgcmV0dXJuIGZvcm1hdEFza09yYWNsZSh2YWx1ZXMucXVlc3Rpb24sIHZhbHVlcy5yZXN1bHQudHJpbSgpLCB0ZXh0LCBsb25lbG9nT3B0cyhwbHVnaW4uc2V0dGluZ3MsIGluc2lkZUNvZGVCbG9jaykpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBwYXJzZWQgPSBwYXJzZUxvbmVsb2dPcmFjbGVSZXNwb25zZSh0ZXh0KTtcbiAgICAgICAgICByZXR1cm4gZm9ybWF0QXNrT3JhY2xlKHZhbHVlcy5xdWVzdGlvbiwgcGFyc2VkLnJlc3VsdCwgcGFyc2VkLmludGVycHJldGF0aW9uLCBsb25lbG9nT3B0cyhwbHVnaW4uc2V0dGluZ3MsIGluc2lkZUNvZGVCbG9jaykpO1xuICAgICAgICB9XG4gICAgICApO1xuICAgIH1cbiAgfSk7XG5cbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOmludGVycHJldC1vcmFjbGVcIixcbiAgICBuYW1lOiBcIkludGVycHJldCBPcmFjbGUgUm9sbFwiLFxuICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjb250ZXh0ID0gYXdhaXQgcGx1Z2luLmdldEFjdGl2ZU5vdGVDb250ZXh0KCk7XG4gICAgICBpZiAoIWNvbnRleHQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgbGV0IHNlbGVjdGVkID0gZ2V0U2VsZWN0aW9uKGNvbnRleHQudmlldy5lZGl0b3IpO1xuICAgICAgaWYgKCFzZWxlY3RlZCkge1xuICAgICAgICBjb25zdCB2YWx1ZXMgPSBhd2FpdCBvcGVuSW5wdXRNb2RhbChwbHVnaW4uYXBwLCBcIkludGVycHJldCBPcmFjbGUgUmVzdWx0XCIsIFtcbiAgICAgICAgICB7IGtleTogXCJvcmFjbGVcIiwgbGFiZWw6IFwiT3JhY2xlIHJlc3VsdFwiIH1cbiAgICAgICAgXSk7XG4gICAgICAgIHNlbGVjdGVkID0gdmFsdWVzPy5vcmFjbGU/LnRyaW0oKSA/PyBcIlwiO1xuICAgICAgfVxuICAgICAgaWYgKCFzZWxlY3RlZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBhd2FpdCBydW5HZW5lcmF0aW9uKFxuICAgICAgICBwbHVnaW4sXG4gICAgICAgIGBJbnRlcnByZXQgdGhpcyBvcmFjbGUgcmVzdWx0IGluIHRoZSBjb250ZXh0IG9mIHRoZSBjdXJyZW50IHNjZW5lOiBcIiR7c2VsZWN0ZWR9XCJcXG5OZXV0cmFsLCB0aGlyZC1wZXJzb24sIDItMyBsaW5lcy4gTm8gZHJhbWF0aWMgbGFuZ3VhZ2UuYCxcbiAgICAgICAgKHRleHQsIGZtLCBpbnNpZGVDb2RlQmxvY2spID0+XG4gICAgICAgICAgaXNMb25lbG9nQWN0aXZlKHBsdWdpbi5zZXR0aW5ncywgZm0pXG4gICAgICAgICAgICA/IGZvcm1hdEludGVycHJldE9yYWNsZSh0ZXh0LCBsb25lbG9nT3B0cyhwbHVnaW4uc2V0dGluZ3MsIGluc2lkZUNvZGVCbG9jaykpXG4gICAgICAgICAgICA6IGdlbmVyaWNCbG9ja3F1b3RlKFwiSW50ZXJwcmV0YXRpb25cIiwgdGV4dCksXG4gICAgICAgIDUxMixcbiAgICAgICAgXCJiZWxvdy1zZWxlY3Rpb25cIlxuICAgICAgKTtcbiAgICB9XG4gIH0pO1xuXG4gIHBsdWdpbi5hZGRDb21tYW5kKHtcbiAgICBpZDogXCJzeWJ5bDpzdWdnZXN0LWNvbnNlcXVlbmNlXCIsXG4gICAgbmFtZTogXCJXaGF0IE5vd1wiLFxuICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICBhd2FpdCBydW5HZW5lcmF0aW9uKFxuICAgICAgICBwbHVnaW4sXG4gICAgICAgIFwiQmFzZWQgb24gdGhlIGN1cnJlbnQgc2NlbmUgY29udGV4dCwgc3VnZ2VzdCAxLTIgcG9zc2libGUgY29uc2VxdWVuY2VzIG9yIGNvbXBsaWNhdGlvbnMuIFByZXNlbnQgdGhlbSBhcyBuZXV0cmFsIG9wdGlvbnMsIG5vdCBhcyBuYXJyYXRpdmUgb3V0Y29tZXMuIERvIG5vdCBjaG9vc2UgYmV0d2VlbiB0aGVtLlwiLFxuICAgICAgICAodGV4dCwgZm0sIGluc2lkZUNvZGVCbG9jaykgPT5cbiAgICAgICAgICBpc0xvbmVsb2dBY3RpdmUocGx1Z2luLnNldHRpbmdzLCBmbSlcbiAgICAgICAgICAgID8gZm9ybWF0U3VnZ2VzdENvbnNlcXVlbmNlKHRleHQsIGxvbmVsb2dPcHRzKHBsdWdpbi5zZXR0aW5ncywgaW5zaWRlQ29kZUJsb2NrKSlcbiAgICAgICAgICAgIDogZ2VuZXJpY0Jsb2NrcXVvdGUoXCJPcHRpb25zXCIsIHRleHQpXG4gICAgICApO1xuICAgIH1cbiAgfSk7XG5cbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOndoYXQtY2FuLWktZG9cIixcbiAgICBuYW1lOiBcIldoYXQgQ2FuIEkgRG9cIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgYXdhaXQgcnVuR2VuZXJhdGlvbihcbiAgICAgICAgcGx1Z2luLFxuICAgICAgICBcIlRoZSBwbGF5ZXIgaXMgc3R1Y2suIEJhc2VkIG9uIHRoZSBjdXJyZW50IHNjZW5lIGNvbnRleHQsIHN1Z2dlc3QgZXhhY3RseSAzIGNvbmNyZXRlIGFjdGlvbnMgdGhlIFBDIGNvdWxkIHRha2UgbmV4dC4gUHJlc2VudCB0aGVtIGFzIG5ldXRyYWwgb3B0aW9ucyBudW1iZXJlZCAxXHUyMDEzMy4gRG8gbm90IHJlc29sdmUgb3IgbmFycmF0ZSBhbnkgb3V0Y29tZS4gRG8gbm90IHJlY29tbWVuZCBvbmUgb3ZlciBhbm90aGVyLlwiLFxuICAgICAgICAodGV4dCwgZm0sIGluc2lkZUNvZGVCbG9jaykgPT5cbiAgICAgICAgICBpc0xvbmVsb2dBY3RpdmUocGx1Z2luLnNldHRpbmdzLCBmbSlcbiAgICAgICAgICAgID8gZm9ybWF0U3VnZ2VzdENvbnNlcXVlbmNlKHRleHQsIGxvbmVsb2dPcHRzKHBsdWdpbi5zZXR0aW5ncywgaW5zaWRlQ29kZUJsb2NrKSlcbiAgICAgICAgICAgIDogZ2VuZXJpY0Jsb2NrcXVvdGUoXCJBY3Rpb25zXCIsIHRleHQpXG4gICAgICApO1xuICAgIH1cbiAgfSk7XG5cbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOmV4cGFuZC1zY2VuZVwiLFxuICAgIG5hbWU6IFwiRXhwYW5kIFNjZW5lXCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGF3YWl0IHJ1bkdlbmVyYXRpb24oXG4gICAgICAgIHBsdWdpbixcbiAgICAgICAgXCJFeHBhbmQgdGhlIGN1cnJlbnQgc2NlbmUgaW50byBhIHByb3NlIHBhc3NhZ2UuIFRoaXJkIHBlcnNvbiwgcGFzdCB0ZW5zZSwgMTAwLTE1MCB3b3Jkcy4gTm8gZGlhbG9ndWUuIERvIG5vdCBkZXNjcmliZSB0aGUgUEMncyBpbnRlcm5hbCB0aG91Z2h0cyBvciBkZWNpc2lvbnMuIFN0YXkgc3RyaWN0bHkgd2l0aGluIHRoZSBlc3RhYmxpc2hlZCBzY2VuZSBjb250ZXh0LlwiLFxuICAgICAgICAodGV4dCwgZm0sIGluc2lkZUNvZGVCbG9jaykgPT5cbiAgICAgICAgICBpc0xvbmVsb2dBY3RpdmUocGx1Z2luLnNldHRpbmdzLCBmbSlcbiAgICAgICAgICAgID8gZm9ybWF0RXhwYW5kU2NlbmUodGV4dCwgbG9uZWxvZ09wdHMocGx1Z2luLnNldHRpbmdzLCBpbnNpZGVDb2RlQmxvY2spKVxuICAgICAgICAgICAgOiBgLS0tXFxuPiBbUHJvc2VdICR7dGV4dC50cmltKCkucmVwbGFjZSgvXFxuL2csIFwiXFxuPiBcIil9XFxuLS0tYCxcbiAgICAgICAgNjAwXG4gICAgICApO1xuICAgIH1cbiAgfSk7XG5cbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOnVwbG9hZC1zb3VyY2VcIixcbiAgICBuYW1lOiBcIkFkZCBTb3VyY2UgRmlsZVwiLFxuICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjb250ZXh0ID0gYXdhaXQgcGx1Z2luLmdldEFjdGl2ZU5vdGVDb250ZXh0KCk7XG4gICAgICBpZiAoIWNvbnRleHQ/LnZpZXcuZmlsZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBhZGRTb3VyY2VUb05vdGUocGx1Z2luLCBjb250ZXh0LnZpZXcuZmlsZSk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBuZXcgTm90aWNlKGBTeWJ5bCBlcnJvcjogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6bWFuYWdlLXNvdXJjZXNcIixcbiAgICBuYW1lOiBcIk1hbmFnZSBTb3VyY2VzXCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGF3YWl0IG1hbmFnZVNvdXJjZXMocGx1Z2luKTtcbiAgICB9XG4gIH0pO1xuXG4gIHBsdWdpbi5hZGRDb21tYW5kKHtcbiAgICBpZDogXCJzeWJ5bDpsb25lbG9nLXBhcnNlLWNvbnRleHRcIixcbiAgICBuYW1lOiBcIlVwZGF0ZSBTY2VuZSBDb250ZXh0XCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGNvbnRleHQgPSBhd2FpdCBwbHVnaW4uZ2V0QWN0aXZlTm90ZUNvbnRleHQoKTtcbiAgICAgIGlmICghY29udGV4dD8udmlldy5maWxlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICghaXNMb25lbG9nQWN0aXZlKHBsdWdpbi5zZXR0aW5ncywgY29udGV4dC5mbSkpIHtcbiAgICAgICAgbmV3IE5vdGljZShcIkxvbmVsb2cgbW9kZSBpcyBub3QgZW5hYmxlZCBmb3IgdGhpcyBub3RlLlwiKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgcGFyc2VkID0gcGFyc2VMb25lbG9nQ29udGV4dChjb250ZXh0Lm5vdGVCb2R5LCBwbHVnaW4uc2V0dGluZ3MubG9uZWxvZ0NvbnRleHREZXB0aCk7XG4gICAgICBhd2FpdCB3cml0ZUZyb250TWF0dGVyS2V5KHBsdWdpbi5hcHAsIGNvbnRleHQudmlldy5maWxlLCBcInNjZW5lX2NvbnRleHRcIiwgc2VyaWFsaXplQ29udGV4dChwYXJzZWQpKTtcbiAgICAgIG5ldyBOb3RpY2UoXCJTY2VuZSBjb250ZXh0IHVwZGF0ZWQgZnJvbSBsb2cuXCIpO1xuICAgIH1cbiAgfSk7XG5cbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOmxvbmVsb2ctc2Vzc2lvbi1icmVha1wiLFxuICAgIG5hbWU6IFwiTmV3IFNlc3Npb24gSGVhZGVyXCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGNvbnRleHQgPSBhd2FpdCBwbHVnaW4uZ2V0QWN0aXZlTm90ZUNvbnRleHQoKTtcbiAgICAgIGlmICghY29udGV4dD8udmlldy5maWxlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICghaXNMb25lbG9nQWN0aXZlKHBsdWdpbi5zZXR0aW5ncywgY29udGV4dC5mbSkpIHtcbiAgICAgICAgbmV3IE5vdGljZShcIkxvbmVsb2cgbW9kZSBpcyBub3QgZW5hYmxlZCBmb3IgdGhpcyBub3RlLlwiKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgdmFsdWVzID0gYXdhaXQgb3BlbklucHV0TW9kYWwocGx1Z2luLmFwcCwgXCJOZXcgU2Vzc2lvbiBIZWFkZXJcIiwgW1xuICAgICAgICB7IGtleTogXCJkYXRlXCIsIGxhYmVsOiBcIkRhdGVcIiwgdmFsdWU6IHRvZGF5SXNvRGF0ZSgpIH0sXG4gICAgICAgIHsga2V5OiBcImR1cmF0aW9uXCIsIGxhYmVsOiBcIkR1cmF0aW9uXCIsIHBsYWNlaG9sZGVyOiBcIjFoMzBcIiB9LFxuICAgICAgICB7IGtleTogXCJyZWNhcFwiLCBsYWJlbDogXCJSZWNhcFwiLCBvcHRpb25hbDogdHJ1ZSB9XG4gICAgICBdKTtcbiAgICAgIGlmICghdmFsdWVzPy5kYXRlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHNlc3Npb25OdW1iZXIgPSBjb250ZXh0LmZtLnNlc3Npb25fbnVtYmVyID8/IDE7XG4gICAgICBjb25zdCBibG9jayA9IGAjIyBTZXNzaW9uICR7c2Vzc2lvbk51bWJlcn1cXG4qRGF0ZTogJHt2YWx1ZXMuZGF0ZX0gfCBEdXJhdGlvbjogJHt2YWx1ZXMuZHVyYXRpb24gfHwgXCItXCJ9KlxcblxcbiR7dmFsdWVzLnJlY2FwID8gYCoqUmVjYXA6KiogJHt2YWx1ZXMucmVjYXB9XFxuXFxuYCA6IFwiXCJ9YDtcbiAgICAgIHBsdWdpbi5pbnNlcnRUZXh0KGNvbnRleHQudmlldywgYmxvY2ssIFwiY3Vyc29yXCIpO1xuICAgICAgYXdhaXQgd3JpdGVGcm9udE1hdHRlcktleShwbHVnaW4uYXBwLCBjb250ZXh0LnZpZXcuZmlsZSwgXCJzZXNzaW9uX251bWJlclwiLCBzZXNzaW9uTnVtYmVyICsgMSk7XG4gICAgfVxuICB9KTtcbn1cbiIsICJleHBvcnQgaW50ZXJmYWNlIExvbmVsb2dGb3JtYXRPcHRpb25zIHtcbiAgd3JhcEluQ29kZUJsb2NrOiBib29sZWFuO1xuICBzY2VuZUlkPzogc3RyaW5nO1xufVxuXG5mdW5jdGlvbiBmZW5jZShjb250ZW50OiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYFxcYFxcYFxcYFxcbiR7Y29udGVudH1cXG5cXGBcXGBcXGBgO1xufVxuXG5mdW5jdGlvbiBjbGVhbkFpVGV4dCh0ZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gdGV4dC5yZXBsYWNlKC9ePlxccyovZ20sIFwiXCIpLnRyaW0oKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdFN0YXJ0U2NlbmUoXG4gIGFpVGV4dDogc3RyaW5nLFxuICBzY2VuZUlkOiBzdHJpbmcsXG4gIHNjZW5lRGVzYzogc3RyaW5nLFxuICBfb3B0czogTG9uZWxvZ0Zvcm1hdE9wdGlvbnNcbik6IHN0cmluZyB7XG4gIGNvbnN0IGhlYWRlciA9IGAjIyMgJHtzY2VuZUlkfSAqJHtzY2VuZURlc2N9KmA7XG4gIGNvbnN0IGJvZHkgPSBjbGVhbkFpVGV4dChhaVRleHQpO1xuICByZXR1cm4gYCR7aGVhZGVyfVxcblxcbiR7Ym9keX1gO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0RGVjbGFyZUFjdGlvbihcbiAgYWN0aW9uOiBzdHJpbmcsXG4gIHJvbGw6IHN0cmluZyxcbiAgYWlDb25zZXF1ZW5jZTogc3RyaW5nLFxuICBvcHRzOiBMb25lbG9nRm9ybWF0T3B0aW9uc1xuKTogc3RyaW5nIHtcbiAgY29uc3QgY29uc2VxdWVuY2UgPSBjbGVhbkFpVGV4dChhaUNvbnNlcXVlbmNlKVxuICAgIC5zcGxpdChcIlxcblwiKVxuICAgIC5maWx0ZXIoQm9vbGVhbilcbiAgICAubWFwKChsaW5lKSA9PiAobGluZS5zdGFydHNXaXRoKFwiPT5cIikgPyBsaW5lIDogYD0+ICR7bGluZX1gKSlcbiAgICAuam9pbihcIlxcblwiKTtcbiAgY29uc3Qgbm90YXRpb24gPSBgQCAke2FjdGlvbn1cXG5kOiAke3JvbGx9XFxuJHtjb25zZXF1ZW5jZX1gO1xuICByZXR1cm4gb3B0cy53cmFwSW5Db2RlQmxvY2sgPyBmZW5jZShub3RhdGlvbikgOiBub3RhdGlvbjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdEFza09yYWNsZShcbiAgcXVlc3Rpb246IHN0cmluZyxcbiAgb3JhY2xlUmVzdWx0OiBzdHJpbmcsXG4gIGFpSW50ZXJwcmV0YXRpb246IHN0cmluZyxcbiAgb3B0czogTG9uZWxvZ0Zvcm1hdE9wdGlvbnNcbik6IHN0cmluZyB7XG4gIGNvbnN0IGludGVycHJldGF0aW9uID0gY2xlYW5BaVRleHQoYWlJbnRlcnByZXRhdGlvbilcbiAgICAuc3BsaXQoXCJcXG5cIilcbiAgICAuZmlsdGVyKEJvb2xlYW4pXG4gICAgLm1hcCgobGluZSkgPT4gKGxpbmUuc3RhcnRzV2l0aChcIj0+XCIpID8gbGluZSA6IGA9PiAke2xpbmV9YCkpXG4gICAgLmpvaW4oXCJcXG5cIik7XG4gIGNvbnN0IG5vdGF0aW9uID0gYD8gJHtxdWVzdGlvbn1cXG4tPiAke29yYWNsZVJlc3VsdH1cXG4ke2ludGVycHJldGF0aW9ufWA7XG4gIHJldHVybiBvcHRzLndyYXBJbkNvZGVCbG9jayA/IGZlbmNlKG5vdGF0aW9uKSA6IG5vdGF0aW9uO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0SW50ZXJwcmV0T3JhY2xlKFxuICBhaUludGVycHJldGF0aW9uOiBzdHJpbmcsXG4gIG9wdHM6IExvbmVsb2dGb3JtYXRPcHRpb25zXG4pOiBzdHJpbmcge1xuICBjb25zdCBpbnRlcnByZXRhdGlvbiA9IGNsZWFuQWlUZXh0KGFpSW50ZXJwcmV0YXRpb24pXG4gICAgLnNwbGl0KFwiXFxuXCIpXG4gICAgLmZpbHRlcihCb29sZWFuKVxuICAgIC5tYXAoKGxpbmUpID0+IChsaW5lLnN0YXJ0c1dpdGgoXCI9PlwiKSA/IGxpbmUgOiBgPT4gJHtsaW5lfWApKVxuICAgIC5qb2luKFwiXFxuXCIpO1xuICByZXR1cm4gb3B0cy53cmFwSW5Db2RlQmxvY2sgPyBmZW5jZShpbnRlcnByZXRhdGlvbikgOiBpbnRlcnByZXRhdGlvbjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdFN1Z2dlc3RDb25zZXF1ZW5jZShhaU9wdGlvbnM6IHN0cmluZywgb3B0czogTG9uZWxvZ0Zvcm1hdE9wdGlvbnMpOiBzdHJpbmcge1xuICBjb25zdCBvcHRpb25zID0gY2xlYW5BaVRleHQoYWlPcHRpb25zKVxuICAgIC5zcGxpdChcIlxcblwiKVxuICAgIC5maWx0ZXIoKGxpbmUpID0+IGxpbmUudHJpbSgpLmxlbmd0aCA+IDApXG4gICAgLm1hcCgobGluZSkgPT4gKGxpbmUuc3RhcnRzV2l0aChcIj0+XCIpID8gbGluZSA6IGA9PiAke2xpbmV9YCkpXG4gICAgLmpvaW4oXCJcXG5cIik7XG4gIHJldHVybiBvcHRzLndyYXBJbkNvZGVCbG9jayA/IGZlbmNlKG9wdGlvbnMpIDogb3B0aW9ucztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdEV4cGFuZFNjZW5lKGFpUHJvc2U6IHN0cmluZywgX29wdHM6IExvbmVsb2dGb3JtYXRPcHRpb25zKTogc3RyaW5nIHtcbiAgcmV0dXJuIGBcXFxcLS0tXFxuJHtjbGVhbkFpVGV4dChhaVByb3NlKX1cXG4tLS1cXFxcYDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdEFkdmVudHVyZVNlZWQoYWlUZXh0OiBzdHJpbmcsIG9wdHM6IExvbmVsb2dGb3JtYXRPcHRpb25zKTogc3RyaW5nIHtcbiAgY29uc3QgYXhlcyA9IGNsZWFuQWlUZXh0KGFpVGV4dClcbiAgICAuc3BsaXQoXCJcXG5cIilcbiAgICAuZmlsdGVyKEJvb2xlYW4pXG4gICAgLm1hcCgobGluZSkgPT4gXCIgIFwiICsgbGluZS5yZXBsYWNlKC9eWy0qXVxccyovLCBcIlwiKSlcbiAgICAuam9pbihcIlxcblwiKTtcbiAgY29uc3Qgbm90YXRpb24gPSBgZ2VuOiBBZHZlbnR1cmUgU2VlZFxcbiR7YXhlc31gO1xuICByZXR1cm4gb3B0cy53cmFwSW5Db2RlQmxvY2sgPyBmZW5jZShub3RhdGlvbikgOiBub3RhdGlvbjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdENoYXJhY3RlcihhaVRleHQ6IHN0cmluZywgX29wdHM6IExvbmVsb2dGb3JtYXRPcHRpb25zKTogc3RyaW5nIHtcbiAgcmV0dXJuIGNsZWFuQWlUZXh0KGFpVGV4dCk7XG59XG4iLCAiaW1wb3J0IHsgQXBwLCBNb2RhbCwgTm90aWNlLCBQbHVnaW4sIFNldHRpbmcsIFRGaWxlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgeyBkZXNjcmliZVNvdXJjZVJlZiwgbGlzdFZhdWx0Q2FuZGlkYXRlRmlsZXMgfSBmcm9tIFwiLi9zb3VyY2VVdGlsc1wiO1xuaW1wb3J0IHsgTW9kYWxGaWVsZCwgU291cmNlUmVmIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuZXhwb3J0IGNsYXNzIElucHV0TW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gIHByaXZhdGUgcmVhZG9ubHkgdmFsdWVzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIGFwcDogQXBwLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgdGl0bGU6IHN0cmluZyxcbiAgICBwcml2YXRlIHJlYWRvbmx5IGZpZWxkczogTW9kYWxGaWVsZFtdLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgb25TdWJtaXQ6ICh2YWx1ZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4pID0+IHZvaWRcbiAgKSB7XG4gICAgc3VwZXIoYXBwKTtcbiAgICB0aGlzLnZhbHVlcyA9IGZpZWxkcy5yZWR1Y2U8UmVjb3JkPHN0cmluZywgc3RyaW5nPj4oKGFjYywgZmllbGQpID0+IHtcbiAgICAgIGFjY1tmaWVsZC5rZXldID0gZmllbGQudmFsdWUgPz8gXCJcIjtcbiAgICAgIHJldHVybiBhY2M7XG4gICAgfSwge30pO1xuICB9XG5cbiAgb25PcGVuKCk6IHZvaWQge1xuICAgIHRoaXMudGl0bGVFbC5zZXRUZXh0KHRoaXMudGl0bGUpO1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gICAgZm9yIChjb25zdCBmaWVsZCBvZiB0aGlzLmZpZWxkcykge1xuICAgICAgbmV3IFNldHRpbmcodGhpcy5jb250ZW50RWwpXG4gICAgICAgIC5zZXROYW1lKGZpZWxkLmxhYmVsKVxuICAgICAgICAuc2V0RGVzYyhmaWVsZC5vcHRpb25hbCA/IFwiT3B0aW9uYWxcIiA6IFwiXCIpXG4gICAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PiB7XG4gICAgICAgICAgdGV4dC5zZXRQbGFjZWhvbGRlcihmaWVsZC5wbGFjZWhvbGRlciA/PyBcIlwiKTtcbiAgICAgICAgICB0ZXh0LnNldFZhbHVlKHRoaXMudmFsdWVzW2ZpZWxkLmtleV0gPz8gXCJcIik7XG4gICAgICAgICAgdGV4dC5vbkNoYW5nZSgodmFsdWUpID0+IHtcbiAgICAgICAgICAgIHRoaXMudmFsdWVzW2ZpZWxkLmtleV0gPSB2YWx1ZTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIG5ldyBTZXR0aW5nKHRoaXMuY29udGVudEVsKS5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xuICAgICAgYnV0dG9uLnNldEJ1dHRvblRleHQoXCJDb25maXJtXCIpLnNldEN0YSgpLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICB0aGlzLm9uU3VibWl0KHRoaXMudmFsdWVzKTtcbiAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBvbkNsb3NlKCk6IHZvaWQge1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9wZW5JbnB1dE1vZGFsKFxuICBhcHA6IEFwcCxcbiAgdGl0bGU6IHN0cmluZyxcbiAgZmllbGRzOiBNb2RhbEZpZWxkW11cbik6IFByb21pc2U8UmVjb3JkPHN0cmluZywgc3RyaW5nPiB8IG51bGw+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgbGV0IHNldHRsZWQgPSBmYWxzZTtcbiAgICBjb25zdCBtb2RhbCA9IG5ldyBJbnB1dE1vZGFsKGFwcCwgdGl0bGUsIGZpZWxkcywgKHZhbHVlcykgPT4ge1xuICAgICAgc2V0dGxlZCA9IHRydWU7XG4gICAgICByZXNvbHZlKHZhbHVlcyk7XG4gICAgfSk7XG4gICAgY29uc3Qgb3JpZ2luYWxDbG9zZSA9IG1vZGFsLm9uQ2xvc2UuYmluZChtb2RhbCk7XG4gICAgbW9kYWwub25DbG9zZSA9ICgpID0+IHtcbiAgICAgIG9yaWdpbmFsQ2xvc2UoKTtcbiAgICAgIGlmICghc2V0dGxlZCkge1xuICAgICAgICByZXNvbHZlKG51bGwpO1xuICAgICAgfVxuICAgIH07XG4gICAgbW9kYWwub3BlbigpO1xuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBpY2tMb2NhbEZpbGUoKTogUHJvbWlzZTxGaWxlIHwgbnVsbD4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICBjb25zdCBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiKTtcbiAgICBpbnB1dC50eXBlID0gXCJmaWxlXCI7XG4gICAgaW5wdXQuYWNjZXB0ID0gXCIucGRmLC50eHQsLm1kLC5tYXJrZG93blwiO1xuICAgIGlucHV0Lm9uY2hhbmdlID0gKCkgPT4gcmVzb2x2ZShpbnB1dC5maWxlcz8uWzBdID8/IG51bGwpO1xuICAgIGlucHV0LmNsaWNrKCk7XG4gIH0pO1xufVxuXG5leHBvcnQgY2xhc3MgVmF1bHRGaWxlUGlja2VyTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gIHByaXZhdGUgcmVhZG9ubHkgZmlsZXM6IFRGaWxlW107XG5cbiAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHByaXZhdGUgcmVhZG9ubHkgdGl0bGU6IHN0cmluZywgcHJpdmF0ZSByZWFkb25seSBvblBpY2s6IChmaWxlOiBURmlsZSkgPT4gdm9pZCkge1xuICAgIHN1cGVyKGFwcCk7XG4gICAgdGhpcy5maWxlcyA9IGxpc3RWYXVsdENhbmRpZGF0ZUZpbGVzKGFwcCk7XG4gIH1cblxuICBvbk9wZW4oKTogdm9pZCB7XG4gICAgdGhpcy50aXRsZUVsLnNldFRleHQodGhpcy50aXRsZSk7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICBpZiAoIXRoaXMuZmlsZXMubGVuZ3RoKSB7XG4gICAgICB0aGlzLmNvbnRlbnRFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIk5vIFBERiBvciB0ZXh0IGZpbGVzIGZvdW5kIGluIHRoZSB2YXVsdC5cIiB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5maWxlcy5mb3JFYWNoKChmaWxlKSA9PiB7XG4gICAgICBuZXcgU2V0dGluZyh0aGlzLmNvbnRlbnRFbClcbiAgICAgICAgLnNldE5hbWUoZmlsZS5wYXRoKVxuICAgICAgICAuc2V0RGVzYyhmaWxlLmV4dGVuc2lvbi50b0xvd2VyQ2FzZSgpKVxuICAgICAgICAuYWRkQnV0dG9uKChidXR0b24pID0+IHtcbiAgICAgICAgICBidXR0b24uc2V0QnV0dG9uVGV4dChcIlNlbGVjdFwiKS5zZXRDdGEoKS5vbkNsaWNrKCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMub25QaWNrKGZpbGUpO1xuICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIG9uQ2xvc2UoKTogdm9pZCB7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcGlja1ZhdWx0RmlsZShhcHA6IEFwcCwgdGl0bGU6IHN0cmluZyk6IFByb21pc2U8VEZpbGUgfCBudWxsPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIGxldCBzZXR0bGVkID0gZmFsc2U7XG4gICAgY29uc3QgbW9kYWwgPSBuZXcgVmF1bHRGaWxlUGlja2VyTW9kYWwoYXBwLCB0aXRsZSwgKGZpbGUpID0+IHtcbiAgICAgIHNldHRsZWQgPSB0cnVlO1xuICAgICAgcmVzb2x2ZShmaWxlKTtcbiAgICB9KTtcbiAgICBjb25zdCBvcmlnaW5hbENsb3NlID0gbW9kYWwub25DbG9zZS5iaW5kKG1vZGFsKTtcbiAgICBtb2RhbC5vbkNsb3NlID0gKCkgPT4ge1xuICAgICAgb3JpZ2luYWxDbG9zZSgpO1xuICAgICAgaWYgKCFzZXR0bGVkKSB7XG4gICAgICAgIHJlc29sdmUobnVsbCk7XG4gICAgICB9XG4gICAgfTtcbiAgICBtb2RhbC5vcGVuKCk7XG4gIH0pO1xufVxuXG5leHBvcnQgY2xhc3MgU291cmNlT3JpZ2luTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwcml2YXRlIHJlYWRvbmx5IG9uUGljazogKG9yaWdpbjogXCJ2YXVsdFwiIHwgXCJleHRlcm5hbFwiKSA9PiB2b2lkKSB7XG4gICAgc3VwZXIoYXBwKTtcbiAgfVxuXG4gIG9uT3BlbigpOiB2b2lkIHtcbiAgICB0aGlzLnRpdGxlRWwuc2V0VGV4dChcIkFkZCBTb3VyY2UgRmlsZVwiKTtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIG5ldyBTZXR0aW5nKHRoaXMuY29udGVudEVsKVxuICAgICAgLnNldE5hbWUoXCJWYXVsdCBmaWxlXCIpXG4gICAgICAuc2V0RGVzYyhcIlBpY2sgYSBmaWxlIGFscmVhZHkgaW4geW91ciB2YXVsdFwiKVxuICAgICAgLmFkZEJ1dHRvbigoYnRuKSA9PiBidG4uc2V0QnV0dG9uVGV4dChcIkNob29zZVwiKS5zZXRDdGEoKS5vbkNsaWNrKCgpID0+IHtcbiAgICAgICAgdGhpcy5vblBpY2soXCJ2YXVsdFwiKTtcbiAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgfSkpO1xuICAgIG5ldyBTZXR0aW5nKHRoaXMuY29udGVudEVsKVxuICAgICAgLnNldE5hbWUoXCJFeHRlcm5hbCBmaWxlXCIpXG4gICAgICAuc2V0RGVzYyhcIkltcG9ydCBhIGZpbGUgZnJvbSB5b3VyIGNvbXB1dGVyIFx1MjAxNCBzYXZlZCBpbnRvIGEgc291cmNlcy8gc3ViZm9sZGVyIG5leHQgdG8gdGhpcyBub3RlXCIpXG4gICAgICAuYWRkQnV0dG9uKChidG4pID0+IGJ0bi5zZXRCdXR0b25UZXh0KFwiSW1wb3J0XCIpLnNldEN0YSgpLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICB0aGlzLm9uUGljayhcImV4dGVybmFsXCIpO1xuICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICB9KSk7XG4gIH1cblxuICBvbkNsb3NlKCk6IHZvaWQge1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBpY2tTb3VyY2VPcmlnaW4oYXBwOiBBcHApOiBQcm9taXNlPFwidmF1bHRcIiB8IFwiZXh0ZXJuYWxcIiB8IG51bGw+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgbGV0IHNldHRsZWQgPSBmYWxzZTtcbiAgICBjb25zdCBtb2RhbCA9IG5ldyBTb3VyY2VPcmlnaW5Nb2RhbChhcHAsIChvcmlnaW4pID0+IHtcbiAgICAgIHNldHRsZWQgPSB0cnVlO1xuICAgICAgcmVzb2x2ZShvcmlnaW4pO1xuICAgIH0pO1xuICAgIGNvbnN0IG9yaWdpbmFsQ2xvc2UgPSBtb2RhbC5vbkNsb3NlLmJpbmQobW9kYWwpO1xuICAgIG1vZGFsLm9uQ2xvc2UgPSAoKSA9PiB7XG4gICAgICBvcmlnaW5hbENsb3NlKCk7XG4gICAgICBpZiAoIXNldHRsZWQpIHJlc29sdmUobnVsbCk7XG4gICAgfTtcbiAgICBtb2RhbC5vcGVuKCk7XG4gIH0pO1xufVxuXG5leHBvcnQgY2xhc3MgU291cmNlUGlja2VyTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIGFwcDogQXBwLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgdGl0bGU6IHN0cmluZyxcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNvdXJjZXM6IFNvdXJjZVJlZltdLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgb25QaWNrOiAocmVmOiBTb3VyY2VSZWYpID0+IHZvaWRcbiAgKSB7XG4gICAgc3VwZXIoYXBwKTtcbiAgfVxuXG4gIG9uT3BlbigpOiB2b2lkIHtcbiAgICB0aGlzLnRpdGxlRWwuc2V0VGV4dCh0aGlzLnRpdGxlKTtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIHRoaXMuc291cmNlcy5mb3JFYWNoKChzb3VyY2UpID0+IHtcbiAgICAgIG5ldyBTZXR0aW5nKHRoaXMuY29udGVudEVsKVxuICAgICAgICAuc2V0TmFtZShzb3VyY2UubGFiZWwpXG4gICAgICAgIC5zZXREZXNjKGAke3NvdXJjZS5taW1lX3R5cGV9IHwgJHtkZXNjcmliZVNvdXJjZVJlZihzb3VyY2UpfWApXG4gICAgICAgIC5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xuICAgICAgICAgIGJ1dHRvbi5zZXRCdXR0b25UZXh0KFwiU2VsZWN0XCIpLnNldEN0YSgpLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5vblBpY2soc291cmNlKTtcbiAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBvbkNsb3NlKCk6IHZvaWQge1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBpY2tTb3VyY2VSZWYoYXBwOiBBcHAsIHRpdGxlOiBzdHJpbmcsIHNvdXJjZXM6IFNvdXJjZVJlZltdKTogUHJvbWlzZTxTb3VyY2VSZWYgfCBudWxsPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIGxldCBzZXR0bGVkID0gZmFsc2U7XG4gICAgY29uc3QgbW9kYWwgPSBuZXcgU291cmNlUGlja2VyTW9kYWwoYXBwLCB0aXRsZSwgc291cmNlcywgKHJlZikgPT4ge1xuICAgICAgc2V0dGxlZCA9IHRydWU7XG4gICAgICByZXNvbHZlKHJlZik7XG4gICAgfSk7XG4gICAgY29uc3Qgb3JpZ2luYWxDbG9zZSA9IG1vZGFsLm9uQ2xvc2UuYmluZChtb2RhbCk7XG4gICAgbW9kYWwub25DbG9zZSA9ICgpID0+IHtcbiAgICAgIG9yaWdpbmFsQ2xvc2UoKTtcbiAgICAgIGlmICghc2V0dGxlZCkge1xuICAgICAgICByZXNvbHZlKG51bGwpO1xuICAgICAgfVxuICAgIH07XG4gICAgbW9kYWwub3BlbigpO1xuICB9KTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBRdWlja01lbnVJdGVtIHtcbiAgbGFiZWw6IHN0cmluZztcbiAgY29tbWFuZElkOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBRdWlja01lbnVNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgcHJpdmF0ZSByZWFkb25seSBpdGVtczogUXVpY2tNZW51SXRlbVtdO1xuXG4gIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwcml2YXRlIHJlYWRvbmx5IHBsdWdpbjogUGx1Z2luKSB7XG4gICAgc3VwZXIoYXBwKTtcbiAgICB0aGlzLml0ZW1zID0gW1xuICAgICAgeyBsYWJlbDogXCJTdGFydCBTY2VuZVwiLCAgICAgICAgICAgY29tbWFuZElkOiBcInN5YnlsOnN0YXJ0LXNjZW5lXCIgfSxcbiAgICAgIHsgbGFiZWw6IFwiRGVjbGFyZSBBY3Rpb25cIiwgICAgICAgIGNvbW1hbmRJZDogXCJzeWJ5bDpkZWNsYXJlLWFjdGlvblwiIH0sXG4gICAgICB7IGxhYmVsOiBcIkFzayBPcmFjbGVcIiwgICAgICAgICAgICBjb21tYW5kSWQ6IFwic3lieWw6YXNrLW9yYWNsZVwiIH0sXG4gICAgICB7IGxhYmVsOiBcIkludGVycHJldCBPcmFjbGUgUm9sbFwiLCBjb21tYW5kSWQ6IFwic3lieWw6aW50ZXJwcmV0LW9yYWNsZS1yb2xsXCIgfSxcbiAgICAgIHsgbGFiZWw6IFwiV2hhdCBOb3dcIiwgICAgICAgICAgICAgIGNvbW1hbmRJZDogXCJzeWJ5bDp3aGF0LW5vd1wiIH0sXG4gICAgICB7IGxhYmVsOiBcIldoYXQgQ2FuIEkgRG9cIiwgICAgICAgICBjb21tYW5kSWQ6IFwic3lieWw6d2hhdC1jYW4taS1kb1wiIH0sXG4gICAgICB7IGxhYmVsOiBcIkV4cGFuZCBTY2VuZVwiLCAgICAgICAgICBjb21tYW5kSWQ6IFwic3lieWw6ZXhwYW5kLXNjZW5lXCIgfVxuICAgIF07XG4gIH1cblxuICBvbk9wZW4oKTogdm9pZCB7XG4gICAgdGhpcy50aXRsZUVsLnNldFRleHQoXCJTeWJ5bFwiKTtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIGZvciAoY29uc3QgaXRlbSBvZiB0aGlzLml0ZW1zKSB7XG4gICAgICBuZXcgU2V0dGluZyh0aGlzLmNvbnRlbnRFbClcbiAgICAgICAgLnNldE5hbWUoaXRlbS5sYWJlbClcbiAgICAgICAgLmFkZEJ1dHRvbigoYnRuKSA9PlxuICAgICAgICAgIGJ0bi5zZXRCdXR0b25UZXh0KFwiUnVuXCIpLnNldEN0YSgpLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAgICAgICAgICh0aGlzLnBsdWdpbi5hcHAgYXMgYW55KS5jb21tYW5kcy5leGVjdXRlQ29tbWFuZEJ5SWQoaXRlbS5jb21tYW5kSWQpO1xuICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgb25DbG9zZSgpOiB2b2lkIHtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBNYW5hZ2VTb3VyY2VzTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIGFwcDogQXBwLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgc291cmNlczogU291cmNlUmVmW10sXG4gICAgcHJpdmF0ZSByZWFkb25seSBvblJlbW92ZTogKHJlZjogU291cmNlUmVmKSA9PiBQcm9taXNlPHZvaWQ+XG4gICkge1xuICAgIHN1cGVyKGFwcCk7XG4gIH1cblxuICBvbk9wZW4oKTogdm9pZCB7XG4gICAgdGhpcy50aXRsZUVsLnNldFRleHQoXCJNYW5hZ2UgU291cmNlc1wiKTtcbiAgICB0aGlzLnJlbmRlcigpO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXIoKTogdm9pZCB7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICBpZiAoIXRoaXMuc291cmNlcy5sZW5ndGgpIHtcbiAgICAgIHRoaXMuY29udGVudEVsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IFwiTm8gc291cmNlcyBhcmUgYXR0YWNoZWQgdG8gdGhpcyBub3RlLlwiIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnNvdXJjZXMuZm9yRWFjaCgoc291cmNlKSA9PiB7XG4gICAgICBuZXcgU2V0dGluZyh0aGlzLmNvbnRlbnRFbClcbiAgICAgICAgLnNldE5hbWUoc291cmNlLmxhYmVsKVxuICAgICAgICAuc2V0RGVzYyhgJHtzb3VyY2UubWltZV90eXBlfSB8ICR7ZGVzY3JpYmVTb3VyY2VSZWYoc291cmNlKX1gKVxuICAgICAgICAuYWRkQnV0dG9uKChidXR0b24pID0+IHtcbiAgICAgICAgICBidXR0b24uc2V0QnV0dG9uVGV4dChcIlJlbW92ZVwiKS5vbkNsaWNrKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMub25SZW1vdmUoc291cmNlKTtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoYFJlbW92ZWQgJyR7c291cmNlLmxhYmVsfScuYCk7XG4gICAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgb25DbG9zZSgpOiB2b2lkIHtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICB9XG59XG5cbiIsICJpbXBvcnQgeyBBcHAsIE5vdGljZSwgUGx1Z2luU2V0dGluZ1RhYiwgU2V0dGluZyB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHR5cGUgU3lieWxQbHVnaW4gZnJvbSBcIi4vbWFpblwiO1xuaW1wb3J0IHsgZ2V0UHJvdmlkZXIgfSBmcm9tIFwiLi9wcm92aWRlcnNcIjtcbmltcG9ydCB7IE9sbGFtYVByb3ZpZGVyIH0gZnJvbSBcIi4vcHJvdmlkZXJzL29sbGFtYVwiO1xuaW1wb3J0IHsgUHJvdmlkZXJJRCwgU3lieWxTZXR0aW5ncywgVmFsaWRhdGlvblN0YXRlIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuZXhwb3J0IGNvbnN0IERFRkFVTFRfU0VUVElOR1M6IFN5YnlsU2V0dGluZ3MgPSB7XG4gIGFjdGl2ZVByb3ZpZGVyOiBcImdlbWluaVwiLFxuICBwcm92aWRlcnM6IHtcbiAgICBnZW1pbmk6IHsgYXBpS2V5OiBcIlwiLCBkZWZhdWx0TW9kZWw6IFwiZ2VtaW5pLTIuNS1mbGFzaFwiIH0sXG4gICAgb3BlbmFpOiB7IGFwaUtleTogXCJcIiwgZGVmYXVsdE1vZGVsOiBcImdwdC01LjJcIiwgYmFzZVVybDogXCJodHRwczovL2FwaS5vcGVuYWkuY29tL3YxXCIgfSxcbiAgICBhbnRocm9waWM6IHsgYXBpS2V5OiBcIlwiLCBkZWZhdWx0TW9kZWw6IFwiY2xhdWRlLXNvbm5ldC00LTZcIiB9LFxuICAgIG9sbGFtYTogeyBiYXNlVXJsOiBcImh0dHA6Ly9sb2NhbGhvc3Q6MTE0MzRcIiwgZGVmYXVsdE1vZGVsOiBcImdlbW1hM1wiIH0sXG4gICAgb3BlbnJvdXRlcjogeyBhcGlLZXk6IFwiXCIsIGRlZmF1bHRNb2RlbDogXCJtZXRhLWxsYW1hL2xsYW1hLTMuMy03MGItaW5zdHJ1Y3Q6ZnJlZVwiIH1cbiAgfSxcbiAgaW5zZXJ0aW9uTW9kZTogXCJjdXJzb3JcIixcbiAgc2hvd1Rva2VuQ291bnQ6IGZhbHNlLFxuICBkZWZhdWx0VGVtcGVyYXR1cmU6IDAuNyxcbiAgbG9uZWxvZ01vZGU6IGZhbHNlLFxuICBsb25lbG9nQ29udGV4dERlcHRoOiA2MCxcbiAgbG9uZWxvZ1dyYXBDb2RlQmxvY2s6IHRydWUsXG4gIGxvbmVsb2dBdXRvSW5jU2NlbmU6IHRydWVcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVTZXR0aW5ncyhyYXc6IFBhcnRpYWw8U3lieWxTZXR0aW5ncz4gfCBudWxsIHwgdW5kZWZpbmVkKTogU3lieWxTZXR0aW5ncyB7XG4gIHJldHVybiB7XG4gICAgLi4uREVGQVVMVF9TRVRUSU5HUyxcbiAgICAuLi4ocmF3ID8/IHt9KSxcbiAgICBwcm92aWRlcnM6IHtcbiAgICAgIGdlbWluaTogeyAuLi5ERUZBVUxUX1NFVFRJTkdTLnByb3ZpZGVycy5nZW1pbmksIC4uLihyYXc/LnByb3ZpZGVycz8uZ2VtaW5pID8/IHt9KSB9LFxuICAgICAgb3BlbmFpOiB7IC4uLkRFRkFVTFRfU0VUVElOR1MucHJvdmlkZXJzLm9wZW5haSwgLi4uKHJhdz8ucHJvdmlkZXJzPy5vcGVuYWkgPz8ge30pIH0sXG4gICAgICBhbnRocm9waWM6IHsgLi4uREVGQVVMVF9TRVRUSU5HUy5wcm92aWRlcnMuYW50aHJvcGljLCAuLi4ocmF3Py5wcm92aWRlcnM/LmFudGhyb3BpYyA/PyB7fSkgfSxcbiAgICAgIG9sbGFtYTogeyAuLi5ERUZBVUxUX1NFVFRJTkdTLnByb3ZpZGVycy5vbGxhbWEsIC4uLihyYXc/LnByb3ZpZGVycz8ub2xsYW1hID8/IHt9KSB9LFxuICAgICAgb3BlbnJvdXRlcjogeyAuLi5ERUZBVUxUX1NFVFRJTkdTLnByb3ZpZGVycy5vcGVucm91dGVyLCAuLi4ocmF3Py5wcm92aWRlcnM/Lm9wZW5yb3V0ZXIgPz8ge30pIH1cbiAgICB9XG4gIH07XG59XG5cbmV4cG9ydCBjbGFzcyBTeWJ5bFNldHRpbmdUYWIgZXh0ZW5kcyBQbHVnaW5TZXR0aW5nVGFiIHtcbiAgcHJpdmF0ZSB2YWxpZGF0aW9uOiBQYXJ0aWFsPFJlY29yZDxQcm92aWRlcklELCBWYWxpZGF0aW9uU3RhdGU+PiA9IHt9O1xuICBwcml2YXRlIG9sbGFtYU1vZGVsczogc3RyaW5nW10gPSBbXTtcbiAgcHJpdmF0ZSBtb2RlbENhY2hlOiBQYXJ0aWFsPFJlY29yZDxQcm92aWRlcklELCBzdHJpbmdbXT4+ID0ge307XG4gIHByaXZhdGUgZmV0Y2hpbmdQcm92aWRlcnMgPSBuZXcgU2V0PFByb3ZpZGVySUQ+KCk7XG5cbiAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHByaXZhdGUgcmVhZG9ubHkgcGx1Z2luOiBTeWJ5bFBsdWdpbikge1xuICAgIHN1cGVyKGFwcCwgcGx1Z2luKTtcbiAgfVxuXG4gIGRpc3BsYXkoKTogdm9pZCB7XG4gICAgY29uc3QgeyBjb250YWluZXJFbCB9ID0gdGhpcztcbiAgICBjb250YWluZXJFbC5lbXB0eSgpO1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBgU3lieWwgU2V0dGluZ3MgKCR7dGhpcy5wcm92aWRlckxhYmVsKHRoaXMucGx1Z2luLnNldHRpbmdzLmFjdGl2ZVByb3ZpZGVyKX0pYCB9KTtcbiAgICB0aGlzLm1heWJlRmV0Y2hNb2RlbHMoKTtcbiAgICB0aGlzLnJlbmRlckFjdGl2ZVByb3ZpZGVyKGNvbnRhaW5lckVsKTtcbiAgICB0aGlzLnJlbmRlclByb3ZpZGVyQ29uZmlnKGNvbnRhaW5lckVsKTtcbiAgICB0aGlzLnJlbmRlckdsb2JhbFNldHRpbmdzKGNvbnRhaW5lckVsKTtcbiAgfVxuXG4gIHByaXZhdGUgbWF5YmVGZXRjaE1vZGVscygpOiB2b2lkIHtcbiAgICBjb25zdCBhY3RpdmUgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5hY3RpdmVQcm92aWRlcjtcbiAgICBpZiAoYWN0aXZlID09PSBcIm9sbGFtYVwiKSByZXR1cm47XG4gICAgY29uc3QgY29uZmlnID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucHJvdmlkZXJzW2FjdGl2ZV07XG4gICAgY29uc3QgYXBpS2V5ID0gKGNvbmZpZyBhcyB7IGFwaUtleT86IHN0cmluZyB9KS5hcGlLZXk/LnRyaW0oKTtcbiAgICBpZiAoYXBpS2V5ICYmICF0aGlzLm1vZGVsQ2FjaGVbYWN0aXZlXSAmJiAhdGhpcy5mZXRjaGluZ1Byb3ZpZGVycy5oYXMoYWN0aXZlKSkge1xuICAgICAgdm9pZCB0aGlzLmZldGNoTW9kZWxzKGFjdGl2ZSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBmZXRjaE1vZGVscyhwcm92aWRlcjogUHJvdmlkZXJJRCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMuZmV0Y2hpbmdQcm92aWRlcnMuYWRkKHByb3ZpZGVyKTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgbW9kZWxzID0gYXdhaXQgZ2V0UHJvdmlkZXIodGhpcy5wbHVnaW4uc2V0dGluZ3MsIHByb3ZpZGVyKS5saXN0TW9kZWxzKCk7XG4gICAgICBpZiAobW9kZWxzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdGhpcy5tb2RlbENhY2hlW3Byb3ZpZGVyXSA9IG1vZGVscztcbiAgICAgIH1cbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIHNpbGVudGx5IGZhaWwgXHUyMDE0IGRyb3Bkb3duIGtlZXBzIHNob3dpbmcgY3VycmVudCBkZWZhdWx0XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHRoaXMuZmV0Y2hpbmdQcm92aWRlcnMuZGVsZXRlKHByb3ZpZGVyKTtcbiAgICAgIHRoaXMuZGlzcGxheSgpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyQWN0aXZlUHJvdmlkZXIoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkFjdGl2ZSBQcm92aWRlclwiKVxuICAgICAgLnNldERlc2MoXCJVc2VkIHdoZW4gYSBub3RlIGRvZXMgbm90IG92ZXJyaWRlIHByb3ZpZGVyLlwiKVxuICAgICAgLmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xuICAgICAgICBkcm9wZG93bi5hZGRPcHRpb24oXCJnZW1pbmlcIiwgXCJHZW1pbmlcIik7XG4gICAgICAgIGRyb3Bkb3duLmFkZE9wdGlvbihcIm9wZW5haVwiLCBcIk9wZW5BSVwiKTtcbiAgICAgICAgZHJvcGRvd24uYWRkT3B0aW9uKFwiYW50aHJvcGljXCIsIFwiQW50aHJvcGljIChDbGF1ZGUpXCIpO1xuICAgICAgICBkcm9wZG93bi5hZGRPcHRpb24oXCJvbGxhbWFcIiwgXCJPbGxhbWEgKGxvY2FsKVwiKTtcbiAgICAgICAgZHJvcGRvd24uYWRkT3B0aW9uKFwib3BlbnJvdXRlclwiLCBcIk9wZW5Sb3V0ZXJcIik7XG4gICAgICAgIGRyb3Bkb3duLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmFjdGl2ZVByb3ZpZGVyKTtcbiAgICAgICAgZHJvcGRvd24ub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuYWN0aXZlUHJvdmlkZXIgPSB2YWx1ZSBhcyBQcm92aWRlcklEO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgIHRoaXMuZGlzcGxheSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJQcm92aWRlckNvbmZpZyhjb250YWluZXJFbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJQcm92aWRlciBDb25maWd1cmF0aW9uXCIgfSk7XG4gICAgc3dpdGNoICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5hY3RpdmVQcm92aWRlcikge1xuICAgICAgY2FzZSBcImdlbWluaVwiOlxuICAgICAgICB0aGlzLnJlbmRlckdlbWluaVNldHRpbmdzKGNvbnRhaW5lckVsKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwib3BlbmFpXCI6XG4gICAgICAgIHRoaXMucmVuZGVyT3BlbkFJU2V0dGluZ3MoY29udGFpbmVyRWwpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgXCJhbnRocm9waWNcIjpcbiAgICAgICAgdGhpcy5yZW5kZXJBbnRocm9waWNTZXR0aW5ncyhjb250YWluZXJFbCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcIm9sbGFtYVwiOlxuICAgICAgICB0aGlzLnJlbmRlck9sbGFtYVNldHRpbmdzKGNvbnRhaW5lckVsKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwib3BlbnJvdXRlclwiOlxuICAgICAgICB0aGlzLnJlbmRlck9wZW5Sb3V0ZXJTZXR0aW5ncyhjb250YWluZXJFbCk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyR2VtaW5pU2V0dGluZ3MoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gICAgY29uc3QgY29uZmlnID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucHJvdmlkZXJzLmdlbWluaTtcbiAgICB0aGlzLnJlbmRlclZhbGlkYXRpb25TdGF0ZShjb250YWluZXJFbCwgXCJnZW1pbmlcIik7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkFQSSBLZXlcIilcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PiB7XG4gICAgICAgIHRleHQuaW5wdXRFbC50eXBlID0gXCJwYXNzd29yZFwiO1xuICAgICAgICB0ZXh0LnNldFZhbHVlKGNvbmZpZy5hcGlLZXkpO1xuICAgICAgICB0ZXh0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGNvbmZpZy5hcGlLZXkgPSB2YWx1ZTtcbiAgICAgICAgICB0aGlzLm1vZGVsQ2FjaGUuZ2VtaW5pID0gdW5kZWZpbmVkO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGV4dC5pbnB1dEVsLmFkZEV2ZW50TGlzdGVuZXIoXCJibHVyXCIsICgpID0+IHZvaWQgdGhpcy52YWxpZGF0ZVByb3ZpZGVyKFwiZ2VtaW5pXCIpKTtcbiAgICAgIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJEZWZhdWx0IE1vZGVsXCIpXG4gICAgICAuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PiB7XG4gICAgICAgIGNvbnN0IG1vZGVscyA9IHRoaXMubW9kZWxPcHRpb25zRm9yKFwiZ2VtaW5pXCIsIGNvbmZpZy5kZWZhdWx0TW9kZWwpO1xuICAgICAgICBtb2RlbHMuZm9yRWFjaCgobSkgPT4gZHJvcGRvd24uYWRkT3B0aW9uKG0sIG0pKTtcbiAgICAgICAgZHJvcGRvd24uc2V0VmFsdWUoY29uZmlnLmRlZmF1bHRNb2RlbCk7XG4gICAgICAgIGRyb3Bkb3duLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGNvbmZpZy5kZWZhdWx0TW9kZWwgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyT3BlbkFJU2V0dGluZ3MoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gICAgY29uc3QgY29uZmlnID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucHJvdmlkZXJzLm9wZW5haTtcbiAgICB0aGlzLnJlbmRlclZhbGlkYXRpb25TdGF0ZShjb250YWluZXJFbCwgXCJvcGVuYWlcIik7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkFQSSBLZXlcIilcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PiB7XG4gICAgICAgIHRleHQuaW5wdXRFbC50eXBlID0gXCJwYXNzd29yZFwiO1xuICAgICAgICB0ZXh0LnNldFZhbHVlKGNvbmZpZy5hcGlLZXkpO1xuICAgICAgICB0ZXh0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGNvbmZpZy5hcGlLZXkgPSB2YWx1ZTtcbiAgICAgICAgICB0aGlzLm1vZGVsQ2FjaGUub3BlbmFpID0gdW5kZWZpbmVkO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGV4dC5pbnB1dEVsLmFkZEV2ZW50TGlzdGVuZXIoXCJibHVyXCIsICgpID0+IHZvaWQgdGhpcy52YWxpZGF0ZVByb3ZpZGVyKFwib3BlbmFpXCIpKTtcbiAgICAgIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJCYXNlIFVSTFwiKVxuICAgICAgLnNldERlc2MoXCJPdmVycmlkZSBmb3IgQXp1cmUgb3IgcHJveHkgZW5kcG9pbnRzXCIpXG4gICAgICAuYWRkVGV4dCgodGV4dCkgPT4ge1xuICAgICAgICB0ZXh0LnNldFZhbHVlKGNvbmZpZy5iYXNlVXJsKTtcbiAgICAgICAgdGV4dC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICBjb25maWcuYmFzZVVybCA9IHZhbHVlO1xuICAgICAgICAgIHRoaXMubW9kZWxDYWNoZS5vcGVuYWkgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0ZXh0LmlucHV0RWwuYWRkRXZlbnRMaXN0ZW5lcihcImJsdXJcIiwgKCkgPT4gdm9pZCB0aGlzLnZhbGlkYXRlUHJvdmlkZXIoXCJvcGVuYWlcIikpO1xuICAgICAgfSk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkRlZmF1bHQgTW9kZWxcIilcbiAgICAgIC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcbiAgICAgICAgY29uc3QgbW9kZWxzID0gdGhpcy5tb2RlbE9wdGlvbnNGb3IoXCJvcGVuYWlcIiwgY29uZmlnLmRlZmF1bHRNb2RlbCk7XG4gICAgICAgIG1vZGVscy5mb3JFYWNoKChtKSA9PiBkcm9wZG93bi5hZGRPcHRpb24obSwgbSkpO1xuICAgICAgICBkcm9wZG93bi5zZXRWYWx1ZShjb25maWcuZGVmYXVsdE1vZGVsKTtcbiAgICAgICAgZHJvcGRvd24ub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uZmlnLmRlZmF1bHRNb2RlbCA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwicFwiLCB7XG4gICAgICB0ZXh0OiBcIk9wZW5BSSBzb3VyY2VzIHVzZSB2YXVsdF9wYXRoLiBBZGQgc291cmNlIGZpbGVzIHZpYSB0aGUgTWFuYWdlIFNvdXJjZXMgY29tbWFuZCBpbiBhbnkgbm90ZS5cIlxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJBbnRocm9waWNTZXR0aW5ncyhjb250YWluZXJFbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgICBjb25zdCBjb25maWcgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcm92aWRlcnMuYW50aHJvcGljO1xuICAgIHRoaXMucmVuZGVyVmFsaWRhdGlvblN0YXRlKGNvbnRhaW5lckVsLCBcImFudGhyb3BpY1wiKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiQVBJIEtleVwiKVxuICAgICAgLmFkZFRleHQoKHRleHQpID0+IHtcbiAgICAgICAgdGV4dC5pbnB1dEVsLnR5cGUgPSBcInBhc3N3b3JkXCI7XG4gICAgICAgIHRleHQuc2V0VmFsdWUoY29uZmlnLmFwaUtleSk7XG4gICAgICAgIHRleHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uZmlnLmFwaUtleSA9IHZhbHVlO1xuICAgICAgICAgIHRoaXMubW9kZWxDYWNoZS5hbnRocm9waWMgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0ZXh0LmlucHV0RWwuYWRkRXZlbnRMaXN0ZW5lcihcImJsdXJcIiwgKCkgPT4gdm9pZCB0aGlzLnZhbGlkYXRlUHJvdmlkZXIoXCJhbnRocm9waWNcIikpO1xuICAgICAgfSk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkRlZmF1bHQgTW9kZWxcIilcbiAgICAgIC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcbiAgICAgICAgY29uc3QgbW9kZWxzID0gdGhpcy5tb2RlbE9wdGlvbnNGb3IoXCJhbnRocm9waWNcIiwgY29uZmlnLmRlZmF1bHRNb2RlbCk7XG4gICAgICAgIG1vZGVscy5mb3JFYWNoKChtKSA9PiBkcm9wZG93bi5hZGRPcHRpb24obSwgbSkpO1xuICAgICAgICBkcm9wZG93bi5zZXRWYWx1ZShjb25maWcuZGVmYXVsdE1vZGVsKTtcbiAgICAgICAgZHJvcGRvd24ub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uZmlnLmRlZmF1bHRNb2RlbCA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwicFwiLCB7XG4gICAgICB0ZXh0OiBcIlBERnMgYXJlIGVuY29kZWQgaW5saW5lIHBlciByZXF1ZXN0LiBVc2Ugc2hvcnQgZXhjZXJwdHMgdG8gYXZvaWQgaGlnaCB0b2tlbiBjb3N0cy5cIlxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJPcGVuUm91dGVyU2V0dGluZ3MoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gICAgY29uc3QgY29uZmlnID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucHJvdmlkZXJzLm9wZW5yb3V0ZXI7XG4gICAgdGhpcy5yZW5kZXJWYWxpZGF0aW9uU3RhdGUoY29udGFpbmVyRWwsIFwib3BlbnJvdXRlclwiKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiQVBJIEtleVwiKVxuICAgICAgLmFkZFRleHQoKHRleHQpID0+IHtcbiAgICAgICAgdGV4dC5pbnB1dEVsLnR5cGUgPSBcInBhc3N3b3JkXCI7XG4gICAgICAgIHRleHQuc2V0VmFsdWUoY29uZmlnLmFwaUtleSk7XG4gICAgICAgIHRleHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uZmlnLmFwaUtleSA9IHZhbHVlO1xuICAgICAgICAgIHRoaXMubW9kZWxDYWNoZS5vcGVucm91dGVyID0gdW5kZWZpbmVkO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGV4dC5pbnB1dEVsLmFkZEV2ZW50TGlzdGVuZXIoXCJibHVyXCIsICgpID0+IHZvaWQgdGhpcy52YWxpZGF0ZVByb3ZpZGVyKFwib3BlbnJvdXRlclwiKSk7XG4gICAgICB9KTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiRGVmYXVsdCBNb2RlbFwiKVxuICAgICAgLmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xuICAgICAgICBjb25zdCBtb2RlbHMgPSB0aGlzLm1vZGVsT3B0aW9uc0ZvcihcIm9wZW5yb3V0ZXJcIiwgY29uZmlnLmRlZmF1bHRNb2RlbCk7XG4gICAgICAgIG1vZGVscy5mb3JFYWNoKChtKSA9PiBkcm9wZG93bi5hZGRPcHRpb24obSwgbSkpO1xuICAgICAgICBkcm9wZG93bi5zZXRWYWx1ZShjb25maWcuZGVmYXVsdE1vZGVsKTtcbiAgICAgICAgZHJvcGRvd24ub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uZmlnLmRlZmF1bHRNb2RlbCA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwicFwiLCB7XG4gICAgICB0ZXh0OiBcIk9wZW5Sb3V0ZXIgcHJvdmlkZXMgYWNjZXNzIHRvIG1hbnkgZnJlZSBhbmQgcGFpZCBtb2RlbHMgdmlhIGEgdW5pZmllZCBBUEkuIEZyZWUgbW9kZWxzIGhhdmUgJzpmcmVlJyBpbiB0aGVpciBJRC5cIlxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJPbGxhbWFTZXR0aW5ncyhjb250YWluZXJFbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgICBjb25zdCBjb25maWcgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcm92aWRlcnMub2xsYW1hO1xuICAgIHRoaXMucmVuZGVyVmFsaWRhdGlvblN0YXRlKGNvbnRhaW5lckVsLCBcIm9sbGFtYVwiKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiQmFzZSBVUkxcIilcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PiB7XG4gICAgICAgIHRleHQuc2V0VmFsdWUoY29uZmlnLmJhc2VVcmwpO1xuICAgICAgICB0ZXh0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGNvbmZpZy5iYXNlVXJsID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0ZXh0LmlucHV0RWwuYWRkRXZlbnRMaXN0ZW5lcihcImJsdXJcIiwgKCkgPT4gdm9pZCB0aGlzLnZhbGlkYXRlT2xsYW1hKCkpO1xuICAgICAgfSk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkF2YWlsYWJsZSBNb2RlbHNcIilcbiAgICAgIC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHRoaXMub2xsYW1hTW9kZWxzLmxlbmd0aCA/IHRoaXMub2xsYW1hTW9kZWxzIDogW2NvbmZpZy5kZWZhdWx0TW9kZWxdO1xuICAgICAgICBvcHRpb25zLmZvckVhY2goKG1vZGVsKSA9PiBkcm9wZG93bi5hZGRPcHRpb24obW9kZWwsIG1vZGVsKSk7XG4gICAgICAgIGRyb3Bkb3duLnNldFZhbHVlKG9wdGlvbnMuaW5jbHVkZXMoY29uZmlnLmRlZmF1bHRNb2RlbCkgPyBjb25maWcuZGVmYXVsdE1vZGVsIDogb3B0aW9uc1swXSk7XG4gICAgICAgIGRyb3Bkb3duLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGNvbmZpZy5kZWZhdWx0TW9kZWwgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICB0aGlzLmRpc3BsYXkoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiRGVmYXVsdCBNb2RlbFwiKVxuICAgICAgLmFkZFRleHQoKHRleHQpID0+IHtcbiAgICAgICAgdGV4dC5zZXRWYWx1ZShjb25maWcuZGVmYXVsdE1vZGVsKTtcbiAgICAgICAgdGV4dC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICBjb25maWcuZGVmYXVsdE1vZGVsID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJwXCIsIHtcbiAgICAgIHRleHQ6IFwiTm8gQVBJIGtleSByZXF1aXJlZC4gT2xsYW1hIG11c3QgYmUgcnVubmluZyBsb2NhbGx5LiBGaWxlIGdyb3VuZGluZyB1c2VzIHZhdWx0X3BhdGggdGV4dCBleHRyYWN0aW9uLlwiXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlckdsb2JhbFNldHRpbmdzKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIkdsb2JhbCBTZXR0aW5nc1wiIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJEZWZhdWx0IFRlbXBlcmF0dXJlXCIpXG4gICAgICAuc2V0RGVzYyhTdHJpbmcodGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVmYXVsdFRlbXBlcmF0dXJlKSlcbiAgICAgIC5hZGRTbGlkZXIoKHNsaWRlcikgPT4ge1xuICAgICAgICBzbGlkZXIuc2V0TGltaXRzKDAsIDEsIDAuMDUpO1xuICAgICAgICBzbGlkZXIuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVmYXVsdFRlbXBlcmF0dXJlKTtcbiAgICAgICAgc2xpZGVyLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmRlZmF1bHRUZW1wZXJhdHVyZSA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgIHRoaXMuZGlzcGxheSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJJbnNlcnRpb24gTW9kZVwiKVxuICAgICAgLmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xuICAgICAgICBkcm9wZG93bi5hZGRPcHRpb24oXCJjdXJzb3JcIiwgXCJBdCBjdXJzb3JcIik7XG4gICAgICAgIGRyb3Bkb3duLmFkZE9wdGlvbihcImVuZC1vZi1ub3RlXCIsIFwiRW5kIG9mIG5vdGVcIik7XG4gICAgICAgIGRyb3Bkb3duLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmluc2VydGlvbk1vZGUpO1xuICAgICAgICBkcm9wZG93bi5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5pbnNlcnRpb25Nb2RlID0gdmFsdWUgYXMgXCJjdXJzb3JcIiB8IFwiZW5kLW9mLW5vdGVcIjtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiU2hvdyBUb2tlbiBDb3VudFwiKVxuICAgICAgLmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB7XG4gICAgICAgIHRvZ2dsZS5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5zaG93VG9rZW5Db3VudCk7XG4gICAgICAgIHRvZ2dsZS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zaG93VG9rZW5Db3VudCA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJMb25lbG9nIE1vZGVcIilcbiAgICAgIC5zZXREZXNjKFwiRW5hYmxlIExvbmVsb2cgbm90YXRpb24sIGNvbnRleHQgcGFyc2luZywgYW5kIExvbmVsb2ctc3BlY2lmaWMgY29tbWFuZHMuXCIpXG4gICAgICAuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcbiAgICAgICAgdG9nZ2xlLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmxvbmVsb2dNb2RlKTtcbiAgICAgICAgdG9nZ2xlLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmxvbmVsb2dNb2RlID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgdGhpcy5kaXNwbGF5KCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgaWYgKHRoaXMucGx1Z2luLnNldHRpbmdzLmxvbmVsb2dNb2RlKSB7XG4gICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgICAgLnNldE5hbWUoXCJBdXRvLWluY3JlbWVudCBzY2VuZSBjb3VudGVyXCIpXG4gICAgICAgIC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xuICAgICAgICAgIHRvZ2dsZS5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5sb25lbG9nQXV0b0luY1NjZW5lKTtcbiAgICAgICAgICB0b2dnbGUub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5sb25lbG9nQXV0b0luY1NjZW5lID0gdmFsdWU7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgICAgLnNldE5hbWUoXCJDb250ZXh0IGV4dHJhY3Rpb24gZGVwdGhcIilcbiAgICAgICAgLmFkZFRleHQoKHRleHQpID0+IHtcbiAgICAgICAgICB0ZXh0LnNldFZhbHVlKFN0cmluZyh0aGlzLnBsdWdpbi5zZXR0aW5ncy5sb25lbG9nQ29udGV4dERlcHRoKSk7XG4gICAgICAgICAgdGV4dC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG5leHQgPSBOdW1iZXIodmFsdWUpO1xuICAgICAgICAgICAgaWYgKCFOdW1iZXIuaXNOYU4obmV4dCkgJiYgbmV4dCA+IDApIHtcbiAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MubG9uZWxvZ0NvbnRleHREZXB0aCA9IG5leHQ7XG4gICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgICAuc2V0TmFtZShcIldyYXAgbm90YXRpb24gaW4gY29kZSBibG9ja3NcIilcbiAgICAgICAgLmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB7XG4gICAgICAgICAgdG9nZ2xlLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmxvbmVsb2dXcmFwQ29kZUJsb2NrKTtcbiAgICAgICAgICB0b2dnbGUub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5sb25lbG9nV3JhcENvZGVCbG9jayA9IHZhbHVlO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgbW9kZWxPcHRpb25zRm9yKHByb3ZpZGVyOiBQcm92aWRlcklELCBjdXJyZW50TW9kZWw6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgICBjb25zdCBjYWNoZWQgPSB0aGlzLm1vZGVsQ2FjaGVbcHJvdmlkZXJdO1xuICAgIGlmICghY2FjaGVkKSByZXR1cm4gW2N1cnJlbnRNb2RlbF07XG4gICAgcmV0dXJuIGNhY2hlZC5pbmNsdWRlcyhjdXJyZW50TW9kZWwpID8gY2FjaGVkIDogW2N1cnJlbnRNb2RlbCwgLi4uY2FjaGVkXTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyVmFsaWRhdGlvblN0YXRlKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCwgcHJvdmlkZXI6IFByb3ZpZGVySUQpOiB2b2lkIHtcbiAgICBjb25zdCBzdGF0ZSA9IHRoaXMudmFsaWRhdGlvbltwcm92aWRlcl07XG4gICAgaWYgKCFzdGF0ZSB8fCBzdGF0ZS5zdGF0dXMgPT09IFwiaWRsZVwiKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwicFwiLCB7XG4gICAgICB0ZXh0OlxuICAgICAgICBzdGF0ZS5zdGF0dXMgPT09IFwiY2hlY2tpbmdcIlxuICAgICAgICAgID8gXCJWYWxpZGF0aW9uOiBjaGVja2luZy4uLlwiXG4gICAgICAgICAgOiBzdGF0ZS5zdGF0dXMgPT09IFwidmFsaWRcIlxuICAgICAgICAgICAgPyBcIlZhbGlkYXRpb246IFx1MjcxM1wiXG4gICAgICAgICAgICA6IGBWYWxpZGF0aW9uOiBcdTI3MTcke3N0YXRlLm1lc3NhZ2UgPyBgICgke3N0YXRlLm1lc3NhZ2V9KWAgOiBcIlwifWBcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcHJvdmlkZXJMYWJlbChwcm92aWRlcjogUHJvdmlkZXJJRCk6IHN0cmluZyB7XG4gICAgc3dpdGNoIChwcm92aWRlcikge1xuICAgICAgY2FzZSBcImdlbWluaVwiOlxuICAgICAgICByZXR1cm4gXCJHZW1pbmlcIjtcbiAgICAgIGNhc2UgXCJvcGVuYWlcIjpcbiAgICAgICAgcmV0dXJuIFwiT3BlbkFJXCI7XG4gICAgICBjYXNlIFwiYW50aHJvcGljXCI6XG4gICAgICAgIHJldHVybiBcIkFudGhyb3BpY1wiO1xuICAgICAgY2FzZSBcIm9sbGFtYVwiOlxuICAgICAgICByZXR1cm4gXCJPbGxhbWFcIjtcbiAgICAgIGNhc2UgXCJvcGVucm91dGVyXCI6XG4gICAgICAgIHJldHVybiBcIk9wZW5Sb3V0ZXJcIjtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHZhbGlkYXRlUHJvdmlkZXIocHJvdmlkZXI6IFByb3ZpZGVySUQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLnZhbGlkYXRpb25bcHJvdmlkZXJdID0geyBzdGF0dXM6IFwiY2hlY2tpbmdcIiB9O1xuICAgIHRoaXMuZGlzcGxheSgpO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB2YWxpZCA9IGF3YWl0IGdldFByb3ZpZGVyKHRoaXMucGx1Z2luLnNldHRpbmdzLCBwcm92aWRlcikudmFsaWRhdGUoKTtcbiAgICAgIHRoaXMudmFsaWRhdGlvbltwcm92aWRlcl0gPSB7IHN0YXR1czogdmFsaWQgPyBcInZhbGlkXCIgOiBcImludmFsaWRcIiB9O1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLnZhbGlkYXRpb25bcHJvdmlkZXJdID0ge1xuICAgICAgICBzdGF0dXM6IFwiaW52YWxpZFwiLFxuICAgICAgICBtZXNzYWdlOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcilcbiAgICAgIH07XG4gICAgfVxuICAgIHRoaXMuZGlzcGxheSgpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyB2YWxpZGF0ZU9sbGFtYSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLnZhbGlkYXRpb24ub2xsYW1hID0geyBzdGF0dXM6IFwiY2hlY2tpbmdcIiB9O1xuICAgIHRoaXMuZGlzcGxheSgpO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBwcm92aWRlciA9IG5ldyBPbGxhbWFQcm92aWRlcih0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcm92aWRlcnMub2xsYW1hKTtcbiAgICAgIGNvbnN0IHZhbGlkID0gYXdhaXQgcHJvdmlkZXIudmFsaWRhdGUoKTtcbiAgICAgIHRoaXMudmFsaWRhdGlvbi5vbGxhbWEgPSB7IHN0YXR1czogdmFsaWQgPyBcInZhbGlkXCIgOiBcImludmFsaWRcIiB9O1xuICAgICAgdGhpcy5vbGxhbWFNb2RlbHMgPSB2YWxpZCA/IGF3YWl0IHByb3ZpZGVyLmxpc3RNb2RlbHMoKSA6IFtdO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLnZhbGlkYXRpb24ub2xsYW1hID0ge1xuICAgICAgICBzdGF0dXM6IFwiaW52YWxpZFwiLFxuICAgICAgICBtZXNzYWdlOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcilcbiAgICAgIH07XG4gICAgICB0aGlzLm9sbGFtYU1vZGVscyA9IFtdO1xuICAgICAgbmV3IE5vdGljZSh0aGlzLnZhbGlkYXRpb24ub2xsYW1hLm1lc3NhZ2UgPz8gXCJPbGxhbWEgdmFsaWRhdGlvbiBmYWlsZWQuXCIpO1xuICAgIH1cbiAgICB0aGlzLmRpc3BsYXkoKTtcbiAgfVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBQUFBLG9CQUE2Qzs7O0FDRXRDLFNBQVMsZUFBZSxRQUFnQixNQUFvQjtBQUNqRSxRQUFNLFNBQVMsT0FBTyxVQUFVO0FBQ2hDLFNBQU8sYUFBYTtBQUFBLEVBQUs7QUFBQSxHQUFVLE1BQU07QUFDekMsU0FBTyxVQUFVLEVBQUUsTUFBTSxPQUFPLE9BQU8sS0FBSyxNQUFNLElBQUksRUFBRSxTQUFTLEdBQUcsSUFBSSxFQUFFLENBQUM7QUFDN0U7QUFFTyxTQUFTLGFBQWEsUUFBZ0IsTUFBb0I7QUFDL0QsUUFBTSxXQUFXLE9BQU8sU0FBUztBQUNqQyxRQUFNLFNBQVMsT0FBTyxRQUFRLFFBQVEsRUFBRTtBQUN4QyxTQUFPLGFBQWE7QUFBQSxFQUFLO0FBQUEsR0FBVSxFQUFFLE1BQU0sVUFBVSxJQUFJLE9BQU8sQ0FBQztBQUNuRTtBQUVPLFNBQVMsYUFBYSxRQUF3QjtBQUNuRCxTQUFPLE9BQU8sYUFBYSxFQUFFLEtBQUs7QUFDcEM7QUFFTyxTQUFTLHFCQUFxQixRQUFnQixNQUFvQjtBQUN2RSxRQUFNLFlBQVksT0FBTyxlQUFlLEVBQUUsQ0FBQztBQUMzQyxRQUFNLGFBQWEsWUFBWSxVQUFVLEtBQUssT0FBTyxPQUFP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QUFHLFFBQVE7QUFDdkQsVUFBTSxVQUE2QjtBQUFBLE1BQ2pDLGNBQWMsa0JBQWtCLElBQUksS0FBSztBQUFBLE1BQ3pDO0FBQUEsTUFDQTtBQUFBLE1BQ0EsY0FBYSxRQUFHLGdCQUFILFlBQWtCLEtBQUssU0FBUztBQUFBLE1BQzdDO0FBQUEsTUFDQSxPQUFPLEdBQUc7QUFBQSxJQUNaO0FBQ0EsVUFBTSxXQUFXLElBQUkseUJBQU8sd0JBQXdCLENBQUM7QUFDckQsUUFBSTtBQUNGLGFBQU8sTUFBTSxTQUFTLFNBQVMsT0FBTztBQUFBLElBQ3hDLFVBQUU7QUFDQSxlQUFTLEtBQUs7QUFBQSxJQUNoQjtBQUFBLEVBQ0Y7QUFBQSxFQUVBLFdBQVcsTUFBb0IsTUFBYyxNQUF1QztBQUNsRixTQUFLLHNCQUFRLEtBQUssU0FBUyxtQkFBbUIsVUFBVTtBQUN0RCxxQkFBZSxLQUFLLFFBQVEsSUFBSTtBQUFBLElBQ2xDLE9BQU87QUFDTCxtQkFBYSxLQUFLLFFBQVEsSUFBSTtBQUFBLElBQ2hDO0FBQUEsRUFDRjtBQUFBLEVBRUEsd0JBQXdCLE1BQW9CLFVBQW9DO0FBaEdsRjtBQWlHSSxRQUFJLENBQUMsS0FBSyxTQUFTLGdCQUFnQjtBQUNqQztBQUFBLElBQ0Y7QUFDQSxVQUFNLFNBQVEsY0FBUyxnQkFBVCxZQUF3QjtBQUN0QyxVQUFNLFVBQVMsY0FBUyxpQkFBVCxZQUF5QjtBQUN4QyxpQkFBYSxLQUFLLFFBQVEsZ0JBQWdCLGNBQWMsZ0JBQWdCO0FBQUEsRUFDMUU7QUFDRjsiLAogICJuYW1lcyI6IFsiaW1wb3J0X29ic2lkaWFuIiwgIl9hIiwgImltcG9ydF9vYnNpZGlhbiIsICJfYSIsICJpbXBvcnRfb2JzaWRpYW4iLCAiaW1wb3J0X29ic2lkaWFuIiwgIl9hIiwgImltcG9ydF9vYnNpZGlhbiIsICJfYSIsICJpbXBvcnRfb2JzaWRpYW4iLCAiYXNFcnJvck1lc3NhZ2UiLCAiX2EiLCAiaW1wb3J0X29ic2lkaWFuIiwgImltcG9ydF9vYnNpZGlhbiIsICJyZWYiLCAiaW1wb3J0X29ic2lkaWFuIl0KfQo=
