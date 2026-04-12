import { Notice, TFile } from "obsidian";
import type SybylPlugin from "./main";
import { appendToNote, getSelection, insertBelowSelection } from "./editor";
import { removeSourceRef, upsertSourceRef, writeFrontMatterKey } from "./frontmatter";
import {
  formatAskOracle,
  formatDeclareAction,
  formatExpandScene,
  formatInterpretOracle,
  formatStartScene,
  formatSuggestConsequence,
  LonelogFormatOptions
} from "./lonelog/formatter";
import { parseLonelogContext, serializeContext } from "./lonelog/parser";
import { ManageSourcesModal, openInputModal, pickVaultFile } from "./modals";
import { getProvider } from "./providers";
import { resolveSourcesForRequest } from "./sourceUtils";
import { NoteFrontMatter, SourceRef, SybylSettings, UploadedFileInfo } from "./types";

function isLonelogActive(settings: SybylSettings, fm: NoteFrontMatter): boolean {
  return fm.lonelog ?? settings.lonelogMode;
}

function lonelogOpts(settings: SybylSettings): LonelogFormatOptions {
  return { wrapInCodeBlock: settings.lonelogWrapCodeBlock ?? true };
}

function genericBlockquote(label: string, text: string): string {
  return `> [${label}] ${text.trim().replace(/\n/g, "\n> ")}`;
}

