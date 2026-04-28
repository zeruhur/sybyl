import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type SybylPlugin from "./main";
import { getProvider } from "./providers";
import { OllamaProvider } from "./providers/ollama";
import { ProviderID, SybylSettings, ValidationState } from "./types";

export const DEFAULT_SETTINGS: SybylSettings = {
  activeProvider: "gemini",
  providers: {
    gemini: { apiKey: "", defaultModel: "gemma-4-26b-a4b-it" },
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

export function normalizeSettings(raw: Partial<SybylSettings> | null | undefined): SybylSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...(raw ?? {}),
    providers: {
      gemini: { ...DEFAULT_SETTINGS.providers.gemini, ...(raw?.providers?.gemini ?? {}) },
      openai: { ...DEFAULT_SETTINGS.providers.openai, ...(raw?.providers?.openai ?? {}) },
      anthropic: { ...DEFAULT_SETTINGS.providers.anthropic, ...(raw?.providers?.anthropic ?? {}) },
      ollama: { ...DEFAULT_SETTINGS.providers.ollama, ...(raw?.providers?.ollama ?? {}) },
      openrouter: { ...DEFAULT_SETTINGS.providers.openrouter, ...(raw?.providers?.openrouter ?? {}) }
    }
  };
}

export class SybylSettingTab extends PluginSettingTab {
  private validation: Partial<Record<ProviderID, ValidationState>> = {};
  private modelCache: Partial<Record<ProviderID, string[]>> = {};
  private fetchingProviders = new Set<ProviderID>();

