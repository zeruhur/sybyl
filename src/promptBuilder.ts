import { parseLonelogContext, serializeContext } from "./lonelog/parser";
import { GenerationRequest, NoteFrontMatter, SybylSettings } from "./types";

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
  const ruleset = fm.ruleset ?? "the game";
  const pcs = fm.pcs ? `Player character: ${fm.pcs}` : "";
  const tone = fm.tone ? `Tone: ${fm.tone}` : "";
  const language = fm.language
    ? `Respond in ${fm.language}.`
    : "Respond in the same language as the user's input.";

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

export function buildSystemPrompt(fm: NoteFrontMatter, lonelogMode: boolean): string {
  const base = fm.system_prompt_override?.trim() || buildBasePrompt(fm);
  let prompt = lonelogMode ? `${base}\n\n${LONELOG_SYSTEM_ADDENDUM}` : base;
  if (fm.game_context?.trim()) {
    prompt = `${prompt}\n\nGAME CONTEXT:\n${fm.game_context.trim()}`;
  }
  return prompt;
}

export function buildRequest(
  fm: NoteFrontMatter,
  userMessage: string,
  settings: SybylSettings,
  maxOutputTokens = 512,
  noteBody?: string
): GenerationRequest {
  const lonelogActive = fm.lonelog ?? settings.lonelogMode;

  let contextBlock = "";
  if (lonelogActive && noteBody) {
    // In Lonelog mode the live note body is always the source of truth
    const ctx = parseLonelogContext(noteBody, settings.lonelogContextDepth);
    contextBlock = serializeContext(ctx);
  } else if (fm.scene_context?.trim()) {
    // For non-Lonelog notes, use the manually maintained scene_context
    contextBlock = `SCENE CONTEXT:\n${fm.scene_context.trim()}`;
  }

  const contextMessage = contextBlock ? `${contextBlock}\n\n${userMessage}` : userMessage;

  return {
    systemPrompt: buildSystemPrompt(fm, lonelogActive),
    userMessage: contextMessage,
    temperature: fm.temperature ?? settings.defaultTemperature,
    maxOutputTokens,
    model: fm.model,
    resolvedSources: []
  };
}
