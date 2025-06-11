"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"

interface SessionInputBoxProps {
  value: string
  onChange: (val: string) => void
  onSend: () => void
  disabled?: boolean
  placeholder?: string
  isSending?: boolean
}

export function SessionInputBox({
  value,
  onChange,
  onSend,
  disabled,
  placeholder = "Type your message...",
  isSending = false,
}: SessionInputBoxProps) {
  return (
    <div className="flex items-end gap-2 w-full">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-h-[60px] max-h-[200px] resize-y bg-muted/30 text-base"
        placeholder={placeholder}
        disabled={disabled}
      />
      <Button
        onClick={onSend}
        disabled={disabled || isSending || !value.trim()}
        className="h-12 px-6 text-base font-semibold flex-shrink-0 flex items-center gap-2"
      >
        {isSending && <Loader2 className="h-4 w-4 animate-spin" />}
        {isSending ? 'Sending...' : 'Send'}
      </Button>
    </div>
  )
}
