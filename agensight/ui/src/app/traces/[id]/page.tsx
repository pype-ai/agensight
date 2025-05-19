"use client";

import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import TraceDetailPage from "@/components/trace-details/trace-detail-page";

export default function TracePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get query parameters
  const name = searchParams.get("name") || "Unknown";
  const latency = parseFloat(searchParams.get("latency") || "0");
  const total_tokens = parseInt(searchParams.get("total_tokens") || "0");

  return (
    <TraceDetailPage 
      id={params.id}
      name={name}
      latency={latency} 
      router={router}
      total_tokens={total_tokens}
    />
  );
} 