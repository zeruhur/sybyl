import { MarkdownView, Notice, Plugin } from "obsidian";
import { appendToNote, insertAtCursor } from "./editor";
import { buildRequest, buildSystemPrompt } from "./promptBuilder";
import { readFrontMatter } from "./frontmatter";
import { getProvider } from "./providers";
import { registerAllCommands } from "./commands";
import { QuickMenuModal } from "./modals";
import { DEFAULT_SETTINGS, SybylSettingTab, normalizeSettings } from "./settings";
import { GenerationRequest, GenerationResponse, NoteFrontMatter, ResolvedSource, SybylSettings } from "./types";

export interface ActiveNoteContext {
  view: MarkdownView;
  fm: NoteFrontMatter;
  noteBody: string;
}

export default class SybylPlugin extends Plugin {
  settings: SybylSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new SybylSettingTab(this.app, this));
    registerAllCommands(this);
    this.addRibbonIcon("dice", "Sybyl", () => {
      new QuickMenuModal(this.app, this).open();
    });
  }

  async loadSettings(): Promise<void> {
    this.settings = normalizeSettings(await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async getActiveNoteContext(): Promise<ActiveNoteContext | null> {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view?.file) {
      new Notice("No active markdown note.");
      return null;
    }
    return {
      view,
      fm: await readFrontMatter(this.app, view.file),
      noteBody: await this.app.vault.cachedRead(view.file)
    };
  }

  async requestGeneration(
    fm: NoteFrontMatter,
    noteBody: string,
    userMessage: string,
    maxOutputTokens = 512
  ): Promise<GenerationResponse> {
    const provider = getProvider(this.settings);
    const request = buildRequest(fm, userMessage, this.settings, maxOutputTokens, noteBody);
    const progress = new Notice("Sybyl: Generating...", 0);
    try {
      return await provider.generate(request);
    } finally {
      progress.hide();
    }
  }

  async requestRawGeneration(
    fm: NoteFrontMatter,
    userMessage: string,
    maxOutputTokens: number,
    resolvedSources: ResolvedSource[] = []
  ): Promise<GenerationResponse> {
    const provider = getProvider(this.settings);
    const request: GenerationRequest = {
      systemPrompt: buildSystemPrompt(fm, false),
      userMessage,
      resolvedSources,
      temperature: fm.temperature ?? this.settings.defaultTemperature,
      maxOutputTokens
    };
    const progress = new Notice("Sybyl: Generating...", 0);
    try {
      return await provider.generate(request);
    } finally {
      progress.hide();
    }
  }

  insertText(view: MarkdownView, text: string, mode?: "cursor" | "end-of-note"): void {
    if ((mode ?? this.settings.insertionMode) === "cursor") {
      insertAtCursor(view.editor, text);
    } else {
      appendToNote(view.editor, text);
    }
  }

  maybeInsertTokenComment(view: MarkdownView, response: GenerationResponse): void {
    if (!this.settings.showTokenCount) {
      return;
    }
    const input = response.inputTokens ?? "N/A";
    const output = response.outputTokens ?? "N/A";
    appendToNote(view.editor, `<!-- tokens: ${input} in / ${output} out -->`);
  }
}
