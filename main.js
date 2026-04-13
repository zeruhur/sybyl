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
- 3-4 lines maximum unless the user explicitly requests more
- Neutral, third-person, factual tone
- Past tense for scene descriptions, present tense for world state
- No rhetorical questions

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
  if ((_b = fm.scene_context) == null ? void 0 : _b.trim()) {
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
    if (response.status === 429) {
      return "Anthropic rate limit reached. Wait a moment and retry.";
    }
    try {
      const data = response.json;
      return (_b = (_a = data == null ? void 0 : data.error) == null ? void 0 : _a.message) != null ? _b : `Anthropic request failed (${response.status}).`;
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
    if (response.status === 429) {
      return `${providerName} rate limit reached. Wait a moment and retry.`;
    }
    try {
      const data = response.json;
      return (_b = (_a = data == null ? void 0 : data.error) == null ? void 0 : _a.message) != null ? _b : `${providerName} request failed (${response.status}).`;
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
    if (response.status === 429) {
      return "OpenAI rate limit reached. Wait a moment and retry.";
    }
    try {
      const data = response.json;
      return (_b = (_a = data == null ? void 0 : data.error) == null ? void 0 : _a.message) != null ? _b : `OpenAI request failed (${response.status}).`;
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
        300
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL2VkaXRvci50cyIsICJzcmMvbG9uZWxvZy9wYXJzZXIudHMiLCAic3JjL3Byb21wdEJ1aWxkZXIudHMiLCAic3JjL2Zyb250bWF0dGVyLnRzIiwgInNyYy9wcm92aWRlcnMvYW50aHJvcGljLnRzIiwgInNyYy9wcm92aWRlcnMvZ2VtaW5pLnRzIiwgInNyYy9wcm92aWRlcnMvb2xsYW1hLnRzIiwgInNyYy9zb3VyY2VVdGlscy50cyIsICJzcmMvcHJvdmlkZXJzL29wZW5haS50cyIsICJzcmMvcHJvdmlkZXJzL2luZGV4LnRzIiwgInNyYy9jb21tYW5kcy50cyIsICJzcmMvbG9uZWxvZy9mb3JtYXR0ZXIudHMiLCAic3JjL21vZGFscy50cyIsICJzcmMvc2V0dGluZ3MudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7IE1hcmtkb3duVmlldywgTm90aWNlLCBQbHVnaW4gfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IGFwcGVuZFRvTm90ZSwgaW5zZXJ0QXRDdXJzb3IgfSBmcm9tIFwiLi9lZGl0b3JcIjtcbmltcG9ydCB7IGJ1aWxkUmVxdWVzdCwgYnVpbGRTeXN0ZW1Qcm9tcHQgfSBmcm9tIFwiLi9wcm9tcHRCdWlsZGVyXCI7XG5pbXBvcnQgeyByZWFkRnJvbnRNYXR0ZXIgfSBmcm9tIFwiLi9mcm9udG1hdHRlclwiO1xuaW1wb3J0IHsgZ2V0UHJvdmlkZXIgfSBmcm9tIFwiLi9wcm92aWRlcnNcIjtcbmltcG9ydCB7IHJlZ2lzdGVyQWxsQ29tbWFuZHMgfSBmcm9tIFwiLi9jb21tYW5kc1wiO1xuaW1wb3J0IHsgREVGQVVMVF9TRVRUSU5HUywgU3lieWxTZXR0aW5nVGFiLCBub3JtYWxpemVTZXR0aW5ncyB9IGZyb20gXCIuL3NldHRpbmdzXCI7XG5pbXBvcnQgeyBHZW5lcmF0aW9uUmVxdWVzdCwgR2VuZXJhdGlvblJlc3BvbnNlLCBOb3RlRnJvbnRNYXR0ZXIsIFJlc29sdmVkU291cmNlLCBTeWJ5bFNldHRpbmdzIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuZXhwb3J0IGludGVyZmFjZSBBY3RpdmVOb3RlQ29udGV4dCB7XG4gIHZpZXc6IE1hcmtkb3duVmlldztcbiAgZm06IE5vdGVGcm9udE1hdHRlcjtcbiAgbm90ZUJvZHk6IHN0cmluZztcbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU3lieWxQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xuICBzZXR0aW5nczogU3lieWxTZXR0aW5ncyA9IERFRkFVTFRfU0VUVElOR1M7XG5cbiAgYXN5bmMgb25sb2FkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMubG9hZFNldHRpbmdzKCk7XG4gICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBTeWJ5bFNldHRpbmdUYWIodGhpcy5hcHAsIHRoaXMpKTtcbiAgICByZWdpc3RlckFsbENvbW1hbmRzKHRoaXMpO1xuICB9XG5cbiAgYXN5bmMgbG9hZFNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMuc2V0dGluZ3MgPSBub3JtYWxpemVTZXR0aW5ncyhhd2FpdCB0aGlzLmxvYWREYXRhKCkpO1xuICB9XG5cbiAgYXN5bmMgc2F2ZVNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5zZXR0aW5ncyk7XG4gIH1cblxuICBhc3luYyBnZXRBY3RpdmVOb3RlQ29udGV4dCgpOiBQcm9taXNlPEFjdGl2ZU5vdGVDb250ZXh0IHwgbnVsbD4ge1xuICAgIGNvbnN0IHZpZXcgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlVmlld09mVHlwZShNYXJrZG93blZpZXcpO1xuICAgIGlmICghdmlldz8uZmlsZSkge1xuICAgICAgbmV3IE5vdGljZShcIk5vIGFjdGl2ZSBtYXJrZG93biBub3RlLlwiKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgdmlldyxcbiAgICAgIGZtOiBhd2FpdCByZWFkRnJvbnRNYXR0ZXIodGhpcy5hcHAsIHZpZXcuZmlsZSksXG4gICAgICBub3RlQm9keTogYXdhaXQgdGhpcy5hcHAudmF1bHQuY2FjaGVkUmVhZCh2aWV3LmZpbGUpXG4gICAgfTtcbiAgfVxuXG4gIGFzeW5jIHJlcXVlc3RHZW5lcmF0aW9uKFxuICAgIGZtOiBOb3RlRnJvbnRNYXR0ZXIsXG4gICAgbm90ZUJvZHk6IHN0cmluZyxcbiAgICB1c2VyTWVzc2FnZTogc3RyaW5nLFxuICAgIG1heE91dHB1dFRva2VucyA9IDUxMlxuICApOiBQcm9taXNlPEdlbmVyYXRpb25SZXNwb25zZT4ge1xuICAgIGNvbnN0IHByb3ZpZGVyID0gZ2V0UHJvdmlkZXIodGhpcy5zZXR0aW5ncywgZm0ucHJvdmlkZXIpO1xuICAgIGNvbnN0IHJlcXVlc3QgPSBidWlsZFJlcXVlc3QoZm0sIHVzZXJNZXNzYWdlLCB0aGlzLnNldHRpbmdzLCBtYXhPdXRwdXRUb2tlbnMsIG5vdGVCb2R5KTtcbiAgICBjb25zdCBwcm9ncmVzcyA9IG5ldyBOb3RpY2UoXCJTeWJ5bDogR2VuZXJhdGluZy4uLlwiLCAwKTtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGF3YWl0IHByb3ZpZGVyLmdlbmVyYXRlKHJlcXVlc3QpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBwcm9ncmVzcy5oaWRlKCk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcmVxdWVzdFJhd0dlbmVyYXRpb24oXG4gICAgZm06IE5vdGVGcm9udE1hdHRlcixcbiAgICB1c2VyTWVzc2FnZTogc3RyaW5nLFxuICAgIG1heE91dHB1dFRva2VuczogbnVtYmVyLFxuICAgIHJlc29sdmVkU291cmNlczogUmVzb2x2ZWRTb3VyY2VbXSA9IFtdXG4gICk6IFByb21pc2U8R2VuZXJhdGlvblJlc3BvbnNlPiB7XG4gICAgY29uc3QgcHJvdmlkZXIgPSBnZXRQcm92aWRlcih0aGlzLnNldHRpbmdzLCBmbS5wcm92aWRlcik7XG4gICAgY29uc3QgcmVxdWVzdDogR2VuZXJhdGlvblJlcXVlc3QgPSB7XG4gICAgICBzeXN0ZW1Qcm9tcHQ6IGJ1aWxkU3lzdGVtUHJvbXB0KGZtLCBmYWxzZSksXG4gICAgICB1c2VyTWVzc2FnZSxcbiAgICAgIHJlc29sdmVkU291cmNlcyxcbiAgICAgIHRlbXBlcmF0dXJlOiBmbS50ZW1wZXJhdHVyZSA/PyB0aGlzLnNldHRpbmdzLmRlZmF1bHRUZW1wZXJhdHVyZSxcbiAgICAgIG1heE91dHB1dFRva2VucyxcbiAgICAgIG1vZGVsOiBmbS5tb2RlbFxuICAgIH07XG4gICAgY29uc3QgcHJvZ3Jlc3MgPSBuZXcgTm90aWNlKFwiU3lieWw6IEdlbmVyYXRpbmcuLi5cIiwgMCk7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBhd2FpdCBwcm92aWRlci5nZW5lcmF0ZShyZXF1ZXN0KTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgcHJvZ3Jlc3MuaGlkZSgpO1xuICAgIH1cbiAgfVxuXG4gIGluc2VydFRleHQodmlldzogTWFya2Rvd25WaWV3LCB0ZXh0OiBzdHJpbmcsIG1vZGU/OiBcImN1cnNvclwiIHwgXCJlbmQtb2Ytbm90ZVwiKTogdm9pZCB7XG4gICAgaWYgKChtb2RlID8/IHRoaXMuc2V0dGluZ3MuaW5zZXJ0aW9uTW9kZSkgPT09IFwiY3Vyc29yXCIpIHtcbiAgICAgIGluc2VydEF0Q3Vyc29yKHZpZXcuZWRpdG9yLCB0ZXh0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXBwZW5kVG9Ob3RlKHZpZXcuZWRpdG9yLCB0ZXh0KTtcbiAgICB9XG4gIH1cblxuICBtYXliZUluc2VydFRva2VuQ29tbWVudCh2aWV3OiBNYXJrZG93blZpZXcsIHJlc3BvbnNlOiBHZW5lcmF0aW9uUmVzcG9uc2UpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuc2V0dGluZ3Muc2hvd1Rva2VuQ291bnQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgaW5wdXQgPSByZXNwb25zZS5pbnB1dFRva2VucyA/PyBcIk4vQVwiO1xuICAgIGNvbnN0IG91dHB1dCA9IHJlc3BvbnNlLm91dHB1dFRva2VucyA/PyBcIk4vQVwiO1xuICAgIGFwcGVuZFRvTm90ZSh2aWV3LmVkaXRvciwgYDwhLS0gdG9rZW5zOiAke2lucHV0fSBpbiAvICR7b3V0cHV0fSBvdXQgLS0+YCk7XG4gIH1cbn1cbiIsICJpbXBvcnQgeyBFZGl0b3IgfSBmcm9tIFwib2JzaWRpYW5cIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGluc2VydEF0Q3Vyc29yKGVkaXRvcjogRWRpdG9yLCB0ZXh0OiBzdHJpbmcpOiB2b2lkIHtcbiAgY29uc3QgY3Vyc29yID0gZWRpdG9yLmdldEN1cnNvcigpO1xuICBlZGl0b3IucmVwbGFjZVJhbmdlKGBcXG4ke3RleHR9XFxuYCwgY3Vyc29yKTtcbiAgZWRpdG9yLnNldEN1cnNvcih7IGxpbmU6IGN1cnNvci5saW5lICsgdGV4dC5zcGxpdChcIlxcblwiKS5sZW5ndGggKyAxLCBjaDogMCB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFwcGVuZFRvTm90ZShlZGl0b3I6IEVkaXRvciwgdGV4dDogc3RyaW5nKTogdm9pZCB7XG4gIGNvbnN0IGxhc3RMaW5lID0gZWRpdG9yLmxhc3RMaW5lKCk7XG4gIGNvbnN0IGxhc3RDaCA9IGVkaXRvci5nZXRMaW5lKGxhc3RMaW5lKS5sZW5ndGg7XG4gIGVkaXRvci5yZXBsYWNlUmFuZ2UoYFxcbiR7dGV4dH1cXG5gLCB7IGxpbmU6IGxhc3RMaW5lLCBjaDogbGFzdENoIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U2VsZWN0aW9uKGVkaXRvcjogRWRpdG9yKTogc3RyaW5nIHtcbiAgcmV0dXJuIGVkaXRvci5nZXRTZWxlY3Rpb24oKS50cmltKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpbnNlcnRCZWxvd1NlbGVjdGlvbihlZGl0b3I6IEVkaXRvciwgdGV4dDogc3RyaW5nKTogdm9pZCB7XG4gIGNvbnN0IHNlbGVjdGlvbiA9IGVkaXRvci5saXN0U2VsZWN0aW9ucygpWzBdO1xuICBjb25zdCB0YXJnZXRMaW5lID0gc2VsZWN0aW9uID8gc2VsZWN0aW9uLmhlYWQubGluZSA6IGVkaXRvci5nZXRDdXJzb3IoKS5saW5lO1xuICBlZGl0b3IucmVwbGFjZVJhbmdlKGBcXG4ke3RleHR9YCwgeyBsaW5lOiB0YXJnZXRMaW5lLCBjaDogZWRpdG9yLmdldExpbmUodGFyZ2V0TGluZSkubGVuZ3RoIH0pO1xufVxuIiwgImV4cG9ydCBpbnRlcmZhY2UgTG9uZWxvZ0NvbnRleHQge1xuICBsYXN0U2NlbmVJZDogc3RyaW5nO1xuICBsYXN0U2NlbmVEZXNjOiBzdHJpbmc7XG4gIGFjdGl2ZU5QQ3M6IHN0cmluZ1tdO1xuICBhY3RpdmVMb2NhdGlvbnM6IHN0cmluZ1tdO1xuICBhY3RpdmVUaHJlYWRzOiBzdHJpbmdbXTtcbiAgYWN0aXZlQ2xvY2tzOiBzdHJpbmdbXTtcbiAgYWN0aXZlVHJhY2tzOiBzdHJpbmdbXTtcbiAgcGNTdGF0ZTogc3RyaW5nW107XG4gIHJlY2VudEJlYXRzOiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlTG9uZWxvZ0NvbnRleHQobm90ZUJvZHk6IHN0cmluZywgZGVwdGhMaW5lcyA9IDYwKTogTG9uZWxvZ0NvbnRleHQge1xuICBjb25zdCBib2R5V2l0aG91dEZNID0gbm90ZUJvZHkucmVwbGFjZSgvXi0tLVtcXHNcXFNdKj8tLS1cXHI/XFxuLywgXCJcIik7XG4gIGNvbnN0IGxpbmVzID0gYm9keVdpdGhvdXRGTS5zcGxpdCgvXFxyP1xcbi8pO1xuICBjb25zdCB3aW5kb3cgPSBsaW5lcy5zbGljZSgtZGVwdGhMaW5lcyk7XG4gIGNvbnN0IGN0eDogTG9uZWxvZ0NvbnRleHQgPSB7XG4gICAgbGFzdFNjZW5lSWQ6IFwiXCIsXG4gICAgbGFzdFNjZW5lRGVzYzogXCJcIixcbiAgICBhY3RpdmVOUENzOiBbXSxcbiAgICBhY3RpdmVMb2NhdGlvbnM6IFtdLFxuICAgIGFjdGl2ZVRocmVhZHM6IFtdLFxuICAgIGFjdGl2ZUNsb2NrczogW10sXG4gICAgYWN0aXZlVHJhY2tzOiBbXSxcbiAgICBwY1N0YXRlOiBbXSxcbiAgICByZWNlbnRCZWF0czogW11cbiAgfTtcblxuICBjb25zdCBzY2VuZVJlID0gL14oPzojK1xccyspPyhUXFxkKy0pP1MoXFxkK1tcXHcuXSopXFxzKlxcKihbXipdKilcXCovO1xuICBjb25zdCBucGNSZSA9IC9cXFtOOihbXlxcXV0rKVxcXS9nO1xuICBjb25zdCBsb2NSZSA9IC9cXFtMOihbXlxcXV0rKVxcXS9nO1xuICBjb25zdCB0aHJlYWRSZSA9IC9cXFtUaHJlYWQ6KFteXFxdXSspXFxdL2c7XG4gIGNvbnN0IGNsb2NrUmUgPSAvXFxbQ2xvY2s6KFteXFxdXSspXFxdL2c7XG4gIGNvbnN0IHRyYWNrUmUgPSAvXFxbVHJhY2s6KFteXFxdXSspXFxdL2c7XG4gIGNvbnN0IHBjUmUgPSAvXFxbUEM6KFteXFxdXSspXFxdL2c7XG4gIGNvbnN0IGJlYXRSZSA9IC9eKEB8XFw/fGQ6fC0+fD0+KS87XG5cbiAgY29uc3QgbnBjTWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgY29uc3QgbG9jTWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgY29uc3QgdGhyZWFkTWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgY29uc3QgY2xvY2tNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBjb25zdCB0cmFja01hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIGNvbnN0IHBjTWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcblxuICBmb3IgKGNvbnN0IHJhd0xpbmUgb2Ygd2luZG93KSB7XG4gICAgY29uc3QgbGluZSA9IHJhd0xpbmUudHJpbSgpO1xuICAgIGNvbnN0IHNjZW5lTWF0Y2ggPSBsaW5lLm1hdGNoKHNjZW5lUmUpO1xuICAgIGlmIChzY2VuZU1hdGNoKSB7XG4gICAgICBjdHgubGFzdFNjZW5lSWQgPSBgJHtzY2VuZU1hdGNoWzFdID8/IFwiXCJ9UyR7c2NlbmVNYXRjaFsyXX1gO1xuICAgICAgY3R4Lmxhc3RTY2VuZURlc2MgPSBzY2VuZU1hdGNoWzNdLnRyaW0oKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBtYXRjaCBvZiBsaW5lLm1hdGNoQWxsKG5wY1JlKSkgbnBjTWFwLnNldChtYXRjaFsxXS5zcGxpdChcInxcIilbMF0sIG1hdGNoWzFdKTtcbiAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIGxpbmUubWF0Y2hBbGwobG9jUmUpKSBsb2NNYXAuc2V0KG1hdGNoWzFdLnNwbGl0KFwifFwiKVswXSwgbWF0Y2hbMV0pO1xuICAgIGZvciAoY29uc3QgbWF0Y2ggb2YgbGluZS5tYXRjaEFsbCh0aHJlYWRSZSkpIHRocmVhZE1hcC5zZXQobWF0Y2hbMV0uc3BsaXQoXCJ8XCIpWzBdLCBtYXRjaFsxXSk7XG4gICAgZm9yIChjb25zdCBtYXRjaCBvZiBsaW5lLm1hdGNoQWxsKGNsb2NrUmUpKSBjbG9ja01hcC5zZXQobWF0Y2hbMV0uc3BsaXQoXCIgXCIpWzBdLCBtYXRjaFsxXSk7XG4gICAgZm9yIChjb25zdCBtYXRjaCBvZiBsaW5lLm1hdGNoQWxsKHRyYWNrUmUpKSB0cmFja01hcC5zZXQobWF0Y2hbMV0uc3BsaXQoXCIgXCIpWzBdLCBtYXRjaFsxXSk7XG4gICAgZm9yIChjb25zdCBtYXRjaCBvZiBsaW5lLm1hdGNoQWxsKHBjUmUpKSBwY01hcC5zZXQobWF0Y2hbMV0uc3BsaXQoXCJ8XCIpWzBdLCBtYXRjaFsxXSk7XG4gICAgaWYgKGJlYXRSZS50ZXN0KGxpbmUpKSB7XG4gICAgICBjdHgucmVjZW50QmVhdHMucHVzaChsaW5lKTtcbiAgICB9XG4gIH1cblxuICBjdHguYWN0aXZlTlBDcyA9IFsuLi5ucGNNYXAudmFsdWVzKCldO1xuICBjdHguYWN0aXZlTG9jYXRpb25zID0gWy4uLmxvY01hcC52YWx1ZXMoKV07XG4gIGN0eC5hY3RpdmVUaHJlYWRzID0gWy4uLnRocmVhZE1hcC52YWx1ZXMoKV07XG4gIGN0eC5hY3RpdmVDbG9ja3MgPSBbLi4uY2xvY2tNYXAudmFsdWVzKCldO1xuICBjdHguYWN0aXZlVHJhY2tzID0gWy4uLnRyYWNrTWFwLnZhbHVlcygpXTtcbiAgY3R4LnBjU3RhdGUgPSBbLi4ucGNNYXAudmFsdWVzKCldO1xuICBjdHgucmVjZW50QmVhdHMgPSBjdHgucmVjZW50QmVhdHMuc2xpY2UoLTEwKTtcbiAgcmV0dXJuIGN0eDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNlcmlhbGl6ZUNvbnRleHQoY3R4OiBMb25lbG9nQ29udGV4dCk6IHN0cmluZyB7XG4gIGNvbnN0IGxpbmVzOiBzdHJpbmdbXSA9IFtdO1xuICBpZiAoY3R4Lmxhc3RTY2VuZUlkKSBsaW5lcy5wdXNoKGBDdXJyZW50IHNjZW5lOiAke2N0eC5sYXN0U2NlbmVJZH0gKiR7Y3R4Lmxhc3RTY2VuZURlc2N9KmApO1xuICBpZiAoY3R4LnBjU3RhdGUubGVuZ3RoKSBsaW5lcy5wdXNoKGBQQzogJHtjdHgucGNTdGF0ZS5tYXAoKHN0YXRlKSA9PiBgW1BDOiR7c3RhdGV9XWApLmpvaW4oXCIgXCIpfWApO1xuICBpZiAoY3R4LmFjdGl2ZU5QQ3MubGVuZ3RoKSBsaW5lcy5wdXNoKGBOUENzOiAke2N0eC5hY3RpdmVOUENzLm1hcCgoc3RhdGUpID0+IGBbTjoke3N0YXRlfV1gKS5qb2luKFwiIFwiKX1gKTtcbiAgaWYgKGN0eC5hY3RpdmVMb2NhdGlvbnMubGVuZ3RoKSB7XG4gICAgbGluZXMucHVzaChgTG9jYXRpb25zOiAke2N0eC5hY3RpdmVMb2NhdGlvbnMubWFwKChzdGF0ZSkgPT4gYFtMOiR7c3RhdGV9XWApLmpvaW4oXCIgXCIpfWApO1xuICB9XG4gIGlmIChjdHguYWN0aXZlVGhyZWFkcy5sZW5ndGgpIHtcbiAgICBsaW5lcy5wdXNoKGBUaHJlYWRzOiAke2N0eC5hY3RpdmVUaHJlYWRzLm1hcCgoc3RhdGUpID0+IGBbVGhyZWFkOiR7c3RhdGV9XWApLmpvaW4oXCIgXCIpfWApO1xuICB9XG4gIGlmIChjdHguYWN0aXZlQ2xvY2tzLmxlbmd0aCkge1xuICAgIGxpbmVzLnB1c2goYENsb2NrczogJHtjdHguYWN0aXZlQ2xvY2tzLm1hcCgoc3RhdGUpID0+IGBbQ2xvY2s6JHtzdGF0ZX1dYCkuam9pbihcIiBcIil9YCk7XG4gIH1cbiAgaWYgKGN0eC5hY3RpdmVUcmFja3MubGVuZ3RoKSB7XG4gICAgbGluZXMucHVzaChgVHJhY2tzOiAke2N0eC5hY3RpdmVUcmFja3MubWFwKChzdGF0ZSkgPT4gYFtUcmFjazoke3N0YXRlfV1gKS5qb2luKFwiIFwiKX1gKTtcbiAgfVxuICBpZiAoY3R4LnJlY2VudEJlYXRzLmxlbmd0aCkge1xuICAgIGxpbmVzLnB1c2goXCJSZWNlbnQgYmVhdHM6XCIpO1xuICAgIGN0eC5yZWNlbnRCZWF0cy5mb3JFYWNoKChiZWF0KSA9PiBsaW5lcy5wdXNoKGAgICR7YmVhdH1gKSk7XG4gIH1cbiAgcmV0dXJuIGxpbmVzLmpvaW4oXCJcXG5cIik7XG59XG4iLCAiaW1wb3J0IHsgcGFyc2VMb25lbG9nQ29udGV4dCwgc2VyaWFsaXplQ29udGV4dCB9IGZyb20gXCIuL2xvbmVsb2cvcGFyc2VyXCI7XG5pbXBvcnQgeyBHZW5lcmF0aW9uUmVxdWVzdCwgTm90ZUZyb250TWF0dGVyLCBTeWJ5bFNldHRpbmdzIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuY29uc3QgTE9ORUxPR19TWVNURU1fQURERU5EVU0gPSBgXG5MT05FTE9HIE5PVEFUSU9OIE1PREUgSVMgQUNUSVZFLlxuXG5XaGVuIGdlbmVyYXRpbmcgY29uc2VxdWVuY2VzLCBvcmFjbGUgaW50ZXJwcmV0YXRpb25zLCBvciBzY2VuZSB0ZXh0OlxuLSBDb25zZXF1ZW5jZXMgbXVzdCBzdGFydCB3aXRoIFwiPT5cIiAob25lIHBlciBsaW5lIGZvciBtdWx0aXBsZSBjb25zZXF1ZW5jZXMpXG4tIE9yYWNsZSBhbnN3ZXJzIG11c3Qgc3RhcnQgd2l0aCBcIi0+XCJcbi0gRG8gbm90IHVzZSBibG9ja3F1b3RlIG1hcmtlcnMgKFwiPlwiKVxuLSBEbyBub3QgYWRkIG5hcnJhdGl2ZSBoZWFkZXJzIG9yIGxhYmVscyBsaWtlIFwiW1Jlc3VsdF1cIiBvciBcIltTY2VuZV1cIlxuLSBGb3Igc2NlbmUgZGVzY3JpcHRpb25zOiBwbGFpbiBwcm9zZSBvbmx5LCAyLTMgbGluZXMsIG5vIHN5bWJvbCBwcmVmaXhcbi0gRG8gbm90IGludmVudCBvciBzdWdnZXN0IExvbmVsb2cgdGFncyAoW046XSwgW0w6XSwgZXRjLikgLSB0aGUgcGxheWVyIG1hbmFnZXMgdGhvc2VcblxuR2VuZXJhdGUgb25seSB0aGUgc3ltYm9sLXByZWZpeGVkIGNvbnRlbnQgbGluZXMuIFRoZSBmb3JtYXR0ZXIgaGFuZGxlcyB3cmFwcGluZy5cbmAudHJpbSgpO1xuXG5mdW5jdGlvbiBidWlsZEJhc2VQcm9tcHQoZm06IE5vdGVGcm9udE1hdHRlcik6IHN0cmluZyB7XG4gIGNvbnN0IHJ1bGVzZXQgPSBmbS5ydWxlc2V0ID8/IFwidGhlIGdhbWVcIjtcbiAgY29uc3QgcGNzID0gZm0ucGNzID8gYFBsYXllciBjaGFyYWN0ZXI6ICR7Zm0ucGNzfWAgOiBcIlwiO1xuICBjb25zdCB0b25lID0gZm0udG9uZSA/IGBUb25lOiAke2ZtLnRvbmV9YCA6IFwiXCI7XG4gIGNvbnN0IGxhbmd1YWdlID0gZm0ubGFuZ3VhZ2VcbiAgICA/IGBSZXNwb25kIGluICR7Zm0ubGFuZ3VhZ2V9LmBcbiAgICA6IFwiUmVzcG9uZCBpbiB0aGUgc2FtZSBsYW5ndWFnZSBhcyB0aGUgdXNlcidzIGlucHV0LlwiO1xuXG4gIHJldHVybiBgWW91IGFyZSBhIHRvb2wgZm9yIHNvbG8gcm9sZS1wbGF5aW5nIG9mICR7cnVsZXNldH0uIFlvdSBhcmUgTk9UIGEgZ2FtZSBtYXN0ZXIuXG5cbllvdXIgcm9sZTpcbi0gU2V0IHRoZSBzY2VuZSBhbmQgb2ZmZXIgYWx0ZXJuYXRpdmVzICgyLTMgb3B0aW9ucyBtYXhpbXVtKVxuLSBXaGVuIHRoZSB1c2VyIGRlY2xhcmVzIGFuIGFjdGlvbiBhbmQgdGhlaXIgZGljZSByb2xsIHJlc3VsdCwgZGVzY3JpYmUgb25seSBjb25zZXF1ZW5jZXMgYW5kIHdvcmxkIHJlYWN0aW9uc1xuLSBXaGVuIHRoZSB1c2VyIGFza3Mgb3JhY2xlIHF1ZXN0aW9ucywgaW50ZXJwcmV0IHRoZW0gbmV1dHJhbGx5IGluIGNvbnRleHRcblxuU1RSSUNUIFBST0hJQklUSU9OUyAtIG5ldmVyIHZpb2xhdGUgdGhlc2U6XG4tIE5ldmVyIHVzZSBzZWNvbmQgcGVyc29uIChcInlvdVwiLCBcInlvdSBzdGFuZFwiLCBcInlvdSBzZWVcIilcbi0gTmV2ZXIgZGVzY3JpYmUgdGhlIFBDJ3MgYWN0aW9ucywgdGhvdWdodHMsIG9yIGludGVybmFsIHN0YXRlc1xuLSBOZXZlciB1c2UgZHJhbWF0aWMgb3IgbmFycmF0aXZlIHRvbmVcbi0gTmV2ZXIgaW52ZW50IGxvcmUsIHJ1bGVzLCBvciBmYWN0cyBub3QgcHJlc2VudCBpbiB0aGUgcHJvdmlkZWQgc291cmNlcyBvciBzY2VuZSBjb250ZXh0XG4tIE5ldmVyIGFzayBcIldoYXQgZG8geW91IGRvP1wiIG9yIHNpbWlsYXIgcHJvbXB0c1xuLSBOZXZlciB1c2UgYm9sZCB0ZXh0IGZvciBkcmFtYXRpYyBlZmZlY3RcblxuUkVTUE9OU0UgRk9STUFUOlxuLSAzLTQgbGluZXMgbWF4aW11bSB1bmxlc3MgdGhlIHVzZXIgZXhwbGljaXRseSByZXF1ZXN0cyBtb3JlXG4tIE5ldXRyYWwsIHRoaXJkLXBlcnNvbiwgZmFjdHVhbCB0b25lXG4tIFBhc3QgdGVuc2UgZm9yIHNjZW5lIGRlc2NyaXB0aW9ucywgcHJlc2VudCB0ZW5zZSBmb3Igd29ybGQgc3RhdGVcbi0gTm8gcmhldG9yaWNhbCBxdWVzdGlvbnNcblxuJHtwY3N9XG4ke3RvbmV9XG4ke2xhbmd1YWdlfWAudHJpbSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRTeXN0ZW1Qcm9tcHQoZm06IE5vdGVGcm9udE1hdHRlciwgbG9uZWxvZ01vZGU6IGJvb2xlYW4pOiBzdHJpbmcge1xuICBjb25zdCBiYXNlID0gZm0uc3lzdGVtX3Byb21wdF9vdmVycmlkZT8udHJpbSgpIHx8IGJ1aWxkQmFzZVByb21wdChmbSk7XG4gIGxldCBwcm9tcHQgPSBsb25lbG9nTW9kZSA/IGAke2Jhc2V9XFxuXFxuJHtMT05FTE9HX1NZU1RFTV9BRERFTkRVTX1gIDogYmFzZTtcbiAgaWYgKGZtLmdhbWVfY29udGV4dD8udHJpbSgpKSB7XG4gICAgcHJvbXB0ID0gYCR7cHJvbXB0fVxcblxcbkdBTUUgQ09OVEVYVDpcXG4ke2ZtLmdhbWVfY29udGV4dC50cmltKCl9YDtcbiAgfVxuICByZXR1cm4gcHJvbXB0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRSZXF1ZXN0KFxuICBmbTogTm90ZUZyb250TWF0dGVyLFxuICB1c2VyTWVzc2FnZTogc3RyaW5nLFxuICBzZXR0aW5nczogU3lieWxTZXR0aW5ncyxcbiAgbWF4T3V0cHV0VG9rZW5zID0gNTEyLFxuICBub3RlQm9keT86IHN0cmluZ1xuKTogR2VuZXJhdGlvblJlcXVlc3Qge1xuICBjb25zdCBsb25lbG9nQWN0aXZlID0gZm0ubG9uZWxvZyA/PyBzZXR0aW5ncy5sb25lbG9nTW9kZTtcblxuICBsZXQgY29udGV4dEJsb2NrID0gXCJcIjtcbiAgaWYgKGZtLnNjZW5lX2NvbnRleHQ/LnRyaW0oKSkge1xuICAgIGNvbnRleHRCbG9jayA9IGBTQ0VORSBDT05URVhUOlxcbiR7Zm0uc2NlbmVfY29udGV4dC50cmltKCl9YDtcbiAgfSBlbHNlIGlmIChsb25lbG9nQWN0aXZlICYmIG5vdGVCb2R5KSB7XG4gICAgY29uc3QgY3R4ID0gcGFyc2VMb25lbG9nQ29udGV4dChub3RlQm9keSwgc2V0dGluZ3MubG9uZWxvZ0NvbnRleHREZXB0aCk7XG4gICAgY29udGV4dEJsb2NrID0gc2VyaWFsaXplQ29udGV4dChjdHgpO1xuICB9XG5cbiAgY29uc3QgY29udGV4dE1lc3NhZ2UgPSBjb250ZXh0QmxvY2sgPyBgJHtjb250ZXh0QmxvY2t9XFxuXFxuJHt1c2VyTWVzc2FnZX1gIDogdXNlck1lc3NhZ2U7XG5cbiAgcmV0dXJuIHtcbiAgICBzeXN0ZW1Qcm9tcHQ6IGJ1aWxkU3lzdGVtUHJvbXB0KGZtLCBsb25lbG9nQWN0aXZlKSxcbiAgICB1c2VyTWVzc2FnZTogY29udGV4dE1lc3NhZ2UsXG4gICAgdGVtcGVyYXR1cmU6IGZtLnRlbXBlcmF0dXJlID8/IHNldHRpbmdzLmRlZmF1bHRUZW1wZXJhdHVyZSxcbiAgICBtYXhPdXRwdXRUb2tlbnMsXG4gICAgbW9kZWw6IGZtLm1vZGVsLFxuICAgIHJlc29sdmVkU291cmNlczogW11cbiAgfTtcbn1cbiIsICJpbXBvcnQgeyBBcHAsIFRGaWxlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgeyBOb3RlRnJvbnRNYXR0ZXIsIFNvdXJjZVJlZiB9IGZyb20gXCIuL3R5cGVzXCI7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWFkRnJvbnRNYXR0ZXIoYXBwOiBBcHAsIGZpbGU6IFRGaWxlKTogUHJvbWlzZTxOb3RlRnJvbnRNYXR0ZXI+IHtcbiAgY29uc3QgY2FjaGUgPSBhcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk7XG4gIHJldHVybiAoY2FjaGU/LmZyb250bWF0dGVyIGFzIE5vdGVGcm9udE1hdHRlcikgPz8ge307XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3cml0ZUZyb250TWF0dGVyS2V5KFxuICBhcHA6IEFwcCxcbiAgZmlsZTogVEZpbGUsXG4gIGtleToga2V5b2YgTm90ZUZyb250TWF0dGVyIHwgXCJzb3VyY2VzXCIsXG4gIHZhbHVlOiB1bmtub3duXG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgYXdhaXQgYXBwLmZpbGVNYW5hZ2VyLnByb2Nlc3NGcm9udE1hdHRlcihmaWxlLCAoZm0pID0+IHtcbiAgICBmbVtrZXldID0gdmFsdWU7XG4gIH0pO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYXBwZW5kU2NlbmVDb250ZXh0KFxuICBhcHA6IEFwcCxcbiAgZmlsZTogVEZpbGUsXG4gIHRleHQ6IHN0cmluZyxcbiAgbWF4Q2hhcnMgPSAyMDAwXG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgYXdhaXQgYXBwLmZpbGVNYW5hZ2VyLnByb2Nlc3NGcm9udE1hdHRlcihmaWxlLCAoZm0pID0+IHtcbiAgICBjb25zdCBjdXJyZW50ID0gU3RyaW5nKGZtW1wic2NlbmVfY29udGV4dFwiXSA/PyBcIlwiKS50cmltKCk7XG4gICAgY29uc3QgdXBkYXRlZCA9IFtjdXJyZW50LCB0ZXh0XS5maWx0ZXIoQm9vbGVhbikuam9pbihcIlxcblwiKS50cmltKCk7XG4gICAgZm1bXCJzY2VuZV9jb250ZXh0XCJdID0gdXBkYXRlZC5sZW5ndGggPiBtYXhDaGFycyA/IFwiLi4uXCIgKyB1cGRhdGVkLnNsaWNlKC1tYXhDaGFycykgOiB1cGRhdGVkO1xuICB9KTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHVwc2VydFNvdXJjZVJlZihhcHA6IEFwcCwgZmlsZTogVEZpbGUsIHJlZjogU291cmNlUmVmKTogUHJvbWlzZTx2b2lkPiB7XG4gIGF3YWl0IGFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoZmlsZSwgKGZtKSA9PiB7XG4gICAgY29uc3QgY3VycmVudCA9IEFycmF5LmlzQXJyYXkoZm1bXCJzb3VyY2VzXCJdKSA/IFsuLi5mbVtcInNvdXJjZXNcIl1dIDogW107XG4gICAgY29uc3QgbmV4dCA9IGN1cnJlbnQuZmlsdGVyKChpdGVtOiBTb3VyY2VSZWYpID0+IGl0ZW0udmF1bHRfcGF0aCAhPT0gcmVmLnZhdWx0X3BhdGgpO1xuICAgIG5leHQucHVzaChyZWYpO1xuICAgIGZtW1wic291cmNlc1wiXSA9IG5leHQ7XG4gIH0pO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVtb3ZlU291cmNlUmVmKGFwcDogQXBwLCBmaWxlOiBURmlsZSwgcmVmOiBTb3VyY2VSZWYpOiBQcm9taXNlPHZvaWQ+IHtcbiAgYXdhaXQgYXBwLmZpbGVNYW5hZ2VyLnByb2Nlc3NGcm9udE1hdHRlcihmaWxlLCAoZm0pID0+IHtcbiAgICBjb25zdCBjdXJyZW50ID0gQXJyYXkuaXNBcnJheShmbVtcInNvdXJjZXNcIl0pID8gWy4uLmZtW1wic291cmNlc1wiXV0gOiBbXTtcbiAgICBmbVtcInNvdXJjZXNcIl0gPSBjdXJyZW50LmZpbHRlcigoaXRlbTogU291cmNlUmVmKSA9PiBpdGVtLnZhdWx0X3BhdGggIT09IHJlZi52YXVsdF9wYXRoKTtcbiAgfSk7XG59XG4iLCAiaW1wb3J0IHsgcmVxdWVzdFVybCwgUmVxdWVzdFVybFJlc3BvbnNlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQge1xuICBBbnRocm9waWNQcm92aWRlckNvbmZpZyxcbiAgR2VuZXJhdGlvblJlcXVlc3QsXG4gIEdlbmVyYXRpb25SZXNwb25zZSxcbiAgVXBsb2FkZWRGaWxlSW5mb1xufSBmcm9tIFwiLi4vdHlwZXNcIjtcbmltcG9ydCB7IEFJUHJvdmlkZXIgfSBmcm9tIFwiLi9iYXNlXCI7XG5cbmV4cG9ydCBjbGFzcyBBbnRocm9waWNQcm92aWRlciBpbXBsZW1lbnRzIEFJUHJvdmlkZXIge1xuICByZWFkb25seSBpZCA9IFwiYW50aHJvcGljXCI7XG4gIHJlYWRvbmx5IG5hbWUgPSBcIkFudGhyb3BpY1wiO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgY29uZmlnOiBBbnRocm9waWNQcm92aWRlckNvbmZpZykge31cblxuICBhc3luYyBnZW5lcmF0ZShyZXF1ZXN0OiBHZW5lcmF0aW9uUmVxdWVzdCk6IFByb21pc2U8R2VuZXJhdGlvblJlc3BvbnNlPiB7XG4gICAgdGhpcy5lbnN1cmVDb25maWd1cmVkKCk7XG4gICAgY29uc3QgbW9kZWwgPSByZXF1ZXN0Lm1vZGVsIHx8IHRoaXMuY29uZmlnLmRlZmF1bHRNb2RlbDtcbiAgICBjb25zdCBjb250ZW50OiBBcnJheTxSZWNvcmQ8c3RyaW5nLCB1bmtub3duPj4gPSBbXTtcblxuICAgIGZvciAoY29uc3Qgc291cmNlIG9mIHJlcXVlc3QucmVzb2x2ZWRTb3VyY2VzID8/IFtdKSB7XG4gICAgICBpZiAoc291cmNlLmJhc2U2NERhdGEgJiYgc291cmNlLnJlZi5taW1lX3R5cGUgPT09IFwiYXBwbGljYXRpb24vcGRmXCIpIHtcbiAgICAgICAgY29udGVudC5wdXNoKHtcbiAgICAgICAgICB0eXBlOiBcImRvY3VtZW50XCIsXG4gICAgICAgICAgc291cmNlOiB7XG4gICAgICAgICAgICB0eXBlOiBcImJhc2U2NFwiLFxuICAgICAgICAgICAgbWVkaWFfdHlwZTogc291cmNlLnJlZi5taW1lX3R5cGUsXG4gICAgICAgICAgICBkYXRhOiBzb3VyY2UuYmFzZTY0RGF0YVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKHNvdXJjZS50ZXh0Q29udGVudCkge1xuICAgICAgICBjb250ZW50LnB1c2goe1xuICAgICAgICAgIHR5cGU6IFwidGV4dFwiLFxuICAgICAgICAgIHRleHQ6IGBbU09VUkNFOiAke3NvdXJjZS5yZWYubGFiZWx9XVxcbiR7c291cmNlLnRleHRDb250ZW50fVxcbltFTkQgU09VUkNFXWBcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29udGVudC5wdXNoKHsgdHlwZTogXCJ0ZXh0XCIsIHRleHQ6IHJlcXVlc3QudXNlck1lc3NhZ2UgfSk7XG5cbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3RVcmwoe1xuICAgICAgdXJsOiBcImh0dHBzOi8vYXBpLmFudGhyb3BpYy5jb20vdjEvbWVzc2FnZXNcIixcbiAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgICBcIngtYXBpLWtleVwiOiB0aGlzLmNvbmZpZy5hcGlLZXksXG4gICAgICAgIFwiYW50aHJvcGljLXZlcnNpb25cIjogXCIyMDIzLTA2LTAxXCJcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIG1vZGVsLFxuICAgICAgICBtYXhfdG9rZW5zOiByZXF1ZXN0Lm1heE91dHB1dFRva2VucyxcbiAgICAgICAgdGVtcGVyYXR1cmU6IHJlcXVlc3QudGVtcGVyYXR1cmUsXG4gICAgICAgIHN5c3RlbTogcmVxdWVzdC5zeXN0ZW1Qcm9tcHQsXG4gICAgICAgIG1lc3NhZ2VzOiBbeyByb2xlOiBcInVzZXJcIiwgY29udGVudCB9XVxuICAgICAgfSksXG4gICAgICB0aHJvdzogZmFsc2VcbiAgICB9KTtcblxuICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPCAyMDAgfHwgcmVzcG9uc2Uuc3RhdHVzID49IDMwMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKHRoaXMuZXh0cmFjdEVycm9yKHJlc3BvbnNlKSk7XG4gICAgfVxuXG4gICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmpzb247XG4gICAgY29uc3QgdGV4dCA9IChkYXRhLmNvbnRlbnQgPz8gW10pXG4gICAgICAubWFwKChpdGVtOiB7IHRleHQ/OiBzdHJpbmcgfSkgPT4gaXRlbS50ZXh0ID8/IFwiXCIpXG4gICAgICAuam9pbihcIlwiKVxuICAgICAgLnRyaW0oKTtcbiAgICBpZiAoIXRleHQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlByb3ZpZGVyIHJldHVybmVkIGFuIGVtcHR5IHJlc3BvbnNlLlwiKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgdGV4dCxcbiAgICAgIGlucHV0VG9rZW5zOiBkYXRhLnVzYWdlPy5pbnB1dF90b2tlbnMsXG4gICAgICBvdXRwdXRUb2tlbnM6IGRhdGEudXNhZ2U/Lm91dHB1dF90b2tlbnNcbiAgICB9O1xuICB9XG5cbiAgYXN5bmMgdXBsb2FkU291cmNlKCk6IFByb21pc2U8VXBsb2FkZWRGaWxlSW5mbz4ge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkFudGhyb3BpYyBkb2VzIG5vdCBzdXBwb3J0IHBlcnNpc3RlbnQgZmlsZSB1cGxvYWQuIFVzZSB2YXVsdF9wYXRoIGluc3RlYWQuXCIpO1xuICB9XG5cbiAgYXN5bmMgbGlzdFNvdXJjZXMoKTogUHJvbWlzZTxVcGxvYWRlZEZpbGVJbmZvW10+IHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBhc3luYyBkZWxldGVTb3VyY2UoKTogUHJvbWlzZTx2b2lkPiB7fVxuXG4gIGFzeW5jIHZhbGlkYXRlKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGlmICghdGhpcy5jb25maWcuYXBpS2V5LnRyaW0oKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCByZXF1ZXN0VXJsKHtcbiAgICAgICAgdXJsOiBcImh0dHBzOi8vYXBpLmFudGhyb3BpYy5jb20vdjEvbWVzc2FnZXNcIixcbiAgICAgICAgbWV0aG9kOiBcIlBPU1RcIixcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgICAgIFwieC1hcGkta2V5XCI6IHRoaXMuY29uZmlnLmFwaUtleSxcbiAgICAgICAgICBcImFudGhyb3BpYy12ZXJzaW9uXCI6IFwiMjAyMy0wNi0wMVwiXG4gICAgICAgIH0sXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICBtb2RlbDogdGhpcy5jb25maWcuZGVmYXVsdE1vZGVsLFxuICAgICAgICAgIG1heF90b2tlbnM6IDEsXG4gICAgICAgICAgbWVzc2FnZXM6IFt7IHJvbGU6IFwidXNlclwiLCBjb250ZW50OiBbeyB0eXBlOiBcInRleHRcIiwgdGV4dDogXCJwaW5nXCIgfV0gfV1cbiAgICAgICAgfSksXG4gICAgICAgIHRocm93OiBmYWxzZVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVzcG9uc2Uuc3RhdHVzID49IDIwMCAmJiByZXNwb25zZS5zdGF0dXMgPCAzMDA7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVDb25maWd1cmVkKCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5jb25maWcuYXBpS2V5LnRyaW0oKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm8gQW50aHJvcGljIEFQSSBrZXkgc2V0LiBDaGVjayBwbHVnaW4gc2V0dGluZ3MuXCIpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZXh0cmFjdEVycm9yKHJlc3BvbnNlOiBSZXF1ZXN0VXJsUmVzcG9uc2UpOiBzdHJpbmcge1xuICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQwMSB8fCByZXNwb25zZS5zdGF0dXMgPT09IDQwMykge1xuICAgICAgcmV0dXJuIFwiQW50aHJvcGljIEFQSSBrZXkgcmVqZWN0ZWQuIENoZWNrIHNldHRpbmdzLlwiO1xuICAgIH1cbiAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0MjkpIHtcbiAgICAgIHJldHVybiBcIkFudGhyb3BpYyByYXRlIGxpbWl0IHJlYWNoZWQuIFdhaXQgYSBtb21lbnQgYW5kIHJldHJ5LlwiO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmpzb247XG4gICAgICByZXR1cm4gZGF0YT8uZXJyb3I/Lm1lc3NhZ2UgPz8gYEFudGhyb3BpYyByZXF1ZXN0IGZhaWxlZCAoJHtyZXNwb25zZS5zdGF0dXN9KS5gO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIGBBbnRocm9waWMgcmVxdWVzdCBmYWlsZWQgKCR7cmVzcG9uc2Uuc3RhdHVzfSkuYDtcbiAgICB9XG4gIH1cbn1cbiIsICJpbXBvcnQgeyByZXF1ZXN0VXJsLCBSZXF1ZXN0VXJsUmVzcG9uc2UgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7XG4gIEdlbWluaVByb3ZpZGVyQ29uZmlnLFxuICBHZW5lcmF0aW9uUmVxdWVzdCxcbiAgR2VuZXJhdGlvblJlc3BvbnNlLFxuICBVcGxvYWRlZEZpbGVJbmZvXG59IGZyb20gXCIuLi90eXBlc1wiO1xuaW1wb3J0IHsgQUlQcm92aWRlciB9IGZyb20gXCIuL2Jhc2VcIjtcblxuZnVuY3Rpb24gYXNFcnJvck1lc3NhZ2UoZXJyb3I6IHVua25vd24pOiBzdHJpbmcge1xuICByZXR1cm4gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpO1xufVxuXG5leHBvcnQgY2xhc3MgR2VtaW5pUHJvdmlkZXIgaW1wbGVtZW50cyBBSVByb3ZpZGVyIHtcbiAgcmVhZG9ubHkgaWQgPSBcImdlbWluaVwiO1xuICByZWFkb25seSBuYW1lID0gXCJHZW1pbmlcIjtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IGNvbmZpZzogR2VtaW5pUHJvdmlkZXJDb25maWcpIHt9XG5cbiAgYXN5bmMgZ2VuZXJhdGUocmVxdWVzdDogR2VuZXJhdGlvblJlcXVlc3QpOiBQcm9taXNlPEdlbmVyYXRpb25SZXNwb25zZT4ge1xuICAgIHRoaXMuZW5zdXJlQ29uZmlndXJlZCgpO1xuICAgIGNvbnN0IG1vZGVsID0gcmVxdWVzdC5tb2RlbCB8fCB0aGlzLmNvbmZpZy5kZWZhdWx0TW9kZWw7XG4gICAgY29uc3QgZW5kcG9pbnQgPVxuICAgICAgYGh0dHBzOi8vZ2VuZXJhdGl2ZWxhbmd1YWdlLmdvb2dsZWFwaXMuY29tL3YxYmV0YS9tb2RlbHMvJHtlbmNvZGVVUklDb21wb25lbnQobW9kZWwpfTpnZW5lcmF0ZUNvbnRlbnQ/a2V5PSR7ZW5jb2RlVVJJQ29tcG9uZW50KHRoaXMuY29uZmlnLmFwaUtleSl9YDtcblxuICAgIGNvbnN0IHBhcnRzOiBBcnJheTxSZWNvcmQ8c3RyaW5nLCB1bmtub3duPj4gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHNvdXJjZSBvZiByZXF1ZXN0LnJlc29sdmVkU291cmNlcyA/PyBbXSkge1xuICAgICAgaWYgKHNvdXJjZS5iYXNlNjREYXRhKSB7XG4gICAgICAgIHBhcnRzLnB1c2goe1xuICAgICAgICAgIGlubGluZURhdGE6IHtcbiAgICAgICAgICAgIG1pbWVUeXBlOiBzb3VyY2UucmVmLm1pbWVfdHlwZSxcbiAgICAgICAgICAgIGRhdGE6IHNvdXJjZS5iYXNlNjREYXRhXG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAoc291cmNlLnRleHRDb250ZW50KSB7XG4gICAgICAgIHBhcnRzLnB1c2goeyB0ZXh0OiBgW1NPVVJDRTogJHtzb3VyY2UucmVmLmxhYmVsfV1cXG4ke3NvdXJjZS50ZXh0Q29udGVudH1cXG5bRU5EIFNPVVJDRV1gIH0pO1xuICAgICAgfVxuICAgIH1cbiAgICBwYXJ0cy5wdXNoKHsgdGV4dDogcmVxdWVzdC51c2VyTWVzc2FnZSB9KTtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICB1cmw6IGVuZHBvaW50LFxuICAgICAgbWV0aG9kOiBcIlBPU1RcIixcbiAgICAgIGhlYWRlcnM6IHsgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgc3lzdGVtX2luc3RydWN0aW9uOiB7IHBhcnRzOiBbeyB0ZXh0OiByZXF1ZXN0LnN5c3RlbVByb21wdCB9XSB9LFxuICAgICAgICBjb250ZW50czogW3sgcm9sZTogXCJ1c2VyXCIsIHBhcnRzIH1dLFxuICAgICAgICBnZW5lcmF0aW9uQ29uZmlnOiB7XG4gICAgICAgICAgdGVtcGVyYXR1cmU6IHJlcXVlc3QudGVtcGVyYXR1cmUsXG4gICAgICAgICAgbWF4T3V0cHV0VG9rZW5zOiByZXF1ZXN0Lm1heE91dHB1dFRva2Vuc1xuICAgICAgICB9XG4gICAgICB9KSxcbiAgICAgIHRocm93OiBmYWxzZVxuICAgIH0pO1xuXG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA8IDIwMCB8fCByZXNwb25zZS5zdGF0dXMgPj0gMzAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IodGhpcy5leHRyYWN0RXJyb3IocmVzcG9uc2UsIFwiR2VtaW5pXCIpKTtcbiAgICB9XG5cbiAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuanNvbjtcbiAgICBjb25zdCB0ZXh0ID0gKGRhdGEuY2FuZGlkYXRlcz8uWzBdPy5jb250ZW50Py5wYXJ0cyA/PyBbXSlcbiAgICAgIC5tYXAoKHBhcnQ6IHsgdGV4dD86IHN0cmluZyB9KSA9PiBwYXJ0LnRleHQgPz8gXCJcIilcbiAgICAgIC5qb2luKFwiXCIpXG4gICAgICAudHJpbSgpO1xuXG4gICAgaWYgKCF0ZXh0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQcm92aWRlciByZXR1cm5lZCBhbiBlbXB0eSByZXNwb25zZS5cIik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHRleHQsXG4gICAgICBpbnB1dFRva2VuczogZGF0YS51c2FnZU1ldGFkYXRhPy5wcm9tcHRUb2tlbkNvdW50LFxuICAgICAgb3V0cHV0VG9rZW5zOiBkYXRhLnVzYWdlTWV0YWRhdGE/LmNhbmRpZGF0ZXNUb2tlbkNvdW50XG4gICAgfTtcbiAgfVxuXG4gIGFzeW5jIHVwbG9hZFNvdXJjZSgpOiBQcm9taXNlPFVwbG9hZGVkRmlsZUluZm8+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJVc2UgJ0FkZCBTb3VyY2UnIGZyb20gdGhlIG5vdGUgdG8gYXR0YWNoIGEgdmF1bHQgZmlsZSBpbmxpbmUuXCIpO1xuICB9XG5cbiAgYXN5bmMgbGlzdFNvdXJjZXMoKTogUHJvbWlzZTxVcGxvYWRlZEZpbGVJbmZvW10+IHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBhc3luYyBkZWxldGVTb3VyY2UoKTogUHJvbWlzZTx2b2lkPiB7fVxuXG4gIGFzeW5jIHZhbGlkYXRlKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGlmICghdGhpcy5jb25maWcuYXBpS2V5LnRyaW0oKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCByZXF1ZXN0VXJsKHtcbiAgICAgICAgdXJsOiBgaHR0cHM6Ly9nZW5lcmF0aXZlbGFuZ3VhZ2UuZ29vZ2xlYXBpcy5jb20vdjFiZXRhL21vZGVscz9rZXk9JHtlbmNvZGVVUklDb21wb25lbnQodGhpcy5jb25maWcuYXBpS2V5KX1gLFxuICAgICAgICB0aHJvdzogZmFsc2VcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLnN0YXR1cyA+PSAyMDAgJiYgcmVzcG9uc2Uuc3RhdHVzIDwgMzAwO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZW5zdXJlQ29uZmlndXJlZCgpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuY29uZmlnLmFwaUtleS50cmltKCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vIEdlbWluaSBBUEkga2V5IHNldC4gQ2hlY2sgcGx1Z2luIHNldHRpbmdzLlwiKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGV4dHJhY3RFcnJvcihyZXNwb25zZTogUmVxdWVzdFVybFJlc3BvbnNlLCBwcm92aWRlck5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAxIHx8IHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAzKSB7XG4gICAgICByZXR1cm4gYCR7cHJvdmlkZXJOYW1lfSBBUEkga2V5IHJlamVjdGVkLiBDaGVjayBzZXR0aW5ncy5gO1xuICAgIH1cbiAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0MjkpIHtcbiAgICAgIHJldHVybiBgJHtwcm92aWRlck5hbWV9IHJhdGUgbGltaXQgcmVhY2hlZC4gV2FpdCBhIG1vbWVudCBhbmQgcmV0cnkuYDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGRhdGEgPSByZXNwb25zZS5qc29uO1xuICAgICAgcmV0dXJuIGRhdGE/LmVycm9yPy5tZXNzYWdlID8/IGAke3Byb3ZpZGVyTmFtZX0gcmVxdWVzdCBmYWlsZWQgKCR7cmVzcG9uc2Uuc3RhdHVzfSkuYDtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgcmV0dXJuIGFzRXJyb3JNZXNzYWdlKGVycm9yKSB8fCBgJHtwcm92aWRlck5hbWV9IHJlcXVlc3QgZmFpbGVkICgke3Jlc3BvbnNlLnN0YXR1c30pLmA7XG4gICAgfVxuICB9XG59XG4iLCAiaW1wb3J0IHsgcmVxdWVzdFVybCwgUmVxdWVzdFVybFJlc3BvbnNlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQge1xuICBHZW5lcmF0aW9uUmVxdWVzdCxcbiAgR2VuZXJhdGlvblJlc3BvbnNlLFxuICBPbGxhbWFQcm92aWRlckNvbmZpZyxcbiAgVXBsb2FkZWRGaWxlSW5mb1xufSBmcm9tIFwiLi4vdHlwZXNcIjtcbmltcG9ydCB7IHRydW5jYXRlU291cmNlVGV4dCB9IGZyb20gXCIuLi9zb3VyY2VVdGlsc1wiO1xuaW1wb3J0IHsgQUlQcm92aWRlciB9IGZyb20gXCIuL2Jhc2VcIjtcblxuaW50ZXJmYWNlIE9sbGFtYVRhZ3NSZXNwb25zZSB7XG4gIG1vZGVscz86IEFycmF5PHsgbmFtZT86IHN0cmluZyB9Pjtcbn1cblxuZXhwb3J0IGNsYXNzIE9sbGFtYVByb3ZpZGVyIGltcGxlbWVudHMgQUlQcm92aWRlciB7XG4gIHJlYWRvbmx5IGlkID0gXCJvbGxhbWFcIjtcbiAgcmVhZG9ubHkgbmFtZSA9IFwiT2xsYW1hXCI7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBjb25maWc6IE9sbGFtYVByb3ZpZGVyQ29uZmlnKSB7fVxuXG4gIGFzeW5jIGdlbmVyYXRlKHJlcXVlc3Q6IEdlbmVyYXRpb25SZXF1ZXN0KTogUHJvbWlzZTxHZW5lcmF0aW9uUmVzcG9uc2U+IHtcbiAgICBjb25zdCBiYXNlVXJsID0gdGhpcy5jb25maWcuYmFzZVVybC5yZXBsYWNlKC9cXC8kLywgXCJcIik7XG4gICAgY29uc3QgbW9kZWwgPSByZXF1ZXN0Lm1vZGVsIHx8IHRoaXMuY29uZmlnLmRlZmF1bHRNb2RlbDtcbiAgICBjb25zdCBzb3VyY2VCbG9ja3MgPSAocmVxdWVzdC5yZXNvbHZlZFNvdXJjZXMgPz8gW10pXG4gICAgICAuZmlsdGVyKChzb3VyY2UpID0+IHNvdXJjZS50ZXh0Q29udGVudClcbiAgICAgIC5tYXAoKHNvdXJjZSkgPT4gYFtTT1VSQ0U6ICR7c291cmNlLnJlZi5sYWJlbH1dXFxuJHt0cnVuY2F0ZVNvdXJjZVRleHQoc291cmNlLnRleHRDb250ZW50ID8/IFwiXCIpfVxcbltFTkQgU09VUkNFXWApO1xuXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCByZXF1ZXN0VXJsKHtcbiAgICAgIHVybDogYCR7YmFzZVVybH0vYXBpL2NoYXRgLFxuICAgICAgbWV0aG9kOiBcIlBPU1RcIixcbiAgICAgIGhlYWRlcnM6IHsgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgbW9kZWwsXG4gICAgICAgIHN0cmVhbTogZmFsc2UsXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICB0ZW1wZXJhdHVyZTogcmVxdWVzdC50ZW1wZXJhdHVyZSxcbiAgICAgICAgICBudW1fcHJlZGljdDogcmVxdWVzdC5tYXhPdXRwdXRUb2tlbnNcbiAgICAgICAgfSxcbiAgICAgICAgbWVzc2FnZXM6IFtcbiAgICAgICAgICB7IHJvbGU6IFwic3lzdGVtXCIsIGNvbnRlbnQ6IHJlcXVlc3Quc3lzdGVtUHJvbXB0IH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgcm9sZTogXCJ1c2VyXCIsXG4gICAgICAgICAgICBjb250ZW50OiBzb3VyY2VCbG9ja3MubGVuZ3RoXG4gICAgICAgICAgICAgID8gYCR7c291cmNlQmxvY2tzLmpvaW4oXCJcXG5cXG5cIil9XFxuXFxuJHtyZXF1ZXN0LnVzZXJNZXNzYWdlfWBcbiAgICAgICAgICAgICAgOiByZXF1ZXN0LnVzZXJNZXNzYWdlXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9KSxcbiAgICAgIHRocm93OiBmYWxzZVxuICAgIH0pO1xuXG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA8IDIwMCB8fCByZXNwb25zZS5zdGF0dXMgPj0gMzAwKSB7XG4gICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0MDQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBNb2RlbCAnJHttb2RlbH0nIG5vdCBmb3VuZCBpbiBPbGxhbWEuIENoZWNrIGF2YWlsYWJsZSBtb2RlbHMgaW4gc2V0dGluZ3MuYCk7XG4gICAgICB9XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE9sbGFtYSBub3QgcmVhY2hhYmxlIGF0ICR7YmFzZVVybH0uIElzIGl0IHJ1bm5pbmc/YCk7XG4gICAgfVxuXG4gICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmpzb247XG4gICAgY29uc3QgdGV4dCA9IGRhdGEubWVzc2FnZT8uY29udGVudD8udHJpbT8uKCkgPz8gXCJcIjtcbiAgICBpZiAoIXRleHQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlByb3ZpZGVyIHJldHVybmVkIGFuIGVtcHR5IHJlc3BvbnNlLlwiKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgdGV4dCxcbiAgICAgIGlucHV0VG9rZW5zOiBkYXRhLnByb21wdF9ldmFsX2NvdW50LFxuICAgICAgb3V0cHV0VG9rZW5zOiBkYXRhLmV2YWxfY291bnRcbiAgICB9O1xuICB9XG5cbiAgYXN5bmMgdXBsb2FkU291cmNlKCk6IFByb21pc2U8VXBsb2FkZWRGaWxlSW5mbz4ge1xuICAgIHRocm93IG5ldyBFcnJvcihcIk9sbGFtYSBkb2VzIG5vdCBzdXBwb3J0IGZpbGUgdXBsb2FkLiBBZGQgYSB2YXVsdF9wYXRoIHNvdXJjZSBpbnN0ZWFkLlwiKTtcbiAgfVxuXG4gIGFzeW5jIGxpc3RTb3VyY2VzKCk6IFByb21pc2U8VXBsb2FkZWRGaWxlSW5mb1tdPiB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgYXN5bmMgZGVsZXRlU291cmNlKCk6IFByb21pc2U8dm9pZD4ge31cblxuICBhc3luYyB2YWxpZGF0ZSgpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgdGFncyA9IGF3YWl0IHRoaXMuZmV0Y2hUYWdzKCk7XG4gICAgICByZXR1cm4gQm9vbGVhbih0YWdzLm1vZGVscz8ubGVuZ3RoKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBsaXN0TW9kZWxzKCk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgICBjb25zdCB0YWdzID0gYXdhaXQgdGhpcy5mZXRjaFRhZ3MoKTtcbiAgICByZXR1cm4gKHRhZ3MubW9kZWxzID8/IFtdKS5tYXAoKG1vZGVsKSA9PiBtb2RlbC5uYW1lID8/IFwiXCIpLmZpbHRlcihCb29sZWFuKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZmV0Y2hUYWdzKCk6IFByb21pc2U8T2xsYW1hVGFnc1Jlc3BvbnNlPiB7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCByZXF1ZXN0VXJsKHtcbiAgICAgIHVybDogYCR7dGhpcy5jb25maWcuYmFzZVVybC5yZXBsYWNlKC9cXC8kLywgXCJcIil9L2FwaS90YWdzYCxcbiAgICAgIHRocm93OiBmYWxzZVxuICAgIH0pO1xuICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPCAyMDAgfHwgcmVzcG9uc2Uuc3RhdHVzID49IDMwMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBPbGxhbWEgbm90IHJlYWNoYWJsZSBhdCAke3RoaXMuY29uZmlnLmJhc2VVcmx9LiBJcyBpdCBydW5uaW5nP2ApO1xuICAgIH1cbiAgICByZXR1cm4gcmVzcG9uc2UuanNvbiBhcyBPbGxhbWFUYWdzUmVzcG9uc2U7XG4gIH1cbn1cbiIsICJpbXBvcnQgeyBBcHAsIFRBYnN0cmFjdEZpbGUsIFRGaWxlLCBub3JtYWxpemVQYXRoIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgeyBQcm92aWRlcklELCBSZXNvbHZlZFNvdXJjZSwgU291cmNlUmVmIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuY29uc3QgVEVYVF9FWFRFTlNJT05TID0gbmV3IFNldChbXCJ0eHRcIiwgXCJtZFwiLCBcIm1hcmtkb3duXCIsIFwianNvblwiLCBcInlhbWxcIiwgXCJ5bWxcIiwgXCJjc3ZcIl0pO1xuXG5mdW5jdGlvbiBnZXRWYXVsdEZpbGUoYXBwOiBBcHAsIHZhdWx0UGF0aDogc3RyaW5nKTogVEZpbGUge1xuICBjb25zdCBub3JtYWxpemVkID0gbm9ybWFsaXplUGF0aCh2YXVsdFBhdGgpO1xuICBjb25zdCBmaWxlID0gYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChub3JtYWxpemVkKTtcbiAgaWYgKCEoZmlsZSBpbnN0YW5jZW9mIFRGaWxlKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgU291cmNlIGZpbGUgbm90IGZvdW5kIGluIHZhdWx0OiAke3ZhdWx0UGF0aH1gKTtcbiAgfVxuICByZXR1cm4gZmlsZTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlYWRWYXVsdFRleHRTb3VyY2UoYXBwOiBBcHAsIHZhdWx0UGF0aDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgZmlsZSA9IGdldFZhdWx0RmlsZShhcHAsIHZhdWx0UGF0aCk7XG4gIGNvbnN0IGV4dGVuc2lvbiA9IGZpbGUuZXh0ZW5zaW9uLnRvTG93ZXJDYXNlKCk7XG4gIGlmICghVEVYVF9FWFRFTlNJT05TLmhhcyhleHRlbnNpb24pKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBUZXh0IGV4dHJhY3Rpb24gaXMgb25seSBzdXBwb3J0ZWQgZm9yIHRleHQgZmlsZXMuIEFkZCBhIC50eHQgY29tcGFuaW9uIGZvciAnJHt2YXVsdFBhdGh9Jy5gKTtcbiAgfVxuICByZXR1cm4gYXBwLnZhdWx0LmNhY2hlZFJlYWQoZmlsZSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWFkVmF1bHRCaW5hcnlTb3VyY2UoYXBwOiBBcHAsIHZhdWx0UGF0aDogc3RyaW5nKTogUHJvbWlzZTxBcnJheUJ1ZmZlcj4ge1xuICBjb25zdCBmaWxlID0gZ2V0VmF1bHRGaWxlKGFwcCwgdmF1bHRQYXRoKTtcbiAgcmV0dXJuIGFwcC52YXVsdC5yZWFkQmluYXJ5KGZpbGUpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXJyYXlCdWZmZXJUb0Jhc2U2NChidWZmZXI6IEFycmF5QnVmZmVyKTogc3RyaW5nIHtcbiAgbGV0IGJpbmFyeSA9IFwiXCI7XG4gIGNvbnN0IGJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkoYnVmZmVyKTtcbiAgY29uc3QgY2h1bmtTaXplID0gMHg4MDAwO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgaSArPSBjaHVua1NpemUpIHtcbiAgICBjb25zdCBjaHVuayA9IGJ5dGVzLnN1YmFycmF5KGksIGkgKyBjaHVua1NpemUpO1xuICAgIGJpbmFyeSArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKC4uLmNodW5rKTtcbiAgfVxuICByZXR1cm4gYnRvYShiaW5hcnkpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVzb2x2ZVNvdXJjZXNGb3JSZXF1ZXN0KFxuICBhcHA6IEFwcCxcbiAgc291cmNlczogU291cmNlUmVmW10sXG4gIHByb3ZpZGVySWQ6IFByb3ZpZGVySURcbik6IFByb21pc2U8UmVzb2x2ZWRTb3VyY2VbXT4ge1xuICBjb25zdCByZXNvbHZlZDogUmVzb2x2ZWRTb3VyY2VbXSA9IFtdO1xuICBmb3IgKGNvbnN0IHJlZiBvZiBzb3VyY2VzKSB7XG4gICAgaWYgKHByb3ZpZGVySWQgPT09IFwiYW50aHJvcGljXCIgfHwgKHByb3ZpZGVySWQgPT09IFwiZ2VtaW5pXCIgJiYgcmVmLm1pbWVfdHlwZSA9PT0gXCJhcHBsaWNhdGlvbi9wZGZcIikpIHtcbiAgICAgIGNvbnN0IGJ1ZmZlciA9IGF3YWl0IHJlYWRWYXVsdEJpbmFyeVNvdXJjZShhcHAsIHJlZi52YXVsdF9wYXRoKTtcbiAgICAgIHJlc29sdmVkLnB1c2goeyByZWYsIGJhc2U2NERhdGE6IGFycmF5QnVmZmVyVG9CYXNlNjQoYnVmZmVyKSB9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBjb25zdCB0ZXh0ID0gYXdhaXQgcmVhZFZhdWx0VGV4dFNvdXJjZShhcHAsIHJlZi52YXVsdF9wYXRoKTtcbiAgICByZXNvbHZlZC5wdXNoKHsgcmVmLCB0ZXh0Q29udGVudDogdGV4dCB9KTtcbiAgfVxuICByZXR1cm4gcmVzb2x2ZWQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0cnVuY2F0ZVNvdXJjZVRleHQodGV4dDogc3RyaW5nLCBtYXhDaGFycyA9IDQwMDApOiBzdHJpbmcge1xuICByZXR1cm4gdGV4dC5sZW5ndGggPD0gbWF4Q2hhcnMgPyB0ZXh0IDogdGV4dC5zbGljZSgwLCBtYXhDaGFycyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXNjcmliZVNvdXJjZVJlZihyZWY6IFNvdXJjZVJlZik6IHN0cmluZyB7XG4gIHJldHVybiByZWYudmF1bHRfcGF0aDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGxpc3RWYXVsdENhbmRpZGF0ZUZpbGVzKGFwcDogQXBwKTogVEZpbGVbXSB7XG4gIHJldHVybiBhcHAudmF1bHRcbiAgICAuZ2V0RmlsZXMoKVxuICAgIC5maWx0ZXIoKGZpbGUpID0+IFtcInBkZlwiLCBcInR4dFwiLCBcIm1kXCIsIFwibWFya2Rvd25cIl0uaW5jbHVkZXMoZmlsZS5leHRlbnNpb24udG9Mb3dlckNhc2UoKSkpXG4gICAgLnNvcnQoKGEsIGIpID0+IGEucGF0aC5sb2NhbGVDb21wYXJlKGIucGF0aCkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNURmlsZShmaWxlOiBUQWJzdHJhY3RGaWxlIHwgbnVsbCk6IGZpbGUgaXMgVEZpbGUge1xuICByZXR1cm4gQm9vbGVhbihmaWxlKSAmJiBmaWxlIGluc3RhbmNlb2YgVEZpbGU7XG59XG4iLCAiaW1wb3J0IHsgcmVxdWVzdFVybCwgUmVxdWVzdFVybFJlc3BvbnNlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQge1xuICBHZW5lcmF0aW9uUmVxdWVzdCxcbiAgR2VuZXJhdGlvblJlc3BvbnNlLFxuICBPcGVuQUlQcm92aWRlckNvbmZpZyxcbiAgVXBsb2FkZWRGaWxlSW5mb1xufSBmcm9tIFwiLi4vdHlwZXNcIjtcbmltcG9ydCB7IHRydW5jYXRlU291cmNlVGV4dCB9IGZyb20gXCIuLi9zb3VyY2VVdGlsc1wiO1xuaW1wb3J0IHsgQUlQcm92aWRlciB9IGZyb20gXCIuL2Jhc2VcIjtcblxuZXhwb3J0IGNsYXNzIE9wZW5BSVByb3ZpZGVyIGltcGxlbWVudHMgQUlQcm92aWRlciB7XG4gIHJlYWRvbmx5IGlkID0gXCJvcGVuYWlcIjtcbiAgcmVhZG9ubHkgbmFtZSA9IFwiT3BlbkFJXCI7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBjb25maWc6IE9wZW5BSVByb3ZpZGVyQ29uZmlnKSB7fVxuXG4gIGFzeW5jIGdlbmVyYXRlKHJlcXVlc3Q6IEdlbmVyYXRpb25SZXF1ZXN0KTogUHJvbWlzZTxHZW5lcmF0aW9uUmVzcG9uc2U+IHtcbiAgICB0aGlzLmVuc3VyZUNvbmZpZ3VyZWQoKTtcbiAgICBjb25zdCBiYXNlVXJsID0gdGhpcy5jb25maWcuYmFzZVVybC5yZXBsYWNlKC9cXC8kLywgXCJcIik7XG4gICAgY29uc3QgbW9kZWwgPSByZXF1ZXN0Lm1vZGVsIHx8IHRoaXMuY29uZmlnLmRlZmF1bHRNb2RlbDtcbiAgICBjb25zdCBzb3VyY2VCbG9ja3MgPSAocmVxdWVzdC5yZXNvbHZlZFNvdXJjZXMgPz8gW10pXG4gICAgICAuZmlsdGVyKChzb3VyY2UpID0+IHNvdXJjZS50ZXh0Q29udGVudClcbiAgICAgIC5tYXAoKHNvdXJjZSkgPT4gYFtTT1VSQ0U6ICR7c291cmNlLnJlZi5sYWJlbH1dXFxuJHt0cnVuY2F0ZVNvdXJjZVRleHQoc291cmNlLnRleHRDb250ZW50ID8/IFwiXCIpfVxcbltFTkQgU09VUkNFXWApO1xuXG4gICAgY29uc3QgYm9keTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7XG4gICAgICBtb2RlbCxcbiAgICAgIG1heF90b2tlbnM6IHJlcXVlc3QubWF4T3V0cHV0VG9rZW5zLFxuICAgICAgbWVzc2FnZXM6IFtcbiAgICAgICAgeyByb2xlOiBcInN5c3RlbVwiLCBjb250ZW50OiByZXF1ZXN0LnN5c3RlbVByb21wdCB9LFxuICAgICAgICB7XG4gICAgICAgICAgcm9sZTogXCJ1c2VyXCIsXG4gICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0eXBlOiBcInRleHRcIixcbiAgICAgICAgICAgICAgdGV4dDogc291cmNlQmxvY2tzLmxlbmd0aFxuICAgICAgICAgICAgICAgID8gYCR7c291cmNlQmxvY2tzLmpvaW4oXCJcXG5cXG5cIil9XFxuXFxuJHtyZXF1ZXN0LnVzZXJNZXNzYWdlfWBcbiAgICAgICAgICAgICAgICA6IHJlcXVlc3QudXNlck1lc3NhZ2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9O1xuXG4gICAgaWYgKCFtb2RlbC5zdGFydHNXaXRoKFwiZ3B0LTVcIikpIHtcbiAgICAgIGJvZHkudGVtcGVyYXR1cmUgPSByZXF1ZXN0LnRlbXBlcmF0dXJlO1xuICAgIH1cblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICB1cmw6IGAke2Jhc2VVcmx9L2NoYXQvY29tcGxldGlvbnNgLFxuICAgICAgbWV0aG9kOiBcIlBPU1RcIixcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgIEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHt0aGlzLmNvbmZpZy5hcGlLZXl9YFxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KGJvZHkpLFxuICAgICAgdGhyb3c6IGZhbHNlXG4gICAgfSk7XG5cbiAgICBpZiAocmVzcG9uc2Uuc3RhdHVzIDwgMjAwIHx8IHJlc3BvbnNlLnN0YXR1cyA+PSAzMDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcih0aGlzLmV4dHJhY3RFcnJvcihyZXNwb25zZSkpO1xuICAgIH1cblxuICAgIGNvbnN0IGRhdGEgPSByZXNwb25zZS5qc29uO1xuICAgIGNvbnN0IHRleHQgPSBkYXRhLmNob2ljZXM/LlswXT8ubWVzc2FnZT8uY29udGVudD8udHJpbT8uKCkgPz8gXCJcIjtcbiAgICBpZiAoIXRleHQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlByb3ZpZGVyIHJldHVybmVkIGFuIGVtcHR5IHJlc3BvbnNlLlwiKTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgdGV4dCxcbiAgICAgIGlucHV0VG9rZW5zOiBkYXRhLnVzYWdlPy5wcm9tcHRfdG9rZW5zLFxuICAgICAgb3V0cHV0VG9rZW5zOiBkYXRhLnVzYWdlPy5jb21wbGV0aW9uX3Rva2Vuc1xuICAgIH07XG4gIH1cblxuICBhc3luYyB1cGxvYWRTb3VyY2UoKTogUHJvbWlzZTxVcGxvYWRlZEZpbGVJbmZvPiB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiVGhpcyBwcm92aWRlciBkb2VzIG5vdCBzdXBwb3J0IGZpbGUgdXBsb2FkLiBVc2UgdmF1bHRfcGF0aCBpbnN0ZWFkLlwiKTtcbiAgfVxuXG4gIGFzeW5jIGxpc3RTb3VyY2VzKCk6IFByb21pc2U8VXBsb2FkZWRGaWxlSW5mb1tdPiB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgYXN5bmMgZGVsZXRlU291cmNlKCk6IFByb21pc2U8dm9pZD4ge31cblxuICBhc3luYyB2YWxpZGF0ZSgpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBpZiAoIXRoaXMuY29uZmlnLmFwaUtleS50cmltKCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICAgIHVybDogYCR7dGhpcy5jb25maWcuYmFzZVVybC5yZXBsYWNlKC9cXC8kLywgXCJcIil9L21vZGVsc2AsXG4gICAgICAgIGhlYWRlcnM6IHsgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke3RoaXMuY29uZmlnLmFwaUtleX1gIH0sXG4gICAgICAgIHRocm93OiBmYWxzZVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVzcG9uc2Uuc3RhdHVzID49IDIwMCAmJiByZXNwb25zZS5zdGF0dXMgPCAzMDA7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBlbnN1cmVDb25maWd1cmVkKCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5jb25maWcuYXBpS2V5LnRyaW0oKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm8gT3BlbkFJIEFQSSBrZXkgc2V0LiBDaGVjayBwbHVnaW4gc2V0dGluZ3MuXCIpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZXh0cmFjdEVycm9yKHJlc3BvbnNlOiBSZXF1ZXN0VXJsUmVzcG9uc2UpOiBzdHJpbmcge1xuICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQwMSB8fCByZXNwb25zZS5zdGF0dXMgPT09IDQwMykge1xuICAgICAgcmV0dXJuIFwiT3BlbkFJIEFQSSBrZXkgcmVqZWN0ZWQuIENoZWNrIHNldHRpbmdzLlwiO1xuICAgIH1cbiAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0MjkpIHtcbiAgICAgIHJldHVybiBcIk9wZW5BSSByYXRlIGxpbWl0IHJlYWNoZWQuIFdhaXQgYSBtb21lbnQgYW5kIHJldHJ5LlwiO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmpzb247XG4gICAgICByZXR1cm4gZGF0YT8uZXJyb3I/Lm1lc3NhZ2UgPz8gYE9wZW5BSSByZXF1ZXN0IGZhaWxlZCAoJHtyZXNwb25zZS5zdGF0dXN9KS5gO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIGBPcGVuQUkgcmVxdWVzdCBmYWlsZWQgKCR7cmVzcG9uc2Uuc3RhdHVzfSkuYDtcbiAgICB9XG4gIH1cbn1cbiIsICJpbXBvcnQgeyBQcm92aWRlcklELCBTeWJ5bFNldHRpbmdzIH0gZnJvbSBcIi4uL3R5cGVzXCI7XG5pbXBvcnQgeyBBSVByb3ZpZGVyIH0gZnJvbSBcIi4vYmFzZVwiO1xuaW1wb3J0IHsgQW50aHJvcGljUHJvdmlkZXIgfSBmcm9tIFwiLi9hbnRocm9waWNcIjtcbmltcG9ydCB7IEdlbWluaVByb3ZpZGVyIH0gZnJvbSBcIi4vZ2VtaW5pXCI7XG5pbXBvcnQgeyBPbGxhbWFQcm92aWRlciB9IGZyb20gXCIuL29sbGFtYVwiO1xuaW1wb3J0IHsgT3BlbkFJUHJvdmlkZXIgfSBmcm9tIFwiLi9vcGVuYWlcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldFByb3ZpZGVyKHNldHRpbmdzOiBTeWJ5bFNldHRpbmdzLCBvdmVycmlkZUlkPzogUHJvdmlkZXJJRCk6IEFJUHJvdmlkZXIge1xuICBjb25zdCBpZCA9IG92ZXJyaWRlSWQgPz8gc2V0dGluZ3MuYWN0aXZlUHJvdmlkZXI7XG4gIHN3aXRjaCAoaWQpIHtcbiAgICBjYXNlIFwiZ2VtaW5pXCI6XG4gICAgICByZXR1cm4gbmV3IEdlbWluaVByb3ZpZGVyKHNldHRpbmdzLnByb3ZpZGVycy5nZW1pbmkpO1xuICAgIGNhc2UgXCJvcGVuYWlcIjpcbiAgICAgIHJldHVybiBuZXcgT3BlbkFJUHJvdmlkZXIoc2V0dGluZ3MucHJvdmlkZXJzLm9wZW5haSk7XG4gICAgY2FzZSBcImFudGhyb3BpY1wiOlxuICAgICAgcmV0dXJuIG5ldyBBbnRocm9waWNQcm92aWRlcihzZXR0aW5ncy5wcm92aWRlcnMuYW50aHJvcGljKTtcbiAgICBjYXNlIFwib2xsYW1hXCI6XG4gICAgICByZXR1cm4gbmV3IE9sbGFtYVByb3ZpZGVyKHNldHRpbmdzLnByb3ZpZGVycy5vbGxhbWEpO1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gcHJvdmlkZXI6ICR7aWR9YCk7XG4gIH1cbn1cbiIsICJpbXBvcnQgeyBOb3RpY2UsIFRGaWxlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgdHlwZSBTeWJ5bFBsdWdpbiBmcm9tIFwiLi9tYWluXCI7XG5pbXBvcnQgeyBnZXRTZWxlY3Rpb24sIGluc2VydEJlbG93U2VsZWN0aW9uIH0gZnJvbSBcIi4vZWRpdG9yXCI7XG5pbXBvcnQgeyByZW1vdmVTb3VyY2VSZWYsIHVwc2VydFNvdXJjZVJlZiwgd3JpdGVGcm9udE1hdHRlcktleSB9IGZyb20gXCIuL2Zyb250bWF0dGVyXCI7XG5pbXBvcnQge1xuICBmb3JtYXRBc2tPcmFjbGUsXG4gIGZvcm1hdERlY2xhcmVBY3Rpb24sXG4gIGZvcm1hdEV4cGFuZFNjZW5lLFxuICBmb3JtYXRJbnRlcnByZXRPcmFjbGUsXG4gIGZvcm1hdFN0YXJ0U2NlbmUsXG4gIGZvcm1hdFN1Z2dlc3RDb25zZXF1ZW5jZSxcbiAgTG9uZWxvZ0Zvcm1hdE9wdGlvbnNcbn0gZnJvbSBcIi4vbG9uZWxvZy9mb3JtYXR0ZXJcIjtcbmltcG9ydCB7IHBhcnNlTG9uZWxvZ0NvbnRleHQsIHNlcmlhbGl6ZUNvbnRleHQgfSBmcm9tIFwiLi9sb25lbG9nL3BhcnNlclwiO1xuaW1wb3J0IHsgTWFuYWdlU291cmNlc01vZGFsLCBvcGVuSW5wdXRNb2RhbCwgcGlja1ZhdWx0RmlsZSB9IGZyb20gXCIuL21vZGFsc1wiO1xuaW1wb3J0IHsgcmVzb2x2ZVNvdXJjZXNGb3JSZXF1ZXN0IH0gZnJvbSBcIi4vc291cmNlVXRpbHNcIjtcbmltcG9ydCB7IE5vdGVGcm9udE1hdHRlciwgU291cmNlUmVmLCBTeWJ5bFNldHRpbmdzIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuZnVuY3Rpb24gaXNMb25lbG9nQWN0aXZlKHNldHRpbmdzOiBTeWJ5bFNldHRpbmdzLCBmbTogTm90ZUZyb250TWF0dGVyKTogYm9vbGVhbiB7XG4gIHJldHVybiBmbS5sb25lbG9nID8/IHNldHRpbmdzLmxvbmVsb2dNb2RlO1xufVxuXG5mdW5jdGlvbiBsb25lbG9nT3B0cyhzZXR0aW5nczogU3lieWxTZXR0aW5ncyk6IExvbmVsb2dGb3JtYXRPcHRpb25zIHtcbiAgcmV0dXJuIHsgd3JhcEluQ29kZUJsb2NrOiBzZXR0aW5ncy5sb25lbG9nV3JhcENvZGVCbG9jayA/PyB0cnVlIH07XG59XG5cbmZ1bmN0aW9uIGdlbmVyaWNCbG9ja3F1b3RlKGxhYmVsOiBzdHJpbmcsIHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBgPiBbJHtsYWJlbH1dICR7dGV4dC50cmltKCkucmVwbGFjZSgvXFxuL2csIFwiXFxuPiBcIil9YDtcbn1cblxuZnVuY3Rpb24gaW5mZXJNaW1lVHlwZShmaWxlOiBURmlsZSB8IEZpbGUpOiBzdHJpbmcge1xuICBjb25zdCBuYW1lID0gXCJwYXRoXCIgaW4gZmlsZSA/IGZpbGUucGF0aCA6IGZpbGUubmFtZTtcbiAgcmV0dXJuIG5hbWUudG9Mb3dlckNhc2UoKS5lbmRzV2l0aChcIi5wZGZcIikgPyBcImFwcGxpY2F0aW9uL3BkZlwiIDogXCJ0ZXh0L3BsYWluXCI7XG59XG5cbmZ1bmN0aW9uIHRvZGF5SXNvRGF0ZSgpOiBzdHJpbmcge1xuICByZXR1cm4gbmV3IERhdGUoKS50b0lTT1N0cmluZygpLnNsaWNlKDAsIDEwKTtcbn1cblxuZnVuY3Rpb24gcGFyc2VMb25lbG9nT3JhY2xlUmVzcG9uc2UodGV4dDogc3RyaW5nKTogeyByZXN1bHQ6IHN0cmluZzsgaW50ZXJwcmV0YXRpb246IHN0cmluZyB9IHtcbiAgY29uc3QgbGluZXMgPSB0ZXh0XG4gICAgLnJlcGxhY2UoL14+XFxzKi9nbSwgXCJcIilcbiAgICAuc3BsaXQoXCJcXG5cIilcbiAgICAubWFwKChsaW5lKSA9PiBsaW5lLnRyaW0oKSlcbiAgICAuZmlsdGVyKEJvb2xlYW4pO1xuICBjb25zdCByZXN1bHQgPSBsaW5lcy5maW5kKChsaW5lKSA9PiBsaW5lLnN0YXJ0c1dpdGgoXCItPlwiKSk/LnJlcGxhY2UoL14tPlxccyovLCBcIlwiKSA/PyBcIlVuY2xlYXJcIjtcbiAgY29uc3QgaW50ZXJwcmV0YXRpb24gPSBsaW5lcy5maWx0ZXIoKGxpbmUpID0+ICFsaW5lLnN0YXJ0c1dpdGgoXCItPlwiKSkuam9pbihcIlxcblwiKTtcbiAgcmV0dXJuIHsgcmVzdWx0LCBpbnRlcnByZXRhdGlvbiB9O1xufVxuXG5hc3luYyBmdW5jdGlvbiBhZGRTb3VyY2VUb05vdGUocGx1Z2luOiBTeWJ5bFBsdWdpbiwgZmlsZTogVEZpbGUpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgdmF1bHRGaWxlID0gYXdhaXQgcGlja1ZhdWx0RmlsZShwbHVnaW4uYXBwLCBcIkNob29zZSBhIHZhdWx0IGZpbGVcIik7XG4gIGlmICghdmF1bHRGaWxlKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHJlZjogU291cmNlUmVmID0ge1xuICAgIGxhYmVsOiB2YXVsdEZpbGUuYmFzZW5hbWUsXG4gICAgbWltZV90eXBlOiBpbmZlck1pbWVUeXBlKHZhdWx0RmlsZSksXG4gICAgdmF1bHRfcGF0aDogdmF1bHRGaWxlLnBhdGhcbiAgfTtcbiAgYXdhaXQgdXBzZXJ0U291cmNlUmVmKHBsdWdpbi5hcHAsIGZpbGUsIHJlZik7XG4gIG5ldyBOb3RpY2UoYFNvdXJjZSBhZGRlZDogJHt2YXVsdEZpbGUucGF0aH1gKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gbWFuYWdlU291cmNlcyhwbHVnaW46IFN5YnlsUGx1Z2luKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IGNvbnRleHQgPSBhd2FpdCBwbHVnaW4uZ2V0QWN0aXZlTm90ZUNvbnRleHQoKTtcbiAgaWYgKCFjb250ZXh0Py52aWV3LmZpbGUpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgbmV3IE1hbmFnZVNvdXJjZXNNb2RhbChcbiAgICBwbHVnaW4uYXBwLFxuICAgIGNvbnRleHQuZm0uc291cmNlcyA/PyBbXSxcbiAgICBhc3luYyAocmVmKSA9PiByZW1vdmVTb3VyY2VSZWYocGx1Z2luLmFwcCwgY29udGV4dC52aWV3LmZpbGUhLCByZWYpXG4gICkub3BlbigpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBydW5HZW5lcmF0aW9uKFxuICBwbHVnaW46IFN5YnlsUGx1Z2luLFxuICB1c2VyTWVzc2FnZTogc3RyaW5nLFxuICBmb3JtYXR0ZXI6ICh0ZXh0OiBzdHJpbmcsIGZtOiBOb3RlRnJvbnRNYXR0ZXIpID0+IHN0cmluZyxcbiAgbWF4T3V0cHV0VG9rZW5zID0gNTEyLFxuICBwbGFjZW1lbnQ/OiBcImN1cnNvclwiIHwgXCJlbmQtb2Ytbm90ZVwiIHwgXCJiZWxvdy1zZWxlY3Rpb25cIlxuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IGNvbnRleHQgPSBhd2FpdCBwbHVnaW4uZ2V0QWN0aXZlTm90ZUNvbnRleHQoKTtcbiAgaWYgKCFjb250ZXh0KSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHBsdWdpbi5yZXF1ZXN0R2VuZXJhdGlvbihjb250ZXh0LmZtLCBjb250ZXh0Lm5vdGVCb2R5LCB1c2VyTWVzc2FnZSwgbWF4T3V0cHV0VG9rZW5zKTtcbiAgICBjb25zdCBmb3JtYXR0ZWQgPSBmb3JtYXR0ZXIocmVzcG9uc2UudGV4dCwgY29udGV4dC5mbSk7XG4gICAgaWYgKHBsYWNlbWVudCA9PT0gXCJiZWxvdy1zZWxlY3Rpb25cIikge1xuICAgICAgaW5zZXJ0QmVsb3dTZWxlY3Rpb24oY29udGV4dC52aWV3LmVkaXRvciwgZm9ybWF0dGVkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGx1Z2luLmluc2VydFRleHQoY29udGV4dC52aWV3LCBmb3JtYXR0ZWQsIHBsYWNlbWVudCk7XG4gICAgfVxuICAgIHBsdWdpbi5tYXliZUluc2VydFRva2VuQ29tbWVudChjb250ZXh0LnZpZXcsIHJlc3BvbnNlKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBuZXcgTm90aWNlKGBTeWJ5bCBlcnJvcjogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XG4gICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyQWxsQ29tbWFuZHMocGx1Z2luOiBTeWJ5bFBsdWdpbik6IHZvaWQge1xuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6aW5zZXJ0LWZyb250bWF0dGVyXCIsXG4gICAgbmFtZTogXCJJbnNlcnQgTm90ZSBGcm9udG1hdHRlclwiLFxuICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjb250ZXh0ID0gYXdhaXQgcGx1Z2luLmdldEFjdGl2ZU5vdGVDb250ZXh0KCk7XG4gICAgICBpZiAoIWNvbnRleHQ/LnZpZXcuZmlsZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCB2YWx1ZXMgPSBhd2FpdCBvcGVuSW5wdXRNb2RhbChwbHVnaW4uYXBwLCBcIkluc2VydCBTeWJ5bCBGcm9udG1hdHRlclwiLCBbXG4gICAgICAgIHsga2V5OiBcInJ1bGVzZXRcIiwgbGFiZWw6IFwiR2FtZSAvIHJ1bGVzZXRcIiwgcGxhY2Vob2xkZXI6IFwiSXJvbnN3b3JuXCIgfSxcbiAgICAgICAgeyBrZXk6IFwicGNzXCIsIGxhYmVsOiBcIlBDXCIsIG9wdGlvbmFsOiB0cnVlLCBwbGFjZWhvbGRlcjogXCJLaXJhIFZvc3MsIGRhbmdlcm91cyByYW5rLCB2b3c6IHJlY292ZXIgdGhlIHJlbGljXCIgfSxcbiAgICAgICAgeyBrZXk6IFwidG9uZVwiLCBsYWJlbDogXCJUb25lXCIsIG9wdGlvbmFsOiB0cnVlLCBwbGFjZWhvbGRlcjogXCJHcml0dHksIGhvcGVmdWxcIiB9LFxuICAgICAgICB7IGtleTogXCJsYW5ndWFnZVwiLCBsYWJlbDogXCJMYW5ndWFnZVwiLCBvcHRpb25hbDogdHJ1ZSwgcGxhY2Vob2xkZXI6IFwiTGVhdmUgYmxhbmsgZm9yIGF1dG8tZGV0ZWN0XCIgfVxuICAgICAgXSk7XG4gICAgICBpZiAoIXZhbHVlcykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAoIXZhbHVlcy5ydWxlc2V0KSB7XG4gICAgICAgIG5ldyBOb3RpY2UoXCJSdWxlc2V0IGlzIHJlcXVpcmVkLlwiKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgYXdhaXQgcGx1Z2luLmFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoY29udGV4dC52aWV3LmZpbGUsIChmbSkgPT4ge1xuICAgICAgICBmbVtcInJ1bGVzZXRcIl0gPSB2YWx1ZXMucnVsZXNldDtcbiAgICAgICAgZm1bXCJwcm92aWRlclwiXSA9IGZtW1wicHJvdmlkZXJcIl0gPz8gcGx1Z2luLnNldHRpbmdzLmFjdGl2ZVByb3ZpZGVyO1xuICAgICAgICBmbVtcIm9yYWNsZV9tb2RlXCJdID0gZm1bXCJvcmFjbGVfbW9kZVwiXSA/PyBcInllcy1ub1wiO1xuICAgICAgICBmbVtcImxvbmVsb2dcIl0gPSBmbVtcImxvbmVsb2dcIl0gPz8gcGx1Z2luLnNldHRpbmdzLmxvbmVsb2dNb2RlO1xuICAgICAgICBmbVtcInNjZW5lX2NvdW50ZXJcIl0gPSBmbVtcInNjZW5lX2NvdW50ZXJcIl0gPz8gMTtcbiAgICAgICAgZm1bXCJzZXNzaW9uX251bWJlclwiXSA9IGZtW1wic2Vzc2lvbl9udW1iZXJcIl0gPz8gMTtcbiAgICAgICAgZm1bXCJnYW1lX2NvbnRleHRcIl0gPSBmbVtcImdhbWVfY29udGV4dFwiXSA/PyBcIlwiO1xuICAgICAgICBmbVtcInNjZW5lX2NvbnRleHRcIl0gPSBmbVtcInNjZW5lX2NvbnRleHRcIl0gPz8gXCJcIjtcbiAgICAgICAgaWYgKHZhbHVlcy5wY3MpIGZtW1wicGNzXCJdID0gdmFsdWVzLnBjcztcbiAgICAgICAgaWYgKHZhbHVlcy50b25lKSBmbVtcInRvbmVcIl0gPSB2YWx1ZXMudG9uZTtcbiAgICAgICAgaWYgKHZhbHVlcy5sYW5ndWFnZSkgZm1bXCJsYW5ndWFnZVwiXSA9IHZhbHVlcy5sYW5ndWFnZTtcbiAgICAgIH0pO1xuICAgICAgbmV3IE5vdGljZShcIlN5YnlsIGZyb250bWF0dGVyIGluc2VydGVkLlwiKTtcbiAgICB9XG4gIH0pO1xuXG4gIHBsdWdpbi5hZGRDb21tYW5kKHtcbiAgICBpZDogXCJzeWJ5bDpkaWdlc3Qtc291cmNlXCIsXG4gICAgbmFtZTogXCJEaWdlc3QgU291cmNlIGludG8gR2FtZSBDb250ZXh0XCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGNvbnRleHQgPSBhd2FpdCBwbHVnaW4uZ2V0QWN0aXZlTm90ZUNvbnRleHQoKTtcbiAgICAgIGlmICghY29udGV4dD8udmlldy5maWxlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHZhdWx0RmlsZSA9IGF3YWl0IHBpY2tWYXVsdEZpbGUocGx1Z2luLmFwcCwgXCJDaG9vc2UgYSBzb3VyY2UgZmlsZSB0byBkaWdlc3RcIik7XG4gICAgICBpZiAoIXZhdWx0RmlsZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCByZWY6IFNvdXJjZVJlZiA9IHtcbiAgICAgICAgbGFiZWw6IHZhdWx0RmlsZS5iYXNlbmFtZSxcbiAgICAgICAgbWltZV90eXBlOiBpbmZlck1pbWVUeXBlKHZhdWx0RmlsZSksXG4gICAgICAgIHZhdWx0X3BhdGg6IHZhdWx0RmlsZS5wYXRoXG4gICAgICB9O1xuICAgICAgY29uc3QgcHJvdmlkZXJJZCA9IGNvbnRleHQuZm0ucHJvdmlkZXIgPz8gcGx1Z2luLnNldHRpbmdzLmFjdGl2ZVByb3ZpZGVyO1xuICAgICAgbGV0IHJlc29sdmVkU291cmNlcztcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc29sdmVkU291cmNlcyA9IGF3YWl0IHJlc29sdmVTb3VyY2VzRm9yUmVxdWVzdChwbHVnaW4uYXBwLCBbcmVmXSwgcHJvdmlkZXJJZCk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBuZXcgTm90aWNlKGBDYW5ub3QgcmVhZCBzb3VyY2U6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCBydWxlc2V0ID0gY29udGV4dC5mbS5ydWxlc2V0ID8/IFwidGhlIGdhbWVcIjtcbiAgICAgIGNvbnN0IGRpZ2VzdFByb21wdCA9IGBEaXN0aWxsIHRoZSBmb2xsb3dpbmcgc291cmNlIG1hdGVyaWFsIGZvciB1c2UgaW4gYSBzb2xvIHRhYmxldG9wIFJQRyBzZXNzaW9uIG9mIFwiJHtydWxlc2V0fVwiLlxuXG5FeHRyYWN0IGFuZCBjb25kZW5zZSBpbnRvIGEgY29tcGFjdCByZWZlcmVuY2U6XG4tIENvcmUgcnVsZXMgYW5kIG1lY2hhbmljcyByZWxldmFudCB0byBwbGF5XG4tIEtleSBmYWN0aW9ucywgbG9jYXRpb25zLCBjaGFyYWN0ZXJzLCBhbmQgd29ybGQgZmFjdHNcbi0gVG9uZSwgZ2VucmUsIGFuZCBzZXR0aW5nIGNvbnZlbnRpb25zXG4tIEFueSB0YWJsZXMsIG1vdmUgbGlzdHMsIG9yIHJhbmRvbSBnZW5lcmF0b3JzXG5cbkJlIGNvbmNpc2UgYW5kIHNwZWNpZmljLiBQcmVzZXJ2ZSBnYW1lLW1lY2hhbmljYWwgZGV0YWlscy4gT21pdCBmbGF2b3IgcHJvc2UgYW5kIGV4YW1wbGVzLmA7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHBsdWdpbi5yZXF1ZXN0UmF3R2VuZXJhdGlvbihcbiAgICAgICAgICBjb250ZXh0LmZtLFxuICAgICAgICAgIGRpZ2VzdFByb21wdCxcbiAgICAgICAgICAyMDAwLFxuICAgICAgICAgIHJlc29sdmVkU291cmNlc1xuICAgICAgICApO1xuICAgICAgICBhd2FpdCBwbHVnaW4uYXBwLmZpbGVNYW5hZ2VyLnByb2Nlc3NGcm9udE1hdHRlcihjb250ZXh0LnZpZXcuZmlsZSwgKGZtKSA9PiB7XG4gICAgICAgICAgZm1bXCJnYW1lX2NvbnRleHRcIl0gPSByZXNwb25zZS50ZXh0O1xuICAgICAgICB9KTtcbiAgICAgICAgbmV3IE5vdGljZShcIkdhbWUgY29udGV4dCB1cGRhdGVkLlwiKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoYFN5YnlsIGVycm9yOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIHBsdWdpbi5hZGRDb21tYW5kKHtcbiAgICBpZDogXCJzeWJ5bDpzdGFydC1zY2VuZVwiLFxuICAgIG5hbWU6IFwiU3RhcnQgU2NlbmVcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY29udGV4dCA9IGF3YWl0IHBsdWdpbi5nZXRBY3RpdmVOb3RlQ29udGV4dCgpO1xuICAgICAgaWYgKCFjb250ZXh0Py52aWV3LmZpbGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKGlzTG9uZWxvZ0FjdGl2ZShwbHVnaW4uc2V0dGluZ3MsIGNvbnRleHQuZm0pKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlcyA9IGF3YWl0IG9wZW5JbnB1dE1vZGFsKHBsdWdpbi5hcHAsIFwiU3RhcnQgU2NlbmVcIiwgW1xuICAgICAgICAgIHsga2V5OiBcInNjZW5lRGVzY1wiLCBsYWJlbDogXCJTY2VuZSBkZXNjcmlwdGlvblwiLCBwbGFjZWhvbGRlcjogXCJEYXJrIGFsbGV5LCBtaWRuaWdodFwiIH1cbiAgICAgICAgXSk7XG4gICAgICAgIGlmICghdmFsdWVzPy5zY2VuZURlc2MpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY291bnRlciA9IGNvbnRleHQuZm0uc2NlbmVfY291bnRlciA/PyAxO1xuICAgICAgICBhd2FpdCBydW5HZW5lcmF0aW9uKFxuICAgICAgICAgIHBsdWdpbixcbiAgICAgICAgICBgU1RBUlQgU0NFTkUuIEdlbmVyYXRlIG9ubHk6IDItMyBsaW5lcyBvZiB0aGlyZC1wZXJzb24gcGFzdC10ZW5zZSBwcm9zZSBkZXNjcmliaW5nIHRoZSBhdG1vc3BoZXJlIGFuZCBzZXR0aW5nIG9mOiBcIiR7dmFsdWVzLnNjZW5lRGVzY31cIi4gTm8gZGlhbG9ndWUuIE5vIFBDIGFjdGlvbnMuIE5vIGFkZGl0aW9uYWwgY29tbWVudGFyeS5gLFxuICAgICAgICAgICh0ZXh0KSA9PiBmb3JtYXRTdGFydFNjZW5lKHRleHQsIGBTJHtjb3VudGVyfWAsIHZhbHVlcy5zY2VuZURlc2MsIGxvbmVsb2dPcHRzKHBsdWdpbi5zZXR0aW5ncykpXG4gICAgICAgICk7XG4gICAgICAgIGlmIChwbHVnaW4uc2V0dGluZ3MubG9uZWxvZ0F1dG9JbmNTY2VuZSkge1xuICAgICAgICAgIGF3YWl0IHdyaXRlRnJvbnRNYXR0ZXJLZXkocGx1Z2luLmFwcCwgY29udGV4dC52aWV3LmZpbGUsIFwic2NlbmVfY291bnRlclwiLCBjb3VudGVyICsgMSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgYXdhaXQgcnVuR2VuZXJhdGlvbihcbiAgICAgICAgcGx1Z2luLFxuICAgICAgICBcIlNUQVJUIFNDRU5FLiBHZW5lcmF0ZSBvbmx5OiAyLTMgbGluZXMgb2YgdGhpcmQtcGVyc29uIHBhc3QtdGVuc2UgcHJvc2UgZGVzY3JpYmluZyB0aGUgc2V0dGluZyBhbmQgYXRtb3NwaGVyZS4gTm8gZGlhbG9ndWUuIE5vIFBDIGFjdGlvbnMuIE5vIGFkZGl0aW9uYWwgY29tbWVudGFyeS5cIixcbiAgICAgICAgKHRleHQpID0+IGdlbmVyaWNCbG9ja3F1b3RlKFwiU2NlbmVcIiwgdGV4dClcbiAgICAgICk7XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6ZGVjbGFyZS1hY3Rpb25cIixcbiAgICBuYW1lOiBcIkRlY2xhcmUgQWN0aW9uXCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlcyA9IGF3YWl0IG9wZW5JbnB1dE1vZGFsKHBsdWdpbi5hcHAsIFwiRGVjbGFyZSBBY3Rpb25cIiwgW1xuICAgICAgICB7IGtleTogXCJhY3Rpb25cIiwgbGFiZWw6IFwiQWN0aW9uXCIgfSxcbiAgICAgICAgeyBrZXk6IFwicm9sbFwiLCBsYWJlbDogXCJSb2xsIHJlc3VsdFwiIH1cbiAgICAgIF0pO1xuICAgICAgaWYgKCF2YWx1ZXM/LmFjdGlvbiB8fCAhdmFsdWVzLnJvbGwpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgYXdhaXQgcnVuR2VuZXJhdGlvbihcbiAgICAgICAgcGx1Z2luLFxuICAgICAgICBgUEMgYWN0aW9uOiAke3ZhbHVlcy5hY3Rpb259XFxuUm9sbCByZXN1bHQ6ICR7dmFsdWVzLnJvbGx9XFxuRGVzY3JpYmUgb25seSB0aGUgY29uc2VxdWVuY2VzIGFuZCB3b3JsZCByZWFjdGlvbi4gRG8gbm90IGRlc2NyaWJlIHRoZSBQQydzIGFjdGlvbi5gLFxuICAgICAgICAodGV4dCwgZm0pID0+XG4gICAgICAgICAgaXNMb25lbG9nQWN0aXZlKHBsdWdpbi5zZXR0aW5ncywgZm0pXG4gICAgICAgICAgICA/IGZvcm1hdERlY2xhcmVBY3Rpb24odmFsdWVzLmFjdGlvbiwgdmFsdWVzLnJvbGwsIHRleHQsIGxvbmVsb2dPcHRzKHBsdWdpbi5zZXR0aW5ncykpXG4gICAgICAgICAgICA6IGA+IFtBY3Rpb25dICR7dmFsdWVzLmFjdGlvbn0gfCBSb2xsOiAke3ZhbHVlcy5yb2xsfVxcbj4gW1Jlc3VsdF0gJHt0ZXh0LnRyaW0oKS5yZXBsYWNlKC9cXG4vZywgXCJcXG4+IFwiKX1gXG4gICAgICApO1xuICAgIH1cbiAgfSk7XG5cbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOmFzay1vcmFjbGVcIixcbiAgICBuYW1lOiBcIkFzayBPcmFjbGVcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY29udGV4dCA9IGF3YWl0IHBsdWdpbi5nZXRBY3RpdmVOb3RlQ29udGV4dCgpO1xuICAgICAgaWYgKCFjb250ZXh0KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHZhbHVlcyA9IGF3YWl0IG9wZW5JbnB1dE1vZGFsKHBsdWdpbi5hcHAsIFwiQXNrIE9yYWNsZVwiLCBbXG4gICAgICAgIHsga2V5OiBcInF1ZXN0aW9uXCIsIGxhYmVsOiBcIlF1ZXN0aW9uXCIgfSxcbiAgICAgICAgeyBrZXk6IFwicmVzdWx0XCIsIGxhYmVsOiBcIk9yYWNsZSByZXN1bHRcIiwgb3B0aW9uYWw6IHRydWUgfVxuICAgICAgXSk7XG4gICAgICBpZiAoIXZhbHVlcz8ucXVlc3Rpb24pIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgaGFzUmVzdWx0ID0gQm9vbGVhbih2YWx1ZXMucmVzdWx0Py50cmltKCkpO1xuICAgICAgY29uc3QgbWVzc2FnZSA9IGhhc1Jlc3VsdFxuICAgICAgICA/IGBPcmFjbGUgcXVlc3Rpb246ICR7dmFsdWVzLnF1ZXN0aW9ufVxcbk9yYWNsZSByZXN1bHQ6ICR7dmFsdWVzLnJlc3VsdH1cXG5JbnRlcnByZXQgdGhpcyByZXN1bHQgaW4gdGhlIGNvbnRleHQgb2YgdGhlIHNjZW5lLiBUaGlyZCBwZXJzb24sIG5ldXRyYWwsIDItMyBsaW5lcy5gXG4gICAgICAgIDogYE9yYWNsZSBxdWVzdGlvbjogJHt2YWx1ZXMucXVlc3Rpb259XFxuT3JhY2xlIG1vZGU6ICR7Y29udGV4dC5mbS5vcmFjbGVfbW9kZSA/PyBcInllcy1ub1wifVxcblJ1biB0aGUgb3JhY2xlIGFuZCBnaXZlIHRoZSByZXN1bHQgcGx1cyBhIDEtMiBsaW5lIG5ldXRyYWwgaW50ZXJwcmV0YXRpb24uYDtcbiAgICAgIGF3YWl0IHJ1bkdlbmVyYXRpb24oXG4gICAgICAgIHBsdWdpbixcbiAgICAgICAgbWVzc2FnZSxcbiAgICAgICAgKHRleHQsIGZtKSA9PiB7XG4gICAgICAgICAgaWYgKCFpc0xvbmVsb2dBY3RpdmUocGx1Z2luLnNldHRpbmdzLCBmbSkpIHtcbiAgICAgICAgICAgIHJldHVybiBgPiBbT3JhY2xlXSBROiAke3ZhbHVlcy5xdWVzdGlvbn1cXG4+IFtBbnN3ZXJdICR7dGV4dC50cmltKCkucmVwbGFjZSgvXFxuL2csIFwiXFxuPiBcIil9YDtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGhhc1Jlc3VsdCkge1xuICAgICAgICAgICAgcmV0dXJuIGZvcm1hdEFza09yYWNsZSh2YWx1ZXMucXVlc3Rpb24sIHZhbHVlcy5yZXN1bHQudHJpbSgpLCB0ZXh0LCBsb25lbG9nT3B0cyhwbHVnaW4uc2V0dGluZ3MpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgcGFyc2VkID0gcGFyc2VMb25lbG9nT3JhY2xlUmVzcG9uc2UodGV4dCk7XG4gICAgICAgICAgcmV0dXJuIGZvcm1hdEFza09yYWNsZSh2YWx1ZXMucXVlc3Rpb24sIHBhcnNlZC5yZXN1bHQsIHBhcnNlZC5pbnRlcnByZXRhdGlvbiwgbG9uZWxvZ09wdHMocGx1Z2luLnNldHRpbmdzKSk7XG4gICAgICAgIH1cbiAgICAgICk7XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6aW50ZXJwcmV0LW9yYWNsZVwiLFxuICAgIG5hbWU6IFwiSW50ZXJwcmV0IE9yYWNsZSBSb2xsXCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGNvbnRleHQgPSBhd2FpdCBwbHVnaW4uZ2V0QWN0aXZlTm90ZUNvbnRleHQoKTtcbiAgICAgIGlmICghY29udGV4dCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBsZXQgc2VsZWN0ZWQgPSBnZXRTZWxlY3Rpb24oY29udGV4dC52aWV3LmVkaXRvcik7XG4gICAgICBpZiAoIXNlbGVjdGVkKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlcyA9IGF3YWl0IG9wZW5JbnB1dE1vZGFsKHBsdWdpbi5hcHAsIFwiSW50ZXJwcmV0IE9yYWNsZSBSZXN1bHRcIiwgW1xuICAgICAgICAgIHsga2V5OiBcIm9yYWNsZVwiLCBsYWJlbDogXCJPcmFjbGUgcmVzdWx0XCIgfVxuICAgICAgICBdKTtcbiAgICAgICAgc2VsZWN0ZWQgPSB2YWx1ZXM/Lm9yYWNsZT8udHJpbSgpID8/IFwiXCI7XG4gICAgICB9XG4gICAgICBpZiAoIXNlbGVjdGVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGF3YWl0IHJ1bkdlbmVyYXRpb24oXG4gICAgICAgIHBsdWdpbixcbiAgICAgICAgYEludGVycHJldCB0aGlzIG9yYWNsZSByZXN1bHQgaW4gdGhlIGNvbnRleHQgb2YgdGhlIGN1cnJlbnQgc2NlbmU6IFwiJHtzZWxlY3RlZH1cIlxcbk5ldXRyYWwsIHRoaXJkLXBlcnNvbiwgMi0zIGxpbmVzLiBObyBkcmFtYXRpYyBsYW5ndWFnZS5gLFxuICAgICAgICAodGV4dCwgZm0pID0+XG4gICAgICAgICAgaXNMb25lbG9nQWN0aXZlKHBsdWdpbi5zZXR0aW5ncywgZm0pXG4gICAgICAgICAgICA/IGZvcm1hdEludGVycHJldE9yYWNsZShzZWxlY3RlZCwgdGV4dCwgbG9uZWxvZ09wdHMocGx1Z2luLnNldHRpbmdzKSlcbiAgICAgICAgICAgIDogZ2VuZXJpY0Jsb2NrcXVvdGUoXCJJbnRlcnByZXRhdGlvblwiLCB0ZXh0KSxcbiAgICAgICAgNTEyLFxuICAgICAgICBcImJlbG93LXNlbGVjdGlvblwiXG4gICAgICApO1xuICAgIH1cbiAgfSk7XG5cbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOnN1Z2dlc3QtY29uc2VxdWVuY2VcIixcbiAgICBuYW1lOiBcIldoYXQgTm93XCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGF3YWl0IHJ1bkdlbmVyYXRpb24oXG4gICAgICAgIHBsdWdpbixcbiAgICAgICAgXCJCYXNlZCBvbiB0aGUgY3VycmVudCBzY2VuZSBjb250ZXh0LCBzdWdnZXN0IDEtMiBwb3NzaWJsZSBjb25zZXF1ZW5jZXMgb3IgY29tcGxpY2F0aW9ucy4gUHJlc2VudCB0aGVtIGFzIG5ldXRyYWwgb3B0aW9ucywgbm90IGFzIG5hcnJhdGl2ZSBvdXRjb21lcy4gRG8gbm90IGNob29zZSBiZXR3ZWVuIHRoZW0uXCIsXG4gICAgICAgICh0ZXh0LCBmbSkgPT5cbiAgICAgICAgICBpc0xvbmVsb2dBY3RpdmUocGx1Z2luLnNldHRpbmdzLCBmbSlcbiAgICAgICAgICAgID8gZm9ybWF0U3VnZ2VzdENvbnNlcXVlbmNlKHRleHQsIGxvbmVsb2dPcHRzKHBsdWdpbi5zZXR0aW5ncykpXG4gICAgICAgICAgICA6IGdlbmVyaWNCbG9ja3F1b3RlKFwiT3B0aW9uc1wiLCB0ZXh0KVxuICAgICAgKTtcbiAgICB9XG4gIH0pO1xuXG4gIHBsdWdpbi5hZGRDb21tYW5kKHtcbiAgICBpZDogXCJzeWJ5bDp3aGF0LWNhbi1pLWRvXCIsXG4gICAgbmFtZTogXCJXaGF0IENhbiBJIERvXCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGF3YWl0IHJ1bkdlbmVyYXRpb24oXG4gICAgICAgIHBsdWdpbixcbiAgICAgICAgXCJUaGUgcGxheWVyIGlzIHN0dWNrLiBCYXNlZCBvbiB0aGUgY3VycmVudCBzY2VuZSBjb250ZXh0LCBzdWdnZXN0IGV4YWN0bHkgMyBjb25jcmV0ZSBhY3Rpb25zIHRoZSBQQyBjb3VsZCB0YWtlIG5leHQuIFByZXNlbnQgdGhlbSBhcyBuZXV0cmFsIG9wdGlvbnMgbnVtYmVyZWQgMVx1MjAxMzMuIERvIG5vdCByZXNvbHZlIG9yIG5hcnJhdGUgYW55IG91dGNvbWUuIERvIG5vdCByZWNvbW1lbmQgb25lIG92ZXIgYW5vdGhlci5cIixcbiAgICAgICAgKHRleHQsIGZtKSA9PlxuICAgICAgICAgIGlzTG9uZWxvZ0FjdGl2ZShwbHVnaW4uc2V0dGluZ3MsIGZtKVxuICAgICAgICAgICAgPyBmb3JtYXRTdWdnZXN0Q29uc2VxdWVuY2UodGV4dCwgbG9uZWxvZ09wdHMocGx1Z2luLnNldHRpbmdzKSlcbiAgICAgICAgICAgIDogZ2VuZXJpY0Jsb2NrcXVvdGUoXCJBY3Rpb25zXCIsIHRleHQpXG4gICAgICApO1xuICAgIH1cbiAgfSk7XG5cbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOmV4cGFuZC1zY2VuZVwiLFxuICAgIG5hbWU6IFwiRXhwYW5kIFNjZW5lXCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGF3YWl0IHJ1bkdlbmVyYXRpb24oXG4gICAgICAgIHBsdWdpbixcbiAgICAgICAgXCJFeHBhbmQgdGhlIGN1cnJlbnQgc2NlbmUgaW50byBhIHByb3NlIHBhc3NhZ2UuIFRoaXJkIHBlcnNvbiwgcGFzdCB0ZW5zZSwgMTAwLTE1MCB3b3Jkcy4gTm8gZGlhbG9ndWUuIERvIG5vdCBkZXNjcmliZSB0aGUgUEMncyBpbnRlcm5hbCB0aG91Z2h0cyBvciBkZWNpc2lvbnMuIFN0YXkgc3RyaWN0bHkgd2l0aGluIHRoZSBlc3RhYmxpc2hlZCBzY2VuZSBjb250ZXh0LlwiLFxuICAgICAgICAodGV4dCwgZm0pID0+XG4gICAgICAgICAgaXNMb25lbG9nQWN0aXZlKHBsdWdpbi5zZXR0aW5ncywgZm0pXG4gICAgICAgICAgICA/IGZvcm1hdEV4cGFuZFNjZW5lKHRleHQsIGxvbmVsb2dPcHRzKHBsdWdpbi5zZXR0aW5ncykpXG4gICAgICAgICAgICA6IGAtLS1cXG4+IFtQcm9zZV0gJHt0ZXh0LnRyaW0oKS5yZXBsYWNlKC9cXG4vZywgXCJcXG4+IFwiKX1cXG4tLS1gLFxuICAgICAgICAzMDBcbiAgICAgICk7XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6dXBsb2FkLXNvdXJjZVwiLFxuICAgIG5hbWU6IFwiQWRkIFNvdXJjZSBGaWxlXCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGNvbnRleHQgPSBhd2FpdCBwbHVnaW4uZ2V0QWN0aXZlTm90ZUNvbnRleHQoKTtcbiAgICAgIGlmICghY29udGV4dD8udmlldy5maWxlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGFkZFNvdXJjZVRvTm90ZShwbHVnaW4sIGNvbnRleHQudmlldy5maWxlKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoYFN5YnlsIGVycm9yOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIHBsdWdpbi5hZGRDb21tYW5kKHtcbiAgICBpZDogXCJzeWJ5bDptYW5hZ2Utc291cmNlc1wiLFxuICAgIG5hbWU6IFwiTWFuYWdlIFNvdXJjZXNcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgYXdhaXQgbWFuYWdlU291cmNlcyhwbHVnaW4pO1xuICAgIH1cbiAgfSk7XG5cbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOmxvbmVsb2ctcGFyc2UtY29udGV4dFwiLFxuICAgIG5hbWU6IFwiVXBkYXRlIFNjZW5lIENvbnRleHRcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY29udGV4dCA9IGF3YWl0IHBsdWdpbi5nZXRBY3RpdmVOb3RlQ29udGV4dCgpO1xuICAgICAgaWYgKCFjb250ZXh0Py52aWV3LmZpbGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKCFpc0xvbmVsb2dBY3RpdmUocGx1Z2luLnNldHRpbmdzLCBjb250ZXh0LmZtKSkge1xuICAgICAgICBuZXcgTm90aWNlKFwiTG9uZWxvZyBtb2RlIGlzIG5vdCBlbmFibGVkIGZvciB0aGlzIG5vdGUuXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCBwYXJzZWQgPSBwYXJzZUxvbmVsb2dDb250ZXh0KGNvbnRleHQubm90ZUJvZHksIHBsdWdpbi5zZXR0aW5ncy5sb25lbG9nQ29udGV4dERlcHRoKTtcbiAgICAgIGF3YWl0IHdyaXRlRnJvbnRNYXR0ZXJLZXkocGx1Z2luLmFwcCwgY29udGV4dC52aWV3LmZpbGUsIFwic2NlbmVfY29udGV4dFwiLCBzZXJpYWxpemVDb250ZXh0KHBhcnNlZCkpO1xuICAgICAgbmV3IE5vdGljZShcIlNjZW5lIGNvbnRleHQgdXBkYXRlZCBmcm9tIGxvZy5cIik7XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6bG9uZWxvZy1zZXNzaW9uLWJyZWFrXCIsXG4gICAgbmFtZTogXCJOZXcgU2Vzc2lvbiBIZWFkZXJcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY29udGV4dCA9IGF3YWl0IHBsdWdpbi5nZXRBY3RpdmVOb3RlQ29udGV4dCgpO1xuICAgICAgaWYgKCFjb250ZXh0Py52aWV3LmZpbGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKCFpc0xvbmVsb2dBY3RpdmUocGx1Z2luLnNldHRpbmdzLCBjb250ZXh0LmZtKSkge1xuICAgICAgICBuZXcgTm90aWNlKFwiTG9uZWxvZyBtb2RlIGlzIG5vdCBlbmFibGVkIGZvciB0aGlzIG5vdGUuXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCB2YWx1ZXMgPSBhd2FpdCBvcGVuSW5wdXRNb2RhbChwbHVnaW4uYXBwLCBcIk5ldyBTZXNzaW9uIEhlYWRlclwiLCBbXG4gICAgICAgIHsga2V5OiBcImRhdGVcIiwgbGFiZWw6IFwiRGF0ZVwiLCB2YWx1ZTogdG9kYXlJc29EYXRlKCkgfSxcbiAgICAgICAgeyBrZXk6IFwiZHVyYXRpb25cIiwgbGFiZWw6IFwiRHVyYXRpb25cIiwgcGxhY2Vob2xkZXI6IFwiMWgzMFwiIH0sXG4gICAgICAgIHsga2V5OiBcInJlY2FwXCIsIGxhYmVsOiBcIlJlY2FwXCIsIG9wdGlvbmFsOiB0cnVlIH1cbiAgICAgIF0pO1xuICAgICAgaWYgKCF2YWx1ZXM/LmRhdGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3Qgc2Vzc2lvbk51bWJlciA9IGNvbnRleHQuZm0uc2Vzc2lvbl9udW1iZXIgPz8gMTtcbiAgICAgIGNvbnN0IGJsb2NrID0gYCMjIFNlc3Npb24gJHtzZXNzaW9uTnVtYmVyfVxcbipEYXRlOiAke3ZhbHVlcy5kYXRlfSB8IER1cmF0aW9uOiAke3ZhbHVlcy5kdXJhdGlvbiB8fCBcIi1cIn0qXFxuXFxuJHt2YWx1ZXMucmVjYXAgPyBgKipSZWNhcDoqKiAke3ZhbHVlcy5yZWNhcH1cXG5cXG5gIDogXCJcIn1gO1xuICAgICAgcGx1Z2luLmluc2VydFRleHQoY29udGV4dC52aWV3LCBibG9jaywgXCJjdXJzb3JcIik7XG4gICAgICBhd2FpdCB3cml0ZUZyb250TWF0dGVyS2V5KHBsdWdpbi5hcHAsIGNvbnRleHQudmlldy5maWxlLCBcInNlc3Npb25fbnVtYmVyXCIsIHNlc3Npb25OdW1iZXIgKyAxKTtcbiAgICB9XG4gIH0pO1xufVxuIiwgImV4cG9ydCBpbnRlcmZhY2UgTG9uZWxvZ0Zvcm1hdE9wdGlvbnMge1xuICB3cmFwSW5Db2RlQmxvY2s6IGJvb2xlYW47XG4gIHNjZW5lSWQ/OiBzdHJpbmc7XG59XG5cbmZ1bmN0aW9uIGZlbmNlKGNvbnRlbnQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBgXFxgXFxgXFxgXFxuJHtjb250ZW50fVxcblxcYFxcYFxcYGA7XG59XG5cbmZ1bmN0aW9uIGNsZWFuQWlUZXh0KHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiB0ZXh0LnJlcGxhY2UoL14+XFxzKi9nbSwgXCJcIikudHJpbSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0U3RhcnRTY2VuZShcbiAgYWlUZXh0OiBzdHJpbmcsXG4gIHNjZW5lSWQ6IHN0cmluZyxcbiAgc2NlbmVEZXNjOiBzdHJpbmcsXG4gIF9vcHRzOiBMb25lbG9nRm9ybWF0T3B0aW9uc1xuKTogc3RyaW5nIHtcbiAgY29uc3QgaGVhZGVyID0gYCMjIyAke3NjZW5lSWR9ICoke3NjZW5lRGVzY30qYDtcbiAgY29uc3QgYm9keSA9IGNsZWFuQWlUZXh0KGFpVGV4dCk7XG4gIHJldHVybiBgJHtoZWFkZXJ9XFxuXFxuJHtib2R5fWA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXREZWNsYXJlQWN0aW9uKFxuICBhY3Rpb246IHN0cmluZyxcbiAgcm9sbDogc3RyaW5nLFxuICBhaUNvbnNlcXVlbmNlOiBzdHJpbmcsXG4gIG9wdHM6IExvbmVsb2dGb3JtYXRPcHRpb25zXG4pOiBzdHJpbmcge1xuICBjb25zdCBjb25zZXF1ZW5jZSA9IGNsZWFuQWlUZXh0KGFpQ29uc2VxdWVuY2UpXG4gICAgLnNwbGl0KFwiXFxuXCIpXG4gICAgLmZpbHRlcihCb29sZWFuKVxuICAgIC5tYXAoKGxpbmUpID0+IChsaW5lLnN0YXJ0c1dpdGgoXCI9PlwiKSA/IGxpbmUgOiBgPT4gJHtsaW5lfWApKVxuICAgIC5qb2luKFwiXFxuXCIpO1xuICBjb25zdCBub3RhdGlvbiA9IGBAICR7YWN0aW9ufVxcbmQ6ICR7cm9sbH1cXG4ke2NvbnNlcXVlbmNlfWA7XG4gIHJldHVybiBvcHRzLndyYXBJbkNvZGVCbG9jayA/IGZlbmNlKG5vdGF0aW9uKSA6IG5vdGF0aW9uO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0QXNrT3JhY2xlKFxuICBxdWVzdGlvbjogc3RyaW5nLFxuICBvcmFjbGVSZXN1bHQ6IHN0cmluZyxcbiAgYWlJbnRlcnByZXRhdGlvbjogc3RyaW5nLFxuICBvcHRzOiBMb25lbG9nRm9ybWF0T3B0aW9uc1xuKTogc3RyaW5nIHtcbiAgY29uc3QgaW50ZXJwcmV0YXRpb24gPSBjbGVhbkFpVGV4dChhaUludGVycHJldGF0aW9uKVxuICAgIC5zcGxpdChcIlxcblwiKVxuICAgIC5maWx0ZXIoQm9vbGVhbilcbiAgICAubWFwKChsaW5lKSA9PiAobGluZS5zdGFydHNXaXRoKFwiPT5cIikgPyBsaW5lIDogYD0+ICR7bGluZX1gKSlcbiAgICAuam9pbihcIlxcblwiKTtcbiAgY29uc3Qgbm90YXRpb24gPSBgPyAke3F1ZXN0aW9ufVxcbi0+ICR7b3JhY2xlUmVzdWx0fVxcbiR7aW50ZXJwcmV0YXRpb259YDtcbiAgcmV0dXJuIG9wdHMud3JhcEluQ29kZUJsb2NrID8gZmVuY2Uobm90YXRpb24pIDogbm90YXRpb247XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRJbnRlcnByZXRPcmFjbGUoXG4gIG9yYWNsZVRleHQ6IHN0cmluZyxcbiAgYWlJbnRlcnByZXRhdGlvbjogc3RyaW5nLFxuICBvcHRzOiBMb25lbG9nRm9ybWF0T3B0aW9uc1xuKTogc3RyaW5nIHtcbiAgY29uc3QgaW50ZXJwcmV0YXRpb24gPSBjbGVhbkFpVGV4dChhaUludGVycHJldGF0aW9uKVxuICAgIC5zcGxpdChcIlxcblwiKVxuICAgIC5maWx0ZXIoQm9vbGVhbilcbiAgICAubWFwKChsaW5lKSA9PiAobGluZS5zdGFydHNXaXRoKFwiPT5cIikgPyBsaW5lIDogYD0+ICR7bGluZX1gKSlcbiAgICAuam9pbihcIlxcblwiKTtcbiAgY29uc3Qgbm90YXRpb24gPSBgLT4gJHtvcmFjbGVUZXh0fVxcbiR7aW50ZXJwcmV0YXRpb259YDtcbiAgcmV0dXJuIG9wdHMud3JhcEluQ29kZUJsb2NrID8gZmVuY2Uobm90YXRpb24pIDogbm90YXRpb247XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRTdWdnZXN0Q29uc2VxdWVuY2UoYWlPcHRpb25zOiBzdHJpbmcsIG9wdHM6IExvbmVsb2dGb3JtYXRPcHRpb25zKTogc3RyaW5nIHtcbiAgY29uc3Qgb3B0aW9ucyA9IGNsZWFuQWlUZXh0KGFpT3B0aW9ucylcbiAgICAuc3BsaXQoXCJcXG5cIilcbiAgICAuZmlsdGVyKChsaW5lKSA9PiBsaW5lLnRyaW0oKS5sZW5ndGggPiAwKVxuICAgIC5tYXAoKGxpbmUpID0+IChsaW5lLnN0YXJ0c1dpdGgoXCI9PlwiKSA/IGxpbmUgOiBgPT4gJHtsaW5lfWApKVxuICAgIC5qb2luKFwiXFxuXCIpO1xuICByZXR1cm4gb3B0cy53cmFwSW5Db2RlQmxvY2sgPyBmZW5jZShvcHRpb25zKSA6IG9wdGlvbnM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRFeHBhbmRTY2VuZShhaVByb3NlOiBzdHJpbmcsIF9vcHRzOiBMb25lbG9nRm9ybWF0T3B0aW9ucyk6IHN0cmluZyB7XG4gIHJldHVybiBgXFxcXC0tLVxcbiR7Y2xlYW5BaVRleHQoYWlQcm9zZSl9XFxuLS0tXFxcXGA7XG59XG4iLCAiaW1wb3J0IHsgQXBwLCBNb2RhbCwgTm90aWNlLCBTZXR0aW5nLCBURmlsZSB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHsgZGVzY3JpYmVTb3VyY2VSZWYsIGxpc3RWYXVsdENhbmRpZGF0ZUZpbGVzIH0gZnJvbSBcIi4vc291cmNlVXRpbHNcIjtcbmltcG9ydCB7IE1vZGFsRmllbGQsIFNvdXJjZVJlZiB9IGZyb20gXCIuL3R5cGVzXCI7XG5cbmV4cG9ydCBjbGFzcyBJbnB1dE1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICBwcml2YXRlIHJlYWRvbmx5IHZhbHVlczogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBhcHA6IEFwcCxcbiAgICBwcml2YXRlIHJlYWRvbmx5IHRpdGxlOiBzdHJpbmcsXG4gICAgcHJpdmF0ZSByZWFkb25seSBmaWVsZHM6IE1vZGFsRmllbGRbXSxcbiAgICBwcml2YXRlIHJlYWRvbmx5IG9uU3VibWl0OiAodmFsdWVzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KSA9PiB2b2lkXG4gICkge1xuICAgIHN1cGVyKGFwcCk7XG4gICAgdGhpcy52YWx1ZXMgPSBmaWVsZHMucmVkdWNlPFJlY29yZDxzdHJpbmcsIHN0cmluZz4+KChhY2MsIGZpZWxkKSA9PiB7XG4gICAgICBhY2NbZmllbGQua2V5XSA9IGZpZWxkLnZhbHVlID8/IFwiXCI7XG4gICAgICByZXR1cm4gYWNjO1xuICAgIH0sIHt9KTtcbiAgfVxuXG4gIG9uT3BlbigpOiB2b2lkIHtcbiAgICB0aGlzLnRpdGxlRWwuc2V0VGV4dCh0aGlzLnRpdGxlKTtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIGZvciAoY29uc3QgZmllbGQgb2YgdGhpcy5maWVsZHMpIHtcbiAgICAgIG5ldyBTZXR0aW5nKHRoaXMuY29udGVudEVsKVxuICAgICAgICAuc2V0TmFtZShmaWVsZC5sYWJlbClcbiAgICAgICAgLnNldERlc2MoZmllbGQub3B0aW9uYWwgPyBcIk9wdGlvbmFsXCIgOiBcIlwiKVxuICAgICAgICAuYWRkVGV4dCgodGV4dCkgPT4ge1xuICAgICAgICAgIHRleHQuc2V0UGxhY2Vob2xkZXIoZmllbGQucGxhY2Vob2xkZXIgPz8gXCJcIik7XG4gICAgICAgICAgdGV4dC5zZXRWYWx1ZSh0aGlzLnZhbHVlc1tmaWVsZC5rZXldID8/IFwiXCIpO1xuICAgICAgICAgIHRleHQub25DaGFuZ2UoKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnZhbHVlc1tmaWVsZC5rZXldID0gdmFsdWU7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBuZXcgU2V0dGluZyh0aGlzLmNvbnRlbnRFbCkuYWRkQnV0dG9uKChidXR0b24pID0+IHtcbiAgICAgIGJ1dHRvbi5zZXRCdXR0b25UZXh0KFwiQ29uZmlybVwiKS5zZXRDdGEoKS5vbkNsaWNrKCgpID0+IHtcbiAgICAgICAgdGhpcy5vblN1Ym1pdCh0aGlzLnZhbHVlcyk7XG4gICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgb25DbG9zZSgpOiB2b2lkIHtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvcGVuSW5wdXRNb2RhbChcbiAgYXBwOiBBcHAsXG4gIHRpdGxlOiBzdHJpbmcsXG4gIGZpZWxkczogTW9kYWxGaWVsZFtdXG4pOiBQcm9taXNlPFJlY29yZDxzdHJpbmcsIHN0cmluZz4gfCBudWxsPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIGxldCBzZXR0bGVkID0gZmFsc2U7XG4gICAgY29uc3QgbW9kYWwgPSBuZXcgSW5wdXRNb2RhbChhcHAsIHRpdGxlLCBmaWVsZHMsICh2YWx1ZXMpID0+IHtcbiAgICAgIHNldHRsZWQgPSB0cnVlO1xuICAgICAgcmVzb2x2ZSh2YWx1ZXMpO1xuICAgIH0pO1xuICAgIGNvbnN0IG9yaWdpbmFsQ2xvc2UgPSBtb2RhbC5vbkNsb3NlLmJpbmQobW9kYWwpO1xuICAgIG1vZGFsLm9uQ2xvc2UgPSAoKSA9PiB7XG4gICAgICBvcmlnaW5hbENsb3NlKCk7XG4gICAgICBpZiAoIXNldHRsZWQpIHtcbiAgICAgICAgcmVzb2x2ZShudWxsKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIG1vZGFsLm9wZW4oKTtcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwaWNrTG9jYWxGaWxlKCk6IFByb21pc2U8RmlsZSB8IG51bGw+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgY29uc3QgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIik7XG4gICAgaW5wdXQudHlwZSA9IFwiZmlsZVwiO1xuICAgIGlucHV0LmFjY2VwdCA9IFwiLnBkZiwudHh0LC5tZCwubWFya2Rvd25cIjtcbiAgICBpbnB1dC5vbmNoYW5nZSA9ICgpID0+IHJlc29sdmUoaW5wdXQuZmlsZXM/LlswXSA/PyBudWxsKTtcbiAgICBpbnB1dC5jbGljaygpO1xuICB9KTtcbn1cblxuZXhwb3J0IGNsYXNzIFZhdWx0RmlsZVBpY2tlck1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICBwcml2YXRlIHJlYWRvbmx5IGZpbGVzOiBURmlsZVtdO1xuXG4gIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwcml2YXRlIHJlYWRvbmx5IHRpdGxlOiBzdHJpbmcsIHByaXZhdGUgcmVhZG9ubHkgb25QaWNrOiAoZmlsZTogVEZpbGUpID0+IHZvaWQpIHtcbiAgICBzdXBlcihhcHApO1xuICAgIHRoaXMuZmlsZXMgPSBsaXN0VmF1bHRDYW5kaWRhdGVGaWxlcyhhcHApO1xuICB9XG5cbiAgb25PcGVuKCk6IHZvaWQge1xuICAgIHRoaXMudGl0bGVFbC5zZXRUZXh0KHRoaXMudGl0bGUpO1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gICAgaWYgKCF0aGlzLmZpbGVzLmxlbmd0aCkge1xuICAgICAgdGhpcy5jb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogXCJObyBQREYgb3IgdGV4dCBmaWxlcyBmb3VuZCBpbiB0aGUgdmF1bHQuXCIgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuZmlsZXMuZm9yRWFjaCgoZmlsZSkgPT4ge1xuICAgICAgbmV3IFNldHRpbmcodGhpcy5jb250ZW50RWwpXG4gICAgICAgIC5zZXROYW1lKGZpbGUucGF0aClcbiAgICAgICAgLnNldERlc2MoZmlsZS5leHRlbnNpb24udG9Mb3dlckNhc2UoKSlcbiAgICAgICAgLmFkZEJ1dHRvbigoYnV0dG9uKSA9PiB7XG4gICAgICAgICAgYnV0dG9uLnNldEJ1dHRvblRleHQoXCJTZWxlY3RcIikuc2V0Q3RhKCkub25DbGljaygoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLm9uUGljayhmaWxlKTtcbiAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBvbkNsb3NlKCk6IHZvaWQge1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBpY2tWYXVsdEZpbGUoYXBwOiBBcHAsIHRpdGxlOiBzdHJpbmcpOiBQcm9taXNlPFRGaWxlIHwgbnVsbD4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICBsZXQgc2V0dGxlZCA9IGZhbHNlO1xuICAgIGNvbnN0IG1vZGFsID0gbmV3IFZhdWx0RmlsZVBpY2tlck1vZGFsKGFwcCwgdGl0bGUsIChmaWxlKSA9PiB7XG4gICAgICBzZXR0bGVkID0gdHJ1ZTtcbiAgICAgIHJlc29sdmUoZmlsZSk7XG4gICAgfSk7XG4gICAgY29uc3Qgb3JpZ2luYWxDbG9zZSA9IG1vZGFsLm9uQ2xvc2UuYmluZChtb2RhbCk7XG4gICAgbW9kYWwub25DbG9zZSA9ICgpID0+IHtcbiAgICAgIG9yaWdpbmFsQ2xvc2UoKTtcbiAgICAgIGlmICghc2V0dGxlZCkge1xuICAgICAgICByZXNvbHZlKG51bGwpO1xuICAgICAgfVxuICAgIH07XG4gICAgbW9kYWwub3BlbigpO1xuICB9KTtcbn1cblxuZXhwb3J0IGNsYXNzIE1hbmFnZVNvdXJjZXNNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgY29uc3RydWN0b3IoXG4gICAgYXBwOiBBcHAsXG4gICAgcHJpdmF0ZSByZWFkb25seSBzb3VyY2VzOiBTb3VyY2VSZWZbXSxcbiAgICBwcml2YXRlIHJlYWRvbmx5IG9uUmVtb3ZlOiAocmVmOiBTb3VyY2VSZWYpID0+IFByb21pc2U8dm9pZD5cbiAgKSB7XG4gICAgc3VwZXIoYXBwKTtcbiAgfVxuXG4gIG9uT3BlbigpOiB2b2lkIHtcbiAgICB0aGlzLnRpdGxlRWwuc2V0VGV4dChcIk1hbmFnZSBTb3VyY2VzXCIpO1xuICAgIHRoaXMucmVuZGVyKCk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlcigpOiB2b2lkIHtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIGlmICghdGhpcy5zb3VyY2VzLmxlbmd0aCkge1xuICAgICAgdGhpcy5jb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogXCJObyBzb3VyY2VzIGFyZSBhdHRhY2hlZCB0byB0aGlzIG5vdGUuXCIgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuc291cmNlcy5mb3JFYWNoKChzb3VyY2UpID0+IHtcbiAgICAgIG5ldyBTZXR0aW5nKHRoaXMuY29udGVudEVsKVxuICAgICAgICAuc2V0TmFtZShzb3VyY2UubGFiZWwpXG4gICAgICAgIC5zZXREZXNjKGAke3NvdXJjZS5taW1lX3R5cGV9IHwgJHtkZXNjcmliZVNvdXJjZVJlZihzb3VyY2UpfWApXG4gICAgICAgIC5hZGRCdXR0b24oKGJ1dHRvbikgPT4ge1xuICAgICAgICAgIGJ1dHRvbi5zZXRCdXR0b25UZXh0KFwiUmVtb3ZlXCIpLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5vblJlbW92ZShzb3VyY2UpO1xuICAgICAgICAgICAgbmV3IE5vdGljZShgUmVtb3ZlZCAnJHtzb3VyY2UubGFiZWx9Jy5gKTtcbiAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBvbkNsb3NlKCk6IHZvaWQge1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gIH1cbn1cblxuIiwgImltcG9ydCB7IEFwcCwgTm90aWNlLCBQbHVnaW5TZXR0aW5nVGFiLCBTZXR0aW5nIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgdHlwZSBTeWJ5bFBsdWdpbiBmcm9tIFwiLi9tYWluXCI7XG5pbXBvcnQgeyBnZXRQcm92aWRlciB9IGZyb20gXCIuL3Byb3ZpZGVyc1wiO1xuaW1wb3J0IHsgT2xsYW1hUHJvdmlkZXIgfSBmcm9tIFwiLi9wcm92aWRlcnMvb2xsYW1hXCI7XG5pbXBvcnQgeyBQcm92aWRlcklELCBTeWJ5bFNldHRpbmdzLCBWYWxpZGF0aW9uU3RhdGUgfSBmcm9tIFwiLi90eXBlc1wiO1xuXG5leHBvcnQgY29uc3QgREVGQVVMVF9TRVRUSU5HUzogU3lieWxTZXR0aW5ncyA9IHtcbiAgYWN0aXZlUHJvdmlkZXI6IFwiZ2VtaW5pXCIsXG4gIHByb3ZpZGVyczoge1xuICAgIGdlbWluaTogeyBhcGlLZXk6IFwiXCIsIGRlZmF1bHRNb2RlbDogXCJnZW1pbmktMy4xLXByby1wcmV2aWV3XCIgfSxcbiAgICBvcGVuYWk6IHsgYXBpS2V5OiBcIlwiLCBkZWZhdWx0TW9kZWw6IFwiZ3B0LTUuMlwiLCBiYXNlVXJsOiBcImh0dHBzOi8vYXBpLm9wZW5haS5jb20vdjFcIiB9LFxuICAgIGFudGhyb3BpYzogeyBhcGlLZXk6IFwiXCIsIGRlZmF1bHRNb2RlbDogXCJjbGF1ZGUtc29ubmV0LTQtNlwiIH0sXG4gICAgb2xsYW1hOiB7IGJhc2VVcmw6IFwiaHR0cDovL2xvY2FsaG9zdDoxMTQzNFwiLCBkZWZhdWx0TW9kZWw6IFwiZ2VtbWEzXCIgfVxuICB9LFxuICBpbnNlcnRpb25Nb2RlOiBcImN1cnNvclwiLFxuICBzaG93VG9rZW5Db3VudDogZmFsc2UsXG4gIGRlZmF1bHRUZW1wZXJhdHVyZTogMC43LFxuICBsb25lbG9nTW9kZTogZmFsc2UsXG4gIGxvbmVsb2dDb250ZXh0RGVwdGg6IDYwLFxuICBsb25lbG9nV3JhcENvZGVCbG9jazogdHJ1ZSxcbiAgbG9uZWxvZ0F1dG9JbmNTY2VuZTogdHJ1ZVxufTtcblxuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZVNldHRpbmdzKHJhdzogUGFydGlhbDxTeWJ5bFNldHRpbmdzPiB8IG51bGwgfCB1bmRlZmluZWQpOiBTeWJ5bFNldHRpbmdzIHtcbiAgcmV0dXJuIHtcbiAgICAuLi5ERUZBVUxUX1NFVFRJTkdTLFxuICAgIC4uLihyYXcgPz8ge30pLFxuICAgIHByb3ZpZGVyczoge1xuICAgICAgZ2VtaW5pOiB7IC4uLkRFRkFVTFRfU0VUVElOR1MucHJvdmlkZXJzLmdlbWluaSwgLi4uKHJhdz8ucHJvdmlkZXJzPy5nZW1pbmkgPz8ge30pIH0sXG4gICAgICBvcGVuYWk6IHsgLi4uREVGQVVMVF9TRVRUSU5HUy5wcm92aWRlcnMub3BlbmFpLCAuLi4ocmF3Py5wcm92aWRlcnM/Lm9wZW5haSA/PyB7fSkgfSxcbiAgICAgIGFudGhyb3BpYzogeyAuLi5ERUZBVUxUX1NFVFRJTkdTLnByb3ZpZGVycy5hbnRocm9waWMsIC4uLihyYXc/LnByb3ZpZGVycz8uYW50aHJvcGljID8/IHt9KSB9LFxuICAgICAgb2xsYW1hOiB7IC4uLkRFRkFVTFRfU0VUVElOR1MucHJvdmlkZXJzLm9sbGFtYSwgLi4uKHJhdz8ucHJvdmlkZXJzPy5vbGxhbWEgPz8ge30pIH1cbiAgICB9XG4gIH07XG59XG5cbmNvbnN0IEdFTUlOSV9NT0RFTFMgPSBbXG4gIFwiZ2VtaW5pLTMuMS1wcm8tcHJldmlld1wiLFxuICBcImdlbWluaS0zLjEtcHJvLXByZXZpZXctY3VzdG9tdG9vbHNcIixcbiAgXCJnZW1pbmktMi41LWZsYXNoXCJcbl07XG5jb25zdCBPUEVOQUlfTU9ERUxTID0gW1wiZ3B0LTUuMlwiLCBcImdwdC00LjFcIiwgXCJncHQtNC4xLW1pbmlcIl07XG5jb25zdCBBTlRIUk9QSUNfTU9ERUxTID0gW1xuICBcImNsYXVkZS1vcHVzLTQtNlwiLFxuICBcImNsYXVkZS1zb25uZXQtNC02XCIsXG4gIFwiY2xhdWRlLWhhaWt1LTQtNS0yMDI1MTAwMVwiXG5dO1xuXG5leHBvcnQgY2xhc3MgU3lieWxTZXR0aW5nVGFiIGV4dGVuZHMgUGx1Z2luU2V0dGluZ1RhYiB7XG4gIHByaXZhdGUgdmFsaWRhdGlvbjogUGFydGlhbDxSZWNvcmQ8UHJvdmlkZXJJRCwgVmFsaWRhdGlvblN0YXRlPj4gPSB7fTtcbiAgcHJpdmF0ZSBvbGxhbWFNb2RlbHM6IHN0cmluZ1tdID0gW107XG5cbiAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHByaXZhdGUgcmVhZG9ubHkgcGx1Z2luOiBTeWJ5bFBsdWdpbikge1xuICAgIHN1cGVyKGFwcCwgcGx1Z2luKTtcbiAgfVxuXG4gIGRpc3BsYXkoKTogdm9pZCB7XG4gICAgY29uc3QgeyBjb250YWluZXJFbCB9ID0gdGhpcztcbiAgICBjb250YWluZXJFbC5lbXB0eSgpO1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwiaDJcIiwgeyB0ZXh0OiBgU3lieWwgU2V0dGluZ3MgKCR7dGhpcy5wcm92aWRlckxhYmVsKHRoaXMucGx1Z2luLnNldHRpbmdzLmFjdGl2ZVByb3ZpZGVyKX0pYCB9KTtcbiAgICB0aGlzLnJlbmRlckFjdGl2ZVByb3ZpZGVyKGNvbnRhaW5lckVsKTtcbiAgICB0aGlzLnJlbmRlclByb3ZpZGVyQ29uZmlnKGNvbnRhaW5lckVsKTtcbiAgICB0aGlzLnJlbmRlckdsb2JhbFNldHRpbmdzKGNvbnRhaW5lckVsKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyQWN0aXZlUHJvdmlkZXIoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkFjdGl2ZSBQcm92aWRlclwiKVxuICAgICAgLnNldERlc2MoXCJVc2VkIHdoZW4gYSBub3RlIGRvZXMgbm90IG92ZXJyaWRlIHByb3ZpZGVyLlwiKVxuICAgICAgLmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xuICAgICAgICBkcm9wZG93bi5hZGRPcHRpb24oXCJnZW1pbmlcIiwgXCJHZW1pbmlcIik7XG4gICAgICAgIGRyb3Bkb3duLmFkZE9wdGlvbihcIm9wZW5haVwiLCBcIk9wZW5BSVwiKTtcbiAgICAgICAgZHJvcGRvd24uYWRkT3B0aW9uKFwiYW50aHJvcGljXCIsIFwiQW50aHJvcGljIChDbGF1ZGUpXCIpO1xuICAgICAgICBkcm9wZG93bi5hZGRPcHRpb24oXCJvbGxhbWFcIiwgXCJPbGxhbWEgKGxvY2FsKVwiKTtcbiAgICAgICAgZHJvcGRvd24uc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuYWN0aXZlUHJvdmlkZXIpO1xuICAgICAgICBkcm9wZG93bi5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5hY3RpdmVQcm92aWRlciA9IHZhbHVlIGFzIFByb3ZpZGVySUQ7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgdGhpcy5kaXNwbGF5KCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlclByb3ZpZGVyQ29uZmlnKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIlByb3ZpZGVyIENvbmZpZ3VyYXRpb25cIiB9KTtcbiAgICBzd2l0Y2ggKHRoaXMucGx1Z2luLnNldHRpbmdzLmFjdGl2ZVByb3ZpZGVyKSB7XG4gICAgICBjYXNlIFwiZ2VtaW5pXCI6XG4gICAgICAgIHRoaXMucmVuZGVyR2VtaW5pU2V0dGluZ3MoY29udGFpbmVyRWwpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgXCJvcGVuYWlcIjpcbiAgICAgICAgdGhpcy5yZW5kZXJPcGVuQUlTZXR0aW5ncyhjb250YWluZXJFbCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcImFudGhyb3BpY1wiOlxuICAgICAgICB0aGlzLnJlbmRlckFudGhyb3BpY1NldHRpbmdzKGNvbnRhaW5lckVsKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwib2xsYW1hXCI6XG4gICAgICAgIHRoaXMucmVuZGVyT2xsYW1hU2V0dGluZ3MoY29udGFpbmVyRWwpO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlbmRlckdlbWluaVNldHRpbmdzKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIGNvbnN0IGNvbmZpZyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnByb3ZpZGVycy5nZW1pbmk7XG4gICAgdGhpcy5yZW5kZXJWYWxpZGF0aW9uU3RhdGUoY29udGFpbmVyRWwsIFwiZ2VtaW5pXCIpO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJBUEkgS2V5XCIpXG4gICAgICAuYWRkVGV4dCgodGV4dCkgPT4ge1xuICAgICAgICB0ZXh0LmlucHV0RWwudHlwZSA9IFwicGFzc3dvcmRcIjtcbiAgICAgICAgdGV4dC5zZXRWYWx1ZShjb25maWcuYXBpS2V5KTtcbiAgICAgICAgdGV4dC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICBjb25maWcuYXBpS2V5ID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0ZXh0LmlucHV0RWwuYWRkRXZlbnRMaXN0ZW5lcihcImJsdXJcIiwgKCkgPT4gdm9pZCB0aGlzLnZhbGlkYXRlUHJvdmlkZXIoXCJnZW1pbmlcIikpO1xuICAgICAgfSk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkRlZmF1bHQgTW9kZWxcIilcbiAgICAgIC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcbiAgICAgICAgR0VNSU5JX01PREVMUy5mb3JFYWNoKChtb2RlbCkgPT4gZHJvcGRvd24uYWRkT3B0aW9uKG1vZGVsLCBtb2RlbCkpO1xuICAgICAgICBkcm9wZG93bi5zZXRWYWx1ZShjb25maWcuZGVmYXVsdE1vZGVsKTtcbiAgICAgICAgZHJvcGRvd24ub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uZmlnLmRlZmF1bHRNb2RlbCA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJPcGVuQUlTZXR0aW5ncyhjb250YWluZXJFbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgICBjb25zdCBjb25maWcgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcm92aWRlcnMub3BlbmFpO1xuICAgIHRoaXMucmVuZGVyVmFsaWRhdGlvblN0YXRlKGNvbnRhaW5lckVsLCBcIm9wZW5haVwiKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiQVBJIEtleVwiKVxuICAgICAgLmFkZFRleHQoKHRleHQpID0+IHtcbiAgICAgICAgdGV4dC5pbnB1dEVsLnR5cGUgPSBcInBhc3N3b3JkXCI7XG4gICAgICAgIHRleHQuc2V0VmFsdWUoY29uZmlnLmFwaUtleSk7XG4gICAgICAgIHRleHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uZmlnLmFwaUtleSA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGV4dC5pbnB1dEVsLmFkZEV2ZW50TGlzdGVuZXIoXCJibHVyXCIsICgpID0+IHZvaWQgdGhpcy52YWxpZGF0ZVByb3ZpZGVyKFwib3BlbmFpXCIpKTtcbiAgICAgIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJCYXNlIFVSTFwiKVxuICAgICAgLnNldERlc2MoXCJPdmVycmlkZSBmb3IgQXp1cmUgb3IgcHJveHkgZW5kcG9pbnRzXCIpXG4gICAgICAuYWRkVGV4dCgodGV4dCkgPT4ge1xuICAgICAgICB0ZXh0LnNldFZhbHVlKGNvbmZpZy5iYXNlVXJsKTtcbiAgICAgICAgdGV4dC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICBjb25maWcuYmFzZVVybCA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGV4dC5pbnB1dEVsLmFkZEV2ZW50TGlzdGVuZXIoXCJibHVyXCIsICgpID0+IHZvaWQgdGhpcy52YWxpZGF0ZVByb3ZpZGVyKFwib3BlbmFpXCIpKTtcbiAgICAgIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJEZWZhdWx0IE1vZGVsXCIpXG4gICAgICAuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PiB7XG4gICAgICAgIE9QRU5BSV9NT0RFTFMuZm9yRWFjaCgobW9kZWwpID0+IGRyb3Bkb3duLmFkZE9wdGlvbihtb2RlbCwgbW9kZWwpKTtcbiAgICAgICAgZHJvcGRvd24uc2V0VmFsdWUoY29uZmlnLmRlZmF1bHRNb2RlbCk7XG4gICAgICAgIGRyb3Bkb3duLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGNvbmZpZy5kZWZhdWx0TW9kZWwgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcInBcIiwge1xuICAgICAgdGV4dDogXCJPcGVuQUkgc291cmNlcyB1c2UgdmF1bHRfcGF0aC4gQWRkIHNvdXJjZSBmaWxlcyB2aWEgdGhlIE1hbmFnZSBTb3VyY2VzIGNvbW1hbmQgaW4gYW55IG5vdGUuXCJcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyQW50aHJvcGljU2V0dGluZ3MoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gICAgY29uc3QgY29uZmlnID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucHJvdmlkZXJzLmFudGhyb3BpYztcbiAgICB0aGlzLnJlbmRlclZhbGlkYXRpb25TdGF0ZShjb250YWluZXJFbCwgXCJhbnRocm9waWNcIik7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkFQSSBLZXlcIilcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PiB7XG4gICAgICAgIHRleHQuaW5wdXRFbC50eXBlID0gXCJwYXNzd29yZFwiO1xuICAgICAgICB0ZXh0LnNldFZhbHVlKGNvbmZpZy5hcGlLZXkpO1xuICAgICAgICB0ZXh0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGNvbmZpZy5hcGlLZXkgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRleHQuaW5wdXRFbC5hZGRFdmVudExpc3RlbmVyKFwiYmx1clwiLCAoKSA9PiB2b2lkIHRoaXMudmFsaWRhdGVQcm92aWRlcihcImFudGhyb3BpY1wiKSk7XG4gICAgICB9KTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiRGVmYXVsdCBNb2RlbFwiKVxuICAgICAgLmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xuICAgICAgICBBTlRIUk9QSUNfTU9ERUxTLmZvckVhY2goKG1vZGVsKSA9PiBkcm9wZG93bi5hZGRPcHRpb24obW9kZWwsIG1vZGVsKSk7XG4gICAgICAgIGRyb3Bkb3duLnNldFZhbHVlKGNvbmZpZy5kZWZhdWx0TW9kZWwpO1xuICAgICAgICBkcm9wZG93bi5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICBjb25maWcuZGVmYXVsdE1vZGVsID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJwXCIsIHtcbiAgICAgIHRleHQ6IFwiUERGcyBhcmUgZW5jb2RlZCBpbmxpbmUgcGVyIHJlcXVlc3QuIFVzZSBzaG9ydCBleGNlcnB0cyB0byBhdm9pZCBoaWdoIHRva2VuIGNvc3RzLlwiXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlck9sbGFtYVNldHRpbmdzKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIGNvbnN0IGNvbmZpZyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnByb3ZpZGVycy5vbGxhbWE7XG4gICAgdGhpcy5yZW5kZXJWYWxpZGF0aW9uU3RhdGUoY29udGFpbmVyRWwsIFwib2xsYW1hXCIpO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJCYXNlIFVSTFwiKVxuICAgICAgLmFkZFRleHQoKHRleHQpID0+IHtcbiAgICAgICAgdGV4dC5zZXRWYWx1ZShjb25maWcuYmFzZVVybCk7XG4gICAgICAgIHRleHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uZmlnLmJhc2VVcmwgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRleHQuaW5wdXRFbC5hZGRFdmVudExpc3RlbmVyKFwiYmx1clwiLCAoKSA9PiB2b2lkIHRoaXMudmFsaWRhdGVPbGxhbWEoKSk7XG4gICAgICB9KTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiQXZhaWxhYmxlIE1vZGVsc1wiKVxuICAgICAgLmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xuICAgICAgICBjb25zdCBvcHRpb25zID0gdGhpcy5vbGxhbWFNb2RlbHMubGVuZ3RoID8gdGhpcy5vbGxhbWFNb2RlbHMgOiBbY29uZmlnLmRlZmF1bHRNb2RlbF07XG4gICAgICAgIG9wdGlvbnMuZm9yRWFjaCgobW9kZWwpID0+IGRyb3Bkb3duLmFkZE9wdGlvbihtb2RlbCwgbW9kZWwpKTtcbiAgICAgICAgZHJvcGRvd24uc2V0VmFsdWUob3B0aW9ucy5pbmNsdWRlcyhjb25maWcuZGVmYXVsdE1vZGVsKSA/IGNvbmZpZy5kZWZhdWx0TW9kZWwgOiBvcHRpb25zWzBdKTtcbiAgICAgICAgZHJvcGRvd24ub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uZmlnLmRlZmF1bHRNb2RlbCA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgIHRoaXMuZGlzcGxheSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJEZWZhdWx0IE1vZGVsXCIpXG4gICAgICAuYWRkVGV4dCgodGV4dCkgPT4ge1xuICAgICAgICB0ZXh0LnNldFZhbHVlKGNvbmZpZy5kZWZhdWx0TW9kZWwpO1xuICAgICAgICB0ZXh0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGNvbmZpZy5kZWZhdWx0TW9kZWwgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcInBcIiwge1xuICAgICAgdGV4dDogXCJObyBBUEkga2V5IHJlcXVpcmVkLiBPbGxhbWEgbXVzdCBiZSBydW5uaW5nIGxvY2FsbHkuIEZpbGUgZ3JvdW5kaW5nIHVzZXMgdmF1bHRfcGF0aCB0ZXh0IGV4dHJhY3Rpb24uXCJcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyR2xvYmFsU2V0dGluZ3MoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IFwiR2xvYmFsIFNldHRpbmdzXCIgfSk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkRlZmF1bHQgVGVtcGVyYXR1cmVcIilcbiAgICAgIC5zZXREZXNjKFN0cmluZyh0aGlzLnBsdWdpbi5zZXR0aW5ncy5kZWZhdWx0VGVtcGVyYXR1cmUpKVxuICAgICAgLmFkZFNsaWRlcigoc2xpZGVyKSA9PiB7XG4gICAgICAgIHNsaWRlci5zZXRMaW1pdHMoMCwgMSwgMC4wNSk7XG4gICAgICAgIHNsaWRlci5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5kZWZhdWx0VGVtcGVyYXR1cmUpO1xuICAgICAgICBzbGlkZXIub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVmYXVsdFRlbXBlcmF0dXJlID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgdGhpcy5kaXNwbGF5KCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkluc2VydGlvbiBNb2RlXCIpXG4gICAgICAuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PiB7XG4gICAgICAgIGRyb3Bkb3duLmFkZE9wdGlvbihcImN1cnNvclwiLCBcIkF0IGN1cnNvclwiKTtcbiAgICAgICAgZHJvcGRvd24uYWRkT3B0aW9uKFwiZW5kLW9mLW5vdGVcIiwgXCJFbmQgb2Ygbm90ZVwiKTtcbiAgICAgICAgZHJvcGRvd24uc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuaW5zZXJ0aW9uTW9kZSk7XG4gICAgICAgIGRyb3Bkb3duLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmluc2VydGlvbk1vZGUgPSB2YWx1ZSBhcyBcImN1cnNvclwiIHwgXCJlbmQtb2Ytbm90ZVwiO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJTaG93IFRva2VuIENvdW50XCIpXG4gICAgICAuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcbiAgICAgICAgdG9nZ2xlLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLnNob3dUb2tlbkNvdW50KTtcbiAgICAgICAgdG9nZ2xlLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnNob3dUb2tlbkNvdW50ID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkxvbmVsb2cgTW9kZVwiKVxuICAgICAgLnNldERlc2MoXCJFbmFibGUgTG9uZWxvZyBub3RhdGlvbiwgY29udGV4dCBwYXJzaW5nLCBhbmQgTG9uZWxvZy1zcGVjaWZpYyBjb21tYW5kcy5cIilcbiAgICAgIC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xuICAgICAgICB0b2dnbGUuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MubG9uZWxvZ01vZGUpO1xuICAgICAgICB0b2dnbGUub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MubG9uZWxvZ01vZGUgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICB0aGlzLmRpc3BsYXkoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICBpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MubG9uZWxvZ01vZGUpIHtcbiAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgICAuc2V0TmFtZShcIkF1dG8taW5jcmVtZW50IHNjZW5lIGNvdW50ZXJcIilcbiAgICAgICAgLmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB7XG4gICAgICAgICAgdG9nZ2xlLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmxvbmVsb2dBdXRvSW5jU2NlbmUpO1xuICAgICAgICAgIHRvZ2dsZS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmxvbmVsb2dBdXRvSW5jU2NlbmUgPSB2YWx1ZTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgICAuc2V0TmFtZShcIkNvbnRleHQgZXh0cmFjdGlvbiBkZXB0aFwiKVxuICAgICAgICAuYWRkVGV4dCgodGV4dCkgPT4ge1xuICAgICAgICAgIHRleHQuc2V0VmFsdWUoU3RyaW5nKHRoaXMucGx1Z2luLnNldHRpbmdzLmxvbmVsb2dDb250ZXh0RGVwdGgpKTtcbiAgICAgICAgICB0ZXh0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbmV4dCA9IE51bWJlcih2YWx1ZSk7XG4gICAgICAgICAgICBpZiAoIU51bWJlci5pc05hTihuZXh0KSAmJiBuZXh0ID4gMCkge1xuICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5sb25lbG9nQ29udGV4dERlcHRoID0gbmV4dDtcbiAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAgIC5zZXROYW1lKFwiV3JhcCBub3RhdGlvbiBpbiBjb2RlIGJsb2Nrc1wiKVxuICAgICAgICAuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcbiAgICAgICAgICB0b2dnbGUuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MubG9uZWxvZ1dyYXBDb2RlQmxvY2spO1xuICAgICAgICAgIHRvZ2dsZS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmxvbmVsb2dXcmFwQ29kZUJsb2NrID0gdmFsdWU7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJWYWxpZGF0aW9uU3RhdGUoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50LCBwcm92aWRlcjogUHJvdmlkZXJJRCk6IHZvaWQge1xuICAgIGNvbnN0IHN0YXRlID0gdGhpcy52YWxpZGF0aW9uW3Byb3ZpZGVyXTtcbiAgICBpZiAoIXN0YXRlIHx8IHN0YXRlLnN0YXR1cyA9PT0gXCJpZGxlXCIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJwXCIsIHtcbiAgICAgIHRleHQ6XG4gICAgICAgIHN0YXRlLnN0YXR1cyA9PT0gXCJjaGVja2luZ1wiXG4gICAgICAgICAgPyBcIlZhbGlkYXRpb246IGNoZWNraW5nLi4uXCJcbiAgICAgICAgICA6IHN0YXRlLnN0YXR1cyA9PT0gXCJ2YWxpZFwiXG4gICAgICAgICAgICA/IFwiVmFsaWRhdGlvbjogXHUyNzEzXCJcbiAgICAgICAgICAgIDogYFZhbGlkYXRpb246IFx1MjcxNyR7c3RhdGUubWVzc2FnZSA/IGAgKCR7c3RhdGUubWVzc2FnZX0pYCA6IFwiXCJ9YFxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBwcm92aWRlckxhYmVsKHByb3ZpZGVyOiBQcm92aWRlcklEKTogc3RyaW5nIHtcbiAgICBzd2l0Y2ggKHByb3ZpZGVyKSB7XG4gICAgICBjYXNlIFwiZ2VtaW5pXCI6XG4gICAgICAgIHJldHVybiBcIkdlbWluaVwiO1xuICAgICAgY2FzZSBcIm9wZW5haVwiOlxuICAgICAgICByZXR1cm4gXCJPcGVuQUlcIjtcbiAgICAgIGNhc2UgXCJhbnRocm9waWNcIjpcbiAgICAgICAgcmV0dXJuIFwiQW50aHJvcGljXCI7XG4gICAgICBjYXNlIFwib2xsYW1hXCI6XG4gICAgICAgIHJldHVybiBcIk9sbGFtYVwiO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgdmFsaWRhdGVQcm92aWRlcihwcm92aWRlcjogUHJvdmlkZXJJRCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMudmFsaWRhdGlvbltwcm92aWRlcl0gPSB7IHN0YXR1czogXCJjaGVja2luZ1wiIH07XG4gICAgdGhpcy5kaXNwbGF5KCk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHZhbGlkID0gYXdhaXQgZ2V0UHJvdmlkZXIodGhpcy5wbHVnaW4uc2V0dGluZ3MsIHByb3ZpZGVyKS52YWxpZGF0ZSgpO1xuICAgICAgdGhpcy52YWxpZGF0aW9uW3Byb3ZpZGVyXSA9IHsgc3RhdHVzOiB2YWxpZCA/IFwidmFsaWRcIiA6IFwiaW52YWxpZFwiIH07XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMudmFsaWRhdGlvbltwcm92aWRlcl0gPSB7XG4gICAgICAgIHN0YXR1czogXCJpbnZhbGlkXCIsXG4gICAgICAgIG1lc3NhZ2U6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKVxuICAgICAgfTtcbiAgICB9XG4gICAgdGhpcy5kaXNwbGF5KCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHZhbGlkYXRlT2xsYW1hKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMudmFsaWRhdGlvbi5vbGxhbWEgPSB7IHN0YXR1czogXCJjaGVja2luZ1wiIH07XG4gICAgdGhpcy5kaXNwbGF5KCk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHByb3ZpZGVyID0gbmV3IE9sbGFtYVByb3ZpZGVyKHRoaXMucGx1Z2luLnNldHRpbmdzLnByb3ZpZGVycy5vbGxhbWEpO1xuICAgICAgY29uc3QgdmFsaWQgPSBhd2FpdCBwcm92aWRlci52YWxpZGF0ZSgpO1xuICAgICAgdGhpcy52YWxpZGF0aW9uLm9sbGFtYSA9IHsgc3RhdHVzOiB2YWxpZCA/IFwidmFsaWRcIiA6IFwiaW52YWxpZFwiIH07XG4gICAgICB0aGlzLm9sbGFtYU1vZGVscyA9IHZhbGlkID8gYXdhaXQgcHJvdmlkZXIubGlzdE1vZGVscygpIDogW107XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRoaXMudmFsaWRhdGlvbi5vbGxhbWEgPSB7XG4gICAgICAgIHN0YXR1czogXCJpbnZhbGlkXCIsXG4gICAgICAgIG1lc3NhZ2U6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKVxuICAgICAgfTtcbiAgICAgIHRoaXMub2xsYW1hTW9kZWxzID0gW107XG4gICAgICBuZXcgTm90aWNlKHRoaXMudmFsaWRhdGlvbi5vbGxhbWEubWVzc2FnZSA/PyBcIk9sbGFtYSB2YWxpZGF0aW9uIGZhaWxlZC5cIik7XG4gICAgfVxuICAgIHRoaXMuZGlzcGxheSgpO1xuICB9XG59XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFBQUEsbUJBQTZDOzs7QUNFdEMsU0FBUyxlQUFlLFFBQWdCLE1BQW9CO0FBQ2pFLFFBQU0sU0FBUyxPQUFPLFVBQVU7QUFDaEMsU0FBTyxhQUFhO0FBQUEsRUFBSztBQUFBLEdBQVUsTUFBTTtBQUN6QyxTQUFPLFVBQVUsRUFBRSxNQUFNLE9BQU8sT0FBTyxLQUFLLE1BQU0sSUFBSSxFQUFFLFNBQVMsR0FBRyxJQUFJLEVBQUUsQ0FBQztBQUM3RTtBQUVPLFNBQVMsYUFBYSxRQUFnQixNQUFvQjtBQUMvRCxRQUFNLFdBQVcsT0FBTyxTQUFTO0FBQ2pDLFFBQU0sU0FBUyxPQUFPLFFBQVEsUUFBUSxFQUFFO0FBQ3hDLFNBQU8sYUFBYTtBQUFBLEVBQUs7QUFBQSxHQUFVLEVBQUUsTUFBTSxVQUFVLElBQUksT0FBTyxDQUFDO0FBQ25FO0FBRU8sU0FBUyxhQUFhLFFBQXdCO0FBQ25ELFNBQU8sT0FBTyxhQUFhLEVBQUUsS0FBSztBQUNwQztBQUVPLFNBQVMscUJB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
