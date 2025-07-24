import { AgentConfig, Message } from "@/lib/types/agent"

// Base URL for the LLM API
const LLM_API_BASE = "http://0.0.0.0:5001/api/llm"

interface LLMResponse {
  content: string
  model: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  metadata?: Record<string, any>
}

/**
 * Calls the LLM API to generate a response based on the agent's configuration
 */
export async function generateLLMResponse(
  agentConfig: AgentConfig,
  userInput: string,
  previousMessages: Message[] = []
): Promise<LLMResponse> {
  try {
    // Prepare the messages array for the chat completion
    const messages: Array<{
      role: 'system' | 'user' | 'assistant'
      content: string
    }> = []

    // Add system message from agent's prompt
    if (agentConfig.prompt) {
      messages.push({
        role: 'system',
        content: agentConfig.prompt
      })
    }

    // Add previous messages
    previousMessages.forEach(msg => {
      messages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })
    })

    // Add current user message
    messages.push({
      role: 'user',
      content: userInput
    })

    // Prepare the request body
    const requestBody = {
      model: agentConfig.modelParams?.model || 'gpt-4o',
      messages,
      temperature: agentConfig.modelParams?.temperature ?? 0.7,
      max_tokens: agentConfig.modelParams?.max_tokens ?? 1000,
      top_p: agentConfig.modelParams?.top_p ?? 1,
      // Add any additional model parameters here
    }

    // Make the API call
    const response = await fetch(`${LLM_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `LLM API error: ${response.status} ${response.statusText}. ` +
        `${errorData.error?.message || 'Unknown error'}`
      )
    }

    const data = await response.json()
    
    // Extract the response content and metadata
    const choice = data.choices?.[0]
    if (!choice || !choice.message) {
      throw new Error('Invalid response format from LLM API')
    }

    return {
      content: choice.message.content,
      model: data.model,
      usage: data.usage,
      metadata: {
        finish_reason: choice.finish_reason,
        index: choice.index,
      },
    }
  } catch (error) {
    console.error('Error generating LLM response:', error)
    throw error
  }
}
