"use client"

import { getAllSessions } from '@/lib/services/traces';
import { useQuery } from '@tanstack/react-query';
import React from 'react'

function Sessions() {
  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    error: sessionsError,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: ['config-sessions'],
    queryFn: getAllSessions,
  });

  console.log({ sessionsData });

  return (
    <div>Sessions</div>
  )
}

export default Sessions