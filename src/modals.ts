import { App, Modal, Notice, Setting, TFile } from "obsidian";
import { describeSourceRef, listVaultCandidateFiles } from "./sourceUtils";
import { IPluginFacade, ModalField, ProviderID, SourceRef } from "./types";
import { getProvider } from "./providers";

export class InputModal extends Modal {
  private readonly values: Record<string, string>;

  constructor(
    app: App,
    private readonly title: string,
    private readonly fields: ModalField[],
    private readonly onSubmit: (values: Record<string, string>) => void
  ) {
    super(app);
    this.values = fields.reduce<Record<string, string>>((acc, field) => {
      acc[field.key] = field.value ?? "";
      return acc;
    }, {});
  }

  onOpen(): void {
    this.titleEl.setText(this.title);
    this.contentEl.empty();
    for (const field of this.fields) {
      new Setting(this.contentEl)
        .setName(field.label)
        .setDesc(field.optional ? "Optional" : "")
        .addText((text) => {
          text.setPlaceholder(field.placeholder ?? "");
          text.setValue(this.values[field.key] ?? "");
          text.onChange((value) => {
            this.values[field.key] = value;
          });
        });
    }
    new Setting(this.contentEl).addButton((button) => {
      button.setButtonText("Confirm").setCta().onClick(() => {
        this.onSubmit(this.values);
        this.close();
      });
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export function openInputModal(
  app: App,
  title: string,
  fields: ModalField[]
): Promise<Record<string, string> | null> {
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

export function pickLocalFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.txt,.md,.markdown";
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

export class VaultFilePickerModal extends Modal {
  private readonly files: TFile[];

  constructor(app: App, private readonly title: string, private readonly onPick: (file: TFile) => void) {
    super(app);
    this.files = listVaultCandidateFiles(app);
  }

  onOpen(): void {
    this.titleEl.setText(this.title);
    this.contentEl.empty();
    if (!this.files.length) {
      this.contentEl.createEl("p", { text: "No PDF or text files found in the vault." });
      return;
    }
    this.files.forEach((file) => {
      new Setting(this.contentEl)
        .setName(file.path)
        .setDesc(file.extension.toLowerCase())
        .addButton((button) => {
          button.setButtonText("Select").setCta().onClick(() => {
            this.onPick(file);
            this.close();
          });
        });
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export function pickVaultFile(app: App, title: string): Promise<TFile | null> {
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

export class SourceOriginModal extends Modal {
  constructor(app: App, private readonly onPick: (origin: "vault" | "external") => void) {
    super(app);
  }

  onOpen(): void {
    this.titleEl.setText("Add Source File");
    this.contentEl.empty();
    new Setting(this.contentEl)
      .setName("Vault file")
      .setDesc("Pick a file already in your vault")
      .addButton((btn) => btn.setButtonText("Choose").setCta().onClick(() => {
        this.onPick("vault");
        this.close();
      }));
    new Setting(this.contentEl)
      .setName("External file")
      .setDesc("Import a file from your computer — saved into a sources/ subfolder next to this note")
      .addButton((btn) => btn.setButtonText("Import").setCta().onClick(() => {
        this.onPick("external");
        this.close();
      }));
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export function pickSourceOrigin(app: App): Promise<"vault" | "external" | null> {
  return new Promise((resolve) => {
    let settled = false;
    const modal = new SourceOriginModal(app, (origin) => {
      settled = true;
      resolve(origin);
    });
    const originalClose = modal.onClose.bind(modal);
    modal.onClose = () => {
      originalClose();
      if (!settled) resolve(null);
    };
    modal.open();
  });
}

export class SourcePickerModal extends Modal {
  constructor(
    app: App,
    private readonly title: string,
    private readonly sources: SourceRef[],
    private readonly onPick: (ref: SourceRef) => void
  ) {
    super(app);
  }

  onOpen(): void {
    this.titleEl.setText(this.title);
    this.contentEl.empty();
    this.sources.forEach((source) => {
      new Setting(this.contentEl)
        .setName(source.label)
        .setDesc(`${source.mime_type} | ${describeSourceRef(source)}`)
        .addButton((button) => {
          button.setButtonText("Select").setCta().onClick(() => {
            this.onPick(source);
            this.close();
          });
        });
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export function pickSourceRef(app: App, title: string, sources: SourceRef[]): Promise<SourceRef | null> {
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

export interface QuickMenuItem {
  label: string;
  commandId: string;
}

export class QuickMenuModal extends Modal {
  private readonly items: QuickMenuItem[];

  constructor(app: App, private readonly plugin: IPluginFacade) {
    super(app);
    this.items = [
      { label: "Start Scene",           commandId: "sybyl:start-scene" },
      { label: "Declare Action",        commandId: "sybyl:declare-action" },
      { label: "Ask Oracle",            commandId: "sybyl:ask-oracle" },
      { label: "Interpret Oracle Roll", commandId: "sybyl:interpret-oracle-roll" },
      { label: "What Now",              commandId: "sybyl:what-now" },
      { label: "What Can I Do",         commandId: "sybyl:what-can-i-do" },
      { label: "Expand Scene",          commandId: "sybyl:expand-scene" }
    ];
  }

  onOpen(): void {
    this.titleEl.setText("Sybyl");
    this.contentEl.empty();
    for (const item of this.items) {
      new Setting(this.contentEl)
        .setName(item.label)
        .addButton((btn) =>
          btn.setButtonText("Run").setCta().onClick(() => {
            this.close();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (this.app as any).commands.executeCommandById(item.commandId);
          })
        );
    }
    const active = this.plugin.settings.activeProvider;
    const activeModel = this.plugin.settings.providers[active].defaultModel;
    new Setting(this.contentEl)
      .setName("Switch Provider / Model")
      .setDesc(`${active} / ${activeModel}`)
      .addButton((btn) =>
        btn.setButtonText("Switch").onClick(() => {
          this.close();
          new ProviderSwitchModal(this.app, this.plugin).open();
        })
      );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class ProviderSwitchModal extends Modal {
  private selectedProvider: ProviderID;
  private selectedModel: string;
  private availableModels: string[] = [];

  constructor(app: App, private readonly plugin: IPluginFacade) {
    super(app);
    this.selectedProvider = plugin.settings.activeProvider;
    this.selectedModel = plugin.settings.providers[this.selectedProvider].defaultModel;
  }

  onOpen(): void {
    this.titleEl.setText("Switch Provider / Model");
    this.render();
    void this.fetchModels();
  }

  private render(): void {
    this.contentEl.empty();

    new Setting(this.contentEl)
      .setName("Provider")
      .addDropdown((dd) => {
        dd.addOption("gemini", "Gemini");
        dd.addOption("openai", "OpenAI");
        dd.addOption("anthropic", "Anthropic (Claude)");
        dd.addOption("ollama", "Ollama (local)");
        dd.addOption("openrouter", "OpenRouter");
        dd.setValue(this.selectedProvider);
        dd.onChange((value) => {
          this.selectedProvider = value as ProviderID;
          this.selectedModel = this.plugin.settings.providers[this.selectedProvider].defaultModel;
          this.availableModels = [];
          this.render();
          void this.fetchModels();
        });
      });

    const models = this.availableModels.length
      ? (this.availableModels.includes(this.selectedModel)
          ? this.availableModels
          : [this.selectedModel, ...this.availableModels])
      : [this.selectedModel];

    new Setting(this.contentEl)
      .setName("Model")
      .addDropdown((dd) => {
        models.forEach((m) => dd.addOption(m, m));
        dd.setValue(this.selectedModel);
        dd.onChange((value) => { this.selectedModel = value; });
      });

    new Setting(this.contentEl)
      .addButton((btn) =>
        btn.setButtonText("Switch").setCta().onClick(async () => {
          this.plugin.settings.activeProvider = this.selectedProvider;
          this.plugin.settings.providers[this.selectedProvider].defaultModel = this.selectedModel;
          await this.plugin.saveSettings();
          new Notice(`Sybyl: ${this.selectedProvider} / ${this.selectedModel}`);
          this.close();
        })
      );
  }

  private async fetchModels(): Promise<void> {
    try {
      const models = await getProvider(this.plugin.settings, this.selectedProvider).listModels();
      if (models.length > 0) {
        this.availableModels = models;
        if (!models.includes(this.selectedModel)) {
          this.selectedModel = models[0];
        }
        this.render();
      }
    } catch {
      // silently fail — dropdown keeps showing current default
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class ManageSourcesModal extends Modal {
  constructor(
    app: App,
    private readonly sources: SourceRef[],
    private readonly onRemove: (ref: SourceRef) => Promise<void>
  ) {
    super(app);
  }

  onOpen(): void {
    this.titleEl.setText("Manage Sources");
    this.render();
  }

  private render(): void {
    this.contentEl.empty();
    if (!this.sources.length) {
      this.contentEl.createEl("p", { text: "No sources are attached to this note." });
      return;
    }
    this.sources.forEach((source) => {
      new Setting(this.contentEl)
        .setName(source.label)
        .setDesc(`${source.mime_type} | ${describeSourceRef(source)}`)
        .addButton((button) => {
          button.setButtonText("Remove").onClick(async () => {
            await this.onRemove(source);
            new Notice(`Removed '${source.label}'.`);
            this.close();
          });
        });
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

