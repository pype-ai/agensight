export interface ModelConfig {
  model: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
  stop?: string[];
}

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  model: "gpt-4o",
  temperature: 0.7,
  max_tokens: 2000,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0,
};

export const OPENAI_MODELS = [
  { id: "gpt-4o", name: "GPT-4o (Latest)" },
  { id: "gpt-4-turbo-preview", name: "GPT-4 Turbo" },
  { id: "gpt-4", name: "GPT-4" },
  { id: "gpt-4-32k", name: "GPT-4 32K" },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
  { id: "gpt-3.5-turbo-16k", name: "GPT-3.5 Turbo 16K" },
];
