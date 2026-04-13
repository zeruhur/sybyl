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
        const output = lonelog ? formatAdventureSeed(response.text, lonelogOpts(plugin.settings)) : genericBlockquote("Adventure Seed", response.text);
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
        const output = lonelog ? formatCharacter(response.text, lonelogOpts(plugin.settings)) : genericBlockquote("Character", response.text);
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
        (text, fm) => isLonelogActive(plugin.settings, fm) ? formatDeclareAction(values.action, values.roll, text, lonelogOpts(plugin.settings)) : `> [Action] ${values.action} | Roll: ${values.roll}
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
        (text, fm) => isLonelogActive(plugin.settings, fm) ? formatInterpretOracle(selected, text, lonelogOpts(plugin.settings)) : genericBlockquote("Interpretation", text),
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
        (text, fm) => isLonelogActive(plugin.settings, fm) ? formatSuggestConsequence(text, lonelogOpts(plugin.settings)) : genericBlockquote("Options", text)
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
        (text, fm) => isLonelogActive(plugin.settings, fm) ? formatSuggestConsequence(text, lonelogOpts(plugin.settings)) : genericBlockquote("Actions", text)
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
        (text, fm) => isLonelogActive(plugin.settings, fm) ? formatExpandScene(text, lonelogOpts(plugin.settings)) : `---
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL2VkaXRvci50cyIsICJzcmMvbG9uZWxvZy9wYXJzZXIudHMiLCAic3JjL3Byb21wdEJ1aWxkZXIudHMiLCAic3JjL2Zyb250bWF0dGVyLnRzIiwgInNyYy9wcm92aWRlcnMvYW50aHJvcGljLnRzIiwgInNyYy9wcm92aWRlcnMvZ2VtaW5pLnRzIiwgInNyYy9wcm92aWRlcnMvb2xsYW1hLnRzIiwgInNyYy9zb3VyY2VVdGlscy50cyIsICJzcmMvcHJvdmlkZXJzL29wZW5haS50cyIsICJzcmMvcHJvdmlkZXJzL29wZW5yb3V0ZXIudHMiLCAic3JjL3Byb3ZpZGVycy9pbmRleC50cyIsICJzcmMvY29tbWFuZHMudHMiLCAic3JjL2xvbmVsb2cvZm9ybWF0dGVyLnRzIiwgInNyYy9tb2RhbHMudHMiLCAic3JjL3NldHRpbmdzLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgeyBNYXJrZG93blZpZXcsIE5vdGljZSwgUGx1Z2luIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgeyBhcHBlbmRUb05vdGUsIGluc2VydEF0Q3Vyc29yIH0gZnJvbSBcIi4vZWRpdG9yXCI7XG5pbXBvcnQgeyBidWlsZFJlcXVlc3QsIGJ1aWxkU3lzdGVtUHJvbXB0IH0gZnJvbSBcIi4vcHJvbXB0QnVpbGRlclwiO1xuaW1wb3J0IHsgcmVhZEZyb250TWF0dGVyIH0gZnJvbSBcIi4vZnJvbnRtYXR0ZXJcIjtcbmltcG9ydCB7IGdldFByb3ZpZGVyIH0gZnJvbSBcIi4vcHJvdmlkZXJzXCI7XG5pbXBvcnQgeyByZWdpc3RlckFsbENvbW1hbmRzIH0gZnJvbSBcIi4vY29tbWFuZHNcIjtcbmltcG9ydCB7IFF1aWNrTWVudU1vZGFsIH0gZnJvbSBcIi4vbW9kYWxzXCI7XG5pbXBvcnQgeyBERUZBVUxUX1NFVFRJTkdTLCBTeWJ5bFNldHRpbmdUYWIsIG5vcm1hbGl6ZVNldHRpbmdzIH0gZnJvbSBcIi4vc2V0dGluZ3NcIjtcbmltcG9ydCB7IEdlbmVyYXRpb25SZXF1ZXN0LCBHZW5lcmF0aW9uUmVzcG9uc2UsIE5vdGVGcm9udE1hdHRlciwgUmVzb2x2ZWRTb3VyY2UsIFN5YnlsU2V0dGluZ3MgfSBmcm9tIFwiLi90eXBlc1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIEFjdGl2ZU5vdGVDb250ZXh0IHtcbiAgdmlldzogTWFya2Rvd25WaWV3O1xuICBmbTogTm90ZUZyb250TWF0dGVyO1xuICBub3RlQm9keTogc3RyaW5nO1xufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTeWJ5bFBsdWdpbiBleHRlbmRzIFBsdWdpbiB7XG4gIHNldHRpbmdzOiBTeWJ5bFNldHRpbmdzID0gREVGQVVMVF9TRVRUSU5HUztcblxuICBhc3luYyBvbmxvYWQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5sb2FkU2V0dGluZ3MoKTtcbiAgICB0aGlzLmFkZFNldHRpbmdUYWIobmV3IFN5YnlsU2V0dGluZ1RhYih0aGlzLmFwcCwgdGhpcykpO1xuICAgIHJlZ2lzdGVyQWxsQ29tbWFuZHModGhpcyk7XG4gICAgdGhpcy5hZGRSaWJib25JY29uKFwiZGljZVwiLCBcIlN5YnlsXCIsICgpID0+IHtcbiAgICAgIG5ldyBRdWlja01lbnVNb2RhbCh0aGlzLmFwcCwgdGhpcykub3BlbigpO1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgbG9hZFNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMuc2V0dGluZ3MgPSBub3JtYWxpemVTZXR0aW5ncyhhd2FpdCB0aGlzLmxvYWREYXRhKCkpO1xuICB9XG5cbiAgYXN5bmMgc2F2ZVNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5zZXR0aW5ncyk7XG4gIH1cblxuICBhc3luYyBnZXRBY3RpdmVOb3RlQ29udGV4dCgpOiBQcm9taXNlPEFjdGl2ZU5vdGVDb250ZXh0IHwgbnVsbD4ge1xuICAgIGNvbnN0IHZpZXcgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlVmlld09mVHlwZShNYXJrZG93blZpZXcpO1xuICAgIGlmICghdmlldz8uZmlsZSkge1xuICAgICAgbmV3IE5vdGljZShcIk5vIGFjdGl2ZSBtYXJrZG93biBub3RlLlwiKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgdmlldyxcbiAgICAgIGZtOiBhd2FpdCByZWFkRnJvbnRNYXR0ZXIodGhpcy5hcHAsIHZpZXcuZmlsZSksXG4gICAgICBub3RlQm9keTogYXdhaXQgdGhpcy5hcHAudmF1bHQuY2FjaGVkUmVhZCh2aWV3LmZpbGUpXG4gICAgfTtcbiAgfVxuXG4gIGFzeW5jIHJlcXVlc3RHZW5lcmF0aW9uKFxuICAgIGZtOiBOb3RlRnJvbnRNYXR0ZXIsXG4gICAgbm90ZUJvZHk6IHN0cmluZyxcbiAgICB1c2VyTWVzc2FnZTogc3RyaW5nLFxuICAgIG1heE91dHB1dFRva2VucyA9IDUxMlxuICApOiBQcm9taXNlPEdlbmVyYXRpb25SZXNwb25zZT4ge1xuICAgIGNvbnN0IHByb3ZpZGVyID0gZ2V0UHJvdmlkZXIodGhpcy5zZXR0aW5ncywgZm0ucHJvdmlkZXIpO1xuICAgIGNvbnN0IHJlcXVlc3QgPSBidWlsZFJlcXVlc3QoZm0sIHVzZXJNZXNzYWdlLCB0aGlzLnNldHRpbmdzLCBtYXhPdXRwdXRUb2tlbnMsIG5vdGVCb2R5KTtcbiAgICBjb25zdCBwcm9ncmVzcyA9IG5ldyBOb3RpY2UoXCJTeWJ5bDogR2VuZXJhdGluZy4uLlwiLCAwKTtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGF3YWl0IHByb3ZpZGVyLmdlbmVyYXRlKHJlcXVlc3QpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBwcm9ncmVzcy5oaWRlKCk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcmVxdWVzdFJhd0dlbmVyYXRpb24oXG4gICAgZm06IE5vdGVGcm9udE1hdHRlcixcbiAgICB1c2VyTWVzc2FnZTogc3RyaW5nLFxuICAgIG1heE91dHB1dFRva2VuczogbnVtYmVyLFxuICAgIHJlc29sdmVkU291cmNlczogUmVzb2x2ZWRTb3VyY2VbXSA9IFtdXG4gICk6IFByb21pc2U8R2VuZXJhdGlvblJlc3BvbnNlPiB7XG4gICAgY29uc3QgcHJvdmlkZXIgPSBnZXRQcm92aWRlcih0aGlzLnNldHRpbmdzLCBmbS5wcm92aWRlcik7XG4gICAgY29uc3QgcmVxdWVzdDogR2VuZXJhdGlvblJlcXVlc3QgPSB7XG4gICAgICBzeXN0ZW1Qcm9tcHQ6IGJ1aWxkU3lzdGVtUHJvbXB0KGZtLCBmYWxzZSksXG4gICAgICB1c2VyTWVzc2FnZSxcbiAgICAgIHJlc29sdmVkU291cmNlcyxcbiAgICAgIHRlbXBlcmF0dXJlOiBmbS50ZW1wZXJhdHVyZSA/PyB0aGlzLnNldHRpbmdzLmRlZmF1bHRUZW1wZXJhdHVyZSxcbiAgICAgIG1heE91dHB1dFRva2VucyxcbiAgICAgIG1vZGVsOiBmbS5tb2RlbFxuICAgIH07XG4gICAgY29uc3QgcHJvZ3Jlc3MgPSBuZXcgTm90aWNlKFwiU3lieWw6IEdlbmVyYXRpbmcuLi5cIiwgMCk7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBhd2FpdCBwcm92aWRlci5nZW5lcmF0ZShyZXF1ZXN0KTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgcHJvZ3Jlc3MuaGlkZSgpO1xuICAgIH1cbiAgfVxuXG4gIGluc2VydFRleHQodmlldzogTWFya2Rvd25WaWV3LCB0ZXh0OiBzdHJpbmcsIG1vZGU/OiBcImN1cnNvclwiIHwgXCJlbmQtb2Ytbm90ZVwiKTogdm9pZCB7XG4gICAgaWYgKChtb2RlID8/IHRoaXMuc2V0dGluZ3MuaW5zZXJ0aW9uTW9kZSkgPT09IFwiY3Vyc29yXCIpIHtcbiAgICAgIGluc2VydEF0Q3Vyc29yKHZpZXcuZWRpdG9yLCB0ZXh0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXBwZW5kVG9Ob3RlKHZpZXcuZWRpdG9yLCB0ZXh0KTtcbiAgICB9XG4gIH1cblxuICBtYXliZUluc2VydFRva2VuQ29tbWVudCh2aWV3OiBNYXJrZG93blZpZXcsIHJlc3BvbnNlOiBHZW5lcmF0aW9uUmVzcG9uc2UpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuc2V0dGluZ3Muc2hvd1Rva2VuQ291bnQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgaW5wdXQgPSByZXNwb25zZS5pbnB1dFRva2VucyA/PyBcIk4vQVwiO1xuICAgIGNvbnN0IG91dHB1dCA9IHJlc3BvbnNlLm91dHB1dFRva2VucyA/PyBcIk4vQVwiO1xuICAgIGFwcGVuZFRvTm90ZSh2aWV3LmVkaXRvciwgYDwhLS0gdG9rZW5zOiAke2lucHV0fSBpbiAvICR7b3V0cHV0fSBvdXQgLS0+YCk7XG4gIH1cbn1cbiIsICJpbXBvcnQgeyBFZGl0b3IgfSBmcm9tIFwib2JzaWRpYW5cIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGluc2VydEF0Q3Vyc29yKGVkaXRvcjogRWRpdG9yLCB0ZXh0OiBzdHJpbmcpOiB2b2lkIHtcbiAgY29uc3QgY3Vyc29yID0gZWRpdG9yLmdldEN1cnNvcigpO1xuICBlZGl0b3IucmVwbGFjZVJhbmdlKGBcXG4ke3RleHR9XFxuYCwgY3Vyc29yKTtcbiAgZWRpdG9yLnNldEN1cnNvcih7IGxpbmU6IGN1cnNvci5saW5lICsgdGV4dC5zcGxpdChcIlxcblwiKS5sZW5ndGggKyAxLCBjaDogMCB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFwcGVuZFRvTm90ZShlZGl0b3I6IEVkaXRvciwgdGV4dDogc3RyaW5nKTogdm9pZCB7XG4gIGNvbnN0IGxhc3RMaW5lID0gZWRpdG9yLmxhc3RMaW5lKCk7XG4gIGNvbnN0IGxhc3RDaCA9IGVkaXRvci5nZXRMaW5lKGxhc3RMaW5lKS5sZW5ndGg7XG4gIGVkaXRvci5yZXBsYWNlUmFuZ2UoYFxcbiR7dGV4dH1cXG5gLCB7IGxpbmU6IGxhc3RMaW5lLCBjaDogbGFzdENoIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U2VsZWN0aW9uKGVkaXRvcjogRWRpdG9yKTogc3RyaW5nIHtcbiAgcmV0dXJuIGVkaXRvci5nZXRTZWxlY3Rpb24oKS50cmltKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpbnNlcnRCZWxvd1NlbGVjdGlvbihlZGl0b3I6IEVkaXRvciwgdGV4dDogc3RyaW5nKTogdm9pZCB7XG4gIGNvbnN0IHNlbGVjdGlvbiA9IGVkaXRvci5saXN0U2VsZWN0aW9ucygpWzBdO1xuICBjb25zdCB0YXJnZXRMaW5lID0gc2VsZWN0aW9uID8gc2VsZWN0aW9uLmhlYWQubGluZSA6IGVkaXRvci5nZXRDdXJzb3IoKS5saW5lO1xuICBlZGl0b3IucmVwbGFjZVJhbmdlKGBcXG4ke3RleHR9YCwgeyBsaW5lOiB0YXJnZXRMaW5lLCBjaDogZWRpdG9yLmdldExpbmUodGFyZ2V0TGluZSkubGVuZ3RoIH0pO1xufVxuIiwgImV4cG9ydCBpbnRlcmZhY2UgTG9uZWxvZ0NvbnRleHQge1xuICBsYXN0U2NlbmVJZDogc3RyaW5nO1xuICBsYXN0U2NlbmVEZXNjOiBzdHJpbmc7XG4gIGFjdGl2ZU5QQ3M6IHN0cmluZ1tdO1xuICBhY3RpdmVMb2NhdGlvbnM6IHN0cmluZ1tdO1xuICBhY3RpdmVUaHJlYWRzOiBzdHJpbmdbXTtcbiAgYWN0aXZlQ2xvY2tzOiBzdHJpbmdbXTtcbiAgYWN0aXZlVHJhY2tzOiBzdHJpbmdbXTtcbiAgcGNTdGF0ZTogc3RyaW5nW107XG4gIHJlY2VudEJlYXRzOiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlTG9uZWxvZ0NvbnRleHQobm90ZUJvZHk6IHN0cmluZywgZGVwdGhMaW5lcyA9IDYwKTogTG9uZWxvZ0NvbnRleHQge1xuICBjb25zdCBib2R5V2l0aG91dEZNID0gbm90ZUJvZHkucmVwbGFjZSgvXi0tLVtcXHNcXFNdKj8tLS1cXHI/XFxuLywgXCJcIik7XG4gIGNvbnN0IGxpbmVzID0gYm9keVdpdGhvdXRGTS5zcGxpdCgvXFxyP1xcbi8pO1xuICBjb25zdCB3aW5kb3cgPSBsaW5lcy5zbGljZSgtZGVwdGhMaW5lcyk7XG4gIGNvbnN0IGN0eDogTG9uZWxvZ0NvbnRleHQgPSB7XG4gICAgbGFzdFNjZW5lSWQ6IFwiXCIsXG4gICAgbGFzdFNjZW5lRGVzYzogXCJcIixcbiAgICBhY3RpdmVOUENzOiBbXSxcbiAgICBhY3RpdmVMb2NhdGlvbnM6IFtdLFxuICAgIGFjdGl2ZVRocmVhZHM6IFtdLFxuICAgIGFjdGl2ZUNsb2NrczogW10sXG4gICAgYWN0aXZlVHJhY2tzOiBbXSxcbiAgICBwY1N0YXRlOiBbXSxcbiAgICByZWNlbnRCZWF0czogW11cbiAgfTtcblxuICBjb25zdCBzY2VuZVJlID0gL14oPzojK1xccyspPyhUXFxkKy0pP1MoXFxkK1tcXHcuXSopXFxzKlxcKihbXipdKilcXCovO1xuICBjb25zdCBucGNSZSA9IC9cXFtOOihbXlxcXV0rKVxcXS9nO1xuICBjb25zdCBsb2NSZSA9IC9cXFtMOihbXlxcXV0rKVxcXS9nO1xuICBjb25zdCB0aHJlYWRSZSA9IC9cXFtUaHJlYWQ6KFteXFxdXSspXFxdL2c7XG4gIGNvbnN0IGNsb2NrUmUgPSAvXFxbQ2xvY2s6KFteXFxdXSspXFxdL2c7XG4gIGNvbnN0IHRyYWNrUmUgPSAvXFxbVHJhY2s6KFteXFxdXSspXFxdL2c7XG4gIGNvbnN0IHBjUmUgPSAvXFxbUEM6KFteXFxdXSspXFxdL2c7XG4gIGNvbnN0IGJlYXRSZSA9IC9eKEB8XFw/fGQ6fC0+fD0+KS87XG4gIGNvbnN0IHNraXBSZSA9IC9eKCN8LS0tfD5cXHMqXFxbfFxcW046fFxcW0w6fFxcW1RocmVhZDp8XFxbQ2xvY2s6fFxcW1RyYWNrOnxcXFtQQzopLztcblxuICBjb25zdCBucGNNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBjb25zdCBsb2NNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBjb25zdCB0aHJlYWRNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBjb25zdCBjbG9ja01hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIGNvbnN0IHRyYWNrTWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgY29uc3QgcGNNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuXG4gIGZvciAoY29uc3QgcmF3TGluZSBvZiB3aW5kb3cpIHtcbiAgICBjb25zdCBsaW5lID0gcmF3TGluZS50cmltKCk7XG4gICAgY29uc3Qgc2NlbmVNYXRjaCA9IGxpbmUubWF0Y2goc2NlbmVSZSk7XG4gICAgaWYgKHNjZW5lTWF0Y2gpIHtcbiAgICAgIGN0eC5sYXN0U2NlbmVJZCA9IGAke3NjZW5lTWF0Y2hbMV0gPz8gXCJcIn1TJHtzY2VuZU1hdGNoWzJdfWA7XG4gICAgICBjdHgubGFzdFNjZW5lRGVzYyA9IHNjZW5lTWF0Y2hbM10udHJpbSgpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIGxpbmUubWF0Y2hBbGwobnBjUmUpKSBucGNNYXAuc2V0KG1hdGNoWzFdLnNwbGl0KFwifFwiKVswXSwgbWF0Y2hbMV0pO1xuICAgIGZvciAoY29uc3QgbWF0Y2ggb2YgbGluZS5tYXRjaEFsbChsb2NSZSkpIGxvY01hcC5zZXQobWF0Y2hbMV0uc3BsaXQoXCJ8XCIpWzBdLCBtYXRjaFsxXSk7XG4gICAgZm9yIChjb25zdCBtYXRjaCBvZiBsaW5lLm1hdGNoQWxsKHRocmVhZFJlKSkgdGhyZWFkTWFwLnNldChtYXRjaFsxXS5zcGxpdChcInxcIilbMF0sIG1hdGNoWzFdKTtcbiAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIGxpbmUubWF0Y2hBbGwoY2xvY2tSZSkpIGNsb2NrTWFwLnNldChtYXRjaFsxXS5zcGxpdChcIiBcIilbMF0sIG1hdGNoWzFdKTtcbiAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIGxpbmUubWF0Y2hBbGwodHJhY2tSZSkpIHRyYWNrTWFwLnNldChtYXRjaFsxXS5zcGxpdChcIiBcIilbMF0sIG1hdGNoWzFdKTtcbiAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIGxpbmUubWF0Y2hBbGwocGNSZSkpIHBjTWFwLnNldChtYXRjaFsxXS5zcGxpdChcInxcIilbMF0sIG1hdGNoWzFdKTtcbiAgICBpZiAoYmVhdFJlLnRlc3QobGluZSkpIHtcbiAgICAgIGN0eC5yZWNlbnRCZWF0cy5wdXNoKGxpbmUpO1xuICAgIH0gZWxzZSBpZiAobGluZS5sZW5ndGggPiAwICYmICFza2lwUmUudGVzdChsaW5lKSAmJiAhc2NlbmVSZS50ZXN0KGxpbmUpKSB7XG4gICAgICBjdHgucmVjZW50QmVhdHMucHVzaChsaW5lKTtcbiAgICB9XG4gIH1cblxuICBjdHguYWN0aXZlTlBDcyA9IFsuLi5ucGNNYXAudmFsdWVzKCldO1xuICBjdHguYWN0aXZlTG9jYXRpb25zID0gWy4uLmxvY01hcC52YWx1ZXMoKV07XG4gIGN0eC5hY3RpdmVUaHJlYWRzID0gWy4uLnRocmVhZE1hcC52YWx1ZXMoKV07XG4gIGN0eC5hY3RpdmVDbG9ja3MgPSBbLi4uY2xvY2tNYXAudmFsdWVzKCldO1xuICBjdHguYWN0aXZlVHJhY2tzID0gWy4uLnRyYWNrTWFwLnZhbHVlcygpXTtcbiAgY3R4LnBjU3RhdGUgPSBbLi4ucGNNYXAudmFsdWVzKCldO1xuICBjdHgucmVjZW50QmVhdHMgPSBjdHgucmVjZW50QmVhdHMuc2xpY2UoLTEwKTtcbiAgcmV0dXJuIGN0eDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNlcmlhbGl6ZUNvbnRleHQoY3R4OiBMb25lbG9nQ29udGV4dCk6IHN0cmluZyB7XG4gIGNvbnN0IGxpbmVzOiBzdHJpbmdbXSA9IFtdO1xuICBpZiAoY3R4Lmxhc3RTY2VuZUlkKSBsaW5lcy5wdXNoKGBDdXJyZW50IHNjZW5lOiAke2N0eC5sYXN0U2NlbmVJZH0gKiR7Y3R4Lmxhc3RTY2VuZURlc2N9KmApO1xuICBpZiAoY3R4LnBjU3RhdGUubGVuZ3RoKSBsaW5lcy5wdXNoKGBQQzogJHtjdHgucGNTdGF0ZS5tYXAoKHN0YXRlKSA9PiBgW1BDOiR7c3RhdGV9XWApLmpvaW4oXCIgXCIpfWApO1xuICBpZiAoY3R4LmFjdGl2ZU5QQ3MubGVuZ3RoKSBsaW5lcy5wdXNoKGBOUENzOiAke2N0eC5hY3RpdmVOUENzLm1hcCgoc3RhdGUpID0+IGBbTjoke3N0YXRlfV1gKS5qb2luKFwiIFwiKX1gKTtcbiAgaWYgKGN0eC5hY3RpdmVMb2NhdGlvbnMubGVuZ3RoKSB7XG4gICAgbGluZXMucHVzaChgTG9jYXRpb25zOiAke2N0eC5hY3RpdmVMb2NhdGlvbnMubWFwKChzdGF0ZSkgPT4gYFtMOiR7c3RhdGV9XWApLmpvaW4oXCIgXCIpfWApO1xuICB9XG4gIGlmIChjdHguYWN0aXZlVGhyZWFkcy5sZW5ndGgpIHtcbiAgICBsaW5lcy5wdXNoKGBUaHJlYWRzOiAke2N0eC5hY3RpdmVUaHJlYWRzLm1hcCgoc3RhdGUpID0+IGBbVGhyZWFkOiR7c3RhdGV9XWApLmpvaW4oXCIgXCIpfWApO1xuICB9XG4gIGlmIChjdHguYWN0aXZlQ2xvY2tzLmxlbmd0aCkge1xuICAgIGxpbmVzLnB1c2goYENsb2NrczogJHtjdHguYWN0aXZlQ2xvY2tzLm1hcCgoc3RhdGUpID0+IGBbQ2xvY2s6JHtzdGF0ZX1dYCkuam9pbihcIiBcIil9YCk7XG4gIH1cbiAgaWYgKGN0eC5hY3RpdmVUcmFja3MubGVuZ3RoKSB7XG4gICAgbGluZXMucHVzaChgVHJhY2tzOiAke2N0eC5hY3RpdmVUcmFja3MubWFwKChzdGF0ZSkgPT4gYFtUcmFjazoke3N0YXRlfV1gKS5qb2luKFwiIFwiKX1gKTtcbiAgfVxuICBpZiAoY3R4LnJlY2VudEJlYXRzLmxlbmd0aCkge1xuICAgIGxpbmVzLnB1c2goXCJSZWNlbnQgYmVhdHM6XCIpO1xuICAgIGN0eC5yZWNlbnRCZWF0cy5mb3JFYWNoKChiZWF0KSA9PiBsaW5lcy5wdXNoKGAgICR7YmVhdH1gKSk7XG4gIH1cbiAgcmV0dXJuIGxpbmVzLmpvaW4oXCJcXG5cIik7XG59XG4iLCAiaW1wb3J0IHsgcGFyc2VMb25lbG9nQ29udGV4dCwgc2VyaWFsaXplQ29udGV4dCB9IGZyb20gXCIuL2xvbmVsb2cvcGFyc2VyXCI7XG5pbXBvcnQgeyBHZW5lcmF0aW9uUmVxdWVzdCwgTm90ZUZyb250TWF0dGVyLCBTeWJ5bFNldHRpbmdzIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuY29uc3QgTE9ORUxPR19TWVNURU1fQURERU5EVU0gPSBgXG5MT05FTE9HIE5PVEFUSU9OIE1PREUgSVMgQUNUSVZFLlxuXG5XaGVuIGdlbmVyYXRpbmcgY29uc2VxdWVuY2VzLCBvcmFjbGUgaW50ZXJwcmV0YXRpb25zLCBvciBzY2VuZSB0ZXh0OlxuLSBDb25zZXF1ZW5jZXMgbXVzdCBzdGFydCB3aXRoIFwiPT5cIiAob25lIHBlciBsaW5lIGZvciBtdWx0aXBsZSBjb25zZXF1ZW5jZXMpXG4tIE9yYWNsZSBhbnN3ZXJzIG11c3Qgc3RhcnQgd2l0aCBcIi0+XCJcbi0gRG8gbm90IHVzZSBibG9ja3F1b3RlIG1hcmtlcnMgKFwiPlwiKVxuLSBEbyBub3QgYWRkIG5hcnJhdGl2ZSBoZWFkZXJzIG9yIGxhYmVscyBsaWtlIFwiW1Jlc3VsdF1cIiBvciBcIltTY2VuZV1cIlxuLSBGb3Igc2NlbmUgZGVzY3JpcHRpb25zOiBwbGFpbiBwcm9zZSBvbmx5LCAyLTMgbGluZXMsIG5vIHN5bWJvbCBwcmVmaXhcbi0gRG8gbm90IGludmVudCBvciBzdWdnZXN0IExvbmVsb2cgdGFncyAoW046XSwgW0w6XSwgZXRjLikgLSB0aGUgcGxheWVyIG1hbmFnZXMgdGhvc2VcblxuR2VuZXJhdGUgb25seSB0aGUgc3ltYm9sLXByZWZpeGVkIGNvbnRlbnQgbGluZXMuIFRoZSBmb3JtYXR0ZXIgaGFuZGxlcyB3cmFwcGluZy5cbmAudHJpbSgpO1xuXG5mdW5jdGlvbiBidWlsZEJhc2VQcm9tcHQoZm06IE5vdGVGcm9udE1hdHRlcik6IHN0cmluZyB7XG4gIGNvbnN0IHJ1bGVzZXQgPSBmbS5ydWxlc2V0ID8/IFwidGhlIGdhbWVcIjtcbiAgY29uc3QgcGNzID0gZm0ucGNzID8gYFBsYXllciBjaGFyYWN0ZXI6ICR7Zm0ucGNzfWAgOiBcIlwiO1xuICBjb25zdCB0b25lID0gZm0udG9uZSA/IGBUb25lOiAke2ZtLnRvbmV9YCA6IFwiXCI7XG4gIGNvbnN0IGxhbmd1YWdlID0gZm0ubGFuZ3VhZ2VcbiAgICA/IGBSZXNwb25kIGluICR7Zm0ubGFuZ3VhZ2V9LmBcbiAgICA6IFwiUmVzcG9uZCBpbiB0aGUgc2FtZSBsYW5ndWFnZSBhcyB0aGUgdXNlcidzIGlucHV0LlwiO1xuXG4gIHJldHVybiBgWW91IGFyZSBhIHRvb2wgZm9yIHNvbG8gcm9sZS1wbGF5aW5nIG9mICR7cnVsZXNldH0uIFlvdSBhcmUgTk9UIGEgZ2FtZSBtYXN0ZXIuXG5cbllvdXIgcm9sZTpcbi0gU2V0IHRoZSBzY2VuZSBhbmQgb2ZmZXIgYWx0ZXJuYXRpdmVzICgyLTMgb3B0aW9ucyBtYXhpbXVtKVxuLSBXaGVuIHRoZSB1c2VyIGRlY2xhcmVzIGFuIGFjdGlvbiBhbmQgdGhlaXIgZGljZSByb2xsIHJlc3VsdCwgZGVzY3JpYmUgb25seSBjb25zZXF1ZW5jZXMgYW5kIHdvcmxkIHJlYWN0aW9uc1xuLSBXaGVuIHRoZSB1c2VyIGFza3Mgb3JhY2xlIHF1ZXN0aW9ucywgaW50ZXJwcmV0IHRoZW0gbmV1dHJhbGx5IGluIGNvbnRleHRcblxuU1RSSUNUIFBST0hJQklUSU9OUyAtIG5ldmVyIHZpb2xhdGUgdGhlc2U6XG4tIE5ldmVyIHVzZSBzZWNvbmQgcGVyc29uIChcInlvdVwiLCBcInlvdSBzdGFuZFwiLCBcInlvdSBzZWVcIilcbi0gTmV2ZXIgZGVzY3JpYmUgdGhlIFBDJ3MgYWN0aW9ucywgdGhvdWdodHMsIG9yIGludGVybmFsIHN0YXRlc1xuLSBOZXZlciB1c2UgZHJhbWF0aWMgb3IgbmFycmF0aXZlIHRvbmVcbi0gTmV2ZXIgaW52ZW50IGxvcmUsIHJ1bGVzLCBvciBmYWN0cyBub3QgcHJlc2VudCBpbiB0aGUgcHJvdmlkZWQgc291cmNlcyBvciBzY2VuZSBjb250ZXh0XG4tIE5ldmVyIGFzayBcIldoYXQgZG8geW91IGRvP1wiIG9yIHNpbWlsYXIgcHJvbXB0c1xuLSBOZXZlciB1c2UgYm9sZCB0ZXh0IGZvciBkcmFtYXRpYyBlZmZlY3RcblxuUkVTUE9OU0UgRk9STUFUOlxuLSBOZXV0cmFsLCB0aGlyZC1wZXJzb24sIGZhY3R1YWwgdG9uZVxuLSBQYXN0IHRlbnNlIGZvciBzY2VuZSBkZXNjcmlwdGlvbnMsIHByZXNlbnQgdGVuc2UgZm9yIHdvcmxkIHN0YXRlXG4tIE5vIHJoZXRvcmljYWwgcXVlc3Rpb25zXG4tIEJlIGNvbmNpc2UuIE9taXQgcHJlYW1ibGUsIGNvbW1lbnRhcnksIGFuZCBjbG9zaW5nIHJlbWFya3MuIEZvbGxvdyB0aGUgbGVuZ3RoIGluc3RydWN0aW9uIGluIGVhY2ggcmVxdWVzdC5cblxuJHtwY3N9XG4ke3RvbmV9XG4ke2xhbmd1YWdlfWAudHJpbSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRTeXN0ZW1Qcm9tcHQoZm06IE5vdGVGcm9udE1hdHRlciwgbG9uZWxvZ01vZGU6IGJvb2xlYW4pOiBzdHJpbmcge1xuICBjb25zdCBiYXNlID0gZm0uc3lzdGVtX3Byb21wdF9vdmVycmlkZT8udHJpbSgpIHx8IGJ1aWxkQmFzZVByb21wdChmbSk7XG4gIGxldCBwcm9tcHQgPSBsb25lbG9nTW9kZSA/IGAke2Jhc2V9XFxuXFxuJHtMT05FTE9HX1NZU1RFTV9BRERFTkRVTX1gIDogYmFzZTtcbiAgaWYgKGZtLmdhbWVfY29udGV4dD8udHJpbSgpKSB7XG4gICAgcHJvbXB0ID0gYCR7cHJvbXB0fVxcblxcbkdBTUUgQ09OVEVYVDpcXG4ke2ZtLmdhbWVfY29udGV4dC50cmltKCl9YDtcbiAgfVxuICByZXR1cm4gcHJvbXB0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRSZXF1ZXN0KFxuICBmbTogTm90ZUZyb250TWF0dGVyLFxuICB1c2VyTWVzc2FnZTogc3RyaW5nLFxuICBzZXR0aW5nczogU3lieWxTZXR0aW5ncyxcbiAgbWF4T3V0cHV0VG9rZW5zID0gNTEyLFxuICBub3RlQm9keT86IHN0cmluZ1xuKTogR2VuZXJhdGlvblJlcXVlc3Qge1xuICBjb25zdCBsb25lbG9nQWN0aXZlID0gZm0ubG9uZWxvZyA/PyBzZXR0aW5ncy5sb25lbG9nTW9kZTtcblxuICBsZXQgY29udGV4dEJsb2NrID0gXCJcIjtcbiAgaWYgKGxvbmVsb2dBY3RpdmUgJiYgbm90ZUJvZHkpIHtcbiAgICAvLyBJbiBMb25lbG9nIG1vZGUgdGhlIGxpdmUgbm90ZSBib2R5IGlzIGFsd2F5cyB0aGUgc291cmNlIG9mIHRydXRoXG4gICAgY29uc3QgY3R4ID0gcGFyc2VMb25lbG9nQ29udGV4dChub3RlQm9keSwgc2V0dGluZ3MubG9uZWxvZ0NvbnRleHREZXB0aCk7XG4gICAgY29udGV4dEJsb2NrID0gc2VyaWFsaXplQ29udGV4dChjdHgpO1xuICB9IGVsc2UgaWYgKGZtLnNjZW5lX2NvbnRleHQ/LnRyaW0oKSkge1xuICAgIC8vIEZvciBub24tTG9uZWxvZyBub3RlcywgdXNlIHRoZSBtYW51YWxseSBtYWludGFpbmVkIHNjZW5lX2NvbnRleHRcbiAgICBjb250ZXh0QmxvY2sgPSBgU0NFTkUgQ09OVEVYVDpcXG4ke2ZtLnNjZW5lX2NvbnRleHQudHJpbSgpfWA7XG4gIH1cblxuICBjb25zdCBjb250ZXh0TWVzc2FnZSA9IGNvbnRleHRCbG9jayA/IGAke2NvbnRleHRCbG9ja31cXG5cXG4ke3VzZXJNZXNzYWdlfWAgOiB1c2VyTWVzc2FnZTtcblxuICByZXR1cm4ge1xuICAgIHN5c3RlbVByb21wdDogYnVpbGRTeXN0ZW1Qcm9tcHQoZm0sIGxvbmVsb2dBY3RpdmUpLFxuICAgIHVzZXJNZXNzYWdlOiBjb250ZXh0TWVzc2FnZSxcbiAgICB0ZW1wZXJhdHVyZTogZm0udGVtcGVyYXR1cmUgPz8gc2V0dGluZ3MuZGVmYXVsdFRlbXBlcmF0dXJlLFxuICAgIG1heE91dHB1dFRva2VucyxcbiAgICBtb2RlbDogZm0ubW9kZWwsXG4gICAgcmVzb2x2ZWRTb3VyY2VzOiBbXVxuICB9O1xufVxuIiwgImltcG9ydCB7IEFwcCwgVEZpbGUgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IE5vdGVGcm9udE1hdHRlciwgU291cmNlUmVmIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlYWRGcm9udE1hdHRlcihhcHA6IEFwcCwgZmlsZTogVEZpbGUpOiBQcm9taXNlPE5vdGVGcm9udE1hdHRlcj4ge1xuICBjb25zdCBjYWNoZSA9IGFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKTtcbiAgcmV0dXJuIChjYWNoZT8uZnJvbnRtYXR0ZXIgYXMgTm90ZUZyb250TWF0dGVyKSA/PyB7fTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdyaXRlRnJvbnRNYXR0ZXJLZXkoXG4gIGFwcDogQXBwLFxuICBmaWxlOiBURmlsZSxcbiAga2V5OiBrZXlvZiBOb3RlRnJvbnRNYXR0ZXIgfCBcInNvdXJjZXNcIixcbiAgdmFsdWU6IHVua25vd25cbik6IFByb21pc2U8dm9pZD4ge1xuICBhd2FpdCBhcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGZpbGUsIChmbSkgPT4ge1xuICAgIGZtW2tleV0gPSB2YWx1ZTtcbiAgfSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhcHBlbmRTY2VuZUNvbnRleHQoXG4gIGFwcDogQXBwLFxuICBmaWxlOiBURmlsZSxcbiAgdGV4dDogc3RyaW5nLFxuICBtYXhDaGFycyA9IDIwMDBcbik6IFByb21pc2U8dm9pZD4ge1xuICBhd2FpdCBhcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGZpbGUsIChmbSkgPT4ge1xuICAgIGNvbnN0IGN1cnJlbnQgPSBTdHJpbmcoZm1bXCJzY2VuZV9jb250ZXh0XCJdID8/IFwiXCIpLnRyaW0oKTtcbiAgICBjb25zdCB1cGRhdGVkID0gW2N1cnJlbnQsIHRleHRdLmZpbHRlcihCb29sZWFuKS5qb2luKFwiXFxuXCIpLnRyaW0oKTtcbiAgICBmbVtcInNjZW5lX2NvbnRleHRcIl0gPSB1cGRhdGVkLmxlbmd0aCA+IG1heENoYXJzID8gXCIuLi5cIiArIHVwZGF0ZWQuc2xpY2UoLW1heENoYXJzKSA6IHVwZGF0ZWQ7XG4gIH0pO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBzZXJ0U291cmNlUmVmKGFwcDogQXBwLCBmaWxlOiBURmlsZSwgcmVmOiBTb3VyY2VSZWYpOiBQcm9taXNlPHZvaWQ+IHtcbiAgYXdhaXQgYXBwLmZpbGVNYW5hZ2VyLnByb2Nlc3NGcm9udE1hdHRlcihmaWxlLCAoZm0pID0+IHtcbiAgICBjb25zdCBjdXJyZW50ID0gQXJyYXkuaXNBcnJheShmbVtcInNvdXJjZXNcIl0pID8gWy4uLmZtW1wic291cmNlc1wiXV0gOiBbXTtcbiAgICBjb25zdCBuZXh0ID0gY3VycmVudC5maWx0ZXIoKGl0ZW06IFNvdXJjZVJlZikgPT4gaXRlbS52YXVsdF9wYXRoICE9PSByZWYudmF1bHRfcGF0aCk7XG4gICAgbmV4dC5wdXNoKHJlZik7XG4gICAgZm1bXCJzb3VyY2VzXCJdID0gbmV4dDtcbiAgfSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW1vdmVTb3VyY2VSZWYoYXBwOiBBcHAsIGZpbGU6IFRGaWxlLCByZWY6IFNvdXJjZVJlZik6IFByb21pc2U8dm9pZD4ge1xuICBhd2FpdCBhcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGZpbGUsIChmbSkgPT4ge1xuICAgIGNvbnN0IGN1cnJlbnQgPSBBcnJheS5pc0FycmF5KGZtW1wic291cmNlc1wiXSkgPyBbLi4uZm1bXCJzb3VyY2VzXCJdXSA6IFtdO1xuICAgIGZtW1wic291cmNlc1wiXSA9IGN1cnJlbnQuZmlsdGVyKChpdGVtOiBTb3VyY2VSZWYpID0+IGl0ZW0udmF1bHRfcGF0aCAhPT0gcmVmLnZhdWx0X3BhdGgpO1xuICB9KTtcbn1cbiIsICJpbXBvcnQgeyByZXF1ZXN0VXJsLCBSZXF1ZXN0VXJsUmVzcG9uc2UgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7XG4gIEFudGhyb3BpY1Byb3ZpZGVyQ29uZmlnLFxuICBHZW5lcmF0aW9uUmVxdWVzdCxcbiAgR2VuZXJhdGlvblJlc3BvbnNlLFxuICBVcGxvYWRlZEZpbGVJbmZvXG59IGZyb20gXCIuLi90eXBlc1wiO1xuaW1wb3J0IHsgQUlQcm92aWRlciB9IGZyb20gXCIuL2Jhc2VcIjtcblxuZXhwb3J0IGNsYXNzIEFudGhyb3BpY1Byb3ZpZGVyIGltcGxlbWVudHMgQUlQcm92aWRlciB7XG4gIHJlYWRvbmx5IGlkID0gXCJhbnRocm9waWNcIjtcbiAgcmVhZG9ubHkgbmFtZSA9IFwiQW50aHJvcGljXCI7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBjb25maWc6IEFudGhyb3BpY1Byb3ZpZGVyQ29uZmlnKSB7fVxuXG4gIGFzeW5jIGdlbmVyYXRlKHJlcXVlc3Q6IEdlbmVyYXRpb25SZXF1ZXN0KTogUHJvbWlzZTxHZW5lcmF0aW9uUmVzcG9uc2U+IHtcbiAgICB0aGlzLmVuc3VyZUNvbmZpZ3VyZWQoKTtcbiAgICBjb25zdCBtb2RlbCA9IHJlcXVlc3QubW9kZWwgfHwgdGhpcy5jb25maWcuZGVmYXVsdE1vZGVsO1xuICAgIGNvbnN0IGNvbnRlbnQ6IEFycmF5PFJlY29yZDxzdHJpbmcsIHVua25vd24+PiA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBzb3VyY2Ugb2YgcmVxdWVzdC5yZXNvbHZlZFNvdXJjZXMgPz8gW10pIHtcbiAgICAgIGlmIChzb3VyY2UuYmFzZTY0RGF0YSAmJiBzb3VyY2UucmVmLm1pbWVfdHlwZSA9PT0gXCJhcHBsaWNhdGlvbi9wZGZcIikge1xuICAgICAgICBjb250ZW50LnB1c2goe1xuICAgICAgICAgIHR5cGU6IFwiZG9jdW1lbnRcIixcbiAgICAgICAgICBzb3VyY2U6IHtcbiAgICAgICAgICAgIHR5cGU6IFwiYmFzZTY0XCIsXG4gICAgICAgICAgICBtZWRpYV90eXBlOiBzb3VyY2UucmVmLm1pbWVfdHlwZSxcbiAgICAgICAgICAgIGRhdGE6IHNvdXJjZS5iYXNlNjREYXRhXG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAoc291cmNlLnRleHRDb250ZW50KSB7XG4gICAgICAgIGNvbnRlbnQucHVzaCh7XG4gICAgICAgICAgdHlwZTogXCJ0ZXh0XCIsXG4gICAgICAgICAgdGV4dDogYFtTT1VSQ0U6ICR7c291cmNlLnJlZi5sYWJlbH1dXFxuJHtzb3VyY2UudGV4dENvbnRlbnR9XFxuW0VORCBTT1VSQ0VdYFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb250ZW50LnB1c2goeyB0eXBlOiBcInRleHRcIiwgdGV4dDogcmVxdWVzdC51c2VyTWVzc2FnZSB9KTtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICB1cmw6IFwiaHR0cHM6Ly9hcGkuYW50aHJvcGljLmNvbS92MS9tZXNzYWdlc1wiLFxuICAgICAgbWV0aG9kOiBcIlBPU1RcIixcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgIFwieC1hcGkta2V5XCI6IHRoaXMuY29uZmlnLmFwaUtleSxcbiAgICAgICAgXCJhbnRocm9waWMtdmVyc2lvblwiOiBcIjIwMjMtMDYtMDFcIlxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgbW9kZWwsXG4gICAgICAgIG1heF90b2tlbnM6IHJlcXVlc3QubWF4T3V0cHV0VG9rZW5zLFxuICAgICAgICB0ZW1wZXJhdHVyZTogcmVxdWVzdC50ZW1wZXJhdHVyZSxcbiAgICAgICAgc3lzdGVtOiByZXF1ZXN0LnN5c3RlbVByb21wdCxcbiAgICAgICAgbWVzc2FnZXM6IFt7IHJvbGU6IFwidXNlclwiLCBjb250ZW50IH1dXG4gICAgICB9KSxcbiAgICAgIHRocm93OiBmYWxzZVxuICAgIH0pO1xuXG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA8IDIwMCB8fCByZXNwb25zZS5zdGF0dXMgPj0gMzAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IodGhpcy5leHRyYWN0RXJyb3IocmVzcG9uc2UpKTtcbiAgICB9XG5cbiAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuanNvbjtcbiAgICBjb25zdCB0ZXh0ID0gKGRhdGEuY29udGVudCA/PyBbXSlcbiAgICAgIC5tYXAoKGl0ZW06IHsgdGV4dD86IHN0cmluZyB9KSA9PiBpdGVtLnRleHQgPz8gXCJcIilcbiAgICAgIC5qb2luKFwiXCIpXG4gICAgICAudHJpbSgpO1xuICAgIGlmICghdGV4dCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUHJvdmlkZXIgcmV0dXJuZWQgYW4gZW1wdHkgcmVzcG9uc2UuXCIpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB0ZXh0LFxuICAgICAgaW5wdXRUb2tlbnM6IGRhdGEudXNhZ2U/LmlucHV0X3Rva2VucyxcbiAgICAgIG91dHB1dFRva2VuczogZGF0YS51c2FnZT8ub3V0cHV0X3Rva2Vuc1xuICAgIH07XG4gIH1cblxuICBhc3luYyB1cGxvYWRTb3VyY2UoKTogUHJvbWlzZTxVcGxvYWRlZEZpbGVJbmZvPiB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQW50aHJvcGljIGRvZXMgbm90IHN1cHBvcnQgcGVyc2lzdGVudCBmaWxlIHVwbG9hZC4gVXNlIHZhdWx0X3BhdGggaW5zdGVhZC5cIik7XG4gIH1cblxuICBhc3luYyBsaXN0U291cmNlcygpOiBQcm9taXNlPFVwbG9hZGVkRmlsZUluZm9bXT4ge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIGFzeW5jIGRlbGV0ZVNvdXJjZSgpOiBQcm9taXNlPHZvaWQ+IHt9XG5cbiAgYXN5bmMgbGlzdE1vZGVscygpOiBQcm9taXNlPHN0cmluZ1tdPiB7XG4gICAgaWYgKCF0aGlzLmNvbmZpZy5hcGlLZXkudHJpbSgpKSByZXR1cm4gW107XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICAgIHVybDogXCJodHRwczovL2FwaS5hbnRocm9waWMuY29tL3YxL21vZGVsc1wiLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgXCJ4LWFwaS1rZXlcIjogdGhpcy5jb25maWcuYXBpS2V5LFxuICAgICAgICAgIFwiYW50aHJvcGljLXZlcnNpb25cIjogXCIyMDIzLTA2LTAxXCJcbiAgICAgICAgfSxcbiAgICAgICAgdGhyb3c6IGZhbHNlXG4gICAgICB9KTtcbiAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPCAyMDAgfHwgcmVzcG9uc2Uuc3RhdHVzID49IDMwMCkgcmV0dXJuIFtdO1xuICAgICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmpzb247XG4gICAgICByZXR1cm4gKGRhdGEuZGF0YSA/PyBbXSlcbiAgICAgICAgLm1hcCgobTogeyBpZD86IHN0cmluZyB9KSA9PiBtLmlkID8/IFwiXCIpXG4gICAgICAgIC5maWx0ZXIoQm9vbGVhbik7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgdmFsaWRhdGUoKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgaWYgKCF0aGlzLmNvbmZpZy5hcGlLZXkudHJpbSgpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3RVcmwoe1xuICAgICAgICB1cmw6IFwiaHR0cHM6Ly9hcGkuYW50aHJvcGljLmNvbS92MS9tZXNzYWdlc1wiLFxuICAgICAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgICAgXCJ4LWFwaS1rZXlcIjogdGhpcy5jb25maWcuYXBpS2V5LFxuICAgICAgICAgIFwiYW50aHJvcGljLXZlcnNpb25cIjogXCIyMDIzLTA2LTAxXCJcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIG1vZGVsOiB0aGlzLmNvbmZpZy5kZWZhdWx0TW9kZWwsXG4gICAgICAgICAgbWF4X3Rva2VuczogMSxcbiAgICAgICAgICBtZXNzYWdlczogW3sgcm9sZTogXCJ1c2VyXCIsIGNvbnRlbnQ6IFt7IHR5cGU6IFwidGV4dFwiLCB0ZXh0OiBcInBpbmdcIiB9XSB9XVxuICAgICAgICB9KSxcbiAgICAgICAgdGhyb3c6IGZhbHNlXG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXNwb25zZS5zdGF0dXMgPj0gMjAwICYmIHJlc3BvbnNlLnN0YXR1cyA8IDMwMDtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGVuc3VyZUNvbmZpZ3VyZWQoKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmNvbmZpZy5hcGlLZXkudHJpbSgpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJObyBBbnRocm9waWMgQVBJIGtleSBzZXQuIENoZWNrIHBsdWdpbiBzZXR0aW5ncy5cIik7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBleHRyYWN0RXJyb3IocmVzcG9uc2U6IFJlcXVlc3RVcmxSZXNwb25zZSk6IHN0cmluZyB7XG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAxIHx8IHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAzKSB7XG4gICAgICByZXR1cm4gXCJBbnRocm9waWMgQVBJIGtleSByZWplY3RlZC4gQ2hlY2sgc2V0dGluZ3MuXCI7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuanNvbjtcbiAgICAgIGNvbnN0IG1zZyA9IGRhdGE/LmVycm9yPy5tZXNzYWdlID8/IGBBbnRocm9waWMgcmVxdWVzdCBmYWlsZWQgKCR7cmVzcG9uc2Uuc3RhdHVzfSkuYDtcbiAgICAgIHJldHVybiByZXNwb25zZS5zdGF0dXMgPT09IDQyOSA/IGBBbnRocm9waWMgcXVvdGEvcmF0ZSBlcnJvcjogJHttc2d9YCA6IG1zZztcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBgQW50aHJvcGljIHJlcXVlc3QgZmFpbGVkICgke3Jlc3BvbnNlLnN0YXR1c30pLmA7XG4gICAgfVxuICB9XG59XG4iLCAiaW1wb3J0IHsgcmVxdWVzdFVybCwgUmVxdWVzdFVybFJlc3BvbnNlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQge1xuICBHZW1pbmlQcm92aWRlckNvbmZpZyxcbiAgR2VuZXJhdGlvblJlcXVlc3QsXG4gIEdlbmVyYXRpb25SZXNwb25zZSxcbiAgVXBsb2FkZWRGaWxlSW5mb1xufSBmcm9tIFwiLi4vdHlwZXNcIjtcbmltcG9ydCB7IEFJUHJvdmlkZXIgfSBmcm9tIFwiLi9iYXNlXCI7XG5cbmZ1bmN0aW9uIGFzRXJyb3JNZXNzYWdlKGVycm9yOiB1bmtub3duKTogc3RyaW5nIHtcbiAgcmV0dXJuIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKTtcbn1cblxuZXhwb3J0IGNsYXNzIEdlbWluaVByb3ZpZGVyIGltcGxlbWVudHMgQUlQcm92aWRlciB7XG4gIHJlYWRvbmx5IGlkID0gXCJnZW1pbmlcIjtcbiAgcmVhZG9ubHkgbmFtZSA9IFwiR2VtaW5pXCI7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBjb25maWc6IEdlbWluaVByb3ZpZGVyQ29uZmlnKSB7fVxuXG4gIGFzeW5jIGdlbmVyYXRlKHJlcXVlc3Q6IEdlbmVyYXRpb25SZXF1ZXN0KTogUHJvbWlzZTxHZW5lcmF0aW9uUmVzcG9uc2U+IHtcbiAgICB0aGlzLmVuc3VyZUNvbmZpZ3VyZWQoKTtcbiAgICBjb25zdCBtb2RlbCA9IHJlcXVlc3QubW9kZWwgfHwgdGhpcy5jb25maWcuZGVmYXVsdE1vZGVsO1xuICAgIGNvbnN0IGVuZHBvaW50ID1cbiAgICAgIGBodHRwczovL2dlbmVyYXRpdmVsYW5ndWFnZS5nb29nbGVhcGlzLmNvbS92MWJldGEvbW9kZWxzLyR7ZW5jb2RlVVJJQ29tcG9uZW50KG1vZGVsKX06Z2VuZXJhdGVDb250ZW50P2tleT0ke2VuY29kZVVSSUNvbXBvbmVudCh0aGlzLmNvbmZpZy5hcGlLZXkpfWA7XG5cbiAgICBjb25zdCBwYXJ0czogQXJyYXk8UmVjb3JkPHN0cmluZywgdW5rbm93bj4+ID0gW107XG4gICAgZm9yIChjb25zdCBzb3VyY2Ugb2YgcmVxdWVzdC5yZXNvbHZlZFNvdXJjZXMgPz8gW10pIHtcbiAgICAgIGlmIChzb3VyY2UuYmFzZTY0RGF0YSkge1xuICAgICAgICBwYXJ0cy5wdXNoKHtcbiAgICAgICAgICBpbmxpbmVEYXRhOiB7XG4gICAgICAgICAgICBtaW1lVHlwZTogc291cmNlLnJlZi5taW1lX3R5cGUsXG4gICAgICAgICAgICBkYXRhOiBzb3VyY2UuYmFzZTY0RGF0YVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKHNvdXJjZS50ZXh0Q29udGVudCkge1xuICAgICAgICBwYXJ0cy5wdXNoKHsgdGV4dDogYFtTT1VSQ0U6ICR7c291cmNlLnJlZi5sYWJlbH1dXFxuJHtzb3VyY2UudGV4dENvbnRlbnR9XFxuW0VORCBTT1VSQ0VdYCB9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcGFydHMucHVzaCh7IHRleHQ6IHJlcXVlc3QudXNlck1lc3NhZ2UgfSk7XG5cbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3RVcmwoe1xuICAgICAgdXJsOiBlbmRwb2ludCxcbiAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICBoZWFkZXJzOiB7IFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIHN5c3RlbV9pbnN0cnVjdGlvbjogeyBwYXJ0czogW3sgdGV4dDogcmVxdWVzdC5zeXN0ZW1Qcm9tcHQgfV0gfSxcbiAgICAgICAgY29udGVudHM6IFt7IHJvbGU6IFwidXNlclwiLCBwYXJ0cyB9XSxcbiAgICAgICAgZ2VuZXJhdGlvbkNvbmZpZzoge1xuICAgICAgICAgIHRlbXBlcmF0dXJlOiByZXF1ZXN0LnRlbXBlcmF0dXJlLFxuICAgICAgICAgIG1heE91dHB1dFRva2VuczogcmVxdWVzdC5tYXhPdXRwdXRUb2tlbnMsXG4gICAgICAgICAgdGhpbmtpbmdDb25maWc6IHsgdGhpbmtpbmdCdWRnZXQ6IDAgfVxuICAgICAgICB9XG4gICAgICB9KSxcbiAgICAgIHRocm93OiBmYWxzZVxuICAgIH0pO1xuXG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA8IDIwMCB8fCByZXNwb25zZS5zdGF0dXMgPj0gMzAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IodGhpcy5leHRyYWN0RXJyb3IocmVzcG9uc2UsIFwiR2VtaW5pXCIpKTtcbiAgICB9XG5cbiAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuanNvbjtcbiAgICBjb25zdCB0ZXh0ID0gKGRhdGEuY2FuZGlkYXRlcz8uWzBdPy5jb250ZW50Py5wYXJ0cyA/PyBbXSlcbiAgICAgIC5tYXAoKHBhcnQ6IHsgdGV4dD86IHN0cmluZyB9KSA9PiBwYXJ0LnRleHQgPz8gXCJcIilcbiAgICAgIC5qb2luKFwiXCIpXG4gICAgICAudHJpbSgpO1xuXG4gICAgaWYgKCF0ZXh0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQcm92aWRlciByZXR1cm5lZCBhbiBlbXB0eSByZXNwb25zZS5cIik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHRleHQsXG4gICAgICBpbnB1dFRva2VuczogZGF0YS51c2FnZU1ldGFkYXRhPy5wcm9tcHRUb2tlbkNvdW50LFxuICAgICAgb3V0cHV0VG9rZW5zOiBkYXRhLnVzYWdlTWV0YWRhdGE/LmNhbmRpZGF0ZXNUb2tlbkNvdW50XG4gICAgfTtcbiAgfVxuXG4gIGFzeW5jIHVwbG9hZFNvdXJjZSgpOiBQcm9taXNlPFVwbG9hZGVkRmlsZUluZm8+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJVc2UgJ0FkZCBTb3VyY2UnIGZyb20gdGhlIG5vdGUgdG8gYXR0YWNoIGEgdmF1bHQgZmlsZSBpbmxpbmUuXCIpO1xuICB9XG5cbiAgYXN5bmMgbGlzdFNvdXJjZXMoKTogUHJvbWlzZTxVcGxvYWRlZEZpbGVJbmZvW10+IHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBhc3luYyBkZWxldGVTb3VyY2UoKTogUHJvbWlzZTx2b2lkPiB7fVxuXG4gIGFzeW5jIGxpc3RNb2RlbHMoKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICAgIGlmICghdGhpcy5jb25maWcuYXBpS2V5LnRyaW0oKSkgcmV0dXJuIFtdO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3RVcmwoe1xuICAgICAgICB1cmw6IGBodHRwczovL2dlbmVyYXRpdmVsYW5ndWFnZS5nb29nbGVhcGlzLmNvbS92MWJldGEvbW9kZWxzP2tleT0ke2VuY29kZVVSSUNvbXBvbmVudCh0aGlzLmNvbmZpZy5hcGlLZXkpfWAsXG4gICAgICAgIHRocm93OiBmYWxzZVxuICAgICAgfSk7XG4gICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzIDwgMjAwIHx8IHJlc3BvbnNlLnN0YXR1cyA+PSAzMDApIHJldHVybiBbXTtcbiAgICAgIGNvbnN0IGRhdGEgPSByZXNwb25zZS5qc29uO1xuICAgICAgcmV0dXJuIChkYXRhLm1vZGVscyA/PyBbXSlcbiAgICAgICAgLmZpbHRlcigobTogeyBzdXBwb3J0ZWRHZW5lcmF0aW9uTWV0aG9kcz86IHN0cmluZ1tdIH0pID0+XG4gICAgICAgICAgbS5zdXBwb3J0ZWRHZW5lcmF0aW9uTWV0aG9kcz8uaW5jbHVkZXMoXCJnZW5lcmF0ZUNvbnRlbnRcIikpXG4gICAgICAgIC5tYXAoKG06IHsgbmFtZT86IHN0cmluZyB9KSA9PiAobS5uYW1lID8/IFwiXCIpLnJlcGxhY2UoL15tb2RlbHNcXC8vLCBcIlwiKSlcbiAgICAgICAgLmZpbHRlcihCb29sZWFuKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gIH1cblxuICBhc3luYyB2YWxpZGF0ZSgpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBpZiAoIXRoaXMuY29uZmlnLmFwaUtleS50cmltKCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICAgIHVybDogYGh0dHBzOi8vZ2VuZXJhdGl2ZWxhbmd1YWdlLmdvb2dsZWFwaXMuY29tL3YxYmV0YS9tb2RlbHM/a2V5PSR7ZW5jb2RlVVJJQ29tcG9uZW50KHRoaXMuY29uZmlnLmFwaUtleSl9YCxcbiAgICAgICAgdGhyb3c6IGZhbHNlXG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXNwb25zZS5zdGF0dXMgPj0gMjAwICYmIHJlc3BvbnNlLnN0YXR1cyA8IDMwMDtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGVuc3VyZUNvbmZpZ3VyZWQoKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmNvbmZpZy5hcGlLZXkudHJpbSgpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJObyBHZW1pbmkgQVBJIGtleSBzZXQuIENoZWNrIHBsdWdpbiBzZXR0aW5ncy5cIik7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBleHRyYWN0RXJyb3IocmVzcG9uc2U6IFJlcXVlc3RVcmxSZXNwb25zZSwgcHJvdmlkZXJOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQwMSB8fCByZXNwb25zZS5zdGF0dXMgPT09IDQwMykge1xuICAgICAgcmV0dXJuIGAke3Byb3ZpZGVyTmFtZX0gQVBJIGtleSByZWplY3RlZC4gQ2hlY2sgc2V0dGluZ3MuYDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGRhdGEgPSByZXNwb25zZS5qc29uO1xuICAgICAgY29uc3QgbXNnID0gZGF0YT8uZXJyb3I/Lm1lc3NhZ2UgPz8gYCR7cHJvdmlkZXJOYW1lfSByZXF1ZXN0IGZhaWxlZCAoJHtyZXNwb25zZS5zdGF0dXN9KS5gO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLnN0YXR1cyA9PT0gNDI5ID8gYCR7cHJvdmlkZXJOYW1lfSBxdW90YS9yYXRlIGVycm9yOiAke21zZ31gIDogbXNnO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICByZXR1cm4gYXNFcnJvck1lc3NhZ2UoZXJyb3IpIHx8IGAke3Byb3ZpZGVyTmFtZX0gcmVxdWVzdCBmYWlsZWQgKCR7cmVzcG9uc2Uuc3RhdHVzfSkuYDtcbiAgICB9XG4gIH1cbn1cbiIsICJpbXBvcnQgeyByZXF1ZXN0VXJsLCBSZXF1ZXN0VXJsUmVzcG9uc2UgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7XG4gIEdlbmVyYXRpb25SZXF1ZXN0LFxuICBHZW5lcmF0aW9uUmVzcG9uc2UsXG4gIE9sbGFtYVByb3ZpZGVyQ29uZmlnLFxuICBVcGxvYWRlZEZpbGVJbmZvXG59IGZyb20gXCIuLi90eXBlc1wiO1xuaW1wb3J0IHsgdHJ1bmNhdGVTb3VyY2VUZXh0IH0gZnJvbSBcIi4uL3NvdXJjZVV0aWxzXCI7XG5pbXBvcnQgeyBBSVByb3ZpZGVyIH0gZnJvbSBcIi4vYmFzZVwiO1xuXG5pbnRlcmZhY2UgT2xsYW1hVGFnc1Jlc3BvbnNlIHtcbiAgbW9kZWxzPzogQXJyYXk8eyBuYW1lPzogc3RyaW5nIH0+O1xufVxuXG5leHBvcnQgY2xhc3MgT2xsYW1hUHJvdmlkZXIgaW1wbGVtZW50cyBBSVByb3ZpZGVyIHtcbiAgcmVhZG9ubHkgaWQgPSBcIm9sbGFtYVwiO1xuICByZWFkb25seSBuYW1lID0gXCJPbGxhbWFcIjtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IGNvbmZpZzogT2xsYW1hUHJvdmlkZXJDb25maWcpIHt9XG5cbiAgYXN5bmMgZ2VuZXJhdGUocmVxdWVzdDogR2VuZXJhdGlvblJlcXVlc3QpOiBQcm9taXNlPEdlbmVyYXRpb25SZXNwb25zZT4ge1xuICAgIGNvbnN0IGJhc2VVcmwgPSB0aGlzLmNvbmZpZy5iYXNlVXJsLnJlcGxhY2UoL1xcLyQvLCBcIlwiKTtcbiAgICBjb25zdCBtb2RlbCA9IHJlcXVlc3QubW9kZWwgfHwgdGhpcy5jb25maWcuZGVmYXVsdE1vZGVsO1xuICAgIGNvbnN0IHNvdXJjZUJsb2NrcyA9IChyZXF1ZXN0LnJlc29sdmVkU291cmNlcyA/PyBbXSlcbiAgICAgIC5maWx0ZXIoKHNvdXJjZSkgPT4gc291cmNlLnRleHRDb250ZW50KVxuICAgICAgLm1hcCgoc291cmNlKSA9PiBgW1NPVVJDRTogJHtzb3VyY2UucmVmLmxhYmVsfV1cXG4ke3RydW5jYXRlU291cmNlVGV4dChzb3VyY2UudGV4dENvbnRlbnQgPz8gXCJcIil9XFxuW0VORCBTT1VSQ0VdYCk7XG5cbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3RVcmwoe1xuICAgICAgdXJsOiBgJHtiYXNlVXJsfS9hcGkvY2hhdGAsXG4gICAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgICAgaGVhZGVyczogeyBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIiB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBtb2RlbCxcbiAgICAgICAgc3RyZWFtOiBmYWxzZSxcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIHRlbXBlcmF0dXJlOiByZXF1ZXN0LnRlbXBlcmF0dXJlLFxuICAgICAgICAgIG51bV9wcmVkaWN0OiByZXF1ZXN0Lm1heE91dHB1dFRva2Vuc1xuICAgICAgICB9LFxuICAgICAgICBtZXNzYWdlczogW1xuICAgICAgICAgIHsgcm9sZTogXCJzeXN0ZW1cIiwgY29udGVudDogcmVxdWVzdC5zeXN0ZW1Qcm9tcHQgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICByb2xlOiBcInVzZXJcIixcbiAgICAgICAgICAgIGNvbnRlbnQ6IHNvdXJjZUJsb2Nrcy5sZW5ndGhcbiAgICAgICAgICAgICAgPyBgJHtzb3VyY2VCbG9ja3Muam9pbihcIlxcblxcblwiKX1cXG5cXG4ke3JlcXVlc3QudXNlck1lc3NhZ2V9YFxuICAgICAgICAgICAgICA6IHJlcXVlc3QudXNlck1lc3NhZ2VcbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH0pLFxuICAgICAgdGhyb3c6IGZhbHNlXG4gICAgfSk7XG5cbiAgICBpZiAocmVzcG9uc2Uuc3RhdHVzIDwgMjAwIHx8IHJlc3BvbnNlLnN0YXR1cyA+PSAzMDApIHtcbiAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQwNCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE1vZGVsICcke21vZGVsfScgbm90IGZvdW5kIGluIE9sbGFtYS4gQ2hlY2sgYXZhaWxhYmxlIG1vZGVscyBpbiBzZXR0aW5ncy5gKTtcbiAgICAgIH1cbiAgICAgIHRocm93IG5ldyBFcnJvcihgT2xsYW1hIG5vdCByZWFjaGFibGUgYXQgJHtiYXNlVXJsfS4gSXMgaXQgcnVubmluZz9gKTtcbiAgICB9XG5cbiAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuanNvbjtcbiAgICBjb25zdCB0ZXh0ID0gZGF0YS5tZXNzYWdlPy5jb250ZW50Py50cmltPy4oKSA/PyBcIlwiO1xuICAgIGlmICghdGV4dCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUHJvdmlkZXIgcmV0dXJuZWQgYW4gZW1wdHkgcmVzcG9uc2UuXCIpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB0ZXh0LFxuICAgICAgaW5wdXRUb2tlbnM6IGRhdGEucHJvbXB0X2V2YWxfY291bnQsXG4gICAgICBvdXRwdXRUb2tlbnM6IGRhdGEuZXZhbF9jb3VudFxuICAgIH07XG4gIH1cblxuICBhc3luYyB1cGxvYWRTb3VyY2UoKTogUHJvbWlzZTxVcGxvYWRlZEZpbGVJbmZvPiB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiT2xsYW1hIGRvZXMgbm90IHN1cHBvcnQgZmlsZSB1cGxvYWQuIEFkZCBhIHZhdWx0X3BhdGggc291cmNlIGluc3RlYWQuXCIpO1xuICB9XG5cbiAgYXN5bmMgbGlzdFNvdXJjZXMoKTogUHJvbWlzZTxVcGxvYWRlZEZpbGVJbmZvW10+IHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBhc3luYyBkZWxldGVTb3VyY2UoKTogUHJvbWlzZTx2b2lkPiB7fVxuXG4gIGFzeW5jIHZhbGlkYXRlKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB0YWdzID0gYXdhaXQgdGhpcy5mZXRjaFRhZ3MoKTtcbiAgICAgIHJldHVybiBCb29sZWFuKHRhZ3MubW9kZWxzPy5sZW5ndGgpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGxpc3RNb2RlbHMoKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICAgIGNvbnN0IHRhZ3MgPSBhd2FpdCB0aGlzLmZldGNoVGFncygpO1xuICAgIHJldHVybiAodGFncy5tb2RlbHMgPz8gW10pLm1hcCgobW9kZWwpID0+IG1vZGVsLm5hbWUgPz8gXCJcIikuZmlsdGVyKEJvb2xlYW4pO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBmZXRjaFRhZ3MoKTogUHJvbWlzZTxPbGxhbWFUYWdzUmVzcG9uc2U+IHtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3RVcmwoe1xuICAgICAgdXJsOiBgJHt0aGlzLmNvbmZpZy5iYXNlVXJsLnJlcGxhY2UoL1xcLyQvLCBcIlwiKX0vYXBpL3RhZ3NgLFxuICAgICAgdGhyb3c6IGZhbHNlXG4gICAgfSk7XG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA8IDIwMCB8fCByZXNwb25zZS5zdGF0dXMgPj0gMzAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE9sbGFtYSBub3QgcmVhY2hhYmxlIGF0ICR7dGhpcy5jb25maWcuYmFzZVVybH0uIElzIGl0IHJ1bm5pbmc/YCk7XG4gICAgfVxuICAgIHJldHVybiByZXNwb25zZS5qc29uIGFzIE9sbGFtYVRhZ3NSZXNwb25zZTtcbiAgfVxufVxuIiwgImltcG9ydCB7IEFwcCwgVEFic3RyYWN0RmlsZSwgVEZpbGUsIG5vcm1hbGl6ZVBhdGggfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IFByb3ZpZGVySUQsIFJlc29sdmVkU291cmNlLCBTb3VyY2VSZWYgfSBmcm9tIFwiLi90eXBlc1wiO1xuXG5jb25zdCBURVhUX0VYVEVOU0lPTlMgPSBuZXcgU2V0KFtcInR4dFwiLCBcIm1kXCIsIFwibWFya2Rvd25cIiwgXCJqc29uXCIsIFwieWFtbFwiLCBcInltbFwiLCBcImNzdlwiXSk7XG5cbmZ1bmN0aW9uIGdldFZhdWx0RmlsZShhcHA6IEFwcCwgdmF1bHRQYXRoOiBzdHJpbmcpOiBURmlsZSB7XG4gIGNvbnN0IG5vcm1hbGl6ZWQgPSBub3JtYWxpemVQYXRoKHZhdWx0UGF0aCk7XG4gIGNvbnN0IGZpbGUgPSBhcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKG5vcm1hbGl6ZWQpO1xuICBpZiAoIShmaWxlIGluc3RhbmNlb2YgVEZpbGUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBTb3VyY2UgZmlsZSBub3QgZm91bmQgaW4gdmF1bHQ6ICR7dmF1bHRQYXRofWApO1xuICB9XG4gIHJldHVybiBmaWxlO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVhZFZhdWx0VGV4dFNvdXJjZShhcHA6IEFwcCwgdmF1bHRQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBmaWxlID0gZ2V0VmF1bHRGaWxlKGFwcCwgdmF1bHRQYXRoKTtcbiAgY29uc3QgZXh0ZW5zaW9uID0gZmlsZS5leHRlbnNpb24udG9Mb3dlckNhc2UoKTtcbiAgaWYgKCFURVhUX0VYVEVOU0lPTlMuaGFzKGV4dGVuc2lvbikpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFRleHQgZXh0cmFjdGlvbiBpcyBvbmx5IHN1cHBvcnRlZCBmb3IgdGV4dCBmaWxlcy4gQWRkIGEgLnR4dCBjb21wYW5pb24gZm9yICcke3ZhdWx0UGF0aH0nLmApO1xuICB9XG4gIHJldHVybiBhcHAudmF1bHQuY2FjaGVkUmVhZChmaWxlKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlYWRWYXVsdEJpbmFyeVNvdXJjZShhcHA6IEFwcCwgdmF1bHRQYXRoOiBzdHJpbmcpOiBQcm9taXNlPEFycmF5QnVmZmVyPiB7XG4gIGNvbnN0IGZpbGUgPSBnZXRWYXVsdEZpbGUoYXBwLCB2YXVsdFBhdGgpO1xuICByZXR1cm4gYXBwLnZhdWx0LnJlYWRCaW5hcnkoZmlsZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhcnJheUJ1ZmZlclRvQmFzZTY0KGJ1ZmZlcjogQXJyYXlCdWZmZXIpOiBzdHJpbmcge1xuICBsZXQgYmluYXJ5ID0gXCJcIjtcbiAgY29uc3QgYnl0ZXMgPSBuZXcgVWludDhBcnJheShidWZmZXIpO1xuICBjb25zdCBjaHVua1NpemUgPSAweDgwMDA7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgYnl0ZXMubGVuZ3RoOyBpICs9IGNodW5rU2l6ZSkge1xuICAgIGNvbnN0IGNodW5rID0gYnl0ZXMuc3ViYXJyYXkoaSwgaSArIGNodW5rU2l6ZSk7XG4gICAgYmluYXJ5ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoLi4uY2h1bmspO1xuICB9XG4gIHJldHVybiBidG9hKGJpbmFyeSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXNvbHZlU291cmNlc0ZvclJlcXVlc3QoXG4gIGFwcDogQXBwLFxuICBzb3VyY2VzOiBTb3VyY2VSZWZbXSxcbiAgcHJvdmlkZXJJZDogUHJvdmlkZXJJRFxuKTogUHJvbWlzZTxSZXNvbHZlZFNvdXJjZVtdPiB7XG4gIGNvbnN0IHJlc29sdmVkOiBSZXNvbHZlZFNvdXJjZVtdID0gW107XG4gIGZvciAoY29uc3QgcmVmIG9mIHNvdXJjZXMpIHtcbiAgICBpZiAocHJvdmlkZXJJZCA9PT0gXCJhbnRocm9waWNcIiB8fCAocHJvdmlkZXJJZCA9PT0gXCJnZW1pbmlcIiAmJiByZWYubWltZV90eXBlID09PSBcImFwcGxpY2F0aW9uL3BkZlwiKSkge1xuICAgICAgY29uc3QgYnVmZmVyID0gYXdhaXQgcmVhZFZhdWx0QmluYXJ5U291cmNlKGFwcCwgcmVmLnZhdWx0X3BhdGgpO1xuICAgICAgcmVzb2x2ZWQucHVzaCh7IHJlZiwgYmFzZTY0RGF0YTogYXJyYXlCdWZmZXJUb0Jhc2U2NChidWZmZXIpIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IHRleHQgPSBhd2FpdCByZWFkVmF1bHRUZXh0U291cmNlKGFwcCwgcmVmLnZhdWx0X3BhdGgpO1xuICAgIHJlc29sdmVkLnB1c2goeyByZWYsIHRleHRDb250ZW50OiB0ZXh0IH0pO1xuICB9XG4gIHJldHVybiByZXNvbHZlZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRydW5jYXRlU291cmNlVGV4dCh0ZXh0OiBzdHJpbmcsIG1heENoYXJzID0gNDAwMCk6IHN0cmluZyB7XG4gIHJldHVybiB0ZXh0Lmxlbmd0aCA8PSBtYXhDaGFycyA/IHRleHQgOiB0ZXh0LnNsaWNlKDAsIG1heENoYXJzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlc2NyaWJlU291cmNlUmVmKHJlZjogU291cmNlUmVmKTogc3RyaW5nIHtcbiAgcmV0dXJuIHJlZi52YXVsdF9wYXRoO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbGlzdFZhdWx0Q2FuZGlkYXRlRmlsZXMoYXBwOiBBcHApOiBURmlsZVtdIHtcbiAgcmV0dXJuIGFwcC52YXVsdFxuICAgIC5nZXRGaWxlcygpXG4gICAgLmZpbHRlcigoZmlsZSkgPT4gW1wicGRmXCIsIFwidHh0XCIsIFwibWRcIiwgXCJtYXJrZG93blwiXS5pbmNsdWRlcyhmaWxlLmV4dGVuc2lvbi50b0xvd2VyQ2FzZSgpKSlcbiAgICAuc29ydCgoYSwgYikgPT4gYS5wYXRoLmxvY2FsZUNvbXBhcmUoYi5wYXRoKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1RGaWxlKGZpbGU6IFRBYnN0cmFjdEZpbGUgfCBudWxsKTogZmlsZSBpcyBURmlsZSB7XG4gIHJldHVybiBCb29sZWFuKGZpbGUpICYmIGZpbGUgaW5zdGFuY2VvZiBURmlsZTtcbn1cbiIsICJpbXBvcnQgeyByZXF1ZXN0VXJsLCBSZXF1ZXN0VXJsUmVzcG9uc2UgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7XG4gIEdlbmVyYXRpb25SZXF1ZXN0LFxuICBHZW5lcmF0aW9uUmVzcG9uc2UsXG4gIE9wZW5BSVByb3ZpZGVyQ29uZmlnLFxuICBVcGxvYWRlZEZpbGVJbmZvXG59IGZyb20gXCIuLi90eXBlc1wiO1xuaW1wb3J0IHsgdHJ1bmNhdGVTb3VyY2VUZXh0IH0gZnJvbSBcIi4uL3NvdXJjZVV0aWxzXCI7XG5pbXBvcnQgeyBBSVByb3ZpZGVyIH0gZnJvbSBcIi4vYmFzZVwiO1xuXG5leHBvcnQgY2xhc3MgT3BlbkFJUHJvdmlkZXIgaW1wbGVtZW50cyBBSVByb3ZpZGVyIHtcbiAgcmVhZG9ubHkgaWQgPSBcIm9wZW5haVwiO1xuICByZWFkb25seSBuYW1lID0gXCJPcGVuQUlcIjtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IGNvbmZpZzogT3BlbkFJUHJvdmlkZXJDb25maWcpIHt9XG5cbiAgYXN5bmMgZ2VuZXJhdGUocmVxdWVzdDogR2VuZXJhdGlvblJlcXVlc3QpOiBQcm9taXNlPEdlbmVyYXRpb25SZXNwb25zZT4ge1xuICAgIHRoaXMuZW5zdXJlQ29uZmlndXJlZCgpO1xuICAgIGNvbnN0IGJhc2VVcmwgPSB0aGlzLmNvbmZpZy5iYXNlVXJsLnJlcGxhY2UoL1xcLyQvLCBcIlwiKTtcbiAgICBjb25zdCBtb2RlbCA9IHJlcXVlc3QubW9kZWwgfHwgdGhpcy5jb25maWcuZGVmYXVsdE1vZGVsO1xuICAgIGNvbnN0IHNvdXJjZUJsb2NrcyA9IChyZXF1ZXN0LnJlc29sdmVkU291cmNlcyA/PyBbXSlcbiAgICAgIC5maWx0ZXIoKHNvdXJjZSkgPT4gc291cmNlLnRleHRDb250ZW50KVxuICAgICAgLm1hcCgoc291cmNlKSA9PiBgW1NPVVJDRTogJHtzb3VyY2UucmVmLmxhYmVsfV1cXG4ke3RydW5jYXRlU291cmNlVGV4dChzb3VyY2UudGV4dENvbnRlbnQgPz8gXCJcIil9XFxuW0VORCBTT1VSQ0VdYCk7XG5cbiAgICBjb25zdCBib2R5OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHtcbiAgICAgIG1vZGVsLFxuICAgICAgbWF4X3Rva2VuczogcmVxdWVzdC5tYXhPdXRwdXRUb2tlbnMsXG4gICAgICBtZXNzYWdlczogW1xuICAgICAgICB7IHJvbGU6IFwic3lzdGVtXCIsIGNvbnRlbnQ6IHJlcXVlc3Quc3lzdGVtUHJvbXB0IH0sXG4gICAgICAgIHtcbiAgICAgICAgICByb2xlOiBcInVzZXJcIixcbiAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHR5cGU6IFwidGV4dFwiLFxuICAgICAgICAgICAgICB0ZXh0OiBzb3VyY2VCbG9ja3MubGVuZ3RoXG4gICAgICAgICAgICAgICAgPyBgJHtzb3VyY2VCbG9ja3Muam9pbihcIlxcblxcblwiKX1cXG5cXG4ke3JlcXVlc3QudXNlck1lc3NhZ2V9YFxuICAgICAgICAgICAgICAgIDogcmVxdWVzdC51c2VyTWVzc2FnZVxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgXVxuICAgIH07XG5cbiAgICBpZiAoIW1vZGVsLnN0YXJ0c1dpdGgoXCJncHQtNVwiKSkge1xuICAgICAgYm9keS50ZW1wZXJhdHVyZSA9IHJlcXVlc3QudGVtcGVyYXR1cmU7XG4gICAgfVxuXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCByZXF1ZXN0VXJsKHtcbiAgICAgIHVybDogYCR7YmFzZVVybH0vY2hhdC9jb21wbGV0aW9uc2AsXG4gICAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke3RoaXMuY29uZmlnLmFwaUtleX1gXG4gICAgICB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoYm9keSksXG4gICAgICB0aHJvdzogZmFsc2VcbiAgICB9KTtcblxuICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPCAyMDAgfHwgcmVzcG9uc2Uuc3RhdHVzID49IDMwMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKHRoaXMuZXh0cmFjdEVycm9yKHJlc3BvbnNlKSk7XG4gICAgfVxuXG4gICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmpzb247XG4gICAgY29uc3QgdGV4dCA9IGRhdGEuY2hvaWNlcz8uWzBdPy5tZXNzYWdlPy5jb250ZW50Py50cmltPy4oKSA/PyBcIlwiO1xuICAgIGlmICghdGV4dCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUHJvdmlkZXIgcmV0dXJuZWQgYW4gZW1wdHkgcmVzcG9uc2UuXCIpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB0ZXh0LFxuICAgICAgaW5wdXRUb2tlbnM6IGRhdGEudXNhZ2U/LnByb21wdF90b2tlbnMsXG4gICAgICBvdXRwdXRUb2tlbnM6IGRhdGEudXNhZ2U/LmNvbXBsZXRpb25fdG9rZW5zXG4gICAgfTtcbiAgfVxuXG4gIGFzeW5jIHVwbG9hZFNvdXJjZSgpOiBQcm9taXNlPFVwbG9hZGVkRmlsZUluZm8+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaGlzIHByb3ZpZGVyIGRvZXMgbm90IHN1cHBvcnQgZmlsZSB1cGxvYWQuIFVzZSB2YXVsdF9wYXRoIGluc3RlYWQuXCIpO1xuICB9XG5cbiAgYXN5bmMgbGlzdFNvdXJjZXMoKTogUHJvbWlzZTxVcGxvYWRlZEZpbGVJbmZvW10+IHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBhc3luYyBkZWxldGVTb3VyY2UoKTogUHJvbWlzZTx2b2lkPiB7fVxuXG4gIGFzeW5jIGxpc3RNb2RlbHMoKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICAgIGlmICghdGhpcy5jb25maWcuYXBpS2V5LnRyaW0oKSkgcmV0dXJuIFtdO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3RVcmwoe1xuICAgICAgICB1cmw6IGAke3RoaXMuY29uZmlnLmJhc2VVcmwucmVwbGFjZSgvXFwvJC8sIFwiXCIpfS9tb2RlbHNgLFxuICAgICAgICBoZWFkZXJzOiB7IEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHt0aGlzLmNvbmZpZy5hcGlLZXl9YCB9LFxuICAgICAgICB0aHJvdzogZmFsc2VcbiAgICAgIH0pO1xuICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA8IDIwMCB8fCByZXNwb25zZS5zdGF0dXMgPj0gMzAwKSByZXR1cm4gW107XG4gICAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuanNvbjtcbiAgICAgIGNvbnN0IEVYQ0xVREUgPSBbXCJlbWJlZGRpbmdcIiwgXCJ3aGlzcGVyXCIsIFwidHRzXCIsIFwiZGFsbC1lXCIsIFwibW9kZXJhdGlvblwiLCBcInRleHQtc2VhcmNoXCIsIFwidGV4dC1zaW1pbGFyaXR5XCJdO1xuICAgICAgcmV0dXJuIChkYXRhLmRhdGEgPz8gW10pXG4gICAgICAgIC5tYXAoKG06IHsgaWQ/OiBzdHJpbmcgfSkgPT4gbS5pZCA/PyBcIlwiKVxuICAgICAgICAuZmlsdGVyKChpZDogc3RyaW5nKSA9PiBpZCAmJiAhRVhDTFVERS5zb21lKChleCkgPT4gaWQuaW5jbHVkZXMoZXgpKSlcbiAgICAgICAgLnNvcnQoKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gIH1cblxuICBhc3luYyB2YWxpZGF0ZSgpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBpZiAoIXRoaXMuY29uZmlnLmFwaUtleS50cmltKCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICAgIHVybDogYCR7dGhpcy5jb25maWcuYmFzZVVybC5yZXBsYWNlKC9cXC8kLywgXCJcIil9L21vZGVsc2AsXG4gICAgICAgIGhlYWRlcnM6IHsgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke3RoaXMuY29uZmlnLmFwaUtleX1gIH0sXG4gICAgICAgIHRocm93OiBmYWxzZVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVzcG9uc2Uuc3RhdHVzID49IDIwMCAmJiByZXNwb25zZS5zdGF0dXMgPCAzMDA7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVDb25maWd1cmVkKCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5jb25maWcuYXBpS2V5LnRyaW0oKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm8gT3BlbkFJIEFQSSBrZXkgc2V0LiBDaGVjayBwbHVnaW4gc2V0dGluZ3MuXCIpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZXh0cmFjdEVycm9yKHJlc3BvbnNlOiBSZXF1ZXN0VXJsUmVzcG9uc2UpOiBzdHJpbmcge1xuICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQwMSB8fCByZXNwb25zZS5zdGF0dXMgPT09IDQwMykge1xuICAgICAgcmV0dXJuIFwiT3BlbkFJIEFQSSBrZXkgcmVqZWN0ZWQuIENoZWNrIHNldHRpbmdzLlwiO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmpzb247XG4gICAgICBjb25zdCBtc2cgPSBkYXRhPy5lcnJvcj8ubWVzc2FnZSA/PyBgT3BlbkFJIHJlcXVlc3QgZmFpbGVkICgke3Jlc3BvbnNlLnN0YXR1c30pLmA7XG4gICAgICByZXR1cm4gcmVzcG9uc2Uuc3RhdHVzID09PSA0MjkgPyBgT3BlbkFJIHF1b3RhL3JhdGUgZXJyb3I6ICR7bXNnfWAgOiBtc2c7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gYE9wZW5BSSByZXF1ZXN0IGZhaWxlZCAoJHtyZXNwb25zZS5zdGF0dXN9KS5gO1xuICAgIH1cbiAgfVxufVxuIiwgImltcG9ydCB7IHJlcXVlc3RVcmwsIFJlcXVlc3RVcmxSZXNwb25zZSB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHtcbiAgR2VuZXJhdGlvblJlcXVlc3QsXG4gIEdlbmVyYXRpb25SZXNwb25zZSxcbiAgT3BlblJvdXRlclByb3ZpZGVyQ29uZmlnLFxuICBVcGxvYWRlZEZpbGVJbmZvXG59IGZyb20gXCIuLi90eXBlc1wiO1xuaW1wb3J0IHsgdHJ1bmNhdGVTb3VyY2VUZXh0IH0gZnJvbSBcIi4uL3NvdXJjZVV0aWxzXCI7XG5pbXBvcnQgeyBBSVByb3ZpZGVyIH0gZnJvbSBcIi4vYmFzZVwiO1xuXG5jb25zdCBCQVNFX1VSTCA9IFwiaHR0cHM6Ly9vcGVucm91dGVyLmFpL2FwaS92MVwiO1xuXG5mdW5jdGlvbiBhc0Vycm9yTWVzc2FnZShlcnJvcjogdW5rbm93bik6IHN0cmluZyB7XG4gIHJldHVybiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcik7XG59XG5cbmV4cG9ydCBjbGFzcyBPcGVuUm91dGVyUHJvdmlkZXIgaW1wbGVtZW50cyBBSVByb3ZpZGVyIHtcbiAgcmVhZG9ubHkgaWQgPSBcIm9wZW5yb3V0ZXJcIjtcbiAgcmVhZG9ubHkgbmFtZSA9IFwiT3BlblJvdXRlclwiO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgY29uZmlnOiBPcGVuUm91dGVyUHJvdmlkZXJDb25maWcpIHt9XG5cbiAgYXN5bmMgZ2VuZXJhdGUocmVxdWVzdDogR2VuZXJhdGlvblJlcXVlc3QpOiBQcm9taXNlPEdlbmVyYXRpb25SZXNwb25zZT4ge1xuICAgIHRoaXMuZW5zdXJlQ29uZmlndXJlZCgpO1xuICAgIGNvbnN0IG1vZGVsID0gcmVxdWVzdC5tb2RlbCB8fCB0aGlzLmNvbmZpZy5kZWZhdWx0TW9kZWw7XG4gICAgY29uc3Qgc291cmNlQmxvY2tzID0gKHJlcXVlc3QucmVzb2x2ZWRTb3VyY2VzID8/IFtdKVxuICAgICAgLmZpbHRlcigoc291cmNlKSA9PiBzb3VyY2UudGV4dENvbnRlbnQpXG4gICAgICAubWFwKChzb3VyY2UpID0+IGBbU09VUkNFOiAke3NvdXJjZS5yZWYubGFiZWx9XVxcbiR7dHJ1bmNhdGVTb3VyY2VUZXh0KHNvdXJjZS50ZXh0Q29udGVudCA/PyBcIlwiKX1cXG5bRU5EIFNPVVJDRV1gKTtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICB1cmw6IGAke0JBU0VfVVJMfS9jaGF0L2NvbXBsZXRpb25zYCxcbiAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgICBcIkF1dGhvcml6YXRpb25cIjogYEJlYXJlciAke3RoaXMuY29uZmlnLmFwaUtleX1gLFxuICAgICAgICBcIkhUVFAtUmVmZXJlclwiOiBcIm9ic2lkaWFuLXN5YnlsXCIsXG4gICAgICAgIFwiWC1UaXRsZVwiOiBcIlN5YnlsXCJcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIG1vZGVsLFxuICAgICAgICBtYXhfdG9rZW5zOiByZXF1ZXN0Lm1heE91dHB1dFRva2VucyxcbiAgICAgICAgdGVtcGVyYXR1cmU6IHJlcXVlc3QudGVtcGVyYXR1cmUsXG4gICAgICAgIG1lc3NhZ2VzOiBbXG4gICAgICAgICAgeyByb2xlOiBcInN5c3RlbVwiLCBjb250ZW50OiByZXF1ZXN0LnN5c3RlbVByb21wdCB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHJvbGU6IFwidXNlclwiLFxuICAgICAgICAgICAgY29udGVudDogc291cmNlQmxvY2tzLmxlbmd0aFxuICAgICAgICAgICAgICA/IGAke3NvdXJjZUJsb2Nrcy5qb2luKFwiXFxuXFxuXCIpfVxcblxcbiR7cmVxdWVzdC51c2VyTWVzc2FnZX1gXG4gICAgICAgICAgICAgIDogcmVxdWVzdC51c2VyTWVzc2FnZVxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfSksXG4gICAgICB0aHJvdzogZmFsc2VcbiAgICB9KTtcblxuICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPCAyMDAgfHwgcmVzcG9uc2Uuc3RhdHVzID49IDMwMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKHRoaXMuZXh0cmFjdEVycm9yKHJlc3BvbnNlKSk7XG4gICAgfVxuXG4gICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmpzb247XG4gICAgY29uc3QgdGV4dCA9IGRhdGEuY2hvaWNlcz8uWzBdPy5tZXNzYWdlPy5jb250ZW50Py50cmltPy4oKSA/PyBcIlwiO1xuICAgIGlmICghdGV4dCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUHJvdmlkZXIgcmV0dXJuZWQgYW4gZW1wdHkgcmVzcG9uc2UuXCIpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB0ZXh0LFxuICAgICAgaW5wdXRUb2tlbnM6IGRhdGEudXNhZ2U/LnByb21wdF90b2tlbnMsXG4gICAgICBvdXRwdXRUb2tlbnM6IGRhdGEudXNhZ2U/LmNvbXBsZXRpb25fdG9rZW5zXG4gICAgfTtcbiAgfVxuXG4gIGFzeW5jIHVwbG9hZFNvdXJjZSgpOiBQcm9taXNlPFVwbG9hZGVkRmlsZUluZm8+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJPcGVuUm91dGVyIGRvZXMgbm90IHN1cHBvcnQgZmlsZSB1cGxvYWQuIFVzZSB2YXVsdF9wYXRoIGluc3RlYWQuXCIpO1xuICB9XG5cbiAgYXN5bmMgbGlzdFNvdXJjZXMoKTogUHJvbWlzZTxVcGxvYWRlZEZpbGVJbmZvW10+IHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBhc3luYyBkZWxldGVTb3VyY2UoKTogUHJvbWlzZTx2b2lkPiB7fVxuXG4gIGFzeW5jIGxpc3RNb2RlbHMoKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICAgIGlmICghdGhpcy5jb25maWcuYXBpS2V5LnRyaW0oKSkgcmV0dXJuIFtdO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3RVcmwoe1xuICAgICAgICB1cmw6IGAke0JBU0VfVVJMfS9tb2RlbHNgLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgXCJBdXRob3JpemF0aW9uXCI6IGBCZWFyZXIgJHt0aGlzLmNvbmZpZy5hcGlLZXl9YFxuICAgICAgICB9LFxuICAgICAgICB0aHJvdzogZmFsc2VcbiAgICAgIH0pO1xuICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA8IDIwMCB8fCByZXNwb25zZS5zdGF0dXMgPj0gMzAwKSByZXR1cm4gW107XG4gICAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuanNvbjtcbiAgICAgIHJldHVybiAoZGF0YS5kYXRhID8/IFtdKVxuICAgICAgICAuZmlsdGVyKChtOiB7IGFyY2hpdGVjdHVyZT86IHsgbW9kYWxpdHk/OiBzdHJpbmcgfSB9KSA9PlxuICAgICAgICAgIG0uYXJjaGl0ZWN0dXJlPy5tb2RhbGl0eT8uZW5kc1dpdGgoXCItPnRleHRcIikpXG4gICAgICAgIC5tYXAoKG06IHsgaWQ/OiBzdHJpbmcgfSkgPT4gbS5pZCA/PyBcIlwiKVxuICAgICAgICAuZmlsdGVyKEJvb2xlYW4pXG4gICAgICAgIC5zb3J0KCk7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgdmFsaWRhdGUoKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgaWYgKCF0aGlzLmNvbmZpZy5hcGlLZXkudHJpbSgpKSByZXR1cm4gZmFsc2U7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICAgIHVybDogYCR7QkFTRV9VUkx9L21vZGVsc2AsXG4gICAgICAgIGhlYWRlcnM6IHsgXCJBdXRob3JpemF0aW9uXCI6IGBCZWFyZXIgJHt0aGlzLmNvbmZpZy5hcGlLZXl9YCB9LFxuICAgICAgICB0aHJvdzogZmFsc2VcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLnN0YXR1cyA+PSAyMDAgJiYgcmVzcG9uc2Uuc3RhdHVzIDwgMzAwO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZW5zdXJlQ29uZmlndXJlZCgpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuY29uZmlnLmFwaUtleS50cmltKCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vIE9wZW5Sb3V0ZXIgQVBJIGtleSBzZXQuIENoZWNrIHBsdWdpbiBzZXR0aW5ncy5cIik7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBleHRyYWN0RXJyb3IocmVzcG9uc2U6IFJlcXVlc3RVcmxSZXNwb25zZSk6IHN0cmluZyB7XG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAxIHx8IHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAzKSB7XG4gICAgICByZXR1cm4gXCJPcGVuUm91dGVyIEFQSSBrZXkgcmVqZWN0ZWQuIENoZWNrIHNldHRpbmdzLlwiO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmpzb247XG4gICAgICBjb25zdCBtc2cgPSBkYXRhPy5lcnJvcj8ubWVzc2FnZSA/PyBgT3BlblJvdXRlciByZXF1ZXN0IGZhaWxlZCAoJHtyZXNwb25zZS5zdGF0dXN9KS5gO1xuICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gNDI5KSB7XG4gICAgICAgIGlmIChtc2cgPT09IFwiUHJvdmlkZXIgcmV0dXJuZWQgZXJyb3JcIikge1xuICAgICAgICAgIHJldHVybiBcIk9wZW5Sb3V0ZXI6IGZyZWUgbW9kZWwgZW5kcG9pbnQgYXQgY2FwYWNpdHkuIFJldHJ5IGluIGEgbW9tZW50IG9yIHBpY2sgYSBkaWZmZXJlbnQgbW9kZWwuXCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGBPcGVuUm91dGVyIHJhdGUgbGltaXQ6ICR7bXNnfWA7XG4gICAgICB9XG4gICAgICByZXR1cm4gbXNnO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICByZXR1cm4gYXNFcnJvck1lc3NhZ2UoZXJyb3IpIHx8IGBPcGVuUm91dGVyIHJlcXVlc3QgZmFpbGVkICgke3Jlc3BvbnNlLnN0YXR1c30pLmA7XG4gICAgfVxuICB9XG59XG4iLCAiaW1wb3J0IHsgUHJvdmlkZXJJRCwgU3lieWxTZXR0aW5ncyB9IGZyb20gXCIuLi90eXBlc1wiO1xuaW1wb3J0IHsgQUlQcm92aWRlciB9IGZyb20gXCIuL2Jhc2VcIjtcbmltcG9ydCB7IEFudGhyb3BpY1Byb3ZpZGVyIH0gZnJvbSBcIi4vYW50aHJvcGljXCI7XG5pbXBvcnQgeyBHZW1pbmlQcm92aWRlciB9IGZyb20gXCIuL2dlbWluaVwiO1xuaW1wb3J0IHsgT2xsYW1hUHJvdmlkZXIgfSBmcm9tIFwiLi9vbGxhbWFcIjtcbmltcG9ydCB7IE9wZW5BSVByb3ZpZGVyIH0gZnJvbSBcIi4vb3BlbmFpXCI7XG5pbXBvcnQgeyBPcGVuUm91dGVyUHJvdmlkZXIgfSBmcm9tIFwiLi9vcGVucm91dGVyXCI7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRQcm92aWRlcihzZXR0aW5nczogU3lieWxTZXR0aW5ncywgb3ZlcnJpZGVJZD86IFByb3ZpZGVySUQpOiBBSVByb3ZpZGVyIHtcbiAgY29uc3QgaWQgPSBvdmVycmlkZUlkID8/IHNldHRpbmdzLmFjdGl2ZVByb3ZpZGVyO1xuICBzd2l0Y2ggKGlkKSB7XG4gICAgY2FzZSBcImdlbWluaVwiOlxuICAgICAgcmV0dXJuIG5ldyBHZW1pbmlQcm92aWRlcihzZXR0aW5ncy5wcm92aWRlcnMuZ2VtaW5pKTtcbiAgICBjYXNlIFwib3BlbmFpXCI6XG4gICAgICByZXR1cm4gbmV3IE9wZW5BSVByb3ZpZGVyKHNldHRpbmdzLnByb3ZpZGVycy5vcGVuYWkpO1xuICAgIGNhc2UgXCJhbnRocm9waWNcIjpcbiAgICAgIHJldHVybiBuZXcgQW50aHJvcGljUHJvdmlkZXIoc2V0dGluZ3MucHJvdmlkZXJzLmFudGhyb3BpYyk7XG4gICAgY2FzZSBcIm9sbGFtYVwiOlxuICAgICAgcmV0dXJuIG5ldyBPbGxhbWFQcm92aWRlcihzZXR0aW5ncy5wcm92aWRlcnMub2xsYW1hKTtcbiAgICBjYXNlIFwib3BlbnJvdXRlclwiOlxuICAgICAgcmV0dXJuIG5ldyBPcGVuUm91dGVyUHJvdmlkZXIoc2V0dGluZ3MucHJvdmlkZXJzLm9wZW5yb3V0ZXIpO1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gcHJvdmlkZXI6ICR7aWR9YCk7XG4gIH1cbn1cbiIsICJpbXBvcnQgeyBOb3RpY2UsIFRGaWxlLCBub3JtYWxpemVQYXRoIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgdHlwZSBTeWJ5bFBsdWdpbiBmcm9tIFwiLi9tYWluXCI7XG5pbXBvcnQgeyBnZXRTZWxlY3Rpb24sIGluc2VydEJlbG93U2VsZWN0aW9uIH0gZnJvbSBcIi4vZWRpdG9yXCI7XG5pbXBvcnQgeyByZW1vdmVTb3VyY2VSZWYsIHVwc2VydFNvdXJjZVJlZiwgd3JpdGVGcm9udE1hdHRlcktleSB9IGZyb20gXCIuL2Zyb250bWF0dGVyXCI7XG5pbXBvcnQge1xuICBmb3JtYXRBZHZlbnR1cmVTZWVkLFxuICBmb3JtYXRBc2tPcmFjbGUsXG4gIGZvcm1hdENoYXJhY3RlcixcbiAgZm9ybWF0RGVjbGFyZUFjdGlvbixcbiAgZm9ybWF0RXhwYW5kU2NlbmUsXG4gIGZvcm1hdEludGVycHJldE9yYWNsZSxcbiAgZm9ybWF0U3RhcnRTY2VuZSxcbiAgZm9ybWF0U3VnZ2VzdENvbnNlcXVlbmNlLFxuICBMb25lbG9nRm9ybWF0T3B0aW9uc1xufSBmcm9tIFwiLi9sb25lbG9nL2Zvcm1hdHRlclwiO1xuaW1wb3J0IHsgcGFyc2VMb25lbG9nQ29udGV4dCwgc2VyaWFsaXplQ29udGV4dCB9IGZyb20gXCIuL2xvbmVsb2cvcGFyc2VyXCI7XG5pbXBvcnQgeyBNYW5hZ2VTb3VyY2VzTW9kYWwsIG9wZW5JbnB1dE1vZGFsLCBwaWNrTG9jYWxGaWxlLCBwaWNrU291cmNlT3JpZ2luLCBwaWNrU291cmNlUmVmLCBwaWNrVmF1bHRGaWxlIH0gZnJvbSBcIi4vbW9kYWxzXCI7XG5pbXBvcnQgeyByZXNvbHZlU291cmNlc0ZvclJlcXVlc3QgfSBmcm9tIFwiLi9zb3VyY2VVdGlsc1wiO1xuaW1wb3J0IHsgTm90ZUZyb250TWF0dGVyLCBTb3VyY2VSZWYsIFN5YnlsU2V0dGluZ3MgfSBmcm9tIFwiLi90eXBlc1wiO1xuXG5mdW5jdGlvbiBpc0xvbmVsb2dBY3RpdmUoc2V0dGluZ3M6IFN5YnlsU2V0dGluZ3MsIGZtOiBOb3RlRnJvbnRNYXR0ZXIpOiBib29sZWFuIHtcbiAgcmV0dXJuIGZtLmxvbmVsb2cgPz8gc2V0dGluZ3MubG9uZWxvZ01vZGU7XG59XG5cbmZ1bmN0aW9uIGxvbmVsb2dPcHRzKHNldHRpbmdzOiBTeWJ5bFNldHRpbmdzKTogTG9uZWxvZ0Zvcm1hdE9wdGlvbnMge1xuICByZXR1cm4geyB3cmFwSW5Db2RlQmxvY2s6IHNldHRpbmdzLmxvbmVsb2dXcmFwQ29kZUJsb2NrID8/IHRydWUgfTtcbn1cblxuZnVuY3Rpb24gZ2VuZXJpY0Jsb2NrcXVvdGUobGFiZWw6IHN0cmluZywgdGV4dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGA+IFske2xhYmVsfV0gJHt0ZXh0LnRyaW0oKS5yZXBsYWNlKC9cXG4vZywgXCJcXG4+IFwiKX1gO1xufVxuXG5mdW5jdGlvbiBpbmZlck1pbWVUeXBlKGZpbGU6IFRGaWxlIHwgRmlsZSk6IHN0cmluZyB7XG4gIGNvbnN0IG5hbWUgPSBcInBhdGhcIiBpbiBmaWxlID8gZmlsZS5wYXRoIDogZmlsZS5uYW1lO1xuICByZXR1cm4gbmFtZS50b0xvd2VyQ2FzZSgpLmVuZHNXaXRoKFwiLnBkZlwiKSA/IFwiYXBwbGljYXRpb24vcGRmXCIgOiBcInRleHQvcGxhaW5cIjtcbn1cblxuZnVuY3Rpb24gdG9kYXlJc29EYXRlKCk6IHN0cmluZyB7XG4gIHJldHVybiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc2xpY2UoMCwgMTApO1xufVxuXG5mdW5jdGlvbiBwYXJzZUxvbmVsb2dPcmFjbGVSZXNwb25zZSh0ZXh0OiBzdHJpbmcpOiB7IHJlc3VsdDogc3RyaW5nOyBpbnRlcnByZXRhdGlvbjogc3RyaW5nIH0ge1xuICBjb25zdCBsaW5lcyA9IHRleHRcbiAgICAucmVwbGFjZSgvXj5cXHMqL2dtLCBcIlwiKVxuICAgIC5zcGxpdChcIlxcblwiKVxuICAgIC5tYXAoKGxpbmUpID0+IGxpbmUudHJpbSgpKVxuICAgIC5maWx0ZXIoQm9vbGVhbik7XG4gIGNvbnN0IHJlc3VsdCA9IGxpbmVzLmZpbmQoKGxpbmUpID0+IGxpbmUuc3RhcnRzV2l0aChcIi0+XCIpKT8ucmVwbGFjZSgvXi0+XFxzKi8sIFwiXCIpID8/IFwiVW5jbGVhclwiO1xuICBjb25zdCBpbnRlcnByZXRhdGlvbiA9IGxpbmVzLmZpbHRlcigobGluZSkgPT4gIWxpbmUuc3RhcnRzV2l0aChcIi0+XCIpKS5qb2luKFwiXFxuXCIpO1xuICByZXR1cm4geyByZXN1bHQsIGludGVycHJldGF0aW9uIH07XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGFkZFNvdXJjZVRvTm90ZShwbHVnaW46IFN5YnlsUGx1Z2luLCBmaWxlOiBURmlsZSk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBvcmlnaW4gPSBhd2FpdCBwaWNrU291cmNlT3JpZ2luKHBsdWdpbi5hcHApO1xuICBpZiAoIW9yaWdpbikgcmV0dXJuO1xuXG4gIGlmIChvcmlnaW4gPT09IFwidmF1bHRcIikge1xuICAgIGNvbnN0IHZhdWx0RmlsZSA9IGF3YWl0IHBpY2tWYXVsdEZpbGUocGx1Z2luLmFwcCwgXCJDaG9vc2UgYSB2YXVsdCBmaWxlXCIpO1xuICAgIGlmICghdmF1bHRGaWxlKSByZXR1cm47XG4gICAgY29uc3QgcmVmOiBTb3VyY2VSZWYgPSB7XG4gICAgICBsYWJlbDogdmF1bHRGaWxlLmJhc2VuYW1lLFxuICAgICAgbWltZV90eXBlOiBpbmZlck1pbWVUeXBlKHZhdWx0RmlsZSksXG4gICAgICB2YXVsdF9wYXRoOiB2YXVsdEZpbGUucGF0aFxuICAgIH07XG4gICAgYXdhaXQgdXBzZXJ0U291cmNlUmVmKHBsdWdpbi5hcHAsIGZpbGUsIHJlZik7XG4gICAgbmV3IE5vdGljZShgU291cmNlIGFkZGVkOiAke3ZhdWx0RmlsZS5wYXRofWApO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIEV4dGVybmFsIGZpbGUgXHUyMDE0IGltcG9ydCBpbnRvIHZhdWx0XG4gIGNvbnN0IGxvY2FsRmlsZSA9IGF3YWl0IHBpY2tMb2NhbEZpbGUoKTtcbiAgaWYgKCFsb2NhbEZpbGUpIHJldHVybjtcblxuICBjb25zdCBidWZmZXIgPSBhd2FpdCBsb2NhbEZpbGUuYXJyYXlCdWZmZXIoKTtcbiAgY29uc3QgcGFyZW50RGlyID0gZmlsZS5wYXJlbnQ/LnBhdGggPz8gXCJcIjtcbiAgY29uc3Qgc291cmNlc0ZvbGRlciA9IG5vcm1hbGl6ZVBhdGgocGFyZW50RGlyID8gYCR7cGFyZW50RGlyfS9zb3VyY2VzYCA6IFwic291cmNlc1wiKTtcblxuICBpZiAoIXBsdWdpbi5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHNvdXJjZXNGb2xkZXIpKSB7XG4gICAgYXdhaXQgcGx1Z2luLmFwcC52YXVsdC5jcmVhdGVGb2xkZXIoc291cmNlc0ZvbGRlcik7XG4gIH1cblxuICBjb25zdCB0YXJnZXRQYXRoID0gbm9ybWFsaXplUGF0aChgJHtzb3VyY2VzRm9sZGVyfS8ke2xvY2FsRmlsZS5uYW1lfWApO1xuICBjb25zdCBleGlzdGluZyA9IHBsdWdpbi5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKHRhcmdldFBhdGgpO1xuICBpZiAoZXhpc3RpbmcgaW5zdGFuY2VvZiBURmlsZSkge1xuICAgIGF3YWl0IHBsdWdpbi5hcHAudmF1bHQubW9kaWZ5QmluYXJ5KGV4aXN0aW5nLCBidWZmZXIpO1xuICB9IGVsc2Uge1xuICAgIGF3YWl0IHBsdWdpbi5hcHAudmF1bHQuY3JlYXRlQmluYXJ5KHRhcmdldFBhdGgsIGJ1ZmZlcik7XG4gIH1cblxuICBjb25zdCByZWY6IFNvdXJjZVJlZiA9IHtcbiAgICBsYWJlbDogbG9jYWxGaWxlLm5hbWUucmVwbGFjZSgvXFwuW14uXSskLywgXCJcIiksXG4gICAgbWltZV90eXBlOiBpbmZlck1pbWVUeXBlKGxvY2FsRmlsZSksXG4gICAgdmF1bHRfcGF0aDogdGFyZ2V0UGF0aFxuICB9O1xuICBhd2FpdCB1cHNlcnRTb3VyY2VSZWYocGx1Z2luLmFwcCwgZmlsZSwgcmVmKTtcbiAgbmV3IE5vdGljZShgU291cmNlIGltcG9ydGVkOiAke3RhcmdldFBhdGh9YCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIG1hbmFnZVNvdXJjZXMocGx1Z2luOiBTeWJ5bFBsdWdpbik6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBjb250ZXh0ID0gYXdhaXQgcGx1Z2luLmdldEFjdGl2ZU5vdGVDb250ZXh0KCk7XG4gIGlmICghY29udGV4dD8udmlldy5maWxlKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIG5ldyBNYW5hZ2VTb3VyY2VzTW9kYWwoXG4gICAgcGx1Z2luLmFwcCxcbiAgICBjb250ZXh0LmZtLnNvdXJjZXMgPz8gW10sXG4gICAgYXN5bmMgKHJlZikgPT4gcmVtb3ZlU291cmNlUmVmKHBsdWdpbi5hcHAsIGNvbnRleHQudmlldy5maWxlISwgcmVmKVxuICApLm9wZW4oKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcnVuR2VuZXJhdGlvbihcbiAgcGx1Z2luOiBTeWJ5bFBsdWdpbixcbiAgdXNlck1lc3NhZ2U6IHN0cmluZyxcbiAgZm9ybWF0dGVyOiAodGV4dDogc3RyaW5nLCBmbTogTm90ZUZyb250TWF0dGVyKSA9PiBzdHJpbmcsXG4gIG1heE91dHB1dFRva2VucyA9IDUxMixcbiAgcGxhY2VtZW50PzogXCJjdXJzb3JcIiB8IFwiZW5kLW9mLW5vdGVcIiB8IFwiYmVsb3ctc2VsZWN0aW9uXCJcbik6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBjb250ZXh0ID0gYXdhaXQgcGx1Z2luLmdldEFjdGl2ZU5vdGVDb250ZXh0KCk7XG4gIGlmICghY29udGV4dCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHRyeSB7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBwbHVnaW4ucmVxdWVzdEdlbmVyYXRpb24oY29udGV4dC5mbSwgY29udGV4dC5ub3RlQm9keSwgdXNlck1lc3NhZ2UsIG1heE91dHB1dFRva2Vucyk7XG4gICAgY29uc3QgZm9ybWF0dGVkID0gZm9ybWF0dGVyKHJlc3BvbnNlLnRleHQsIGNvbnRleHQuZm0pO1xuICAgIGlmIChwbGFjZW1lbnQgPT09IFwiYmVsb3ctc2VsZWN0aW9uXCIpIHtcbiAgICAgIGluc2VydEJlbG93U2VsZWN0aW9uKGNvbnRleHQudmlldy5lZGl0b3IsIGZvcm1hdHRlZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBsdWdpbi5pbnNlcnRUZXh0KGNvbnRleHQudmlldywgZm9ybWF0dGVkLCBwbGFjZW1lbnQpO1xuICAgIH1cbiAgICBwbHVnaW4ubWF5YmVJbnNlcnRUb2tlbkNvbW1lbnQoY29udGV4dC52aWV3LCByZXNwb25zZSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgbmV3IE5vdGljZShgU3lieWwgZXJyb3I6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWdpc3RlckFsbENvbW1hbmRzKHBsdWdpbjogU3lieWxQbHVnaW4pOiB2b2lkIHtcbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOmluc2VydC1mcm9udG1hdHRlclwiLFxuICAgIG5hbWU6IFwiSW5zZXJ0IE5vdGUgRnJvbnRtYXR0ZXJcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY29udGV4dCA9IGF3YWl0IHBsdWdpbi5nZXRBY3RpdmVOb3RlQ29udGV4dCgpO1xuICAgICAgaWYgKCFjb250ZXh0Py52aWV3LmZpbGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgdmFsdWVzID0gYXdhaXQgb3BlbklucHV0TW9kYWwocGx1Z2luLmFwcCwgXCJJbnNlcnQgU3lieWwgRnJvbnRtYXR0ZXJcIiwgW1xuICAgICAgICB7IGtleTogXCJydWxlc2V0XCIsIGxhYmVsOiBcIkdhbWUgLyBydWxlc2V0XCIsIHBsYWNlaG9sZGVyOiBcIklyb25zd29yblwiIH0sXG4gICAgICAgIHsga2V5OiBcInBjc1wiLCBsYWJlbDogXCJQQ1wiLCBvcHRpb25hbDogdHJ1ZSwgcGxhY2Vob2xkZXI6IFwiS2lyYSBWb3NzLCBkYW5nZXJvdXMgcmFuaywgdm93OiByZWNvdmVyIHRoZSByZWxpY1wiIH0sXG4gICAgICAgIHsga2V5OiBcInRvbmVcIiwgbGFiZWw6IFwiVG9uZVwiLCBvcHRpb25hbDogdHJ1ZSwgcGxhY2Vob2xkZXI6IFwiR3JpdHR5LCBob3BlZnVsXCIgfSxcbiAgICAgICAgeyBrZXk6IFwibGFuZ3VhZ2VcIiwgbGFiZWw6IFwiTGFuZ3VhZ2VcIiwgb3B0aW9uYWw6IHRydWUsIHBsYWNlaG9sZGVyOiBcIkxlYXZlIGJsYW5rIGZvciBhdXRvLWRldGVjdFwiIH1cbiAgICAgIF0pO1xuICAgICAgaWYgKCF2YWx1ZXMpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKCF2YWx1ZXMucnVsZXNldCkge1xuICAgICAgICBuZXcgTm90aWNlKFwiUnVsZXNldCBpcyByZXF1aXJlZC5cIik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGF3YWl0IHBsdWdpbi5hcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGNvbnRleHQudmlldy5maWxlLCAoZm0pID0+IHtcbiAgICAgICAgZm1bXCJydWxlc2V0XCJdID0gdmFsdWVzLnJ1bGVzZXQ7XG4gICAgICAgIGZtW1wicHJvdmlkZXJcIl0gPSBmbVtcInByb3ZpZGVyXCJdID8/IHBsdWdpbi5zZXR0aW5ncy5hY3RpdmVQcm92aWRlcjtcbiAgICAgICAgZm1bXCJvcmFjbGVfbW9kZVwiXSA9IGZtW1wib3JhY2xlX21vZGVcIl0gPz8gXCJ5ZXMtbm9cIjtcbiAgICAgICAgZm1bXCJsb25lbG9nXCJdID0gZm1bXCJsb25lbG9nXCJdID8/IHBsdWdpbi5zZXR0aW5ncy5sb25lbG9nTW9kZTtcbiAgICAgICAgZm1bXCJzY2VuZV9jb3VudGVyXCJdID0gZm1bXCJzY2VuZV9jb3VudGVyXCJdID8/IDE7XG4gICAgICAgIGZtW1wic2Vzc2lvbl9udW1iZXJcIl0gPSBmbVtcInNlc3Npb25fbnVtYmVyXCJdID8/IDE7XG4gICAgICAgIGZtW1wiZ2FtZV9jb250ZXh0XCJdID0gZm1bXCJnYW1lX2NvbnRleHRcIl0gPz8gXCJcIjtcbiAgICAgICAgZm1bXCJzY2VuZV9jb250ZXh0XCJdID0gZm1bXCJzY2VuZV9jb250ZXh0XCJdID8/IFwiXCI7XG4gICAgICAgIGlmICh2YWx1ZXMucGNzKSBmbVtcInBjc1wiXSA9IHZhbHVlcy5wY3M7XG4gICAgICAgIGlmICh2YWx1ZXMudG9uZSkgZm1bXCJ0b25lXCJdID0gdmFsdWVzLnRvbmU7XG4gICAgICAgIGlmICh2YWx1ZXMubGFuZ3VhZ2UpIGZtW1wibGFuZ3VhZ2VcIl0gPSB2YWx1ZXMubGFuZ3VhZ2U7XG4gICAgICB9KTtcbiAgICAgIG5ldyBOb3RpY2UoXCJTeWJ5bCBmcm9udG1hdHRlciBpbnNlcnRlZC5cIik7XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6ZGlnZXN0LXNvdXJjZVwiLFxuICAgIG5hbWU6IFwiRGlnZXN0IFNvdXJjZSBpbnRvIEdhbWUgQ29udGV4dFwiLFxuICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjb250ZXh0ID0gYXdhaXQgcGx1Z2luLmdldEFjdGl2ZU5vdGVDb250ZXh0KCk7XG4gICAgICBpZiAoIWNvbnRleHQ/LnZpZXcuZmlsZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCB2YXVsdEZpbGUgPSBhd2FpdCBwaWNrVmF1bHRGaWxlKHBsdWdpbi5hcHAsIFwiQ2hvb3NlIGEgc291cmNlIGZpbGUgdG8gZGlnZXN0XCIpO1xuICAgICAgaWYgKCF2YXVsdEZpbGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgcmVmOiBTb3VyY2VSZWYgPSB7XG4gICAgICAgIGxhYmVsOiB2YXVsdEZpbGUuYmFzZW5hbWUsXG4gICAgICAgIG1pbWVfdHlwZTogaW5mZXJNaW1lVHlwZSh2YXVsdEZpbGUpLFxuICAgICAgICB2YXVsdF9wYXRoOiB2YXVsdEZpbGUucGF0aFxuICAgICAgfTtcbiAgICAgIGNvbnN0IHByb3ZpZGVySWQgPSBjb250ZXh0LmZtLnByb3ZpZGVyID8/IHBsdWdpbi5zZXR0aW5ncy5hY3RpdmVQcm92aWRlcjtcbiAgICAgIGxldCByZXNvbHZlZFNvdXJjZXM7XG4gICAgICB0cnkge1xuICAgICAgICByZXNvbHZlZFNvdXJjZXMgPSBhd2FpdCByZXNvbHZlU291cmNlc0ZvclJlcXVlc3QocGx1Z2luLmFwcCwgW3JlZl0sIHByb3ZpZGVySWQpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgbmV3IE5vdGljZShgQ2Fubm90IHJlYWQgc291cmNlOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgcnVsZXNldCA9IGNvbnRleHQuZm0ucnVsZXNldCA/PyBcInRoZSBnYW1lXCI7XG4gICAgICBjb25zdCBkaWdlc3RQcm9tcHQgPSBgRGlzdGlsbCB0aGUgZm9sbG93aW5nIHNvdXJjZSBtYXRlcmlhbCBmb3IgdXNlIGluIGEgc29sbyB0YWJsZXRvcCBSUEcgc2Vzc2lvbiBvZiBcIiR7cnVsZXNldH1cIi5cblxuRXh0cmFjdCBhbmQgY29uZGVuc2UgaW50byBhIGNvbXBhY3QgcmVmZXJlbmNlOlxuLSBDb3JlIHJ1bGVzIGFuZCBtZWNoYW5pY3MgcmVsZXZhbnQgdG8gcGxheVxuLSBLZXkgZmFjdGlvbnMsIGxvY2F0aW9ucywgY2hhcmFjdGVycywgYW5kIHdvcmxkIGZhY3RzXG4tIFRvbmUsIGdlbnJlLCBhbmQgc2V0dGluZyBjb252ZW50aW9uc1xuLSBBbnkgdGFibGVzLCBtb3ZlIGxpc3RzLCBvciByYW5kb20gZ2VuZXJhdG9yc1xuXG5CZSBjb25jaXNlIGFuZCBzcGVjaWZpYy4gUHJlc2VydmUgZ2FtZS1tZWNoYW5pY2FsIGRldGFpbHMuIE9taXQgZmxhdm9yIHByb3NlIGFuZCBleGFtcGxlcy5gO1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBwbHVnaW4ucmVxdWVzdFJhd0dlbmVyYXRpb24oXG4gICAgICAgICAgY29udGV4dC5mbSxcbiAgICAgICAgICBkaWdlc3RQcm9tcHQsXG4gICAgICAgICAgMjAwMCxcbiAgICAgICAgICByZXNvbHZlZFNvdXJjZXNcbiAgICAgICAgKTtcbiAgICAgICAgYXdhaXQgcGx1Z2luLmFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoY29udGV4dC52aWV3LmZpbGUsIChmbSkgPT4ge1xuICAgICAgICAgIGZtW1wiZ2FtZV9jb250ZXh0XCJdID0gcmVzcG9uc2UudGV4dDtcbiAgICAgICAgfSk7XG4gICAgICAgIG5ldyBOb3RpY2UoXCJHYW1lIGNvbnRleHQgdXBkYXRlZC5cIik7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBuZXcgTm90aWNlKGBTeWJ5bCBlcnJvcjogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6YXNrLXRoZS1ydWxlc1wiLFxuICAgIG5hbWU6IFwiQXNrIHRoZSBSdWxlc1wiLFxuICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjb250ZXh0ID0gYXdhaXQgcGx1Z2luLmdldEFjdGl2ZU5vdGVDb250ZXh0KCk7XG4gICAgICBpZiAoIWNvbnRleHQ/LnZpZXcuZmlsZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCBzb3VyY2VzID0gY29udGV4dC5mbS5zb3VyY2VzID8/IFtdO1xuICAgICAgaWYgKCFzb3VyY2VzLmxlbmd0aCkge1xuICAgICAgICBuZXcgTm90aWNlKFwiTm8gc291cmNlcyBhdHRhY2hlZCB0byB0aGlzIG5vdGUuIFVzZSBBZGQgU291cmNlIEZpbGUgZmlyc3QuXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCByZWYgPSBzb3VyY2VzLmxlbmd0aCA9PT0gMVxuICAgICAgICA/IHNvdXJjZXNbMF1cbiAgICAgICAgOiBhd2FpdCBwaWNrU291cmNlUmVmKHBsdWdpbi5hcHAsIFwiQ2hvb3NlIGEgc291cmNlIHRvIHF1ZXJ5XCIsIHNvdXJjZXMpO1xuICAgICAgaWYgKCFyZWYpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgdmFsdWVzID0gYXdhaXQgb3BlbklucHV0TW9kYWwocGx1Z2luLmFwcCwgXCJBc2sgdGhlIFJ1bGVzXCIsIFtcbiAgICAgICAgeyBrZXk6IFwicXVlc3Rpb25cIiwgbGFiZWw6IFwiUXVlc3Rpb25cIiwgcGxhY2Vob2xkZXI6IFwiSG93IGRvZXMgTW9tZW50dW0gd29yaz9cIiB9XG4gICAgICBdKTtcbiAgICAgIGlmICghdmFsdWVzPy5xdWVzdGlvbikge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCBwcm92aWRlcklkID0gY29udGV4dC5mbS5wcm92aWRlciA/PyBwbHVnaW4uc2V0dGluZ3MuYWN0aXZlUHJvdmlkZXI7XG4gICAgICBsZXQgcmVzb2x2ZWRTb3VyY2VzO1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzb2x2ZWRTb3VyY2VzID0gYXdhaXQgcmVzb2x2ZVNvdXJjZXNGb3JSZXF1ZXN0KHBsdWdpbi5hcHAsIFtyZWZdLCBwcm92aWRlcklkKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoYENhbm5vdCByZWFkIHNvdXJjZTogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJ1bGVzZXQgPSBjb250ZXh0LmZtLnJ1bGVzZXQgPz8gXCJ0aGUgZ2FtZVwiO1xuICAgICAgY29uc3QgcHJvbXB0ID0gYFlvdSBhcmUgYSBydWxlcyByZWZlcmVuY2UgZm9yIFwiJHtydWxlc2V0fVwiLlxuQW5zd2VyIHRoZSBmb2xsb3dpbmcgcXVlc3Rpb24gdXNpbmcgb25seSB0aGUgcHJvdmlkZWQgc291cmNlIG1hdGVyaWFsLlxuQmUgcHJlY2lzZSBhbmQgY2l0ZSB0aGUgcmVsZXZhbnQgcnVsZSBvciBwYWdlIHNlY3Rpb24gaWYgcG9zc2libGUuXG5cblF1ZXN0aW9uOiAke3ZhbHVlcy5xdWVzdGlvbn1gO1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBwbHVnaW4ucmVxdWVzdFJhd0dlbmVyYXRpb24oY29udGV4dC5mbSwgcHJvbXB0LCAxMDAwLCByZXNvbHZlZFNvdXJjZXMpO1xuICAgICAgICBwbHVnaW4uaW5zZXJ0VGV4dChjb250ZXh0LnZpZXcsIGdlbmVyaWNCbG9ja3F1b3RlKFwiUnVsZXNcIiwgcmVzcG9uc2UudGV4dCkpO1xuICAgICAgICBwbHVnaW4ubWF5YmVJbnNlcnRUb2tlbkNvbW1lbnQoY29udGV4dC52aWV3LCByZXNwb25zZSk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBuZXcgTm90aWNlKGBTeWJ5bCBlcnJvcjogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6YWR2ZW50dXJlLXNlZWRcIixcbiAgICBuYW1lOiBcIkFkdmVudHVyZSBTZWVkXCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGNvbnRleHQgPSBhd2FpdCBwbHVnaW4uZ2V0QWN0aXZlTm90ZUNvbnRleHQoKTtcbiAgICAgIGlmICghY29udGV4dD8udmlldy5maWxlKSByZXR1cm47XG4gICAgICBjb25zdCB2YWx1ZXMgPSBhd2FpdCBvcGVuSW5wdXRNb2RhbChwbHVnaW4uYXBwLCBcIkFkdmVudHVyZSBTZWVkXCIsIFtcbiAgICAgICAgeyBrZXk6IFwiY29uY2VwdFwiLCBsYWJlbDogXCJUaGVtZSBvciBjb25jZXB0XCIsIG9wdGlvbmFsOiB0cnVlLCBwbGFjZWhvbGRlcjogXCJMZWF2ZSBibGFuayBmb3IgYSByYW5kb20gc2VlZC5cIiB9XG4gICAgICBdKTtcbiAgICAgIGlmICghdmFsdWVzKSByZXR1cm47XG4gICAgICBjb25zdCBydWxlc2V0ID0gY29udGV4dC5mbS5ydWxlc2V0ID8/IFwidGhlIGdhbWVcIjtcbiAgICAgIGNvbnN0IGNvbmNlcHQgPSB2YWx1ZXMuY29uY2VwdD8udHJpbSgpO1xuICAgICAgY29uc3QgcHJvbXB0ID0gYEdlbmVyYXRlIGFuIGFkdmVudHVyZSBzZWVkIGZvciBhIHNvbG8gdGFibGV0b3AgUlBHIHNlc3Npb24gb2YgXCIke3J1bGVzZXR9XCIuXG5cblN0cnVjdHVyZSB0aGUgb3V0cHV0IGFzOlxuLSBQcmVtaXNlOiBvbmUgc2VudGVuY2UgZGVzY3JpYmluZyB0aGUgc2l0dWF0aW9uXG4tIENvbmZsaWN0OiB0aGUgY2VudHJhbCB0ZW5zaW9uIG9yIHRocmVhdFxuLSBIb29rOiB0aGUgc3BlY2lmaWMgZXZlbnQgdGhhdCBwdWxscyB0aGUgUEMgaW5cbi0gVG9uZTogdGhlIGludGVuZGVkIGF0bW9zcGhlcmVcblxuJHtjb25jZXB0ID8gYFRoZW1lL2NvbmNlcHQ6ICR7Y29uY2VwdH1gIDogXCJNYWtlIGl0IGV2b2NhdGl2ZSBhbmQgaW1tZWRpYXRlbHkgcGxheWFibGUuXCJ9XG5LZWVwIGl0IGNvbmNpc2UgXHUyMDE0IDQgYnVsbGV0IHBvaW50cywgb25lIHNob3J0IHNlbnRlbmNlIGVhY2guYDtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcGx1Z2luLnJlcXVlc3RSYXdHZW5lcmF0aW9uKGNvbnRleHQuZm0sIHByb21wdCwgODAwLCBbXSk7XG4gICAgICAgIGNvbnN0IGxvbmVsb2cgPSBpc0xvbmVsb2dBY3RpdmUocGx1Z2luLnNldHRpbmdzLCBjb250ZXh0LmZtKTtcbiAgICAgICAgY29uc3Qgb3V0cHV0ID0gbG9uZWxvZ1xuICAgICAgICAgID8gZm9ybWF0QWR2ZW50dXJlU2VlZChyZXNwb25zZS50ZXh0LCBsb25lbG9nT3B0cyhwbHVnaW4uc2V0dGluZ3MpKVxuICAgICAgICAgIDogZ2VuZXJpY0Jsb2NrcXVvdGUoXCJBZHZlbnR1cmUgU2VlZFwiLCByZXNwb25zZS50ZXh0KTtcbiAgICAgICAgcGx1Z2luLmluc2VydFRleHQoY29udGV4dC52aWV3LCBvdXRwdXQpO1xuICAgICAgICBwbHVnaW4ubWF5YmVJbnNlcnRUb2tlbkNvbW1lbnQoY29udGV4dC52aWV3LCByZXNwb25zZSk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBuZXcgTm90aWNlKGBTeWJ5bCBlcnJvcjogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6Z2VuZXJhdGUtY2hhcmFjdGVyXCIsXG4gICAgbmFtZTogXCJHZW5lcmF0ZSBDaGFyYWN0ZXJcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY29udGV4dCA9IGF3YWl0IHBsdWdpbi5nZXRBY3RpdmVOb3RlQ29udGV4dCgpO1xuICAgICAgaWYgKCFjb250ZXh0Py52aWV3LmZpbGUpIHJldHVybjtcbiAgICAgIGNvbnN0IHNvdXJjZXMgPSBjb250ZXh0LmZtLnNvdXJjZXMgPz8gW107XG4gICAgICBpZiAoIXNvdXJjZXMubGVuZ3RoKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoXCJObyBzb3VyY2VzIGF0dGFjaGVkIHRvIHRoaXMgbm90ZS4gQWRkIGEgcnVsZWJvb2sgZmlyc3QgdmlhIEFkZCBTb3VyY2UgRmlsZS5cIik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJlZiA9IHNvdXJjZXMubGVuZ3RoID09PSAxXG4gICAgICAgID8gc291cmNlc1swXVxuICAgICAgICA6IGF3YWl0IHBpY2tTb3VyY2VSZWYocGx1Z2luLmFwcCwgXCJDaG9vc2UgYSBydWxlYm9vayBzb3VyY2VcIiwgc291cmNlcyk7XG4gICAgICBpZiAoIXJlZikgcmV0dXJuO1xuICAgICAgY29uc3QgdmFsdWVzID0gYXdhaXQgb3BlbklucHV0TW9kYWwocGx1Z2luLmFwcCwgXCJHZW5lcmF0ZSBDaGFyYWN0ZXJcIiwgW1xuICAgICAgICB7IGtleTogXCJjb25jZXB0XCIsIGxhYmVsOiBcIkNoYXJhY3RlciBjb25jZXB0XCIsIG9wdGlvbmFsOiB0cnVlLCBwbGFjZWhvbGRlcjogXCJMZWF2ZSBibGFuayBmb3IgYSByYW5kb20gY2hhcmFjdGVyLlwiIH1cbiAgICAgIF0pO1xuICAgICAgaWYgKCF2YWx1ZXMpIHJldHVybjtcbiAgICAgIGNvbnN0IHByb3ZpZGVySWQgPSBjb250ZXh0LmZtLnByb3ZpZGVyID8/IHBsdWdpbi5zZXR0aW5ncy5hY3RpdmVQcm92aWRlcjtcbiAgICAgIGxldCByZXNvbHZlZFNvdXJjZXM7XG4gICAgICB0cnkge1xuICAgICAgICByZXNvbHZlZFNvdXJjZXMgPSBhd2FpdCByZXNvbHZlU291cmNlc0ZvclJlcXVlc3QocGx1Z2luLmFwcCwgW3JlZl0sIHByb3ZpZGVySWQpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgbmV3IE5vdGljZShgQ2Fubm90IHJlYWQgc291cmNlOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgcnVsZXNldCA9IGNvbnRleHQuZm0ucnVsZXNldCA/PyBcInRoZSBnYW1lXCI7XG4gICAgICBjb25zdCBjb25jZXB0ID0gdmFsdWVzLmNvbmNlcHQ/LnRyaW0oKTtcbiAgICAgIGNvbnN0IGxvbmVsb2cgPSBpc0xvbmVsb2dBY3RpdmUocGx1Z2luLnNldHRpbmdzLCBjb250ZXh0LmZtKTtcbiAgICAgIGNvbnN0IGZvcm1hdEluc3RydWN0aW9uID0gbG9uZWxvZ1xuICAgICAgICA/IGBGb3JtYXQgdGhlIG91dHB1dCBhcyBhIExvbmVsb2cgUEMgdGFnLiBVc2UgdGhlIG11bHRpLWxpbmUgZm9ybSBmb3IgY29tcGxleCBjaGFyYWN0ZXJzOlxuW1BDOk5hbWVcbiAgfCBzdGF0OiBIUCBYLCBTdHJlc3MgWVxuICB8IGdlYXI6IGl0ZW0xLCBpdGVtMlxuICB8IHRyYWl0OiB2YWx1ZTEsIHZhbHVlMlxuXVxuSW5jbHVkZSBhbGwgc3RhdHMgYW5kIGZpZWxkcyBleGFjdGx5IGFzIGRlZmluZWQgYnkgdGhlIHJ1bGVzLiBPdXRwdXQgdGhlIHRhZyBvbmx5IFx1MjAxNCBubyBleHRyYSBjb21tZW50YXJ5LmBcbiAgICAgICAgOiBgSW5jbHVkZSBhbGwgcmVxdWlyZWQgZmllbGRzIGFzIGRlZmluZWQgYnkgdGhlIHJ1bGVzOiBuYW1lLCBzdGF0cy9hdHRyaWJ1dGVzLCBzdGFydGluZyBlcXVpcG1lbnQsIGJhY2tncm91bmQsIGFuZCBhbnkgb3RoZXIgbWFuZGF0b3J5IGNoYXJhY3RlciBlbGVtZW50cy4gRm9ybWF0IGNsZWFybHkgd2l0aCBvbmUgZmllbGQgcGVyIGxpbmUuYDtcbiAgICAgIGNvbnN0IHByb21wdCA9IGBVc2luZyBPTkxZIHRoZSBjaGFyYWN0ZXIgY3JlYXRpb24gcnVsZXMgaW4gdGhlIHByb3ZpZGVkIHNvdXJjZSBtYXRlcmlhbCwgZ2VuZXJhdGUgYSBjaGFyYWN0ZXIgZm9yIFwiJHtydWxlc2V0fVwiLlxuXG5Gb2xsb3cgdGhlIGV4YWN0IGNoYXJhY3RlciBjcmVhdGlvbiBwcm9jZWR1cmUgZGVzY3JpYmVkIGluIHRoZSBydWxlcy4gRG8gbm90IGludmVudCBtZWNoYW5pY3Mgbm90IHByZXNlbnQgaW4gdGhlIHNvdXJjZS5cblxuJHtjb25jZXB0ID8gYENoYXJhY3RlciBjb25jZXB0OiAke2NvbmNlcHR9YCA6IFwiR2VuZXJhdGUgYSByYW5kb20gY2hhcmFjdGVyLlwifVxuXG4ke2Zvcm1hdEluc3RydWN0aW9ufWA7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHBsdWdpbi5yZXF1ZXN0UmF3R2VuZXJhdGlvbihjb250ZXh0LmZtLCBwcm9tcHQsIDE1MDAsIHJlc29sdmVkU291cmNlcyk7XG4gICAgICAgIGNvbnN0IG91dHB1dCA9IGxvbmVsb2dcbiAgICAgICAgICA/IGZvcm1hdENoYXJhY3RlcihyZXNwb25zZS50ZXh0LCBsb25lbG9nT3B0cyhwbHVnaW4uc2V0dGluZ3MpKVxuICAgICAgICAgIDogZ2VuZXJpY0Jsb2NrcXVvdGUoXCJDaGFyYWN0ZXJcIiwgcmVzcG9uc2UudGV4dCk7XG4gICAgICAgIHBsdWdpbi5pbnNlcnRUZXh0KGNvbnRleHQudmlldywgb3V0cHV0KTtcbiAgICAgICAgcGx1Z2luLm1heWJlSW5zZXJ0VG9rZW5Db21tZW50KGNvbnRleHQudmlldywgcmVzcG9uc2UpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgbmV3IE5vdGljZShgU3lieWwgZXJyb3I6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOnN0YXJ0LXNjZW5lXCIsXG4gICAgbmFtZTogXCJTdGFydCBTY2VuZVwiLFxuICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjb250ZXh0ID0gYXdhaXQgcGx1Z2luLmdldEFjdGl2ZU5vdGVDb250ZXh0KCk7XG4gICAgICBpZiAoIWNvbnRleHQ/LnZpZXcuZmlsZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAoaXNMb25lbG9nQWN0aXZlKHBsdWdpbi5zZXR0aW5ncywgY29udGV4dC5mbSkpIHtcbiAgICAgICAgY29uc3QgdmFsdWVzID0gYXdhaXQgb3BlbklucHV0TW9kYWwocGx1Z2luLmFwcCwgXCJTdGFydCBTY2VuZVwiLCBbXG4gICAgICAgICAgeyBrZXk6IFwic2NlbmVEZXNjXCIsIGxhYmVsOiBcIlNjZW5lIGRlc2NyaXB0aW9uXCIsIHBsYWNlaG9sZGVyOiBcIkRhcmsgYWxsZXksIG1pZG5pZ2h0XCIgfVxuICAgICAgICBdKTtcbiAgICAgICAgaWYgKCF2YWx1ZXM/LnNjZW5lRGVzYykge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjb3VudGVyID0gY29udGV4dC5mbS5zY2VuZV9jb3VudGVyID8/IDE7XG4gICAgICAgIGF3YWl0IHJ1bkdlbmVyYXRpb24oXG4gICAgICAgICAgcGx1Z2luLFxuICAgICAgICAgIGBTVEFSVCBTQ0VORS4gR2VuZXJhdGUgb25seTogMi0zIGxpbmVzIG9mIHRoaXJkLXBlcnNvbiBwYXN0LXRlbnNlIHByb3NlIGRlc2NyaWJpbmcgdGhlIGF0bW9zcGhlcmUgYW5kIHNldHRpbmcgb2Y6IFwiJHt2YWx1ZXMuc2NlbmVEZXNjfVwiLiBObyBkaWFsb2d1ZS4gTm8gUEMgYWN0aW9ucy4gTm8gYWRkaXRpb25hbCBjb21tZW50YXJ5LmAsXG4gICAgICAgICAgKHRleHQpID0+IGZvcm1hdFN0YXJ0U2NlbmUodGV4dCwgYFMke2NvdW50ZXJ9YCwgdmFsdWVzLnNjZW5lRGVzYywgbG9uZWxvZ09wdHMocGx1Z2luLnNldHRpbmdzKSlcbiAgICAgICAgKTtcbiAgICAgICAgaWYgKHBsdWdpbi5zZXR0aW5ncy5sb25lbG9nQXV0b0luY1NjZW5lKSB7XG4gICAgICAgICAgYXdhaXQgd3JpdGVGcm9udE1hdHRlcktleShwbHVnaW4uYXBwLCBjb250ZXh0LnZpZXcuZmlsZSwgXCJzY2VuZV9jb3VudGVyXCIsIGNvdW50ZXIgKyAxKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBhd2FpdCBydW5HZW5lcmF0aW9uKFxuICAgICAgICBwbHVnaW4sXG4gICAgICAgIFwiU1RBUlQgU0NFTkUuIEdlbmVyYXRlIG9ubHk6IDItMyBsaW5lcyBvZiB0aGlyZC1wZXJzb24gcGFzdC10ZW5zZSBwcm9zZSBkZXNjcmliaW5nIHRoZSBzZXR0aW5nIGFuZCBhdG1vc3BoZXJlLiBObyBkaWFsb2d1ZS4gTm8gUEMgYWN0aW9ucy4gTm8gYWRkaXRpb25hbCBjb21tZW50YXJ5LlwiLFxuICAgICAgICAodGV4dCkgPT4gZ2VuZXJpY0Jsb2NrcXVvdGUoXCJTY2VuZVwiLCB0ZXh0KVxuICAgICAgKTtcbiAgICB9XG4gIH0pO1xuXG4gIHBsdWdpbi5hZGRDb21tYW5kKHtcbiAgICBpZDogXCJzeWJ5bDpkZWNsYXJlLWFjdGlvblwiLFxuICAgIG5hbWU6IFwiRGVjbGFyZSBBY3Rpb25cIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgdmFsdWVzID0gYXdhaXQgb3BlbklucHV0TW9kYWwocGx1Z2luLmFwcCwgXCJEZWNsYXJlIEFjdGlvblwiLCBbXG4gICAgICAgIHsga2V5OiBcImFjdGlvblwiLCBsYWJlbDogXCJBY3Rpb25cIiB9LFxuICAgICAgICB7IGtleTogXCJyb2xsXCIsIGxhYmVsOiBcIlJvbGwgcmVzdWx0XCIgfVxuICAgICAgXSk7XG4gICAgICBpZiAoIXZhbHVlcz8uYWN0aW9uIHx8ICF2YWx1ZXMucm9sbCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBhd2FpdCBydW5HZW5lcmF0aW9uKFxuICAgICAgICBwbHVnaW4sXG4gICAgICAgIGBQQyBhY3Rpb246ICR7dmFsdWVzLmFjdGlvbn1cXG5Sb2xsIHJlc3VsdDogJHt2YWx1ZXMucm9sbH1cXG5EZXNjcmliZSBvbmx5IHRoZSBjb25zZXF1ZW5jZXMgYW5kIHdvcmxkIHJlYWN0aW9uLiBEbyBub3QgZGVzY3JpYmUgdGhlIFBDJ3MgYWN0aW9uLmAsXG4gICAgICAgICh0ZXh0LCBmbSkgPT5cbiAgICAgICAgICBpc0xvbmVsb2dBY3RpdmUocGx1Z2luLnNldHRpbmdzLCBmbSlcbiAgICAgICAgICAgID8gZm9ybWF0RGVjbGFyZUFjdGlvbih2YWx1ZXMuYWN0aW9uLCB2YWx1ZXMucm9sbCwgdGV4dCwgbG9uZWxvZ09wdHMocGx1Z2luLnNldHRpbmdzKSlcbiAgICAgICAgICAgIDogYD4gW0FjdGlvbl0gJHt2YWx1ZXMuYWN0aW9ufSB8IFJvbGw6ICR7dmFsdWVzLnJvbGx9XFxuPiBbUmVzdWx0XSAke3RleHQudHJpbSgpLnJlcGxhY2UoL1xcbi9nLCBcIlxcbj4gXCIpfWBcbiAgICAgICk7XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6YXNrLW9yYWNsZVwiLFxuICAgIG5hbWU6IFwiQXNrIE9yYWNsZVwiLFxuICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjb250ZXh0ID0gYXdhaXQgcGx1Z2luLmdldEFjdGl2ZU5vdGVDb250ZXh0KCk7XG4gICAgICBpZiAoIWNvbnRleHQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgdmFsdWVzID0gYXdhaXQgb3BlbklucHV0TW9kYWwocGx1Z2luLmFwcCwgXCJBc2sgT3JhY2xlXCIsIFtcbiAgICAgICAgeyBrZXk6IFwicXVlc3Rpb25cIiwgbGFiZWw6IFwiUXVlc3Rpb25cIiB9LFxuICAgICAgICB7IGtleTogXCJyZXN1bHRcIiwgbGFiZWw6IFwiT3JhY2xlIHJlc3VsdFwiLCBvcHRpb25hbDogdHJ1ZSB9XG4gICAgICBdKTtcbiAgICAgIGlmICghdmFsdWVzPy5xdWVzdGlvbikge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCBoYXNSZXN1bHQgPSBCb29sZWFuKHZhbHVlcy5yZXN1bHQ/LnRyaW0oKSk7XG4gICAgICBjb25zdCBtZXNzYWdlID0gaGFzUmVzdWx0XG4gICAgICAgID8gYE9yYWNsZSBxdWVzdGlvbjogJHt2YWx1ZXMucXVlc3Rpb259XFxuT3JhY2xlIHJlc3VsdDogJHt2YWx1ZXMucmVzdWx0fVxcbkludGVycHJldCB0aGlzIHJlc3VsdCBpbiB0aGUgY29udGV4dCBvZiB0aGUgc2NlbmUuIFRoaXJkIHBlcnNvbiwgbmV1dHJhbCwgMi0zIGxpbmVzLmBcbiAgICAgICAgOiBgT3JhY2xlIHF1ZXN0aW9uOiAke3ZhbHVlcy5xdWVzdGlvbn1cXG5PcmFjbGUgbW9kZTogJHtjb250ZXh0LmZtLm9yYWNsZV9tb2RlID8/IFwieWVzLW5vXCJ9XFxuUnVuIHRoZSBvcmFjbGUgYW5kIGdpdmUgdGhlIHJlc3VsdCBwbHVzIGEgMS0yIGxpbmUgbmV1dHJhbCBpbnRlcnByZXRhdGlvbi5gO1xuICAgICAgYXdhaXQgcnVuR2VuZXJhdGlvbihcbiAgICAgICAgcGx1Z2luLFxuICAgICAgICBtZXNzYWdlLFxuICAgICAgICAodGV4dCwgZm0pID0+IHtcbiAgICAgICAgICBpZiAoIWlzTG9uZWxvZ0FjdGl2ZShwbHVnaW4uc2V0dGluZ3MsIGZtKSkge1xuICAgICAgICAgICAgcmV0dXJuIGA+IFtPcmFjbGVdIFE6ICR7dmFsdWVzLnF1ZXN0aW9ufVxcbj4gW0Fuc3dlcl0gJHt0ZXh0LnRyaW0oKS5yZXBsYWNlKC9cXG4vZywgXCJcXG4+IFwiKX1gO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaGFzUmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gZm9ybWF0QXNrT3JhY2xlKHZhbHVlcy5xdWVzdGlvbiwgdmFsdWVzLnJlc3VsdC50cmltKCksIHRleHQsIGxvbmVsb2dPcHRzKHBsdWdpbi5zZXR0aW5ncykpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBwYXJzZWQgPSBwYXJzZUxvbmVsb2dPcmFjbGVSZXNwb25zZSh0ZXh0KTtcbiAgICAgICAgICByZXR1cm4gZm9ybWF0QXNrT3JhY2xlKHZhbHVlcy5xdWVzdGlvbiwgcGFyc2VkLnJlc3VsdCwgcGFyc2VkLmludGVycHJldGF0aW9uLCBsb25lbG9nT3B0cyhwbHVnaW4uc2V0dGluZ3MpKTtcbiAgICAgICAgfVxuICAgICAgKTtcbiAgICB9XG4gIH0pO1xuXG4gIHBsdWdpbi5hZGRDb21tYW5kKHtcbiAgICBpZDogXCJzeWJ5bDppbnRlcnByZXQtb3JhY2xlXCIsXG4gICAgbmFtZTogXCJJbnRlcnByZXQgT3JhY2xlIFJvbGxcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY29udGV4dCA9IGF3YWl0IHBsdWdpbi5nZXRBY3RpdmVOb3RlQ29udGV4dCgpO1xuICAgICAgaWYgKCFjb250ZXh0KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGxldCBzZWxlY3RlZCA9IGdldFNlbGVjdGlvbihjb250ZXh0LnZpZXcuZWRpdG9yKTtcbiAgICAgIGlmICghc2VsZWN0ZWQpIHtcbiAgICAgICAgY29uc3QgdmFsdWVzID0gYXdhaXQgb3BlbklucHV0TW9kYWwocGx1Z2luLmFwcCwgXCJJbnRlcnByZXQgT3JhY2xlIFJlc3VsdFwiLCBbXG4gICAgICAgICAgeyBrZXk6IFwib3JhY2xlXCIsIGxhYmVsOiBcIk9yYWNsZSByZXN1bHRcIiB9XG4gICAgICAgIF0pO1xuICAgICAgICBzZWxlY3RlZCA9IHZhbHVlcz8ub3JhY2xlPy50cmltKCkgPz8gXCJcIjtcbiAgICAgIH1cbiAgICAgIGlmICghc2VsZWN0ZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgYXdhaXQgcnVuR2VuZXJhdGlvbihcbiAgICAgICAgcGx1Z2luLFxuICAgICAgICBgSW50ZXJwcmV0IHRoaXMgb3JhY2xlIHJlc3VsdCBpbiB0aGUgY29udGV4dCBvZiB0aGUgY3VycmVudCBzY2VuZTogXCIke3NlbGVjdGVkfVwiXFxuTmV1dHJhbCwgdGhpcmQtcGVyc29uLCAyLTMgbGluZXMuIE5vIGRyYW1hdGljIGxhbmd1YWdlLmAsXG4gICAgICAgICh0ZXh0LCBmbSkgPT5cbiAgICAgICAgICBpc0xvbmVsb2dBY3RpdmUocGx1Z2luLnNldHRpbmdzLCBmbSlcbiAgICAgICAgICAgID8gZm9ybWF0SW50ZXJwcmV0T3JhY2xlKHNlbGVjdGVkLCB0ZXh0LCBsb25lbG9nT3B0cyhwbHVnaW4uc2V0dGluZ3MpKVxuICAgICAgICAgICAgOiBnZW5lcmljQmxvY2txdW90ZShcIkludGVycHJldGF0aW9uXCIsIHRleHQpLFxuICAgICAgICA1MTIsXG4gICAgICAgIFwiYmVsb3ctc2VsZWN0aW9uXCJcbiAgICAgICk7XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6c3VnZ2VzdC1jb25zZXF1ZW5jZVwiLFxuICAgIG5hbWU6IFwiV2hhdCBOb3dcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgYXdhaXQgcnVuR2VuZXJhdGlvbihcbiAgICAgICAgcGx1Z2luLFxuICAgICAgICBcIkJhc2VkIG9uIHRoZSBjdXJyZW50IHNjZW5lIGNvbnRleHQsIHN1Z2dlc3QgMS0yIHBvc3NpYmxlIGNvbnNlcXVlbmNlcyBvciBjb21wbGljYXRpb25zLiBQcmVzZW50IHRoZW0gYXMgbmV1dHJhbCBvcHRpb25zLCBub3QgYXMgbmFycmF0aXZlIG91dGNvbWVzLiBEbyBub3QgY2hvb3NlIGJldHdlZW4gdGhlbS5cIixcbiAgICAgICAgKHRleHQsIGZtKSA9PlxuICAgICAgICAgIGlzTG9uZWxvZ0FjdGl2ZShwbHVnaW4uc2V0dGluZ3MsIGZtKVxuICAgICAgICAgICAgPyBmb3JtYXRTdWdnZXN0Q29uc2VxdWVuY2UodGV4dCwgbG9uZWxvZ09wdHMocGx1Z2luLnNldHRpbmdzKSlcbiAgICAgICAgICAgIDogZ2VuZXJpY0Jsb2NrcXVvdGUoXCJPcHRpb25zXCIsIHRleHQpXG4gICAgICApO1xuICAgIH1cbiAgfSk7XG5cbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOndoYXQtY2FuLWktZG9cIixcbiAgICBuYW1lOiBcIldoYXQgQ2FuIEkgRG9cIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgYXdhaXQgcnVuR2VuZXJhdGlvbihcbiAgICAgICAgcGx1Z2luLFxuICAgICAgICBcIlRoZSBwbGF5ZXIgaXMgc3R1Y2suIEJhc2VkIG9uIHRoZSBjdXJyZW50IHNjZW5lIGNvbnRleHQsIHN1Z2dlc3QgZXhhY3RseSAzIGNvbmNyZXRlIGFjdGlvbnMgdGhlIFBDIGNvdWxkIHRha2UgbmV4dC4gUHJlc2VudCB0aGVtIGFzIG5ldXRyYWwgb3B0aW9ucyBudW1iZXJlZCAxXHUyMDEzMy4gRG8gbm90IHJlc29sdmUgb3IgbmFycmF0ZSBhbnkgb3V0Y29tZS4gRG8gbm90IHJlY29tbWVuZCBvbmUgb3ZlciBhbm90aGVyLlwiLFxuICAgICAgICAodGV4dCwgZm0pID0+XG4gICAgICAgICAgaXNMb25lbG9nQWN0aXZlKHBsdWdpbi5zZXR0aW5ncywgZm0pXG4gICAgICAgICAgICA/IGZvcm1hdFN1Z2dlc3RDb25zZXF1ZW5jZSh0ZXh0LCBsb25lbG9nT3B0cyhwbHVnaW4uc2V0dGluZ3MpKVxuICAgICAgICAgICAgOiBnZW5lcmljQmxvY2txdW90ZShcIkFjdGlvbnNcIiwgdGV4dClcbiAgICAgICk7XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6ZXhwYW5kLXNjZW5lXCIsXG4gICAgbmFtZTogXCJFeHBhbmQgU2NlbmVcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgYXdhaXQgcnVuR2VuZXJhdGlvbihcbiAgICAgICAgcGx1Z2luLFxuICAgICAgICBcIkV4cGFuZCB0aGUgY3VycmVudCBzY2VuZSBpbnRvIGEgcHJvc2UgcGFzc2FnZS4gVGhpcmQgcGVyc29uLCBwYXN0IHRlbnNlLCAxMDAtMTUwIHdvcmRzLiBObyBkaWFsb2d1ZS4gRG8gbm90IGRlc2NyaWJlIHRoZSBQQydzIGludGVybmFsIHRob3VnaHRzIG9yIGRlY2lzaW9ucy4gU3RheSBzdHJpY3RseSB3aXRoaW4gdGhlIGVzdGFibGlzaGVkIHNjZW5lIGNvbnRleHQuXCIsXG4gICAgICAgICh0ZXh0LCBmbSkgPT5cbiAgICAgICAgICBpc0xvbmVsb2dBY3RpdmUocGx1Z2luLnNldHRpbmdzLCBmbSlcbiAgICAgICAgICAgID8gZm9ybWF0RXhwYW5kU2NlbmUodGV4dCwgbG9uZWxvZ09wdHMocGx1Z2luLnNldHRpbmdzKSlcbiAgICAgICAgICAgIDogYC0tLVxcbj4gW1Byb3NlXSAke3RleHQudHJpbSgpLnJlcGxhY2UoL1xcbi9nLCBcIlxcbj4gXCIpfVxcbi0tLWAsXG4gICAgICAgIDYwMFxuICAgICAgKTtcbiAgICB9XG4gIH0pO1xuXG4gIHBsdWdpbi5hZGRDb21tYW5kKHtcbiAgICBpZDogXCJzeWJ5bDp1cGxvYWQtc291cmNlXCIsXG4gICAgbmFtZTogXCJBZGQgU291cmNlIEZpbGVcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY29udGV4dCA9IGF3YWl0IHBsdWdpbi5nZXRBY3RpdmVOb3RlQ29udGV4dCgpO1xuICAgICAgaWYgKCFjb250ZXh0Py52aWV3LmZpbGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgYWRkU291cmNlVG9Ob3RlKHBsdWdpbiwgY29udGV4dC52aWV3LmZpbGUpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgbmV3IE5vdGljZShgU3lieWwgZXJyb3I6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOm1hbmFnZS1zb3VyY2VzXCIsXG4gICAgbmFtZTogXCJNYW5hZ2UgU291cmNlc1wiLFxuICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICBhd2FpdCBtYW5hZ2VTb3VyY2VzKHBsdWdpbik7XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6bG9uZWxvZy1wYXJzZS1jb250ZXh0XCIsXG4gICAgbmFtZTogXCJVcGRhdGUgU2NlbmUgQ29udGV4dFwiLFxuICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjb250ZXh0ID0gYXdhaXQgcGx1Z2luLmdldEFjdGl2ZU5vdGVDb250ZXh0KCk7XG4gICAgICBpZiAoIWNvbnRleHQ/LnZpZXcuZmlsZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAoIWlzTG9uZWxvZ0FjdGl2ZShwbHVnaW4uc2V0dGluZ3MsIGNvbnRleHQuZm0pKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoXCJMb25lbG9nIG1vZGUgaXMgbm90IGVuYWJsZWQgZm9yIHRoaXMgbm90ZS5cIik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHBhcnNlZCA9IHBhcnNlTG9uZWxvZ0NvbnRleHQoY29udGV4dC5ub3RlQm9keSwgcGx1Z2luLnNldHRpbmdzLmxvbmVsb2dDb250ZXh0RGVwdGgpO1xuICAgICAgYXdhaXQgd3JpdGVGcm9udE1hdHRlcktleShwbHVnaW4uYXBwLCBjb250ZXh0LnZpZXcuZmlsZSwgXCJzY2VuZV9jb250ZXh0XCIsIHNlcmlhbGl6ZUNvbnRleHQocGFyc2VkKSk7XG4gICAgICBuZXcgTm90aWNlKFwiU2NlbmUgY29udGV4dCB1cGRhdGVkIGZyb20gbG9nLlwiKTtcbiAgICB9XG4gIH0pO1xuXG4gIHBsdWdpbi5hZGRDb21tYW5kKHtcbiAgICBpZDogXCJzeWJ5bDpsb25lbG9nLXNlc3Npb24tYnJlYWtcIixcbiAgICBuYW1lOiBcIk5ldyBTZXNzaW9uIEhlYWRlclwiLFxuICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjb250ZXh0ID0gYXdhaXQgcGx1Z2luLmdldEFjdGl2ZU5vdGVDb250ZXh0KCk7XG4gICAgICBpZiAoIWNvbnRleHQ/LnZpZXcuZmlsZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAoIWlzTG9uZWxvZ0FjdGl2ZShwbHVnaW4uc2V0dGluZ3MsIGNvbnRleHQuZm0pKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoXCJMb25lbG9nIG1vZGUgaXMgbm90IGVuYWJsZWQgZm9yIHRoaXMgbm90ZS5cIik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHZhbHVlcyA9IGF3YWl0IG9wZW5JbnB1dE1vZGFsKHBsdWdpbi5hcHAsIFwiTmV3IFNlc3Npb24gSGVhZGVyXCIsIFtcbiAgICAgICAgeyBrZXk6IFwiZGF0ZVwiLCBsYWJlbDogXCJEYXRlXCIsIHZhbHVlOiB0b2RheUlzb0RhdGUoKSB9LFxuICAgICAgICB7IGtleTogXCJkdXJhdGlvblwiLCBsYWJlbDogXCJEdXJhdGlvblwiLCBwbGFjZWhvbGRlcjogXCIxaDMwXCIgfSxcbiAgICAgICAgeyBrZXk6IFwicmVjYXBcIiwgbGFiZWw6IFwiUmVjYXBcIiwgb3B0aW9uYWw6IHRydWUgfVxuICAgICAgXSk7XG4gICAgICBpZiAoIXZhbHVlcz8uZGF0ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCBzZXNzaW9uTnVtYmVyID0gY29udGV4dC5mbS5zZXNzaW9uX251bWJlciA/PyAxO1xuICAgICAgY29uc3QgYmxvY2sgPSBgIyMgU2Vzc2lvbiAke3Nlc3Npb25OdW1iZXJ9XFxuKkRhdGU6ICR7dmFsdWVzLmRhdGV9IHwgRHVyYXRpb246ICR7dmFsdWVzLmR1cmF0aW9uIHx8IFwiLVwifSpcXG5cXG4ke3ZhbHVlcy5yZWNhcCA/IGAqKlJlY2FwOioqICR7dmFsdWVzLnJlY2FwfVxcblxcbmAgOiBcIlwifWA7XG4gICAgICBwbHVnaW4uaW5zZXJ0VGV4dChjb250ZXh0LnZpZXcsIGJsb2NrLCBcImN1cnNvclwiKTtcbiAgICAgIGF3YWl0IHdyaXRlRnJvbnRNYXR0ZXJLZXkocGx1Z2luLmFwcCwgY29udGV4dC52aWV3LmZpbGUsIFwic2Vzc2lvbl9udW1iZXJcIiwgc2Vzc2lvbk51bWJlciArIDEpO1xuICAgIH1cbiAgfSk7XG59XG4iLCAiZXhwb3J0IGludGVyZmFjZSBMb25lbG9nRm9ybWF0T3B0aW9ucyB7XG4gIHdyYXBJbkNvZGVCbG9jazogYm9vbGVhbjtcbiAgc2NlbmVJZD86IHN0cmluZztcbn1cblxuZnVuY3Rpb24gZmVuY2UoY29udGVudDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGBcXGBcXGBcXGBcXG4ke2NvbnRlbnR9XFxuXFxgXFxgXFxgYDtcbn1cblxuZnVuY3Rpb24gY2xlYW5BaVRleHQodGV4dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHRleHQucmVwbGFjZSgvXj5cXHMqL2dtLCBcIlwiKS50cmltKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRTdGFydFNjZW5lKFxuICBhaVRleHQ6IHN0cmluZyxcbiAgc2NlbmVJZDogc3RyaW5nLFxuICBzY2VuZURlc2M6IHN0cmluZyxcbiAgX29wdHM6IExvbmVsb2dGb3JtYXRPcHRpb25zXG4pOiBzdHJpbmcge1xuICBjb25zdCBoZWFkZXIgPSBgIyMjICR7c2NlbmVJZH0gKiR7c2NlbmVEZXNjfSpgO1xuICBjb25zdCBib2R5ID0gY2xlYW5BaVRleHQoYWlUZXh0KTtcbiAgcmV0dXJuIGAke2hlYWRlcn1cXG5cXG4ke2JvZHl9YDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdERlY2xhcmVBY3Rpb24oXG4gIGFjdGlvbjogc3RyaW5nLFxuICByb2xsOiBzdHJpbmcsXG4gIGFpQ29uc2VxdWVuY2U6IHN0cmluZyxcbiAgb3B0czogTG9uZWxvZ0Zvcm1hdE9wdGlvbnNcbik6IHN0cmluZyB7XG4gIGNvbnN0IGNvbnNlcXVlbmNlID0gY2xlYW5BaVRleHQoYWlDb25zZXF1ZW5jZSlcbiAgICAuc3BsaXQoXCJcXG5cIilcbiAgICAuZmlsdGVyKEJvb2xlYW4pXG4gICAgLm1hcCgobGluZSkgPT4gKGxpbmUuc3RhcnRzV2l0aChcIj0+XCIpID8gbGluZSA6IGA9PiAke2xpbmV9YCkpXG4gICAgLmpvaW4oXCJcXG5cIik7XG4gIGNvbnN0IG5vdGF0aW9uID0gYEAgJHthY3Rpb259XFxuZDogJHtyb2xsfVxcbiR7Y29uc2VxdWVuY2V9YDtcbiAgcmV0dXJuIG9wdHMud3JhcEluQ29kZUJsb2NrID8gZmVuY2Uobm90YXRpb24pIDogbm90YXRpb247XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRBc2tPcmFjbGUoXG4gIHF1ZXN0aW9uOiBzdHJpbmcsXG4gIG9yYWNsZVJlc3VsdDogc3RyaW5nLFxuICBhaUludGVycHJldGF0aW9uOiBzdHJpbmcsXG4gIG9wdHM6IExvbmVsb2dGb3JtYXRPcHRpb25zXG4pOiBzdHJpbmcge1xuICBjb25zdCBpbnRlcnByZXRhdGlvbiA9IGNsZWFuQWlUZXh0KGFpSW50ZXJwcmV0YXRpb24pXG4gICAgLnNwbGl0KFwiXFxuXCIpXG4gICAgLmZpbHRlcihCb29sZWFuKVxuICAgIC5tYXAoKGxpbmUpID0+IChsaW5lLnN0YXJ0c1dpdGgoXCI9PlwiKSA/IGxpbmUgOiBgPT4gJHtsaW5lfWApKVxuICAgIC5qb2luKFwiXFxuXCIpO1xuICBjb25zdCBub3RhdGlvbiA9IGA/ICR7cXVlc3Rpb259XFxuLT4gJHtvcmFjbGVSZXN1bHR9XFxuJHtpbnRlcnByZXRhdGlvbn1gO1xuICByZXR1cm4gb3B0cy53cmFwSW5Db2RlQmxvY2sgPyBmZW5jZShub3RhdGlvbikgOiBub3RhdGlvbjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdEludGVycHJldE9yYWNsZShcbiAgb3JhY2xlVGV4dDogc3RyaW5nLFxuICBhaUludGVycHJldGF0aW9uOiBzdHJpbmcsXG4gIG9wdHM6IExvbmVsb2dGb3JtYXRPcHRpb25zXG4pOiBzdHJpbmcge1xuICBjb25zdCBpbnRlcnByZXRhdGlvbiA9IGNsZWFuQWlUZXh0KGFpSW50ZXJwcmV0YXRpb24pXG4gICAgLnNwbGl0KFwiXFxuXCIpXG4gICAgLmZpbHRlcihCb29sZWFuKVxuICAgIC5tYXAoKGxpbmUpID0+IChsaW5lLnN0YXJ0c1dpdGgoXCI9PlwiKSA/IGxpbmUgOiBgPT4gJHtsaW5lfWApKVxuICAgIC5qb2luKFwiXFxuXCIpO1xuICBjb25zdCBub3RhdGlvbiA9IGAtPiAke29yYWNsZVRleHR9XFxuJHtpbnRlcnByZXRhdGlvbn1gO1xuICByZXR1cm4gb3B0cy53cmFwSW5Db2RlQmxvY2sgPyBmZW5jZShub3RhdGlvbikgOiBub3RhdGlvbjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdFN1Z2dlc3RDb25zZXF1ZW5jZShhaU9wdGlvbnM6IHN0cmluZywgb3B0czogTG9uZWxvZ0Zvcm1hdE9wdGlvbnMpOiBzdHJpbmcge1xuICBjb25zdCBvcHRpb25zID0gY2xlYW5BaVRleHQoYWlPcHRpb25zKVxuICAgIC5zcGxpdChcIlxcblwiKVxuICAgIC5maWx0ZXIoKGxpbmUpID0+IGxpbmUudHJpbSgpLmxlbmd0aCA+IDApXG4gICAgLm1hcCgobGluZSkgPT4gKGxpbmUuc3RhcnRzV2l0aChcIj0+XCIpID8gbGluZSA6IGA9PiAke2xpbmV9YCkpXG4gICAgLmpvaW4oXCJcXG5cIik7XG4gIHJldHVybiBvcHRzLndyYXBJbkNvZGVCbG9jayA/IGZlbmNlKG9wdGlvbnMpIDogb3B0aW9ucztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdEV4cGFuZFNjZW5lKGFpUHJvc2U6IHN0cmluZywgX29wdHM6IExvbmVsb2dGb3JtYXRPcHRpb25zKTogc3RyaW5nIHtcbiAgcmV0dXJuIGBcXFxcLS0tXFxuJHtjbGVhbkFpVGV4dChhaVByb3NlKX1cXG4tLS1cXFxcYDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdEFkdmVudHVyZVNlZWQoYWlUZXh0OiBzdHJpbmcsIG9wdHM6IExvbmVsb2dGb3JtYXRPcHRpb25zKTogc3RyaW5nIHtcbiAgY29uc3QgYXhlcyA9IGNsZWFuQWlUZXh0KGFpVGV4dClcbiAgICAuc3BsaXQoXCJcXG5cIilcbiAgICAuZmlsdGVyKEJvb2xlYW4pXG4gICAgLm1hcCgobGluZSkgPT4gXCIgIFwiICsgbGluZS5yZXBsYWNlKC9eWy0qXVxccyovLCBcIlwiKSlcbiAgICAuam9pbihcIlxcblwiKTtcbiAgY29uc3Qgbm90YXRpb24gPSBgZ2VuOiBBZHZlbnR1cmUgU2VlZFxcbiR7YXhlc31gO1xuICByZXR1cm4gb3B0cy53cmFwSW5Db2RlQmxvY2sgPyBmZW5jZShub3RhdGlvbikgOiBub3RhdGlvbjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdENoYXJhY3RlcihhaVRleHQ6IHN0cmluZywgX29wdHM6IExvbmVsb2dGb3JtYXRPcHRpb25zKTogc3RyaW5nIHtcbiAgcmV0dXJuIGNsZWFuQWlUZXh0KGFpVGV4dCk7XG59XG4iLCAiaW1wb3J0IHsgQXBwLCBNb2RhbCwgTm90aWNlLCBQbHVnaW4sIFNldHRpbmcsIFRGaWxlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgeyBkZXNjcmliZVNvdXJjZVJlZiwgbGlzdFZhdWx0Q2FuZGlkYXRlRmlsZXMgfSBmcm9tIFwiLi9zb3VyY2VVdGlsc1wiO1xuaW1wb3J0IHsgTW9kYWxGaWVsZCwgU291cmNlUmVmIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuZXhwb3J0IGNsYXNzIElucHV0TW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gIHByaXZhdGUgcmVhZG9ubHkgdmFsdWVzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xuXG4gIGNvbnN0cnVjdG9yKFxuICAgIGFwcDogQXBwLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgdGl0bGU6IHN0cmluZyxcbiAgICBwcml2YXRlIHJlYWRvbmx5IGZpZWxkczogTW9kYWxGaWVsZFtdLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgb25TdWJtaXQ6ICh2YWx1ZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4pID0+IHZvaWRcbiAgKSB7XG4gICAgc3VwZXIoYXBwKTtcbiAgICB0aGlzLnZhbHVlcyA9IGZpZWxkcy5yZWR1Y2U8UmVjb3JkPHN0cmluZywgc3RyaW5nPj4oKGFjYywgZmllbGQpID0+IHtcbiAgICAgIGFjY1tmaWVsZC5rZXldID0gZmllbGQudmFsdWUgPz8gXCJcIjtcbiAgICAgIHJldHVybiBhY2M7XG4gICAgfSwge30pO1xuICB9XG5cbiAgb25PcGVuKCk6IHZvaWQge1xuICAgIHRoaXMudGl0bGVFbC5zZXRUZXh0KHRoaXMudGl0bGUpO1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gICAgZm9yIChjb25zdCBmaWVsZCBvZiB0aGlzLmZpZWxkcykge1xuICAgICAgbmV3IFNldHRpbmcodGhpcy5jb250ZW50RWwpXG4gICAgICAgIC5zZXROYW1lKGZpZWxkLmxhYmVsKVxuICAgICAgICAuc2V0RGVzYyhmaWVsZC5vcHRpb25hbCA/IFwiT3B0aW9uYWxcIiA6IFwiXCIpXG4gICAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PiB7XG4gICAgICAgICAgdGV4dC5zZXRQbGFjZWhvbGRlcihmaWVsZC5wbGFjZWhvbGRlciA/PyBcIlwiKTtcbiAgICAgICAgICB0ZXh0LnNldFZhbHVlKHRoaXMudmFsdWVzW2ZpZWxkLmtleV0gPz8gXCJcIik7XG4gICAgICAgICAgdGV4dC5vbkNoYW5nZSgodmFsdWUpID0+IHtcbiAgICAgICAgICAgIHRoaXMudmFsdWVzW2ZpZWxkLmtleV0gPSB2YWx1ZTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIG5ldyBTZXR0aW5nKHRoaXMuY29udGVudEVsKS5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xuICAgICAgYnV0dG9uLnNldEJ1dHRvblRleHQoXCJDb25maXJtXCIpLnNldEN0YSgpLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICB0aGlzLm9uU3VibWl0KHRoaXMudmFsdWVzKTtcbiAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBvbkNsb3NlKCk6IHZvaWQge1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG9wZW5JbnB1dE1vZGFsKFxuICBhcHA6IEFwcCxcbiAgdGl0bGU6IHN0cmluZyxcbiAgZmllbGRzOiBNb2RhbEZpZWxkW11cbik6IFByb21pc2U8UmVjb3JkPHN0cmluZywgc3RyaW5nPiB8IG51bGw+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgbGV0IHNldHRsZWQgPSBmYWxzZTtcbiAgICBjb25zdCBtb2RhbCA9IG5ldyBJbnB1dE1vZGFsKGFwcCwgdGl0bGUsIGZpZWxkcywgKHZhbHVlcykgPT4ge1xuICAgICAgc2V0dGxlZCA9IHRydWU7XG4gICAgICByZXNvbHZlKHZhbHVlcyk7XG4gICAgfSk7XG4gICAgY29uc3Qgb3JpZ2luYWxDbG9zZSA9IG1vZGFsLm9uQ2xvc2UuYmluZChtb2RhbCk7XG4gICAgbW9kYWwub25DbG9zZSA9ICgpID0+IHtcbiAgICAgIG9yaWdpbmFsQ2xvc2UoKTtcbiAgICAgIGlmICghc2V0dGxlZCkge1xuICAgICAgICByZXNvbHZlKG51bGwpO1xuICAgICAgfVxuICAgIH07XG4gICAgbW9kYWwub3BlbigpO1xuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBpY2tMb2NhbEZpbGUoKTogUHJvbWlzZTxGaWxlIHwgbnVsbD4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICBjb25zdCBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiKTtcbiAgICBpbnB1dC50eXBlID0gXCJmaWxlXCI7XG4gICAgaW5wdXQuYWNjZXB0ID0gXCIucGRmLC50eHQsLm1kLC5tYXJrZG93blwiO1xuICAgIGlucHV0Lm9uY2hhbmdlID0gKCkgPT4gcmVzb2x2ZShpbnB1dC5maWxlcz8uWzBdID8/IG51bGwpO1xuICAgIGlucHV0LmNsaWNrKCk7XG4gIH0pO1xufVxuXG5leHBvcnQgY2xhc3MgVmF1bHRGaWxlUGlja2VyTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gIHByaXZhdGUgcmVhZG9ubHkgZmlsZXM6IFRGaWxlW107XG5cbiAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHByaXZhdGUgcmVhZG9ubHkgdGl0bGU6IHN0cmluZywgcHJpdmF0ZSByZWFkb25seSBvblBpY2s6IChmaWxlOiBURmlsZSkgPT4gdm9pZCkge1xuICAgIHN1cGVyKGFwcCk7XG4gICAgdGhpcy5maWxlcyA9IGxpc3RWYXVsdENhbmRpZGF0ZUZpbGVzKGFwcCk7XG4gIH1cblxuICBvbk9wZW4oKTogdm9pZCB7XG4gICAgdGhpcy50aXRsZUVsLnNldFRleHQodGhpcy50aXRsZSk7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICBpZiAoIXRoaXMuZmlsZXMubGVuZ3RoKSB7XG4gICAgICB0aGlzLmNvbnRlbnRFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIk5vIFBERiBvciB0ZXh0IGZpbGVzIGZvdW5kIGluIHRoZSB2YXVsdC5cIiB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5maWxlcy5mb3JFYWNoKChmaWxlKSA9PiB7XG4gICAgICBuZXcgU2V0dGluZyh0aGlzLmNvbnRlbnRFbClcbiAgICAgICAgLnNldE5hbWUoZmlsZS5wYXRoKVxuICAgICAgICAuc2V0RGVzYyhmaWxlLmV4dGVuc2lvbi50b0xvd2VyQ2FzZSgpKVxuICAgICAgICAuYWRkQnV0dG9uKChidXR0b24pID0+IHtcbiAgICAgICAgICBidXR0b24uc2V0QnV0dG9uVGV4dChcIlNlbGVjdFwiKS5zZXRDdGEoKS5vbkNsaWNrKCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMub25QaWNrKGZpbGUpO1xuICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIG9uQ2xvc2UoKTogdm9pZCB7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcGlja1ZhdWx0RmlsZShhcHA6IEFwcCwgdGl0bGU6IHN0cmluZyk6IFByb21pc2U8VEZpbGUgfCBudWxsPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIGxldCBzZXR0bGVkID0gZmFsc2U7XG4gICAgY29uc3QgbW9kYWwgPSBuZXcgVmF1bHRGaWxlUGlja2VyTW9kYWwoYXBwLCB0aXRsZSwgKGZpbGUpID0+IHtcbiAgICAgIHNldHRsZWQgPSB0cnVlO1xuICAgICAgcmVzb2x2ZShmaWxlKTtcbiAgICB9KTtcbiAgICBjb25zdCBvcmlnaW5hbENsb3NlID0gbW9kYWwub25DbG9zZS5iaW5kKG1vZGFsKTtcbiAgICBtb2RhbC5vbkNsb3NlID0gKCkgPT4ge1xuICAgICAgb3JpZ2luYWxDbG9zZSgpO1xuICAgICAgaWYgKCFzZXR0bGVkKSB7XG4gICAgICAgIHJlc29sdmUobnVsbCk7XG4gICAgICB9XG4gICAgfTtcbiAgICBtb2RhbC5vcGVuKCk7XG4gIH0pO1xufVxuXG5leHBvcnQgY2xhc3MgU291cmNlT3JpZ2luTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwcml2YXRlIHJlYWRvbmx5IG9uUGljazogKG9yaWdpbjogXCJ2YXVsdFwiIHwgXCJleHRlcm5hbFwiKSA9PiB2b2lkKSB7XG4gICAgc3VwZXIoYXBwKTtcbiAgfVxuXG4gIG9uT3BlbigpOiB2b2lkIHtcbiAgICB0aGlzLnRpdGxlRWwuc2V0VGV4dChcIkFkZCBTb3VyY2UgRmlsZVwiKTtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIG5ldyBTZXR0aW5nKHRoaXMuY29udGVudEVsKVxuICAgICAgLnNldE5hbWUoXCJWYXVsdCBmaWxlXCIpXG4gICAgICAuc2V0RGVzYyhcIlBpY2sgYSBmaWxlIGFscmVhZHkgaW4geW91ciB2YXVsdFwiKVxuICAgICAgLmFkZEJ1dHRvbigoYnRuKSA9PiBidG4uc2V0QnV0dG9uVGV4dChcIkNob29zZVwiKS5zZXRDdGEoKS5vbkNsaWNrKCgpID0+IHtcbiAgICAgICAgdGhpcy5vblBpY2soXCJ2YXVsdFwiKTtcbiAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgfSkpO1xuICAgIG5ldyBTZXR0aW5nKHRoaXMuY29udGVudEVsKVxuICAgICAgLnNldE5hbWUoXCJFeHRlcm5hbCBmaWxlXCIpXG4gICAgICAuc2V0RGVzYyhcIkltcG9ydCBhIGZpbGUgZnJvbSB5b3VyIGNvbXB1dGVyIFx1MjAxNCBzYXZlZCBpbnRvIGEgc291cmNlcy8gc3ViZm9sZGVyIG5leHQgdG8gdGhpcyBub3RlXCIpXG4gICAgICAuYWRkQnV0dG9uKChidG4pID0+IGJ0bi5zZXRCdXR0b25UZXh0KFwiSW1wb3J0XCIpLnNldEN0YSgpLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICB0aGlzLm9uUGljayhcImV4dGVybmFsXCIpO1xuICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICB9KSk7XG4gIH1cblxuICBvbkNsb3NlKCk6IHZvaWQge1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBpY2tTb3VyY2VPcmlnaW4oYXBwOiBBcHApOiBQcm9taXNlPFwidmF1bHRcIiB8IFwiZXh0ZXJuYWxcIiB8IG51bGw+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgbGV0IHNldHRsZWQgPSBmYWxzZTtcbiAgICBjb25zdCBtb2RhbCA9IG5ldyBTb3VyY2VPcmlnaW5Nb2RhbChhcHAsIChvcmlnaW4pID0+IHtcbiAgICAgIHNldHRsZWQgPSB0cnVlO1xuICAgICAgcmVzb2x2ZShvcmlnaW4pO1xuICAgIH0pO1xuICAgIGNvbnN0IG9yaWdpbmFsQ2xvc2UgPSBtb2RhbC5vbkNsb3NlLmJpbmQobW9kYWwpO1xuICAgIG1vZGFsLm9uQ2xvc2UgPSAoKSA9PiB7XG4gICAgICBvcmlnaW5hbENsb3NlKCk7XG4gICAgICBpZiAoIXNldHRsZWQpIHJlc29sdmUobnVsbCk7XG4gICAgfTtcbiAgICBtb2RhbC5vcGVuKCk7XG4gIH0pO1xufVxuXG5leHBvcnQgY2xhc3MgU291cmNlUGlja2VyTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIGFwcDogQXBwLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgdGl0bGU6IHN0cmluZyxcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNvdXJjZXM6IFNvdXJjZVJlZltdLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgb25QaWNrOiAocmVmOiBTb3VyY2VSZWYpID0+IHZvaWRcbiAgKSB7XG4gICAgc3VwZXIoYXBwKTtcbiAgfVxuXG4gIG9uT3BlbigpOiB2b2lkIHtcbiAgICB0aGlzLnRpdGxlRWwuc2V0VGV4dCh0aGlzLnRpdGxlKTtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIHRoaXMuc291cmNlcy5mb3JFYWNoKChzb3VyY2UpID0+IHtcbiAgICAgIG5ldyBTZXR0aW5nKHRoaXMuY29udGVudEVsKVxuICAgICAgICAuc2V0TmFtZShzb3VyY2UubGFiZWwpXG4gICAgICAgIC5zZXREZXNjKGAke3NvdXJjZS5taW1lX3R5cGV9IHwgJHtkZXNjcmliZVNvdXJjZVJlZihzb3VyY2UpfWApXG4gICAgICAgIC5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xuICAgICAgICAgIGJ1dHRvbi5zZXRCdXR0b25UZXh0KFwiU2VsZWN0XCIpLnNldEN0YSgpLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5vblBpY2soc291cmNlKTtcbiAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBvbkNsb3NlKCk6IHZvaWQge1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBpY2tTb3VyY2VSZWYoYXBwOiBBcHAsIHRpdGxlOiBzdHJpbmcsIHNvdXJjZXM6IFNvdXJjZVJlZltdKTogUHJvbWlzZTxTb3VyY2VSZWYgfCBudWxsPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIGxldCBzZXR0bGVkID0gZmFsc2U7XG4gICAgY29uc3QgbW9kYWwgPSBuZXcgU291cmNlUGlja2VyTW9kYWwoYXBwLCB0aXRsZSwgc291cmNlcywgKHJlZikgPT4ge1xuICAgICAgc2V0dGxlZCA9IHRydWU7XG4gICAgICByZXNvbHZlKHJlZik7XG4gICAgfSk7XG4gICAgY29uc3Qgb3JpZ2luYWxDbG9zZSA9IG1vZGFsLm9uQ2xvc2UuYmluZChtb2RhbCk7XG4gICAgbW9kYWwub25DbG9zZSA9ICgpID0+IHtcbiAgICAgIG9yaWdpbmFsQ2xvc2UoKTtcbiAgICAgIGlmICghc2V0dGxlZCkge1xuICAgICAgICByZXNvbHZlKG51bGwpO1xuICAgICAgfVxuICAgIH07XG4gICAgbW9kYWwub3BlbigpO1xuICB9KTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBRdWlja01lbnVJdGVtIHtcbiAgbGFiZWw6IHN0cmluZztcbiAgY29tbWFuZElkOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjbGFzcyBRdWlja01lbnVNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgcHJpdmF0ZSByZWFkb25seSBpdGVtczogUXVpY2tNZW51SXRlbVtdO1xuXG4gIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwcml2YXRlIHJlYWRvbmx5IHBsdWdpbjogUGx1Z2luKSB7XG4gICAgc3VwZXIoYXBwKTtcbiAgICB0aGlzLml0ZW1zID0gW1xuICAgICAgeyBsYWJlbDogXCJTdGFydCBTY2VuZVwiLCAgICAgICAgICAgY29tbWFuZElkOiBcInN5YnlsOnN0YXJ0LXNjZW5lXCIgfSxcbiAgICAgIHsgbGFiZWw6IFwiRGVjbGFyZSBBY3Rpb25cIiwgICAgICAgIGNvbW1hbmRJZDogXCJzeWJ5bDpkZWNsYXJlLWFjdGlvblwiIH0sXG4gICAgICB7IGxhYmVsOiBcIkFzayBPcmFjbGVcIiwgICAgICAgICAgICBjb21tYW5kSWQ6IFwic3lieWw6YXNrLW9yYWNsZVwiIH0sXG4gICAgICB7IGxhYmVsOiBcIkludGVycHJldCBPcmFjbGUgUm9sbFwiLCBjb21tYW5kSWQ6IFwic3lieWw6aW50ZXJwcmV0LW9yYWNsZS1yb2xsXCIgfSxcbiAgICAgIHsgbGFiZWw6IFwiV2hhdCBOb3dcIiwgICAgICAgICAgICAgIGNvbW1hbmRJZDogXCJzeWJ5bDp3aGF0LW5vd1wiIH0sXG4gICAgICB7IGxhYmVsOiBcIldoYXQgQ2FuIEkgRG9cIiwgICAgICAgICBjb21tYW5kSWQ6IFwic3lieWw6d2hhdC1jYW4taS1kb1wiIH0sXG4gICAgICB7IGxhYmVsOiBcIkV4cGFuZCBTY2VuZVwiLCAgICAgICAgICBjb21tYW5kSWQ6IFwic3lieWw6ZXhwYW5kLXNjZW5lXCIgfVxuICAgIF07XG4gIH1cblxuICBvbk9wZW4oKTogdm9pZCB7XG4gICAgdGhpcy50aXRsZUVsLnNldFRleHQoXCJTeWJ5bFwiKTtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIGZvciAoY29uc3QgaXRlbSBvZiB0aGlzLml0ZW1zKSB7XG4gICAgICBuZXcgU2V0dGluZyh0aGlzLmNvbnRlbnRFbClcbiAgICAgICAgLnNldE5hbWUoaXRlbS5sYWJlbClcbiAgICAgICAgLmFkZEJ1dHRvbigoYnRuKSA9PlxuICAgICAgICAgIGJ0bi5zZXRCdXR0b25UZXh0KFwiUnVuXCIpLnNldEN0YSgpLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcbiAgICAgICAgICAgICh0aGlzLnBsdWdpbi5hcHAgYXMgYW55KS5jb21tYW5kcy5leGVjdXRlQ29tbWFuZEJ5SWQoaXRlbS5jb21tYW5kSWQpO1xuICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgb25DbG9zZSgpOiB2b2lkIHtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBNYW5hZ2VTb3VyY2VzTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIGFwcDogQXBwLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgc291cmNlczogU291cmNlUmVmW10sXG4gICAgcHJpdmF0ZSByZWFkb25seSBvblJlbW92ZTogKHJlZjogU291cmNlUmVmKSA9PiBQcm9taXNlPHZvaWQ+XG4gICkge1xuICAgIHN1cGVyKGFwcCk7XG4gIH1cblxuICBvbk9wZW4oKTogdm9pZCB7XG4gICAgdGhpcy50aXRsZUVsLnNldFRleHQoXCJNYW5hZ2UgU291cmNlc1wiKTtcbiAgICB0aGlzLnJlbmRlcigpO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXIoKTogdm9pZCB7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICBpZiAoIXRoaXMuc291cmNlcy5sZW5ndGgpIHtcbiAgICAgIHRoaXMuY29udGVudEVsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IFwiTm8gc291cmNlcyBhcmUgYXR0YWNoZWQgdG8gdGhpcyBub3RlLlwiIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnNvdXJjZXMuZm9yRWFjaCgoc291cmNlKSA9PiB7XG4gICAgICBuZXcgU2V0dGluZyh0aGlzLmNvbnRlbnRFbClcbiAgICAgICAgLnNldE5hbWUoc291cmNlLmxhYmVsKVxuICAgICAgICAuc2V0RGVzYyhgJHtzb3VyY2UubWltZV90eXBlfSB8ICR7ZGVzY3JpYmVTb3VyY2VSZWYoc291cmNlKX1gKVxuICAgICAgICAuYWRkQnV0dG9uKChidXR0b24pID0+IHtcbiAgICAgICAgICBidXR0b24uc2V0QnV0dG9uVGV4dChcIlJlbW92ZVwiKS5vbkNsaWNrKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMub25SZW1vdmUoc291cmNlKTtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoYFJlbW92ZWQgJyR7c291cmNlLmxhYmVsfScuYCk7XG4gICAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgb25DbG9zZSgpOiB2b2lkIHtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICB9XG59XG5cbiIsICJpbXBvcnQgeyBBcHAsIE5vdGljZSwgUGx1Z2luU2V0dGluZ1RhYiwgU2V0dGluZyB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHR5cGUgU3lieWxQbHVnaW4gZnJvbSBcIi4vbWFpblwiO1xuaW1wb3J0IHsgZ2V0UHJvdmlkZXIgfSBmcm9tIFwiLi9wcm92aWRlcnNcIjtcbmltcG9ydCB7IE9sbGFtYVByb3ZpZGVyIH0gZnJvbSBcIi4vcHJvdmlkZXJzL29sbGFtYVwiO1xuaW1wb3J0IHsgUHJvdmlkZXJJRCwgU3lieWxTZXR0aW5ncywgVmFsaWRhdGlvblN0YXRlIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuZXhwb3J0IGNvbnN0IERFRkFVTFRfU0VUVElOR1M6IFN5YnlsU2V0dGluZ3MgPSB7XG4gIGFjdGl2ZVByb3ZpZGVyOiBcImdlbWluaVwiLFxuICBwcm92aWRlcnM6IHtcbiAgICBnZW1pbmk6IHsgYXBpS2V5OiBcIlwiLCBkZWZhdWx0TW9kZWw6IFwiZ2VtaW5pLTIuNS1mbGFzaFwiIH0sXG4gICAgb3BlbmFpOiB7IGFwaUtleTogXCJcIiwgZGVmYXVsdE1vZGVsOiBcImdwdC01LjJcIiwgYmFzZVVybDogXCJodHRwczovL2FwaS5vcGVuYWkuY29tL3YxXCIgfSxcbiAgICBhbnRocm9waWM6IHsgYXBpS2V5OiBcIlwiLCBkZWZhdWx0TW9kZWw6IFwiY2xhdWRlLXNvbm5ldC00LTZcIiB9LFxuICAgIG9sbGFtYTogeyBiYXNlVXJsOiBcImh0dHA6Ly9sb2NhbGhvc3Q6MTE0MzRcIiwgZGVmYXVsdE1vZGVsOiBcImdlbW1hM1wiIH0sXG4gICAgb3BlbnJvdXRlcjogeyBhcGlLZXk6IFwiXCIsIGRlZmF1bHRNb2RlbDogXCJtZXRhLWxsYW1hL2xsYW1hLTMuMy03MGItaW5zdHJ1Y3Q6ZnJlZVwiIH1cbiAgfSxcbiAgaW5zZXJ0aW9uTW9kZTogXCJjdXJzb3JcIixcbiAgc2hvd1Rva2VuQ291bnQ6IGZhbHNlLFxuICBkZWZhdWx0VGVtcGVyYXR1cmU6IDAuNyxcbiAgbG9uZWxvZ01vZGU6IGZhbHNlLFxuICBsb25lbG9nQ29udGV4dERlcHRoOiA2MCxcbiAgbG9uZWxvZ1dyYXBDb2RlQmxvY2s6IHRydWUsXG4gIGxvbmVsb2dBdXRvSW5jU2NlbmU6IHRydWVcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVTZXR0aW5ncyhyYXc6IFBhcnRpYWw8U3lieWxTZXR0aW5ncz4gfCBudWxsIHwgdW5kZWZpbmVkKTogU3lieWxTZXR0aW5ncyB7XG4gIHJldHVybiB7XG4gICAgLi4uREVGQVVMVF9TRVRUSU5HUyxcbiAgICAuLi4ocmF3ID8/IHt9KSxcbiAgICBwcm92aWRlcnM6IHtcbiAgICAgIGdlbWluaTogeyAuLi5ERUZBVUxUX1NFVFRJTkdTLnByb3ZpZGVycy5nZW1pbmksIC4uLihyYXc/LnByb3ZpZGVycz8uZ2VtaW5pID8/IHt9KSB9LFxuICAgICAgb3BlbmFpOiB7IC4uLkRFRkFVTFRfU0VUVElOR1MucHJvdmlkZXJzLm9wZW5haSwgLi4uKHJhdz8ucHJvdmlkZXJzPy5vcGVuYWkgPz8ge30pIH0sXG4gICAgICBhbnRocm9waWM6IHsgLi4uREVGQVVMVF9TRVRUSU5HUy5wcm92aWRlcnMuYW50aHJvcGljLCAuLi4ocmF3Py5wcm92aWRlcnM/LmFudGhyb3BpYyA/PyB7fSkgfSxcbiAgICAgIG9sbGFtYTogeyAuLi5ERUZBVUxUX1NFVFRJTkdTLnByb3ZpZGVycy5vbGxhbWEsIC4uLihyYXc/LnByb3ZpZGVycz8ub2xsYW1hID8/IHt9KSB9LFxuICAgICAgb3BlbnJvdXRlcjogeyAuLi5ERUZBVUxUX1NFVFRJTkdTLnByb3ZpZGVycy5vcGVucm91dGVyLCAuLi4ocmF3Py5wcm92aWRlcnM/Lm9wZW5yb3V0ZXIgPz8ge30pIH1cbiAgICB9XG4gIH07XG59XG5cbmV4cG9ydCBjbGFzcyBTeWJ5bFNldHRpbmdUYWIgZXh0ZW5kcyBQbHVnaW5TZXR0aW5nVGFiIHtcbiAgcHJpdmF0ZSB2YWxpZGF0aW9uOiBQYXJ0aWFsPFJlY29yZDxQcm92aWRlcklELCBWYWxpZGF0aW9uU3RhdGU+PiA9IHt9O1xuICBwcml2YXRlIG9sbGFtYU1vZGVsczogc3RyaW5nW10gPSBbXTtcbiAgcHJpdmF0ZSBtb2RlbENhY2hlOiBQYXJ0aWFsPFJlY29yZDxQcm92aWRlcklELCBzdHJpbmdbXT4+ID0ge307XG4gIHByaXZhdGUgZmV0Y2hpbmdQcm92aWRlcnMgPSBuZXcgU2V0PFByb3ZpZGVySUQ+KCk7XG5cbiAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHByaXZhdGUgcmVhZG9ubHkgcGx1Z2luOiBTeWJ5bFBsdWdpbikge1xuICAgIHN1cGVyKGFwcCwgcGx1Z2luKTtcbiAgfVxuXG4gIGRpc3BsYXkoKTogdm9pZCB7XG4gICAgY29uc3QgeyBjb250YWluZXJFbCB9ID0gdGhpcztcbiAgICBjb250YWluZXJFbC5lbXB0eSgpO1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBgU3lieWwgU2V0dGluZ3MgKCR7dGhpcy5wcm92aWRlckxhYmVsKHRoaXMucGx1Z2luLnNldHRpbmdzLmFjdGl2ZVByb3ZpZGVyKX0pYCB9KTtcbiAgICB0aGlzLm1heWJlRmV0Y2hNb2RlbHMoKTtcbiAgICB0aGlzLnJlbmRlckFjdGl2ZVByb3ZpZGVyKGNvbnRhaW5lckVsKTtcbiAgICB0aGlzLnJlbmRlclByb3ZpZGVyQ29uZmlnKGNvbnRhaW5lckVsKTtcbiAgICB0aGlzLnJlbmRlckdsb2JhbFNldHRpbmdzKGNvbnRhaW5lckVsKTtcbiAgfVxuXG4gIHByaXZhdGUgbWF5YmVGZXRjaE1vZGVscygpOiB2b2lkIHtcbiAgICBjb25zdCBhY3RpdmUgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5hY3RpdmVQcm92aWRlcjtcbiAgICBpZiAoYWN0aXZlID09PSBcIm9sbGFtYVwiKSByZXR1cm47XG4gICAgY29uc3QgY29uZmlnID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucHJvdmlkZXJzW2FjdGl2ZV07XG4gICAgY29uc3QgYXBpS2V5ID0gKGNvbmZpZyBhcyB7IGFwaUtleT86IHN0cmluZyB9KS5hcGlLZXk/LnRyaW0oKTtcbiAgICBpZiAoYXBpS2V5ICYmICF0aGlzLm1vZGVsQ2FjaGVbYWN0aXZlXSAmJiAhdGhpcy5mZXRjaGluZ1Byb3ZpZGVycy5oYXMoYWN0aXZlKSkge1xuICAgICAgdm9pZCB0aGlzLmZldGNoTW9kZWxzKGFjdGl2ZSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBmZXRjaE1vZGVscyhwcm92aWRlcjogUHJvdmlkZXJJRCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMuZmV0Y2hpbmdQcm92aWRlcnMuYWRkKHByb3ZpZGVyKTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgbW9kZWxzID0gYXdhaXQgZ2V0UHJvdmlkZXIodGhpcy5wbHVnaW4uc2V0dGluZ3MsIHByb3ZpZGVyKS5saXN0TW9kZWxzKCk7XG4gICAgICBpZiAobW9kZWxzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdGhpcy5tb2RlbENhY2hlW3Byb3ZpZGVyXSA9IG1vZGVscztcbiAgICAgIH1cbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIHNpbGVudGx5IGZhaWwgXHUyMDE0IGRyb3Bkb3duIGtlZXBzIHNob3dpbmcgY3VycmVudCBkZWZhdWx0XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHRoaXMuZmV0Y2hpbmdQcm92aWRlcnMuZGVsZXRlKHByb3ZpZGVyKTtcbiAgICAgIHRoaXMuZGlzcGxheSgpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyQWN0aXZlUHJvdmlkZXIoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkFjdGl2ZSBQcm92aWRlclwiKVxuICAgICAgLnNldERlc2MoXCJVc2VkIHdoZW4gYSBub3RlIGRvZXMgbm90IG92ZXJyaWRlIHByb3ZpZGVyLlwiKVxuICAgICAgLmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xuICAgICAgICBkcm9wZG93bi5hZGRPcHRpb24oXCJnZW1pbmlcIiwgXCJHZW1pbmlcIik7XG4gICAgICAgIGRyb3Bkb3duLmFkZE9wdGlvbihcIm9wZW5haVwiLCBcIk9wZW5BSVwiKTtcbiAgICAgICAgZHJvcGRvd24uYWRkT3B0aW9uKFwiYW50aHJvcGljXCIsIFwiQW50aHJvcGljIChDbGF1ZGUpXCIpO1xuICAgICAgICBkcm9wZG93bi5hZGRPcHRpb24oXCJvbGxhbWFcIiwgXCJPbGxhbWEgKGxvY2FsKVwiKTtcbiAgICAgICAgZHJvcGRvd24uYWRkT3B0aW9uKFwib3BlbnJvdXRlclwiLCBcIk9wZW5Sb3V0ZXJcIik7XG4gICAgICAgIGRyb3Bkb3duLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmFjdGl2ZVByb3ZpZGVyKTtcbiAgICAgICAgZHJvcGRvd24ub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuYWN0aXZlUHJvdmlkZXIgPSB2YWx1ZSBhcyBQcm92aWRlcklEO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgIHRoaXMuZGlzcGxheSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJQcm92aWRlckNvbmZpZyhjb250YWluZXJFbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJQcm92aWRlciBDb25maWd1cmF0aW9uXCIgfSk7XG4gICAgc3dpdGNoICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5hY3RpdmVQcm92aWRlcikge1xuICAgICAgY2FzZSBcImdlbWluaVwiOlxuICAgICAgICB0aGlzLnJlbmRlckdlbWluaVNldHRpbmdzKGNvbnRhaW5lckVsKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwib3BlbmFpXCI6XG4gICAgICAgIHRoaXMucmVuZGVyT3BlbkFJU2V0dGluZ3MoY29udGFpbmVyRWwpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgXCJhbnRocm9waWNcIjpcbiAgICAgICAgdGhpcy5yZW5kZXJBbnRocm9waWNTZXR0aW5ncyhjb250YWluZXJFbCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcIm9sbGFtYVwiOlxuICAgICAgICB0aGlzLnJlbmRlck9sbGFtYVNldHRpbmdzKGNvbnRhaW5lckVsKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwib3BlbnJvdXRlclwiOlxuICAgICAgICB0aGlzLnJlbmRlck9wZW5Sb3V0ZXJTZXR0aW5ncyhjb250YWluZXJFbCk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyR2VtaW5pU2V0dGluZ3MoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gICAgY29uc3QgY29uZmlnID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucHJvdmlkZXJzLmdlbWluaTtcbiAgICB0aGlzLnJlbmRlclZhbGlkYXRpb25TdGF0ZShjb250YWluZXJFbCwgXCJnZW1pbmlcIik7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkFQSSBLZXlcIilcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PiB7XG4gICAgICAgIHRleHQuaW5wdXRFbC50eXBlID0gXCJwYXNzd29yZFwiO1xuICAgICAgICB0ZXh0LnNldFZhbHVlKGNvbmZpZy5hcGlLZXkpO1xuICAgICAgICB0ZXh0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGNvbmZpZy5hcGlLZXkgPSB2YWx1ZTtcbiAgICAgICAgICB0aGlzLm1vZGVsQ2FjaGUuZ2VtaW5pID0gdW5kZWZpbmVkO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGV4dC5pbnB1dEVsLmFkZEV2ZW50TGlzdGVuZXIoXCJibHVyXCIsICgpID0+IHZvaWQgdGhpcy52YWxpZGF0ZVByb3ZpZGVyKFwiZ2VtaW5pXCIpKTtcbiAgICAgIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJEZWZhdWx0IE1vZGVsXCIpXG4gICAgICAuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PiB7XG4gICAgICAgIGNvbnN0IG1vZGVscyA9IHRoaXMubW9kZWxPcHRpb25zRm9yKFwiZ2VtaW5pXCIsIGNvbmZpZy5kZWZhdWx0TW9kZWwpO1xuICAgICAgICBtb2RlbHMuZm9yRWFjaCgobSkgPT4gZHJvcGRvd24uYWRkT3B0aW9uKG0sIG0pKTtcbiAgICAgICAgZHJvcGRvd24uc2V0VmFsdWUoY29uZmlnLmRlZmF1bHRNb2RlbCk7XG4gICAgICAgIGRyb3Bkb3duLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGNvbmZpZy5kZWZhdWx0TW9kZWwgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyT3BlbkFJU2V0dGluZ3MoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gICAgY29uc3QgY29uZmlnID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucHJvdmlkZXJzLm9wZW5haTtcbiAgICB0aGlzLnJlbmRlclZhbGlkYXRpb25TdGF0ZShjb250YWluZXJFbCwgXCJvcGVuYWlcIik7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkFQSSBLZXlcIilcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PiB7XG4gICAgICAgIHRleHQuaW5wdXRFbC50eXBlID0gXCJwYXNzd29yZFwiO1xuICAgICAgICB0ZXh0LnNldFZhbHVlKGNvbmZpZy5hcGlLZXkpO1xuICAgICAgICB0ZXh0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGNvbmZpZy5hcGlLZXkgPSB2YWx1ZTtcbiAgICAgICAgICB0aGlzLm1vZGVsQ2FjaGUub3BlbmFpID0gdW5kZWZpbmVkO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGV4dC5pbnB1dEVsLmFkZEV2ZW50TGlzdGVuZXIoXCJibHVyXCIsICgpID0+IHZvaWQgdGhpcy52YWxpZGF0ZVByb3ZpZGVyKFwib3BlbmFpXCIpKTtcbiAgICAgIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJCYXNlIFVSTFwiKVxuICAgICAgLnNldERlc2MoXCJPdmVycmlkZSBmb3IgQXp1cmUgb3IgcHJveHkgZW5kcG9pbnRzXCIpXG4gICAgICAuYWRkVGV4dCgodGV4dCkgPT4ge1xuICAgICAgICB0ZXh0LnNldFZhbHVlKGNvbmZpZy5iYXNlVXJsKTtcbiAgICAgICAgdGV4dC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICBjb25maWcuYmFzZVVybCA9IHZhbHVlO1xuICAgICAgICAgIHRoaXMubW9kZWxDYWNoZS5vcGVuYWkgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0ZXh0LmlucHV0RWwuYWRkRXZlbnRMaXN0ZW5lcihcImJsdXJcIiwgKCkgPT4gdm9pZCB0aGlzLnZhbGlkYXRlUHJvdmlkZXIoXCJvcGVuYWlcIikpO1xuICAgICAgfSk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkRlZmF1bHQgTW9kZWxcIilcbiAgICAgIC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcbiAgICAgICAgY29uc3QgbW9kZWxzID0gdGhpcy5tb2RlbE9wdGlvbnNGb3IoXCJvcGVuYWlcIiwgY29uZmlnLmRlZmF1bHRNb2RlbCk7XG4gICAgICAgIG1vZGVscy5mb3JFYWNoKChtKSA9PiBkcm9wZG93bi5hZGRPcHRpb24obSwgbSkpO1xuICAgICAgICBkcm9wZG93bi5zZXRWYWx1ZShjb25maWcuZGVmYXVsdE1vZGVsKTtcbiAgICAgICAgZHJvcGRvd24ub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uZmlnLmRlZmF1bHRNb2RlbCA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwicFwiLCB7XG4gICAgICB0ZXh0OiBcIk9wZW5BSSBzb3VyY2VzIHVzZSB2YXVsdF9wYXRoLiBBZGQgc291cmNlIGZpbGVzIHZpYSB0aGUgTWFuYWdlIFNvdXJjZXMgY29tbWFuZCBpbiBhbnkgbm90ZS5cIlxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJBbnRocm9waWNTZXR0aW5ncyhjb250YWluZXJFbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgICBjb25zdCBjb25maWcgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcm92aWRlcnMuYW50aHJvcGljO1xuICAgIHRoaXMucmVuZGVyVmFsaWRhdGlvblN0YXRlKGNvbnRhaW5lckVsLCBcImFudGhyb3BpY1wiKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiQVBJIEtleVwiKVxuICAgICAgLmFkZFRleHQoKHRleHQpID0+IHtcbiAgICAgICAgdGV4dC5pbnB1dEVsLnR5cGUgPSBcInBhc3N3b3JkXCI7XG4gICAgICAgIHRleHQuc2V0VmFsdWUoY29uZmlnLmFwaUtleSk7XG4gICAgICAgIHRleHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uZmlnLmFwaUtleSA9IHZhbHVlO1xuICAgICAgICAgIHRoaXMubW9kZWxDYWNoZS5hbnRocm9waWMgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0ZXh0LmlucHV0RWwuYWRkRXZlbnRMaXN0ZW5lcihcImJsdXJcIiwgKCkgPT4gdm9pZCB0aGlzLnZhbGlkYXRlUHJvdmlkZXIoXCJhbnRocm9waWNcIikpO1xuICAgICAgfSk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkRlZmF1bHQgTW9kZWxcIilcbiAgICAgIC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcbiAgICAgICAgY29uc3QgbW9kZWxzID0gdGhpcy5tb2RlbE9wdGlvbnNGb3IoXCJhbnRocm9waWNcIiwgY29uZmlnLmRlZmF1bHRNb2RlbCk7XG4gICAgICAgIG1vZGVscy5mb3JFYWNoKChtKSA9PiBkcm9wZG93bi5hZGRPcHRpb24obSwgbSkpO1xuICAgICAgICBkcm9wZG93bi5zZXRWYWx1ZShjb25maWcuZGVmYXVsdE1vZGVsKTtcbiAgICAgICAgZHJvcGRvd24ub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uZmlnLmRlZmF1bHRNb2RlbCA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwicFwiLCB7XG4gICAgICB0ZXh0OiBcIlBERnMgYXJlIGVuY29kZWQgaW5saW5lIHBlciByZXF1ZXN0LiBVc2Ugc2hvcnQgZXhjZXJwdHMgdG8gYXZvaWQgaGlnaCB0b2tlbiBjb3N0cy5cIlxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJPcGVuUm91dGVyU2V0dGluZ3MoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gICAgY29uc3QgY29uZmlnID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucHJvdmlkZXJzLm9wZW5yb3V0ZXI7XG4gICAgdGhpcy5yZW5kZXJWYWxpZGF0aW9uU3RhdGUoY29udGFpbmVyRWwsIFwib3BlbnJvdXRlclwiKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiQVBJIEtleVwiKVxuICAgICAgLmFkZFRleHQoKHRleHQpID0+IHtcbiAgICAgICAgdGV4dC5pbnB1dEVsLnR5cGUgPSBcInBhc3N3b3JkXCI7XG4gICAgICAgIHRleHQuc2V0VmFsdWUoY29uZmlnLmFwaUtleSk7XG4gICAgICAgIHRleHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uZmlnLmFwaUtleSA9IHZhbHVlO1xuICAgICAgICAgIHRoaXMubW9kZWxDYWNoZS5vcGVucm91dGVyID0gdW5kZWZpbmVkO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGV4dC5pbnB1dEVsLmFkZEV2ZW50TGlzdGVuZXIoXCJibHVyXCIsICgpID0+IHZvaWQgdGhpcy52YWxpZGF0ZVByb3ZpZGVyKFwib3BlbnJvdXRlclwiKSk7XG4gICAgICB9KTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiRGVmYXVsdCBNb2RlbFwiKVxuICAgICAgLmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xuICAgICAgICBjb25zdCBtb2RlbHMgPSB0aGlzLm1vZGVsT3B0aW9uc0ZvcihcIm9wZW5yb3V0ZXJcIiwgY29uZmlnLmRlZmF1bHRNb2RlbCk7XG4gICAgICAgIG1vZGVscy5mb3JFYWNoKChtKSA9PiBkcm9wZG93bi5hZGRPcHRpb24obSwgbSkpO1xuICAgICAgICBkcm9wZG93bi5zZXRWYWx1ZShjb25maWcuZGVmYXVsdE1vZGVsKTtcbiAgICAgICAgZHJvcGRvd24ub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uZmlnLmRlZmF1bHRNb2RlbCA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwicFwiLCB7XG4gICAgICB0ZXh0OiBcIk9wZW5Sb3V0ZXIgcHJvdmlkZXMgYWNjZXNzIHRvIG1hbnkgZnJlZSBhbmQgcGFpZCBtb2RlbHMgdmlhIGEgdW5pZmllZCBBUEkuIEZyZWUgbW9kZWxzIGhhdmUgJzpmcmVlJyBpbiB0aGVpciBJRC5cIlxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJPbGxhbWFTZXR0aW5ncyhjb250YWluZXJFbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgICBjb25zdCBjb25maWcgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcm92aWRlcnMub2xsYW1hO1xuICAgIHRoaXMucmVuZGVyVmFsaWRhdGlvblN0YXRlKGNvbnRhaW5lckVsLCBcIm9sbGFtYVwiKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiQmFzZSBVUkxcIilcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PiB7XG4gICAgICAgIHRleHQuc2V0VmFsdWUoY29uZmlnLmJhc2VVcmwpO1xuICAgICAgICB0ZXh0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGNvbmZpZy5iYXNlVXJsID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0ZXh0LmlucHV0RWwuYWRkRXZlbnRMaXN0ZW5lcihcImJsdXJcIiwgKCkgPT4gdm9pZCB0aGlzLnZhbGlkYXRlT2xsYW1hKCkpO1xuICAgICAgfSk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkF2YWlsYWJsZSBNb2RlbHNcIilcbiAgICAgIC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHRoaXMub2xsYW1hTW9kZWxzLmxlbmd0aCA/IHRoaXMub2xsYW1hTW9kZWxzIDogW2NvbmZpZy5kZWZhdWx0TW9kZWxdO1xuICAgICAgICBvcHRpb25zLmZvckVhY2goKG1vZGVsKSA9PiBkcm9wZG93bi5hZGRPcHRpb24obW9kZWwsIG1vZGVsKSk7XG4gICAgICAgIGRyb3Bkb3duLnNldFZhbHVlKG9wdGlvbnMuaW5jbHVkZXMoY29uZmlnLmRlZmF1bHRNb2RlbCkgPyBjb25maWcuZGVmYXVsdE1vZGVsIDogb3B0aW9uc1swXSk7XG4gICAgICAgIGRyb3Bkb3duLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGNvbmZpZy5kZWZhdWx0TW9kZWwgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICB0aGlzLmRpc3BsYXkoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiRGVmYXVsdCBNb2RlbFwiKVxuICAgICAgLmFkZFRleHQoKHRleHQpID0+IHtcbiAgICAgICAgdGV4dC5zZXRWYWx1ZShjb25maWcuZGVmYXVsdE1vZGVsKTtcbiAgICAgICAgdGV4dC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICBjb25maWcuZGVmYXVsdE1vZGVsID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJwXCIsIHtcbiAgICAgIHRleHQ6IFwiTm8gQVBJIGtleSByZXF1aXJlZC4gT2xsYW1hIG11c3QgYmUgcnVubmluZyBsb2NhbGx5LiBGaWxlIGdyb3VuZGluZyB1c2VzIHZhdWx0X3BhdGggdGV4dCBleHRyYWN0aW9uLlwiXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlckdsb2JhbFNldHRpbmdzKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIkdsb2JhbCBTZXR0aW5nc1wiIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJEZWZhdWx0IFRlbXBlcmF0dXJlXCIpXG4gICAgICAuc2V0RGVzYyhTdHJpbmcodGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVmYXVsdFRlbXBlcmF0dXJlKSlcbiAgICAgIC5hZGRTbGlkZXIoKHNsaWRlcikgPT4ge1xuICAgICAgICBzbGlkZXIuc2V0TGltaXRzKDAsIDEsIDAuMDUpO1xuICAgICAgICBzbGlkZXIuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVmYXVsdFRlbXBlcmF0dXJlKTtcbiAgICAgICAgc2xpZGVyLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmRlZmF1bHRUZW1wZXJhdHVyZSA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgIHRoaXMuZGlzcGxheSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJJbnNlcnRpb24gTW9kZVwiKVxuICAgICAgLmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xuICAgICAgICBkcm9wZG93bi5hZGRPcHRpb24oXCJjdXJzb3JcIiwgXCJBdCBjdXJzb3JcIik7XG4gICAgICAgIGRyb3Bkb3duLmFkZE9wdGlvbihcImVuZC1vZi1ub3RlXCIsIFwiRW5kIG9mIG5vdGVcIik7XG4gICAgICAgIGRyb3Bkb3duLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmluc2VydGlvbk1vZGUpO1xuICAgICAgICBkcm9wZG93bi5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5pbnNlcnRpb25Nb2RlID0gdmFsdWUgYXMgXCJjdXJzb3JcIiB8IFwiZW5kLW9mLW5vdGVcIjtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiU2hvdyBUb2tlbiBDb3VudFwiKVxuICAgICAgLmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB7XG4gICAgICAgIHRvZ2dsZS5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5zaG93VG9rZW5Db3VudCk7XG4gICAgICAgIHRvZ2dsZS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zaG93VG9rZW5Db3VudCA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJMb25lbG9nIE1vZGVcIilcbiAgICAgIC5zZXREZXNjKFwiRW5hYmxlIExvbmVsb2cgbm90YXRpb24sIGNvbnRleHQgcGFyc2luZywgYW5kIExvbmVsb2ctc3BlY2lmaWMgY29tbWFuZHMuXCIpXG4gICAgICAuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcbiAgICAgICAgdG9nZ2xlLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmxvbmVsb2dNb2RlKTtcbiAgICAgICAgdG9nZ2xlLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmxvbmVsb2dNb2RlID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgdGhpcy5kaXNwbGF5KCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgaWYgKHRoaXMucGx1Z2luLnNldHRpbmdzLmxvbmVsb2dNb2RlKSB7XG4gICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgICAgLnNldE5hbWUoXCJBdXRvLWluY3JlbWVudCBzY2VuZSBjb3VudGVyXCIpXG4gICAgICAgIC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xuICAgICAgICAgIHRvZ2dsZS5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5sb25lbG9nQXV0b0luY1NjZW5lKTtcbiAgICAgICAgICB0b2dnbGUub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5sb25lbG9nQXV0b0luY1NjZW5lID0gdmFsdWU7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgICAgLnNldE5hbWUoXCJDb250ZXh0IGV4dHJhY3Rpb24gZGVwdGhcIilcbiAgICAgICAgLmFkZFRleHQoKHRleHQpID0+IHtcbiAgICAgICAgICB0ZXh0LnNldFZhbHVlKFN0cmluZyh0aGlzLnBsdWdpbi5zZXR0aW5ncy5sb25lbG9nQ29udGV4dERlcHRoKSk7XG4gICAgICAgICAgdGV4dC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG5leHQgPSBOdW1iZXIodmFsdWUpO1xuICAgICAgICAgICAgaWYgKCFOdW1iZXIuaXNOYU4obmV4dCkgJiYgbmV4dCA+IDApIHtcbiAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MubG9uZWxvZ0NvbnRleHREZXB0aCA9IG5leHQ7XG4gICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgICAuc2V0TmFtZShcIldyYXAgbm90YXRpb24gaW4gY29kZSBibG9ja3NcIilcbiAgICAgICAgLmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB7XG4gICAgICAgICAgdG9nZ2xlLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmxvbmVsb2dXcmFwQ29kZUJsb2NrKTtcbiAgICAgICAgICB0b2dnbGUub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5sb25lbG9nV3JhcENvZGVCbG9jayA9IHZhbHVlO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgbW9kZWxPcHRpb25zRm9yKHByb3ZpZGVyOiBQcm92aWRlcklELCBjdXJyZW50TW9kZWw6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgICBjb25zdCBjYWNoZWQgPSB0aGlzLm1vZGVsQ2FjaGVbcHJvdmlkZXJdO1xuICAgIGlmICghY2FjaGVkKSByZXR1cm4gW2N1cnJlbnRNb2RlbF07XG4gICAgcmV0dXJuIGNhY2hlZC5pbmNsdWRlcyhjdXJyZW50TW9kZWwpID8gY2FjaGVkIDogW2N1cnJlbnRNb2RlbCwgLi4uY2FjaGVkXTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyVmFsaWRhdGlvblN0YXRlKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCwgcHJvdmlkZXI6IFByb3ZpZGVySUQpOiB2b2lkIHtcbiAgICBjb25zdCBzdGF0ZSA9IHRoaXMudmFsaWRhdGlvbltwcm92aWRlcl07XG4gICAgaWYgKCFzdGF0ZSB8fCBzdGF0ZS5zdGF0dXMgPT09IFwiaWRsZVwiKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwicFwiLCB7XG4gICAgICB0ZXh0OlxuICAgICAgICBzdGF0ZS5zdGF0dXMgPT09IFwiY2hlY2tpbmdcIlxuICAgICAgICAgID8gXCJWYWxpZGF0aW9uOiBjaGVja2luZy4uLlwiXG4gICAgICAgICAgOiBzdGF0ZS5zdGF0dXMgPT09IFwidmFsaWRcIlxuICAgICAgICAgICAgPyBcIlZhbGlkYXRpb246IFx1MjcxM1wiXG4gICAgICAgICAgICA6IGBWYWxpZGF0aW9uOiBcdTI3MTcke3N0YXRlLm1lc3NhZ2UgPyBgICgke3N0YXRlLm1lc3NhZ2V9KWAgOiBcIlwifWBcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcHJvdmlkZXJMYWJlbChwcm92aWRlcjogUHJvdmlkZXJJRCk6IHN0cmluZyB7XG4gICAgc3dpdGNoIChwcm92aWRlcikge1xuICAgICAgY2FzZSBcImdlbWluaVwiOlxuICAgICAgICByZXR1cm4gXCJHZW1pbmlcIjtcbiAgICAgIGNhc2UgXCJvcGVuYWlcIjpcbiAgICAgICAgcmV0dXJuIFwiT3BlbkFJXCI7XG4gICAgICBjYXNlIFwiYW50aHJvcGljXCI6XG4gICAgICAgIHJldHVybiBcIkFudGhyb3BpY1wiO1xuICAgICAgY2FzZSBcIm9sbGFtYVwiOlxuICAgICAgICByZXR1cm4gXCJPbGxhbWFcIjtcbiAgICAgIGNhc2UgXCJvcGVucm91dGVyXCI6XG4gICAgICAgIHJldHVybiBcIk9wZW5Sb3V0ZXJcIjtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHZhbGlkYXRlUHJvdmlkZXIocHJvdmlkZXI6IFByb3ZpZGVySUQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLnZhbGlkYXRpb25bcHJvdmlkZXJdID0geyBzdGF0dXM6IFwiY2hlY2tpbmdcIiB9O1xuICAgIHRoaXMuZGlzcGxheSgpO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB2YWxpZCA9IGF3YWl0IGdldFByb3ZpZGVyKHRoaXMucGx1Z2luLnNldHRpbmdzLCBwcm92aWRlcikudmFsaWRhdGUoKTtcbiAgICAgIHRoaXMudmFsaWRhdGlvbltwcm92aWRlcl0gPSB7IHN0YXR1czogdmFsaWQgPyBcInZhbGlkXCIgOiBcImludmFsaWRcIiB9O1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLnZhbGlkYXRpb25bcHJvdmlkZXJdID0ge1xuICAgICAgICBzdGF0dXM6IFwiaW52YWxpZFwiLFxuICAgICAgICBtZXNzYWdlOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcilcbiAgICAgIH07XG4gICAgfVxuICAgIHRoaXMuZGlzcGxheSgpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyB2YWxpZGF0ZU9sbGFtYSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLnZhbGlkYXRpb24ub2xsYW1hID0geyBzdGF0dXM6IFwiY2hlY2tpbmdcIiB9O1xuICAgIHRoaXMuZGlzcGxheSgpO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBwcm92aWRlciA9IG5ldyBPbGxhbWFQcm92aWRlcih0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcm92aWRlcnMub2xsYW1hKTtcbiAgICAgIGNvbnN0IHZhbGlkID0gYXdhaXQgcHJvdmlkZXIudmFsaWRhdGUoKTtcbiAgICAgIHRoaXMudmFsaWRhdGlvbi5vbGxhbWEgPSB7IHN0YXR1czogdmFsaWQgPyBcInZhbGlkXCIgOiBcImludmFsaWRcIiB9O1xuICAgICAgdGhpcy5vbGxhbWFNb2RlbHMgPSB2YWxpZCA/IGF3YWl0IHByb3ZpZGVyLmxpc3RNb2RlbHMoKSA6IFtdO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLnZhbGlkYXRpb24ub2xsYW1hID0ge1xuICAgICAgICBzdGF0dXM6IFwiaW52YWxpZFwiLFxuICAgICAgICBtZXNzYWdlOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcilcbiAgICAgIH07XG4gICAgICB0aGlzLm9sbGFtYU1vZGVscyA9IFtdO1xuICAgICAgbmV3IE5vdGljZSh0aGlzLnZhbGlkYXRpb24ub2xsYW1hLm1lc3NhZ2UgPz8gXCJPbGxhbWEgdmFsaWRhdGlvbiBmYWlsZWQuXCIpO1xuICAgIH1cbiAgICB0aGlzLmRpc3BsYXkoKTtcbiAgfVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBQUFBLG9CQUE2Qzs7O0FDRXRDLFNBQVMsZUFBZSxRQUFnQixNQUFvQjtBQUNqRSxRQUFNLFNBQVMsT0FBTyxVQUFVO0FBQ2hDLFNBQU8sYUFBYTtBQUFBLEVBQUs7QUFBQSxHQUFVLE1BQU07QUFD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QUFBQSxJQUNsQyxPQUFPO0FBQ0wsbUJBQWEsS0FBSyxRQUFRLElBQUk7QUFBQSxJQUNoQztBQUFBLEVBQ0Y7QUFBQSxFQUVBLHdCQUF3QixNQUFvQixVQUFvQztBQWhHbEY7QUFpR0ksUUFBSSxDQUFDLEtBQUssU0FBUyxnQkFBZ0I7QUFDakM7QUFBQSxJQUNGO0FBQ0EsVUFBTSxTQUFRLGNBQVMsZ0JBQVQsWUFBd0I7QUFDdEMsVUFBTSxVQUFTLGNBQVMsaUJBQVQsWUFBeUI7QUFDeEMsaUJBQWEsS0FBSyxRQUFRLGdCQUFnQixjQUFjLGdCQUFnQjtBQUFBLEVBQzFFO0FBQ0Y7IiwKICAibmFtZXMiOiBbImltcG9ydF9vYnNpZGlhbiIsICJfYSIsICJpbXBvcnRfb2JzaWRpYW4iLCAiX2EiLCAiaW1wb3J0X29ic2lkaWFuIiwgImltcG9ydF9vYnNpZGlhbiIsICJfYSIsICJpbXBvcnRfb2JzaWRpYW4iLCAiX2EiLCAiaW1wb3J0X29ic2lkaWFuIiwgImFzRXJyb3JNZXNzYWdlIiwgIl9hIiwgImltcG9ydF9vYnNpZGlhbiIsICJpbXBvcnRfb2JzaWRpYW4iLCAicmVmIiwgImltcG9ydF9vYnNpZGlhbiJdCn0K
