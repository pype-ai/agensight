"use client"

import { Plus, X, Trash2, Edit3, Check, RotateCcw, Copy, Settings, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { MessageStatus } from "@/components/chat/MessageStatus"
import { SettingsPanel } from "./SettingsPanel"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useState, useRef, useEffect } from "react"
import { ModelConfig, DEFAULT_MODEL_CONFIG, OPENAI_MODELS } from "@/lib/models"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DialogHeader,
  DialogDescription,
} from "@/components/ui/dialog"
import { useQuery } from "@tanstack/react-query"
import type { AgentConfig, AgentConfigData } from "@/lib/types/agent"
import { getConfigByVersion } from "@/lib/services/config"

export interface Message {
  id: string
  type: "input" | "output"
  content: string
  isEditing?: boolean
  status?: 'sending' | 'sent' | 'error'
  error?: string
  timestamp?: number
  metadata?: {
    processingTime?: number
    agent?: string
    [key: string]: any
  };
}

export interface Session {
  id: string
  messages: Message[]
  loading: boolean
  error: string | null
  config?: ModelConfig
}

interface SessionChatProps {
  session: Session
  onRemoveMessage: (messageIdx: number) => void
  onRemoveSession?: () => void  // Made optional
  onCloneSession: () => void
  onChangeModel: (model: string) => void
  onAddMessageToSession: (type: "input" | "output") => void
  onUpdateMessage: (msgIdx: number, content: string) => void
  onToggleEditMessage: (msgIdx: number) => void
}

