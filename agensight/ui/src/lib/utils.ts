import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getAgentByName(
  agents: { name: string }[],
  selectedAgentName: string
) {
  return agents.find(agent => agent.name === selectedAgentName);
}