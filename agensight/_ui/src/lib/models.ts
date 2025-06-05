export interface ModelConfig {
  model: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
  stop_sequences?: string[];
  stop?: string[]; // For backward compatibility
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
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
  { id: "gpt-4o", name: "GPT-4o" },
  { id: "gpt-4o-2024-11-20", name: "GPT-4o (2024-11-20)" },
  { id: "gpt-4o-2024-08-06", name: "GPT-4o (2024-08-06)" },
  { id: "gpt-4o-2024-05-13", name: "GPT-4o (2024-05-13)" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini" },
  { id: "gpt-4o-mini-2024-07-18", name: "GPT-4o Mini (2024-07-18)" },
  { id: "ft:gpt-4o-mini-2024-07-18:pype:material-classifier:AcqBNEo4", name: "GPT-4o Mini Pype" },
  { id: "ft:gpt-4o-mini-2024-07-18:pype:material-classifier-large:AdcJlNn4", name: "GPT-4o Mini Pype Large" },
  { id: "chatgpt-4o-latest", name: "ChatGPT-4o Latest" },
  { id: "gpt-4.1", name: "GPT-4.1" },
  { id: "gpt-4.1-2025-04-14", name: "GPT-4.1 (2025-04-14)" },
  { id: "gpt-4.1-mini-2025-04-14", name: "GPT-4.1 Mini (2025-04-14)" },
  { id: "gpt-4.1-nano", name: "GPT-4.1 Nano" },
  { id: "gpt-4.1-nano-2025-04-14", name: "GPT-4.1 Nano (2025-04-14)" },
  { id: "gpt-4.5-preview", name: "GPT-4.5 Preview" }
];
