import {GanttChartProps,ToolCall,Span,GanttChartVisualizerProps} from "@/types/type"
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { IconArrowLeft } from "@tabler/icons-react";



export function GanttChart({ spans, trace }: GanttChartProps) {
    const [selectedTool, setSelectedTool] = useState<ToolCall | null>(null);
    const [selectedGanttSpan, setSelectedGanttSpan] = useState<Span | null>(null);
    const [focusedSpanIndex, setFocusedSpanIndex] = useState<number>(-1);
    
    // Handle keyboard navigation
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (!spans.length) return;
        
        const allSpans = [...spans];
        
        switch (e.key) {
          case 'ArrowUp':
            e.preventDefault();
            setFocusedSpanIndex(prev => {
              const newIndex = prev <= 0 ? allSpans.length - 1 : prev - 1;
              return newIndex;
            });
            break;
          case 'ArrowDown':
            e.preventDefault();
            setFocusedSpanIndex(prev => {
              const newIndex = prev >= allSpans.length - 1 ? 0 : prev + 1;
              return newIndex;
            });
            break;
          case 'Enter':
            if (focusedSpanIndex >= 0 && focusedSpanIndex < allSpans.length) {
              setSelectedGanttSpan(allSpans[focusedSpanIndex]);
              setSelectedTool(null);
            }
            break;
          case 'Escape':
            setSelectedTool(null);
            setSelectedGanttSpan(null);
            break;
        }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [spans, focusedSpanIndex]);
    
    // Generate processed timeline data
    const timelineData = useMemo(() => {
      if (!spans.length || !trace) return null;
      
      // Find the earliest start time and latest end time
      const startTime = Math.min(...spans.map(span => span.start_time));
      const endTime = Math.max(...spans.map(span => span.end_time));
      
      // Calculate total duration for scaling
      const totalDuration = endTime - startTime;
      
      // Generate time marks (5 evenly spaced time points)
      const timeMarks = [];
      for (let i = 0; i <= 5; i++) {
        const time = startTime + (i * totalDuration / 5);
        timeMarks.push(new Date(time * 1000).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }));
      }
      
      // Generate a unique color for each span
      const spanColors: Record<string, string> = {};
      
      // Predefined vibrant colors to cycle through
      const colorPalette = [
        "#FF5733", "#33FF57", "#3357FF", "#FF33A8", "#33FFF5",
        "#FFD133", "#8C33FF", "#FF5733", "#33FFBD", "#FF3333",
        "#33FF33", "#3333FF", "#FF33FF", "#33FFFF", "#FFFF33"
      ];
      
      // Assign colors to each span - randomly but consistently based on span ID
      spans.forEach((span, index) => {
        // Use modulo to cycle through colors for more spans than colors
        const baseColor = colorPalette[index % colorPalette.length];
        
        // Slightly vary the color to make each unique
        const r = parseInt(baseColor.slice(1, 3), 16);
        const g = parseInt(baseColor.slice(3, 5), 16);
        const b = parseInt(baseColor.slice(5, 7), 16);
        
        // Apply a slight random variation to ensure uniqueness
        const variation = Math.floor(Math.random() * 30) - 15;
        const newR = Math.min(255, Math.max(0, r + variation));
        const newG = Math.min(255, Math.max(0, g + variation));
        const newB = Math.min(255, Math.max(0, b + variation));
        
        spanColors[span.span_id] = `rgb(${newR}, ${newG}, ${newB})`;
      });
      
      // Function to get color for a specific span
      const getColorForSpan = (spanId: string): string => {
        return spanColors[spanId] || "#10B981"; // Default green if not found
      };
      
      return {
        startTime,
        endTime,
        totalDuration,
        timeMarks,
        spanColors,
        getColorForSpan
      };
    }, [spans, trace]);
    
    // If no data, show loading or empty state
    if (!timelineData) {
      return (
        <div className="h-full flex items-center justify-center text-muted-foreground">
          <p>No timeline data available</p>
        </div>
      );
    }
    
    // Map spans by actor (categorized as user or agent)
    const userSpans = spans.filter(span => span.name.toLowerCase().includes("user") || span.name.toLowerCase().includes("input"));
    const agentSpans = spans.filter(span => !userSpans.includes(span));
    
    return (
      <div className="flex flex-col">
        {/* Chart section */}
        <div className="mb-2">
          {/* Time axis */}
          <div className="flex justify-between mb-1 text-xs text-muted-foreground sticky top-0 bg-background z-10 pb-0.5" suppressHydrationWarning>
            {timelineData.timeMarks.map((mark, i) => (
              <div key={i} suppressHydrationWarning>{mark}</div>
            ))}
          </div>
          
          {/* Chart container - increasing height from h-60 to h-80 */}
          <div className="h-80 relative border rounded-md overflow-hidden">
            {/* Scrollable content area */}
            <div className="overflow-y-auto h-full">
              {/* Grid lines and spans container */}
              <div className="relative min-h-full">
                {/* Vertical grid lines */}
                {timelineData.timeMarks.map((_, i) => (
                  <div 
                    key={i} 
                    className="absolute top-0 bottom-0 border-r border-dashed border-muted-foreground/20" 
                    style={{ left: `${(i / 5) * 100}%` }}
                  />
                ))}
                
                {/* Rows for user spans */}
                {userSpans.map((span, i) => {
                  const isUserFocused = focusedSpanIndex === spans.indexOf(span);
                  return (
                    <div 
                      key={`user-${span.span_id}`} 
                      className={`flex items-center ${isUserFocused ? 'bg-muted/30 -mx-4 px-4' : ''} mb-0.5`}
                      tabIndex={0}
                      onFocus={() => setFocusedSpanIndex(spans.indexOf(span))}
                    >
                      <div className="w-32 text-right pr-3 text-sm">user</div>
                      <div className="flex-1 relative h-5">
                        <div 
                          className={`absolute h-full rounded-sm hover:h-7 hover:-top-1 transition-all duration-75 cursor-pointer ${isUserFocused ? 'ring-2 ring-primary' : ''}`}
                          style={{
                            backgroundColor: timelineData.getColorForSpan(span.span_id),
                            left: `${((span.start_time - timelineData.startTime) / timelineData.totalDuration) * 100}%`,
                            width: `${(span.duration / timelineData.totalDuration) * 100}%`,
                            minWidth: "8px",
                            zIndex: 10
                          }}
                          title={`${span.name}: ${span.duration.toFixed(2)}s`}
                          onClick={() => {
                            setSelectedGanttSpan(span);
                            setSelectedTool(null);
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
                
                {/* Rows for agent spans */}
                <div className="mt-5 space-y-0">
                {agentSpans.map((span, i) => {
                  const isAgentFocused = focusedSpanIndex === spans.indexOf(span);
                    
                  return (
                    <div 
                      key={`agent-${span.span_id}`} 
                        className={`flex items-center ${isAgentFocused ? 'bg-muted/30 -mx-4 px-4' : ''} h-5 my-0 py-0 mb-3 ${i < agentSpans.length - 1 ? 'border-b border-dotted border-muted-foreground/20 pb-3' : ''}`}
                      tabIndex={0}
                      onFocus={() => setFocusedSpanIndex(spans.indexOf(span))}
                    >
                        <div className="w-32 text-right pr-3 text-sm truncate">
                          {span.name}
                        </div>
                        <div className="flex-1 relative h-5">
                        {/* For each agent span */}
                        <div 
                            className={`absolute h-full rounded-sm hover:h-7 hover:-top-1 transition-all duration-75 cursor-pointer ${isAgentFocused ? 'ring-2 ring-primary' : ''}`}
                          style={{
                            backgroundColor: timelineData.getColorForSpan(span.span_id),
                            left: `${((span.start_time - timelineData.startTime) / timelineData.totalDuration) * 100}%`,
                            width: `${(span.duration / timelineData.totalDuration) * 100}%`,
                            minWidth: "8px",
                            zIndex: 10
                          }}
                          title={`${span.name}: ${span.duration.toFixed(2)}s`}
                          onClick={() => {
                            setSelectedGanttSpan(span);
                            setSelectedTool(null);
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Legend section */}
        <div className="flex flex-wrap gap-3 py-2 text-xs border-t border-b mb-3">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full block" style={{ backgroundColor: timelineData.spanColors["User"] }}></span>
            <span className="text-xs">User</span>
          </div>
          
          <div className="border-l h-4 mx-2 border-muted-foreground/30"></div>
          
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full block" style={{ backgroundColor: timelineData.spanColors["Assistant"] }}></span>
            <span className="text-xs">Assistant</span>
          </div>
          
          {/* Show span types in the legend */}
          {agentSpans.map(span => (
            span.name !== "Assistant" && 
            <div key={`legend-${span.span_id}`} className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full block" style={{ backgroundColor: timelineData.getColorForSpan(span.span_id) }}></span>
              <span className="text-xs">{span.name}</span>
            </div>
          ))}
        </div>
        
        {/* Details section */}
        {selectedTool && (
          <div className="border rounded-md p-3 bg-card max-h-[400px] overflow-y-auto scroll-container">
            <div className="flex justify-between items-center mb-3">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 mr-1 text-xs flex items-center gap-1"
                    onClick={() => setSelectedTool(null)}
                  >
                    <IconArrowLeft size={12} />
                    <span>Back</span>
                  </Button>
              <h4 className="font-medium">{selectedTool.name}</h4>
                </div>
                {selectedGanttSpan && (
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <span>From:</span>
                    <strong>{selectedGanttSpan.name}</strong>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setSelectedTool(null)} className="h-6 w-6 p-0">
                ×
              </Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mb-2">
              Duration: {selectedTool.duration.toFixed(2)}s
            </div>
            <div className="mb-2">
              <h5 className="text-xs font-medium text-muted-foreground mb-1">Arguments:</h5>
              <pre className="text-xs bg-muted p-2 rounded-md overflow-auto max-h-48 scroll-container">
                {JSON.stringify(selectedTool.args, null, 2)}
              </pre>
            </div>
            <div>
              <h5 className="text-xs font-medium text-muted-foreground mb-1">Output:</h5>
              <pre className="text-xs bg-muted p-2 rounded-md overflow-auto max-h-48 scroll-container">
                {selectedTool.output}
              </pre>
            </div>
            {selectedGanttSpan && selectedGanttSpan.tools_called && selectedGanttSpan.tools_called.length > 1 && (
              <div className="mt-4 pt-3 border-t">
                <h5 className="text-xs font-medium text-muted-foreground mb-2">Other Tools Used by {selectedGanttSpan.name}:</h5>
                <div className="space-y-1">
                  {selectedGanttSpan.tools_called
                    .filter(tool => tool.span_id !== selectedTool.span_id)
                    .map((tool, i) => (
                      <div 
                        key={i} 
                        className="text-xs p-2 bg-muted rounded flex justify-between items-center cursor-pointer hover:bg-muted/80"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTool(tool);
                        }}
                      >
                        <span>{tool.name}</span>
                        <span className="text-muted-foreground">{tool.duration.toFixed(2)}s</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        )}
        
        {selectedGanttSpan && !selectedTool && (
          <div className="border rounded-md p-3 bg-card">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium">{selectedGanttSpan.name}</h4>
              <Button size="sm" variant="ghost" onClick={() => setSelectedGanttSpan(null)} className="h-6 w-6 p-0">
                ×
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground mb-2">
              Duration: {selectedGanttSpan.duration.toFixed(2)}s
            </div>
            
            <div className="text-xs mb-2">
              <div className="flex justify-between mb-1">
                <span className="text-muted-foreground">Start:</span>
                <span suppressHydrationWarning>{new Date(selectedGanttSpan.start_time * 1000).toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">End:</span>
                <span suppressHydrationWarning>{new Date(selectedGanttSpan.end_time * 1000).toLocaleTimeString()}</span>
              </div>
            </div>
            
            {selectedGanttSpan.tools_called.length > 0 && (
              <div>
                <h5 className="text-xs font-medium mb-2">Tools Used:</h5>
                <div className="space-y-1">
                  {selectedGanttSpan.tools_called.map((tool, i) => (
                    <div 
                      key={i} 
                      className="text-xs p-2 bg-muted rounded flex justify-between items-center cursor-pointer hover:bg-muted/80"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTool(tool);
                      }}
                    >
                      <span>{tool.name}</span>
                      <span className="text-muted-foreground">{tool.duration.toFixed(2)}s</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }



  export function GanttChartVisualizer({ spans, trace, onSelectSpan, onSelectTool, selectedSpanId }: GanttChartVisualizerProps) {
    const [focusedSpanIndex, setFocusedSpanIndex] = useState<number>(-1);
    
    // Handle keyboard navigation
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (!spans.length) return;
        
        const allSpans = [...spans];
        
        switch (e.key) {
          case 'ArrowUp':
            e.preventDefault();
            setFocusedSpanIndex(prev => {
              const newIndex = prev <= 0 ? allSpans.length - 1 : prev - 1;
              return newIndex;
            });
            break;
          case 'ArrowDown':
            e.preventDefault();
            setFocusedSpanIndex(prev => {
              const newIndex = prev >= allSpans.length - 1 ? 0 : prev + 1;
              return newIndex;
            });
            break;
          case 'Enter':
            if (focusedSpanIndex >= 0 && focusedSpanIndex < allSpans.length) {
              onSelectSpan(allSpans[focusedSpanIndex]);
            }
            break;
          case 'Escape':
            // Clear selection (handled by parent)
            break;
        }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [spans, focusedSpanIndex, onSelectSpan]);
    
    // Generate processed timeline data
    const timelineData = useMemo(() => {
      if (!spans.length || !trace) return null;
      
      // Find the earliest start time and latest end time
      const startTime = Math.min(...spans.map(span => span.start_time));
      const endTime = Math.max(...spans.map(span => span.end_time));
      
      // Calculate total duration for scaling
      const totalDuration = endTime - startTime;
      
      // Generate time marks (5 evenly spaced time points)
      const timeMarks = [];
      for (let i = 0; i <= 5; i++) {
        const time = startTime + (i * totalDuration / 5);
        timeMarks.push(new Date(time * 1000).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }));
      }
      
      // Generate a unique color for each span
      const spanColors: Record<string, string> = {};
      
      // Predefined vibrant colors to cycle through
      const colorPalette = [
        "#FF5733", "#33FF57", "#3357FF", "#FF33A8", "#33FFF5",
        "#FFD133", "#8C33FF", "#FF5733", "#33FFBD", "#FF3333",
        "#33FF33", "#3333FF", "#FF33FF", "#33FFFF", "#FFFF33"
      ];
      
      // Assign colors to each span - randomly but consistently based on span ID
      spans.forEach((span, index) => {
        // Use modulo to cycle through colors for more spans than colors
        const baseColor = colorPalette[index % colorPalette.length];
        
        // Slightly vary the color to make each unique
        const r = parseInt(baseColor.slice(1, 3), 16);
        const g = parseInt(baseColor.slice(3, 5), 16);
        const b = parseInt(baseColor.slice(5, 7), 16);
        
        // Apply a slight random variation to ensure uniqueness
        const variation = Math.floor(Math.random() * 30) - 15;
        const newR = Math.min(255, Math.max(0, r + variation));
        const newG = Math.min(255, Math.max(0, g + variation));
        const newB = Math.min(255, Math.max(0, b + variation));
        
        spanColors[span.span_id] = `rgb(${newR}, ${newG}, ${newB})`;
      });
      
      // Function to get color for a specific span
      const getColorForSpan = (spanId: string): string => {
        return spanColors[spanId] || "#10B981"; // Default green if not found
      };
      
      return {
        startTime,
        endTime,
        totalDuration,
        timeMarks,
        spanColors,
        getColorForSpan
      };
    }, [spans, trace]);
    
    // If no data, show loading or empty state
    if (!timelineData) {
      return (
        <div className="h-full flex items-center justify-center text-muted-foreground">
          <p>No timeline data available</p>
        </div>
      );
    }
    
    // Map spans by actor (categorized as user or agent)
    const userSpans = spans.filter(span => span.name.toLowerCase().includes("user") || span.name.toLowerCase().includes("input"));
    const agentSpans = spans.filter(span => !userSpans.includes(span));
    
    return (
      <div className="h-full flex flex-col">
        {/* Time axis */}
        <div className="flex justify-between mb-1 text-xs text-muted-foreground sticky top-0 bg-background z-10 pb-0.5" suppressHydrationWarning>
          {timelineData.timeMarks.map((mark, i) => (
            <div key={i} suppressHydrationWarning>{mark}</div>
          ))}
        </div>
        
        {/* Chart container */}
        <div className="flex-1 relative">
          {/* Scrollable content area */}
          <div className="h-full overflow-y-auto">
            {/* Grid lines and spans container */}
            <div className="relative min-h-full">
              {/* Vertical grid lines */}
              {timelineData.timeMarks.map((_, i) => (
                <div 
                  key={i} 
                  className="absolute top-0 bottom-0 border-r border-dashed border-muted-foreground/20" 
                  style={{ left: `${(i / 5) * 100}%` }}
                />
              ))}
              
              {/* Rows for user spans */}
              {userSpans.map((span, i) => {
                const isUserFocused = focusedSpanIndex === spans.indexOf(span);
                const isSelected = selectedSpanId === span.span_id;
                
                return (
                  <div 
                    key={`user-${span.span_id}`} 
                    className={`flex items-center ${isUserFocused ? 'bg-muted/30 -mx-4 px-4' : ''} mb-0.5`}
                    tabIndex={0}
                    onFocus={() => setFocusedSpanIndex(spans.indexOf(span))}
                  >
                    <div className="w-32 text-right pr-3 text-sm">user</div>
                    <div className="flex-1 relative h-5">
                      <div 
                        className={`absolute h-full rounded-sm hover:h-7 hover:-top-1 transition-all duration-75 cursor-pointer ${isSelected ? 'ring-2 ring-primary' : ''}`}
                        style={{
                          backgroundColor: timelineData.getColorForSpan(span.span_id),
                          left: `${((span.start_time - timelineData.startTime) / timelineData.totalDuration) * 100}%`,
                          width: `${(span.duration / timelineData.totalDuration) * 100}%`,
                          minWidth: "8px",
                          zIndex: 10
                        }}
                        title={`${span.name}: ${span.duration.toFixed(2)}s`}
                        onClick={() => onSelectSpan(span)}
                      />
                    </div>
                  </div>
                );
              })}
              
              {/* Rows for agent spans */}
              <div className="mt-5 space-y-0">
              {agentSpans.map((span, i) => {
                const isAgentFocused = focusedSpanIndex === spans.indexOf(span);
                const isSelected = selectedSpanId === span.span_id;
                
                return (
                  <div 
                    key={`agent-${span.span_id}`} 
                      className={`flex items-center ${isAgentFocused ? 'bg-muted/30 -mx-4 px-4' : ''} h-5 my-0 py-0 mb-3 ${i < agentSpans.length - 1 ? 'border-b border-dotted border-muted-foreground/20 pb-3' : ''}`}
                    tabIndex={0}
                    onFocus={() => setFocusedSpanIndex(spans.indexOf(span))}
                  >
                    <div className="w-32 text-right pr-3 text-sm truncate">{span.name}</div>
                      <div className="flex-1 relative h-5">
                      {/* For each agent span */}
                      <div 
                          className={`absolute h-full rounded-sm hover:h-7 hover:-top-1 transition-all duration-75 cursor-pointer ${isSelected ? 'ring-2 ring-primary' : ''}`}
                        style={{
                          backgroundColor: timelineData.getColorForSpan(span.span_id),
                          left: `${((span.start_time - timelineData.startTime) / timelineData.totalDuration) * 100}%`,
                          width: `${(span.duration / timelineData.totalDuration) * 100}%`,
                          minWidth: "8px",
                          zIndex: 10
                        }}
                        title={`${span.name}: ${span.duration.toFixed(2)}s`}
                        onClick={() => onSelectSpan(span)}
                      />
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="mt-2 flex flex-wrap gap-3 py-2 text-xs border-t">
          {/* Show span types in the legend */}
          {agentSpans.map(span => (
            span.name !== "Assistant" && 
            <div key={`legend-${span.span_id}`} className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full block" style={{ backgroundColor: timelineData.getColorForSpan(span.span_id) }}></span>
              <span className="text-xs">{span.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }