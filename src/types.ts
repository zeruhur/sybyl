export type ProviderID = "gemini" | "openai" | "anthropic" | "ollama" | "openrouter";
export type OracleMode = "yes-no" | "fate" | "custom";
export type InsertionMode = "cursor" | "end-of-note";

export interface GeminiProviderConfig {
  apiKey: string;
  defaultModel: string;
}

export interface OpenAIProviderConfig {
  apiKey: string;
  defaultModel: string;
  baseUrl: string;
}

export interface AnthropicProviderConfig {
  apiKey: string;
  defaultModel: string;
}

export interface OllamaProviderConfig {
  baseUrl: string;
  defaultModel: string;
}

export interface OpenRouterProviderConfig {
  apiKey: string;
  defaultModel: string;
}

export interface SybylSettings {
  activeProvider: ProviderID;
  providers: {
    gemini: GeminiProviderConfig;
    openai: OpenAIProviderConfig;
    anthropic: AnthropicProviderConfig;
    ollama: OllamaProviderConfig;
    openrouter: OpenRouterProviderConfig;
  };
  insertionMode: InsertionMode;
  showTokenCount: boolean;
  defaultTemperature: number;
  lonelogMode: boolean;
  lonelogContextDepth: number;
  lonelogWrapCodeBlock: boolean;
  lonelogAutoIncScene: boolean;
}

export interface SourceRef {
  label: string;
  mime_type: string;
  vault_path: string;
}

export interface NoteFrontMatter {
  // Lonelog standard fields
  ruleset?: string;
  genre?: string;
  pcs?: string;
  tone?: string;
  // Sybyl-specific fields
  system_prompt_override?: string;
  provider?: ProviderID;
  model?: string;
  temperature?: number;
  sources?: SourceRef[];
  game_context?: string;
  scene_context?: string;
  oracle_mode?: OracleMode;
  language?: string;
  lonelog?: boolean;
  scene_counter?: number;
  session_number?: number;
}

export interface ResolvedSource {
  ref: SourceRef;
  textContent?: string;
  base64Data?: string;
}

export interface GenerationRequest {
  systemPrompt: string;
  userMessage: string;
  temperature: number;
  maxOutputTokens: number;
  model?: string;
  resolvedSources: ResolvedSource[];
}

export interface GenerationResponse {
  text: string;
  inputTokens?: number;
  outputTokens?: number;
}

export interface UploadedFileInfo {
  provider: ProviderID;
  label: string;
  file_uri?: string;
  file_id?: string;
  mime_type: string;
  expiresAt?: string;
}

export interface ValidationState {
  status: "idle" | "checking" | "valid" | "invalid";
  message?: string;
}

export interface ModalField {
  key: string;
  label: string;
  placeholder?: string;
  value?: string;
  optional?: boolean;
}