export const SessionChat = ({
  session,
  onRemoveMessage,
  onRemoveSession,
  onCloneSession,
  onChangeModel,
  onAddMessageToSession,
  onUpdateMessage,
  onToggleEditMessage,
}: SessionChatProps) => {
  const [newMessageType, setNewMessageType] = useState<"input" | "output">("input")
  
  const onAddMessage = () => {
    onAddMessageToSession(newMessageType)
  }
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [localConfig, setLocalConfig] = useState<ModelConfig>(session.config ?? DEFAULT_MODEL_CONFIG)
  const [isPromptsDialogOpen, setIsPromptsDialogOpen] = useState(false)
  const [editablePrompts, setEditablePrompts] = useState<Array<{
    name: string;
    content: string;
  }>>([])

  // Update local config when session config changes
  useEffect(() => {
    setLocalConfig(session.config ?? DEFAULT_MODEL_CONFIG)
  }, [session.config])

  const handleConfigChange = (newConfig: ModelConfig) => {
    setLocalConfig(newConfig)
    // Here you would typically update the session's config in the parent component
    // For now, we'll just update it locally
  }


  const selectedModelName = OPENAI_MODELS.find(m => m.id === localConfig.model)?.name || localConfig.model
  
  const { data: configData } = useQuery<AgentConfigData>({
    queryKey: ['config', session.id],
    queryFn: () => getConfigByVersion(session.id),
    enabled: isPromptsDialogOpen,
  })
  
  useEffect(() => {
    if (configData?.agents) {
      setEditablePrompts(
        configData.agents.map((agent: AgentConfig) => ({
          name: agent.name,
          content: agent.prompt || ''
        }))
      )
    }
  }, [configData])
  
  useEffect(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        left: scrollContainer.scrollWidth,
        behavior: 'smooth'
      })
    }
  }, [session.messages])

  return (
    <Card className="flex pt-0 rounded-none flex-col h-full bg-background border-muted shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-1 py-2 border-b border-muted bg-background/80 sticky top-0">
        <div className="flex items-center gap-2">
          <Dialog open={isPromptsDialogOpen} onOpenChange={setIsPromptsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" size="sm" className="h-6 px-2 text-xs bg-muted hover:bg-muted/80">
                Prompts
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 overflow-hidden">
              <div className="p-6 pb-0">
                <DialogHeader>
                  <DialogTitle>Agent Prompts</DialogTitle>
                  <DialogDescription>
                    View and edit prompts for all agents in this session
                  </DialogDescription>
                </DialogHeader>
              </div>
              
              <div className="flex-1 overflow-hidden flex flex-col">
                <ScrollArea className="flex-1 px-6 py-2">
                  <div className="space-y-4">
                    {editablePrompts.map((prompt, index) => (
                      <div key={prompt.name} className="space-y-2">
                        <div className="font-medium">{prompt.name}</div>
                        <Textarea
                          value={prompt.content}
                          onChange={(e) => {
                            const newPrompts = [...editablePrompts]
                            newPrompts[index].content = e.target.value
                            setEditablePrompts(newPrompts)
                          }}
                          className="min-h-[100px] font-mono text-xs w-full"
                        />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              
              <div className="p-4 border-t flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsPromptsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    console.log('Updated prompts:', editablePrompts)
                    setIsPromptsDialogOpen(false)
                  }}
                >
                  Save Changes
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Model Settings"
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings className="w-4 h-4" />
          </Button>
          {onRemoveSession && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
              title="Remove Session"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveSession();
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          {/* Config/settings button */}
          {/* <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Settings">
            <RotateCcw className="w-4 h-4" />
          </Button> */}
          {/* Model dropdown (placeholder) */}
          <select
            className="bg-transparent border rounded px-2 py-1 text-xs dark:bg-muted/40 min-w-[120px]"
            value={localConfig.model}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              const newConfig = { ...localConfig, model: e.target.value }
              setLocalConfig(newConfig)
              onChangeModel(e.target.value)
            }}
          >
            <optgroup label="GPT-4">
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-4-32k">GPT-4 32K</option>
              <option value="gpt-4-vision">GPT-4 Vision</option>
            </optgroup>
            <optgroup label="GPT-3.5">
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              <option value="gpt-3.5-turbo-16k">GPT-3.5 Turbo 16K</option>
            </optgroup>
            {/* <optgroup label="OpenAI">
              <option value="dall-e-3">DALL·E 3</option>
              <option value="whisper-1">Whisper</option>
              <option value="tts-1">TTS-1</option>
            </optgroup> */}
            {/* <optgroup label="Anthropic">
              <option value="claude-3-opus">Claude 3 Opus</option>
              <option value="claude-3-sonnet">Claude 3 Sonnet</option>
              <option value="claude-3-haiku">Claude 3 Haiku</option>
            </optgroup> */}
            {/* <optgroup label="Google">
              <option value="gemini-pro">Gemini Pro</option>
              <option value="gemini-ultra">Gemini Ultra</option>
            </optgroup> */}
          </select>
          {/* Message type selector and add button */}
          <div className="flex items-center gap-1 border rounded-md overflow-hidden">
            <select
              value={newMessageType}
              onChange={(e) => setNewMessageType(e.target.value as "input" | "output")}
              className="bg-transparent text-xs h-8 px-2 py-0 focus:outline-none focus:ring-0 border-0"
              onClick={(e) => e.stopPropagation()}
            >
              <option value="input">User</option>
              <option value="output">Assistant</option>
            </select>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0 hover:bg-muted/50" 
              onClick={onAddMessage} 
              title="Add Message"
            >
              <Plus className="w-2 h-2" />
            </Button>
          </div>
          
        </div>
      </div>
      {/* Chat area (scrollable) */}
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea ref={scrollAreaRef} className="h-full px-4 py-2">
          {session.messages.length === 0 ? (
            <div className="text-muted-foreground text-center py-8">No messages in this session</div>
          ) : (
            session.messages.map((message, idx) => (
              <div key={message.id} className="relative group">
                <div className={`flex ${message.type === "input" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] ${message.type === "input" ? "order-2" : "order-1"}`}>
                    <div className={`flex items-center gap-2 mb-1 flex-wrap`}>
                      <div className="flex items-center gap-1">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs",
                            message.type === "input"
                              ? "bg-blue-900/30 text-blue-300"
                              : "bg-slate-700 text-slate-300"
                          )}
                        >
                          {message.type === "input" ? "You" : "Assistant"}
                          {message.status && (
                            <MessageStatus
                              status={message.status}
                              error={message.error}
                              className="ml-1"
                            />
                          )}
                        </Badge>
                        {message.metadata?.processingTime && (
                          <span className="text-xs text-muted-foreground">
                            {Math.round(message.metadata.processingTime * 1000)}ms
                          </span>
                        )}
                        {message.timestamp && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                      {message.metadata?.model && (
                        <Badge variant="outline" className="text-xs">
                          {message.metadata.model}
                        </Badge>
                      )}
                      {message.error && (
                        <div className="text-xs text-red-500">
                          Error: {message.error}
                        </div>
                      )}
                      <div className="flex gap-1">
                        {idx === session.messages.length - 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => message.isEditing ? onUpdateMessage(idx, message.content) : onToggleEditMessage(idx)}
                            className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                          >
                            {message.isEditing ? <Check className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
                          </Button>
                        )}
                        {message.isEditing && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onToggleEditMessage(idx)}
                            className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                        {/* Remove icon: removes all messages below this */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveMessage(idx)}
                          className="h-6 w-6 p-0 text-slate-400 hover:text-red-400"
                          title="Remove this and all below"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className={`rounded-lg p-3 ${message.type === "input" ? "bg-blue-900/20 border border-blue-800/30" : "bg-slate-800 border border-slate-700"}`}>
                      {message.isEditing ? (
                        <Textarea
                          value={message.content}
                          onChange={e => onUpdateMessage(idx, e.target.value)}
                          className="min-h-[60px] bg-transparent border-none p-0 text-sm font-mono text-white resize-none focus:ring-0"
                          placeholder="Enter message content..."
                        />
                      ) : (
                        <div className="text-sm font-mono text-white whitespace-pre-wrap break-words">
                          {message.content || <span className="text-slate-500 italic">Empty message</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {idx < session.messages.length - 1 && <Separator className="my-4 bg-slate-800" />}
              </div>
            ))
          )}

        </ScrollArea>
      </CardContent>
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogTitle className="sr-only">Model Settings</DialogTitle>
          <SettingsPanel
            config={localConfig}
            onConfigChange={handleConfigChange}
            open={isSettingsOpen}
            onOpenChange={setIsSettingsOpen}
          />
        </DialogContent>
      </Dialog>
    </Card>
  )
}
