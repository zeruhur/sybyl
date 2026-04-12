import {
  GenerationRequest,
  GenerationResponse,
  OllamaProviderConfig,
  UploadedFileInfo
} from "../types";
import { truncateSourceText } from "../sourceUtils";
import { AIProvider } from "./base";

interface OllamaTagsResponse {
  models?: Array<{ name?: string }>;
}

export class OllamaProvider implements AIProvider {
  readonly id = "ollama";
  readonly name = "Ollama";

  constructor(private readonly config: OllamaProviderConfig) {}

  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    const baseUrl = this.config.baseUrl.replace(/\/$/, "");
    const model = request.model || this.config.defaultModel;
    const sourceBlocks = (request.resolvedSources ?? [])
      .filter((source) => source.textContent)
      .map((source) => `[SOURCE: ${source.ref.label}]\n${truncateSourceText(source.textContent ?? "")}\n[END SOURCE]`);

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        options: {
          temperature: request.temperature,
          num_predict: request.maxOutputTokens
        },
        messages: [
          { role: "system", content: request.systemPrompt },
          {
            role: "user",
            content: sourceBlocks.length
              ? `${sourceBlocks.join("\n\n")}\n\n${request.userMessage}`
              : request.userMessage
          }
        ]
      })
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Model '${model}' not found in Ollama. Check available models in settings.`);
      }
      throw new Error(`Ollama not reachable at ${baseUrl}. Is it running?`);
    }

    const data = await response.json();
    const text = data.message?.content?.trim?.() ?? "";
    if (!text) {
      throw new Error("Provider returned an empty response.");
    }

    return {
      text,
      inputTokens: data.prompt_eval_count,
      outputTokens: data.eval_count
    };
  }

  async uploadSource(): Promise<UploadedFileInfo> {
    throw new Error("Ollama does not support file upload. Add a vault_path source instead.");
  }

  async listSources(): Promise<UploadedFileInfo[]> {
    return [];
  }

  async deleteSource(): Promise<void> {}

  async validate(): Promise<boolean> {
    try {
      const tags = await this.fetchTags();
      return Boolean(tags.models?.length);
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    const tags = await this.fetchTags();
    return (tags.models ?? []).map((model) => model.name ?? "").filter(Boolean);
  }

  private async fetchTags(): Promise<OllamaTagsResponse> {
    const response = await fetch(`${this.config.baseUrl.replace(/\/$/, "")}/api/tags`);
    if (!response.ok) {
      throw new Error(`Ollama not reachable at ${this.config.baseUrl}. Is it running?`);
    }
    return response.json();
  }
}
