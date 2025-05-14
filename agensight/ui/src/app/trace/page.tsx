import React from "react";
import ClientOnly from "@/components/client-only";
import TraceClient from "./client";

// This is a static page that uses query parameters instead of route parameters
export default function TracePage() {
  return (
    <ClientOnly>
      <TraceClient  />
    </ClientOnly>
  );
} 