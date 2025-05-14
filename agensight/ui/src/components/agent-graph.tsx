// components/AgentGraph.tsx
"use client"
import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Panel,
  Edge,
  Node,
  Position,
  MarkerType,
  ReactFlowProvider,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";

type Connection = { from: string; to: string };

interface Props {
  agents: any[];
  connections: Connection[];
  onNodeClick?: (agentName: string) => void;
}

// Separate FlowChart component to use the ReactFlow hooks
function FlowChart({ agents = [], connections = [], onNodeClick }: Props) {
  const reactFlowInstance = useReactFlow();
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Check for dark mode by looking at the document class
  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    };
    
    // Check on mount
    checkDarkMode();
    
    // Set up a mutation observer to watch for class changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });
    
    return () => observer.disconnect();
  }, []);
  
  // Solid colors for light mode, transparent for dark mode
  const nodeColors = isDarkMode 
    ? [
        "rgba(37, 99, 235, 0.5)",   // blue with transparency
        "rgba(16, 185, 129, 0.5)",  // green with transparency
        "rgba(139, 92, 246, 0.5)",  // purple with transparency
        "rgba(236, 72, 153, 0.5)",  // pink with transparency
        "rgba(245, 158, 11, 0.5)",  // amber with transparency
      ]
    : [
        "#2563eb",  // blue solid
        "#10b981",  // green solid
        "#8b5cf6",  // purple solid
        "#ec4899",  // pink solid
        "#f59e0b",  // amber solid
      ];
      
  const startNodeColor = isDarkMode ? "rgba(34, 197, 94, 0.5)" : "#22c55e";
  const endNodeColor = isDarkMode ? "rgba(239, 68, 68, 0.5)" : "#ef4444";
  
  // Edge colors
  const regularEdgeColor = isDarkMode ? "rgba(16, 185, 129, 0.6)" : "#10b981";
  const startEdgeColor = isDarkMode ? "rgba(34, 197, 94, 0.6)" : "#22c55e";
  const endEdgeColor = isDarkMode ? "rgba(239, 68, 68, 0.6)" : "#ef4444";
  
  const initializationRef = useRef(false);
  
  // Find start and end nodes
  const findSpecialNodes = useCallback(() => {
    // Get all sources and targets
    const sources = new Set(connections.map(conn => conn.from));
    const targets = new Set(connections.map(conn => conn.to));
    
    // Find explicit "Start" and "End" nodes first
    const hasExplicitStartNode = connections.some(conn => conn.from === "Start");
    const hasExplicitEndNode = connections.some(conn => conn.to === "End");
    
    // Find start nodes (those that are only sources and never targets or explicitly named "Start")
    const startNodes: string[] = [];
    sources.forEach(source => {
      if (source === "Start" || (!targets.has(source) && source !== "End")) {
        startNodes.push(source);
      }
    });
    
    // Find end nodes (those that are only targets and never sources or explicitly named "End")
    const endNodes: string[] = [];
    targets.forEach(target => {
      if (target === "End" || (!sources.has(target) && target !== "Start")) {
        endNodes.push(target);
      }
    });
    
    return { startNodes, endNodes, hasExplicitStartNode, hasExplicitEndNode };
  }, [connections]);
  
  // Create nodes from agents with better positioning
  const createNodesWithSpecial = useCallback(() => {
    const { startNodes, endNodes, hasExplicitStartNode, hasExplicitEndNode } = findSpecialNodes();
    
    // Create nodes for all agents (excluding special nodes which we'll add separately)
    const agentNodes: Node[] = agents
      .filter(agent => agent.name !== "Start" && agent.name !== "End")
      .map((agent, idx) => ({
        id: agent.name,
        data: { label: agent.name },
        position: { 
          x: 150 + (idx % 3) * 250, 
          y: 100 + Math.floor(idx / 3) * 150 
        },
        style: { 
          background: nodeColors[idx % nodeColors.length], 
          color: "#fff", 
          padding: "10px 15px",
          borderRadius: "8px",
          width: 180,
          textAlign: "center" as const,
          fontWeight: "bold",
          boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
          backdropFilter: isDarkMode ? "blur(8px)" : "none",
          border: isDarkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "none",
        }
      }));
    
    // Add special start and end nodes if needed
    const allNodes = [...agentNodes];
    
    // Check for explicit Start node in connections
    if (hasExplicitStartNode) {
      allNodes.unshift({
        id: "Start",
        data: { label: "START" },
        position: { x: 150, y: 0 },
        style: {
          background: startNodeColor,
          color: "#fff",
          padding: "10px 15px",
          borderRadius: "8px",
          width: 120,
          textAlign: "center" as const,
          fontWeight: "bold",
          boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
          backdropFilter: isDarkMode ? "blur(8px)" : "none",
          border: isDarkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "none",
        }
      });
    } else if (startNodes.length > 0) {
      // If no explicit Start but there are nodes without incoming edges
      allNodes.unshift({
        id: "__start__",
        data: { label: "START" },
        position: { x: 150, y: 0 },
        style: {
          background: startNodeColor,
          color: "#fff",
          padding: "10px 15px",
          borderRadius: "8px",
          width: 120,
          textAlign: "center" as const,
          fontWeight: "bold",
          boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
          backdropFilter: isDarkMode ? "blur(8px)" : "none",
          border: isDarkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "none",
        }
      });
    }
    
    // Check for explicit End node in connections
    if (hasExplicitEndNode) {
      allNodes.push({
        id: "End",
        data: { label: "END" },
        position: { 
          x: 150, 
          y: 100 + Math.ceil(agentNodes.length / 3) * 150 
        },
        style: {
          background: endNodeColor,
          color: "#fff",
          padding: "10px 15px",
          borderRadius: "8px",
          width: 120,
          textAlign: "center" as const,
          fontWeight: "bold",
          boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
          backdropFilter: isDarkMode ? "blur(8px)" : "none",
          border: isDarkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "none",
        }
      });
    } else if (endNodes.length > 0) {
      // If no explicit End but there are nodes without outgoing edges
      allNodes.push({
        id: "__end__",
        data: { label: "END" },
        position: { 
          x: 150, 
          y: 100 + Math.ceil(agentNodes.length / 3) * 150 
        },
        style: {
          background: endNodeColor,
          color: "#fff",
          padding: "10px 15px",
          borderRadius: "8px",
          width: 120,
          textAlign: "center" as const,
          fontWeight: "bold",
          boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
          backdropFilter: isDarkMode ? "blur(8px)" : "none",
          border: isDarkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "none",
        }
      });
    }
    
    return allNodes;
  }, [agents, nodeColors, findSpecialNodes, isDarkMode, startNodeColor, endNodeColor]);
  
  // Create edges including special connections
  const createEdgesWithSpecial = useCallback(() => {
    const { startNodes, endNodes, hasExplicitStartNode, hasExplicitEndNode } = findSpecialNodes();
    
    // Create regular edges
    const regularEdges = connections.map((conn, idx) => ({
      id: `e${idx}`,
      source: conn.from,
      target: conn.to,
      type: 'default',
      animated: true,
      style: { 
        stroke: 
          conn.from === "Start" ? startEdgeColor : 
          conn.to === "End" ? endEdgeColor : 
          regularEdgeColor, 
        strokeWidth: 2 
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 15,
        height: 15,
        color: 
          conn.from === "Start" ? startEdgeColor : 
          conn.to === "End" ? endEdgeColor : 
          regularEdgeColor,
      },
    }));
    
    const allEdges = [...regularEdges];
    
    // Add edges from __start__ to all start nodes (only if there's no explicit Start node)
    if (!hasExplicitStartNode && startNodes.length > 0) {
      startNodes.forEach((startNode, idx) => {
        // Don't create edge if it's to "Start" or already has a connection from "Start"
        if (startNode !== "Start" && !connections.some(c => c.from === "Start" && c.to === startNode)) {
          allEdges.push({
            id: `start-${idx}`,
            source: "__start__",
            target: startNode,
            type: 'default',
            animated: true,
            style: { stroke: startEdgeColor, strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 15,
              height: 15,
              color: startEdgeColor,
            },
          });
        }
      });
    }
    
    // Add edges from all end nodes to __end__ (only if there's no explicit End node)
    if (!hasExplicitEndNode && endNodes.length > 0) {
      endNodes.forEach((endNode, idx) => {
        // Don't create edge if it's from "End" or already has a connection to "End"
        if (endNode !== "End" && !connections.some(c => c.from === endNode && c.to === "End")) {
          allEdges.push({
            id: `end-${idx}`,
            source: endNode,
            target: "__end__",
            type: 'default',
            animated: true,
            style: { stroke: endEdgeColor, strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 15,
              height: 15,
              color: endEdgeColor,
            },
          });
        }
      });
    }
    
    return allEdges;
  }, [connections, findSpecialNodes, regularEdgeColor, startEdgeColor, endEdgeColor]);
  
  const initialNodes = createNodesWithSpecial();
  const initialEdges = createEdgesWithSpecial();
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  // Update nodes and edges when agents or connections change - only once after initial render
  useEffect(() => {
    if (!initializationRef.current && agents.length > 0) {
      setNodes(createNodesWithSpecial());
      setEdges(createEdgesWithSpecial());
      initializationRef.current = true;
    }
  }, [agents, connections, createNodesWithSpecial, createEdgesWithSpecial]); // Removed setNodes and setEdges from dependencies
  
  // Update nodes and edges when the theme changes
  useEffect(() => {
    if (initializationRef.current && reactFlowInstance) {
      setNodes(createNodesWithSpecial());
      setEdges(createEdgesWithSpecial());
    }
  }, [isDarkMode]);
  
  // Fit view with appropriate zoom level when nodes change - use timeout ref to prevent multiple calls
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (nodes.length > 0 && reactFlowInstance) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set new timeout to ensure the flow has been properly rendered
      timeoutRef.current = setTimeout(() => {
        reactFlowInstance.fitView({ 
          padding: 0.5, // Increased padding for less zoom
          minZoom: 0.3, // Decreased minZoom to allow more zoomed out view
          maxZoom: 1.5 
        });
        timeoutRef.current = null;
      }, 100);
    }
    
    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [nodes.length, reactFlowInstance]);

  const handleNodeClick = useCallback((_:any, node:any) => {
    if (onNodeClick && node.id !== "__start__" && node.id !== "__end__" && node.id !== "Start" && node.id !== "End") {
      onNodeClick(node.id);
    }
  }, [onNodeClick]);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(e, node) => {
          if (node.id !== "__start__" && node.id !== "__end__" && node.id !== "Start" && node.id !== "End" && onNodeClick) {
            onNodeClick(node.id);
          }
        }}
        fitView
      >
        <Background 
          color={isDarkMode ? "#4a5568" : "#e2e8f0"} 
          gap={16} 
          size={1} 
          style={{ 
            backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.9)' : 'white'
          }}
        />
        <Controls />
        <MiniMap 
          nodeStrokeColor={(n) => n.style?.background as string || '#eee'}
          nodeColor={(n) => n.style?.background as string || '#eee'}
          zoomable
          pannable
        />
      </ReactFlow>
    </div>
  );
}

export default function AgentGraph(props: Props) {
  // Fallback for empty graph
  if (!props.agents || props.agents.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-card/30 backdrop-blur-sm rounded-xl border border-border">
        <p className="text-muted-foreground">No agents available to display</p>
      </div>
    );
  }

  return (
    <div className="h-[500px] border rounded-xl overflow-hidden bg-background">
      <ReactFlowProvider>
        <FlowChart {...props} />
      </ReactFlowProvider>
    </div>
  );
}