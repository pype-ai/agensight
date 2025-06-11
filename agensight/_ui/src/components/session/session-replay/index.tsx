"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { getSingleSessionTraces, getTraceById } from "@/lib/services/traces"
import { ModelConfig, DEFAULT_MODEL_CONFIG } from "@/lib/models"
import { Button } from "@/components/ui/button"
import { Plus, Users, Split, Merge, Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { ConfigVersion, getConfigByVersion, getConfigVersions } from "@/lib/services/config"
import { processMessageThroughAgents } from "@/lib/agentSimulation"
import { AgentConfig, AgentConfigData, Message } from "@/lib/types/agent"
import { SessionChat } from "@/app/session-replay/SessionChat"
import { SessionInputBox } from "@/app/session-replay/SessionInputBox"

interface Session {
  id: string
  messages: Message[]
  loading: boolean
  isSending?: boolean
  error: string | null
  config: ModelConfig
}

// Move helper function outside the component to prevent recreation
async function getVersionsWithRetry() {
  try {
    return await getConfigVersions()
  } catch (error) {
    console.error('Failed to fetch versions, retrying...', error)
    throw error
  }
}

export default function SessionReplay() {
  // 1. State hooks - must be called in the same order on every render
  const [sessions, setSessions] = useState<Record<string, Session>>({})
  const [inputValue, setInputValue] = useState("")
  const [inputMode, setInputMode] = useState<"shared" | "split">("shared")
  const [sessionInputs, setSessionInputs] = useState<Record<string, string>>({})
  const [selectedVersion, setSelectedVersion] = useState<string>('')
  const [availableVersions, setAvailableVersions] = useState<ConfigVersion[]>([])
  const [sessionVersions, setSessionVersions] = useState<Record<string, string>>({})

  const [sessionConfigs, setSessionConfigs] = useState<Record<string, AgentConfigData | null>>({})
  const [sessionConfigLoading, setSessionConfigLoading] = useState<Record<string, boolean>>({})
  const [sessionConfigErrors, setSessionConfigErrors] = useState<Record<string, string | null>>({})

  
  // 2. Other hooks (order matters!)
  const searchParams = useSearchParams()
  
  // 3. Data fetching hooks
  const versionsQuery = useQuery({
    queryKey: ['config-versions'],
    queryFn: getVersionsWithRetry,
  })
  
  const configQuery = useQuery<AgentConfigData>({
    queryKey: ['config', selectedVersion],
    queryFn: async () => {
      if (!selectedVersion) {
        throw new Error('No version selected')
      }
      
      try {
        console.log(`[${new Date().toISOString()}] Fetching config for version:`, selectedVersion)
        const data = await getConfigByVersion(selectedVersion)
        console.log(`[${new Date().toISOString()}] Received config data:`, {
          agents: data.agents?.map((a: AgentConfig) => a.name) || [],
          connections: data.connections?.length || 0,
          prompts: data.prompts?.length || 0
        })
        return data
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error fetching config:`, error)
        throw error
      }
    },
    enabled: !!selectedVersion,
  })


  const getSessionVersion = (sessionId: string) => {
    return sessionVersions[sessionId] || selectedVersion
  }

  const getSessionConfig = (sessionId: string) => {
    return sessionConfigs[sessionId]
  }

  const loadConfigForSession = async (sessionId: string, version: string) => {
    if (!version) return

    setSessionConfigLoading(prev => ({ ...prev, [sessionId]: true }))
    setSessionConfigErrors(prev => ({ ...prev, [sessionId]: null }))

    try {
      console.log(`[${new Date().toISOString()}] Fetching config for session ${sessionId}, version:`, version)
      const data = await getConfigByVersion(version)
      console.log(`[${new Date().toISOString()}] Received config data for session ${sessionId}:`, {
        agents: data.agents?.map((a: AgentConfig) => a.name) || [],
        connections: data.connections?.length || 0,
        prompts: data.prompts?.length || 0
      })
      
      setSessionConfigs(prev => ({ ...prev, [sessionId]: data }))
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error fetching config for session ${sessionId}:`, error)
      setSessionConfigErrors(prev => ({ 
        ...prev, 
        [sessionId]: error instanceof Error ? error.message : 'Unknown error'
      }))
    } finally {
      setSessionConfigLoading(prev => ({ ...prev, [sessionId]: false }))
    }
  }

  const handleVersionChange = (sessionId: string, version: string) => {
    setSessionVersions(prev => ({
      ...prev,
      [sessionId]: version
    }))
    
    // Load the new config for this session
    loadConfigForSession(sessionId, version)
  }
  
  const loadSessionTraces = async (sessionId: string) => {
    try {
      setSessions((prev) => ({
        ...prev,
        [sessionId]: { 
          ...prev[sessionId], 
          loading: true, 
          error: null,
          config: prev[sessionId]?.config || { ...DEFAULT_MODEL_CONFIG },
          messages: prev[sessionId]?.messages || []
        },
      }))

      const traces = await getSingleSessionTraces(sessionId)
      const detailedTraces = await Promise.all(
        traces.map(async (trace: any) => {
          try {
            const detail = await getTraceById(trace.id)
            return { ...trace, ...detail }
          } catch {
            return trace
          }
        }),
      )

      // Convert traces to messages with timestamps and sort them
      const messages: (Message & { timestamp?: number })[] = []
      detailedTraces.forEach((trace: any) => {
        // Get the earliest timestamp from agents or use current time as fallback
        const traceTime = trace.agents?.length > 0 
          ? Math.min(...(trace.agents as Array<{ start_time?: number }>).map((a: { start_time?: number }) => a.start_time || 0)) 
          : Date.now() / 1000; // Convert to seconds to match other timestamps
          
        if (trace.trace_input) {
          messages.push({
            id: `${trace.id}-input`,
            type: "input",
            role: 'user',
            content: trace.trace_input,
            timestamp: traceTime
          })
        }
        if (trace.trace_output) {
          messages.push({
            id: `${trace.id}-output`,
            type: "output",
            role: 'assistant',
            content: trace.trace_output,
            timestamp: traceTime + 0.01 // Add a small offset to maintain input before output
          })
        }
      })
      
      // Sort messages by timestamp (oldest first)
      messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))

      setSessions((prev) => ({
        ...prev,
        [sessionId]: {
          ...prev[sessionId],
          messages,
          loading: false,
          error: null,
        },
      }))
    } catch (error: any) {
      setSessions((prev) => ({
        ...prev,
        [sessionId]: {
          ...prev[sessionId],
          loading: false,
          error: error?.message || "Failed to fetch traces",
        },
      }))
    }
  }

    // Initialize sessions from URL params
    useEffect(() => {
      const sessionIdParam = searchParams.get("session_id")
      if (!sessionIdParam) return
      const sessionIds = sessionIdParam
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
      console.log("Parsed session IDs:", sessionIds)
      if (sessionIds.length === 0) return
      
      // Initialize sessions with default config
      const initialSessions: Record<string, Session> = {}
      const initialVersions: Record<string, string> = {}
      
      sessionIds.forEach((id) => {
        initialSessions[id] = {
          id,
          messages: [],
          loading: true,
          error: null,
          config: { ...DEFAULT_MODEL_CONFIG }
        }
        // Initialize each session with the default version
        initialVersions[id] = selectedVersion
      })
      
      console.log('Initialized sessions:', Object.keys(initialSessions))
      setSessions(initialSessions)
      setSessionVersions(initialVersions)
      
      // Load config for each session
      sessionIds.forEach((sessionId) => {
        loadConfigForSession(sessionId, selectedVersion)
        loadSessionTraces(sessionId)
      })
    }, [searchParams, selectedVersion])


  // Define render functions for different states
  const renderLoadingState = () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      <span className="ml-2">Loading configurations...</span>
    </div>
  );

  const renderErrorState = (error: string) => (
    <div className="p-4 text-red-500">
      Failed to load configurations: {error}
    </div>
  );

  const renderNoConfigState = () => (
    <div className="p-4 text-yellow-500">
      No agent configuration available. Please select a valid version.
    </div>
  );

  const {
    data: configData,
    isLoading: isConfigLoading,
    error: configError,
  } = configQuery;

  // 4. Effects - process versions data when it changes
  useEffect(() => {
    if (versionsQuery.data) {
      const filteredVersions = versionsQuery.data.filter(
        (v: ConfigVersion) =>
          v.version !== 'current' && v.version.match(/^\d+\.\d+\.\d+$/)
      )

      filteredVersions.sort((a: ConfigVersion, b: ConfigVersion) => {
        return b.version.localeCompare(a.version, undefined, { numeric: true })
      })

      setAvailableVersions(filteredVersions)

      if (filteredVersions.length > 0 && !selectedVersion) {
        setSelectedVersion(filteredVersions[0].version)
      }
    }
  }, [versionsQuery.data, selectedVersion])

  if (isConfigLoading) return renderLoadingState();
  if (configError) return renderErrorState(configError as any);
  if (!configData) return renderNoConfigState();




  // Cloning a session (deep copy)
  const cloneSession = (sessionId: string) => {
    setSessions((prev) => {
      const original = prev[sessionId]
      if (!original) return prev
      const newSessionId = `${sessionId}-${Date.now()}`
      
      // Clone the version and config for the new session
      const originalVersion = sessionVersions[sessionId] || selectedVersion
      const originalConfig = sessionConfigs[sessionId]
      
      setSessionVersions(prevVersions => ({
        ...prevVersions,
        [newSessionId]: originalVersion
      }))
      
      if (originalConfig) {
        setSessionConfigs(prevConfigs => ({
          ...prevConfigs,
          [newSessionId]: originalConfig
        }))
      }
      
      return {
        ...prev,
        [newSessionId]: {
          ...JSON.parse(JSON.stringify(original)),
          id: newSessionId,
          config: { ...DEFAULT_MODEL_CONFIG, ...original.config }
        },
      }
    })
  }

  const removeSession = (sessionId: string) => {
    setSessions((prev) => {
      const newSessions = { ...prev }
      delete newSessions[sessionId]
      
      // Clean up all session-specific data
      setSessionInputs((prevInputs) => {
        const newInputs = { ...prevInputs }
        delete newInputs[sessionId]
        return newInputs
      })
      
      setSessionVersions((prevVersions) => {
        const newVersions = { ...prevVersions }
        delete newVersions[sessionId]
        return newVersions
      })
      
      setSessionConfigs((prevConfigs) => {
        const newConfigs = { ...prevConfigs }
        delete newConfigs[sessionId]
        return newConfigs
      })
      
      setSessionConfigLoading((prevLoading) => {
        const newLoading = { ...prevLoading }
        delete newLoading[sessionId]
        return newLoading
      })
      
      setSessionConfigErrors((prevErrors) => {
        const newErrors = { ...prevErrors }
        delete newErrors[sessionId]
        return newErrors
      })
      
      return newSessions
    })
  }


  const addMessage = (sessionId: string, type: "input" | "output") => {
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      type: type,
      role: type === 'input' ? 'user' : 'assistant',
      content: "",
      isEditing: true,
    }

    setSessions((prev) => ({
      ...prev,
      [sessionId]: {
        ...prev[sessionId],
        messages: [...prev[sessionId].messages, newMessage],
      },
    }))
  }

  const updateMessage = (sessionId: string, idx: number, content: string) => {
    setSessions((prev) => ({
      ...prev,
      [sessionId]: {
        ...prev[sessionId],
        messages: prev[sessionId].messages.map((msg, index) => (index === idx ? { ...msg, content } : msg)),
      },
    }))
  }

  const toggleEditMessage = (sessionId: string, idx: number) => {
    setSessions((prev) => ({
      ...prev,
      [sessionId]: {
        ...prev[sessionId],
        messages: prev[sessionId].messages.map((msg, index) =>
          index === idx ? { ...msg, isEditing: !msg.isEditing } : msg,
        ),
      },
    }))
  }

  const removeMessage = (deletedSessionId: string, messageIdx: number) => {
    setSessions((prev) => {
      // Get the reference session to determine message count
      const referenceSession = prev[deletedSessionId];
      if (!referenceSession) return prev;
      
      // Get the message ID at the specified index to ensure we're deleting the same message across sessions
      const referenceMessage = referenceSession.messages[messageIdx];
      if (!referenceMessage) return prev; // No message at this index
      
      // Create a new sessions object with messages removed from all sessions
      const updatedSessions = { ...prev };
      
      Object.keys(updatedSessions).forEach(sessionId => {
        const session = updatedSessions[sessionId];
        // Find the index of the message with the same ID as the reference message
        const messageIndex = session.messages.findIndex(
          msg => msg.id === referenceMessage.id
        );
        
        if (messageIndex !== -1) {
          // Remove messages from this index onwards
          updatedSessions[sessionId] = {
            ...session,
            messages: session.messages.slice(0, messageIndex)
          };
          
          console.log(`[${new Date().toISOString()}] Removed messages from index ${messageIndex} in session ${sessionId}`);
        }
      });
      
      return updatedSessions;
    });
  }

  const updateSessionInput = (sessionId: string, value: string) => {
    setSessionInputs((prev) => ({
      ...prev,
      [sessionId]: value,
    }))
  }

  const sendSessionMessage = async (sessionId: string) => {
    const message = sessionInputs[sessionId] || ""
    if (!message.trim()) return

    const tempMessageId = `temp-${Date.now()}`
    const session = sessions[sessionId]
    const sessionConfig = getSessionConfig(sessionId) // Get session-specific config
    
    console.log(`[${new Date().toISOString()}] Sending message to session ${sessionId}:`, {
      message,
      sessionConfig: session.config,
      existingMessages: session.messages.length,
      configData: sessionConfig ? 'loaded' : 'not loaded'
    })
    
    // Add the user's message with 'sending' status
    setSessions(prev => ({
      ...prev,
      [sessionId]: {
        ...prev[sessionId],
        isSending: true,
        messages: [
          ...prev[sessionId].messages,
          {
            id: tempMessageId,
            type: "input" as const,
            role: 'user' as const,
            content: message,
            status: 'sending' as const,
            timestamp: Date.now() / 1000,
          }
        ]
      }
    }))

    // Clear the input
    updateSessionInput(sessionId, "")

    try {
      if (!sessionConfig) {
        throw new Error('Configuration not loaded for this session')
      }

      console.log(`[${new Date().toISOString()}] Processing message through agent flow for session ${sessionId}...`)
      
      // Get the session's model configuration
      const currentSessionConfig = session.config || DEFAULT_MODEL_CONFIG
      
      // Update the agents with the session's model configuration
      const updatedAgents = (sessionConfig.agents || []).map(agent => ({
        ...agent,
        modelParams: {
          ...agent.modelParams,
          model: currentSessionConfig.model,
          temperature: currentSessionConfig.temperature,
          top_p: currentSessionConfig.top_p,
          max_tokens: currentSessionConfig.max_tokens,
          frequency_penalty: currentSessionConfig.frequency_penalty,
          presence_penalty: currentSessionConfig.presence_penalty,
          stop: currentSessionConfig.stop_sequences || currentSessionConfig.stop
        }
      }));
      
      // Process the message through the agent flow with session-specific config
      const agentResponses = await processMessageThroughAgents(
        message,
        {
          agents: updatedAgents,
          connections: sessionConfig.connections || [],
          prompts: sessionConfig.prompts || []
        },
        session.messages
      )
      
      console.log(`[${new Date().toISOString()}] Agent responses for session ${sessionId}:`, agentResponses)
      
      // Handle responses...
      if (agentResponses.length === 0) {
        agentResponses.push({
          content: "I'm sorry, I couldn't generate a response. Please try again.",
          metadata: {
            agent: 'System',
            model: 'unknown',
            processingTime: 0,
            timestamp: new Date().toISOString(),
            error: 'No response generated by any agent'
          }
        })
      }
      
      // Update the UI with all agent responses
      setSessions(prev => {
        const session = prev[sessionId]
        if (!session) {
          console.error(`[${new Date().toISOString()}] Session ${sessionId} not found`)
          return prev
        }

        // Update the user's message status to 'sent'
        const updatedMessages = session.messages.map(msg => 
          msg.id === tempMessageId 
            ? { ...msg, status: 'sent' as const }
            : msg
        )

        // Add all agent responses
        const responseMessages: Message[] = agentResponses.map((response) => ({
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: "output",
          role: 'assistant',
          content: response.content,
          status: response.metadata?.error ? "error" : "sent",
          error: response.metadata?.error,
          timestamp: Date.now() / 1000,
          metadata: {
            agent: response.metadata.agent,
            model: response.metadata.model,
            processingTime: response.metadata.processingTime,
            ...(response.metadata.finishReason && { finishReason: response.metadata.finishReason }),
            ...(response.metadata.usage && { usage: response.metadata.usage }),
            ...(response.metadata.error && { error: response.metadata.error }),
          },
        }))

        console.log(`[${new Date().toISOString()}] Updated UI with ${responseMessages.length} agent responses`)

        return {
          ...prev,
          [sessionId]: {
            ...session,
            isSending: false,
            messages: [...updatedMessages, ...responseMessages],
          },
        }
      })
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error in agent flow for session ${sessionId}:`, error)
      
      // Update the message status to error
      setSessions(prev => ({
        ...prev,
        [sessionId]: {
          ...prev[sessionId],
          isSending: false,
          messages: prev[sessionId].messages.map(msg => 
            msg.id === tempMessageId
              ? { 
                  ...msg, 
                  status: 'error' as const,
                  error: error instanceof Error ? error.message : 'Error processing message',
                  timestamp: Date.now()
                }
              : msg
          ),
        },
      }))
    }
  }

  const sendSharedMessage = async () => {
    const message = inputValue.trim()
    if (!message) return

    console.log("Sending shared message to all sessions:", message)

    const tempMessageId = `temp-${Date.now()}`
    const timestamp = Date.now()

    // Add the user message to all sessions
    setSessions(prevSessions => {
      const updatedSessions = { ...prevSessions }
      Object.keys(updatedSessions).forEach(sessionId => {
        updatedSessions[sessionId] = {
          ...updatedSessions[sessionId],
          isSending: true,
          messages: [
            ...updatedSessions[sessionId].messages,
            {
              id: tempMessageId,
              type: 'input' as const,
              role: 'user',
              content: message,
              status: 'sending' as const,
              timestamp: timestamp / 1000,
            }
          ]
        }
      })
      return updatedSessions
    })

    setInputValue("")

    try {
      // Process message for each session using its specific config
      const sessionPromises = Object.entries(sessions).map(async ([sessionId, session]) => {
        try {
          const sessionConfig = getSessionConfig(sessionId)
          if (!sessionConfig) {
            throw new Error(`Configuration not loaded for session ${sessionId}`)
          }

          console.log(`[${new Date().toISOString()}] Processing message through agent flow for session ${sessionId}...`)
          
          const sessionModelConfig = session.config || DEFAULT_MODEL_CONFIG
          
          // Update the agents with the session's model configuration
          const updatedAgents = (sessionConfig.agents || []).map(agent => ({
            ...agent,
            modelParams: {
              ...agent.modelParams,
              model: sessionModelConfig.model,
              temperature: sessionModelConfig.temperature,
              top_p: sessionModelConfig.top_p,
              max_tokens: sessionModelConfig.max_tokens,
              frequency_penalty: sessionModelConfig.frequency_penalty,
              presence_penalty: sessionModelConfig.presence_penalty,
              stop: sessionModelConfig.stop_sequences || sessionModelConfig.stop
            }
          }));
          
          // Process the message through the agent flow with session-specific config
          const agentResponses = await processMessageThroughAgents(
            message,
            {
              agents: updatedAgents,
              connections: sessionConfig.connections || [],
              prompts: sessionConfig.prompts || []
            },
            session.messages
          )
          
          console.log(`[${new Date().toISOString()}] Agent responses for session ${sessionId}:`, agentResponses)
          
          if (agentResponses.length === 0) {
            agentResponses.push({
              content: "I'm sorry, I couldn't generate a response. Please try again.",
              metadata: {
                agent: 'System',
                model: 'unknown',
                processingTime: 0,
                timestamp: new Date().toISOString(),
                error: 'No response generated by any agent'
              }
            })
          }
          
          return { sessionId, agentResponses, error: null }
        } catch (error) {
          console.error(`[${new Date().toISOString()}] Error in agent flow for session ${sessionId}:`, error)
          return { 
            sessionId, 
            agentResponses: [], 
            error: error instanceof Error ? error.message : 'Unknown error' 
          }
        }
      })

      // Wait for all sessions to complete and update UI
      const results = await Promise.all(sessionPromises)

      setSessions(prevSessions => {
        const updatedSessions = { ...prevSessions }
        
        results.forEach(({ sessionId, agentResponses, error }) => {
          if (!updatedSessions[sessionId]) return

          const session = updatedSessions[sessionId]
          
          const updatedMessages = session.messages.map(msg => 
            msg.id === tempMessageId 
              ? { ...msg, status: 'sent' as const }
              : msg
          )

          const responseMessages: Message[] = agentResponses.map(response => ({
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: "output" as const,
            role: 'assistant',
            content: response.content,
            status: response.metadata?.error ? "error" as const : "sent" as const,
            error: response.metadata?.error,
            timestamp: Date.now() / 1000,
            metadata: {
              agent: response.metadata.agent,
              model: response.metadata.model,
              processingTime: response.metadata.processingTime,
              ...(response.metadata.finishReason && { finishReason: response.metadata.finishReason }),
              ...(response.metadata.usage && { usage: response.metadata.usage }),
              ...(response.metadata.error && { error: response.metadata.error }),
            },
          }))

          updatedSessions[sessionId] = {
            ...session,
            isSending: false,
            messages: [...updatedMessages, ...responseMessages],
          }
        })

        return updatedSessions
      })
    } catch (error) {
      console.error('Error in sendSharedMessage:', error)
      
      setSessions(prevSessions => {
        const updatedSessions = { ...prevSessions }
        Object.keys(updatedSessions).forEach(sessionId => {
          updatedSessions[sessionId] = {
            ...updatedSessions[sessionId],
            isSending: false,
            messages: updatedSessions[sessionId].messages.map(msg => 
              msg.id === tempMessageId
                ? { 
                    ...msg, 
                    status: 'error' as const,
                    error: error instanceof Error ? error.message : 'Error processing message',
                    timestamp: Date.now()
                  }
                : msg
            ),
          }
        })
        return updatedSessions
      })
    }
  }

  const isAnySessionLoading = Object.values(sessionConfigLoading).some(loading => loading)
  const hasConfigErrors = Object.values(sessionConfigErrors).some(error => error !== null)

  if (isAnySessionLoading && Object.keys(sessions).length > 0) {
    return renderLoadingState()
  }

  if (hasConfigErrors) {
    const firstError = Object.values(sessionConfigErrors).find(error => error !== null)
    return renderErrorState(firstError || 'Unknown error')
  }

  return (
    <div className="h-full flex flex-col">
      {/* Fixed Header - always visible */}
      <div className="w-full flex items-center justify-between px-4 py-2 border-b bg-background z-20 flex-shrink-0 sticky top-0">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Session Comparison</h2>
          <div className="flex items-center gap-2 px-2 py-1 bg-muted/50 rounded-md text-sm">
            <span className="font-medium">{Object.keys(sessions).length}</span>
            <span className="text-muted-foreground">
              {Object.keys(sessions).length === 1 ? 'Session' : 'Sessions'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="relative flex items-center">
            <Button
              variant="outline"
              size="sm"
              disabled={Object.keys(sessions).length >= 5}
              onClick={() => {
                const sessionId = Object.keys(sessions)[0] || Date.now().toString()
                  cloneSession(sessionId)
                }}
                className={cn(
                  "gap-1.5 transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "disabled:bg-muted/30 disabled:text-muted-foreground/70 disabled:hover:bg-muted/30"
                )}
              >
                <Plus className="w-4 h-4" />
                <span>Add Comparison</span>
                {Object.keys(sessions).length >= 5 && (
                  <span className="absolute -right-1 -top-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-muted-foreground/40"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-muted-foreground/60"></span>
                  </span>
                )}
            </Button>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 ml-1 text-muted-foreground hover:text-foreground"
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <div className="space-y-0.5">
                      {Object.keys(sessions).length >= 5 ? (
                        <span className="text-destructive font-medium">Max 5 sessions</span>
                      ) : (
                        <span>Compare responses side by side</span>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="h-6 w-px bg-border mx-1"></div>
            <span className="text-sm text-muted-foreground mr-1">Input:</span>
            <Button
              variant={inputMode === "shared" ? "default" : "ghost"}
              size="sm"
              className="h-8 px-3"
              onClick={() => setInputMode("shared")}
            >
              <Merge className="w-4 h-4 mr-1.5" />
              <span>Merged</span>
            </Button>
            <Button
              variant={inputMode === "split" ? "default" : "ghost"}
              size="sm"
              className="h-8 px-3"
              onClick={() => setInputMode("split")}
            >
              <Split className="w-4 h-4 mr-1.5" />
              <span>Split</span>
            </Button>
          </div>
        </div>
      </div>
  
      {/* Sessions area - scrollable horizontally, fixed height */}
      <div className="flex-1 min-h-0 relative">
        <div className="absolute inset-0 overflow-x-auto overflow-y-hidden">
          <div className="flex flex-row gap-2 h-full min-w-max">
            {Object.values(sessions).map((session) => (
              <div key={session.id} className="min-w-[400px] max-w-[500px] w-full flex-shrink-0 flex flex-col h-full">
                <div className="flex-1 min-h-0">
                  <SessionChat
                    key={session.id}
                    session={session}
                    availableVersions={availableVersions}
                    selectedVersion={getSessionVersion(session.id)} // Session-specific version
                    onVersionChange={(version) => handleVersionChange(session.id, version)} // Session-specific handler
                    sessionConfig={getSessionConfig(session.id)} // Pass session-specific config
                    onRemoveMessage={(idx) => removeMessage(session.id, idx)}
                    onRemoveSession={Object.keys(sessions).length > 1 ? () => removeSession(session.id) : undefined}
                    onCloneSession={() => cloneSession(session.id)}
                    onChangeModel={(model) => {
                      setSessions(prev => ({
                        ...prev,
                        [session.id]: {
                          ...prev[session.id],
                          config: {
                            ...prev[session.id].config,
                            model
                          }
                        }
                      }))
                    }}
                    onConfigChange={(config) => {
                      setSessions(prev => ({
                        ...prev,
                        [session.id]: {
                          ...prev[session.id],
                          config: { ...config }
                        }
                      }))
                    }}
                    onAddMessageToSession={(type) => addMessage(session.id, type)}
                    onUpdateMessage={(idx, content) => updateMessage(session.id, idx, content)}
                    onToggleEditMessage={(idx) => toggleEditMessage(session.id, idx)}
                  />
                </div>
  
                {/* Individual input box for split mode */}
                {inputMode === "split" && (
                  <div className="border-t px-3 py-3 bg-background flex-shrink-0">
                    <SessionInputBox
                      value={sessionInputs[session.id] || ""}
                      onChange={(value) => updateSessionInput(session.id, value)}
                      onSend={() => sendSessionMessage(session.id)}
                      placeholder={`Message for ${session.id}...`}
                      isSending={session.isSending || false}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
  
      {/* Shared Input Box - fixed at bottom, always visible */}
      {inputMode === "shared" && (
        <div className="w-full border-t px-4 py-3 bg-background z-20 flex-shrink-0 sticky bottom-0">
          <SessionInputBox
            value={inputValue}
            onChange={setInputValue}
            onSend={sendSharedMessage}
            placeholder="Message for all sessions..."
          />
        </div>
      )}
    </div>
  )
}