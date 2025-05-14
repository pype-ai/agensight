import { TraceItem } from "@/hooks/use-trace-column";

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
  details?: SpanDetails; // Optional details that will be loaded when a span is selected
}

export interface TraceDetailPageProps {
  id: string;
  name: string;
  latency: number;
  router: any;
  total_tokens: number;
}

export interface GanttChartProps {
  spans: Span[];
  trace: TraceItem | null;
}


// GanttChartVisualizer component - only handles the visual representation
export interface GanttChartVisualizerProps {
  spans: Span[];
  trace: TraceItem | null;
  onSelectSpan: (span: Span) => void;
  onSelectTool: (tool: ToolCall) => void;
  selectedSpanId?: string;
}