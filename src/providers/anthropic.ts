import { requestUrl, RequestUrlResponse } from "obsidian";
import {
  AnthropicProviderConfig,
  GenerationRequest,
  GenerationResponse,
  UploadedFileInfo
} from "../types";
import { AIProvider } from "./base";

export class AnthropicProvider implements AIProvider {
  readonly id = "anthropic";
  readonly name = "Anthropic";

  constructor(private readonly config: AnthropicProviderConfig) {}

  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    this.ensureConfigured();
    const model = request.model || this.config.defaultModel;
    const content: Array<Record<string, unknown>> = [];

    for (const source of request.resolvedSources ?? []) {
      if (source.base64Data && source.ref.mime_type === "application/pdf") {
        content.push({
          type: "document",
          source: {
            type: "base64",
            media_type: source.ref.mime_type,
            data: source.base64Data
          }
        });
      } else if (source.textContent) {
        content.push({
          type: "text",
          text: `[SOURCE: ${source.ref.label}]\n${source.textContent}\n[END SOURCE]`
        });
      }
    }

    content.push({ type: "text", text: request.userMessage });

    const response = await requestUrl({
      url: "https://api.anthropic.com/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.config.apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model,
        max_tokens: request.maxOutputTokens,
        temperature: request.temperature,
        system: request.systemPrompt,
        messages: [{ role: "user", content }]
      }),
      throw: false
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(this.extractError(response));
    }

    const data = response.json;
    const text = (data.content ?? [])
      .map((item: { text?: string }) => item.text ?? "")
      .join("")
      .trim();
    if (!text) {
      throw new Error("Provider returned an empty response.");
    }

    return {
      text,
      inputTokens: data.usage?.input_tokens,
      outputTokens: data.usage?.output_tokens
    };
  }

  async uploadSource(): Promise<UploadedFileInfo> {
    throw new Error("Anthropic does not support persistent file upload. Use vault_path instead.");
  }

  async listSources(): Promise<UploadedFileInfo[]> {
    return [];
  }

  async deleteSource(): Promise<void> {}

  async listModels(): Promise<string[]> {
    if (!this.config.apiKey.trim()) return [];
    try {
      const response = await requestUrl({
        url: "https://api.anthropic.com/v1/models",
        headers: {
          "x-api-key": this.config.apiKey,
          "anthropic-version": "2023-06-01"
        },
        throw: false
      });
      if (response.status < 200 || response.status >= 300) return [];
      const data = response.json;
      return (data.data ?? [])
        .map((m: { id?: string }) => m.id ?? "")
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  async validate(): Promise<boolean> {
    if (!this.config.apiKey.trim()) {
      return false;
    }
    try {
      const response = await requestUrl({
        url: "https://api.anthropic.com/v1/messages",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.config.apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: this.config.defaultModel,
          max_tokens: 1,
          messages: [{ role: "user", content: [{ type: "text", text: "ping" }] }]
        }),
        throw: false
      });
      return response.status >= 200 && response.status < 300;
    } catch {
      return false;
    }
  }

  private ensureConfigured(): void {
    if (!this.config.apiKey.trim()) {
      throw new Error("No Anthropic API key set. Check plugin settings.");
    }
  }

  private extractError(response: RequestUrlResponse): string {
    if (response.status === 401 || response.status === 403) {
      return "Anthropic API key rejected. Check settings.";
    }
    try {
      const data = response.json;
      const msg = data?.error?.message ?? `Anthropic request failed (${response.status}).`;
      return response.status === 429 ? `Anthropic quota/rate error: ${msg}` : msg;
    } catch {
      return `Anthropic request failed (${response.status}).`;
    }
  }
}
