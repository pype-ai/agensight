"use client"

import React from 'react'

import { useState } from 'react';

// Mock conversation data format
const initialConversation = [
  { id: 1, type: 'input', text: 'Hi, how can I help you?' },
  { id: 2, type: 'output', text: 'I want to know more about your product.' },
  { id: 3, type: 'input', text: 'Sure! What would you like to know?' },
  { id: 4, type: 'output', text: 'Pricing and features.' },
];

function SessionReplay() {
  // Mock traces data for the new UI structure
  const [allTraceDetails, setAllTraceDetails] = useState([
    {
      id: 'trace-1',
      trace_output: 'ass: Hi, how can I help you?',
      trace_input: 'use: I want to know more about your product.'
    },
    {
      id: 'trace-2',
      trace_output: 'ass: Sure! What would you like to know?',
      trace_input: 'use: Pricing and features.'
    },
    {
      id: 'trace-3',
      trace_output: 'ass: sadasdnsow?',
      trace_input: 'use: asdasdsads.'
    },
  ]);

  // Remove a trace and all below
  const handleRemove = (idx: number) => {
    setAllTraceDetails(allTraceDetails.slice(0, idx));
  };

  // Add new trace at the bottom (mock for now)
  const [input, setInput] = useState('');
  const handleSend = () => {
    if (!input.trim()) return;
    setAllTraceDetails([
      ...allTraceDetails,
      {
        id: `trace-${allTraceDetails.length + 1}`,
        trace_input: `User: ${input}`,
        trace_output: 'Assistant: ...',
      },
    ]);
    setInput('');
  };

  return (
    <div className="bg-slate-900 min-h-screen w-full flex flex-col">
      <div className="flex-1 min-h-0">
        <div className="flex flex-col gap-6 h-full overflow-y-auto p-4">
          {allTraceDetails.length > 0 ? (
            allTraceDetails.map((trace, idx) => (
              <div key={trace.id} className="flex flex-col gap-2">
                {/* Trace ID clickable */}
                <div className="flex items-center mb-1">
                  <button
                    className="text-xs text-slate-500 hover:text-slate-300 font-mono underline underline-offset-2 cursor-pointer transition-colors"
                    title="Click to log full trace details"
                    onClick={() => console.log(trace)}
                  >
                    Trace ID: {trace.id}
                  </button>
                  <button
                    className="ml-2 px-2 py-0.5 bg-red-500 text-white rounded text-xs hover:bg-red-700"
                    onClick={() => handleRemove(idx)}
                    title="Remove this and all below"
                  >
                    ×
                  </button>
                </div>
                {/* Input bubble */}
                <div className="flex justify-end">
                  <div className="bg-slate-800 px-4 py-2 rounded-lg max-w-2xl text-sm font-mono text-left shadow-sm border border-slate-700">
                    <span className="block text-slate-400 text-xs mb-1">Input</span>
                    <span className="whitespace-pre-line break-words">{trace.trace_input || 'N/A'}</span>
                  </div>
                </div>
                {/* Output bubble */}
                <div className="flex">
                  <div className="bg-slate-700 px-4 py-2 rounded-lg max-w-2xl text-sm font-mono text-right shadow-sm border border-slate-600">
                    <span className="block text-slate-400 text-xs mb-1">Output</span>
                    <span className="whitespace-pre-line break-words">{trace.trace_output || 'N/A'}</span>
                  </div>
                </div>
                {/* Subtle trace end indicator */}
                <div className="flex justify-center mt-2"></div>
                {idx !== allTraceDetails.length - 1 && (
                  <div className="border-t border-dashed border-slate-800 my-2" />
                )}
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center h-full w-full">
              <span className="text-slate-400">No traces available for this session.</span>
            </div>
          )}
        </div>
      </div>
      {/* Input at the bottom */}
      <div className="flex gap-2 p-4 border-t border-slate-800 bg-slate-900">
        <input
          className="flex-1 px-3 py-2 border border-slate-700 rounded shadow-sm focus:outline-none focus:ring bg-slate-800 text-white font-mono"
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type your message..."
          onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
        />
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={handleSend}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default SessionReplay