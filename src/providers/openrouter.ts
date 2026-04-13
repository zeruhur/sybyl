import { requestUrl, RequestUrlResponse } from "obsidian";
import {
  GenerationRequest,
  GenerationResponse,
  OpenRouterProviderConfig,
  UploadedFileInfo
} from "../types";
import { truncateSourceText } from "../sourceUtils";
import { AIProvider } from "./base";

const BASE_URL = "https://openrouter.ai/api/v1";

function asErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class OpenRouterProvider implements AIProvider {
  readonly id = "openrouter";
  readonly name = "OpenRouter";

  constructor(private readonly config: OpenRouterProviderConfig) {}

  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    this.ensureConfigured();
    const model = request.model || this.config.defaultModel;
    const sourceBlocks = (request.resolvedSources ?? [])
      .filter((source) => source.textContent)
      .map((source) => `[SOURCE: ${source.ref.label}]\n${truncateSourceText(source.textContent ?? "")}\n[END SOURCE]`);

    const response = await requestUrl({
      url: `${BASE_URL}/chat/completions`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.config.apiKey}`,
        "HTTP-Referer": "obsidian-sybyl",
        "X-Title": "Sybyl"
      },
      body: JSON.stringify({
        model,
        max_tokens: request.maxOutputTokens,
        temperature: request.temperature,
        messages: [
          { role: "system", content: request.systemPrompt },
          {
            role: "user",
            content: sourceBlocks.length
              ? `${sourceBlocks.join("\n\n")}\n\n${request.userMessage}`
              : request.userMessage
          }
        ]
      }),
      throw: false
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(this.extractError(response));
    }

    const data = response.json;
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
    throw new Error("OpenRouter does not support file upload. Use vault_path instead.");
  }

  async listSources(): Promise<UploadedFileInfo[]> {
    return [];
  }

  async deleteSource(): Promise<void> {}

  async listModels(): Promise<string[]> {
    if (!this.config.apiKey.trim()) return [];
    try {
      const response = await requestUrl({
        url: `${BASE_URL}/models`,
        headers: {
          "Authorization": `Bearer ${this.config.apiKey}`
        },
        throw: false
      });
      if (response.status < 200 || response.status >= 300) return [];
      const data = response.json;
      return (data.data ?? [])
        .filter((m: { architecture?: { modality?: string } }) =>
          m.architecture?.modality?.endsWith("->text"))
        .map((m: { id?: string }) => m.id ?? "")
        .filter(Boolean)
        .sort();
    } catch {
      return [];
    }
  }

  async validate(): Promise<boolean> {
    if (!this.config.apiKey.trim()) return false;
    try {
      const response = await requestUrl({
        url: `${BASE_URL}/models`,
        headers: { "Authorization": `Bearer ${this.config.apiKey}` },
        throw: false
      });
      return response.status >= 200 && response.status < 300;
    } catch {
      return false;
    }
  }

  private ensureConfigured(): void {
    if (!this.config.apiKey.trim()) {
      throw new Error("No OpenRouter API key set. Check plugin settings.");
    }
  }

  private extractError(response: RequestUrlResponse): string {
    if (response.status === 401 || response.status === 403) {
      return "OpenRouter API key rejected. Check settings.";
    }
    try {
      const data = response.json;
      const msg = data?.error?.message ?? `OpenRouter request failed (${response.status}).`;
      if (response.status === 429) {
        if (msg === "Provider returned error") {
          return "OpenRouter: free model endpoint at capacity. Retry in a moment or pick a different model.";
        }
        return `OpenRouter rate limit: ${msg}`;
      }
      return msg;
    } catch (error) {
      return asErrorMessage(error) || `OpenRouter request failed (${response.status}).`;
    }
  }
}
