export interface ModelParams {
  model: string
  temperature?: number
  top_p?: number
  max_tokens?: number
}

export interface AgentConfig {
  name: string
  prompt: string
  variables: string[]
  observability: string[]
  modelParams?: ModelParams
}

export interface ConnectionConfig {
  from: string
  to: string
  type: string
}

export interface PromptConfig {
  name: string
  text: string
}

export interface AgentConfigData {
  agents: AgentConfig[]
  connections: ConnectionConfig[]
  prompts?: PromptConfig[]
}

export interface Message {
  id: string
  type: 'input' | 'output'
  role: 'user' | 'assistant' | 'system'
  content: string
  status?: 'sending' | 'sent' | 'error'
  error?: string
  timestamp?: number
  metadata?: {
    processingTime?: number
    agent?: string
    model?: string
    [key: string]: any
  }
  isEditing?: boolean
}

export interface AgentResponse {
  id?: string
  content: string
  metadata: {
    finishReason?: string
    usage?: {
      prompt_tokens?: number
      completion_tokens?: number
      total_tokens?: number
      [key: string]: any
    }
    agent: string
    model: string
    processingTime: number
    timestamp: string
    tokensUsed?: number
    variables?: string[]
    observability?: string[]
    prompt?: string
    modelParams?: {
      model: string
      temperature?: number
      top_p?: number
      max_tokens?: number
    }
    error?: string
  }
}
