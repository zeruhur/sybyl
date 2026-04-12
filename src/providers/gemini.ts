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
    for (const source of request.sources) {
      if (source.file_uri) {
        parts.push({
          file_data: {
            mime_type: source.mime_type,
            file_uri: source.file_uri
          }
        });
      }
    }
    parts.push({ text: request.userMessage });

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: request.systemPrompt }] },
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: request.temperature,
          maxOutputTokens: request.maxOutputTokens
        }
      })
    });

    if (!response.ok) {
      throw new Error(await this.extractError(response, "Gemini"));
    }

    const data = await response.json();
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

  async uploadSource(
    fileContent: ArrayBuffer,
    mimeType: string,
    displayName: string
  ): Promise<UploadedFileInfo> {
    this.ensureConfigured();
    if (fileContent.byteLength > 20 * 1024 * 1024) {
      throw new Error("File too large. Gemini File API limit is 20MB.");
    }

    const startResponse = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${encodeURIComponent(this.config.apiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Upload-Protocol": "resumable",
          "X-Goog-Upload-Command": "start",
          "X-Goog-Upload-Header-Content-Length": String(fileContent.byteLength),
          "X-Goog-Upload-Header-Content-Type": mimeType
        },
        body: JSON.stringify({ file: { display_name: displayName } })
      }
    );

    if (!startResponse.ok) {
      throw new Error(await this.extractError(startResponse, "Gemini"));
    }

    const uploadUrl = startResponse.headers.get("X-Goog-Upload-URL");
    if (!uploadUrl) {
      throw new Error("Gemini upload failed to return a resumable upload URL.");
    }

    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Length": String(fileContent.byteLength),
        "X-Goog-Upload-Offset": "0",
        "X-Goog-Upload-Command": "upload, finalize"
      },
      body: fileContent
    });

    if (!uploadResponse.ok) {
      throw new Error(await this.extractError(uploadResponse, "Gemini"));
    }

    const uploaded = await uploadResponse.json();
    const fileName = uploaded.file?.name ?? uploaded.name;
    if (!fileName) {
      throw new Error("Gemini upload did not return file metadata.");
    }

    const file = await this.waitForActiveFile(fileName);
    return {
      provider: "gemini",
      label: displayName,
      mime_type: mimeType,
      file_uri: file.uri,
      expiresAt: file.expirationTime
    };
  }

  async listSources(): Promise<UploadedFileInfo[]> {
    this.ensureConfigured();
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/files?key=${encodeURIComponent(this.config.apiKey)}`
    );
    if (!response.ok) {
      throw new Error(await this.extractError(response, "Gemini"));
    }
    const data = await response.json();
    return (data.files ?? []).map((file: Record<string, string>) => ({
      provider: "gemini" as const,
      label: file.displayName ?? file.name ?? "Untitled",
      mime_type: file.mimeType ?? "application/octet-stream",
      file_uri: file.uri,
      expiresAt: file.expirationTime
    }));
  }

  async deleteSource(ref: UploadedFileInfo): Promise<void> {
    this.ensureConfigured();
    if (!ref.file_uri) {
      return;
    }
    const match = ref.file_uri.match(/files\/[^/?]+$/);
    const name = ref.file_uri.startsWith("files/") ? ref.file_uri : match?.[0] ?? ref.file_uri;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${name}?key=${encodeURIComponent(this.config.apiKey)}`,
      { method: "DELETE" }
    );
    if (!response.ok) {
      throw new Error(await this.extractError(response, "Gemini"));
    }
  }

  async validate(): Promise<boolean> {
    if (!this.config.apiKey.trim()) {
      return false;
    }
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(this.config.apiKey)}`
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  private ensureConfigured(): void {
    if (!this.config.apiKey.trim()) {
      throw new Error("No Gemini API key set. Check plugin settings.");
    }
  }

  private async waitForActiveFile(name: string): Promise<Record<string, string>> {
    const start = Date.now();
    while (Date.now() - start < 30_000) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${name}?key=${encodeURIComponent(this.config.apiKey)}`
      );
      if (!response.ok) {
        throw new Error(await this.extractError(response, "Gemini"));
      }
      const data = await response.json();
      const file = data.file ?? data;
      if (file.state === "ACTIVE") {
        return file;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 2000));
    }
    throw new Error("Timed out waiting for Gemini file activation.");
  }

  private async extractError(response: Response, providerName: string): Promise<string> {
    if (response.status === 401 || response.status === 403) {
      return `${providerName} API key rejected. Check settings.`;
    }
    if (response.status === 429) {
      return "Rate limit hit. Wait a moment and retry.";
    }
    try {
      const data = await response.json();
      return data.error?.message ?? `${providerName} request failed (${response.status}).`;
    } catch (error) {
      return asErrorMessage(error) || `${providerName} request failed (${response.status}).`;
    }
  }
}
