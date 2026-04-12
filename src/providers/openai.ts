import {
  GenerationRequest,
  GenerationResponse,
  OpenAIProviderConfig,
  UploadedFileInfo
} from "../types";
import { truncateSourceText } from "../sourceUtils";
import { AIProvider } from "./base";

export class OpenAIProvider implements AIProvider {
  readonly id = "openai";
  readonly name = "OpenAI";

  constructor(private readonly config: OpenAIProviderConfig) {}

  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    this.ensureConfigured();
    const baseUrl = this.config.baseUrl.replace(/\/$/, "");
    const model = request.model || this.config.defaultModel;
    const sourceBlocks = (request.resolvedSources ?? [])
      .filter((source) => source.textContent)
      .map((source) => `[SOURCE: ${source.ref.label}]\n${truncateSourceText(source.textContent ?? "")}\n[END SOURCE]`);

    const body: Record<string, unknown> = {
      model,
      max_tokens: request.maxOutputTokens,
      messages: [
        { role: "system", content: request.systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: sourceBlocks.length
                ? `${sourceBlocks.join("\n\n")}\n\n${request.userMessage}`
                : request.userMessage
            }
          ]
        }
      ]
    };

    if (!model.startsWith("gpt-5")) {
      body.temperature = request.temperature;
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(await this.extractError(response));
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim?.() ?? "";
    if (!text) {
      throw new Error("Provider returned an empty response.");
    }

    return {
      text,
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens
    };
  }

  async uploadSource(): Promise<UploadedFileInfo> {
    throw new Error("This provider does not support file upload. Use vault_path instead.");
  }

  async listSources(): Promise<UploadedFileInfo[]> {
    return [];
  }

  async deleteSource(): Promise<void> {}

  async validate(): Promise<boolean> {
    if (!this.config.apiKey.trim()) {
      return false;
    }
    try {
      const response = await fetch(`${this.config.baseUrl.replace(/\/$/, "")}/models`, {
        headers: { Authorization: `Bearer ${this.config.apiKey}` }
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private ensureConfigured(): void {
    if (!this.config.apiKey.trim()) {
      throw new Error("No OpenAI API key set. Check plugin settings.");
    }
  }

  private async extractError(response: Response): Promise<string> {
    if (response.status === 401 || response.status === 403) {
      return "OpenAI API key rejected. Check settings.";
    }
    if (response.status === 429) {
      return "Rate limit hit. Wait a moment and retry.";
    }
    try {
      const data = await response.json();
      return data.error?.message ?? `OpenAI request failed (${response.status}).`;
    } catch {
      return `OpenAI request failed (${response.status}).`;
    }
  }
}
