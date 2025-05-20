'use client'

import { TracesTable } from '@/components/traces-table';
import { getAllTraces } from '@/lib/services/traces';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import React from 'react'

function Traces() {
  // Use React Query for traces
  const {
    data: tracesData,
    isLoading: tracesQueryLoading,
    error: tracesError,
    refetch: refetchTraces,
  } = useQuery({
    queryKey: ['traces'],
    queryFn: getAllTraces,

  });

  return (
    <div className="flex flex-col h-full">
      <div className="border rounded-lg flex flex-col bg-card/50 backdrop-blur-sm h-[550px] pb-0">
        {tracesQueryLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : tracesData && tracesData.length > 0 ? (
          <div className="flex-1 flex flex-col h-full">
            <TracesTable data={tracesData} />
          </div>
        ) : (
          <div className="text-center flex items-center justify-center h-full">
            <div>
              <Image
                src="/pype-logo.png"
                alt="PYPE Logo"
                width={100}
                height={100}
                className="h-12 w-20 mx-auto mb-4"
              />
              <h3 className="text-lg font-medium">No traces available</h3>
              <p className="text-muted-foreground mt-2">
                Trace data will appear here when you run experiments
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Traces