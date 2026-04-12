import { App, Modal, Notice, Setting, TFile } from "obsidian";
import { describeSourceRef, listVaultCandidateFiles } from "./sourceUtils";
import { ModalField, SourceRef } from "./types";

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
            this.close();
            this.onPick(file);
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

export class ManageSourcesModal extends Modal {
  constructor(
    app: App,
    private readonly sources: SourceRef[],
    private readonly onRemoveFromNote: (ref: SourceRef) => Promise<void>,
    private readonly onDeleteFromProvider: (ref: SourceRef) => Promise<void>,
    private readonly onAddSource: () => Promise<void>
  ) {
    super(app);
  }

  onOpen(): void {
    this.titleEl.setText("Manage Sources");
    this.render();
  }

  private render(): void {
    this.contentEl.empty();
    new Setting(this.contentEl).addButton((button) => {
      button.setButtonText("Add source").setCta().onClick(async () => {
        await this.onAddSource();
        this.close();
      });
    });
    if (!this.sources.length) {
      this.contentEl.createEl("p", { text: "No sources are attached to this note." });
      return;
    }
    this.sources.forEach((source) => {
      new Setting(this.contentEl)
        .setName(source.label)
        .setDesc(`${source.provider} | ${describeSourceRef(source)}${source.expiresAt ? ` | Expires ${source.expiresAt}` : ""}`)
        .addButton((button) => {
          button.setButtonText("Remove from note").onClick(async () => {
            await this.onRemoveFromNote(source);
            new Notice(`Removed '${source.label}' from note.`);
            this.close();
          });
        })
        .addButton((button) => {
          button.setButtonText("Delete from provider");
          if (!(source.file_uri || source.file_id)) {
            button.setDisabled(true);
            return;
          }
          button.onClick(async () => {
            await this.onDeleteFromProvider(source);
            new Notice(`Deleted '${source.label}' from provider.`);
            this.close();
          });
        });
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