  constructor(app: App, private readonly plugin: SybylPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: `Sybyl Settings (${this.providerLabel(this.plugin.settings.activeProvider)})` });
    this.maybeFetchModels();
    this.renderActiveProvider(containerEl);
    this.renderProviderConfig(containerEl);
    this.renderGlobalSettings(containerEl);
  }

  private maybeFetchModels(): void {
    const active = this.plugin.settings.activeProvider;
    if (active === "ollama") {
      if (!this.modelCache.ollama && !this.fetchingProviders.has("ollama")) {
        void this.fetchModels("ollama");
      }
      return;
    }
    const config = this.plugin.settings.providers[active];
    const apiKey = (config as { apiKey?: string }).apiKey?.trim();
    if (apiKey && !this.modelCache[active] && !this.fetchingProviders.has(active)) {
      void this.fetchModels(active);
    }
  }

  private async fetchModels(provider: ProviderID): Promise<void> {
    this.fetchingProviders.add(provider);
    try {
      const models = await getProvider(this.plugin.settings, provider).listModels();
      if (models.length > 0) {
        this.modelCache[provider] = models;
      }
    } catch {
      // silently fail — dropdown keeps showing current default
    } finally {
      this.fetchingProviders.delete(provider);
      this.display();
    }
  }

  private renderActiveProvider(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName("Active Provider")
      .setDesc("Used when a note does not override provider.")
      .addDropdown((dropdown) => {
        dropdown.addOption("gemini", "Gemini");
        dropdown.addOption("openai", "OpenAI");
        dropdown.addOption("anthropic", "Anthropic (Claude)");
        dropdown.addOption("ollama", "Ollama (local)");
        dropdown.addOption("openrouter", "OpenRouter");
        dropdown.setValue(this.plugin.settings.activeProvider);
        dropdown.onChange(async (value) => {
          this.plugin.settings.activeProvider = value as ProviderID;
          await this.plugin.saveSettings();
          this.display();
        });
      });
  }

  private renderProviderConfig(containerEl: HTMLElement): void {
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

  private renderGeminiSettings(containerEl: HTMLElement): void {
    const config = this.plugin.settings.providers.gemini;
    this.renderValidationState(containerEl, "gemini");
    new Setting(containerEl)
      .setName("API Key")
      .addText((text) => {
        text.inputEl.type = "password";
        text.setValue(config.apiKey);
        text.onChange(async (value) => {
          config.apiKey = value;
          this.modelCache.gemini = undefined;
          await this.plugin.saveSettings();
        });
        text.inputEl.addEventListener("blur", () => void this.validateProvider("gemini"));
      });
    new Setting(containerEl)
      .setName("Default Model")
      .addDropdown((dropdown) => {
        const models = this.modelOptionsFor("gemini", config.defaultModel);
        models.forEach((m) => dropdown.addOption(m, m));
        dropdown.setValue(config.defaultModel);
        dropdown.onChange(async (value) => {
          config.defaultModel = value;
          await this.plugin.saveSettings();
        });
      });
  }

  private renderOpenAISettings(containerEl: HTMLElement): void {
    const config = this.plugin.settings.providers.openai;
    this.renderValidationState(containerEl, "openai");
    new Setting(containerEl)
      .setName("API Key")
      .addText((text) => {
        text.inputEl.type = "password";
        text.setValue(config.apiKey);
        text.onChange(async (value) => {
          config.apiKey = value;
          this.modelCache.openai = undefined;
          await this.plugin.saveSettings();
        });
        text.inputEl.addEventListener("blur", () => void this.validateProvider("openai"));
      });
    new Setting(containerEl)
      .setName("Base URL")
      .setDesc("Override for Azure or proxy endpoints")
      .addText((text) => {
        text.setValue(config.baseUrl);
        text.onChange(async (value) => {
          config.baseUrl = value;
          this.modelCache.openai = undefined;
          await this.plugin.saveSettings();
        });
        text.inputEl.addEventListener("blur", () => void this.validateProvider("openai"));
      });
    new Setting(containerEl)
      .setName("Default Model")
      .addDropdown((dropdown) => {
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

  private renderAnthropicSettings(containerEl: HTMLElement): void {
    const config = this.plugin.settings.providers.anthropic;
    this.renderValidationState(containerEl, "anthropic");
    new Setting(containerEl)
      .setName("API Key")
      .addText((text) => {
        text.inputEl.type = "password";
        text.setValue(config.apiKey);
        text.onChange(async (value) => {
          config.apiKey = value;
          this.modelCache.anthropic = undefined;
          await this.plugin.saveSettings();
        });
        text.inputEl.addEventListener("blur", () => void this.validateProvider("anthropic"));
      });
    new Setting(containerEl)
      .setName("Default Model")
      .addDropdown((dropdown) => {
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

  private renderOpenRouterSettings(containerEl: HTMLElement): void {
    const config = this.plugin.settings.providers.openrouter;
    this.renderValidationState(containerEl, "openrouter");
    new Setting(containerEl)
      .setName("API Key")
      .addText((text) => {
        text.inputEl.type = "password";
        text.setValue(config.apiKey);
        text.onChange(async (value) => {
          config.apiKey = value;
          this.modelCache.openrouter = undefined;
          await this.plugin.saveSettings();
        });
        text.inputEl.addEventListener("blur", () => void this.validateProvider("openrouter"));
      });
    new Setting(containerEl)
      .setName("Default Model")
      .addDropdown((dropdown) => {
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

  private renderOllamaSettings(containerEl: HTMLElement): void {
    const config = this.plugin.settings.providers.ollama;
    this.renderValidationState(containerEl, "ollama");
    new Setting(containerEl)
      .setName("Base URL")
      .addText((text) => {
        text.setValue(config.baseUrl);
        text.onChange(async (value) => {
          config.baseUrl = value;
          await this.plugin.saveSettings();
        });
        text.inputEl.addEventListener("blur", () => void this.validateOllama());
      });
    new Setting(containerEl)
      .setName("Available Models")
      .addDropdown((dropdown) => {
        const models = this.modelOptionsFor("ollama", config.defaultModel);
        models.forEach((m) => dropdown.addOption(m, m));
        dropdown.setValue(config.defaultModel);
        dropdown.onChange(async (value) => {
          config.defaultModel = value;
          await this.plugin.saveSettings();
          this.display();
        });
      });
    new Setting(containerEl)
      .setName("Default Model")
      .addText((text) => {
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

  private renderGlobalSettings(containerEl: HTMLElement): void {
    containerEl.createEl("h3", { text: "Global Settings" });
    new Setting(containerEl)
      .setName("Default Temperature")
      .setDesc(String(this.plugin.settings.defaultTemperature))
      .addSlider((slider) => {
        slider.setLimits(0, 1, 0.05);
        slider.setValue(this.plugin.settings.defaultTemperature);
        slider.onChange(async (value) => {
          this.plugin.settings.defaultTemperature = value;
          await this.plugin.saveSettings();
          this.display();
        });
      });
    new Setting(containerEl)
      .setName("Insertion Mode")
      .addDropdown((dropdown) => {
        dropdown.addOption("cursor", "At cursor");
        dropdown.addOption("end-of-note", "End of note");
        dropdown.setValue(this.plugin.settings.insertionMode);
        dropdown.onChange(async (value) => {
          this.plugin.settings.insertionMode = value as "cursor" | "end-of-note";
          await this.plugin.saveSettings();
        });
      });
    new Setting(containerEl)
      .setName("Show Token Count")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.showTokenCount);
        toggle.onChange(async (value) => {
          this.plugin.settings.showTokenCount = value;
          await this.plugin.saveSettings();
        });
      });
    new Setting(containerEl)
      .setName("Lonelog Mode")
      .setDesc("Enable Lonelog notation, context parsing, and Lonelog-specific commands.")
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.lonelogMode);
        toggle.onChange(async (value) => {
          this.plugin.settings.lonelogMode = value;
          await this.plugin.saveSettings();
          this.display();
        });
      });
    if (this.plugin.settings.lonelogMode) {
      new Setting(containerEl)
        .setName("Auto-increment scene counter")
        .addToggle((toggle) => {
          toggle.setValue(this.plugin.settings.lonelogAutoIncScene);
          toggle.onChange(async (value) => {
            this.plugin.settings.lonelogAutoIncScene = value;
            await this.plugin.saveSettings();
          });
        });
      new Setting(containerEl)
        .setName("Context extraction depth")
        .addText((text) => {
          text.setValue(String(this.plugin.settings.lonelogContextDepth));
          text.onChange(async (value) => {
            const next = Number(value);
            if (!Number.isNaN(next) && next > 0) {
              this.plugin.settings.lonelogContextDepth = next;
              await this.plugin.saveSettings();
            }
          });
        });
      new Setting(containerEl)
        .setName("Wrap notation in code blocks")
        .addToggle((toggle) => {
          toggle.setValue(this.plugin.settings.lonelogWrapCodeBlock);
          toggle.onChange(async (value) => {
            this.plugin.settings.lonelogWrapCodeBlock = value;
            await this.plugin.saveSettings();
          });
        });
    }
  }

  private modelOptionsFor(provider: ProviderID, currentModel: string): string[] {
    const cached = this.modelCache[provider];
    if (!cached) return [currentModel];
    return cached.includes(currentModel) ? cached : [currentModel, ...cached];
  }

  private renderValidationState(containerEl: HTMLElement, provider: ProviderID): void {
    const state = this.validation[provider];
    if (!state || state.status === "idle") {
      return;
    }
    containerEl.createEl("p", {
      text:
        state.status === "checking"
          ? "Validation: checking..."
          : state.status === "valid"
            ? "Validation: ✓"
            : `Validation: ✗${state.message ? ` (${state.message})` : ""}`
    });
  }

  private providerLabel(provider: ProviderID): string {
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

  private async validateProvider(provider: ProviderID): Promise<void> {
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

  private async validateOllama(): Promise<void> {
    this.validation.ollama = { status: "checking" };
    this.display();
    try {
      const provider = new OllamaProvider(this.plugin.settings.providers.ollama);
      const valid = await provider.validate();
      this.validation.ollama = { status: valid ? "valid" : "invalid" };
      this.modelCache.ollama = valid ? await provider.listModels() : undefined;
    } catch (error) {
      this.validation.ollama = {
        status: "invalid",
        message: error instanceof Error ? error.message : String(error)
      };
      this.modelCache.ollama = undefined;
      new Notice(this.validation.ollama.message ?? "Ollama validation failed.");
    }
    this.display();
  }
}
