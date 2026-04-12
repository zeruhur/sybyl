import { App } from "obsidian";
import { parseLonelogContext, serializeContext } from "./lonelog/parser";
import { resolveSourcesForRequest } from "./sourceUtils";
import { GenerationRequest, NoteFrontMatter, ProviderID, SybylSettings } from "./types";

const LONELOG_SYSTEM_ADDENDUM = `
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

function buildBasePrompt(fm: NoteFrontMatter): string {
  const game = fm.game ?? "the game";
  const pcName = fm.pc_name ? `The player character is ${fm.pc_name}.` : "";
  const pcNotes = fm.pc_notes ? `PC notes: ${fm.pc_notes}` : "";
  const language = fm.language
    ? `Respond in ${fm.language}.`
    : "Respond in the same language as the user's input.";

  return `You are a tool for solo role-playing of ${game}. You are NOT a game master.

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

${pcName}
${pcNotes}
${language}`.trim();
}

export function buildSystemPrompt(fm: NoteFrontMatter, lonelogMode: boolean): string {
  const base = fm.system_prompt_override?.trim() || buildBasePrompt(fm);
  return lonelogMode ? `${base}\n\n${LONELOG_SYSTEM_ADDENDUM}` : base;
}

export async function buildRequest(
  app: App,
  fm: NoteFrontMatter,
  userMessage: string,
  settings: SybylSettings,
  maxOutputTokens = 512,
  noteBody?: string
): Promise<GenerationRequest> {
  const provider = (fm.provider ?? settings.activeProvider) as ProviderID;
  const sources = (fm.sources ?? []).filter((source) => source.provider === provider);
  const lonelogActive = fm.lonelog ?? settings.lonelogMode;

  let contextBlock = "";
  if (fm.scene_context?.trim()) {
    contextBlock = `SCENE CONTEXT:\n${fm.scene_context.trim()}`;
  } else if (lonelogActive && noteBody) {
    const ctx = parseLonelogContext(noteBody, settings.lonelogContextDepth);
    contextBlock = serializeContext(ctx);
  }

  const contextMessage = contextBlock ? `${contextBlock}\n\n${userMessage}` : userMessage;

  return {
    systemPrompt: buildSystemPrompt(fm, lonelogActive),
    userMessage: contextMessage,
    sources,
    temperature: fm.temperature ?? settings.defaultTemperature,
    maxOutputTokens,
    model: fm.model,
    resolvedSources: await resolveSourcesForRequest(app, sources, provider)
  };
}
