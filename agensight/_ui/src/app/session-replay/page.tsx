"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { getSingleSessionTraces, getTraceById } from "@/lib/services/traces"
import { ModelConfig, DEFAULT_MODEL_CONFIG } from "@/lib/models"
import { SessionChat } from "./SessionChat"
import { SessionInputBox } from "./SessionInputBox"
import { Button } from "@/components/ui/button"
import { Plus, Users, Split, Merge, Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  type: "input" | "output"
  content: string
  isEditing?: boolean
}

interface Session {
  id: string
  messages: Message[]
  loading: boolean
  error: string | null
  config?: ModelConfig
}

export default function SessionReplay() {
  const [sessions, setSessions] = useState<Record<string, Session>>({})
  const [inputValue, setInputValue] = useState("")
  const [inputMode, setInputMode] = useState<"shared" | "split">("shared")
  const [sessionInputs, setSessionInputs] = useState<Record<string, string>>({})
  const searchParams = useSearchParams()

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
    // Initialize sessions
    const initialSessions: Record<string, Session> = {}
    sessionIds.forEach((id) => {
      initialSessions[id] = {
        id,
        messages: [],
        loading: true,
        error: null,
        config: { ...DEFAULT_MODEL_CONFIG }
      }
    })
    setSessions(initialSessions)
    // Load traces for each session
    sessionIds.forEach((sessionId) => loadSessionTraces(sessionId))
  }, [searchParams])

  const loadSessionTraces = async (sessionId: string) => {
    try {
      setSessions((prev) => ({
        ...prev,
        [sessionId]: { 
          ...prev[sessionId], 
          loading: true, 
          error: null,
          config: prev[sessionId]?.config || { ...DEFAULT_MODEL_CONFIG }
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

      // Convert traces to messages
      const messages: Message[] = []
      detailedTraces.forEach((trace, index) => {
        if (trace.trace_input) {
          messages.push({
            id: `${trace.id}-input`,
            type: "input",
            content: trace.trace_input,
          })
        }
        if (trace.trace_output) {
          messages.push({
            id: `${trace.id}-output`,
            type: "output",
            content: trace.trace_output,
          })
        }
      })

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

  // Cloning a session (deep copy)
  const cloneSession = (sessionId: string) => {
    setSessions((prev) => {
      const original = prev[sessionId]
      if (!original) return prev
      const newSessionId = `${sessionId}-${Date.now()}`
      return {
        ...prev,
        [newSessionId]: {
          ...JSON.parse(JSON.stringify(original)),
          id: newSessionId,
          config: { ...original.config }
        },
      }
    })
  }

  const removeSession = (sessionId: string) => {
    setSessions((prev) => {
      const newSessions = { ...prev }
      delete newSessions[sessionId]
      // Also remove session input if it exists
      setSessionInputs((prevInputs) => {
        const newInputs = { ...prevInputs }
        delete newInputs[sessionId]
        return newInputs
      })
      return newSessions
    })
  }

  const addMessage = (sessionId: string, type: "input" | "output") => {
    const newMessage: Message = {
      id: `${Date.now()}-${type}`,
      type,
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

  const removeMessage = (sessionId: string, messageIdx: number) => {
    setSessions((prev) => {
      const session = prev[sessionId]
      if (!session) return prev
      const newMessages = session.messages.slice(0, messageIdx)
      return {
        ...prev,
        [sessionId]: {
          ...session,
          messages: newMessages,
        },
      }
    })
  }

  const updateSessionInput = (sessionId: string, value: string) => {
    setSessionInputs((prev) => ({
      ...prev,
      [sessionId]: value,
    }))
  }

  const sendSessionMessage = (sessionId: string) => {
    const message = sessionInputs[sessionId] || ""
    if (!message.trim()) return

    // Add your send logic here
    console.log(`Sending message for session ${sessionId}:`, message)

    // Clear the input after sending
    updateSessionInput(sessionId, "")
  }

  const sendSharedMessage = () => {
    if (!inputValue.trim()) return

    // Add your send logic here for all sessions
    console.log("Sending shared message to all sessions:", inputValue)

    // Clear the input after sending
    setInputValue("")
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
                    session={{
                      ...session,
                      config: session.config || { ...DEFAULT_MODEL_CONFIG }
                    }}
                    onRemoveMessage={(idx) => removeMessage(session.id, idx)}
                    onRemoveSession={Object.keys(sessions).length > 1 ? () => removeSession(session.id) : undefined}
                    onCloneSession={() => cloneSession(session.id)}
                    onChangeModel={(model) => {
                      setSessions(prev => ({
                        ...prev,
                        [session.id]: {
                          ...prev[session.id],
                          config: {
                            ...(prev[session.id].config || DEFAULT_MODEL_CONFIG),
                            model
                          }
                        }
                      }));
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