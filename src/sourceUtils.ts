import { App, TAbstractFile, TFile, normalizePath } from "obsidian";
import { ProviderID, ResolvedSource, SourceRef } from "./types";

const TEXT_EXTENSIONS = new Set(["txt", "md", "markdown", "json", "yaml", "yml", "csv"]);

function getVaultFile(app: App, vaultPath: string): TFile {
  const normalized = normalizePath(vaultPath);
  const file = app.vault.getAbstractFileByPath(normalized);
  if (!(file instanceof TFile)) {
    throw new Error(`Source file not found in vault: ${vaultPath}`);
  }
  return file;
}

export async function readVaultTextSource(app: App, vaultPath: string): Promise<string> {
  const file = getVaultFile(app, vaultPath);
  const extension = file.extension.toLowerCase();
  if (!TEXT_EXTENSIONS.has(extension)) {
    throw new Error(`Text extraction is only supported for text files. Add a .txt companion for '${vaultPath}'.`);
  }
  return app.vault.cachedRead(file);
}

export async function readVaultBinarySource(app: App, vaultPath: string): Promise<ArrayBuffer> {
  const file = getVaultFile(app, vaultPath);
  return app.vault.readBinary(file);
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export async function resolveSourcesForRequest(
  app: App,
  sources: SourceRef[],
  providerId: ProviderID
): Promise<ResolvedSource[]> {
  const resolved: ResolvedSource[] = [];
  for (const ref of sources) {
    if (providerId === "anthropic" || (providerId === "gemini" && ref.mime_type === "application/pdf")) {
      const buffer = await readVaultBinarySource(app, ref.vault_path);
      resolved.push({ ref, base64Data: arrayBufferToBase64(buffer) });
      continue;
    }
    const text = await readVaultTextSource(app, ref.vault_path);
    resolved.push({ ref, textContent: text });
  }
  return resolved;
}

export function truncateSourceText(text: string, maxChars = 4000): string {
  return text.length <= maxChars ? text : text.slice(0, maxChars);
}

export function describeSourceRef(ref: SourceRef): string {
  return ref.vault_path;
}

export function listVaultCandidateFiles(app: App): TFile[] {
  return app.vault
    .getFiles()
    .filter((file) => ["pdf", "txt", "md", "markdown"].includes(file.extension.toLowerCase()))
    .sort((a, b) => a.path.localeCompare(b.path));
}

export function isTFile(file: TAbstractFile | null): file is TFile {
  return Boolean(file) && file instanceof TFile;
}
