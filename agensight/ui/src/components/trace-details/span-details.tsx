"use client";

import React from "react";
import { IconMessageCircle, IconMessageDots, IconRobot, IconUser } from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { Span } from "@/types/type";

export interface SpanDetailsProps {
  span: Span;
  isLoading: boolean;
}

export const SpanDetailsView: React.FC<SpanDetailsProps> = ({
  span,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 mb-8">
      {/* Input/Prompt section */}
      <div>
        <div className="flex items-center gap-2 mb-2 pb-2 border-b">
          <IconMessageCircle size={16} />
          <h3 className="text-base text-white font-medium">Input</h3>
        </div>
        {span.details?.prompts && span.details.prompts.length > 0 ? (
          <div className="space-y-4">
            {span.details.prompts.map((prompt, index) => (
              <div key={index} className="border rounded-md">
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b">
                  <div className="h-6 w-6 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                    <IconUser size={14} />
                  </div>
                  <span className="text-sm font-medium">User</span>
                </div>
                <div className="border-t">
                  <div>
                    <div className="w-full">
                      <iframe
                        id={`prompt-${prompt.id || index}`}
                        srcDoc={`
                          <!DOCTYPE html>
                          <html>
                            <head>
                              <style>
                                body {
                                  margin: 0;
                                  padding: 12px;
                                  font-family: monospace;
                                  font-size: 12px;
                                  white-space: pre-wrap;
                                  overflow-y: auto;
                                  color:white;
                                  box-sizing: border-box;
                                }
                                html, body {
                                  height: auto;
                                }
                              </style>
                              <script>
                                window.onload = function() {
                                  sendHeight();
                                  
                                  // Set up a resize observer to handle dynamic content changes
                                  if (window.ResizeObserver) {
                                    const resizeObserver = new ResizeObserver(() => {
                                      sendHeight();
                                    });
                                    resizeObserver.observe(document.body);
                                  }
                                  
                                  function sendHeight() {
                                    window.parent.postMessage({
                                      type: 'resize-iframe',
                                      iframeId: '${`prompt-${prompt.id || index}`}',
                                      height: document.body.scrollHeight
                                    }, '*');
                                  }
                                };
                              </script>
                            </head>
                            <body>${prompt.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</body>
                          </html>
                        `}
                        style={{width: "100%", border: "none"}}
                        className="min-h-[100px]"
                        title="Prompt content"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No input data available.</p>
        )}
      </div>
      
      {/* Output/Completion section */}
      <div>
        <div className="flex items-center gap-2 mb-2 pb-2 border-b">
          <IconMessageDots size={16} />
          <h3 className="text-base font-medium">Output</h3>
        </div>
        {span.details?.completions && span.details.completions.length > 0 ? (
          <div className="space-y-4">
            {span.details.completions.map((completion, index) => (
              <div key={index} className="border rounded-md">
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b">
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <IconRobot size={14} />
                  </div>
                  <span className="text-sm font-medium">Assistant</span>
                </div>
                <div className="border-t">
                  <div>
                    <div className="w-full">
                      <iframe
                        id={`completion-${completion.id || index}`}
                        srcDoc={`
                          <!DOCTYPE html>
                          <html>
                            <head>
                              <style>
                                body {
                                  margin: 0;
                                  padding: 12px;
                                  font-family: monospace;
                                  font-size: 12px;
                                  white-space: pre-wrap;
                                  overflow-y: auto;
                                  color:white;
                                  box-sizing: border-box;
                                }
                                html, body {
                                  height: auto;
                                }
                              </style>
                              <script>
                                window.onload = function() {
                                  sendHeight();
                                  
                                  // Set up a resize observer to handle dynamic content changes
                                  if (window.ResizeObserver) {
                                    const resizeObserver = new ResizeObserver(() => {
                                      sendHeight();
                                    });
                                    resizeObserver.observe(document.body);
                                  }
                                  
                                  function sendHeight() {
                                    window.parent.postMessage({
                                      type: 'resize-iframe',
                                      iframeId: '${`completion-${completion.id || index}`}',
                                      height: document.body.scrollHeight
                                    }, '*');
                                  }
                                };
                              </script>
                            </head>
                            <body>${completion.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</body>
                          </html>
                        `}
                        style={{width: "100%", border: "none"}}
                        className="min-h-[100px]"
                        title="Completion content"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-2 pb-2 border-b">
              <IconMessageCircle size={16} />
              <h3 className="text-base font-medium">Final Completion</h3>
            </div>
            <div className="border rounded-md">
              <div className="border-t">
                <div>
                  <div className="w-full">
                    <iframe
                      id={`final-completion`}
                      srcDoc={`
                        <!DOCTYPE html>
                        <html>
                          <head>
                            <style>
                              body {
                                margin: 0;
                                padding: 12px;
                                font-family: monospace;
                                font-size: 12px;
                                white-space: pre-wrap;
                                overflow-y: auto;
                                box-sizing: border-box;
                                background-color: #f1f5f9;
                              }
                              @media (prefers-color-scheme: dark) {
                                body {
                                  background-color: #1e293b;
                                  color: #f8fafc;
                                }
                              }
                            </style>
                            <script>
                              window.onload = function() {
                                sendHeight();
                                
                                // Set up a resize observer to handle dynamic content changes
                                if (window.ResizeObserver) {
                                  const resizeObserver = new ResizeObserver(() => {
                                    sendHeight();
                                  });
                                  resizeObserver.observe(document.body);
                                }
                                
                                function sendHeight() {
                                  window.parent.postMessage({
                                    type: 'resize-iframe',
                                    iframeId: '${`final-completion`}',
                                    height: document.body.scrollHeight
                                  }, '*');
                                }
                              };
                            </script>
                          </head>
                          <body>${(span?.final_completion || "No completion data available.").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</body>
                        </html>
                      `}
                      style={{width: "100%", border: "none"}}
                      className="min-h-[100px]"
                      title="Final completion content"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpanDetailsView; 