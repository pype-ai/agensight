import { Loader2, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface MessageStatusProps {
  status: 'sending' | 'sent' | 'error'
  error?: string
  className?: string
}

export function MessageStatus({ status, error, className }: MessageStatusProps) {
  return (
    <span 
      className={cn(
        'inline-flex items-center gap-1 text-xs ml-2',
        {
          'text-muted-foreground': status === 'sending',
          'text-green-500': status === 'sent',
          'text-destructive': status === 'error',
        },
        className
      )}
      title={error}
    >
      {status === 'sending' && <Loader2 className="h-3 w-3 animate-spin" />}
      {status === 'sent' && <Check className="h-3 w-3" />}
      {status === 'error' && <X className="h-3 w-3" />}
      <span className="sr-only">
        {status === 'sending' ? 'Sending...' : status === 'sent' ? 'Sent' : 'Error'}
      </span>
    </span>
  )
}