export type ProviderID = "gemini" | "openai" | "anthropic" | "ollama";
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

export interface SybylSettings {
  activeProvider: ProviderID;
  providers: {
    gemini: GeminiProviderConfig;
    openai: OpenAIProviderConfig;
    anthropic: AnthropicProviderConfig;
    ollama: OllamaProviderConfig;
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
  provider: ProviderID;
  mime_type: string;
  file_uri?: string;
  file_id?: string;
  vault_path?: string;
  expiresAt?: string;
}

export interface NoteFrontMatter {
  game?: string;
  system_prompt_override?: string;
  provider?: ProviderID;
  model?: string;
  temperature?: number;
  sources?: SourceRef[];
  scene_context?: string;
  pc_name?: string;
  pc_notes?: string;
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
  sources: SourceRef[];
  temperature: number;
  maxOutputTokens: number;
  model?: string;
  resolvedSources?: ResolvedSource[];
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
