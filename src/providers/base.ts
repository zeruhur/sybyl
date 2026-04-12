import { GenerationRequest, GenerationResponse, UploadedFileInfo } from "../types";

export interface AIProvider {
  readonly id: string;
  readonly name: string;
  generate(request: GenerationRequest): Promise<GenerationResponse>;
  uploadSource(fileContent: ArrayBuffer, mimeType: string, displayName: string): Promise<UploadedFileInfo>;
  listSources(): Promise<UploadedFileInfo[]>;
  deleteSource(ref: UploadedFileInfo): Promise<void>;
  validate(): Promise<boolean>;
}
