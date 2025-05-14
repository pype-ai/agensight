/**
 * Fallback Configurations
 * 
 * This module provides predefined configuration objects for use when the backend API
 * is unavailable. These configurations are used as fallbacks to ensure the application
 * can still function during development or when backend services are down.
 * 
 * NOT FOR PRODUCTION USE: In production, the application should rely on the actual
 * backend service and proper error handling rather than these fallback configurations.
 */

interface AgentConfig {
  name: string;
  prompt: string;
  variables: string[];
  modelParams: {
    model: string;
    temperature: number;
    top_p: number;
    max_tokens: number;
  };
}

export interface Connection {
  from: string;
  to: string;
}

interface ConfigVersion {
  version: string;
  commit_message: string;
  timestamp: string;
  agents: AgentConfig[];
  connections: Connection[];
}

// Basic configurations used as fallbacks
const CONFIG_V1_0_0: ConfigVersion = {
  version: "1.0.0",
  commit_message: "Initial configuration with analysis and model manager agents",
  timestamp: "2023-11-15T12:00:00Z",
  agents: [
    {
      name: "AnalysisAgent",
      prompt: "You are an expert medical analyst specialized in reviewing patient data and providing comprehensive insights.",
      variables: ["patient_name", "age", "gender", "report"],
      modelParams: {
        model: "gpt-4o-mini",
        temperature: 0.1,
        top_p: 1,
        max_tokens: 2000
      }
    },
    {
      name: "ModelManager",
      prompt: "You are a model manager responsible for coordinating between different specialized agents and ensuring data flows correctly.",
      variables: ["system_prompt", "data"],
      modelParams: {
        model: "gpt-4o-mini",
        temperature: 0.1,
        top_p: 1,
        max_tokens: 2000
      }
    }
  ],
  connections: [
    { from: "AnalysisAgent", to: "ModelManager" }
  ]
};

const CONFIG_V1_0_1: ConfigVersion = {
  version: "1.0.1",
  commit_message: "Updated AnalysisAgent prompt and added DiagnosticAgent",
  timestamp: "2023-11-16T15:30:00Z",
  agents: [
    {
      name: "AnalysisAgent",
      prompt: "You are an expert medical analyst specialized in reviewing patient data and providing comprehensive insights with actionable recommendations.",
      variables: ["patient_name", "age", "gender", "report"],
      modelParams: {
        model: "gpt-4o",
        temperature: 0.2,
        top_p: 1,
        max_tokens: 2500
      }
    },
    {
      name: "ModelManager",
      prompt: "You are a model manager responsible for coordinating between different specialized agents and ensuring data flows correctly.",
      variables: ["system_prompt", "data"],
      modelParams: {
        model: "gpt-4o-mini",
        temperature: 0.1,
        top_p: 1,
        max_tokens: 2000
      }
    },
    {
      name: "DiagnosticAgent",
      prompt: "You are a diagnostic specialist who reviews medical analyses and provides second opinions on diagnoses and treatment plans.",
      variables: ["primary_analysis", "patient_data"],
      modelParams: {
        model: "gpt-4o",
        temperature: 0.1,
        top_p: 1,
        max_tokens: 1500
      }
    }
  ],
  connections: [
    { from: "AnalysisAgent", to: "ModelManager" },
    { from: "ModelManager", to: "DiagnosticAgent" }
  ]
};

// Default fallback config that matches the Flask backend's create_default_config
const DEFAULT_CONFIG: ConfigVersion = {
  version: "1.0.0-default",
  commit_message: "Default configuration",
  timestamp: new Date().toISOString(),
  agents: [
    {
      name: "DefaultAgent",
      prompt: "You are a default agent created automatically.",
      variables: ["input"],
      modelParams: {
        model: "gpt-4o-mini",
        temperature: 0.7,
        top_p: 1,
        max_tokens: 1000
      }
    }
  ],
  connections: []
};

/**
 * Returns a fallback configuration based on the requested version.
 * If no version is specified or the version is not found, returns the default config
 * to mimic the backend's initial state behavior.
 * 
 * @param version - Optional version string to retrieve a specific config version
 * @returns A configuration object matching the requested version or the default config
 */
export function getFallbackConfig(version?: string | null): ConfigVersion {
  if (version === "1.0.0") {
    return CONFIG_V1_0_0;
  } else if (version === "1.0.1") {
    return CONFIG_V1_0_1;
  } else {
    // When no version specified, return the default config
    // This mimics the backend's behavior before .agensight directory is created
    return DEFAULT_CONFIG;
  }
}

/**
 * Returns the default configuration from the backend
 * Used when no other configurations are available
 * 
 * @returns The default configuration
 */
export function getDefaultConfig(): ConfigVersion {
  return DEFAULT_CONFIG;
}

/**
 * Returns all available fallback configurations
 * 
 * @returns Array of all fallback configurations
 */
export function getAllFallbackConfigs(): ConfigVersion[] {
  return [CONFIG_V1_0_1, CONFIG_V1_0_0];
} 