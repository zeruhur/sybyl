import { requestUrl, RequestUrlResponse } from "obsidian";
import {
  GeminiProviderConfig,
  GenerationRequest,
  GenerationResponse,
  UploadedFileInfo
} from "../types";
import { AIProvider } from "./base";

function asErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class GeminiProvider implements AIProvider {
  readonly id = "gemini";
  readonly name = "Gemini";

  constructor(private readonly config: GeminiProviderConfig) {}

  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    this.ensureConfigured();
    const model = request.model || this.config.defaultModel;
    const endpoint =
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(this.config.apiKey)}`;

    const parts: Array<Record<string, unknown>> = [];
    for (const source of request.resolvedSources ?? []) {
      if (source.base64Data) {
        parts.push({
          inlineData: {
            mimeType: source.ref.mime_type,
            data: source.base64Data
          }
        });
      } else if (source.textContent) {
        parts.push({ text: `[SOURCE: ${source.ref.label}]\n${source.textContent}\n[END SOURCE]` });
      }
    }
    parts.push({ text: request.userMessage });

    const response = await requestUrl({
      url: endpoint,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: request.systemPrompt }] },
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: request.temperature,
          maxOutputTokens: request.maxOutputTokens
        }
      }),
      throw: false
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(this.extractError(response, "Gemini"));
    }

    const data = response.json;
    const text = (data.candidates?.[0]?.content?.parts ?? [])
      .map((part: { text?: string }) => part.text ?? "")
      .join("")
      .trim();

    if (!text) {
      throw new Error("Provider returned an empty response.");
    }

    return {
      text,
      inputTokens: data.usageMetadata?.promptTokenCount,
      outputTokens: data.usageMetadata?.candidatesTokenCount
    };
  }

  async uploadSource(): Promise<UploadedFileInfo> {
    throw new Error("Use 'Add Source' from the note to attach a vault file inline.");
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
      const response = await requestUrl({
        url: `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(this.config.apiKey)}`,
        throw: false
      });
      return response.status >= 200 && response.status < 300;
    } catch {
      return false;
    }
  }

  private ensureConfigured(): void {
    if (!this.config.apiKey.trim()) {
      throw new Error("No Gemini API key set. Check plugin settings.");
    }
  }

  private extractError(response: RequestUrlResponse, providerName: string): string {
    if (response.status === 401 || response.status === 403) {
      return `${providerName} API key rejected. Check settings.`;
    }
    if (response.status === 429) {
      return "Rate limit hit. Wait a moment and retry.";
    }
    try {
      const data = response.json;
      return data?.error?.message ?? `${providerName} request failed (${response.status}).`;
    } catch (error) {
      return asErrorMessage(error) || `${providerName} request failed (${response.status}).`;
    }
  }
}
