import { Editor } from "obsidian";

export function insertAtCursor(editor: Editor, text: string): void {
  const cursor = editor.getCursor();
  editor.replaceRange(`\n${text}\n`, cursor);
  editor.setCursor({ line: cursor.line + text.split("\n").length + 1, ch: 0 });
}

export function appendToNote(editor: Editor, text: string): void {
  const lastLine = editor.lastLine();
  const lastCh = editor.getLine(lastLine).length;
  editor.replaceRange(`\n${text}\n`, { line: lastLine, ch: lastCh });
}

export function getSelection(editor: Editor): string {
  return editor.getSelection().trim();
}

export function insertBelowSelection(editor: Editor, text: string): void {
  const selection = editor.listSelections()[0];
  const targetLine = selection ? selection.head.line : editor.getCursor().line;
  editor.replaceRange(`\n${text}`, { line: targetLine, ch: editor.getLine(targetLine).length });
}
