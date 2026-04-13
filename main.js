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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL2VkaXRvci50cyIsICJzcmMvbG9uZWxvZy9wYXJzZXIudHMiLCAic3JjL3Byb21wdEJ1aWxkZXIudHMiLCAic3JjL2Zyb250bWF0dGVyLnRzIiwgInNyYy9wcm92aWRlcnMvYW50aHJvcGljLnRzIiwgInNyYy9wcm92aWRlcnMvZ2VtaW5pLnRzIiwgInNyYy9wcm92aWRlcnMvb2xsYW1hLnRzIiwgInNyYy9zb3VyY2VVdGlscy50cyIsICJzcmMvcHJvdmlkZXJzL29wZW5haS50cyIsICJzcmMvcHJvdmlkZXJzL29wZW5yb3V0ZXIudHMiLCAic3JjL3Byb3ZpZGVycy9pbmRleC50cyIsICJzcmMvY29tbWFuZHMudHMiLCAic3JjL2xvbmVsb2cvZm9ybWF0dGVyLnRzIiwgInNyYy9tb2RhbHMudHMiLCAic3JjL3NldHRpbmdzLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgeyBNYXJrZG93blZpZXcsIE5vdGljZSwgUGx1Z2luIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgeyBhcHBlbmRUb05vdGUsIGluc2VydEF0Q3Vyc29yIH0gZnJvbSBcIi4vZWRpdG9yXCI7XG5pbXBvcnQgeyBidWlsZFJlcXVlc3QsIGJ1aWxkU3lzdGVtUHJvbXB0IH0gZnJvbSBcIi4vcHJvbXB0QnVpbGRlclwiO1xuaW1wb3J0IHsgcmVhZEZyb250TWF0dGVyIH0gZnJvbSBcIi4vZnJvbnRtYXR0ZXJcIjtcbmltcG9ydCB7IGdldFByb3ZpZGVyIH0gZnJvbSBcIi4vcHJvdmlkZXJzXCI7XG5pbXBvcnQgeyByZWdpc3RlckFsbENvbW1hbmRzIH0gZnJvbSBcIi4vY29tbWFuZHNcIjtcbmltcG9ydCB7IERFRkFVTFRfU0VUVElOR1MsIFN5YnlsU2V0dGluZ1RhYiwgbm9ybWFsaXplU2V0dGluZ3MgfSBmcm9tIFwiLi9zZXR0aW5nc1wiO1xuaW1wb3J0IHsgR2VuZXJhdGlvblJlcXVlc3QsIEdlbmVyYXRpb25SZXNwb25zZSwgTm90ZUZyb250TWF0dGVyLCBSZXNvbHZlZFNvdXJjZSwgU3lieWxTZXR0aW5ncyB9IGZyb20gXCIuL3R5cGVzXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQWN0aXZlTm90ZUNvbnRleHQge1xuICB2aWV3OiBNYXJrZG93blZpZXc7XG4gIGZtOiBOb3RlRnJvbnRNYXR0ZXI7XG4gIG5vdGVCb2R5OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFN5YnlsUGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcbiAgc2V0dGluZ3M6IFN5YnlsU2V0dGluZ3MgPSBERUZBVUxUX1NFVFRJTkdTO1xuXG4gIGFzeW5jIG9ubG9hZCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLmxvYWRTZXR0aW5ncygpO1xuICAgIHRoaXMuYWRkU2V0dGluZ1RhYihuZXcgU3lieWxTZXR0aW5nVGFiKHRoaXMuYXBwLCB0aGlzKSk7XG4gICAgcmVnaXN0ZXJBbGxDb21tYW5kcyh0aGlzKTtcbiAgfVxuXG4gIGFzeW5jIGxvYWRTZXR0aW5ncygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLnNldHRpbmdzID0gbm9ybWFsaXplU2V0dGluZ3MoYXdhaXQgdGhpcy5sb2FkRGF0YSgpKTtcbiAgfVxuXG4gIGFzeW5jIHNhdmVTZXR0aW5ncygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLnNhdmVEYXRhKHRoaXMuc2V0dGluZ3MpO1xuICB9XG5cbiAgYXN5bmMgZ2V0QWN0aXZlTm90ZUNvbnRleHQoKTogUHJvbWlzZTxBY3RpdmVOb3RlQ29udGV4dCB8IG51bGw+IHtcbiAgICBjb25zdCB2aWV3ID0gdGhpcy5hcHAud29ya3NwYWNlLmdldEFjdGl2ZVZpZXdPZlR5cGUoTWFya2Rvd25WaWV3KTtcbiAgICBpZiAoIXZpZXc/LmZpbGUpIHtcbiAgICAgIG5ldyBOb3RpY2UoXCJObyBhY3RpdmUgbWFya2Rvd24gbm90ZS5cIik7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIHZpZXcsXG4gICAgICBmbTogYXdhaXQgcmVhZEZyb250TWF0dGVyKHRoaXMuYXBwLCB2aWV3LmZpbGUpLFxuICAgICAgbm90ZUJvZHk6IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNhY2hlZFJlYWQodmlldy5maWxlKVxuICAgIH07XG4gIH1cblxuICBhc3luYyByZXF1ZXN0R2VuZXJhdGlvbihcbiAgICBmbTogTm90ZUZyb250TWF0dGVyLFxuICAgIG5vdGVCb2R5OiBzdHJpbmcsXG4gICAgdXNlck1lc3NhZ2U6IHN0cmluZyxcbiAgICBtYXhPdXRwdXRUb2tlbnMgPSA1MTJcbiAgKTogUHJvbWlzZTxHZW5lcmF0aW9uUmVzcG9uc2U+IHtcbiAgICBjb25zdCBwcm92aWRlciA9IGdldFByb3ZpZGVyKHRoaXMuc2V0dGluZ3MsIGZtLnByb3ZpZGVyKTtcbiAgICBjb25zdCByZXF1ZXN0ID0gYnVpbGRSZXF1ZXN0KGZtLCB1c2VyTWVzc2FnZSwgdGhpcy5zZXR0aW5ncywgbWF4T3V0cHV0VG9rZW5zLCBub3RlQm9keSk7XG4gICAgY29uc3QgcHJvZ3Jlc3MgPSBuZXcgTm90aWNlKFwiU3lieWw6IEdlbmVyYXRpbmcuLi5cIiwgMCk7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBhd2FpdCBwcm92aWRlci5nZW5lcmF0ZShyZXF1ZXN0KTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgcHJvZ3Jlc3MuaGlkZSgpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHJlcXVlc3RSYXdHZW5lcmF0aW9uKFxuICAgIGZtOiBOb3RlRnJvbnRNYXR0ZXIsXG4gICAgdXNlck1lc3NhZ2U6IHN0cmluZyxcbiAgICBtYXhPdXRwdXRUb2tlbnM6IG51bWJlcixcbiAgICByZXNvbHZlZFNvdXJjZXM6IFJlc29sdmVkU291cmNlW10gPSBbXVxuICApOiBQcm9taXNlPEdlbmVyYXRpb25SZXNwb25zZT4ge1xuICAgIGNvbnN0IHByb3ZpZGVyID0gZ2V0UHJvdmlkZXIodGhpcy5zZXR0aW5ncywgZm0ucHJvdmlkZXIpO1xuICAgIGNvbnN0IHJlcXVlc3Q6IEdlbmVyYXRpb25SZXF1ZXN0ID0ge1xuICAgICAgc3lzdGVtUHJvbXB0OiBidWlsZFN5c3RlbVByb21wdChmbSwgZmFsc2UpLFxuICAgICAgdXNlck1lc3NhZ2UsXG4gICAgICByZXNvbHZlZFNvdXJjZXMsXG4gICAgICB0ZW1wZXJhdHVyZTogZm0udGVtcGVyYXR1cmUgPz8gdGhpcy5zZXR0aW5ncy5kZWZhdWx0VGVtcGVyYXR1cmUsXG4gICAgICBtYXhPdXRwdXRUb2tlbnMsXG4gICAgICBtb2RlbDogZm0ubW9kZWxcbiAgICB9O1xuICAgIGNvbnN0IHByb2dyZXNzID0gbmV3IE5vdGljZShcIlN5YnlsOiBHZW5lcmF0aW5nLi4uXCIsIDApO1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gYXdhaXQgcHJvdmlkZXIuZ2VuZXJhdGUocmVxdWVzdCk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHByb2dyZXNzLmhpZGUoKTtcbiAgICB9XG4gIH1cblxuICBpbnNlcnRUZXh0KHZpZXc6IE1hcmtkb3duVmlldywgdGV4dDogc3RyaW5nLCBtb2RlPzogXCJjdXJzb3JcIiB8IFwiZW5kLW9mLW5vdGVcIik6IHZvaWQge1xuICAgIGlmICgobW9kZSA/PyB0aGlzLnNldHRpbmdzLmluc2VydGlvbk1vZGUpID09PSBcImN1cnNvclwiKSB7XG4gICAgICBpbnNlcnRBdEN1cnNvcih2aWV3LmVkaXRvciwgdGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGFwcGVuZFRvTm90ZSh2aWV3LmVkaXRvciwgdGV4dCk7XG4gICAgfVxuICB9XG5cbiAgbWF5YmVJbnNlcnRUb2tlbkNvbW1lbnQodmlldzogTWFya2Rvd25WaWV3LCByZXNwb25zZTogR2VuZXJhdGlvblJlc3BvbnNlKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLnNldHRpbmdzLnNob3dUb2tlbkNvdW50KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGlucHV0ID0gcmVzcG9uc2UuaW5wdXRUb2tlbnMgPz8gXCJOL0FcIjtcbiAgICBjb25zdCBvdXRwdXQgPSByZXNwb25zZS5vdXRwdXRUb2tlbnMgPz8gXCJOL0FcIjtcbiAgICBhcHBlbmRUb05vdGUodmlldy5lZGl0b3IsIGA8IS0tIHRva2VuczogJHtpbnB1dH0gaW4gLyAke291dHB1dH0gb3V0IC0tPmApO1xuICB9XG59XG4iLCAiaW1wb3J0IHsgRWRpdG9yIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5cbmV4cG9ydCBmdW5jdGlvbiBpbnNlcnRBdEN1cnNvcihlZGl0b3I6IEVkaXRvciwgdGV4dDogc3RyaW5nKTogdm9pZCB7XG4gIGNvbnN0IGN1cnNvciA9IGVkaXRvci5nZXRDdXJzb3IoKTtcbiAgZWRpdG9yLnJlcGxhY2VSYW5nZShgXFxuJHt0ZXh0fVxcbmAsIGN1cnNvcik7XG4gIGVkaXRvci5zZXRDdXJzb3IoeyBsaW5lOiBjdXJzb3IubGluZSArIHRleHQuc3BsaXQoXCJcXG5cIikubGVuZ3RoICsgMSwgY2g6IDAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhcHBlbmRUb05vdGUoZWRpdG9yOiBFZGl0b3IsIHRleHQ6IHN0cmluZyk6IHZvaWQge1xuICBjb25zdCBsYXN0TGluZSA9IGVkaXRvci5sYXN0TGluZSgpO1xuICBjb25zdCBsYXN0Q2ggPSBlZGl0b3IuZ2V0TGluZShsYXN0TGluZSkubGVuZ3RoO1xuICBlZGl0b3IucmVwbGFjZVJhbmdlKGBcXG4ke3RleHR9XFxuYCwgeyBsaW5lOiBsYXN0TGluZSwgY2g6IGxhc3RDaCB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFNlbGVjdGlvbihlZGl0b3I6IEVkaXRvcik6IHN0cmluZyB7XG4gIHJldHVybiBlZGl0b3IuZ2V0U2VsZWN0aW9uKCkudHJpbSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaW5zZXJ0QmVsb3dTZWxlY3Rpb24oZWRpdG9yOiBFZGl0b3IsIHRleHQ6IHN0cmluZyk6IHZvaWQge1xuICBjb25zdCBzZWxlY3Rpb24gPSBlZGl0b3IubGlzdFNlbGVjdGlvbnMoKVswXTtcbiAgY29uc3QgdGFyZ2V0TGluZSA9IHNlbGVjdGlvbiA/IHNlbGVjdGlvbi5oZWFkLmxpbmUgOiBlZGl0b3IuZ2V0Q3Vyc29yKCkubGluZTtcbiAgZWRpdG9yLnJlcGxhY2VSYW5nZShgXFxuJHt0ZXh0fWAsIHsgbGluZTogdGFyZ2V0TGluZSwgY2g6IGVkaXRvci5nZXRMaW5lKHRhcmdldExpbmUpLmxlbmd0aCB9KTtcbn1cbiIsICJleHBvcnQgaW50ZXJmYWNlIExvbmVsb2dDb250ZXh0IHtcbiAgbGFzdFNjZW5lSWQ6IHN0cmluZztcbiAgbGFzdFNjZW5lRGVzYzogc3RyaW5nO1xuICBhY3RpdmVOUENzOiBzdHJpbmdbXTtcbiAgYWN0aXZlTG9jYXRpb25zOiBzdHJpbmdbXTtcbiAgYWN0aXZlVGhyZWFkczogc3RyaW5nW107XG4gIGFjdGl2ZUNsb2Nrczogc3RyaW5nW107XG4gIGFjdGl2ZVRyYWNrczogc3RyaW5nW107XG4gIHBjU3RhdGU6IHN0cmluZ1tdO1xuICByZWNlbnRCZWF0czogc3RyaW5nW107XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUxvbmVsb2dDb250ZXh0KG5vdGVCb2R5OiBzdHJpbmcsIGRlcHRoTGluZXMgPSA2MCk6IExvbmVsb2dDb250ZXh0IHtcbiAgY29uc3QgYm9keVdpdGhvdXRGTSA9IG5vdGVCb2R5LnJlcGxhY2UoL14tLS1bXFxzXFxTXSo/LS0tXFxyP1xcbi8sIFwiXCIpO1xuICBjb25zdCBsaW5lcyA9IGJvZHlXaXRob3V0Rk0uc3BsaXQoL1xccj9cXG4vKTtcbiAgY29uc3Qgd2luZG93ID0gbGluZXMuc2xpY2UoLWRlcHRoTGluZXMpO1xuICBjb25zdCBjdHg6IExvbmVsb2dDb250ZXh0ID0ge1xuICAgIGxhc3RTY2VuZUlkOiBcIlwiLFxuICAgIGxhc3RTY2VuZURlc2M6IFwiXCIsXG4gICAgYWN0aXZlTlBDczogW10sXG4gICAgYWN0aXZlTG9jYXRpb25zOiBbXSxcbiAgICBhY3RpdmVUaHJlYWRzOiBbXSxcbiAgICBhY3RpdmVDbG9ja3M6IFtdLFxuICAgIGFjdGl2ZVRyYWNrczogW10sXG4gICAgcGNTdGF0ZTogW10sXG4gICAgcmVjZW50QmVhdHM6IFtdXG4gIH07XG5cbiAgY29uc3Qgc2NlbmVSZSA9IC9eKD86IytcXHMrKT8oVFxcZCstKT9TKFxcZCtbXFx3Ll0qKVxccypcXCooW14qXSopXFwqLztcbiAgY29uc3QgbnBjUmUgPSAvXFxbTjooW15cXF1dKylcXF0vZztcbiAgY29uc3QgbG9jUmUgPSAvXFxbTDooW15cXF1dKylcXF0vZztcbiAgY29uc3QgdGhyZWFkUmUgPSAvXFxbVGhyZWFkOihbXlxcXV0rKVxcXS9nO1xuICBjb25zdCBjbG9ja1JlID0gL1xcW0Nsb2NrOihbXlxcXV0rKVxcXS9nO1xuICBjb25zdCB0cmFja1JlID0gL1xcW1RyYWNrOihbXlxcXV0rKVxcXS9nO1xuICBjb25zdCBwY1JlID0gL1xcW1BDOihbXlxcXV0rKVxcXS9nO1xuICBjb25zdCBiZWF0UmUgPSAvXihAfFxcP3xkOnwtPnw9PikvO1xuICBjb25zdCBza2lwUmUgPSAvXigjfC0tLXw+XFxzKlxcW3xcXFtOOnxcXFtMOnxcXFtUaHJlYWQ6fFxcW0Nsb2NrOnxcXFtUcmFjazp8XFxbUEM6KS87XG5cbiAgY29uc3QgbnBjTWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgY29uc3QgbG9jTWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgY29uc3QgdGhyZWFkTWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgY29uc3QgY2xvY2tNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBjb25zdCB0cmFja01hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIGNvbnN0IHBjTWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcblxuICBmb3IgKGNvbnN0IHJhd0xpbmUgb2Ygd2luZG93KSB7XG4gICAgY29uc3QgbGluZSA9IHJhd0xpbmUudHJpbSgpO1xuICAgIGNvbnN0IHNjZW5lTWF0Y2ggPSBsaW5lLm1hdGNoKHNjZW5lUmUpO1xuICAgIGlmIChzY2VuZU1hdGNoKSB7XG4gICAgICBjdHgubGFzdFNjZW5lSWQgPSBgJHtzY2VuZU1hdGNoWzFdID8/IFwiXCJ9UyR7c2NlbmVNYXRjaFsyXX1gO1xuICAgICAgY3R4Lmxhc3RTY2VuZURlc2MgPSBzY2VuZU1hdGNoWzNdLnRyaW0oKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBtYXRjaCBvZiBsaW5lLm1hdGNoQWxsKG5wY1JlKSkgbnBjTWFwLnNldChtYXRjaFsxXS5zcGxpdChcInxcIilbMF0sIG1hdGNoWzFdKTtcbiAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIGxpbmUubWF0Y2hBbGwobG9jUmUpKSBsb2NNYXAuc2V0KG1hdGNoWzFdLnNwbGl0KFwifFwiKVswXSwgbWF0Y2hbMV0pO1xuICAgIGZvciAoY29uc3QgbWF0Y2ggb2YgbGluZS5tYXRjaEFsbCh0aHJlYWRSZSkpIHRocmVhZE1hcC5zZXQobWF0Y2hbMV0uc3BsaXQoXCJ8XCIpWzBdLCBtYXRjaFsxXSk7XG4gICAgZm9yIChjb25zdCBtYXRjaCBvZiBsaW5lLm1hdGNoQWxsKGNsb2NrUmUpKSBjbG9ja01hcC5zZXQobWF0Y2hbMV0uc3BsaXQoXCIgXCIpWzBdLCBtYXRjaFsxXSk7XG4gICAgZm9yIChjb25zdCBtYXRjaCBvZiBsaW5lLm1hdGNoQWxsKHRyYWNrUmUpKSB0cmFja01hcC5zZXQobWF0Y2hbMV0uc3BsaXQoXCIgXCIpWzBdLCBtYXRjaFsxXSk7XG4gICAgZm9yIChjb25zdCBtYXRjaCBvZiBsaW5lLm1hdGNoQWxsKHBjUmUpKSBwY01hcC5zZXQobWF0Y2hbMV0uc3BsaXQoXCJ8XCIpWzBdLCBtYXRjaFsxXSk7XG4gICAgaWYgKGJlYXRSZS50ZXN0KGxpbmUpKSB7XG4gICAgICBjdHgucmVjZW50QmVhdHMucHVzaChsaW5lKTtcbiAgICB9IGVsc2UgaWYgKGxpbmUubGVuZ3RoID4gMCAmJiAhc2tpcFJlLnRlc3QobGluZSkgJiYgIXNjZW5lUmUudGVzdChsaW5lKSkge1xuICAgICAgY3R4LnJlY2VudEJlYXRzLnB1c2gobGluZSk7XG4gICAgfVxuICB9XG5cbiAgY3R4LmFjdGl2ZU5QQ3MgPSBbLi4ubnBjTWFwLnZhbHVlcygpXTtcbiAgY3R4LmFjdGl2ZUxvY2F0aW9ucyA9IFsuLi5sb2NNYXAudmFsdWVzKCldO1xuICBjdHguYWN0aXZlVGhyZWFkcyA9IFsuLi50aHJlYWRNYXAudmFsdWVzKCldO1xuICBjdHguYWN0aXZlQ2xvY2tzID0gWy4uLmNsb2NrTWFwLnZhbHVlcygpXTtcbiAgY3R4LmFjdGl2ZVRyYWNrcyA9IFsuLi50cmFja01hcC52YWx1ZXMoKV07XG4gIGN0eC5wY1N0YXRlID0gWy4uLnBjTWFwLnZhbHVlcygpXTtcbiAgY3R4LnJlY2VudEJlYXRzID0gY3R4LnJlY2VudEJlYXRzLnNsaWNlKC0xMCk7XG4gIHJldHVybiBjdHg7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXJpYWxpemVDb250ZXh0KGN0eDogTG9uZWxvZ0NvbnRleHQpOiBzdHJpbmcge1xuICBjb25zdCBsaW5lczogc3RyaW5nW10gPSBbXTtcbiAgaWYgKGN0eC5sYXN0U2NlbmVJZCkgbGluZXMucHVzaChgQ3VycmVudCBzY2VuZTogJHtjdHgubGFzdFNjZW5lSWR9ICoke2N0eC5sYXN0U2NlbmVEZXNjfSpgKTtcbiAgaWYgKGN0eC5wY1N0YXRlLmxlbmd0aCkgbGluZXMucHVzaChgUEM6ICR7Y3R4LnBjU3RhdGUubWFwKChzdGF0ZSkgPT4gYFtQQzoke3N0YXRlfV1gKS5qb2luKFwiIFwiKX1gKTtcbiAgaWYgKGN0eC5hY3RpdmVOUENzLmxlbmd0aCkgbGluZXMucHVzaChgTlBDczogJHtjdHguYWN0aXZlTlBDcy5tYXAoKHN0YXRlKSA9PiBgW046JHtzdGF0ZX1dYCkuam9pbihcIiBcIil9YCk7XG4gIGlmIChjdHguYWN0aXZlTG9jYXRpb25zLmxlbmd0aCkge1xuICAgIGxpbmVzLnB1c2goYExvY2F0aW9uczogJHtjdHguYWN0aXZlTG9jYXRpb25zLm1hcCgoc3RhdGUpID0+IGBbTDoke3N0YXRlfV1gKS5qb2luKFwiIFwiKX1gKTtcbiAgfVxuICBpZiAoY3R4LmFjdGl2ZVRocmVhZHMubGVuZ3RoKSB7XG4gICAgbGluZXMucHVzaChgVGhyZWFkczogJHtjdHguYWN0aXZlVGhyZWFkcy5tYXAoKHN0YXRlKSA9PiBgW1RocmVhZDoke3N0YXRlfV1gKS5qb2luKFwiIFwiKX1gKTtcbiAgfVxuICBpZiAoY3R4LmFjdGl2ZUNsb2Nrcy5sZW5ndGgpIHtcbiAgICBsaW5lcy5wdXNoKGBDbG9ja3M6ICR7Y3R4LmFjdGl2ZUNsb2Nrcy5tYXAoKHN0YXRlKSA9PiBgW0Nsb2NrOiR7c3RhdGV9XWApLmpvaW4oXCIgXCIpfWApO1xuICB9XG4gIGlmIChjdHguYWN0aXZlVHJhY2tzLmxlbmd0aCkge1xuICAgIGxpbmVzLnB1c2goYFRyYWNrczogJHtjdHguYWN0aXZlVHJhY2tzLm1hcCgoc3RhdGUpID0+IGBbVHJhY2s6JHtzdGF0ZX1dYCkuam9pbihcIiBcIil9YCk7XG4gIH1cbiAgaWYgKGN0eC5yZWNlbnRCZWF0cy5sZW5ndGgpIHtcbiAgICBsaW5lcy5wdXNoKFwiUmVjZW50IGJlYXRzOlwiKTtcbiAgICBjdHgucmVjZW50QmVhdHMuZm9yRWFjaCgoYmVhdCkgPT4gbGluZXMucHVzaChgICAke2JlYXR9YCkpO1xuICB9XG4gIHJldHVybiBsaW5lcy5qb2luKFwiXFxuXCIpO1xufVxuIiwgImltcG9ydCB7IHBhcnNlTG9uZWxvZ0NvbnRleHQsIHNlcmlhbGl6ZUNvbnRleHQgfSBmcm9tIFwiLi9sb25lbG9nL3BhcnNlclwiO1xuaW1wb3J0IHsgR2VuZXJhdGlvblJlcXVlc3QsIE5vdGVGcm9udE1hdHRlciwgU3lieWxTZXR0aW5ncyB9IGZyb20gXCIuL3R5cGVzXCI7XG5cbmNvbnN0IExPTkVMT0dfU1lTVEVNX0FEREVORFVNID0gYFxuTE9ORUxPRyBOT1RBVElPTiBNT0RFIElTIEFDVElWRS5cblxuV2hlbiBnZW5lcmF0aW5nIGNvbnNlcXVlbmNlcywgb3JhY2xlIGludGVycHJldGF0aW9ucywgb3Igc2NlbmUgdGV4dDpcbi0gQ29uc2VxdWVuY2VzIG11c3Qgc3RhcnQgd2l0aCBcIj0+XCIgKG9uZSBwZXIgbGluZSBmb3IgbXVsdGlwbGUgY29uc2VxdWVuY2VzKVxuLSBPcmFjbGUgYW5zd2VycyBtdXN0IHN0YXJ0IHdpdGggXCItPlwiXG4tIERvIG5vdCB1c2UgYmxvY2txdW90ZSBtYXJrZXJzIChcIj5cIilcbi0gRG8gbm90IGFkZCBuYXJyYXRpdmUgaGVhZGVycyBvciBsYWJlbHMgbGlrZSBcIltSZXN1bHRdXCIgb3IgXCJbU2NlbmVdXCJcbi0gRm9yIHNjZW5lIGRlc2NyaXB0aW9uczogcGxhaW4gcHJvc2Ugb25seSwgMi0zIGxpbmVzLCBubyBzeW1ib2wgcHJlZml4XG4tIERvIG5vdCBpbnZlbnQgb3Igc3VnZ2VzdCBMb25lbG9nIHRhZ3MgKFtOOl0sIFtMOl0sIGV0Yy4pIC0gdGhlIHBsYXllciBtYW5hZ2VzIHRob3NlXG5cbkdlbmVyYXRlIG9ubHkgdGhlIHN5bWJvbC1wcmVmaXhlZCBjb250ZW50IGxpbmVzLiBUaGUgZm9ybWF0dGVyIGhhbmRsZXMgd3JhcHBpbmcuXG5gLnRyaW0oKTtcblxuZnVuY3Rpb24gYnVpbGRCYXNlUHJvbXB0KGZtOiBOb3RlRnJvbnRNYXR0ZXIpOiBzdHJpbmcge1xuICBjb25zdCBydWxlc2V0ID0gZm0ucnVsZXNldCA/PyBcInRoZSBnYW1lXCI7XG4gIGNvbnN0IHBjcyA9IGZtLnBjcyA/IGBQbGF5ZXIgY2hhcmFjdGVyOiAke2ZtLnBjc31gIDogXCJcIjtcbiAgY29uc3QgdG9uZSA9IGZtLnRvbmUgPyBgVG9uZTogJHtmbS50b25lfWAgOiBcIlwiO1xuICBjb25zdCBsYW5ndWFnZSA9IGZtLmxhbmd1YWdlXG4gICAgPyBgUmVzcG9uZCBpbiAke2ZtLmxhbmd1YWdlfS5gXG4gICAgOiBcIlJlc3BvbmQgaW4gdGhlIHNhbWUgbGFuZ3VhZ2UgYXMgdGhlIHVzZXIncyBpbnB1dC5cIjtcblxuICByZXR1cm4gYFlvdSBhcmUgYSB0b29sIGZvciBzb2xvIHJvbGUtcGxheWluZyBvZiAke3J1bGVzZXR9LiBZb3UgYXJlIE5PVCBhIGdhbWUgbWFzdGVyLlxuXG5Zb3VyIHJvbGU6XG4tIFNldCB0aGUgc2NlbmUgYW5kIG9mZmVyIGFsdGVybmF0aXZlcyAoMi0zIG9wdGlvbnMgbWF4aW11bSlcbi0gV2hlbiB0aGUgdXNlciBkZWNsYXJlcyBhbiBhY3Rpb24gYW5kIHRoZWlyIGRpY2Ugcm9sbCByZXN1bHQsIGRlc2NyaWJlIG9ubHkgY29uc2VxdWVuY2VzIGFuZCB3b3JsZCByZWFjdGlvbnNcbi0gV2hlbiB0aGUgdXNlciBhc2tzIG9yYWNsZSBxdWVzdGlvbnMsIGludGVycHJldCB0aGVtIG5ldXRyYWxseSBpbiBjb250ZXh0XG5cblNUUklDVCBQUk9ISUJJVElPTlMgLSBuZXZlciB2aW9sYXRlIHRoZXNlOlxuLSBOZXZlciB1c2Ugc2Vjb25kIHBlcnNvbiAoXCJ5b3VcIiwgXCJ5b3Ugc3RhbmRcIiwgXCJ5b3Ugc2VlXCIpXG4tIE5ldmVyIGRlc2NyaWJlIHRoZSBQQydzIGFjdGlvbnMsIHRob3VnaHRzLCBvciBpbnRlcm5hbCBzdGF0ZXNcbi0gTmV2ZXIgdXNlIGRyYW1hdGljIG9yIG5hcnJhdGl2ZSB0b25lXG4tIE5ldmVyIGludmVudCBsb3JlLCBydWxlcywgb3IgZmFjdHMgbm90IHByZXNlbnQgaW4gdGhlIHByb3ZpZGVkIHNvdXJjZXMgb3Igc2NlbmUgY29udGV4dFxuLSBOZXZlciBhc2sgXCJXaGF0IGRvIHlvdSBkbz9cIiBvciBzaW1pbGFyIHByb21wdHNcbi0gTmV2ZXIgdXNlIGJvbGQgdGV4dCBmb3IgZHJhbWF0aWMgZWZmZWN0XG5cblJFU1BPTlNFIEZPUk1BVDpcbi0gTmV1dHJhbCwgdGhpcmQtcGVyc29uLCBmYWN0dWFsIHRvbmVcbi0gUGFzdCB0ZW5zZSBmb3Igc2NlbmUgZGVzY3JpcHRpb25zLCBwcmVzZW50IHRlbnNlIGZvciB3b3JsZCBzdGF0ZVxuLSBObyByaGV0b3JpY2FsIHF1ZXN0aW9uc1xuLSBCZSBjb25jaXNlLiBPbWl0IHByZWFtYmxlLCBjb21tZW50YXJ5LCBhbmQgY2xvc2luZyByZW1hcmtzLiBGb2xsb3cgdGhlIGxlbmd0aCBpbnN0cnVjdGlvbiBpbiBlYWNoIHJlcXVlc3QuXG5cbiR7cGNzfVxuJHt0b25lfVxuJHtsYW5ndWFnZX1gLnRyaW0oKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkU3lzdGVtUHJvbXB0KGZtOiBOb3RlRnJvbnRNYXR0ZXIsIGxvbmVsb2dNb2RlOiBib29sZWFuKTogc3RyaW5nIHtcbiAgY29uc3QgYmFzZSA9IGZtLnN5c3RlbV9wcm9tcHRfb3ZlcnJpZGU/LnRyaW0oKSB8fCBidWlsZEJhc2VQcm9tcHQoZm0pO1xuICBsZXQgcHJvbXB0ID0gbG9uZWxvZ01vZGUgPyBgJHtiYXNlfVxcblxcbiR7TE9ORUxPR19TWVNURU1fQURERU5EVU19YCA6IGJhc2U7XG4gIGlmIChmbS5nYW1lX2NvbnRleHQ/LnRyaW0oKSkge1xuICAgIHByb21wdCA9IGAke3Byb21wdH1cXG5cXG5HQU1FIENPTlRFWFQ6XFxuJHtmbS5nYW1lX2NvbnRleHQudHJpbSgpfWA7XG4gIH1cbiAgcmV0dXJuIHByb21wdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkUmVxdWVzdChcbiAgZm06IE5vdGVGcm9udE1hdHRlcixcbiAgdXNlck1lc3NhZ2U6IHN0cmluZyxcbiAgc2V0dGluZ3M6IFN5YnlsU2V0dGluZ3MsXG4gIG1heE91dHB1dFRva2VucyA9IDUxMixcbiAgbm90ZUJvZHk/OiBzdHJpbmdcbik6IEdlbmVyYXRpb25SZXF1ZXN0IHtcbiAgY29uc3QgbG9uZWxvZ0FjdGl2ZSA9IGZtLmxvbmVsb2cgPz8gc2V0dGluZ3MubG9uZWxvZ01vZGU7XG5cbiAgbGV0IGNvbnRleHRCbG9jayA9IFwiXCI7XG4gIGlmIChsb25lbG9nQWN0aXZlICYmIG5vdGVCb2R5KSB7XG4gICAgLy8gSW4gTG9uZWxvZyBtb2RlIHRoZSBsaXZlIG5vdGUgYm9keSBpcyBhbHdheXMgdGhlIHNvdXJjZSBvZiB0cnV0aFxuICAgIGNvbnN0IGN0eCA9IHBhcnNlTG9uZWxvZ0NvbnRleHQobm90ZUJvZHksIHNldHRpbmdzLmxvbmVsb2dDb250ZXh0RGVwdGgpO1xuICAgIGNvbnRleHRCbG9jayA9IHNlcmlhbGl6ZUNvbnRleHQoY3R4KTtcbiAgfSBlbHNlIGlmIChmbS5zY2VuZV9jb250ZXh0Py50cmltKCkpIHtcbiAgICAvLyBGb3Igbm9uLUxvbmVsb2cgbm90ZXMsIHVzZSB0aGUgbWFudWFsbHkgbWFpbnRhaW5lZCBzY2VuZV9jb250ZXh0XG4gICAgY29udGV4dEJsb2NrID0gYFNDRU5FIENPTlRFWFQ6XFxuJHtmbS5zY2VuZV9jb250ZXh0LnRyaW0oKX1gO1xuICB9XG5cbiAgY29uc3QgY29udGV4dE1lc3NhZ2UgPSBjb250ZXh0QmxvY2sgPyBgJHtjb250ZXh0QmxvY2t9XFxuXFxuJHt1c2VyTWVzc2FnZX1gIDogdXNlck1lc3NhZ2U7XG5cbiAgcmV0dXJuIHtcbiAgICBzeXN0ZW1Qcm9tcHQ6IGJ1aWxkU3lzdGVtUHJvbXB0KGZtLCBsb25lbG9nQWN0aXZlKSxcbiAgICB1c2VyTWVzc2FnZTogY29udGV4dE1lc3NhZ2UsXG4gICAgdGVtcGVyYXR1cmU6IGZtLnRlbXBlcmF0dXJlID8/IHNldHRpbmdzLmRlZmF1bHRUZW1wZXJhdHVyZSxcbiAgICBtYXhPdXRwdXRUb2tlbnMsXG4gICAgbW9kZWw6IGZtLm1vZGVsLFxuICAgIHJlc29sdmVkU291cmNlczogW11cbiAgfTtcbn1cbiIsICJpbXBvcnQgeyBBcHAsIFRGaWxlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgeyBOb3RlRnJvbnRNYXR0ZXIsIFNvdXJjZVJlZiB9IGZyb20gXCIuL3R5cGVzXCI7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWFkRnJvbnRNYXR0ZXIoYXBwOiBBcHAsIGZpbGU6IFRGaWxlKTogUHJvbWlzZTxOb3RlRnJvbnRNYXR0ZXI+IHtcbiAgY29uc3QgY2FjaGUgPSBhcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk7XG4gIHJldHVybiAoY2FjaGU/LmZyb250bWF0dGVyIGFzIE5vdGVGcm9udE1hdHRlcikgPz8ge307XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3cml0ZUZyb250TWF0dGVyS2V5KFxuICBhcHA6IEFwcCxcbiAgZmlsZTogVEZpbGUsXG4gIGtleToga2V5b2YgTm90ZUZyb250TWF0dGVyIHwgXCJzb3VyY2VzXCIsXG4gIHZhbHVlOiB1bmtub3duXG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgYXdhaXQgYXBwLmZpbGVNYW5hZ2VyLnByb2Nlc3NGcm9udE1hdHRlcihmaWxlLCAoZm0pID0+IHtcbiAgICBmbVtrZXldID0gdmFsdWU7XG4gIH0pO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYXBwZW5kU2NlbmVDb250ZXh0KFxuICBhcHA6IEFwcCxcbiAgZmlsZTogVEZpbGUsXG4gIHRleHQ6IHN0cmluZyxcbiAgbWF4Q2hhcnMgPSAyMDAwXG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgYXdhaXQgYXBwLmZpbGVNYW5hZ2VyLnByb2Nlc3NGcm9udE1hdHRlcihmaWxlLCAoZm0pID0+IHtcbiAgICBjb25zdCBjdXJyZW50ID0gU3RyaW5nKGZtW1wic2NlbmVfY29udGV4dFwiXSA/PyBcIlwiKS50cmltKCk7XG4gICAgY29uc3QgdXBkYXRlZCA9IFtjdXJyZW50LCB0ZXh0XS5maWx0ZXIoQm9vbGVhbikuam9pbihcIlxcblwiKS50cmltKCk7XG4gICAgZm1bXCJzY2VuZV9jb250ZXh0XCJdID0gdXBkYXRlZC5sZW5ndGggPiBtYXhDaGFycyA/IFwiLi4uXCIgKyB1cGRhdGVkLnNsaWNlKC1tYXhDaGFycykgOiB1cGRhdGVkO1xuICB9KTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHVwc2VydFNvdXJjZVJlZihhcHA6IEFwcCwgZmlsZTogVEZpbGUsIHJlZjogU291cmNlUmVmKTogUHJvbWlzZTx2b2lkPiB7XG4gIGF3YWl0IGFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoZmlsZSwgKGZtKSA9PiB7XG4gICAgY29uc3QgY3VycmVudCA9IEFycmF5LmlzQXJyYXkoZm1bXCJzb3VyY2VzXCJdKSA/IFsuLi5mbVtcInNvdXJjZXNcIl1dIDogW107XG4gICAgY29uc3QgbmV4dCA9IGN1cnJlbnQuZmlsdGVyKChpdGVtOiBTb3VyY2VSZWYpID0+IGl0ZW0udmF1bHRfcGF0aCAhPT0gcmVmLnZhdWx0X3BhdGgpO1xuICAgIG5leHQucHVzaChyZWYpO1xuICAgIGZtW1wic291cmNlc1wiXSA9IG5leHQ7XG4gIH0pO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVtb3ZlU291cmNlUmVmKGFwcDogQXBwLCBmaWxlOiBURmlsZSwgcmVmOiBTb3VyY2VSZWYpOiBQcm9taXNlPHZvaWQ+IHtcbiAgYXdhaXQgYXBwLmZpbGVNYW5hZ2VyLnByb2Nlc3NGcm9udE1hdHRlcihmaWxlLCAoZm0pID0+IHtcbiAgICBjb25zdCBjdXJyZW50ID0gQXJyYXkuaXNBcnJheShmbVtcInNvdXJjZXNcIl0pID8gWy4uLmZtW1wic291cmNlc1wiXV0gOiBbXTtcbiAgICBmbVtcInNvdXJjZXNcIl0gPSBjdXJyZW50LmZpbHRlcigoaXRlbTogU291cmNlUmVmKSA9PiBpdGVtLnZhdWx0X3BhdGggIT09IHJlZi52YXVsdF9wYXRoKTtcbiAgfSk7XG59XG4iLCAiaW1wb3J0IHsgcmVxdWVzdFVybCwgUmVxdWVzdFVybFJlc3BvbnNlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQge1xuICBBbnRocm9waWNQcm92aWRlckNvbmZpZyxcbiAgR2VuZXJhdGlvblJlcXVlc3QsXG4gIEdlbmVyYXRpb25SZXNwb25zZSxcbiAgVXBsb2FkZWRGaWxlSW5mb1xufSBmcm9tIFwiLi4vdHlwZXNcIjtcbmltcG9ydCB7IEFJUHJvdmlkZXIgfSBmcm9tIFwiLi9iYXNlXCI7XG5cbmV4cG9ydCBjbGFzcyBBbnRocm9waWNQcm92aWRlciBpbXBsZW1lbnRzIEFJUHJvdmlkZXIge1xuICByZWFkb25seSBpZCA9IFwiYW50aHJvcGljXCI7XG4gIHJlYWRvbmx5IG5hbWUgPSBcIkFudGhyb3BpY1wiO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgY29uZmlnOiBBbnRocm9waWNQcm92aWRlckNvbmZpZykge31cblxuICBhc3luYyBnZW5lcmF0ZShyZXF1ZXN0OiBHZW5lcmF0aW9uUmVxdWVzdCk6IFByb21pc2U8R2VuZXJhdGlvblJlc3BvbnNlPiB7XG4gICAgdGhpcy5lbnN1cmVDb25maWd1cmVkKCk7XG4gICAgY29uc3QgbW9kZWwgPSByZXF1ZXN0Lm1vZGVsIHx8IHRoaXMuY29uZmlnLmRlZmF1bHRNb2RlbDtcbiAgICBjb25zdCBjb250ZW50OiBBcnJheTxSZWNvcmQ8c3RyaW5nLCB1bmtub3duPj4gPSBbXTtcblxuICAgIGZvciAoY29uc3Qgc291cmNlIG9mIHJlcXVlc3QucmVzb2x2ZWRTb3VyY2VzID8/IFtdKSB7XG4gICAgICBpZiAoc291cmNlLmJhc2U2NERhdGEgJiYgc291cmNlLnJlZi5taW1lX3R5cGUgPT09IFwiYXBwbGljYXRpb24vcGRmXCIpIHtcbiAgICAgICAgY29udGVudC5wdXNoKHtcbiAgICAgICAgICB0eXBlOiBcImRvY3VtZW50XCIsXG4gICAgICAgICAgc291cmNlOiB7XG4gICAgICAgICAgICB0eXBlOiBcImJhc2U2NFwiLFxuICAgICAgICAgICAgbWVkaWFfdHlwZTogc291cmNlLnJlZi5taW1lX3R5cGUsXG4gICAgICAgICAgICBkYXRhOiBzb3VyY2UuYmFzZTY0RGF0YVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKHNvdXJjZS50ZXh0Q29udGVudCkge1xuICAgICAgICBjb250ZW50LnB1c2goe1xuICAgICAgICAgIHR5cGU6IFwidGV4dFwiLFxuICAgICAgICAgIHRleHQ6IGBbU09VUkNFOiAke3NvdXJjZS5yZWYubGFiZWx9XVxcbiR7c291cmNlLnRleHRDb250ZW50fVxcbltFTkQgU09VUkNFXWBcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29udGVudC5wdXNoKHsgdHlwZTogXCJ0ZXh0XCIsIHRleHQ6IHJlcXVlc3QudXNlck1lc3NhZ2UgfSk7XG5cbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3RVcmwoe1xuICAgICAgdXJsOiBcImh0dHBzOi8vYXBpLmFudGhyb3BpYy5jb20vdjEvbWVzc2FnZXNcIixcbiAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgICBcIngtYXBpLWtleVwiOiB0aGlzLmNvbmZpZy5hcGlLZXksXG4gICAgICAgIFwiYW50aHJvcGljLXZlcnNpb25cIjogXCIyMDIzLTA2LTAxXCJcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIG1vZGVsLFxuICAgICAgICBtYXhfdG9rZW5zOiByZXF1ZXN0Lm1heE91dHB1dFRva2VucyxcbiAgICAgICAgdGVtcGVyYXR1cmU6IHJlcXVlc3QudGVtcGVyYXR1cmUsXG4gICAgICAgIHN5c3RlbTogcmVxdWVzdC5zeXN0ZW1Qcm9tcHQsXG4gICAgICAgIG1lc3NhZ2VzOiBbeyByb2xlOiBcInVzZXJcIiwgY29udGVudCB9XVxuICAgICAgfSksXG4gICAgICB0aHJvdzogZmFsc2VcbiAgICB9KTtcblxuICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPCAyMDAgfHwgcmVzcG9uc2Uuc3RhdHVzID49IDMwMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKHRoaXMuZXh0cmFjdEVycm9yKHJlc3BvbnNlKSk7XG4gICAgfVxuXG4gICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmpzb247XG4gICAgY29uc3QgdGV4dCA9IChkYXRhLmNvbnRlbnQgPz8gW10pXG4gICAgICAubWFwKChpdGVtOiB7IHRleHQ/OiBzdHJpbmcgfSkgPT4gaXRlbS50ZXh0ID8/IFwiXCIpXG4gICAgICAuam9pbihcIlwiKVxuICAgICAgLnRyaW0oKTtcbiAgICBpZiAoIXRleHQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlByb3ZpZGVyIHJldHVybmVkIGFuIGVtcHR5IHJlc3BvbnNlLlwiKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgdGV4dCxcbiAgICAgIGlucHV0VG9rZW5zOiBkYXRhLnVzYWdlPy5pbnB1dF90b2tlbnMsXG4gICAgICBvdXRwdXRUb2tlbnM6IGRhdGEudXNhZ2U/Lm91dHB1dF90b2tlbnNcbiAgICB9O1xuICB9XG5cbiAgYXN5bmMgdXBsb2FkU291cmNlKCk6IFByb21pc2U8VXBsb2FkZWRGaWxlSW5mbz4ge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkFudGhyb3BpYyBkb2VzIG5vdCBzdXBwb3J0IHBlcnNpc3RlbnQgZmlsZSB1cGxvYWQuIFVzZSB2YXVsdF9wYXRoIGluc3RlYWQuXCIpO1xuICB9XG5cbiAgYXN5bmMgbGlzdFNvdXJjZXMoKTogUHJvbWlzZTxVcGxvYWRlZEZpbGVJbmZvW10+IHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBhc3luYyBkZWxldGVTb3VyY2UoKTogUHJvbWlzZTx2b2lkPiB7fVxuXG4gIGFzeW5jIGxpc3RNb2RlbHMoKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICAgIGlmICghdGhpcy5jb25maWcuYXBpS2V5LnRyaW0oKSkgcmV0dXJuIFtdO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3RVcmwoe1xuICAgICAgICB1cmw6IFwiaHR0cHM6Ly9hcGkuYW50aHJvcGljLmNvbS92MS9tb2RlbHNcIixcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgIFwieC1hcGkta2V5XCI6IHRoaXMuY29uZmlnLmFwaUtleSxcbiAgICAgICAgICBcImFudGhyb3BpYy12ZXJzaW9uXCI6IFwiMjAyMy0wNi0wMVwiXG4gICAgICAgIH0sXG4gICAgICAgIHRocm93OiBmYWxzZVxuICAgICAgfSk7XG4gICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzIDwgMjAwIHx8IHJlc3BvbnNlLnN0YXR1cyA+PSAzMDApIHJldHVybiBbXTtcbiAgICAgIGNvbnN0IGRhdGEgPSByZXNwb25zZS5qc29uO1xuICAgICAgcmV0dXJuIChkYXRhLmRhdGEgPz8gW10pXG4gICAgICAgIC5tYXAoKG06IHsgaWQ/OiBzdHJpbmcgfSkgPT4gbS5pZCA/PyBcIlwiKVxuICAgICAgICAuZmlsdGVyKEJvb2xlYW4pO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHZhbGlkYXRlKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGlmICghdGhpcy5jb25maWcuYXBpS2V5LnRyaW0oKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCByZXF1ZXN0VXJsKHtcbiAgICAgICAgdXJsOiBcImh0dHBzOi8vYXBpLmFudGhyb3BpYy5jb20vdjEvbWVzc2FnZXNcIixcbiAgICAgICAgbWV0aG9kOiBcIlBPU1RcIixcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgICAgIFwieC1hcGkta2V5XCI6IHRoaXMuY29uZmlnLmFwaUtleSxcbiAgICAgICAgICBcImFudGhyb3BpYy12ZXJzaW9uXCI6IFwiMjAyMy0wNi0wMVwiXG4gICAgICAgIH0sXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICBtb2RlbDogdGhpcy5jb25maWcuZGVmYXVsdE1vZGVsLFxuICAgICAgICAgIG1heF90b2tlbnM6IDEsXG4gICAgICAgICAgbWVzc2FnZXM6IFt7IHJvbGU6IFwidXNlclwiLCBjb250ZW50OiBbeyB0eXBlOiBcInRleHRcIiwgdGV4dDogXCJwaW5nXCIgfV0gfV1cbiAgICAgICAgfSksXG4gICAgICAgIHRocm93OiBmYWxzZVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVzcG9uc2Uuc3RhdHVzID49IDIwMCAmJiByZXNwb25zZS5zdGF0dXMgPCAzMDA7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVDb25maWd1cmVkKCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5jb25maWcuYXBpS2V5LnRyaW0oKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm8gQW50aHJvcGljIEFQSSBrZXkgc2V0LiBDaGVjayBwbHVnaW4gc2V0dGluZ3MuXCIpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZXh0cmFjdEVycm9yKHJlc3BvbnNlOiBSZXF1ZXN0VXJsUmVzcG9uc2UpOiBzdHJpbmcge1xuICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQwMSB8fCByZXNwb25zZS5zdGF0dXMgPT09IDQwMykge1xuICAgICAgcmV0dXJuIFwiQW50aHJvcGljIEFQSSBrZXkgcmVqZWN0ZWQuIENoZWNrIHNldHRpbmdzLlwiO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmpzb247XG4gICAgICBjb25zdCBtc2cgPSBkYXRhPy5lcnJvcj8ubWVzc2FnZSA/PyBgQW50aHJvcGljIHJlcXVlc3QgZmFpbGVkICgke3Jlc3BvbnNlLnN0YXR1c30pLmA7XG4gICAgICByZXR1cm4gcmVzcG9uc2Uuc3RhdHVzID09PSA0MjkgPyBgQW50aHJvcGljIHF1b3RhL3JhdGUgZXJyb3I6ICR7bXNnfWAgOiBtc2c7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gYEFudGhyb3BpYyByZXF1ZXN0IGZhaWxlZCAoJHtyZXNwb25zZS5zdGF0dXN9KS5gO1xuICAgIH1cbiAgfVxufVxuIiwgImltcG9ydCB7IHJlcXVlc3RVcmwsIFJlcXVlc3RVcmxSZXNwb25zZSB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHtcbiAgR2VtaW5pUHJvdmlkZXJDb25maWcsXG4gIEdlbmVyYXRpb25SZXF1ZXN0LFxuICBHZW5lcmF0aW9uUmVzcG9uc2UsXG4gIFVwbG9hZGVkRmlsZUluZm9cbn0gZnJvbSBcIi4uL3R5cGVzXCI7XG5pbXBvcnQgeyBBSVByb3ZpZGVyIH0gZnJvbSBcIi4vYmFzZVwiO1xuXG5mdW5jdGlvbiBhc0Vycm9yTWVzc2FnZShlcnJvcjogdW5rbm93bik6IHN0cmluZyB7XG4gIHJldHVybiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcik7XG59XG5cbmV4cG9ydCBjbGFzcyBHZW1pbmlQcm92aWRlciBpbXBsZW1lbnRzIEFJUHJvdmlkZXIge1xuICByZWFkb25seSBpZCA9IFwiZ2VtaW5pXCI7XG4gIHJlYWRvbmx5IG5hbWUgPSBcIkdlbWluaVwiO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgY29uZmlnOiBHZW1pbmlQcm92aWRlckNvbmZpZykge31cblxuICBhc3luYyBnZW5lcmF0ZShyZXF1ZXN0OiBHZW5lcmF0aW9uUmVxdWVzdCk6IFByb21pc2U8R2VuZXJhdGlvblJlc3BvbnNlPiB7XG4gICAgdGhpcy5lbnN1cmVDb25maWd1cmVkKCk7XG4gICAgY29uc3QgbW9kZWwgPSByZXF1ZXN0Lm1vZGVsIHx8IHRoaXMuY29uZmlnLmRlZmF1bHRNb2RlbDtcbiAgICBjb25zdCBlbmRwb2ludCA9XG4gICAgICBgaHR0cHM6Ly9nZW5lcmF0aXZlbGFuZ3VhZ2UuZ29vZ2xlYXBpcy5jb20vdjFiZXRhL21vZGVscy8ke2VuY29kZVVSSUNvbXBvbmVudChtb2RlbCl9OmdlbmVyYXRlQ29udGVudD9rZXk9JHtlbmNvZGVVUklDb21wb25lbnQodGhpcy5jb25maWcuYXBpS2V5KX1gO1xuXG4gICAgY29uc3QgcGFydHM6IEFycmF5PFJlY29yZDxzdHJpbmcsIHVua25vd24+PiA9IFtdO1xuICAgIGZvciAoY29uc3Qgc291cmNlIG9mIHJlcXVlc3QucmVzb2x2ZWRTb3VyY2VzID8/IFtdKSB7XG4gICAgICBpZiAoc291cmNlLmJhc2U2NERhdGEpIHtcbiAgICAgICAgcGFydHMucHVzaCh7XG4gICAgICAgICAgaW5saW5lRGF0YToge1xuICAgICAgICAgICAgbWltZVR5cGU6IHNvdXJjZS5yZWYubWltZV90eXBlLFxuICAgICAgICAgICAgZGF0YTogc291cmNlLmJhc2U2NERhdGFcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIGlmIChzb3VyY2UudGV4dENvbnRlbnQpIHtcbiAgICAgICAgcGFydHMucHVzaCh7IHRleHQ6IGBbU09VUkNFOiAke3NvdXJjZS5yZWYubGFiZWx9XVxcbiR7c291cmNlLnRleHRDb250ZW50fVxcbltFTkQgU09VUkNFXWAgfSk7XG4gICAgICB9XG4gICAgfVxuICAgIHBhcnRzLnB1c2goeyB0ZXh0OiByZXF1ZXN0LnVzZXJNZXNzYWdlIH0pO1xuXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCByZXF1ZXN0VXJsKHtcbiAgICAgIHVybDogZW5kcG9pbnQsXG4gICAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgICAgaGVhZGVyczogeyBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIiB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBzeXN0ZW1faW5zdHJ1Y3Rpb246IHsgcGFydHM6IFt7IHRleHQ6IHJlcXVlc3Quc3lzdGVtUHJvbXB0IH1dIH0sXG4gICAgICAgIGNvbnRlbnRzOiBbeyByb2xlOiBcInVzZXJcIiwgcGFydHMgfV0sXG4gICAgICAgIGdlbmVyYXRpb25Db25maWc6IHtcbiAgICAgICAgICB0ZW1wZXJhdHVyZTogcmVxdWVzdC50ZW1wZXJhdHVyZSxcbiAgICAgICAgICBtYXhPdXRwdXRUb2tlbnM6IHJlcXVlc3QubWF4T3V0cHV0VG9rZW5zLFxuICAgICAgICAgIHRoaW5raW5nQ29uZmlnOiB7IHRoaW5raW5nQnVkZ2V0OiAwIH1cbiAgICAgICAgfVxuICAgICAgfSksXG4gICAgICB0aHJvdzogZmFsc2VcbiAgICB9KTtcblxuICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPCAyMDAgfHwgcmVzcG9uc2Uuc3RhdHVzID49IDMwMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKHRoaXMuZXh0cmFjdEVycm9yKHJlc3BvbnNlLCBcIkdlbWluaVwiKSk7XG4gICAgfVxuXG4gICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmpzb247XG4gICAgY29uc3QgdGV4dCA9IChkYXRhLmNhbmRpZGF0ZXM/LlswXT8uY29udGVudD8ucGFydHMgPz8gW10pXG4gICAgICAubWFwKChwYXJ0OiB7IHRleHQ/OiBzdHJpbmcgfSkgPT4gcGFydC50ZXh0ID8/IFwiXCIpXG4gICAgICAuam9pbihcIlwiKVxuICAgICAgLnRyaW0oKTtcblxuICAgIGlmICghdGV4dCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUHJvdmlkZXIgcmV0dXJuZWQgYW4gZW1wdHkgcmVzcG9uc2UuXCIpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB0ZXh0LFxuICAgICAgaW5wdXRUb2tlbnM6IGRhdGEudXNhZ2VNZXRhZGF0YT8ucHJvbXB0VG9rZW5Db3VudCxcbiAgICAgIG91dHB1dFRva2VuczogZGF0YS51c2FnZU1ldGFkYXRhPy5jYW5kaWRhdGVzVG9rZW5Db3VudFxuICAgIH07XG4gIH1cblxuICBhc3luYyB1cGxvYWRTb3VyY2UoKTogUHJvbWlzZTxVcGxvYWRlZEZpbGVJbmZvPiB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiVXNlICdBZGQgU291cmNlJyBmcm9tIHRoZSBub3RlIHRvIGF0dGFjaCBhIHZhdWx0IGZpbGUgaW5saW5lLlwiKTtcbiAgfVxuXG4gIGFzeW5jIGxpc3RTb3VyY2VzKCk6IFByb21pc2U8VXBsb2FkZWRGaWxlSW5mb1tdPiB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgYXN5bmMgZGVsZXRlU291cmNlKCk6IFByb21pc2U8dm9pZD4ge31cblxuICBhc3luYyBsaXN0TW9kZWxzKCk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgICBpZiAoIXRoaXMuY29uZmlnLmFwaUtleS50cmltKCkpIHJldHVybiBbXTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCByZXF1ZXN0VXJsKHtcbiAgICAgICAgdXJsOiBgaHR0cHM6Ly9nZW5lcmF0aXZlbGFuZ3VhZ2UuZ29vZ2xlYXBpcy5jb20vdjFiZXRhL21vZGVscz9rZXk9JHtlbmNvZGVVUklDb21wb25lbnQodGhpcy5jb25maWcuYXBpS2V5KX1gLFxuICAgICAgICB0aHJvdzogZmFsc2VcbiAgICAgIH0pO1xuICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA8IDIwMCB8fCByZXNwb25zZS5zdGF0dXMgPj0gMzAwKSByZXR1cm4gW107XG4gICAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuanNvbjtcbiAgICAgIHJldHVybiAoZGF0YS5tb2RlbHMgPz8gW10pXG4gICAgICAgIC5maWx0ZXIoKG06IHsgc3VwcG9ydGVkR2VuZXJhdGlvbk1ldGhvZHM/OiBzdHJpbmdbXSB9KSA9PlxuICAgICAgICAgIG0uc3VwcG9ydGVkR2VuZXJhdGlvbk1ldGhvZHM/LmluY2x1ZGVzKFwiZ2VuZXJhdGVDb250ZW50XCIpKVxuICAgICAgICAubWFwKChtOiB7IG5hbWU/OiBzdHJpbmcgfSkgPT4gKG0ubmFtZSA/PyBcIlwiKS5yZXBsYWNlKC9ebW9kZWxzXFwvLywgXCJcIikpXG4gICAgICAgIC5maWx0ZXIoQm9vbGVhbik7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgdmFsaWRhdGUoKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgaWYgKCF0aGlzLmNvbmZpZy5hcGlLZXkudHJpbSgpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3RVcmwoe1xuICAgICAgICB1cmw6IGBodHRwczovL2dlbmVyYXRpdmVsYW5ndWFnZS5nb29nbGVhcGlzLmNvbS92MWJldGEvbW9kZWxzP2tleT0ke2VuY29kZVVSSUNvbXBvbmVudCh0aGlzLmNvbmZpZy5hcGlLZXkpfWAsXG4gICAgICAgIHRocm93OiBmYWxzZVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVzcG9uc2Uuc3RhdHVzID49IDIwMCAmJiByZXNwb25zZS5zdGF0dXMgPCAzMDA7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVDb25maWd1cmVkKCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5jb25maWcuYXBpS2V5LnRyaW0oKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm8gR2VtaW5pIEFQSSBrZXkgc2V0LiBDaGVjayBwbHVnaW4gc2V0dGluZ3MuXCIpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZXh0cmFjdEVycm9yKHJlc3BvbnNlOiBSZXF1ZXN0VXJsUmVzcG9uc2UsIHByb3ZpZGVyTmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0MDEgfHwgcmVzcG9uc2Uuc3RhdHVzID09PSA0MDMpIHtcbiAgICAgIHJldHVybiBgJHtwcm92aWRlck5hbWV9IEFQSSBrZXkgcmVqZWN0ZWQuIENoZWNrIHNldHRpbmdzLmA7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuanNvbjtcbiAgICAgIGNvbnN0IG1zZyA9IGRhdGE/LmVycm9yPy5tZXNzYWdlID8/IGAke3Byb3ZpZGVyTmFtZX0gcmVxdWVzdCBmYWlsZWQgKCR7cmVzcG9uc2Uuc3RhdHVzfSkuYDtcbiAgICAgIHJldHVybiByZXNwb25zZS5zdGF0dXMgPT09IDQyOSA/IGAke3Byb3ZpZGVyTmFtZX0gcXVvdGEvcmF0ZSBlcnJvcjogJHttc2d9YCA6IG1zZztcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgcmV0dXJuIGFzRXJyb3JNZXNzYWdlKGVycm9yKSB8fCBgJHtwcm92aWRlck5hbWV9IHJlcXVlc3QgZmFpbGVkICgke3Jlc3BvbnNlLnN0YXR1c30pLmA7XG4gICAgfVxuICB9XG59XG4iLCAiaW1wb3J0IHsgcmVxdWVzdFVybCwgUmVxdWVzdFVybFJlc3BvbnNlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQge1xuICBHZW5lcmF0aW9uUmVxdWVzdCxcbiAgR2VuZXJhdGlvblJlc3BvbnNlLFxuICBPbGxhbWFQcm92aWRlckNvbmZpZyxcbiAgVXBsb2FkZWRGaWxlSW5mb1xufSBmcm9tIFwiLi4vdHlwZXNcIjtcbmltcG9ydCB7IHRydW5jYXRlU291cmNlVGV4dCB9IGZyb20gXCIuLi9zb3VyY2VVdGlsc1wiO1xuaW1wb3J0IHsgQUlQcm92aWRlciB9IGZyb20gXCIuL2Jhc2VcIjtcblxuaW50ZXJmYWNlIE9sbGFtYVRhZ3NSZXNwb25zZSB7XG4gIG1vZGVscz86IEFycmF5PHsgbmFtZT86IHN0cmluZyB9Pjtcbn1cblxuZXhwb3J0IGNsYXNzIE9sbGFtYVByb3ZpZGVyIGltcGxlbWVudHMgQUlQcm92aWRlciB7XG4gIHJlYWRvbmx5IGlkID0gXCJvbGxhbWFcIjtcbiAgcmVhZG9ubHkgbmFtZSA9IFwiT2xsYW1hXCI7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBjb25maWc6IE9sbGFtYVByb3ZpZGVyQ29uZmlnKSB7fVxuXG4gIGFzeW5jIGdlbmVyYXRlKHJlcXVlc3Q6IEdlbmVyYXRpb25SZXF1ZXN0KTogUHJvbWlzZTxHZW5lcmF0aW9uUmVzcG9uc2U+IHtcbiAgICBjb25zdCBiYXNlVXJsID0gdGhpcy5jb25maWcuYmFzZVVybC5yZXBsYWNlKC9cXC8kLywgXCJcIik7XG4gICAgY29uc3QgbW9kZWwgPSByZXF1ZXN0Lm1vZGVsIHx8IHRoaXMuY29uZmlnLmRlZmF1bHRNb2RlbDtcbiAgICBjb25zdCBzb3VyY2VCbG9ja3MgPSAocmVxdWVzdC5yZXNvbHZlZFNvdXJjZXMgPz8gW10pXG4gICAgICAuZmlsdGVyKChzb3VyY2UpID0+IHNvdXJjZS50ZXh0Q29udGVudClcbiAgICAgIC5tYXAoKHNvdXJjZSkgPT4gYFtTT1VSQ0U6ICR7c291cmNlLnJlZi5sYWJlbH1dXFxuJHt0cnVuY2F0ZVNvdXJjZVRleHQoc291cmNlLnRleHRDb250ZW50ID8/IFwiXCIpfVxcbltFTkQgU09VUkNFXWApO1xuXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCByZXF1ZXN0VXJsKHtcbiAgICAgIHVybDogYCR7YmFzZVVybH0vYXBpL2NoYXRgLFxuICAgICAgbWV0aG9kOiBcIlBPU1RcIixcbiAgICAgIGhlYWRlcnM6IHsgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgbW9kZWwsXG4gICAgICAgIHN0cmVhbTogZmFsc2UsXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICB0ZW1wZXJhdHVyZTogcmVxdWVzdC50ZW1wZXJhdHVyZSxcbiAgICAgICAgICBudW1fcHJlZGljdDogcmVxdWVzdC5tYXhPdXRwdXRUb2tlbnNcbiAgICAgICAgfSxcbiAgICAgICAgbWVzc2FnZXM6IFtcbiAgICAgICAgICB7IHJvbGU6IFwic3lzdGVtXCIsIGNvbnRlbnQ6IHJlcXVlc3Quc3lzdGVtUHJvbXB0IH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgcm9sZTogXCJ1c2VyXCIsXG4gICAgICAgICAgICBjb250ZW50OiBzb3VyY2VCbG9ja3MubGVuZ3RoXG4gICAgICAgICAgICAgID8gYCR7c291cmNlQmxvY2tzLmpvaW4oXCJcXG5cXG5cIil9XFxuXFxuJHtyZXF1ZXN0LnVzZXJNZXNzYWdlfWBcbiAgICAgICAgICAgICAgOiByZXF1ZXN0LnVzZXJNZXNzYWdlXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9KSxcbiAgICAgIHRocm93OiBmYWxzZVxuICAgIH0pO1xuXG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA8IDIwMCB8fCByZXNwb25zZS5zdGF0dXMgPj0gMzAwKSB7XG4gICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0MDQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBNb2RlbCAnJHttb2RlbH0nIG5vdCBmb3VuZCBpbiBPbGxhbWEuIENoZWNrIGF2YWlsYWJsZSBtb2RlbHMgaW4gc2V0dGluZ3MuYCk7XG4gICAgICB9XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE9sbGFtYSBub3QgcmVhY2hhYmxlIGF0ICR7YmFzZVVybH0uIElzIGl0IHJ1bm5pbmc/YCk7XG4gICAgfVxuXG4gICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmpzb247XG4gICAgY29uc3QgdGV4dCA9IGRhdGEubWVzc2FnZT8uY29udGVudD8udHJpbT8uKCkgPz8gXCJcIjtcbiAgICBpZiAoIXRleHQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlByb3ZpZGVyIHJldHVybmVkIGFuIGVtcHR5IHJlc3BvbnNlLlwiKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgdGV4dCxcbiAgICAgIGlucHV0VG9rZW5zOiBkYXRhLnByb21wdF9ldmFsX2NvdW50LFxuICAgICAgb3V0cHV0VG9rZW5zOiBkYXRhLmV2YWxfY291bnRcbiAgICB9O1xuICB9XG5cbiAgYXN5bmMgdXBsb2FkU291cmNlKCk6IFByb21pc2U8VXBsb2FkZWRGaWxlSW5mbz4ge1xuICAgIHRocm93IG5ldyBFcnJvcihcIk9sbGFtYSBkb2VzIG5vdCBzdXBwb3J0IGZpbGUgdXBsb2FkLiBBZGQgYSB2YXVsdF9wYXRoIHNvdXJjZSBpbnN0ZWFkLlwiKTtcbiAgfVxuXG4gIGFzeW5jIGxpc3RTb3VyY2VzKCk6IFByb21pc2U8VXBsb2FkZWRGaWxlSW5mb1tdPiB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgYXN5bmMgZGVsZXRlU291cmNlKCk6IFByb21pc2U8dm9pZD4ge31cblxuICBhc3luYyB2YWxpZGF0ZSgpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgdGFncyA9IGF3YWl0IHRoaXMuZmV0Y2hUYWdzKCk7XG4gICAgICByZXR1cm4gQm9vbGVhbih0YWdzLm1vZGVscz8ubGVuZ3RoKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBsaXN0TW9kZWxzKCk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgICBjb25zdCB0YWdzID0gYXdhaXQgdGhpcy5mZXRjaFRhZ3MoKTtcbiAgICByZXR1cm4gKHRhZ3MubW9kZWxzID8/IFtdKS5tYXAoKG1vZGVsKSA9PiBtb2RlbC5uYW1lID8/IFwiXCIpLmZpbHRlcihCb29sZWFuKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZmV0Y2hUYWdzKCk6IFByb21pc2U8T2xsYW1hVGFnc1Jlc3BvbnNlPiB7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCByZXF1ZXN0VXJsKHtcbiAgICAgIHVybDogYCR7dGhpcy5jb25maWcuYmFzZVVybC5yZXBsYWNlKC9cXC8kLywgXCJcIil9L2FwaS90YWdzYCxcbiAgICAgIHRocm93OiBmYWxzZVxuICAgIH0pO1xuICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPCAyMDAgfHwgcmVzcG9uc2Uuc3RhdHVzID49IDMwMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBPbGxhbWEgbm90IHJlYWNoYWJsZSBhdCAke3RoaXMuY29uZmlnLmJhc2VVcmx9LiBJcyBpdCBydW5uaW5nP2ApO1xuICAgIH1cbiAgICByZXR1cm4gcmVzcG9uc2UuanNvbiBhcyBPbGxhbWFUYWdzUmVzcG9uc2U7XG4gIH1cbn1cbiIsICJpbXBvcnQgeyBBcHAsIFRBYnN0cmFjdEZpbGUsIFRGaWxlLCBub3JtYWxpemVQYXRoIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgeyBQcm92aWRlcklELCBSZXNvbHZlZFNvdXJjZSwgU291cmNlUmVmIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuY29uc3QgVEVYVF9FWFRFTlNJT05TID0gbmV3IFNldChbXCJ0eHRcIiwgXCJtZFwiLCBcIm1hcmtkb3duXCIsIFwianNvblwiLCBcInlhbWxcIiwgXCJ5bWxcIiwgXCJjc3ZcIl0pO1xuXG5mdW5jdGlvbiBnZXRWYXVsdEZpbGUoYXBwOiBBcHAsIHZhdWx0UGF0aDogc3RyaW5nKTogVEZpbGUge1xuICBjb25zdCBub3JtYWxpemVkID0gbm9ybWFsaXplUGF0aCh2YXVsdFBhdGgpO1xuICBjb25zdCBmaWxlID0gYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChub3JtYWxpemVkKTtcbiAgaWYgKCEoZmlsZSBpbnN0YW5jZW9mIFRGaWxlKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgU291cmNlIGZpbGUgbm90IGZvdW5kIGluIHZhdWx0OiAke3ZhdWx0UGF0aH1gKTtcbiAgfVxuICByZXR1cm4gZmlsZTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlYWRWYXVsdFRleHRTb3VyY2UoYXBwOiBBcHAsIHZhdWx0UGF0aDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgZmlsZSA9IGdldFZhdWx0RmlsZShhcHAsIHZhdWx0UGF0aCk7XG4gIGNvbnN0IGV4dGVuc2lvbiA9IGZpbGUuZXh0ZW5zaW9uLnRvTG93ZXJDYXNlKCk7XG4gIGlmICghVEVYVF9FWFRFTlNJT05TLmhhcyhleHRlbnNpb24pKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBUZXh0IGV4dHJhY3Rpb24gaXMgb25seSBzdXBwb3J0ZWQgZm9yIHRleHQgZmlsZXMuIEFkZCBhIC50eHQgY29tcGFuaW9uIGZvciAnJHt2YXVsdFBhdGh9Jy5gKTtcbiAgfVxuICByZXR1cm4gYXBwLnZhdWx0LmNhY2hlZFJlYWQoZmlsZSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWFkVmF1bHRCaW5hcnlTb3VyY2UoYXBwOiBBcHAsIHZhdWx0UGF0aDogc3RyaW5nKTogUHJvbWlzZTxBcnJheUJ1ZmZlcj4ge1xuICBjb25zdCBmaWxlID0gZ2V0VmF1bHRGaWxlKGFwcCwgdmF1bHRQYXRoKTtcbiAgcmV0dXJuIGFwcC52YXVsdC5yZWFkQmluYXJ5KGZpbGUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXJyYXlCdWZmZXJUb0Jhc2U2NChidWZmZXI6IEFycmF5QnVmZmVyKTogc3RyaW5nIHtcbiAgbGV0IGJpbmFyeSA9IFwiXCI7XG4gIGNvbnN0IGJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkoYnVmZmVyKTtcbiAgY29uc3QgY2h1bmtTaXplID0gMHg4MDAwO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgaSArPSBjaHVua1NpemUpIHtcbiAgICBjb25zdCBjaHVuayA9IGJ5dGVzLnN1YmFycmF5KGksIGkgKyBjaHVua1NpemUpO1xuICAgIGJpbmFyeSArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKC4uLmNodW5rKTtcbiAgfVxuICByZXR1cm4gYnRvYShiaW5hcnkpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzb2x2ZVNvdXJjZXNGb3JSZXF1ZXN0KFxuICBhcHA6IEFwcCxcbiAgc291cmNlczogU291cmNlUmVmW10sXG4gIHByb3ZpZGVySWQ6IFByb3ZpZGVySURcbik6IFByb21pc2U8UmVzb2x2ZWRTb3VyY2VbXT4ge1xuICBjb25zdCByZXNvbHZlZDogUmVzb2x2ZWRTb3VyY2VbXSA9IFtdO1xuICBmb3IgKGNvbnN0IHJlZiBvZiBzb3VyY2VzKSB7XG4gICAgaWYgKHByb3ZpZGVySWQgPT09IFwiYW50aHJvcGljXCIgfHwgKHByb3ZpZGVySWQgPT09IFwiZ2VtaW5pXCIgJiYgcmVmLm1pbWVfdHlwZSA9PT0gXCJhcHBsaWNhdGlvbi9wZGZcIikpIHtcbiAgICAgIGNvbnN0IGJ1ZmZlciA9IGF3YWl0IHJlYWRWYXVsdEJpbmFyeVNvdXJjZShhcHAsIHJlZi52YXVsdF9wYXRoKTtcbiAgICAgIHJlc29sdmVkLnB1c2goeyByZWYsIGJhc2U2NERhdGE6IGFycmF5QnVmZmVyVG9CYXNlNjQoYnVmZmVyKSB9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBjb25zdCB0ZXh0ID0gYXdhaXQgcmVhZFZhdWx0VGV4dFNvdXJjZShhcHAsIHJlZi52YXVsdF9wYXRoKTtcbiAgICByZXNvbHZlZC5wdXNoKHsgcmVmLCB0ZXh0Q29udGVudDogdGV4dCB9KTtcbiAgfVxuICByZXR1cm4gcmVzb2x2ZWQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0cnVuY2F0ZVNvdXJjZVRleHQodGV4dDogc3RyaW5nLCBtYXhDaGFycyA9IDQwMDApOiBzdHJpbmcge1xuICByZXR1cm4gdGV4dC5sZW5ndGggPD0gbWF4Q2hhcnMgPyB0ZXh0IDogdGV4dC5zbGljZSgwLCBtYXhDaGFycyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXNjcmliZVNvdXJjZVJlZihyZWY6IFNvdXJjZVJlZik6IHN0cmluZyB7XG4gIHJldHVybiByZWYudmF1bHRfcGF0aDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGxpc3RWYXVsdENhbmRpZGF0ZUZpbGVzKGFwcDogQXBwKTogVEZpbGVbXSB7XG4gIHJldHVybiBhcHAudmF1bHRcbiAgICAuZ2V0RmlsZXMoKVxuICAgIC5maWx0ZXIoKGZpbGUpID0+IFtcInBkZlwiLCBcInR4dFwiLCBcIm1kXCIsIFwibWFya2Rvd25cIl0uaW5jbHVkZXMoZmlsZS5leHRlbnNpb24udG9Mb3dlckNhc2UoKSkpXG4gICAgLnNvcnQoKGEsIGIpID0+IGEucGF0aC5sb2NhbGVDb21wYXJlKGIucGF0aCkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNURmlsZShmaWxlOiBUQWJzdHJhY3RGaWxlIHwgbnVsbCk6IGZpbGUgaXMgVEZpbGUge1xuICByZXR1cm4gQm9vbGVhbihmaWxlKSAmJiBmaWxlIGluc3RhbmNlb2YgVEZpbGU7XG59XG4iLCAiaW1wb3J0IHsgcmVxdWVzdFVybCwgUmVxdWVzdFVybFJlc3BvbnNlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQge1xuICBHZW5lcmF0aW9uUmVxdWVzdCxcbiAgR2VuZXJhdGlvblJlc3BvbnNlLFxuICBPcGVuQUlQcm92aWRlckNvbmZpZyxcbiAgVXBsb2FkZWRGaWxlSW5mb1xufSBmcm9tIFwiLi4vdHlwZXNcIjtcbmltcG9ydCB7IHRydW5jYXRlU291cmNlVGV4dCB9IGZyb20gXCIuLi9zb3VyY2VVdGlsc1wiO1xuaW1wb3J0IHsgQUlQcm92aWRlciB9IGZyb20gXCIuL2Jhc2VcIjtcblxuZXhwb3J0IGNsYXNzIE9wZW5BSVByb3ZpZGVyIGltcGxlbWVudHMgQUlQcm92aWRlciB7XG4gIHJlYWRvbmx5IGlkID0gXCJvcGVuYWlcIjtcbiAgcmVhZG9ubHkgbmFtZSA9IFwiT3BlbkFJXCI7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBjb25maWc6IE9wZW5BSVByb3ZpZGVyQ29uZmlnKSB7fVxuXG4gIGFzeW5jIGdlbmVyYXRlKHJlcXVlc3Q6IEdlbmVyYXRpb25SZXF1ZXN0KTogUHJvbWlzZTxHZW5lcmF0aW9uUmVzcG9uc2U+IHtcbiAgICB0aGlzLmVuc3VyZUNvbmZpZ3VyZWQoKTtcbiAgICBjb25zdCBiYXNlVXJsID0gdGhpcy5jb25maWcuYmFzZVVybC5yZXBsYWNlKC9cXC8kLywgXCJcIik7XG4gICAgY29uc3QgbW9kZWwgPSByZXF1ZXN0Lm1vZGVsIHx8IHRoaXMuY29uZmlnLmRlZmF1bHRNb2RlbDtcbiAgICBjb25zdCBzb3VyY2VCbG9ja3MgPSAocmVxdWVzdC5yZXNvbHZlZFNvdXJjZXMgPz8gW10pXG4gICAgICAuZmlsdGVyKChzb3VyY2UpID0+IHNvdXJjZS50ZXh0Q29udGVudClcbiAgICAgIC5tYXAoKHNvdXJjZSkgPT4gYFtTT1VSQ0U6ICR7c291cmNlLnJlZi5sYWJlbH1dXFxuJHt0cnVuY2F0ZVNvdXJjZVRleHQoc291cmNlLnRleHRDb250ZW50ID8/IFwiXCIpfVxcbltFTkQgU09VUkNFXWApO1xuXG4gICAgY29uc3QgYm9keTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7XG4gICAgICBtb2RlbCxcbiAgICAgIG1heF90b2tlbnM6IHJlcXVlc3QubWF4T3V0cHV0VG9rZW5zLFxuICAgICAgbWVzc2FnZXM6IFtcbiAgICAgICAgeyByb2xlOiBcInN5c3RlbVwiLCBjb250ZW50OiByZXF1ZXN0LnN5c3RlbVByb21wdCB9LFxuICAgICAgICB7XG4gICAgICAgICAgcm9sZTogXCJ1c2VyXCIsXG4gICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0eXBlOiBcInRleHRcIixcbiAgICAgICAgICAgICAgdGV4dDogc291cmNlQmxvY2tzLmxlbmd0aFxuICAgICAgICAgICAgICAgID8gYCR7c291cmNlQmxvY2tzLmpvaW4oXCJcXG5cXG5cIil9XFxuXFxuJHtyZXF1ZXN0LnVzZXJNZXNzYWdlfWBcbiAgICAgICAgICAgICAgICA6IHJlcXVlc3QudXNlck1lc3NhZ2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9O1xuXG4gICAgaWYgKCFtb2RlbC5zdGFydHNXaXRoKFwiZ3B0LTVcIikpIHtcbiAgICAgIGJvZHkudGVtcGVyYXR1cmUgPSByZXF1ZXN0LnRlbXBlcmF0dXJlO1xuICAgIH1cblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICB1cmw6IGAke2Jhc2VVcmx9L2NoYXQvY29tcGxldGlvbnNgLFxuICAgICAgbWV0aG9kOiBcIlBPU1RcIixcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgIEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHt0aGlzLmNvbmZpZy5hcGlLZXl9YFxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KGJvZHkpLFxuICAgICAgdGhyb3c6IGZhbHNlXG4gICAgfSk7XG5cbiAgICBpZiAocmVzcG9uc2Uuc3RhdHVzIDwgMjAwIHx8IHJlc3BvbnNlLnN0YXR1cyA+PSAzMDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcih0aGlzLmV4dHJhY3RFcnJvcihyZXNwb25zZSkpO1xuICAgIH1cblxuICAgIGNvbnN0IGRhdGEgPSByZXNwb25zZS5qc29uO1xuICAgIGNvbnN0IHRleHQgPSBkYXRhLmNob2ljZXM/LlswXT8ubWVzc2FnZT8uY29udGVudD8udHJpbT8uKCkgPz8gXCJcIjtcbiAgICBpZiAoIXRleHQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlByb3ZpZGVyIHJldHVybmVkIGFuIGVtcHR5IHJlc3BvbnNlLlwiKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgdGV4dCxcbiAgICAgIGlucHV0VG9rZW5zOiBkYXRhLnVzYWdlPy5wcm9tcHRfdG9rZW5zLFxuICAgICAgb3V0cHV0VG9rZW5zOiBkYXRhLnVzYWdlPy5jb21wbGV0aW9uX3Rva2Vuc1xuICAgIH07XG4gIH1cblxuICBhc3luYyB1cGxvYWRTb3VyY2UoKTogUHJvbWlzZTxVcGxvYWRlZEZpbGVJbmZvPiB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiVGhpcyBwcm92aWRlciBkb2VzIG5vdCBzdXBwb3J0IGZpbGUgdXBsb2FkLiBVc2UgdmF1bHRfcGF0aCBpbnN0ZWFkLlwiKTtcbiAgfVxuXG4gIGFzeW5jIGxpc3RTb3VyY2VzKCk6IFByb21pc2U8VXBsb2FkZWRGaWxlSW5mb1tdPiB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgYXN5bmMgZGVsZXRlU291cmNlKCk6IFByb21pc2U8dm9pZD4ge31cblxuICBhc3luYyBsaXN0TW9kZWxzKCk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgICBpZiAoIXRoaXMuY29uZmlnLmFwaUtleS50cmltKCkpIHJldHVybiBbXTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCByZXF1ZXN0VXJsKHtcbiAgICAgICAgdXJsOiBgJHt0aGlzLmNvbmZpZy5iYXNlVXJsLnJlcGxhY2UoL1xcLyQvLCBcIlwiKX0vbW9kZWxzYCxcbiAgICAgICAgaGVhZGVyczogeyBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7dGhpcy5jb25maWcuYXBpS2V5fWAgfSxcbiAgICAgICAgdGhyb3c6IGZhbHNlXG4gICAgICB9KTtcbiAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPCAyMDAgfHwgcmVzcG9uc2Uuc3RhdHVzID49IDMwMCkgcmV0dXJuIFtdO1xuICAgICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmpzb247XG4gICAgICBjb25zdCBFWENMVURFID0gW1wiZW1iZWRkaW5nXCIsIFwid2hpc3BlclwiLCBcInR0c1wiLCBcImRhbGwtZVwiLCBcIm1vZGVyYXRpb25cIiwgXCJ0ZXh0LXNlYXJjaFwiLCBcInRleHQtc2ltaWxhcml0eVwiXTtcbiAgICAgIHJldHVybiAoZGF0YS5kYXRhID8/IFtdKVxuICAgICAgICAubWFwKChtOiB7IGlkPzogc3RyaW5nIH0pID0+IG0uaWQgPz8gXCJcIilcbiAgICAgICAgLmZpbHRlcigoaWQ6IHN0cmluZykgPT4gaWQgJiYgIUVYQ0xVREUuc29tZSgoZXgpID0+IGlkLmluY2x1ZGVzKGV4KSkpXG4gICAgICAgIC5zb3J0KCk7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgdmFsaWRhdGUoKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgaWYgKCF0aGlzLmNvbmZpZy5hcGlLZXkudHJpbSgpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3RVcmwoe1xuICAgICAgICB1cmw6IGAke3RoaXMuY29uZmlnLmJhc2VVcmwucmVwbGFjZSgvXFwvJC8sIFwiXCIpfS9tb2RlbHNgLFxuICAgICAgICBoZWFkZXJzOiB7IEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHt0aGlzLmNvbmZpZy5hcGlLZXl9YCB9LFxuICAgICAgICB0aHJvdzogZmFsc2VcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLnN0YXR1cyA+PSAyMDAgJiYgcmVzcG9uc2Uuc3RhdHVzIDwgMzAwO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZW5zdXJlQ29uZmlndXJlZCgpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuY29uZmlnLmFwaUtleS50cmltKCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vIE9wZW5BSSBBUEkga2V5IHNldC4gQ2hlY2sgcGx1Z2luIHNldHRpbmdzLlwiKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGV4dHJhY3RFcnJvcihyZXNwb25zZTogUmVxdWVzdFVybFJlc3BvbnNlKTogc3RyaW5nIHtcbiAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0MDEgfHwgcmVzcG9uc2Uuc3RhdHVzID09PSA0MDMpIHtcbiAgICAgIHJldHVybiBcIk9wZW5BSSBBUEkga2V5IHJlamVjdGVkLiBDaGVjayBzZXR0aW5ncy5cIjtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGRhdGEgPSByZXNwb25zZS5qc29uO1xuICAgICAgY29uc3QgbXNnID0gZGF0YT8uZXJyb3I/Lm1lc3NhZ2UgPz8gYE9wZW5BSSByZXF1ZXN0IGZhaWxlZCAoJHtyZXNwb25zZS5zdGF0dXN9KS5gO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLnN0YXR1cyA9PT0gNDI5ID8gYE9wZW5BSSBxdW90YS9yYXRlIGVycm9yOiAke21zZ31gIDogbXNnO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIGBPcGVuQUkgcmVxdWVzdCBmYWlsZWQgKCR7cmVzcG9uc2Uuc3RhdHVzfSkuYDtcbiAgICB9XG4gIH1cbn1cbiIsICJpbXBvcnQgeyByZXF1ZXN0VXJsLCBSZXF1ZXN0VXJsUmVzcG9uc2UgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7XG4gIEdlbmVyYXRpb25SZXF1ZXN0LFxuICBHZW5lcmF0aW9uUmVzcG9uc2UsXG4gIE9wZW5Sb3V0ZXJQcm92aWRlckNvbmZpZyxcbiAgVXBsb2FkZWRGaWxlSW5mb1xufSBmcm9tIFwiLi4vdHlwZXNcIjtcbmltcG9ydCB7IHRydW5jYXRlU291cmNlVGV4dCB9IGZyb20gXCIuLi9zb3VyY2VVdGlsc1wiO1xuaW1wb3J0IHsgQUlQcm92aWRlciB9IGZyb20gXCIuL2Jhc2VcIjtcblxuY29uc3QgQkFTRV9VUkwgPSBcImh0dHBzOi8vb3BlbnJvdXRlci5haS9hcGkvdjFcIjtcblxuZnVuY3Rpb24gYXNFcnJvck1lc3NhZ2UoZXJyb3I6IHVua25vd24pOiBzdHJpbmcge1xuICByZXR1cm4gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpO1xufVxuXG5leHBvcnQgY2xhc3MgT3BlblJvdXRlclByb3ZpZGVyIGltcGxlbWVudHMgQUlQcm92aWRlciB7XG4gIHJlYWRvbmx5IGlkID0gXCJvcGVucm91dGVyXCI7XG4gIHJlYWRvbmx5IG5hbWUgPSBcIk9wZW5Sb3V0ZXJcIjtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IGNvbmZpZzogT3BlblJvdXRlclByb3ZpZGVyQ29uZmlnKSB7fVxuXG4gIGFzeW5jIGdlbmVyYXRlKHJlcXVlc3Q6IEdlbmVyYXRpb25SZXF1ZXN0KTogUHJvbWlzZTxHZW5lcmF0aW9uUmVzcG9uc2U+IHtcbiAgICB0aGlzLmVuc3VyZUNvbmZpZ3VyZWQoKTtcbiAgICBjb25zdCBtb2RlbCA9IHJlcXVlc3QubW9kZWwgfHwgdGhpcy5jb25maWcuZGVmYXVsdE1vZGVsO1xuICAgIGNvbnN0IHNvdXJjZUJsb2NrcyA9IChyZXF1ZXN0LnJlc29sdmVkU291cmNlcyA/PyBbXSlcbiAgICAgIC5maWx0ZXIoKHNvdXJjZSkgPT4gc291cmNlLnRleHRDb250ZW50KVxuICAgICAgLm1hcCgoc291cmNlKSA9PiBgW1NPVVJDRTogJHtzb3VyY2UucmVmLmxhYmVsfV1cXG4ke3RydW5jYXRlU291cmNlVGV4dChzb3VyY2UudGV4dENvbnRlbnQgPz8gXCJcIil9XFxuW0VORCBTT1VSQ0VdYCk7XG5cbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3RVcmwoe1xuICAgICAgdXJsOiBgJHtCQVNFX1VSTH0vY2hhdC9jb21wbGV0aW9uc2AsXG4gICAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgXCJBdXRob3JpemF0aW9uXCI6IGBCZWFyZXIgJHt0aGlzLmNvbmZpZy5hcGlLZXl9YCxcbiAgICAgICAgXCJIVFRQLVJlZmVyZXJcIjogXCJvYnNpZGlhbi1zeWJ5bFwiLFxuICAgICAgICBcIlgtVGl0bGVcIjogXCJTeWJ5bFwiXG4gICAgICB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBtb2RlbCxcbiAgICAgICAgbWF4X3Rva2VuczogcmVxdWVzdC5tYXhPdXRwdXRUb2tlbnMsXG4gICAgICAgIHRlbXBlcmF0dXJlOiByZXF1ZXN0LnRlbXBlcmF0dXJlLFxuICAgICAgICBtZXNzYWdlczogW1xuICAgICAgICAgIHsgcm9sZTogXCJzeXN0ZW1cIiwgY29udGVudDogcmVxdWVzdC5zeXN0ZW1Qcm9tcHQgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICByb2xlOiBcInVzZXJcIixcbiAgICAgICAgICAgIGNvbnRlbnQ6IHNvdXJjZUJsb2Nrcy5sZW5ndGhcbiAgICAgICAgICAgICAgPyBgJHtzb3VyY2VCbG9ja3Muam9pbihcIlxcblxcblwiKX1cXG5cXG4ke3JlcXVlc3QudXNlck1lc3NhZ2V9YFxuICAgICAgICAgICAgICA6IHJlcXVlc3QudXNlck1lc3NhZ2VcbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH0pLFxuICAgICAgdGhyb3c6IGZhbHNlXG4gICAgfSk7XG5cbiAgICBpZiAocmVzcG9uc2Uuc3RhdHVzIDwgMjAwIHx8IHJlc3BvbnNlLnN0YXR1cyA+PSAzMDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcih0aGlzLmV4dHJhY3RFcnJvcihyZXNwb25zZSkpO1xuICAgIH1cblxuICAgIGNvbnN0IGRhdGEgPSByZXNwb25zZS5qc29uO1xuICAgIGNvbnN0IHRleHQgPSBkYXRhLmNob2ljZXM/LlswXT8ubWVzc2FnZT8uY29udGVudD8udHJpbT8uKCkgPz8gXCJcIjtcbiAgICBpZiAoIXRleHQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlByb3ZpZGVyIHJldHVybmVkIGFuIGVtcHR5IHJlc3BvbnNlLlwiKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgdGV4dCxcbiAgICAgIGlucHV0VG9rZW5zOiBkYXRhLnVzYWdlPy5wcm9tcHRfdG9rZW5zLFxuICAgICAgb3V0cHV0VG9rZW5zOiBkYXRhLnVzYWdlPy5jb21wbGV0aW9uX3Rva2Vuc1xuICAgIH07XG4gIH1cblxuICBhc3luYyB1cGxvYWRTb3VyY2UoKTogUHJvbWlzZTxVcGxvYWRlZEZpbGVJbmZvPiB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiT3BlblJvdXRlciBkb2VzIG5vdCBzdXBwb3J0IGZpbGUgdXBsb2FkLiBVc2UgdmF1bHRfcGF0aCBpbnN0ZWFkLlwiKTtcbiAgfVxuXG4gIGFzeW5jIGxpc3RTb3VyY2VzKCk6IFByb21pc2U8VXBsb2FkZWRGaWxlSW5mb1tdPiB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgYXN5bmMgZGVsZXRlU291cmNlKCk6IFByb21pc2U8dm9pZD4ge31cblxuICBhc3luYyBsaXN0TW9kZWxzKCk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgICBpZiAoIXRoaXMuY29uZmlnLmFwaUtleS50cmltKCkpIHJldHVybiBbXTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCByZXF1ZXN0VXJsKHtcbiAgICAgICAgdXJsOiBgJHtCQVNFX1VSTH0vbW9kZWxzYCxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgIFwiQXV0aG9yaXphdGlvblwiOiBgQmVhcmVyICR7dGhpcy5jb25maWcuYXBpS2V5fWBcbiAgICAgICAgfSxcbiAgICAgICAgdGhyb3c6IGZhbHNlXG4gICAgICB9KTtcbiAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPCAyMDAgfHwgcmVzcG9uc2Uuc3RhdHVzID49IDMwMCkgcmV0dXJuIFtdO1xuICAgICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmpzb247XG4gICAgICByZXR1cm4gKGRhdGEuZGF0YSA/PyBbXSlcbiAgICAgICAgLmZpbHRlcigobTogeyBhcmNoaXRlY3R1cmU/OiB7IG1vZGFsaXR5Pzogc3RyaW5nIH0gfSkgPT5cbiAgICAgICAgICBtLmFyY2hpdGVjdHVyZT8ubW9kYWxpdHk/LmVuZHNXaXRoKFwiLT50ZXh0XCIpKVxuICAgICAgICAubWFwKChtOiB7IGlkPzogc3RyaW5nIH0pID0+IG0uaWQgPz8gXCJcIilcbiAgICAgICAgLmZpbHRlcihCb29sZWFuKVxuICAgICAgICAuc29ydCgpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHZhbGlkYXRlKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGlmICghdGhpcy5jb25maWcuYXBpS2V5LnRyaW0oKSkgcmV0dXJuIGZhbHNlO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3RVcmwoe1xuICAgICAgICB1cmw6IGAke0JBU0VfVVJMfS9tb2RlbHNgLFxuICAgICAgICBoZWFkZXJzOiB7IFwiQXV0aG9yaXphdGlvblwiOiBgQmVhcmVyICR7dGhpcy5jb25maWcuYXBpS2V5fWAgfSxcbiAgICAgICAgdGhyb3c6IGZhbHNlXG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXNwb25zZS5zdGF0dXMgPj0gMjAwICYmIHJlc3BvbnNlLnN0YXR1cyA8IDMwMDtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGVuc3VyZUNvbmZpZ3VyZWQoKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmNvbmZpZy5hcGlLZXkudHJpbSgpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJObyBPcGVuUm91dGVyIEFQSSBrZXkgc2V0LiBDaGVjayBwbHVnaW4gc2V0dGluZ3MuXCIpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZXh0cmFjdEVycm9yKHJlc3BvbnNlOiBSZXF1ZXN0VXJsUmVzcG9uc2UpOiBzdHJpbmcge1xuICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQwMSB8fCByZXNwb25zZS5zdGF0dXMgPT09IDQwMykge1xuICAgICAgcmV0dXJuIFwiT3BlblJvdXRlciBBUEkga2V5IHJlamVjdGVkLiBDaGVjayBzZXR0aW5ncy5cIjtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGRhdGEgPSByZXNwb25zZS5qc29uO1xuICAgICAgY29uc3QgbXNnID0gZGF0YT8uZXJyb3I/Lm1lc3NhZ2UgPz8gYE9wZW5Sb3V0ZXIgcmVxdWVzdCBmYWlsZWQgKCR7cmVzcG9uc2Uuc3RhdHVzfSkuYDtcbiAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQyOSkge1xuICAgICAgICBpZiAobXNnID09PSBcIlByb3ZpZGVyIHJldHVybmVkIGVycm9yXCIpIHtcbiAgICAgICAgICByZXR1cm4gXCJPcGVuUm91dGVyOiBmcmVlIG1vZGVsIGVuZHBvaW50IGF0IGNhcGFjaXR5LiBSZXRyeSBpbiBhIG1vbWVudCBvciBwaWNrIGEgZGlmZmVyZW50IG1vZGVsLlwiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBgT3BlblJvdXRlciByYXRlIGxpbWl0OiAke21zZ31gO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG1zZztcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgcmV0dXJuIGFzRXJyb3JNZXNzYWdlKGVycm9yKSB8fCBgT3BlblJvdXRlciByZXF1ZXN0IGZhaWxlZCAoJHtyZXNwb25zZS5zdGF0dXN9KS5gO1xuICAgIH1cbiAgfVxufVxuIiwgImltcG9ydCB7IFByb3ZpZGVySUQsIFN5YnlsU2V0dGluZ3MgfSBmcm9tIFwiLi4vdHlwZXNcIjtcbmltcG9ydCB7IEFJUHJvdmlkZXIgfSBmcm9tIFwiLi9iYXNlXCI7XG5pbXBvcnQgeyBBbnRocm9waWNQcm92aWRlciB9IGZyb20gXCIuL2FudGhyb3BpY1wiO1xuaW1wb3J0IHsgR2VtaW5pUHJvdmlkZXIgfSBmcm9tIFwiLi9nZW1pbmlcIjtcbmltcG9ydCB7IE9sbGFtYVByb3ZpZGVyIH0gZnJvbSBcIi4vb2xsYW1hXCI7XG5pbXBvcnQgeyBPcGVuQUlQcm92aWRlciB9IGZyb20gXCIuL29wZW5haVwiO1xuaW1wb3J0IHsgT3BlblJvdXRlclByb3ZpZGVyIH0gZnJvbSBcIi4vb3BlbnJvdXRlclwiO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UHJvdmlkZXIoc2V0dGluZ3M6IFN5YnlsU2V0dGluZ3MsIG92ZXJyaWRlSWQ/OiBQcm92aWRlcklEKTogQUlQcm92aWRlciB7XG4gIGNvbnN0IGlkID0gb3ZlcnJpZGVJZCA/PyBzZXR0aW5ncy5hY3RpdmVQcm92aWRlcjtcbiAgc3dpdGNoIChpZCkge1xuICAgIGNhc2UgXCJnZW1pbmlcIjpcbiAgICAgIHJldHVybiBuZXcgR2VtaW5pUHJvdmlkZXIoc2V0dGluZ3MucHJvdmlkZXJzLmdlbWluaSk7XG4gICAgY2FzZSBcIm9wZW5haVwiOlxuICAgICAgcmV0dXJuIG5ldyBPcGVuQUlQcm92aWRlcihzZXR0aW5ncy5wcm92aWRlcnMub3BlbmFpKTtcbiAgICBjYXNlIFwiYW50aHJvcGljXCI6XG4gICAgICByZXR1cm4gbmV3IEFudGhyb3BpY1Byb3ZpZGVyKHNldHRpbmdzLnByb3ZpZGVycy5hbnRocm9waWMpO1xuICAgIGNhc2UgXCJvbGxhbWFcIjpcbiAgICAgIHJldHVybiBuZXcgT2xsYW1hUHJvdmlkZXIoc2V0dGluZ3MucHJvdmlkZXJzLm9sbGFtYSk7XG4gICAgY2FzZSBcIm9wZW5yb3V0ZXJcIjpcbiAgICAgIHJldHVybiBuZXcgT3BlblJvdXRlclByb3ZpZGVyKHNldHRpbmdzLnByb3ZpZGVycy5vcGVucm91dGVyKTtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHByb3ZpZGVyOiAke2lkfWApO1xuICB9XG59XG4iLCAiaW1wb3J0IHsgTm90aWNlLCBURmlsZSwgbm9ybWFsaXplUGF0aCB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHR5cGUgU3lieWxQbHVnaW4gZnJvbSBcIi4vbWFpblwiO1xuaW1wb3J0IHsgZ2V0U2VsZWN0aW9uLCBpbnNlcnRCZWxvd1NlbGVjdGlvbiB9IGZyb20gXCIuL2VkaXRvclwiO1xuaW1wb3J0IHsgcmVtb3ZlU291cmNlUmVmLCB1cHNlcnRTb3VyY2VSZWYsIHdyaXRlRnJvbnRNYXR0ZXJLZXkgfSBmcm9tIFwiLi9mcm9udG1hdHRlclwiO1xuaW1wb3J0IHtcbiAgZm9ybWF0QWR2ZW50dXJlU2VlZCxcbiAgZm9ybWF0QXNrT3JhY2xlLFxuICBmb3JtYXRDaGFyYWN0ZXIsXG4gIGZvcm1hdERlY2xhcmVBY3Rpb24sXG4gIGZvcm1hdEV4cGFuZFNjZW5lLFxuICBmb3JtYXRJbnRlcnByZXRPcmFjbGUsXG4gIGZvcm1hdFN0YXJ0U2NlbmUsXG4gIGZvcm1hdFN1Z2dlc3RDb25zZXF1ZW5jZSxcbiAgTG9uZWxvZ0Zvcm1hdE9wdGlvbnNcbn0gZnJvbSBcIi4vbG9uZWxvZy9mb3JtYXR0ZXJcIjtcbmltcG9ydCB7IHBhcnNlTG9uZWxvZ0NvbnRleHQsIHNlcmlhbGl6ZUNvbnRleHQgfSBmcm9tIFwiLi9sb25lbG9nL3BhcnNlclwiO1xuaW1wb3J0IHsgTWFuYWdlU291cmNlc01vZGFsLCBvcGVuSW5wdXRNb2RhbCwgcGlja0xvY2FsRmlsZSwgcGlja1NvdXJjZU9yaWdpbiwgcGlja1NvdXJjZVJlZiwgcGlja1ZhdWx0RmlsZSB9IGZyb20gXCIuL21vZGFsc1wiO1xuaW1wb3J0IHsgcmVzb2x2ZVNvdXJjZXNGb3JSZXF1ZXN0IH0gZnJvbSBcIi4vc291cmNlVXRpbHNcIjtcbmltcG9ydCB7IE5vdGVGcm9udE1hdHRlciwgU291cmNlUmVmLCBTeWJ5bFNldHRpbmdzIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuZnVuY3Rpb24gaXNMb25lbG9nQWN0aXZlKHNldHRpbmdzOiBTeWJ5bFNldHRpbmdzLCBmbTogTm90ZUZyb250TWF0dGVyKTogYm9vbGVhbiB7XG4gIHJldHVybiBmbS5sb25lbG9nID8/IHNldHRpbmdzLmxvbmVsb2dNb2RlO1xufVxuXG5mdW5jdGlvbiBsb25lbG9nT3B0cyhzZXR0aW5nczogU3lieWxTZXR0aW5ncyk6IExvbmVsb2dGb3JtYXRPcHRpb25zIHtcbiAgcmV0dXJuIHsgd3JhcEluQ29kZUJsb2NrOiBzZXR0aW5ncy5sb25lbG9nV3JhcENvZGVCbG9jayA/PyB0cnVlIH07XG59XG5cbmZ1bmN0aW9uIGdlbmVyaWNCbG9ja3F1b3RlKGxhYmVsOiBzdHJpbmcsIHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBgPiBbJHtsYWJlbH1dICR7dGV4dC50cmltKCkucmVwbGFjZSgvXFxuL2csIFwiXFxuPiBcIil9YDtcbn1cblxuZnVuY3Rpb24gaW5mZXJNaW1lVHlwZShmaWxlOiBURmlsZSB8IEZpbGUpOiBzdHJpbmcge1xuICBjb25zdCBuYW1lID0gXCJwYXRoXCIgaW4gZmlsZSA/IGZpbGUucGF0aCA6IGZpbGUubmFtZTtcbiAgcmV0dXJuIG5hbWUudG9Mb3dlckNhc2UoKS5lbmRzV2l0aChcIi5wZGZcIikgPyBcImFwcGxpY2F0aW9uL3BkZlwiIDogXCJ0ZXh0L3BsYWluXCI7XG59XG5cbmZ1bmN0aW9uIHRvZGF5SXNvRGF0ZSgpOiBzdHJpbmcge1xuICByZXR1cm4gbmV3IERhdGUoKS50b0lTT1N0cmluZygpLnNsaWNlKDAsIDEwKTtcbn1cblxuZnVuY3Rpb24gcGFyc2VMb25lbG9nT3JhY2xlUmVzcG9uc2UodGV4dDogc3RyaW5nKTogeyByZXN1bHQ6IHN0cmluZzsgaW50ZXJwcmV0YXRpb246IHN0cmluZyB9IHtcbiAgY29uc3QgbGluZXMgPSB0ZXh0XG4gICAgLnJlcGxhY2UoL14+XFxzKi9nbSwgXCJcIilcbiAgICAuc3BsaXQoXCJcXG5cIilcbiAgICAubWFwKChsaW5lKSA9PiBsaW5lLnRyaW0oKSlcbiAgICAuZmlsdGVyKEJvb2xlYW4pO1xuICBjb25zdCByZXN1bHQgPSBsaW5lcy5maW5kKChsaW5lKSA9PiBsaW5lLnN0YXJ0c1dpdGgoXCItPlwiKSk/LnJlcGxhY2UoL14tPlxccyovLCBcIlwiKSA/PyBcIlVuY2xlYXJcIjtcbiAgY29uc3QgaW50ZXJwcmV0YXRpb24gPSBsaW5lcy5maWx0ZXIoKGxpbmUpID0+ICFsaW5lLnN0YXJ0c1dpdGgoXCItPlwiKSkuam9pbihcIlxcblwiKTtcbiAgcmV0dXJuIHsgcmVzdWx0LCBpbnRlcnByZXRhdGlvbiB9O1xufVxuXG5hc3luYyBmdW5jdGlvbiBhZGRTb3VyY2VUb05vdGUocGx1Z2luOiBTeWJ5bFBsdWdpbiwgZmlsZTogVEZpbGUpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3Qgb3JpZ2luID0gYXdhaXQgcGlja1NvdXJjZU9yaWdpbihwbHVnaW4uYXBwKTtcbiAgaWYgKCFvcmlnaW4pIHJldHVybjtcblxuICBpZiAob3JpZ2luID09PSBcInZhdWx0XCIpIHtcbiAgICBjb25zdCB2YXVsdEZpbGUgPSBhd2FpdCBwaWNrVmF1bHRGaWxlKHBsdWdpbi5hcHAsIFwiQ2hvb3NlIGEgdmF1bHQgZmlsZVwiKTtcbiAgICBpZiAoIXZhdWx0RmlsZSkgcmV0dXJuO1xuICAgIGNvbnN0IHJlZjogU291cmNlUmVmID0ge1xuICAgICAgbGFiZWw6IHZhdWx0RmlsZS5iYXNlbmFtZSxcbiAgICAgIG1pbWVfdHlwZTogaW5mZXJNaW1lVHlwZSh2YXVsdEZpbGUpLFxuICAgICAgdmF1bHRfcGF0aDogdmF1bHRGaWxlLnBhdGhcbiAgICB9O1xuICAgIGF3YWl0IHVwc2VydFNvdXJjZVJlZihwbHVnaW4uYXBwLCBmaWxlLCByZWYpO1xuICAgIG5ldyBOb3RpY2UoYFNvdXJjZSBhZGRlZDogJHt2YXVsdEZpbGUucGF0aH1gKTtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBFeHRlcm5hbCBmaWxlIFx1MjAxNCBpbXBvcnQgaW50byB2YXVsdFxuICBjb25zdCBsb2NhbEZpbGUgPSBhd2FpdCBwaWNrTG9jYWxGaWxlKCk7XG4gIGlmICghbG9jYWxGaWxlKSByZXR1cm47XG5cbiAgY29uc3QgYnVmZmVyID0gYXdhaXQgbG9jYWxGaWxlLmFycmF5QnVmZmVyKCk7XG4gIGNvbnN0IHBhcmVudERpciA9IGZpbGUucGFyZW50Py5wYXRoID8/IFwiXCI7XG4gIGNvbnN0IHNvdXJjZXNGb2xkZXIgPSBub3JtYWxpemVQYXRoKHBhcmVudERpciA/IGAke3BhcmVudERpcn0vc291cmNlc2AgOiBcInNvdXJjZXNcIik7XG5cbiAgaWYgKCFwbHVnaW4uYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChzb3VyY2VzRm9sZGVyKSkge1xuICAgIGF3YWl0IHBsdWdpbi5hcHAudmF1bHQuY3JlYXRlRm9sZGVyKHNvdXJjZXNGb2xkZXIpO1xuICB9XG5cbiAgY29uc3QgdGFyZ2V0UGF0aCA9IG5vcm1hbGl6ZVBhdGgoYCR7c291cmNlc0ZvbGRlcn0vJHtsb2NhbEZpbGUubmFtZX1gKTtcbiAgY29uc3QgZXhpc3RpbmcgPSBwbHVnaW4uYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aCh0YXJnZXRQYXRoKTtcbiAgaWYgKGV4aXN0aW5nIGluc3RhbmNlb2YgVEZpbGUpIHtcbiAgICBhd2FpdCBwbHVnaW4uYXBwLnZhdWx0Lm1vZGlmeUJpbmFyeShleGlzdGluZywgYnVmZmVyKTtcbiAgfSBlbHNlIHtcbiAgICBhd2FpdCBwbHVnaW4uYXBwLnZhdWx0LmNyZWF0ZUJpbmFyeSh0YXJnZXRQYXRoLCBidWZmZXIpO1xuICB9XG5cbiAgY29uc3QgcmVmOiBTb3VyY2VSZWYgPSB7XG4gICAgbGFiZWw6IGxvY2FsRmlsZS5uYW1lLnJlcGxhY2UoL1xcLlteLl0rJC8sIFwiXCIpLFxuICAgIG1pbWVfdHlwZTogaW5mZXJNaW1lVHlwZShsb2NhbEZpbGUpLFxuICAgIHZhdWx0X3BhdGg6IHRhcmdldFBhdGhcbiAgfTtcbiAgYXdhaXQgdXBzZXJ0U291cmNlUmVmKHBsdWdpbi5hcHAsIGZpbGUsIHJlZik7XG4gIG5ldyBOb3RpY2UoYFNvdXJjZSBpbXBvcnRlZDogJHt0YXJnZXRQYXRofWApO1xufVxuXG5hc3luYyBmdW5jdGlvbiBtYW5hZ2VTb3VyY2VzKHBsdWdpbjogU3lieWxQbHVnaW4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgY29udGV4dCA9IGF3YWl0IHBsdWdpbi5nZXRBY3RpdmVOb3RlQ29udGV4dCgpO1xuICBpZiAoIWNvbnRleHQ/LnZpZXcuZmlsZSkge1xuICAgIHJldHVybjtcbiAgfVxuICBuZXcgTWFuYWdlU291cmNlc01vZGFsKFxuICAgIHBsdWdpbi5hcHAsXG4gICAgY29udGV4dC5mbS5zb3VyY2VzID8/IFtdLFxuICAgIGFzeW5jIChyZWYpID0+IHJlbW92ZVNvdXJjZVJlZihwbHVnaW4uYXBwLCBjb250ZXh0LnZpZXcuZmlsZSEsIHJlZilcbiAgKS5vcGVuKCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHJ1bkdlbmVyYXRpb24oXG4gIHBsdWdpbjogU3lieWxQbHVnaW4sXG4gIHVzZXJNZXNzYWdlOiBzdHJpbmcsXG4gIGZvcm1hdHRlcjogKHRleHQ6IHN0cmluZywgZm06IE5vdGVGcm9udE1hdHRlcikgPT4gc3RyaW5nLFxuICBtYXhPdXRwdXRUb2tlbnMgPSA1MTIsXG4gIHBsYWNlbWVudD86IFwiY3Vyc29yXCIgfCBcImVuZC1vZi1ub3RlXCIgfCBcImJlbG93LXNlbGVjdGlvblwiXG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgY29udGV4dCA9IGF3YWl0IHBsdWdpbi5nZXRBY3RpdmVOb3RlQ29udGV4dCgpO1xuICBpZiAoIWNvbnRleHQpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcGx1Z2luLnJlcXVlc3RHZW5lcmF0aW9uKGNvbnRleHQuZm0sIGNvbnRleHQubm90ZUJvZHksIHVzZXJNZXNzYWdlLCBtYXhPdXRwdXRUb2tlbnMpO1xuICAgIGNvbnN0IGZvcm1hdHRlZCA9IGZvcm1hdHRlcihyZXNwb25zZS50ZXh0LCBjb250ZXh0LmZtKTtcbiAgICBpZiAocGxhY2VtZW50ID09PSBcImJlbG93LXNlbGVjdGlvblwiKSB7XG4gICAgICBpbnNlcnRCZWxvd1NlbGVjdGlvbihjb250ZXh0LnZpZXcuZWRpdG9yLCBmb3JtYXR0ZWQpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwbHVnaW4uaW5zZXJ0VGV4dChjb250ZXh0LnZpZXcsIGZvcm1hdHRlZCwgcGxhY2VtZW50KTtcbiAgICB9XG4gICAgcGx1Z2luLm1heWJlSW5zZXJ0VG9rZW5Db21tZW50KGNvbnRleHQudmlldywgcmVzcG9uc2UpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIG5ldyBOb3RpY2UoYFN5YnlsIGVycm9yOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gKTtcbiAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXJBbGxDb21tYW5kcyhwbHVnaW46IFN5YnlsUGx1Z2luKTogdm9pZCB7XG4gIHBsdWdpbi5hZGRDb21tYW5kKHtcbiAgICBpZDogXCJzeWJ5bDppbnNlcnQtZnJvbnRtYXR0ZXJcIixcbiAgICBuYW1lOiBcIkluc2VydCBOb3RlIEZyb250bWF0dGVyXCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGNvbnRleHQgPSBhd2FpdCBwbHVnaW4uZ2V0QWN0aXZlTm90ZUNvbnRleHQoKTtcbiAgICAgIGlmICghY29udGV4dD8udmlldy5maWxlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHZhbHVlcyA9IGF3YWl0IG9wZW5JbnB1dE1vZGFsKHBsdWdpbi5hcHAsIFwiSW5zZXJ0IFN5YnlsIEZyb250bWF0dGVyXCIsIFtcbiAgICAgICAgeyBrZXk6IFwicnVsZXNldFwiLCBsYWJlbDogXCJHYW1lIC8gcnVsZXNldFwiLCBwbGFjZWhvbGRlcjogXCJJcm9uc3dvcm5cIiB9LFxuICAgICAgICB7IGtleTogXCJwY3NcIiwgbGFiZWw6IFwiUENcIiwgb3B0aW9uYWw6IHRydWUsIHBsYWNlaG9sZGVyOiBcIktpcmEgVm9zcywgZGFuZ2Vyb3VzIHJhbmssIHZvdzogcmVjb3ZlciB0aGUgcmVsaWNcIiB9LFxuICAgICAgICB7IGtleTogXCJ0b25lXCIsIGxhYmVsOiBcIlRvbmVcIiwgb3B0aW9uYWw6IHRydWUsIHBsYWNlaG9sZGVyOiBcIkdyaXR0eSwgaG9wZWZ1bFwiIH0sXG4gICAgICAgIHsga2V5OiBcImxhbmd1YWdlXCIsIGxhYmVsOiBcIkxhbmd1YWdlXCIsIG9wdGlvbmFsOiB0cnVlLCBwbGFjZWhvbGRlcjogXCJMZWF2ZSBibGFuayBmb3IgYXV0by1kZXRlY3RcIiB9XG4gICAgICBdKTtcbiAgICAgIGlmICghdmFsdWVzKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICghdmFsdWVzLnJ1bGVzZXQpIHtcbiAgICAgICAgbmV3IE5vdGljZShcIlJ1bGVzZXQgaXMgcmVxdWlyZWQuXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBhd2FpdCBwbHVnaW4uYXBwLmZpbGVNYW5hZ2VyLnByb2Nlc3NGcm9udE1hdHRlcihjb250ZXh0LnZpZXcuZmlsZSwgKGZtKSA9PiB7XG4gICAgICAgIGZtW1wicnVsZXNldFwiXSA9IHZhbHVlcy5ydWxlc2V0O1xuICAgICAgICBmbVtcInByb3ZpZGVyXCJdID0gZm1bXCJwcm92aWRlclwiXSA/PyBwbHVnaW4uc2V0dGluZ3MuYWN0aXZlUHJvdmlkZXI7XG4gICAgICAgIGZtW1wib3JhY2xlX21vZGVcIl0gPSBmbVtcIm9yYWNsZV9tb2RlXCJdID8/IFwieWVzLW5vXCI7XG4gICAgICAgIGZtW1wibG9uZWxvZ1wiXSA9IGZtW1wibG9uZWxvZ1wiXSA/PyBwbHVnaW4uc2V0dGluZ3MubG9uZWxvZ01vZGU7XG4gICAgICAgIGZtW1wic2NlbmVfY291bnRlclwiXSA9IGZtW1wic2NlbmVfY291bnRlclwiXSA/PyAxO1xuICAgICAgICBmbVtcInNlc3Npb25fbnVtYmVyXCJdID0gZm1bXCJzZXNzaW9uX251bWJlclwiXSA/PyAxO1xuICAgICAgICBmbVtcImdhbWVfY29udGV4dFwiXSA9IGZtW1wiZ2FtZV9jb250ZXh0XCJdID8/IFwiXCI7XG4gICAgICAgIGZtW1wic2NlbmVfY29udGV4dFwiXSA9IGZtW1wic2NlbmVfY29udGV4dFwiXSA/PyBcIlwiO1xuICAgICAgICBpZiAodmFsdWVzLnBjcykgZm1bXCJwY3NcIl0gPSB2YWx1ZXMucGNzO1xuICAgICAgICBpZiAodmFsdWVzLnRvbmUpIGZtW1widG9uZVwiXSA9IHZhbHVlcy50b25lO1xuICAgICAgICBpZiAodmFsdWVzLmxhbmd1YWdlKSBmbVtcImxhbmd1YWdlXCJdID0gdmFsdWVzLmxhbmd1YWdlO1xuICAgICAgfSk7XG4gICAgICBuZXcgTm90aWNlKFwiU3lieWwgZnJvbnRtYXR0ZXIgaW5zZXJ0ZWQuXCIpO1xuICAgIH1cbiAgfSk7XG5cbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOmRpZ2VzdC1zb3VyY2VcIixcbiAgICBuYW1lOiBcIkRpZ2VzdCBTb3VyY2UgaW50byBHYW1lIENvbnRleHRcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY29udGV4dCA9IGF3YWl0IHBsdWdpbi5nZXRBY3RpdmVOb3RlQ29udGV4dCgpO1xuICAgICAgaWYgKCFjb250ZXh0Py52aWV3LmZpbGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgdmF1bHRGaWxlID0gYXdhaXQgcGlja1ZhdWx0RmlsZShwbHVnaW4uYXBwLCBcIkNob29zZSBhIHNvdXJjZSBmaWxlIHRvIGRpZ2VzdFwiKTtcbiAgICAgIGlmICghdmF1bHRGaWxlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJlZjogU291cmNlUmVmID0ge1xuICAgICAgICBsYWJlbDogdmF1bHRGaWxlLmJhc2VuYW1lLFxuICAgICAgICBtaW1lX3R5cGU6IGluZmVyTWltZVR5cGUodmF1bHRGaWxlKSxcbiAgICAgICAgdmF1bHRfcGF0aDogdmF1bHRGaWxlLnBhdGhcbiAgICAgIH07XG4gICAgICBjb25zdCBwcm92aWRlcklkID0gY29udGV4dC5mbS5wcm92aWRlciA/PyBwbHVnaW4uc2V0dGluZ3MuYWN0aXZlUHJvdmlkZXI7XG4gICAgICBsZXQgcmVzb2x2ZWRTb3VyY2VzO1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzb2x2ZWRTb3VyY2VzID0gYXdhaXQgcmVzb2x2ZVNvdXJjZXNGb3JSZXF1ZXN0KHBsdWdpbi5hcHAsIFtyZWZdLCBwcm92aWRlcklkKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoYENhbm5vdCByZWFkIHNvdXJjZTogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJ1bGVzZXQgPSBjb250ZXh0LmZtLnJ1bGVzZXQgPz8gXCJ0aGUgZ2FtZVwiO1xuICAgICAgY29uc3QgZGlnZXN0UHJvbXB0ID0gYERpc3RpbGwgdGhlIGZvbGxvd2luZyBzb3VyY2UgbWF0ZXJpYWwgZm9yIHVzZSBpbiBhIHNvbG8gdGFibGV0b3AgUlBHIHNlc3Npb24gb2YgXCIke3J1bGVzZXR9XCIuXG5cbkV4dHJhY3QgYW5kIGNvbmRlbnNlIGludG8gYSBjb21wYWN0IHJlZmVyZW5jZTpcbi0gQ29yZSBydWxlcyBhbmQgbWVjaGFuaWNzIHJlbGV2YW50IHRvIHBsYXlcbi0gS2V5IGZhY3Rpb25zLCBsb2NhdGlvbnMsIGNoYXJhY3RlcnMsIGFuZCB3b3JsZCBmYWN0c1xuLSBUb25lLCBnZW5yZSwgYW5kIHNldHRpbmcgY29udmVudGlvbnNcbi0gQW55IHRhYmxlcywgbW92ZSBsaXN0cywgb3IgcmFuZG9tIGdlbmVyYXRvcnNcblxuQmUgY29uY2lzZSBhbmQgc3BlY2lmaWMuIFByZXNlcnZlIGdhbWUtbWVjaGFuaWNhbCBkZXRhaWxzLiBPbWl0IGZsYXZvciBwcm9zZSBhbmQgZXhhbXBsZXMuYDtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcGx1Z2luLnJlcXVlc3RSYXdHZW5lcmF0aW9uKFxuICAgICAgICAgIGNvbnRleHQuZm0sXG4gICAgICAgICAgZGlnZXN0UHJvbXB0LFxuICAgICAgICAgIDIwMDAsXG4gICAgICAgICAgcmVzb2x2ZWRTb3VyY2VzXG4gICAgICAgICk7XG4gICAgICAgIGF3YWl0IHBsdWdpbi5hcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGNvbnRleHQudmlldy5maWxlLCAoZm0pID0+IHtcbiAgICAgICAgICBmbVtcImdhbWVfY29udGV4dFwiXSA9IHJlc3BvbnNlLnRleHQ7XG4gICAgICAgIH0pO1xuICAgICAgICBuZXcgTm90aWNlKFwiR2FtZSBjb250ZXh0IHVwZGF0ZWQuXCIpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgbmV3IE5vdGljZShgU3lieWwgZXJyb3I6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOmFzay10aGUtcnVsZXNcIixcbiAgICBuYW1lOiBcIkFzayB0aGUgUnVsZXNcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY29udGV4dCA9IGF3YWl0IHBsdWdpbi5nZXRBY3RpdmVOb3RlQ29udGV4dCgpO1xuICAgICAgaWYgKCFjb250ZXh0Py52aWV3LmZpbGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3Qgc291cmNlcyA9IGNvbnRleHQuZm0uc291cmNlcyA/PyBbXTtcbiAgICAgIGlmICghc291cmNlcy5sZW5ndGgpIHtcbiAgICAgICAgbmV3IE5vdGljZShcIk5vIHNvdXJjZXMgYXR0YWNoZWQgdG8gdGhpcyBub3RlLiBVc2UgQWRkIFNvdXJjZSBGaWxlIGZpcnN0LlwiKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgcmVmID0gc291cmNlcy5sZW5ndGggPT09IDFcbiAgICAgICAgPyBzb3VyY2VzWzBdXG4gICAgICAgIDogYXdhaXQgcGlja1NvdXJjZVJlZihwbHVnaW4uYXBwLCBcIkNob29zZSBhIHNvdXJjZSB0byBxdWVyeVwiLCBzb3VyY2VzKTtcbiAgICAgIGlmICghcmVmKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHZhbHVlcyA9IGF3YWl0IG9wZW5JbnB1dE1vZGFsKHBsdWdpbi5hcHAsIFwiQXNrIHRoZSBSdWxlc1wiLCBbXG4gICAgICAgIHsga2V5OiBcInF1ZXN0aW9uXCIsIGxhYmVsOiBcIlF1ZXN0aW9uXCIsIHBsYWNlaG9sZGVyOiBcIkhvdyBkb2VzIE1vbWVudHVtIHdvcms/XCIgfVxuICAgICAgXSk7XG4gICAgICBpZiAoIXZhbHVlcz8ucXVlc3Rpb24pIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgcHJvdmlkZXJJZCA9IGNvbnRleHQuZm0ucHJvdmlkZXIgPz8gcGx1Z2luLnNldHRpbmdzLmFjdGl2ZVByb3ZpZGVyO1xuICAgICAgbGV0IHJlc29sdmVkU291cmNlcztcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc29sdmVkU291cmNlcyA9IGF3YWl0IHJlc29sdmVTb3VyY2VzRm9yUmVxdWVzdChwbHVnaW4uYXBwLCBbcmVmXSwgcHJvdmlkZXJJZCk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBuZXcgTm90aWNlKGBDYW5ub3QgcmVhZCBzb3VyY2U6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCBydWxlc2V0ID0gY29udGV4dC5mbS5ydWxlc2V0ID8/IFwidGhlIGdhbWVcIjtcbiAgICAgIGNvbnN0IHByb21wdCA9IGBZb3UgYXJlIGEgcnVsZXMgcmVmZXJlbmNlIGZvciBcIiR7cnVsZXNldH1cIi5cbkFuc3dlciB0aGUgZm9sbG93aW5nIHF1ZXN0aW9uIHVzaW5nIG9ubHkgdGhlIHByb3ZpZGVkIHNvdXJjZSBtYXRlcmlhbC5cbkJlIHByZWNpc2UgYW5kIGNpdGUgdGhlIHJlbGV2YW50IHJ1bGUgb3IgcGFnZSBzZWN0aW9uIGlmIHBvc3NpYmxlLlxuXG5RdWVzdGlvbjogJHt2YWx1ZXMucXVlc3Rpb259YDtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcGx1Z2luLnJlcXVlc3RSYXdHZW5lcmF0aW9uKGNvbnRleHQuZm0sIHByb21wdCwgMTAwMCwgcmVzb2x2ZWRTb3VyY2VzKTtcbiAgICAgICAgcGx1Z2luLmluc2VydFRleHQoY29udGV4dC52aWV3LCBnZW5lcmljQmxvY2txdW90ZShcIlJ1bGVzXCIsIHJlc3BvbnNlLnRleHQpKTtcbiAgICAgICAgcGx1Z2luLm1heWJlSW5zZXJ0VG9rZW5Db21tZW50KGNvbnRleHQudmlldywgcmVzcG9uc2UpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgbmV3IE5vdGljZShgU3lieWwgZXJyb3I6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOmFkdmVudHVyZS1zZWVkXCIsXG4gICAgbmFtZTogXCJBZHZlbnR1cmUgU2VlZFwiLFxuICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjb250ZXh0ID0gYXdhaXQgcGx1Z2luLmdldEFjdGl2ZU5vdGVDb250ZXh0KCk7XG4gICAgICBpZiAoIWNvbnRleHQ/LnZpZXcuZmlsZSkgcmV0dXJuO1xuICAgICAgY29uc3QgdmFsdWVzID0gYXdhaXQgb3BlbklucHV0TW9kYWwocGx1Z2luLmFwcCwgXCJBZHZlbnR1cmUgU2VlZFwiLCBbXG4gICAgICAgIHsga2V5OiBcImNvbmNlcHRcIiwgbGFiZWw6IFwiVGhlbWUgb3IgY29uY2VwdFwiLCBvcHRpb25hbDogdHJ1ZSwgcGxhY2Vob2xkZXI6IFwiTGVhdmUgYmxhbmsgZm9yIGEgcmFuZG9tIHNlZWQuXCIgfVxuICAgICAgXSk7XG4gICAgICBpZiAoIXZhbHVlcykgcmV0dXJuO1xuICAgICAgY29uc3QgcnVsZXNldCA9IGNvbnRleHQuZm0ucnVsZXNldCA/PyBcInRoZSBnYW1lXCI7XG4gICAgICBjb25zdCBjb25jZXB0ID0gdmFsdWVzLmNvbmNlcHQ/LnRyaW0oKTtcbiAgICAgIGNvbnN0IHByb21wdCA9IGBHZW5lcmF0ZSBhbiBhZHZlbnR1cmUgc2VlZCBmb3IgYSBzb2xvIHRhYmxldG9wIFJQRyBzZXNzaW9uIG9mIFwiJHtydWxlc2V0fVwiLlxuXG5TdHJ1Y3R1cmUgdGhlIG91dHB1dCBhczpcbi0gUHJlbWlzZTogb25lIHNlbnRlbmNlIGRlc2NyaWJpbmcgdGhlIHNpdHVhdGlvblxuLSBDb25mbGljdDogdGhlIGNlbnRyYWwgdGVuc2lvbiBvciB0aHJlYXRcbi0gSG9vazogdGhlIHNwZWNpZmljIGV2ZW50IHRoYXQgcHVsbHMgdGhlIFBDIGluXG4tIFRvbmU6IHRoZSBpbnRlbmRlZCBhdG1vc3BoZXJlXG5cbiR7Y29uY2VwdCA/IGBUaGVtZS9jb25jZXB0OiAke2NvbmNlcHR9YCA6IFwiTWFrZSBpdCBldm9jYXRpdmUgYW5kIGltbWVkaWF0ZWx5IHBsYXlhYmxlLlwifVxuS2VlcCBpdCBjb25jaXNlIFx1MjAxNCA0IGJ1bGxldCBwb2ludHMsIG9uZSBzaG9ydCBzZW50ZW5jZSBlYWNoLmA7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHBsdWdpbi5yZXF1ZXN0UmF3R2VuZXJhdGlvbihjb250ZXh0LmZtLCBwcm9tcHQsIDgwMCwgW10pO1xuICAgICAgICBjb25zdCBsb25lbG9nID0gaXNMb25lbG9nQWN0aXZlKHBsdWdpbi5zZXR0aW5ncywgY29udGV4dC5mbSk7XG4gICAgICAgIGNvbnN0IG91dHB1dCA9IGxvbmVsb2dcbiAgICAgICAgICA/IGZvcm1hdEFkdmVudHVyZVNlZWQocmVzcG9uc2UudGV4dCwgbG9uZWxvZ09wdHMocGx1Z2luLnNldHRpbmdzKSlcbiAgICAgICAgICA6IGdlbmVyaWNCbG9ja3F1b3RlKFwiQWR2ZW50dXJlIFNlZWRcIiwgcmVzcG9uc2UudGV4dCk7XG4gICAgICAgIHBsdWdpbi5pbnNlcnRUZXh0KGNvbnRleHQudmlldywgb3V0cHV0KTtcbiAgICAgICAgcGx1Z2luLm1heWJlSW5zZXJ0VG9rZW5Db21tZW50KGNvbnRleHQudmlldywgcmVzcG9uc2UpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgbmV3IE5vdGljZShgU3lieWwgZXJyb3I6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOmdlbmVyYXRlLWNoYXJhY3RlclwiLFxuICAgIG5hbWU6IFwiR2VuZXJhdGUgQ2hhcmFjdGVyXCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGNvbnRleHQgPSBhd2FpdCBwbHVnaW4uZ2V0QWN0aXZlTm90ZUNvbnRleHQoKTtcbiAgICAgIGlmICghY29udGV4dD8udmlldy5maWxlKSByZXR1cm47XG4gICAgICBjb25zdCBzb3VyY2VzID0gY29udGV4dC5mbS5zb3VyY2VzID8/IFtdO1xuICAgICAgaWYgKCFzb3VyY2VzLmxlbmd0aCkge1xuICAgICAgICBuZXcgTm90aWNlKFwiTm8gc291cmNlcyBhdHRhY2hlZCB0byB0aGlzIG5vdGUuIEFkZCBhIHJ1bGVib29rIGZpcnN0IHZpYSBBZGQgU291cmNlIEZpbGUuXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCByZWYgPSBzb3VyY2VzLmxlbmd0aCA9PT0gMVxuICAgICAgICA/IHNvdXJjZXNbMF1cbiAgICAgICAgOiBhd2FpdCBwaWNrU291cmNlUmVmKHBsdWdpbi5hcHAsIFwiQ2hvb3NlIGEgcnVsZWJvb2sgc291cmNlXCIsIHNvdXJjZXMpO1xuICAgICAgaWYgKCFyZWYpIHJldHVybjtcbiAgICAgIGNvbnN0IHZhbHVlcyA9IGF3YWl0IG9wZW5JbnB1dE1vZGFsKHBsdWdpbi5hcHAsIFwiR2VuZXJhdGUgQ2hhcmFjdGVyXCIsIFtcbiAgICAgICAgeyBrZXk6IFwiY29uY2VwdFwiLCBsYWJlbDogXCJDaGFyYWN0ZXIgY29uY2VwdFwiLCBvcHRpb25hbDogdHJ1ZSwgcGxhY2Vob2xkZXI6IFwiTGVhdmUgYmxhbmsgZm9yIGEgcmFuZG9tIGNoYXJhY3Rlci5cIiB9XG4gICAgICBdKTtcbiAgICAgIGlmICghdmFsdWVzKSByZXR1cm47XG4gICAgICBjb25zdCBwcm92aWRlcklkID0gY29udGV4dC5mbS5wcm92aWRlciA/PyBwbHVnaW4uc2V0dGluZ3MuYWN0aXZlUHJvdmlkZXI7XG4gICAgICBsZXQgcmVzb2x2ZWRTb3VyY2VzO1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzb2x2ZWRTb3VyY2VzID0gYXdhaXQgcmVzb2x2ZVNvdXJjZXNGb3JSZXF1ZXN0KHBsdWdpbi5hcHAsIFtyZWZdLCBwcm92aWRlcklkKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoYENhbm5vdCByZWFkIHNvdXJjZTogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJ1bGVzZXQgPSBjb250ZXh0LmZtLnJ1bGVzZXQgPz8gXCJ0aGUgZ2FtZVwiO1xuICAgICAgY29uc3QgY29uY2VwdCA9IHZhbHVlcy5jb25jZXB0Py50cmltKCk7XG4gICAgICBjb25zdCBsb25lbG9nID0gaXNMb25lbG9nQWN0aXZlKHBsdWdpbi5zZXR0aW5ncywgY29udGV4dC5mbSk7XG4gICAgICBjb25zdCBmb3JtYXRJbnN0cnVjdGlvbiA9IGxvbmVsb2dcbiAgICAgICAgPyBgRm9ybWF0IHRoZSBvdXRwdXQgYXMgYSBMb25lbG9nIFBDIHRhZy4gVXNlIHRoZSBtdWx0aS1saW5lIGZvcm0gZm9yIGNvbXBsZXggY2hhcmFjdGVyczpcbltQQzpOYW1lXG4gIHwgc3RhdDogSFAgWCwgU3RyZXNzIFlcbiAgfCBnZWFyOiBpdGVtMSwgaXRlbTJcbiAgfCB0cmFpdDogdmFsdWUxLCB2YWx1ZTJcbl1cbkluY2x1ZGUgYWxsIHN0YXRzIGFuZCBmaWVsZHMgZXhhY3RseSBhcyBkZWZpbmVkIGJ5IHRoZSBydWxlcy4gT3V0cHV0IHRoZSB0YWcgb25seSBcdTIwMTQgbm8gZXh0cmEgY29tbWVudGFyeS5gXG4gICAgICAgIDogYEluY2x1ZGUgYWxsIHJlcXVpcmVkIGZpZWxkcyBhcyBkZWZpbmVkIGJ5IHRoZSBydWxlczogbmFtZSwgc3RhdHMvYXR0cmlidXRlcywgc3RhcnRpbmcgZXF1aXBtZW50LCBiYWNrZ3JvdW5kLCBhbmQgYW55IG90aGVyIG1hbmRhdG9yeSBjaGFyYWN0ZXIgZWxlbWVudHMuIEZvcm1hdCBjbGVhcmx5IHdpdGggb25lIGZpZWxkIHBlciBsaW5lLmA7XG4gICAgICBjb25zdCBwcm9tcHQgPSBgVXNpbmcgT05MWSB0aGUgY2hhcmFjdGVyIGNyZWF0aW9uIHJ1bGVzIGluIHRoZSBwcm92aWRlZCBzb3VyY2UgbWF0ZXJpYWwsIGdlbmVyYXRlIGEgY2hhcmFjdGVyIGZvciBcIiR7cnVsZXNldH1cIi5cblxuRm9sbG93IHRoZSBleGFjdCBjaGFyYWN0ZXIgY3JlYXRpb24gcHJvY2VkdXJlIGRlc2NyaWJlZCBpbiB0aGUgcnVsZXMuIERvIG5vdCBpbnZlbnQgbWVjaGFuaWNzIG5vdCBwcmVzZW50IGluIHRoZSBzb3VyY2UuXG5cbiR7Y29uY2VwdCA/IGBDaGFyYWN0ZXIgY29uY2VwdDogJHtjb25jZXB0fWAgOiBcIkdlbmVyYXRlIGEgcmFuZG9tIGNoYXJhY3Rlci5cIn1cblxuJHtmb3JtYXRJbnN0cnVjdGlvbn1gO1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBwbHVnaW4ucmVxdWVzdFJhd0dlbmVyYXRpb24oY29udGV4dC5mbSwgcHJvbXB0LCAxNTAwLCByZXNvbHZlZFNvdXJjZXMpO1xuICAgICAgICBjb25zdCBvdXRwdXQgPSBsb25lbG9nXG4gICAgICAgICAgPyBmb3JtYXRDaGFyYWN0ZXIocmVzcG9uc2UudGV4dCwgbG9uZWxvZ09wdHMocGx1Z2luLnNldHRpbmdzKSlcbiAgICAgICAgICA6IGdlbmVyaWNCbG9ja3F1b3RlKFwiQ2hhcmFjdGVyXCIsIHJlc3BvbnNlLnRleHQpO1xuICAgICAgICBwbHVnaW4uaW5zZXJ0VGV4dChjb250ZXh0LnZpZXcsIG91dHB1dCk7XG4gICAgICAgIHBsdWdpbi5tYXliZUluc2VydFRva2VuQ29tbWVudChjb250ZXh0LnZpZXcsIHJlc3BvbnNlKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoYFN5YnlsIGVycm9yOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIHBsdWdpbi5hZGRDb21tYW5kKHtcbiAgICBpZDogXCJzeWJ5bDpzdGFydC1zY2VuZVwiLFxuICAgIG5hbWU6IFwiU3RhcnQgU2NlbmVcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY29udGV4dCA9IGF3YWl0IHBsdWdpbi5nZXRBY3RpdmVOb3RlQ29udGV4dCgpO1xuICAgICAgaWYgKCFjb250ZXh0Py52aWV3LmZpbGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKGlzTG9uZWxvZ0FjdGl2ZShwbHVnaW4uc2V0dGluZ3MsIGNvbnRleHQuZm0pKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlcyA9IGF3YWl0IG9wZW5JbnB1dE1vZGFsKHBsdWdpbi5hcHAsIFwiU3RhcnQgU2NlbmVcIiwgW1xuICAgICAgICAgIHsga2V5OiBcInNjZW5lRGVzY1wiLCBsYWJlbDogXCJTY2VuZSBkZXNjcmlwdGlvblwiLCBwbGFjZWhvbGRlcjogXCJEYXJrIGFsbGV5LCBtaWRuaWdodFwiIH1cbiAgICAgICAgXSk7XG4gICAgICAgIGlmICghdmFsdWVzPy5zY2VuZURlc2MpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY291bnRlciA9IGNvbnRleHQuZm0uc2NlbmVfY291bnRlciA/PyAxO1xuICAgICAgICBhd2FpdCBydW5HZW5lcmF0aW9uKFxuICAgICAgICAgIHBsdWdpbixcbiAgICAgICAgICBgU1RBUlQgU0NFTkUuIEdlbmVyYXRlIG9ubHk6IDItMyBsaW5lcyBvZiB0aGlyZC1wZXJzb24gcGFzdC10ZW5zZSBwcm9zZSBkZXNjcmliaW5nIHRoZSBhdG1vc3BoZXJlIGFuZCBzZXR0aW5nIG9mOiBcIiR7dmFsdWVzLnNjZW5lRGVzY31cIi4gTm8gZGlhbG9ndWUuIE5vIFBDIGFjdGlvbnMuIE5vIGFkZGl0aW9uYWwgY29tbWVudGFyeS5gLFxuICAgICAgICAgICh0ZXh0KSA9PiBmb3JtYXRTdGFydFNjZW5lKHRleHQsIGBTJHtjb3VudGVyfWAsIHZhbHVlcy5zY2VuZURlc2MsIGxvbmVsb2dPcHRzKHBsdWdpbi5zZXR0aW5ncykpXG4gICAgICAgICk7XG4gICAgICAgIGlmIChwbHVnaW4uc2V0dGluZ3MubG9uZWxvZ0F1dG9JbmNTY2VuZSkge1xuICAgICAgICAgIGF3YWl0IHdyaXRlRnJvbnRNYXR0ZXJLZXkocGx1Z2luLmFwcCwgY29udGV4dC52aWV3LmZpbGUsIFwic2NlbmVfY291bnRlclwiLCBjb3VudGVyICsgMSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgYXdhaXQgcnVuR2VuZXJhdGlvbihcbiAgICAgICAgcGx1Z2luLFxuICAgICAgICBcIlNUQVJUIFNDRU5FLiBHZW5lcmF0ZSBvbmx5OiAyLTMgbGluZXMgb2YgdGhpcmQtcGVyc29uIHBhc3QtdGVuc2UgcHJvc2UgZGVzY3JpYmluZyB0aGUgc2V0dGluZyBhbmQgYXRtb3NwaGVyZS4gTm8gZGlhbG9ndWUuIE5vIFBDIGFjdGlvbnMuIE5vIGFkZGl0aW9uYWwgY29tbWVudGFyeS5cIixcbiAgICAgICAgKHRleHQpID0+IGdlbmVyaWNCbG9ja3F1b3RlKFwiU2NlbmVcIiwgdGV4dClcbiAgICAgICk7XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6ZGVjbGFyZS1hY3Rpb25cIixcbiAgICBuYW1lOiBcIkRlY2xhcmUgQWN0aW9uXCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlcyA9IGF3YWl0IG9wZW5JbnB1dE1vZGFsKHBsdWdpbi5hcHAsIFwiRGVjbGFyZSBBY3Rpb25cIiwgW1xuICAgICAgICB7IGtleTogXCJhY3Rpb25cIiwgbGFiZWw6IFwiQWN0aW9uXCIgfSxcbiAgICAgICAgeyBrZXk6IFwicm9sbFwiLCBsYWJlbDogXCJSb2xsIHJlc3VsdFwiIH1cbiAgICAgIF0pO1xuICAgICAgaWYgKCF2YWx1ZXM/LmFjdGlvbiB8fCAhdmFsdWVzLnJvbGwpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgYXdhaXQgcnVuR2VuZXJhdGlvbihcbiAgICAgICAgcGx1Z2luLFxuICAgICAgICBgUEMgYWN0aW9uOiAke3ZhbHVlcy5hY3Rpb259XFxuUm9sbCByZXN1bHQ6ICR7dmFsdWVzLnJvbGx9XFxuRGVzY3JpYmUgb25seSB0aGUgY29uc2VxdWVuY2VzIGFuZCB3b3JsZCByZWFjdGlvbi4gRG8gbm90IGRlc2NyaWJlIHRoZSBQQydzIGFjdGlvbi5gLFxuICAgICAgICAodGV4dCwgZm0pID0+XG4gICAgICAgICAgaXNMb25lbG9nQWN0aXZlKHBsdWdpbi5zZXR0aW5ncywgZm0pXG4gICAgICAgICAgICA/IGZvcm1hdERlY2xhcmVBY3Rpb24odmFsdWVzLmFjdGlvbiwgdmFsdWVzLnJvbGwsIHRleHQsIGxvbmVsb2dPcHRzKHBsdWdpbi5zZXR0aW5ncykpXG4gICAgICAgICAgICA6IGA+IFtBY3Rpb25dICR7dmFsdWVzLmFjdGlvbn0gfCBSb2xsOiAke3ZhbHVlcy5yb2xsfVxcbj4gW1Jlc3VsdF0gJHt0ZXh0LnRyaW0oKS5yZXBsYWNlKC9cXG4vZywgXCJcXG4+IFwiKX1gXG4gICAgICApO1xuICAgIH1cbiAgfSk7XG5cbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOmFzay1vcmFjbGVcIixcbiAgICBuYW1lOiBcIkFzayBPcmFjbGVcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY29udGV4dCA9IGF3YWl0IHBsdWdpbi5nZXRBY3RpdmVOb3RlQ29udGV4dCgpO1xuICAgICAgaWYgKCFjb250ZXh0KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHZhbHVlcyA9IGF3YWl0IG9wZW5JbnB1dE1vZGFsKHBsdWdpbi5hcHAsIFwiQXNrIE9yYWNsZVwiLCBbXG4gICAgICAgIHsga2V5OiBcInF1ZXN0aW9uXCIsIGxhYmVsOiBcIlF1ZXN0aW9uXCIgfSxcbiAgICAgICAgeyBrZXk6IFwicmVzdWx0XCIsIGxhYmVsOiBcIk9yYWNsZSByZXN1bHRcIiwgb3B0aW9uYWw6IHRydWUgfVxuICAgICAgXSk7XG4gICAgICBpZiAoIXZhbHVlcz8ucXVlc3Rpb24pIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgaGFzUmVzdWx0ID0gQm9vbGVhbih2YWx1ZXMucmVzdWx0Py50cmltKCkpO1xuICAgICAgY29uc3QgbWVzc2FnZSA9IGhhc1Jlc3VsdFxuICAgICAgICA/IGBPcmFjbGUgcXVlc3Rpb246ICR7dmFsdWVzLnF1ZXN0aW9ufVxcbk9yYWNsZSByZXN1bHQ6ICR7dmFsdWVzLnJlc3VsdH1cXG5JbnRlcnByZXQgdGhpcyByZXN1bHQgaW4gdGhlIGNvbnRleHQgb2YgdGhlIHNjZW5lLiBUaGlyZCBwZXJzb24sIG5ldXRyYWwsIDItMyBsaW5lcy5gXG4gICAgICAgIDogYE9yYWNsZSBxdWVzdGlvbjogJHt2YWx1ZXMucXVlc3Rpb259XFxuT3JhY2xlIG1vZGU6ICR7Y29udGV4dC5mbS5vcmFjbGVfbW9kZSA/PyBcInllcy1ub1wifVxcblJ1biB0aGUgb3JhY2xlIGFuZCBnaXZlIHRoZSByZXN1bHQgcGx1cyBhIDEtMiBsaW5lIG5ldXRyYWwgaW50ZXJwcmV0YXRpb24uYDtcbiAgICAgIGF3YWl0IHJ1bkdlbmVyYXRpb24oXG4gICAgICAgIHBsdWdpbixcbiAgICAgICAgbWVzc2FnZSxcbiAgICAgICAgKHRleHQsIGZtKSA9PiB7XG4gICAgICAgICAgaWYgKCFpc0xvbmVsb2dBY3RpdmUocGx1Z2luLnNldHRpbmdzLCBmbSkpIHtcbiAgICAgICAgICAgIHJldHVybiBgPiBbT3JhY2xlXSBROiAke3ZhbHVlcy5xdWVzdGlvbn1cXG4+IFtBbnN3ZXJdICR7dGV4dC50cmltKCkucmVwbGFjZSgvXFxuL2csIFwiXFxuPiBcIil9YDtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGhhc1Jlc3VsdCkge1xuICAgICAgICAgICAgcmV0dXJuIGZvcm1hdEFza09yYWNsZSh2YWx1ZXMucXVlc3Rpb24sIHZhbHVlcy5yZXN1bHQudHJpbSgpLCB0ZXh0LCBsb25lbG9nT3B0cyhwbHVnaW4uc2V0dGluZ3MpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgcGFyc2VkID0gcGFyc2VMb25lbG9nT3JhY2xlUmVzcG9uc2UodGV4dCk7XG4gICAgICAgICAgcmV0dXJuIGZvcm1hdEFza09yYWNsZSh2YWx1ZXMucXVlc3Rpb24sIHBhcnNlZC5yZXN1bHQsIHBhcnNlZC5pbnRlcnByZXRhdGlvbiwgbG9uZWxvZ09wdHMocGx1Z2luLnNldHRpbmdzKSk7XG4gICAgICAgIH1cbiAgICAgICk7XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6aW50ZXJwcmV0LW9yYWNsZVwiLFxuICAgIG5hbWU6IFwiSW50ZXJwcmV0IE9yYWNsZSBSb2xsXCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGNvbnRleHQgPSBhd2FpdCBwbHVnaW4uZ2V0QWN0aXZlTm90ZUNvbnRleHQoKTtcbiAgICAgIGlmICghY29udGV4dCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBsZXQgc2VsZWN0ZWQgPSBnZXRTZWxlY3Rpb24oY29udGV4dC52aWV3LmVkaXRvcik7XG4gICAgICBpZiAoIXNlbGVjdGVkKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlcyA9IGF3YWl0IG9wZW5JbnB1dE1vZGFsKHBsdWdpbi5hcHAsIFwiSW50ZXJwcmV0IE9yYWNsZSBSZXN1bHRcIiwgW1xuICAgICAgICAgIHsga2V5OiBcIm9yYWNsZVwiLCBsYWJlbDogXCJPcmFjbGUgcmVzdWx0XCIgfVxuICAgICAgICBdKTtcbiAgICAgICAgc2VsZWN0ZWQgPSB2YWx1ZXM/Lm9yYWNsZT8udHJpbSgpID8/IFwiXCI7XG4gICAgICB9XG4gICAgICBpZiAoIXNlbGVjdGVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGF3YWl0IHJ1bkdlbmVyYXRpb24oXG4gICAgICAgIHBsdWdpbixcbiAgICAgICAgYEludGVycHJldCB0aGlzIG9yYWNsZSByZXN1bHQgaW4gdGhlIGNvbnRleHQgb2YgdGhlIGN1cnJlbnQgc2NlbmU6IFwiJHtzZWxlY3RlZH1cIlxcbk5ldXRyYWwsIHRoaXJkLXBlcnNvbiwgMi0zIGxpbmVzLiBObyBkcmFtYXRpYyBsYW5ndWFnZS5gLFxuICAgICAgICAodGV4dCwgZm0pID0+XG4gICAgICAgICAgaXNMb25lbG9nQWN0aXZlKHBsdWdpbi5zZXR0aW5ncywgZm0pXG4gICAgICAgICAgICA/IGZvcm1hdEludGVycHJldE9yYWNsZShzZWxlY3RlZCwgdGV4dCwgbG9uZWxvZ09wdHMocGx1Z2luLnNldHRpbmdzKSlcbiAgICAgICAgICAgIDogZ2VuZXJpY0Jsb2NrcXVvdGUoXCJJbnRlcnByZXRhdGlvblwiLCB0ZXh0KSxcbiAgICAgICAgNTEyLFxuICAgICAgICBcImJlbG93LXNlbGVjdGlvblwiXG4gICAgICApO1xuICAgIH1cbiAgfSk7XG5cbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOnN1Z2dlc3QtY29uc2VxdWVuY2VcIixcbiAgICBuYW1lOiBcIldoYXQgTm93XCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGF3YWl0IHJ1bkdlbmVyYXRpb24oXG4gICAgICAgIHBsdWdpbixcbiAgICAgICAgXCJCYXNlZCBvbiB0aGUgY3VycmVudCBzY2VuZSBjb250ZXh0LCBzdWdnZXN0IDEtMiBwb3NzaWJsZSBjb25zZXF1ZW5jZXMgb3IgY29tcGxpY2F0aW9ucy4gUHJlc2VudCB0aGVtIGFzIG5ldXRyYWwgb3B0aW9ucywgbm90IGFzIG5hcnJhdGl2ZSBvdXRjb21lcy4gRG8gbm90IGNob29zZSBiZXR3ZWVuIHRoZW0uXCIsXG4gICAgICAgICh0ZXh0LCBmbSkgPT5cbiAgICAgICAgICBpc0xvbmVsb2dBY3RpdmUocGx1Z2luLnNldHRpbmdzLCBmbSlcbiAgICAgICAgICAgID8gZm9ybWF0U3VnZ2VzdENvbnNlcXVlbmNlKHRleHQsIGxvbmVsb2dPcHRzKHBsdWdpbi5zZXR0aW5ncykpXG4gICAgICAgICAgICA6IGdlbmVyaWNCbG9ja3F1b3RlKFwiT3B0aW9uc1wiLCB0ZXh0KVxuICAgICAgKTtcbiAgICB9XG4gIH0pO1xuXG4gIHBsdWdpbi5hZGRDb21tYW5kKHtcbiAgICBpZDogXCJzeWJ5bDp3aGF0LWNhbi1pLWRvXCIsXG4gICAgbmFtZTogXCJXaGF0IENhbiBJIERvXCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGF3YWl0IHJ1bkdlbmVyYXRpb24oXG4gICAgICAgIHBsdWdpbixcbiAgICAgICAgXCJUaGUgcGxheWVyIGlzIHN0dWNrLiBCYXNlZCBvbiB0aGUgY3VycmVudCBzY2VuZSBjb250ZXh0LCBzdWdnZXN0IGV4YWN0bHkgMyBjb25jcmV0ZSBhY3Rpb25zIHRoZSBQQyBjb3VsZCB0YWtlIG5leHQuIFByZXNlbnQgdGhlbSBhcyBuZXV0cmFsIG9wdGlvbnMgbnVtYmVyZWQgMVx1MjAxMzMuIERvIG5vdCByZXNvbHZlIG9yIG5hcnJhdGUgYW55IG91dGNvbWUuIERvIG5vdCByZWNvbW1lbmQgb25lIG92ZXIgYW5vdGhlci5cIixcbiAgICAgICAgKHRleHQsIGZtKSA9PlxuICAgICAgICAgIGlzTG9uZWxvZ0FjdGl2ZShwbHVnaW4uc2V0dGluZ3MsIGZtKVxuICAgICAgICAgICAgPyBmb3JtYXRTdWdnZXN0Q29uc2VxdWVuY2UodGV4dCwgbG9uZWxvZ09wdHMocGx1Z2luLnNldHRpbmdzKSlcbiAgICAgICAgICAgIDogZ2VuZXJpY0Jsb2NrcXVvdGUoXCJBY3Rpb25zXCIsIHRleHQpXG4gICAgICApO1xuICAgIH1cbiAgfSk7XG5cbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOmV4cGFuZC1zY2VuZVwiLFxuICAgIG5hbWU6IFwiRXhwYW5kIFNjZW5lXCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGF3YWl0IHJ1bkdlbmVyYXRpb24oXG4gICAgICAgIHBsdWdpbixcbiAgICAgICAgXCJFeHBhbmQgdGhlIGN1cnJlbnQgc2NlbmUgaW50byBhIHByb3NlIHBhc3NhZ2UuIFRoaXJkIHBlcnNvbiwgcGFzdCB0ZW5zZSwgMTAwLTE1MCB3b3Jkcy4gTm8gZGlhbG9ndWUuIERvIG5vdCBkZXNjcmliZSB0aGUgUEMncyBpbnRlcm5hbCB0aG91Z2h0cyBvciBkZWNpc2lvbnMuIFN0YXkgc3RyaWN0bHkgd2l0aGluIHRoZSBlc3RhYmxpc2hlZCBzY2VuZSBjb250ZXh0LlwiLFxuICAgICAgICAodGV4dCwgZm0pID0+XG4gICAgICAgICAgaXNMb25lbG9nQWN0aXZlKHBsdWdpbi5zZXR0aW5ncywgZm0pXG4gICAgICAgICAgICA/IGZvcm1hdEV4cGFuZFNjZW5lKHRleHQsIGxvbmVsb2dPcHRzKHBsdWdpbi5zZXR0aW5ncykpXG4gICAgICAgICAgICA6IGAtLS1cXG4+IFtQcm9zZV0gJHt0ZXh0LnRyaW0oKS5yZXBsYWNlKC9cXG4vZywgXCJcXG4+IFwiKX1cXG4tLS1gLFxuICAgICAgICA2MDBcbiAgICAgICk7XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6dXBsb2FkLXNvdXJjZVwiLFxuICAgIG5hbWU6IFwiQWRkIFNvdXJjZSBGaWxlXCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGNvbnRleHQgPSBhd2FpdCBwbHVnaW4uZ2V0QWN0aXZlTm90ZUNvbnRleHQoKTtcbiAgICAgIGlmICghY29udGV4dD8udmlldy5maWxlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGFkZFNvdXJjZVRvTm90ZShwbHVnaW4sIGNvbnRleHQudmlldy5maWxlKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoYFN5YnlsIGVycm9yOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIHBsdWdpbi5hZGRDb21tYW5kKHtcbiAgICBpZDogXCJzeWJ5bDptYW5hZ2Utc291cmNlc1wiLFxuICAgIG5hbWU6IFwiTWFuYWdlIFNvdXJjZXNcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgYXdhaXQgbWFuYWdlU291cmNlcyhwbHVnaW4pO1xuICAgIH1cbiAgfSk7XG5cbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOmxvbmVsb2ctcGFyc2UtY29udGV4dFwiLFxuICAgIG5hbWU6IFwiVXBkYXRlIFNjZW5lIENvbnRleHRcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY29udGV4dCA9IGF3YWl0IHBsdWdpbi5nZXRBY3RpdmVOb3RlQ29udGV4dCgpO1xuICAgICAgaWYgKCFjb250ZXh0Py52aWV3LmZpbGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKCFpc0xvbmVsb2dBY3RpdmUocGx1Z2luLnNldHRpbmdzLCBjb250ZXh0LmZtKSkge1xuICAgICAgICBuZXcgTm90aWNlKFwiTG9uZWxvZyBtb2RlIGlzIG5vdCBlbmFibGVkIGZvciB0aGlzIG5vdGUuXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCBwYXJzZWQgPSBwYXJzZUxvbmVsb2dDb250ZXh0KGNvbnRleHQubm90ZUJvZHksIHBsdWdpbi5zZXR0aW5ncy5sb25lbG9nQ29udGV4dERlcHRoKTtcbiAgICAgIGF3YWl0IHdyaXRlRnJvbnRNYXR0ZXJLZXkocGx1Z2luLmFwcCwgY29udGV4dC52aWV3LmZpbGUsIFwic2NlbmVfY29udGV4dFwiLCBzZXJpYWxpemVDb250ZXh0KHBhcnNlZCkpO1xuICAgICAgbmV3IE5vdGljZShcIlNjZW5lIGNvbnRleHQgdXBkYXRlZCBmcm9tIGxvZy5cIik7XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6bG9uZWxvZy1zZXNzaW9uLWJyZWFrXCIsXG4gICAgbmFtZTogXCJOZXcgU2Vzc2lvbiBIZWFkZXJcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY29udGV4dCA9IGF3YWl0IHBsdWdpbi5nZXRBY3RpdmVOb3RlQ29udGV4dCgpO1xuICAgICAgaWYgKCFjb250ZXh0Py52aWV3LmZpbGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKCFpc0xvbmVsb2dBY3RpdmUocGx1Z2luLnNldHRpbmdzLCBjb250ZXh0LmZtKSkge1xuICAgICAgICBuZXcgTm90aWNlKFwiTG9uZWxvZyBtb2RlIGlzIG5vdCBlbmFibGVkIGZvciB0aGlzIG5vdGUuXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCB2YWx1ZXMgPSBhd2FpdCBvcGVuSW5wdXRNb2RhbChwbHVnaW4uYXBwLCBcIk5ldyBTZXNzaW9uIEhlYWRlclwiLCBbXG4gICAgICAgIHsga2V5OiBcImRhdGVcIiwgbGFiZWw6IFwiRGF0ZVwiLCB2YWx1ZTogdG9kYXlJc29EYXRlKCkgfSxcbiAgICAgICAgeyBrZXk6IFwiZHVyYXRpb25cIiwgbGFiZWw6IFwiRHVyYXRpb25cIiwgcGxhY2Vob2xkZXI6IFwiMWgzMFwiIH0sXG4gICAgICAgIHsga2V5OiBcInJlY2FwXCIsIGxhYmVsOiBcIlJlY2FwXCIsIG9wdGlvbmFsOiB0cnVlIH1cbiAgICAgIF0pO1xuICAgICAgaWYgKCF2YWx1ZXM/LmRhdGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3Qgc2Vzc2lvbk51bWJlciA9IGNvbnRleHQuZm0uc2Vzc2lvbl9udW1iZXIgPz8gMTtcbiAgICAgIGNvbnN0IGJsb2NrID0gYCMjIFNlc3Npb24gJHtzZXNzaW9uTnVtYmVyfVxcbipEYXRlOiAke3ZhbHVlcy5kYXRlfSB8IER1cmF0aW9uOiAke3ZhbHVlcy5kdXJhdGlvbiB8fCBcIi1cIn0qXFxuXFxuJHt2YWx1ZXMucmVjYXAgPyBgKipSZWNhcDoqKiAke3ZhbHVlcy5yZWNhcH1cXG5cXG5gIDogXCJcIn1gO1xuICAgICAgcGx1Z2luLmluc2VydFRleHQoY29udGV4dC52aWV3LCBibG9jaywgXCJjdXJzb3JcIik7XG4gICAgICBhd2FpdCB3cml0ZUZyb250TWF0dGVyS2V5KHBsdWdpbi5hcHAsIGNvbnRleHQudmlldy5maWxlLCBcInNlc3Npb25fbnVtYmVyXCIsIHNlc3Npb25OdW1iZXIgKyAxKTtcbiAgICB9XG4gIH0pO1xufVxuIiwgImV4cG9ydCBpbnRlcmZhY2UgTG9uZWxvZ0Zvcm1hdE9wdGlvbnMge1xuICB3cmFwSW5Db2RlQmxvY2s6IGJvb2xlYW47XG4gIHNjZW5lSWQ/OiBzdHJpbmc7XG59XG5cbmZ1bmN0aW9uIGZlbmNlKGNvbnRlbnQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBgXFxgXFxgXFxgXFxuJHtjb250ZW50fVxcblxcYFxcYFxcYGA7XG59XG5cbmZ1bmN0aW9uIGNsZWFuQWlUZXh0KHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiB0ZXh0LnJlcGxhY2UoL14+XFxzKi9nbSwgXCJcIikudHJpbSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0U3RhcnRTY2VuZShcbiAgYWlUZXh0OiBzdHJpbmcsXG4gIHNjZW5lSWQ6IHN0cmluZyxcbiAgc2NlbmVEZXNjOiBzdHJpbmcsXG4gIF9vcHRzOiBMb25lbG9nRm9ybWF0T3B0aW9uc1xuKTogc3RyaW5nIHtcbiAgY29uc3QgaGVhZGVyID0gYCMjIyAke3NjZW5lSWR9ICoke3NjZW5lRGVzY30qYDtcbiAgY29uc3QgYm9keSA9IGNsZWFuQWlUZXh0KGFpVGV4dCk7XG4gIHJldHVybiBgJHtoZWFkZXJ9XFxuXFxuJHtib2R5fWA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXREZWNsYXJlQWN0aW9uKFxuICBhY3Rpb246IHN0cmluZyxcbiAgcm9sbDogc3RyaW5nLFxuICBhaUNvbnNlcXVlbmNlOiBzdHJpbmcsXG4gIG9wdHM6IExvbmVsb2dGb3JtYXRPcHRpb25zXG4pOiBzdHJpbmcge1xuICBjb25zdCBjb25zZXF1ZW5jZSA9IGNsZWFuQWlUZXh0KGFpQ29uc2VxdWVuY2UpXG4gICAgLnNwbGl0KFwiXFxuXCIpXG4gICAgLmZpbHRlcihCb29sZWFuKVxuICAgIC5tYXAoKGxpbmUpID0+IChsaW5lLnN0YXJ0c1dpdGgoXCI9PlwiKSA/IGxpbmUgOiBgPT4gJHtsaW5lfWApKVxuICAgIC5qb2luKFwiXFxuXCIpO1xuICBjb25zdCBub3RhdGlvbiA9IGBAICR7YWN0aW9ufVxcbmQ6ICR7cm9sbH1cXG4ke2NvbnNlcXVlbmNlfWA7XG4gIHJldHVybiBvcHRzLndyYXBJbkNvZGVCbG9jayA/IGZlbmNlKG5vdGF0aW9uKSA6IG5vdGF0aW9uO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0QXNrT3JhY2xlKFxuICBxdWVzdGlvbjogc3RyaW5nLFxuICBvcmFjbGVSZXN1bHQ6IHN0cmluZyxcbiAgYWlJbnRlcnByZXRhdGlvbjogc3RyaW5nLFxuICBvcHRzOiBMb25lbG9nRm9ybWF0T3B0aW9uc1xuKTogc3RyaW5nIHtcbiAgY29uc3QgaW50ZXJwcmV0YXRpb24gPSBjbGVhbkFpVGV4dChhaUludGVycHJldGF0aW9uKVxuICAgIC5zcGxpdChcIlxcblwiKVxuICAgIC5maWx0ZXIoQm9vbGVhbilcbiAgICAubWFwKChsaW5lKSA9PiAobGluZS5zdGFydHNXaXRoKFwiPT5cIikgPyBsaW5lIDogYD0+ICR7bGluZX1gKSlcbiAgICAuam9pbihcIlxcblwiKTtcbiAgY29uc3Qgbm90YXRpb24gPSBgPyAke3F1ZXN0aW9ufVxcbi0+ICR7b3JhY2xlUmVzdWx0fVxcbiR7aW50ZXJwcmV0YXRpb259YDtcbiAgcmV0dXJuIG9wdHMud3JhcEluQ29kZUJsb2NrID8gZmVuY2Uobm90YXRpb24pIDogbm90YXRpb247XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRJbnRlcnByZXRPcmFjbGUoXG4gIG9yYWNsZVRleHQ6IHN0cmluZyxcbiAgYWlJbnRlcnByZXRhdGlvbjogc3RyaW5nLFxuICBvcHRzOiBMb25lbG9nRm9ybWF0T3B0aW9uc1xuKTogc3RyaW5nIHtcbiAgY29uc3QgaW50ZXJwcmV0YXRpb24gPSBjbGVhbkFpVGV4dChhaUludGVycHJldGF0aW9uKVxuICAgIC5zcGxpdChcIlxcblwiKVxuICAgIC5maWx0ZXIoQm9vbGVhbilcbiAgICAubWFwKChsaW5lKSA9PiAobGluZS5zdGFydHNXaXRoKFwiPT5cIikgPyBsaW5lIDogYD0+ICR7bGluZX1gKSlcbiAgICAuam9pbihcIlxcblwiKTtcbiAgY29uc3Qgbm90YXRpb24gPSBgLT4gJHtvcmFjbGVUZXh0fVxcbiR7aW50ZXJwcmV0YXRpb259YDtcbiAgcmV0dXJuIG9wdHMud3JhcEluQ29kZUJsb2NrID8gZmVuY2Uobm90YXRpb24pIDogbm90YXRpb247XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRTdWdnZXN0Q29uc2VxdWVuY2UoYWlPcHRpb25zOiBzdHJpbmcsIG9wdHM6IExvbmVsb2dGb3JtYXRPcHRpb25zKTogc3RyaW5nIHtcbiAgY29uc3Qgb3B0aW9ucyA9IGNsZWFuQWlUZXh0KGFpT3B0aW9ucylcbiAgICAuc3BsaXQoXCJcXG5cIilcbiAgICAuZmlsdGVyKChsaW5lKSA9PiBsaW5lLnRyaW0oKS5sZW5ndGggPiAwKVxuICAgIC5tYXAoKGxpbmUpID0+IChsaW5lLnN0YXJ0c1dpdGgoXCI9PlwiKSA/IGxpbmUgOiBgPT4gJHtsaW5lfWApKVxuICAgIC5qb2luKFwiXFxuXCIpO1xuICByZXR1cm4gb3B0cy53cmFwSW5Db2RlQmxvY2sgPyBmZW5jZShvcHRpb25zKSA6IG9wdGlvbnM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRFeHBhbmRTY2VuZShhaVByb3NlOiBzdHJpbmcsIF9vcHRzOiBMb25lbG9nRm9ybWF0T3B0aW9ucyk6IHN0cmluZyB7XG4gIHJldHVybiBgXFxcXC0tLVxcbiR7Y2xlYW5BaVRleHQoYWlQcm9zZSl9XFxuLS0tXFxcXGA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRBZHZlbnR1cmVTZWVkKGFpVGV4dDogc3RyaW5nLCBvcHRzOiBMb25lbG9nRm9ybWF0T3B0aW9ucyk6IHN0cmluZyB7XG4gIGNvbnN0IGF4ZXMgPSBjbGVhbkFpVGV4dChhaVRleHQpXG4gICAgLnNwbGl0KFwiXFxuXCIpXG4gICAgLmZpbHRlcihCb29sZWFuKVxuICAgIC5tYXAoKGxpbmUpID0+IFwiICBcIiArIGxpbmUucmVwbGFjZSgvXlstKl1cXHMqLywgXCJcIikpXG4gICAgLmpvaW4oXCJcXG5cIik7XG4gIGNvbnN0IG5vdGF0aW9uID0gYGdlbjogQWR2ZW50dXJlIFNlZWRcXG4ke2F4ZXN9YDtcbiAgcmV0dXJuIG9wdHMud3JhcEluQ29kZUJsb2NrID8gZmVuY2Uobm90YXRpb24pIDogbm90YXRpb247XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRDaGFyYWN0ZXIoYWlUZXh0OiBzdHJpbmcsIF9vcHRzOiBMb25lbG9nRm9ybWF0T3B0aW9ucyk6IHN0cmluZyB7XG4gIHJldHVybiBjbGVhbkFpVGV4dChhaVRleHQpO1xufVxuIiwgImltcG9ydCB7IEFwcCwgTW9kYWwsIE5vdGljZSwgU2V0dGluZywgVEZpbGUgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IGRlc2NyaWJlU291cmNlUmVmLCBsaXN0VmF1bHRDYW5kaWRhdGVGaWxlcyB9IGZyb20gXCIuL3NvdXJjZVV0aWxzXCI7XG5pbXBvcnQgeyBNb2RhbEZpZWxkLCBTb3VyY2VSZWYgfSBmcm9tIFwiLi90eXBlc1wiO1xuXG5leHBvcnQgY2xhc3MgSW5wdXRNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgcHJpdmF0ZSByZWFkb25seSB2YWx1ZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG5cbiAgY29uc3RydWN0b3IoXG4gICAgYXBwOiBBcHAsXG4gICAgcHJpdmF0ZSByZWFkb25seSB0aXRsZTogc3RyaW5nLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgZmllbGRzOiBNb2RhbEZpZWxkW10sXG4gICAgcHJpdmF0ZSByZWFkb25seSBvblN1Ym1pdDogKHZhbHVlczogUmVjb3JkPHN0cmluZywgc3RyaW5nPikgPT4gdm9pZFxuICApIHtcbiAgICBzdXBlcihhcHApO1xuICAgIHRoaXMudmFsdWVzID0gZmllbGRzLnJlZHVjZTxSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+PigoYWNjLCBmaWVsZCkgPT4ge1xuICAgICAgYWNjW2ZpZWxkLmtleV0gPSBmaWVsZC52YWx1ZSA/PyBcIlwiO1xuICAgICAgcmV0dXJuIGFjYztcbiAgICB9LCB7fSk7XG4gIH1cblxuICBvbk9wZW4oKTogdm9pZCB7XG4gICAgdGhpcy50aXRsZUVsLnNldFRleHQodGhpcy50aXRsZSk7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICBmb3IgKGNvbnN0IGZpZWxkIG9mIHRoaXMuZmllbGRzKSB7XG4gICAgICBuZXcgU2V0dGluZyh0aGlzLmNvbnRlbnRFbClcbiAgICAgICAgLnNldE5hbWUoZmllbGQubGFiZWwpXG4gICAgICAgIC5zZXREZXNjKGZpZWxkLm9wdGlvbmFsID8gXCJPcHRpb25hbFwiIDogXCJcIilcbiAgICAgICAgLmFkZFRleHQoKHRleHQpID0+IHtcbiAgICAgICAgICB0ZXh0LnNldFBsYWNlaG9sZGVyKGZpZWxkLnBsYWNlaG9sZGVyID8/IFwiXCIpO1xuICAgICAgICAgIHRleHQuc2V0VmFsdWUodGhpcy52YWx1ZXNbZmllbGQua2V5XSA/PyBcIlwiKTtcbiAgICAgICAgICB0ZXh0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgdGhpcy52YWx1ZXNbZmllbGQua2V5XSA9IHZhbHVlO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgbmV3IFNldHRpbmcodGhpcy5jb250ZW50RWwpLmFkZEJ1dHRvbigoYnV0dG9uKSA9PiB7XG4gICAgICBidXR0b24uc2V0QnV0dG9uVGV4dChcIkNvbmZpcm1cIikuc2V0Q3RhKCkub25DbGljaygoKSA9PiB7XG4gICAgICAgIHRoaXMub25TdWJtaXQodGhpcy52YWx1ZXMpO1xuICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIG9uQ2xvc2UoKTogdm9pZCB7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gb3BlbklucHV0TW9kYWwoXG4gIGFwcDogQXBwLFxuICB0aXRsZTogc3RyaW5nLFxuICBmaWVsZHM6IE1vZGFsRmllbGRbXVxuKTogUHJvbWlzZTxSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+IHwgbnVsbD4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICBsZXQgc2V0dGxlZCA9IGZhbHNlO1xuICAgIGNvbnN0IG1vZGFsID0gbmV3IElucHV0TW9kYWwoYXBwLCB0aXRsZSwgZmllbGRzLCAodmFsdWVzKSA9PiB7XG4gICAgICBzZXR0bGVkID0gdHJ1ZTtcbiAgICAgIHJlc29sdmUodmFsdWVzKTtcbiAgICB9KTtcbiAgICBjb25zdCBvcmlnaW5hbENsb3NlID0gbW9kYWwub25DbG9zZS5iaW5kKG1vZGFsKTtcbiAgICBtb2RhbC5vbkNsb3NlID0gKCkgPT4ge1xuICAgICAgb3JpZ2luYWxDbG9zZSgpO1xuICAgICAgaWYgKCFzZXR0bGVkKSB7XG4gICAgICAgIHJlc29sdmUobnVsbCk7XG4gICAgICB9XG4gICAgfTtcbiAgICBtb2RhbC5vcGVuKCk7XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGlja0xvY2FsRmlsZSgpOiBQcm9taXNlPEZpbGUgfCBudWxsPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIGNvbnN0IGlucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlucHV0XCIpO1xuICAgIGlucHV0LnR5cGUgPSBcImZpbGVcIjtcbiAgICBpbnB1dC5hY2NlcHQgPSBcIi5wZGYsLnR4dCwubWQsLm1hcmtkb3duXCI7XG4gICAgaW5wdXQub25jaGFuZ2UgPSAoKSA9PiByZXNvbHZlKGlucHV0LmZpbGVzPy5bMF0gPz8gbnVsbCk7XG4gICAgaW5wdXQuY2xpY2soKTtcbiAgfSk7XG59XG5cbmV4cG9ydCBjbGFzcyBWYXVsdEZpbGVQaWNrZXJNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgcHJpdmF0ZSByZWFkb25seSBmaWxlczogVEZpbGVbXTtcblxuICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcHJpdmF0ZSByZWFkb25seSB0aXRsZTogc3RyaW5nLCBwcml2YXRlIHJlYWRvbmx5IG9uUGljazogKGZpbGU6IFRGaWxlKSA9PiB2b2lkKSB7XG4gICAgc3VwZXIoYXBwKTtcbiAgICB0aGlzLmZpbGVzID0gbGlzdFZhdWx0Q2FuZGlkYXRlRmlsZXMoYXBwKTtcbiAgfVxuXG4gIG9uT3BlbigpOiB2b2lkIHtcbiAgICB0aGlzLnRpdGxlRWwuc2V0VGV4dCh0aGlzLnRpdGxlKTtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIGlmICghdGhpcy5maWxlcy5sZW5ndGgpIHtcbiAgICAgIHRoaXMuY29udGVudEVsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IFwiTm8gUERGIG9yIHRleHQgZmlsZXMgZm91bmQgaW4gdGhlIHZhdWx0LlwiIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmZpbGVzLmZvckVhY2goKGZpbGUpID0+IHtcbiAgICAgIG5ldyBTZXR0aW5nKHRoaXMuY29udGVudEVsKVxuICAgICAgICAuc2V0TmFtZShmaWxlLnBhdGgpXG4gICAgICAgIC5zZXREZXNjKGZpbGUuZXh0ZW5zaW9uLnRvTG93ZXJDYXNlKCkpXG4gICAgICAgIC5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xuICAgICAgICAgIGJ1dHRvbi5zZXRCdXR0b25UZXh0KFwiU2VsZWN0XCIpLnNldEN0YSgpLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5vblBpY2soZmlsZSk7XG4gICAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgb25DbG9zZSgpOiB2b2lkIHtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwaWNrVmF1bHRGaWxlKGFwcDogQXBwLCB0aXRsZTogc3RyaW5nKTogUHJvbWlzZTxURmlsZSB8IG51bGw+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgbGV0IHNldHRsZWQgPSBmYWxzZTtcbiAgICBjb25zdCBtb2RhbCA9IG5ldyBWYXVsdEZpbGVQaWNrZXJNb2RhbChhcHAsIHRpdGxlLCAoZmlsZSkgPT4ge1xuICAgICAgc2V0dGxlZCA9IHRydWU7XG4gICAgICByZXNvbHZlKGZpbGUpO1xuICAgIH0pO1xuICAgIGNvbnN0IG9yaWdpbmFsQ2xvc2UgPSBtb2RhbC5vbkNsb3NlLmJpbmQobW9kYWwpO1xuICAgIG1vZGFsLm9uQ2xvc2UgPSAoKSA9PiB7XG4gICAgICBvcmlnaW5hbENsb3NlKCk7XG4gICAgICBpZiAoIXNldHRsZWQpIHtcbiAgICAgICAgcmVzb2x2ZShudWxsKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIG1vZGFsLm9wZW4oKTtcbiAgfSk7XG59XG5cbmV4cG9ydCBjbGFzcyBTb3VyY2VPcmlnaW5Nb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHByaXZhdGUgcmVhZG9ubHkgb25QaWNrOiAob3JpZ2luOiBcInZhdWx0XCIgfCBcImV4dGVybmFsXCIpID0+IHZvaWQpIHtcbiAgICBzdXBlcihhcHApO1xuICB9XG5cbiAgb25PcGVuKCk6IHZvaWQge1xuICAgIHRoaXMudGl0bGVFbC5zZXRUZXh0KFwiQWRkIFNvdXJjZSBGaWxlXCIpO1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gICAgbmV3IFNldHRpbmcodGhpcy5jb250ZW50RWwpXG4gICAgICAuc2V0TmFtZShcIlZhdWx0IGZpbGVcIilcbiAgICAgIC5zZXREZXNjKFwiUGljayBhIGZpbGUgYWxyZWFkeSBpbiB5b3VyIHZhdWx0XCIpXG4gICAgICAuYWRkQnV0dG9uKChidG4pID0+IGJ0bi5zZXRCdXR0b25UZXh0KFwiQ2hvb3NlXCIpLnNldEN0YSgpLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICB0aGlzLm9uUGljayhcInZhdWx0XCIpO1xuICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICB9KSk7XG4gICAgbmV3IFNldHRpbmcodGhpcy5jb250ZW50RWwpXG4gICAgICAuc2V0TmFtZShcIkV4dGVybmFsIGZpbGVcIilcbiAgICAgIC5zZXREZXNjKFwiSW1wb3J0IGEgZmlsZSBmcm9tIHlvdXIgY29tcHV0ZXIgXHUyMDE0IHNhdmVkIGludG8gYSBzb3VyY2VzLyBzdWJmb2xkZXIgbmV4dCB0byB0aGlzIG5vdGVcIilcbiAgICAgIC5hZGRCdXR0b24oKGJ0bikgPT4gYnRuLnNldEJ1dHRvblRleHQoXCJJbXBvcnRcIikuc2V0Q3RhKCkub25DbGljaygoKSA9PiB7XG4gICAgICAgIHRoaXMub25QaWNrKFwiZXh0ZXJuYWxcIik7XG4gICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgIH0pKTtcbiAgfVxuXG4gIG9uQ2xvc2UoKTogdm9pZCB7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcGlja1NvdXJjZU9yaWdpbihhcHA6IEFwcCk6IFByb21pc2U8XCJ2YXVsdFwiIHwgXCJleHRlcm5hbFwiIHwgbnVsbD4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICBsZXQgc2V0dGxlZCA9IGZhbHNlO1xuICAgIGNvbnN0IG1vZGFsID0gbmV3IFNvdXJjZU9yaWdpbk1vZGFsKGFwcCwgKG9yaWdpbikgPT4ge1xuICAgICAgc2V0dGxlZCA9IHRydWU7XG4gICAgICByZXNvbHZlKG9yaWdpbik7XG4gICAgfSk7XG4gICAgY29uc3Qgb3JpZ2luYWxDbG9zZSA9IG1vZGFsLm9uQ2xvc2UuYmluZChtb2RhbCk7XG4gICAgbW9kYWwub25DbG9zZSA9ICgpID0+IHtcbiAgICAgIG9yaWdpbmFsQ2xvc2UoKTtcbiAgICAgIGlmICghc2V0dGxlZCkgcmVzb2x2ZShudWxsKTtcbiAgICB9O1xuICAgIG1vZGFsLm9wZW4oKTtcbiAgfSk7XG59XG5cbmV4cG9ydCBjbGFzcyBTb3VyY2VQaWNrZXJNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgY29uc3RydWN0b3IoXG4gICAgYXBwOiBBcHAsXG4gICAgcHJpdmF0ZSByZWFkb25seSB0aXRsZTogc3RyaW5nLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgc291cmNlczogU291cmNlUmVmW10sXG4gICAgcHJpdmF0ZSByZWFkb25seSBvblBpY2s6IChyZWY6IFNvdXJjZVJlZikgPT4gdm9pZFxuICApIHtcbiAgICBzdXBlcihhcHApO1xuICB9XG5cbiAgb25PcGVuKCk6IHZvaWQge1xuICAgIHRoaXMudGl0bGVFbC5zZXRUZXh0KHRoaXMudGl0bGUpO1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gICAgdGhpcy5zb3VyY2VzLmZvckVhY2goKHNvdXJjZSkgPT4ge1xuICAgICAgbmV3IFNldHRpbmcodGhpcy5jb250ZW50RWwpXG4gICAgICAgIC5zZXROYW1lKHNvdXJjZS5sYWJlbClcbiAgICAgICAgLnNldERlc2MoYCR7c291cmNlLm1pbWVfdHlwZX0gfCAke2Rlc2NyaWJlU291cmNlUmVmKHNvdXJjZSl9YClcbiAgICAgICAgLmFkZEJ1dHRvbigoYnV0dG9uKSA9PiB7XG4gICAgICAgICAgYnV0dG9uLnNldEJ1dHRvblRleHQoXCJTZWxlY3RcIikuc2V0Q3RhKCkub25DbGljaygoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLm9uUGljayhzb3VyY2UpO1xuICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIG9uQ2xvc2UoKTogdm9pZCB7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcGlja1NvdXJjZVJlZihhcHA6IEFwcCwgdGl0bGU6IHN0cmluZywgc291cmNlczogU291cmNlUmVmW10pOiBQcm9taXNlPFNvdXJjZVJlZiB8IG51bGw+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgbGV0IHNldHRsZWQgPSBmYWxzZTtcbiAgICBjb25zdCBtb2RhbCA9IG5ldyBTb3VyY2VQaWNrZXJNb2RhbChhcHAsIHRpdGxlLCBzb3VyY2VzLCAocmVmKSA9PiB7XG4gICAgICBzZXR0bGVkID0gdHJ1ZTtcbiAgICAgIHJlc29sdmUocmVmKTtcbiAgICB9KTtcbiAgICBjb25zdCBvcmlnaW5hbENsb3NlID0gbW9kYWwub25DbG9zZS5iaW5kKG1vZGFsKTtcbiAgICBtb2RhbC5vbkNsb3NlID0gKCkgPT4ge1xuICAgICAgb3JpZ2luYWxDbG9zZSgpO1xuICAgICAgaWYgKCFzZXR0bGVkKSB7XG4gICAgICAgIHJlc29sdmUobnVsbCk7XG4gICAgICB9XG4gICAgfTtcbiAgICBtb2RhbC5vcGVuKCk7XG4gIH0pO1xufVxuXG5leHBvcnQgY2xhc3MgTWFuYWdlU291cmNlc01vZGFsIGV4dGVuZHMgTW9kYWwge1xuICBjb25zdHJ1Y3RvcihcbiAgICBhcHA6IEFwcCxcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNvdXJjZXM6IFNvdXJjZVJlZltdLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgb25SZW1vdmU6IChyZWY6IFNvdXJjZVJlZikgPT4gUHJvbWlzZTx2b2lkPlxuICApIHtcbiAgICBzdXBlcihhcHApO1xuICB9XG5cbiAgb25PcGVuKCk6IHZvaWQge1xuICAgIHRoaXMudGl0bGVFbC5zZXRUZXh0KFwiTWFuYWdlIFNvdXJjZXNcIik7XG4gICAgdGhpcy5yZW5kZXIoKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyKCk6IHZvaWQge1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gICAgaWYgKCF0aGlzLnNvdXJjZXMubGVuZ3RoKSB7XG4gICAgICB0aGlzLmNvbnRlbnRFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIk5vIHNvdXJjZXMgYXJlIGF0dGFjaGVkIHRvIHRoaXMgbm90ZS5cIiB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5zb3VyY2VzLmZvckVhY2goKHNvdXJjZSkgPT4ge1xuICAgICAgbmV3IFNldHRpbmcodGhpcy5jb250ZW50RWwpXG4gICAgICAgIC5zZXROYW1lKHNvdXJjZS5sYWJlbClcbiAgICAgICAgLnNldERlc2MoYCR7c291cmNlLm1pbWVfdHlwZX0gfCAke2Rlc2NyaWJlU291cmNlUmVmKHNvdXJjZSl9YClcbiAgICAgICAgLmFkZEJ1dHRvbigoYnV0dG9uKSA9PiB7XG4gICAgICAgICAgYnV0dG9uLnNldEJ1dHRvblRleHQoXCJSZW1vdmVcIikub25DbGljayhhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLm9uUmVtb3ZlKHNvdXJjZSk7XG4gICAgICAgICAgICBuZXcgTm90aWNlKGBSZW1vdmVkICcke3NvdXJjZS5sYWJlbH0nLmApO1xuICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIG9uQ2xvc2UoKTogdm9pZCB7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgfVxufVxuXG4iLCAiaW1wb3J0IHsgQXBwLCBOb3RpY2UsIFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmcgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB0eXBlIFN5YnlsUGx1Z2luIGZyb20gXCIuL21haW5cIjtcbmltcG9ydCB7IGdldFByb3ZpZGVyIH0gZnJvbSBcIi4vcHJvdmlkZXJzXCI7XG5pbXBvcnQgeyBPbGxhbWFQcm92aWRlciB9IGZyb20gXCIuL3Byb3ZpZGVycy9vbGxhbWFcIjtcbmltcG9ydCB7IFByb3ZpZGVySUQsIFN5YnlsU2V0dGluZ3MsIFZhbGlkYXRpb25TdGF0ZSB9IGZyb20gXCIuL3R5cGVzXCI7XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX1NFVFRJTkdTOiBTeWJ5bFNldHRpbmdzID0ge1xuICBhY3RpdmVQcm92aWRlcjogXCJnZW1pbmlcIixcbiAgcHJvdmlkZXJzOiB7XG4gICAgZ2VtaW5pOiB7IGFwaUtleTogXCJcIiwgZGVmYXVsdE1vZGVsOiBcImdlbWluaS0yLjUtZmxhc2hcIiB9LFxuICAgIG9wZW5haTogeyBhcGlLZXk6IFwiXCIsIGRlZmF1bHRNb2RlbDogXCJncHQtNS4yXCIsIGJhc2VVcmw6IFwiaHR0cHM6Ly9hcGkub3BlbmFpLmNvbS92MVwiIH0sXG4gICAgYW50aHJvcGljOiB7IGFwaUtleTogXCJcIiwgZGVmYXVsdE1vZGVsOiBcImNsYXVkZS1zb25uZXQtNC02XCIgfSxcbiAgICBvbGxhbWE6IHsgYmFzZVVybDogXCJodHRwOi8vbG9jYWxob3N0OjExNDM0XCIsIGRlZmF1bHRNb2RlbDogXCJnZW1tYTNcIiB9LFxuICAgIG9wZW5yb3V0ZXI6IHsgYXBpS2V5OiBcIlwiLCBkZWZhdWx0TW9kZWw6IFwibWV0YS1sbGFtYS9sbGFtYS0zLjMtNzBiLWluc3RydWN0OmZyZWVcIiB9XG4gIH0sXG4gIGluc2VydGlvbk1vZGU6IFwiY3Vyc29yXCIsXG4gIHNob3dUb2tlbkNvdW50OiBmYWxzZSxcbiAgZGVmYXVsdFRlbXBlcmF0dXJlOiAwLjcsXG4gIGxvbmVsb2dNb2RlOiBmYWxzZSxcbiAgbG9uZWxvZ0NvbnRleHREZXB0aDogNjAsXG4gIGxvbmVsb2dXcmFwQ29kZUJsb2NrOiB0cnVlLFxuICBsb25lbG9nQXV0b0luY1NjZW5lOiB0cnVlXG59O1xuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplU2V0dGluZ3MocmF3OiBQYXJ0aWFsPFN5YnlsU2V0dGluZ3M+IHwgbnVsbCB8IHVuZGVmaW5lZCk6IFN5YnlsU2V0dGluZ3Mge1xuICByZXR1cm4ge1xuICAgIC4uLkRFRkFVTFRfU0VUVElOR1MsXG4gICAgLi4uKHJhdyA/PyB7fSksXG4gICAgcHJvdmlkZXJzOiB7XG4gICAgICBnZW1pbmk6IHsgLi4uREVGQVVMVF9TRVRUSU5HUy5wcm92aWRlcnMuZ2VtaW5pLCAuLi4ocmF3Py5wcm92aWRlcnM/LmdlbWluaSA/PyB7fSkgfSxcbiAgICAgIG9wZW5haTogeyAuLi5ERUZBVUxUX1NFVFRJTkdTLnByb3ZpZGVycy5vcGVuYWksIC4uLihyYXc/LnByb3ZpZGVycz8ub3BlbmFpID8/IHt9KSB9LFxuICAgICAgYW50aHJvcGljOiB7IC4uLkRFRkFVTFRfU0VUVElOR1MucHJvdmlkZXJzLmFudGhyb3BpYywgLi4uKHJhdz8ucHJvdmlkZXJzPy5hbnRocm9waWMgPz8ge30pIH0sXG4gICAgICBvbGxhbWE6IHsgLi4uREVGQVVMVF9TRVRUSU5HUy5wcm92aWRlcnMub2xsYW1hLCAuLi4ocmF3Py5wcm92aWRlcnM/Lm9sbGFtYSA/PyB7fSkgfSxcbiAgICAgIG9wZW5yb3V0ZXI6IHsgLi4uREVGQVVMVF9TRVRUSU5HUy5wcm92aWRlcnMub3BlbnJvdXRlciwgLi4uKHJhdz8ucHJvdmlkZXJzPy5vcGVucm91dGVyID8/IHt9KSB9XG4gICAgfVxuICB9O1xufVxuXG5leHBvcnQgY2xhc3MgU3lieWxTZXR0aW5nVGFiIGV4dGVuZHMgUGx1Z2luU2V0dGluZ1RhYiB7XG4gIHByaXZhdGUgdmFsaWRhdGlvbjogUGFydGlhbDxSZWNvcmQ8UHJvdmlkZXJJRCwgVmFsaWRhdGlvblN0YXRlPj4gPSB7fTtcbiAgcHJpdmF0ZSBvbGxhbWFNb2RlbHM6IHN0cmluZ1tdID0gW107XG4gIHByaXZhdGUgbW9kZWxDYWNoZTogUGFydGlhbDxSZWNvcmQ8UHJvdmlkZXJJRCwgc3RyaW5nW10+PiA9IHt9O1xuICBwcml2YXRlIGZldGNoaW5nUHJvdmlkZXJzID0gbmV3IFNldDxQcm92aWRlcklEPigpO1xuXG4gIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwcml2YXRlIHJlYWRvbmx5IHBsdWdpbjogU3lieWxQbHVnaW4pIHtcbiAgICBzdXBlcihhcHAsIHBsdWdpbik7XG4gIH1cblxuICBkaXNwbGF5KCk6IHZvaWQge1xuICAgIGNvbnN0IHsgY29udGFpbmVyRWwgfSA9IHRoaXM7XG4gICAgY29udGFpbmVyRWwuZW1wdHkoKTtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogYFN5YnlsIFNldHRpbmdzICgke3RoaXMucHJvdmlkZXJMYWJlbCh0aGlzLnBsdWdpbi5zZXR0aW5ncy5hY3RpdmVQcm92aWRlcil9KWAgfSk7XG4gICAgdGhpcy5tYXliZUZldGNoTW9kZWxzKCk7XG4gICAgdGhpcy5yZW5kZXJBY3RpdmVQcm92aWRlcihjb250YWluZXJFbCk7XG4gICAgdGhpcy5yZW5kZXJQcm92aWRlckNvbmZpZyhjb250YWluZXJFbCk7XG4gICAgdGhpcy5yZW5kZXJHbG9iYWxTZXR0aW5ncyhjb250YWluZXJFbCk7XG4gIH1cblxuICBwcml2YXRlIG1heWJlRmV0Y2hNb2RlbHMoKTogdm9pZCB7XG4gICAgY29uc3QgYWN0aXZlID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MuYWN0aXZlUHJvdmlkZXI7XG4gICAgaWYgKGFjdGl2ZSA9PT0gXCJvbGxhbWFcIikgcmV0dXJuO1xuICAgIGNvbnN0IGNvbmZpZyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnByb3ZpZGVyc1thY3RpdmVdO1xuICAgIGNvbnN0IGFwaUtleSA9IChjb25maWcgYXMgeyBhcGlLZXk/OiBzdHJpbmcgfSkuYXBpS2V5Py50cmltKCk7XG4gICAgaWYgKGFwaUtleSAmJiAhdGhpcy5tb2RlbENhY2hlW2FjdGl2ZV0gJiYgIXRoaXMuZmV0Y2hpbmdQcm92aWRlcnMuaGFzKGFjdGl2ZSkpIHtcbiAgICAgIHZvaWQgdGhpcy5mZXRjaE1vZGVscyhhY3RpdmUpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZmV0Y2hNb2RlbHMocHJvdmlkZXI6IFByb3ZpZGVySUQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLmZldGNoaW5nUHJvdmlkZXJzLmFkZChwcm92aWRlcik7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IG1vZGVscyA9IGF3YWl0IGdldFByb3ZpZGVyKHRoaXMucGx1Z2luLnNldHRpbmdzLCBwcm92aWRlcikubGlzdE1vZGVscygpO1xuICAgICAgaWYgKG1vZGVscy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHRoaXMubW9kZWxDYWNoZVtwcm92aWRlcl0gPSBtb2RlbHM7XG4gICAgICB9XG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyBzaWxlbnRseSBmYWlsIFx1MjAxNCBkcm9wZG93biBrZWVwcyBzaG93aW5nIGN1cnJlbnQgZGVmYXVsdFxuICAgIH0gZmluYWxseSB7XG4gICAgICB0aGlzLmZldGNoaW5nUHJvdmlkZXJzLmRlbGV0ZShwcm92aWRlcik7XG4gICAgICB0aGlzLmRpc3BsYXkoKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlbmRlckFjdGl2ZVByb3ZpZGVyKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJBY3RpdmUgUHJvdmlkZXJcIilcbiAgICAgIC5zZXREZXNjKFwiVXNlZCB3aGVuIGEgbm90ZSBkb2VzIG5vdCBvdmVycmlkZSBwcm92aWRlci5cIilcbiAgICAgIC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcbiAgICAgICAgZHJvcGRvd24uYWRkT3B0aW9uKFwiZ2VtaW5pXCIsIFwiR2VtaW5pXCIpO1xuICAgICAgICBkcm9wZG93bi5hZGRPcHRpb24oXCJvcGVuYWlcIiwgXCJPcGVuQUlcIik7XG4gICAgICAgIGRyb3Bkb3duLmFkZE9wdGlvbihcImFudGhyb3BpY1wiLCBcIkFudGhyb3BpYyAoQ2xhdWRlKVwiKTtcbiAgICAgICAgZHJvcGRvd24uYWRkT3B0aW9uKFwib2xsYW1hXCIsIFwiT2xsYW1hIChsb2NhbClcIik7XG4gICAgICAgIGRyb3Bkb3duLmFkZE9wdGlvbihcIm9wZW5yb3V0ZXJcIiwgXCJPcGVuUm91dGVyXCIpO1xuICAgICAgICBkcm9wZG93bi5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5hY3RpdmVQcm92aWRlcik7XG4gICAgICAgIGRyb3Bkb3duLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmFjdGl2ZVByb3ZpZGVyID0gdmFsdWUgYXMgUHJvdmlkZXJJRDtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICB0aGlzLmRpc3BsYXkoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyUHJvdmlkZXJDb25maWcoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiUHJvdmlkZXIgQ29uZmlndXJhdGlvblwiIH0pO1xuICAgIHN3aXRjaCAodGhpcy5wbHVnaW4uc2V0dGluZ3MuYWN0aXZlUHJvdmlkZXIpIHtcbiAgICAgIGNhc2UgXCJnZW1pbmlcIjpcbiAgICAgICAgdGhpcy5yZW5kZXJHZW1pbmlTZXR0aW5ncyhjb250YWluZXJFbCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcIm9wZW5haVwiOlxuICAgICAgICB0aGlzLnJlbmRlck9wZW5BSVNldHRpbmdzKGNvbnRhaW5lckVsKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwiYW50aHJvcGljXCI6XG4gICAgICAgIHRoaXMucmVuZGVyQW50aHJvcGljU2V0dGluZ3MoY29udGFpbmVyRWwpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgXCJvbGxhbWFcIjpcbiAgICAgICAgdGhpcy5yZW5kZXJPbGxhbWFTZXR0aW5ncyhjb250YWluZXJFbCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcIm9wZW5yb3V0ZXJcIjpcbiAgICAgICAgdGhpcy5yZW5kZXJPcGVuUm91dGVyU2V0dGluZ3MoY29udGFpbmVyRWwpO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlbmRlckdlbWluaVNldHRpbmdzKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIGNvbnN0IGNvbmZpZyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnByb3ZpZGVycy5nZW1pbmk7XG4gICAgdGhpcy5yZW5kZXJWYWxpZGF0aW9uU3RhdGUoY29udGFpbmVyRWwsIFwiZ2VtaW5pXCIpO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJBUEkgS2V5XCIpXG4gICAgICAuYWRkVGV4dCgodGV4dCkgPT4ge1xuICAgICAgICB0ZXh0LmlucHV0RWwudHlwZSA9IFwicGFzc3dvcmRcIjtcbiAgICAgICAgdGV4dC5zZXRWYWx1ZShjb25maWcuYXBpS2V5KTtcbiAgICAgICAgdGV4dC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICBjb25maWcuYXBpS2V5ID0gdmFsdWU7XG4gICAgICAgICAgdGhpcy5tb2RlbENhY2hlLmdlbWluaSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRleHQuaW5wdXRFbC5hZGRFdmVudExpc3RlbmVyKFwiYmx1clwiLCAoKSA9PiB2b2lkIHRoaXMudmFsaWRhdGVQcm92aWRlcihcImdlbWluaVwiKSk7XG4gICAgICB9KTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiRGVmYXVsdCBNb2RlbFwiKVxuICAgICAgLmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xuICAgICAgICBjb25zdCBtb2RlbHMgPSB0aGlzLm1vZGVsT3B0aW9uc0ZvcihcImdlbWluaVwiLCBjb25maWcuZGVmYXVsdE1vZGVsKTtcbiAgICAgICAgbW9kZWxzLmZvckVhY2goKG0pID0+IGRyb3Bkb3duLmFkZE9wdGlvbihtLCBtKSk7XG4gICAgICAgIGRyb3Bkb3duLnNldFZhbHVlKGNvbmZpZy5kZWZhdWx0TW9kZWwpO1xuICAgICAgICBkcm9wZG93bi5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICBjb25maWcuZGVmYXVsdE1vZGVsID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlck9wZW5BSVNldHRpbmdzKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIGNvbnN0IGNvbmZpZyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnByb3ZpZGVycy5vcGVuYWk7XG4gICAgdGhpcy5yZW5kZXJWYWxpZGF0aW9uU3RhdGUoY29udGFpbmVyRWwsIFwib3BlbmFpXCIpO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJBUEkgS2V5XCIpXG4gICAgICAuYWRkVGV4dCgodGV4dCkgPT4ge1xuICAgICAgICB0ZXh0LmlucHV0RWwudHlwZSA9IFwicGFzc3dvcmRcIjtcbiAgICAgICAgdGV4dC5zZXRWYWx1ZShjb25maWcuYXBpS2V5KTtcbiAgICAgICAgdGV4dC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICBjb25maWcuYXBpS2V5ID0gdmFsdWU7XG4gICAgICAgICAgdGhpcy5tb2RlbENhY2hlLm9wZW5haSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRleHQuaW5wdXRFbC5hZGRFdmVudExpc3RlbmVyKFwiYmx1clwiLCAoKSA9PiB2b2lkIHRoaXMudmFsaWRhdGVQcm92aWRlcihcIm9wZW5haVwiKSk7XG4gICAgICB9KTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiQmFzZSBVUkxcIilcbiAgICAgIC5zZXREZXNjKFwiT3ZlcnJpZGUgZm9yIEF6dXJlIG9yIHByb3h5IGVuZHBvaW50c1wiKVxuICAgICAgLmFkZFRleHQoKHRleHQpID0+IHtcbiAgICAgICAgdGV4dC5zZXRWYWx1ZShjb25maWcuYmFzZVVybCk7XG4gICAgICAgIHRleHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uZmlnLmJhc2VVcmwgPSB2YWx1ZTtcbiAgICAgICAgICB0aGlzLm1vZGVsQ2FjaGUub3BlbmFpID0gdW5kZWZpbmVkO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGV4dC5pbnB1dEVsLmFkZEV2ZW50TGlzdGVuZXIoXCJibHVyXCIsICgpID0+IHZvaWQgdGhpcy52YWxpZGF0ZVByb3ZpZGVyKFwib3BlbmFpXCIpKTtcbiAgICAgIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJEZWZhdWx0IE1vZGVsXCIpXG4gICAgICAuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PiB7XG4gICAgICAgIGNvbnN0IG1vZGVscyA9IHRoaXMubW9kZWxPcHRpb25zRm9yKFwib3BlbmFpXCIsIGNvbmZpZy5kZWZhdWx0TW9kZWwpO1xuICAgICAgICBtb2RlbHMuZm9yRWFjaCgobSkgPT4gZHJvcGRvd24uYWRkT3B0aW9uKG0sIG0pKTtcbiAgICAgICAgZHJvcGRvd24uc2V0VmFsdWUoY29uZmlnLmRlZmF1bHRNb2RlbCk7XG4gICAgICAgIGRyb3Bkb3duLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGNvbmZpZy5kZWZhdWx0TW9kZWwgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcInBcIiwge1xuICAgICAgdGV4dDogXCJPcGVuQUkgc291cmNlcyB1c2UgdmF1bHRfcGF0aC4gQWRkIHNvdXJjZSBmaWxlcyB2aWEgdGhlIE1hbmFnZSBTb3VyY2VzIGNvbW1hbmQgaW4gYW55IG5vdGUuXCJcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyQW50aHJvcGljU2V0dGluZ3MoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gICAgY29uc3QgY29uZmlnID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucHJvdmlkZXJzLmFudGhyb3BpYztcbiAgICB0aGlzLnJlbmRlclZhbGlkYXRpb25TdGF0ZShjb250YWluZXJFbCwgXCJhbnRocm9waWNcIik7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkFQSSBLZXlcIilcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PiB7XG4gICAgICAgIHRleHQuaW5wdXRFbC50eXBlID0gXCJwYXNzd29yZFwiO1xuICAgICAgICB0ZXh0LnNldFZhbHVlKGNvbmZpZy5hcGlLZXkpO1xuICAgICAgICB0ZXh0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGNvbmZpZy5hcGlLZXkgPSB2YWx1ZTtcbiAgICAgICAgICB0aGlzLm1vZGVsQ2FjaGUuYW50aHJvcGljID0gdW5kZWZpbmVkO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGV4dC5pbnB1dEVsLmFkZEV2ZW50TGlzdGVuZXIoXCJibHVyXCIsICgpID0+IHZvaWQgdGhpcy52YWxpZGF0ZVByb3ZpZGVyKFwiYW50aHJvcGljXCIpKTtcbiAgICAgIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJEZWZhdWx0IE1vZGVsXCIpXG4gICAgICAuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PiB7XG4gICAgICAgIGNvbnN0IG1vZGVscyA9IHRoaXMubW9kZWxPcHRpb25zRm9yKFwiYW50aHJvcGljXCIsIGNvbmZpZy5kZWZhdWx0TW9kZWwpO1xuICAgICAgICBtb2RlbHMuZm9yRWFjaCgobSkgPT4gZHJvcGRvd24uYWRkT3B0aW9uKG0sIG0pKTtcbiAgICAgICAgZHJvcGRvd24uc2V0VmFsdWUoY29uZmlnLmRlZmF1bHRNb2RlbCk7XG4gICAgICAgIGRyb3Bkb3duLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGNvbmZpZy5kZWZhdWx0TW9kZWwgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcInBcIiwge1xuICAgICAgdGV4dDogXCJQREZzIGFyZSBlbmNvZGVkIGlubGluZSBwZXIgcmVxdWVzdC4gVXNlIHNob3J0IGV4Y2VycHRzIHRvIGF2b2lkIGhpZ2ggdG9rZW4gY29zdHMuXCJcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyT3BlblJvdXRlclNldHRpbmdzKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIGNvbnN0IGNvbmZpZyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnByb3ZpZGVycy5vcGVucm91dGVyO1xuICAgIHRoaXMucmVuZGVyVmFsaWRhdGlvblN0YXRlKGNvbnRhaW5lckVsLCBcIm9wZW5yb3V0ZXJcIik7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkFQSSBLZXlcIilcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PiB7XG4gICAgICAgIHRleHQuaW5wdXRFbC50eXBlID0gXCJwYXNzd29yZFwiO1xuICAgICAgICB0ZXh0LnNldFZhbHVlKGNvbmZpZy5hcGlLZXkpO1xuICAgICAgICB0ZXh0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGNvbmZpZy5hcGlLZXkgPSB2YWx1ZTtcbiAgICAgICAgICB0aGlzLm1vZGVsQ2FjaGUub3BlbnJvdXRlciA9IHVuZGVmaW5lZDtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRleHQuaW5wdXRFbC5hZGRFdmVudExpc3RlbmVyKFwiYmx1clwiLCAoKSA9PiB2b2lkIHRoaXMudmFsaWRhdGVQcm92aWRlcihcIm9wZW5yb3V0ZXJcIikpO1xuICAgICAgfSk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkRlZmF1bHQgTW9kZWxcIilcbiAgICAgIC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcbiAgICAgICAgY29uc3QgbW9kZWxzID0gdGhpcy5tb2RlbE9wdGlvbnNGb3IoXCJvcGVucm91dGVyXCIsIGNvbmZpZy5kZWZhdWx0TW9kZWwpO1xuICAgICAgICBtb2RlbHMuZm9yRWFjaCgobSkgPT4gZHJvcGRvd24uYWRkT3B0aW9uKG0sIG0pKTtcbiAgICAgICAgZHJvcGRvd24uc2V0VmFsdWUoY29uZmlnLmRlZmF1bHRNb2RlbCk7XG4gICAgICAgIGRyb3Bkb3duLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGNvbmZpZy5kZWZhdWx0TW9kZWwgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcInBcIiwge1xuICAgICAgdGV4dDogXCJPcGVuUm91dGVyIHByb3ZpZGVzIGFjY2VzcyB0byBtYW55IGZyZWUgYW5kIHBhaWQgbW9kZWxzIHZpYSBhIHVuaWZpZWQgQVBJLiBGcmVlIG1vZGVscyBoYXZlICc6ZnJlZScgaW4gdGhlaXIgSUQuXCJcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyT2xsYW1hU2V0dGluZ3MoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gICAgY29uc3QgY29uZmlnID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucHJvdmlkZXJzLm9sbGFtYTtcbiAgICB0aGlzLnJlbmRlclZhbGlkYXRpb25TdGF0ZShjb250YWluZXJFbCwgXCJvbGxhbWFcIik7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkJhc2UgVVJMXCIpXG4gICAgICAuYWRkVGV4dCgodGV4dCkgPT4ge1xuICAgICAgICB0ZXh0LnNldFZhbHVlKGNvbmZpZy5iYXNlVXJsKTtcbiAgICAgICAgdGV4dC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICBjb25maWcuYmFzZVVybCA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGV4dC5pbnB1dEVsLmFkZEV2ZW50TGlzdGVuZXIoXCJibHVyXCIsICgpID0+IHZvaWQgdGhpcy52YWxpZGF0ZU9sbGFtYSgpKTtcbiAgICAgIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJBdmFpbGFibGUgTW9kZWxzXCIpXG4gICAgICAuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PiB7XG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSB0aGlzLm9sbGFtYU1vZGVscy5sZW5ndGggPyB0aGlzLm9sbGFtYU1vZGVscyA6IFtjb25maWcuZGVmYXVsdE1vZGVsXTtcbiAgICAgICAgb3B0aW9ucy5mb3JFYWNoKChtb2RlbCkgPT4gZHJvcGRvd24uYWRkT3B0aW9uKG1vZGVsLCBtb2RlbCkpO1xuICAgICAgICBkcm9wZG93bi5zZXRWYWx1ZShvcHRpb25zLmluY2x1ZGVzKGNvbmZpZy5kZWZhdWx0TW9kZWwpID8gY29uZmlnLmRlZmF1bHRNb2RlbCA6IG9wdGlvbnNbMF0pO1xuICAgICAgICBkcm9wZG93bi5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICBjb25maWcuZGVmYXVsdE1vZGVsID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgdGhpcy5kaXNwbGF5KCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkRlZmF1bHQgTW9kZWxcIilcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PiB7XG4gICAgICAgIHRleHQuc2V0VmFsdWUoY29uZmlnLmRlZmF1bHRNb2RlbCk7XG4gICAgICAgIHRleHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uZmlnLmRlZmF1bHRNb2RlbCA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwicFwiLCB7XG4gICAgICB0ZXh0OiBcIk5vIEFQSSBrZXkgcmVxdWlyZWQuIE9sbGFtYSBtdXN0IGJlIHJ1bm5pbmcgbG9jYWxseS4gRmlsZSBncm91bmRpbmcgdXNlcyB2YXVsdF9wYXRoIHRleHQgZXh0cmFjdGlvbi5cIlxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJHbG9iYWxTZXR0aW5ncyhjb250YWluZXJFbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJHbG9iYWwgU2V0dGluZ3NcIiB9KTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiRGVmYXVsdCBUZW1wZXJhdHVyZVwiKVxuICAgICAgLnNldERlc2MoU3RyaW5nKHRoaXMucGx1Z2luLnNldHRpbmdzLmRlZmF1bHRUZW1wZXJhdHVyZSkpXG4gICAgICAuYWRkU2xpZGVyKChzbGlkZXIpID0+IHtcbiAgICAgICAgc2xpZGVyLnNldExpbWl0cygwLCAxLCAwLjA1KTtcbiAgICAgICAgc2xpZGVyLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmRlZmF1bHRUZW1wZXJhdHVyZSk7XG4gICAgICAgIHNsaWRlci5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kZWZhdWx0VGVtcGVyYXR1cmUgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICB0aGlzLmRpc3BsYXkoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiSW5zZXJ0aW9uIE1vZGVcIilcbiAgICAgIC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcbiAgICAgICAgZHJvcGRvd24uYWRkT3B0aW9uKFwiY3Vyc29yXCIsIFwiQXQgY3Vyc29yXCIpO1xuICAgICAgICBkcm9wZG93bi5hZGRPcHRpb24oXCJlbmQtb2Ytbm90ZVwiLCBcIkVuZCBvZiBub3RlXCIpO1xuICAgICAgICBkcm9wZG93bi5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5pbnNlcnRpb25Nb2RlKTtcbiAgICAgICAgZHJvcGRvd24ub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuaW5zZXJ0aW9uTW9kZSA9IHZhbHVlIGFzIFwiY3Vyc29yXCIgfCBcImVuZC1vZi1ub3RlXCI7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIlNob3cgVG9rZW4gQ291bnRcIilcbiAgICAgIC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xuICAgICAgICB0b2dnbGUuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3Muc2hvd1Rva2VuQ291bnQpO1xuICAgICAgICB0b2dnbGUub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc2hvd1Rva2VuQ291bnQgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiTG9uZWxvZyBNb2RlXCIpXG4gICAgICAuc2V0RGVzYyhcIkVuYWJsZSBMb25lbG9nIG5vdGF0aW9uLCBjb250ZXh0IHBhcnNpbmcsIGFuZCBMb25lbG9nLXNwZWNpZmljIGNvbW1hbmRzLlwiKVxuICAgICAgLmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB7XG4gICAgICAgIHRvZ2dsZS5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5sb25lbG9nTW9kZSk7XG4gICAgICAgIHRvZ2dsZS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5sb25lbG9nTW9kZSA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgIHRoaXMuZGlzcGxheSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5sb25lbG9nTW9kZSkge1xuICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgIC5zZXROYW1lKFwiQXV0by1pbmNyZW1lbnQgc2NlbmUgY291bnRlclwiKVxuICAgICAgICAuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcbiAgICAgICAgICB0b2dnbGUuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MubG9uZWxvZ0F1dG9JbmNTY2VuZSk7XG4gICAgICAgICAgdG9nZ2xlLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MubG9uZWxvZ0F1dG9JbmNTY2VuZSA9IHZhbHVlO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgIC5zZXROYW1lKFwiQ29udGV4dCBleHRyYWN0aW9uIGRlcHRoXCIpXG4gICAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PiB7XG4gICAgICAgICAgdGV4dC5zZXRWYWx1ZShTdHJpbmcodGhpcy5wbHVnaW4uc2V0dGluZ3MubG9uZWxvZ0NvbnRleHREZXB0aCkpO1xuICAgICAgICAgIHRleHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBuZXh0ID0gTnVtYmVyKHZhbHVlKTtcbiAgICAgICAgICAgIGlmICghTnVtYmVyLmlzTmFOKG5leHQpICYmIG5leHQgPiAwKSB7XG4gICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmxvbmVsb2dDb250ZXh0RGVwdGggPSBuZXh0O1xuICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgICAgLnNldE5hbWUoXCJXcmFwIG5vdGF0aW9uIGluIGNvZGUgYmxvY2tzXCIpXG4gICAgICAgIC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xuICAgICAgICAgIHRvZ2dsZS5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5sb25lbG9nV3JhcENvZGVCbG9jayk7XG4gICAgICAgICAgdG9nZ2xlLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MubG9uZWxvZ1dyYXBDb2RlQmxvY2sgPSB2YWx1ZTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIG1vZGVsT3B0aW9uc0Zvcihwcm92aWRlcjogUHJvdmlkZXJJRCwgY3VycmVudE1vZGVsOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gICAgY29uc3QgY2FjaGVkID0gdGhpcy5tb2RlbENhY2hlW3Byb3ZpZGVyXTtcbiAgICBpZiAoIWNhY2hlZCkgcmV0dXJuIFtjdXJyZW50TW9kZWxdO1xuICAgIHJldHVybiBjYWNoZWQuaW5jbHVkZXMoY3VycmVudE1vZGVsKSA/IGNhY2hlZCA6IFtjdXJyZW50TW9kZWwsIC4uLmNhY2hlZF07XG4gIH1cblxuICBwcml2YXRlIHJlbmRlclZhbGlkYXRpb25TdGF0ZShjb250YWluZXJFbDogSFRNTEVsZW1lbnQsIHByb3ZpZGVyOiBQcm92aWRlcklEKTogdm9pZCB7XG4gICAgY29uc3Qgc3RhdGUgPSB0aGlzLnZhbGlkYXRpb25bcHJvdmlkZXJdO1xuICAgIGlmICghc3RhdGUgfHwgc3RhdGUuc3RhdHVzID09PSBcImlkbGVcIikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcInBcIiwge1xuICAgICAgdGV4dDpcbiAgICAgICAgc3RhdGUuc3RhdHVzID09PSBcImNoZWNraW5nXCJcbiAgICAgICAgICA/IFwiVmFsaWRhdGlvbjogY2hlY2tpbmcuLi5cIlxuICAgICAgICAgIDogc3RhdGUuc3RhdHVzID09PSBcInZhbGlkXCJcbiAgICAgICAgICAgID8gXCJWYWxpZGF0aW9uOiBcdTI3MTNcIlxuICAgICAgICAgICAgOiBgVmFsaWRhdGlvbjogXHUyNzE3JHtzdGF0ZS5tZXNzYWdlID8gYCAoJHtzdGF0ZS5tZXNzYWdlfSlgIDogXCJcIn1gXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHByb3ZpZGVyTGFiZWwocHJvdmlkZXI6IFByb3ZpZGVySUQpOiBzdHJpbmcge1xuICAgIHN3aXRjaCAocHJvdmlkZXIpIHtcbiAgICAgIGNhc2UgXCJnZW1pbmlcIjpcbiAgICAgICAgcmV0dXJuIFwiR2VtaW5pXCI7XG4gICAgICBjYXNlIFwib3BlbmFpXCI6XG4gICAgICAgIHJldHVybiBcIk9wZW5BSVwiO1xuICAgICAgY2FzZSBcImFudGhyb3BpY1wiOlxuICAgICAgICByZXR1cm4gXCJBbnRocm9waWNcIjtcbiAgICAgIGNhc2UgXCJvbGxhbWFcIjpcbiAgICAgICAgcmV0dXJuIFwiT2xsYW1hXCI7XG4gICAgICBjYXNlIFwib3BlbnJvdXRlclwiOlxuICAgICAgICByZXR1cm4gXCJPcGVuUm91dGVyXCI7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyB2YWxpZGF0ZVByb3ZpZGVyKHByb3ZpZGVyOiBQcm92aWRlcklEKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy52YWxpZGF0aW9uW3Byb3ZpZGVyXSA9IHsgc3RhdHVzOiBcImNoZWNraW5nXCIgfTtcbiAgICB0aGlzLmRpc3BsYXkoKTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgdmFsaWQgPSBhd2FpdCBnZXRQcm92aWRlcih0aGlzLnBsdWdpbi5zZXR0aW5ncywgcHJvdmlkZXIpLnZhbGlkYXRlKCk7XG4gICAgICB0aGlzLnZhbGlkYXRpb25bcHJvdmlkZXJdID0geyBzdGF0dXM6IHZhbGlkID8gXCJ2YWxpZFwiIDogXCJpbnZhbGlkXCIgfTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy52YWxpZGF0aW9uW3Byb3ZpZGVyXSA9IHtcbiAgICAgICAgc3RhdHVzOiBcImludmFsaWRcIixcbiAgICAgICAgbWVzc2FnZTogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpXG4gICAgICB9O1xuICAgIH1cbiAgICB0aGlzLmRpc3BsYXkoKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgdmFsaWRhdGVPbGxhbWEoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy52YWxpZGF0aW9uLm9sbGFtYSA9IHsgc3RhdHVzOiBcImNoZWNraW5nXCIgfTtcbiAgICB0aGlzLmRpc3BsYXkoKTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcHJvdmlkZXIgPSBuZXcgT2xsYW1hUHJvdmlkZXIodGhpcy5wbHVnaW4uc2V0dGluZ3MucHJvdmlkZXJzLm9sbGFtYSk7XG4gICAgICBjb25zdCB2YWxpZCA9IGF3YWl0IHByb3ZpZGVyLnZhbGlkYXRlKCk7XG4gICAgICB0aGlzLnZhbGlkYXRpb24ub2xsYW1hID0geyBzdGF0dXM6IHZhbGlkID8gXCJ2YWxpZFwiIDogXCJpbnZhbGlkXCIgfTtcbiAgICAgIHRoaXMub2xsYW1hTW9kZWxzID0gdmFsaWQgPyBhd2FpdCBwcm92aWRlci5saXN0TW9kZWxzKCkgOiBbXTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy52YWxpZGF0aW9uLm9sbGFtYSA9IHtcbiAgICAgICAgc3RhdHVzOiBcImludmFsaWRcIixcbiAgICAgICAgbWVzc2FnZTogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpXG4gICAgICB9O1xuICAgICAgdGhpcy5vbGxhbWFNb2RlbHMgPSBbXTtcbiAgICAgIG5ldyBOb3RpY2UodGhpcy52YWxpZGF0aW9uLm9sbGFtYS5tZXNzYWdlID8/IFwiT2xsYW1hIHZhbGlkYXRpb24gZmFpbGVkLlwiKTtc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S0FBSyxTQUFTO0FBQUEsTUFDN0M7QUFBQSxNQUNBLE9BQU8sR0FBRztBQUFBLElBQ1o7QUFDQSxVQUFNLFdBQVcsSUFBSSx5QkFBTyx3QkFBd0IsQ0FBQztBQUNyRCxRQUFJO0FBQ0YsYUFBTyxNQUFNLFNBQVMsU0FBUyxPQUFPO0FBQUEsSUFDeEMsVUFBRTtBQUNBLGVBQVMsS0FBSztBQUFBLElBQ2hCO0FBQUEsRUFDRjtBQUFBLEVBRUEsV0FBVyxNQUFvQixNQUFjLE1BQXVDO0FBQ2xGLFNBQUssc0JBQVEsS0FBSyxTQUFTLG1CQUFtQixVQUFVO0FBQ3RELHFCQUFlLEtBQUssUUFBUSxJQUFJO0FBQUEsSUFDbEMsT0FBTztBQUNMLG1CQUFhLEtBQUssUUFBUSxJQUFJO0FBQUEsSUFDaEM7QUFBQSxFQUNGO0FBQUEsRUFFQSx3QkFBd0IsTUFBb0IsVUFBb0M7QUE1RmxGO0FBNkZJLFFBQUksQ0FBQyxLQUFLLFNBQVMsZ0JBQWdCO0FBQ2pDO0FBQUEsSUFDRjtBQUNBLFVBQU0sU0FBUSxjQUFTLGdCQUFULFlBQXdCO0FBQ3RDLFVBQU0sVUFBUyxjQUFTLGlCQUFULFlBQXlCO0FBQ3hDLGlCQUFhLEtBQUssUUFBUSxnQkFBZ0IsY0FBYyxnQkFBZ0I7QUFBQSxFQUMxRTtBQUNGOyIsCiAgIm5hbWVzIjogWyJpbXBvcnRfb2JzaWRpYW4iLCAiX2EiLCAiaW1wb3J0X29ic2lkaWFuIiwgIl9hIiwgImltcG9ydF9vYnNpZGlhbiIsICJpbXBvcnRfb2JzaWRpYW4iLCAiX2EiLCAiaW1wb3J0X29ic2lkaWFuIiwgIl9hIiwgImltcG9ydF9vYnNpZGlhbiIsICJhc0Vycm9yTWVzc2FnZSIsICJfYSIsICJpbXBvcnRfb2JzaWRpYW4iLCAiaW1wb3J0X29ic2lkaWFuIiwgInJlZiIsICJpbXBvcnRfb2JzaWRpYW4iXQp9Cg==
