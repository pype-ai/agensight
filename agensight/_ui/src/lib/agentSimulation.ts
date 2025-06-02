import { 
  AgentConfig, 
  ConnectionConfig, 
  PromptConfig, 
  Message, 
  AgentResponse 
} from "@/lib/types/agent"

// Direct OpenAI API configuration
const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error('NEXT_PUBLIC_OPENAI_API_KEY environment variable is not set');
}
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Generates a response from an agent using the configured LLM
 */
async function getAgentResponse(
  agentConfig: AgentConfig,
  userInput: string,
  previousMessages: Message[] = []
): Promise<AgentResponse> {
  const startTime = Date.now()
  
  try {
    if (!agentConfig.prompt) {
      throw new Error(`No prompt configured for agent: ${agentConfig.name}`);
    }

    console.log({agentConfig})
    
    // Only include the current user input and system prompt
    // Don't include previous messages to avoid any interference
    const messages = [
      {
        role: 'system' as const,
        content: agentConfig.prompt
      },
      {
        role: 'user' as const,
        content: userInput
      }
    ];
    
   

    // Call OpenAI API directly
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: agentConfig.modelParams?.model || 'gpt-4', // Required field
        messages,
        temperature: agentConfig.modelParams?.temperature ?? 0.7,
        max_tokens: agentConfig.modelParams?.max_tokens ?? 1000,
        top_p: agentConfig.modelParams?.top_p ?? 1,
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    
    if (!choice || !choice.message) {
      throw new Error('Invalid response format from OpenAI API');
    }

    // Prepare metadata for the response
    const metadata: AgentResponse['metadata'] = {
      agent: agentConfig.name,
      model: data.model,
      processingTime: (Date.now() - startTime) / 1000,
      timestamp: new Date().toISOString(),
      tokensUsed: data.usage?.total_tokens || 0,
      prompt: agentConfig.prompt,
      variables: agentConfig.variables,
      observability: agentConfig.observability,
      finishReason: choice.finish_reason,
      usage: data.usage
    };
    
    // Include model parameters in the metadata
    if (agentConfig.modelParams) {
      metadata.modelParams = agentConfig.modelParams;
    }
    
    // Generate a unique ID for the response
    const responseId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: responseId,
      content: choice.message.content,
      metadata
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[${new Date().toISOString()}] Error generating response from ${agentConfig.name}:`, errorMessage)
    
    // Return an error response
    return {
      content: `[Error: Failed to generate response from ${agentConfig.name}. ${errorMessage}]`,
      metadata: {
        agent: agentConfig.name,
        model: agentConfig.modelParams?.model || 'unknown',
        processingTime: (Date.now() - startTime) / 1000,
        timestamp: new Date().toISOString(),
        error: errorMessage
      }
    }
  }
}

// Helper function to get the next agent in the flow
export function getNextAgent(
  currentAgentName: string,
  connections: Array<{from: string, to: string, type: string}>
): string | null {
  const next = connections.find(conn => conn.from === currentAgentName)
  return next?.to || null
}

/**
 * Processes a message through the agent flow
 * @param message The message to process
 * @param config Configuration containing agents, connections, and prompts
 * @param conversationHistory Previous messages in the conversation
 * @param startingAgentName The name of the agent to start with (default: 'UserInteractionAgent')
 * @param useAgentChain Whether to process through multiple agents in a chain (default: false)
 */
export async function processMessageThroughAgents(
  message: string,
  config: {
    agents: AgentConfig[],
    connections: ConnectionConfig[],
    prompts?: PromptConfig[]
  },
  conversationHistory: Message[] = [],
  startingAgentName: string = 'UserInteractionAgent',
  useAgentChain: boolean = false
): Promise<AgentResponse[]> {
  const responses: AgentResponse[] = []
  let currentAgent = config.agents.find(a => a.name === startingAgentName)
  
  // If starting agent is not found, try to use the first available agent
  if (!currentAgent && config.agents.length > 0) {
    console.warn(`[${new Date().toISOString()}] Starting agent '${startingAgentName}' not found, using first available agent`)
    currentAgent = config.agents[0]
  }
  
  if (!currentAgent) {
    const errorMsg = `No valid starting agent found in config. Tried: ${startingAgentName}`
    console.error(`[${new Date().toISOString()}] ${errorMsg}`)
    throw new Error(errorMsg)
  }
  
  let iteration = 0
  const MAX_ITERATIONS = 10 // Prevent infinite loops
  
  // Process through the agent chain
  while (currentAgent && iteration < MAX_ITERATIONS) {
    iteration++
        
    try {
      const response = await getAgentResponse(
        currentAgent,
        message,
        conversationHistory
      )
      
      // Add the response to the responses array
      responses.push(response)
      
      // If not using agent chain, stop after the first agent
      if (!useAgentChain) {
        break;
      }
      
      // Move to the next agent if there's a connection
      const nextAgentName = getNextAgent(currentAgent.name, config.connections)
      
      if (!nextAgentName) {
        break
      }
      
      const nextAgent = config.agents.find(a => a.name === nextAgentName)
      if (!nextAgent) {
        console.warn(`[${new Date().toISOString()}] Agent ${nextAgentName} not found`)
        break
      }
      
      currentAgent = nextAgent
      // For the next iteration, use the current response as the input
      message = response.content
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error in agent ${currentAgent.name}:`, error)
      // If there's an error, include it in the response and stop the flow
      responses.push({
        content: `Error in agent ${currentAgent.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: {
          agent: currentAgent.name,
          model: currentAgent.modelParams?.model || 'unknown',
          processingTime: 0,
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
      break
    }
  }
  
  if (iteration >= MAX_ITERATIONS) {
    console.warn(`[${new Date().toISOString()}] Reached maximum number of agent iterations (${MAX_ITERATIONS})`)
  }
  
  return responses
}
