"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { cn } from "@/lib/utils"

const TooltipProvider = ({
  delayDuration = 150,
  skipDelayDuration = 100,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) => (
  <TooltipPrimitive.Provider
    delayDuration={delayDuration}
    skipDelayDuration={skipDelayDuration}
    {...props}
  />
)

TooltipProvider.displayName = "TooltipProvider"

const Tooltip = ({
  delayDuration = 150,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) => (
  <TooltipPrimitive.Root delayDuration={delayDuration} {...props} />
)

Tooltip.displayName = "Tooltip"

const TooltipTrigger = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TooltipPrimitive.Trigger
    ref={ref}
    className={cn("outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)}
    {...props}
  />
))
TooltipTrigger.displayName = TooltipPrimitive.Trigger.displayName

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, side = "top", children, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      side={side}
      sideOffset={4}
      className={cn(
        "z-50 max-w-xs rounded border bg-popover px-2.5 py-1 text-xs leading-tight text-popover-foreground shadow-sm",
        "animate-in fade-in-50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        "data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1",
        "data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1",
        className
      )}
      {...props}
    >
      {children}
      <TooltipPrimitive.Arrow className="fill-popover" width={8} height={4} />
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
))

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
