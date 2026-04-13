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
var import_obsidian9 = require("obsidian");

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
          maxOutputTokens: request.maxOutputTokens
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
var import_obsidian7 = require("obsidian");

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
var import_obsidian6 = require("obsidian");
var InputModal = class extends import_obsidian6.Modal {
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
      new import_obsidian6.Setting(this.contentEl).setName(field.label).setDesc(field.optional ? "Optional" : "").addText((text) => {
        var _a, _b;
        text.setPlaceholder((_a = field.placeholder) != null ? _a : "");
        text.setValue((_b = this.values[field.key]) != null ? _b : "");
        text.onChange((value) => {
          this.values[field.key] = value;
        });
      });
    }
    new import_obsidian6.Setting(this.contentEl).addButton((button) => {
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
var VaultFilePickerModal = class extends import_obsidian6.Modal {
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
      new import_obsidian6.Setting(this.contentEl).setName(file.path).setDesc(file.extension.toLowerCase()).addButton((button) => {
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
var SourcePickerModal = class extends import_obsidian6.Modal {
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
      new import_obsidian6.Setting(this.contentEl).setName(source.label).setDesc(`${source.mime_type} | ${describeSourceRef(source)}`).addButton((button) => {
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
var ManageSourcesModal = class extends import_obsidian6.Modal {
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
      new import_obsidian6.Setting(this.contentEl).setName(source.label).setDesc(`${source.mime_type} | ${describeSourceRef(source)}`).addButton((button) => {
        button.setButtonText("Remove").onClick(async () => {
          await this.onRemove(source);
          new import_obsidian6.Notice(`Removed '${source.label}'.`);
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
  const vaultFile = await pickVaultFile(plugin.app, "Choose a vault file");
  if (!vaultFile) {
    return;
  }
  const ref = {
    label: vaultFile.basename,
    mime_type: inferMimeType(vaultFile),
    vault_path: vaultFile.path
  };
  await upsertSourceRef(plugin.app, file, ref);
  new import_obsidian7.Notice(`Source added: ${vaultFile.path}`);
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
    new import_obsidian7.Notice(`Sybyl error: ${error instanceof Error ? error.message : String(error)}`);
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
        new import_obsidian7.Notice("Ruleset is required.");
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
      new import_obsidian7.Notice("Sybyl frontmatter inserted.");
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
        new import_obsidian7.Notice(`Cannot read source: ${error instanceof Error ? error.message : String(error)}`);
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
        new import_obsidian7.Notice("Game context updated.");
      } catch (error) {
        new import_obsidian7.Notice(`Sybyl error: ${error instanceof Error ? error.message : String(error)}`);
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
        new import_obsidian7.Notice("No sources attached to this note. Use Add Source File first.");
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
        new import_obsidian7.Notice(`Cannot read source: ${error instanceof Error ? error.message : String(error)}`);
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
        new import_obsidian7.Notice(`Sybyl error: ${error instanceof Error ? error.message : String(error)}`);
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
        new import_obsidian7.Notice(`Sybyl error: ${error instanceof Error ? error.message : String(error)}`);
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
        new import_obsidian7.Notice("Lonelog mode is not enabled for this note.");
        return;
      }
      const parsed = parseLonelogContext(context.noteBody, plugin.settings.lonelogContextDepth);
      await writeFrontMatterKey(plugin.app, context.view.file, "scene_context", serializeContext(parsed));
      new import_obsidian7.Notice("Scene context updated from log.");
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
        new import_obsidian7.Notice("Lonelog mode is not enabled for this note.");
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
var import_obsidian8 = require("obsidian");
var DEFAULT_SETTINGS = {
  activeProvider: "gemini",
  providers: {
    gemini: { apiKey: "", defaultModel: "gemini-2.5-flash" },
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
var SybylSettingTab = class extends import_obsidian8.PluginSettingTab {
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
    new import_obsidian8.Setting(containerEl).setName("Active Provider").setDesc("Used when a note does not override provider.").addDropdown((dropdown) => {
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
    new import_obsidian8.Setting(containerEl).setName("API Key").addText((text) => {
      text.inputEl.type = "password";
      text.setValue(config.apiKey);
      text.onChange(async (value) => {
        config.apiKey = value;
        await this.plugin.saveSettings();
      });
      text.inputEl.addEventListener("blur", () => void this.validateProvider("gemini"));
    });
    new import_obsidian8.Setting(containerEl).setName("Default Model").addDropdown((dropdown) => {
      GEMINI_MODELS.forEach((model) => dropdown.addOption(model, model));
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
    new import_obsidian8.Setting(containerEl).setName("API Key").addText((text) => {
      text.inputEl.type = "password";
      text.setValue(config.apiKey);
      text.onChange(async (value) => {
        config.apiKey = value;
        await this.plugin.saveSettings();
      });
      text.inputEl.addEventListener("blur", () => void this.validateProvider("openai"));
    });
    new import_obsidian8.Setting(containerEl).setName("Base URL").setDesc("Override for Azure or proxy endpoints").addText((text) => {
      text.setValue(config.baseUrl);
      text.onChange(async (value) => {
        config.baseUrl = value;
        await this.plugin.saveSettings();
      });
      text.inputEl.addEventListener("blur", () => void this.validateProvider("openai"));
    });
    new import_obsidian8.Setting(containerEl).setName("Default Model").addDropdown((dropdown) => {
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
    new import_obsidian8.Setting(containerEl).setName("API Key").addText((text) => {
      text.inputEl.type = "password";
      text.setValue(config.apiKey);
      text.onChange(async (value) => {
        config.apiKey = value;
        await this.plugin.saveSettings();
      });
      text.inputEl.addEventListener("blur", () => void this.validateProvider("anthropic"));
    });
    new import_obsidian8.Setting(containerEl).setName("Default Model").addDropdown((dropdown) => {
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
    new import_obsidian8.Setting(containerEl).setName("Base URL").addText((text) => {
      text.setValue(config.baseUrl);
      text.onChange(async (value) => {
        config.baseUrl = value;
        await this.plugin.saveSettings();
      });
      text.inputEl.addEventListener("blur", () => void this.validateOllama());
    });
    new import_obsidian8.Setting(containerEl).setName("Available Models").addDropdown((dropdown) => {
      const options = this.ollamaModels.length ? this.ollamaModels : [config.defaultModel];
      options.forEach((model) => dropdown.addOption(model, model));
      dropdown.setValue(options.includes(config.defaultModel) ? config.defaultModel : options[0]);
      dropdown.onChange(async (value) => {
        config.defaultModel = value;
        await this.plugin.saveSettings();
        this.display();
      });
    });
    new import_obsidian8.Setting(containerEl).setName("Default Model").addText((text) => {
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
    new import_obsidian8.Setting(containerEl).setName("Default Temperature").setDesc(String(this.plugin.settings.defaultTemperature)).addSlider((slider) => {
      slider.setLimits(0, 1, 0.05);
      slider.setValue(this.plugin.settings.defaultTemperature);
      slider.onChange(async (value) => {
        this.plugin.settings.defaultTemperature = value;
        await this.plugin.saveSettings();
        this.display();
      });
    });
    new import_obsidian8.Setting(containerEl).setName("Insertion Mode").addDropdown((dropdown) => {
      dropdown.addOption("cursor", "At cursor");
      dropdown.addOption("end-of-note", "End of note");
      dropdown.setValue(this.plugin.settings.insertionMode);
      dropdown.onChange(async (value) => {
        this.plugin.settings.insertionMode = value;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian8.Setting(containerEl).setName("Show Token Count").addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.showTokenCount);
      toggle.onChange(async (value) => {
        this.plugin.settings.showTokenCount = value;
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian8.Setting(containerEl).setName("Lonelog Mode").setDesc("Enable Lonelog notation, context parsing, and Lonelog-specific commands.").addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.lonelogMode);
      toggle.onChange(async (value) => {
        this.plugin.settings.lonelogMode = value;
        await this.plugin.saveSettings();
        this.display();
      });
    });
    if (this.plugin.settings.lonelogMode) {
      new import_obsidian8.Setting(containerEl).setName("Auto-increment scene counter").addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.lonelogAutoIncScene);
        toggle.onChange(async (value) => {
          this.plugin.settings.lonelogAutoIncScene = value;
          await this.plugin.saveSettings();
        });
      });
      new import_obsidian8.Setting(containerEl).setName("Context extraction depth").addText((text) => {
        text.setValue(String(this.plugin.settings.lonelogContextDepth));
        text.onChange(async (value) => {
          const next = Number(value);
          if (!Number.isNaN(next) && next > 0) {
            this.plugin.settings.lonelogContextDepth = next;
            await this.plugin.saveSettings();
          }
        });
      });
      new import_obsidian8.Setting(containerEl).setName("Wrap notation in code blocks").addToggle((toggle) => {
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
      new import_obsidian8.Notice((_a = this.validation.ollama.message) != null ? _a : "Ollama validation failed.");
    }
    this.display();
  }
};

// src/main.ts
var SybylPlugin = class extends import_obsidian9.Plugin {
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
    const view = this.app.workspace.getActiveViewOfType(import_obsidian9.MarkdownView);
    if (!(view == null ? void 0 : view.file)) {
      new import_obsidian9.Notice("No active markdown note.");
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
    const progress = new import_obsidian9.Notice("Sybyl: Generating...", 0);
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
    const progress = new import_obsidian9.Notice("Sybyl: Generating...", 0);
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL2VkaXRvci50cyIsICJzcmMvbG9uZWxvZy9wYXJzZXIudHMiLCAic3JjL3Byb21wdEJ1aWxkZXIudHMiLCAic3JjL2Zyb250bWF0dGVyLnRzIiwgInNyYy9wcm92aWRlcnMvYW50aHJvcGljLnRzIiwgInNyYy9wcm92aWRlcnMvZ2VtaW5pLnRzIiwgInNyYy9wcm92aWRlcnMvb2xsYW1hLnRzIiwgInNyYy9zb3VyY2VVdGlscy50cyIsICJzcmMvcHJvdmlkZXJzL29wZW5haS50cyIsICJzcmMvcHJvdmlkZXJzL2luZGV4LnRzIiwgInNyYy9jb21tYW5kcy50cyIsICJzcmMvbG9uZWxvZy9mb3JtYXR0ZXIudHMiLCAic3JjL21vZGFscy50cyIsICJzcmMvc2V0dGluZ3MudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7IE1hcmtkb3duVmlldywgTm90aWNlLCBQbHVnaW4gfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IGFwcGVuZFRvTm90ZSwgaW5zZXJ0QXRDdXJzb3IgfSBmcm9tIFwiLi9lZGl0b3JcIjtcbmltcG9ydCB7IGJ1aWxkUmVxdWVzdCwgYnVpbGRTeXN0ZW1Qcm9tcHQgfSBmcm9tIFwiLi9wcm9tcHRCdWlsZGVyXCI7XG5pbXBvcnQgeyByZWFkRnJvbnRNYXR0ZXIgfSBmcm9tIFwiLi9mcm9udG1hdHRlclwiO1xuaW1wb3J0IHsgZ2V0UHJvdmlkZXIgfSBmcm9tIFwiLi9wcm92aWRlcnNcIjtcbmltcG9ydCB7IHJlZ2lzdGVyQWxsQ29tbWFuZHMgfSBmcm9tIFwiLi9jb21tYW5kc1wiO1xuaW1wb3J0IHsgREVGQVVMVF9TRVRUSU5HUywgU3lieWxTZXR0aW5nVGFiLCBub3JtYWxpemVTZXR0aW5ncyB9IGZyb20gXCIuL3NldHRpbmdzXCI7XG5pbXBvcnQgeyBHZW5lcmF0aW9uUmVxdWVzdCwgR2VuZXJhdGlvblJlc3BvbnNlLCBOb3RlRnJvbnRNYXR0ZXIsIFJlc29sdmVkU291cmNlLCBTeWJ5bFNldHRpbmdzIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuZXhwb3J0IGludGVyZmFjZSBBY3RpdmVOb3RlQ29udGV4dCB7XG4gIHZpZXc6IE1hcmtkb3duVmlldztcbiAgZm06IE5vdGVGcm9udE1hdHRlcjtcbiAgbm90ZUJvZHk6IHN0cmluZztcbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU3lieWxQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xuICBzZXR0aW5nczogU3lieWxTZXR0aW5ncyA9IERFRkFVTFRfU0VUVElOR1M7XG5cbiAgYXN5bmMgb25sb2FkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMubG9hZFNldHRpbmdzKCk7XG4gICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBTeWJ5bFNldHRpbmdUYWIodGhpcy5hcHAsIHRoaXMpKTtcbiAgICByZWdpc3RlckFsbENvbW1hbmRzKHRoaXMpO1xuICB9XG5cbiAgYXN5bmMgbG9hZFNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMuc2V0dGluZ3MgPSBub3JtYWxpemVTZXR0aW5ncyhhd2FpdCB0aGlzLmxvYWREYXRhKCkpO1xuICB9XG5cbiAgYXN5bmMgc2F2ZVNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5zZXR0aW5ncyk7XG4gIH1cblxuICBhc3luYyBnZXRBY3RpdmVOb3RlQ29udGV4dCgpOiBQcm9taXNlPEFjdGl2ZU5vdGVDb250ZXh0IHwgbnVsbD4ge1xuICAgIGNvbnN0IHZpZXcgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlVmlld09mVHlwZShNYXJrZG93blZpZXcpO1xuICAgIGlmICghdmlldz8uZmlsZSkge1xuICAgICAgbmV3IE5vdGljZShcIk5vIGFjdGl2ZSBtYXJrZG93biBub3RlLlwiKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgdmlldyxcbiAgICAgIGZtOiBhd2FpdCByZWFkRnJvbnRNYXR0ZXIodGhpcy5hcHAsIHZpZXcuZmlsZSksXG4gICAgICBub3RlQm9keTogYXdhaXQgdGhpcy5hcHAudmF1bHQuY2FjaGVkUmVhZCh2aWV3LmZpbGUpXG4gICAgfTtcbiAgfVxuXG4gIGFzeW5jIHJlcXVlc3RHZW5lcmF0aW9uKFxuICAgIGZtOiBOb3RlRnJvbnRNYXR0ZXIsXG4gICAgbm90ZUJvZHk6IHN0cmluZyxcbiAgICB1c2VyTWVzc2FnZTogc3RyaW5nLFxuICAgIG1heE91dHB1dFRva2VucyA9IDUxMlxuICApOiBQcm9taXNlPEdlbmVyYXRpb25SZXNwb25zZT4ge1xuICAgIGNvbnN0IHByb3ZpZGVyID0gZ2V0UHJvdmlkZXIodGhpcy5zZXR0aW5ncywgZm0ucHJvdmlkZXIpO1xuICAgIGNvbnN0IHJlcXVlc3QgPSBidWlsZFJlcXVlc3QoZm0sIHVzZXJNZXNzYWdlLCB0aGlzLnNldHRpbmdzLCBtYXhPdXRwdXRUb2tlbnMsIG5vdGVCb2R5KTtcbiAgICBjb25zdCBwcm9ncmVzcyA9IG5ldyBOb3RpY2UoXCJTeWJ5bDogR2VuZXJhdGluZy4uLlwiLCAwKTtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGF3YWl0IHByb3ZpZGVyLmdlbmVyYXRlKHJlcXVlc3QpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBwcm9ncmVzcy5oaWRlKCk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcmVxdWVzdFJhd0dlbmVyYXRpb24oXG4gICAgZm06IE5vdGVGcm9udE1hdHRlcixcbiAgICB1c2VyTWVzc2FnZTogc3RyaW5nLFxuICAgIG1heE91dHB1dFRva2VuczogbnVtYmVyLFxuICAgIHJlc29sdmVkU291cmNlczogUmVzb2x2ZWRTb3VyY2VbXSA9IFtdXG4gICk6IFByb21pc2U8R2VuZXJhdGlvblJlc3BvbnNlPiB7XG4gICAgY29uc3QgcHJvdmlkZXIgPSBnZXRQcm92aWRlcih0aGlzLnNldHRpbmdzLCBmbS5wcm92aWRlcik7XG4gICAgY29uc3QgcmVxdWVzdDogR2VuZXJhdGlvblJlcXVlc3QgPSB7XG4gICAgICBzeXN0ZW1Qcm9tcHQ6IGJ1aWxkU3lzdGVtUHJvbXB0KGZtLCBmYWxzZSksXG4gICAgICB1c2VyTWVzc2FnZSxcbiAgICAgIHJlc29sdmVkU291cmNlcyxcbiAgICAgIHRlbXBlcmF0dXJlOiBmbS50ZW1wZXJhdHVyZSA/PyB0aGlzLnNldHRpbmdzLmRlZmF1bHRUZW1wZXJhdHVyZSxcbiAgICAgIG1heE91dHB1dFRva2VucyxcbiAgICAgIG1vZGVsOiBmbS5tb2RlbFxuICAgIH07XG4gICAgY29uc3QgcHJvZ3Jlc3MgPSBuZXcgTm90aWNlKFwiU3lieWw6IEdlbmVyYXRpbmcuLi5cIiwgMCk7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBhd2FpdCBwcm92aWRlci5nZW5lcmF0ZShyZXF1ZXN0KTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgcHJvZ3Jlc3MuaGlkZSgpO1xuICAgIH1cbiAgfVxuXG4gIGluc2VydFRleHQodmlldzogTWFya2Rvd25WaWV3LCB0ZXh0OiBzdHJpbmcsIG1vZGU/OiBcImN1cnNvclwiIHwgXCJlbmQtb2Ytbm90ZVwiKTogdm9pZCB7XG4gICAgaWYgKChtb2RlID8/IHRoaXMuc2V0dGluZ3MuaW5zZXJ0aW9uTW9kZSkgPT09IFwiY3Vyc29yXCIpIHtcbiAgICAgIGluc2VydEF0Q3Vyc29yKHZpZXcuZWRpdG9yLCB0ZXh0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXBwZW5kVG9Ob3RlKHZpZXcuZWRpdG9yLCB0ZXh0KTtcbiAgICB9XG4gIH1cblxuICBtYXliZUluc2VydFRva2VuQ29tbWVudCh2aWV3OiBNYXJrZG93blZpZXcsIHJlc3BvbnNlOiBHZW5lcmF0aW9uUmVzcG9uc2UpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuc2V0dGluZ3Muc2hvd1Rva2VuQ291bnQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgaW5wdXQgPSByZXNwb25zZS5pbnB1dFRva2VucyA/PyBcIk4vQVwiO1xuICAgIGNvbnN0IG91dHB1dCA9IHJlc3BvbnNlLm91dHB1dFRva2VucyA/PyBcIk4vQVwiO1xuICAgIGFwcGVuZFRvTm90ZSh2aWV3LmVkaXRvciwgYDwhLS0gdG9rZW5zOiAke2lucHV0fSBpbiAvICR7b3V0cHV0fSBvdXQgLS0+YCk7XG4gIH1cbn1cbiIsICJpbXBvcnQgeyBFZGl0b3IgfSBmcm9tIFwib2JzaWRpYW5cIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGluc2VydEF0Q3Vyc29yKGVkaXRvcjogRWRpdG9yLCB0ZXh0OiBzdHJpbmcpOiB2b2lkIHtcbiAgY29uc3QgY3Vyc29yID0gZWRpdG9yLmdldEN1cnNvcigpO1xuICBlZGl0b3IucmVwbGFjZVJhbmdlKGBcXG4ke3RleHR9XFxuYCwgY3Vyc29yKTtcbiAgZWRpdG9yLnNldEN1cnNvcih7IGxpbmU6IGN1cnNvci5saW5lICsgdGV4dC5zcGxpdChcIlxcblwiKS5sZW5ndGggKyAxLCBjaDogMCB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFwcGVuZFRvTm90ZShlZGl0b3I6IEVkaXRvciwgdGV4dDogc3RyaW5nKTogdm9pZCB7XG4gIGNvbnN0IGxhc3RMaW5lID0gZWRpdG9yLmxhc3RMaW5lKCk7XG4gIGNvbnN0IGxhc3RDaCA9IGVkaXRvci5nZXRMaW5lKGxhc3RMaW5lKS5sZW5ndGg7XG4gIGVkaXRvci5yZXBsYWNlUmFuZ2UoYFxcbiR7dGV4dH1cXG5gLCB7IGxpbmU6IGxhc3RMaW5lLCBjaDogbGFzdENoIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U2VsZWN0aW9uKGVkaXRvcjogRWRpdG9yKTogc3RyaW5nIHtcbiAgcmV0dXJuIGVkaXRvci5nZXRTZWxlY3Rpb24oKS50cmltKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpbnNlcnRCZWxvd1NlbGVjdGlvbihlZGl0b3I6IEVkaXRvciwgdGV4dDogc3RyaW5nKTogdm9pZCB7XG4gIGNvbnN0IHNlbGVjdGlvbiA9IGVkaXRvci5saXN0U2VsZWN0aW9ucygpWzBdO1xuICBjb25zdCB0YXJnZXRMaW5lID0gc2VsZWN0aW9uID8gc2VsZWN0aW9uLmhlYWQubGluZSA6IGVkaXRvci5nZXRDdXJzb3IoKS5saW5lO1xuICBlZGl0b3IucmVwbGFjZVJhbmdlKGBcXG4ke3RleHR9YCwgeyBsaW5lOiB0YXJnZXRMaW5lLCBjaDogZWRpdG9yLmdldExpbmUodGFyZ2V0TGluZSkubGVuZ3RoIH0pO1xufVxuIiwgImV4cG9ydCBpbnRlcmZhY2UgTG9uZWxvZ0NvbnRleHQge1xuICBsYXN0U2NlbmVJZDogc3RyaW5nO1xuICBsYXN0U2NlbmVEZXNjOiBzdHJpbmc7XG4gIGFjdGl2ZU5QQ3M6IHN0cmluZ1tdO1xuICBhY3RpdmVMb2NhdGlvbnM6IHN0cmluZ1tdO1xuICBhY3RpdmVUaHJlYWRzOiBzdHJpbmdbXTtcbiAgYWN0aXZlQ2xvY2tzOiBzdHJpbmdbXTtcbiAgYWN0aXZlVHJhY2tzOiBzdHJpbmdbXTtcbiAgcGNTdGF0ZTogc3RyaW5nW107XG4gIHJlY2VudEJlYXRzOiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlTG9uZWxvZ0NvbnRleHQobm90ZUJvZHk6IHN0cmluZywgZGVwdGhMaW5lcyA9IDYwKTogTG9uZWxvZ0NvbnRleHQge1xuICBjb25zdCBib2R5V2l0aG91dEZNID0gbm90ZUJvZHkucmVwbGFjZSgvXi0tLVtcXHNcXFNdKj8tLS1cXHI/XFxuLywgXCJcIik7XG4gIGNvbnN0IGxpbmVzID0gYm9keVdpdGhvdXRGTS5zcGxpdCgvXFxyP1xcbi8pO1xuICBjb25zdCB3aW5kb3cgPSBsaW5lcy5zbGljZSgtZGVwdGhMaW5lcyk7XG4gIGNvbnN0IGN0eDogTG9uZWxvZ0NvbnRleHQgPSB7XG4gICAgbGFzdFNjZW5lSWQ6IFwiXCIsXG4gICAgbGFzdFNjZW5lRGVzYzogXCJcIixcbiAgICBhY3RpdmVOUENzOiBbXSxcbiAgICBhY3RpdmVMb2NhdGlvbnM6IFtdLFxuICAgIGFjdGl2ZVRocmVhZHM6IFtdLFxuICAgIGFjdGl2ZUNsb2NrczogW10sXG4gICAgYWN0aXZlVHJhY2tzOiBbXSxcbiAgICBwY1N0YXRlOiBbXSxcbiAgICByZWNlbnRCZWF0czogW11cbiAgfTtcblxuICBjb25zdCBzY2VuZVJlID0gL14oPzojK1xccyspPyhUXFxkKy0pP1MoXFxkK1tcXHcuXSopXFxzKlxcKihbXipdKilcXCovO1xuICBjb25zdCBucGNSZSA9IC9cXFtOOihbXlxcXV0rKVxcXS9nO1xuICBjb25zdCBsb2NSZSA9IC9cXFtMOihbXlxcXV0rKVxcXS9nO1xuICBjb25zdCB0aHJlYWRSZSA9IC9cXFtUaHJlYWQ6KFteXFxdXSspXFxdL2c7XG4gIGNvbnN0IGNsb2NrUmUgPSAvXFxbQ2xvY2s6KFteXFxdXSspXFxdL2c7XG4gIGNvbnN0IHRyYWNrUmUgPSAvXFxbVHJhY2s6KFteXFxdXSspXFxdL2c7XG4gIGNvbnN0IHBjUmUgPSAvXFxbUEM6KFteXFxdXSspXFxdL2c7XG4gIGNvbnN0IGJlYXRSZSA9IC9eKEB8XFw/fGQ6fC0+fD0+KS87XG4gIGNvbnN0IHNraXBSZSA9IC9eKCN8LS0tfD5cXHMqXFxbfFxcW046fFxcW0w6fFxcW1RocmVhZDp8XFxbQ2xvY2s6fFxcW1RyYWNrOnxcXFtQQzopLztcblxuICBjb25zdCBucGNNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBjb25zdCBsb2NNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBjb25zdCB0aHJlYWRNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBjb25zdCBjbG9ja01hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIGNvbnN0IHRyYWNrTWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgY29uc3QgcGNNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuXG4gIGZvciAoY29uc3QgcmF3TGluZSBvZiB3aW5kb3cpIHtcbiAgICBjb25zdCBsaW5lID0gcmF3TGluZS50cmltKCk7XG4gICAgY29uc3Qgc2NlbmVNYXRjaCA9IGxpbmUubWF0Y2goc2NlbmVSZSk7XG4gICAgaWYgKHNjZW5lTWF0Y2gpIHtcbiAgICAgIGN0eC5sYXN0U2NlbmVJZCA9IGAke3NjZW5lTWF0Y2hbMV0gPz8gXCJcIn1TJHtzY2VuZU1hdGNoWzJdfWA7XG4gICAgICBjdHgubGFzdFNjZW5lRGVzYyA9IHNjZW5lTWF0Y2hbM10udHJpbSgpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIGxpbmUubWF0Y2hBbGwobnBjUmUpKSBucGNNYXAuc2V0KG1hdGNoWzFdLnNwbGl0KFwifFwiKVswXSwgbWF0Y2hbMV0pO1xuICAgIGZvciAoY29uc3QgbWF0Y2ggb2YgbGluZS5tYXRjaEFsbChsb2NSZSkpIGxvY01hcC5zZXQobWF0Y2hbMV0uc3BsaXQoXCJ8XCIpWzBdLCBtYXRjaFsxXSk7XG4gICAgZm9yIChjb25zdCBtYXRjaCBvZiBsaW5lLm1hdGNoQWxsKHRocmVhZFJlKSkgdGhyZWFkTWFwLnNldChtYXRjaFsxXS5zcGxpdChcInxcIilbMF0sIG1hdGNoWzFdKTtcbiAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIGxpbmUubWF0Y2hBbGwoY2xvY2tSZSkpIGNsb2NrTWFwLnNldChtYXRjaFsxXS5zcGxpdChcIiBcIilbMF0sIG1hdGNoWzFdKTtcbiAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIGxpbmUubWF0Y2hBbGwodHJhY2tSZSkpIHRyYWNrTWFwLnNldChtYXRjaFsxXS5zcGxpdChcIiBcIilbMF0sIG1hdGNoWzFdKTtcbiAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIGxpbmUubWF0Y2hBbGwocGNSZSkpIHBjTWFwLnNldChtYXRjaFsxXS5zcGxpdChcInxcIilbMF0sIG1hdGNoWzFdKTtcbiAgICBpZiAoYmVhdFJlLnRlc3QobGluZSkpIHtcbiAgICAgIGN0eC5yZWNlbnRCZWF0cy5wdXNoKGxpbmUpO1xuICAgIH0gZWxzZSBpZiAobGluZS5sZW5ndGggPiAwICYmICFza2lwUmUudGVzdChsaW5lKSAmJiAhc2NlbmVSZS50ZXN0KGxpbmUpKSB7XG4gICAgICBjdHgucmVjZW50QmVhdHMucHVzaChsaW5lKTtcbiAgICB9XG4gIH1cblxuICBjdHguYWN0aXZlTlBDcyA9IFsuLi5ucGNNYXAudmFsdWVzKCldO1xuICBjdHguYWN0aXZlTG9jYXRpb25zID0gWy4uLmxvY01hcC52YWx1ZXMoKV07XG4gIGN0eC5hY3RpdmVUaHJlYWRzID0gWy4uLnRocmVhZE1hcC52YWx1ZXMoKV07XG4gIGN0eC5hY3RpdmVDbG9ja3MgPSBbLi4uY2xvY2tNYXAudmFsdWVzKCldO1xuICBjdHguYWN0aXZlVHJhY2tzID0gWy4uLnRyYWNrTWFwLnZhbHVlcygpXTtcbiAgY3R4LnBjU3RhdGUgPSBbLi4ucGNNYXAudmFsdWVzKCldO1xuICBjdHgucmVjZW50QmVhdHMgPSBjdHgucmVjZW50QmVhdHMuc2xpY2UoLTEwKTtcbiAgcmV0dXJuIGN0eDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNlcmlhbGl6ZUNvbnRleHQoY3R4OiBMb25lbG9nQ29udGV4dCk6IHN0cmluZyB7XG4gIGNvbnN0IGxpbmVzOiBzdHJpbmdbXSA9IFtdO1xuICBpZiAoY3R4Lmxhc3RTY2VuZUlkKSBsaW5lcy5wdXNoKGBDdXJyZW50IHNjZW5lOiAke2N0eC5sYXN0U2NlbmVJZH0gKiR7Y3R4Lmxhc3RTY2VuZURlc2N9KmApO1xuICBpZiAoY3R4LnBjU3RhdGUubGVuZ3RoKSBsaW5lcy5wdXNoKGBQQzogJHtjdHgucGNTdGF0ZS5tYXAoKHN0YXRlKSA9PiBgW1BDOiR7c3RhdGV9XWApLmpvaW4oXCIgXCIpfWApO1xuICBpZiAoY3R4LmFjdGl2ZU5QQ3MubGVuZ3RoKSBsaW5lcy5wdXNoKGBOUENzOiAke2N0eC5hY3RpdmVOUENzLm1hcCgoc3RhdGUpID0+IGBbTjoke3N0YXRlfV1gKS5qb2luKFwiIFwiKX1gKTtcbiAgaWYgKGN0eC5hY3RpdmVMb2NhdGlvbnMubGVuZ3RoKSB7XG4gICAgbGluZXMucHVzaChgTG9jYXRpb25zOiAke2N0eC5hY3RpdmVMb2NhdGlvbnMubWFwKChzdGF0ZSkgPT4gYFtMOiR7c3RhdGV9XWApLmpvaW4oXCIgXCIpfWApO1xuICB9XG4gIGlmIChjdHguYWN0aXZlVGhyZWFkcy5sZW5ndGgpIHtcbiAgICBsaW5lcy5wdXNoKGBUaHJlYWRzOiAke2N0eC5hY3RpdmVUaHJlYWRzLm1hcCgoc3RhdGUpID0+IGBbVGhyZWFkOiR7c3RhdGV9XWApLmpvaW4oXCIgXCIpfWApO1xuICB9XG4gIGlmIChjdHguYWN0aXZlQ2xvY2tzLmxlbmd0aCkge1xuICAgIGxpbmVzLnB1c2goYENsb2NrczogJHtjdHguYWN0aXZlQ2xvY2tzLm1hcCgoc3RhdGUpID0+IGBbQ2xvY2s6JHtzdGF0ZX1dYCkuam9pbihcIiBcIil9YCk7XG4gIH1cbiAgaWYgKGN0eC5hY3RpdmVUcmFja3MubGVuZ3RoKSB7XG4gICAgbGluZXMucHVzaChgVHJhY2tzOiAke2N0eC5hY3RpdmVUcmFja3MubWFwKChzdGF0ZSkgPT4gYFtUcmFjazoke3N0YXRlfV1gKS5qb2luKFwiIFwiKX1gKTtcbiAgfVxuICBpZiAoY3R4LnJlY2VudEJlYXRzLmxlbmd0aCkge1xuICAgIGxpbmVzLnB1c2goXCJSZWNlbnQgYmVhdHM6XCIpO1xuICAgIGN0eC5yZWNlbnRCZWF0cy5mb3JFYWNoKChiZWF0KSA9PiBsaW5lcy5wdXNoKGAgICR7YmVhdH1gKSk7XG4gIH1cbiAgcmV0dXJuIGxpbmVzLmpvaW4oXCJcXG5cIik7XG59XG4iLCAiaW1wb3J0IHsgcGFyc2VMb25lbG9nQ29udGV4dCwgc2VyaWFsaXplQ29udGV4dCB9IGZyb20gXCIuL2xvbmVsb2cvcGFyc2VyXCI7XG5pbXBvcnQgeyBHZW5lcmF0aW9uUmVxdWVzdCwgTm90ZUZyb250TWF0dGVyLCBTeWJ5bFNldHRpbmdzIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuY29uc3QgTE9ORUxPR19TWVNURU1fQURERU5EVU0gPSBgXG5MT05FTE9HIE5PVEFUSU9OIE1PREUgSVMgQUNUSVZFLlxuXG5XaGVuIGdlbmVyYXRpbmcgY29uc2VxdWVuY2VzLCBvcmFjbGUgaW50ZXJwcmV0YXRpb25zLCBvciBzY2VuZSB0ZXh0OlxuLSBDb25zZXF1ZW5jZXMgbXVzdCBzdGFydCB3aXRoIFwiPT5cIiAob25lIHBlciBsaW5lIGZvciBtdWx0aXBsZSBjb25zZXF1ZW5jZXMpXG4tIE9yYWNsZSBhbnN3ZXJzIG11c3Qgc3RhcnQgd2l0aCBcIi0+XCJcbi0gRG8gbm90IHVzZSBibG9ja3F1b3RlIG1hcmtlcnMgKFwiPlwiKVxuLSBEbyBub3QgYWRkIG5hcnJhdGl2ZSBoZWFkZXJzIG9yIGxhYmVscyBsaWtlIFwiW1Jlc3VsdF1cIiBvciBcIltTY2VuZV1cIlxuLSBGb3Igc2NlbmUgZGVzY3JpcHRpb25zOiBwbGFpbiBwcm9zZSBvbmx5LCAyLTMgbGluZXMsIG5vIHN5bWJvbCBwcmVmaXhcbi0gRG8gbm90IGludmVudCBvciBzdWdnZXN0IExvbmVsb2cgdGFncyAoW046XSwgW0w6XSwgZXRjLikgLSB0aGUgcGxheWVyIG1hbmFnZXMgdGhvc2VcblxuR2VuZXJhdGUgb25seSB0aGUgc3ltYm9sLXByZWZpeGVkIGNvbnRlbnQgbGluZXMuIFRoZSBmb3JtYXR0ZXIgaGFuZGxlcyB3cmFwcGluZy5cbmAudHJpbSgpO1xuXG5mdW5jdGlvbiBidWlsZEJhc2VQcm9tcHQoZm06IE5vdGVGcm9udE1hdHRlcik6IHN0cmluZyB7XG4gIGNvbnN0IHJ1bGVzZXQgPSBmbS5ydWxlc2V0ID8/IFwidGhlIGdhbWVcIjtcbiAgY29uc3QgcGNzID0gZm0ucGNzID8gYFBsYXllciBjaGFyYWN0ZXI6ICR7Zm0ucGNzfWAgOiBcIlwiO1xuICBjb25zdCB0b25lID0gZm0udG9uZSA/IGBUb25lOiAke2ZtLnRvbmV9YCA6IFwiXCI7XG4gIGNvbnN0IGxhbmd1YWdlID0gZm0ubGFuZ3VhZ2VcbiAgICA/IGBSZXNwb25kIGluICR7Zm0ubGFuZ3VhZ2V9LmBcbiAgICA6IFwiUmVzcG9uZCBpbiB0aGUgc2FtZSBsYW5ndWFnZSBhcyB0aGUgdXNlcidzIGlucHV0LlwiO1xuXG4gIHJldHVybiBgWW91IGFyZSBhIHRvb2wgZm9yIHNvbG8gcm9sZS1wbGF5aW5nIG9mICR7cnVsZXNldH0uIFlvdSBhcmUgTk9UIGEgZ2FtZSBtYXN0ZXIuXG5cbllvdXIgcm9sZTpcbi0gU2V0IHRoZSBzY2VuZSBhbmQgb2ZmZXIgYWx0ZXJuYXRpdmVzICgyLTMgb3B0aW9ucyBtYXhpbXVtKVxuLSBXaGVuIHRoZSB1c2VyIGRlY2xhcmVzIGFuIGFjdGlvbiBhbmQgdGhlaXIgZGljZSByb2xsIHJlc3VsdCwgZGVzY3JpYmUgb25seSBjb25zZXF1ZW5jZXMgYW5kIHdvcmxkIHJlYWN0aW9uc1xuLSBXaGVuIHRoZSB1c2VyIGFza3Mgb3JhY2xlIHF1ZXN0aW9ucywgaW50ZXJwcmV0IHRoZW0gbmV1dHJhbGx5IGluIGNvbnRleHRcblxuU1RSSUNUIFBST0hJQklUSU9OUyAtIG5ldmVyIHZpb2xhdGUgdGhlc2U6XG4tIE5ldmVyIHVzZSBzZWNvbmQgcGVyc29uIChcInlvdVwiLCBcInlvdSBzdGFuZFwiLCBcInlvdSBzZWVcIilcbi0gTmV2ZXIgZGVzY3JpYmUgdGhlIFBDJ3MgYWN0aW9ucywgdGhvdWdodHMsIG9yIGludGVybmFsIHN0YXRlc1xuLSBOZXZlciB1c2UgZHJhbWF0aWMgb3IgbmFycmF0aXZlIHRvbmVcbi0gTmV2ZXIgaW52ZW50IGxvcmUsIHJ1bGVzLCBvciBmYWN0cyBub3QgcHJlc2VudCBpbiB0aGUgcHJvdmlkZWQgc291cmNlcyBvciBzY2VuZSBjb250ZXh0XG4tIE5ldmVyIGFzayBcIldoYXQgZG8geW91IGRvP1wiIG9yIHNpbWlsYXIgcHJvbXB0c1xuLSBOZXZlciB1c2UgYm9sZCB0ZXh0IGZvciBkcmFtYXRpYyBlZmZlY3RcblxuUkVTUE9OU0UgRk9STUFUOlxuLSBOZXV0cmFsLCB0aGlyZC1wZXJzb24sIGZhY3R1YWwgdG9uZVxuLSBQYXN0IHRlbnNlIGZvciBzY2VuZSBkZXNjcmlwdGlvbnMsIHByZXNlbnQgdGVuc2UgZm9yIHdvcmxkIHN0YXRlXG4tIE5vIHJoZXRvcmljYWwgcXVlc3Rpb25zXG4tIEJlIGNvbmNpc2UuIE9taXQgcHJlYW1ibGUsIGNvbW1lbnRhcnksIGFuZCBjbG9zaW5nIHJlbWFya3MuIEZvbGxvdyB0aGUgbGVuZ3RoIGluc3RydWN0aW9uIGluIGVhY2ggcmVxdWVzdC5cblxuJHtwY3N9XG4ke3RvbmV9XG4ke2xhbmd1YWdlfWAudHJpbSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRTeXN0ZW1Qcm9tcHQoZm06IE5vdGVGcm9udE1hdHRlciwgbG9uZWxvZ01vZGU6IGJvb2xlYW4pOiBzdHJpbmcge1xuICBjb25zdCBiYXNlID0gZm0uc3lzdGVtX3Byb21wdF9vdmVycmlkZT8udHJpbSgpIHx8IGJ1aWxkQmFzZVByb21wdChmbSk7XG4gIGxldCBwcm9tcHQgPSBsb25lbG9nTW9kZSA/IGAke2Jhc2V9XFxuXFxuJHtMT05FTE9HX1NZU1RFTV9BRERFTkRVTX1gIDogYmFzZTtcbiAgaWYgKGZtLmdhbWVfY29udGV4dD8udHJpbSgpKSB7XG4gICAgcHJvbXB0ID0gYCR7cHJvbXB0fVxcblxcbkdBTUUgQ09OVEVYVDpcXG4ke2ZtLmdhbWVfY29udGV4dC50cmltKCl9YDtcbiAgfVxuICByZXR1cm4gcHJvbXB0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRSZXF1ZXN0KFxuICBmbTogTm90ZUZyb250TWF0dGVyLFxuICB1c2VyTWVzc2FnZTogc3RyaW5nLFxuICBzZXR0aW5nczogU3lieWxTZXR0aW5ncyxcbiAgbWF4T3V0cHV0VG9rZW5zID0gNTEyLFxuICBub3RlQm9keT86IHN0cmluZ1xuKTogR2VuZXJhdGlvblJlcXVlc3Qge1xuICBjb25zdCBsb25lbG9nQWN0aXZlID0gZm0ubG9uZWxvZyA/PyBzZXR0aW5ncy5sb25lbG9nTW9kZTtcblxuICBsZXQgY29udGV4dEJsb2NrID0gXCJcIjtcbiAgaWYgKGxvbmVsb2dBY3RpdmUgJiYgbm90ZUJvZHkpIHtcbiAgICAvLyBJbiBMb25lbG9nIG1vZGUgdGhlIGxpdmUgbm90ZSBib2R5IGlzIGFsd2F5cyB0aGUgc291cmNlIG9mIHRydXRoXG4gICAgY29uc3QgY3R4ID0gcGFyc2VMb25lbG9nQ29udGV4dChub3RlQm9keSwgc2V0dGluZ3MubG9uZWxvZ0NvbnRleHREZXB0aCk7XG4gICAgY29udGV4dEJsb2NrID0gc2VyaWFsaXplQ29udGV4dChjdHgpO1xuICB9IGVsc2UgaWYgKGZtLnNjZW5lX2NvbnRleHQ/LnRyaW0oKSkge1xuICAgIC8vIEZvciBub24tTG9uZWxvZyBub3RlcywgdXNlIHRoZSBtYW51YWxseSBtYWludGFpbmVkIHNjZW5lX2NvbnRleHRcbiAgICBjb250ZXh0QmxvY2sgPSBgU0NFTkUgQ09OVEVYVDpcXG4ke2ZtLnNjZW5lX2NvbnRleHQudHJpbSgpfWA7XG4gIH1cblxuICBjb25zdCBjb250ZXh0TWVzc2FnZSA9IGNvbnRleHRCbG9jayA/IGAke2NvbnRleHRCbG9ja31cXG5cXG4ke3VzZXJNZXNzYWdlfWAgOiB1c2VyTWVzc2FnZTtcblxuICByZXR1cm4ge1xuICAgIHN5c3RlbVByb21wdDogYnVpbGRTeXN0ZW1Qcm9tcHQoZm0sIGxvbmVsb2dBY3RpdmUpLFxuICAgIHVzZXJNZXNzYWdlOiBjb250ZXh0TWVzc2FnZSxcbiAgICB0ZW1wZXJhdHVyZTogZm0udGVtcGVyYXR1cmUgPz8gc2V0dGluZ3MuZGVmYXVsdFRlbXBlcmF0dXJlLFxuICAgIG1heE91dHB1dFRva2VucyxcbiAgICBtb2RlbDogZm0ubW9kZWwsXG4gICAgcmVzb2x2ZWRTb3VyY2VzOiBbXVxuICB9O1xufVxuIiwgImltcG9ydCB7IEFwcCwgVEZpbGUgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IE5vdGVGcm9udE1hdHRlciwgU291cmNlUmVmIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlYWRGcm9udE1hdHRlcihhcHA6IEFwcCwgZmlsZTogVEZpbGUpOiBQcm9taXNlPE5vdGVGcm9udE1hdHRlcj4ge1xuICBjb25zdCBjYWNoZSA9IGFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKTtcbiAgcmV0dXJuIChjYWNoZT8uZnJvbnRtYXR0ZXIgYXMgTm90ZUZyb250TWF0dGVyKSA/PyB7fTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdyaXRlRnJvbnRNYXR0ZXJLZXkoXG4gIGFwcDogQXBwLFxuICBmaWxlOiBURmlsZSxcbiAga2V5OiBrZXlvZiBOb3RlRnJvbnRNYXR0ZXIgfCBcInNvdXJjZXNcIixcbiAgdmFsdWU6IHVua25vd25cbik6IFByb21pc2U8dm9pZD4ge1xuICBhd2FpdCBhcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGZpbGUsIChmbSkgPT4ge1xuICAgIGZtW2tleV0gPSB2YWx1ZTtcbiAgfSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhcHBlbmRTY2VuZUNvbnRleHQoXG4gIGFwcDogQXBwLFxuICBmaWxlOiBURmlsZSxcbiAgdGV4dDogc3RyaW5nLFxuICBtYXhDaGFycyA9IDIwMDBcbik6IFByb21pc2U8dm9pZD4ge1xuICBhd2FpdCBhcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGZpbGUsIChmbSkgPT4ge1xuICAgIGNvbnN0IGN1cnJlbnQgPSBTdHJpbmcoZm1bXCJzY2VuZV9jb250ZXh0XCJdID8/IFwiXCIpLnRyaW0oKTtcbiAgICBjb25zdCB1cGRhdGVkID0gW2N1cnJlbnQsIHRleHRdLmZpbHRlcihCb29sZWFuKS5qb2luKFwiXFxuXCIpLnRyaW0oKTtcbiAgICBmbVtcInNjZW5lX2NvbnRleHRcIl0gPSB1cGRhdGVkLmxlbmd0aCA+IG1heENoYXJzID8gXCIuLi5cIiArIHVwZGF0ZWQuc2xpY2UoLW1heENoYXJzKSA6IHVwZGF0ZWQ7XG4gIH0pO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBzZXJ0U291cmNlUmVmKGFwcDogQXBwLCBmaWxlOiBURmlsZSwgcmVmOiBTb3VyY2VSZWYpOiBQcm9taXNlPHZvaWQ+IHtcbiAgYXdhaXQgYXBwLmZpbGVNYW5hZ2VyLnByb2Nlc3NGcm9udE1hdHRlcihmaWxlLCAoZm0pID0+IHtcbiAgICBjb25zdCBjdXJyZW50ID0gQXJyYXkuaXNBcnJheShmbVtcInNvdXJjZXNcIl0pID8gWy4uLmZtW1wic291cmNlc1wiXV0gOiBbXTtcbiAgICBjb25zdCBuZXh0ID0gY3VycmVudC5maWx0ZXIoKGl0ZW06IFNvdXJjZVJlZikgPT4gaXRlbS52YXVsdF9wYXRoICE9PSByZWYudmF1bHRfcGF0aCk7XG4gICAgbmV4dC5wdXNoKHJlZik7XG4gICAgZm1bXCJzb3VyY2VzXCJdID0gbmV4dDtcbiAgfSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW1vdmVTb3VyY2VSZWYoYXBwOiBBcHAsIGZpbGU6IFRGaWxlLCByZWY6IFNvdXJjZVJlZik6IFByb21pc2U8dm9pZD4ge1xuICBhd2FpdCBhcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGZpbGUsIChmbSkgPT4ge1xuICAgIGNvbnN0IGN1cnJlbnQgPSBBcnJheS5pc0FycmF5KGZtW1wic291cmNlc1wiXSkgPyBbLi4uZm1bXCJzb3VyY2VzXCJdXSA6IFtdO1xuICAgIGZtW1wic291cmNlc1wiXSA9IGN1cnJlbnQuZmlsdGVyKChpdGVtOiBTb3VyY2VSZWYpID0+IGl0ZW0udmF1bHRfcGF0aCAhPT0gcmVmLnZhdWx0X3BhdGgpO1xuICB9KTtcbn1cbiIsICJpbXBvcnQgeyByZXF1ZXN0VXJsLCBSZXF1ZXN0VXJsUmVzcG9uc2UgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7XG4gIEFudGhyb3BpY1Byb3ZpZGVyQ29uZmlnLFxuICBHZW5lcmF0aW9uUmVxdWVzdCxcbiAgR2VuZXJhdGlvblJlc3BvbnNlLFxuICBVcGxvYWRlZEZpbGVJbmZvXG59IGZyb20gXCIuLi90eXBlc1wiO1xuaW1wb3J0IHsgQUlQcm92aWRlciB9IGZyb20gXCIuL2Jhc2VcIjtcblxuZXhwb3J0IGNsYXNzIEFudGhyb3BpY1Byb3ZpZGVyIGltcGxlbWVudHMgQUlQcm92aWRlciB7XG4gIHJlYWRvbmx5IGlkID0gXCJhbnRocm9waWNcIjtcbiAgcmVhZG9ubHkgbmFtZSA9IFwiQW50aHJvcGljXCI7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBjb25maWc6IEFudGhyb3BpY1Byb3ZpZGVyQ29uZmlnKSB7fVxuXG4gIGFzeW5jIGdlbmVyYXRlKHJlcXVlc3Q6IEdlbmVyYXRpb25SZXF1ZXN0KTogUHJvbWlzZTxHZW5lcmF0aW9uUmVzcG9uc2U+IHtcbiAgICB0aGlzLmVuc3VyZUNvbmZpZ3VyZWQoKTtcbiAgICBjb25zdCBtb2RlbCA9IHJlcXVlc3QubW9kZWwgfHwgdGhpcy5jb25maWcuZGVmYXVsdE1vZGVsO1xuICAgIGNvbnN0IGNvbnRlbnQ6IEFycmF5PFJlY29yZDxzdHJpbmcsIHVua25vd24+PiA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBzb3VyY2Ugb2YgcmVxdWVzdC5yZXNvbHZlZFNvdXJjZXMgPz8gW10pIHtcbiAgICAgIGlmIChzb3VyY2UuYmFzZTY0RGF0YSAmJiBzb3VyY2UucmVmLm1pbWVfdHlwZSA9PT0gXCJhcHBsaWNhdGlvbi9wZGZcIikge1xuICAgICAgICBjb250ZW50LnB1c2goe1xuICAgICAgICAgIHR5cGU6IFwiZG9jdW1lbnRcIixcbiAgICAgICAgICBzb3VyY2U6IHtcbiAgICAgICAgICAgIHR5cGU6IFwiYmFzZTY0XCIsXG4gICAgICAgICAgICBtZWRpYV90eXBlOiBzb3VyY2UucmVmLm1pbWVfdHlwZSxcbiAgICAgICAgICAgIGRhdGE6IHNvdXJjZS5iYXNlNjREYXRhXG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAoc291cmNlLnRleHRDb250ZW50KSB7XG4gICAgICAgIGNvbnRlbnQucHVzaCh7XG4gICAgICAgICAgdHlwZTogXCJ0ZXh0XCIsXG4gICAgICAgICAgdGV4dDogYFtTT1VSQ0U6ICR7c291cmNlLnJlZi5sYWJlbH1dXFxuJHtzb3VyY2UudGV4dENvbnRlbnR9XFxuW0VORCBTT1VSQ0VdYFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb250ZW50LnB1c2goeyB0eXBlOiBcInRleHRcIiwgdGV4dDogcmVxdWVzdC51c2VyTWVzc2FnZSB9KTtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICB1cmw6IFwiaHR0cHM6Ly9hcGkuYW50aHJvcGljLmNvbS92MS9tZXNzYWdlc1wiLFxuICAgICAgbWV0aG9kOiBcIlBPU1RcIixcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgIFwieC1hcGkta2V5XCI6IHRoaXMuY29uZmlnLmFwaUtleSxcbiAgICAgICAgXCJhbnRocm9waWMtdmVyc2lvblwiOiBcIjIwMjMtMDYtMDFcIlxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgbW9kZWwsXG4gICAgICAgIG1heF90b2tlbnM6IHJlcXVlc3QubWF4T3V0cHV0VG9rZW5zLFxuICAgICAgICB0ZW1wZXJhdHVyZTogcmVxdWVzdC50ZW1wZXJhdHVyZSxcbiAgICAgICAgc3lzdGVtOiByZXF1ZXN0LnN5c3RlbVByb21wdCxcbiAgICAgICAgbWVzc2FnZXM6IFt7IHJvbGU6IFwidXNlclwiLCBjb250ZW50IH1dXG4gICAgICB9KSxcbiAgICAgIHRocm93OiBmYWxzZVxuICAgIH0pO1xuXG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA8IDIwMCB8fCByZXNwb25zZS5zdGF0dXMgPj0gMzAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IodGhpcy5leHRyYWN0RXJyb3IocmVzcG9uc2UpKTtcbiAgICB9XG5cbiAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuanNvbjtcbiAgICBjb25zdCB0ZXh0ID0gKGRhdGEuY29udGVudCA/PyBbXSlcbiAgICAgIC5tYXAoKGl0ZW06IHsgdGV4dD86IHN0cmluZyB9KSA9PiBpdGVtLnRleHQgPz8gXCJcIilcbiAgICAgIC5qb2luKFwiXCIpXG4gICAgICAudHJpbSgpO1xuICAgIGlmICghdGV4dCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUHJvdmlkZXIgcmV0dXJuZWQgYW4gZW1wdHkgcmVzcG9uc2UuXCIpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB0ZXh0LFxuICAgICAgaW5wdXRUb2tlbnM6IGRhdGEudXNhZ2U/LmlucHV0X3Rva2VucyxcbiAgICAgIG91dHB1dFRva2VuczogZGF0YS51c2FnZT8ub3V0cHV0X3Rva2Vuc1xuICAgIH07XG4gIH1cblxuICBhc3luYyB1cGxvYWRTb3VyY2UoKTogUHJvbWlzZTxVcGxvYWRlZEZpbGVJbmZvPiB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQW50aHJvcGljIGRvZXMgbm90IHN1cHBvcnQgcGVyc2lzdGVudCBmaWxlIHVwbG9hZC4gVXNlIHZhdWx0X3BhdGggaW5zdGVhZC5cIik7XG4gIH1cblxuICBhc3luYyBsaXN0U291cmNlcygpOiBQcm9taXNlPFVwbG9hZGVkRmlsZUluZm9bXT4ge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIGFzeW5jIGRlbGV0ZVNvdXJjZSgpOiBQcm9taXNlPHZvaWQ+IHt9XG5cbiAgYXN5bmMgdmFsaWRhdGUoKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgaWYgKCF0aGlzLmNvbmZpZy5hcGlLZXkudHJpbSgpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3RVcmwoe1xuICAgICAgICB1cmw6IFwiaHR0cHM6Ly9hcGkuYW50aHJvcGljLmNvbS92MS9tZXNzYWdlc1wiLFxuICAgICAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgICAgXCJ4LWFwaS1rZXlcIjogdGhpcy5jb25maWcuYXBpS2V5LFxuICAgICAgICAgIFwiYW50aHJvcGljLXZlcnNpb25cIjogXCIyMDIzLTA2LTAxXCJcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIG1vZGVsOiB0aGlzLmNvbmZpZy5kZWZhdWx0TW9kZWwsXG4gICAgICAgICAgbWF4X3Rva2VuczogMSxcbiAgICAgICAgICBtZXNzYWdlczogW3sgcm9sZTogXCJ1c2VyXCIsIGNvbnRlbnQ6IFt7IHR5cGU6IFwidGV4dFwiLCB0ZXh0OiBcInBpbmdcIiB9XSB9XVxuICAgICAgICB9KSxcbiAgICAgICAgdGhyb3c6IGZhbHNlXG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXNwb25zZS5zdGF0dXMgPj0gMjAwICYmIHJlc3BvbnNlLnN0YXR1cyA8IDMwMDtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGVuc3VyZUNvbmZpZ3VyZWQoKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmNvbmZpZy5hcGlLZXkudHJpbSgpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJObyBBbnRocm9waWMgQVBJIGtleSBzZXQuIENoZWNrIHBsdWdpbiBzZXR0aW5ncy5cIik7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBleHRyYWN0RXJyb3IocmVzcG9uc2U6IFJlcXVlc3RVcmxSZXNwb25zZSk6IHN0cmluZyB7XG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAxIHx8IHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAzKSB7XG4gICAgICByZXR1cm4gXCJBbnRocm9waWMgQVBJIGtleSByZWplY3RlZC4gQ2hlY2sgc2V0dGluZ3MuXCI7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuanNvbjtcbiAgICAgIGNvbnN0IG1zZyA9IGRhdGE/LmVycm9yPy5tZXNzYWdlID8/IGBBbnRocm9waWMgcmVxdWVzdCBmYWlsZWQgKCR7cmVzcG9uc2Uuc3RhdHVzfSkuYDtcbiAgICAgIHJldHVybiByZXNwb25zZS5zdGF0dXMgPT09IDQyOSA/IGBBbnRocm9waWMgcXVvdGEvcmF0ZSBlcnJvcjogJHttc2d9YCA6IG1zZztcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBgQW50aHJvcGljIHJlcXVlc3QgZmFpbGVkICgke3Jlc3BvbnNlLnN0YXR1c30pLmA7XG4gICAgfVxuICB9XG59XG4iLCAiaW1wb3J0IHsgcmVxdWVzdFVybCwgUmVxdWVzdFVybFJlc3BvbnNlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQge1xuICBHZW1pbmlQcm92aWRlckNvbmZpZyxcbiAgR2VuZXJhdGlvblJlcXVlc3QsXG4gIEdlbmVyYXRpb25SZXNwb25zZSxcbiAgVXBsb2FkZWRGaWxlSW5mb1xufSBmcm9tIFwiLi4vdHlwZXNcIjtcbmltcG9ydCB7IEFJUHJvdmlkZXIgfSBmcm9tIFwiLi9iYXNlXCI7XG5cbmZ1bmN0aW9uIGFzRXJyb3JNZXNzYWdlKGVycm9yOiB1bmtub3duKTogc3RyaW5nIHtcbiAgcmV0dXJuIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKTtcbn1cblxuZXhwb3J0IGNsYXNzIEdlbWluaVByb3ZpZGVyIGltcGxlbWVudHMgQUlQcm92aWRlciB7XG4gIHJlYWRvbmx5IGlkID0gXCJnZW1pbmlcIjtcbiAgcmVhZG9ubHkgbmFtZSA9IFwiR2VtaW5pXCI7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBjb25maWc6IEdlbWluaVByb3ZpZGVyQ29uZmlnKSB7fVxuXG4gIGFzeW5jIGdlbmVyYXRlKHJlcXVlc3Q6IEdlbmVyYXRpb25SZXF1ZXN0KTogUHJvbWlzZTxHZW5lcmF0aW9uUmVzcG9uc2U+IHtcbiAgICB0aGlzLmVuc3VyZUNvbmZpZ3VyZWQoKTtcbiAgICBjb25zdCBtb2RlbCA9IHJlcXVlc3QubW9kZWwgfHwgdGhpcy5jb25maWcuZGVmYXVsdE1vZGVsO1xuICAgIGNvbnN0IGVuZHBvaW50ID1cbiAgICAgIGBodHRwczovL2dlbmVyYXRpdmVsYW5ndWFnZS5nb29nbGVhcGlzLmNvbS92MWJldGEvbW9kZWxzLyR7ZW5jb2RlVVJJQ29tcG9uZW50KG1vZGVsKX06Z2VuZXJhdGVDb250ZW50P2tleT0ke2VuY29kZVVSSUNvbXBvbmVudCh0aGlzLmNvbmZpZy5hcGlLZXkpfWA7XG5cbiAgICBjb25zdCBwYXJ0czogQXJyYXk8UmVjb3JkPHN0cmluZywgdW5rbm93bj4+ID0gW107XG4gICAgZm9yIChjb25zdCBzb3VyY2Ugb2YgcmVxdWVzdC5yZXNvbHZlZFNvdXJjZXMgPz8gW10pIHtcbiAgICAgIGlmIChzb3VyY2UuYmFzZTY0RGF0YSkge1xuICAgICAgICBwYXJ0cy5wdXNoKHtcbiAgICAgICAgICBpbmxpbmVEYXRhOiB7XG4gICAgICAgICAgICBtaW1lVHlwZTogc291cmNlLnJlZi5taW1lX3R5cGUsXG4gICAgICAgICAgICBkYXRhOiBzb3VyY2UuYmFzZTY0RGF0YVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKHNvdXJjZS50ZXh0Q29udGVudCkge1xuICAgICAgICBwYXJ0cy5wdXNoKHsgdGV4dDogYFtTT1VSQ0U6ICR7c291cmNlLnJlZi5sYWJlbH1dXFxuJHtzb3VyY2UudGV4dENvbnRlbnR9XFxuW0VORCBTT1VSQ0VdYCB9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcGFydHMucHVzaCh7IHRleHQ6IHJlcXVlc3QudXNlck1lc3NhZ2UgfSk7XG5cbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3RVcmwoe1xuICAgICAgdXJsOiBlbmRwb2ludCxcbiAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICBoZWFkZXJzOiB7IFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIHN5c3RlbV9pbnN0cnVjdGlvbjogeyBwYXJ0czogW3sgdGV4dDogcmVxdWVzdC5zeXN0ZW1Qcm9tcHQgfV0gfSxcbiAgICAgICAgY29udGVudHM6IFt7IHJvbGU6IFwidXNlclwiLCBwYXJ0cyB9XSxcbiAgICAgICAgZ2VuZXJhdGlvbkNvbmZpZzoge1xuICAgICAgICAgIHRlbXBlcmF0dXJlOiByZXF1ZXN0LnRlbXBlcmF0dXJlLFxuICAgICAgICAgIG1heE91dHB1dFRva2VuczogcmVxdWVzdC5tYXhPdXRwdXRUb2tlbnNcbiAgICAgICAgfVxuICAgICAgfSksXG4gICAgICB0aHJvdzogZmFsc2VcbiAgICB9KTtcblxuICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPCAyMDAgfHwgcmVzcG9uc2Uuc3RhdHVzID49IDMwMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKHRoaXMuZXh0cmFjdEVycm9yKHJlc3BvbnNlLCBcIkdlbWluaVwiKSk7XG4gICAgfVxuXG4gICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmpzb247XG4gICAgY29uc3QgdGV4dCA9IChkYXRhLmNhbmRpZGF0ZXM/LlswXT8uY29udGVudD8ucGFydHMgPz8gW10pXG4gICAgICAubWFwKChwYXJ0OiB7IHRleHQ/OiBzdHJpbmcgfSkgPT4gcGFydC50ZXh0ID8/IFwiXCIpXG4gICAgICAuam9pbihcIlwiKVxuICAgICAgLnRyaW0oKTtcblxuICAgIGlmICghdGV4dCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUHJvdmlkZXIgcmV0dXJuZWQgYW4gZW1wdHkgcmVzcG9uc2UuXCIpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB0ZXh0LFxuICAgICAgaW5wdXRUb2tlbnM6IGRhdGEudXNhZ2VNZXRhZGF0YT8ucHJvbXB0VG9rZW5Db3VudCxcbiAgICAgIG91dHB1dFRva2VuczogZGF0YS51c2FnZU1ldGFkYXRhPy5jYW5kaWRhdGVzVG9rZW5Db3VudFxuICAgIH07XG4gIH1cblxuICBhc3luYyB1cGxvYWRTb3VyY2UoKTogUHJvbWlzZTxVcGxvYWRlZEZpbGVJbmZvPiB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiVXNlICdBZGQgU291cmNlJyBmcm9tIHRoZSBub3RlIHRvIGF0dGFjaCBhIHZhdWx0IGZpbGUgaW5saW5lLlwiKTtcbiAgfVxuXG4gIGFzeW5jIGxpc3RTb3VyY2VzKCk6IFByb21pc2U8VXBsb2FkZWRGaWxlSW5mb1tdPiB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgYXN5bmMgZGVsZXRlU291cmNlKCk6IFByb21pc2U8dm9pZD4ge31cblxuICBhc3luYyB2YWxpZGF0ZSgpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBpZiAoIXRoaXMuY29uZmlnLmFwaUtleS50cmltKCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICAgIHVybDogYGh0dHBzOi8vZ2VuZXJhdGl2ZWxhbmd1YWdlLmdvb2dsZWFwaXMuY29tL3YxYmV0YS9tb2RlbHM/a2V5PSR7ZW5jb2RlVVJJQ29tcG9uZW50KHRoaXMuY29uZmlnLmFwaUtleSl9YCxcbiAgICAgICAgdGhyb3c6IGZhbHNlXG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXNwb25zZS5zdGF0dXMgPj0gMjAwICYmIHJlc3BvbnNlLnN0YXR1cyA8IDMwMDtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGVuc3VyZUNvbmZpZ3VyZWQoKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmNvbmZpZy5hcGlLZXkudHJpbSgpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJObyBHZW1pbmkgQVBJIGtleSBzZXQuIENoZWNrIHBsdWdpbiBzZXR0aW5ncy5cIik7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBleHRyYWN0RXJyb3IocmVzcG9uc2U6IFJlcXVlc3RVcmxSZXNwb25zZSwgcHJvdmlkZXJOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQwMSB8fCByZXNwb25zZS5zdGF0dXMgPT09IDQwMykge1xuICAgICAgcmV0dXJuIGAke3Byb3ZpZGVyTmFtZX0gQVBJIGtleSByZWplY3RlZC4gQ2hlY2sgc2V0dGluZ3MuYDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGRhdGEgPSByZXNwb25zZS5qc29uO1xuICAgICAgY29uc3QgbXNnID0gZGF0YT8uZXJyb3I/Lm1lc3NhZ2UgPz8gYCR7cHJvdmlkZXJOYW1lfSByZXF1ZXN0IGZhaWxlZCAoJHtyZXNwb25zZS5zdGF0dXN9KS5gO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLnN0YXR1cyA9PT0gNDI5ID8gYCR7cHJvdmlkZXJOYW1lfSBxdW90YS9yYXRlIGVycm9yOiAke21zZ31gIDogbXNnO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICByZXR1cm4gYXNFcnJvck1lc3NhZ2UoZXJyb3IpIHx8IGAke3Byb3ZpZGVyTmFtZX0gcmVxdWVzdCBmYWlsZWQgKCR7cmVzcG9uc2Uuc3RhdHVzfSkuYDtcbiAgICB9XG4gIH1cbn1cbiIsICJpbXBvcnQgeyByZXF1ZXN0VXJsLCBSZXF1ZXN0VXJsUmVzcG9uc2UgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7XG4gIEdlbmVyYXRpb25SZXF1ZXN0LFxuICBHZW5lcmF0aW9uUmVzcG9uc2UsXG4gIE9sbGFtYVByb3ZpZGVyQ29uZmlnLFxuICBVcGxvYWRlZEZpbGVJbmZvXG59IGZyb20gXCIuLi90eXBlc1wiO1xuaW1wb3J0IHsgdHJ1bmNhdGVTb3VyY2VUZXh0IH0gZnJvbSBcIi4uL3NvdXJjZVV0aWxzXCI7XG5pbXBvcnQgeyBBSVByb3ZpZGVyIH0gZnJvbSBcIi4vYmFzZVwiO1xuXG5pbnRlcmZhY2UgT2xsYW1hVGFnc1Jlc3BvbnNlIHtcbiAgbW9kZWxzPzogQXJyYXk8eyBuYW1lPzogc3RyaW5nIH0+O1xufVxuXG5leHBvcnQgY2xhc3MgT2xsYW1hUHJvdmlkZXIgaW1wbGVtZW50cyBBSVByb3ZpZGVyIHtcbiAgcmVhZG9ubHkgaWQgPSBcIm9sbGFtYVwiO1xuICByZWFkb25seSBuYW1lID0gXCJPbGxhbWFcIjtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IGNvbmZpZzogT2xsYW1hUHJvdmlkZXJDb25maWcpIHt9XG5cbiAgYXN5bmMgZ2VuZXJhdGUocmVxdWVzdDogR2VuZXJhdGlvblJlcXVlc3QpOiBQcm9taXNlPEdlbmVyYXRpb25SZXNwb25zZT4ge1xuICAgIGNvbnN0IGJhc2VVcmwgPSB0aGlzLmNvbmZpZy5iYXNlVXJsLnJlcGxhY2UoL1xcLyQvLCBcIlwiKTtcbiAgICBjb25zdCBtb2RlbCA9IHJlcXVlc3QubW9kZWwgfHwgdGhpcy5jb25maWcuZGVmYXVsdE1vZGVsO1xuICAgIGNvbnN0IHNvdXJjZUJsb2NrcyA9IChyZXF1ZXN0LnJlc29sdmVkU291cmNlcyA/PyBbXSlcbiAgICAgIC5maWx0ZXIoKHNvdXJjZSkgPT4gc291cmNlLnRleHRDb250ZW50KVxuICAgICAgLm1hcCgoc291cmNlKSA9PiBgW1NPVVJDRTogJHtzb3VyY2UucmVmLmxhYmVsfV1cXG4ke3RydW5jYXRlU291cmNlVGV4dChzb3VyY2UudGV4dENvbnRlbnQgPz8gXCJcIil9XFxuW0VORCBTT1VSQ0VdYCk7XG5cbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3RVcmwoe1xuICAgICAgdXJsOiBgJHtiYXNlVXJsfS9hcGkvY2hhdGAsXG4gICAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgICAgaGVhZGVyczogeyBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIiB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBtb2RlbCxcbiAgICAgICAgc3RyZWFtOiBmYWxzZSxcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIHRlbXBlcmF0dXJlOiByZXF1ZXN0LnRlbXBlcmF0dXJlLFxuICAgICAgICAgIG51bV9wcmVkaWN0OiByZXF1ZXN0Lm1heE91dHB1dFRva2Vuc1xuICAgICAgICB9LFxuICAgICAgICBtZXNzYWdlczogW1xuICAgICAgICAgIHsgcm9sZTogXCJzeXN0ZW1cIiwgY29udGVudDogcmVxdWVzdC5zeXN0ZW1Qcm9tcHQgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICByb2xlOiBcInVzZXJcIixcbiAgICAgICAgICAgIGNvbnRlbnQ6IHNvdXJjZUJsb2Nrcy5sZW5ndGhcbiAgICAgICAgICAgICAgPyBgJHtzb3VyY2VCbG9ja3Muam9pbihcIlxcblxcblwiKX1cXG5cXG4ke3JlcXVlc3QudXNlck1lc3NhZ2V9YFxuICAgICAgICAgICAgICA6IHJlcXVlc3QudXNlck1lc3NhZ2VcbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH0pLFxuICAgICAgdGhyb3c6IGZhbHNlXG4gICAgfSk7XG5cbiAgICBpZiAocmVzcG9uc2Uuc3RhdHVzIDwgMjAwIHx8IHJlc3BvbnNlLnN0YXR1cyA+PSAzMDApIHtcbiAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQwNCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE1vZGVsICcke21vZGVsfScgbm90IGZvdW5kIGluIE9sbGFtYS4gQ2hlY2sgYXZhaWxhYmxlIG1vZGVscyBpbiBzZXR0aW5ncy5gKTtcbiAgICAgIH1cbiAgICAgIHRocm93IG5ldyBFcnJvcihgT2xsYW1hIG5vdCByZWFjaGFibGUgYXQgJHtiYXNlVXJsfS4gSXMgaXQgcnVubmluZz9gKTtcbiAgICB9XG5cbiAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuanNvbjtcbiAgICBjb25zdCB0ZXh0ID0gZGF0YS5tZXNzYWdlPy5jb250ZW50Py50cmltPy4oKSA/PyBcIlwiO1xuICAgIGlmICghdGV4dCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUHJvdmlkZXIgcmV0dXJuZWQgYW4gZW1wdHkgcmVzcG9uc2UuXCIpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB0ZXh0LFxuICAgICAgaW5wdXRUb2tlbnM6IGRhdGEucHJvbXB0X2V2YWxfY291bnQsXG4gICAgICBvdXRwdXRUb2tlbnM6IGRhdGEuZXZhbF9jb3VudFxuICAgIH07XG4gIH1cblxuICBhc3luYyB1cGxvYWRTb3VyY2UoKTogUHJvbWlzZTxVcGxvYWRlZEZpbGVJbmZvPiB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiT2xsYW1hIGRvZXMgbm90IHN1cHBvcnQgZmlsZSB1cGxvYWQuIEFkZCBhIHZhdWx0X3BhdGggc291cmNlIGluc3RlYWQuXCIpO1xuICB9XG5cbiAgYXN5bmMgbGlzdFNvdXJjZXMoKTogUHJvbWlzZTxVcGxvYWRlZEZpbGVJbmZvW10+IHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBhc3luYyBkZWxldGVTb3VyY2UoKTogUHJvbWlzZTx2b2lkPiB7fVxuXG4gIGFzeW5jIHZhbGlkYXRlKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB0YWdzID0gYXdhaXQgdGhpcy5mZXRjaFRhZ3MoKTtcbiAgICAgIHJldHVybiBCb29sZWFuKHRhZ3MubW9kZWxzPy5sZW5ndGgpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGxpc3RNb2RlbHMoKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICAgIGNvbnN0IHRhZ3MgPSBhd2FpdCB0aGlzLmZldGNoVGFncygpO1xuICAgIHJldHVybiAodGFncy5tb2RlbHMgPz8gW10pLm1hcCgobW9kZWwpID0+IG1vZGVsLm5hbWUgPz8gXCJcIikuZmlsdGVyKEJvb2xlYW4pO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBmZXRjaFRhZ3MoKTogUHJvbWlzZTxPbGxhbWFUYWdzUmVzcG9uc2U+IHtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3RVcmwoe1xuICAgICAgdXJsOiBgJHt0aGlzLmNvbmZpZy5iYXNlVXJsLnJlcGxhY2UoL1xcLyQvLCBcIlwiKX0vYXBpL3RhZ3NgLFxuICAgICAgdGhyb3c6IGZhbHNlXG4gICAgfSk7XG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA8IDIwMCB8fCByZXNwb25zZS5zdGF0dXMgPj0gMzAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE9sbGFtYSBub3QgcmVhY2hhYmxlIGF0ICR7dGhpcy5jb25maWcuYmFzZVVybH0uIElzIGl0IHJ1bm5pbmc/YCk7XG4gICAgfVxuICAgIHJldHVybiByZXNwb25zZS5qc29uIGFzIE9sbGFtYVRhZ3NSZXNwb25zZTtcbiAgfVxufVxuIiwgImltcG9ydCB7IEFwcCwgVEFic3RyYWN0RmlsZSwgVEZpbGUsIG5vcm1hbGl6ZVBhdGggfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IFByb3ZpZGVySUQsIFJlc29sdmVkU291cmNlLCBTb3VyY2VSZWYgfSBmcm9tIFwiLi90eXBlc1wiO1xuXG5jb25zdCBURVhUX0VYVEVOU0lPTlMgPSBuZXcgU2V0KFtcInR4dFwiLCBcIm1kXCIsIFwibWFya2Rvd25cIiwgXCJqc29uXCIsIFwieWFtbFwiLCBcInltbFwiLCBcImNzdlwiXSk7XG5cbmZ1bmN0aW9uIGdldFZhdWx0RmlsZShhcHA6IEFwcCwgdmF1bHRQYXRoOiBzdHJpbmcpOiBURmlsZSB7XG4gIGNvbnN0IG5vcm1hbGl6ZWQgPSBub3JtYWxpemVQYXRoKHZhdWx0UGF0aCk7XG4gIGNvbnN0IGZpbGUgPSBhcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKG5vcm1hbGl6ZWQpO1xuICBpZiAoIShmaWxlIGluc3RhbmNlb2YgVEZpbGUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBTb3VyY2UgZmlsZSBub3QgZm91bmQgaW4gdmF1bHQ6ICR7dmF1bHRQYXRofWApO1xuICB9XG4gIHJldHVybiBmaWxlO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVhZFZhdWx0VGV4dFNvdXJjZShhcHA6IEFwcCwgdmF1bHRQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBmaWxlID0gZ2V0VmF1bHRGaWxlKGFwcCwgdmF1bHRQYXRoKTtcbiAgY29uc3QgZXh0ZW5zaW9uID0gZmlsZS5leHRlbnNpb24udG9Mb3dlckNhc2UoKTtcbiAgaWYgKCFURVhUX0VYVEVOU0lPTlMuaGFzKGV4dGVuc2lvbikpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFRleHQgZXh0cmFjdGlvbiBpcyBvbmx5IHN1cHBvcnRlZCBmb3IgdGV4dCBmaWxlcy4gQWRkIGEgLnR4dCBjb21wYW5pb24gZm9yICcke3ZhdWx0UGF0aH0nLmApO1xuICB9XG4gIHJldHVybiBhcHAudmF1bHQuY2FjaGVkUmVhZChmaWxlKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlYWRWYXVsdEJpbmFyeVNvdXJjZShhcHA6IEFwcCwgdmF1bHRQYXRoOiBzdHJpbmcpOiBQcm9taXNlPEFycmF5QnVmZmVyPiB7XG4gIGNvbnN0IGZpbGUgPSBnZXRWYXVsdEZpbGUoYXBwLCB2YXVsdFBhdGgpO1xuICByZXR1cm4gYXBwLnZhdWx0LnJlYWRCaW5hcnkoZmlsZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhcnJheUJ1ZmZlclRvQmFzZTY0KGJ1ZmZlcjogQXJyYXlCdWZmZXIpOiBzdHJpbmcge1xuICBsZXQgYmluYXJ5ID0gXCJcIjtcbiAgY29uc3QgYnl0ZXMgPSBuZXcgVWludDhBcnJheShidWZmZXIpO1xuICBjb25zdCBjaHVua1NpemUgPSAweDgwMDA7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgYnl0ZXMubGVuZ3RoOyBpICs9IGNodW5rU2l6ZSkge1xuICAgIGNvbnN0IGNodW5rID0gYnl0ZXMuc3ViYXJyYXkoaSwgaSArIGNodW5rU2l6ZSk7XG4gICAgYmluYXJ5ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoLi4uY2h1bmspO1xuICB9XG4gIHJldHVybiBidG9hKGJpbmFyeSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXNvbHZlU291cmNlc0ZvclJlcXVlc3QoXG4gIGFwcDogQXBwLFxuICBzb3VyY2VzOiBTb3VyY2VSZWZbXSxcbiAgcHJvdmlkZXJJZDogUHJvdmlkZXJJRFxuKTogUHJvbWlzZTxSZXNvbHZlZFNvdXJjZVtdPiB7XG4gIGNvbnN0IHJlc29sdmVkOiBSZXNvbHZlZFNvdXJjZVtdID0gW107XG4gIGZvciAoY29uc3QgcmVmIG9mIHNvdXJjZXMpIHtcbiAgICBpZiAocHJvdmlkZXJJZCA9PT0gXCJhbnRocm9waWNcIiB8fCAocHJvdmlkZXJJZCA9PT0gXCJnZW1pbmlcIiAmJiByZWYubWltZV90eXBlID09PSBcImFwcGxpY2F0aW9uL3BkZlwiKSkge1xuICAgICAgY29uc3QgYnVmZmVyID0gYXdhaXQgcmVhZFZhdWx0QmluYXJ5U291cmNlKGFwcCwgcmVmLnZhdWx0X3BhdGgpO1xuICAgICAgcmVzb2x2ZWQucHVzaCh7IHJlZiwgYmFzZTY0RGF0YTogYXJyYXlCdWZmZXJUb0Jhc2U2NChidWZmZXIpIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IHRleHQgPSBhd2FpdCByZWFkVmF1bHRUZXh0U291cmNlKGFwcCwgcmVmLnZhdWx0X3BhdGgpO1xuICAgIHJlc29sdmVkLnB1c2goeyByZWYsIHRleHRDb250ZW50OiB0ZXh0IH0pO1xuICB9XG4gIHJldHVybiByZXNvbHZlZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRydW5jYXRlU291cmNlVGV4dCh0ZXh0OiBzdHJpbmcsIG1heENoYXJzID0gNDAwMCk6IHN0cmluZyB7XG4gIHJldHVybiB0ZXh0Lmxlbmd0aCA8PSBtYXhDaGFycyA/IHRleHQgOiB0ZXh0LnNsaWNlKDAsIG1heENoYXJzKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlc2NyaWJlU291cmNlUmVmKHJlZjogU291cmNlUmVmKTogc3RyaW5nIHtcbiAgcmV0dXJuIHJlZi52YXVsdF9wYXRoO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbGlzdFZhdWx0Q2FuZGlkYXRlRmlsZXMoYXBwOiBBcHApOiBURmlsZVtdIHtcbiAgcmV0dXJuIGFwcC52YXVsdFxuICAgIC5nZXRGaWxlcygpXG4gICAgLmZpbHRlcigoZmlsZSkgPT4gW1wicGRmXCIsIFwidHh0XCIsIFwibWRcIiwgXCJtYXJrZG93blwiXS5pbmNsdWRlcyhmaWxlLmV4dGVuc2lvbi50b0xvd2VyQ2FzZSgpKSlcbiAgICAuc29ydCgoYSwgYikgPT4gYS5wYXRoLmxvY2FsZUNvbXBhcmUoYi5wYXRoKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1RGaWxlKGZpbGU6IFRBYnN0cmFjdEZpbGUgfCBudWxsKTogZmlsZSBpcyBURmlsZSB7XG4gIHJldHVybiBCb29sZWFuKGZpbGUpICYmIGZpbGUgaW5zdGFuY2VvZiBURmlsZTtcbn1cbiIsICJpbXBvcnQgeyByZXF1ZXN0VXJsLCBSZXF1ZXN0VXJsUmVzcG9uc2UgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7XG4gIEdlbmVyYXRpb25SZXF1ZXN0LFxuICBHZW5lcmF0aW9uUmVzcG9uc2UsXG4gIE9wZW5BSVByb3ZpZGVyQ29uZmlnLFxuICBVcGxvYWRlZEZpbGVJbmZvXG59IGZyb20gXCIuLi90eXBlc1wiO1xuaW1wb3J0IHsgdHJ1bmNhdGVTb3VyY2VUZXh0IH0gZnJvbSBcIi4uL3NvdXJjZVV0aWxzXCI7XG5pbXBvcnQgeyBBSVByb3ZpZGVyIH0gZnJvbSBcIi4vYmFzZVwiO1xuXG5leHBvcnQgY2xhc3MgT3BlbkFJUHJvdmlkZXIgaW1wbGVtZW50cyBBSVByb3ZpZGVyIHtcbiAgcmVhZG9ubHkgaWQgPSBcIm9wZW5haVwiO1xuICByZWFkb25seSBuYW1lID0gXCJPcGVuQUlcIjtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IGNvbmZpZzogT3BlbkFJUHJvdmlkZXJDb25maWcpIHt9XG5cbiAgYXN5bmMgZ2VuZXJhdGUocmVxdWVzdDogR2VuZXJhdGlvblJlcXVlc3QpOiBQcm9taXNlPEdlbmVyYXRpb25SZXNwb25zZT4ge1xuICAgIHRoaXMuZW5zdXJlQ29uZmlndXJlZCgpO1xuICAgIGNvbnN0IGJhc2VVcmwgPSB0aGlzLmNvbmZpZy5iYXNlVXJsLnJlcGxhY2UoL1xcLyQvLCBcIlwiKTtcbiAgICBjb25zdCBtb2RlbCA9IHJlcXVlc3QubW9kZWwgfHwgdGhpcy5jb25maWcuZGVmYXVsdE1vZGVsO1xuICAgIGNvbnN0IHNvdXJjZUJsb2NrcyA9IChyZXF1ZXN0LnJlc29sdmVkU291cmNlcyA/PyBbXSlcbiAgICAgIC5maWx0ZXIoKHNvdXJjZSkgPT4gc291cmNlLnRleHRDb250ZW50KVxuICAgICAgLm1hcCgoc291cmNlKSA9PiBgW1NPVVJDRTogJHtzb3VyY2UucmVmLmxhYmVsfV1cXG4ke3RydW5jYXRlU291cmNlVGV4dChzb3VyY2UudGV4dENvbnRlbnQgPz8gXCJcIil9XFxuW0VORCBTT1VSQ0VdYCk7XG5cbiAgICBjb25zdCBib2R5OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHtcbiAgICAgIG1vZGVsLFxuICAgICAgbWF4X3Rva2VuczogcmVxdWVzdC5tYXhPdXRwdXRUb2tlbnMsXG4gICAgICBtZXNzYWdlczogW1xuICAgICAgICB7IHJvbGU6IFwic3lzdGVtXCIsIGNvbnRlbnQ6IHJlcXVlc3Quc3lzdGVtUHJvbXB0IH0sXG4gICAgICAgIHtcbiAgICAgICAgICByb2xlOiBcInVzZXJcIixcbiAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHR5cGU6IFwidGV4dFwiLFxuICAgICAgICAgICAgICB0ZXh0OiBzb3VyY2VCbG9ja3MubGVuZ3RoXG4gICAgICAgICAgICAgICAgPyBgJHtzb3VyY2VCbG9ja3Muam9pbihcIlxcblxcblwiKX1cXG5cXG4ke3JlcXVlc3QudXNlck1lc3NhZ2V9YFxuICAgICAgICAgICAgICAgIDogcmVxdWVzdC51c2VyTWVzc2FnZVxuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgXVxuICAgIH07XG5cbiAgICBpZiAoIW1vZGVsLnN0YXJ0c1dpdGgoXCJncHQtNVwiKSkge1xuICAgICAgYm9keS50ZW1wZXJhdHVyZSA9IHJlcXVlc3QudGVtcGVyYXR1cmU7XG4gICAgfVxuXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCByZXF1ZXN0VXJsKHtcbiAgICAgIHVybDogYCR7YmFzZVVybH0vY2hhdC9jb21wbGV0aW9uc2AsXG4gICAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke3RoaXMuY29uZmlnLmFwaUtleX1gXG4gICAgICB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoYm9keSksXG4gICAgICB0aHJvdzogZmFsc2VcbiAgICB9KTtcblxuICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPCAyMDAgfHwgcmVzcG9uc2Uuc3RhdHVzID49IDMwMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKHRoaXMuZXh0cmFjdEVycm9yKHJlc3BvbnNlKSk7XG4gICAgfVxuXG4gICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmpzb247XG4gICAgY29uc3QgdGV4dCA9IGRhdGEuY2hvaWNlcz8uWzBdPy5tZXNzYWdlPy5jb250ZW50Py50cmltPy4oKSA/PyBcIlwiO1xuICAgIGlmICghdGV4dCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUHJvdmlkZXIgcmV0dXJuZWQgYW4gZW1wdHkgcmVzcG9uc2UuXCIpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB0ZXh0LFxuICAgICAgaW5wdXRUb2tlbnM6IGRhdGEudXNhZ2U/LnByb21wdF90b2tlbnMsXG4gICAgICBvdXRwdXRUb2tlbnM6IGRhdGEudXNhZ2U/LmNvbXBsZXRpb25fdG9rZW5zXG4gICAgfTtcbiAgfVxuXG4gIGFzeW5jIHVwbG9hZFNvdXJjZSgpOiBQcm9taXNlPFVwbG9hZGVkRmlsZUluZm8+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaGlzIHByb3ZpZGVyIGRvZXMgbm90IHN1cHBvcnQgZmlsZSB1cGxvYWQuIFVzZSB2YXVsdF9wYXRoIGluc3RlYWQuXCIpO1xuICB9XG5cbiAgYXN5bmMgbGlzdFNvdXJjZXMoKTogUHJvbWlzZTxVcGxvYWRlZEZpbGVJbmZvW10+IHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBhc3luYyBkZWxldGVTb3VyY2UoKTogUHJvbWlzZTx2b2lkPiB7fVxuXG4gIGFzeW5jIHZhbGlkYXRlKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGlmICghdGhpcy5jb25maWcuYXBpS2V5LnRyaW0oKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCByZXF1ZXN0VXJsKHtcbiAgICAgICAgdXJsOiBgJHt0aGlzLmNvbmZpZy5iYXNlVXJsLnJlcGxhY2UoL1xcLyQvLCBcIlwiKX0vbW9kZWxzYCxcbiAgICAgICAgaGVhZGVyczogeyBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7dGhpcy5jb25maWcuYXBpS2V5fWAgfSxcbiAgICAgICAgdGhyb3c6IGZhbHNlXG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXNwb25zZS5zdGF0dXMgPj0gMjAwICYmIHJlc3BvbnNlLnN0YXR1cyA8IDMwMDtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGVuc3VyZUNvbmZpZ3VyZWQoKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmNvbmZpZy5hcGlLZXkudHJpbSgpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJObyBPcGVuQUkgQVBJIGtleSBzZXQuIENoZWNrIHBsdWdpbiBzZXR0aW5ncy5cIik7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBleHRyYWN0RXJyb3IocmVzcG9uc2U6IFJlcXVlc3RVcmxSZXNwb25zZSk6IHN0cmluZyB7XG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAxIHx8IHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAzKSB7XG4gICAgICByZXR1cm4gXCJPcGVuQUkgQVBJIGtleSByZWplY3RlZC4gQ2hlY2sgc2V0dGluZ3MuXCI7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuanNvbjtcbiAgICAgIGNvbnN0IG1zZyA9IGRhdGE/LmVycm9yPy5tZXNzYWdlID8/IGBPcGVuQUkgcmVxdWVzdCBmYWlsZWQgKCR7cmVzcG9uc2Uuc3RhdHVzfSkuYDtcbiAgICAgIHJldHVybiByZXNwb25zZS5zdGF0dXMgPT09IDQyOSA/IGBPcGVuQUkgcXVvdGEvcmF0ZSBlcnJvcjogJHttc2d9YCA6IG1zZztcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBgT3BlbkFJIHJlcXVlc3QgZmFpbGVkICgke3Jlc3BvbnNlLnN0YXR1c30pLmA7XG4gICAgfVxuICB9XG59XG4iLCAiaW1wb3J0IHsgUHJvdmlkZXJJRCwgU3lieWxTZXR0aW5ncyB9IGZyb20gXCIuLi90eXBlc1wiO1xuaW1wb3J0IHsgQUlQcm92aWRlciB9IGZyb20gXCIuL2Jhc2VcIjtcbmltcG9ydCB7IEFudGhyb3BpY1Byb3ZpZGVyIH0gZnJvbSBcIi4vYW50aHJvcGljXCI7XG5pbXBvcnQgeyBHZW1pbmlQcm92aWRlciB9IGZyb20gXCIuL2dlbWluaVwiO1xuaW1wb3J0IHsgT2xsYW1hUHJvdmlkZXIgfSBmcm9tIFwiLi9vbGxhbWFcIjtcbmltcG9ydCB7IE9wZW5BSVByb3ZpZGVyIH0gZnJvbSBcIi4vb3BlbmFpXCI7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRQcm92aWRlcihzZXR0aW5nczogU3lieWxTZXR0aW5ncywgb3ZlcnJpZGVJZD86IFByb3ZpZGVySUQpOiBBSVByb3ZpZGVyIHtcbiAgY29uc3QgaWQgPSBvdmVycmlkZUlkID8/IHNldHRpbmdzLmFjdGl2ZVByb3ZpZGVyO1xuICBzd2l0Y2ggKGlkKSB7XG4gICAgY2FzZSBcImdlbWluaVwiOlxuICAgICAgcmV0dXJuIG5ldyBHZW1pbmlQcm92aWRlcihzZXR0aW5ncy5wcm92aWRlcnMuZ2VtaW5pKTtcbiAgICBjYXNlIFwib3BlbmFpXCI6XG4gICAgICByZXR1cm4gbmV3IE9wZW5BSVByb3ZpZGVyKHNldHRpbmdzLnByb3ZpZGVycy5vcGVuYWkpO1xuICAgIGNhc2UgXCJhbnRocm9waWNcIjpcbiAgICAgIHJldHVybiBuZXcgQW50aHJvcGljUHJvdmlkZXIoc2V0dGluZ3MucHJvdmlkZXJzLmFudGhyb3BpYyk7XG4gICAgY2FzZSBcIm9sbGFtYVwiOlxuICAgICAgcmV0dXJuIG5ldyBPbGxhbWFQcm92aWRlcihzZXR0aW5ncy5wcm92aWRlcnMub2xsYW1hKTtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHByb3ZpZGVyOiAke2lkfWApO1xuICB9XG59XG4iLCAiaW1wb3J0IHsgTm90aWNlLCBURmlsZSB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHR5cGUgU3lieWxQbHVnaW4gZnJvbSBcIi4vbWFpblwiO1xuaW1wb3J0IHsgZ2V0U2VsZWN0aW9uLCBpbnNlcnRCZWxvd1NlbGVjdGlvbiB9IGZyb20gXCIuL2VkaXRvclwiO1xuaW1wb3J0IHsgcmVtb3ZlU291cmNlUmVmLCB1cHNlcnRTb3VyY2VSZWYsIHdyaXRlRnJvbnRNYXR0ZXJLZXkgfSBmcm9tIFwiLi9mcm9udG1hdHRlclwiO1xuaW1wb3J0IHtcbiAgZm9ybWF0QXNrT3JhY2xlLFxuICBmb3JtYXREZWNsYXJlQWN0aW9uLFxuICBmb3JtYXRFeHBhbmRTY2VuZSxcbiAgZm9ybWF0SW50ZXJwcmV0T3JhY2xlLFxuICBmb3JtYXRTdGFydFNjZW5lLFxuICBmb3JtYXRTdWdnZXN0Q29uc2VxdWVuY2UsXG4gIExvbmVsb2dGb3JtYXRPcHRpb25zXG59IGZyb20gXCIuL2xvbmVsb2cvZm9ybWF0dGVyXCI7XG5pbXBvcnQgeyBwYXJzZUxvbmVsb2dDb250ZXh0LCBzZXJpYWxpemVDb250ZXh0IH0gZnJvbSBcIi4vbG9uZWxvZy9wYXJzZXJcIjtcbmltcG9ydCB7IE1hbmFnZVNvdXJjZXNNb2RhbCwgb3BlbklucHV0TW9kYWwsIHBpY2tTb3VyY2VSZWYsIHBpY2tWYXVsdEZpbGUgfSBmcm9tIFwiLi9tb2RhbHNcIjtcbmltcG9ydCB7IHJlc29sdmVTb3VyY2VzRm9yUmVxdWVzdCB9IGZyb20gXCIuL3NvdXJjZVV0aWxzXCI7XG5pbXBvcnQgeyBOb3RlRnJvbnRNYXR0ZXIsIFNvdXJjZVJlZiwgU3lieWxTZXR0aW5ncyB9IGZyb20gXCIuL3R5cGVzXCI7XG5cbmZ1bmN0aW9uIGlzTG9uZWxvZ0FjdGl2ZShzZXR0aW5nczogU3lieWxTZXR0aW5ncywgZm06IE5vdGVGcm9udE1hdHRlcik6IGJvb2xlYW4ge1xuICByZXR1cm4gZm0ubG9uZWxvZyA/PyBzZXR0aW5ncy5sb25lbG9nTW9kZTtcbn1cblxuZnVuY3Rpb24gbG9uZWxvZ09wdHMoc2V0dGluZ3M6IFN5YnlsU2V0dGluZ3MpOiBMb25lbG9nRm9ybWF0T3B0aW9ucyB7XG4gIHJldHVybiB7IHdyYXBJbkNvZGVCbG9jazogc2V0dGluZ3MubG9uZWxvZ1dyYXBDb2RlQmxvY2sgPz8gdHJ1ZSB9O1xufVxuXG5mdW5jdGlvbiBnZW5lcmljQmxvY2txdW90ZShsYWJlbDogc3RyaW5nLCB0ZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYD4gWyR7bGFiZWx9XSAke3RleHQudHJpbSgpLnJlcGxhY2UoL1xcbi9nLCBcIlxcbj4gXCIpfWA7XG59XG5cbmZ1bmN0aW9uIGluZmVyTWltZVR5cGUoZmlsZTogVEZpbGUgfCBGaWxlKTogc3RyaW5nIHtcbiAgY29uc3QgbmFtZSA9IFwicGF0aFwiIGluIGZpbGUgPyBmaWxlLnBhdGggOiBmaWxlLm5hbWU7XG4gIHJldHVybiBuYW1lLnRvTG93ZXJDYXNlKCkuZW5kc1dpdGgoXCIucGRmXCIpID8gXCJhcHBsaWNhdGlvbi9wZGZcIiA6IFwidGV4dC9wbGFpblwiO1xufVxuXG5mdW5jdGlvbiB0b2RheUlzb0RhdGUoKTogc3RyaW5nIHtcbiAgcmV0dXJuIG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKS5zbGljZSgwLCAxMCk7XG59XG5cbmZ1bmN0aW9uIHBhcnNlTG9uZWxvZ09yYWNsZVJlc3BvbnNlKHRleHQ6IHN0cmluZyk6IHsgcmVzdWx0OiBzdHJpbmc7IGludGVycHJldGF0aW9uOiBzdHJpbmcgfSB7XG4gIGNvbnN0IGxpbmVzID0gdGV4dFxuICAgIC5yZXBsYWNlKC9ePlxccyovZ20sIFwiXCIpXG4gICAgLnNwbGl0KFwiXFxuXCIpXG4gICAgLm1hcCgobGluZSkgPT4gbGluZS50cmltKCkpXG4gICAgLmZpbHRlcihCb29sZWFuKTtcbiAgY29uc3QgcmVzdWx0ID0gbGluZXMuZmluZCgobGluZSkgPT4gbGluZS5zdGFydHNXaXRoKFwiLT5cIikpPy5yZXBsYWNlKC9eLT5cXHMqLywgXCJcIikgPz8gXCJVbmNsZWFyXCI7XG4gIGNvbnN0IGludGVycHJldGF0aW9uID0gbGluZXMuZmlsdGVyKChsaW5lKSA9PiAhbGluZS5zdGFydHNXaXRoKFwiLT5cIikpLmpvaW4oXCJcXG5cIik7XG4gIHJldHVybiB7IHJlc3VsdCwgaW50ZXJwcmV0YXRpb24gfTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gYWRkU291cmNlVG9Ob3RlKHBsdWdpbjogU3lieWxQbHVnaW4sIGZpbGU6IFRGaWxlKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IHZhdWx0RmlsZSA9IGF3YWl0IHBpY2tWYXVsdEZpbGUocGx1Z2luLmFwcCwgXCJDaG9vc2UgYSB2YXVsdCBmaWxlXCIpO1xuICBpZiAoIXZhdWx0RmlsZSkge1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCByZWY6IFNvdXJjZVJlZiA9IHtcbiAgICBsYWJlbDogdmF1bHRGaWxlLmJhc2VuYW1lLFxuICAgIG1pbWVfdHlwZTogaW5mZXJNaW1lVHlwZSh2YXVsdEZpbGUpLFxuICAgIHZhdWx0X3BhdGg6IHZhdWx0RmlsZS5wYXRoXG4gIH07XG4gIGF3YWl0IHVwc2VydFNvdXJjZVJlZihwbHVnaW4uYXBwLCBmaWxlLCByZWYpO1xuICBuZXcgTm90aWNlKGBTb3VyY2UgYWRkZWQ6ICR7dmF1bHRGaWxlLnBhdGh9YCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIG1hbmFnZVNvdXJjZXMocGx1Z2luOiBTeWJ5bFBsdWdpbik6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBjb250ZXh0ID0gYXdhaXQgcGx1Z2luLmdldEFjdGl2ZU5vdGVDb250ZXh0KCk7XG4gIGlmICghY29udGV4dD8udmlldy5maWxlKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIG5ldyBNYW5hZ2VTb3VyY2VzTW9kYWwoXG4gICAgcGx1Z2luLmFwcCxcbiAgICBjb250ZXh0LmZtLnNvdXJjZXMgPz8gW10sXG4gICAgYXN5bmMgKHJlZikgPT4gcmVtb3ZlU291cmNlUmVmKHBsdWdpbi5hcHAsIGNvbnRleHQudmlldy5maWxlISwgcmVmKVxuICApLm9wZW4oKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcnVuR2VuZXJhdGlvbihcbiAgcGx1Z2luOiBTeWJ5bFBsdWdpbixcbiAgdXNlck1lc3NhZ2U6IHN0cmluZyxcbiAgZm9ybWF0dGVyOiAodGV4dDogc3RyaW5nLCBmbTogTm90ZUZyb250TWF0dGVyKSA9PiBzdHJpbmcsXG4gIG1heE91dHB1dFRva2VucyA9IDUxMixcbiAgcGxhY2VtZW50PzogXCJjdXJzb3JcIiB8IFwiZW5kLW9mLW5vdGVcIiB8IFwiYmVsb3ctc2VsZWN0aW9uXCJcbik6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBjb250ZXh0ID0gYXdhaXQgcGx1Z2luLmdldEFjdGl2ZU5vdGVDb250ZXh0KCk7XG4gIGlmICghY29udGV4dCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHRyeSB7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBwbHVnaW4ucmVxdWVzdEdlbmVyYXRpb24oY29udGV4dC5mbSwgY29udGV4dC5ub3RlQm9keSwgdXNlck1lc3NhZ2UsIG1heE91dHB1dFRva2Vucyk7XG4gICAgY29uc3QgZm9ybWF0dGVkID0gZm9ybWF0dGVyKHJlc3BvbnNlLnRleHQsIGNvbnRleHQuZm0pO1xuICAgIGlmIChwbGFjZW1lbnQgPT09IFwiYmVsb3ctc2VsZWN0aW9uXCIpIHtcbiAgICAgIGluc2VydEJlbG93U2VsZWN0aW9uKGNvbnRleHQudmlldy5lZGl0b3IsIGZvcm1hdHRlZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBsdWdpbi5pbnNlcnRUZXh0KGNvbnRleHQudmlldywgZm9ybWF0dGVkLCBwbGFjZW1lbnQpO1xuICAgIH1cbiAgICBwbHVnaW4ubWF5YmVJbnNlcnRUb2tlbkNvbW1lbnQoY29udGV4dC52aWV3LCByZXNwb25zZSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgbmV3IE5vdGljZShgU3lieWwgZXJyb3I6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWdpc3RlckFsbENvbW1hbmRzKHBsdWdpbjogU3lieWxQbHVnaW4pOiB2b2lkIHtcbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOmluc2VydC1mcm9udG1hdHRlclwiLFxuICAgIG5hbWU6IFwiSW5zZXJ0IE5vdGUgRnJvbnRtYXR0ZXJcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY29udGV4dCA9IGF3YWl0IHBsdWdpbi5nZXRBY3RpdmVOb3RlQ29udGV4dCgpO1xuICAgICAgaWYgKCFjb250ZXh0Py52aWV3LmZpbGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgdmFsdWVzID0gYXdhaXQgb3BlbklucHV0TW9kYWwocGx1Z2luLmFwcCwgXCJJbnNlcnQgU3lieWwgRnJvbnRtYXR0ZXJcIiwgW1xuICAgICAgICB7IGtleTogXCJydWxlc2V0XCIsIGxhYmVsOiBcIkdhbWUgLyBydWxlc2V0XCIsIHBsYWNlaG9sZGVyOiBcIklyb25zd29yblwiIH0sXG4gICAgICAgIHsga2V5OiBcInBjc1wiLCBsYWJlbDogXCJQQ1wiLCBvcHRpb25hbDogdHJ1ZSwgcGxhY2Vob2xkZXI6IFwiS2lyYSBWb3NzLCBkYW5nZXJvdXMgcmFuaywgdm93OiByZWNvdmVyIHRoZSByZWxpY1wiIH0sXG4gICAgICAgIHsga2V5OiBcInRvbmVcIiwgbGFiZWw6IFwiVG9uZVwiLCBvcHRpb25hbDogdHJ1ZSwgcGxhY2Vob2xkZXI6IFwiR3JpdHR5LCBob3BlZnVsXCIgfSxcbiAgICAgICAgeyBrZXk6IFwibGFuZ3VhZ2VcIiwgbGFiZWw6IFwiTGFuZ3VhZ2VcIiwgb3B0aW9uYWw6IHRydWUsIHBsYWNlaG9sZGVyOiBcIkxlYXZlIGJsYW5rIGZvciBhdXRvLWRldGVjdFwiIH1cbiAgICAgIF0pO1xuICAgICAgaWYgKCF2YWx1ZXMpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKCF2YWx1ZXMucnVsZXNldCkge1xuICAgICAgICBuZXcgTm90aWNlKFwiUnVsZXNldCBpcyByZXF1aXJlZC5cIik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGF3YWl0IHBsdWdpbi5hcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGNvbnRleHQudmlldy5maWxlLCAoZm0pID0+IHtcbiAgICAgICAgZm1bXCJydWxlc2V0XCJdID0gdmFsdWVzLnJ1bGVzZXQ7XG4gICAgICAgIGZtW1wicHJvdmlkZXJcIl0gPSBmbVtcInByb3ZpZGVyXCJdID8/IHBsdWdpbi5zZXR0aW5ncy5hY3RpdmVQcm92aWRlcjtcbiAgICAgICAgZm1bXCJvcmFjbGVfbW9kZVwiXSA9IGZtW1wib3JhY2xlX21vZGVcIl0gPz8gXCJ5ZXMtbm9cIjtcbiAgICAgICAgZm1bXCJsb25lbG9nXCJdID0gZm1bXCJsb25lbG9nXCJdID8/IHBsdWdpbi5zZXR0aW5ncy5sb25lbG9nTW9kZTtcbiAgICAgICAgZm1bXCJzY2VuZV9jb3VudGVyXCJdID0gZm1bXCJzY2VuZV9jb3VudGVyXCJdID8/IDE7XG4gICAgICAgIGZtW1wic2Vzc2lvbl9udW1iZXJcIl0gPSBmbVtcInNlc3Npb25fbnVtYmVyXCJdID8/IDE7XG4gICAgICAgIGZtW1wiZ2FtZV9jb250ZXh0XCJdID0gZm1bXCJnYW1lX2NvbnRleHRcIl0gPz8gXCJcIjtcbiAgICAgICAgZm1bXCJzY2VuZV9jb250ZXh0XCJdID0gZm1bXCJzY2VuZV9jb250ZXh0XCJdID8/IFwiXCI7XG4gICAgICAgIGlmICh2YWx1ZXMucGNzKSBmbVtcInBjc1wiXSA9IHZhbHVlcy5wY3M7XG4gICAgICAgIGlmICh2YWx1ZXMudG9uZSkgZm1bXCJ0b25lXCJdID0gdmFsdWVzLnRvbmU7XG4gICAgICAgIGlmICh2YWx1ZXMubGFuZ3VhZ2UpIGZtW1wibGFuZ3VhZ2VcIl0gPSB2YWx1ZXMubGFuZ3VhZ2U7XG4gICAgICB9KTtcbiAgICAgIG5ldyBOb3RpY2UoXCJTeWJ5bCBmcm9udG1hdHRlciBpbnNlcnRlZC5cIik7XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6ZGlnZXN0LXNvdXJjZVwiLFxuICAgIG5hbWU6IFwiRGlnZXN0IFNvdXJjZSBpbnRvIEdhbWUgQ29udGV4dFwiLFxuICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjb250ZXh0ID0gYXdhaXQgcGx1Z2luLmdldEFjdGl2ZU5vdGVDb250ZXh0KCk7XG4gICAgICBpZiAoIWNvbnRleHQ/LnZpZXcuZmlsZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCB2YXVsdEZpbGUgPSBhd2FpdCBwaWNrVmF1bHRGaWxlKHBsdWdpbi5hcHAsIFwiQ2hvb3NlIGEgc291cmNlIGZpbGUgdG8gZGlnZXN0XCIpO1xuICAgICAgaWYgKCF2YXVsdEZpbGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgcmVmOiBTb3VyY2VSZWYgPSB7XG4gICAgICAgIGxhYmVsOiB2YXVsdEZpbGUuYmFzZW5hbWUsXG4gICAgICAgIG1pbWVfdHlwZTogaW5mZXJNaW1lVHlwZSh2YXVsdEZpbGUpLFxuICAgICAgICB2YXVsdF9wYXRoOiB2YXVsdEZpbGUucGF0aFxuICAgICAgfTtcbiAgICAgIGNvbnN0IHByb3ZpZGVySWQgPSBjb250ZXh0LmZtLnByb3ZpZGVyID8/IHBsdWdpbi5zZXR0aW5ncy5hY3RpdmVQcm92aWRlcjtcbiAgICAgIGxldCByZXNvbHZlZFNvdXJjZXM7XG4gICAgICB0cnkge1xuICAgICAgICByZXNvbHZlZFNvdXJjZXMgPSBhd2FpdCByZXNvbHZlU291cmNlc0ZvclJlcXVlc3QocGx1Z2luLmFwcCwgW3JlZl0sIHByb3ZpZGVySWQpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgbmV3IE5vdGljZShgQ2Fubm90IHJlYWQgc291cmNlOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgcnVsZXNldCA9IGNvbnRleHQuZm0ucnVsZXNldCA/PyBcInRoZSBnYW1lXCI7XG4gICAgICBjb25zdCBkaWdlc3RQcm9tcHQgPSBgRGlzdGlsbCB0aGUgZm9sbG93aW5nIHNvdXJjZSBtYXRlcmlhbCBmb3IgdXNlIGluIGEgc29sbyB0YWJsZXRvcCBSUEcgc2Vzc2lvbiBvZiBcIiR7cnVsZXNldH1cIi5cblxuRXh0cmFjdCBhbmQgY29uZGVuc2UgaW50byBhIGNvbXBhY3QgcmVmZXJlbmNlOlxuLSBDb3JlIHJ1bGVzIGFuZCBtZWNoYW5pY3MgcmVsZXZhbnQgdG8gcGxheVxuLSBLZXkgZmFjdGlvbnMsIGxvY2F0aW9ucywgY2hhcmFjdGVycywgYW5kIHdvcmxkIGZhY3RzXG4tIFRvbmUsIGdlbnJlLCBhbmQgc2V0dGluZyBjb252ZW50aW9uc1xuLSBBbnkgdGFibGVzLCBtb3ZlIGxpc3RzLCBvciByYW5kb20gZ2VuZXJhdG9yc1xuXG5CZSBjb25jaXNlIGFuZCBzcGVjaWZpYy4gUHJlc2VydmUgZ2FtZS1tZWNoYW5pY2FsIGRldGFpbHMuIE9taXQgZmxhdm9yIHByb3NlIGFuZCBleGFtcGxlcy5gO1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBwbHVnaW4ucmVxdWVzdFJhd0dlbmVyYXRpb24oXG4gICAgICAgICAgY29udGV4dC5mbSxcbiAgICAgICAgICBkaWdlc3RQcm9tcHQsXG4gICAgICAgICAgMjAwMCxcbiAgICAgICAgICByZXNvbHZlZFNvdXJjZXNcbiAgICAgICAgKTtcbiAgICAgICAgYXdhaXQgcGx1Z2luLmFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoY29udGV4dC52aWV3LmZpbGUsIChmbSkgPT4ge1xuICAgICAgICAgIGZtW1wiZ2FtZV9jb250ZXh0XCJdID0gcmVzcG9uc2UudGV4dDtcbiAgICAgICAgfSk7XG4gICAgICAgIG5ldyBOb3RpY2UoXCJHYW1lIGNvbnRleHQgdXBkYXRlZC5cIik7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBuZXcgTm90aWNlKGBTeWJ5bCBlcnJvcjogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6YXNrLXRoZS1ydWxlc1wiLFxuICAgIG5hbWU6IFwiQXNrIHRoZSBSdWxlc1wiLFxuICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjb250ZXh0ID0gYXdhaXQgcGx1Z2luLmdldEFjdGl2ZU5vdGVDb250ZXh0KCk7XG4gICAgICBpZiAoIWNvbnRleHQ/LnZpZXcuZmlsZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCBzb3VyY2VzID0gY29udGV4dC5mbS5zb3VyY2VzID8/IFtdO1xuICAgICAgaWYgKCFzb3VyY2VzLmxlbmd0aCkge1xuICAgICAgICBuZXcgTm90aWNlKFwiTm8gc291cmNlcyBhdHRhY2hlZCB0byB0aGlzIG5vdGUuIFVzZSBBZGQgU291cmNlIEZpbGUgZmlyc3QuXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCByZWYgPSBzb3VyY2VzLmxlbmd0aCA9PT0gMVxuICAgICAgICA/IHNvdXJjZXNbMF1cbiAgICAgICAgOiBhd2FpdCBwaWNrU291cmNlUmVmKHBsdWdpbi5hcHAsIFwiQ2hvb3NlIGEgc291cmNlIHRvIHF1ZXJ5XCIsIHNvdXJjZXMpO1xuICAgICAgaWYgKCFyZWYpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgdmFsdWVzID0gYXdhaXQgb3BlbklucHV0TW9kYWwocGx1Z2luLmFwcCwgXCJBc2sgdGhlIFJ1bGVzXCIsIFtcbiAgICAgICAgeyBrZXk6IFwicXVlc3Rpb25cIiwgbGFiZWw6IFwiUXVlc3Rpb25cIiwgcGxhY2Vob2xkZXI6IFwiSG93IGRvZXMgTW9tZW50dW0gd29yaz9cIiB9XG4gICAgICBdKTtcbiAgICAgIGlmICghdmFsdWVzPy5xdWVzdGlvbikge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCBwcm92aWRlcklkID0gY29udGV4dC5mbS5wcm92aWRlciA/PyBwbHVnaW4uc2V0dGluZ3MuYWN0aXZlUHJvdmlkZXI7XG4gICAgICBsZXQgcmVzb2x2ZWRTb3VyY2VzO1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzb2x2ZWRTb3VyY2VzID0gYXdhaXQgcmVzb2x2ZVNvdXJjZXNGb3JSZXF1ZXN0KHBsdWdpbi5hcHAsIFtyZWZdLCBwcm92aWRlcklkKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoYENhbm5vdCByZWFkIHNvdXJjZTogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJ1bGVzZXQgPSBjb250ZXh0LmZtLnJ1bGVzZXQgPz8gXCJ0aGUgZ2FtZVwiO1xuICAgICAgY29uc3QgcHJvbXB0ID0gYFlvdSBhcmUgYSBydWxlcyByZWZlcmVuY2UgZm9yIFwiJHtydWxlc2V0fVwiLlxuQW5zd2VyIHRoZSBmb2xsb3dpbmcgcXVlc3Rpb24gdXNpbmcgb25seSB0aGUgcHJvdmlkZWQgc291cmNlIG1hdGVyaWFsLlxuQmUgcHJlY2lzZSBhbmQgY2l0ZSB0aGUgcmVsZXZhbnQgcnVsZSBvciBwYWdlIHNlY3Rpb24gaWYgcG9zc2libGUuXG5cblF1ZXN0aW9uOiAke3ZhbHVlcy5xdWVzdGlvbn1gO1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBwbHVnaW4ucmVxdWVzdFJhd0dlbmVyYXRpb24oY29udGV4dC5mbSwgcHJvbXB0LCAxMDAwLCByZXNvbHZlZFNvdXJjZXMpO1xuICAgICAgICBwbHVnaW4uaW5zZXJ0VGV4dChjb250ZXh0LnZpZXcsIGdlbmVyaWNCbG9ja3F1b3RlKFwiUnVsZXNcIiwgcmVzcG9uc2UudGV4dCkpO1xuICAgICAgICBwbHVnaW4ubWF5YmVJbnNlcnRUb2tlbkNvbW1lbnQoY29udGV4dC52aWV3LCByZXNwb25zZSk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBuZXcgTm90aWNlKGBTeWJ5bCBlcnJvcjogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6c3RhcnQtc2NlbmVcIixcbiAgICBuYW1lOiBcIlN0YXJ0IFNjZW5lXCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGNvbnRleHQgPSBhd2FpdCBwbHVnaW4uZ2V0QWN0aXZlTm90ZUNvbnRleHQoKTtcbiAgICAgIGlmICghY29udGV4dD8udmlldy5maWxlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmIChpc0xvbmVsb2dBY3RpdmUocGx1Z2luLnNldHRpbmdzLCBjb250ZXh0LmZtKSkge1xuICAgICAgICBjb25zdCB2YWx1ZXMgPSBhd2FpdCBvcGVuSW5wdXRNb2RhbChwbHVnaW4uYXBwLCBcIlN0YXJ0IFNjZW5lXCIsIFtcbiAgICAgICAgICB7IGtleTogXCJzY2VuZURlc2NcIiwgbGFiZWw6IFwiU2NlbmUgZGVzY3JpcHRpb25cIiwgcGxhY2Vob2xkZXI6IFwiRGFyayBhbGxleSwgbWlkbmlnaHRcIiB9XG4gICAgICAgIF0pO1xuICAgICAgICBpZiAoIXZhbHVlcz8uc2NlbmVEZXNjKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGNvdW50ZXIgPSBjb250ZXh0LmZtLnNjZW5lX2NvdW50ZXIgPz8gMTtcbiAgICAgICAgYXdhaXQgcnVuR2VuZXJhdGlvbihcbiAgICAgICAgICBwbHVnaW4sXG4gICAgICAgICAgYFNUQVJUIFNDRU5FLiBHZW5lcmF0ZSBvbmx5OiAyLTMgbGluZXMgb2YgdGhpcmQtcGVyc29uIHBhc3QtdGVuc2UgcHJvc2UgZGVzY3JpYmluZyB0aGUgYXRtb3NwaGVyZSBhbmQgc2V0dGluZyBvZjogXCIke3ZhbHVlcy5zY2VuZURlc2N9XCIuIE5vIGRpYWxvZ3VlLiBObyBQQyBhY3Rpb25zLiBObyBhZGRpdGlvbmFsIGNvbW1lbnRhcnkuYCxcbiAgICAgICAgICAodGV4dCkgPT4gZm9ybWF0U3RhcnRTY2VuZSh0ZXh0LCBgUyR7Y291bnRlcn1gLCB2YWx1ZXMuc2NlbmVEZXNjLCBsb25lbG9nT3B0cyhwbHVnaW4uc2V0dGluZ3MpKVxuICAgICAgICApO1xuICAgICAgICBpZiAocGx1Z2luLnNldHRpbmdzLmxvbmVsb2dBdXRvSW5jU2NlbmUpIHtcbiAgICAgICAgICBhd2FpdCB3cml0ZUZyb250TWF0dGVyS2V5KHBsdWdpbi5hcHAsIGNvbnRleHQudmlldy5maWxlLCBcInNjZW5lX2NvdW50ZXJcIiwgY291bnRlciArIDEpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGF3YWl0IHJ1bkdlbmVyYXRpb24oXG4gICAgICAgIHBsdWdpbixcbiAgICAgICAgXCJTVEFSVCBTQ0VORS4gR2VuZXJhdGUgb25seTogMi0zIGxpbmVzIG9mIHRoaXJkLXBlcnNvbiBwYXN0LXRlbnNlIHByb3NlIGRlc2NyaWJpbmcgdGhlIHNldHRpbmcgYW5kIGF0bW9zcGhlcmUuIE5vIGRpYWxvZ3VlLiBObyBQQyBhY3Rpb25zLiBObyBhZGRpdGlvbmFsIGNvbW1lbnRhcnkuXCIsXG4gICAgICAgICh0ZXh0KSA9PiBnZW5lcmljQmxvY2txdW90ZShcIlNjZW5lXCIsIHRleHQpXG4gICAgICApO1xuICAgIH1cbiAgfSk7XG5cbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOmRlY2xhcmUtYWN0aW9uXCIsXG4gICAgbmFtZTogXCJEZWNsYXJlIEFjdGlvblwiLFxuICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCB2YWx1ZXMgPSBhd2FpdCBvcGVuSW5wdXRNb2RhbChwbHVnaW4uYXBwLCBcIkRlY2xhcmUgQWN0aW9uXCIsIFtcbiAgICAgICAgeyBrZXk6IFwiYWN0aW9uXCIsIGxhYmVsOiBcIkFjdGlvblwiIH0sXG4gICAgICAgIHsga2V5OiBcInJvbGxcIiwgbGFiZWw6IFwiUm9sbCByZXN1bHRcIiB9XG4gICAgICBdKTtcbiAgICAgIGlmICghdmFsdWVzPy5hY3Rpb24gfHwgIXZhbHVlcy5yb2xsKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGF3YWl0IHJ1bkdlbmVyYXRpb24oXG4gICAgICAgIHBsdWdpbixcbiAgICAgICAgYFBDIGFjdGlvbjogJHt2YWx1ZXMuYWN0aW9ufVxcblJvbGwgcmVzdWx0OiAke3ZhbHVlcy5yb2xsfVxcbkRlc2NyaWJlIG9ubHkgdGhlIGNvbnNlcXVlbmNlcyBhbmQgd29ybGQgcmVhY3Rpb24uIERvIG5vdCBkZXNjcmliZSB0aGUgUEMncyBhY3Rpb24uYCxcbiAgICAgICAgKHRleHQsIGZtKSA9PlxuICAgICAgICAgIGlzTG9uZWxvZ0FjdGl2ZShwbHVnaW4uc2V0dGluZ3MsIGZtKVxuICAgICAgICAgICAgPyBmb3JtYXREZWNsYXJlQWN0aW9uKHZhbHVlcy5hY3Rpb24sIHZhbHVlcy5yb2xsLCB0ZXh0LCBsb25lbG9nT3B0cyhwbHVnaW4uc2V0dGluZ3MpKVxuICAgICAgICAgICAgOiBgPiBbQWN0aW9uXSAke3ZhbHVlcy5hY3Rpb259IHwgUm9sbDogJHt2YWx1ZXMucm9sbH1cXG4+IFtSZXN1bHRdICR7dGV4dC50cmltKCkucmVwbGFjZSgvXFxuL2csIFwiXFxuPiBcIil9YFxuICAgICAgKTtcbiAgICB9XG4gIH0pO1xuXG4gIHBsdWdpbi5hZGRDb21tYW5kKHtcbiAgICBpZDogXCJzeWJ5bDphc2stb3JhY2xlXCIsXG4gICAgbmFtZTogXCJBc2sgT3JhY2xlXCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGNvbnRleHQgPSBhd2FpdCBwbHVnaW4uZ2V0QWN0aXZlTm90ZUNvbnRleHQoKTtcbiAgICAgIGlmICghY29udGV4dCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCB2YWx1ZXMgPSBhd2FpdCBvcGVuSW5wdXRNb2RhbChwbHVnaW4uYXBwLCBcIkFzayBPcmFjbGVcIiwgW1xuICAgICAgICB7IGtleTogXCJxdWVzdGlvblwiLCBsYWJlbDogXCJRdWVzdGlvblwiIH0sXG4gICAgICAgIHsga2V5OiBcInJlc3VsdFwiLCBsYWJlbDogXCJPcmFjbGUgcmVzdWx0XCIsIG9wdGlvbmFsOiB0cnVlIH1cbiAgICAgIF0pO1xuICAgICAgaWYgKCF2YWx1ZXM/LnF1ZXN0aW9uKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGhhc1Jlc3VsdCA9IEJvb2xlYW4odmFsdWVzLnJlc3VsdD8udHJpbSgpKTtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBoYXNSZXN1bHRcbiAgICAgICAgPyBgT3JhY2xlIHF1ZXN0aW9uOiAke3ZhbHVlcy5xdWVzdGlvbn1cXG5PcmFjbGUgcmVzdWx0OiAke3ZhbHVlcy5yZXN1bHR9XFxuSW50ZXJwcmV0IHRoaXMgcmVzdWx0IGluIHRoZSBjb250ZXh0IG9mIHRoZSBzY2VuZS4gVGhpcmQgcGVyc29uLCBuZXV0cmFsLCAyLTMgbGluZXMuYFxuICAgICAgICA6IGBPcmFjbGUgcXVlc3Rpb246ICR7dmFsdWVzLnF1ZXN0aW9ufVxcbk9yYWNsZSBtb2RlOiAke2NvbnRleHQuZm0ub3JhY2xlX21vZGUgPz8gXCJ5ZXMtbm9cIn1cXG5SdW4gdGhlIG9yYWNsZSBhbmQgZ2l2ZSB0aGUgcmVzdWx0IHBsdXMgYSAxLTIgbGluZSBuZXV0cmFsIGludGVycHJldGF0aW9uLmA7XG4gICAgICBhd2FpdCBydW5HZW5lcmF0aW9uKFxuICAgICAgICBwbHVnaW4sXG4gICAgICAgIG1lc3NhZ2UsXG4gICAgICAgICh0ZXh0LCBmbSkgPT4ge1xuICAgICAgICAgIGlmICghaXNMb25lbG9nQWN0aXZlKHBsdWdpbi5zZXR0aW5ncywgZm0pKSB7XG4gICAgICAgICAgICByZXR1cm4gYD4gW09yYWNsZV0gUTogJHt2YWx1ZXMucXVlc3Rpb259XFxuPiBbQW5zd2VyXSAke3RleHQudHJpbSgpLnJlcGxhY2UoL1xcbi9nLCBcIlxcbj4gXCIpfWA7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChoYXNSZXN1bHQpIHtcbiAgICAgICAgICAgIHJldHVybiBmb3JtYXRBc2tPcmFjbGUodmFsdWVzLnF1ZXN0aW9uLCB2YWx1ZXMucmVzdWx0LnRyaW0oKSwgdGV4dCwgbG9uZWxvZ09wdHMocGx1Z2luLnNldHRpbmdzKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IHBhcnNlZCA9IHBhcnNlTG9uZWxvZ09yYWNsZVJlc3BvbnNlKHRleHQpO1xuICAgICAgICAgIHJldHVybiBmb3JtYXRBc2tPcmFjbGUodmFsdWVzLnF1ZXN0aW9uLCBwYXJzZWQucmVzdWx0LCBwYXJzZWQuaW50ZXJwcmV0YXRpb24sIGxvbmVsb2dPcHRzKHBsdWdpbi5zZXR0aW5ncykpO1xuICAgICAgICB9XG4gICAgICApO1xuICAgIH1cbiAgfSk7XG5cbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOmludGVycHJldC1vcmFjbGVcIixcbiAgICBuYW1lOiBcIkludGVycHJldCBPcmFjbGUgUm9sbFwiLFxuICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjb250ZXh0ID0gYXdhaXQgcGx1Z2luLmdldEFjdGl2ZU5vdGVDb250ZXh0KCk7XG4gICAgICBpZiAoIWNvbnRleHQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgbGV0IHNlbGVjdGVkID0gZ2V0U2VsZWN0aW9uKGNvbnRleHQudmlldy5lZGl0b3IpO1xuICAgICAgaWYgKCFzZWxlY3RlZCkge1xuICAgICAgICBjb25zdCB2YWx1ZXMgPSBhd2FpdCBvcGVuSW5wdXRNb2RhbChwbHVnaW4uYXBwLCBcIkludGVycHJldCBPcmFjbGUgUmVzdWx0XCIsIFtcbiAgICAgICAgICB7IGtleTogXCJvcmFjbGVcIiwgbGFiZWw6IFwiT3JhY2xlIHJlc3VsdFwiIH1cbiAgICAgICAgXSk7XG4gICAgICAgIHNlbGVjdGVkID0gdmFsdWVzPy5vcmFjbGU/LnRyaW0oKSA/PyBcIlwiO1xuICAgICAgfVxuICAgICAgaWYgKCFzZWxlY3RlZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBhd2FpdCBydW5HZW5lcmF0aW9uKFxuICAgICAgICBwbHVnaW4sXG4gICAgICAgIGBJbnRlcnByZXQgdGhpcyBvcmFjbGUgcmVzdWx0IGluIHRoZSBjb250ZXh0IG9mIHRoZSBjdXJyZW50IHNjZW5lOiBcIiR7c2VsZWN0ZWR9XCJcXG5OZXV0cmFsLCB0aGlyZC1wZXJzb24sIDItMyBsaW5lcy4gTm8gZHJhbWF0aWMgbGFuZ3VhZ2UuYCxcbiAgICAgICAgKHRleHQsIGZtKSA9PlxuICAgICAgICAgIGlzTG9uZWxvZ0FjdGl2ZShwbHVnaW4uc2V0dGluZ3MsIGZtKVxuICAgICAgICAgICAgPyBmb3JtYXRJbnRlcnByZXRPcmFjbGUoc2VsZWN0ZWQsIHRleHQsIGxvbmVsb2dPcHRzKHBsdWdpbi5zZXR0aW5ncykpXG4gICAgICAgICAgICA6IGdlbmVyaWNCbG9ja3F1b3RlKFwiSW50ZXJwcmV0YXRpb25cIiwgdGV4dCksXG4gICAgICAgIDUxMixcbiAgICAgICAgXCJiZWxvdy1zZWxlY3Rpb25cIlxuICAgICAgKTtcbiAgICB9XG4gIH0pO1xuXG4gIHBsdWdpbi5hZGRDb21tYW5kKHtcbiAgICBpZDogXCJzeWJ5bDpzdWdnZXN0LWNvbnNlcXVlbmNlXCIsXG4gICAgbmFtZTogXCJXaGF0IE5vd1wiLFxuICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICBhd2FpdCBydW5HZW5lcmF0aW9uKFxuICAgICAgICBwbHVnaW4sXG4gICAgICAgIFwiQmFzZWQgb24gdGhlIGN1cnJlbnQgc2NlbmUgY29udGV4dCwgc3VnZ2VzdCAxLTIgcG9zc2libGUgY29uc2VxdWVuY2VzIG9yIGNvbXBsaWNhdGlvbnMuIFByZXNlbnQgdGhlbSBhcyBuZXV0cmFsIG9wdGlvbnMsIG5vdCBhcyBuYXJyYXRpdmUgb3V0Y29tZXMuIERvIG5vdCBjaG9vc2UgYmV0d2VlbiB0aGVtLlwiLFxuICAgICAgICAodGV4dCwgZm0pID0+XG4gICAgICAgICAgaXNMb25lbG9nQWN0aXZlKHBsdWdpbi5zZXR0aW5ncywgZm0pXG4gICAgICAgICAgICA/IGZvcm1hdFN1Z2dlc3RDb25zZXF1ZW5jZSh0ZXh0LCBsb25lbG9nT3B0cyhwbHVnaW4uc2V0dGluZ3MpKVxuICAgICAgICAgICAgOiBnZW5lcmljQmxvY2txdW90ZShcIk9wdGlvbnNcIiwgdGV4dClcbiAgICAgICk7XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6d2hhdC1jYW4taS1kb1wiLFxuICAgIG5hbWU6IFwiV2hhdCBDYW4gSSBEb1wiLFxuICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICBhd2FpdCBydW5HZW5lcmF0aW9uKFxuICAgICAgICBwbHVnaW4sXG4gICAgICAgIFwiVGhlIHBsYXllciBpcyBzdHVjay4gQmFzZWQgb24gdGhlIGN1cnJlbnQgc2NlbmUgY29udGV4dCwgc3VnZ2VzdCBleGFjdGx5IDMgY29uY3JldGUgYWN0aW9ucyB0aGUgUEMgY291bGQgdGFrZSBuZXh0LiBQcmVzZW50IHRoZW0gYXMgbmV1dHJhbCBvcHRpb25zIG51bWJlcmVkIDFcdTIwMTMzLiBEbyBub3QgcmVzb2x2ZSBvciBuYXJyYXRlIGFueSBvdXRjb21lLiBEbyBub3QgcmVjb21tZW5kIG9uZSBvdmVyIGFub3RoZXIuXCIsXG4gICAgICAgICh0ZXh0LCBmbSkgPT5cbiAgICAgICAgICBpc0xvbmVsb2dBY3RpdmUocGx1Z2luLnNldHRpbmdzLCBmbSlcbiAgICAgICAgICAgID8gZm9ybWF0U3VnZ2VzdENvbnNlcXVlbmNlKHRleHQsIGxvbmVsb2dPcHRzKHBsdWdpbi5zZXR0aW5ncykpXG4gICAgICAgICAgICA6IGdlbmVyaWNCbG9ja3F1b3RlKFwiQWN0aW9uc1wiLCB0ZXh0KVxuICAgICAgKTtcbiAgICB9XG4gIH0pO1xuXG4gIHBsdWdpbi5hZGRDb21tYW5kKHtcbiAgICBpZDogXCJzeWJ5bDpleHBhbmQtc2NlbmVcIixcbiAgICBuYW1lOiBcIkV4cGFuZCBTY2VuZVwiLFxuICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICBhd2FpdCBydW5HZW5lcmF0aW9uKFxuICAgICAgICBwbHVnaW4sXG4gICAgICAgIFwiRXhwYW5kIHRoZSBjdXJyZW50IHNjZW5lIGludG8gYSBwcm9zZSBwYXNzYWdlLiBUaGlyZCBwZXJzb24sIHBhc3QgdGVuc2UsIDEwMC0xNTAgd29yZHMuIE5vIGRpYWxvZ3VlLiBEbyBub3QgZGVzY3JpYmUgdGhlIFBDJ3MgaW50ZXJuYWwgdGhvdWdodHMgb3IgZGVjaXNpb25zLiBTdGF5IHN0cmljdGx5IHdpdGhpbiB0aGUgZXN0YWJsaXNoZWQgc2NlbmUgY29udGV4dC5cIixcbiAgICAgICAgKHRleHQsIGZtKSA9PlxuICAgICAgICAgIGlzTG9uZWxvZ0FjdGl2ZShwbHVnaW4uc2V0dGluZ3MsIGZtKVxuICAgICAgICAgICAgPyBmb3JtYXRFeHBhbmRTY2VuZSh0ZXh0LCBsb25lbG9nT3B0cyhwbHVnaW4uc2V0dGluZ3MpKVxuICAgICAgICAgICAgOiBgLS0tXFxuPiBbUHJvc2VdICR7dGV4dC50cmltKCkucmVwbGFjZSgvXFxuL2csIFwiXFxuPiBcIil9XFxuLS0tYCxcbiAgICAgICAgNjAwXG4gICAgICApO1xuICAgIH1cbiAgfSk7XG5cbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOnVwbG9hZC1zb3VyY2VcIixcbiAgICBuYW1lOiBcIkFkZCBTb3VyY2UgRmlsZVwiLFxuICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjb250ZXh0ID0gYXdhaXQgcGx1Z2luLmdldEFjdGl2ZU5vdGVDb250ZXh0KCk7XG4gICAgICBpZiAoIWNvbnRleHQ/LnZpZXcuZmlsZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBhZGRTb3VyY2VUb05vdGUocGx1Z2luLCBjb250ZXh0LnZpZXcuZmlsZSk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBuZXcgTm90aWNlKGBTeWJ5bCBlcnJvcjogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6bWFuYWdlLXNvdXJjZXNcIixcbiAgICBuYW1lOiBcIk1hbmFnZSBTb3VyY2VzXCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGF3YWl0IG1hbmFnZVNvdXJjZXMocGx1Z2luKTtcbiAgICB9XG4gIH0pO1xuXG4gIHBsdWdpbi5hZGRDb21tYW5kKHtcbiAgICBpZDogXCJzeWJ5bDpsb25lbG9nLXBhcnNlLWNvbnRleHRcIixcbiAgICBuYW1lOiBcIlVwZGF0ZSBTY2VuZSBDb250ZXh0XCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGNvbnRleHQgPSBhd2FpdCBwbHVnaW4uZ2V0QWN0aXZlTm90ZUNvbnRleHQoKTtcbiAgICAgIGlmICghY29udGV4dD8udmlldy5maWxlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICghaXNMb25lbG9nQWN0aXZlKHBsdWdpbi5zZXR0aW5ncywgY29udGV4dC5mbSkpIHtcbiAgICAgICAgbmV3IE5vdGljZShcIkxvbmVsb2cgbW9kZSBpcyBub3QgZW5hYmxlZCBmb3IgdGhpcyBub3RlLlwiKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgcGFyc2VkID0gcGFyc2VMb25lbG9nQ29udGV4dChjb250ZXh0Lm5vdGVCb2R5LCBwbHVnaW4uc2V0dGluZ3MubG9uZWxvZ0NvbnRleHREZXB0aCk7XG4gICAgICBhd2FpdCB3cml0ZUZyb250TWF0dGVyS2V5KHBsdWdpbi5hcHAsIGNvbnRleHQudmlldy5maWxlLCBcInNjZW5lX2NvbnRleHRcIiwgc2VyaWFsaXplQ29udGV4dChwYXJzZWQpKTtcbiAgICAgIG5ldyBOb3RpY2UoXCJTY2VuZSBjb250ZXh0IHVwZGF0ZWQgZnJvbSBsb2cuXCIpO1xuICAgIH1cbiAgfSk7XG5cbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOmxvbmVsb2ctc2Vzc2lvbi1icmVha1wiLFxuICAgIG5hbWU6IFwiTmV3IFNlc3Npb24gSGVhZGVyXCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGNvbnRleHQgPSBhd2FpdCBwbHVnaW4uZ2V0QWN0aXZlTm90ZUNvbnRleHQoKTtcbiAgICAgIGlmICghY29udGV4dD8udmlldy5maWxlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICghaXNMb25lbG9nQWN0aXZlKHBsdWdpbi5zZXR0aW5ncywgY29udGV4dC5mbSkpIHtcbiAgICAgICAgbmV3IE5vdGljZShcIkxvbmVsb2cgbW9kZSBpcyBub3QgZW5hYmxlZCBmb3IgdGhpcyBub3RlLlwiKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgdmFsdWVzID0gYXdhaXQgb3BlbklucHV0TW9kYWwocGx1Z2luLmFwcCwgXCJOZXcgU2Vzc2lvbiBIZWFkZXJcIiwgW1xuICAgICAgICB7IGtleTogXCJkYXRlXCIsIGxhYmVsOiBcIkRhdGVcIiwgdmFsdWU6IHRvZGF5SXNvRGF0ZSgpIH0sXG4gICAgICAgIHsga2V5OiBcImR1cmF0aW9uXCIsIGxhYmVsOiBcIkR1cmF0aW9uXCIsIHBsYWNlaG9sZGVyOiBcIjFoMzBcIiB9LFxuICAgICAgICB7IGtleTogXCJyZWNhcFwiLCBsYWJlbDogXCJSZWNhcFwiLCBvcHRpb25hbDogdHJ1ZSB9XG4gICAgICBdKTtcbiAgICAgIGlmICghdmFsdWVzPy5kYXRlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHNlc3Npb25OdW1iZXIgPSBjb250ZXh0LmZtLnNlc3Npb25fbnVtYmVyID8/IDE7XG4gICAgICBjb25zdCBibG9jayA9IGAjIyBTZXNzaW9uICR7c2Vzc2lvbk51bWJlcn1cXG4qRGF0ZTogJHt2YWx1ZXMuZGF0ZX0gfCBEdXJhdGlvbjogJHt2YWx1ZXMuZHVyYXRpb24gfHwgXCItXCJ9KlxcblxcbiR7dmFsdWVzLnJlY2FwID8gYCoqUmVjYXA6KiogJHt2YWx1ZXMucmVjYXB9XFxuXFxuYCA6IFwiXCJ9YDtcbiAgICAgIHBsdWdpbi5pbnNlcnRUZXh0KGNvbnRleHQudmlldywgYmxvY2ssIFwiY3Vyc29yXCIpO1xuICAgICAgYXdhaXQgd3JpdGVGcm9udE1hdHRlcktleShwbHVnaW4uYXBwLCBjb250ZXh0LnZpZXcuZmlsZSwgXCJzZXNzaW9uX251bWJlclwiLCBzZXNzaW9uTnVtYmVyICsgMSk7XG4gICAgfVxuICB9KTtcbn1cbiIsICJleHBvcnQgaW50ZXJmYWNlIExvbmVsb2dGb3JtYXRPcHRpb25zIHtcbiAgd3JhcEluQ29kZUJsb2NrOiBib29sZWFuO1xuICBzY2VuZUlkPzogc3RyaW5nO1xufVxuXG5mdW5jdGlvbiBmZW5jZShjb250ZW50OiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYFxcYFxcYFxcYFxcbiR7Y29udGVudH1cXG5cXGBcXGBcXGBgO1xufVxuXG5mdW5jdGlvbiBjbGVhbkFpVGV4dCh0ZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gdGV4dC5yZXBsYWNlKC9ePlxccyovZ20sIFwiXCIpLnRyaW0oKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdFN0YXJ0U2NlbmUoXG4gIGFpVGV4dDogc3RyaW5nLFxuICBzY2VuZUlkOiBzdHJpbmcsXG4gIHNjZW5lRGVzYzogc3RyaW5nLFxuICBfb3B0czogTG9uZWxvZ0Zvcm1hdE9wdGlvbnNcbik6IHN0cmluZyB7XG4gIGNvbnN0IGhlYWRlciA9IGAjIyMgJHtzY2VuZUlkfSAqJHtzY2VuZURlc2N9KmA7XG4gIGNvbnN0IGJvZHkgPSBjbGVhbkFpVGV4dChhaVRleHQpO1xuICByZXR1cm4gYCR7aGVhZGVyfVxcblxcbiR7Ym9keX1gO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0RGVjbGFyZUFjdGlvbihcbiAgYWN0aW9uOiBzdHJpbmcsXG4gIHJvbGw6IHN0cmluZyxcbiAgYWlDb25zZXF1ZW5jZTogc3RyaW5nLFxuICBvcHRzOiBMb25lbG9nRm9ybWF0T3B0aW9uc1xuKTogc3RyaW5nIHtcbiAgY29uc3QgY29uc2VxdWVuY2UgPSBjbGVhbkFpVGV4dChhaUNvbnNlcXVlbmNlKVxuICAgIC5zcGxpdChcIlxcblwiKVxuICAgIC5maWx0ZXIoQm9vbGVhbilcbiAgICAubWFwKChsaW5lKSA9PiAobGluZS5zdGFydHNXaXRoKFwiPT5cIikgPyBsaW5lIDogYD0+ICR7bGluZX1gKSlcbiAgICAuam9pbihcIlxcblwiKTtcbiAgY29uc3Qgbm90YXRpb24gPSBgQCAke2FjdGlvbn1cXG5kOiAke3JvbGx9XFxuJHtjb25zZXF1ZW5jZX1gO1xuICByZXR1cm4gb3B0cy53cmFwSW5Db2RlQmxvY2sgPyBmZW5jZShub3RhdGlvbikgOiBub3RhdGlvbjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdEFza09yYWNsZShcbiAgcXVlc3Rpb246IHN0cmluZyxcbiAgb3JhY2xlUmVzdWx0OiBzdHJpbmcsXG4gIGFpSW50ZXJwcmV0YXRpb246IHN0cmluZyxcbiAgb3B0czogTG9uZWxvZ0Zvcm1hdE9wdGlvbnNcbik6IHN0cmluZyB7XG4gIGNvbnN0IGludGVycHJldGF0aW9uID0gY2xlYW5BaVRleHQoYWlJbnRlcnByZXRhdGlvbilcbiAgICAuc3BsaXQoXCJcXG5cIilcbiAgICAuZmlsdGVyKEJvb2xlYW4pXG4gICAgLm1hcCgobGluZSkgPT4gKGxpbmUuc3RhcnRzV2l0aChcIj0+XCIpID8gbGluZSA6IGA9PiAke2xpbmV9YCkpXG4gICAgLmpvaW4oXCJcXG5cIik7XG4gIGNvbnN0IG5vdGF0aW9uID0gYD8gJHtxdWVzdGlvbn1cXG4tPiAke29yYWNsZVJlc3VsdH1cXG4ke2ludGVycHJldGF0aW9ufWA7XG4gIHJldHVybiBvcHRzLndyYXBJbkNvZGVCbG9jayA/IGZlbmNlKG5vdGF0aW9uKSA6IG5vdGF0aW9uO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0SW50ZXJwcmV0T3JhY2xlKFxuICBvcmFjbGVUZXh0OiBzdHJpbmcsXG4gIGFpSW50ZXJwcmV0YXRpb246IHN0cmluZyxcbiAgb3B0czogTG9uZWxvZ0Zvcm1hdE9wdGlvbnNcbik6IHN0cmluZyB7XG4gIGNvbnN0IGludGVycHJldGF0aW9uID0gY2xlYW5BaVRleHQoYWlJbnRlcnByZXRhdGlvbilcbiAgICAuc3BsaXQoXCJcXG5cIilcbiAgICAuZmlsdGVyKEJvb2xlYW4pXG4gICAgLm1hcCgobGluZSkgPT4gKGxpbmUuc3RhcnRzV2l0aChcIj0+XCIpID8gbGluZSA6IGA9PiAke2xpbmV9YCkpXG4gICAgLmpvaW4oXCJcXG5cIik7XG4gIGNvbnN0IG5vdGF0aW9uID0gYC0+ICR7b3JhY2xlVGV4dH1cXG4ke2ludGVycHJldGF0aW9ufWA7XG4gIHJldHVybiBvcHRzLndyYXBJbkNvZGVCbG9jayA/IGZlbmNlKG5vdGF0aW9uKSA6IG5vdGF0aW9uO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0U3VnZ2VzdENvbnNlcXVlbmNlKGFpT3B0aW9uczogc3RyaW5nLCBvcHRzOiBMb25lbG9nRm9ybWF0T3B0aW9ucyk6IHN0cmluZyB7XG4gIGNvbnN0IG9wdGlvbnMgPSBjbGVhbkFpVGV4dChhaU9wdGlvbnMpXG4gICAgLnNwbGl0KFwiXFxuXCIpXG4gICAgLmZpbHRlcigobGluZSkgPT4gbGluZS50cmltKCkubGVuZ3RoID4gMClcbiAgICAubWFwKChsaW5lKSA9PiAobGluZS5zdGFydHNXaXRoKFwiPT5cIikgPyBsaW5lIDogYD0+ICR7bGluZX1gKSlcbiAgICAuam9pbihcIlxcblwiKTtcbiAgcmV0dXJuIG9wdHMud3JhcEluQ29kZUJsb2NrID8gZmVuY2Uob3B0aW9ucykgOiBvcHRpb25zO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0RXhwYW5kU2NlbmUoYWlQcm9zZTogc3RyaW5nLCBfb3B0czogTG9uZWxvZ0Zvcm1hdE9wdGlvbnMpOiBzdHJpbmcge1xuICByZXR1cm4gYFxcXFwtLS1cXG4ke2NsZWFuQWlUZXh0KGFpUHJvc2UpfVxcbi0tLVxcXFxgO1xufVxuIiwgImltcG9ydCB7IEFwcCwgTW9kYWwsIE5vdGljZSwgU2V0dGluZywgVEZpbGUgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IGRlc2NyaWJlU291cmNlUmVmLCBsaXN0VmF1bHRDYW5kaWRhdGVGaWxlcyB9IGZyb20gXCIuL3NvdXJjZVV0aWxzXCI7XG5pbXBvcnQgeyBNb2RhbEZpZWxkLCBTb3VyY2VSZWYgfSBmcm9tIFwiLi90eXBlc1wiO1xuXG5leHBvcnQgY2xhc3MgSW5wdXRNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgcHJpdmF0ZSByZWFkb25seSB2YWx1ZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG5cbiAgY29uc3RydWN0b3IoXG4gICAgYXBwOiBBcHAsXG4gICAgcHJpdmF0ZSByZWFkb25seSB0aXRsZTogc3RyaW5nLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgZmllbGRzOiBNb2RhbEZpZWxkW10sXG4gICAgcHJpdmF0ZSByZWFkb25seSBvblN1Ym1pdDogKHZhbHVlczogUmVjb3JkPHN0cmluZywgc3RyaW5nPikgPT4gdm9pZFxuICApIHtcbiAgICBzdXBlcihhcHApO1xuICAgIHRoaXMudmFsdWVzID0gZmllbGRzLnJlZHVjZTxSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+PigoYWNjLCBmaWVsZCkgPT4ge1xuICAgICAgYWNjW2ZpZWxkLmtleV0gPSBmaWVsZC52YWx1ZSA/PyBcIlwiO1xuICAgICAgcmV0dXJuIGFjYztcbiAgICB9LCB7fSk7XG4gIH1cblxuICBvbk9wZW4oKTogdm9pZCB7XG4gICAgdGhpcy50aXRsZUVsLnNldFRleHQodGhpcy50aXRsZSk7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICBmb3IgKGNvbnN0IGZpZWxkIG9mIHRoaXMuZmllbGRzKSB7XG4gICAgICBuZXcgU2V0dGluZyh0aGlzLmNvbnRlbnRFbClcbiAgICAgICAgLnNldE5hbWUoZmllbGQubGFiZWwpXG4gICAgICAgIC5zZXREZXNjKGZpZWxkLm9wdGlvbmFsID8gXCJPcHRpb25hbFwiIDogXCJcIilcbiAgICAgICAgLmFkZFRleHQoKHRleHQpID0+IHtcbiAgICAgICAgICB0ZXh0LnNldFBsYWNlaG9sZGVyKGZpZWxkLnBsYWNlaG9sZGVyID8/IFwiXCIpO1xuICAgICAgICAgIHRleHQuc2V0VmFsdWUodGhpcy52YWx1ZXNbZmllbGQua2V5XSA/PyBcIlwiKTtcbiAgICAgICAgICB0ZXh0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgdGhpcy52YWx1ZXNbZmllbGQua2V5XSA9IHZhbHVlO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgbmV3IFNldHRpbmcodGhpcy5jb250ZW50RWwpLmFkZEJ1dHRvbigoYnV0dG9uKSA9PiB7XG4gICAgICBidXR0b24uc2V0QnV0dG9uVGV4dChcIkNvbmZpcm1cIikuc2V0Q3RhKCkub25DbGljaygoKSA9PiB7XG4gICAgICAgIHRoaXMub25TdWJtaXQodGhpcy52YWx1ZXMpO1xuICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIG9uQ2xvc2UoKTogdm9pZCB7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gb3BlbklucHV0TW9kYWwoXG4gIGFwcDogQXBwLFxuICB0aXRsZTogc3RyaW5nLFxuICBmaWVsZHM6IE1vZGFsRmllbGRbXVxuKTogUHJvbWlzZTxSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+IHwgbnVsbD4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICBsZXQgc2V0dGxlZCA9IGZhbHNlO1xuICAgIGNvbnN0IG1vZGFsID0gbmV3IElucHV0TW9kYWwoYXBwLCB0aXRsZSwgZmllbGRzLCAodmFsdWVzKSA9PiB7XG4gICAgICBzZXR0bGVkID0gdHJ1ZTtcbiAgICAgIHJlc29sdmUodmFsdWVzKTtcbiAgICB9KTtcbiAgICBjb25zdCBvcmlnaW5hbENsb3NlID0gbW9kYWwub25DbG9zZS5iaW5kKG1vZGFsKTtcbiAgICBtb2RhbC5vbkNsb3NlID0gKCkgPT4ge1xuICAgICAgb3JpZ2luYWxDbG9zZSgpO1xuICAgICAgaWYgKCFzZXR0bGVkKSB7XG4gICAgICAgIHJlc29sdmUobnVsbCk7XG4gICAgICB9XG4gICAgfTtcbiAgICBtb2RhbC5vcGVuKCk7XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGlja0xvY2FsRmlsZSgpOiBQcm9taXNlPEZpbGUgfCBudWxsPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIGNvbnN0IGlucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlucHV0XCIpO1xuICAgIGlucHV0LnR5cGUgPSBcImZpbGVcIjtcbiAgICBpbnB1dC5hY2NlcHQgPSBcIi5wZGYsLnR4dCwubWQsLm1hcmtkb3duXCI7XG4gICAgaW5wdXQub25jaGFuZ2UgPSAoKSA9PiByZXNvbHZlKGlucHV0LmZpbGVzPy5bMF0gPz8gbnVsbCk7XG4gICAgaW5wdXQuY2xpY2soKTtcbiAgfSk7XG59XG5cbmV4cG9ydCBjbGFzcyBWYXVsdEZpbGVQaWNrZXJNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgcHJpdmF0ZSByZWFkb25seSBmaWxlczogVEZpbGVbXTtcblxuICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcHJpdmF0ZSByZWFkb25seSB0aXRsZTogc3RyaW5nLCBwcml2YXRlIHJlYWRvbmx5IG9uUGljazogKGZpbGU6IFRGaWxlKSA9PiB2b2lkKSB7XG4gICAgc3VwZXIoYXBwKTtcbiAgICB0aGlzLmZpbGVzID0gbGlzdFZhdWx0Q2FuZGlkYXRlRmlsZXMoYXBwKTtcbiAgfVxuXG4gIG9uT3BlbigpOiB2b2lkIHtcbiAgICB0aGlzLnRpdGxlRWwuc2V0VGV4dCh0aGlzLnRpdGxlKTtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIGlmICghdGhpcy5maWxlcy5sZW5ndGgpIHtcbiAgICAgIHRoaXMuY29udGVudEVsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IFwiTm8gUERGIG9yIHRleHQgZmlsZXMgZm91bmQgaW4gdGhlIHZhdWx0LlwiIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmZpbGVzLmZvckVhY2goKGZpbGUpID0+IHtcbiAgICAgIG5ldyBTZXR0aW5nKHRoaXMuY29udGVudEVsKVxuICAgICAgICAuc2V0TmFtZShmaWxlLnBhdGgpXG4gICAgICAgIC5zZXREZXNjKGZpbGUuZXh0ZW5zaW9uLnRvTG93ZXJDYXNlKCkpXG4gICAgICAgIC5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xuICAgICAgICAgIGJ1dHRvbi5zZXRCdXR0b25UZXh0KFwiU2VsZWN0XCIpLnNldEN0YSgpLm9uQ2xpY2soKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5vblBpY2soZmlsZSk7XG4gICAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgb25DbG9zZSgpOiB2b2lkIHtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwaWNrVmF1bHRGaWxlKGFwcDogQXBwLCB0aXRsZTogc3RyaW5nKTogUHJvbWlzZTxURmlsZSB8IG51bGw+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgbGV0IHNldHRsZWQgPSBmYWxzZTtcbiAgICBjb25zdCBtb2RhbCA9IG5ldyBWYXVsdEZpbGVQaWNrZXJNb2RhbChhcHAsIHRpdGxlLCAoZmlsZSkgPT4ge1xuICAgICAgc2V0dGxlZCA9IHRydWU7XG4gICAgICByZXNvbHZlKGZpbGUpO1xuICAgIH0pO1xuICAgIGNvbnN0IG9yaWdpbmFsQ2xvc2UgPSBtb2RhbC5vbkNsb3NlLmJpbmQobW9kYWwpO1xuICAgIG1vZGFsLm9uQ2xvc2UgPSAoKSA9PiB7XG4gICAgICBvcmlnaW5hbENsb3NlKCk7XG4gICAgICBpZiAoIXNldHRsZWQpIHtcbiAgICAgICAgcmVzb2x2ZShudWxsKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIG1vZGFsLm9wZW4oKTtcbiAgfSk7XG59XG5cbmV4cG9ydCBjbGFzcyBTb3VyY2VQaWNrZXJNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgY29uc3RydWN0b3IoXG4gICAgYXBwOiBBcHAsXG4gICAgcHJpdmF0ZSByZWFkb25seSB0aXRsZTogc3RyaW5nLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgc291cmNlczogU291cmNlUmVmW10sXG4gICAgcHJpdmF0ZSByZWFkb25seSBvblBpY2s6IChyZWY6IFNvdXJjZVJlZikgPT4gdm9pZFxuICApIHtcbiAgICBzdXBlcihhcHApO1xuICB9XG5cbiAgb25PcGVuKCk6IHZvaWQge1xuICAgIHRoaXMudGl0bGVFbC5zZXRUZXh0KHRoaXMudGl0bGUpO1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gICAgdGhpcy5zb3VyY2VzLmZvckVhY2goKHNvdXJjZSkgPT4ge1xuICAgICAgbmV3IFNldHRpbmcodGhpcy5jb250ZW50RWwpXG4gICAgICAgIC5zZXROYW1lKHNvdXJjZS5sYWJlbClcbiAgICAgICAgLnNldERlc2MoYCR7c291cmNlLm1pbWVfdHlwZX0gfCAke2Rlc2NyaWJlU291cmNlUmVmKHNvdXJjZSl9YClcbiAgICAgICAgLmFkZEJ1dHRvbigoYnV0dG9uKSA9PiB7XG4gICAgICAgICAgYnV0dG9uLnNldEJ1dHRvblRleHQoXCJTZWxlY3RcIikuc2V0Q3RhKCkub25DbGljaygoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLm9uUGljayhzb3VyY2UpO1xuICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIG9uQ2xvc2UoKTogdm9pZCB7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcGlja1NvdXJjZVJlZihhcHA6IEFwcCwgdGl0bGU6IHN0cmluZywgc291cmNlczogU291cmNlUmVmW10pOiBQcm9taXNlPFNvdXJjZVJlZiB8IG51bGw+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgbGV0IHNldHRsZWQgPSBmYWxzZTtcbiAgICBjb25zdCBtb2RhbCA9IG5ldyBTb3VyY2VQaWNrZXJNb2RhbChhcHAsIHRpdGxlLCBzb3VyY2VzLCAocmVmKSA9PiB7XG4gICAgICBzZXR0bGVkID0gdHJ1ZTtcbiAgICAgIHJlc29sdmUocmVmKTtcbiAgICB9KTtcbiAgICBjb25zdCBvcmlnaW5hbENsb3NlID0gbW9kYWwub25DbG9zZS5iaW5kKG1vZGFsKTtcbiAgICBtb2RhbC5vbkNsb3NlID0gKCkgPT4ge1xuICAgICAgb3JpZ2luYWxDbG9zZSgpO1xuICAgICAgaWYgKCFzZXR0bGVkKSB7XG4gICAgICAgIHJlc29sdmUobnVsbCk7XG4gICAgICB9XG4gICAgfTtcbiAgICBtb2RhbC5vcGVuKCk7XG4gIH0pO1xufVxuXG5leHBvcnQgY2xhc3MgTWFuYWdlU291cmNlc01vZGFsIGV4dGVuZHMgTW9kYWwge1xuICBjb25zdHJ1Y3RvcihcbiAgICBhcHA6IEFwcCxcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNvdXJjZXM6IFNvdXJjZVJlZltdLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgb25SZW1vdmU6IChyZWY6IFNvdXJjZVJlZikgPT4gUHJvbWlzZTx2b2lkPlxuICApIHtcbiAgICBzdXBlcihhcHApO1xuICB9XG5cbiAgb25PcGVuKCk6IHZvaWQge1xuICAgIHRoaXMudGl0bGVFbC5zZXRUZXh0KFwiTWFuYWdlIFNvdXJjZXNcIik7XG4gICAgdGhpcy5yZW5kZXIoKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyKCk6IHZvaWQge1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gICAgaWYgKCF0aGlzLnNvdXJjZXMubGVuZ3RoKSB7XG4gICAgICB0aGlzLmNvbnRlbnRFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIk5vIHNvdXJjZXMgYXJlIGF0dGFjaGVkIHRvIHRoaXMgbm90ZS5cIiB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5zb3VyY2VzLmZvckVhY2goKHNvdXJjZSkgPT4ge1xuICAgICAgbmV3IFNldHRpbmcodGhpcy5jb250ZW50RWwpXG4gICAgICAgIC5zZXROYW1lKHNvdXJjZS5sYWJlbClcbiAgICAgICAgLnNldERlc2MoYCR7c291cmNlLm1pbWVfdHlwZX0gfCAke2Rlc2NyaWJlU291cmNlUmVmKHNvdXJjZSl9YClcbiAgICAgICAgLmFkZEJ1dHRvbigoYnV0dG9uKSA9PiB7XG4gICAgICAgICAgYnV0dG9uLnNldEJ1dHRvblRleHQoXCJSZW1vdmVcIikub25DbGljayhhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLm9uUmVtb3ZlKHNvdXJjZSk7XG4gICAgICAgICAgICBuZXcgTm90aWNlKGBSZW1vdmVkICcke3NvdXJjZS5sYWJlbH0nLmApO1xuICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIG9uQ2xvc2UoKTogdm9pZCB7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgfVxufVxuXG4iLCAiaW1wb3J0IHsgQXBwLCBOb3RpY2UsIFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmcgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB0eXBlIFN5YnlsUGx1Z2luIGZyb20gXCIuL21haW5cIjtcbmltcG9ydCB7IGdldFByb3ZpZGVyIH0gZnJvbSBcIi4vcHJvdmlkZXJzXCI7XG5pbXBvcnQgeyBPbGxhbWFQcm92aWRlciB9IGZyb20gXCIuL3Byb3ZpZGVycy9vbGxhbWFcIjtcbmltcG9ydCB7IFByb3ZpZGVySUQsIFN5YnlsU2V0dGluZ3MsIFZhbGlkYXRpb25TdGF0ZSB9IGZyb20gXCIuL3R5cGVzXCI7XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX1NFVFRJTkdTOiBTeWJ5bFNldHRpbmdzID0ge1xuICBhY3RpdmVQcm92aWRlcjogXCJnZW1pbmlcIixcbiAgcHJvdmlkZXJzOiB7XG4gICAgZ2VtaW5pOiB7IGFwaUtleTogXCJcIiwgZGVmYXVsdE1vZGVsOiBcImdlbWluaS0yLjUtZmxhc2hcIiB9LFxuICAgIG9wZW5haTogeyBhcGlLZXk6IFwiXCIsIGRlZmF1bHRNb2RlbDogXCJncHQtNS4yXCIsIGJhc2VVcmw6IFwiaHR0cHM6Ly9hcGkub3BlbmFpLmNvbS92MVwiIH0sXG4gICAgYW50aHJvcGljOiB7IGFwaUtleTogXCJcIiwgZGVmYXVsdE1vZGVsOiBcImNsYXVkZS1zb25uZXQtNC02XCIgfSxcbiAgICBvbGxhbWE6IHsgYmFzZVVybDogXCJodHRwOi8vbG9jYWxob3N0OjExNDM0XCIsIGRlZmF1bHRNb2RlbDogXCJnZW1tYTNcIiB9XG4gIH0sXG4gIGluc2VydGlvbk1vZGU6IFwiY3Vyc29yXCIsXG4gIHNob3dUb2tlbkNvdW50OiBmYWxzZSxcbiAgZGVmYXVsdFRlbXBlcmF0dXJlOiAwLjcsXG4gIGxvbmVsb2dNb2RlOiBmYWxzZSxcbiAgbG9uZWxvZ0NvbnRleHREZXB0aDogNjAsXG4gIGxvbmVsb2dXcmFwQ29kZUJsb2NrOiB0cnVlLFxuICBsb25lbG9nQXV0b0luY1NjZW5lOiB0cnVlXG59O1xuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplU2V0dGluZ3MocmF3OiBQYXJ0aWFsPFN5YnlsU2V0dGluZ3M+IHwgbnVsbCB8IHVuZGVmaW5lZCk6IFN5YnlsU2V0dGluZ3Mge1xuICByZXR1cm4ge1xuICAgIC4uLkRFRkFVTFRfU0VUVElOR1MsXG4gICAgLi4uKHJhdyA/PyB7fSksXG4gICAgcHJvdmlkZXJzOiB7XG4gICAgICBnZW1pbmk6IHsgLi4uREVGQVVMVF9TRVRUSU5HUy5wcm92aWRlcnMuZ2VtaW5pLCAuLi4ocmF3Py5wcm92aWRlcnM/LmdlbWluaSA/PyB7fSkgfSxcbiAgICAgIG9wZW5haTogeyAuLi5ERUZBVUxUX1NFVFRJTkdTLnByb3ZpZGVycy5vcGVuYWksIC4uLihyYXc/LnByb3ZpZGVycz8ub3BlbmFpID8/IHt9KSB9LFxuICAgICAgYW50aHJvcGljOiB7IC4uLkRFRkFVTFRfU0VUVElOR1MucHJvdmlkZXJzLmFudGhyb3BpYywgLi4uKHJhdz8ucHJvdmlkZXJzPy5hbnRocm9waWMgPz8ge30pIH0sXG4gICAgICBvbGxhbWE6IHsgLi4uREVGQVVMVF9TRVRUSU5HUy5wcm92aWRlcnMub2xsYW1hLCAuLi4ocmF3Py5wcm92aWRlcnM/Lm9sbGFtYSA/PyB7fSkgfVxuICAgIH1cbiAgfTtcbn1cblxuY29uc3QgR0VNSU5JX01PREVMUyA9IFtcbiAgXCJnZW1pbmktMy4xLXByby1wcmV2aWV3XCIsXG4gIFwiZ2VtaW5pLTMuMS1wcm8tcHJldmlldy1jdXN0b210b29sc1wiLFxuICBcImdlbWluaS0yLjUtZmxhc2hcIlxuXTtcbmNvbnN0IE9QRU5BSV9NT0RFTFMgPSBbXCJncHQtNS4yXCIsIFwiZ3B0LTQuMVwiLCBcImdwdC00LjEtbWluaVwiXTtcbmNvbnN0IEFOVEhST1BJQ19NT0RFTFMgPSBbXG4gIFwiY2xhdWRlLW9wdXMtNC02XCIsXG4gIFwiY2xhdWRlLXNvbm5ldC00LTZcIixcbiAgXCJjbGF1ZGUtaGFpa3UtNC01LTIwMjUxMDAxXCJcbl07XG5cbmV4cG9ydCBjbGFzcyBTeWJ5bFNldHRpbmdUYWIgZXh0ZW5kcyBQbHVnaW5TZXR0aW5nVGFiIHtcbiAgcHJpdmF0ZSB2YWxpZGF0aW9uOiBQYXJ0aWFsPFJlY29yZDxQcm92aWRlcklELCBWYWxpZGF0aW9uU3RhdGU+PiA9IHt9O1xuICBwcml2YXRlIG9sbGFtYU1vZGVsczogc3RyaW5nW10gPSBbXTtcblxuICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcHJpdmF0ZSByZWFkb25seSBwbHVnaW46IFN5YnlsUGx1Z2luKSB7XG4gICAgc3VwZXIoYXBwLCBwbHVnaW4pO1xuICB9XG5cbiAgZGlzcGxheSgpOiB2b2lkIHtcbiAgICBjb25zdCB7IGNvbnRhaW5lckVsIH0gPSB0aGlzO1xuICAgIGNvbnRhaW5lckVsLmVtcHR5KCk7XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IGBTeWJ5bCBTZXR0aW5ncyAoJHt0aGlzLnByb3ZpZGVyTGFiZWwodGhpcy5wbHVnaW4uc2V0dGluZ3MuYWN0aXZlUHJvdmlkZXIpfSlgIH0pO1xuICAgIHRoaXMucmVuZGVyQWN0aXZlUHJvdmlkZXIoY29udGFpbmVyRWwpO1xuICAgIHRoaXMucmVuZGVyUHJvdmlkZXJDb25maWcoY29udGFpbmVyRWwpO1xuICAgIHRoaXMucmVuZGVyR2xvYmFsU2V0dGluZ3MoY29udGFpbmVyRWwpO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJBY3RpdmVQcm92aWRlcihjb250YWluZXJFbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiQWN0aXZlIFByb3ZpZGVyXCIpXG4gICAgICAuc2V0RGVzYyhcIlVzZWQgd2hlbiBhIG5vdGUgZG9lcyBub3Qgb3ZlcnJpZGUgcHJvdmlkZXIuXCIpXG4gICAgICAuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PiB7XG4gICAgICAgIGRyb3Bkb3duLmFkZE9wdGlvbihcImdlbWluaVwiLCBcIkdlbWluaVwiKTtcbiAgICAgICAgZHJvcGRvd24uYWRkT3B0aW9uKFwib3BlbmFpXCIsIFwiT3BlbkFJXCIpO1xuICAgICAgICBkcm9wZG93bi5hZGRPcHRpb24oXCJhbnRocm9waWNcIiwgXCJBbnRocm9waWMgKENsYXVkZSlcIik7XG4gICAgICAgIGRyb3Bkb3duLmFkZE9wdGlvbihcIm9sbGFtYVwiLCBcIk9sbGFtYSAobG9jYWwpXCIpO1xuICAgICAgICBkcm9wZG93bi5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5hY3RpdmVQcm92aWRlcik7XG4gICAgICAgIGRyb3Bkb3duLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmFjdGl2ZVByb3ZpZGVyID0gdmFsdWUgYXMgUHJvdmlkZXJJRDtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICB0aGlzLmRpc3BsYXkoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyUHJvdmlkZXJDb25maWcoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiUHJvdmlkZXIgQ29uZmlndXJhdGlvblwiIH0pO1xuICAgIHN3aXRjaCAodGhpcy5wbHVnaW4uc2V0dGluZ3MuYWN0aXZlUHJvdmlkZXIpIHtcbiAgICAgIGNhc2UgXCJnZW1pbmlcIjpcbiAgICAgICAgdGhpcy5yZW5kZXJHZW1pbmlTZXR0aW5ncyhjb250YWluZXJFbCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcIm9wZW5haVwiOlxuICAgICAgICB0aGlzLnJlbmRlck9wZW5BSVNldHRpbmdzKGNvbnRhaW5lckVsKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwiYW50aHJvcGljXCI6XG4gICAgICAgIHRoaXMucmVuZGVyQW50aHJvcGljU2V0dGluZ3MoY29udGFpbmVyRWwpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgXCJvbGxhbWFcIjpcbiAgICAgICAgdGhpcy5yZW5kZXJPbGxhbWFTZXR0aW5ncyhjb250YWluZXJFbCk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyR2VtaW5pU2V0dGluZ3MoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gICAgY29uc3QgY29uZmlnID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucHJvdmlkZXJzLmdlbWluaTtcbiAgICB0aGlzLnJlbmRlclZhbGlkYXRpb25TdGF0ZShjb250YWluZXJFbCwgXCJnZW1pbmlcIik7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkFQSSBLZXlcIilcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PiB7XG4gICAgICAgIHRleHQuaW5wdXRFbC50eXBlID0gXCJwYXNzd29yZFwiO1xuICAgICAgICB0ZXh0LnNldFZhbHVlKGNvbmZpZy5hcGlLZXkpO1xuICAgICAgICB0ZXh0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGNvbmZpZy5hcGlLZXkgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRleHQuaW5wdXRFbC5hZGRFdmVudExpc3RlbmVyKFwiYmx1clwiLCAoKSA9PiB2b2lkIHRoaXMudmFsaWRhdGVQcm92aWRlcihcImdlbWluaVwiKSk7XG4gICAgICB9KTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiRGVmYXVsdCBNb2RlbFwiKVxuICAgICAgLmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xuICAgICAgICBHRU1JTklfTU9ERUxTLmZvckVhY2goKG1vZGVsKSA9PiBkcm9wZG93bi5hZGRPcHRpb24obW9kZWwsIG1vZGVsKSk7XG4gICAgICAgIGRyb3Bkb3duLnNldFZhbHVlKGNvbmZpZy5kZWZhdWx0TW9kZWwpO1xuICAgICAgICBkcm9wZG93bi5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICBjb25maWcuZGVmYXVsdE1vZGVsID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlck9wZW5BSVNldHRpbmdzKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIGNvbnN0IGNvbmZpZyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnByb3ZpZGVycy5vcGVuYWk7XG4gICAgdGhpcy5yZW5kZXJWYWxpZGF0aW9uU3RhdGUoY29udGFpbmVyRWwsIFwib3BlbmFpXCIpO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJBUEkgS2V5XCIpXG4gICAgICAuYWRkVGV4dCgodGV4dCkgPT4ge1xuICAgICAgICB0ZXh0LmlucHV0RWwudHlwZSA9IFwicGFzc3dvcmRcIjtcbiAgICAgICAgdGV4dC5zZXRWYWx1ZShjb25maWcuYXBpS2V5KTtcbiAgICAgICAgdGV4dC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICBjb25maWcuYXBpS2V5ID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0ZXh0LmlucHV0RWwuYWRkRXZlbnRMaXN0ZW5lcihcImJsdXJcIiwgKCkgPT4gdm9pZCB0aGlzLnZhbGlkYXRlUHJvdmlkZXIoXCJvcGVuYWlcIikpO1xuICAgICAgfSk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkJhc2UgVVJMXCIpXG4gICAgICAuc2V0RGVzYyhcIk92ZXJyaWRlIGZvciBBenVyZSBvciBwcm94eSBlbmRwb2ludHNcIilcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PiB7XG4gICAgICAgIHRleHQuc2V0VmFsdWUoY29uZmlnLmJhc2VVcmwpO1xuICAgICAgICB0ZXh0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGNvbmZpZy5iYXNlVXJsID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0ZXh0LmlucHV0RWwuYWRkRXZlbnRMaXN0ZW5lcihcImJsdXJcIiwgKCkgPT4gdm9pZCB0aGlzLnZhbGlkYXRlUHJvdmlkZXIoXCJvcGVuYWlcIikpO1xuICAgICAgfSk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkRlZmF1bHQgTW9kZWxcIilcbiAgICAgIC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcbiAgICAgICAgT1BFTkFJX01PREVMUy5mb3JFYWNoKChtb2RlbCkgPT4gZHJvcGRvd24uYWRkT3B0aW9uKG1vZGVsLCBtb2RlbCkpO1xuICAgICAgICBkcm9wZG93bi5zZXRWYWx1ZShjb25maWcuZGVmYXVsdE1vZGVsKTtcbiAgICAgICAgZHJvcGRvd24ub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uZmlnLmRlZmF1bHRNb2RlbCA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwicFwiLCB7XG4gICAgICB0ZXh0OiBcIk9wZW5BSSBzb3VyY2VzIHVzZSB2YXVsdF9wYXRoLiBBZGQgc291cmNlIGZpbGVzIHZpYSB0aGUgTWFuYWdlIFNvdXJjZXMgY29tbWFuZCBpbiBhbnkgbm90ZS5cIlxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJBbnRocm9waWNTZXR0aW5ncyhjb250YWluZXJFbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgICBjb25zdCBjb25maWcgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcm92aWRlcnMuYW50aHJvcGljO1xuICAgIHRoaXMucmVuZGVyVmFsaWRhdGlvblN0YXRlKGNvbnRhaW5lckVsLCBcImFudGhyb3BpY1wiKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiQVBJIEtleVwiKVxuICAgICAgLmFkZFRleHQoKHRleHQpID0+IHtcbiAgICAgICAgdGV4dC5pbnB1dEVsLnR5cGUgPSBcInBhc3N3b3JkXCI7XG4gICAgICAgIHRleHQuc2V0VmFsdWUoY29uZmlnLmFwaUtleSk7XG4gICAgICAgIHRleHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uZmlnLmFwaUtleSA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGV4dC5pbnB1dEVsLmFkZEV2ZW50TGlzdGVuZXIoXCJibHVyXCIsICgpID0+IHZvaWQgdGhpcy52YWxpZGF0ZVByb3ZpZGVyKFwiYW50aHJvcGljXCIpKTtcbiAgICAgIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJEZWZhdWx0IE1vZGVsXCIpXG4gICAgICAuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PiB7XG4gICAgICAgIEFOVEhST1BJQ19NT0RFTFMuZm9yRWFjaCgobW9kZWwpID0+IGRyb3Bkb3duLmFkZE9wdGlvbihtb2RlbCwgbW9kZWwpKTtcbiAgICAgICAgZHJvcGRvd24uc2V0VmFsdWUoY29uZmlnLmRlZmF1bHRNb2RlbCk7XG4gICAgICAgIGRyb3Bkb3duLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGNvbmZpZy5kZWZhdWx0TW9kZWwgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcInBcIiwge1xuICAgICAgdGV4dDogXCJQREZzIGFyZSBlbmNvZGVkIGlubGluZSBwZXIgcmVxdWVzdC4gVXNlIHNob3J0IGV4Y2VycHRzIHRvIGF2b2lkIGhpZ2ggdG9rZW4gY29zdHMuXCJcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyT2xsYW1hU2V0dGluZ3MoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gICAgY29uc3QgY29uZmlnID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucHJvdmlkZXJzLm9sbGFtYTtcbiAgICB0aGlzLnJlbmRlclZhbGlkYXRpb25TdGF0ZShjb250YWluZXJFbCwgXCJvbGxhbWFcIik7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkJhc2UgVVJMXCIpXG4gICAgICAuYWRkVGV4dCgodGV4dCkgPT4ge1xuICAgICAgICB0ZXh0LnNldFZhbHVlKGNvbmZpZy5iYXNlVXJsKTtcbiAgICAgICAgdGV4dC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICBjb25maWcuYmFzZVVybCA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGV4dC5pbnB1dEVsLmFkZEV2ZW50TGlzdGVuZXIoXCJibHVyXCIsICgpID0+IHZvaWQgdGhpcy52YWxpZGF0ZU9sbGFtYSgpKTtcbiAgICAgIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJBdmFpbGFibGUgTW9kZWxzXCIpXG4gICAgICAuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PiB7XG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSB0aGlzLm9sbGFtYU1vZGVscy5sZW5ndGggPyB0aGlzLm9sbGFtYU1vZGVscyA6IFtjb25maWcuZGVmYXVsdE1vZGVsXTtcbiAgICAgICAgb3B0aW9ucy5mb3JFYWNoKChtb2RlbCkgPT4gZHJvcGRvd24uYWRkT3B0aW9uKG1vZGVsLCBtb2RlbCkpO1xuICAgICAgICBkcm9wZG93bi5zZXRWYWx1ZShvcHRpb25zLmluY2x1ZGVzKGNvbmZpZy5kZWZhdWx0TW9kZWwpID8gY29uZmlnLmRlZmF1bHRNb2RlbCA6IG9wdGlvbnNbMF0pO1xuICAgICAgICBkcm9wZG93bi5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICBjb25maWcuZGVmYXVsdE1vZGVsID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgdGhpcy5kaXNwbGF5KCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkRlZmF1bHQgTW9kZWxcIilcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PiB7XG4gICAgICAgIHRleHQuc2V0VmFsdWUoY29uZmlnLmRlZmF1bHRNb2RlbCk7XG4gICAgICAgIHRleHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uZmlnLmRlZmF1bHRNb2RlbCA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwicFwiLCB7XG4gICAgICB0ZXh0OiBcIk5vIEFQSSBrZXkgcmVxdWlyZWQuIE9sbGFtYSBtdXN0IGJlIHJ1bm5pbmcgbG9jYWxseS4gRmlsZSBncm91bmRpbmcgdXNlcyB2YXVsdF9wYXRoIHRleHQgZXh0cmFjdGlvbi5cIlxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJHbG9iYWxTZXR0aW5ncyhjb250YWluZXJFbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJHbG9iYWwgU2V0dGluZ3NcIiB9KTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiRGVmYXVsdCBUZW1wZXJhdHVyZVwiKVxuICAgICAgLnNldERlc2MoU3RyaW5nKHRoaXMucGx1Z2luLnNldHRpbmdzLmRlZmF1bHRUZW1wZXJhdHVyZSkpXG4gICAgICAuYWRkU2xpZGVyKChzbGlkZXIpID0+IHtcbiAgICAgICAgc2xpZGVyLnNldExpbWl0cygwLCAxLCAwLjA1KTtcbiAgICAgICAgc2xpZGVyLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmRlZmF1bHRUZW1wZXJhdHVyZSk7XG4gICAgICAgIHNsaWRlci5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5kZWZhdWx0VGVtcGVyYXR1cmUgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICB0aGlzLmRpc3BsYXkoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiSW5zZXJ0aW9uIE1vZGVcIilcbiAgICAgIC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcbiAgICAgICAgZHJvcGRvd24uYWRkT3B0aW9uKFwiY3Vyc29yXCIsIFwiQXQgY3Vyc29yXCIpO1xuICAgICAgICBkcm9wZG93bi5hZGRPcHRpb24oXCJlbmQtb2Ytbm90ZVwiLCBcIkVuZCBvZiBub3RlXCIpO1xuICAgICAgICBkcm9wZG93bi5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5pbnNlcnRpb25Nb2RlKTtcbiAgICAgICAgZHJvcGRvd24ub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuaW5zZXJ0aW9uTW9kZSA9IHZhbHVlIGFzIFwiY3Vyc29yXCIgfCBcImVuZC1vZi1ub3RlXCI7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIlNob3cgVG9rZW4gQ291bnRcIilcbiAgICAgIC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xuICAgICAgICB0b2dnbGUuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3Muc2hvd1Rva2VuQ291bnQpO1xuICAgICAgICB0b2dnbGUub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc2hvd1Rva2VuQ291bnQgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiTG9uZWxvZyBNb2RlXCIpXG4gICAgICAuc2V0RGVzYyhcIkVuYWJsZSBMb25lbG9nIG5vdGF0aW9uLCBjb250ZXh0IHBhcnNpbmcsIGFuZCBMb25lbG9nLXNwZWNpZmljIGNvbW1hbmRzLlwiKVxuICAgICAgLmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB7XG4gICAgICAgIHRvZ2dsZS5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5sb25lbG9nTW9kZSk7XG4gICAgICAgIHRvZ2dsZS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5sb25lbG9nTW9kZSA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgIHRoaXMuZGlzcGxheSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5sb25lbG9nTW9kZSkge1xuICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgIC5zZXROYW1lKFwiQXV0by1pbmNyZW1lbnQgc2NlbmUgY291bnRlclwiKVxuICAgICAgICAuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcbiAgICAgICAgICB0b2dnbGUuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MubG9uZWxvZ0F1dG9JbmNTY2VuZSk7XG4gICAgICAgICAgdG9nZ2xlLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MubG9uZWxvZ0F1dG9JbmNTY2VuZSA9IHZhbHVlO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgIC5zZXROYW1lKFwiQ29udGV4dCBleHRyYWN0aW9uIGRlcHRoXCIpXG4gICAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PiB7XG4gICAgICAgICAgdGV4dC5zZXRWYWx1ZShTdHJpbmcodGhpcy5wbHVnaW4uc2V0dGluZ3MubG9uZWxvZ0NvbnRleHREZXB0aCkpO1xuICAgICAgICAgIHRleHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBuZXh0ID0gTnVtYmVyKHZhbHVlKTtcbiAgICAgICAgICAgIGlmICghTnVtYmVyLmlzTmFOKG5leHQpICYmIG5leHQgPiAwKSB7XG4gICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmxvbmVsb2dDb250ZXh0RGVwdGggPSBuZXh0O1xuICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgICAgLnNldE5hbWUoXCJXcmFwIG5vdGF0aW9uIGluIGNvZGUgYmxvY2tzXCIpXG4gICAgICAgIC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xuICAgICAgICAgIHRvZ2dsZS5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5sb25lbG9nV3JhcENvZGVCbG9jayk7XG4gICAgICAgICAgdG9nZ2xlLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MubG9uZWxvZ1dyYXBDb2RlQmxvY2sgPSB2YWx1ZTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlbmRlclZhbGlkYXRpb25TdGF0ZShjb250YWluZXJFbDogSFRNTEVsZW1lbnQsIHByb3ZpZGVyOiBQcm92aWRlcklEKTogdm9pZCB7XG4gICAgY29uc3Qgc3RhdGUgPSB0aGlzLnZhbGlkYXRpb25bcHJvdmlkZXJdO1xuICAgIGlmICghc3RhdGUgfHwgc3RhdGUuc3RhdHVzID09PSBcImlkbGVcIikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcInBcIiwge1xuICAgICAgdGV4dDpcbiAgICAgICAgc3RhdGUuc3RhdHVzID09PSBcImNoZWNraW5nXCJcbiAgICAgICAgICA/IFwiVmFsaWRhdGlvbjogY2hlY2tpbmcuLi5cIlxuICAgICAgICAgIDogc3RhdGUuc3RhdHVzID09PSBcInZhbGlkXCJcbiAgICAgICAgICAgID8gXCJWYWxpZGF0aW9uOiBcdTI3MTNcIlxuICAgICAgICAgICAgOiBgVmFsaWRhdGlvbjogXHUyNzE3JHtzdGF0ZS5tZXNzYWdlID8gYCAoJHtzdGF0ZS5tZXNzYWdlfSlgIDogXCJcIn1gXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHByb3ZpZGVyTGFiZWwocHJvdmlkZXI6IFByb3ZpZGVySUQpOiBzdHJpbmcge1xuICAgIHN3aXRjaCAocHJvdmlkZXIpIHtcbiAgICAgIGNhc2UgXCJnZW1pbmlcIjpcbiAgICAgICAgcmV0dXJuIFwiR2VtaW5pXCI7XG4gICAgICBjYXNlIFwib3BlbmFpXCI6XG4gICAgICAgIHJldHVybiBcIk9wZW5BSVwiO1xuICAgICAgY2FzZSBcImFudGhyb3BpY1wiOlxuICAgICAgICByZXR1cm4gXCJBbnRocm9waWNcIjtcbiAgICAgIGNhc2UgXCJvbGxhbWFcIjpcbiAgICAgICAgcmV0dXJuIFwiT2xsYW1hXCI7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyB2YWxpZGF0ZVByb3ZpZGVyKHByb3ZpZGVyOiBQcm92aWRlcklEKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy52YWxpZGF0aW9uW3Byb3ZpZGVyXSA9IHsgc3RhdHVzOiBcImNoZWNraW5nXCIgfTtcbiAgICB0aGlzLmRpc3BsYXkoKTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgdmFsaWQgPSBhd2FpdCBnZXRQcm92aWRlcih0aGlzLnBsdWdpbi5zZXR0aW5ncywgcHJvdmlkZXIpLnZhbGlkYXRlKCk7XG4gICAgICB0aGlzLnZhbGlkYXRpb25bcHJvdmlkZXJdID0geyBzdGF0dXM6IHZhbGlkID8gXCJ2YWxpZFwiIDogXCJpbnZhbGlkXCIgfTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy52YWxpZGF0aW9uW3Byb3ZpZGVyXSA9IHtcbiAgICAgICAgc3RhdHVzOiBcImludmFsaWRcIixcbiAgICAgICAgbWVzc2FnZTogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpXG4gICAgICB9O1xuICAgIH1cbiAgICB0aGlzLmRpc3BsYXkoKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgdmFsaWRhdGVPbGxhbWEoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy52YWxpZGF0aW9uLm9sbGFtYSA9IHsgc3RhdHVzOiBcImNoZWNraW5nXCIgfTtcbiAgICB0aGlzLmRpc3BsYXkoKTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcHJvdmlkZXIgPSBuZXcgT2xsYW1hUHJvdmlkZXIodGhpcy5wbHVnaW4uc2V0dGluZ3MucHJvdmlkZXJzLm9sbGFtYSk7XG4gICAgICBjb25zdCB2YWxpZCA9IGF3YWl0IHByb3ZpZGVyLnZhbGlkYXRlKCk7XG4gICAgICB0aGlzLnZhbGlkYXRpb24ub2xsYW1hID0geyBzdGF0dXM6IHZhbGlkID8gXCJ2YWxpZFwiIDogXCJpbnZhbGlkXCIgfTtcbiAgICAgIHRoaXMub2xsYW1hTW9kZWxzID0gdmFsaWQgPyBhd2FpdCBwcm92aWRlci5saXN0TW9kZWxzKCkgOiBbXTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgdGhpcy52YWxpZGF0aW9uLm9sbGFtYSA9IHtcbiAgICAgICAgc3RhdHVzOiBcImludmFsaWRcIixcbiAgICAgICAgbWVzc2FnZTogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpXG4gICAgICB9O1xuICAgICAgdGhpcy5vbGxhbWFNb2RlbHMgPSBbXTtcbiAgICAgIG5ldyBOb3RpY2UodGhpcy52YWxpZGF0aW9uLm9sbGFtYS5tZXNzYWdlID8/IFwiT2xsYW1hIHZhbGlkYXRpb24gZmFpbGVkLlwiKTtcbiAgICB9XG4gICAgdGhpcy5kaXNwbGF5KCk7XG4gIH1cbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQUFBQSxtQkFBNkM7OztBQ0V0QyxTQUFTLGVBQWUsUUFBZ0IsTUFBb0I7QUFDakUsUUFBTSxTQUFTLE9BQU8sVUFBVTtBQUNoQyxTQUFPLGFBQWE7QUFBQSxFQUFLO0FBQUEsR0FBVSxNQUFNO0FBQ3pDLFNBQU8sVUFBVSxFQUFFLE1BQU0sT0FBTyxPQUFPLEtBQUssTUFBTSxJQUFJLEVBQUUsU0FBUyxHQUFHLElBQUksRUFBRSxDQUFDO0FBQzdFO0FBRU8sU0FBUyxhQUFhLFFBQWdCLE1BQW9CO0FBQy9ELFFBQU0sV0FBVyxPQUFPLFNBQVM7QUFDakMsUUFBTSxTQUFTLE9BQU8sUUFBUSxRQUFRLEVBQUU7QUFDeEMsU0FBTyxhQUFhO0FBQUEsRUFBSztBQUFBLEdBQVUsRUFBRSxNQUFNLFVBQVUsSUFBSSxPQUFPLENBQUM7QUFDbkU7QUFFTyxTQUFTLGFBQWEsUUFBd0I7QUFDbkQsU0FBTyxPQUFPLGFBQWEsRUFBRSxLQUFLO0FBQ3BDO0FBRU8sU0FBUyxxQkFBcUIsUUFBZ0IsTUFBb0I7QUFDdkUsUUFBTSxZQUFZLE9BQU8sZUFBZSxFQUFFLENBQUM7QUFDM0Ms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RUFDRjtBQUFBLEVBRUEsTUFBTSxrQkFDSixJQUNBLFVBQ0EsYUFDQSxrQkFBa0IsS0FDVztBQUM3QixVQUFNLFdBQVcsWUFBWSxLQUFLLFVBQVUsR0FBRyxRQUFRO0FBQ3ZELFVBQU0sVUFBVSxhQUFhLElBQUksYUFBYSxLQUFLLFVBQVUsaUJBQWlCLFFBQVE7QUFDdEYsVUFBTSxXQUFXLElBQUksd0JBQU8sd0JBQXdCLENBQUM7QUFDckQsUUFBSTtBQUNGLGFBQU8sTUFBTSxTQUFTLFNBQVMsT0FBTztBQUFBLElBQ3hDLFVBQUU7QUFDQSxlQUFTLEtBQUs7QUFBQSxJQUNoQjtBQUFBLEVBQ0Y7QUFBQSxFQUVBLE1BQU0scUJBQ0osSUFDQSxhQUNBLGlCQUNBLGtCQUFvQyxDQUFDLEdBQ1I7QUFsRWpDO0FBbUVJLFVBQU0sV0FBVyxZQUFZLEtBQUssVUFBVSxHQUFHLFFBQVE7QUFDdkQsVUFBTSxVQUE2QjtBQUFBLE1BQ2pDLGNBQWMsa0JBQWtCLElBQUksS0FBSztBQUFBLE1BQ3pDO0FBQUEsTUFDQTtBQUFBLE1BQ0EsY0FBYSxRQUFHLGdCQUFILFlBQWtCLEtBQUssU0FBUztBQUFBLE1BQzdDO0FBQUEsTUFDQSxPQUFPLEdBQUc7QUFBQSxJQUNaO0FBQ0EsVUFBTSxXQUFXLElBQUksd0JBQU8sd0JBQXdCLENBQUM7QUFDckQsUUFBSTtBQUNGLGFBQU8sTUFBTSxTQUFTLFNBQVMsT0FBTztBQUFBLElBQ3hDLFVBQUU7QUFDQSxlQUFTLEtBQUs7QUFBQSxJQUNoQjtBQUFBLEVBQ0Y7QUFBQSxFQUVBLFdBQVcsTUFBb0IsTUFBYyxNQUF1QztBQUNsRixTQUFLLHNCQUFRLEtBQUssU0FBUyxtQkFBbUIsVUFBVTtBQUN0RCxxQkFBZSxLQUFLLFFBQVEsSUFBSTtBQUFBLElBQ2xDLE9BQU87QUFDTCxtQkFBYSxLQUFLLFFBQVEsSUFBSTtBQUFBLElBQ2hDO0FBQUEsRUFDRjtBQUFBLEVBRUEsd0JBQXdCLE1BQW9CLFVBQW9DO0FBNUZsRjtBQTZGSSxRQUFJLENBQUMsS0FBSyxTQUFTLGdCQUFnQjtBQUNqQztBQUFBLElBQ0Y7QUFDQSxVQUFNLFNBQVEsY0FBUyxnQkFBVCxZQUF3QjtBQUN0QyxVQUFNLFVBQVMsY0FBUyxpQkFBVCxZQUF5QjtBQUN4QyxpQkFBYSxLQUFLLFFBQVEsZ0JBQWdCLGNBQWMsZ0JBQWdCO0FBQUEsRUFDMUU7QUFDRjsiLAogICJuYW1lcyI6IFsiaW1wb3J0X29ic2lkaWFuIiwgIl9hIiwgImltcG9ydF9vYnNpZGlhbiIsICJfYSIsICJpbXBvcnRfb2JzaWRpYW4iLCAiaW1wb3J0X29ic2lkaWFuIiwgIl9hIiwgImltcG9ydF9vYnNpZGlhbiIsICJfYSIsICJpbXBvcnRfb2JzaWRpYW4iLCAiaW1wb3J0X29ic2lkaWFuIiwgImltcG9ydF9vYnNpZGlhbiJdCn0K
