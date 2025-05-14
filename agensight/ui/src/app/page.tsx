"use client" 

import React from "react"
import { TracesTable } from "@/components/traces-table/index"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

import { useEffect, useState, useCallback } from "react"
import AgentGraph from "@/components/agent-graph"
import { AgentInfo } from "@/components/agent-info"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { IconGitBranch, IconVersions, IconGitCommit } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogTitle, DialogContent, DialogHeader, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TraceItem } from "@/hooks/use-trace-column"
import { useTheme } from "@/components/ThemeProvider"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getConfigVersions, getConfigByVersion, syncConfigToMain, commitConfigVersion, ConfigVersion } from "@/lib/services/config"
import { updateAgent } from "@/lib/services/agents"
import { getAllTraces } from "@/lib/services/traces"
import type { Connection } from "@/lib/fallbackConfigs"
import Image from "next/image"

// Define types for config and agent
interface Agent {
  name: string;
  // add other agent properties as needed
}

interface Config {
  agents: Agent[];
  connections?: Connection[];
  // add other config properties as needed
}

export default function Dashboard() {
  const { darkMode, toggleDarkMode } = useTheme();
  const [config, setConfig] = useState<Config | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableVersions, setAvailableVersions] = useState<ConfigVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>("");
  const [isCommitDialogOpen, setIsCommitDialogOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [syncToMain, setSyncToMain] = useState(true);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);


  const [activeTab, setActiveTab] = useState(() => {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      // Get the stored tab from sessionStorage
      const storedTab = sessionStorage.getItem('dashboardActiveTab');
      // Remove it after reading
      if (storedTab) {
        sessionStorage.removeItem('dashboardActiveTab');
      }
      // Return stored tab or default
      return storedTab || "experiments";
    }
    return "experiments";
  });
  const [traces, setTraces] = useState<TraceItem[]>([]);
  const [tracesLoading, setTracesLoading] = useState(false);

  // Setup React Query client
  const queryClient = useQueryClient();
  
  // Use React Query for fetching config versions
  const { 
    data: versionsData,
    isLoading: versionsLoading,
    error: versionsError,
    refetch: refetchVersions
  } = useQuery({
    queryKey: ['config-versions'],
    queryFn: getConfigVersions,
  });

  // Process versions data when it changes
  useEffect(() => {
    if (versionsData) {
      const filteredVersions = versionsData.filter((v: ConfigVersion) => 
        v.version !== 'current' && v.version.match(/^\d+\.\d+\.\d+$/)
      );
      
      filteredVersions.sort((a: ConfigVersion, b: ConfigVersion) => {
        return b.version.localeCompare(a.version, undefined, { numeric: true });
      });
      
      setAvailableVersions(filteredVersions);
      
      if (filteredVersions.length > 0 && !selectedVersion) {
        setSelectedVersion(filteredVersions[0].version);
      }
    }
  }, [versionsData, selectedVersion]);
  
  // Use React Query for fetching config by version
  const {
    data: configData,
    isLoading: configLoading,
    error: configError
  } = useQuery({
    queryKey: ['config', selectedVersion],
    queryFn: () => getConfigByVersion(selectedVersion),
    enabled: !!selectedVersion,
  });

  // Update config state when data changes
  useEffect(() => {
    if (configData) {
      setConfig(configData as Config);
    }
  }, [configData]);
  
  // Use React Query for syncing config to main
  const syncToMainMutation = useMutation({
    mutationFn: syncConfigToMain,
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Synced version ${selectedVersion} to main config`,
        duration: 3000,
      });
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['config-versions'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to sync to main config",
        variant: "destructive",
        duration: 3000,
      });
    }
  });
  
  // Use React Query for committing new config version
  const commitVersionMutation = useMutation({
    mutationFn: commitConfigVersion,
    onSuccess: (result:any) => {
      toast({
        title: "Success",
        description: `Created version ${result?.version as any}`,
        duration: 3000,
      });
      
      // Close the dialog
      setIsCommitDialogOpen(false);
      
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['config-versions'] });
      
      // Set the new version as selected
      setSelectedVersion(result.version);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to commit new version",
        variant: "destructive",
        duration: 3000,
      });
    }
  });
  
  // Use React Query for updating agents
  const updateAgentMutation = useMutation({
    mutationFn: updateAgent,
    onSuccess: (result, variables) => {
      toast({
        title: "Success",
        description: `Agent updated successfully to version ${result.version}`,
        duration: 3000,
      });
      
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['config', result.version] });
      
      // Update the selected version if needed
      if (result.version !== selectedVersion) {
        setSelectedVersion(result.version);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update agent",
        variant: "destructive",
        duration: 3000,
      });
    }
  });
  
  // Use React Query for traces
  const {
    data: tracesData,
    isLoading: tracesQueryLoading,
    error: tracesError,
    refetch: refetchTraces
  } = useQuery({
    queryKey: ['traces'],
    queryFn: getAllTraces,
    enabled: activeTab === 'traces',
  });


  // Update traces state when data changes
  useEffect(() => {
    if (tracesData) {
      setTraces(tracesData);
    }
  }, [tracesData]);
  
  // Replace existing fetch function with mutation call
  const handleSyncToMain = async (version: string) => {
    if (!version) return;
    syncToMainMutation.mutate(version);
  };
  
  // Replace existing commit function with mutation call
  const handleCommit = async () => {
    if (!commitMessage.trim()) {
      toast({
        title: "Error",
        description: "Please enter a commit message",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    if (!selectedVersion) {
      toast({
        title: "Error",
        description: "No version selected to commit from",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    commitVersionMutation.mutate({
      commit_message: commitMessage,
      sync_to_main: syncToMain,
      source_version: selectedVersion
    });
  };
  
  // Replace existing saveAgent function with mutation call
  const handleSaveAgent = async (updatedAgent: Agent) => {
    updateAgentMutation.mutate({
      agent: updatedAgent,
      config_version: selectedVersion
    });
  };
  
  // Replace the fetchTraces function with refetch
  const fetchTraces = () => {
    refetchTraces();
  };
  
  // Use React Query loading state for main loading state
  const isLoading = versionsLoading || (configLoading && !!selectedVersion);
  
  useEffect(() => {
    if (activeTab === 'traces') {
      refetchTraces();
    }
  }, [activeTab, refetchTraces]);
  
  // Callback functions for handling UI interactions
  const handleAgentClick = useCallback((agentName: string) => {
    if (!config?.agents) return;
    
    setSelectedAgent(null);
    
    setTimeout(() => {
      const agent = config.agents.find((agent: Agent) => agent.name === agentName);
      if (agent) {
        setSelectedAgent(agent);
        setIsAgentModalOpen(true);
      }
    }, 10);
  }, [config]);

  const handleClearSelectedAgent = useCallback(() => {
    setSelectedAgent(null);
    setIsAgentModalOpen(false);
  }, []);

  const handleOpenCommitDialog = useCallback(() => {
    setCommitMessage("");
    setSyncToMain(true);
    setIsCommitDialogOpen(true);
  }, []);
  
  const handleDialogOpenChange = useCallback((open: boolean) => {
    setIsCommitDialogOpen(open);
    if (!open) {
      setCommitMessage("");
      setSyncToMain(true);
    }
  }, []);
  
  // Show loading state from React Query
  if (isLoading && !config) {
    return (
      <SidebarProvider style={{ "--sidebar-width": "calc(var(--spacing) * 72)", "--header-height": "calc(var(--spacing) * 12)" } as React.CSSProperties}>
        <SidebarInset>
          <SiteHeader />
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <p className="text-slate-500">Loading...</p>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (versionsError || configError) {
    return (
      <SidebarProvider style={{ "--sidebar-width": "calc(var(--spacing) * 72)", "--header-height": "calc(var(--spacing) * 12)" } as React.CSSProperties}>
        <SidebarInset>
          <SiteHeader />
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <p className="text-red-500">{versionsError?.message || configError?.message}</p>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }


  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 grid-bg">
        <div className="container mx-auto py-6">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center gap-4 justify-between  pb-4">
            <div className="flex-none">
              <Tabs value={activeTab} className="w-full" onValueChange={(value) => setActiveTab(value)}>
                <TabsList className="bg-white dark:bg-card p-1 rounded-lg shadow-sm">
                  <TabsTrigger 
                    value="experiments" 
                    className="px-4 py-2 data-[state=active]:bg-blue-500 dark:data-[state=active]:bg-white/20 data-[state=active]:text-white rounded-md transition-all font-medium"
                  >
                    Experiments
                  </TabsTrigger>
                  <TabsTrigger 
                    value="traces" 
                    className="px-4 py-2 data-[state=active]:bg-blue-500 dark:data-[state=active]:bg-white/20 data-[state=active]:text-white rounded-md transition-all font-medium"
                  >
                    Traces
                  </TabsTrigger>
                  <TabsTrigger 
                    value="evaluations" 
                    className="px-4 py-2 data-[state=active]:bg-blue-500 dark:data-[state=active]:bg-white/20 data-[state=active]:text-white rounded-md transition-all font-medium"
                  >
                    Evaluations
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 ml-auto">
              <div className="flex items-center">
                <Select value={selectedVersion} onValueChange={setSelectedVersion}>
                  <SelectTrigger className="w-[180px]">
                    <div className="flex items-center gap-1">
                      <IconGitBranch size={16} />
                      <span className="font-medium">{selectedVersion}</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {availableVersions.map((version) => (
                      <SelectItem key={version.version} value={version.version}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{version.version}</span>
                          <span className="text-muted-foreground text-xs truncate">
                            {version.commit_message}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleSyncToMain(selectedVersion)}
                        disabled={versionsLoading}
                        id="sync-button"
                        className="relative overflow-hidden group hover:border-primary/50 transition-all duration-300"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                        <IconVersions size={16} className="mr-1 group-hover:text-primary transition-colors duration-300" />
                        <span className="relative z-10">Sync</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>This will sync to main agensight.config.json file</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleOpenCommitDialog}
                        disabled={versionsLoading}
                      >
                        <IconGitCommit size={16} className="mr-1" />
                        Commit
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Save current state as a new version</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
          
          <div className="w-full">
            {activeTab === "experiments" && (
              <div className="grid grid-cols-1 gap-6 mb-8">
                <div className="relative">
                  <div className="rounded-lg border border-border/40 bg-card/50 backdrop-blur-sm p-2 h-[550px] overflow-hidden">
                    {versionsLoading ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                      </div>
                    ) : error ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-destructive">{error}</div>
                      </div>
                    ) : config ? (
                      <AgentGraph 
                        agents={config.agents || []} 
                        connections={config.connections || []} 
                        onNodeClick={handleAgentClick}
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === "traces" && (
              <div className="border rounded-lg flex flex-col bg-card/50 backdrop-blur-sm h-[550px] pb-0">
                {tracesQueryLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : traces && traces.length > 0 ? (
                  <div className="flex-1 flex flex-col h-full">
                    <TracesTable data={traces} />
                  </div>
                ) : (
                  <div className="text-center flex items-center justify-center h-full">
                    <div>
                      <Image src="/pype-logo.png" alt="PYPE Logo" width={100} height={100} className="h-12 w-20 mx-auto mb-4" />
                      <h3 className="text-lg font-medium">No traces available</h3>
                      <p className="text-muted-foreground mt-2">
                        Trace data will appear here when you run experiments
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === "evaluations" && (
              <div className="border rounded-lg p-8 flex items-center justify-center bg-card/50 backdrop-blur-sm h-[550px]">
                <div className="text-center">
                  <Image src="/pype-logo.png" alt="PYPE Logo" width={100} height={100} className="h-12 w-20 mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No evaluation till now</h3>
                  <p className="text-muted-foreground mt-2">
                    Evaluation data will appear here when you run experiments
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Dialog open={isCommitDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Create New Version</DialogTitle>
            <DialogDescription>
              Save the current configuration as a new version.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 px-6">
            <div className="space-y-2">
              <Label htmlFor="commit-message" className="font-medium">Commit Message</Label>
              <Input
                id="commit-message"
                placeholder="Describe your changes"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sync-to-main"
                checked={syncToMain}
                onCheckedChange={(checked) => {
                  setSyncToMain(checked === true);
                }}
              />
              <Label htmlFor="sync-to-main" className="font-medium text-sm">
                This will sync your changes to the agensight.config.json file
              </Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCommitDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              disabled={versionsLoading} 
              onClick={handleCommit}
            >
              {versionsLoading ? (
                <>
                  <div className="mr-2 animate-spin h-4 w-4 border-2 border-background border-t-transparent rounded-full" />
                  Committing...
                </>
              ) : "Create Version"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Agent Details Modal */}
      <Dialog open={isAgentModalOpen} onOpenChange={setIsAgentModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden border-0 !border-none bg-card/90 backdrop-blur-sm shadow-lg" style={{ border: 'none' }}>
          <DialogHeader className="border-0 !border-none" style={{ borderBottom: 'none' }}>
            <DialogTitle className="text-xl font-semibold">
              {selectedAgent?.name || "Agent Details"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="overflow-auto py-4">
            {selectedAgent && (
              <AgentInfo 
                agent={selectedAgent} 
                setSelectedAgent={handleClearSelectedAgent}
                configVersion={selectedVersion}
                onSave={handleSaveAgent}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
