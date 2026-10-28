import { z } from "zod";

export interface AIProviderCapabilities {
  structuredOutputs: boolean;
  toolCalling: boolean;
  maxContextTokens: number;
}

export interface GenerateStructuredOptions<T> {
  prompt: string;
  systemPrompt?: string;
  schema: z.ZodType<T>;
  apiKey?: string;
  model?: string;
  maxTokens?: number;
}

export interface StructuredGenerationResult<T> {
  data: T;
  tokensUsed: number;
  model: string;
}

export interface AIProvider {
  getProviderName(): string;
  isConfigured(apiKey?: string): boolean;
  validateKey(apiKey: string): Promise<{ valid: boolean; error?: string }>;
  generateStructured<T>(
    options: GenerateStructuredOptions<T>
  ): Promise<StructuredGenerationResult<T>>;
}
