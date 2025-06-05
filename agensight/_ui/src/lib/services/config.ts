// Define interfaces for config service
export interface ConfigVersion {
  version: string;
  commit_message: string;
  timestamp: string;
  is_current?: boolean;
}

// API base URL
const API_BASE_URL = "http://0.0.0.0:5001/api";

import { AgentConfig, AgentConfigData } from "@/lib/types/agent";

// Service functions using real API endpoints
export async function getConfigVersions(): Promise<ConfigVersion[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/config/versions`);
    
    if (!response.ok) {
      throw new Error(`Error fetching config versions: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch config versions:', error);
    throw error;
  }
}

interface ConfigApiResponse {
  configData: AgentConfigData;
}

export async function getConfigByVersion(version: string): Promise<AgentConfigData> {
  console.log(`[${new Date().toISOString()}] Fetching config for version:`, version);
  try {
    const response = await fetch(`${API_BASE_URL}/config?version=${encodeURIComponent(version)}`);
    
    if (!response.ok) {
      throw new Error(`Error fetching config version ${version}: ${response.statusText}`);
    }
    
    const responseData = await response.json();
    
    // Handle both response formats:
    // 1. Direct AgentConfigData
    // 2. Wrapped in { configData: AgentConfigData }
    const configData = responseData.configData || responseData;
    
    if (!configData) {
      throw new Error('Invalid config data format received from server');
    }
    
    // Ensure required arrays exist
    const agents = Array.isArray(configData.agents) ? configData.agents : [];
    const connections = Array.isArray(configData.connections) ? configData.connections : [];
    const prompts = Array.isArray(configData.prompts) ? configData.prompts : [];
    
    const result = {
      agents,
      connections,
      prompts
    };
    
    console.log(`[${new Date().toISOString()}] Fetched config data:`, {
      agents: agents.map((a: AgentConfig) => a.name),
      connections: connections.length,
      prompts: prompts.length
    });
    
    return result;
  } catch (error) {
    console.error(`Failed to fetch config version ${version}:`, error);
    throw error;
  }
}

export async function syncConfigToMain(version: string): Promise<unknown> {
  try {
    const response = await fetch(`${API_BASE_URL}/config/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ version })
    });
    
    if (!response.ok) {
      throw new Error(`Error syncing config version ${version}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Failed to sync config version ${version}:`, error);
    throw error;
  }
}

export async function commitConfigVersion(commitData: { 
  commit_message: string; 
  sync_to_main: boolean;
  source_version: string;
}): Promise<unknown> {
  try {
    const response = await fetch(`${API_BASE_URL}/config/commit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(commitData)
    });
    
    if (!response.ok) {
      throw new Error(`Error committing config version: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Failed to commit config version:", error);
    throw error;
  }
}

export async function updateAgent(updateData: {
  agent: unknown;
  config_version?: string;
}): Promise<unknown> {
  try {
    // Make sure config_version is explicitly a string
    if (updateData.config_version) {
      updateData.config_version = String(updateData.config_version);
    }
    
    // Debug log to check exactly what we're sending
    
    const response = await fetch(`${API_BASE_URL}/update_agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });
    
    if (!response.ok) {
      console.error('Error response from update_agent:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error body:', errorText);
      throw new Error(`Error updating agent: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Failed to update agent:", error);
    throw error;
  }
}

export async function updatePrompt(updateData: {
  prompt: unknown;
  sync_to_main?: boolean;
  config_version?: string;
}): Promise<unknown> {
  try {
    const response = await fetch(`${API_BASE_URL}/update_prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });
    
    if (!response.ok) {
      throw new Error(`Error updating prompt: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Failed to update prompt:", error);
    throw error;
  }
} 