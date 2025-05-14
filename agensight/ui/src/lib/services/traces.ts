import { TraceItem } from "@/hooks/use-trace-column";

// Define the interfaces
export interface ToolCall {
  args: Record<string, string>;
  duration: number;
  name: string;
  output: string;
  span_id: string;
}

export interface Prompt {
  content: string;
  id: number;
  message_index: number;
  role: string;
  span_id: string;
}

export interface Completion {
  completion_tokens: number;
  content: string;
  finish_reason: string;
  id: number;
  prompt_tokens: number;
  role: string;
  span_id: string;
  total_tokens: number;
}

export interface SpanDetails {
  span_id: string;
  prompts: Prompt[];
  completions: Completion[];
  tools: ToolCall[];
}

export interface Span {
  duration: number;
  end_time: number;
  final_completion: string;
  name: string;
  span_id: string;
  start_time: number;
  tools_called: ToolCall[];
  details?: SpanDetails;
}

// API base URL
const API_BASE_URL = "http://0.0.0.0:5001/api";

// Service functions for API use
export async function getTraceById(id: string): Promise<any> {
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`${API_BASE_URL}/traces/${id}/spans`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error fetching trace: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Error fetching trace: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Failed to fetch trace with ID ${id} (attempt ${attempt}/${maxRetries}):`, error);
      if (attempt === maxRetries) throw error;
      // Wait before retrying (exponential backoff)
      await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt-1)));
    }
  }
}

export async function getSpanDetailsById(spanId: string): Promise<SpanDetails> {
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`${API_BASE_URL}/span/${spanId}/details`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error fetching span details: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Error fetching span details: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Failed to fetch span details with ID ${spanId} (attempt ${attempt}/${maxRetries}):`, error);
      if (attempt === maxRetries) throw error;
      // Wait before retrying
      await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt-1)));
    }
  }
  
  // Unreachable but needed for TypeScript
  throw new Error('Failed to fetch span details');
}

// For future expansion - if you ever need to fetch all traces
export async function getAllTraces(): Promise<any[]> {
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`${API_BASE_URL}/traces`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error fetching traces: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Error fetching traces: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Failed to fetch all traces (attempt ${attempt}/${maxRetries}):`, error);
      if (attempt === maxRetries) throw error;
      // Wait before retrying
      await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt-1)));
    }
  }
  
  return [];
} 