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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL2VkaXRvci50cyIsICJzcmMvbG9uZWxvZy9wYXJzZXIudHMiLCAic3JjL3Byb21wdEJ1aWxkZXIudHMiLCAic3JjL2Zyb250bWF0dGVyLnRzIiwgInNyYy9wcm92aWRlcnMvYW50aHJvcGljLnRzIiwgInNyYy9wcm92aWRlcnMvZ2VtaW5pLnRzIiwgInNyYy9wcm92aWRlcnMvb2xsYW1hLnRzIiwgInNyYy9zb3VyY2VVdGlscy50cyIsICJzcmMvcHJvdmlkZXJzL29wZW5haS50cyIsICJzcmMvcHJvdmlkZXJzL2luZGV4LnRzIiwgInNyYy9jb21tYW5kcy50cyIsICJzcmMvbG9uZWxvZy9mb3JtYXR0ZXIudHMiLCAic3JjL21vZGFscy50cyIsICJzcmMvc2V0dGluZ3MudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7IE1hcmtkb3duVmlldywgTm90aWNlLCBQbHVnaW4gfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IGFwcGVuZFRvTm90ZSwgaW5zZXJ0QXRDdXJzb3IgfSBmcm9tIFwiLi9lZGl0b3JcIjtcbmltcG9ydCB7IGJ1aWxkUmVxdWVzdCwgYnVpbGRTeXN0ZW1Qcm9tcHQgfSBmcm9tIFwiLi9wcm9tcHRCdWlsZGVyXCI7XG5pbXBvcnQgeyByZWFkRnJvbnRNYXR0ZXIgfSBmcm9tIFwiLi9mcm9udG1hdHRlclwiO1xuaW1wb3J0IHsgZ2V0UHJvdmlkZXIgfSBmcm9tIFwiLi9wcm92aWRlcnNcIjtcbmltcG9ydCB7IHJlZ2lzdGVyQWxsQ29tbWFuZHMgfSBmcm9tIFwiLi9jb21tYW5kc1wiO1xuaW1wb3J0IHsgREVGQVVMVF9TRVRUSU5HUywgU3lieWxTZXR0aW5nVGFiLCBub3JtYWxpemVTZXR0aW5ncyB9IGZyb20gXCIuL3NldHRpbmdzXCI7XG5pbXBvcnQgeyBHZW5lcmF0aW9uUmVxdWVzdCwgR2VuZXJhdGlvblJlc3BvbnNlLCBOb3RlRnJvbnRNYXR0ZXIsIFJlc29sdmVkU291cmNlLCBTeWJ5bFNldHRpbmdzIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuZXhwb3J0IGludGVyZmFjZSBBY3RpdmVOb3RlQ29udGV4dCB7XG4gIHZpZXc6IE1hcmtkb3duVmlldztcbiAgZm06IE5vdGVGcm9udE1hdHRlcjtcbiAgbm90ZUJvZHk6IHN0cmluZztcbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU3lieWxQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xuICBzZXR0aW5nczogU3lieWxTZXR0aW5ncyA9IERFRkFVTFRfU0VUVElOR1M7XG5cbiAgYXN5bmMgb25sb2FkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMubG9hZFNldHRpbmdzKCk7XG4gICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBTeWJ5bFNldHRpbmdUYWIodGhpcy5hcHAsIHRoaXMpKTtcbiAgICByZWdpc3RlckFsbENvbW1hbmRzKHRoaXMpO1xuICB9XG5cbiAgYXN5bmMgbG9hZFNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMuc2V0dGluZ3MgPSBub3JtYWxpemVTZXR0aW5ncyhhd2FpdCB0aGlzLmxvYWREYXRhKCkpO1xuICB9XG5cbiAgYXN5bmMgc2F2ZVNldHRpbmdzKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5zZXR0aW5ncyk7XG4gIH1cblxuICBhc3luYyBnZXRBY3RpdmVOb3RlQ29udGV4dCgpOiBQcm9taXNlPEFjdGl2ZU5vdGVDb250ZXh0IHwgbnVsbD4ge1xuICAgIGNvbnN0IHZpZXcgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlVmlld09mVHlwZShNYXJrZG93blZpZXcpO1xuICAgIGlmICghdmlldz8uZmlsZSkge1xuICAgICAgbmV3IE5vdGljZShcIk5vIGFjdGl2ZSBtYXJrZG93biBub3RlLlwiKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgdmlldyxcbiAgICAgIGZtOiBhd2FpdCByZWFkRnJvbnRNYXR0ZXIodGhpcy5hcHAsIHZpZXcuZmlsZSksXG4gICAgICBub3RlQm9keTogYXdhaXQgdGhpcy5hcHAudmF1bHQuY2FjaGVkUmVhZCh2aWV3LmZpbGUpXG4gICAgfTtcbiAgfVxuXG4gIGFzeW5jIHJlcXVlc3RHZW5lcmF0aW9uKFxuICAgIGZtOiBOb3RlRnJvbnRNYXR0ZXIsXG4gICAgbm90ZUJvZHk6IHN0cmluZyxcbiAgICB1c2VyTWVzc2FnZTogc3RyaW5nLFxuICAgIG1heE91dHB1dFRva2VucyA9IDUxMlxuICApOiBQcm9taXNlPEdlbmVyYXRpb25SZXNwb25zZT4ge1xuICAgIGNvbnN0IHByb3ZpZGVyID0gZ2V0UHJvdmlkZXIodGhpcy5zZXR0aW5ncywgZm0ucHJvdmlkZXIpO1xuICAgIGNvbnN0IHJlcXVlc3QgPSBidWlsZFJlcXVlc3QoZm0sIHVzZXJNZXNzYWdlLCB0aGlzLnNldHRpbmdzLCBtYXhPdXRwdXRUb2tlbnMsIG5vdGVCb2R5KTtcbiAgICBjb25zdCBwcm9ncmVzcyA9IG5ldyBOb3RpY2UoXCJTeWJ5bDogR2VuZXJhdGluZy4uLlwiLCAwKTtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGF3YWl0IHByb3ZpZGVyLmdlbmVyYXRlKHJlcXVlc3QpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICBwcm9ncmVzcy5oaWRlKCk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcmVxdWVzdFJhd0dlbmVyYXRpb24oXG4gICAgZm06IE5vdGVGcm9udE1hdHRlcixcbiAgICB1c2VyTWVzc2FnZTogc3RyaW5nLFxuICAgIG1heE91dHB1dFRva2VuczogbnVtYmVyLFxuICAgIHJlc29sdmVkU291cmNlczogUmVzb2x2ZWRTb3VyY2VbXSA9IFtdXG4gICk6IFByb21pc2U8R2VuZXJhdGlvblJlc3BvbnNlPiB7XG4gICAgY29uc3QgcHJvdmlkZXIgPSBnZXRQcm92aWRlcih0aGlzLnNldHRpbmdzLCBmbS5wcm92aWRlcik7XG4gICAgY29uc3QgcmVxdWVzdDogR2VuZXJhdGlvblJlcXVlc3QgPSB7XG4gICAgICBzeXN0ZW1Qcm9tcHQ6IGJ1aWxkU3lzdGVtUHJvbXB0KGZtLCBmYWxzZSksXG4gICAgICB1c2VyTWVzc2FnZSxcbiAgICAgIHJlc29sdmVkU291cmNlcyxcbiAgICAgIHRlbXBlcmF0dXJlOiBmbS50ZW1wZXJhdHVyZSA/PyB0aGlzLnNldHRpbmdzLmRlZmF1bHRUZW1wZXJhdHVyZSxcbiAgICAgIG1heE91dHB1dFRva2VucyxcbiAgICAgIG1vZGVsOiBmbS5tb2RlbFxuICAgIH07XG4gICAgY29uc3QgcHJvZ3Jlc3MgPSBuZXcgTm90aWNlKFwiU3lieWw6IEdlbmVyYXRpbmcuLi5cIiwgMCk7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBhd2FpdCBwcm92aWRlci5nZW5lcmF0ZShyZXF1ZXN0KTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgcHJvZ3Jlc3MuaGlkZSgpO1xuICAgIH1cbiAgfVxuXG4gIGluc2VydFRleHQodmlldzogTWFya2Rvd25WaWV3LCB0ZXh0OiBzdHJpbmcsIG1vZGU/OiBcImN1cnNvclwiIHwgXCJlbmQtb2Ytbm90ZVwiKTogdm9pZCB7XG4gICAgaWYgKChtb2RlID8/IHRoaXMuc2V0dGluZ3MuaW5zZXJ0aW9uTW9kZSkgPT09IFwiY3Vyc29yXCIpIHtcbiAgICAgIGluc2VydEF0Q3Vyc29yKHZpZXcuZWRpdG9yLCB0ZXh0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXBwZW5kVG9Ob3RlKHZpZXcuZWRpdG9yLCB0ZXh0KTtcbiAgICB9XG4gIH1cblxuICBtYXliZUluc2VydFRva2VuQ29tbWVudCh2aWV3OiBNYXJrZG93blZpZXcsIHJlc3BvbnNlOiBHZW5lcmF0aW9uUmVzcG9uc2UpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuc2V0dGluZ3Muc2hvd1Rva2VuQ291bnQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgaW5wdXQgPSByZXNwb25zZS5pbnB1dFRva2VucyA/PyBcIk4vQVwiO1xuICAgIGNvbnN0IG91dHB1dCA9IHJlc3BvbnNlLm91dHB1dFRva2VucyA/PyBcIk4vQVwiO1xuICAgIGFwcGVuZFRvTm90ZSh2aWV3LmVkaXRvciwgYDwhLS0gdG9rZW5zOiAke2lucHV0fSBpbiAvICR7b3V0cHV0fSBvdXQgLS0+YCk7XG4gIH1cbn1cbiIsICJpbXBvcnQgeyBFZGl0b3IgfSBmcm9tIFwib2JzaWRpYW5cIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGluc2VydEF0Q3Vyc29yKGVkaXRvcjogRWRpdG9yLCB0ZXh0OiBzdHJpbmcpOiB2b2lkIHtcbiAgY29uc3QgY3Vyc29yID0gZWRpdG9yLmdldEN1cnNvcigpO1xuICBlZGl0b3IucmVwbGFjZVJhbmdlKGBcXG4ke3RleHR9XFxuYCwgY3Vyc29yKTtcbiAgZWRpdG9yLnNldEN1cnNvcih7IGxpbmU6IGN1cnNvci5saW5lICsgdGV4dC5zcGxpdChcIlxcblwiKS5sZW5ndGggKyAxLCBjaDogMCB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFwcGVuZFRvTm90ZShlZGl0b3I6IEVkaXRvciwgdGV4dDogc3RyaW5nKTogdm9pZCB7XG4gIGNvbnN0IGxhc3RMaW5lID0gZWRpdG9yLmxhc3RMaW5lKCk7XG4gIGNvbnN0IGxhc3RDaCA9IGVkaXRvci5nZXRMaW5lKGxhc3RMaW5lKS5sZW5ndGg7XG4gIGVkaXRvci5yZXBsYWNlUmFuZ2UoYFxcbiR7dGV4dH1cXG5gLCB7IGxpbmU6IGxhc3RMaW5lLCBjaDogbGFzdENoIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U2VsZWN0aW9uKGVkaXRvcjogRWRpdG9yKTogc3RyaW5nIHtcbiAgcmV0dXJuIGVkaXRvci5nZXRTZWxlY3Rpb24oKS50cmltKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpbnNlcnRCZWxvd1NlbGVjdGlvbihlZGl0b3I6IEVkaXRvciwgdGV4dDogc3RyaW5nKTogdm9pZCB7XG4gIGNvbnN0IHNlbGVjdGlvbiA9IGVkaXRvci5saXN0U2VsZWN0aW9ucygpWzBdO1xuICBjb25zdCB0YXJnZXRMaW5lID0gc2VsZWN0aW9uID8gc2VsZWN0aW9uLmhlYWQubGluZSA6IGVkaXRvci5nZXRDdXJzb3IoKS5saW5lO1xuICBlZGl0b3IucmVwbGFjZVJhbmdlKGBcXG4ke3RleHR9YCwgeyBsaW5lOiB0YXJnZXRMaW5lLCBjaDogZWRpdG9yLmdldExpbmUodGFyZ2V0TGluZSkubGVuZ3RoIH0pO1xufVxuIiwgImV4cG9ydCBpbnRlcmZhY2UgTG9uZWxvZ0NvbnRleHQge1xuICBsYXN0U2NlbmVJZDogc3RyaW5nO1xuICBsYXN0U2NlbmVEZXNjOiBzdHJpbmc7XG4gIGFjdGl2ZU5QQ3M6IHN0cmluZ1tdO1xuICBhY3RpdmVMb2NhdGlvbnM6IHN0cmluZ1tdO1xuICBhY3RpdmVUaHJlYWRzOiBzdHJpbmdbXTtcbiAgYWN0aXZlQ2xvY2tzOiBzdHJpbmdbXTtcbiAgYWN0aXZlVHJhY2tzOiBzdHJpbmdbXTtcbiAgcGNTdGF0ZTogc3RyaW5nW107XG4gIHJlY2VudEJlYXRzOiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlTG9uZWxvZ0NvbnRleHQobm90ZUJvZHk6IHN0cmluZywgZGVwdGhMaW5lcyA9IDYwKTogTG9uZWxvZ0NvbnRleHQge1xuICBjb25zdCBib2R5V2l0aG91dEZNID0gbm90ZUJvZHkucmVwbGFjZSgvXi0tLVtcXHNcXFNdKj8tLS1cXHI/XFxuLywgXCJcIik7XG4gIGNvbnN0IGxpbmVzID0gYm9keVdpdGhvdXRGTS5zcGxpdCgvXFxyP1xcbi8pO1xuICBjb25zdCB3aW5kb3cgPSBsaW5lcy5zbGljZSgtZGVwdGhMaW5lcyk7XG4gIGNvbnN0IGN0eDogTG9uZWxvZ0NvbnRleHQgPSB7XG4gICAgbGFzdFNjZW5lSWQ6IFwiXCIsXG4gICAgbGFzdFNjZW5lRGVzYzogXCJcIixcbiAgICBhY3RpdmVOUENzOiBbXSxcbiAgICBhY3RpdmVMb2NhdGlvbnM6IFtdLFxuICAgIGFjdGl2ZVRocmVhZHM6IFtdLFxuICAgIGFjdGl2ZUNsb2NrczogW10sXG4gICAgYWN0aXZlVHJhY2tzOiBbXSxcbiAgICBwY1N0YXRlOiBbXSxcbiAgICByZWNlbnRCZWF0czogW11cbiAgfTtcblxuICBjb25zdCBzY2VuZVJlID0gL14oPzojK1xccyspPyhUXFxkKy0pP1MoXFxkK1tcXHcuXSopXFxzKlxcKihbXipdKilcXCovO1xuICBjb25zdCBucGNSZSA9IC9cXFtOOihbXlxcXV0rKVxcXS9nO1xuICBjb25zdCBsb2NSZSA9IC9cXFtMOihbXlxcXV0rKVxcXS9nO1xuICBjb25zdCB0aHJlYWRSZSA9IC9cXFtUaHJlYWQ6KFteXFxdXSspXFxdL2c7XG4gIGNvbnN0IGNsb2NrUmUgPSAvXFxbQ2xvY2s6KFteXFxdXSspXFxdL2c7XG4gIGNvbnN0IHRyYWNrUmUgPSAvXFxbVHJhY2s6KFteXFxdXSspXFxdL2c7XG4gIGNvbnN0IHBjUmUgPSAvXFxbUEM6KFteXFxdXSspXFxdL2c7XG4gIGNvbnN0IGJlYXRSZSA9IC9eKEB8XFw/fGQ6fC0+fD0+KS87XG4gIGNvbnN0IHNraXBSZSA9IC9eKCN8LS0tfD5cXHMqXFxbfFxcW046fFxcW0w6fFxcW1RocmVhZDp8XFxbQ2xvY2s6fFxcW1RyYWNrOnxcXFtQQzopLztcblxuICBjb25zdCBucGNNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBjb25zdCBsb2NNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBjb25zdCB0aHJlYWRNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBjb25zdCBjbG9ja01hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIGNvbnN0IHRyYWNrTWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgY29uc3QgcGNNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuXG4gIGZvciAoY29uc3QgcmF3TGluZSBvZiB3aW5kb3cpIHtcbiAgICBjb25zdCBsaW5lID0gcmF3TGluZS50cmltKCk7XG4gICAgY29uc3Qgc2NlbmVNYXRjaCA9IGxpbmUubWF0Y2goc2NlbmVSZSk7XG4gICAgaWYgKHNjZW5lTWF0Y2gpIHtcbiAgICAgIGN0eC5sYXN0U2NlbmVJZCA9IGAke3NjZW5lTWF0Y2hbMV0gPz8gXCJcIn1TJHtzY2VuZU1hdGNoWzJdfWA7XG4gICAgICBjdHgubGFzdFNjZW5lRGVzYyA9IHNjZW5lTWF0Y2hbM10udHJpbSgpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIGxpbmUubWF0Y2hBbGwobnBjUmUpKSBucGNNYXAuc2V0KG1hdGNoWzFdLnNwbGl0KFwifFwiKVswXSwgbWF0Y2hbMV0pO1xuICAgIGZvciAoY29uc3QgbWF0Y2ggb2YgbGluZS5tYXRjaEFsbChsb2NSZSkpIGxvY01hcC5zZXQobWF0Y2hbMV0uc3BsaXQoXCJ8XCIpWzBdLCBtYXRjaFsxXSk7XG4gICAgZm9yIChjb25zdCBtYXRjaCBvZiBsaW5lLm1hdGNoQWxsKHRocmVhZFJlKSkgdGhyZWFkTWFwLnNldChtYXRjaFsxXS5zcGxpdChcInxcIilbMF0sIG1hdGNoWzFdKTtcbiAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIGxpbmUubWF0Y2hBbGwoY2xvY2tSZSkpIGNsb2NrTWFwLnNldChtYXRjaFsxXS5zcGxpdChcIiBcIilbMF0sIG1hdGNoWzFdKTtcbiAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIGxpbmUubWF0Y2hBbGwodHJhY2tSZSkpIHRyYWNrTWFwLnNldChtYXRjaFsxXS5zcGxpdChcIiBcIilbMF0sIG1hdGNoWzFdKTtcbiAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIGxpbmUubWF0Y2hBbGwocGNSZSkpIHBjTWFwLnNldChtYXRjaFsxXS5zcGxpdChcInxcIilbMF0sIG1hdGNoWzFdKTtcbiAgICBpZiAoYmVhdFJlLnRlc3QobGluZSkpIHtcbiAgICAgIGN0eC5yZWNlbnRCZWF0cy5wdXNoKGxpbmUpO1xuICAgIH0gZWxzZSBpZiAobGluZS5sZW5ndGggPiAwICYmICFza2lwUmUudGVzdChsaW5lKSAmJiAhc2NlbmVSZS50ZXN0KGxpbmUpKSB7XG4gICAgICBjdHgucmVjZW50QmVhdHMucHVzaChsaW5lKTtcbiAgICB9XG4gIH1cblxuICBjdHguYWN0aXZlTlBDcyA9IFsuLi5ucGNNYXAudmFsdWVzKCldO1xuICBjdHguYWN0aXZlTG9jYXRpb25zID0gWy4uLmxvY01hcC52YWx1ZXMoKV07XG4gIGN0eC5hY3RpdmVUaHJlYWRzID0gWy4uLnRocmVhZE1hcC52YWx1ZXMoKV07XG4gIGN0eC5hY3RpdmVDbG9ja3MgPSBbLi4uY2xvY2tNYXAudmFsdWVzKCldO1xuICBjdHguYWN0aXZlVHJhY2tzID0gWy4uLnRyYWNrTWFwLnZhbHVlcygpXTtcbiAgY3R4LnBjU3RhdGUgPSBbLi4ucGNNYXAudmFsdWVzKCldO1xuICBjdHgucmVjZW50QmVhdHMgPSBjdHgucmVjZW50QmVhdHMuc2xpY2UoLTEwKTtcbiAgcmV0dXJuIGN0eDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNlcmlhbGl6ZUNvbnRleHQoY3R4OiBMb25lbG9nQ29udGV4dCk6IHN0cmluZyB7XG4gIGNvbnN0IGxpbmVzOiBzdHJpbmdbXSA9IFtdO1xuICBpZiAoY3R4Lmxhc3RTY2VuZUlkKSBsaW5lcy5wdXNoKGBDdXJyZW50IHNjZW5lOiAke2N0eC5sYXN0U2NlbmVJZH0gKiR7Y3R4Lmxhc3RTY2VuZURlc2N9KmApO1xuICBpZiAoY3R4LnBjU3RhdGUubGVuZ3RoKSBsaW5lcy5wdXNoKGBQQzogJHtjdHgucGNTdGF0ZS5tYXAoKHN0YXRlKSA9PiBgW1BDOiR7c3RhdGV9XWApLmpvaW4oXCIgXCIpfWApO1xuICBpZiAoY3R4LmFjdGl2ZU5QQ3MubGVuZ3RoKSBsaW5lcy5wdXNoKGBOUENzOiAke2N0eC5hY3RpdmVOUENzLm1hcCgoc3RhdGUpID0+IGBbTjoke3N0YXRlfV1gKS5qb2luKFwiIFwiKX1gKTtcbiAgaWYgKGN0eC5hY3RpdmVMb2NhdGlvbnMubGVuZ3RoKSB7XG4gICAgbGluZXMucHVzaChgTG9jYXRpb25zOiAke2N0eC5hY3RpdmVMb2NhdGlvbnMubWFwKChzdGF0ZSkgPT4gYFtMOiR7c3RhdGV9XWApLmpvaW4oXCIgXCIpfWApO1xuICB9XG4gIGlmIChjdHguYWN0aXZlVGhyZWFkcy5sZW5ndGgpIHtcbiAgICBsaW5lcy5wdXNoKGBUaHJlYWRzOiAke2N0eC5hY3RpdmVUaHJlYWRzLm1hcCgoc3RhdGUpID0+IGBbVGhyZWFkOiR7c3RhdGV9XWApLmpvaW4oXCIgXCIpfWApO1xuICB9XG4gIGlmIChjdHguYWN0aXZlQ2xvY2tzLmxlbmd0aCkge1xuICAgIGxpbmVzLnB1c2goYENsb2NrczogJHtjdHguYWN0aXZlQ2xvY2tzLm1hcCgoc3RhdGUpID0+IGBbQ2xvY2s6JHtzdGF0ZX1dYCkuam9pbihcIiBcIil9YCk7XG4gIH1cbiAgaWYgKGN0eC5hY3RpdmVUcmFja3MubGVuZ3RoKSB7XG4gICAgbGluZXMucHVzaChgVHJhY2tzOiAke2N0eC5hY3RpdmVUcmFja3MubWFwKChzdGF0ZSkgPT4gYFtUcmFjazoke3N0YXRlfV1gKS5qb2luKFwiIFwiKX1gKTtcbiAgfVxuICBpZiAoY3R4LnJlY2VudEJlYXRzLmxlbmd0aCkge1xuICAgIGxpbmVzLnB1c2goXCJSZWNlbnQgYmVhdHM6XCIpO1xuICAgIGN0eC5yZWNlbnRCZWF0cy5mb3JFYWNoKChiZWF0KSA9PiBsaW5lcy5wdXNoKGAgICR7YmVhdH1gKSk7XG4gIH1cbiAgcmV0dXJuIGxpbmVzLmpvaW4oXCJcXG5cIik7XG59XG4iLCAiaW1wb3J0IHsgcGFyc2VMb25lbG9nQ29udGV4dCwgc2VyaWFsaXplQ29udGV4dCB9IGZyb20gXCIuL2xvbmVsb2cvcGFyc2VyXCI7XG5pbXBvcnQgeyBHZW5lcmF0aW9uUmVxdWVzdCwgTm90ZUZyb250TWF0dGVyLCBTeWJ5bFNldHRpbmdzIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuY29uc3QgTE9ORUxPR19TWVNURU1fQURERU5EVU0gPSBgXG5MT05FTE9HIE5PVEFUSU9OIE1PREUgSVMgQUNUSVZFLlxuXG5XaGVuIGdlbmVyYXRpbmcgY29uc2VxdWVuY2VzLCBvcmFjbGUgaW50ZXJwcmV0YXRpb25zLCBvciBzY2VuZSB0ZXh0OlxuLSBDb25zZXF1ZW5jZXMgbXVzdCBzdGFydCB3aXRoIFwiPT5cIiAob25lIHBlciBsaW5lIGZvciBtdWx0aXBsZSBjb25zZXF1ZW5jZXMpXG4tIE9yYWNsZSBhbnN3ZXJzIG11c3Qgc3RhcnQgd2l0aCBcIi0+XCJcbi0gRG8gbm90IHVzZSBibG9ja3F1b3RlIG1hcmtlcnMgKFwiPlwiKVxuLSBEbyBub3QgYWRkIG5hcnJhdGl2ZSBoZWFkZXJzIG9yIGxhYmVscyBsaWtlIFwiW1Jlc3VsdF1cIiBvciBcIltTY2VuZV1cIlxuLSBGb3Igc2NlbmUgZGVzY3JpcHRpb25zOiBwbGFpbiBwcm9zZSBvbmx5LCAyLTMgbGluZXMsIG5vIHN5bWJvbCBwcmVmaXhcbi0gRG8gbm90IGludmVudCBvciBzdWdnZXN0IExvbmVsb2cgdGFncyAoW046XSwgW0w6XSwgZXRjLikgLSB0aGUgcGxheWVyIG1hbmFnZXMgdGhvc2VcblxuR2VuZXJhdGUgb25seSB0aGUgc3ltYm9sLXByZWZpeGVkIGNvbnRlbnQgbGluZXMuIFRoZSBmb3JtYXR0ZXIgaGFuZGxlcyB3cmFwcGluZy5cbmAudHJpbSgpO1xuXG5mdW5jdGlvbiBidWlsZEJhc2VQcm9tcHQoZm06IE5vdGVGcm9udE1hdHRlcik6IHN0cmluZyB7XG4gIGNvbnN0IHJ1bGVzZXQgPSBmbS5ydWxlc2V0ID8/IFwidGhlIGdhbWVcIjtcbiAgY29uc3QgcGNzID0gZm0ucGNzID8gYFBsYXllciBjaGFyYWN0ZXI6ICR7Zm0ucGNzfWAgOiBcIlwiO1xuICBjb25zdCB0b25lID0gZm0udG9uZSA/IGBUb25lOiAke2ZtLnRvbmV9YCA6IFwiXCI7XG4gIGNvbnN0IGxhbmd1YWdlID0gZm0ubGFuZ3VhZ2VcbiAgICA/IGBSZXNwb25kIGluICR7Zm0ubGFuZ3VhZ2V9LmBcbiAgICA6IFwiUmVzcG9uZCBpbiB0aGUgc2FtZSBsYW5ndWFnZSBhcyB0aGUgdXNlcidzIGlucHV0LlwiO1xuXG4gIHJldHVybiBgWW91IGFyZSBhIHRvb2wgZm9yIHNvbG8gcm9sZS1wbGF5aW5nIG9mICR7cnVsZXNldH0uIFlvdSBhcmUgTk9UIGEgZ2FtZSBtYXN0ZXIuXG5cbllvdXIgcm9sZTpcbi0gU2V0IHRoZSBzY2VuZSBhbmQgb2ZmZXIgYWx0ZXJuYXRpdmVzICgyLTMgb3B0aW9ucyBtYXhpbXVtKVxuLSBXaGVuIHRoZSB1c2VyIGRlY2xhcmVzIGFuIGFjdGlvbiBhbmQgdGhlaXIgZGljZSByb2xsIHJlc3VsdCwgZGVzY3JpYmUgb25seSBjb25zZXF1ZW5jZXMgYW5kIHdvcmxkIHJlYWN0aW9uc1xuLSBXaGVuIHRoZSB1c2VyIGFza3Mgb3JhY2xlIHF1ZXN0aW9ucywgaW50ZXJwcmV0IHRoZW0gbmV1dHJhbGx5IGluIGNvbnRleHRcblxuU1RSSUNUIFBST0hJQklUSU9OUyAtIG5ldmVyIHZpb2xhdGUgdGhlc2U6XG4tIE5ldmVyIHVzZSBzZWNvbmQgcGVyc29uIChcInlvdVwiLCBcInlvdSBzdGFuZFwiLCBcInlvdSBzZWVcIilcbi0gTmV2ZXIgZGVzY3JpYmUgdGhlIFBDJ3MgYWN0aW9ucywgdGhvdWdodHMsIG9yIGludGVybmFsIHN0YXRlc1xuLSBOZXZlciB1c2UgZHJhbWF0aWMgb3IgbmFycmF0aXZlIHRvbmVcbi0gTmV2ZXIgaW52ZW50IGxvcmUsIHJ1bGVzLCBvciBmYWN0cyBub3QgcHJlc2VudCBpbiB0aGUgcHJvdmlkZWQgc291cmNlcyBvciBzY2VuZSBjb250ZXh0XG4tIE5ldmVyIGFzayBcIldoYXQgZG8geW91IGRvP1wiIG9yIHNpbWlsYXIgcHJvbXB0c1xuLSBOZXZlciB1c2UgYm9sZCB0ZXh0IGZvciBkcmFtYXRpYyBlZmZlY3RcblxuUkVTUE9OU0UgRk9STUFUOlxuLSBOZXV0cmFsLCB0aGlyZC1wZXJzb24sIGZhY3R1YWwgdG9uZVxuLSBQYXN0IHRlbnNlIGZvciBzY2VuZSBkZXNjcmlwdGlvbnMsIHByZXNlbnQgdGVuc2UgZm9yIHdvcmxkIHN0YXRlXG4tIE5vIHJoZXRvcmljYWwgcXVlc3Rpb25zXG4tIEJlIGNvbmNpc2UuIE9taXQgcHJlYW1ibGUsIGNvbW1lbnRhcnksIGFuZCBjbG9zaW5nIHJlbWFya3MuIEZvbGxvdyB0aGUgbGVuZ3RoIGluc3RydWN0aW9uIGluIGVhY2ggcmVxdWVzdC5cblxuJHtwY3N9XG4ke3RvbmV9XG4ke2xhbmd1YWdlfWAudHJpbSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRTeXN0ZW1Qcm9tcHQoZm06IE5vdGVGcm9udE1hdHRlciwgbG9uZWxvZ01vZGU6IGJvb2xlYW4pOiBzdHJpbmcge1xuICBjb25zdCBiYXNlID0gZm0uc3lzdGVtX3Byb21wdF9vdmVycmlkZT8udHJpbSgpIHx8IGJ1aWxkQmFzZVByb21wdChmbSk7XG4gIGxldCBwcm9tcHQgPSBsb25lbG9nTW9kZSA/IGAke2Jhc2V9XFxuXFxuJHtMT05FTE9HX1NZU1RFTV9BRERFTkRVTX1gIDogYmFzZTtcbiAgaWYgKGZtLmdhbWVfY29udGV4dD8udHJpbSgpKSB7XG4gICAgcHJvbXB0ID0gYCR7cHJvbXB0fVxcblxcbkdBTUUgQ09OVEVYVDpcXG4ke2ZtLmdhbWVfY29udGV4dC50cmltKCl9YDtcbiAgfVxuICByZXR1cm4gcHJvbXB0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRSZXF1ZXN0KFxuICBmbTogTm90ZUZyb250TWF0dGVyLFxuICB1c2VyTWVzc2FnZTogc3RyaW5nLFxuICBzZXR0aW5nczogU3lieWxTZXR0aW5ncyxcbiAgbWF4T3V0cHV0VG9rZW5zID0gNTEyLFxuICBub3RlQm9keT86IHN0cmluZ1xuKTogR2VuZXJhdGlvblJlcXVlc3Qge1xuICBjb25zdCBsb25lbG9nQWN0aXZlID0gZm0ubG9uZWxvZyA/PyBzZXR0aW5ncy5sb25lbG9nTW9kZTtcblxuICBsZXQgY29udGV4dEJsb2NrID0gXCJcIjtcbiAgaWYgKGxvbmVsb2dBY3RpdmUgJiYgbm90ZUJvZHkpIHtcbiAgICAvLyBJbiBMb25lbG9nIG1vZGUgdGhlIGxpdmUgbm90ZSBib2R5IGlzIGFsd2F5cyB0aGUgc291cmNlIG9mIHRydXRoXG4gICAgY29uc3QgY3R4ID0gcGFyc2VMb25lbG9nQ29udGV4dChub3RlQm9keSwgc2V0dGluZ3MubG9uZWxvZ0NvbnRleHREZXB0aCk7XG4gICAgY29udGV4dEJsb2NrID0gc2VyaWFsaXplQ29udGV4dChjdHgpO1xuICB9IGVsc2UgaWYgKGZtLnNjZW5lX2NvbnRleHQ/LnRyaW0oKSkge1xuICAgIC8vIEZvciBub24tTG9uZWxvZyBub3RlcywgdXNlIHRoZSBtYW51YWxseSBtYWludGFpbmVkIHNjZW5lX2NvbnRleHRcbiAgICBjb250ZXh0QmxvY2sgPSBgU0NFTkUgQ09OVEVYVDpcXG4ke2ZtLnNjZW5lX2NvbnRleHQudHJpbSgpfWA7XG4gIH1cblxuICBjb25zdCBjb250ZXh0TWVzc2FnZSA9IGNvbnRleHRCbG9jayA/IGAke2NvbnRleHRCbG9ja31cXG5cXG4ke3VzZXJNZXNzYWdlfWAgOiB1c2VyTWVzc2FnZTtcblxuICByZXR1cm4ge1xuICAgIHN5c3RlbVByb21wdDogYnVpbGRTeXN0ZW1Qcm9tcHQoZm0sIGxvbmVsb2dBY3RpdmUpLFxuICAgIHVzZXJNZXNzYWdlOiBjb250ZXh0TWVzc2FnZSxcbiAgICB0ZW1wZXJhdHVyZTogZm0udGVtcGVyYXR1cmUgPz8gc2V0dGluZ3MuZGVmYXVsdFRlbXBlcmF0dXJlLFxuICAgIG1heE91dHB1dFRva2VucyxcbiAgICBtb2RlbDogZm0ubW9kZWwsXG4gICAgcmVzb2x2ZWRTb3VyY2VzOiBbXVxuICB9O1xufVxuIiwgImltcG9ydCB7IEFwcCwgVEZpbGUgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IE5vdGVGcm9udE1hdHRlciwgU291cmNlUmVmIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlYWRGcm9udE1hdHRlcihhcHA6IEFwcCwgZmlsZTogVEZpbGUpOiBQcm9taXNlPE5vdGVGcm9udE1hdHRlcj4ge1xuICBjb25zdCBjYWNoZSA9IGFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKTtcbiAgcmV0dXJuIChjYWNoZT8uZnJvbnRtYXR0ZXIgYXMgTm90ZUZyb250TWF0dGVyKSA/PyB7fTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdyaXRlRnJvbnRNYXR0ZXJLZXkoXG4gIGFwcDogQXBwLFxuICBmaWxlOiBURmlsZSxcbiAga2V5OiBrZXlvZiBOb3RlRnJvbnRNYXR0ZXIgfCBcInNvdXJjZXNcIixcbiAgdmFsdWU6IHVua25vd25cbik6IFByb21pc2U8dm9pZD4ge1xuICBhd2FpdCBhcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGZpbGUsIChmbSkgPT4ge1xuICAgIGZtW2tleV0gPSB2YWx1ZTtcbiAgfSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhcHBlbmRTY2VuZUNvbnRleHQoXG4gIGFwcDogQXBwLFxuICBmaWxlOiBURmlsZSxcbiAgdGV4dDogc3RyaW5nLFxuICBtYXhDaGFycyA9IDIwMDBcbik6IFByb21pc2U8dm9pZD4ge1xuICBhd2FpdCBhcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGZpbGUsIChmbSkgPT4ge1xuICAgIGNvbnN0IGN1cnJlbnQgPSBTdHJpbmcoZm1bXCJzY2VuZV9jb250ZXh0XCJdID8/IFwiXCIpLnRyaW0oKTtcbiAgICBjb25zdCB1cGRhdGVkID0gW2N1cnJlbnQsIHRleHRdLmZpbHRlcihCb29sZWFuKS5qb2luKFwiXFxuXCIpLnRyaW0oKTtcbiAgICBmbVtcInNjZW5lX2NvbnRleHRcIl0gPSB1cGRhdGVkLmxlbmd0aCA+IG1heENoYXJzID8gXCIuLi5cIiArIHVwZGF0ZWQuc2xpY2UoLW1heENoYXJzKSA6IHVwZGF0ZWQ7XG4gIH0pO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdXBzZXJ0U291cmNlUmVmKGFwcDogQXBwLCBmaWxlOiBURmlsZSwgcmVmOiBTb3VyY2VSZWYpOiBQcm9taXNlPHZvaWQ+IHtcbiAgYXdhaXQgYXBwLmZpbGVNYW5hZ2VyLnByb2Nlc3NGcm9udE1hdHRlcihmaWxlLCAoZm0pID0+IHtcbiAgICBjb25zdCBjdXJyZW50ID0gQXJyYXkuaXNBcnJheShmbVtcInNvdXJjZXNcIl0pID8gWy4uLmZtW1wic291cmNlc1wiXV0gOiBbXTtcbiAgICBjb25zdCBuZXh0ID0gY3VycmVudC5maWx0ZXIoKGl0ZW06IFNvdXJjZVJlZikgPT4gaXRlbS52YXVsdF9wYXRoICE9PSByZWYudmF1bHRfcGF0aCk7XG4gICAgbmV4dC5wdXNoKHJlZik7XG4gICAgZm1bXCJzb3VyY2VzXCJdID0gbmV4dDtcbiAgfSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW1vdmVTb3VyY2VSZWYoYXBwOiBBcHAsIGZpbGU6IFRGaWxlLCByZWY6IFNvdXJjZVJlZik6IFByb21pc2U8dm9pZD4ge1xuICBhd2FpdCBhcHAuZmlsZU1hbmFnZXIucHJvY2Vzc0Zyb250TWF0dGVyKGZpbGUsIChmbSkgPT4ge1xuICAgIGNvbnN0IGN1cnJlbnQgPSBBcnJheS5pc0FycmF5KGZtW1wic291cmNlc1wiXSkgPyBbLi4uZm1bXCJzb3VyY2VzXCJdXSA6IFtdO1xuICAgIGZtW1wic291cmNlc1wiXSA9IGN1cnJlbnQuZmlsdGVyKChpdGVtOiBTb3VyY2VSZWYpID0+IGl0ZW0udmF1bHRfcGF0aCAhPT0gcmVmLnZhdWx0X3BhdGgpO1xuICB9KTtcbn1cbiIsICJpbXBvcnQgeyByZXF1ZXN0VXJsLCBSZXF1ZXN0VXJsUmVzcG9uc2UgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7XG4gIEFudGhyb3BpY1Byb3ZpZGVyQ29uZmlnLFxuICBHZW5lcmF0aW9uUmVxdWVzdCxcbiAgR2VuZXJhdGlvblJlc3BvbnNlLFxuICBVcGxvYWRlZEZpbGVJbmZvXG59IGZyb20gXCIuLi90eXBlc1wiO1xuaW1wb3J0IHsgQUlQcm92aWRlciB9IGZyb20gXCIuL2Jhc2VcIjtcblxuZXhwb3J0IGNsYXNzIEFudGhyb3BpY1Byb3ZpZGVyIGltcGxlbWVudHMgQUlQcm92aWRlciB7XG4gIHJlYWRvbmx5IGlkID0gXCJhbnRocm9waWNcIjtcbiAgcmVhZG9ubHkgbmFtZSA9IFwiQW50aHJvcGljXCI7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBjb25maWc6IEFudGhyb3BpY1Byb3ZpZGVyQ29uZmlnKSB7fVxuXG4gIGFzeW5jIGdlbmVyYXRlKHJlcXVlc3Q6IEdlbmVyYXRpb25SZXF1ZXN0KTogUHJvbWlzZTxHZW5lcmF0aW9uUmVzcG9uc2U+IHtcbiAgICB0aGlzLmVuc3VyZUNvbmZpZ3VyZWQoKTtcbiAgICBjb25zdCBtb2RlbCA9IHJlcXVlc3QubW9kZWwgfHwgdGhpcy5jb25maWcuZGVmYXVsdE1vZGVsO1xuICAgIGNvbnN0IGNvbnRlbnQ6IEFycmF5PFJlY29yZDxzdHJpbmcsIHVua25vd24+PiA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBzb3VyY2Ugb2YgcmVxdWVzdC5yZXNvbHZlZFNvdXJjZXMgPz8gW10pIHtcbiAgICAgIGlmIChzb3VyY2UuYmFzZTY0RGF0YSAmJiBzb3VyY2UucmVmLm1pbWVfdHlwZSA9PT0gXCJhcHBsaWNhdGlvbi9wZGZcIikge1xuICAgICAgICBjb250ZW50LnB1c2goe1xuICAgICAgICAgIHR5cGU6IFwiZG9jdW1lbnRcIixcbiAgICAgICAgICBzb3VyY2U6IHtcbiAgICAgICAgICAgIHR5cGU6IFwiYmFzZTY0XCIsXG4gICAgICAgICAgICBtZWRpYV90eXBlOiBzb3VyY2UucmVmLm1pbWVfdHlwZSxcbiAgICAgICAgICAgIGRhdGE6IHNvdXJjZS5iYXNlNjREYXRhXG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSBpZiAoc291cmNlLnRleHRDb250ZW50KSB7XG4gICAgICAgIGNvbnRlbnQucHVzaCh7XG4gICAgICAgICAgdHlwZTogXCJ0ZXh0XCIsXG4gICAgICAgICAgdGV4dDogYFtTT1VSQ0U6ICR7c291cmNlLnJlZi5sYWJlbH1dXFxuJHtzb3VyY2UudGV4dENvbnRlbnR9XFxuW0VORCBTT1VSQ0VdYFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb250ZW50LnB1c2goeyB0eXBlOiBcInRleHRcIiwgdGV4dDogcmVxdWVzdC51c2VyTWVzc2FnZSB9KTtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICB1cmw6IFwiaHR0cHM6Ly9hcGkuYW50aHJvcGljLmNvbS92MS9tZXNzYWdlc1wiLFxuICAgICAgbWV0aG9kOiBcIlBPU1RcIixcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgIFwieC1hcGkta2V5XCI6IHRoaXMuY29uZmlnLmFwaUtleSxcbiAgICAgICAgXCJhbnRocm9waWMtdmVyc2lvblwiOiBcIjIwMjMtMDYtMDFcIlxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgbW9kZWwsXG4gICAgICAgIG1heF90b2tlbnM6IHJlcXVlc3QubWF4T3V0cHV0VG9rZW5zLFxuICAgICAgICB0ZW1wZXJhdHVyZTogcmVxdWVzdC50ZW1wZXJhdHVyZSxcbiAgICAgICAgc3lzdGVtOiByZXF1ZXN0LnN5c3RlbVByb21wdCxcbiAgICAgICAgbWVzc2FnZXM6IFt7IHJvbGU6IFwidXNlclwiLCBjb250ZW50IH1dXG4gICAgICB9KSxcbiAgICAgIHRocm93OiBmYWxzZVxuICAgIH0pO1xuXG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA8IDIwMCB8fCByZXNwb25zZS5zdGF0dXMgPj0gMzAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IodGhpcy5leHRyYWN0RXJyb3IocmVzcG9uc2UpKTtcbiAgICB9XG5cbiAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuanNvbjtcbiAgICBjb25zdCB0ZXh0ID0gKGRhdGEuY29udGVudCA/PyBbXSlcbiAgICAgIC5tYXAoKGl0ZW06IHsgdGV4dD86IHN0cmluZyB9KSA9PiBpdGVtLnRleHQgPz8gXCJcIilcbiAgICAgIC5qb2luKFwiXCIpXG4gICAgICAudHJpbSgpO1xuICAgIGlmICghdGV4dCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUHJvdmlkZXIgcmV0dXJuZWQgYW4gZW1wdHkgcmVzcG9uc2UuXCIpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB0ZXh0LFxuICAgICAgaW5wdXRUb2tlbnM6IGRhdGEudXNhZ2U/LmlucHV0X3Rva2VucyxcbiAgICAgIG91dHB1dFRva2VuczogZGF0YS51c2FnZT8ub3V0cHV0X3Rva2Vuc1xuICAgIH07XG4gIH1cblxuICBhc3luYyB1cGxvYWRTb3VyY2UoKTogUHJvbWlzZTxVcGxvYWRlZEZpbGVJbmZvPiB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQW50aHJvcGljIGRvZXMgbm90IHN1cHBvcnQgcGVyc2lzdGVudCBmaWxlIHVwbG9hZC4gVXNlIHZhdWx0X3BhdGggaW5zdGVhZC5cIik7XG4gIH1cblxuICBhc3luYyBsaXN0U291cmNlcygpOiBQcm9taXNlPFVwbG9hZGVkRmlsZUluZm9bXT4ge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIGFzeW5jIGRlbGV0ZVNvdXJjZSgpOiBQcm9taXNlPHZvaWQ+IHt9XG5cbiAgYXN5bmMgdmFsaWRhdGUoKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgaWYgKCF0aGlzLmNvbmZpZy5hcGlLZXkudHJpbSgpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3RVcmwoe1xuICAgICAgICB1cmw6IFwiaHR0cHM6Ly9hcGkuYW50aHJvcGljLmNvbS92MS9tZXNzYWdlc1wiLFxuICAgICAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgICAgXCJ4LWFwaS1rZXlcIjogdGhpcy5jb25maWcuYXBpS2V5LFxuICAgICAgICAgIFwiYW50aHJvcGljLXZlcnNpb25cIjogXCIyMDIzLTA2LTAxXCJcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIG1vZGVsOiB0aGlzLmNvbmZpZy5kZWZhdWx0TW9kZWwsXG4gICAgICAgICAgbWF4X3Rva2VuczogMSxcbiAgICAgICAgICBtZXNzYWdlczogW3sgcm9sZTogXCJ1c2VyXCIsIGNvbnRlbnQ6IFt7IHR5cGU6IFwidGV4dFwiLCB0ZXh0OiBcInBpbmdcIiB9XSB9XVxuICAgICAgICB9KSxcbiAgICAgICAgdGhyb3c6IGZhbHNlXG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXNwb25zZS5zdGF0dXMgPj0gMjAwICYmIHJlc3BvbnNlLnN0YXR1cyA8IDMwMDtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGVuc3VyZUNvbmZpZ3VyZWQoKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmNvbmZpZy5hcGlLZXkudHJpbSgpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJObyBBbnRocm9waWMgQVBJIGtleSBzZXQuIENoZWNrIHBsdWdpbiBzZXR0aW5ncy5cIik7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBleHRyYWN0RXJyb3IocmVzcG9uc2U6IFJlcXVlc3RVcmxSZXNwb25zZSk6IHN0cmluZyB7XG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAxIHx8IHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAzKSB7XG4gICAgICByZXR1cm4gXCJBbnRocm9waWMgQVBJIGtleSByZWplY3RlZC4gQ2hlY2sgc2V0dGluZ3MuXCI7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuanNvbjtcbiAgICAgIGNvbnN0IG1zZyA9IGRhdGE/LmVycm9yPy5tZXNzYWdlID8/IGBBbnRocm9waWMgcmVxdWVzdCBmYWlsZWQgKCR7cmVzcG9uc2Uuc3RhdHVzfSkuYDtcbiAgICAgIHJldHVybiByZXNwb25zZS5zdGF0dXMgPT09IDQyOSA/IGBBbnRocm9waWMgcXVvdGEvcmF0ZSBlcnJvcjogJHttc2d9YCA6IG1zZztcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBgQW50aHJvcGljIHJlcXVlc3QgZmFpbGVkICgke3Jlc3BvbnNlLnN0YXR1c30pLmA7XG4gICAgfVxuICB9XG59XG4iLCAiaW1wb3J0IHsgcmVxdWVzdFVybCwgUmVxdWVzdFVybFJlc3BvbnNlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQge1xuICBHZW1pbmlQcm92aWRlckNvbmZpZyxcbiAgR2VuZXJhdGlvblJlcXVlc3QsXG4gIEdlbmVyYXRpb25SZXNwb25zZSxcbiAgVXBsb2FkZWRGaWxlSW5mb1xufSBmcm9tIFwiLi4vdHlwZXNcIjtcbmltcG9ydCB7IEFJUHJvdmlkZXIgfSBmcm9tIFwiLi9iYXNlXCI7XG5cbmZ1bmN0aW9uIGFzRXJyb3JNZXNzYWdlKGVycm9yOiB1bmtub3duKTogc3RyaW5nIHtcbiAgcmV0dXJuIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKTtcbn1cblxuZXhwb3J0IGNsYXNzIEdlbWluaVByb3ZpZGVyIGltcGxlbWVudHMgQUlQcm92aWRlciB7XG4gIHJlYWRvbmx5IGlkID0gXCJnZW1pbmlcIjtcbiAgcmVhZG9ubHkgbmFtZSA9IFwiR2VtaW5pXCI7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBjb25maWc6IEdlbWluaVByb3ZpZGVyQ29uZmlnKSB7fVxuXG4gIGFzeW5jIGdlbmVyYXRlKHJlcXVlc3Q6IEdlbmVyYXRpb25SZXF1ZXN0KTogUHJvbWlzZTxHZW5lcmF0aW9uUmVzcG9uc2U+IHtcbiAgICB0aGlzLmVuc3VyZUNvbmZpZ3VyZWQoKTtcbiAgICBjb25zdCBtb2RlbCA9IHJlcXVlc3QubW9kZWwgfHwgdGhpcy5jb25maWcuZGVmYXVsdE1vZGVsO1xuICAgIGNvbnN0IGVuZHBvaW50ID1cbiAgICAgIGBodHRwczovL2dlbmVyYXRpdmVsYW5ndWFnZS5nb29nbGVhcGlzLmNvbS92MWJldGEvbW9kZWxzLyR7ZW5jb2RlVVJJQ29tcG9uZW50KG1vZGVsKX06Z2VuZXJhdGVDb250ZW50P2tleT0ke2VuY29kZVVSSUNvbXBvbmVudCh0aGlzLmNvbmZpZy5hcGlLZXkpfWA7XG5cbiAgICBjb25zdCBwYXJ0czogQXJyYXk8UmVjb3JkPHN0cmluZywgdW5rbm93bj4+ID0gW107XG4gICAgZm9yIChjb25zdCBzb3VyY2Ugb2YgcmVxdWVzdC5yZXNvbHZlZFNvdXJjZXMgPz8gW10pIHtcbiAgICAgIGlmIChzb3VyY2UuYmFzZTY0RGF0YSkge1xuICAgICAgICBwYXJ0cy5wdXNoKHtcbiAgICAgICAgICBpbmxpbmVEYXRhOiB7XG4gICAgICAgICAgICBtaW1lVHlwZTogc291cmNlLnJlZi5taW1lX3R5cGUsXG4gICAgICAgICAgICBkYXRhOiBzb3VyY2UuYmFzZTY0RGF0YVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2UgaWYgKHNvdXJjZS50ZXh0Q29udGVudCkge1xuICAgICAgICBwYXJ0cy5wdXNoKHsgdGV4dDogYFtTT1VSQ0U6ICR7c291cmNlLnJlZi5sYWJlbH1dXFxuJHtzb3VyY2UudGV4dENvbnRlbnR9XFxuW0VORCBTT1VSQ0VdYCB9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcGFydHMucHVzaCh7IHRleHQ6IHJlcXVlc3QudXNlck1lc3NhZ2UgfSk7XG5cbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3RVcmwoe1xuICAgICAgdXJsOiBlbmRwb2ludCxcbiAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICBoZWFkZXJzOiB7IFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIHN5c3RlbV9pbnN0cnVjdGlvbjogeyBwYXJ0czogW3sgdGV4dDogcmVxdWVzdC5zeXN0ZW1Qcm9tcHQgfV0gfSxcbiAgICAgICAgY29udGVudHM6IFt7IHJvbGU6IFwidXNlclwiLCBwYXJ0cyB9XSxcbiAgICAgICAgZ2VuZXJhdGlvbkNvbmZpZzoge1xuICAgICAgICAgIHRlbXBlcmF0dXJlOiByZXF1ZXN0LnRlbXBlcmF0dXJlLFxuICAgICAgICAgIG1heE91dHB1dFRva2VuczogcmVxdWVzdC5tYXhPdXRwdXRUb2tlbnMsXG4gICAgICAgICAgdGhpbmtpbmdDb25maWc6IHsgdGhpbmtpbmdCdWRnZXQ6IDAgfVxuICAgICAgICB9XG4gICAgICB9KSxcbiAgICAgIHRocm93OiBmYWxzZVxuICAgIH0pO1xuXG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA8IDIwMCB8fCByZXNwb25zZS5zdGF0dXMgPj0gMzAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IodGhpcy5leHRyYWN0RXJyb3IocmVzcG9uc2UsIFwiR2VtaW5pXCIpKTtcbiAgICB9XG5cbiAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuanNvbjtcbiAgICBjb25zdCB0ZXh0ID0gKGRhdGEuY2FuZGlkYXRlcz8uWzBdPy5jb250ZW50Py5wYXJ0cyA/PyBbXSlcbiAgICAgIC5tYXAoKHBhcnQ6IHsgdGV4dD86IHN0cmluZyB9KSA9PiBwYXJ0LnRleHQgPz8gXCJcIilcbiAgICAgIC5qb2luKFwiXCIpXG4gICAgICAudHJpbSgpO1xuXG4gICAgaWYgKCF0ZXh0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQcm92aWRlciByZXR1cm5lZCBhbiBlbXB0eSByZXNwb25zZS5cIik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHRleHQsXG4gICAgICBpbnB1dFRva2VuczogZGF0YS51c2FnZU1ldGFkYXRhPy5wcm9tcHRUb2tlbkNvdW50LFxuICAgICAgb3V0cHV0VG9rZW5zOiBkYXRhLnVzYWdlTWV0YWRhdGE/LmNhbmRpZGF0ZXNUb2tlbkNvdW50XG4gICAgfTtcbiAgfVxuXG4gIGFzeW5jIHVwbG9hZFNvdXJjZSgpOiBQcm9taXNlPFVwbG9hZGVkRmlsZUluZm8+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJVc2UgJ0FkZCBTb3VyY2UnIGZyb20gdGhlIG5vdGUgdG8gYXR0YWNoIGEgdmF1bHQgZmlsZSBpbmxpbmUuXCIpO1xuICB9XG5cbiAgYXN5bmMgbGlzdFNvdXJjZXMoKTogUHJvbWlzZTxVcGxvYWRlZEZpbGVJbmZvW10+IHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICBhc3luYyBkZWxldGVTb3VyY2UoKTogUHJvbWlzZTx2b2lkPiB7fVxuXG4gIGFzeW5jIHZhbGlkYXRlKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGlmICghdGhpcy5jb25maWcuYXBpS2V5LnRyaW0oKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCByZXF1ZXN0VXJsKHtcbiAgICAgICAgdXJsOiBgaHR0cHM6Ly9nZW5lcmF0aXZlbGFuZ3VhZ2UuZ29vZ2xlYXBpcy5jb20vdjFiZXRhL21vZGVscz9rZXk9JHtlbmNvZGVVUklDb21wb25lbnQodGhpcy5jb25maWcuYXBpS2V5KX1gLFxuICAgICAgICB0aHJvdzogZmFsc2VcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLnN0YXR1cyA+PSAyMDAgJiYgcmVzcG9uc2Uuc3RhdHVzIDwgMzAwO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZW5zdXJlQ29uZmlndXJlZCgpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuY29uZmlnLmFwaUtleS50cmltKCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vIEdlbWluaSBBUEkga2V5IHNldC4gQ2hlY2sgcGx1Z2luIHNldHRpbmdzLlwiKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGV4dHJhY3RFcnJvcihyZXNwb25zZTogUmVxdWVzdFVybFJlc3BvbnNlLCBwcm92aWRlck5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAxIHx8IHJlc3BvbnNlLnN0YXR1cyA9PT0gNDAzKSB7XG4gICAgICByZXR1cm4gYCR7cHJvdmlkZXJOYW1lfSBBUEkga2V5IHJlamVjdGVkLiBDaGVjayBzZXR0aW5ncy5gO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmpzb247XG4gICAgICBjb25zdCBtc2cgPSBkYXRhPy5lcnJvcj8ubWVzc2FnZSA/PyBgJHtwcm92aWRlck5hbWV9IHJlcXVlc3QgZmFpbGVkICgke3Jlc3BvbnNlLnN0YXR1c30pLmA7XG4gICAgICByZXR1cm4gcmVzcG9uc2Uuc3RhdHVzID09PSA0MjkgPyBgJHtwcm92aWRlck5hbWV9IHF1b3RhL3JhdGUgZXJyb3I6ICR7bXNnfWAgOiBtc2c7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHJldHVybiBhc0Vycm9yTWVzc2FnZShlcnJvcikgfHwgYCR7cHJvdmlkZXJOYW1lfSByZXF1ZXN0IGZhaWxlZCAoJHtyZXNwb25zZS5zdGF0dXN9KS5gO1xuICAgIH1cbiAgfVxufVxuIiwgImltcG9ydCB7IHJlcXVlc3RVcmwsIFJlcXVlc3RVcmxSZXNwb25zZSB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHtcbiAgR2VuZXJhdGlvblJlcXVlc3QsXG4gIEdlbmVyYXRpb25SZXNwb25zZSxcbiAgT2xsYW1hUHJvdmlkZXJDb25maWcsXG4gIFVwbG9hZGVkRmlsZUluZm9cbn0gZnJvbSBcIi4uL3R5cGVzXCI7XG5pbXBvcnQgeyB0cnVuY2F0ZVNvdXJjZVRleHQgfSBmcm9tIFwiLi4vc291cmNlVXRpbHNcIjtcbmltcG9ydCB7IEFJUHJvdmlkZXIgfSBmcm9tIFwiLi9iYXNlXCI7XG5cbmludGVyZmFjZSBPbGxhbWFUYWdzUmVzcG9uc2Uge1xuICBtb2RlbHM/OiBBcnJheTx7IG5hbWU/OiBzdHJpbmcgfT47XG59XG5cbmV4cG9ydCBjbGFzcyBPbGxhbWFQcm92aWRlciBpbXBsZW1lbnRzIEFJUHJvdmlkZXIge1xuICByZWFkb25seSBpZCA9IFwib2xsYW1hXCI7XG4gIHJlYWRvbmx5IG5hbWUgPSBcIk9sbGFtYVwiO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgY29uZmlnOiBPbGxhbWFQcm92aWRlckNvbmZpZykge31cblxuICBhc3luYyBnZW5lcmF0ZShyZXF1ZXN0OiBHZW5lcmF0aW9uUmVxdWVzdCk6IFByb21pc2U8R2VuZXJhdGlvblJlc3BvbnNlPiB7XG4gICAgY29uc3QgYmFzZVVybCA9IHRoaXMuY29uZmlnLmJhc2VVcmwucmVwbGFjZSgvXFwvJC8sIFwiXCIpO1xuICAgIGNvbnN0IG1vZGVsID0gcmVxdWVzdC5tb2RlbCB8fCB0aGlzLmNvbmZpZy5kZWZhdWx0TW9kZWw7XG4gICAgY29uc3Qgc291cmNlQmxvY2tzID0gKHJlcXVlc3QucmVzb2x2ZWRTb3VyY2VzID8/IFtdKVxuICAgICAgLmZpbHRlcigoc291cmNlKSA9PiBzb3VyY2UudGV4dENvbnRlbnQpXG4gICAgICAubWFwKChzb3VyY2UpID0+IGBbU09VUkNFOiAke3NvdXJjZS5yZWYubGFiZWx9XVxcbiR7dHJ1bmNhdGVTb3VyY2VUZXh0KHNvdXJjZS50ZXh0Q29udGVudCA/PyBcIlwiKX1cXG5bRU5EIFNPVVJDRV1gKTtcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICB1cmw6IGAke2Jhc2VVcmx9L2FwaS9jaGF0YCxcbiAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICBoZWFkZXJzOiB7IFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIG1vZGVsLFxuICAgICAgICBzdHJlYW06IGZhbHNlLFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgdGVtcGVyYXR1cmU6IHJlcXVlc3QudGVtcGVyYXR1cmUsXG4gICAgICAgICAgbnVtX3ByZWRpY3Q6IHJlcXVlc3QubWF4T3V0cHV0VG9rZW5zXG4gICAgICAgIH0sXG4gICAgICAgIG1lc3NhZ2VzOiBbXG4gICAgICAgICAgeyByb2xlOiBcInN5c3RlbVwiLCBjb250ZW50OiByZXF1ZXN0LnN5c3RlbVByb21wdCB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHJvbGU6IFwidXNlclwiLFxuICAgICAgICAgICAgY29udGVudDogc291cmNlQmxvY2tzLmxlbmd0aFxuICAgICAgICAgICAgICA/IGAke3NvdXJjZUJsb2Nrcy5qb2luKFwiXFxuXFxuXCIpfVxcblxcbiR7cmVxdWVzdC51c2VyTWVzc2FnZX1gXG4gICAgICAgICAgICAgIDogcmVxdWVzdC51c2VyTWVzc2FnZVxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfSksXG4gICAgICB0aHJvdzogZmFsc2VcbiAgICB9KTtcblxuICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPCAyMDAgfHwgcmVzcG9uc2Uuc3RhdHVzID49IDMwMCkge1xuICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gNDA0KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgTW9kZWwgJyR7bW9kZWx9JyBub3QgZm91bmQgaW4gT2xsYW1hLiBDaGVjayBhdmFpbGFibGUgbW9kZWxzIGluIHNldHRpbmdzLmApO1xuICAgICAgfVxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBPbGxhbWEgbm90IHJlYWNoYWJsZSBhdCAke2Jhc2VVcmx9LiBJcyBpdCBydW5uaW5nP2ApO1xuICAgIH1cblxuICAgIGNvbnN0IGRhdGEgPSByZXNwb25zZS5qc29uO1xuICAgIGNvbnN0IHRleHQgPSBkYXRhLm1lc3NhZ2U/LmNvbnRlbnQ/LnRyaW0/LigpID8/IFwiXCI7XG4gICAgaWYgKCF0ZXh0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQcm92aWRlciByZXR1cm5lZCBhbiBlbXB0eSByZXNwb25zZS5cIik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHRleHQsXG4gICAgICBpbnB1dFRva2VuczogZGF0YS5wcm9tcHRfZXZhbF9jb3VudCxcbiAgICAgIG91dHB1dFRva2VuczogZGF0YS5ldmFsX2NvdW50XG4gICAgfTtcbiAgfVxuXG4gIGFzeW5jIHVwbG9hZFNvdXJjZSgpOiBQcm9taXNlPFVwbG9hZGVkRmlsZUluZm8+IHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJPbGxhbWEgZG9lcyBub3Qgc3VwcG9ydCBmaWxlIHVwbG9hZC4gQWRkIGEgdmF1bHRfcGF0aCBzb3VyY2UgaW5zdGVhZC5cIik7XG4gIH1cblxuICBhc3luYyBsaXN0U291cmNlcygpOiBQcm9taXNlPFVwbG9hZGVkRmlsZUluZm9bXT4ge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIGFzeW5jIGRlbGV0ZVNvdXJjZSgpOiBQcm9taXNlPHZvaWQ+IHt9XG5cbiAgYXN5bmMgdmFsaWRhdGUoKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHRhZ3MgPSBhd2FpdCB0aGlzLmZldGNoVGFncygpO1xuICAgICAgcmV0dXJuIEJvb2xlYW4odGFncy5tb2RlbHM/Lmxlbmd0aCk7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgbGlzdE1vZGVscygpOiBQcm9taXNlPHN0cmluZ1tdPiB7XG4gICAgY29uc3QgdGFncyA9IGF3YWl0IHRoaXMuZmV0Y2hUYWdzKCk7XG4gICAgcmV0dXJuICh0YWdzLm1vZGVscyA/PyBbXSkubWFwKChtb2RlbCkgPT4gbW9kZWwubmFtZSA/PyBcIlwiKS5maWx0ZXIoQm9vbGVhbik7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGZldGNoVGFncygpOiBQcm9taXNlPE9sbGFtYVRhZ3NSZXNwb25zZT4ge1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XG4gICAgICB1cmw6IGAke3RoaXMuY29uZmlnLmJhc2VVcmwucmVwbGFjZSgvXFwvJC8sIFwiXCIpfS9hcGkvdGFnc2AsXG4gICAgICB0aHJvdzogZmFsc2VcbiAgICB9KTtcbiAgICBpZiAocmVzcG9uc2Uuc3RhdHVzIDwgMjAwIHx8IHJlc3BvbnNlLnN0YXR1cyA+PSAzMDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgT2xsYW1hIG5vdCByZWFjaGFibGUgYXQgJHt0aGlzLmNvbmZpZy5iYXNlVXJsfS4gSXMgaXQgcnVubmluZz9gKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3BvbnNlLmpzb24gYXMgT2xsYW1hVGFnc1Jlc3BvbnNlO1xuICB9XG59XG4iLCAiaW1wb3J0IHsgQXBwLCBUQWJzdHJhY3RGaWxlLCBURmlsZSwgbm9ybWFsaXplUGF0aCB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHsgUHJvdmlkZXJJRCwgUmVzb2x2ZWRTb3VyY2UsIFNvdXJjZVJlZiB9IGZyb20gXCIuL3R5cGVzXCI7XG5cbmNvbnN0IFRFWFRfRVhURU5TSU9OUyA9IG5ldyBTZXQoW1widHh0XCIsIFwibWRcIiwgXCJtYXJrZG93blwiLCBcImpzb25cIiwgXCJ5YW1sXCIsIFwieW1sXCIsIFwiY3N2XCJdKTtcblxuZnVuY3Rpb24gZ2V0VmF1bHRGaWxlKGFwcDogQXBwLCB2YXVsdFBhdGg6IHN0cmluZyk6IFRGaWxlIHtcbiAgY29uc3Qgbm9ybWFsaXplZCA9IG5vcm1hbGl6ZVBhdGgodmF1bHRQYXRoKTtcbiAgY29uc3QgZmlsZSA9IGFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgobm9ybWFsaXplZCk7XG4gIGlmICghKGZpbGUgaW5zdGFuY2VvZiBURmlsZSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFNvdXJjZSBmaWxlIG5vdCBmb3VuZCBpbiB2YXVsdDogJHt2YXVsdFBhdGh9YCk7XG4gIH1cbiAgcmV0dXJuIGZpbGU7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWFkVmF1bHRUZXh0U291cmNlKGFwcDogQXBwLCB2YXVsdFBhdGg6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IGZpbGUgPSBnZXRWYXVsdEZpbGUoYXBwLCB2YXVsdFBhdGgpO1xuICBjb25zdCBleHRlbnNpb24gPSBmaWxlLmV4dGVuc2lvbi50b0xvd2VyQ2FzZSgpO1xuICBpZiAoIVRFWFRfRVhURU5TSU9OUy5oYXMoZXh0ZW5zaW9uKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgVGV4dCBleHRyYWN0aW9uIGlzIG9ubHkgc3VwcG9ydGVkIGZvciB0ZXh0IGZpbGVzLiBBZGQgYSAudHh0IGNvbXBhbmlvbiBmb3IgJyR7dmF1bHRQYXRofScuYCk7XG4gIH1cbiAgcmV0dXJuIGFwcC52YXVsdC5jYWNoZWRSZWFkKGZpbGUpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVhZFZhdWx0QmluYXJ5U291cmNlKGFwcDogQXBwLCB2YXVsdFBhdGg6IHN0cmluZyk6IFByb21pc2U8QXJyYXlCdWZmZXI+IHtcbiAgY29uc3QgZmlsZSA9IGdldFZhdWx0RmlsZShhcHAsIHZhdWx0UGF0aCk7XG4gIHJldHVybiBhcHAudmF1bHQucmVhZEJpbmFyeShmaWxlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFycmF5QnVmZmVyVG9CYXNlNjQoYnVmZmVyOiBBcnJheUJ1ZmZlcik6IHN0cmluZyB7XG4gIGxldCBiaW5hcnkgPSBcIlwiO1xuICBjb25zdCBieXRlcyA9IG5ldyBVaW50OEFycmF5KGJ1ZmZlcik7XG4gIGNvbnN0IGNodW5rU2l6ZSA9IDB4ODAwMDtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBieXRlcy5sZW5ndGg7IGkgKz0gY2h1bmtTaXplKSB7XG4gICAgY29uc3QgY2h1bmsgPSBieXRlcy5zdWJhcnJheShpLCBpICsgY2h1bmtTaXplKTtcbiAgICBiaW5hcnkgKz0gU3RyaW5nLmZyb21DaGFyQ29kZSguLi5jaHVuayk7XG4gIH1cbiAgcmV0dXJuIGJ0b2EoYmluYXJ5KTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlc29sdmVTb3VyY2VzRm9yUmVxdWVzdChcbiAgYXBwOiBBcHAsXG4gIHNvdXJjZXM6IFNvdXJjZVJlZltdLFxuICBwcm92aWRlcklkOiBQcm92aWRlcklEXG4pOiBQcm9taXNlPFJlc29sdmVkU291cmNlW10+IHtcbiAgY29uc3QgcmVzb2x2ZWQ6IFJlc29sdmVkU291cmNlW10gPSBbXTtcbiAgZm9yIChjb25zdCByZWYgb2Ygc291cmNlcykge1xuICAgIGlmIChwcm92aWRlcklkID09PSBcImFudGhyb3BpY1wiIHx8IChwcm92aWRlcklkID09PSBcImdlbWluaVwiICYmIHJlZi5taW1lX3R5cGUgPT09IFwiYXBwbGljYXRpb24vcGRmXCIpKSB7XG4gICAgICBjb25zdCBidWZmZXIgPSBhd2FpdCByZWFkVmF1bHRCaW5hcnlTb3VyY2UoYXBwLCByZWYudmF1bHRfcGF0aCk7XG4gICAgICByZXNvbHZlZC5wdXNoKHsgcmVmLCBiYXNlNjREYXRhOiBhcnJheUJ1ZmZlclRvQmFzZTY0KGJ1ZmZlcikgfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgY29uc3QgdGV4dCA9IGF3YWl0IHJlYWRWYXVsdFRleHRTb3VyY2UoYXBwLCByZWYudmF1bHRfcGF0aCk7XG4gICAgcmVzb2x2ZWQucHVzaCh7IHJlZiwgdGV4dENvbnRlbnQ6IHRleHQgfSk7XG4gIH1cbiAgcmV0dXJuIHJlc29sdmVkO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdHJ1bmNhdGVTb3VyY2VUZXh0KHRleHQ6IHN0cmluZywgbWF4Q2hhcnMgPSA0MDAwKTogc3RyaW5nIHtcbiAgcmV0dXJuIHRleHQubGVuZ3RoIDw9IG1heENoYXJzID8gdGV4dCA6IHRleHQuc2xpY2UoMCwgbWF4Q2hhcnMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVzY3JpYmVTb3VyY2VSZWYocmVmOiBTb3VyY2VSZWYpOiBzdHJpbmcge1xuICByZXR1cm4gcmVmLnZhdWx0X3BhdGg7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaXN0VmF1bHRDYW5kaWRhdGVGaWxlcyhhcHA6IEFwcCk6IFRGaWxlW10ge1xuICByZXR1cm4gYXBwLnZhdWx0XG4gICAgLmdldEZpbGVzKClcbiAgICAuZmlsdGVyKChmaWxlKSA9PiBbXCJwZGZcIiwgXCJ0eHRcIiwgXCJtZFwiLCBcIm1hcmtkb3duXCJdLmluY2x1ZGVzKGZpbGUuZXh0ZW5zaW9uLnRvTG93ZXJDYXNlKCkpKVxuICAgIC5zb3J0KChhLCBiKSA9PiBhLnBhdGgubG9jYWxlQ29tcGFyZShiLnBhdGgpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzVEZpbGUoZmlsZTogVEFic3RyYWN0RmlsZSB8IG51bGwpOiBmaWxlIGlzIFRGaWxlIHtcbiAgcmV0dXJuIEJvb2xlYW4oZmlsZSkgJiYgZmlsZSBpbnN0YW5jZW9mIFRGaWxlO1xufVxuIiwgImltcG9ydCB7IHJlcXVlc3RVcmwsIFJlcXVlc3RVcmxSZXNwb25zZSB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHtcbiAgR2VuZXJhdGlvblJlcXVlc3QsXG4gIEdlbmVyYXRpb25SZXNwb25zZSxcbiAgT3BlbkFJUHJvdmlkZXJDb25maWcsXG4gIFVwbG9hZGVkRmlsZUluZm9cbn0gZnJvbSBcIi4uL3R5cGVzXCI7XG5pbXBvcnQgeyB0cnVuY2F0ZVNvdXJjZVRleHQgfSBmcm9tIFwiLi4vc291cmNlVXRpbHNcIjtcbmltcG9ydCB7IEFJUHJvdmlkZXIgfSBmcm9tIFwiLi9iYXNlXCI7XG5cbmV4cG9ydCBjbGFzcyBPcGVuQUlQcm92aWRlciBpbXBsZW1lbnRzIEFJUHJvdmlkZXIge1xuICByZWFkb25seSBpZCA9IFwib3BlbmFpXCI7XG4gIHJlYWRvbmx5IG5hbWUgPSBcIk9wZW5BSVwiO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgY29uZmlnOiBPcGVuQUlQcm92aWRlckNvbmZpZykge31cblxuICBhc3luYyBnZW5lcmF0ZShyZXF1ZXN0OiBHZW5lcmF0aW9uUmVxdWVzdCk6IFByb21pc2U8R2VuZXJhdGlvblJlc3BvbnNlPiB7XG4gICAgdGhpcy5lbnN1cmVDb25maWd1cmVkKCk7XG4gICAgY29uc3QgYmFzZVVybCA9IHRoaXMuY29uZmlnLmJhc2VVcmwucmVwbGFjZSgvXFwvJC8sIFwiXCIpO1xuICAgIGNvbnN0IG1vZGVsID0gcmVxdWVzdC5tb2RlbCB8fCB0aGlzLmNvbmZpZy5kZWZhdWx0TW9kZWw7XG4gICAgY29uc3Qgc291cmNlQmxvY2tzID0gKHJlcXVlc3QucmVzb2x2ZWRTb3VyY2VzID8/IFtdKVxuICAgICAgLmZpbHRlcigoc291cmNlKSA9PiBzb3VyY2UudGV4dENvbnRlbnQpXG4gICAgICAubWFwKChzb3VyY2UpID0+IGBbU09VUkNFOiAke3NvdXJjZS5yZWYubGFiZWx9XVxcbiR7dHJ1bmNhdGVTb3VyY2VUZXh0KHNvdXJjZS50ZXh0Q29udGVudCA/PyBcIlwiKX1cXG5bRU5EIFNPVVJDRV1gKTtcblxuICAgIGNvbnN0IGJvZHk6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge1xuICAgICAgbW9kZWwsXG4gICAgICBtYXhfdG9rZW5zOiByZXF1ZXN0Lm1heE91dHB1dFRva2VucyxcbiAgICAgIG1lc3NhZ2VzOiBbXG4gICAgICAgIHsgcm9sZTogXCJzeXN0ZW1cIiwgY29udGVudDogcmVxdWVzdC5zeXN0ZW1Qcm9tcHQgfSxcbiAgICAgICAge1xuICAgICAgICAgIHJvbGU6IFwidXNlclwiLFxuICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdHlwZTogXCJ0ZXh0XCIsXG4gICAgICAgICAgICAgIHRleHQ6IHNvdXJjZUJsb2Nrcy5sZW5ndGhcbiAgICAgICAgICAgICAgICA/IGAke3NvdXJjZUJsb2Nrcy5qb2luKFwiXFxuXFxuXCIpfVxcblxcbiR7cmVxdWVzdC51c2VyTWVzc2FnZX1gXG4gICAgICAgICAgICAgICAgOiByZXF1ZXN0LnVzZXJNZXNzYWdlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICBdXG4gICAgfTtcblxuICAgIGlmICghbW9kZWwuc3RhcnRzV2l0aChcImdwdC01XCIpKSB7XG4gICAgICBib2R5LnRlbXBlcmF0dXJlID0gcmVxdWVzdC50ZW1wZXJhdHVyZTtcbiAgICB9XG5cbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3RVcmwoe1xuICAgICAgdXJsOiBgJHtiYXNlVXJsfS9jaGF0L2NvbXBsZXRpb25zYCxcbiAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgICBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7dGhpcy5jb25maWcuYXBpS2V5fWBcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShib2R5KSxcbiAgICAgIHRocm93OiBmYWxzZVxuICAgIH0pO1xuXG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA8IDIwMCB8fCByZXNwb25zZS5zdGF0dXMgPj0gMzAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IodGhpcy5leHRyYWN0RXJyb3IocmVzcG9uc2UpKTtcbiAgICB9XG5cbiAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuanNvbjtcbiAgICBjb25zdCB0ZXh0ID0gZGF0YS5jaG9pY2VzPy5bMF0/Lm1lc3NhZ2U/LmNvbnRlbnQ/LnRyaW0/LigpID8/IFwiXCI7XG4gICAgaWYgKCF0ZXh0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQcm92aWRlciByZXR1cm5lZCBhbiBlbXB0eSByZXNwb25zZS5cIik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHRleHQsXG4gICAgICBpbnB1dFRva2VuczogZGF0YS51c2FnZT8ucHJvbXB0X3Rva2VucyxcbiAgICAgIG91dHB1dFRva2VuczogZGF0YS51c2FnZT8uY29tcGxldGlvbl90b2tlbnNcbiAgICB9O1xuICB9XG5cbiAgYXN5bmMgdXBsb2FkU291cmNlKCk6IFByb21pc2U8VXBsb2FkZWRGaWxlSW5mbz4ge1xuICAgIHRocm93IG5ldyBFcnJvcihcIlRoaXMgcHJvdmlkZXIgZG9lcyBub3Qgc3VwcG9ydCBmaWxlIHVwbG9hZC4gVXNlIHZhdWx0X3BhdGggaW5zdGVhZC5cIik7XG4gIH1cblxuICBhc3luYyBsaXN0U291cmNlcygpOiBQcm9taXNlPFVwbG9hZGVkRmlsZUluZm9bXT4ge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIGFzeW5jIGRlbGV0ZVNvdXJjZSgpOiBQcm9taXNlPHZvaWQ+IHt9XG5cbiAgYXN5bmMgdmFsaWRhdGUoKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgaWYgKCF0aGlzLmNvbmZpZy5hcGlLZXkudHJpbSgpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJlcXVlc3RVcmwoe1xuICAgICAgICB1cmw6IGAke3RoaXMuY29uZmlnLmJhc2VVcmwucmVwbGFjZSgvXFwvJC8sIFwiXCIpfS9tb2RlbHNgLFxuICAgICAgICBoZWFkZXJzOiB7IEF1dGhvcml6YXRpb246IGBCZWFyZXIgJHt0aGlzLmNvbmZpZy5hcGlLZXl9YCB9LFxuICAgICAgICB0aHJvdzogZmFsc2VcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLnN0YXR1cyA+PSAyMDAgJiYgcmVzcG9uc2Uuc3RhdHVzIDwgMzAwO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZW5zdXJlQ29uZmlndXJlZCgpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuY29uZmlnLmFwaUtleS50cmltKCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIk5vIE9wZW5BSSBBUEkga2V5IHNldC4gQ2hlY2sgcGx1Z2luIHNldHRpbmdzLlwiKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGV4dHJhY3RFcnJvcihyZXNwb25zZTogUmVxdWVzdFVybFJlc3BvbnNlKTogc3RyaW5nIHtcbiAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0MDEgfHwgcmVzcG9uc2Uuc3RhdHVzID09PSA0MDMpIHtcbiAgICAgIHJldHVybiBcIk9wZW5BSSBBUEkga2V5IHJlamVjdGVkLiBDaGVjayBzZXR0aW5ncy5cIjtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGRhdGEgPSByZXNwb25zZS5qc29uO1xuICAgICAgY29uc3QgbXNnID0gZGF0YT8uZXJyb3I/Lm1lc3NhZ2UgPz8gYE9wZW5BSSByZXF1ZXN0IGZhaWxlZCAoJHtyZXNwb25zZS5zdGF0dXN9KS5gO1xuICAgICAgcmV0dXJuIHJlc3BvbnNlLnN0YXR1cyA9PT0gNDI5ID8gYE9wZW5BSSBxdW90YS9yYXRlIGVycm9yOiAke21zZ31gIDogbXNnO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIGBPcGVuQUkgcmVxdWVzdCBmYWlsZWQgKCR7cmVzcG9uc2Uuc3RhdHVzfSkuYDtcbiAgICB9XG4gIH1cbn1cbiIsICJpbXBvcnQgeyBQcm92aWRlcklELCBTeWJ5bFNldHRpbmdzIH0gZnJvbSBcIi4uL3R5cGVzXCI7XG5pbXBvcnQgeyBBSVByb3ZpZGVyIH0gZnJvbSBcIi4vYmFzZVwiO1xuaW1wb3J0IHsgQW50aHJvcGljUHJvdmlkZXIgfSBmcm9tIFwiLi9hbnRocm9waWNcIjtcbmltcG9ydCB7IEdlbWluaVByb3ZpZGVyIH0gZnJvbSBcIi4vZ2VtaW5pXCI7XG5pbXBvcnQgeyBPbGxhbWFQcm92aWRlciB9IGZyb20gXCIuL29sbGFtYVwiO1xuaW1wb3J0IHsgT3BlbkFJUHJvdmlkZXIgfSBmcm9tIFwiLi9vcGVuYWlcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldFByb3ZpZGVyKHNldHRpbmdzOiBTeWJ5bFNldHRpbmdzLCBvdmVycmlkZUlkPzogUHJvdmlkZXJJRCk6IEFJUHJvdmlkZXIge1xuICBjb25zdCBpZCA9IG92ZXJyaWRlSWQgPz8gc2V0dGluZ3MuYWN0aXZlUHJvdmlkZXI7XG4gIHN3aXRjaCAoaWQpIHtcbiAgICBjYXNlIFwiZ2VtaW5pXCI6XG4gICAgICByZXR1cm4gbmV3IEdlbWluaVByb3ZpZGVyKHNldHRpbmdzLnByb3ZpZGVycy5nZW1pbmkpO1xuICAgIGNhc2UgXCJvcGVuYWlcIjpcbiAgICAgIHJldHVybiBuZXcgT3BlbkFJUHJvdmlkZXIoc2V0dGluZ3MucHJvdmlkZXJzLm9wZW5haSk7XG4gICAgY2FzZSBcImFudGhyb3BpY1wiOlxuICAgICAgcmV0dXJuIG5ldyBBbnRocm9waWNQcm92aWRlcihzZXR0aW5ncy5wcm92aWRlcnMuYW50aHJvcGljKTtcbiAgICBjYXNlIFwib2xsYW1hXCI6XG4gICAgICByZXR1cm4gbmV3IE9sbGFtYVByb3ZpZGVyKHNldHRpbmdzLnByb3ZpZGVycy5vbGxhbWEpO1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gcHJvdmlkZXI6ICR7aWR9YCk7XG4gIH1cbn1cbiIsICJpbXBvcnQgeyBOb3RpY2UsIFRGaWxlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgdHlwZSBTeWJ5bFBsdWdpbiBmcm9tIFwiLi9tYWluXCI7XG5pbXBvcnQgeyBnZXRTZWxlY3Rpb24sIGluc2VydEJlbG93U2VsZWN0aW9uIH0gZnJvbSBcIi4vZWRpdG9yXCI7XG5pbXBvcnQgeyByZW1vdmVTb3VyY2VSZWYsIHVwc2VydFNvdXJjZVJlZiwgd3JpdGVGcm9udE1hdHRlcktleSB9IGZyb20gXCIuL2Zyb250bWF0dGVyXCI7XG5pbXBvcnQge1xuICBmb3JtYXRBc2tPcmFjbGUsXG4gIGZvcm1hdERlY2xhcmVBY3Rpb24sXG4gIGZvcm1hdEV4cGFuZFNjZW5lLFxuICBmb3JtYXRJbnRlcnByZXRPcmFjbGUsXG4gIGZvcm1hdFN0YXJ0U2NlbmUsXG4gIGZvcm1hdFN1Z2dlc3RDb25zZXF1ZW5jZSxcbiAgTG9uZWxvZ0Zvcm1hdE9wdGlvbnNcbn0gZnJvbSBcIi4vbG9uZWxvZy9mb3JtYXR0ZXJcIjtcbmltcG9ydCB7IHBhcnNlTG9uZWxvZ0NvbnRleHQsIHNlcmlhbGl6ZUNvbnRleHQgfSBmcm9tIFwiLi9sb25lbG9nL3BhcnNlclwiO1xuaW1wb3J0IHsgTWFuYWdlU291cmNlc01vZGFsLCBvcGVuSW5wdXRNb2RhbCwgcGlja1NvdXJjZVJlZiwgcGlja1ZhdWx0RmlsZSB9IGZyb20gXCIuL21vZGFsc1wiO1xuaW1wb3J0IHsgcmVzb2x2ZVNvdXJjZXNGb3JSZXF1ZXN0IH0gZnJvbSBcIi4vc291cmNlVXRpbHNcIjtcbmltcG9ydCB7IE5vdGVGcm9udE1hdHRlciwgU291cmNlUmVmLCBTeWJ5bFNldHRpbmdzIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuZnVuY3Rpb24gaXNMb25lbG9nQWN0aXZlKHNldHRpbmdzOiBTeWJ5bFNldHRpbmdzLCBmbTogTm90ZUZyb250TWF0dGVyKTogYm9vbGVhbiB7XG4gIHJldHVybiBmbS5sb25lbG9nID8/IHNldHRpbmdzLmxvbmVsb2dNb2RlO1xufVxuXG5mdW5jdGlvbiBsb25lbG9nT3B0cyhzZXR0aW5nczogU3lieWxTZXR0aW5ncyk6IExvbmVsb2dGb3JtYXRPcHRpb25zIHtcbiAgcmV0dXJuIHsgd3JhcEluQ29kZUJsb2NrOiBzZXR0aW5ncy5sb25lbG9nV3JhcENvZGVCbG9jayA/PyB0cnVlIH07XG59XG5cbmZ1bmN0aW9uIGdlbmVyaWNCbG9ja3F1b3RlKGxhYmVsOiBzdHJpbmcsIHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBgPiBbJHtsYWJlbH1dICR7dGV4dC50cmltKCkucmVwbGFjZSgvXFxuL2csIFwiXFxuPiBcIil9YDtcbn1cblxuZnVuY3Rpb24gaW5mZXJNaW1lVHlwZShmaWxlOiBURmlsZSB8IEZpbGUpOiBzdHJpbmcge1xuICBjb25zdCBuYW1lID0gXCJwYXRoXCIgaW4gZmlsZSA/IGZpbGUucGF0aCA6IGZpbGUubmFtZTtcbiAgcmV0dXJuIG5hbWUudG9Mb3dlckNhc2UoKS5lbmRzV2l0aChcIi5wZGZcIikgPyBcImFwcGxpY2F0aW9uL3BkZlwiIDogXCJ0ZXh0L3BsYWluXCI7XG59XG5cbmZ1bmN0aW9uIHRvZGF5SXNvRGF0ZSgpOiBzdHJpbmcge1xuICByZXR1cm4gbmV3IERhdGUoKS50b0lTT1N0cmluZygpLnNsaWNlKDAsIDEwKTtcbn1cblxuZnVuY3Rpb24gcGFyc2VMb25lbG9nT3JhY2xlUmVzcG9uc2UodGV4dDogc3RyaW5nKTogeyByZXN1bHQ6IHN0cmluZzsgaW50ZXJwcmV0YXRpb246IHN0cmluZyB9IHtcbiAgY29uc3QgbGluZXMgPSB0ZXh0XG4gICAgLnJlcGxhY2UoL14+XFxzKi9nbSwgXCJcIilcbiAgICAuc3BsaXQoXCJcXG5cIilcbiAgICAubWFwKChsaW5lKSA9PiBsaW5lLnRyaW0oKSlcbiAgICAuZmlsdGVyKEJvb2xlYW4pO1xuICBjb25zdCByZXN1bHQgPSBsaW5lcy5maW5kKChsaW5lKSA9PiBsaW5lLnN0YXJ0c1dpdGgoXCItPlwiKSk/LnJlcGxhY2UoL14tPlxccyovLCBcIlwiKSA/PyBcIlVuY2xlYXJcIjtcbiAgY29uc3QgaW50ZXJwcmV0YXRpb24gPSBsaW5lcy5maWx0ZXIoKGxpbmUpID0+ICFsaW5lLnN0YXJ0c1dpdGgoXCItPlwiKSkuam9pbihcIlxcblwiKTtcbiAgcmV0dXJuIHsgcmVzdWx0LCBpbnRlcnByZXRhdGlvbiB9O1xufVxuXG5hc3luYyBmdW5jdGlvbiBhZGRTb3VyY2VUb05vdGUocGx1Z2luOiBTeWJ5bFBsdWdpbiwgZmlsZTogVEZpbGUpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgdmF1bHRGaWxlID0gYXdhaXQgcGlja1ZhdWx0RmlsZShwbHVnaW4uYXBwLCBcIkNob29zZSBhIHZhdWx0IGZpbGVcIik7XG4gIGlmICghdmF1bHRGaWxlKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHJlZjogU291cmNlUmVmID0ge1xuICAgIGxhYmVsOiB2YXVsdEZpbGUuYmFzZW5hbWUsXG4gICAgbWltZV90eXBlOiBpbmZlck1pbWVUeXBlKHZhdWx0RmlsZSksXG4gICAgdmF1bHRfcGF0aDogdmF1bHRGaWxlLnBhdGhcbiAgfTtcbiAgYXdhaXQgdXBzZXJ0U291cmNlUmVmKHBsdWdpbi5hcHAsIGZpbGUsIHJlZik7XG4gIG5ldyBOb3RpY2UoYFNvdXJjZSBhZGRlZDogJHt2YXVsdEZpbGUucGF0aH1gKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gbWFuYWdlU291cmNlcyhwbHVnaW46IFN5YnlsUGx1Z2luKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IGNvbnRleHQgPSBhd2FpdCBwbHVnaW4uZ2V0QWN0aXZlTm90ZUNvbnRleHQoKTtcbiAgaWYgKCFjb250ZXh0Py52aWV3LmZpbGUpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgbmV3IE1hbmFnZVNvdXJjZXNNb2RhbChcbiAgICBwbHVnaW4uYXBwLFxuICAgIGNvbnRleHQuZm0uc291cmNlcyA/PyBbXSxcbiAgICBhc3luYyAocmVmKSA9PiByZW1vdmVTb3VyY2VSZWYocGx1Z2luLmFwcCwgY29udGV4dC52aWV3LmZpbGUhLCByZWYpXG4gICkub3BlbigpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBydW5HZW5lcmF0aW9uKFxuICBwbHVnaW46IFN5YnlsUGx1Z2luLFxuICB1c2VyTWVzc2FnZTogc3RyaW5nLFxuICBmb3JtYXR0ZXI6ICh0ZXh0OiBzdHJpbmcsIGZtOiBOb3RlRnJvbnRNYXR0ZXIpID0+IHN0cmluZyxcbiAgbWF4T3V0cHV0VG9rZW5zID0gNTEyLFxuICBwbGFjZW1lbnQ/OiBcImN1cnNvclwiIHwgXCJlbmQtb2Ytbm90ZVwiIHwgXCJiZWxvdy1zZWxlY3Rpb25cIlxuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IGNvbnRleHQgPSBhd2FpdCBwbHVnaW4uZ2V0QWN0aXZlTm90ZUNvbnRleHQoKTtcbiAgaWYgKCFjb250ZXh0KSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHBsdWdpbi5yZXF1ZXN0R2VuZXJhdGlvbihjb250ZXh0LmZtLCBjb250ZXh0Lm5vdGVCb2R5LCB1c2VyTWVzc2FnZSwgbWF4T3V0cHV0VG9rZW5zKTtcbiAgICBjb25zdCBmb3JtYXR0ZWQgPSBmb3JtYXR0ZXIocmVzcG9uc2UudGV4dCwgY29udGV4dC5mbSk7XG4gICAgaWYgKHBsYWNlbWVudCA9PT0gXCJiZWxvdy1zZWxlY3Rpb25cIikge1xuICAgICAgaW5zZXJ0QmVsb3dTZWxlY3Rpb24oY29udGV4dC52aWV3LmVkaXRvciwgZm9ybWF0dGVkKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGx1Z2luLmluc2VydFRleHQoY29udGV4dC52aWV3LCBmb3JtYXR0ZWQsIHBsYWNlbWVudCk7XG4gICAgfVxuICAgIHBsdWdpbi5tYXliZUluc2VydFRva2VuQ29tbWVudChjb250ZXh0LnZpZXcsIHJlc3BvbnNlKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBuZXcgTm90aWNlKGBTeWJ5bCBlcnJvcjogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XG4gICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyQWxsQ29tbWFuZHMocGx1Z2luOiBTeWJ5bFBsdWdpbik6IHZvaWQge1xuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6aW5zZXJ0LWZyb250bWF0dGVyXCIsXG4gICAgbmFtZTogXCJJbnNlcnQgTm90ZSBGcm9udG1hdHRlclwiLFxuICAgIGNhbGxiYWNrOiBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjb250ZXh0ID0gYXdhaXQgcGx1Z2luLmdldEFjdGl2ZU5vdGVDb250ZXh0KCk7XG4gICAgICBpZiAoIWNvbnRleHQ/LnZpZXcuZmlsZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCB2YWx1ZXMgPSBhd2FpdCBvcGVuSW5wdXRNb2RhbChwbHVnaW4uYXBwLCBcIkluc2VydCBTeWJ5bCBGcm9udG1hdHRlclwiLCBbXG4gICAgICAgIHsga2V5OiBcInJ1bGVzZXRcIiwgbGFiZWw6IFwiR2FtZSAvIHJ1bGVzZXRcIiwgcGxhY2Vob2xkZXI6IFwiSXJvbnN3b3JuXCIgfSxcbiAgICAgICAgeyBrZXk6IFwicGNzXCIsIGxhYmVsOiBcIlBDXCIsIG9wdGlvbmFsOiB0cnVlLCBwbGFjZWhvbGRlcjogXCJLaXJhIFZvc3MsIGRhbmdlcm91cyByYW5rLCB2b3c6IHJlY292ZXIgdGhlIHJlbGljXCIgfSxcbiAgICAgICAgeyBrZXk6IFwidG9uZVwiLCBsYWJlbDogXCJUb25lXCIsIG9wdGlvbmFsOiB0cnVlLCBwbGFjZWhvbGRlcjogXCJHcml0dHksIGhvcGVmdWxcIiB9LFxuICAgICAgICB7IGtleTogXCJsYW5ndWFnZVwiLCBsYWJlbDogXCJMYW5ndWFnZVwiLCBvcHRpb25hbDogdHJ1ZSwgcGxhY2Vob2xkZXI6IFwiTGVhdmUgYmxhbmsgZm9yIGF1dG8tZGV0ZWN0XCIgfVxuICAgICAgXSk7XG4gICAgICBpZiAoIXZhbHVlcykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAoIXZhbHVlcy5ydWxlc2V0KSB7XG4gICAgICAgIG5ldyBOb3RpY2UoXCJSdWxlc2V0IGlzIHJlcXVpcmVkLlwiKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgYXdhaXQgcGx1Z2luLmFwcC5maWxlTWFuYWdlci5wcm9jZXNzRnJvbnRNYXR0ZXIoY29udGV4dC52aWV3LmZpbGUsIChmbSkgPT4ge1xuICAgICAgICBmbVtcInJ1bGVzZXRcIl0gPSB2YWx1ZXMucnVsZXNldDtcbiAgICAgICAgZm1bXCJwcm92aWRlclwiXSA9IGZtW1wicHJvdmlkZXJcIl0gPz8gcGx1Z2luLnNldHRpbmdzLmFjdGl2ZVByb3ZpZGVyO1xuICAgICAgICBmbVtcIm9yYWNsZV9tb2RlXCJdID0gZm1bXCJvcmFjbGVfbW9kZVwiXSA/PyBcInllcy1ub1wiO1xuICAgICAgICBmbVtcImxvbmVsb2dcIl0gPSBmbVtcImxvbmVsb2dcIl0gPz8gcGx1Z2luLnNldHRpbmdzLmxvbmVsb2dNb2RlO1xuICAgICAgICBmbVtcInNjZW5lX2NvdW50ZXJcIl0gPSBmbVtcInNjZW5lX2NvdW50ZXJcIl0gPz8gMTtcbiAgICAgICAgZm1bXCJzZXNzaW9uX251bWJlclwiXSA9IGZtW1wic2Vzc2lvbl9udW1iZXJcIl0gPz8gMTtcbiAgICAgICAgZm1bXCJnYW1lX2NvbnRleHRcIl0gPSBmbVtcImdhbWVfY29udGV4dFwiXSA/PyBcIlwiO1xuICAgICAgICBmbVtcInNjZW5lX2NvbnRleHRcIl0gPSBmbVtcInNjZW5lX2NvbnRleHRcIl0gPz8gXCJcIjtcbiAgICAgICAgaWYgKHZhbHVlcy5wY3MpIGZtW1wicGNzXCJdID0gdmFsdWVzLnBjcztcbiAgICAgICAgaWYgKHZhbHVlcy50b25lKSBmbVtcInRvbmVcIl0gPSB2YWx1ZXMudG9uZTtcbiAgICAgICAgaWYgKHZhbHVlcy5sYW5ndWFnZSkgZm1bXCJsYW5ndWFnZVwiXSA9IHZhbHVlcy5sYW5ndWFnZTtcbiAgICAgIH0pO1xuICAgICAgbmV3IE5vdGljZShcIlN5YnlsIGZyb250bWF0dGVyIGluc2VydGVkLlwiKTtcbiAgICB9XG4gIH0pO1xuXG4gIHBsdWdpbi5hZGRDb21tYW5kKHtcbiAgICBpZDogXCJzeWJ5bDpkaWdlc3Qtc291cmNlXCIsXG4gICAgbmFtZTogXCJEaWdlc3QgU291cmNlIGludG8gR2FtZSBDb250ZXh0XCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGNvbnRleHQgPSBhd2FpdCBwbHVnaW4uZ2V0QWN0aXZlTm90ZUNvbnRleHQoKTtcbiAgICAgIGlmICghY29udGV4dD8udmlldy5maWxlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHZhdWx0RmlsZSA9IGF3YWl0IHBpY2tWYXVsdEZpbGUocGx1Z2luLmFwcCwgXCJDaG9vc2UgYSBzb3VyY2UgZmlsZSB0byBkaWdlc3RcIik7XG4gICAgICBpZiAoIXZhdWx0RmlsZSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCByZWY6IFNvdXJjZVJlZiA9IHtcbiAgICAgICAgbGFiZWw6IHZhdWx0RmlsZS5iYXNlbmFtZSxcbiAgICAgICAgbWltZV90eXBlOiBpbmZlck1pbWVUeXBlKHZhdWx0RmlsZSksXG4gICAgICAgIHZhdWx0X3BhdGg6IHZhdWx0RmlsZS5wYXRoXG4gICAgICB9O1xuICAgICAgY29uc3QgcHJvdmlkZXJJZCA9IGNvbnRleHQuZm0ucHJvdmlkZXIgPz8gcGx1Z2luLnNldHRpbmdzLmFjdGl2ZVByb3ZpZGVyO1xuICAgICAgbGV0IHJlc29sdmVkU291cmNlcztcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc29sdmVkU291cmNlcyA9IGF3YWl0IHJlc29sdmVTb3VyY2VzRm9yUmVxdWVzdChwbHVnaW4uYXBwLCBbcmVmXSwgcHJvdmlkZXJJZCk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBuZXcgTm90aWNlKGBDYW5ub3QgcmVhZCBzb3VyY2U6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCBydWxlc2V0ID0gY29udGV4dC5mbS5ydWxlc2V0ID8/IFwidGhlIGdhbWVcIjtcbiAgICAgIGNvbnN0IGRpZ2VzdFByb21wdCA9IGBEaXN0aWxsIHRoZSBmb2xsb3dpbmcgc291cmNlIG1hdGVyaWFsIGZvciB1c2UgaW4gYSBzb2xvIHRhYmxldG9wIFJQRyBzZXNzaW9uIG9mIFwiJHtydWxlc2V0fVwiLlxuXG5FeHRyYWN0IGFuZCBjb25kZW5zZSBpbnRvIGEgY29tcGFjdCByZWZlcmVuY2U6XG4tIENvcmUgcnVsZXMgYW5kIG1lY2hhbmljcyByZWxldmFudCB0byBwbGF5XG4tIEtleSBmYWN0aW9ucywgbG9jYXRpb25zLCBjaGFyYWN0ZXJzLCBhbmQgd29ybGQgZmFjdHNcbi0gVG9uZSwgZ2VucmUsIGFuZCBzZXR0aW5nIGNvbnZlbnRpb25zXG4tIEFueSB0YWJsZXMsIG1vdmUgbGlzdHMsIG9yIHJhbmRvbSBnZW5lcmF0b3JzXG5cbkJlIGNvbmNpc2UgYW5kIHNwZWNpZmljLiBQcmVzZXJ2ZSBnYW1lLW1lY2hhbmljYWwgZGV0YWlscy4gT21pdCBmbGF2b3IgcHJvc2UgYW5kIGV4YW1wbGVzLmA7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHBsdWdpbi5yZXF1ZXN0UmF3R2VuZXJhdGlvbihcbiAgICAgICAgICBjb250ZXh0LmZtLFxuICAgICAgICAgIGRpZ2VzdFByb21wdCxcbiAgICAgICAgICAyMDAwLFxuICAgICAgICAgIHJlc29sdmVkU291cmNlc1xuICAgICAgICApO1xuICAgICAgICBhd2FpdCBwbHVnaW4uYXBwLmZpbGVNYW5hZ2VyLnByb2Nlc3NGcm9udE1hdHRlcihjb250ZXh0LnZpZXcuZmlsZSwgKGZtKSA9PiB7XG4gICAgICAgICAgZm1bXCJnYW1lX2NvbnRleHRcIl0gPSByZXNwb25zZS50ZXh0O1xuICAgICAgICB9KTtcbiAgICAgICAgbmV3IE5vdGljZShcIkdhbWUgY29udGV4dCB1cGRhdGVkLlwiKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoYFN5YnlsIGVycm9yOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIHBsdWdpbi5hZGRDb21tYW5kKHtcbiAgICBpZDogXCJzeWJ5bDphc2stdGhlLXJ1bGVzXCIsXG4gICAgbmFtZTogXCJBc2sgdGhlIFJ1bGVzXCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGNvbnRleHQgPSBhd2FpdCBwbHVnaW4uZ2V0QWN0aXZlTm90ZUNvbnRleHQoKTtcbiAgICAgIGlmICghY29udGV4dD8udmlldy5maWxlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHNvdXJjZXMgPSBjb250ZXh0LmZtLnNvdXJjZXMgPz8gW107XG4gICAgICBpZiAoIXNvdXJjZXMubGVuZ3RoKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoXCJObyBzb3VyY2VzIGF0dGFjaGVkIHRvIHRoaXMgbm90ZS4gVXNlIEFkZCBTb3VyY2UgRmlsZSBmaXJzdC5cIik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJlZiA9IHNvdXJjZXMubGVuZ3RoID09PSAxXG4gICAgICAgID8gc291cmNlc1swXVxuICAgICAgICA6IGF3YWl0IHBpY2tTb3VyY2VSZWYocGx1Z2luLmFwcCwgXCJDaG9vc2UgYSBzb3VyY2UgdG8gcXVlcnlcIiwgc291cmNlcyk7XG4gICAgICBpZiAoIXJlZikge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCB2YWx1ZXMgPSBhd2FpdCBvcGVuSW5wdXRNb2RhbChwbHVnaW4uYXBwLCBcIkFzayB0aGUgUnVsZXNcIiwgW1xuICAgICAgICB7IGtleTogXCJxdWVzdGlvblwiLCBsYWJlbDogXCJRdWVzdGlvblwiLCBwbGFjZWhvbGRlcjogXCJIb3cgZG9lcyBNb21lbnR1bSB3b3JrP1wiIH1cbiAgICAgIF0pO1xuICAgICAgaWYgKCF2YWx1ZXM/LnF1ZXN0aW9uKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHByb3ZpZGVySWQgPSBjb250ZXh0LmZtLnByb3ZpZGVyID8/IHBsdWdpbi5zZXR0aW5ncy5hY3RpdmVQcm92aWRlcjtcbiAgICAgIGxldCByZXNvbHZlZFNvdXJjZXM7XG4gICAgICB0cnkge1xuICAgICAgICByZXNvbHZlZFNvdXJjZXMgPSBhd2FpdCByZXNvbHZlU291cmNlc0ZvclJlcXVlc3QocGx1Z2luLmFwcCwgW3JlZl0sIHByb3ZpZGVySWQpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgbmV3IE5vdGljZShgQ2Fubm90IHJlYWQgc291cmNlOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgcnVsZXNldCA9IGNvbnRleHQuZm0ucnVsZXNldCA/PyBcInRoZSBnYW1lXCI7XG4gICAgICBjb25zdCBwcm9tcHQgPSBgWW91IGFyZSBhIHJ1bGVzIHJlZmVyZW5jZSBmb3IgXCIke3J1bGVzZXR9XCIuXG5BbnN3ZXIgdGhlIGZvbGxvd2luZyBxdWVzdGlvbiB1c2luZyBvbmx5IHRoZSBwcm92aWRlZCBzb3VyY2UgbWF0ZXJpYWwuXG5CZSBwcmVjaXNlIGFuZCBjaXRlIHRoZSByZWxldmFudCBydWxlIG9yIHBhZ2Ugc2VjdGlvbiBpZiBwb3NzaWJsZS5cblxuUXVlc3Rpb246ICR7dmFsdWVzLnF1ZXN0aW9ufWA7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHBsdWdpbi5yZXF1ZXN0UmF3R2VuZXJhdGlvbihjb250ZXh0LmZtLCBwcm9tcHQsIDEwMDAsIHJlc29sdmVkU291cmNlcyk7XG4gICAgICAgIHBsdWdpbi5pbnNlcnRUZXh0KGNvbnRleHQudmlldywgZ2VuZXJpY0Jsb2NrcXVvdGUoXCJSdWxlc1wiLCByZXNwb25zZS50ZXh0KSk7XG4gICAgICAgIHBsdWdpbi5tYXliZUluc2VydFRva2VuQ29tbWVudChjb250ZXh0LnZpZXcsIHJlc3BvbnNlKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoYFN5YnlsIGVycm9yOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIHBsdWdpbi5hZGRDb21tYW5kKHtcbiAgICBpZDogXCJzeWJ5bDpzdGFydC1zY2VuZVwiLFxuICAgIG5hbWU6IFwiU3RhcnQgU2NlbmVcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY29udGV4dCA9IGF3YWl0IHBsdWdpbi5nZXRBY3RpdmVOb3RlQ29udGV4dCgpO1xuICAgICAgaWYgKCFjb250ZXh0Py52aWV3LmZpbGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKGlzTG9uZWxvZ0FjdGl2ZShwbHVnaW4uc2V0dGluZ3MsIGNvbnRleHQuZm0pKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlcyA9IGF3YWl0IG9wZW5JbnB1dE1vZGFsKHBsdWdpbi5hcHAsIFwiU3RhcnQgU2NlbmVcIiwgW1xuICAgICAgICAgIHsga2V5OiBcInNjZW5lRGVzY1wiLCBsYWJlbDogXCJTY2VuZSBkZXNjcmlwdGlvblwiLCBwbGFjZWhvbGRlcjogXCJEYXJrIGFsbGV5LCBtaWRuaWdodFwiIH1cbiAgICAgICAgXSk7XG4gICAgICAgIGlmICghdmFsdWVzPy5zY2VuZURlc2MpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY291bnRlciA9IGNvbnRleHQuZm0uc2NlbmVfY291bnRlciA/PyAxO1xuICAgICAgICBhd2FpdCBydW5HZW5lcmF0aW9uKFxuICAgICAgICAgIHBsdWdpbixcbiAgICAgICAgICBgU1RBUlQgU0NFTkUuIEdlbmVyYXRlIG9ubHk6IDItMyBsaW5lcyBvZiB0aGlyZC1wZXJzb24gcGFzdC10ZW5zZSBwcm9zZSBkZXNjcmliaW5nIHRoZSBhdG1vc3BoZXJlIGFuZCBzZXR0aW5nIG9mOiBcIiR7dmFsdWVzLnNjZW5lRGVzY31cIi4gTm8gZGlhbG9ndWUuIE5vIFBDIGFjdGlvbnMuIE5vIGFkZGl0aW9uYWwgY29tbWVudGFyeS5gLFxuICAgICAgICAgICh0ZXh0KSA9PiBmb3JtYXRTdGFydFNjZW5lKHRleHQsIGBTJHtjb3VudGVyfWAsIHZhbHVlcy5zY2VuZURlc2MsIGxvbmVsb2dPcHRzKHBsdWdpbi5zZXR0aW5ncykpXG4gICAgICAgICk7XG4gICAgICAgIGlmIChwbHVnaW4uc2V0dGluZ3MubG9uZWxvZ0F1dG9JbmNTY2VuZSkge1xuICAgICAgICAgIGF3YWl0IHdyaXRlRnJvbnRNYXR0ZXJLZXkocGx1Z2luLmFwcCwgY29udGV4dC52aWV3LmZpbGUsIFwic2NlbmVfY291bnRlclwiLCBjb3VudGVyICsgMSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgYXdhaXQgcnVuR2VuZXJhdGlvbihcbiAgICAgICAgcGx1Z2luLFxuICAgICAgICBcIlNUQVJUIFNDRU5FLiBHZW5lcmF0ZSBvbmx5OiAyLTMgbGluZXMgb2YgdGhpcmQtcGVyc29uIHBhc3QtdGVuc2UgcHJvc2UgZGVzY3JpYmluZyB0aGUgc2V0dGluZyBhbmQgYXRtb3NwaGVyZS4gTm8gZGlhbG9ndWUuIE5vIFBDIGFjdGlvbnMuIE5vIGFkZGl0aW9uYWwgY29tbWVudGFyeS5cIixcbiAgICAgICAgKHRleHQpID0+IGdlbmVyaWNCbG9ja3F1b3RlKFwiU2NlbmVcIiwgdGV4dClcbiAgICAgICk7XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6ZGVjbGFyZS1hY3Rpb25cIixcbiAgICBuYW1lOiBcIkRlY2xhcmUgQWN0aW9uXCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHZhbHVlcyA9IGF3YWl0IG9wZW5JbnB1dE1vZGFsKHBsdWdpbi5hcHAsIFwiRGVjbGFyZSBBY3Rpb25cIiwgW1xuICAgICAgICB7IGtleTogXCJhY3Rpb25cIiwgbGFiZWw6IFwiQWN0aW9uXCIgfSxcbiAgICAgICAgeyBrZXk6IFwicm9sbFwiLCBsYWJlbDogXCJSb2xsIHJlc3VsdFwiIH1cbiAgICAgIF0pO1xuICAgICAgaWYgKCF2YWx1ZXM/LmFjdGlvbiB8fCAhdmFsdWVzLnJvbGwpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgYXdhaXQgcnVuR2VuZXJhdGlvbihcbiAgICAgICAgcGx1Z2luLFxuICAgICAgICBgUEMgYWN0aW9uOiAke3ZhbHVlcy5hY3Rpb259XFxuUm9sbCByZXN1bHQ6ICR7dmFsdWVzLnJvbGx9XFxuRGVzY3JpYmUgb25seSB0aGUgY29uc2VxdWVuY2VzIGFuZCB3b3JsZCByZWFjdGlvbi4gRG8gbm90IGRlc2NyaWJlIHRoZSBQQydzIGFjdGlvbi5gLFxuICAgICAgICAodGV4dCwgZm0pID0+XG4gICAgICAgICAgaXNMb25lbG9nQWN0aXZlKHBsdWdpbi5zZXR0aW5ncywgZm0pXG4gICAgICAgICAgICA/IGZvcm1hdERlY2xhcmVBY3Rpb24odmFsdWVzLmFjdGlvbiwgdmFsdWVzLnJvbGwsIHRleHQsIGxvbmVsb2dPcHRzKHBsdWdpbi5zZXR0aW5ncykpXG4gICAgICAgICAgICA6IGA+IFtBY3Rpb25dICR7dmFsdWVzLmFjdGlvbn0gfCBSb2xsOiAke3ZhbHVlcy5yb2xsfVxcbj4gW1Jlc3VsdF0gJHt0ZXh0LnRyaW0oKS5yZXBsYWNlKC9cXG4vZywgXCJcXG4+IFwiKX1gXG4gICAgICApO1xuICAgIH1cbiAgfSk7XG5cbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOmFzay1vcmFjbGVcIixcbiAgICBuYW1lOiBcIkFzayBPcmFjbGVcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY29udGV4dCA9IGF3YWl0IHBsdWdpbi5nZXRBY3RpdmVOb3RlQ29udGV4dCgpO1xuICAgICAgaWYgKCFjb250ZXh0KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHZhbHVlcyA9IGF3YWl0IG9wZW5JbnB1dE1vZGFsKHBsdWdpbi5hcHAsIFwiQXNrIE9yYWNsZVwiLCBbXG4gICAgICAgIHsga2V5OiBcInF1ZXN0aW9uXCIsIGxhYmVsOiBcIlF1ZXN0aW9uXCIgfSxcbiAgICAgICAgeyBrZXk6IFwicmVzdWx0XCIsIGxhYmVsOiBcIk9yYWNsZSByZXN1bHRcIiwgb3B0aW9uYWw6IHRydWUgfVxuICAgICAgXSk7XG4gICAgICBpZiAoIXZhbHVlcz8ucXVlc3Rpb24pIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgaGFzUmVzdWx0ID0gQm9vbGVhbih2YWx1ZXMucmVzdWx0Py50cmltKCkpO1xuICAgICAgY29uc3QgbWVzc2FnZSA9IGhhc1Jlc3VsdFxuICAgICAgICA/IGBPcmFjbGUgcXVlc3Rpb246ICR7dmFsdWVzLnF1ZXN0aW9ufVxcbk9yYWNsZSByZXN1bHQ6ICR7dmFsdWVzLnJlc3VsdH1cXG5JbnRlcnByZXQgdGhpcyByZXN1bHQgaW4gdGhlIGNvbnRleHQgb2YgdGhlIHNjZW5lLiBUaGlyZCBwZXJzb24sIG5ldXRyYWwsIDItMyBsaW5lcy5gXG4gICAgICAgIDogYE9yYWNsZSBxdWVzdGlvbjogJHt2YWx1ZXMucXVlc3Rpb259XFxuT3JhY2xlIG1vZGU6ICR7Y29udGV4dC5mbS5vcmFjbGVfbW9kZSA/PyBcInllcy1ub1wifVxcblJ1biB0aGUgb3JhY2xlIGFuZCBnaXZlIHRoZSByZXN1bHQgcGx1cyBhIDEtMiBsaW5lIG5ldXRyYWwgaW50ZXJwcmV0YXRpb24uYDtcbiAgICAgIGF3YWl0IHJ1bkdlbmVyYXRpb24oXG4gICAgICAgIHBsdWdpbixcbiAgICAgICAgbWVzc2FnZSxcbiAgICAgICAgKHRleHQsIGZtKSA9PiB7XG4gICAgICAgICAgaWYgKCFpc0xvbmVsb2dBY3RpdmUocGx1Z2luLnNldHRpbmdzLCBmbSkpIHtcbiAgICAgICAgICAgIHJldHVybiBgPiBbT3JhY2xlXSBROiAke3ZhbHVlcy5xdWVzdGlvbn1cXG4+IFtBbnN3ZXJdICR7dGV4dC50cmltKCkucmVwbGFjZSgvXFxuL2csIFwiXFxuPiBcIil9YDtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGhhc1Jlc3VsdCkge1xuICAgICAgICAgICAgcmV0dXJuIGZvcm1hdEFza09yYWNsZSh2YWx1ZXMucXVlc3Rpb24sIHZhbHVlcy5yZXN1bHQudHJpbSgpLCB0ZXh0LCBsb25lbG9nT3B0cyhwbHVnaW4uc2V0dGluZ3MpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgcGFyc2VkID0gcGFyc2VMb25lbG9nT3JhY2xlUmVzcG9uc2UodGV4dCk7XG4gICAgICAgICAgcmV0dXJuIGZvcm1hdEFza09yYWNsZSh2YWx1ZXMucXVlc3Rpb24sIHBhcnNlZC5yZXN1bHQsIHBhcnNlZC5pbnRlcnByZXRhdGlvbiwgbG9uZWxvZ09wdHMocGx1Z2luLnNldHRpbmdzKSk7XG4gICAgICAgIH1cbiAgICAgICk7XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6aW50ZXJwcmV0LW9yYWNsZVwiLFxuICAgIG5hbWU6IFwiSW50ZXJwcmV0IE9yYWNsZSBSb2xsXCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGNvbnRleHQgPSBhd2FpdCBwbHVnaW4uZ2V0QWN0aXZlTm90ZUNvbnRleHQoKTtcbiAgICAgIGlmICghY29udGV4dCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBsZXQgc2VsZWN0ZWQgPSBnZXRTZWxlY3Rpb24oY29udGV4dC52aWV3LmVkaXRvcik7XG4gICAgICBpZiAoIXNlbGVjdGVkKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlcyA9IGF3YWl0IG9wZW5JbnB1dE1vZGFsKHBsdWdpbi5hcHAsIFwiSW50ZXJwcmV0IE9yYWNsZSBSZXN1bHRcIiwgW1xuICAgICAgICAgIHsga2V5OiBcIm9yYWNsZVwiLCBsYWJlbDogXCJPcmFjbGUgcmVzdWx0XCIgfVxuICAgICAgICBdKTtcbiAgICAgICAgc2VsZWN0ZWQgPSB2YWx1ZXM/Lm9yYWNsZT8udHJpbSgpID8/IFwiXCI7XG4gICAgICB9XG4gICAgICBpZiAoIXNlbGVjdGVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGF3YWl0IHJ1bkdlbmVyYXRpb24oXG4gICAgICAgIHBsdWdpbixcbiAgICAgICAgYEludGVycHJldCB0aGlzIG9yYWNsZSByZXN1bHQgaW4gdGhlIGNvbnRleHQgb2YgdGhlIGN1cnJlbnQgc2NlbmU6IFwiJHtzZWxlY3RlZH1cIlxcbk5ldXRyYWwsIHRoaXJkLXBlcnNvbiwgMi0zIGxpbmVzLiBObyBkcmFtYXRpYyBsYW5ndWFnZS5gLFxuICAgICAgICAodGV4dCwgZm0pID0+XG4gICAgICAgICAgaXNMb25lbG9nQWN0aXZlKHBsdWdpbi5zZXR0aW5ncywgZm0pXG4gICAgICAgICAgICA/IGZvcm1hdEludGVycHJldE9yYWNsZShzZWxlY3RlZCwgdGV4dCwgbG9uZWxvZ09wdHMocGx1Z2luLnNldHRpbmdzKSlcbiAgICAgICAgICAgIDogZ2VuZXJpY0Jsb2NrcXVvdGUoXCJJbnRlcnByZXRhdGlvblwiLCB0ZXh0KSxcbiAgICAgICAgNTEyLFxuICAgICAgICBcImJlbG93LXNlbGVjdGlvblwiXG4gICAgICApO1xuICAgIH1cbiAgfSk7XG5cbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOnN1Z2dlc3QtY29uc2VxdWVuY2VcIixcbiAgICBuYW1lOiBcIldoYXQgTm93XCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGF3YWl0IHJ1bkdlbmVyYXRpb24oXG4gICAgICAgIHBsdWdpbixcbiAgICAgICAgXCJCYXNlZCBvbiB0aGUgY3VycmVudCBzY2VuZSBjb250ZXh0LCBzdWdnZXN0IDEtMiBwb3NzaWJsZSBjb25zZXF1ZW5jZXMgb3IgY29tcGxpY2F0aW9ucy4gUHJlc2VudCB0aGVtIGFzIG5ldXRyYWwgb3B0aW9ucywgbm90IGFzIG5hcnJhdGl2ZSBvdXRjb21lcy4gRG8gbm90IGNob29zZSBiZXR3ZWVuIHRoZW0uXCIsXG4gICAgICAgICh0ZXh0LCBmbSkgPT5cbiAgICAgICAgICBpc0xvbmVsb2dBY3RpdmUocGx1Z2luLnNldHRpbmdzLCBmbSlcbiAgICAgICAgICAgID8gZm9ybWF0U3VnZ2VzdENvbnNlcXVlbmNlKHRleHQsIGxvbmVsb2dPcHRzKHBsdWdpbi5zZXR0aW5ncykpXG4gICAgICAgICAgICA6IGdlbmVyaWNCbG9ja3F1b3RlKFwiT3B0aW9uc1wiLCB0ZXh0KVxuICAgICAgKTtcbiAgICB9XG4gIH0pO1xuXG4gIHBsdWdpbi5hZGRDb21tYW5kKHtcbiAgICBpZDogXCJzeWJ5bDp3aGF0LWNhbi1pLWRvXCIsXG4gICAgbmFtZTogXCJXaGF0IENhbiBJIERvXCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGF3YWl0IHJ1bkdlbmVyYXRpb24oXG4gICAgICAgIHBsdWdpbixcbiAgICAgICAgXCJUaGUgcGxheWVyIGlzIHN0dWNrLiBCYXNlZCBvbiB0aGUgY3VycmVudCBzY2VuZSBjb250ZXh0LCBzdWdnZXN0IGV4YWN0bHkgMyBjb25jcmV0ZSBhY3Rpb25zIHRoZSBQQyBjb3VsZCB0YWtlIG5leHQuIFByZXNlbnQgdGhlbSBhcyBuZXV0cmFsIG9wdGlvbnMgbnVtYmVyZWQgMVx1MjAxMzMuIERvIG5vdCByZXNvbHZlIG9yIG5hcnJhdGUgYW55IG91dGNvbWUuIERvIG5vdCByZWNvbW1lbmQgb25lIG92ZXIgYW5vdGhlci5cIixcbiAgICAgICAgKHRleHQsIGZtKSA9PlxuICAgICAgICAgIGlzTG9uZWxvZ0FjdGl2ZShwbHVnaW4uc2V0dGluZ3MsIGZtKVxuICAgICAgICAgICAgPyBmb3JtYXRTdWdnZXN0Q29uc2VxdWVuY2UodGV4dCwgbG9uZWxvZ09wdHMocGx1Z2luLnNldHRpbmdzKSlcbiAgICAgICAgICAgIDogZ2VuZXJpY0Jsb2NrcXVvdGUoXCJBY3Rpb25zXCIsIHRleHQpXG4gICAgICApO1xuICAgIH1cbiAgfSk7XG5cbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOmV4cGFuZC1zY2VuZVwiLFxuICAgIG5hbWU6IFwiRXhwYW5kIFNjZW5lXCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGF3YWl0IHJ1bkdlbmVyYXRpb24oXG4gICAgICAgIHBsdWdpbixcbiAgICAgICAgXCJFeHBhbmQgdGhlIGN1cnJlbnQgc2NlbmUgaW50byBhIHByb3NlIHBhc3NhZ2UuIFRoaXJkIHBlcnNvbiwgcGFzdCB0ZW5zZSwgMTAwLTE1MCB3b3Jkcy4gTm8gZGlhbG9ndWUuIERvIG5vdCBkZXNjcmliZSB0aGUgUEMncyBpbnRlcm5hbCB0aG91Z2h0cyBvciBkZWNpc2lvbnMuIFN0YXkgc3RyaWN0bHkgd2l0aGluIHRoZSBlc3RhYmxpc2hlZCBzY2VuZSBjb250ZXh0LlwiLFxuICAgICAgICAodGV4dCwgZm0pID0+XG4gICAgICAgICAgaXNMb25lbG9nQWN0aXZlKHBsdWdpbi5zZXR0aW5ncywgZm0pXG4gICAgICAgICAgICA/IGZvcm1hdEV4cGFuZFNjZW5lKHRleHQsIGxvbmVsb2dPcHRzKHBsdWdpbi5zZXR0aW5ncykpXG4gICAgICAgICAgICA6IGAtLS1cXG4+IFtQcm9zZV0gJHt0ZXh0LnRyaW0oKS5yZXBsYWNlKC9cXG4vZywgXCJcXG4+IFwiKX1cXG4tLS1gLFxuICAgICAgICA2MDBcbiAgICAgICk7XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6dXBsb2FkLXNvdXJjZVwiLFxuICAgIG5hbWU6IFwiQWRkIFNvdXJjZSBGaWxlXCIsXG4gICAgY2FsbGJhY2s6IGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGNvbnRleHQgPSBhd2FpdCBwbHVnaW4uZ2V0QWN0aXZlTm90ZUNvbnRleHQoKTtcbiAgICAgIGlmICghY29udGV4dD8udmlldy5maWxlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGFkZFNvdXJjZVRvTm90ZShwbHVnaW4sIGNvbnRleHQudmlldy5maWxlKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoYFN5YnlsIGVycm9yOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIHBsdWdpbi5hZGRDb21tYW5kKHtcbiAgICBpZDogXCJzeWJ5bDptYW5hZ2Utc291cmNlc1wiLFxuICAgIG5hbWU6IFwiTWFuYWdlIFNvdXJjZXNcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgYXdhaXQgbWFuYWdlU291cmNlcyhwbHVnaW4pO1xuICAgIH1cbiAgfSk7XG5cbiAgcGx1Z2luLmFkZENvbW1hbmQoe1xuICAgIGlkOiBcInN5YnlsOmxvbmVsb2ctcGFyc2UtY29udGV4dFwiLFxuICAgIG5hbWU6IFwiVXBkYXRlIFNjZW5lIENvbnRleHRcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY29udGV4dCA9IGF3YWl0IHBsdWdpbi5nZXRBY3RpdmVOb3RlQ29udGV4dCgpO1xuICAgICAgaWYgKCFjb250ZXh0Py52aWV3LmZpbGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKCFpc0xvbmVsb2dBY3RpdmUocGx1Z2luLnNldHRpbmdzLCBjb250ZXh0LmZtKSkge1xuICAgICAgICBuZXcgTm90aWNlKFwiTG9uZWxvZyBtb2RlIGlzIG5vdCBlbmFibGVkIGZvciB0aGlzIG5vdGUuXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCBwYXJzZWQgPSBwYXJzZUxvbmVsb2dDb250ZXh0KGNvbnRleHQubm90ZUJvZHksIHBsdWdpbi5zZXR0aW5ncy5sb25lbG9nQ29udGV4dERlcHRoKTtcbiAgICAgIGF3YWl0IHdyaXRlRnJvbnRNYXR0ZXJLZXkocGx1Z2luLmFwcCwgY29udGV4dC52aWV3LmZpbGUsIFwic2NlbmVfY29udGV4dFwiLCBzZXJpYWxpemVDb250ZXh0KHBhcnNlZCkpO1xuICAgICAgbmV3IE5vdGljZShcIlNjZW5lIGNvbnRleHQgdXBkYXRlZCBmcm9tIGxvZy5cIik7XG4gICAgfVxuICB9KTtcblxuICBwbHVnaW4uYWRkQ29tbWFuZCh7XG4gICAgaWQ6IFwic3lieWw6bG9uZWxvZy1zZXNzaW9uLWJyZWFrXCIsXG4gICAgbmFtZTogXCJOZXcgU2Vzc2lvbiBIZWFkZXJcIixcbiAgICBjYWxsYmFjazogYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY29udGV4dCA9IGF3YWl0IHBsdWdpbi5nZXRBY3RpdmVOb3RlQ29udGV4dCgpO1xuICAgICAgaWYgKCFjb250ZXh0Py52aWV3LmZpbGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKCFpc0xvbmVsb2dBY3RpdmUocGx1Z2luLnNldHRpbmdzLCBjb250ZXh0LmZtKSkge1xuICAgICAgICBuZXcgTm90aWNlKFwiTG9uZWxvZyBtb2RlIGlzIG5vdCBlbmFibGVkIGZvciB0aGlzIG5vdGUuXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCB2YWx1ZXMgPSBhd2FpdCBvcGVuSW5wdXRNb2RhbChwbHVnaW4uYXBwLCBcIk5ldyBTZXNzaW9uIEhlYWRlclwiLCBbXG4gICAgICAgIHsga2V5OiBcImRhdGVcIiwgbGFiZWw6IFwiRGF0ZVwiLCB2YWx1ZTogdG9kYXlJc29EYXRlKCkgfSxcbiAgICAgICAgeyBrZXk6IFwiZHVyYXRpb25cIiwgbGFiZWw6IFwiRHVyYXRpb25cIiwgcGxhY2Vob2xkZXI6IFwiMWgzMFwiIH0sXG4gICAgICAgIHsga2V5OiBcInJlY2FwXCIsIGxhYmVsOiBcIlJlY2FwXCIsIG9wdGlvbmFsOiB0cnVlIH1cbiAgICAgIF0pO1xuICAgICAgaWYgKCF2YWx1ZXM/LmRhdGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3Qgc2Vzc2lvbk51bWJlciA9IGNvbnRleHQuZm0uc2Vzc2lvbl9udW1iZXIgPz8gMTtcbiAgICAgIGNvbnN0IGJsb2NrID0gYCMjIFNlc3Npb24gJHtzZXNzaW9uTnVtYmVyfVxcbipEYXRlOiAke3ZhbHVlcy5kYXRlfSB8IER1cmF0aW9uOiAke3ZhbHVlcy5kdXJhdGlvbiB8fCBcIi1cIn0qXFxuXFxuJHt2YWx1ZXMucmVjYXAgPyBgKipSZWNhcDoqKiAke3ZhbHVlcy5yZWNhcH1cXG5cXG5gIDogXCJcIn1gO1xuICAgICAgcGx1Z2luLmluc2VydFRleHQoY29udGV4dC52aWV3LCBibG9jaywgXCJjdXJzb3JcIik7XG4gICAgICBhd2FpdCB3cml0ZUZyb250TWF0dGVyS2V5KHBsdWdpbi5hcHAsIGNvbnRleHQudmlldy5maWxlLCBcInNlc3Npb25fbnVtYmVyXCIsIHNlc3Npb25OdW1iZXIgKyAxKTtcbiAgICB9XG4gIH0pO1xufVxuIiwgImV4cG9ydCBpbnRlcmZhY2UgTG9uZWxvZ0Zvcm1hdE9wdGlvbnMge1xuICB3cmFwSW5Db2RlQmxvY2s6IGJvb2xlYW47XG4gIHNjZW5lSWQ/OiBzdHJpbmc7XG59XG5cbmZ1bmN0aW9uIGZlbmNlKGNvbnRlbnQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBgXFxgXFxgXFxgXFxuJHtjb250ZW50fVxcblxcYFxcYFxcYGA7XG59XG5cbmZ1bmN0aW9uIGNsZWFuQWlUZXh0KHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiB0ZXh0LnJlcGxhY2UoL14+XFxzKi9nbSwgXCJcIikudHJpbSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0U3RhcnRTY2VuZShcbiAgYWlUZXh0OiBzdHJpbmcsXG4gIHNjZW5lSWQ6IHN0cmluZyxcbiAgc2NlbmVEZXNjOiBzdHJpbmcsXG4gIF9vcHRzOiBMb25lbG9nRm9ybWF0T3B0aW9uc1xuKTogc3RyaW5nIHtcbiAgY29uc3QgaGVhZGVyID0gYCMjIyAke3NjZW5lSWR9ICoke3NjZW5lRGVzY30qYDtcbiAgY29uc3QgYm9keSA9IGNsZWFuQWlUZXh0KGFpVGV4dCk7XG4gIHJldHVybiBgJHtoZWFkZXJ9XFxuXFxuJHtib2R5fWA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXREZWNsYXJlQWN0aW9uKFxuICBhY3Rpb246IHN0cmluZyxcbiAgcm9sbDogc3RyaW5nLFxuICBhaUNvbnNlcXVlbmNlOiBzdHJpbmcsXG4gIG9wdHM6IExvbmVsb2dGb3JtYXRPcHRpb25zXG4pOiBzdHJpbmcge1xuICBjb25zdCBjb25zZXF1ZW5jZSA9IGNsZWFuQWlUZXh0KGFpQ29uc2VxdWVuY2UpXG4gICAgLnNwbGl0KFwiXFxuXCIpXG4gICAgLmZpbHRlcihCb29sZWFuKVxuICAgIC5tYXAoKGxpbmUpID0+IChsaW5lLnN0YXJ0c1dpdGgoXCI9PlwiKSA/IGxpbmUgOiBgPT4gJHtsaW5lfWApKVxuICAgIC5qb2luKFwiXFxuXCIpO1xuICBjb25zdCBub3RhdGlvbiA9IGBAICR7YWN0aW9ufVxcbmQ6ICR7cm9sbH1cXG4ke2NvbnNlcXVlbmNlfWA7XG4gIHJldHVybiBvcHRzLndyYXBJbkNvZGVCbG9jayA/IGZlbmNlKG5vdGF0aW9uKSA6IG5vdGF0aW9uO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0QXNrT3JhY2xlKFxuICBxdWVzdGlvbjogc3RyaW5nLFxuICBvcmFjbGVSZXN1bHQ6IHN0cmluZyxcbiAgYWlJbnRlcnByZXRhdGlvbjogc3RyaW5nLFxuICBvcHRzOiBMb25lbG9nRm9ybWF0T3B0aW9uc1xuKTogc3RyaW5nIHtcbiAgY29uc3QgaW50ZXJwcmV0YXRpb24gPSBjbGVhbkFpVGV4dChhaUludGVycHJldGF0aW9uKVxuICAgIC5zcGxpdChcIlxcblwiKVxuICAgIC5maWx0ZXIoQm9vbGVhbilcbiAgICAubWFwKChsaW5lKSA9PiAobGluZS5zdGFydHNXaXRoKFwiPT5cIikgPyBsaW5lIDogYD0+ICR7bGluZX1gKSlcbiAgICAuam9pbihcIlxcblwiKTtcbiAgY29uc3Qgbm90YXRpb24gPSBgPyAke3F1ZXN0aW9ufVxcbi0+ICR7b3JhY2xlUmVzdWx0fVxcbiR7aW50ZXJwcmV0YXRpb259YDtcbiAgcmV0dXJuIG9wdHMud3JhcEluQ29kZUJsb2NrID8gZmVuY2Uobm90YXRpb24pIDogbm90YXRpb247XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRJbnRlcnByZXRPcmFjbGUoXG4gIG9yYWNsZVRleHQ6IHN0cmluZyxcbiAgYWlJbnRlcnByZXRhdGlvbjogc3RyaW5nLFxuICBvcHRzOiBMb25lbG9nRm9ybWF0T3B0aW9uc1xuKTogc3RyaW5nIHtcbiAgY29uc3QgaW50ZXJwcmV0YXRpb24gPSBjbGVhbkFpVGV4dChhaUludGVycHJldGF0aW9uKVxuICAgIC5zcGxpdChcIlxcblwiKVxuICAgIC5maWx0ZXIoQm9vbGVhbilcbiAgICAubWFwKChsaW5lKSA9PiAobGluZS5zdGFydHNXaXRoKFwiPT5cIikgPyBsaW5lIDogYD0+ICR7bGluZX1gKSlcbiAgICAuam9pbihcIlxcblwiKTtcbiAgY29uc3Qgbm90YXRpb24gPSBgLT4gJHtvcmFjbGVUZXh0fVxcbiR7aW50ZXJwcmV0YXRpb259YDtcbiAgcmV0dXJuIG9wdHMud3JhcEluQ29kZUJsb2NrID8gZmVuY2Uobm90YXRpb24pIDogbm90YXRpb247XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRTdWdnZXN0Q29uc2VxdWVuY2UoYWlPcHRpb25zOiBzdHJpbmcsIG9wdHM6IExvbmVsb2dGb3JtYXRPcHRpb25zKTogc3RyaW5nIHtcbiAgY29uc3Qgb3B0aW9ucyA9IGNsZWFuQWlUZXh0KGFpT3B0aW9ucylcbiAgICAuc3BsaXQoXCJcXG5cIilcbiAgICAuZmlsdGVyKChsaW5lKSA9PiBsaW5lLnRyaW0oKS5sZW5ndGggPiAwKVxuICAgIC5tYXAoKGxpbmUpID0+IChsaW5lLnN0YXJ0c1dpdGgoXCI9PlwiKSA/IGxpbmUgOiBgPT4gJHtsaW5lfWApKVxuICAgIC5qb2luKFwiXFxuXCIpO1xuICByZXR1cm4gb3B0cy53cmFwSW5Db2RlQmxvY2sgPyBmZW5jZShvcHRpb25zKSA6IG9wdGlvbnM7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRFeHBhbmRTY2VuZShhaVByb3NlOiBzdHJpbmcsIF9vcHRzOiBMb25lbG9nRm9ybWF0T3B0aW9ucyk6IHN0cmluZyB7XG4gIHJldHVybiBgXFxcXC0tLVxcbiR7Y2xlYW5BaVRleHQoYWlQcm9zZSl9XFxuLS0tXFxcXGA7XG59XG4iLCAiaW1wb3J0IHsgQXBwLCBNb2RhbCwgTm90aWNlLCBTZXR0aW5nLCBURmlsZSB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHsgZGVzY3JpYmVTb3VyY2VSZWYsIGxpc3RWYXVsdENhbmRpZGF0ZUZpbGVzIH0gZnJvbSBcIi4vc291cmNlVXRpbHNcIjtcbmltcG9ydCB7IE1vZGFsRmllbGQsIFNvdXJjZVJlZiB9IGZyb20gXCIuL3R5cGVzXCI7XG5cbmV4cG9ydCBjbGFzcyBJbnB1dE1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICBwcml2YXRlIHJlYWRvbmx5IHZhbHVlczogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBhcHA6IEFwcCxcbiAgICBwcml2YXRlIHJlYWRvbmx5IHRpdGxlOiBzdHJpbmcsXG4gICAgcHJpdmF0ZSByZWFkb25seSBmaWVsZHM6IE1vZGFsRmllbGRbXSxcbiAgICBwcml2YXRlIHJlYWRvbmx5IG9uU3VibWl0OiAodmFsdWVzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KSA9PiB2b2lkXG4gICkge1xuICAgIHN1cGVyKGFwcCk7XG4gICAgdGhpcy52YWx1ZXMgPSBmaWVsZHMucmVkdWNlPFJlY29yZDxzdHJpbmcsIHN0cmluZz4+KChhY2MsIGZpZWxkKSA9PiB7XG4gICAgICBhY2NbZmllbGQua2V5XSA9IGZpZWxkLnZhbHVlID8/IFwiXCI7XG4gICAgICByZXR1cm4gYWNjO1xuICAgIH0sIHt9KTtcbiAgfVxuXG4gIG9uT3BlbigpOiB2b2lkIHtcbiAgICB0aGlzLnRpdGxlRWwuc2V0VGV4dCh0aGlzLnRpdGxlKTtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIGZvciAoY29uc3QgZmllbGQgb2YgdGhpcy5maWVsZHMpIHtcbiAgICAgIG5ldyBTZXR0aW5nKHRoaXMuY29udGVudEVsKVxuICAgICAgICAuc2V0TmFtZShmaWVsZC5sYWJlbClcbiAgICAgICAgLnNldERlc2MoZmllbGQub3B0aW9uYWwgPyBcIk9wdGlvbmFsXCIgOiBcIlwiKVxuICAgICAgICAuYWRkVGV4dCgodGV4dCkgPT4ge1xuICAgICAgICAgIHRleHQuc2V0UGxhY2Vob2xkZXIoZmllbGQucGxhY2Vob2xkZXIgPz8gXCJcIik7XG4gICAgICAgICAgdGV4dC5zZXRWYWx1ZSh0aGlzLnZhbHVlc1tmaWVsZC5rZXldID8/IFwiXCIpO1xuICAgICAgICAgIHRleHQub25DaGFuZ2UoKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnZhbHVlc1tmaWVsZC5rZXldID0gdmFsdWU7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBuZXcgU2V0dGluZyh0aGlzLmNvbnRlbnRFbCkuYWRkQnV0dG9uKChidXR0b24pID0+IHtcbiAgICAgIGJ1dHRvbi5zZXRCdXR0b25UZXh0KFwiQ29uZmlybVwiKS5zZXRDdGEoKS5vbkNsaWNrKCgpID0+IHtcbiAgICAgICAgdGhpcy5vblN1Ym1pdCh0aGlzLnZhbHVlcyk7XG4gICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgb25DbG9zZSgpOiB2b2lkIHtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBvcGVuSW5wdXRNb2RhbChcbiAgYXBwOiBBcHAsXG4gIHRpdGxlOiBzdHJpbmcsXG4gIGZpZWxkczogTW9kYWxGaWVsZFtdXG4pOiBQcm9taXNlPFJlY29yZDxzdHJpbmcsIHN0cmluZz4gfCBudWxsPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIGxldCBzZXR0bGVkID0gZmFsc2U7XG4gICAgY29uc3QgbW9kYWwgPSBuZXcgSW5wdXRNb2RhbChhcHAsIHRpdGxlLCBmaWVsZHMsICh2YWx1ZXMpID0+IHtcbiAgICAgIHNldHRsZWQgPSB0cnVlO1xuICAgICAgcmVzb2x2ZSh2YWx1ZXMpO1xuICAgIH0pO1xuICAgIGNvbnN0IG9yaWdpbmFsQ2xvc2UgPSBtb2RhbC5vbkNsb3NlLmJpbmQobW9kYWwpO1xuICAgIG1vZGFsLm9uQ2xvc2UgPSAoKSA9PiB7XG4gICAgICBvcmlnaW5hbENsb3NlKCk7XG4gICAgICBpZiAoIXNldHRsZWQpIHtcbiAgICAgICAgcmVzb2x2ZShudWxsKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIG1vZGFsLm9wZW4oKTtcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwaWNrTG9jYWxGaWxlKCk6IFByb21pc2U8RmlsZSB8IG51bGw+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgY29uc3QgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIik7XG4gICAgaW5wdXQudHlwZSA9IFwiZmlsZVwiO1xuICAgIGlucHV0LmFjY2VwdCA9IFwiLnBkZiwudHh0LC5tZCwubWFya2Rvd25cIjtcbiAgICBpbnB1dC5vbmNoYW5nZSA9ICgpID0+IHJlc29sdmUoaW5wdXQuZmlsZXM/LlswXSA/PyBudWxsKTtcbiAgICBpbnB1dC5jbGljaygpO1xuICB9KTtcbn1cblxuZXhwb3J0IGNsYXNzIFZhdWx0RmlsZVBpY2tlck1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICBwcml2YXRlIHJlYWRvbmx5IGZpbGVzOiBURmlsZVtdO1xuXG4gIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwcml2YXRlIHJlYWRvbmx5IHRpdGxlOiBzdHJpbmcsIHByaXZhdGUgcmVhZG9ubHkgb25QaWNrOiAoZmlsZTogVEZpbGUpID0+IHZvaWQpIHtcbiAgICBzdXBlcihhcHApO1xuICAgIHRoaXMuZmlsZXMgPSBsaXN0VmF1bHRDYW5kaWRhdGVGaWxlcyhhcHApO1xuICB9XG5cbiAgb25PcGVuKCk6IHZvaWQge1xuICAgIHRoaXMudGl0bGVFbC5zZXRUZXh0KHRoaXMudGl0bGUpO1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gICAgaWYgKCF0aGlzLmZpbGVzLmxlbmd0aCkge1xuICAgICAgdGhpcy5jb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogXCJObyBQREYgb3IgdGV4dCBmaWxlcyBmb3VuZCBpbiB0aGUgdmF1bHQuXCIgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuZmlsZXMuZm9yRWFjaCgoZmlsZSkgPT4ge1xuICAgICAgbmV3IFNldHRpbmcodGhpcy5jb250ZW50RWwpXG4gICAgICAgIC5zZXROYW1lKGZpbGUucGF0aClcbiAgICAgICAgLnNldERlc2MoZmlsZS5leHRlbnNpb24udG9Mb3dlckNhc2UoKSlcbiAgICAgICAgLmFkZEJ1dHRvbigoYnV0dG9uKSA9PiB7XG4gICAgICAgICAgYnV0dG9uLnNldEJ1dHRvblRleHQoXCJTZWxlY3RcIikuc2V0Q3RhKCkub25DbGljaygoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLm9uUGljayhmaWxlKTtcbiAgICAgICAgICAgIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBvbkNsb3NlKCk6IHZvaWQge1xuICAgIHRoaXMuY29udGVudEVsLmVtcHR5KCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBpY2tWYXVsdEZpbGUoYXBwOiBBcHAsIHRpdGxlOiBzdHJpbmcpOiBQcm9taXNlPFRGaWxlIHwgbnVsbD4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICBsZXQgc2V0dGxlZCA9IGZhbHNlO1xuICAgIGNvbnN0IG1vZGFsID0gbmV3IFZhdWx0RmlsZVBpY2tlck1vZGFsKGFwcCwgdGl0bGUsIChmaWxlKSA9PiB7XG4gICAgICBzZXR0bGVkID0gdHJ1ZTtcbiAgICAgIHJlc29sdmUoZmlsZSk7XG4gICAgfSk7XG4gICAgY29uc3Qgb3JpZ2luYWxDbG9zZSA9IG1vZGFsLm9uQ2xvc2UuYmluZChtb2RhbCk7XG4gICAgbW9kYWwub25DbG9zZSA9ICgpID0+IHtcbiAgICAgIG9yaWdpbmFsQ2xvc2UoKTtcbiAgICAgIGlmICghc2V0dGxlZCkge1xuICAgICAgICByZXNvbHZlKG51bGwpO1xuICAgICAgfVxuICAgIH07XG4gICAgbW9kYWwub3BlbigpO1xuICB9KTtcbn1cblxuZXhwb3J0IGNsYXNzIFNvdXJjZVBpY2tlck1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICBjb25zdHJ1Y3RvcihcbiAgICBhcHA6IEFwcCxcbiAgICBwcml2YXRlIHJlYWRvbmx5IHRpdGxlOiBzdHJpbmcsXG4gICAgcHJpdmF0ZSByZWFkb25seSBzb3VyY2VzOiBTb3VyY2VSZWZbXSxcbiAgICBwcml2YXRlIHJlYWRvbmx5IG9uUGljazogKHJlZjogU291cmNlUmVmKSA9PiB2b2lkXG4gICkge1xuICAgIHN1cGVyKGFwcCk7XG4gIH1cblxuICBvbk9wZW4oKTogdm9pZCB7XG4gICAgdGhpcy50aXRsZUVsLnNldFRleHQodGhpcy50aXRsZSk7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICB0aGlzLnNvdXJjZXMuZm9yRWFjaCgoc291cmNlKSA9PiB7XG4gICAgICBuZXcgU2V0dGluZyh0aGlzLmNvbnRlbnRFbClcbiAgICAgICAgLnNldE5hbWUoc291cmNlLmxhYmVsKVxuICAgICAgICAuc2V0RGVzYyhgJHtzb3VyY2UubWltZV90eXBlfSB8ICR7ZGVzY3JpYmVTb3VyY2VSZWYoc291cmNlKX1gKVxuICAgICAgICAuYWRkQnV0dG9uKChidXR0b24pID0+IHtcbiAgICAgICAgICBidXR0b24uc2V0QnV0dG9uVGV4dChcIlNlbGVjdFwiKS5zZXRDdGEoKS5vbkNsaWNrKCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMub25QaWNrKHNvdXJjZSk7XG4gICAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgb25DbG9zZSgpOiB2b2lkIHtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwaWNrU291cmNlUmVmKGFwcDogQXBwLCB0aXRsZTogc3RyaW5nLCBzb3VyY2VzOiBTb3VyY2VSZWZbXSk6IFByb21pc2U8U291cmNlUmVmIHwgbnVsbD4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICBsZXQgc2V0dGxlZCA9IGZhbHNlO1xuICAgIGNvbnN0IG1vZGFsID0gbmV3IFNvdXJjZVBpY2tlck1vZGFsKGFwcCwgdGl0bGUsIHNvdXJjZXMsIChyZWYpID0+IHtcbiAgICAgIHNldHRsZWQgPSB0cnVlO1xuICAgICAgcmVzb2x2ZShyZWYpO1xuICAgIH0pO1xuICAgIGNvbnN0IG9yaWdpbmFsQ2xvc2UgPSBtb2RhbC5vbkNsb3NlLmJpbmQobW9kYWwpO1xuICAgIG1vZGFsLm9uQ2xvc2UgPSAoKSA9PiB7XG4gICAgICBvcmlnaW5hbENsb3NlKCk7XG4gICAgICBpZiAoIXNldHRsZWQpIHtcbiAgICAgICAgcmVzb2x2ZShudWxsKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIG1vZGFsLm9wZW4oKTtcbiAgfSk7XG59XG5cbmV4cG9ydCBjbGFzcyBNYW5hZ2VTb3VyY2VzTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIGFwcDogQXBwLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgc291cmNlczogU291cmNlUmVmW10sXG4gICAgcHJpdmF0ZSByZWFkb25seSBvblJlbW92ZTogKHJlZjogU291cmNlUmVmKSA9PiBQcm9taXNlPHZvaWQ+XG4gICkge1xuICAgIHN1cGVyKGFwcCk7XG4gIH1cblxuICBvbk9wZW4oKTogdm9pZCB7XG4gICAgdGhpcy50aXRsZUVsLnNldFRleHQoXCJNYW5hZ2UgU291cmNlc1wiKTtcbiAgICB0aGlzLnJlbmRlcigpO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXIoKTogdm9pZCB7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgICBpZiAoIXRoaXMuc291cmNlcy5sZW5ndGgpIHtcbiAgICAgIHRoaXMuY29udGVudEVsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IFwiTm8gc291cmNlcyBhcmUgYXR0YWNoZWQgdG8gdGhpcyBub3RlLlwiIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnNvdXJjZXMuZm9yRWFjaCgoc291cmNlKSA9PiB7XG4gICAgICBuZXcgU2V0dGluZyh0aGlzLmNvbnRlbnRFbClcbiAgICAgICAgLnNldE5hbWUoc291cmNlLmxhYmVsKVxuICAgICAgICAuc2V0RGVzYyhgJHtzb3VyY2UubWltZV90eXBlfSB8ICR7ZGVzY3JpYmVTb3VyY2VSZWYoc291cmNlKX1gKVxuICAgICAgICAuYWRkQnV0dG9uKChidXR0b24pID0+IHtcbiAgICAgICAgICBidXR0b24uc2V0QnV0dG9uVGV4dChcIlJlbW92ZVwiKS5vbkNsaWNrKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMub25SZW1vdmUoc291cmNlKTtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoYFJlbW92ZWQgJyR7c291cmNlLmxhYmVsfScuYCk7XG4gICAgICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgb25DbG9zZSgpOiB2b2lkIHtcbiAgICB0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xuICB9XG59XG5cbiIsICJpbXBvcnQgeyBBcHAsIE5vdGljZSwgUGx1Z2luU2V0dGluZ1RhYiwgU2V0dGluZyB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHR5cGUgU3lieWxQbHVnaW4gZnJvbSBcIi4vbWFpblwiO1xuaW1wb3J0IHsgZ2V0UHJvdmlkZXIgfSBmcm9tIFwiLi9wcm92aWRlcnNcIjtcbmltcG9ydCB7IE9sbGFtYVByb3ZpZGVyIH0gZnJvbSBcIi4vcHJvdmlkZXJzL29sbGFtYVwiO1xuaW1wb3J0IHsgUHJvdmlkZXJJRCwgU3lieWxTZXR0aW5ncywgVmFsaWRhdGlvblN0YXRlIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuZXhwb3J0IGNvbnN0IERFRkFVTFRfU0VUVElOR1M6IFN5YnlsU2V0dGluZ3MgPSB7XG4gIGFjdGl2ZVByb3ZpZGVyOiBcImdlbWluaVwiLFxuICBwcm92aWRlcnM6IHtcbiAgICBnZW1pbmk6IHsgYXBpS2V5OiBcIlwiLCBkZWZhdWx0TW9kZWw6IFwiZ2VtaW5pLTIuNS1mbGFzaFwiIH0sXG4gICAgb3BlbmFpOiB7IGFwaUtleTogXCJcIiwgZGVmYXVsdE1vZGVsOiBcImdwdC01LjJcIiwgYmFzZVVybDogXCJodHRwczovL2FwaS5vcGVuYWkuY29tL3YxXCIgfSxcbiAgICBhbnRocm9waWM6IHsgYXBpS2V5OiBcIlwiLCBkZWZhdWx0TW9kZWw6IFwiY2xhdWRlLXNvbm5ldC00LTZcIiB9LFxuICAgIG9sbGFtYTogeyBiYXNlVXJsOiBcImh0dHA6Ly9sb2NhbGhvc3Q6MTE0MzRcIiwgZGVmYXVsdE1vZGVsOiBcImdlbW1hM1wiIH1cbiAgfSxcbiAgaW5zZXJ0aW9uTW9kZTogXCJjdXJzb3JcIixcbiAgc2hvd1Rva2VuQ291bnQ6IGZhbHNlLFxuICBkZWZhdWx0VGVtcGVyYXR1cmU6IDAuNyxcbiAgbG9uZWxvZ01vZGU6IGZhbHNlLFxuICBsb25lbG9nQ29udGV4dERlcHRoOiA2MCxcbiAgbG9uZWxvZ1dyYXBDb2RlQmxvY2s6IHRydWUsXG4gIGxvbmVsb2dBdXRvSW5jU2NlbmU6IHRydWVcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVTZXR0aW5ncyhyYXc6IFBhcnRpYWw8U3lieWxTZXR0aW5ncz4gfCBudWxsIHwgdW5kZWZpbmVkKTogU3lieWxTZXR0aW5ncyB7XG4gIHJldHVybiB7XG4gICAgLi4uREVGQVVMVF9TRVRUSU5HUyxcbiAgICAuLi4ocmF3ID8/IHt9KSxcbiAgICBwcm92aWRlcnM6IHtcbiAgICAgIGdlbWluaTogeyAuLi5ERUZBVUxUX1NFVFRJTkdTLnByb3ZpZGVycy5nZW1pbmksIC4uLihyYXc/LnByb3ZpZGVycz8uZ2VtaW5pID8/IHt9KSB9LFxuICAgICAgb3BlbmFpOiB7IC4uLkRFRkFVTFRfU0VUVElOR1MucHJvdmlkZXJzLm9wZW5haSwgLi4uKHJhdz8ucHJvdmlkZXJzPy5vcGVuYWkgPz8ge30pIH0sXG4gICAgICBhbnRocm9waWM6IHsgLi4uREVGQVVMVF9TRVRUSU5HUy5wcm92aWRlcnMuYW50aHJvcGljLCAuLi4ocmF3Py5wcm92aWRlcnM/LmFudGhyb3BpYyA/PyB7fSkgfSxcbiAgICAgIG9sbGFtYTogeyAuLi5ERUZBVUxUX1NFVFRJTkdTLnByb3ZpZGVycy5vbGxhbWEsIC4uLihyYXc/LnByb3ZpZGVycz8ub2xsYW1hID8/IHt9KSB9XG4gICAgfVxuICB9O1xufVxuXG5jb25zdCBHRU1JTklfTU9ERUxTID0gW1xuICBcImdlbWluaS0zLjEtcHJvLXByZXZpZXdcIixcbiAgXCJnZW1pbmktMy4xLXByby1wcmV2aWV3LWN1c3RvbXRvb2xzXCIsXG4gIFwiZ2VtaW5pLTIuNS1mbGFzaFwiXG5dO1xuY29uc3QgT1BFTkFJX01PREVMUyA9IFtcImdwdC01LjJcIiwgXCJncHQtNC4xXCIsIFwiZ3B0LTQuMS1taW5pXCJdO1xuY29uc3QgQU5USFJPUElDX01PREVMUyA9IFtcbiAgXCJjbGF1ZGUtb3B1cy00LTZcIixcbiAgXCJjbGF1ZGUtc29ubmV0LTQtNlwiLFxuICBcImNsYXVkZS1oYWlrdS00LTUtMjAyNTEwMDFcIlxuXTtcblxuZXhwb3J0IGNsYXNzIFN5YnlsU2V0dGluZ1RhYiBleHRlbmRzIFBsdWdpblNldHRpbmdUYWIge1xuICBwcml2YXRlIHZhbGlkYXRpb246IFBhcnRpYWw8UmVjb3JkPFByb3ZpZGVySUQsIFZhbGlkYXRpb25TdGF0ZT4+ID0ge307XG4gIHByaXZhdGUgb2xsYW1hTW9kZWxzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwcml2YXRlIHJlYWRvbmx5IHBsdWdpbjogU3lieWxQbHVnaW4pIHtcbiAgICBzdXBlcihhcHAsIHBsdWdpbik7XG4gIH1cblxuICBkaXNwbGF5KCk6IHZvaWQge1xuICAgIGNvbnN0IHsgY29udGFpbmVyRWwgfSA9IHRoaXM7XG4gICAgY29udGFpbmVyRWwuZW1wdHkoKTtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcImgyXCIsIHsgdGV4dDogYFN5YnlsIFNldHRpbmdzICgke3RoaXMucHJvdmlkZXJMYWJlbCh0aGlzLnBsdWdpbi5zZXR0aW5ncy5hY3RpdmVQcm92aWRlcil9KWAgfSk7XG4gICAgdGhpcy5yZW5kZXJBY3RpdmVQcm92aWRlcihjb250YWluZXJFbCk7XG4gICAgdGhpcy5yZW5kZXJQcm92aWRlckNvbmZpZyhjb250YWluZXJFbCk7XG4gICAgdGhpcy5yZW5kZXJHbG9iYWxTZXR0aW5ncyhjb250YWluZXJFbCk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlckFjdGl2ZVByb3ZpZGVyKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJBY3RpdmUgUHJvdmlkZXJcIilcbiAgICAgIC5zZXREZXNjKFwiVXNlZCB3aGVuIGEgbm90ZSBkb2VzIG5vdCBvdmVycmlkZSBwcm92aWRlci5cIilcbiAgICAgIC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcbiAgICAgICAgZHJvcGRvd24uYWRkT3B0aW9uKFwiZ2VtaW5pXCIsIFwiR2VtaW5pXCIpO1xuICAgICAgICBkcm9wZG93bi5hZGRPcHRpb24oXCJvcGVuYWlcIiwgXCJPcGVuQUlcIik7XG4gICAgICAgIGRyb3Bkb3duLmFkZE9wdGlvbihcImFudGhyb3BpY1wiLCBcIkFudGhyb3BpYyAoQ2xhdWRlKVwiKTtcbiAgICAgICAgZHJvcGRvd24uYWRkT3B0aW9uKFwib2xsYW1hXCIsIFwiT2xsYW1hIChsb2NhbClcIik7XG4gICAgICAgIGRyb3Bkb3duLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmFjdGl2ZVByb3ZpZGVyKTtcbiAgICAgICAgZHJvcGRvd24ub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuYWN0aXZlUHJvdmlkZXIgPSB2YWx1ZSBhcyBQcm92aWRlcklEO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgIHRoaXMuZGlzcGxheSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJQcm92aWRlckNvbmZpZyhjb250YWluZXJFbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJQcm92aWRlciBDb25maWd1cmF0aW9uXCIgfSk7XG4gICAgc3dpdGNoICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5hY3RpdmVQcm92aWRlcikge1xuICAgICAgY2FzZSBcImdlbWluaVwiOlxuICAgICAgICB0aGlzLnJlbmRlckdlbWluaVNldHRpbmdzKGNvbnRhaW5lckVsKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwib3BlbmFpXCI6XG4gICAgICAgIHRoaXMucmVuZGVyT3BlbkFJU2V0dGluZ3MoY29udGFpbmVyRWwpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgXCJhbnRocm9waWNcIjpcbiAgICAgICAgdGhpcy5yZW5kZXJBbnRocm9waWNTZXR0aW5ncyhjb250YWluZXJFbCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcIm9sbGFtYVwiOlxuICAgICAgICB0aGlzLnJlbmRlck9sbGFtYVNldHRpbmdzKGNvbnRhaW5lckVsKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJHZW1pbmlTZXR0aW5ncyhjb250YWluZXJFbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgICBjb25zdCBjb25maWcgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcm92aWRlcnMuZ2VtaW5pO1xuICAgIHRoaXMucmVuZGVyVmFsaWRhdGlvblN0YXRlKGNvbnRhaW5lckVsLCBcImdlbWluaVwiKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiQVBJIEtleVwiKVxuICAgICAgLmFkZFRleHQoKHRleHQpID0+IHtcbiAgICAgICAgdGV4dC5pbnB1dEVsLnR5cGUgPSBcInBhc3N3b3JkXCI7XG4gICAgICAgIHRleHQuc2V0VmFsdWUoY29uZmlnLmFwaUtleSk7XG4gICAgICAgIHRleHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uZmlnLmFwaUtleSA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGV4dC5pbnB1dEVsLmFkZEV2ZW50TGlzdGVuZXIoXCJibHVyXCIsICgpID0+IHZvaWQgdGhpcy52YWxpZGF0ZVByb3ZpZGVyKFwiZ2VtaW5pXCIpKTtcbiAgICAgIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJEZWZhdWx0IE1vZGVsXCIpXG4gICAgICAuYWRkRHJvcGRvd24oKGRyb3Bkb3duKSA9PiB7XG4gICAgICAgIEdFTUlOSV9NT0RFTFMuZm9yRWFjaCgobW9kZWwpID0+IGRyb3Bkb3duLmFkZE9wdGlvbihtb2RlbCwgbW9kZWwpKTtcbiAgICAgICAgZHJvcGRvd24uc2V0VmFsdWUoY29uZmlnLmRlZmF1bHRNb2RlbCk7XG4gICAgICAgIGRyb3Bkb3duLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGNvbmZpZy5kZWZhdWx0TW9kZWwgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyT3BlbkFJU2V0dGluZ3MoY29udGFpbmVyRWw6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gICAgY29uc3QgY29uZmlnID0gdGhpcy5wbHVnaW4uc2V0dGluZ3MucHJvdmlkZXJzLm9wZW5haTtcbiAgICB0aGlzLnJlbmRlclZhbGlkYXRpb25TdGF0ZShjb250YWluZXJFbCwgXCJvcGVuYWlcIik7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkFQSSBLZXlcIilcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PiB7XG4gICAgICAgIHRleHQuaW5wdXRFbC50eXBlID0gXCJwYXNzd29yZFwiO1xuICAgICAgICB0ZXh0LnNldFZhbHVlKGNvbmZpZy5hcGlLZXkpO1xuICAgICAgICB0ZXh0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGNvbmZpZy5hcGlLZXkgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRleHQuaW5wdXRFbC5hZGRFdmVudExpc3RlbmVyKFwiYmx1clwiLCAoKSA9PiB2b2lkIHRoaXMudmFsaWRhdGVQcm92aWRlcihcIm9wZW5haVwiKSk7XG4gICAgICB9KTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiQmFzZSBVUkxcIilcbiAgICAgIC5zZXREZXNjKFwiT3ZlcnJpZGUgZm9yIEF6dXJlIG9yIHByb3h5IGVuZHBvaW50c1wiKVxuICAgICAgLmFkZFRleHQoKHRleHQpID0+IHtcbiAgICAgICAgdGV4dC5zZXRWYWx1ZShjb25maWcuYmFzZVVybCk7XG4gICAgICAgIHRleHQub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uZmlnLmJhc2VVcmwgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRleHQuaW5wdXRFbC5hZGRFdmVudExpc3RlbmVyKFwiYmx1clwiLCAoKSA9PiB2b2lkIHRoaXMudmFsaWRhdGVQcm92aWRlcihcIm9wZW5haVwiKSk7XG4gICAgICB9KTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiRGVmYXVsdCBNb2RlbFwiKVxuICAgICAgLmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xuICAgICAgICBPUEVOQUlfTU9ERUxTLmZvckVhY2goKG1vZGVsKSA9PiBkcm9wZG93bi5hZGRPcHRpb24obW9kZWwsIG1vZGVsKSk7XG4gICAgICAgIGRyb3Bkb3duLnNldFZhbHVlKGNvbmZpZy5kZWZhdWx0TW9kZWwpO1xuICAgICAgICBkcm9wZG93bi5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICBjb25maWcuZGVmYXVsdE1vZGVsID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJwXCIsIHtcbiAgICAgIHRleHQ6IFwiT3BlbkFJIHNvdXJjZXMgdXNlIHZhdWx0X3BhdGguIEFkZCBzb3VyY2UgZmlsZXMgdmlhIHRoZSBNYW5hZ2UgU291cmNlcyBjb21tYW5kIGluIGFueSBub3RlLlwiXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlckFudGhyb3BpY1NldHRpbmdzKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIGNvbnN0IGNvbmZpZyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnByb3ZpZGVycy5hbnRocm9waWM7XG4gICAgdGhpcy5yZW5kZXJWYWxpZGF0aW9uU3RhdGUoY29udGFpbmVyRWwsIFwiYW50aHJvcGljXCIpO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJBUEkgS2V5XCIpXG4gICAgICAuYWRkVGV4dCgodGV4dCkgPT4ge1xuICAgICAgICB0ZXh0LmlucHV0RWwudHlwZSA9IFwicGFzc3dvcmRcIjtcbiAgICAgICAgdGV4dC5zZXRWYWx1ZShjb25maWcuYXBpS2V5KTtcbiAgICAgICAgdGV4dC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICBjb25maWcuYXBpS2V5ID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0ZXh0LmlucHV0RWwuYWRkRXZlbnRMaXN0ZW5lcihcImJsdXJcIiwgKCkgPT4gdm9pZCB0aGlzLnZhbGlkYXRlUHJvdmlkZXIoXCJhbnRocm9waWNcIikpO1xuICAgICAgfSk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkRlZmF1bHQgTW9kZWxcIilcbiAgICAgIC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcbiAgICAgICAgQU5USFJPUElDX01PREVMUy5mb3JFYWNoKChtb2RlbCkgPT4gZHJvcGRvd24uYWRkT3B0aW9uKG1vZGVsLCBtb2RlbCkpO1xuICAgICAgICBkcm9wZG93bi5zZXRWYWx1ZShjb25maWcuZGVmYXVsdE1vZGVsKTtcbiAgICAgICAgZHJvcGRvd24ub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgY29uZmlnLmRlZmF1bHRNb2RlbCA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwicFwiLCB7XG4gICAgICB0ZXh0OiBcIlBERnMgYXJlIGVuY29kZWQgaW5saW5lIHBlciByZXF1ZXN0LiBVc2Ugc2hvcnQgZXhjZXJwdHMgdG8gYXZvaWQgaGlnaCB0b2tlbiBjb3N0cy5cIlxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZW5kZXJPbGxhbWFTZXR0aW5ncyhjb250YWluZXJFbDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgICBjb25zdCBjb25maWcgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcm92aWRlcnMub2xsYW1hO1xuICAgIHRoaXMucmVuZGVyVmFsaWRhdGlvblN0YXRlKGNvbnRhaW5lckVsLCBcIm9sbGFtYVwiKTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiQmFzZSBVUkxcIilcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PiB7XG4gICAgICAgIHRleHQuc2V0VmFsdWUoY29uZmlnLmJhc2VVcmwpO1xuICAgICAgICB0ZXh0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGNvbmZpZy5iYXNlVXJsID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0ZXh0LmlucHV0RWwuYWRkRXZlbnRMaXN0ZW5lcihcImJsdXJcIiwgKCkgPT4gdm9pZCB0aGlzLnZhbGlkYXRlT2xsYW1hKCkpO1xuICAgICAgfSk7XG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIkF2YWlsYWJsZSBNb2RlbHNcIilcbiAgICAgIC5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHRoaXMub2xsYW1hTW9kZWxzLmxlbmd0aCA/IHRoaXMub2xsYW1hTW9kZWxzIDogW2NvbmZpZy5kZWZhdWx0TW9kZWxdO1xuICAgICAgICBvcHRpb25zLmZvckVhY2goKG1vZGVsKSA9PiBkcm9wZG93bi5hZGRPcHRpb24obW9kZWwsIG1vZGVsKSk7XG4gICAgICAgIGRyb3Bkb3duLnNldFZhbHVlKG9wdGlvbnMuaW5jbHVkZXMoY29uZmlnLmRlZmF1bHRNb2RlbCkgPyBjb25maWcuZGVmYXVsdE1vZGVsIDogb3B0aW9uc1swXSk7XG4gICAgICAgIGRyb3Bkb3duLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGNvbmZpZy5kZWZhdWx0TW9kZWwgPSB2YWx1ZTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICB0aGlzLmRpc3BsYXkoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiRGVmYXVsdCBNb2RlbFwiKVxuICAgICAgLmFkZFRleHQoKHRleHQpID0+IHtcbiAgICAgICAgdGV4dC5zZXRWYWx1ZShjb25maWcuZGVmYXVsdE1vZGVsKTtcbiAgICAgICAgdGV4dC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICBjb25maWcuZGVmYXVsdE1vZGVsID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJwXCIsIHtcbiAgICAgIHRleHQ6IFwiTm8gQVBJIGtleSByZXF1aXJlZC4gT2xsYW1hIG11c3QgYmUgcnVubmluZyBsb2NhbGx5LiBGaWxlIGdyb3VuZGluZyB1c2VzIHZhdWx0X3BhdGggdGV4dCBleHRyYWN0aW9uLlwiXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHJlbmRlckdsb2JhbFNldHRpbmdzKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIkdsb2JhbCBTZXR0aW5nc1wiIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJEZWZhdWx0IFRlbXBlcmF0dXJlXCIpXG4gICAgICAuc2V0RGVzYyhTdHJpbmcodGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVmYXVsdFRlbXBlcmF0dXJlKSlcbiAgICAgIC5hZGRTbGlkZXIoKHNsaWRlcikgPT4ge1xuICAgICAgICBzbGlkZXIuc2V0TGltaXRzKDAsIDEsIDAuMDUpO1xuICAgICAgICBzbGlkZXIuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZGVmYXVsdFRlbXBlcmF0dXJlKTtcbiAgICAgICAgc2xpZGVyLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmRlZmF1bHRUZW1wZXJhdHVyZSA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgIHRoaXMuZGlzcGxheSgpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJJbnNlcnRpb24gTW9kZVwiKVxuICAgICAgLmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xuICAgICAgICBkcm9wZG93bi5hZGRPcHRpb24oXCJjdXJzb3JcIiwgXCJBdCBjdXJzb3JcIik7XG4gICAgICAgIGRyb3Bkb3duLmFkZE9wdGlvbihcImVuZC1vZi1ub3RlXCIsIFwiRW5kIG9mIG5vdGVcIik7XG4gICAgICAgIGRyb3Bkb3duLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmluc2VydGlvbk1vZGUpO1xuICAgICAgICBkcm9wZG93bi5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5pbnNlcnRpb25Nb2RlID0gdmFsdWUgYXMgXCJjdXJzb3JcIiB8IFwiZW5kLW9mLW5vdGVcIjtcbiAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiU2hvdyBUb2tlbiBDb3VudFwiKVxuICAgICAgLmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB7XG4gICAgICAgIHRvZ2dsZS5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5zaG93VG9rZW5Db3VudCk7XG4gICAgICAgIHRvZ2dsZS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zaG93VG9rZW5Db3VudCA9IHZhbHVlO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJMb25lbG9nIE1vZGVcIilcbiAgICAgIC5zZXREZXNjKFwiRW5hYmxlIExvbmVsb2cgbm90YXRpb24sIGNvbnRleHQgcGFyc2luZywgYW5kIExvbmVsb2ctc3BlY2lmaWMgY29tbWFuZHMuXCIpXG4gICAgICAuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHtcbiAgICAgICAgdG9nZ2xlLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmxvbmVsb2dNb2RlKTtcbiAgICAgICAgdG9nZ2xlLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmxvbmVsb2dNb2RlID0gdmFsdWU7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgdGhpcy5kaXNwbGF5KCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgaWYgKHRoaXMucGx1Z2luLnNldHRpbmdzLmxvbmVsb2dNb2RlKSB7XG4gICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgICAgLnNldE5hbWUoXCJBdXRvLWluY3JlbWVudCBzY2VuZSBjb3VudGVyXCIpXG4gICAgICAgIC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xuICAgICAgICAgIHRvZ2dsZS5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5sb25lbG9nQXV0b0luY1NjZW5lKTtcbiAgICAgICAgICB0b2dnbGUub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5sb25lbG9nQXV0b0luY1NjZW5lID0gdmFsdWU7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcbiAgICAgICAgLnNldE5hbWUoXCJDb250ZXh0IGV4dHJhY3Rpb24gZGVwdGhcIilcbiAgICAgICAgLmFkZFRleHQoKHRleHQpID0+IHtcbiAgICAgICAgICB0ZXh0LnNldFZhbHVlKFN0cmluZyh0aGlzLnBsdWdpbi5zZXR0aW5ncy5sb25lbG9nQ29udGV4dERlcHRoKSk7XG4gICAgICAgICAgdGV4dC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG5leHQgPSBOdW1iZXIodmFsdWUpO1xuICAgICAgICAgICAgaWYgKCFOdW1iZXIuaXNOYU4obmV4dCkgJiYgbmV4dCA+IDApIHtcbiAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MubG9uZWxvZ0NvbnRleHREZXB0aCA9IG5leHQ7XG4gICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxuICAgICAgICAuc2V0TmFtZShcIldyYXAgbm90YXRpb24gaW4gY29kZSBibG9ja3NcIilcbiAgICAgICAgLmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB7XG4gICAgICAgICAgdG9nZ2xlLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmxvbmVsb2dXcmFwQ29kZUJsb2NrKTtcbiAgICAgICAgICB0b2dnbGUub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5sb25lbG9nV3JhcENvZGVCbG9jayA9IHZhbHVlO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVuZGVyVmFsaWRhdGlvblN0YXRlKGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCwgcHJvdmlkZXI6IFByb3ZpZGVySUQpOiB2b2lkIHtcbiAgICBjb25zdCBzdGF0ZSA9IHRoaXMudmFsaWRhdGlvbltwcm92aWRlcl07XG4gICAgaWYgKCFzdGF0ZSB8fCBzdGF0ZS5zdGF0dXMgPT09IFwiaWRsZVwiKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwicFwiLCB7XG4gICAgICB0ZXh0OlxuICAgICAgICBzdGF0ZS5zdGF0dXMgPT09IFwiY2hlY2tpbmdcIlxuICAgICAgICAgID8gXCJWYWxpZGF0aW9uOiBjaGVja2luZy4uLlwiXG4gICAgICAgICAgOiBzdGF0ZS5zdGF0dXMgPT09IFwidmFsaWRcIlxuICAgICAgICAgICAgPyBcIlZhbGlkYXRpb246IFx1MjcxM1wiXG4gICAgICAgICAgICA6IGBWYWxpZGF0aW9uOiBcdTI3MTcke3N0YXRlLm1lc3NhZ2UgPyBgICgke3N0YXRlLm1lc3NhZ2V9KWAgOiBcIlwifWBcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcHJvdmlkZXJMYWJlbChwcm92aWRlcjogUHJvdmlkZXJJRCk6IHN0cmluZyB7XG4gICAgc3dpdGNoIChwcm92aWRlcikge1xuICAgICAgY2FzZSBcImdlbWluaVwiOlxuICAgICAgICByZXR1cm4gXCJHZW1pbmlcIjtcbiAgICAgIGNhc2UgXCJvcGVuYWlcIjpcbiAgICAgICAgcmV0dXJuIFwiT3BlbkFJXCI7XG4gICAgICBjYXNlIFwiYW50aHJvcGljXCI6XG4gICAgICAgIHJldHVybiBcIkFudGhyb3BpY1wiO1xuICAgICAgY2FzZSBcIm9sbGFtYVwiOlxuICAgICAgICByZXR1cm4gXCJPbGxhbWFcIjtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHZhbGlkYXRlUHJvdmlkZXIocHJvdmlkZXI6IFByb3ZpZGVySUQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLnZhbGlkYXRpb25bcHJvdmlkZXJdID0geyBzdGF0dXM6IFwiY2hlY2tpbmdcIiB9O1xuICAgIHRoaXMuZGlzcGxheSgpO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB2YWxpZCA9IGF3YWl0IGdldFByb3ZpZGVyKHRoaXMucGx1Z2luLnNldHRpbmdzLCBwcm92aWRlcikudmFsaWRhdGUoKTtcbiAgICAgIHRoaXMudmFsaWRhdGlvbltwcm92aWRlcl0gPSB7IHN0YXR1czogdmFsaWQgPyBcInZhbGlkXCIgOiBcImludmFsaWRcIiB9O1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLnZhbGlkYXRpb25bcHJvdmlkZXJdID0ge1xuICAgICAgICBzdGF0dXM6IFwiaW52YWxpZFwiLFxuICAgICAgICBtZXNzYWdlOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcilcbiAgICAgIH07XG4gICAgfVxuICAgIHRoaXMuZGlzcGxheSgpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyB2YWxpZGF0ZU9sbGFtYSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLnZhbGlkYXRpb24ub2xsYW1hID0geyBzdGF0dXM6IFwiY2hlY2tpbmdcIiB9O1xuICAgIHRoaXMuZGlzcGxheSgpO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBwcm92aWRlciA9IG5ldyBPbGxhbWFQcm92aWRlcih0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcm92aWRlcnMub2xsYW1hKTtcbiAgICAgIGNvbnN0IHZhbGlkID0gYXdhaXQgcHJvdmlkZXIudmFsaWRhdGUoKTtcbiAgICAgIHRoaXMudmFsaWRhdGlvbi5vbGxhbWEgPSB7IHN0YXR1czogdmFsaWQgPyBcInZhbGlkXCIgOiBcImludmFsaWRcIiB9O1xuICAgICAgdGhpcy5vbGxhbWFNb2RlbHMgPSB2YWxpZCA/IGF3YWl0IHByb3ZpZGVyLmxpc3RNb2RlbHMoKSA6IFtdO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aGlzLnZhbGlkYXRpb24ub2xsYW1hID0ge1xuICAgICAgICBzdGF0dXM6IFwiaW52YWxpZFwiLFxuICAgICAgICBtZXNzYWdlOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcilcbiAgICAgIH07XG4gICAgICB0aGlzLm9sbGFtYU1vZGVscyA9IFtdO1xuICAgICAgbmV3IE5vdGljZSh0aGlzLnZhbGlkYXRpb24ub2xsYW1hLm1lc3NhZ2UgPz8gXCJPbGxhbWEgdmFsaWRhdGlvbiBmYWlsZWQuXCIpO1xuICAgIH1cbiAgICB0aGlzLmRpc3BsYXkoKTtcbiAgfVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBQUFBLG1CQUE2Qzs7O0FDRXRDLFNBQVMsZUFBZSxRQUFnQixNQUFvQjtBQUNqRSxRQUFNLFNBQVMsT0FBTyxVQUFVO0FBQ2hDLFNBQU8sYUFBYTtBQUFBLEVBQUs7QUFBQSxHQUFVLE1BQU07QUFDekMsU0FBTyxVQUFVLEVBQUUsTUFBTSxPQUFPLE9BQU8sS0FBSyxNQUFNLElBQUksRUFBRSxTQUFTLEdBQUcsSUFBSSxFQUFFLENBQUM7QUFDN0U7QUFFTyxTQUFTLGFBQWEsUUFBZ0IsTUFBb0I7QUFDL0QsUUFBTSxXQUFXLE9BQU8sU0FBUztBQUNqQyxRQUFNLFNBQVMsT0FBTyxRQUFRLFFBQVEsRUFBRTtBQUN4QyxTQUFPLGFBQWE7QUFBQSxFQUFLO0FBQUEsR0FBVSxFQUFFLE1BQU0sVUFBVSxJQUFJLE9BQU8sQ0FBQztBQUNuRTtBQUVPLFNBQVMsYUFBYSxRQUF3QjtBQUNuRCxTQUFPLE9BQU8sYUFBYSxFQUFFLEtBQUs7QUFDcEM7QUFFTyxTQUFTLHFCQUFxQixRQUFn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QUssS0FBSyxLQUFLLElBQUk7QUFBQSxNQUM3QyxVQUFVLE1BQU0sS0FBSyxJQUFJLE1BQU0sV0FBVyxLQUFLLElBQUk7QUFBQSxJQUNyRDtBQUFBLEVBQ0Y7QUFBQSxFQUVBLE1BQU0sa0JBQ0osSUFDQSxVQUNBLGFBQ0Esa0JBQWtCLEtBQ1c7QUFDN0IsVUFBTSxXQUFXLFlBQVksS0FBSyxVQUFVLEdBQUcsUUFBUTtBQUN2RCxVQUFNLFVBQVUsYUFBYSxJQUFJLGFBQWEsS0FBSyxVQUFVLGlCQUFpQixRQUFRO0FBQ3RGLFVBQU0sV0FBVyxJQUFJLHdCQUFPLHdCQUF3QixDQUFDO0FBQ3JELFFBQUk7QUFDRixhQUFPLE1BQU0sU0FBUyxTQUFTLE9BQU87QUFBQSxJQUN4QyxVQUFFO0FBQ0EsZUFBUyxLQUFLO0FBQUEsSUFDaEI7QUFBQSxFQUNGO0FBQUEsRUFFQSxNQUFNLHFCQUNKLElBQ0EsYUFDQSxpQkFDQSxrQkFBb0MsQ0FBQyxHQUNSO0FBbEVqQztBQW1FSSxVQUFNLFdBQVcsWUFBWSxLQUFLLFVBQVUsR0FBRyxRQUFRO0FBQ3ZELFVBQU0sVUFBNkI7QUFBQSxNQUNqQyxjQUFjLGtCQUFrQixJQUFJLEtBQUs7QUFBQSxNQUN6QztBQUFBLE1BQ0E7QUFBQSxNQUNBLGNBQWEsUUFBRyxnQkFBSCxZQUFrQixLQUFLLFNBQVM7QUFBQSxNQUM3QztBQUFBLE1BQ0EsT0FBTyxHQUFHO0FBQUEsSUFDWjtBQUNBLFVBQU0sV0FBVyxJQUFJLHdCQUFPLHdCQUF3QixDQUFDO0FBQ3JELFFBQUk7QUFDRixhQUFPLE1BQU0sU0FBUyxTQUFTLE9BQU87QUFBQSxJQUN4QyxVQUFFO0FBQ0EsZUFBUyxLQUFLO0FBQUEsSUFDaEI7QUFBQSxFQUNGO0FBQUEsRUFFQSxXQUFXLE1BQW9CLE1BQWMsTUFBdUM7QUFDbEYsU0FBSyxzQkFBUSxLQUFLLFNBQVMsbUJBQW1CLFVBQVU7QUFDdEQscUJBQWUsS0FBSyxRQUFRLElBQUk7QUFBQSxJQUNsQyxPQUFPO0FBQ0wsbUJBQWEsS0FBSyxRQUFRLElBQUk7QUFBQSxJQUNoQztBQUFBLEVBQ0Y7QUFBQSxFQUVBLHdCQUF3QixNQUFvQixVQUFvQztBQTVGbEY7QUE2RkksUUFBSSxDQUFDLEtBQUssU0FBUyxnQkFBZ0I7QUFDakM7QUFBQSxJQUNGO0FBQ0EsVUFBTSxTQUFRLGNBQVMsZ0JBQVQsWUFBd0I7QUFDdEMsVUFBTSxVQUFTLGNBQVMsaUJBQVQsWUFBeUI7QUFDeEMsaUJBQWEsS0FBSyxRQUFRLGdCQUFnQixjQUFjLGdCQUFnQjtBQUFBLEVBQzFFO0FBQ0Y7IiwKICAibmFtZXMiOiBbImltcG9ydF9vYnNpZGlhbiIsICJfYSIsICJpbXBvcnRfb2JzaWRpYW4iLCAiX2EiLCAiaW1wb3J0X29ic2lkaWFuIiwgImltcG9ydF9vYnNpZGlhbiIsICJfYSIsICJpbXBvcnRfb2JzaWRpYW4iLCAiX2EiLCAiaW1wb3J0X29ic2lkaWFuIiwgImltcG9ydF9vYnNpZGlhbiIsICJpbXBvcnRfb2JzaWRpYW4iXQp9Cg==
