import { App, TFile } from "obsidian";
import { NoteFrontMatter, SourceRef } from "./types";

export async function readFrontMatter(app: App, file: TFile): Promise<NoteFrontMatter> {
  const cache = app.metadataCache.getFileCache(file);
  return (cache?.frontmatter as NoteFrontMatter) ?? {};
}

export async function writeFrontMatterKey(
  app: App,
  file: TFile,
  key: keyof NoteFrontMatter | "sources",
  value: unknown
): Promise<void> {
  await app.fileManager.processFrontMatter(file, (fm) => {
    fm[key] = value;
  });
}

export async function appendSceneContext(
  app: App,
  file: TFile,
  text: string,
  maxChars = 2000
): Promise<void> {
  await app.fileManager.processFrontMatter(file, (fm) => {
    const current = String(fm["scene_context"] ?? "").trim();
    const updated = [current, text].filter(Boolean).join("\n").trim();
    fm["scene_context"] = updated.length > maxChars ? "..." + updated.slice(-maxChars) : updated;
  });
}

export async function upsertSourceRef(app: App, file: TFile, ref: SourceRef): Promise<void> {
  await app.fileManager.processFrontMatter(file, (fm) => {
    const current = Array.isArray(fm["sources"]) ? [...fm["sources"]] : [];
    const next = current.filter((item: SourceRef) => item.vault_path !== ref.vault_path);
    next.push(ref);
    fm["sources"] = next;
  });
}

export async function removeSourceRef(app: App, file: TFile, ref: SourceRef): Promise<void> {
  await app.fileManager.processFrontMatter(file, (fm) => {
    const current = Array.isArray(fm["sources"]) ? [...fm["sources"]] : [];
    fm["sources"] = current.filter((item: SourceRef) => item.vault_path !== ref.vault_path);
  });
}