function inferMimeType(file: TFile | File): string {
  const name = "path" in file ? file.path : file.name;
  return name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "text/plain";
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseLonelogOracleResponse(text: string): { result: string; interpretation: string } {
  const lines = text
    .replace(/^>\s*/gm, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const result = lines.find((line) => line.startsWith("->"))?.replace(/^->\s*/, "") ?? "Unclear";
  const interpretation = lines.filter((line) => !line.startsWith("->")).join("\n");
  return { result, interpretation };
}

async function addSourceToNote(plugin: SybylPlugin, file: TFile, fm: NoteFrontMatter): Promise<void> {
  const providerId = fm.provider ?? plugin.settings.activeProvider;
  const vaultFile = await pickVaultFile(plugin.app, "Choose a vault file");
  if (!vaultFile) {
    return;
  }
  const ref: SourceRef = {
    label: vaultFile.basename,
    provider: providerId,
    mime_type: inferMimeType(vaultFile),
    vault_path: vaultFile.path
  };
  await upsertSourceRef(plugin.app, file, ref);
  new Notice(`Source added: ${vaultFile.path}`);
}

async function manageSources(plugin: SybylPlugin): Promise<void> {
  const context = await plugin.getActiveNoteContext();
  if (!context?.view.file) {
    return;
  }
  new ManageSourcesModal(
    plugin.app,
    context.fm.sources ?? [],
    async (ref) => removeSourceRef(plugin.app, context.view.file!, ref),
    async (ref) => {
      const provider = getProvider(plugin.settings, ref.provider);
      await provider.deleteSource(ref as UploadedFileInfo);
      await removeSourceRef(plugin.app, context.view.file!, ref);
    },
    async () => addSourceToNote(plugin, context.view.file!, context.fm)
  ).open();
}

async function runGeneration(
  plugin: SybylPlugin,
  userMessage: string,
  formatter: (text: string, fm: NoteFrontMatter) => string,
  maxOutputTokens = 512,
  placement?: "cursor" | "end-of-note" | "below-selection"
): Promise<void> {
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
    new Notice(`Sybyl error: ${error instanceof Error ? error.message : String(error)}`);
    console.error(error);
  }
}

export function registerAllCommands(plugin: SybylPlugin): void {
  plugin.addCommand({
    id: "sybyl:insert-frontmatter",
    name: "Insert Note Frontmatter",
    callback: async () => {
      const context = await plugin.getActiveNoteContext();
      if (!context?.view.file) {
        return;
      }
      const values = await openInputModal(plugin.app, "Insert Sybyl Frontmatter", [
        { key: "game", label: "Game / system", placeholder: "Ironsworn" },
        { key: "pc_name", label: "PC name", optional: true },
        { key: "pc_notes", label: "PC notes", optional: true, placeholder: "Ironclad warrior, scar on left cheek" },
        { key: "language", label: "Language", optional: true, placeholder: "Leave blank for auto-detect" }
      ]);
      if (!values) {
        return;
      }
      if (!values.game) {
        new Notice("Game name is required.");
        return;
      }
      await plugin.app.fileManager.processFrontMatter(context.view.file, (fm) => {
        fm["game"] = values.game;
        fm["provider"] = fm["provider"] ?? plugin.settings.activeProvider;
        fm["oracle_mode"] = fm["oracle_mode"] ?? "yes-no";
        fm["lonelog"] = fm["lonelog"] ?? plugin.settings.lonelogMode;
        fm["scene_counter"] = fm["scene_counter"] ?? 1;
        fm["session_number"] = fm["session_number"] ?? 1;
        fm["game_context"] = fm["game_context"] ?? "";
        fm["scene_context"] = fm["scene_context"] ?? "";
        if (values.pc_name) fm["pc_name"] = values.pc_name;
        if (values.pc_notes) fm["pc_notes"] = values.pc_notes;
        if (values.language) fm["language"] = values.language;
      });
      new Notice("Sybyl frontmatter inserted.");
    }
  });

  plugin.addCommand({
    id: "sybyl:digest-source",
    name: "Digest Source into Game Context",
    callback: async () => {
      const context = await plugin.getActiveNoteContext();
      if (!context?.view.file) {
        return;
      }
      const vaultFile = await pickVaultFile(plugin.app, "Choose a source file to digest");
      if (!vaultFile) {
        return;
      }
      const providerId = context.fm.provider ?? plugin.settings.activeProvider;
      const ref: SourceRef = {
        label: vaultFile.basename,
        provider: providerId,
        mime_type: inferMimeType(vaultFile),
        vault_path: vaultFile.path
      };
      let resolvedSources;
      try {
        resolvedSources = await resolveSourcesForRequest(plugin.app, [ref], providerId);
      } catch (error) {
        new Notice(`Cannot read source: ${error instanceof Error ? error.message : String(error)}`);
        return;
      }
      const game = context.fm.game ?? "the game";
      const digestPrompt = `Distill the following source material for use in a solo tabletop RPG session of "${game}".

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
          2000,
          resolvedSources
        );
        await plugin.app.fileManager.processFrontMatter(context.view.file, (fm) => {
          fm["game_context"] = response.text;
        });
        new Notice("Game context updated.");
      } catch (error) {
        new Notice(`Sybyl error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  });

  plugin.addCommand({
    id: "sybyl:start-scene",
    name: "Start Scene",
    callback: async () => {
      const context = await plugin.getActiveNoteContext();
      if (!context?.view.file) {
        return;
      }
      if (isLonelogActive(plugin.settings, context.fm)) {
        const values = await openInputModal(plugin.app, "Start Scene", [
          { key: "sceneDesc", label: "Scene description", placeholder: "Dark alley, midnight" }
        ]);
        if (!values?.sceneDesc) {
          return;
        }
        const counter = context.fm.scene_counter ?? 1;
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
      if (!values?.action || !values.roll) {
        return;
      }
      await runGeneration(
        plugin,
        `PC action: ${values.action}\nRoll result: ${values.roll}\nDescribe only the consequences and world reaction. Do not describe the PC's action.`,
        (text, fm) =>
          isLonelogActive(plugin.settings, fm)
            ? formatDeclareAction(values.action, values.roll, text, lonelogOpts(plugin.settings))
            : `> [Action] ${values.action} | Roll: ${values.roll}\n> [Result] ${text.trim().replace(/\n/g, "\n> ")}`
      );
    }
  });

  plugin.addCommand({
    id: "sybyl:ask-oracle",
    name: "Ask Oracle",
    callback: async () => {
      const context = await plugin.getActiveNoteContext();
      if (!context) {
        return;
      }
      const values = await openInputModal(plugin.app, "Ask Oracle", [
        { key: "question", label: "Question" },
        { key: "result", label: "Oracle result", optional: true }
      ]);
      if (!values?.question) {
        return;
      }
      const hasResult = Boolean(values.result?.trim());
      const message = hasResult
        ? `Oracle question: ${values.question}\nOracle result: ${values.result}\nInterpret this result in the context of the scene. Third person, neutral, 2-3 lines.`
        : `Oracle question: ${values.question}\nOracle mode: ${context.fm.oracle_mode ?? "yes-no"}\nRun the oracle and give the result plus a 1-2 line neutral interpretation.`;
      await runGeneration(
        plugin,
        message,
        (text, fm) => {
          if (!isLonelogActive(plugin.settings, fm)) {
            return `> [Oracle] Q: ${values.question}\n> [Answer] ${text.trim().replace(/\n/g, "\n> ")}`;
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
    name: "Interpret Oracle Result",
    callback: async () => {
      const context = await plugin.getActiveNoteContext();
      if (!context) {
        return;
      }
      let selected = getSelection(context.view.editor);
      if (!selected) {
        const values = await openInputModal(plugin.app, "Interpret Oracle Result", [
          { key: "oracle", label: "Oracle result" }
        ]);
        selected = values?.oracle?.trim() ?? "";
      }
      if (!selected) {
        return;
      }
      await runGeneration(
        plugin,
        `Interpret this oracle result in the context of the current scene: "${selected}"\nNeutral, third-person, 2-3 lines. No dramatic language.`,
        (text, fm) =>
          isLonelogActive(plugin.settings, fm)
            ? formatInterpretOracle(selected, text, lonelogOpts(plugin.settings))
            : genericBlockquote("Interpretation", text),
        512,
        "below-selection"
      );
    }
  });

  plugin.addCommand({
    id: "sybyl:suggest-consequence",
    name: "Suggest Consequence",
    callback: async () => {
      await runGeneration(
        plugin,
        "Based on the current scene context, suggest 1-2 possible consequences or complications. Present them as neutral options, not as narrative outcomes. Do not choose between them.",
        (text, fm) =>
          isLonelogActive(plugin.settings, fm)
            ? formatSuggestConsequence(text, lonelogOpts(plugin.settings))
            : genericBlockquote("Options", text)
      );
    }
  });

  plugin.addCommand({
    id: "sybyl:expand-scene",
    name: "Expand Scene into Prose",
    callback: async () => {
      await runGeneration(
        plugin,
        "Expand the current scene into a prose passage. Third person, past tense, 100-150 words. No dialogue. Do not describe the PC's internal thoughts or decisions. Stay strictly within the established scene context.",
        (text, fm) =>
          isLonelogActive(plugin.settings, fm)
            ? formatExpandScene(text, lonelogOpts(plugin.settings))
            : `---\n> [Prose] ${text.trim().replace(/\n/g, "\n> ")}\n---`,
        300
      );
    }
  });

  plugin.addCommand({
    id: "sybyl:upload-source",
    name: "Add Source File",
    callback: async () => {
      const context = await plugin.getActiveNoteContext();
      if (!context?.view.file) {
        return;
      }
      try {
        await addSourceToNote(plugin, context.view.file, context.fm);
      } catch (error) {
        new Notice(`Sybyl error: ${error instanceof Error ? error.message : String(error)}`);
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
    id: "sybyl:lonelog-new-scene",
    name: "New Scene",
    callback: async () => {
      const context = await plugin.getActiveNoteContext();
      if (!context?.view.file) {
        return;
      }
      if (!isLonelogActive(plugin.settings, context.fm)) {
        new Notice("Lonelog mode is not enabled for this note.");
        return;
      }
      const values = await openInputModal(plugin.app, "New Scene", [
        { key: "sceneDesc", label: "Scene description", placeholder: "Dark alley, midnight" }
      ]);
      if (!values?.sceneDesc) {
        return;
      }
      const counter = context.fm.scene_counter ?? 1;
      await runGeneration(
        plugin,
        `START SCENE. Generate only: 2-3 lines of third-person past-tense prose describing the atmosphere and setting of: "${values.sceneDesc}". No dialogue. No PC actions. No additional commentary.`,
        (text) => formatStartScene(text, `S${counter}`, values.sceneDesc, lonelogOpts(plugin.settings))
      );
      if (plugin.settings.lonelogAutoIncScene) {
        await writeFrontMatterKey(plugin.app, context.view.file, "scene_counter", counter + 1);
      }
    }
  });

  plugin.addCommand({
    id: "sybyl:lonelog-parse-context",
    name: "Update Scene Context from Log",
    callback: async () => {
      const context = await plugin.getActiveNoteContext();
      if (!context?.view.file) {
        return;
      }
      if (!isLonelogActive(plugin.settings, context.fm)) {
        new Notice("Lonelog mode is not enabled for this note.");
        return;
      }
      const parsed = parseLonelogContext(context.noteBody, plugin.settings.lonelogContextDepth);
      await writeFrontMatterKey(plugin.app, context.view.file, "scene_context", serializeContext(parsed));
      new Notice("Scene context updated from log.");
    }
  });

  plugin.addCommand({
    id: "sybyl:lonelog-session-break",
    name: "New Session Header",
    callback: async () => {
      const context = await plugin.getActiveNoteContext();
      if (!context?.view.file) {
        return;
      }
      if (!isLonelogActive(plugin.settings, context.fm)) {
        new Notice("Lonelog mode is not enabled for this note.");
        return;
      }
      const values = await openInputModal(plugin.app, "New Session Header", [
        { key: "date", label: "Date", value: todayIsoDate() },
        { key: "duration", label: "Duration", placeholder: "1h30" },
        { key: "recap", label: "Recap", optional: true }
      ]);
      if (!values?.date) {
        return;
      }
      const sessionNumber = context.fm.session_number ?? 1;
      const block = `## Session ${sessionNumber}\n*Date: ${values.date} | Duration: ${values.duration || "-"}*\n\n${values.recap ? `**Recap:** ${values.recap}\n\n` : ""}`;
      plugin.insertText(context.view, block, "cursor");
      await writeFrontMatterKey(plugin.app, context.view.file, "session_number", sessionNumber + 1);
    }
  });
}
