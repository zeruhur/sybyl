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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL2VkaXRvci50cyIsICJzcmMvbG9uZWxvZy9wYXJzZXIudHMiLCAic3JjL3Byb21wdEJ1aWxkZXIudHMiLCAic3JjL2Zyb250bWF0dGVyLnRzIiwgInNyYy9wcm92aWRlcnMvYW50aHJvcGljLnRzIiwgInNyYy9wcm92aWRlcnMvZ2VtaW5pLnRzIiwgInNyYy9wcm92aWRlcnMvb2xsYW1hLnRzIiwgInNyYy9zb3VyY2VVdGlscy50cyIsICJzcmMvcHJvdmlkZXJzL29wZW5haS50cyIsICJzcmMvcHJvdmlkZXJzL29wZW5yb3V0ZXIudHMiLCAic3JjL3Byb3ZpZGVycy9pbmRleC50cyIsICJzcmMvY29tbWFuZHMudHMiLCAic3JjL2xvbmVsb2cvZm9ybWF0dGVyLnRzIiwgInNyYy9tb2RhbHMudHMiLCAic3JjL3NldHRpbmdzLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgeyBNYXJrZG93blZpZXcsIE5vdGljZSwgUGx1Z2luIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgeyBhcHBlbmRUb05vdGUsIGluc2VydEF0Q3Vyc29yIH0gZnJvbSBcIi4vZWRpdG9yXCI7XG5pbXBvcnQgeyBidWlsZFJlcXVlc3QsIGJ1aWxkU3lzdGVtUHJvbXB0IH0gZnJvbSBcIi4vcHJvbXB0QnVpbGRlclwiO1xuaW1wb3J0IHsgcmVhZEZyb250TWF0dGVyIH0gZnJvbSBcIi4vZnJvbnRtYXR0ZXJcIjtcbmltcG9ydCB7IGdldFByb3ZpZGVyIH0gZnJvbSBcIi4vcHJvdmlkZXJzXCI7XG5pbXBvcnQgeyByZWdpc3RlckFsbENvbW1hbmRzIH0gZnJvbSBcIi4vY29tbWFuZHNcIjtcbmltcG9ydCB7IFF1aWNrTWVudU1vZGFsIH0gZnJvbSBcIi4vbW9kYWxzXCI7XG5pbXBvcnQgeyBERUZBVUxUX1NFVFRJTkdTLCBTeWJ5bFNldHRpbmdUYWIsIG5vcm1hbGl6ZVNldHRpbmdzIH0gZnJvbSBcIi4vc2V0dGluZ3NcIjtcbmltcG9ydCB7IEdlbmVyYXRpb25SZXF1ZXN0LCBHZW5lcmF0aW9uUmVzcG9uc2UsIE5vdGVGcm9udE1hdHRlciwgUmVzb2x2ZWRTb3VyY2UsIFN5YnlsU2V0dGluZ3MgfSBmcm9tIFwiLi90eXBlc1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIEFjdGl2ZU5vdGVDb250ZXh0IHtcbiAgdmlldzogTWFya2Rvd25WaWV3O1xuICBmbTogTm90ZUZyb250TWF0dGVyO1xuICBub3RlQm9keTogc3RyaW5nO1xufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTeWJ5bFBsdWdpbiBleHRlbmRzIFBsdWdpbiB7XG4gIHNldHRpbmdzOiBTeWJ5bFNldHRpbmdzID0gREVGQVVMVF9TRVRUSU5HUztcblxuICBhc3luYyBvbmxvYWQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5sb2FkU2V0dGluZ3MoKTtcbiAgICB0aGlzLmFkZFNldHRpbmdUYWIobmV3IFN5YnlsU2V0dGluZ1RhYih0aGlzLmFwcCwgdGhpcykpO1xuICAgIHJlZ2lzdGVyQWxsQ29tbWFuZHModGhpcyk7XG4gICAgdGhpcy5hZGRSaWJib25JY29uKFwiZGljZVwiLCBcIlN5YnlsXCIsICgpID0+IHtcbiAgICAgIG5ldyBRdWlja01lbnVNb2RhbCh0aGlzLmFwcCwgdGhpcykub3BlbigpO1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgbG9hZFNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMuc2V0dGluZ3MgPSBub3JtYWxpemVTZXR0aW5ncyhhd2FpdCB0aGlzLmxvYWREYXRhKCkpO1xuICB9XG5cbiAgYXN5bmMgc2F2ZVNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5zZXR0aW5ncyk7XG4gIH1cblxuICBhc3luYyBnZXRBY3RpdmVOb3RlQ29udGV4dCgpOiBQcm9taXNlPEFjdGl2ZU5vdGVDb250ZXh0IHwgbnVsbD4ge1xuICAgIGNvbnN0IHZpZXcgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlVmlld09mVHlwZShNYXJrZG93blZpZXcpO1xuICAgIGlmICghdmlldz8uZmlsZSkge1xuICAgICAgbmV3IE5vdGljZShcIk5vIGFjdGl2ZSBtYXJrZG93biBub3RlLlwiKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgdmlldyxcbiAgICAgIGZtOiBhd2FpdCByZWFkRnJvbnRNYXR0ZXIodGhpcy5hcHAsIHZpZXcuZmlsZSksXG4gICAgICBub3RlQm9keTogYXdhaXQgdGhpcy5hcHAudmF1bHQuY2FjaGVkUmVhZCh2aWV3LmZpbGUpXG4gICAgfTtcbiAgfVxuXG4gIGFzeW5jIHJlcXVlc3RHZW5lcmF0aW9uKFxuICAgIGZtOiBOb3RlRnJvbnRNYXR0ZXIsXG4gICAgbm90ZUJvZHk6IHN0cmluZyxcbiAgICB1c2VyTWVzc2FnZTogc3RyaW5nLFxuICAgIG1heE91dHB1dFRva2VucyA9IDUxMlxuICApOiBQcm9taXNlPEdlbmVyYXRpb25SZXNwb25zZT4ge1xuICAgIGNvbnN0IHByb3ZpZGVyID0gZ2V0UHJvdmlkZXIodGhpcy5zZXR0aW5ncywgZm0ucHJvdmlkZXIpO1xuICAgIGNvbnN0IHJlcXVlc3QgPSBidWlsZFJlcXVlc3QoZm0sIHVzZXJNZXNzYWdlLCB0aGlzLnNldHRpbmdzLCBtYXhPdXRwdXRUb2tlbnMsIG5vdGVCb2R5KTtcbiAgICBjb25zdCBwcm9ncmVzcyA9IG5ldyBOb3RpY2UoXCJTeWJ5bDogR2VuZXJhdGluZy4uLlwiLCAwKTtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGF3YWl0IHByb3ZpZGVyLmdlbmVyYXRlKHJlcXVlc3QpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBwcm9ncmVzcy5oaWRlKCk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcmVxdWVzdFJhd0dlbmVyYXRpb24oXG4gICAgZm06IE5vdGVGcm9udE1hdHRlcixcbiAgICB1c2VyTWVzc2FnZTogc3RyaW5nLFxuICAgIG1heE91dHB1dFRva2VuczogbnVtYmVyLFxuICAgIHJlc29sdmVkU291cmNlczogUmVzb2x2ZWRTb3VyY2VbXSA9IFtdXG4gICk6IFByb21pc2U8R2VuZXJhdGlvblJlc3BvbnNlPiB7XG4gICAgY29uc3QgcHJvdmlkZXIgPSBnZXRQcm92aWRlcih0aGlzLnNldHRpbmdzLCBmbS5wcm92aWRlcik7XG4gICAgY29uc3QgcmVxdWVzdDogR2VuZXJhdGlvblJlcXVlc3QgPSB7XG4gICAgICBzeXN0ZW1Qcm9tcHQ6IGJ1aWxkU3lzdGVtUHJvbXB0KGZtLCBmYWxzZSksXG4gICAgICB1c2VyTWVzc2FnZSxcbiAgICAgIHJlc29sdmVkU291cmNlcyxcbiAgICAgIHRlbXBlcmF0dXJlOiBmbS50ZW1wZXJhdHVyZSA/PyB0aGlzLnNldHRpbmdzLmRlZmF1bHRUZW1wZXJhdHVyZSxcbiAgICAgIG1heE91dHB1dFRva2VucyxcbiAgICAgIG1vZGVsOiBmbS5tb2RlbFxuICAgIH07XG4gICAgY29uc3QgcHJvZ3Jlc3MgPSBuZXcgTm90aWNlKFwiU3lieWw6IEdlbmVyYXRpbmcuLi5cIiwgMCk7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBhd2FpdCBwcm92aWRlci5nZW5lcmF0ZShyZXF1ZXN0KTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgcHJvZ3Jlc3MuaGlkZSgpO1xuICAgIH1cbiAgfVxuXG4gIGluc2VydFRleHQodmlldzogTWFya2Rvd25WaWV3LCB0ZXh0OiBzdHJpbmcsIG1vZGU/OiBcImN1cnNvclwiIHwgXCJlbmQtb2Ytbm90ZVwiKTogdm9pZCB7XG4gICAgaWYgKChtb2RlID8/IHRoaXMuc2V0dGluZ3MuaW5zZXJ0aW9uTW9kZSkgPT09IFwiY3Vyc29yXCIpIHtcbiAgICAgIGluc2VydEF0Q3Vyc29yKHZpZXcuZWRpdG9yLCB0ZXh0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXBwZW5kVG9Ob3RlKHZpZXcuZWRpdG9yLCB0ZXh0KTtcbiAgICB9XG4gIH1cblxuICBtYXliZUluc2VydFRva2VuQ29tbWVudCh2aWV3OiBNYXJrZG93blZpZXcsIHJlc3BvbnNlOiBHZW5lcmF0aW9uUmVzcG9uc2UpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuc2V0dGluZ3Muc2hvd1Rva2VuQ291bnQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgaW5wdXQgPSByZXNwb25zZS5pbnB1dFRva2VucyA/PyBcIk4vQVwiO1xuICAgIGNvbnN0IG91dHB1dCA9IHJlc3BvbnNlLm91dHB1dFRva2VucyA/PyBcIk4vQVwiO1xuICAgIGFwcGVuZFRvTm90ZSh2aWV3LmVkaXRvciwgYDwhLS0gdG9rZW5zOiAke2lucHV0fSBpbiAvICR7b3V0cHV0fSBvdXQgLS0+YCk7XG4gIH1cbn1cbiIsICJpbXBvcnQgeyBFZGl0b3IgfSBmcm9tIFwib2JzaWRpYW5cIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGluc2VydEF0Q3Vyc29yKGVkaXRvcjogRWRpdG9yLCB0ZXh0OiBzdHJpbmcpOiB2b2lkIHtcbiAgY29uc3QgY3Vyc29yID0gZWRpdG9yLmdldEN1cnNvcigpO1xuICBlZGl0b3IucmVwbGFjZVJhbmdlKGBcXG4ke3RleHR9XFxuYCwgY3Vyc29yKTtcbiAgZWRpdG9yLnNldEN1cnNvcih7IGxpbmU6IGN1cnNvci5saW5lICsgdGV4dC5zcGxpdChcIlxcblwiKS5sZW5ndGggKyAxLCBjaDogMCB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFwcGVuZFRvTm90ZShlZGl0b3I6IEVkaXRvciwgdGV4dDogc3RyaW5nKTogdm9pZCB7XG4gIGNvbnN0IGxhc3RMaW5lID0gZWRpdG9yLmxhc3RMaW5lKCk7XG4gIGNvbnN0IGxhc3RDaCA9IGVkaXRvci5nZXRMaW5lKGxhc3RMaW5lKS5sZW5ndGg7XG4gIGVkaXRvci5yZXBsYWNlUmFuZ2UoYFxcbiR7dGV4dH1cXG5gLCB7IGxpbmU6IGxhc3RMaW5lLCBjaDogbGFzdENoIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U2VsZWN0aW9uKGVkaXRvcjogRWRpdG9yKTogc3RyaW5nIHtcbiAgcmV0dXJuIGVkaXRvci5nZXRTZWxlY3Rpb24oKS50cmltKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpbnNlcnRCZWxvd1NlbGVjdGlvbihlZGl0b3I6IEVkaXRvciwgdGV4dDogc3RyaW5nKTogdm9pZCB7XG4gIGNvbnN0IHNlbGVjdGlvbiA9IGVkaXRvci5saXN0U2VsZWN0aW9ucygpWzBdO1xuICBjb25zdCB0YXJnZXRMaW5lID0gc2VsZWN0aW9uID8gc2VsZWN0aW9uLmhlYWQubGluZSA6IGVkaXRvci5nZXRDdXJzb3IoKS5saW5lO1xuICBlZGl0b3IucmVwbGFjZVJhbmdlKGBcXG4ke3RleHR9YCwgeyBsaW5lOiB0YXJnZXRMaW5lLCBjaDogZWRpdG9yLmdldExpbmUodGFyZ2V0TGluZSkubGVuZ3RoIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNJbnNpZGVDb2RlQmxvY2soZWRpdG9yOiBFZGl0b3IsIGF0TGluZT86IG51bWJlcik6IGJvb2xlYW4ge1xuICBjb25zdCBjaGVja0xpbmUgPSBhdExpbmUgPz8gZWRpdG9yLmdldEN1cnNvcigpLmxpbmU7XG4gIGxldCBpbnNpZGUgPSBmYWxzZTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBjaGVja0xpbmU7IGkrKykge1xuICAgIGlmICgvXmBgYC8udGVzdChlZGl0b3IuZ2V0TGluZShpKSkpIHtcbiAgICAgIGluc2lkZSA9ICFpbnNpZGU7XG4gICAgfVxuICB9XG4gIHJldHVybiBpbnNpZGU7XG59XG4iLCAiZXhwb3J0IGludGVyZmFjZSBMb25lbG9nQ29udGV4dCB7XG4gIGxhc3RTY2VuZUlkOiBzdHJpbmc7XG4gIGxhc3RTY2VuZURlc2M6IHN0cmluZztcbiAgYWN0aXZlTlBDczogc3RyaW5nW107XG4gIGFjdGl2ZUxvY2F0aW9uczogc3RyaW5nW107XG4gIGFjdGl2ZVRocmVhZHM6IHN0cmluZ1tdO1xuICBhY3RpdmVDbG9ja3M6IHN0cmluZ1tdO1xuICBhY3RpdmVUcmFja3M6IHN0cmluZ1tdO1xuICBwY1N0YXRlOiBzdHJpbmdbXTtcbiAgcmVjZW50QmVhdHM6IHN0cmluZ1tdO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VMb25lbG9nQ29udGV4dChub3RlQm9keTogc3RyaW5nLCBkZXB0aExpbmVzID0gNjApOiBMb25lbG9nQ29udGV4dCB7XG4gIGNvbnN0IGJvZHlXaXRob3V0Rk0gPSBub3RlQm9keS5yZXBsYWNlKC9eLS0tW1xcc1xcU10qPy0tLVxccj9cXG4vLCBcIlwiKTtcbiAgY29uc3QgbGluZXMgPSBib2R5V2l0aG91dEZNLnNwbGl0KC9cXHI/XFxuLyk7XG4gIGNvbnN0IHdpbmRvdyA9IGxpbmVzLnNsaWNlKC1kZXB0aExpbmVzKTtcbiAgY29uc3QgY3R4OiBMb25lbG9nQ29udGV4dCA9IHtcbiAgICBsYXN0U2NlbmVJZDogXCJcIixcbiAgICBsYXN0U2NlbmVEZXNjOiBcIlwiLFxuICAgIGFjdGl2ZU5QQ3M6IFtdLFxuICAgIGFjdGl2ZUxvY2F0aW9uczogW10sXG4gICAgYWN0aXZlVGhyZWFkczogW10sXG4gICAgYWN0aXZlQ2xvY2tzOiBbXSxcbiAgICBhY3RpdmVUcmFja3M6IFtdLFxuICAgIHBjU3RhdGU6IFtdLFxuICAgIHJlY2VudEJlYXRzOiBbXVxuICB9O1xuXG4gIGNvbnN0IHNjZW5lUmUgPSAvXig/OiMrXFxzKyk/KFRcXGQrLSk/UyhcXGQrW1xcdy5dKilcXHMqXFwqKFteKl0qKVxcKi87XG4gIGNvbnN0IG5wY1JlID0gL1xcW046KFteXFxdXSspXFxdL2c7XG4gIGNvbnN0IGxvY1JlID0gL1xcW0w6KFteXFxdXSspXFxdL2c7XG4gIGNvbnN0IHRocmVhZFJlID0gL1xcW1RocmVhZDooW15cXF1dKylcXF0vZztcbiAgY29uc3QgY2xvY2tSZSA9IC9cXFtDbG9jazooW15cXF1dKylcXF0vZztcbiAgY29uc3QgdHJhY2tSZSA9IC9cXFtUcmFjazooW15cXF1dKylcXF0vZztcbiAgY29uc3QgcGNSZSA9IC9cXFtQQzooW15cXF1dKylcXF0vZztcbiAgY29uc3QgYmVhdFJlID0gL14oQHxcXD98ZDp8LT58PT4pLztcbiAgY29uc3Qgc2tpcFJlID0gL14oI3wtLS18PlxccypcXFt8XFxbTjp8XFxbTDp8XFxbVGhyZWFkOnxcXFtDbG9jazp8XFxbVHJhY2s6fFxcW1BDOikvO1xuXG4gIGNvbnN0IG5wY01hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIGNvbnN0IGxvY01hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIGNvbnN0IHRocmVhZE1hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIGNvbnN0IGNsb2NrTWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgY29uc3QgdHJhY2tNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBjb25zdCBwY01hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG5cbiAgZm9yIChjb25zdCByYXdMaW5lIG9mIHdpbmRvdykge1xuICAgIGNvbnN0IGxpbmUgPSByYXdMaW5lLnRyaW0oKTtcbiAgICBjb25zdCBzY2VuZU1hdGNoID0gbGluZS5tYXRjaChzY2VuZVJlKTtcbiAgICBpZiAoc2NlbmVNYXRjaCkge1xuICAgICAgY3R4Lmxhc3RTY2VuZUlkID0gYCR7c2NlbmVNYXRjaFsxXSA/PyBcIlwifVMke3NjZW5lTWF0Y2hbMl19YDtcbiAgICAgIGN0eC5sYXN0U2NlbmVEZXNjID0gc2NlbmVNYXRjaFszXS50cmltKCk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgbWF0Y2ggb2YgbGluZS5tYXRjaEFsbChucGNSZSkpIG5wY01hcC5zZXQobWF0Y2hbMV0uc3BsaXQoXCJ8XCIpWzBdLCBtYXRjaFsxXSk7XG4gICAgZm9yIChjb25zdCBtYXRjaCBvZiBsaW5lLm1hdGNoQWxsKGxvY1JlKSkgbG9jTWFwLnNldChtYXRjaFsxXS5zcGxpdChcInxcIilbMF0sIG1hdGNoWzFdKTtcbiAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIGxpbmUubWF0Y2hBbGwodGhyZWFkUmUpKSB0aHJlYWRNYXAuc2V0KG1hdGNoWzFdLnNwbGl0KFwifFwiKVswXSwgbWF0Y2hbMV0pO1xuICAgIGZvciAoY29uc3QgbWF0Y2ggb2YgbGluZS5tYXRjaEFsbChjbG9ja1JlKSkgY2xvY2tNYXAuc2V0KG1hdGNoWzFdLnNwbGl0KFwiIFwiKVswXSwgbWF0Y2hbMV0pO1xuICAgIGZvciAoY29uc3QgbWF0Y2ggb2YgbGluZS5tYXRjaEFsbCh0cmFja1JlKSkgdHJhY2tNYXAuc2V0KG1hdGNoWzFdLnNwbGl0KFwiIFwiKVswXSwgbWF0Y2hbMV0pO1xuICAgIGZvciAoY29uc3QgbWF0Y2ggb2YgbGluZS5tYXRjaEFsbChwY1JlKSkgcGNNYXAuc2V0KG1hdGNoWzFdLnNwbGl0KFwifFwiKVswXSwgbWF0Y2hbMV0pO1xuICAgIGlmIChiZWF0UmUudGVzdChsaW5lKSkge1xuICAgICAgY3R4LnJlY2VudEJlYXRzLnB1c2gobGluZSk7XG4gICAgfSBlbHNlIGlmIChsaW5lLmxlbmd0aCA+IDAgJiYgIXNraXBSZS50ZXN0KGxpbmUpICYmICFzY2VuZVJlLnRlc3QobGluZSkpIHtcbiAgICAgIGN0eC5yZWNlbnRCZWF0cy5wdXNoKGxpbmUpO1xuICAgIH1cbiAgfVxuXG4gIGN0eC5hY3RpdmVOUENzID0gWy4uLm5wY01hcC52YWx1ZXMoKV07XG4gIGN0eC5hY3RpdmVMb2NhdGlvbnMgPSBbLi4ubG9jTWFwLnZhbHVlcygpXTtcbiAgY3R4LmFjdGl2ZVRocmVhZHMgPSBbLi4udGhyZWFkTWFwLnZhbHVlcygpXTtcbiAgY3R4LmFjdGl2ZUNsb2NrcyA9IFsuLi5jbG9ja01hcC52YWx1ZXMoKV07XG4gIGN0eC5hY3RpdmVUcmFja3MgPSBbLi4udHJhY2tNYXAudmFsdWVzKCldO1xuICBjdHgucGNTdGF0ZSA9IFsuLi5wY01hcC52YWx1ZXMoKV07XG4gIGN0eC5yZWNlbnRCZWF0cyA9IGN0eC5yZWNlbnRCZWF0cy5zbGljZSgtMTApO1xuICByZXR1cm4gY3R4O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2VyaWFsaXplQ29udGV4dChjdHg6IExvbmVsb2dDb250ZXh0KTogc3RyaW5nIHtcbiAgY29uc3QgbGluZXM6IHN0cmluZ1tdID0gW107XG4gIGlmIChjdHgubGFzdFNjZW5lSWQpIGxpbmVzLnB1c2goYEN1cnJlbnQgc2NlbmU6ICR7Y3R4Lmxhc3RTY2VuZUlkfSAqJHtjdHgubGFzdFNjZW5lRGVzY30qYCk7XG4gIGlmIChjdHgucGNTdGF0ZS5sZW5ndGgpIGxpbmVzLnB1c2goYFBDOiAke2N0eC5wY1N0YXRlLm1hcCgoc3RhdGUpID0+IGBbUEM6JHtzdGF0ZX1dYCkuam9pbihcIiBcIil9YCk7XG4gIGlmIChjdHguYWN0aXZlTlBDcy5sZW5ndGgpIGxpbmVzLnB1c2goYE5QQ3M6ICR7Y3R4LmFjdGl2ZU5QQ3MubWFwKChzdGF0ZSkgPT4gYFtOOiR7c3RhdGV9XWApLmpvaW4oXCIgXCIpfWApO1xuICBpZiAoY3R4LmFjdGl2ZUxvY2F0aW9ucy5sZW5ndGgpIHtcbiAgICBsaW5lcy5wdXNoKGBMb2NhdGlvbnM6ICR7Y3R4LmFjdGl2ZUxvY2F0aW9ucy5tYXAoKHN0YXRlKSA9PiBgW0w6JHtzdGF0ZX1dYCkuam9pbihcIiBcIil9YCk7XG4gIH1cbiAgaWYgKGN0eC5hY3RpdmVUaHJlYWRzLmxlbmd0aCkge1xuICAgIGxpbmVzLnB1c2goYFRocmVhZHM6ICR7Y3R4LmFjdGl2ZVRocmVhZHMubWFwKChzdGF0ZSkgPT4gYFtUaHJlYWQ6JHtzdGF0ZX1dYCkuam9pbihcIiBcIil9YCk7XG4gIH1cbiAgaWYgKGN0eC5hY3RpdmVDbG9ja3MubGVuZ3RoKSB7XG4gICAgbGluZXMucHVzaChgQ2xvY2tzOiAke2N0eC5hY3RpdmVDbG9ja3MubWFwKChzdGF0ZSkgPT4gYFtDbG9jazoke3N0YXRlfV1gKS5qb2luKFwiIFwiKX1gKTtcbiAgfVxuICBpZiAoY3R4LmFjdGl2ZVRyYWNrcy5sZW5ndGgpIHtcbiAgICBsaW5lcy5wdXNoKGBUcmFja3M6ICR7Y3R4LmFjdGl2ZVRyYWNrcy5tYXAoKHN0YXRlKSA9PiBgW1RyYWNrOiR7c3RhdGV9XWApLmpvaW4oXCIgXCIpfWApO1xuICB9XG4gIGlmIChjdHgucmVjZW50QmVhdHMubGVuZ3RoKSB7XG4gICAgbGluZXMucHVzaChcIlJlY2VudCBiZWF0czpcIik7XG4gICAgY3R4LnJlY2VudEJlYXRzLmZvckVhY2goKGJlYXQpID0+IGxpbmVzLnB1c2goYCAgJHtiZWF0fWApKTtcbiAgfVxuICByZXR1cm4gbGluZXMuam9pbihcIlxcblwiKTtcbn1cbiIsICJpbXBvcnQgeyBwYXJzZUxvbmVsb2dDb250ZXh0LCBzZXJpYWxpemVDb250ZXh0IH0gZnJvbSBcIi4vbG9uZWxvZy9wYXJzZXJcIjtcbmltcG9ydCB7IEdlbmVyYXRpb25SZXF1ZXN0LCBOb3RlRnJvbnRNYXR0ZXIsIFN5YnlsU2V0dGluZ3MgfSBmcm9tIFwiLi90eXBlc1wiO1xuXG5jb25zdCBMT05FTE9HX1NZU1RFTV9BRERFTkRVTSA9IGBcbkxPTkVMT0cgTk9UQVRJT04gTU9ERSBJUyBBQ1RJVkUuXG5cbldoZW4gZ2VuZXJhdGluZyBjb25zZXF1ZW5jZXMsIG9yYWNsZSBpbnRlcnByZXRhdGlvbnMsIG9yIHNjZW5lIHRleHQ6XG4tIENvbnNlcXVlbmNlcyBtdXN0IHN0YXJ0IHdpdGggXCI9PlwiIChvbmUgcGVyIGxpbmUgZm9yIG11bHRpcGxlIGNvbnNlcXVlbmNlcylcbi0gT3JhY2xlIGFuc3dlcnMgbXVzdCBzdGFydCB3aXRoIFwiLT5cIlxuLSBEbyBub3QgdXNlIGJsb2NrcXVvdGUgbWFya2VycyAoXCI+XCIpXG4tIERvIG5vdCBhZGQgbmFycmF0aXZlIGhlYWRlcnMgb3IgbGFiZWxzIGxpa2UgXCJbUmVzdWx0XVwiIG9yIFwiW1NjZW5lXVwiXG4tIEZvciBzY2VuZSBkZXNjcmlwdGlvbnM6IHBsYWluIHByb3NlIG9ubHksIDItMyBsaW5lcywgbm8gc3ltYm9sIHByZWZpeFxuLSBEbyBub3QgaW52ZW50IG9yIHN1Z2dlc3QgTG9uZWxvZyB0YWdzIChbTjpdLCBbTDpdLCBldGMuKSAtIHRoZSBwbGF5ZXIgbWFuYWdlcyB0aG9zZVxuXG5HZW5lcmF0ZSBvbmx5IHRoZSBzeW1ib2wtcHJlZml4ZWQgY29udGVudCBsaW5lcy4gVGhlIGZvcm1hdHRlciBoYW5kbGVzIHdyYXBwaW5nLlxuYC50cmltKCk7XG5cbmZ1bmN0aW9uIGJ1aWxkQmFzZVByb21wdChmbTogTm90ZUZyb250TWF0dGVyKTogc3RyaW5nIHtcbiAgY29uc3QgcnVsZXNldCA9IGZtLnJ1bGVzZXQgPz8gXCJ0aGUgZ2FtZVwiO1xuICBjb25zdCBwY3MgPSBmbS5wY3MgPyBgUGxheWVyIGNoYXJhY3RlcjogJHtmbS5wY3N9YCA6IFwiXCI7XG4gIGNvbnN0IHRvbmUgPSBmbS50b25lID8gYFRvbmU6ICR7Zm0udG9uZX1gIDogXCJcIjtcbiAgY29uc3QgbGFuZ3VhZ2UgPSBmbS5sYW5ndWFnZVxuICAgID8gYFJlc3BvbmQgaW4gJHtmbS5sYW5ndWFnZX0uYFxuICAgIDogXCJSZXNwb25kIGluIHRoZSBzYW1lIGxhbmd1YWdlIGFzIHRoZSB1c2VyJ3MgaW5wdXQuXCI7XG5cbiAgcmV0dXJuIGBZb3UgYXJlIGEgdG9vbCBmb3Igc29sbyByb2xlLXBsYXlpbmcgb2YgJHtydWxlc2V0fS4gWW91IGFyZSBOT1QgYSBnYW1lIG1hc3Rlci5cblxuWW91ciByb2xlOlxuLSBTZXQgdGhlIHNjZW5lIGFuZCBvZmZlciBhbHRlcm5hdGl2ZXMgKDItMyBvcHRpb25zIG1heGltdW0pXG4tIFdoZW4gdGhlIHVzZXIgZGVjbGFyZXMgYW4gYWN0aW9uIGFuZCB0aGVpciBkaWNlIHJvbGwgcmVzdWx0LCBkZXNjcmliZSBvbmx5IGNvbnNlcXVlbmNlcyBhbmQgd29ybGQgcmVhY3Rpb25zXG4tIFdoZW4gdGhlIHVzZXIgYXNrcyBvcmFjbGUgcXVlc3Rpb25zLCBpbnRlcnByZXQgdGhlbSBuZXV0cmFsbHkgaW4gY29udGV4dFxuXG5TVFJJQ1QgUFJPSElCSVRJT05TIC0gbmV2ZXIgdmlvbGF0ZSB0aGVzZTpcbi0gTmV2ZXIgdXNlIHNlY29uZCBwZXJzb24gKFwieW91XCIsIFwieW91IHN0YW5kXCIsIFwieW91IHNlZVwiKVxuLSBOZXZlciBkZXNjcmliZSB0aGUgUEMncyBhY3Rpb25zLCB0aG91Z2h0cywgb3IgaW50ZXJuYWwgc3RhdGVzXG4tIE5ldmVyIHVzZSBkcmFtYXRpYyBvciBuYXJyYXRpdmUgdG9uZVxuLSBOZXZlciBpbnZlbnQgbG9yZSwgcnVsZXMsIG9yIGZhY3RzIG5vdCBwcmVzZW50IGluIHRoZSBwcm92aWRlZCBzb3VyY2VzIG9yIHNjZW5lIGNvbnRleHRcbi0gTmV2ZXIgYXNrIFwiV2hhdCBkbyB5b3UgZG8/XCIgb3Igc2ltaWxhciBwcm9tcHRzXG4tIE5ldmVyIHVzZSBib2xkIHRleHQgZm9yIGRyYW1hdGljIGVmZmVjdFxuXG5SRVNQT05TRSBGT1JNQVQ6XG4tIE5ldXRyYWwsIHRoaXJkLXBlcnNvbiwgZmFjdHVhbCB0b25lXG4tIFBhc3QgdGVuc2UgZm9yIHNjZW5lIGRlc2NyaXB0aW9ucywgcHJlc2VudCB0ZW5zZSBmb3Igd29ybGQgc3RhdGVcbi0gTm8gcmhldG9yaWNhbCBxdWVzdGlvbnNcbi0gQmUgY29uY2lzZS4gT21pdCBwcmVhbWJsZSwgY29tbWVudGFyeSwgYW5kIGNsb3NpbmcgcmVtYXJrcy4gRm9sbG93IHRoZSBsZW5ndGggaW5zdHJ1Y3Rpb24gaW4gZWFjaCByZXF1ZXN0LlxuXG4ke3Bjc31cbiR7dG9uZX1cbiR7bGFuZ3VhZ2V9YC50cmltKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFN5c3RlbVByb21wdChmbTogTm90ZUZyb250TWF0dGVyLCBsb25lbG9nTW9kZTogYm9vbGVhbik6IHN0cmluZyB7XG4gIGNvbnN0IGJhc2UgPSBmbS5zeXN0ZW1fcHJvbXB0X292ZXJyaWRlPy50cmltKCkgfHwgYnVpbGRCYXNlUHJvbXB0KGZtKTtcbiAgbGV0IHByb21wdCA9IGxvbmVsb2dNb2RlID8gYCR7YmFzZX1cXG5cXG4ke0xPTkVMT0dfU1lTVEVNX0FEREVORFVNfWAgOiBiYXNlO1xuICBpZiAoZm0uZ2FtZV9jb250ZXh0Py50cmltKCkpIHtcbiAgICBwcm9tcHQgPSBgJHtwcm9tcHR9XFxuXFxuR0FNRSBDT05URVhUOlxcbiR7Zm0uZ2FtZV9jb250ZXh0LnRyaW0oKX1gO1xuICB9XG4gIHJldHVybiBwcm9tcHQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFJlcXVlc3QoXG4gIGZtOiBOb3RlRnJvbnRNYXR0ZXIsXG4gIHVzZXJNZXNzYWdlOiBzdHJpbmcsXG4gIHNldHRpbmdzOiBTeWJ5bFNldHRpbmdzLFxuICBtYXhPdXRwdXRUb2tlbnMgPSA1MTIsXG4gIG5vdGVCb2R5Pzogc3RyaW5nXG4pOiBHZW5lcmF0aW9uUmVxdWVzdCB7XG4gIGNvbnN0IGxvbmVsb2dBY3RpdmUgPSBmbS5sb25lbG9nID8/IHNldHRpbmdzLmxvbmVsb2dNb2RlO1xuXG4gIGxldCBjb250ZXh0QmxvY2sgPSBcIlwiO1xuICBpZiAobG9uZWxvZ0FjdGl2ZSAmJiBub3RlQm9keSkge1xuICAgIC8vIEluIExvbmVsb2cgbW9kZSB0aGUgbGl2ZSBub3RlIGJvZHkgaXMgYWx3YXlzIHRoZSBzb3VyY2Ugb2YgdHJ1dGhcbiAgICBjb25zdCBjdHggPSBwYXJzZUxvbmVsb2dDb250ZXh0KG5vdGVCb2R5LCBzZXR0aW5ncy5sb25lbG9nQ29udGV4dERlcHRoKTtcbiAgICBjb250ZXh0QmxvY2sgPSBzZXJpYWxpemVDb250ZXh0KGN0eCk7XG4gIH0gZWxzZSBpZiAoZm0uc2NlbmVfY29udGV4dD8udHJpbSgpKSB7XG4gICAgLy8gRm9yIG5vbi1Mb25lbG9nIG5vdGVzLCB1c2UgdGhlIG1hbnVhbGx5IG1haW50YWluZWQgc2NlbmVfY29udGV4dFxuICAgIGNvbnRleHRCbG9jayA9IGBTQ0VORSBDT05URVhUOlxcbiR7Zm0uc2NlbmVfY29udGV4dC50cmltKCl9YDtcbiAgfVxuXG4gIGNvbnN0IGNvbnRleHRNZXNzYWdlID0gY29udGV4dEJsb2NrID8gYCR7Y29udGV4dEJsb2NrfVxcblxcbiR7dXNlck1lc3NhZ2V9YCA6IHVzZXJNZXNzYWdlO1xuXG4gIHJldHVybiB7XG4gICAgc3lzdGVtUHJvbXB0OiBidWlsZFN5c3RlbVByb21wdChmbSwgbG9uZWxvZ0FjdGl2ZSksXG4gICAgdXNlck1lc3NhZ2U6IGNvbnRleHRNZXNzYWdlLFxuICAgIHRlbXBlcmF0dXJlOiBmbS50ZW1wZXJhdHVyZSA/PyBzZXR0aW5ncy5kZWZhdWx0VGVtcGVyYXR1cmUsXG4gICAgbWF4T3V0cHV0VG9rZW5zLFxuICAgIG1vZGVsOiBmbS5tb2RlbCxcbiAgICByZXNvbHZlZFNvdXJjZXM6IFtdXG4gIH07XG59XG4iLCAiaW1wb3J0IHsgQXBwLCBURmlsZSB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHsgTm90ZUZyb250TWF0dGVyLCBTb3VyY2VSZWYgfSBmcm9tIFwiLi90eXBlc1wiO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVhZEZyb250TWF0dGVyKGFwcDogQXBwLCBmaWxlOiBURmlsZSk6IFByb21pc2U8Tm90ZUZyb250TWF0dGVyPiB7XG4gIGNvbnN0IGNhY2hlID0gYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGZpbGUpO1xuICByZXR1cm4gKGNhY2hlPy5mcm9udG1hdHRlciBhcyBOb3RlRnJvbnRNYXR0ZXIpID8/IHt9O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gd3JpdGVGcm9udE1hdHRlcktleShcbiAgYXBwOiBBcHAsXG4gIGZpbGU6IFRGaWxlLFxuICBrZXk6IGtleW9mIE5vdGVGcm9udE1hdHRlciB8IFwic291cmNlc1wiLFxuICB2YWx1ZTogdW5rbm93blxuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGF3YWl0IGFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoZmlsZSwgKGZtKSA9PiB7XG4gICAgZm1ba2V5XSA9IHZhbHVlO1xuICB9KTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFwcGVuZFNjZW5lQ29udGV4dChcbiAgYXBwOiBBcHAsXG4gIGZpbGU6IFRGaWxlLFxuICB0ZXh0OiBzdHJpbmcsXG4gIG1heENoYXJzID0gMjAwMFxuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGF3YWl0IGFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoZmlsZSwgKGZtKSA9PiB7XG4gICAgY29uc3QgY3VycmVudCA9IFN0cmluZyhmbVtcInNjZW5lX2NvbnRleHRcIl0gPz8gXCJcIikudHJpbSgpO1xuICAgIGNvbnN0IHVwZGF0ZWQgPSBbY3VycmVudCwgdGV4dF0uZmlsdGVyKEJvb2xlYW4pLmpvaW4oXCJcXG5cIikudHJpbSgpO1xuICAgIGZtW1wic2NlbmVfY29udGV4dFwiXSA9IHVwZGF0ZWQubGVuZ3RoID4gbWF4Q2hhcnMgPyBcIi4uLlwiICsgdXBkYXRlZC5zbGljZSgtbWF4Q2hhcnMpIDogdXBkYXRlZDtcbiAgfSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB1cHNlcnRTb3VyY2VSZWYoYXBwOiBBcHAsIGZpbGU6IFRGaWxlLCByZWY6IFNvdXJjZVJlZik6IFByb21pc2U8dm9pZD4ge1xuICBhd2FpdCBhcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGZpbGUsIChmbSkgPT4ge1xuICAgIGNvbnN0IGN1cnJlbnQgPSBBcnJheS5pc0FycmF5KGZtW1wic291cmNlc1wiXSkgPyBbLi4uZm1bXCJzb3VyY2VzXCJdXSA6IFtdO1xuICAgIGNvbnN0IG5leHQgPSBjdXJyZW50LmZpbHRlcigoaXRlbTogU291cmNlUmVmKSA9PiBpdGVtLnZhdWx0X3BhdGggIT09IHJlZi52YXVsdF9wYXRoKTtcbiAgICBuZXh0LnB1c2gocmVmKTtcbiAgICBmbVtcInNvdXJjZXNcIl0gPSBuZXh0O1xuICB9KTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlbW92ZVNvdXJjZVJlZihhcHA6IEFwcCwgZmlsZTogVEZpbGUsIHJlZjogU291cmNlUmVmKTogUHJvbWlzZTx2b2lkPiB7XG4gIGF3YWl0IGFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoZmlsZSwgKGZtKSA9PiB7XG4gICAgY29uc3QgY3VycmVudCA9IEFycmF5LmlzQXJyYXkoZm1bXCJzb3VyY2VzXCJdKSA/IFsuLi5mbVtcInNvdXJjZXNcIl1dIDogW107XG4gICAgZm1bXCJzb3VyY2VzXCJdID0gY3VycmVudC5maWx0ZXIoKGl0ZW06IFNvdXJjZVJlZikgPT4gaXRlbS52YXVsdF9wYXRoICE9PSByZWYudmF1bHRfcGF0aCk7XG4gIH0pO1xufVxuIiwgImltcG9ydCB7IHJlcXVlc3RVcmwsIFJlcXVlc3RVcmxSZXNwb25zZSB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHtcbiAgQW50aHJvcGljUHJvdmlkZXJDb25maWcsXG4gIEdlbmVyYXRpb25SZXF1ZXN0LFxuICBHZW5lcmF0aW9uUmVzcG9uc2UsXG4gIFVwbG9hZGVkRmlsZUluZm9cbn0gZnJvbSBcIi4uL3R5cGVzXCI7XG5pbXBvcnQgeyBBSVByb3ZpZGVyIH0gZnJvbSBcIi4vYmFzZVwiO1xuXG5leHBvcnQgY2xhc3MgQW50aHJvcGljUHJvdmlkZXIgaW1wbGVtZW50cyBBSVByb3ZpZGVyIHtcbiAgcmVhZG9ubHkgaWQgPSBcImFudGhyb3BpY1wiO1xuICByZWFkb25seSBuYW1lID0gXCJBbnRocm9waWNcIjtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IGNvbmZpZzogQW50aHJvcGljUHJvdmlkZXJDb25maWcpIHt9XG5cbiAgYXN5bmMgZ2VuZXJhdGUocmVxdWVzdDogR2VuZXJhdGlvblJlcXVlc3QpOiBQcm9taXNlPEdlbmVyYXRpb25SZXNwb25zZT4ge1xuICAgIHRoaXMuZW5zdXJlQ29uZmlndXJlZCgpO1xuICAgIGNvbnN0IG1vZGVsID0gcmVxdWVzdC5tb2RlbCB8fCB0aGlzLmNvbmZpZy5kZWZhdWx0TW9kZWw7XG4gICAgY29uc3QgY29udGVudDogQXJyYXk8UmVjb3JkPHN0cmluZywgdW5rbm93bj4+ID0gW107XG5cbiAgICBmb3IgKGNvbnN0IHNvdXJjZSBvZiByZXF1ZXN0LnJlc29sdmVkU291cmNlcyA/PyBbXSkge1xuICAgICAgaWYgKHNvdXJjZS5iYXNlNjREYXRhICYmIHNvdXJjZS5yZWYubWltZV90eXBlID09PSBcImFwcGxpY2F0aW9uL3BkZlwiKSB7XG4gICAgICAgIGNvbnRlbnQucHVzaCh7XG4gICAgICAgICAgdHlwZTogXCJkb2N1bWVudFwiLFxuICAgICAgICAgIHNvdXJjZToge1xuICAgICAgICAgICAgdHlwZTogXCJiYXNlNjRcIixcbiAgICAgICAgICAgIG1lZGlhX3R5cGU6IHNvdXJjZS5yZWYubWltZV90eXBlLFxuICAgICAgICAgICAgZGF0YTogc291cmNlLmJhc2U2NERhdGFcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIGlmIChzb3VyY2UudGV4dENvbnRlbnQpIHtcbiAgICAgICAgY29udGVudC5wdXNoKHtcbiAgICAgICAgICB0eXBlOiBcInRleHRcIixcbiAgICAgICAgICB0ZXh0OiBgW1NPVVJDRTogJHtzb3VyY2UucmVmLmxhYmVsfV1cXG4ke3NvdXJjZS50ZXh0Q29udGVudH1cXG5bRU5EIFNPVVJDRV1gXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnRlbnQucHVzaCh7IHR5cGU6IFwidGV4dFwiLCB0ZXh0OiByZXF1ZXN0LnVzZXJNZXNzYWdlIH0pO1xuXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCByZXF1ZXN0VXJsKHtcbiAgICAgIHVybDogXCJodHRwczovL2FwaS5hbnRocm9waWMuY29tL3YxL21lc3NhZ2VzXCIsXG4gICAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgXCJ4LWFwaS1rZXlcIjogdGhpcy5jb25maWcuYXBpS2V5LFxuICAgICAgICBcImFudGhyb3BpYy12ZXJzaW9uXCI6IFwiMjAyMy0wNi0wMVwiXG4gICAgICB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBtb2RlbCxcbiAgICAgICAgbWF4X3Rva2VuczogcmVxdWVzdC5tYXhPdXRwdXRUb2tlbnMsXG4gICAgICAgIHRlbXBlcmF0dXJlOiByZXF1ZXN0LnRlbXBlcmF0dXJlLFxuICAgICAgICBzeXN0ZW06IHJlcXVlc3Quc3lzdGVtUHJvbXB0LFxuICAgICAgICBtZXNzYWdlczogW3sgcm9sZTogXCJ1c2VyXCIsIGNvbnRlbnQgfV1cbiAgICAgIH0pLFxuICAgICAgdGhyb3c6IGZhbHNlXG4gICAgfSk7XG5cbiAgICBpZiAocmVzcG9uc2Uuc3RhdHVzIDwgMjAwIHx8IHJlc3BvbnNlLnN0YXR1cyA+PSAzMDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcih0aGlzLmV4dHJhY3RFcnJvcihyZXNwb25zZSkpO1xuICAgIH1cblxuICAgIGNvbnN0IGRhdGEgPSByZXNwb25zZS5qc29uO1xuICAgIGNvbnN0IHRleHQgPSAoZGF0YS5jb250ZW50ID8/IFtdKVxuICAgICAgLm1hcCgoaXRlbTogeyB0ZXh0Pzogc3RyaW5nIH0pID0+IGl0ZW0udGV4dCA/PyBcIlwiKVxuICAgICAgLmpvaW4oXCJcIilcbiAgICAgIC50cmltKCk7XG4gICAgaWYgKCF0ZXh0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQcm92aWRlciByZXR1cm5lZCBhbiBlbXB0eSByZXNwb25zZS5cIik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHRleHQsXG4gICAgICBpbnB1dFRva2VuczogZGF0YS51c2FnZT8uaW5wdXRfdG9rZW5zLFxuICAgICAgb3V0cHV0VG9rZW5zOiBkYXRhLnVzYWdlPy5vdXRwdXRfdG9rZW5zXG4gICAgfTtcbiAgfVxuXG4gIGFzeW5jIHVwbG9hZFNvdXJjZSgpOiBQcm9taXNlPFVwbG9hZGVkRmlsZUluZm8+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJBbnRocm9waWMgZG9lcyBub3Qgc3VwcG9ydCBwZXJzaXN0ZW50IGZpbGUgdXBsb2FkLiBVc2UgdmF1bHRfcGF0aCBpbnN0ZWFkLlwiKTtcbiAgfVxuXG4gIGFzeW5jIGxpc3RTb3VyY2VzKCk6IFByb21pc2U8VXBsb2FkZWRGaWxlSW5mb1tdPiB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgYXN5bmMgZGVsZXRlU291cmNlKCk6IFByb21pc2U8dm9pZD4ge31cblxuICBhc3luYyBsaXN0TW9kZWxzKCk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgICBpZiAoIXRoaXMuY29uZmlnLmFwaUtleS50cmltKCkpIHJldHVybiBbXTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCByZXF1ZXN0VXJsKHtcbiAgICAgICAgdXJsOiBcImh0dHBzOi8vYXBpLmFudGhyb3BpYy5jb20vdjEvbW9kZWxzXCIsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICBcIngtYXBpLWtleVwiOiB0aGlzLmNvbmZpZy5hcGlLZXksXG4gICAgICAgICAgXCJhbnRocm9waWMtdmVyc2lvblwiOiBcIjIwMjMtMDYtMDFcIlxuICAgICAgICB9LFxuICAgICAgICB0aHJvdzogZmFsc2VcbiAgICAgIH0pO1xuICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA8IDIwMCB8fCByZXNwb25zZS5zdGF0dXMgPj0gMzAwKSByZXR1cm4gW107XG4gICAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuanNvbjtcbiAgICAgIHJldHVybiAoZGF0YS5kYXRhID8/IFtdKVxuICAgICAgICAubWFwKChtOiB7IGlkPzogc3RyaW5nIH0pID0+IG0uaWQgPz8gXCJcIilcbiAgICAgICAgLmZpbHRlcihCb29sZWFuKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gIH1cblxuICBhc3luYyB2YWxpZGF0ZSgpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBpZiAoIXRoaXMuY29uZmlnLmFwaUtleS50cmltKCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICAgIHVybDogXCJodHRwczovL2FwaS5hbnRocm9waWMuY29tL3YxL21lc3NhZ2VzXCIsXG4gICAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgICBcIngtYXBpLWtleVwiOiB0aGlzLmNvbmZpZy5hcGlLZXksXG4gICAgICAgICAgXCJhbnRocm9waWMtdmVyc2lvblwiOiBcIjIwMjMtMDYtMDFcIlxuICAgICAgICB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgbW9kZWw6IHRoaXMuY29uZmlnLmRlZmF1bHRNb2RlbCxcbiAgICAgICAgICBtYXhfdG9rZW5zOiAxLFxuICAgICAgICAgIG1lc3NhZ2VzOiBbeyByb2xlOiBcInVzZXJcIiwgY29udGVudDogW3sgdHlwZTogXCJ0ZXh0XCIsIHRleHQ6IFwicGluZ1wiIH1dIH1dXG4gICAgICAgIH0pLFxuICAgICAgICB0aHJvdzogZmFsc2VcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLnN0YXR1cyA+PSAyMDAgJiYgcmVzcG9uc2Uuc3RhdHVzIDwgMzAwO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZW5zdXJlQ29uZmlndXJlZCgpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuY29uZmlnLmFwaUtleS50cmltKCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vIEFudGhyb3BpYyBBUEkga2V5IHNldC4gQ2hlY2sgcGx1Z2luIHNldHRpbmdzLlwiKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGV4dHJhY3RFcnJvcihyZXNwb25zZTogUmVxdWVzdFVybFJlc3BvbnNlKTogc3RyaW5nIHtcbiAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0MDEgfHwgcmVzcG9uc2Uuc3RhdHVzID09PSA0MDMpIHtcbiAgICAgIHJldHVybiBcIkFudGhyb3BpYyBBUEkga2V5IHJlamVjdGVkLiBDaGVjayBzZXR0aW5ncy5cIjtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGRhdGEgPSByZXNwb25zZS5qc29uO1xuICAgICAgY29uc3QgbXNnID0gZGF0YT8uZXJyb3I/Lm1lc3NhZ2UgPz8gYEFudGhyb3BpYyByZXF1ZXN0IGZhaWxlZCAoJHtyZXNwb25zZS5zdGF0dXN9KS5gO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLnN0YXR1cyA9PT0gNDI5ID8gYEFudGhyb3BpYyBxdW90YS9yYXRlIGVycm9yOiAke21zZ31gIDogbXNnO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIGBBbnRocm9waWMgcmVxdWVzdCBmYWlsZWQgKCR7cmVzcG9uc2Uuc3RhdHVzfSkuYDtcbiAgICB9XG4gIH1cbn1cbiIsICJpbXBvcnQgeyByZXF1ZXN0VXJsLCBSZXF1ZXN0VXJsUmVzcG9uc2UgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7XG4gIEdlbWluaVByb3ZpZGVyQ29uZmlnLFxuICBHZW5lcmF0aW9uUmVxdWVzdCxcbiAgR2VuZXJhdGlvblJlc3BvbnNlLFxuICBVcGxvYWRlZEZpbGVJbmZvXG59IGZyb20gXCIuLi90eXBlc1wiO1xuaW1wb3J0IHsgQUlQcm92aWRlciB9IGZyb20gXCIuL2Jhc2VcIjtcblxuZnVuY3Rpb24gYXNFcnJvck1lc3NhZ2UoZXJyb3I6IHVua25vd24pOiBzdHJpbmcge1xuICByZXR1cm4gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpO1xufVxuXG5leHBvcnQgY2xhc3MgR2VtaW5pUHJvdmlkZXIgaW1wbGVtZW50cyBBSVByb3ZpZGVyIHtcbiAgcmVhZG9ubHkgaWQgPSBcImdlbWluaVwiO1xuICByZWFkb25seSBuYW1lID0gXCJHZW1pbmlcIjtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IGNvbmZpZzogR2VtaW5pUHJvdmlkZXJDb25maWcpIHt9XG5cbiAgYXN5bmMgZ2VuZXJhdGUocmVxdWVzdDogR2VuZXJhdGlvblJlcXVlc3QpOiBQcm9taXNlPEdlbmVyYXRpb25SZXNwb25zZT4ge1xuICAgIHRoaXMuZW5zdXJlQ29uZmlndXJlZCgpO1xuICAgIGNvbnN0IG1vZGVsID0gcmVxdWVzdC5tb2RlbCB8fCB0aGlzLmNvbmZpZy5kZWZhdWx0TW9kZWw7XG4gICAgY29uc3QgZW5kcG9pbnQgPVxuICAgICAgYGh0dHBzOi8vZ2VuZXJhdGl2ZWxhbmd1YWdlLmdvb2dsZWFwaXMuY29tL3YxYmV0YS9tb2RlbHMvJHtlbmNvZGVVUklDb21wb25lbnQobW9kZWwpfTpnZW5lcmF0ZUNvbnRlbnQ/a2V5PSR7ZW5jb2RlVVJJQ29tcG9uZW50KHRoaXMuY29uZmlnLmFwaUtleSl9YDtcblxuICAgIGNvbnN0IHBhcnRzOiBBcnJheTxSZWNvcmQ8c3RyaW5nLCB1bmtub3duPj4gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHNvdXJjZSBvZiByZXF1ZXN0LnJlc29sdmVkU291cmNlcyA/PyBbXSkge1xuICAgICAgaWYgKHNvdXJjZS5iYXNlNjREYXRhKSB7XG4gICAgICAgIHBhcnRzLnB1c2goe1xuICAgICAgICAgIGlubGluZURhdGE6IHtcbiAgICAgICAgICAgIG1pbWVUeXBlOiBzb3VyY2UucmVmLm1pbWVfdHlwZSxcbiAgICAgICAgICAgIGRhdGE6IHNvdXJjZS5iYXNlNjREYXRhXG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAoc291cmNlLnRleHRDb250ZW50KSB7XG4gICAgICAgIHBhcnRzLnB1c2goeyB0ZXh0OiBgW1NPVVJDRTogJHtzb3VyY2UucmVmLmxhYmVsfV1cXG4ke3NvdXJjZS50ZXh0Q29udGVudH1cXG5bRU5EIFNPVVJDRV1gIH0pO1xuICAgICAgfVxuICAgIH1cbiAgICBwYXJ0cy5wdXNoKHsgdGV4dDogcmVxdWVzdC51c2VyTWVzc2FnZSB9KTtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICB1cmw6IGVuZHBvaW50LFxuICAgICAgbWV0aG9kOiBcIlBPU1RcIixcbiAgICAgIGhlYWRlcnM6IHsgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgc3lzdGVtX2luc3RydWN0aW9uOiB7IHBhcnRzOiBbeyB0ZXh0OiByZXF1ZXN0LnN5c3RlbVByb21wdCB9XSB9LFxuICAgICAgICBjb250ZW50czogW3sgcm9sZTogXCJ1c2VyXCIsIHBhcnRzIH1dLFxuICAgICAgICBnZW5lcmF0aW9uQ29uZmlnOiB7XG4gICAgICAgICAgdGVtcGVyYXR1cmU6IHJlcXVlc3QudGVtcGVyYXR1cmUsXG4gICAgICAgICAgbWF4T3V0cHV0VG9rZW5zOiByZXF1ZXN0Lm1heE91dHB1dFRva2VucyxcbiAgICAgICAgICB0aGlua2luZ0NvbmZpZzogeyB0aGlua2luZ0J1ZGdldDogMCB9XG4gICAgICAgIH1cbiAgICAgIH0pLFxuICAgICAgdGhyb3c6IGZhbHNlXG4gICAgfSk7XG5cbiAgICBpZiAocmVzcG9uc2Uuc3RhdHVzIDwgMjAwIHx8IHJlc3BvbnNlLnN0YXR1cyA+PSAzMDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcih0aGlzLmV4dHJhY3RFcnJvcihyZXNwb25zZSwgXCJHZW1pbmlcIikpO1xuICAgIH1cblxuICAgIGNvbnN0IGRhdGEgPSByZXNwb25zZS5qc29uO1xuICAgIGNvbnN0IHRleHQgPSAoZGF0YS5jYW5kaWRhdGVzPy5bMF0/LmNvbnRlbnQ/LnBhcnRzID8/IFtdKVxuICAgICAgLm1hcCgocGFydDogeyB0ZXh0Pzogc3RyaW5nIH0pID0+IHBhcnQudGV4dCA/PyBcIlwiKVxuICAgICAgLmpvaW4oXCJcIilcbiAgICAgIC50cmltKCk7XG5cbiAgICBpZiAoIXRleHQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlByb3ZpZGVyIHJldHVybmVkIGFuIGVtcHR5IHJlc3BvbnNlLlwiKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgdGV4dCxcbiAgICAgIGlucHV0VG9rZW5zOiBkYXRhLnVzYWdlTWV0YWRhdGE/LnByb21wdFRva2VuQ291bnQsXG4gICAgICBvdXRwdXRUb2tlbnM6IGRhdGEudXNhZ2VNZXRhZGF0YT8uY2FuZGlkYXRlc1Rva2VuQ291bnRcbiAgICB9O1xuICB9XG5cbiAgYXN5bmMgdXBsb2FkU291cmNlKCk6IFByb21pc2U8VXBsb2FkZWRGaWxlSW5mbz4ge1xuICAgIHRocm93IG5ldyBFcnJvcihcIlVzZSAnQWRkIFNvdXJjZScgZnJvbSB0aGUgbm90ZSB0byBhdHRhY2ggYSB2YXVsdCBmaWxlIGlubGluZS5cIik7XG4gIH1cblxuICBhc3luYyBsaXN0U291cmNlcygpOiBQcm9taXNlPFVwbG9hZGVkRmlsZUluZm9bXT4ge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIGFzeW5jIGRlbGV0ZVNvdXJjZSgpOiBQcm9taXNlPHZvaWQ+IHt9XG5cbiAgYXN5bmMgbGlzdE1vZGVscygpOiBQcm9taXNlPHN0cmluZ1tdPiB7XG4gICAgaWYgKCF0aGlzLmNvbmZpZy5hcGlLZXkudHJpbSgpKSByZXR1cm4gW107XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICAgIHVybDogYGh0dHBzOi8vZ2VuZXJhdGl2ZWxhbmd1YWdlLmdvb2dsZWFwaXMuY29tL3YxYmV0YS9tb2RlbHM/a2V5PSR7ZW5jb2RlVVJJQ29tcG9uZW50KHRoaXMuY29uZmlnLmFwaUtleSl9YCxcbiAgICAgICAgdGhyb3c6IGZhbHNlXG4gICAgICB9KTtcbiAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPCAyMDAgfHwgcmVzcG9uc2Uuc3RhdHVzID49IDMwMCkgcmV0dXJuIFtdO1xuICAgICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmpzb247XG4gICAgICByZXR1cm4gKGRhdGEubW9kZWxzID8/IFtdKVxuICAgICAgICAuZmlsdGVyKChtOiB7IHN1cHBvcnRlZEdlbmVyYXRpb25NZXRob2RzPzogc3RyaW5nW10gfSkgPT5cbiAgICAgICAgICBtLnN1cHBvcnRlZEdlbmVyYXRpb25NZXRob2RzPy5pbmNsdWRlcyhcImdlbmVyYXRlQ29udGVudFwiKSlcbiAgICAgICAgLm1hcCgobTogeyBuYW1lPzogc3RyaW5nIH0pID0+IChtLm5hbWUgPz8gXCJcIikucmVwbGFjZSgvXm1vZGVsc1xcLy8sIFwiXCIpKVxuICAgICAgICAuZmlsdGVyKEJvb2xlYW4pO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHZhbGlkYXRlKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGlmICghdGhpcy5jb25maWcuYXBpS2V5LnRyaW0oKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCByZXF1ZXN0VXJsKHtcbiAgICAgICAgdXJsOiBgaHR0cHM6Ly9nZW5lcmF0aXZlbGFuZ3VhZ2UuZ29vZ2xlYXBpcy5jb20vdjFiZXRhL21vZGVscz9rZXk9JHtlbmNvZGVVUklDb21wb25lbnQodGhpcy5jb25maWcuYXBpS2V5KX1gLFxuICAgICAgICB0aHJvdzogZmFsc2VcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLnN0YXR1cyA+PSAyMDAgJiYgcmVzcG9uc2Uuc3RhdHVzIDwgMzAwO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZW5zdXJlQ29uZmlndXJlZCgpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuY29uZmlnLmFwaUtleS50cmltKCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vIEdlbWluaSBBUEkga2V5IHNldC4gQ2hlY2sgcGx1Z2luIHNldHRpbmdzLlwiKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGV4dHJhY3RFcnJvcihyZXNwb25zZTogUmVxdWVzdFVybFJlc3BvbnNlLCBwcm92aWRlck5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAxIHx8IHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAzKSB7XG4gICAgICByZXR1cm4gYCR7cHJvdmlkZXJOYW1lfSBBUEkga2V5IHJlamVjdGVkLiBDaGVjayBzZXR0aW5ncy5gO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmpzb247XG4gICAgICBjb25zdCBtc2cgPSBkYXRhPy5lcnJvcj8ubWVzc2FnZSA/PyBgJHtwcm92aWRlck5hbWV9IHJlcXVlc3QgZmFpbGVkICgke3Jlc3BvbnNlLnN0YXR1c30pLmA7XG4gICAgICByZXR1cm4gcmVzcG9uc2Uuc3RhdHVzID09PSA0MjkgPyBgJHtwcm92aWRlck5hbWV9IHF1b3RhL3JhdGUgZXJyb3I6ICR7bXNnfWAgOiBtc2c7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHJldHVybiBhc0Vycm9yTWVzc2FnZShlcnJvcikgfHwgYCR7cHJvdmlkZXJOYW1lfSByZXF1ZXN0IGZhaWxlZCAoJHtyZXNwb25zZS5zdGF0dXN9KS5gO1xuICAgIH1cbiAgfVxufVxuIiwgImltcG9ydCB7IHJlcXVlc3RVcmwsIFJlcXVlc3RVcmxSZXNwb25zZSB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHtcbiAgR2VuZXJhdGlvblJlcXVlc3QsXG4gIEdlbmVyYXRpb25SZXNwb25zZSxcbiAgT2xsYW1hUHJvdmlkZXJDb25maWcsXG4gIFVwbG9hZGVkRmlsZUluZm9cbn0gZnJvbSBcIi4uL3R5cGVzXCI7XG5pbXBvcnQgeyB0cnVuY2F0ZVNvdXJjZVRleHQgfSBmcm9tIFwiLi4vc291cmNlVXRpbHNcIjtcbmltcG9ydCB7IEFJUHJvdmlkZXIgfSBmcm9tIFwiLi9iYXNlXCI7XG5cbmludGVyZmFjZSBPbGxhbWFUYWdzUmVzcG9uc2Uge1xuICBtb2RlbHM/OiBBcnJheTx7IG5hbWU/OiBzdHJpbmcgfT47XG59XG5cbmV4cG9ydCBjbGFzcyBPbGxhbWFQcm92aWRlciBpbXBsZW1lbnRzIEFJUHJvdmlkZXIge1xuICByZWFkb25seSBpZCA9IFwib2xsYW1hXCI7XG4gIHJlYWRvbmx5IG5hbWUgPSBcIk9sbGFtYVwiO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgY29uZmlnOiBPbGxhbWFQcm92aWRlckNvbmZpZykge31cblxuICBhc3luYyBnZW5lcmF0ZShyZXF1ZXN0OiBHZW5lcmF0aW9uUmVxdWVzdCk6IFByb21pc2U8R2VuZXJhdGlvblJlc3BvbnNlPiB7XG4gICAgY29uc3QgYmFzZVVybCA9IHRoaXMuY29uZmlnLmJhc2VVcmwucmVwbGFjZSgvXFwvJC8sIFwiXCIpO1xuICAgIGNvbnN0IG1vZGVsID0gcmVxdWVzdC5tb2RlbCB8fCB0aGlzLmNvbmZpZy5kZWZhdWx0TW9kZWw7XG4gICAgY29uc3Qgc291cmNlQmxvY2tzID0gKHJlcXVlc3QucmVzb2x2ZWRTb3VyY2VzID8/IFtdKVxuICAgICAgLmZpbHRlcigoc291cmNlKSA9PiBzb3VyY2UudGV4dENvbnRlbnQpXG4gICAgICAubWFwKChzb3VyY2UpID0+IGBbU09VUkNFOiAke3NvdXJjZS5yZWYubGFiZWx9XVxcbiR7dHJ1bmNhdGVTb3VyY2VUZXh0KHNvdXJjZS50ZXh0Q29udGVudCA/PyBcIlwiKX1cXG5bRU5EIFNPVVJDRV1gKTtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICB1cmw6IGAke2Jhc2VVcmx9L2FwaS9jaGF0YCxcbiAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICBoZWFkZXJzOiB7IFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIG1vZGVsLFxuICAgICAgICBzdHJlYW06IGZhbHNlLFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgdGVtcGVyYXR1cmU6IHJlcXVlc3QudGVtcGVyYXR1cmUsXG4gICAgICAgICAgbnVtX3ByZWRpY3Q6IHJlcXVlc3QubWF4T3V0cHV0VG9rZW5zXG4gICAgICAgIH0sXG4gICAgICAgIG1lc3NhZ2VzOiBbXG4gICAgICAgICAgeyByb2xlOiBcInN5c3RlbVwiLCBjb250ZW50OiByZXF1ZXN0LnN5c3RlbVByb21wdCB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHJvbGU6IFwidXNlclwiLFxuICAgICAgICAgICAgY29udGVudDogc291cmNlQmxvY2tzLmxlbmd0aFxuICAgICAgICAgICAgICA/IGAke3NvdXJjZUJsb2Nrcy5qb2luKFwiXFxuXFxuXCIpfVxcblxcbiR7cmVxdWVzdC51c2VyTWVzc2FnZX1gXG4gICAgICAgICAgICAgIDogcmVxdWVzdC51c2VyTWVzc2FnZVxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfSksXG4gICAgICB0aHJvdzogZmFsc2VcbiAgICB9KTtcblxuICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPCAyMDAgfHwgcmVzcG9uc2Uuc3RhdHVzID49IDMwMCkge1xuICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gNDA0KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgTW9kZWwgJyR7bW9kZWx9JyBub3QgZm91bmQgaW4gT2xsYW1hLiBDaGVjayBhdmFpbGFibGUgbW9kZWxzIGluIHNldHRpbmdzLmApO1xuICAgICAgfVxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBPbGxhbWEgbm90IHJlYWNoYWJsZSBhdCAke2Jhc2VVcmx9LiBJcyBpdCBydW5uaW5nP2ApO1xuICAgIH1cblxuICAgIGNvbnN0IGRhdGEgPSByZXNwb25zZS5qc29uO1xuICAgIGNvbnN0IHRleHQgPSBkYXRhLm1lc3NhZ2U/LmNvbnRlbnQ/LnRyaW0/LigpID8/IFwiXCI7XG4gICAgaWYgKCF0ZXh0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQcm92aWRlciByZXR1cm5lZCBhbiBlbXB0eSByZXNwb25zZS5cIik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHRleHQsXG4gICAgICBpbnB1dFRva2VuczogZGF0YS5wcm9tcHRfZXZhbF9jb3VudCxcbiAgICAgIG91dHB1dFRva2VuczogZGF0YS5ldmFsX2NvdW50XG4gICAgfTtcbiAgfVxuXG4gIGFzeW5jIHVwbG9hZFNvdXJjZSgpOiBQcm9taXNlPFVwbG9hZGVkRmlsZUluZm8+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJPbGxhbWEgZG9lcyBub3Qgc3VwcG9ydCBmaWxlIHVwbG9hZC4gQWRkIGEgdmF1bHRfcGF0aCBzb3VyY2UgaW5zdGVhZC5cIik7XG4gIH1cblxuICBhc3luYyBsaXN0U291cmNlcygpOiBQcm9taXNlPFVwbG9hZGVkRmlsZUluZm9bXT4ge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIGFzeW5jIGRlbGV0ZVNvdXJjZSgpOiBQcm9taXNlPHZvaWQ+IHt9XG5cbiAgYXN5bmMgdmFsaWRhdGUoKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHRhZ3MgPSBhd2FpdCB0aGlzLmZldGNoVGFncygpO1xuICAgICAgcmV0dXJuIEJvb2xlYW4odGFncy5tb2RlbHM/Lmxlbmd0aCk7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgbGlzdE1vZGVscygpOiBQcm9taXNlPHN0cmluZ1tdPiB7XG4gICAgY29uc3QgdGFncyA9IGF3YWl0IHRoaXMuZmV0Y2hUYWdzKCk7XG4gICAgcmV0dXJuICh0YWdzLm1vZGVscyA/PyBbXSkubWFwKChtb2RlbCkgPT4gbW9kZWwubmFtZSA/PyBcIlwiKS5maWx0ZXIoQm9vbGVhbik7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGZldGNoVGFncygpOiBQcm9taXNlPE9sbGFtYVRhZ3NSZXNwb25zZT4ge1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICB1cmw6IGAke3RoaXMuY29uZmlnLmJhc2VVcmwucmVwbGFjZSgvXFwvJC8sIFwiXCIpfS9hcGkvdGFnc2AsXG4gICAgICB0aHJvdzogZmFsc2VcbiAgICB9KTtcbiAgICBpZiAocmVzcG9uc2Uuc3RhdHVzIDwgMjAwIHx8IHJlc3BvbnNlLnN0YXR1cyA+PSAzMDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgT2xsYW1hIG5vdCByZWFjaGFibGUgYXQgJHt0aGlzLmNvbmZpZy5iYXNlVXJsfS4gSXMgaXQgcnVubmluZz9gKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3BvbnNlLmpzb24gYXMgT2xsYW1hVGFnc1Jlc3BvbnNlO1xuICB9XG59XG4iLCAiaW1wb3J0IHsgQXBwLCBUQWJzdHJhY3RGaWxlLCBURmlsZSwgbm9ybWFsaXplUGF0aCB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHsgUHJvdmlkZXJJRCwgUmVzb2x2ZWRTb3VyY2UsIFNvdXJjZVJlZiB9IGZyb20gXCIuL3R5cGVzXCI7XG5cbmNvbnN0IFRFWFRfRVhURU5TSU9OUyA9IG5ldyBTZXQoW1widHh0XCIsIFwibWRcIiwgXCJtYXJrZG93blwiLCBcImpzb25cIiwgXCJ5YW1sXCIsIFwieW1sXCIsIFwiY3N2XCJdKTtcblxuZnVuY3Rpb24gZ2V0VmF1bHRGaWxlKGFwcDogQXBwLCB2YXVsdFBhdGg6IHN0cmluZyk6IFRGaWxlIHtcbiAgY29uc3Qgbm9ybWFsaXplZCA9IG5vcm1hbGl6ZVBhdGgodmF1bHRQYXRoKTtcbiAgY29uc3QgZmlsZSA9IGFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgobm9ybWFsaXplZCk7XG4gIGlmICghKGZpbGUgaW5zdGFuY2VvZiBURmlsZSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFNvdXJjZSBmaWxlIG5vdCBmb3VuZCBpbiB2YXVsdDogJHt2YXVsdFBhdGh9YCk7XG4gIH1cbiAgcmV0dXJuIGZpbGU7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWFkVmF1bHRUZXh0U291cmNlKGFwcDogQXBwLCB2YXVsdFBhdGg6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IGZpbGUgPSBnZXRWYXVsdEZpbGUoYXBwLCB2YXVsdFBhdGgpO1xuICBjb25zdCBleHRlbnNpb24gPSBmaWxlLmV4dGVuc2lvbi50b0xvd2VyQ2FzZSgpO1xuICBpZiAoIVRFWFRfRVhURU5TSU9OUy5oYXMoZXh0ZW5zaW9uKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgVGV4dCBleHRyYWN0aW9uIGlzIG9ubHkgc3VwcG9ydGVkIGZvciB0ZXh0IGZpbGVzLiBBZGQgYSAudHh0IGNvbXBhbmlvbiBmb3IgJyR7dmF1bHRQYXRofScuYCk7XG4gIH1cbiAgcmV0dXJuIGFwcC52YXVsdC5jYWNoZWRSZWFkKGZpbGUpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVhZFZhdWx0QmluYXJ5U291cmNlKGFwcDogQXBwLCB2YXVsdFBhdGg6IHN0cmluZyk6IFByb21pc2U8QXJyYXlCdWZmZXI+IHtcbiAgY29uc3QgZmlsZSA9IGdldFZhdWx0RmlsZShhcHAsIHZhdWx0UGF0aCk7XG4gIHJldHVybiBhcHAudmF1bHQucmVhZEJpbmFyeShmaWxlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFycmF5QnVmZmVyVG9CYXNlNjQoYnVmZmVyOiBBcnJheUJ1ZmZlcik6IHN0cmluZyB7XG4gIGxldCBiaW5hcnkgPSBcIlwiO1xuICBjb25zdCBieXRlcyA9IG5ldyBVaW50OEFycmF5KGJ1ZmZlcik7XG4gIGNvbnN0IGNodW5rU2l6ZSA9IDB4ODAwMDtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBieXRlcy5sZW5ndGg7IGkgKz0gY2h1bmtTaXplKSB7XG4gICAgY29uc3QgY2h1bmsgPSBieXRlcy5zdWJhcnJheShpLCBpICsgY2h1bmtTaXplKTtcbiAgICBiaW5hcnkgKz0gU3RyaW5nLmZyb21DaGFyQ29kZSguLi5jaHVuayk7XG4gIH1cbiAgcmV0dXJuIGJ0b2EoYmluYXJ5KTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlc29sdmVTb3VyY2VzRm9yUmVxdWVzdChcbiAgYXBwOiBBcHAsXG4gIHNvdXJjZXM6IFNvdXJjZVJlZltdLFxuICBwcm92aWRlcklkOiBQcm92aWRlcklEXG4pOiBQcm9taXNlPFJlc29sdmVkU291cmNlW10+IHtcbiAgY29uc3QgcmVzb2x2ZWQ6IFJlc29sdmVkU291cmNlW10gPSBbXTtcbiAgZm9yIChjb25zdCByZWYgb2Ygc291cmNlcykge1xuICAgIGlmIChwcm92aWRlcklkID09PSBcImFudGhyb3BpY1wiIHx8IChwcm92aWRlcklkID09PSBcImdlbWluaVwiICYmIHJlZi5taW1lX3R5cGUgPT09IFwiYXBwbGljYXRpb24vcGRmXCIpKSB7XG4gICAgICBjb25zdCBidWZmZXIgPSBhd2FpdCByZWFkVmF1bHRCaW5hcnlTb3VyY2UoYXBwLCByZWYudmF1bHRfcGF0aCk7XG4gICAgICByZXNvbHZlZC5wdXNoKHsgcmVmLCBiYXNlNjREYXRhOiBhcnJheUJ1ZmZlclRvQmFzZTY0KGJ1ZmZlcikgfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgY29uc3QgdGV4dCA9IGF3YWl0IHJlYWRWYXVsdFRleHRTb3VyY2UoYXBwLCByZWYudmF1bHRfcGF0aCk7XG4gICAgcmVzb2x2ZWQucHVzaCh7IHJlZiwgdGV4dENvbnRlbnQ6IHRleHQgfSk7XG4gIH1cbiAgcmV0dXJuIHJlc29sdmVkO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdHJ1bmNhdGVTb3VyY2VUZXh0KHRleHQ6IHN0cmluZywgbWF4Q2hhcnMgPSA0MDAwKTogc3RyaW5nIHtcbiAgcmV0dXJuIHRleHQubGVuZ3RoIDw9IG1heENoYXJzID8gdGV4dCA6IHRleHQuc2xpY2UoMCwgbWF4Q2hhcnMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVzY3JpYmVTb3VyY2VSZWYocmVmOiBTb3VyY2VSZWYpOiBzdHJpbmcge1xuICByZXR1cm4gcmVmLnZhdWx0X3BhdGg7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaXN0VmF1bHRDYW5kaWRhdGVGaWxlcyhhcHA6IEFwcCk6IFRGaWxlW10ge1xuICByZXR1cm4gYXBwLnZhdWx0XG4gICAgLmdldEZpbGVzKClcbiAgICAuZmlsdGVyKChmaWxlKSA9PiBbXCJwZGZcIiwgXCJ0eHRcIiwgXCJtZFwiLCBcIm1hcmtkb3duXCJdLmluY2x1ZGVzKGZpbGUuZXh0ZW5zaW9uLnRvTG93ZXJDYXNlKCkpKVxuICAgIC5zb3J0KChhLCBiKSA9PiBhLnBhdGgubG9jYWxlQ29tcGFyZShiLnBhdGgpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzVEZpbGUoZmlsZTogVEFic3RyYWN0RmlsZSB8IG51bGwpOiBmaWxlIGlzIFRGaWxlIHtcbiAgcmV0dXJuIEJvb2xlYW4oZmlsZSkgJiYgZmlsZSBpbnN0YW5jZW9mIFRGaWxlO1xufVxuIiwgImltcG9ydCB7IHJlcXVlc3RVcmwsIFJlcXVlc3RVcmxSZXNwb25zZSB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHtcbiAgR2VuZXJhdGlvblJlcXVlc3QsXG4gIEdlbmVyYXRpb25SZXNwb25zZSxcbiAgT3BlbkFJUHJvdmlkZXJDb25maWcsXG4gIFVwbG9hZGVkRmlsZUluZm9cbn0gZnJvbSBcIi4uL3R5cGVzXCI7XG5pbXBvcnQgeyB0cnVuY2F0ZVNvdXJjZVRleHQgfSBmcm9tIFwiLi4vc291cmNlVXRpbHNcIjtcbmltcG9ydCB7IEFJUHJvdmlkZXIgfSBmcm9tIFwiLi9iYXNlXCI7XG5cbmV4cG9ydCBjbGFzcyBPcGVuQUlQcm92aWRlciBpbXBsZW1lbnRzIEFJUHJvdmlkZXIge1xuICByZWFkb25seSBpZCA9IFwib3BlbmFpXCI7XG4gIHJlYWRvbmx5IG5hbWUgPSBcIk9wZW5BSVwiO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgY29uZmlnOiBPcGVuQUlQcm92aWRlckNvbmZpZykge31cblxuICBhc3luYyBnZW5lcmF0ZShyZXF1ZXN0OiBHZW5lcmF0aW9uUmVxdWVzdCk6IFByb21pc2U8R2VuZXJhdGlvblJlc3BvbnNlPiB7XG4gICAgdGhpcy5lbnN1cmVDb25maWd1cmVkKCk7XG4gICAgY29uc3QgYmFzZVVybCA9IHRoaXMuY29uZmlnLmJhc2VVcmwucmVwbGFjZSgvXFwvJC8sIFwiXCIpO1xuICAgIGNvbnN0IG1vZGVsID0gcmVxdWVzdC5tb2RlbCB8fCB0aGlzLmNvbmZpZy5kZWZhdWx0TW9kZWw7XG4gICAgY29uc3Qgc291cmNlQmxvY2tzID0gKHJlcXVlc3QucmVzb2x2ZWRTb3VyY2VzID8/IFtdKVxuICAgICAgLmZpbHRlcigoc291cmNlKSA9PiBzb3VyY2UudGV4dENvbnRlbnQpXG4gICAgICAubWFwKChzb3VyY2UpID0+IGBbU09VUkNFOiAke3NvdXJjZS5yZWYubGFiZWx9XVxcbiR7dHJ1bmNhdGVTb3VyY2VUZXh0KHNvdXJjZS50ZXh0Q29udGVudCA/PyBcIlwiKX1cXG5bRU5EIFNPVVJDRV1gKTtcblxuICAgIGNvbnN0IGJvZHk6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge1xuICAgICAgbW9kZWwsXG4gICAgICBtYXhfdG9rZW5zOiByZXF1ZXN0Lm1heE91dHB1dFRva2VucyxcbiAgICAgIG1lc3NhZ2VzOiBbXG4gICAgICAgIHsgcm9sZTogXCJzeXN0ZW1cIiwgY29udGVudDogcmVxdWVzdC5zeXN0ZW1Qcm9tcHQgfSxcbiAgICAgICAge1xuICAgICAgICAgIHJvbGU6IFwidXNlclwiLFxuICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdHlwZTogXCJ0ZXh0XCIsXG4gICAgICAgICAgICAgIHRleHQ6IHNvdXJjZUJsb2Nrcy5sZW5ndGhcbiAgICAgICAgICAgICAgICA/IGAke3NvdXJjZUJsb2Nrcy5qb2luKFwiXFxuXFxuXCIpfVxcblxcbiR7cmVxdWVzdC51c2VyTWVzc2FnZX1gXG4gICAgICAgICAgICAgICAgOiByZXF1ZXN0LnVzZXJNZXNzYWdlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICBdXG4gICAgfTtcblxuICAgIGlmICghbW9kZWwuc3RhcnRzV2l0aChcImdwdC01XCIpKSB7XG4gICAgICBib2R5LnRlbXBlcmF0dXJlID0gcmVxdWVzdC50ZW1wZXJhdHVyZTtcbiAgICB9XG5cbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3RVcmwoe1xuICAgICAgdXJsOiBgJHtiYXNlVXJsfS9jaGF0L2NvbXBsZXRpb25zYCxcbiAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgICBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7dGhpcy5jb25maWcuYXBpS2V5fWBcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShib2R5KSxcbiAgICAgIHRocm93OiBmYWxzZVxuICAgIH0pO1xuXG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA8IDIwMCB8fCByZXNwb25zZS5zdGF0dXMgPj0gMzAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IodGhpcy5leHRyYWN0RXJyb3IocmVzcG9uc2UpKTtcbiAgICB9XG5cbiAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuanNvbjtcbiAgICBjb25zdCB0ZXh0ID0gZGF0YS5jaG9pY2VzPy5bMF0/Lm1lc3NhZ2U/LmNvbnRlbnQ/LnRyaW0/LigpID8/IFwiXCI7XG4gICAgaWYgKCF0ZXh0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQcm92aWRlciByZXR1cm5lZCBhbiBlbXB0eSByZXNwb25zZS5cIik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHRleHQsXG4gICAgICBpbnB1dFRva2VuczogZGF0YS51c2FnZT8ucHJvbXB0X3Rva2VucyxcbiAgICAgIG91dHB1dFRva2VuczogZGF0YS51c2FnZT8uY29tcGxldGlvbl90b2tlbnNcbiAgICB9O1xuICB9XG5cbiAgYXN5bmMgdXBsb2FkU291cmNlKCk6IFByb21pc2U8VXBsb2FkZWRGaWxlSW5mbz4ge1xuICAgIHRocm93IG5ldyBFcnJvcihcIlRoaXMgcHJvdmlkZXIgZG9lcyBub3Qgc3VwcG9ydCBmaWxlIHVwbG9hZC4gVXNlIHZhdWx0X3BhdGggaW5zdGVhZC5cIik7XG4gIH1cblxuICBhc3luYyBsaXN0U291cmNlcygpOiBQcm9taXNlPFVwbG9hZGVkRmlsZUluZm9bXT4ge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIGFzeW5jIGRlbGV0ZVNvdXJjZSgpOiBQcm9taXNlPHZvaWQ+IHt9XG5cbiAgYXN5bmMgbGlzdE1vZGVscygpOiBQcm9taXNlPHN0cmluZ1tdPiB7XG4gICAgaWYgKCF0aGlzLmNvbmZpZy5hcGlLZXkudHJpbSgpKSByZXR1cm4gW107XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICAgIHVybDogYCR7dGhpcy5jb25maWcuYmFzZVVybC5yZXBsYWNlKC9cXC8kLywgXCJcIil9L21vZGVsc2AsXG4gICAgICAgIGhlYWRlcnM6IHsgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke3RoaXMuY29uZmlnLmFwaUtleX1gIH0sXG4gICAgICAgIHRocm93OiBmYWxzZVxuICAgICAgfSk7XG4gICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzIDwgMjAwIHx8IHJlc3BvbnNlLnN0YXR1cyA+PSAzMDApIHJldHVybiBbXTtcbiAgICAgIGNvbnN0IGRhdGEgPSByZXNwb25zZS5qc29uO1xuICAgICAgY29uc3QgRVhDTFVERSA9IFtcImVtYmVkZGluZ1wiLCBcIndoaXNwZXJcIiwgXCJ0dHNcIiwgXCJkYWxsLWVcIiwgXCJtb2RlcmF0aW9uXCIsIFwidGV4dC1zZWFyY2hcIiwgXCJ0ZXh0LXNpbWlsYXJpdHlcIl07XG4gICAgICByZXR1cm4gKGRhdGEuZGF0YSA/PyBbXSlcbiAgICAgICAgLm1hcCgobTogeyBpZD86IHN0cmluZyB9KSA9PiBtLmlkID8/IFwiXCIpXG4gICAgICAgIC5maWx0ZXIoKGlkOiBzdHJpbmcpID0+IGlkICYmICFFWENMVURFLnNvbWUoKGV4KSA9PiBpZC5pbmNsdWRlcyhleCkpKVxuICAgICAgICAuc29ydCgpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHZhbGlkYXRlKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGlmICghdGhpcy5jb25maWcuYXBpS2V5LnRyaW0oKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCByZXF1ZXN0VXJsKHtcbiAgICAgICAgdXJsOiBgJHt0aGlzLmNvbmZpZy5iYXNlVXJsLnJlcGxhY2UoL1xcLyQvLCBcIlwiKX0vbW9kZWxzYCxcbiAgICAgICAgaGVhZGVyczogeyBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7dGhpcy5jb25maWcuYXBpS2V5fWAgfSxcbiAgICAgICAgdGhyb3c6IGZhbHNlXG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXNwb25zZS5zdGF0dXMgPj0gMjAwICYmIHJlc3BvbnNlLnN0YXR1cyA8IDMwMDtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGVuc3VyZUNvbmZpZ3VyZWQoKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmNvbmZpZy5hcGlLZXkudHJpbSgpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJObyBPcGVuQUkgQVBJIGtleSBzZXQuIENoZWNrIHBsdWdpbiBzZXR0aW5ncy5cIik7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBleHRyYWN0RXJyb3IocmVzcG9uc2U6IFJlcXVlc3RVcmxSZXNwb25zZSk6IHN0cmluZyB7XG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAxIHx8IHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAzKSB7XG4gICAgICByZXR1cm4gXCJPcGVuQUkgQVBJIGtleSByZWplY3RlZC4gQ2hlY2sgc2V0dGluZ3MuXCI7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuanNvbjtcbiAgICAgIGNvbnN0IG1zZyA9IGRhdGE/LmVycm9yPy5tZXNzYWdlID8/IGBPcGVuQUkgcmVxdWVzdCBmYWlsZWQgKCR7cmVzcG9uc2Uuc3RhdHVzfSkuYDtcbiAgICAgIHJldHVybiByZXNwb25zZS5zdGF0dXMgPT09IDQyOSA/IGBPcGVuQUkgcXVvdGEvcmF0ZSBlcnJvcjogJHttc2d9YCA6IG1zZztcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBgT3BlbkFJIHJlcXVlc3QgZmFpbGVkICgke3Jlc3BvbnNlLnN0YXR1c30pLmA7XG4gICAgfVxuICB9XG59XG4iLCAiaW1wb3J0IHsgcmVxdWVzdFVybCwgUmVxdWVzdFVybFJlc3BvbnNlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQge1xuICBHZW5lcmF0aW9uUmVxdWVzdCxcbiAgR2VuZXJhdGlvblJlc3BvbnNlLFxuICBPcGVuUm91dGVyUHJvdmlkZXJDb25maWcsXG4gIFVwbG9hZGVkRmlsZUluZm9cbn0gZnJvbSBcIi4uL3R5cGVzXCI7XG5pbXBvcnQgeyB0cnVuY2F0ZVNvdXJjZVRleHQgfSBmcm9tIFwiLi4vc291cmNlVXRpbHNcIjtcbmltcG9ydCB7IEFJUHJvdmlkZXIgfSBmcm9tIFwiLi9iYXNlXCI7XG5cbmNvbnN0IEJBU0VfVVJMID0gXCJodHRwczovL29wZW5yb3V0ZXIuYWkvYXBpL3YxXCI7XG5cbmZ1bmN0aW9uIGFzRXJyb3JNZXNzYWdlKGVycm9yOiB1bmtub3duKTogc3RyaW5nIHtcbiAgcmV0dXJuIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKTtcbn1cblxuZXhwb3J0IGNsYXNzIE9wZW5Sb3V0ZXJQcm92aWRlciBpbXBsZW1lbnRzIEFJUHJvdmlkZXIge1xuICByZWFkb25seSBpZCA9IFwib3BlbnJvdXRlclwiO1xuICByZWFkb25seSBuYW1lID0gXCJPcGVuUm91dGVyXCI7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBjb25maWc6IE9wZW5Sb3V0ZXJQcm92aWRlckNvbmZpZykge31cblxuICBhc3luYyBnZW5lcmF0ZShyZXF1ZXN0OiBHZW5lcmF0aW9uUmVxdWVzdCk6IFByb21pc2U8R2VuZXJhdGlvblJlc3BvbnNlPiB7XG4gICAgdGhpcy5lbnN1cmVDb25maWd1cmVkKCk7XG4gICAgY29uc3QgbW9kZWwgPSByZXF1ZXN0Lm1vZGVsIHx8IHRoaXMuY29uZmlnLmRlZmF1bHRNb2RlbDtcbiAgICBjb25zdCBzb3VyY2VCbG9ja3MgPSAocmVxdWVzdC5yZXNvbHZlZFNvdXJjZXMgPz8gW10pXG4gICAgICAuZmlsdGVyKChzb3VyY2UpID0+IHNvdXJjZS50ZXh0Q29udGVudClcbiAgICAgIC5tYXAoKHNvdXJjZSkgPT4gYFtTT1VSQ0U6ICR7c291cmNlLnJlZi5sYWJlbH1dXFxuJHt0cnVuY2F0ZVNvdXJjZVRleHQoc291cmNlLnRleHRDb250ZW50ID8/IFwiXCIpfVxcbltFTkQgU09VUkNFXWApO1xuXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCByZXF1ZXN0VXJsKHtcbiAgICAgIHVybDogYCR7QkFTRV9VUkx9L2NoYXQvY29tcGxldGlvbnNgLFxuICAgICAgbWV0aG9kOiBcIlBPU1RcIixcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgIFwiQXV0aG9yaXphdGlvblwiOiBgQmVhcmVyICR7dGhpcy5jb25maWcuYXBpS2V5fWAsXG4gICAgICAgIFwiSFRUUC1SZWZlcmVyXCI6IFwib2JzaWRpYW4tc3lieWxcIixcbiAgICAgICAgXCJYLVRpdGxlXCI6IFwiU3lieWxcIlxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgbW9kZWwsXG4gICAgICAgIG1heF90b2tlbnM6IHJlcXVlc3QubWF4T3V0cHV0VG9rZW5zLFxuICAgICAgICB0ZW1wZXJhdHVyZTogcmVxdWVzdC50ZW1wZXJhdHVyZSxcbiAgICAgICAgbWVzc2FnZXM6IFtcbiAgICAgICAgICB7IHJvbGU6IFwic3lzdGVtXCIsIGNvbnRlbnQ6IHJlcXVlc3Quc3lzdGVtUHJvbXB0IH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgcm9sZTogXCJ1c2VyXCIsXG4gICAgICAgICAgICBjb250ZW50OiBzb3VyY2VCbG9ja3MubGVuZ3RoXG4gICAgICAgICAgICAgID8gYCR7c291cmNlQmxvY2tzLmpvaW4oXCJcXG5cXG5cIil9XFxuXFxuJHtyZXF1ZXN0LnVzZXJNZXNzYWdlfWBcbiAgICAgICAgICAgICAgOiByZXF1ZXN0LnVzZXJNZXNzYWdlXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9KSxcbiAgICAgIHRocm93OiBmYWxzZVxuICAgIH0pO1xuXG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA8IDIwMCB8fCByZXNwb25zZS5zdGF0dXMgPj0gMzAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IodGhpcy5leHRyYWN0RXJyb3IocmVzcG9uc2UpKTtcbiAgICB9XG5cbiAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuanNvbjtcbiAgICBjb25zdCB0ZXh0ID0gZGF0YS5jaG9pY2VzPy5bMF0/Lm1lc3NhZ2U/LmNvbnRlbnQ/LnRyaW0/LigpID8/IFwiXCI7XG4gICAgaWYgKCF0ZXh0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQcm92aWRlciByZXR1cm5lZCBhbiBlbXB0eSByZXNwb25zZS5cIik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHRleHQsXG4gICAgICBpbnB1dFRva2VuczogZGF0YS51c2FnZT8ucHJvbXB0X3Rva2VucyxcbiAgICAgIG91dHB1dFRva2VuczogZGF0YS51c2FnZT8uY29tcGxldGlvbl90b2tlbnNcbiAgICB9O1xuICB9XG5cbiAgYXN5bmMgdXBsb2FkU291cmNlKCk6IFByb21pc2U8VXBsb2FkZWRGaWxlSW5mbz4ge1xuICAgIHRocm93IG5ldyBFcnJvcihcIk9wZW5Sb3V0ZXIgZG9lcyBub3Qgc3VwcG9ydCBmaWxlIHVwbG9hZC4gVXNlIHZhdWx0X3BhdGggaW5zdGVhZC5cIik7XG4gIH1cblxuICBhc3luYyBsaXN0U291cmNlcygpOiBQcm9taXNlPFVwbG9hZGVkRmlsZUluZm9bXT4ge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIGFzeW5jIGRlbGV0ZVNvdXJjZSgpOiBQcm9taXNlPHZvaWQ+IHt9XG5cbiAgYXN5bmMgbGlzdE1vZGVscygpOiBQcm9taXNlPHN0cmluZ1tdPiB7XG4gICAgaWYgKCF0aGlzLmNvbmZpZy5hcGlLZXkudHJpbSgpKSByZXR1cm4gW107XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICAgIHVybDogYCR7QkFTRV9VUkx9L21vZGVsc2AsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICBcIkF1dGhvcml6YXRpb25cIjogYEJlYXJlciAke3RoaXMuY29uZmlnLmFwaUtleX1gXG4gICAgICAgIH0sXG4gICAgICAgIHRocm93OiBmYWxzZVxuICAgICAgfSk7XG4gICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzIDwgMjAwIHx8IHJlc3BvbnNlLnN0YXR1cyA+PSAzMDApIHJldHVybiBbXTtcbiAgICAgIGNvbnN0IGRhdGEgPSByZXNwb25zZS5qc29uO1xuICAgICAgcmV0dXJuIChkYXRhLmRhdGEgPz8gW10pXG4gICAgICAgIC5maWx0ZXIoKG06IHsgYXJjaGl0ZWN0dXJlPzogeyBtb2RhbGl0eT86IHN0cmluZyB9IH0pID0+XG4gICAgICAgICAgbS5hcmNoaXRlY3R1cmU/Lm1vZGFsaXR5Py5lbmRzV2l0aChcIi0+dGV4dFwiKSlcbiAgICAgICAgLm1hcCgobTogeyBpZD86IHN0cmluZyB9KSA9PiBtLmlkID8/IFwiXCIpXG4gICAgICAgIC5maWx0ZXIoQm9vbGVhbilcbiAgICAgICAgLnNvcnQoKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gIH1cblxuICBhc3luYyB2YWxpZGF0ZSgpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBpZiAoIXRoaXMuY29uZmlnLmFwaUtleS50cmltKCkpIHJldHVybiBmYWxzZTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCByZXF1ZXN0VXJsKHtcbiAgICAgICAgdXJsOiBgJHtCQVNFX1VSTH0vbW9kZWxzYCxcbiAgICAgICAgaGVhZGVyczogeyBcIkF1dGhvcml6YXRpb25cIjogYEJlYXJlciAke3RoaXMuY29uZmlnLmFwaUtleX1gIH0sXG4gICAgICAgIHRocm93OiBmYWxzZVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVzcG9uc2Uuc3RhdHVzID49IDIwMCAmJiByZXNwb25zZS5zdGF0dXMgPCAzMDA7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVDb25maWd1cmVkKCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5jb25maWcuYXBpS2V5LnRyaW0oKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm8gT3BlblJvdXRlciBBUEkga2V5IHNldC4gQ2hlY2sgcGx1Z2luIHNldHRpbmdzLlwiKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGV4dHJhY3RFcnJvcihyZXNwb25zZTogUmVxdWVzdFVybFJlc3BvbnNlKTogc3RyaW5nIHtcbiAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0MDEgfHwgcmVzcG9uc2Uuc3RhdHVzID09PSA0MDMpIHtcbiAgICAgIHJldHVybiBcIk9wZW5Sb3V0ZXIgQVBJIGtleSByZWplY3RlZC4gQ2hlY2sgc2V0dGluZ3MuXCI7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuanNvbjtcbiAgICAgIGNvbnN0IG1zZyA9IGRhdGE/LmVycm9yPy5tZXNzYWdlID8/IGBPcGVuUm91dGVyIHJlcXVlc3QgZmFpbGVkICgke3Jlc3BvbnNlLnN0YXR1c30pLmA7XG4gICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0MjkpIHtcbiAgICAgICAgaWYgKG1zZyA9PT0gXCJQcm92aWRlciByZXR1cm5lZCBlcnJvclwiKSB7XG4gICAgICAgICAgcmV0dXJuIFwiT3BlblJvdXRlcjogZnJlZSBtb2RlbCBlbmRwb2ludCBhdCBjYXBhY2l0eS4gUmV0cnkgaW4gYSBtb21lbnQgb3IgcGljayBhIGRpZmZlcmVudCBtb2RlbC5cIjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYE9wZW5Sb3V0ZXIgcmF0ZSBsaW1pdDogJHttc2d9YDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBtc2c7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHJldHVybiBhc0Vycm9yTWVzc2FnZShlcnJvcikgfHwgYE9wZW5Sb3V0ZXIgcmVxdWVzdCBmYWlsZWQgKCR7cmVzcG9uc2Uuc3RhdHVzfSkuYDtcbiAgICB9XG4gIH1cbn1cbiIsICJpbXBvcnQgeyBQcm92aWRlcklELCBTeWJ5bFNldHRpbmdzIH0gZnJvbSBcIi4uL3R5cGVzXCI7XG5pbXBvcnQgeyBBSVByb3ZpZGVyIH0gZnJvbSBcIi4vYmFzZVwiO1xuaW1wb3J0IHsgQW50aHJvcGljUHJvdmlkZXIgfSBmcm9tIFwiLi9hbnRocm9waWNcIjtcbmltcG9ydCB7IEdlbWluaVByb3ZpZGVyIH0gZnJvbSBcIi4vZ2VtaW5pXCI7XG5pbXBvcnQgeyBPbGxhbWFQcm92aWRlciB9IGZyb20gXCIuL29sbGFtYVwiO1xuaW1wb3J0IHsgT3BlbkFJUHJvdmlkZXIgfSBmcm9tIFwiLi9vcGVuYWlcIjtcbmltcG9ydCB7IE9wZW5Sb3V0ZXJQcm92aWRlciB9IGZyb20gXCIuL29wZW5yb3V0ZXJcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldFByb3ZpZGVyKHNldHRpbmdzOiBTeWJ5bFNldHRpbmdzLCBvdmVycmlkZUlkPzogUHJvdmlkZXJJRCk6IEFJUHJvdmlkZXIge1xuICBjb25zdCBpZCA9IG92ZXJyaWRlSWQgPz8gc2V0dGluZ3MuYWN0aXZlUHJvdmlkZXI7XG4gIHN3aXRjaCAoaWQpIHtcbiAgICBjYXNlIFwiZ2VtaW5pXCI6XG4gICAgICByZXR1cm4gbmV3IEdlbWluaVByb3ZpZGVyKHNldHRpbmdzLnByb3ZpZGVycy5nZW1pbmkpO1xuICAgIGNhc2UgXCJvcGVuYWlcIjpcbiAgICAgIHJldHVybiBuZXcgT3BlbkFJUHJvdmlkZXIoc2V0dGluZ3MucHJvdmlkZXJzLm9wZW5haSk7XG4gICAgY2FzZSBcImFudGhyb3BpY1wiOlxuICAgICAgcmV0dXJuIG5ldyBBbnRocm9waWNQcm92aWRlcihzZXR0aW5ncy5wcm92aWRlcnMuYW50aHJvcGljKTtcbiAgICBjYXNlIFwib2xsYW1hXCI6XG4gICAgICByZXR1cm4gbmV3IE9sbGFtYVByb3ZpZGVyKHNldHRpbmdzLnByb3ZpZGVycy5vbGxhbWEpO1xuICAgIGNhc2UgXCJvcGVucm91dGVyXCI6XG4gICAgICByZXR1cm4gbmV3IE9wZW5Sb3V0ZXJQcm92aWRlcihzZXR0aW5ncy5wcm92aWRlcnMub3BlbnJvdXRlcik7XG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBwcm92aWRlcjogJHtpZH1gKTtcbiAgfVxufVxuIiwgImltcG9ydCB7IE5vdGljZSwgVEZpbGUsIG5vcm1hbGl6ZVBhdGggfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB0eXBlIFN5YnlsUGx1Z2luIGZyb20gXCIuL21haW5cIjtcbmltcG9ydCB7IGdldFNlbGVjdGlvbiwgaW5zZXJ0QmVsb3dTZWxlY3Rpb24sIGlzSW5zaWRlQ29kZUJsb2NrIH0gZnJvbSBcIi4vZWRpdG9yXCI7XG5pbXBvcnQgeyByZW1vdmVTb3VyY2VSZWYsIHVwc2VydFNvdXJjZVJlZiwgd3JpdGVGcm9udE1hdHRlcktleSB9IGZyb20gXCIuL2Zyb250bWF0dGVyXCI7XG5pbXBvcnQge1xuICBmb3JtYXRBZHZlbnR1cmVTZWVkLFxuICBmb3JtYXRBc2tPcmFjbGUsXG4gIGZvcm1hdENoYXJhY3RlcixcbiAgZm9ybWF0RGVjbGFyZUFjdGlvbixcbiAgZm9ybWF0RXhwYW5kU2NlbmUsXG4gIGZvcm1hdEludGVycHJldE9yYWNsZSxcbiAgZm9ybWF0U3RhcnRTY2VuZSxcbiAgZm9ybWF0U3VnZ2VzdENvbnNlcXVlbmNlLFxuICBMb25lbG9nRm9ybWF0T3B0aW9uc1xufSBmcm9tIFwiLi9sb25lbG9nL2Zvcm1hdHRlclwiO1xuaW1wb3J0IHsgcGFyc2VMb25lbG9nQ29udGV4dCwgc2VyaWFsaXplQ29udGV4dCB9IGZyb20gXCIuL2xvbmVsb2cvcGFyc2VyXCI7XG5pbXBvcnQgeyBNYW5hZ2VTb3VyY2VzTW9kYWwsIG9wZW5JbnB1dE1vZGFsLCBwaWNrTG9jYWxGaWxlLCBwaWNrU291cmNlT3JpZ2luLCBwaWNrU291cmNlUmVmLCBwaWNrVmF1bHRGaWxlIH0gZnJvbSBcIi4vbW9kYWxzXCI7XG5pbXBvcnQgeyByZXNvbHZlU291cmNlc0ZvclJlcXVlc3QgfSBmcm9tIFwiLi9zb3VyY2VVdGlsc1wiO1xuaW1wb3J0IHsgTm90ZUZyb250TWF0dGVyLCBTb3VyY2VSZWYsIFN5YnlsU2V0dGluZ3MgfSBmcm9tIFwiLi90eXBlc1wiO1xuXG5mdW5jdGlvbiBpc0xvbmVsb2dBY3RpdmUoc2V0dGluZ3M6IFN5YnlsU2V0dGluZ3MsIGZtOiBOb3RlRnJvbnRNYXR0ZXIpOiBib29sZWFuIHtcbiAgcmV0dXJuIGZtLmxvbmVsb2cgPz8gc2V0dGluZ3MubG9uZWxvZ01vZGU7XG59XG5cbmZ1bmN0aW9uIGxvbmVsb2dPcHRzKHNldHRpbmdzOiBTeWJ5bFNldHRpbmdzLCBub1dyYXAgPSBmYWxzZSk6IExvbmVsb2dGb3JtYXRPcHRpb25zIHtcbiAgcmV0dXJuIHsgd3JhcEluQ29kZUJsb2NrOiAhbm9XcmFwICYmIChzZXR0aW5ncy5sb25lbG9nV3JhcENvZGVCbG9jayA/PyB0cnVlKSB9O1xufVxuXG5mdW5jdGlvbiBnZW5lcmljQmxvY2txdW90ZShsYWJlbDogc3RyaW5nLCB0ZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYD4gWyR7bGFiZWx9XSAke3RleHQudHJpbSgpLnJlcGxhY2UoL1xcbi9nLCBcIlxcbj4gXCIpfWA7XG59XG5cbmZ1bmN0aW9uIGluZmVyTWltZVR5cGUoZmlsZTogVEZpbGUgfCBGaWxlKTogc3RyaW5nIHtcbiAgY29uc3QgbmFtZSA9IFwicGF0aFwiIGluIGZpbGUgPyBmaWxlLnBhdGggOiBmaWxlLm5hbWU7XG4gIHJldHVybiBuYW1lLnRvTG93ZXJDYXNlKCkuZW5kc1dpdGgoXCIucGRmXCIpID8gXCJhcHBsaWNhdGlvbi9wZGZcIiA6IFwidGV4dC9wbGFpblwiO1xufVxuXG5mdW5jdGlvbiB0b2RheUlzb0RhdGUoKTogc3RyaW5nIHtcbiAgcmV0dXJuIG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKS5zbGljZSgwLCAxMCk7XG59XG5cbmZ1bmN0aW9uIHBhcnNlTG9uZWxvZ09yYWNsZVJlc3BvbnNlKHRleHQ6IHN0cmluZyk6IHsgcmVzdWx0OiBzdHJpbmc7IGludGVycHJldGF0aW9uOiBzdHJpbmcgfSB7XG4gIGNvbnN0IGxpbmVzID0gdGV4dFxuICAgIC5yZXBsYWNlKC9ePlxccyovZ20sIFwiXCIpXG4gICAgLnNwbGl0KFwiXFxuXCIpXG4gICAgLm1hcCgobGluZSkgPT4gbGluZS50cmltKCkpXG4gICAgLmZpbHRlcihCb29sZWFuKTtcbiAgY29uc3QgcmVzdWx0ID0gbGluZXMuZmluZCgobGluZSkgPT4gbGluZS5zdGFydHNXaXRoKFwiLT5cIikpPy5yZXBsYWNlKC9eLT5cXHMqLywgXCJcIikgPz8gXCJVbmNsZWFyXCI7XG4gIGNvbnN0IGludGVycHJldGF0aW9uID0gbGluZXMuZmlsdGVyKChsaW5lKSA9PiAhbGluZS5zdGFydHNXaXRoKFwiLT5cIikpLmpvaW4oXCJcXG5cIik7XG4gIHJldHVybiB7IHJlc3VsdCwgaW50ZXJwcmV0YXRpb24gfTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gYWRkU291cmNlVG9Ob3RlKHBsdWdpbjogU3lieWxQbHVnaW4sIGZpbGU6IFRGaWxlKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IG9yaWdpbiA9IGF3YWl0IHBpY2tTb3VyY2VPcmlnaW4ocGx1Z2luLmFwcCk7XG4gIGlmICghb3JpZ2luKSByZXR1cm47XG5cbiAgaWYgKG9yaWdpbiA9PT0gXCJ2YXVsdFwiKSB7XG4gICAgY29uc3QgdmF1bHRGaWxlID0gYXdhaXQgcGlja1ZhdWx0RmlsZShwbHVnaW4uYXBwLCBcIkNob29zZSBhIHZhdWx0IGZpbGVcIik7XG4gICAgaWYgKCF2YXVsdEZpbGUpIHJldHVybjtcbiAgICBjb25zdCByZWY6IFNvdXJjZVJlZiA9IHtcbiAgICAgIGxhYmVsOiB2YXVsdEZpbGUuYmFzZW5hbWUsXG4gICAgICBtaW1lX3R5cGU6IGluZmVyTWltZVR5cGUodmF1bHRGaWxlKSxcbiAgICAgIHZhdWx0X3BhdGg6IHZhdWx0RmlsZS5wYXRoXG4gICAgfTtcbiAgICBhd2FpdCB1cHNlcnRTb3VyY2VSZWYocGx1Z2luLmFwcCwgZmlsZSwgcmVmKTtcbiAgICBuZXcgTm90aWNlKGBTb3VyY2UgYWRkZWQ6ICR7dmF1bHRGaWxlLnBhdGh9YCk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gRXh0ZXJuYWwgZmlsZSBcdTIwMTQgaW1wb3J0IGludG8gdmF1bHRcbiAgY29uc3QgbG9jYWxGaWxlID0gYXdhaXQgcGlja0xvY2FsRmlsZSgpO1xuICBpZiAoIWxvY2FsRmlsZSkgcmV0dXJuO1xuXG4gIGNvbnN0IGJ1ZmZlciA9IGF3YWl0IGxvY2FsRmlsZS5hcnJheUJ1ZmZlcigpO1xuICBjb25zdCBwYXJlbnREaXIgPSBmaWxlLnBhcmVudD8ucGF0aCA/PyBcIlwiO1xuICBjb25zdCBzb3VyY2VzRm9sZGVyID0gbm9ybWFsaXplUGF0aChwYXJlbnREaXIgPyBgJHtwYXJlbnREaXJ9L3NvdXJjZXNgIDogXCJzb3VyY2VzXCIpO1xuXG4gIGlmICghcGx1Z2luLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoc291cmNlc0ZvbGRlcikpIHtcbiAgICBhd2FpdCBwbHVnaW4uYXBwLnZhdWx0LmNyZWF0ZUZvbGRlcihzb3VyY2VzRm9sZGVyKTtcbiAgfVxuXG4gIGNvbnN0IHRhcmdldFBhdGggPSBub3JtYWxpemVQYXRoKGAke3NvdXJjZXNGb2xkZXJ9LyR7bG9jYWxGaWxlLm5hbWV9YCk7XG4gIGNvbnN0IGV4aXN0aW5nID0gcGx1Z2luLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgodGFyZ2V0UGF0aCk7XG4gIGlmIChleGlzdGluZyBpbnN0YW5jZW9mIFRGaWxlKSB7XG4gICAgYXdhaXQgcGx1Z2luLmFwcC52YXVsdC5tb2RpZnlCaW5hcnkoZXhpc3RpbmcsIGJ1ZmZlcik7XG4gIH0gZWxzZSB7XG4gICAgYXdhaXQgcGx1Z2luLmFwcC52YXVsdC5jcmVhdGVCaW5hcnkodGFyZ2V0UGF0aCwgYnVmZmVyKTtcbiAgfVxuXG4gIGNvbnN0IHJlZjogU291cmNlUmVmID0ge1xuICAgIGxhYmVsOiBsb2NhbEZpbGUubmFtZS5yZXBsYWNlKC9cXC5bXi5dKyQvLCBcIlwiKSxcbiAgICBtaW1lX3R5cGU6IGluZmVyTWltZVR5cGUobG9jYWxGaWxlKSxcbiAgICB2YXVsdF9wYXRoOiB0YXJnZXRQYXRoXG4gIH07XG4gIGF3YWl0IHVwc2VydFNvdXJjZVJlZihwbHVnaW4uYXBwLCBmaWxlLCByZWYpO1xuICBuZXcgTm90aWNlKGBTb3VyY2UgaW1wb3J0ZWQ6ICR7dGFyZ2V0UGF0aH1gKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gbWFuYWdlU291cmNlcyhwbHVnaW46IFN5YnlsUGx1Z2luKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IGNvbnRleHQgPSBhd2FpdCBwbHVnaW4uZ2V0QWN0aXZlTm90ZUNvbnRleHQoKTtcbiAgaWYgKCFjb250ZXh0Py52aWV3LmZpbGUpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgbmV3IE1hbmFnZVNvdXJjZXNNb2RhbChcbiAgICBwbHVnaW4uYXBwLFxuICAgIGNvbnRleHQuZm0uc291cmNlcyA/PyBbXSxcbiAgICBhc3luYyAocmVmKSA9PiByZW1vdmVTb3VyY2VSZWYocGx1Z2luLmFwcCwgY29udGV4dC52aWV3LmZpbGUhLCByZWYpXG4gICkub3BlbigpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBydW5HZW5lcmF0aW9uKFxuICBwbHVnaW46IFN5YnlsUGx1Z2luLFxuICB1c2VyTWVzc2FnZTogc3RyaW5nLFxuICBmb3JtYXR0ZXI6ICh0ZXh0OiBzdHJpbmcsIGZtOiBOb3RlRnJvbnRNYXR0ZXIsIGluc2lkZUNvZGVCbG9jazogYm9vbGVhbikgPT4gc3RyaW5nLFxuICBtYXhPdXRwdXRUb2tlbnMgPSA1MTIsXG4gIHBsYWNlbWVudD86IFwiY3Vyc29yXCIgfCBcImVuZC1vZi1ub3RlXCIgfCBcImJlbG93LXNlbGVjdGlvblwiXG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgY29udGV4dCA9IGF3YWl0IHBsdWdpbi5nZXRBY3RpdmVOb3RlQ29udGV4dCgpO1xuICBpZiAoIWNvbnRleHQpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IGVkaXRvciA9IGNvbnRleHQudmlldy5lZGl0b3I7XG4gICAgbGV0IHRhcmdldExpbmU6IG51bWJlcjtcbiAgICBpZiAocGxhY2VtZW50ID09PSBcImJlbG93LXNlbGVjdGlvblwiKSB7XG4gICAgICB0YXJnZXRMaW5lID0gZWRpdG9yLmxpc3RTZWxlY3Rpb25zKClbMF0/LmhlYWQubGluZSA/PyBlZGl0b3IuZ2V0Q3Vyc29yKCkubGluZTtcbiAgICB9IGVsc2UgaWYgKHBsYWNlbWVudCA9PT0gXCJlbmQtb2Ytbm90ZVwiKSB7XG4gICAgICB0YXJnZXRMaW5lID0gZWRpdG9yLmxhc3RMaW5lKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRhcmdldExpbmUgPSBlZGl0b3IuZ2V0Q3Vyc29yKCkubGluZTtcbiAgICB9XG4gICAgY29uc3QgaW5zaWRlQ29kZUJsb2NrID0gaXNJbnNpZGVDb2RlQmxvY2soZWRpdG9yLCB0YXJnZXRMaW5lKTtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHBsdWdpbi5yZXF1ZXN0R2VuZXJhdGlvbihjb250ZXh0LmZtLCBjb250ZXh0Lm5vdGVCb2R5LCB1c2VyTWVzc2FnZSwgbWF4T3V0cHV0VG9rZW5zKTtcbiAgICBjb25zdCBmb3JtYXR0ZWQgPSBmb3JtYXR0ZXIocmVzcG9uc2UudGV4dCwgY29udGV4dC5mbSwgaW5zaWRlQ29kZUJsb2NrKTtcbiAgICBpZiAocGxhY2VtZW50ID09PSBcImJlbG93LXNlbGVjdGlvblwiKSB7XG4gICAgICBpbnNlcnRCZWxvd1NlbGVjdGlvbihlZGl0b3IsIGZvcm1hdHRlZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBsdWdpbi5pbnNlcnRUZXh0KGNvbnRleHQudmlldywgZm9ybWF0dGVkLCBwbGFjZW1lbnQpO1xuICAgIH1cbiAgICBwbHVnaW4ubWF5YmVJbnNlcnRUb2tlbkNvbW1lbnQoY29udGV4dC52aWV3LCByZXNwb25zZSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgbmV3IE5vdGljZShgU3lieWwgZXJyb3I6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWdpc3RlckFsbENvbW1hbmRzKHBsdWdpbjogU3lieWxQbHVnaW4pOiB2b2lkIHtcbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOmluc2VydC1mcm9udG1hdHRlclwiLFxuICAgIG5hbWU6IFwiSW5zZXJ0IE5vdGUgRnJvbnRtYXR0ZXJcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY29udGV4dCA9IGF3YWl0IHBsdWdpbi5nZXRBY3RpdmVOb3RlQ29udGV4dCgpO1xuICAgICAgaWYgKCFjb250ZXh0Py52aWV3LmZpbGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgdmFsdWVzID0gYXdhaXQgb3BlbklucHV0TW9kYWwocGx1Z2luLmFwcCwgXCJJbnNlcnQgU3lieWwgRnJvbnRtYXR0ZXJcIiwgW1xuICAgICAgICB7IGtleTogXCJydWxlc2V0XCIsIGxhYmVsOiBcIkdhbWUgLyBydWxlc2V0XCIsIHBsYWNlaG9sZGVyOiBcIklyb25zd29yblwiIH0sXG4gICAgICAgIHsga2V5OiBcInBjc1wiLCBsYWJlbDogXCJQQ1wiLCBvcHRpb25hbDogdHJ1ZSwgcGxhY2Vob2xkZXI6IFwiS2lyYSBWb3NzLCBkYW5nZXJvdXMgcmFuaywgdm93OiByZWNvdmVyIHRoZSByZWxpY1wiIH0sXG4gICAgICAgIHsga2V5OiBcInRvbmVcIiwgbGFiZWw6IFwiVG9uZVwiLCBvcHRpb25hbDogdHJ1ZSwgcGxhY2Vob2xkZXI6IFwiR3JpdHR5LCBob3BlZnVsXCIgfSxcbiAgICAgICAgeyBrZXk6IFwibGFuZ3VhZ2VcIiwgbGFiZWw6IFwiTGFuZ3VhZ2VcIiwgb3B0aW9uYWw6IHRydWUsIHBsYWNlaG9sZGVyOiBcIkxlYXZlIGJsYW5rIGZvciBhdXRvLWRldGVjdFwiIH1cbiAgICAgIF0pO1xuICAgICAgaWYgKCF2YWx1ZXMpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKCF2YWx1ZXMucnVsZXNldCkge1xuICAgICAgICBuZXcgTm90aWNlKFwiUnVsZXNldCBpcyByZXF1aXJlZC5cIik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGF3YWl0IHBsdWdpbi5hcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGNvbnRleHQudmlldy5maWxlLCAoZm0pID0+IHtcbiAgICAgICAgZm1bXCJydWxlc2V0XCJdID0gdmFsdWVzLnJ1bGVzZXQ7XG4gICAgICAgIGZtW1wicHJvdmlkZXJcIl0gPSBmbVtcInByb3ZpZGVyXCJdID8/IHBsdWdpbi5zZXR0aW5ncy5hY3RpdmVQcm92aWRlcjtcbiAgICAgICAgZm1bXCJvcmFjbGVfbW9kZVwiXSA9IGZtW1wib3JhY2xlX21vZGVcIl0gPz8gXCJ5ZXMtbm9cIjtcbiAgICAgICAgZm1bXCJsb25lbG9nXCJdID0gZm1bXCJsb25lbG9nXCJdID8/IHBsdWdpbi5zZXR0aW5ncy5sb25lbG9nTW9kZTtcbiAgICAgICAgZm1bXCJzY2VuZV9jb3VudGVyXCJdID0gZm1bXCJzY2VuZV9jb3VudGVyXCJdID8/IDE7XG4gICAgICAgIGZtW1wic2Vzc2lvbl9udW1iZXJcIl0gPSBmbVtcInNlc3Npb25fbnVtYmVyXCJdID8/IDE7XG4gICAgICAgIGZtW1wiZ2FtZV9jb250ZXh0XCJdID0gZm1bXCJnYW1lX2NvbnRleHRcIl0gPz8gXCJcIjtcbiAgICAgICAgZm1bXCJzY2VuZV9jb250ZXh0XCJdID0gZm1bXCJzY2VuZV9jb250ZXh0XCJdID8/IFwiXCI7XG4gICAgICAgIGlmICh2YWx1ZXMucGNzKSBmbVtcInBjc1wiXSA9IHZhbHVlcy5wY3M7XG4gICAgICAgIGlmICh2YWx1ZXMudG9uZSkgZm1bXCJ0b25lXCJdID0gdmFsdWVzLnRvbmU7XG4gICAgICAgIGlmICh2YWx1ZXMubGFuZ3VhZ2UpIGZtW1wibGFuZ3VhZ2VcIl0gPSB2YWx1ZXMubGFuZ3VhZ2U7XG4gICAgICB9KTtcbiAgICAgIG5ldyBOb3RpY2UoXCJTeWJ5bCBmcm9udG1hdHRlciBpbnNlcnRlZC5cIik7XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6ZGlnZXN0LXNvdXJjZVwiLFxuICAgIG5hbWU6IFwiRGlnZXN0IFNvdXJjZSBpbnRvIEdhbWUgQ29udGV4dFwiLFxuICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjb250ZXh0ID0gYXdhaXQgcGx1Z2luLmdldEFjdGl2ZU5vdGVDb250ZXh0KCk7XG4gICAgICBpZiAoIWNvbnRleHQ/LnZpZXcuZmlsZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCB2YXVsdEZpbGUgPSBhd2FpdCBwaWNrVmF1bHRGaWxlKHBsdWdpbi5hcHAsIFwiQ2hvb3NlIGEgc291cmNlIGZpbGUgdG8gZGlnZXN0XCIpO1xuICAgICAgaWYgKCF2YXVsdEZpbGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgcmVmOiBTb3VyY2VSZWYgPSB7XG4gICAgICAgIGxhYmVsOiB2YXVsdEZpbGUuYmFzZW5hbWUsXG4gICAgICAgIG1pbWVfdHlwZTogaW5mZXJNaW1lVHlwZSh2YXVsdEZpbGUpLFxuICAgICAgICB2YXVsdF9wYXRoOiB2YXVsdEZpbGUucGF0aFxuICAgICAgfTtcbiAgICAgIGNvbnN0IHByb3ZpZGVySWQgPSBjb250ZXh0LmZtLnByb3ZpZGVyID8/IHBsdWdpbi5zZXR0aW5ncy5hY3RpdmVQcm92aWRlcjtcbiAgICAgIGxldCByZXNvbHZlZFNvdXJjZXM7XG4gICAgICB0cnkge1xuICAgICAgICByZXNvbHZlZFNvdXJjZXMgPSBhd2FpdCByZXNvbHZlU291cmNlc0ZvclJlcXVlc3QocGx1Z2luLmFwcCwgW3JlZl0sIHByb3ZpZGVySWQpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgbmV3IE5vdGljZShgQ2Fubm90IHJlYWQgc291cmNlOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgcnVsZXNldCA9IGNvbnRleHQuZm0ucnVsZXNldCA/PyBcInRoZSBnYW1lXCI7XG4gICAgICBjb25zdCBkaWdlc3RQcm9tcHQgPSBgRGlzdGlsbCB0aGUgZm9sbG93aW5nIHNvdXJjZSBtYXRlcmlhbCBmb3IgdXNlIGluIGEgc29sbyB0YWJsZXRvcCBSUEcgc2Vzc2lvbiBvZiBcIiR7cnVsZXNldH1cIi5cblxuRXh0cmFjdCBhbmQgY29uZGVuc2UgaW50byBhIGNvbXBhY3QgcmVmZXJlbmNlOlxuLSBDb3JlIHJ1bGVzIGFuZCBtZWNoYW5pY3MgcmVsZXZhbnQgdG8gcGxheVxuLSBLZXkgZmFjdGlvbnMsIGxvY2F0aW9ucywgY2hhcmFjdGVycywgYW5kIHdvcmxkIGZhY3RzXG4tIFRvbmUsIGdlbnJlLCBhbmQgc2V0dGluZyBjb252ZW50aW9uc1xuLSBBbnkgdGFibGVzLCBtb3ZlIGxpc3RzLCBvciByYW5kb20gZ2VuZXJhdG9yc1xuXG5CZSBjb25jaXNlIGFuZCBzcGVjaWZpYy4gUHJlc2VydmUgZ2FtZS1tZWNoYW5pY2FsIGRldGFpbHMuIE9taXQgZmxhdm9yIHByb3NlIGFuZCBleGFtcGxlcy5gO1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBwbHVnaW4ucmVxdWVzdFJhd0dlbmVyYXRpb24oXG4gICAgICAgICAgY29udGV4dC5mbSxcbiAgICAgICAgICBkaWdlc3RQcm9tcHQsXG4gICAgICAgICAgMjAwMCxcbiAgICAgICAgICByZXNvbHZlZFNvdXJjZXNcbiAgICAgICAgKTtcbiAgICAgICAgYXdhaXQgcGx1Z2luLmFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoY29udGV4dC52aWV3LmZpbGUsIChmbSkgPT4ge1xuICAgICAgICAgIGZtW1wiZ2FtZV9jb250ZXh0XCJdID0gcmVzcG9uc2UudGV4dDtcbiAgICAgICAgfSk7XG4gICAgICAgIG5ldyBOb3RpY2UoXCJHYW1lIGNvbnRleHQgdXBkYXRlZC5cIik7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBuZXcgTm90aWNlKGBTeWJ5bCBlcnJvcjogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6YXNrLXRoZS1ydWxlc1wiLFxuICAgIG5hbWU6IFwiQXNrIHRoZSBSdWxlc1wiLFxuICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjb250ZXh0ID0gYXdhaXQgcGx1Z2luLmdldEFjdGl2ZU5vdGVDb250ZXh0KCk7XG4gICAgICBpZiAoIWNvbnRleHQ/LnZpZXcuZmlsZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCBzb3VyY2VzID0gY29udGV4dC5mbS5zb3VyY2VzID8/IFtdO1xuICAgICAgaWYgKCFzb3VyY2VzLmxlbmd0aCkge1xuICAgICAgICBuZXcgTm90aWNlKFwiTm8gc291cmNlcyBhdHRhY2hlZCB0byB0aGlzIG5vdGUuIFVzZSBBZGQgU291cmNlIEZpbGUgZmlyc3QuXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCByZWYgPSBzb3VyY2VzLmxlbmd0aCA9PT0gMVxuICAgICAgICA/IHNvdXJjZXNbMF1cbiAgICAgICAgOiBhd2FpdCBwaWNrU291cmNlUmVmKHBsdWdpbi5hcHAsIFwiQ2hvb3NlIGEgc291cmNlIHRvIHF1ZXJ5XCIsIHNvdXJjZXMpO1xuICAgICAgaWYgKCFyZWYpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgdmFsdWVzID0gYXdhaXQgb3BlbklucHV0TW9kYWwocGx1Z2luLmFwcCwgXCJBc2sgdGhlIFJ1bGVzXCIsIFtcbiAgICAgICAgeyBrZXk6IFwicXVlc3Rpb25cIiwgbGFiZWw6IFwiUXVlc3Rpb25cIiwgcGxhY2Vob2xkZXI6IFwiSG93IGRvZXMgTW9tZW50dW0gd29yaz9cIiB9XG4gICAgICBdKTtcbiAgICAgIGlmICghdmFsdWVzPy5xdWVzdGlvbikge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCBwcm92aWRlcklkID0gY29udGV4dC5mbS5wcm92aWRlciA/PyBwbHVnaW4uc2V0dGluZ3MuYWN0aXZlUHJvdmlkZXI7XG4gICAgICBsZXQgcmVzb2x2ZWRTb3VyY2VzO1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzb2x2ZWRTb3VyY2VzID0gYXdhaXQgcmVzb2x2ZVNvdXJjZXNGb3JSZXF1ZXN0KHBsdWdpbi5hcHAsIFtyZWZdLCBwcm92aWRlcklkKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoYENhbm5vdCByZWFkIHNvdXJjZTogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJ1bGVzZXQgPSBjb250ZXh0LmZtLnJ1bGVzZXQgPz8gXCJ0aGUgZ2FtZVwiO1xuICAgICAgY29uc3QgcHJvbXB0ID0gYFlvdSBhcmUgYSBydWxlcyByZWZlcmVuY2UgZm9yIFwiJHtydWxlc2V0fVwiLlxuQW5zd2VyIHRoZSBmb2xsb3dpbmcgcXVlc3Rpb24gdXNpbmcgb25seSB0aGUgcHJvdmlkZWQgc291cmNlIG1hdGVyaWFsLlxuQmUgcHJlY2lzZSBhbmQgY2l0ZSB0aGUgcmVsZXZhbnQgcnVsZSBvciBwYWdlIHNlY3Rpb24gaWYgcG9zc2libGUuXG5cblF1ZXN0aW9uOiAke3ZhbHVlcy5xdWVzdGlvbn1gO1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBwbHVnaW4ucmVxdWVzdFJhd0dlbmVyYXRpb24oY29udGV4dC5mbSwgcHJvbXB0LCAxMDAwLCByZXNvbHZlZFNvdXJjZXMpO1xuICAgICAgICBwbHVnaW4uaW5zZXJ0VGV4dChjb250ZXh0LnZpZXcsIGdlbmVyaWNCbG9ja3F1b3RlKFwiUnVsZXNcIiwgcmVzcG9uc2UudGV4dCkpO1xuICAgICAgICBwbHVnaW4ubWF5YmVJbnNlcnRUb2tlbkNvbW1lbnQoY29udGV4dC52aWV3LCByZXNwb25zZSk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBuZXcgTm90aWNlKGBTeWJ5bCBlcnJvcjogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6YWR2ZW50dXJlLXNlZWRcIixcbiAgICBuYW1lOiBcIkFkdmVudHVyZSBTZWVkXCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGNvbnRleHQgPSBhd2FpdCBwbHVnaW4uZ2V0QWN0aXZlTm90ZUNvbnRleHQoKTtcbiAgICAgIGlmICghY29udGV4dD8udmlldy5maWxlKSByZXR1cm47XG4gICAgICBjb25zdCB2YWx1ZXMgPSBhd2FpdCBvcGVuSW5wdXRNb2RhbChwbHVnaW4uYXBwLCBcIkFkdmVudHVyZSBTZWVkXCIsIFtcbiAgICAgICAgeyBrZXk6IFwiY29uY2VwdFwiLCBsYWJlbDogXCJUaGVtZSBvciBjb25jZXB0XCIsIG9wdGlvbmFsOiB0cnVlLCBwbGFjZWhvbGRlcjogXCJMZWF2ZSBibGFuayBmb3IgYSByYW5kb20gc2VlZC5cIiB9XG4gICAgICBdKTtcbiAgICAgIGlmICghdmFsdWVzKSByZXR1cm47XG4gICAgICBjb25zdCBydWxlc2V0ID0gY29udGV4dC5mbS5ydWxlc2V0ID8/IFwidGhlIGdhbWVcIjtcbiAgICAgIGNvbnN0IGNvbmNlcHQgPSB2YWx1ZXMuY29uY2VwdD8udHJpbSgpO1xuICAgICAgY29uc3QgcHJvbXB0ID0gYEdlbmVyYXRlIGFuIGFkdmVudHVyZSBzZWVkIGZvciBhIHNvbG8gdGFibGV0b3AgUlBHIHNlc3Npb24gb2YgXCIke3J1bGVzZXR9XCIuXG5cblN0cnVjdHVyZSB0aGUgb3V0cHV0IGFzOlxuLSBQcmVtaXNlOiBvbmUgc2VudGVuY2UgZGVzY3JpYmluZyB0aGUgc2l0dWF0aW9uXG4tIENvbmZsaWN0OiB0aGUgY2VudHJhbCB0ZW5zaW9uIG9yIHRocmVhdFxuLSBIb29rOiB0aGUgc3BlY2lmaWMgZXZlbnQgdGhhdCBwdWxscyB0aGUgUEMgaW5cbi0gVG9uZTogdGhlIGludGVuZGVkIGF0bW9zcGhlcmVcblxuJHtjb25jZXB0ID8gYFRoZW1lL2NvbmNlcHQ6ICR7Y29uY2VwdH1gIDogXCJNYWtlIGl0IGV2b2NhdGl2ZSBhbmQgaW1tZWRpYXRlbHkgcGxheWFibGUuXCJ9XG5LZWVwIGl0IGNvbmNpc2UgXHUyMDE0IDQgYnVsbGV0IHBvaW50cywgb25lIHNob3J0IHNlbnRlbmNlIGVhY2guYDtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcGx1Z2luLnJlcXVlc3RSYXdHZW5lcmF0aW9uKGNvbnRleHQuZm0sIHByb21wdCwgODAwLCBbXSk7XG4gICAgICAgIGNvbnN0IGxvbmVsb2cgPSBpc0xvbmVsb2dBY3RpdmUocGx1Z2luLnNldHRpbmdzLCBjb250ZXh0LmZtKTtcbiAgICAgICAgY29uc3QgaW5zaWRlQ29kZUJsb2NrID0gaXNJbnNpZGVDb2RlQmxvY2soY29udGV4dC52aWV3LmVkaXRvcik7XG4gICAgICAgIGNvbnN0IG91dHB1dCA9IGxvbmVsb2dcbiAgICAgICAgICA/IGZvcm1hdEFkdmVudHVyZVNlZWQocmVzcG9uc2UudGV4dCwgbG9uZWxvZ09wdHMocGx1Z2luLnNldHRpbmdzLCBpbnNpZGVDb2RlQmxvY2spKVxuICAgICAgICAgIDogZ2VuZXJpY0Jsb2NrcXVvdGUoXCJBZHZlbnR1cmUgU2VlZFwiLCByZXNwb25zZS50ZXh0KTtcbiAgICAgICAgcGx1Z2luLmluc2VydFRleHQoY29udGV4dC52aWV3LCBvdXRwdXQpO1xuICAgICAgICBwbHVnaW4ubWF5YmVJbnNlcnRUb2tlbkNvbW1lbnQoY29udGV4dC52aWV3LCByZXNwb25zZSk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBuZXcgTm90aWNlKGBTeWJ5bCBlcnJvcjogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6Z2VuZXJhdGUtY2hhcmFjdGVyXCIsXG4gICAgbmFtZTogXCJHZW5lcmF0ZSBDaGFyYWN0ZXJcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY29udGV4dCA9IGF3YWl0IHBsdWdpbi5nZXRBY3RpdmVOb3RlQ29udGV4dCgpO1xuICAgICAgaWYgKCFjb250ZXh0Py52aWV3LmZpbGUpIHJldHVybjtcbiAgICAgIGNvbnN0IHNvdXJjZXMgPSBjb250ZXh0LmZtLnNvdXJjZXMgPz8gW107XG4gICAgICBpZiAoIXNvdXJjZXMubGVuZ3RoKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoXCJObyBzb3VyY2VzIGF0dGFjaGVkIHRvIHRoaXMgbm90ZS4gQWRkIGEgcnVsZWJvb2sgZmlyc3QgdmlhIEFkZCBTb3VyY2UgRmlsZS5cIik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJlZiA9IHNvdXJjZXMubGVuZ3RoID09PSAxXG4gICAgICAgID8gc291cmNlc1swXVxuICAgICAgICA6IGF3YWl0IHBpY2tTb3VyY2VSZWYocGx1Z2luLmFwcCwgXCJDaG9vc2UgYSBydWxlYm9vayBzb3VyY2VcIiwgc291cmNlcyk7XG4gICAgICBpZiAoIXJlZikgcmV0dXJuO1xuICAgICAgY29uc3QgdmFsdWVzID0gYXdhaXQgb3BlbklucHV0TW9kYWwocGx1Z2luLmFwcCwgXCJHZW5lcmF0ZSBDaGFyYWN0ZXJcIiwgW1xuICAgICAgICB7IGtleTogXCJjb25jZXB0XCIsIGxhYmVsOiBcIkNoYXJhY3RlciBjb25jZXB0XCIsIG9wdGlvbmFsOiB0cnVlLCBwbGFjZWhvbGRlcjogXCJMZWF2ZSBibGFuayBmb3IgYSByYW5kb20gY2hhcmFjdGVyLlwiIH1cbiAgICAgIF0pO1xuICAgICAgaWYgKCF2YWx1ZXMpIHJldHVybjtcbiAgICAgIGNvbnN0IHByb3ZpZGVySWQgPSBjb250ZXh0LmZtLnByb3ZpZGVyID8/IHBsdWdpbi5zZXR0aW5ncy5hY3RpdmVQcm92aWRlcjtcbiAgICAgIGxldCByZXNvbHZlZFNvdXJjZXM7XG4gICAgICB0cnkge1xuICAgICAgICByZXNvbHZlZFNvdXJjZXMgPSBhd2FpdCByZXNvbHZlU291cmNlc0ZvclJlcXVlc3QocGx1Z2luLmFwcCwgW3JlZl0sIHByb3ZpZGVySWQpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgbmV3IE5vdGljZShgQ2Fubm90IHJlYWQgc291cmNlOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgcnVsZXNldCA9IGNvbnRleHQuZm0ucnVsZXNldCA/PyBcInRoZSBnYW1lXCI7XG4gICAgICBjb25zdCBjb25jZXB0ID0gdmFsdWVzLmNvbmNlcHQ/LnRyaW0oKTtcbiAgICAgIGNvbnN0IGxvbmVsb2cgPSBpc0xvbmVsb2dBY3RpdmUocGx1Z2luLnNldHRpbmdzLCBjb250ZXh0LmZtKTtcbiAgICAgIGNvbnN0IGZvcm1hdEluc3RydWN0aW9uID0gbG9uZWxvZ1xuICAgICAgICA/IGBGb3JtYXQgdGhlIG91dHB1dCBhcyBhIExvbmVsb2cgUEMgdGFnLiBVc2UgdGhlIG11bHRpLWxpbmUgZm9ybSBmb3IgY29tcGxleCBjaGFyYWN0ZXJzOlxuW1BDOk5hbWVcbiAgfCBzdGF0OiBIUCBYLCBTdHJlc3MgWVxuICB8IGdlYXI6IGl0ZW0xLCBpdGVtMlxuICB8IHRyYWl0OiB2YWx1ZTEsIHZhbHVlMlxuXVxuSW5jbHVkZSBhbGwgc3RhdHMgYW5kIGZpZWxkcyBleGFjdGx5IGFzIGRlZmluZWQgYnkgdGhlIHJ1bGVzLiBPdXRwdXQgdGhlIHRhZyBvbmx5IFx1MjAxNCBubyBleHRyYSBjb21tZW50YXJ5LmBcbiAgICAgICAgOiBgSW5jbHVkZSBhbGwgcmVxdWlyZWQgZmllbGRzIGFzIGRlZmluZWQgYnkgdGhlIHJ1bGVzOiBuYW1lLCBzdGF0cy9hdHRyaWJ1dGVzLCBzdGFydGluZyBlcXVpcG1lbnQsIGJhY2tncm91bmQsIGFuZCBhbnkgb3RoZXIgbWFuZGF0b3J5IGNoYXJhY3RlciBlbGVtZW50cy4gRm9ybWF0IGNsZWFybHkgd2l0aCBvbmUgZmllbGQgcGVyIGxpbmUuYDtcbiAgICAgIGNvbnN0IHByb21wdCA9IGBVc2luZyBPTkxZIHRoZSBjaGFyYWN0ZXIgY3JlYXRpb24gcnVsZXMgaW4gdGhlIHByb3ZpZGVkIHNvdXJjZSBtYXRlcmlhbCwgZ2VuZXJhdGUgYSBjaGFyYWN0ZXIgZm9yIFwiJHtydWxlc2V0fVwiLlxuXG5Gb2xsb3cgdGhlIGV4YWN0IGNoYXJhY3RlciBjcmVhdGlvbiBwcm9jZWR1cmUgZGVzY3JpYmVkIGluIHRoZSBydWxlcy4gRG8gbm90IGludmVudCBtZWNoYW5pY3Mgbm90IHByZXNlbnQgaW4gdGhlIHNvdXJjZS5cblxuJHtjb25jZXB0ID8gYENoYXJhY3RlciBjb25jZXB0OiAke2NvbmNlcHR9YCA6IFwiR2VuZXJhdGUgYSByYW5kb20gY2hhcmFjdGVyLlwifVxuXG4ke2Zvcm1hdEluc3RydWN0aW9ufWA7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHBsdWdpbi5yZXF1ZXN0UmF3R2VuZXJhdGlvbihjb250ZXh0LmZtLCBwcm9tcHQsIDE1MDAsIHJlc29sdmVkU291cmNlcyk7XG4gICAgICAgIGNvbnN0IGluc2lkZUNvZGVCbG9jayA9IGlzSW5zaWRlQ29kZUJsb2NrKGNvbnRleHQudmlldy5lZGl0b3IpO1xuICAgICAgICBjb25zdCBvdXRwdXQgPSBsb25lbG9nXG4gICAgICAgICAgPyBmb3JtYXRDaGFyYWN0ZXIocmVzcG9uc2UudGV4dCwgbG9uZWxvZ09wdHMocGx1Z2luLnNldHRpbmdzLCBpbnNpZGVDb2RlQmxvY2spKVxuICAgICAgICAgIDogZ2VuZXJpY0Jsb2NrcXVvdGUoXCJDaGFyYWN0ZXJcIiwgcmVzcG9uc2UudGV4dCk7XG4gICAgICAgIHBsdWdpbi5pbnNlcnRUZXh0KGNvbnRleHQudmlldywgb3V0cHV0KTtcbiAgICAgICAgcGx1Z2luLm1heWJlSW5zZXJ0VG9rZW5Db21tZW50KGNvbnRleHQudmlldywgcmVzcG9uc2UpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgbmV3IE5vdGljZShgU3lieWwgZXJyb3I6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOnN0YXJ0LXNjZW5lXCIsXG4gICAgbmFtZTogXCJTdGFydCBTY2VuZVwiLFxuICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjb250ZXh0ID0gYXdhaXQgcGx1Z2luLmdldEFjdGl2ZU5vdGVDb250ZXh0KCk7XG4gICAgICBpZiAoIWNvbnRleHQ/LnZpZXcuZmlsZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAoaXNMb25lbG9nQWN0aXZlKHBsdWdpbi5zZXR0aW5ncywgY29udGV4dC5mbSkpIHtcbiAgICAgICAgY29uc3QgdmFsdWVzID0gYXdhaXQgb3BlbklucHV0TW9kYWwocGx1Z2luLmFwcCwgXCJTdGFydCBTY2VuZVwiLCBbXG4gICAgICAgICAgeyBrZXk6IFwic2NlbmVEZXNjXCIsIGxhYmVsOiBcIlNjZW5lIGRlc2NyaXB0aW9uXCIsIHBsYWNlaG9sZGVyOiBcIkRhcmsgYWxsZXksIG1pZG5pZ2h0XCIgfVxuICAgICAgICBdKTtcbiAgICAgICAgaWYgKCF2YWx1ZXM/LnNjZW5lRGVzYykge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjb3VudGVyID0gY29udGV4dC5mbS5zY2VuZV9jb3VudGVyID8/IDE7XG4gICAgICAgIGF3YWl0IHJ1bkdlbmVyYXRpb24oXG4gICAgICAgICAgcGx1Z2luLFxuICAgICAgICAgIGBTVEFSVCBTQ0VORS4gR2VuZXJhdGUgb25seTogMi0zIGxpbmVzIG9mIHRoaXJkLXBlcnNvbiBwYXN0LXRlbnNlIHByb3NlIGRlc2NyaWJpbmcgdGhlIGF0bW9zcGhlcmUgYW5kIHNldHRpbmcgb2Y6IFwiJHt2YWx1ZXMuc2NlbmVEZXNjfVwiLiBObyBkaWFsb2d1ZS4gTm8gUEMgYWN0aW9ucy4gTm8gYWRkaXRpb25hbCBjb21tZW50YXJ5LmAsXG4gICAgICAgICAgKHRleHQsIF9mbSwgaW5zaWRlQ29kZUJsb2NrKSA9PiBmb3JtYXRTdGFydFNjZW5lKHRleHQsIGBTJHtjb3VudGVyfWAsIHZhbHVlcy5zY2VuZURlc2MsIGxvbmVsb2dPcHRzKHBsdWdpbi5zZXR0aW5ncywgaW5zaWRlQ29kZUJsb2NrKSlcbiAgICAgICAgKTtcbiAgICAgICAgaWYgKHBsdWdpbi5zZXR0aW5ncy5sb25lbG9nQXV0b0luY1NjZW5lKSB7XG4gICAgICAgICAgYXdhaXQgd3JpdGVGcm9udE1hdHRlcktleShwbHVnaW4uYXBwLCBjb250ZXh0LnZpZXcuZmlsZSwgXCJzY2VuZV9jb3VudGVyXCIsIGNvdW50ZXIgKyAxKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBhd2FpdCBydW5HZW5lcmF0aW9uKFxuICAgICAgICBwbHVnaW4sXG4gICAgICAgIFwiU1RBUlQgU0NFTkUuIEdlbmVyYXRlIG9ubHk6IDItMyBsaW5lcyBvZiB0aGlyZC1wZXJzb24gcGFzdC10ZW5zZSBwcm9zZSBkZXNjcmliaW5nIHRoZSBzZXR0aW5nIGFuZCBhdG1vc3BoZXJlLiBObyBkaWFsb2d1ZS4gTm8gUEMgYWN0aW9ucy4gTm8gYWRkaXRpb25hbCBjb21tZW50YXJ5LlwiLFxuICAgICAgICAodGV4dCkgPT4gZ2VuZXJpY0Jsb2NrcXVvdGUoXCJTY2VuZVwiLCB0ZXh0KVxuICAgICAgKTtcbiAgICB9XG4gIH0pO1xuXG4gIHBsdWdpbi5hZGRDb21tYW5kKHtcbiAgICBpZDogXCJzeWJ5bDpkZWNsYXJlLWFjdGlvblwiLFxuICAgIG5hbWU6IFwiRGVjbGFyZSBBY3Rpb25cIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgdmFsdWVzID0gYXdhaXQgb3BlbklucHV0TW9kYWwocGx1Z2luLmFwcCwgXCJEZWNsYXJlIEFjdGlvblwiLCBbXG4gICAgICAgIHsga2V5OiBcImFjdGlvblwiLCBsYWJlbDogXCJBY3Rpb25cIiB9LFxuICAgICAgICB7IGtleTogXCJyb2xsXCIsIGxhYmVsOiBcIlJvbGwgcmVzdWx0XCIgfVxuICAgICAgXSk7XG4gICAgICBpZiAoIXZhbHVlcz8uYWN0aW9uIHx8ICF2YWx1ZXMucm9sbCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBhd2FpdCBydW5HZW5lcmF0aW9uKFxuICAgICAgICBwbHVnaW4sXG4gICAgICAgIGBQQyBhY3Rpb246ICR7dmFsdWVzLmFjdGlvbn1cXG5Sb2xsIHJlc3VsdDogJHt2YWx1ZXMucm9sbH1cXG5EZXNjcmliZSBvbmx5IHRoZSBjb25zZXF1ZW5jZXMgYW5kIHdvcmxkIHJlYWN0aW9uLiBEbyBub3QgZGVzY3JpYmUgdGhlIFBDJ3MgYWN0aW9uLmAsXG4gICAgICAgICh0ZXh0LCBmbSwgaW5zaWRlQ29kZUJsb2NrKSA9PlxuICAgICAgICAgIGlzTG9uZWxvZ0FjdGl2ZShwbHVnaW4uc2V0dGluZ3MsIGZtKVxuICAgICAgICAgICAgPyBmb3JtYXREZWNsYXJlQWN0aW9uKHZhbHVlcy5hY3Rpb24sIHZhbHVlcy5yb2xsLCB0ZXh0LCBsb25lbG9nT3B0cyhwbHVnaW4uc2V0dGluZ3MsIGluc2lkZUNvZGVCbG9jaykpXG4gICAgICAgICAgICA6IGA+IFtBY3Rpb25dICR7dmFsdWVzLmFjdGlvbn0gfCBSb2xsOiAke3ZhbHVlcy5yb2xsfVxcbj4gW1Jlc3VsdF0gJHt0ZXh0LnRyaW0oKS5yZXBsYWNlKC9cXG4vZywgXCJcXG4+IFwiKX1gXG4gICAgICApO1xuICAgIH1cbiAgfSk7XG5cbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOmFzay1vcmFjbGVcIixcbiAgICBuYW1lOiBcIkFzayBPcmFjbGVcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY29udGV4dCA9IGF3YWl0IHBsdWdpbi5nZXRBY3RpdmVOb3RlQ29udGV4dCgpO1xuICAgICAgaWYgKCFjb250ZXh0KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHZhbHVlcyA9IGF3YWl0IG9wZW5JbnB1dE1vZGFsKHBsdWdpbi5hcHAsIFwiQXNrIE9yYWNsZVwiLCBbXG4gICAgICAgIHsga2V5OiBcInF1ZXN0aW9uXCIsIGxhYmVsOiBcIlF1ZXN0aW9uXCIgfSxcbiAgICAgICAgeyBrZXk6IFwicmVzdWx0XCIsIGxhYmVsOiBcIk9yYWNsZSByZXN1bHRcIiwgb3B0aW9uYWw6IHRydWUgfVxuICAgICAgXSk7XG4gICAgICBpZiAoIXZhbHVlcz8ucXVlc3Rpb24pIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgaGFzUmVzdWx0ID0gQm9vbGVhbih2YWx1ZXMucmVzdWx0Py50cmltKCkpO1xuICAgICAgY29uc3QgbWVzc2FnZSA9IGhhc1Jlc3VsdFxuICAgICAgICA/IGBPcmFjbGUgcXVlc3Rpb246ICR7dmFsdWVzLnF1ZXN0aW9ufVxcbk9yYWNsZSByZXN1bHQ6ICR7dmFsdWVzLnJlc3VsdH1cXG5JbnRlcnByZXQgdGhpcyByZXN1bHQgaW4gdGhlIGNvbnRleHQgb2YgdGhlIHNjZW5lLiBUaGlyZCBwZXJzb24sIG5ldXRyYWwsIDItMyBsaW5lcy5gXG4gICAgICAgIDogYE9yYWNsZSBxdWVzdGlvbjogJHt2YWx1ZXMucXVlc3Rpb259XFxuT3JhY2xlIG1vZGU6ICR7Y29udGV4dC5mbS5vcmFjbGVfbW9kZSA/PyBcInllcy1ub1wifVxcblJ1biB0aGUgb3JhY2xlIGFuZCBnaXZlIHRoZSByZXN1bHQgcGx1cyBhIDEtMiBsaW5lIG5ldXRyYWwgaW50ZXJwcmV0YXRpb24uYDtcbiAgICAgIGF3YWl0IHJ1bkdlbmVyYXRpb24oXG4gICAgICAgIHBsdWdpbixcbiAgICAgICAgbWVzc2FnZSxcbiAgICAgICAgKHRleHQsIGZtLCBpbnNpZGVDb2RlQmxvY2spID0+IHtcbiAgICAgICAgICBpZiAoIWlzTG9uZWxvZ0FjdGl2ZShwbHVnaW4uc2V0dGluZ3MsIGZtKSkge1xuICAgICAgICAgICAgcmV0dXJuIGA+IFtPcmFjbGVdIFE6ICR7dmFsdWVzLnF1ZXN0aW9ufVxcbj4gW0Fuc3dlcl0gJHt0ZXh0LnRyaW0oKS5yZXBsYWNlKC9cXG4vZywgXCJcXG4+IFwiKX1gO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaGFzUmVzdWx0KSB7XG4gICAgICAgICAgICByZXR1cm4gZm9ybWF0QXNrT3JhY2xlKHZhbHVlcy5xdWVzdGlvbiwgdmFsdWVzLnJlc3VsdC50cmltKCksIHRleHQsIGxvbmVsb2dPcHRzKHBsdWdpbi5zZXR0aW5ncywgaW5zaWRlQ29kZUJsb2NrKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IHBhcnNlZCA9IHBhcnNlTG9uZWxvZ09yYWNsZVJlc3BvbnNlKHRleHQpO1xuICAgICAgICAgIHJldHVybiBmb3JtYXRBc2tPcmFjbGUodmFsdWVzLnF1ZXN0aW9uLCBwYXJzZWQucmVzdWx0LCBwYXJzZWQuaW50ZXJwcmV0YXRpb24sIGxvbmVsb2dPcHRzKHBsdWdpbi5zZXR0aW5ncywgaW5zaWRlQ29kZUJsb2NrKSk7XG4gICAgICAgIH1cbiAgICAgICk7XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6aW50ZXJwcmV0LW9yYWNsZVwiLFxuICAgIG5hbWU6IFwiSW50ZXJwcmV0IE9yYWNsZSBSb2xsXCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGNvbnRleHQgPSBhd2FpdCBwbHVnaW4uZ2V0QWN0aXZlTm90ZUNvbnRleHQoKTtcbiAgICAgIGlmICghY29udGV4dCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBsZXQgc2VsZWN0ZWQgPSBnZXRTZWxlY3Rpb24oY29udGV4dC52aWV3LmVkaXRvcik7XG4gICAgICBpZiAoIXNlbGVjdGVkKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlcyA9IGF3YWl0IG9wZW5JbnB1dE1vZGFsKHBsdWdpbi5hcHAsIFwiSW50ZXJwcmV0IE9yYWNsZSBSZXN1bHRcIiwgW1xuICAgICAgICAgIHsga2V5OiBcIm9yYWNsZVwiLCBsYWJlbDogXCJPcmFjbGUgcmVzdWx0XCIgfVxuICAgICAgICBdKTtcbiAgICAgICAgc2VsZWN0ZWQgPSB2YWx1ZXM/Lm9yYWNsZT8udHJpbSgpID8/IFwiXCI7XG4gICAgICB9XG4gICAgICBpZiAoIXNlbGVjdGVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGF3YWl0IHJ1bkdlbmVyYXRpb24oXG4gICAgICAgIHBsdWdpbixcbiAgICAgICAgYEludGVycHJldCB0aGlzIG9yYWNsZSByZXN1bHQgaW4gdGhlIGNvbnRleHQgb2YgdGhlIGN1cnJlbnQgc2NlbmU6IFwiJHtzZWxlY3RlZH1cIlxcbk5ldXRyYWwsIHRoaXJkLXBlcnNvbiwgMi0zIGxpbmVzLiBObyBkcmFtYXRpYyBsYW5ndWFnZS5gLFxuICAgICAgICAodGV4dCwgZm0sIGluc2lkZUNvZGVCbG9jaykgPT5cbiAgICAgICAgICBpc0xvbmVsb2dBY3RpdmUocGx1Z2luLnNldHRpbmdzLCBmbSlcbiAgICAgICAgICAgID8gZm9ybWF0SW50ZXJwcmV0T3JhY2xlKHRleHQsIGxvbmVsb2dPcHRzKHBsdWdpbi5zZXR0aW5ncywgaW5zaWRlQ29kZUJsb2NrKSlcbiAgICAgICAgICAgIDogZ2VuZXJpY0Jsb2NrcXVvdGUoXCJJbnRlcnByZXRhdGlvblwiLCB0ZXh0KSxcbiAgICAgICAgNTEyLFxuICAgICAgICBcImJlbG93LXNlbGVjdGlvblwiXG4gICAgICApO1xuICAgIH1cbiAgfSk7XG5cbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOnN1Z2dlc3QtY29uc2VxdWVuY2VcIixcbiAgICBuYW1lOiBcIldoYXQgTm93XCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGF3YWl0IHJ1bkdlbmVyYXRpb24oXG4gICAgICAgIHBsdWdpbixcbiAgICAgICAgXCJCYXNlZCBvbiB0aGUgY3VycmVudCBzY2VuZSBjb250ZXh0LCBzdWdnZXN0IDEtMiBwb3NzaWJsZSBjb25zZXF1ZW5jZXMgb3IgY29tcGxpY2F0aW9ucy4gUHJlc2VudCB0aGVtIGFzIG5ldXRyYWwgb3B0aW9ucywgbm90IGFzIG5hcnJhdGl2ZSBvdXRjb21lcy4gRG8gbm90IGNob29zZSBiZXR3ZWVuIHRoZW0uXCIsXG4gICAgICAgICh0ZXh0LCBmbSwgaW5zaWRlQ29kZUJsb2NrKSA9PlxuICAgICAgICAgIGlzTG9uZWxvZ0FjdGl2ZShwbHVnaW4uc2V0dGluZ3MsIGZtKVxuICAgICAgICAgICAgPyBmb3JtYXRTdWdnZXN0Q29uc2VxdWVuY2UodGV4dCwgbG9uZWxvZ09wdHMocGx1Z2luLnNldHRpbmdzLCBpbnNpZGVDb2RlQmxvY2spKVxuICAgICAgICAgICAgOiBnZW5lcmljQmxvY2txdW90ZShcIk9wdGlvbnNcIiwgdGV4dClcbiAgICAgICk7XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6d2hhdC1jYW4taS1kb1wiLFxuICAgIG5hbWU6IFwiV2hhdCBDYW4gSSBEb1wiLFxuICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICBhd2FpdCBydW5HZW5lcmF0aW9uKFxuICAgICAgICBwbHVnaW4sXG4gICAgICAgIFwiVGhlIHBsYXllciBpcyBzdHVjay4gQmFzZWQgb24gdGhlIGN1cnJlbnQgc2NlbmUgY29udGV4dCwgc3VnZ2VzdCBleGFjdGx5IDMgY29uY3JldGUgYWN0aW9ucyB0aGUgUEMgY291bGQgdGFrZSBuZXh0LiBQcmVzZW50IHRoZW0gYXMgbmV1dHJhbCBvcHRpb25zIG51bWJlcmVkIDFcdTIwMTMzLiBEbyBub3QgcmVzb2x2ZSBvciBuYXJyYXRlIGFueSBvdXRjb21lLiBEbyBub3QgcmVjb21tZW5kIG9uZSBvdmVyIGFub3RoZXIuXCIsXG4gICAgICAgICh0ZXh0LCBmbSwgaW5zaWRlQ29kZUJsb2NrKSA9PlxuICAgICAgICAgIGlzTG9uZWxvZ0FjdGl2ZShwbHVnaW4uc2V0dGluZ3MsIGZtKVxuICAgICAgICAgICAgPyBmb3JtYXRTdWdnZXN0Q29uc2VxdWVuY2UodGV4dCwgbG9uZWxvZ09wdHMocGx1Z2luLnNldHRpbmdzLCBpbnNpZGVDb2RlQmxvY2spKVxuICAgICAgICAgICAgOiBnZW5lcmljQmxvY2txdW90ZShcIkFjdGlvbnNcIiwgdGV4dClcbiAgICAgICk7XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6ZXhwYW5kLXNjZW5lXCIsXG4gICAgbmFtZTogXCJFeHBhbmQgU2NlbmVcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgYXdhaXQgcnVuR2VuZXJhdGlvbihcbiAgICAgICAgcGx1Z2luLFxuICAgICAgICBcIkV4cGFuZCB0aGUgY3VycmVudCBzY2VuZSBpbnRvIGEgcHJvc2UgcGFzc2FnZS4gVGhpcmQgcGVyc29uLCBwYXN0IHRlbnNlLCAxMDAtMTUwIHdvcmRzLiBObyBkaWFsb2d1ZS4gRG8gbm90IGRlc2NyaWJlIHRoZSBQQydzIGludGVybmFsIHRob3VnaHRzIG9yIGRlY2lzaW9ucy4gU3RheSBzdHJpY3RseSB3aXRoaW4gdGhlIGVzdGFibGlzaGVkIHNjZW5lIGNvbnRleHQuXCIsXG4gICAgICAgICh0ZXh0LCBmbSwgaW5zaWRlQ29kZUJsb2NrKSA9PlxuICAgICAgICAgIGlzTG9uZWxvZ0FjdGl2ZShwbHVnaW4uc2V0dGluZ3MsIGZtKVxuICAgICAgICAgICAgPyBmb3JtYXRFeHBhbmRTY2VuZSh0ZXh0LCBsb25lbG9nT3B0cyhwbHVnaW4uc2V0dGluZ3MsIGluc2lkZUNvZGVCbG9jaykpXG4gICAgICAgICAgICA6IGAtLS1cXG4+IFtQcm9zZV0gJHt0ZXh0LnRyaW0oKS5yZXBsYWNlKC9cXG4vZywgXCJcXG4+IFwiKX1cXG4tLS1gLFxuICAgICAgICA2MDBcbiAgICAgICk7XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6dXBsb2FkLXNvdXJjZVwiLFxuICAgIG5hbWU6IFwiQWRkIFNvdXJjZSBGaWxlXCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGNvbnRleHQgPSBhd2FpdCBwbHVnaW4uZ2V0QWN0aXZlTm90ZUNvbnRleHQoKTtcbiAgICAgIGlmICghY29udGV4dD8udmlldy5maWxlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGFkZFNvdXJjZVRvTm90ZShwbHVnaW4sIGNvbnRleHQudmlldy5maWxlKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoYFN5YnlsIGVycm9yOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIHBsdWdpbi5hZGRDb21tYW5kKHtcbiAgICBpZDogXCJzeWJ5bDptYW5hZ2Utc291cmNlc1wiLFxuICAgIG5hbWU6IFwiTWFuYWdlIFNvdXJjZXNcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgYXdhaXQgbWFuYWdlU291cmNlcyhwbHVnaW4pO1xuICAgIH1cbiAgfSk7XG5cbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOmxvbmVsb2ctcGFyc2UtY29udGV4dFwiLFxuICAgIG5hbWU6IFwiVXBkYXRlIFNjZW5lIENvbnRleHRcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY29udGV4dCA9IGF3YWl0IHBsdWdpbi5nZXRBY3RpdmVOb3RlQ29udGV4dCgpO1xuICAgICAgaWYgKCFjb250ZXh0Py52aWV3LmZpbGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKCFpc0xvbmVsb2dBY3RpdmUocGx1Z2luLnNldHRpbmdzLCBjb250ZXh0LmZtKSkge1xuICAgICAgICBuZXcgTm90aWNlKFwiTG9uZWxvZyBtb2RlIGlzIG5vdCBlbmFibGVkIGZvciB0aGlzIG5vdGUuXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCBwYXJzZWQgPSBwYXJzZUxvbmVsb2dDb250ZXh0KGNvbnRleHQubm90ZUJvZHksIHBsdWdpbi5zZXR0aW5ncy5sb25lbG9nQ29udGV4dERlcHRoKTtcbiAgICAgIGF3YWl0IHdyaXRlRnJvbnRNYXR0ZXJLZXkocGx1Z2luLmFwcCwgY29udGV4dC52aWV3LmZpbGUsIFwic2NlbmVfY29udGV4dFwiLCBzZXJpYWxpemVDb250ZXh0KHBhcnNlZCkpO1xuICAgICAgbmV3IE5vdGljZShcIlNjZW5lIGNvbnRleHQgdXBkYXRlZCBmcm9tIGxvZy5cIik7XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6bG9uZWxvZy1zZXNzaW9uLWJyZWFrXCIsXG4gICAgbmFtZTogXCJOZXcgU2Vzc2lvbiBIZWFkZXJcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY29udGV4dCA9IGF3YWl0IHBsdWdpbi5nZXRBY3RpdmVOb3RlQ29udGV4dCgpO1xuICAgICAgaWYgKCFjb250ZXh0Py52aWV3LmZpbGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKCFpc0xvbmVsb2dBY3RpdmUocGx1Z2luLnNldHRpbmdzLCBjb250ZXh0LmZtKSkge1xuICAgICAgICBuZXcgTm90aWNlKFwiTG9uZWxvZyBtb2RlIGlzIG5vdCBlbmFibGVkIGZvciB0aGlzIG5vdGUuXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCB2YWx1ZXMgPSBhd2FpdCBvcGVuSW5wdXRNb2RhbChwbHVnaW4uYXBwLCBcIk5ldyBTZXNzaW9uIEhlYWRlclwiLCBbXG4gICAgICAgIHsga2V5OiBcImRhdGVcIiwgbGFiZWw6IFwiRGF0ZVwiLCB2YWx1ZTogdG9kYXlJc29EYXRlKCkgfSxcbiAgICAgICAgeyBrZXk6IFwiZHVyYXRpb25cIiwgbGFiZWw6IFwiRHVyYXRpb25cIiwgcGxhY2Vob2xkZXI6IFwiMWgzMFwiIH0sXG4gICAgICAgIHsga2V5OiBcInJlY2FwXCIsIGxhYmVsOiBcIlJlY2FwXCIsIG9wdGlvbmFsOiB0cnVlIH1cbiAgICAgIF0pO1xuICAgICAgaWYgKCF2YWx1ZXM/LmRhdGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3Qgc2Vzc2lvbk51bWJlciA9IGNvbnRleHQuZm0uc2Vzc2lvbl9udW1iZXIgPz8gMTtcbiAgICAgIGNvbnN0IGJsb2NrID0gYCMjIFNlc3Npb24gJHtzZXNzaW9uTnVtYmVyfVxcbipEYXRlOiAke3ZhbHVlcy5kYXRlfSB8IER1cmF0aW9uOiAke3ZhbHVlcy5kdXJhdGlvbiB8fCBcIi1cIn0qXFxuXFxuJHt2YWx1ZXMucmVjYXAgPyBgKipSZWNhcDoqKiAke3ZhbHVlcy5yZWNhcH1cXG5cXG5gIDogXCJcIn1gO1xuICAgICAgcGx1Z2luLmluc2VydFRleHQoY29udGV4dC52aWV3LCBibG9jaywgXCJjdXJzb3JcIik7XG4gICAgICBhd2FpdCB3cml0ZUZyb250TWF0dGVyS2V5KHBsdWdpbi5hcHAsIGNvbnRleHQudmlldy5maWxlLCBcInNlc3Npb25fbnVtYmVyXCIsIHNlc3Npb25OdW1iZXIgKyAxKTtcbiAgICB9XG4gIH0pO1xufVxuIiwgImV4cG9ydCBpbnRlcmZhY2UgTG9uZWxvZ0Zvcm1hdE9wdGlvbnMge1xuICB3cmFwSW5Db2RlQmxvY2s6IGJvb2xlYW47XG4gIHNjZW5lSWQ/OiBzdHJpbmc7XG59XG5cbmZ1bmN0aW9uIGZlbmNlKGNvbnRlbnQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBgXFxgXFxgXFxgXFxuJHtjb250ZW50fVxcblxcYFxcYFxcYGA7XG59XG5cbmZ1bmN0aW9uIGNsZWFuQWlUZXh0KHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiB0ZXh0LnJlcGxhY2UoL14+XFxzKi9nbSwgXCJcIikudHJpbSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0U3RhcnRTY2VuZShcbiAgYWlUZXh0OiBzdHJpbmcsXG4gIHNjZW5lSWQ6IHN0cmluZyxcbiAgc2NlbmVEZXNjOiBzdHJpbmcsXG4gIF9vcHRzOiBMb25lbG9nRm9ybWF0T3B0aW9uc1xuKTogc3RyaW5nIHtcbiAgY29uc3QgaGVhZGVyID0gYCMjIyAke3NjZW5lSWR9ICoke3NjZW5lRGVzY30qYDtcbiAgY29uc3QgYm9keSA9IGNsZWFuQWlUZXh0KGFpVGV4dCk7XG4gIHJldHVybiBgJHtoZWFkZXJ9XFxuXFxuJHtib2R5fWA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXREZWNsYXJlQWN0aW9uKFxuICBhY3Rpb246IHN0cmluZyxcbiAgcm9sbDogc3RyaW5nLFxuICBhaUNvbnNlcXVlbmNlOiBzdHJpbmcsXG4gIG9wdHM6IExvbmVsb2dGb3JtYXRPcHRpb25zXG4pOiBzdHJpbmcge1xuICBjb25zdCBjb25zZXF1ZW5jZSA9IGNsZWFuQWlUZXh0KGFpQ29uc2VxdWVuY2UpXG4gICAgLnNwbGl0KFwiXFxuXCIpXG4gICAgLmZpbHRlcihCb29sZWFuKVxuICAgIC5tYXAoKGxpbmUpID0+IChsaW5lLnN0YXJ0c1dpdGgoXCI9PlwiKSA/IGxpbmUgOiBgPT4gJHtsaW5lfWApKVxuICAgIC5qb2luKFwiXFxuXCIpO1xuICBjb25zdCBub3RhdGlvbiA9IGBAICR7YWN0aW9ufVxcbmQ6ICR7cm9sbH1cXG4ke2NvbnNlcXVlbmNlfWA7XG4gIHJldHVybiBvcHRzLndyYXBJbkNvZGVCbG9jayA/IGZlbmNlKG5vdGF0aW9uKSA6IG5vdGF0aW9uO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0QXNrT3JhY2xlKFxuICBxdWVzdGlvbjogc3RyaW5nLFxuICBvcmFjbGVSZXN1bHQ6IHN0cmluZyxcbiAgYWlJbnRlcnByZXRhdGlvbjogc3RyaW5nLFxuICBvcHRzOiBMb25lbG9nRm9ybWF0T3B0aW9uc1xuKTogc3RyaW5nIHtcbiAgY29uc3QgaW50ZXJwcmV0YXRpb24gPSBjbGVhbkFpVGV4dChhaUludGVycHJldGF0aW9uKVxuICAgIC5zcGxpdChcIlxcblwiKVxuICAgIC5maWx0ZXIoQm9vbGVhbilcbiAgICAubWFwKChsaW5lKSA9PiAobGluZS5zdGFydHNXaXRoKFwiPT5cIikgPyBsaW5lIDogYD0+ICR7bGluZX1gKSlcbiAgICAuam9pbihcIlxcblwiKTtcbiAgY29uc3Qgbm90YXRpb24gPSBgPyAke3F1ZXN0aW9ufVxcbi0+ICR7b3JhY2xlUmVzdWx0fVxcbiR7aW50ZXJwcmV0YXRpb259YDtcbiAgcmV0dXJuIG9wdHMud3JhcEluQ29kZUJsb2NrID8gZmVuY2Uobm90YXRpb24pIDogbm90YXRpb247XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRJbnRlcnByZXRPcmFjbGUoXG4gIGFpSW50ZXJwcmV0YXRpb246IHN0cmluZyxcbiAgb3B0czogTG9uZWxvZ0Zvcm1hdE9wdGlvbnNcbik6IHN0cmluZyB7XG4gIGNvbnN0IGludGVycHJldGF0aW9uID0gY2xlYW5BaVRleHQoYWlJbnRlcnByZXRhdGlvbilcbiAgICAuc3BsaXQoXCJcXG5cIilcbiAgICAuZmlsdGVyKEJvb2xlYW4pXG4gICAgLm1hcCgobGluZSkgPT4gKGxpbmUuc3RhcnRzV2l0aChcIj0+XCIpID8gbGluZSA6IGA9PiAke2xpbmV9YCkpXG4gICAgLmpvaW4oXCJcXG5cIik7XG4gIHJldHVybiBvcHRzLndyYXBJbkNvZGVCbG9jayA/IGZlbmNlKGludGVycHJldGF0aW9uKSA6IGludGVycHJldGF0aW9uO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0U3VnZ2VzdENvbnNlcXVlbmNlKGFpT3B0aW9uczogc3RyaW5nLCBvcHRzOiBMb25lbG9nRm9ybWF0T3B0aW9ucyk6IHN0cmluZyB7XG4gIGNvbnN0IG9wdGlvbnMgPSBjbGVhbkFpVGV4dChhaU9wdGlvbnMpXG4gICAgLnNwbGl0KFwiXFxuXCIpXG4gICAgLmZpbHRlcigobGluZSkgPT4gbGluZS50cmltKCkubGVuZ3RoID4gMClcbiAgICAubWFwKChsaW5lKSA9PiAobGluZS5zdGFydHNXaXRoKFwiPT5cIikgPyBsaW5lIDogYD0+ICR7bGluZX1gKSlcbiAgICAuam9pbihcIlxcblwiKTtcbiAgcmV0dXJuIG9wdHMud3JhcEluQ29kZUJsb2NrID8gZmVuY2Uob3B0aW9ucykgOiBvcHRpb25zO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0RXhwYW5kU2NlbmUoYWlQcm9zZTogc3RyaW5nLCBfb3B0czogTG9uZWxvZ0Zvcm1hdE9wdGlvbnMpOiBzdHJpbmcge1xuICByZXR1cm4gYFxcXFwtLS1cXG4ke2NsZWFuQWlUZXh0KGFpUHJvc2UpfVxcbi0tLVxcXFxgO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0QWR2ZW50dXJlU2VlZChhaVRleHQ6IHN0cmluZywgb3B0czogTG9uZWxvZ0Zvcm1hdE9wdGlvbnMpOiBzdHJpbmcge1xuICBjb25zdCBheGVzID0gY2xlYW5BaVRleHQoYWlUZXh0KVxuICAgIC5zcGxpdChcIlxcblwiKVxuICAgIC5maWx0ZXIoQm9vbGVhbilcbiAgICAubWFwKChsaW5lKSA9PiBcIiAgXCIgKyBsaW5lLnJlcGxhY2UoL15bLSpdXFxzKi8sIFwiXCIpKVxuICAgIC5qb2luKFwiXFxuXCIpO1xuICBjb25zdCBub3RhdGlvbiA9IGBnZW46IEFkdmVudHVyZSBTZWVkXFxuJHtheGVzfWA7XG4gIHJldHVybiBvcHRzLndyYXBJbkNvZGVCbG9jayA/IGZlbmNlKG5vdGF0aW9uKSA6IG5vdGF0aW9uO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0Q2hhcmFjdGVyKGFpVGV4dDogc3RyaW5nLCBfb3B0czogTG9uZWxvZ0Zvcm1hdE9wdGlvbnMpOiBzdHJpbmcge1xuICByZXR1cm4gY2xlYW5BaVRleHQoYWlUZXh0KTtcbn1cbiIsICJpbXBvcnQgeyBBcHAsIE1vZGFsLCBOb3RpY2UsIFBsdWdpbiwgU2V0dGluZywgVEZpbGUgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IGRlc2NyaWJlU291cmNlUmVmLCBsaXN0VmF1bHRDYW5kaWRhdGVGaWxlcyB9IGZyb20gXCIuL3NvdXJjZVV0aWxzXCI7XG5pbXBvcnQgeyBNb2RhbEZpZWxkLCBTb3VyY2VSZWYgfSBmcm9tIFwiLi90eXBlc1wiO1xuXG5leHBvcnQgY2xhc3MgSW5wdXRNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgcHJpdmF0ZSByZWFkb25seSB2YWx1ZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG5cbiAgY29uc3RydWN0b3IoXG4gICAgYXBwOiBBcHAsXG4gICAgcHJpdmF0ZSByZWFkb25seSB0aXRsZTogc3RyaW5nLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgZmllbGRzOiBNb2RhbEZpZWxkW10sXG4gICAgcHJpdmF0ZSByZWFkb25seSBvblN1Ym1pdDogKHZhbHVlczogUmVjb3JkPHN0cmluZywgc3RyaW5nPikgPT4gdm9pZFxuICApIHtcbiAgICBzdXBlcihhcHApO1xuICAgIHRoaXMudmFsdWVzID0gZmllbGRzLnJlZHVjZTxSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+PigoYWNjLCBmaWVsZCkgPT4ge1xuICAgICAgYWNjW2ZpZWxkLmtleV0gPSBmaWVsZC52YWx1ZSA/PyBcIlwiO1xuICAgICAgcmV0dXJuIGFjYztcbiAgICB9LCB7fSk7XG4gIH1cblxuICBvbk9wZW4oKTogdm9pZCB7XG4gICAgdGhpcy50aXRsZUVsLnNldFRleHQodGhpcy50aXRsZSk7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICBmb3IgKGNvbnN0IGZpZWxkIG9mIHRoaXMuZmllbGRzKSB7XG4gICAgICBuZXcgU2V0dGluZyh0aGlzLmNvbnRlbnRFbClcbiAgICAgICAgLnNldE5hbWUoZmllbGQubGFiZWwpXG4gICAgICAgIC5zZXREZXNjKGZpZWxkLm9wdGlvbmFsID8gXCJPcHRpb25hbFwiIDogXCJcIilcbiAgICAgICAgLmFkZFRleHQoKHRleHQpID0+IHtcbiAgICAgICAgICB0ZXh0LnNldFBsYWNlaG9sZGVyKGZpZWxkLnBsYWNlaG9sZGVyID8/IFwiXCIpO1xuICAgICAgICAgIHRleHQuc2V0VmFsdWUodGhpcy52YWx1ZXNbZmllbGQua2V5XSA/PyBcIlwiKTtcbiAgICAgICAgICB0ZXh0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgdGhpcy52YWx1ZXNbZmllbGQua2V5XSA9IHZhbHVlO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgbmV3IFNldHRpbmcodGhpcy5jb250ZW50RWwpLmFkZEJ1dHRvbigoYnV0dG9uKSA9PiB7XG4gICAgICBidXR0b24uc2V0QnV0dG9uVGV4dChcIkNvbmZpcm1cIikuc2V0Q3RhKCkub25DbGljaygoKSA9PiB7XG4gICAgICAgIHRoaXMub25TdWJtaXQodGhpcy52YWx1ZXMpO1xuICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIG9uQ2xvc2UoKTogdm9pZCB7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gb3BlbklucHV0TW9kYWwoXG4gIGFwcDogQXBwLFxuICB0aXRsZTogc3RyaW5nLFxuICBmaWVsZHM6IE1vZGFsRmllbGRbXVxuKTogUHJvbWlzZTxSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+IHwgbnVsbD4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICBsZXQgc2V0dGxlZCA9IGZhbHNlO1xuICAgIGNvbnN0IG1vZGFsID0gbmV3IElucHV0TW9kYWwoYXBwLCB0aXRsZSwgZmllbGRzLCAodmFsdWVzKSA9PiB7XG4gICAgICBzZXR0bGVkID0gdHJ1ZTtcbiAgICAgIHJlc29sdmUodmFsdWVzKTtcbiAgICB9KTtcbiAgICBjb25zdCBvcmlnaW5hbENsb3NlID0gbW9kYWwub25DbG9zZS5iaW5kKG1vZGFsKTtcbiAgICBtb2RhbC5vbkNsb3NlID0gKCkgPT4ge1xuICAgICAgb3JpZ2luYWxDbG9zZSgpO1xuICAgICAgaWYgKCFzZXR0bGVkKSB7XG4gICAgICAgIHJlc29sdmUobnVsbCk7XG4gICAgICB9XG4gICAgfTtcbiAgICBtb2RhbC5vcGVuKCk7XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGlja0xvY2FsRmlsZSgpOiBQcm9taXNlPEZpbGUgfCBudWxsPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIGNvbnN0IGlucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlucHV0XCIpO1xuICAgIGlucHV0LnR5cGUgPSBcImZpbGVcIjtcbiAgICBpbnB1dC5hY2NlcHQgPSBcIi5wZGYsLnR4dCwubWQsLm1hcmtkb3duXCI7XG4gICAgaW5wdXQub25jaGFuZ2UgPSAoKSA9PiByZXNvbHZlKGlucHV0LmZpbGVzPy5bMF0gPz8gbnVsbCk7XG4gICAgaW5wdXQuY2xpY2soKTtcbiAgfSk7XG59XG5cbmV4cG9ydCBjbGFzcyBWYXVsdEZpbGVQaWNrZXJNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgcHJpdmF0ZSByZWFkb25seSBmaWxlczogVEZpbGVbXTtcblxuICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcHJpdmF0ZSByZWFkb25seSB0aXRsZTogc3RyaW5nLCBwcml2YXRlIHJlYWRvbmx5IG9uUGljazogKGZpbGU6IFRGaWxlKSA9PiB2b2lkKSB7XG4gICAgc3VwZXIoYXBwKTtcbiAgICB0aGlzLmZpbGVzID0gbGlzdFZhdWx0Q2FuZGlkYXRlRmlsZXMoYXBwKTtcbiAgfVxuXG4gIG9uT3BlbigpOiB2b2lkIHtcbiAgICB0aGlzLnRpdGxlRWwuc2V0VGV4dCh0aGlzLnRpdGxlKTtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIGlmICghdGhpcy5maWxlcy5sZW5ndGgpIHtcbiAgICAgIHRoaXMuY29udGVudEVsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IFwiTm8gUERGIG9yIHRleHQgZmlsZXMgZm91bmQgaW4gdGhlIHZhdWx0LlwiIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmZpbGVzLmZvckVhY2goKGZpbGUpID0+IHtcbiAgICAgIG5ldyBTZXR0aW5nKHRoaXMuY29udGVudEVsKVxuICAgICAgICAuc2V0TmFtZShmaWxlLnBhdGgpXG4gICAgICAgIC5zZXREZXNjKGZpbGUuZXh0ZW5zaW9uLnRvTG93ZXJDYXNlKCkpXG4gICAgICAgIC5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xuICAgICAgICAgIGJ1dHRvbi5zZXRCdXR0b25UZXh0KFwiU2VsZWN0XCIpLnNldEN0YSgpLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5vblBpY2soZmlsZSk7XG4gICAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgb25DbG9zZSgpOiB2b2lkIHtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwaWNrVmF1bHRGaWxlKGFwcDogQXBwLCB0aXRsZTogc3RyaW5nKTogUHJvbWlzZTxURmlsZSB8IG51bGw+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgbGV0IHNldHRsZWQgPSBmYWxzZTtcbiAgICBjb25zdCBtb2RhbCA9IG5ldyBWYXVsdEZpbGVQaWNrZXJNb2RhbChhcHAsIHRpdGxlLCAoZmlsZSkgPT4ge1xuICAgICAgc2V0dGxlZCA9IHRydWU7XG4gICAgICByZXNvbHZlKGZpbGUpO1xuICAgIH0pO1xuICAgIGNvbnN0IG9yaWdpbmFsQ2xvc2UgPSBtb2RhbC5vbkNsb3NlLmJpbmQobW9kYWwpO1xuICAgIG1vZGFsLm9uQ2xvc2UgPSAoKSA9PiB7XG4gICAgICBvcmlnaW5hbENsb3NlKCk7XG4gICAgICBpZiAoIXNldHRsZWQpIHtcbiAgICAgICAgcmVzb2x2ZShudWxsKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIG1vZGFsLm9wZW4oKTtcbiAgfSk7XG59XG5cbmV4cG9ydCBjbGFzcyBTb3VyY2VPcmlnaW5Nb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHByaXZhdGUgcmVhZG9ubHkgb25QaWNrOiAob3JpZ2luOiBcInZhdWx0XCIgfCBcImV4dGVybmFsXCIpID0+IHZvaWQpIHtcbiAgICBzdXBlcihhcHApO1xuICB9XG5cbiAgb25PcGVuKCk6IHZvaWQge1xuICAgIHRoaXMudGl0bGVFbC5zZXRUZXh0KFwiQWRkIFNvdXJjZSBGaWxlXCIpO1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gICAgbmV3IFNldHRpbmcodGhpcy5jb250ZW50RWwpXG4gICAgICAuc2V0TmFtZShcIlZhdWx0IGZpbGVcIilcbiAgICAgIC5zZXREZXNjKFwiUGljayBhIGZpbGUgYWxyZWFkeSBpbiB5b3VyIHZhdWx0XCIpXG4gICAgICAuYWRkQnV0dG9uKChidG4pID0+IGJ0bi5zZXRCdXR0b25UZXh0KFwiQ2hvb3NlXCIpLnNldEN0YSgpLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICB0aGlzLm9uUGljayhcInZhdWx0XCIpO1xuICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICB9KSk7XG4gICAgbmV3IFNldHRpbmcodGhpcy5jb250ZW50RWwpXG4gICAgICAuc2V0TmFtZShcIkV4dGVybmFsIGZpbGVcIilcbiAgICAgIC5zZXREZXNjKFwiSW1wb3J0IGEgZmlsZSBmcm9tIHlvdXIgY29tcHV0ZXIgXHUyMDE0IHNhdmVkIGludG8gYSBzb3VyY2VzLyBzdWJmb2xkZXIgbmV4dCB0byB0aGlzIG5vdGVcIilcbiAgICAgIC5hZGRCdXR0b24oKGJ0bikgPT4gYnRuLnNldEJ1dHRvblRleHQoXCJJbXBvcnRcIikuc2V0Q3RhKCkub25DbGljaygoKSA9PiB7XG4gICAgICAgIHRoaXMub25QaWNrKFwiZXh0ZXJuYWxcIik7XG4gICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgIH0pKTtcbiAgfVxuXG4gIG9uQ2xvc2UoKTogdm9pZCB7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcGlja1NvdXJjZU9yaWdpbihhcHA6IEFwcCk6IFByb21pc2U8XCJ2YXVsdFwiIHwgXCJleHRlcm5hbFwiIHwgbnVsbD4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICBsZXQgc2V0dGxlZCA9IGZhbHNlO1xuICAgIGNvbnN0IG1vZGFsID0gbmV3IFNvdXJjZU9yaWdpbk1vZGFsKGFwcCwgKG9yaWdpbikgPT4ge1xuICAgICAgc2V0dGxlZCA9IHRydWU7XG4gICAgICByZXNvbHZlKG9yaWdpbik7XG4gICAgfSk7XG4gICAgY29uc3Qgb3JpZ2luYWxDbG9zZSA9IG1vZGFsLm9uQ2xvc2UuYmluZChtb2RhbCk7XG4gICAgbW9kYWwub25DbG9zZSA9ICgpID0+IHtcbiAgICAgIG9yaWdpbmFsQ2xvc2UoKTtcbiAgICAgIGlmICghc2V0dGxlZCkgcmVzb2x2ZShudWxsKTtcbiAgICB9O1xuICAgIG1vZGFsLm9wZW4oKTtcbiAgfSk7XG59XG5cbmV4cG9ydCBjbGFzcyBTb3VyY2VQaWNrZXJNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgY29uc3RydWN0b3IoXG4gICAgYXBwOiBBcHAsXG4gICAgcHJpdmF0ZSByZWFkb25seSB0aXRsZTogc3RyaW5nLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgc291cmNlczogU291cmNlUmVmW10sXG4gICAgcHJpdmF0ZSByZWFkb25seSBvblBpY2s6IChyZWY6IFNvdXJjZVJlZikgPT4gdm9pZFxuICApIHtcbiAgICBzdXBlcihhcHApO1xuICB9XG5cbiAgb25PcGVuKCk6IHZvaWQge1xuICAgIHRoaXMudGl0bGVFbC5zZXRUZXh0KHRoaXMudGl0bGUpO1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gICAgdGhpcy5zb3VyY2VzLmZvckVhY2goKHNvdXJjZSkgPT4ge1xuICAgICAgbmV3IFNldHRpbmcodGhpcy5jb250ZW50RWwpXG4gICAgICAgIC5zZXROYW1lKHNvdXJjZS5sYWJlbClcbiAgICAgICAgLnNldERlc2MoYCR7c291cmNlLm1pbWVfdHlwZX0gfCAke2Rlc2NyaWJlU291cmNlUmVmKHNvdXJjZSl9YClcbiAgICAgICAgLmFkZEJ1dHRvbigoYnV0dG9uKSA9PiB7XG4gICAgICAgICAgYnV0dG9uLnNldEJ1dHRvblRleHQoXCJTZWxlY3RcIikuc2V0Q3RhKCkub25DbGljaygoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLm9uUGljayhzb3VyY2UpO1xuICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIG9uQ2xvc2UoKTogdm9pZCB7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcGlja1NvdXJjZVJlZihhcHA6IEFwcCwgdGl0bGU6IHN0cmluZywgc291cmNlczogU291cmNlUmVmW10pOiBQcm9taXNlPFNvdXJjZVJlZiB8IG51bGw+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgbGV0IHNldHRsZWQgPSBmYWxzZTtcbiAgICBjb25zdCBtb2RhbCA9IG5ldyBTb3VyY2VQaWNrZXJNb2RhbChhcHAsIHRpdGxlLCBzb3VyY2VzLCAocmVmKSA9PiB7XG4gICAgICBzZXR0bGVkID0gdHJ1ZTtcbiAgICAgIHJlc29sdmUocmVmKTtcbiAgICB9KTtcbiAgICBjb25zdCBvcmlnaW5hbENsb3NlID0gbW9kYWwub25DbG9zZS5iaW5kKG1vZGFsKTtcbiAgICBtb2RhbC5vbkNsb3NlID0gKCkgPT4ge1xuICAgICAgb3JpZ2luYWxDbG9zZSgpO1xuICAgICAgaWYgKCFzZXR0bGVkKSB7XG4gICAgICAgIHJlc29sdmUobnVsbCk7XG4gICAgICB9XG4gICAgfTtcbiAgICBtb2RhbC5vcGVuKCk7XG4gIH0pO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFF1aWNrTWVudUl0ZW0ge1xuICBsYWJlbDogc3RyaW5nO1xuICBjb21tYW5kSWQ6IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIFF1aWNrTWVudU1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICBwcml2YXRlIHJlYWRvbmx5IGl0ZW1zOiBRdWlja01lbnVJdGVtW107XG5cbiAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHByaXZhdGUgcmVhZG9ubHkgcGx1Z2luOiBQbHVnaW4pIHtcbiAgICBzdXBlcihhcHApO1xuICAgIHRoaXMuaXRlbXMgPSBbXG4gICAgICB7IGxhYmVsOiBcIlN0YXJ0IFNjZW5lXCIsICAgICAgICAgICBjb21tYW5kSWQ6IFwic3lieWw6c3RhcnQtc2NlbmVcIiB9LFxuICAgICAgeyBsYWJlbDogXCJEZWNsYXJlIEFjdGlvblwiLCAgICAgICAgY29tbWFuZElkOiBcInN5YnlsOmRlY2xhcmUtYWN0aW9uXCIgfSxcbiAgICAgIHsgbGFiZWw6IFwiQXNrIE9yYWNsZVwiLCAgICAgICAgICAgIGNvbW1hbmRJZDogXCJzeWJ5bDphc2stb3JhY2xlXCIgfSxcbiAgICAgIHsgbGFiZWw6IFwiSW50ZXJwcmV0IE9yYWNsZSBSb2xsXCIsIGNvbW1hbmRJZDogXCJzeWJ5bDppbnRlcnByZXQtb3JhY2xlLXJvbGxcIiB9LFxuICAgICAgeyBsYWJlbDogXCJXaGF0IE5vd1wiLCAgICAgICAgICAgICAgY29tbWFuZElkOiBcInN5YnlsOndoYXQtbm93XCIgfSxcbiAgICAgIHsgbGFiZWw6IFwiV2hhdCBDYW4gSSBEb1wiLCAgICAgICAgIGNvbW1hbmRJZDogXCJzeWJ5bDp3aGF0LWNhbi1pLWRvXCIgfSxcbiAgICAgIHsgbGFiZWw6IFwiRXhwYW5kIFNjZW5lXCIsICAgICAgICAgIGNvbW1hbmRJZDogXCJzeWJ5bDpleHBhbmQtc2NlbmVcIiB9XG4gICAgXTtcbiAgfVxuXG4gIG9uT3BlbigpOiB2b2lkIHtcbiAgICB0aGlzLnRpdGxlRWwuc2V0VGV4dChcIlN5YnlsXCIpO1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gICAgZm9yIChjb25zdCBpdGVtIG9mIHRoaXMuaXRlbXMpIHtcbiAgICAgIG5ldyBTZXR0aW5nKHRoaXMuY29udGVudEVsKVxuICAgICAgICAuc2V0TmFtZShpdGVtLmxhYmVsKVxuICAgICAgICAuYWRkQnV0dG9uKChidG4pID0+XG4gICAgICAgICAgYnRuLnNldEJ1dHRvblRleHQoXCJSdW5cIikuc2V0Q3RhKCkub25DbGljaygoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgICAgICAgICAgKHRoaXMucGx1Z2luLmFwcCBhcyBhbnkpLmNvbW1hbmRzLmV4ZWN1dGVDb21tYW5kQnlJZChpdGVtLmNvbW1hbmRJZCk7XG4gICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICB9XG4gIH1cblxuICBvbkNsb3NlKCk6IHZvaWQge1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIE1hbmFnZVNvdXJjZXNNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgY29uc3RydWN0b3IoXG4gICAgYXBwOiBBcHAsXG4gICAgcHJpdmF0ZSByZWFkb25seSBzb3VyY2VzOiBTb3VyY2VSZWZbXSxcbiAgICBwcml2YXRlIHJlYWRvbmx5IG9uUmVtb3ZlOiAocmVmOiBTb3VyY2VSZWYpID0+IFByb21pc2U8dm9pZD5cbiAgKSB7XG4gICAgc3VwZXIoYXBwKTtcbiAgfVxuXG4gIG9uT3BlbigpOiB2b2lkIHtcbiAgICB0aGlzLnRpdGxlRWwuc2V0VGV4dChcIk1hbmFnZSBTb3VyY2VzXCIpO1xuICAgIHRoaXMucmVuZGVyKCk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlcigpOiB2b2lkIHtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIGlmICghdGhpcy5zb3VyY2VzLmxlbmd0aCkge1xuICAgICAgdGhpcy5jb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogXCJObyBzb3VyY2VzIGFyZSBhdHRhY2hlZCB0byB0aGlzIG5vdGUuXCIgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuc291cmNlcy5mb3JFYWNoKChzb3VyY2UpID0+IHtcbiAgICAgIG5ldyBTZXR0aW5nKHRoaXMuY29udGVudEVsKVxuICAgICAgICAuc2V0TmFtZShzb3VyY2UubGFiZWwpXG4gICAgICAgIC5zZXREZXNjKGAke3NvdXJjZS5taW1lX3R5cGV9IHwgJHtkZXNjcmliZVNvdXJjZVJlZihzb3VyY2UpfWApXG4gICAgICAgIC5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xuICAgICAgICAgIGJ1dHRvbi5zZXRCdXR0b25UZXh0KFwiUmVtb3ZlXCIpLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5vblJlbW92ZShzb3VyY2UpO1xuICAgICAgICAgICAgbmV3IE5vdGljZShgUmVtb3ZlZCAnJHtzb3VyY2UubGFiZWx9Jy5gKTtcbiAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBvbkNsb3NlKCk6IHZvaWQge1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gIH1cbn1cblxuIiwgImltcG9ydCB7IEFwcCwgTm90aWNlLCBQbHVnaW5TZXR0aW5nVGFiLCBTZXR0aW5nIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgdHlwZSBTeWJ5bFBsdWdpbiBmcm9tIFwiLi9tYWluXCI7XG5pbXBvcnQgeyBnZXRQcm92aWRlciB9IGZyb20gXCIuL3Byb3ZpZGVyc1wiO1xuaW1wb3J0IHsgT2xsYW1hUHJvdmlkZXIgfSBmcm9tIFwiLi9wcm92aWRlcnMvb2xsYW1hXCI7XG5pbXBvcnQgeyBQcm92aWRlcklELCBTeWJ5bFNldHRpbmdzLCBWYWxpZGF0aW9uU3RhdGUgfSBmcm9tIFwiLi90eXBlc1wiO1xuXG5leHBvcnQgY29uc3QgREVGQVVMVF9TRVRUSU5HUzogU3lieWxTZXR0aW5ncyA9IHtcbiAgYWN0aXZlUHJvdmlkZXI6IFwiZ2VtaW5pXCIsXG4gIHByb3ZpZGVyczoge1xuICAgIGdlbWluaTogeyBhcGlLZXk6IFwiXCIsIGRlZmF1bHRNb2RlbDogXCJnZW1pbmktMi41LWZsYXNoXCIgfSxcbiAgICBvcGVuYWk6IHsgYXBpS2V5OiBcIlwiLCBkZWZhdWx0TW9kZWw6IFwiZ3B0LTUuMlwiLCBiYXNlVXJsOiBcImh0dHBzOi8vYXBpLm9wZW5haS5jb20vdjFcIiB9LFxuICAgIGFudGhyb3BpYzogeyBhcGlLZXk6IFwiXCIsIGRlZmF1bHRNb2RlbDogXCJjbGF1ZGUtc29ubmV0LTQtNlwiIH0sXG4gICAgb2xsYW1hOiB7IGJhc2VVcmw6IFwiaHR0cDovL2xvY2FsaG9zdDoxMTQzNFwiLCBkZWZhdWx0TW9kZWw6IFwiZ2VtbWEzXCIgfSxcbiAgICBvcGVucm91dGVyOiB7IGFwaUtleTogXCJcIiwgZGVmYXVsdE1vZGVsOiBcIm1ldGEtbGxhbWEvbGxhbWEtMy4zLTcwYi1pbnN0cnVjdDpmcmVlXCIgfVxuICB9LFxuICBpbnNlcnRpb25Nb2RlOiBcImN1cnNvclwiLFxuICBzaG93VG9rZW5Db3VudDogZmFsc2UsXG4gIGRlZmF1bHRUZW1wZXJhdHVyZTogMC43LFxuICBsb25lbG9nTW9kZTogZmFsc2UsXG4gIGxvbmVsb2dDb250ZXh0RGVwdGg6IDYwLFxuICBsb25lbG9nV3JhcENvZGVCbG9jazogdHJ1ZSxcbiAgbG9uZWxvZ0F1dG9JbmNTY2VuZTogdHJ1ZVxufTtcblxuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZVNldHRpbmdzKHJhdzogUGFydGlhbDxTeWJ5bFNldHRpbmdzPiB8IG51bGwgfCB1bmRlZmluZWQpOiBTeWJ5bFNldHRpbmdzIHtcbiAgcmV0dXJuIHtcbiAgICAuLi5ERUZBVUxUX1NFVFRJTkdTLFxuICAgIC4uLihyYXcgPz8ge30pLFxuICAgIHByb3ZpZGVyczoge1xuICAgICAgZ2VtaW5pOiB7IC4uLkRFRkFVTFRfU0VUVElOR1MucHJvdmlkZXJzLmdlbWluaSwgLi4uKHJhdz8ucHJvdmlkZXJzPy5nZW1pbmkgPz8ge30pIH0sXG4gICAgICBvcGVuYWk6IHsgLi4uREVGQVVMVF9TRVRUSU5HUy5wcm92aWRlcnMub3BlbmFpLCAuLi4ocmF3Py5wcm92aWRlcnM/Lm9wZW5haSA/PyB7fSkgfSxcbiAgICAgIGFudGhyb3BpYzogeyAuLi5ERUZBVUxUX1NFVFRJTkdTLnByb3ZpZGVycy5hbnRocm9waWMsIC4uLihyYXc/LnByb3ZpZGVycz8uYW50aHJvcGljID8/IHt9KSB9LFxuICAgICAgb2xsYW1hOiB7IC4uLkRFRkFVTFRfU0VUVElOR1MucHJvdmlkZXJzLm9sbGFtYSwgLi4uKHJhdz8ucHJvdmlkZXJzPy5vbGxhbWEgPz8ge30pIH0sXG4gICAgICBvcGVucm91dGVyOiB7IC4uLkRFRkFVTFRfU0VUVElOR1MucHJvdmlkZXJzLm9wZW5yb3V0ZXIsIC4uLihyYXc/LnByb3ZpZGVycz8ub3BlbnJvdXRlciA/PyB7fSkgfVxuICAgIH1cbiAgfTtcbn1cblxuZXhwb3J0IGNsYXNzIFN5YnlsU2V0dGluZ1RhYiBleHRlbmRzIFBsdWdpblNldHRpbmdUYWIge1xuICBwcml2YXRlIHZhbGlkYXRpb246IFBhcnRpYWw8UmVjb3JkPFByb3ZpZGVySUQsIFZhbGlkYXRpb25TdGF0ZT4+ID0ge307XG4gIHByaXZhdGUgb2xsYW1hTW9kZWxzOiBzdHJpbmdbXSA9IFtdO1xuICBwcml2YXRlIG1vZGVsQ2FjaGU6IFBhcnRpYWw8UmVjb3JkPFByb3ZpZGVySUQsIHN0cmluZ1tdPj4gPSB7fTtcbiAgcHJpdmF0ZSBmZXRjaGluZ1Byb3ZpZGVycyA9IG5ldyBTZXQ8UHJvdmlkZXJJRD4oKTtcblxuICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcHJpdmF0ZSByZWFkb25seSBwbHVnaW46IFN5YnlsUGx1Z2luKSB7XG4gICAgc3VwZXIoYXBwLCBwbHVnaW4pO1xuICB9XG5cbiAgZGlzcGxheSgpOiB2b2lkIHtcbiAgICBjb25zdCB7IGNvbnRhaW5lckVsIH0gPSB0aGlzO1xuICAgIGNvbnRhaW5lckVsLmVtcHR5KCk7XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IGBTeWJ5bCBTZXR0aW5ncyAoJHt0aGlzLnByb3ZpZGVyTGFiZWwodGhpcy5wbHVnaW4uc2V0dGluZ3MuYWN0aXZlUHJvdmlkZXIpfSlgIH0pO1xuICAgIHRoaXMubWF5YmVGZXRjaE1vZGVscygpO1xuICAgIHRoaXMucmVuZGVyQWN0aXZlUHJvdmlkZXIoY29udGFpbmVyRWwpO1xuICAgIHRoaXMucmVuZGVyUHJvdmlkZXJDb25maWcoY29udGFpbmVyRWwpO1xuICAgIHRoaXMucmVuZGVyR2xvYmFsU2V0dGluZ3MoY29udGFpbmVyRWwpO1xuICB9XG5cbiAgcHJpdmF0ZSBtYXliZUZldGNoTW9kZWxzKCk6IHZvaWQge1xuICAgIGNvbnN0IGFjdGl2ZSA9IHRoaXMucGx1Z2luLnNldHRpbmdzLmFjdGl2ZVByb3ZpZGVyO1xuICAgIGlmIChhY3RpdmUgPT09IFwib2xsYW1hXCIpIHJldHVybjtcbiAgICBjb25zdCBjb25maWcgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcm92aWRlcnNbYWN0aXZlXTtcbiAgICBjb25zdCBhcGlLZXkgPSAoY29uZmlnIGFzIHsgYXBpS2V5Pzogc3RyaW5nIH0pLmFwaUtleT8udHJpbSgpO1xuICAgIGlmIChhcGlLZXkgJiYgIXRoaXMubW9kZWxDYWNoZVthY3RpdmVdICYmICF0aGlzLmZldGNoaW5nUHJvdmlkZXJzLmhhcyhhY3RpdmUpKSB7XG4gICAgICB2b2lkIHRoaXMuZmV0Y2hNb2RlbHMoYWN0aXZlKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGZldGNoTW9kZWxzKHByb3ZpZGVyOiBQcm92aWRlcklEKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5mZXRjaGluZ1Byb3ZpZGVycy5hZGQocHJvdmlkZXIpO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBtb2RlbHMgPSBhd2FpdCBnZXRQcm92aWRlcih0aGlzLnBsdWdpbi5zZXR0aW5ncywgcHJvdmlkZXIpLmxpc3RNb2RlbHMoKTtcbiAgICAgIGlmIChtb2RlbHMubGVuZ3RoID4gMCkge1xuICAgICAgICB0aGlzLm1vZGVsQ2FjaGVbcHJvdmlkZXJdID0gbW9kZWxzO1xuICAgICAgfVxuICAgIH0gY2F0Y2gge1xuICAgICAgLy8gc2lsZW50bHkgZmFpbCBcdTIwMTQgZHJvcGRvd24ga2VlcHMgc2hvd2luZyBjdXJyZW50IGRlZmF1bHRcbiAgICB9IGZpbmFsbHkge1xuICAgICAgdGhpcy5mZXRjaGluZ1Byb3ZpZGVycy5kZWxldGUocHJvdmlkZXIpO1xuICAgICAgdGhpcy5kaXNwbGF5KCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJBY3RpdmVQcm92aWRlcihjb250YWluZXJFbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiQWN0aXZlIFByb3ZpZGVyXCIpXG4gICAgICAuc2V0RGVzYyhcIlVzZWQgd2hlbiBhIG5vdGUgZG9lcyBub3Qgb3ZlcnJpZGUgcHJvdmlkZXIuXCIpXG4gICAgICAuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PiB7XG4gICAgICAgIGRyb3Bkb3duLmFkZE9wdGlvbihcImdlbWluaVwiLCBcIkdlbWluaVwiKTtcbiAgICAgICAgZHJvcGRvd24uYWRkT3B0aW9uKFwib3BlbmFpXCIsIFwiT3BlbkFJXCIpO1xuICAgICAgICBkcm9wZG93bi5hZGRPcHRpb24oXCJhbnRocm9waWNcIiwgXCJBbnRocm9waWMgKENsYXVkZSlcIik7XG4gICAgICAgIGRyb3Bkb3duLmFkZE9wdGlvbihcIm9sbGFtYVwiLCBcIk9sbGFtYSAobG9jYWwpXCIpO1xuICAgICAgICBkcm9wZG93bi5hZGRPcHRpb24oXCJvcGVucm91dGVyXCIsIFwiT3BlblJvdXRlclwiKTtcbiAgICAgICAgZHJvcGRvd24uc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuYWN0aXZlUHJvdmlkZXIpO1xuICAgICAgICBkcm9wZG93bi5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5hY3RpdmVQcm92aWRlciA9IHZhbHVlIGFzIFByb3ZpZGVySUQ7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgdGhpcy5kaXNwbGF5KCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlclByb3ZpZGVyQ29uZmlnKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIlByb3ZpZGVyIENvbmZpZ3VyYXRpb25cIiB9KTtcbiAgICBzd2l0Y2ggKHRoaXMucGx1Z2luLnNldHRpbmdzLmFjdGl2ZVByb3ZpZGVyKSB7XG4gICAgICBjYXNlIFwiZ2VtaW5pXCI6XG4gICAgICAgIHRoaXMucmVuZGVyR2VtaW5pU2V0dGluZ3MoY29udGFpbmVyRWwpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgXCJvcGVuYWlcIjpcbiAgICAgICAgdGhpcy5yZW5kZXJPcGVuQUlTZXR0aW5ncyhjb250YWluZXJFbCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcImFudGhyb3BpY1wiOlxuICAgICAgICB0aGlzLnJlbmRlckFudGhyb3BpY1NldHRpbmdzKGNvbnRhaW5lckVsKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwib2xsYW1hXCI6XG4gICAgICAgIHRoaXMucmVuZGVyT2xsYW1hU2V0dGluZ3MoY29udGFpbmVyRWwpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgXCJvcGVucm91dGVyXCI6XG4gICAgICAgIHRoaXMucmVuZGVyT3BlblJvdXRlclNldHRpbmdzKGNvbnRhaW5lckVsKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJHZW1pbmlTZXR0aW5ncyhjb250YWluZXJFbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgICBjb25zdCBjb25maWcgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcm92aWRlcnMuZ2VtaW5pO1xuICAgIHRoaXMucmVuZGVyVmFsaWRhdGlvblN0YXRlKGNvbnRhaW5lckVsLCBcImdlbWluaVwiKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiQVBJIEtleVwiKVxuICAgICAgLmFkZFRleHQoKHRleHQpID0+IHtcbiAgICAgICAgdGV4dC5pbnB1dEVsLnR5cGUgPSBcInBhc3N3b3JkXCI7XG4gICAgICAgIHRleHQuc2V0VmFsdWUoY29uZmlnLmFwaUtleSk7XG4gICAgICAgIHRleHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uZmlnLmFwaUtleSA9IHZhbHVlO1xuICAgICAgICAgIHRoaXMubW9kZWxDYWNoZS5nZW1pbmkgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0ZXh0LmlucHV0RWwuYWRkRXZlbnRMaXN0ZW5lcihcImJsdXJcIiwgKCkgPT4gdm9pZCB0aGlzLnZhbGlkYXRlUHJvdmlkZXIoXCJnZW1pbmlcIikpO1xuICAgICAgfSk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkRlZmF1bHQgTW9kZWxcIilcbiAgICAgIC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcbiAgICAgICAgY29uc3QgbW9kZWxzID0gdGhpcy5tb2RlbE9wdGlvbnNGb3IoXCJnZW1pbmlcIiwgY29uZmlnLmRlZmF1bHRNb2RlbCk7XG4gICAgICAgIG1vZGVscy5mb3JFYWNoKChtKSA9PiBkcm9wZG93bi5hZGRPcHRpb24obSwgbSkpO1xuICAgICAgICBkcm9wZG93bi5zZXRWYWx1ZShjb25maWcuZGVmYXVsdE1vZGVsKTtcbiAgICAgICAgZHJvcGRvd24ub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uZmlnLmRlZmF1bHRNb2RlbCA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJPcGVuQUlTZXR0aW5ncyhjb250YWluZXJFbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgICBjb25zdCBjb25maWcgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcm92aWRlcnMub3BlbmFpO1xuICAgIHRoaXMucmVuZGVyVmFsaWRhdGlvblN0YXRlKGNvbnRhaW5lckVsLCBcIm9wZW5haVwiKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiQVBJIEtleVwiKVxuICAgICAgLmFkZFRleHQoKHRleHQpID0+IHtcbiAgICAgICAgdGV4dC5pbnB1dEVsLnR5cGUgPSBcInBhc3N3b3JkXCI7XG4gICAgICAgIHRleHQuc2V0VmFsdWUoY29uZmlnLmFwaUtleSk7XG4gICAgICAgIHRleHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uZmlnLmFwaUtleSA9IHZhbHVlO1xuICAgICAgICAgIHRoaXMubW9kZWxDYWNoZS5vcGVuYWkgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0ZXh0LmlucHV0RWwuYWRkRXZlbnRMaXN0ZW5lcihcImJsdXJcIiwgKCkgPT4gdm9pZCB0aGlzLnZhbGlkYXRlUHJvdmlkZXIoXCJvcGVuYWlcIikpO1xuICAgICAgfSk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkJhc2UgVVJMXCIpXG4gICAgICAuc2V0RGVzYyhcIk92ZXJyaWRlIGZvciBBenVyZSBvciBwcm94eSBlbmRwb2ludHNcIilcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PiB7XG4gICAgICAgIHRleHQuc2V0VmFsdWUoY29uZmlnLmJhc2VVcmwpO1xuICAgICAgICB0ZXh0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGNvbmZpZy5iYXNlVXJsID0gdmFsdWU7XG4gICAgICAgICAgdGhpcy5tb2RlbENhY2hlLm9wZW5haSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRleHQuaW5wdXRFbC5hZGRFdmVudExpc3RlbmVyKFwiYmx1clwiLCAoKSA9PiB2b2lkIHRoaXMudmFsaWRhdGVQcm92aWRlcihcIm9wZW5haVwiKSk7XG4gICAgICB9KTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiRGVmYXVsdCBNb2RlbFwiKVxuICAgICAgLmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xuICAgICAgICBjb25zdCBtb2RlbHMgPSB0aGlzLm1vZGVsT3B0aW9uc0ZvcihcIm9wZW5haVwiLCBjb25maWcuZGVmYXVsdE1vZGVsKTtcbiAgICAgICAgbW9kZWxzLmZvckVhY2goKG0pID0+IGRyb3Bkb3duLmFkZE9wdGlvbihtLCBtKSk7XG4gICAgICAgIGRyb3Bkb3duLnNldFZhbHVlKGNvbmZpZy5kZWZhdWx0TW9kZWwpO1xuICAgICAgICBkcm9wZG93bi5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICBjb25maWcuZGVmYXVsdE1vZGVsID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJwXCIsIHtcbiAgICAgIHRleHQ6IFwiT3BlbkFJIHNvdXJjZXMgdXNlIHZhdWx0X3BhdGguIEFkZCBzb3VyY2UgZmlsZXMgdmlhIHRoZSBNYW5hZ2UgU291cmNlcyBjb21tYW5kIGluIGFueSBub3RlLlwiXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlckFudGhyb3BpY1NldHRpbmdzKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIGNvbnN0IGNvbmZpZyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnByb3ZpZGVycy5hbnRocm9waWM7XG4gICAgdGhpcy5yZW5kZXJWYWxpZGF0aW9uU3RhdGUoY29udGFpbmVyRWwsIFwiYW50aHJvcGljXCIpO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJBUEkgS2V5XCIpXG4gICAgICAuYWRkVGV4dCgodGV4dCkgPT4ge1xuICAgICAgICB0ZXh0LmlucHV0RWwudHlwZSA9IFwicGFzc3dvcmRcIjtcbiAgICAgICAgdGV4dC5zZXRWYWx1ZShjb25maWcuYXBpS2V5KTtcbiAgICAgICAgdGV4dC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICBjb25maWcuYXBpS2V5ID0gdmFsdWU7XG4gICAgICAgICAgdGhpcy5tb2RlbENhY2hlLmFudGhyb3BpYyA9IHVuZGVmaW5lZDtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRleHQuaW5wdXRFbC5hZGRFdmVudExpc3RlbmVyKFwiYmx1clwiLCAoKSA9PiB2b2lkIHRoaXMudmFsaWRhdGVQcm92aWRlcihcImFudGhyb3BpY1wiKSk7XG4gICAgICB9KTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiRGVmYXVsdCBNb2RlbFwiKVxuICAgICAgLmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xuICAgICAgICBjb25zdCBtb2RlbHMgPSB0aGlzLm1vZGVsT3B0aW9uc0ZvcihcImFudGhyb3BpY1wiLCBjb25maWcuZGVmYXVsdE1vZGVsKTtcbiAgICAgICAgbW9kZWxzLmZvckVhY2goKG0pID0+IGRyb3Bkb3duLmFkZE9wdGlvbihtLCBtKSk7XG4gICAgICAgIGRyb3Bkb3duLnNldFZhbHVlKGNvbmZpZy5kZWZhdWx0TW9kZWwpO1xuICAgICAgICBkcm9wZG93bi5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICBjb25maWcuZGVmYXVsdE1vZGVsID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJwXCIsIHtcbiAgICAgIHRleHQ6IFwiUERGcyBhcmUgZW5jb2RlZCBpbmxpbmUgcGVyIHJlcXVlc3QuIFVzZSBzaG9ydCBleGNlcnB0cyB0byBhdm9pZCBoaWdoIHRva2VuIGNvc3RzLlwiXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlck9wZW5Sb3V0ZXJTZXR0aW5ncyhjb250YWluZXJFbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgICBjb25zdCBjb25maWcgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcm92aWRlcnMub3BlbnJvdXRlcjtcbiAgICB0aGlzLnJlbmRlclZhbGlkYXRpb25TdGF0ZShjb250YWluZXJFbCwgXCJvcGVucm91dGVyXCIpO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJBUEkgS2V5XCIpXG4gICAgICAuYWRkVGV4dCgodGV4dCkgPT4ge1xuICAgICAgICB0ZXh0LmlucHV0RWwudHlwZSA9IFwicGFzc3dvcmRcIjtcbiAgICAgICAgdGV4dC5zZXRWYWx1ZShjb25maWcuYXBpS2V5KTtcbiAgICAgICAgdGV4dC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICBjb25maWcuYXBpS2V5ID0gdmFsdWU7XG4gICAgICAgICAgdGhpcy5tb2RlbENhY2hlLm9wZW5yb3V0ZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0ZXh0LmlucHV0RWwuYWRkRXZlbnRMaXN0ZW5lcihcImJsdXJcIiwgKCkgPT4gdm9pZCB0aGlzLnZhbGlkYXRlUHJvdmlkZXIoXCJvcGVucm91dGVyXCIpKTtcbiAgICAgIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJEZWZhdWx0IE1vZGVsXCIpXG4gICAgICAuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PiB7XG4gICAgICAgIGNvbnN0IG1vZGVscyA9IHRoaXMubW9kZWxPcHRpb25zRm9yKFwib3BlbnJvdXRlclwiLCBjb25maWcuZGVmYXVsdE1vZGVsKTtcbiAgICAgICAgbW9kZWxzLmZvckVhY2goKG0pID0+IGRyb3Bkb3duLmFkZE9wdGlvbihtLCBtKSk7XG4gICAgICAgIGRyb3Bkb3duLnNldFZhbHVlKGNvbmZpZy5kZWZhdWx0TW9kZWwpO1xuICAgICAgICBkcm9wZG93bi5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICBjb25maWcuZGVmYXVsdE1vZGVsID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJwXCIsIHtcbiAgICAgIHRleHQ6IFwiT3BlblJvdXRlciBwcm92aWRlcyBhY2Nlc3MgdG8gbWFueSBmcmVlIGFuZCBwYWlkIG1vZGVscyB2aWEgYSB1bmlmaWVkIEFQSS4gRnJlZSBtb2RlbHMgaGF2ZSAnOmZyZWUnIGluIHRoZWlyIElELlwiXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlck9sbGFtYVNldHRpbmdzKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIGNvbnN0IGNvbmZpZyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnByb3ZpZGVycy5vbGxhbWE7XG4gICAgdGhpcy5yZW5kZXJWYWxpZGF0aW9uU3RhdGUoY29udGFpbmVyRWwsIFwib2xsYW1hXCIpO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJCYXNlIFVSTFwiKVxuICAgICAgLmFkZFRleHQoKHRleHQpID0+IHtcbiAgICAgICAgdGV4dC5zZXRWYWx1ZShjb25maWcuYmFzZVVybCk7XG4gICAgICAgIHRleHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uZmlnLmJhc2VVcmwgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRleHQuaW5wdXRFbC5hZGRFdmVudExpc3RlbmVyKFwiYmx1clwiLCAoKSA9PiB2b2lkIHRoaXMudmFsaWRhdGVPbGxhbWEoKSk7XG4gICAgICB9KTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiQXZhaWxhYmxlIE1vZGVsc1wiKVxuICAgICAgLmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xuICAgICAgICBjb25zdCBvcHRpb25zID0gdGhpcy5vbGxhbWFNb2RlbHMubGVuZ3RoID8gdGhpcy5vbGxhbWFNb2RlbHMgOiBbY29uZmlnLmRlZmF1bHRNb2RlbF07XG4gICAgICAgIG9wdGlvbnMuZm9yRWFjaCgobW9kZWwpID0+IGRyb3Bkb3duLmFkZE9wdGlvbihtb2RlbCwgbW9kZWwpKTtcbiAgICAgICAgZHJvcGRvd24uc2V0VmFsdWUob3B0aW9ucy5pbmNsdWRlcyhjb25maWcuZGVmYXVsdE1vZGVsKSA/IGNvbmZpZy5kZWZhdWx0TW9kZWwgOiBvcHRpb25zWzBdKTtcbiAgICAgICAgZHJvcGRvd24ub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uZmlnLmRlZmF1bHRNb2RlbCA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgIHRoaXMuZGlzcGxheSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJEZWZhdWx0IE1vZGVsXCIpXG4gICAgICAuYWRkVGV4dCgodGV4dCkgPT4ge1xuICAgICAgICB0ZXh0LnNldFZhbHVlKGNvbmZpZy5kZWZhdWx0TW9kZWwpO1xuICAgICAgICB0ZXh0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGNvbmZpZy5kZWZhdWx0TW9kZWwgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcInBcIiwge1xuICAgICAgdGV4dDogXCJObyBBUEkga2V5IHJlcXVpcmVkLiBPbGxhbWEgbXVzdCBiZSBydW5uaW5nIGxvY2FsbHkuIEZpbGUgZ3JvdW5kaW5nIHVzZXMgdmF1bHRfcGF0aCB0ZXh0IGV4dHJhY3Rpb24uXCJcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyR2xvYmFsU2V0dGluZ3MoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiR2xvYmFsIFNldHRpbmdzXCIgfSk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkRlZmF1bHQgVGVtcGVyYXR1cmVcIilcbiAgICAgIC5zZXREZXNjKFN0cmluZyh0aGlzLnBsdWdpbi5zZXR0aW5ncy5kZWZhdWx0VGVtcGVyYXR1cmUpKVxuICAgICAgLmFkZFNsaWRlcigoc2xpZGVyKSA9PiB7XG4gICAgICAgIHNsaWRlci5zZXRMaW1pdHMoMCwgMSwgMC4wNSk7XG4gICAgICAgIHNsaWRlci5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5kZWZhdWx0VGVtcGVyYXR1cmUpO1xuICAgICAgICBzbGlkZXIub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVmYXVsdFRlbXBlcmF0dXJlID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgdGhpcy5kaXNwbGF5KCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkluc2VydGlvbiBNb2RlXCIpXG4gICAgICAuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PiB7XG4gICAgICAgIGRyb3Bkb3duLmFkZE9wdGlvbihcImN1cnNvclwiLCBcIkF0IGN1cnNvclwiKTtcbiAgICAgICAgZHJvcGRvd24uYWRkT3B0aW9uKFwiZW5kLW9mLW5vdGVcIiwgXCJFbmQgb2Ygbm90ZVwiKTtcbiAgICAgICAgZHJvcGRvd24uc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuaW5zZXJ0aW9uTW9kZSk7XG4gICAgICAgIGRyb3Bkb3duLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmluc2VydGlvbk1vZGUgPSB2YWx1ZSBhcyBcImN1cnNvclwiIHwgXCJlbmQtb2Ytbm90ZVwiO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJTaG93IFRva2VuIENvdW50XCIpXG4gICAgICAuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcbiAgICAgICAgdG9nZ2xlLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLnNob3dUb2tlbkNvdW50KTtcbiAgICAgICAgdG9nZ2xlLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnNob3dUb2tlbkNvdW50ID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkxvbmVsb2cgTW9kZVwiKVxuICAgICAgLnNldERlc2MoXCJFbmFibGUgTG9uZWxvZyBub3RhdGlvbiwgY29udGV4dCBwYXJzaW5nLCBhbmQgTG9uZWxvZy1zcGVjaWZpYyBjb21tYW5kcy5cIilcbiAgICAgIC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xuICAgICAgICB0b2dnbGUuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MubG9uZWxvZ01vZGUpO1xuICAgICAgICB0b2dnbGUub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MubG9uZWxvZ01vZGUgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICB0aGlzLmRpc3BsYXkoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICBpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MubG9uZWxvZ01vZGUpIHtcbiAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgICAuc2V0TmFtZShcIkF1dG8taW5jcmVtZW50IHNjZW5lIGNvdW50ZXJcIilcbiAgICAgICAgLmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB7XG4gICAgICAgICAgdG9nZ2xlLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmxvbmVsb2dBdXRvSW5jU2NlbmUpO1xuICAgICAgICAgIHRvZ2dsZS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmxvbmVsb2dBdXRvSW5jU2NlbmUgPSB2YWx1ZTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgICAuc2V0TmFtZShcIkNvbnRleHQgZXh0cmFjdGlvbiBkZXB0aFwiKVxuICAgICAgICAuYWRkVGV4dCgodGV4dCkgPT4ge1xuICAgICAgICAgIHRleHQuc2V0VmFsdWUoU3RyaW5nKHRoaXMucGx1Z2luLnNldHRpbmdzLmxvbmVsb2dDb250ZXh0RGVwdGgpKTtcbiAgICAgICAgICB0ZXh0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbmV4dCA9IE51bWJlcih2YWx1ZSk7XG4gICAgICAgICAgICBpZiAoIU51bWJlci5pc05hTihuZXh0KSAmJiBuZXh0ID4gMCkge1xuICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5sb25lbG9nQ29udGV4dERlcHRoID0gbmV4dDtcbiAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgIC5zZXROYW1lKFwiV3JhcCBub3RhdGlvbiBpbiBjb2RlIGJsb2Nrc1wiKVxuICAgICAgICAuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcbiAgICAgICAgICB0b2dnbGUuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MubG9uZWxvZ1dyYXBDb2RlQmxvY2spO1xuICAgICAgICAgIHRvZ2dsZS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmxvbmVsb2dXcmFwQ29kZUJsb2NrID0gdmFsdWU7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBtb2RlbE9wdGlvbnNGb3IocHJvdmlkZXI6IFByb3ZpZGVySUQsIGN1cnJlbnRNb2RlbDogc3RyaW5nKTogc3RyaW5nW10ge1xuICAgIGNvbnN0IGNhY2hlZCA9IHRoaXMubW9kZWxDYWNoZVtwcm92aWRlcl07XG4gICAgaWYgKCFjYWNoZWQpIHJldHVybiBbY3VycmVudE1vZGVsXTtcbiAgICByZXR1cm4gY2FjaGVkLmluY2x1ZGVzKGN1cnJlbnRNb2RlbCkgPyBjYWNoZWQgOiBbY3VycmVudE1vZGVsLCAuLi5jYWNoZWRdO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJWYWxpZGF0aW9uU3RhdGUoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50LCBwcm92aWRlcjogUHJvdmlkZXJJRCk6IHZvaWQge1xuICAgIGNvbnN0IHN0YXRlID0gdGhpcy52YWxpZGF0aW9uW3Byb3ZpZGVyXTtcbiAgICBpZiAoIXN0YXRlIHx8IHN0YXRlLnN0YXR1cyA9PT0gXCJpZGxlXCIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJwXCIsIHtcbiAgICAgIHRleHQ6XG4gICAgICAgIHN0YXRlLnN0YXR1cyA9PT0gXCJjaGVja2luZ1wiXG4gICAgICAgICAgPyBcIlZhbGlkYXRpb246IGNoZWNraW5nLi4uXCJcbiAgICAgICAgICA6IHN0YXRlLnN0YXR1cyA9PT0gXCJ2YWxpZFwiXG4gICAgICAgICAgICA/IFwiVmFsaWRhdGlvbjogXHUyNzEzXCJcbiAgICAgICAgICAgIDogYFZhbGlkYXRpb246IFx1MjcxNyR7c3RhdGUubWVzc2FnZSA/IGAgKCR7c3RhdGUubWVzc2FnZX0pYCA6IFwiXCJ9YFxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBwcm92aWRlckxhYmVsKHByb3ZpZGVyOiBQcm92aWRlcklEKTogc3RyaW5nIHtcbiAgICBzd2l0Y2ggKHByb3ZpZGVyKSB7XG4gICAgICBjYXNlIFwiZ2VtaW5pXCI6XG4gICAgICAgIHJldHVybiBcIkdlbWluaVwiO1xuICAgICAgY2FzZSBcIm9wZW5haVwiOlxuICAgICAgICByZXR1cm4gXCJPcGVuQUlcIjtcbiAgICAgIGNhc2UgXCJhbnRocm9waWNcIjpcbiAgICAgICAgcmV0dXJuIFwiQW50aHJvcGljXCI7XG4gICAgICBjYXNlIFwib2xsYW1hXCI6XG4gICAgICAgIHJldHVybiBcIk9sbGFtYVwiO1xuICAgICAgY2FzZSBcIm9wZW5yb3V0ZXJcIjpcbiAgICAgICAgcmV0dXJuIFwiT3BlblJvdXRlclwiO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgdmFsaWRhdGVQcm92aWRlcihwcm92aWRlcjogUHJvdmlkZXJJRCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMudmFsaWRhdGlvbltwcm92aWRlcl0gPSB7IHN0YXR1czogXCJjaGVja2luZ1wiIH07XG4gICAgdGhpcy5kaXNwbGF5KCk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHZhbGlkID0gYXdhaXQgZ2V0UHJvdmlkZXIodGhpcy5wbHVnaW4uc2V0dGluZ3MsIHByb3ZpZGVyKS52YWxpZGF0ZSgpO1xuICAgICAgdGhpcy52YWxpZGF0aW9uW3Byb3ZpZGVyXSA9IHsgc3RhdHVzOiB2YWxpZCA/IFwidmFsaWRcIiA6IFwiaW52YWxpZFwiIH07XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMudmFsaWRhdGlvbltwcm92aWRlcl0gPSB7XG4gICAgICAgIHN0YXR1czogXCJpbnZhbGlkXCIsXG4gICAgICAgIG1lc3NhZ2U6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKVxuICAgICAgfTtcbiAgICB9XG4gICAgdGhpcy5kaXNwbGF5KCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHZhbGlkYXRlT2xsYW1hKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMudmFsaWRhdGlvbi5vbGxhbWEgPSB7IHN0YXR1czogXCJjaGVja2luZ1wiIH07XG4gICAgdGhpcy5kaXNwbGF5KCk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHByb3ZpZGVyID0gbmV3IE9sbGFtYVByb3ZpZGVyKHRoaXMucGx1Z2luLnNldHRpbmdzLnByb3ZpZGVycy5vbGxhbWEpO1xuICAgICAgY29uc3QgdmFsaWQgPSBhd2FpdCBwcm92aWRlci52YWxpZGF0ZSgpO1xuICAgICAgdGhpcy52YWxpZGF0aW9uLm9sbGFtYSA9IHsgc3RhdHVzOiB2YWxpZCA/IFwidmFsaWRcIiA6IFwiaW52YWxpZFwiIH07XG4gICAgICB0aGlzLm9sbGFtYU1vZGVscyA9IHZhbGlkID8gYXdhaXQgcHJvdmlkZXIubGlzdE1vZGVscygpIDogW107XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMudmFsaWRhdGlvbi5vbGxhbWEgPSB7XG4gICAgICAgIHN0YXR1czogXCJpbnZhbGlkXCIsXG4gICAgICAgIG1lc3NhZ2U6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKVxuICAgICAgfTtcbiAgICAgIHRoaXMub2xsYW1hTW9kZWxzID0gW107XG4gICAgICBuZXcgTm90aWNlKHRoaXMudmFsaWRhdGlvbi5vbGxhbWEubWVzc2FnZSA/PyBcIk9sbGFtYSB2YWxpZGF0aW9uIGZhaWxlZC5cIik7XG4gICAgfVxuICAgIHRoaXMuZGlzcGxheSgpO1xuICB9XG59XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFBQUEsb0JBQTZDOzs7QUNFdEMsU0FBUyxlQUFlLFFBQWdCLE1BQW9CO0FBQ2pFLFFBQU0sU0FBUyxPQUFPLFVBQVU7QUFDaEMsU0FBTyxhQUFhO0FBQUEsRUFBSztBQUFBLEdBQVUsTUFBTTtBQUN6QyxTQUFPLFVBQVUsRUFBRSxNQUFNLE9BQU8sT0FBTyxLQUFLLE1BQU0sSUFBSSxFQUFFLFNBQVMsR0FBRyxJQUFJLEVBQUUsQ0FBQztBQUM3RTtBQUVPLFNBQVMsYUFBYSxRQUFnQixNQUFvQjtBQUMvRCxRQUFNLFdBQVcsT0FBTyxTQUFTO0FBQ2pDLFFBQU0sU0FBUyxPQUFPLFFBQVEsUUFBUSxFQUFFO0FBQ3hDLFNBQU8sYUFBYTtBQUFBLEVBQUs7QUFBQSxHQUFVLEVBQUUsTUFBTSxVQUFVLElBQUksT0FBTyxDQUFDO0FBQ25FO0FBRU8sU0FBUyxhQUFhLFFBQXdCO0FBQ25ELFNBQU8sT0FBTyxhQUFhLEVBQUUsS0FBSztBQUNwQztBQUVPLFNBQVMscUJBQXFCLFFBQWdCLE1BQW9CO0FBQ3ZFLFFBQU0sWUFBWSxPQUFPLGVBQWUsRUFBRSxDQUFDO0FBQzNDLFFBQU0sYUFBYSxZQUFZLFVBQVUsS0FBSyxPQUFPLE9BQU8sVUFBVSxFQUFFO0FBQ3hFLFNBQU8sYUFBYTtBQUFBLEVBQUssUUFBUSxFQUFFLE1BQU0sWUFBWSxJQUFJLE9BQU8sUUFBUSxVQUFVLEVBQUUsT0FBTyxDQUFDO0FBQzlGO0FBRU8sU0FBUyxrQkFBa0IsUUFBZ0IsUUFBMEI7QUFDMUUsUUFBTSxZQUFZLDBCQUFVLE9BQU8sVUFBVSxFQUFFO0FBQy9DLE1BQUksU0FBUztBQUNiLFdBQVMsSUFBSSxHQUFHLElBQUksV0FBVyxLQUFLO0FBQ2xDLFFBQUksT0FB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QUssUUFBUSxJQUFJO0FBQUEsSUFDbEMsT0FBTztBQUNMLG1CQUFhLEtBQUssUUFBUSxJQUFJO0FBQUEsSUFDaEM7QUFBQSxFQUNGO0FBQUEsRUFFQSx3QkFBd0IsTUFBb0IsVUFBb0M7QUFoR2xGO0FBaUdJLFFBQUksQ0FBQyxLQUFLLFNBQVMsZ0JBQWdCO0FBQ2pDO0FBQUEsSUFDRjtBQUNBLFVBQU0sU0FBUSxjQUFTLGdCQUFULFlBQXdCO0FBQ3RDLFVBQU0sVUFBUyxjQUFTLGlCQUFULFlBQXlCO0FBQ3hDLGlCQUFhLEtBQUssUUFBUSxnQkFBZ0IsY0FBYyxnQkFBZ0I7QUFBQSxFQUMxRTtBQUNGOyIsCiAgIm5hbWVzIjogWyJpbXBvcnRfb2JzaWRpYW4iLCAiX2EiLCAiaW1wb3J0X29ic2lkaWFuIiwgIl9hIiwgImltcG9ydF9vYnNpZGlhbiIsICJpbXBvcnRfb2JzaWRpYW4iLCAiX2EiLCAiaW1wb3J0X29ic2lkaWFuIiwgIl9hIiwgImltcG9ydF9vYnNpZGlhbiIsICJhc0Vycm9yTWVzc2FnZSIsICJfYSIsICJpbXBvcnRfb2JzaWRpYW4iLCAiaW1wb3J0X29ic2lkaWFuIiwgInJlZiIsICJpbXBvcnRfb2JzaWRpYW4iXQp9Cg==
