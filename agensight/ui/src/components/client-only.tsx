'use client';

import { useEffect, useState, ReactNode } from 'react';

interface ClientOnlyProps {
  children: ReactNode;
}

/**
 * ClientOnly component that only renders its children on the client side
 * This prevents hydration mismatches for components that depend on client-side data
 */
export default function ClientOnly({ children }: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false);
  
  useEffect(() => {
    setHasMounted(true);
  }, []);
  
  // During server-side rendering and initial client render, render a placeholder
  if (!hasMounted) {
    return <div className="min-h-screen w-full flex items-center justify-center">
      <div className="animate-pulse text-gray-400">Loading...</div>
    </div>;
  }
  
  // After the component has mounted on the client, render the children
  return <>{children}</>;
} 