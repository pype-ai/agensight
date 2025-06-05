'use client'

import { Suspense } from 'react'
import SessionReplay from '../session-replay'

function SessionReplayLoading() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
      <span className="ml-2">Loading session replay...</span>
    </div>
  )
}

export default function SessionReplayWrapper() {
  return (
    <Suspense fallback={<SessionReplayLoading />}>
      <SessionReplay />
    </Suspense>
  )
}