"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import dynamic from "next/dynamic"
import rehypeSanitize from "rehype-sanitize"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IconAdjustments, IconCode, IconPencil, IconVersions } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { updateAgent } from "@/lib/services/config"
import { toast } from "@/components/ui/use-toast"

// Import markdown editor dynamically to avoid SSR issues
const MDEditor = dynamic(
  () => import("@uiw/react-md-editor").then((mod) => mod.default),
  { ssr: false }
);

const availableModels = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
]

interface ModelParams {
  model: string;
  temperature: number;
  top_p: number;
  max_tokens: number;
}

interface AgentData {
  name: string;
  prompt: string;
  variables: string[];
  modelParams: ModelParams;
}

export function AgentInfo({
  agent,
  setSelectedAgent,
  configVersion,
  onSave,
}: {
  agent: any
  setSelectedAgent: (agent: any) => void
  configVersion?: string
  onSave?: (updatedAgent: any) => Promise<void>
}) {
  // State variables
  const [prompt, setPrompt] = useState("");
  const [isAgentInfoOpen, setIsAgentInfoOpen] = useState(false);
  const [model, setModel] = useState("");
  const [temperature, setTemperature] = useState(0);
  const [topP, setTopP] = useState(0);
  const [maxTokens, setMaxTokens] = useState(0);
  const [activeTab, setActiveTab] = useState("prompt");
  const [saveInProgress, setSaveInProgress] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Validate agent data
  const isValidAgent = useMemo(() => {
    return agent && typeof agent === 'object' && agent.name;
  }, [agent]);

  // Memoize the initial prompt to avoid unnecessary re-renders
  const initialPrompt = useMemo(() => {
    if (!isValidAgent) return "";
    // In the new structure, prompt is directly on the agent
    return agent.prompt || "";
  }, [agent, isValidAgent]);

  useEffect(() => {
    setPrompt(initialPrompt);
  }, [initialPrompt]);
  
  useEffect(() => {
    setIsAgentInfoOpen(isValidAgent);
  }, [isValidAgent]);
  
  // Reset prompt when agent changes
  useEffect(() => {
    if (isValidAgent) {
      setPrompt(agent.prompt || "");
    }
  }, [agent, isValidAgent]);
  
  // Ensure dialog opens when agent changes
  useEffect(() => {
    if (isValidAgent && agent) {
      setIsAgentInfoOpen(true);
    }
  }, [agent, isValidAgent]);
  
  // Memoize initial model params with fallback values
  const initialModelParams = useMemo(() => ({
    model: agent?.modelParams?.model || availableModels[0].value,
    temperature: agent?.modelParams?.temperature || 0,
    topP: agent?.modelParams?.top_p || 1,
    maxTokens: agent?.modelParams?.max_tokens || 2000
  }), [agent]);
  
  // Reset model params when agent changes
  useEffect(() => {
    setModel(initialModelParams.model);
    setTemperature(initialModelParams.temperature);
    setTopP(initialModelParams.topP);
    setMaxTokens(initialModelParams.maxTokens);
  }, [initialModelParams]);
  
  // Get variables from the agent
  const promptVariables = useMemo(() => {
    if (!isValidAgent) return [];
    return agent.variables || [];
  }, [agent, isValidAgent]);
  
  // Handle dialog open/close
  const handleDialogOpenChange = useCallback((open: boolean) => {
    setIsAgentInfoOpen(open);
    if (!open) {
      // Only notify parent when closing
      setSelectedAgent(null);
    }
  }, [setSelectedAgent]);

  const handleClose = useCallback(() => {
    setIsAgentInfoOpen(false);
    setSelectedAgent(null);
  }, [setSelectedAgent]);
  
  const handleSaveChanges = useCallback(async () => {
    if (!isValidAgent) return;

    setSaveInProgress(true);
    setValidationErrors({});
    
    // Create a copy of the edited agent
    const updatedAgent = {
      ...agent,
      prompt,
      variables: promptVariables,
      modelParams: {
        model,
        temperature,
        top_p: topP,
        max_tokens: maxTokens
      }
    };
    
    try {
      if (onSave) {
        await onSave(updatedAgent);
        handleClose();
      } else {
        // Make sure we have a valid version before proceeding
        if (!configVersion) {
          console.error('No version specified for updating agent');
          return;
        }
        

        
        // Use the API service to update the agent
        const result:any = await updateAgent({
          agent: updatedAgent,
          config_version: configVersion
        });
        
        if (result.success) {
          toast({
            title: "Success",
            description: `Agent ${agent.name} updated successfully in ${result.version || 'current version'}`,
            duration: 3000,
          });
          handleClose();
        } else {
          toast({
            title: "Error",
            description: result.message || "Failed to update agent",
            variant: "destructive",
            duration: 3000,
          });
        }
      }
    } catch (error) {
      console.error('Error saving agent:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update agent",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setSaveInProgress(false);
    }
  }, [
    isValidAgent, 
    agent, 
    prompt, 
    promptVariables, 
    model, 
    temperature, 
    topP, 
    maxTokens, 
    onSave, 
    configVersion, 
    handleClose
  ]);

  // If agent is invalid, don't render the dialog
  if (!isValidAgent) {
    return null;
  }

  return (
    <Dialog open={isAgentInfoOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent 
        className="max-w-4xl p-0 gap-0 overflow-hidden bg-background border-0 !border-none sm:rounded-xl"
      >
        <DialogHeader className="px-6 py-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="pr-8">
              <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                {agent.name}
                {configVersion && (
                  <Badge variant="outline" className="text-xs">
                    Config v{configVersion}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-slate-500">
                Define this agent's behavior through prompts and model parameters
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="w-full h-[70vh] flex flex-col">
          <Tabs defaultValue="prompt" value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <div className="border-b border-border/50 bg-card/40 backdrop-blur-sm">
              <div className="px-6">
                <TabsList className="p-1 h-10 bg-transparent space-x-6 border-0">
                  <TabsTrigger 
                    value="prompt" 
                    className="px-4 py-2 data-[state=active]:bg-blue-500 dark:data-[state=active]:bg-white/20 data-[state=active]:text-white rounded-md transition-all font-medium"
                  >
                    <IconPencil className="w-4 h-4 mr-2" /> 
                    Prompt
                  </TabsTrigger>
                  <TabsTrigger 
                    value="variables" 
                    className="px-4 py-2 data-[state=active]:bg-blue-500 dark:data-[state=active]:bg-white/20 data-[state=active]:text-white rounded-md transition-all font-medium"
                  >
                    <IconCode className="w-4 h-4 mr-2" /> 
                    Variables
                  </TabsTrigger>
                  <TabsTrigger 
                    value="settings" 
                    className="px-4 py-2 data-[state=active]:bg-blue-500 dark:data-[state=active]:bg-white/20 data-[state=active]:text-white rounded-md transition-all font-medium"
                  >
                    <IconAdjustments className="w-4 h-4 mr-2" /> 
                    Settings
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              {/* Prompt Tab */}
              <TabsContent value="prompt" className="h-full flex-1 m-0 p-0 data-[state=active]:flex flex-col">
                <div className="flex-grow overflow-y-auto p-6">
                  <div data-color-mode="light" className="w-full h-full">
                    <MDEditor
                      value={prompt}
                      onChange={(value) => setPrompt(value || "")}
                      height="calc(100% - 24px)"
                      preview="edit"
                      previewOptions={{
                        rehypePlugins: [[rehypeSanitize]] 
                      }}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Variables Tab */}
              <TabsContent value="variables" className="h-full flex-1 m-0 data-[state=active]:flex flex-col">
                <div className="flex-grow overflow-y-auto p-6">
                  <div className="mb-4">
                    <h3 className="text-base font-semibold mb-2">Available Variables</h3>
                    <p className="text-sm text-slate-500 mb-4">
                      These variables can be used in your prompt with {"{variable_name}"} syntax
                    </p>
                  </div>
                  
                  {promptVariables.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {promptVariables.map((variable: string) => (
                        <div 
                          key={variable} 
                          className="bg-white dark:bg-slate-800 p-3 rounded border flex items-center shadow-sm"
                        >
                          <div className="bg-blue-50 dark:bg-blue-900 rounded-md p-1 mr-2">
                            <IconCode className="w-4 h-4 text-blue-600 dark:text-blue-400" />  
                          </div>
                          <div>
                            <p className="text-sm font-medium">{variable}</p>
                            <code className="text-xs text-pink-600 dark:text-pink-400">{`{${variable}}`}</code>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-card rounded-lg border-0">
                      <p className="text-sm text-slate-500">No variables found in this prompt</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Add variables by using {"{variable_name}"} syntax in your prompt
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="h-full flex-1 m-0 data-[state=active]:flex flex-col">
                <div className="flex-grow overflow-y-auto p-6">
                  <div className="mb-6">
                    <h3 className="text-base font-semibold mb-3">Model Configuration</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="model" className="mb-2 text-sm font-medium block">
                        Model
                      </Label>
                      <Select value={model} onValueChange={setModel}>
                        <SelectTrigger id="model" className="w-full">
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableModels.map(m => (
                            <SelectItem key={m.value} value={m.value}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="max_tokens" className="mb-2 text-sm font-medium block">Max Tokens</Label>
                      <Input
                        id="max_tokens"
                        type="number"
                        min={1}
                        value={maxTokens}
                        onChange={e => setMaxTokens(Number(e.target.value))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="temperature" className="mb-2 text-sm font-medium block">Temperature</Label>
                      <Input
                        id="temperature"
                        type="number"
                        step="0.01"
                        min={0}
                        max={2}
                        value={temperature}
                        onChange={e => setTemperature(Number(e.target.value))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="top_p" className="mb-2 text-sm font-medium block">Top P</Label>
                      <Input
                        id="top_p"
                        type="number"
                        step="0.01"
                        min={0}
                        max={1}
                        value={topP}
                        onChange={e => setTopP(Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border/50">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <IconVersions className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-500">
                {configVersion && configVersion !== 'current' 
                  ? `Editing version ${configVersion}` 
                  : 'Editing current version'}
              </span>
            </div>
          </div>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSaveChanges} className="ml-2">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}