"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type SliderValue = number[]
import { ModelConfig, OPENAI_MODELS } from "@/lib/models"

interface SettingsPanelProps {
  config: ModelConfig
  onConfigChange: (config: ModelConfig) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsPanel({ config, onConfigChange, open, onOpenChange }: SettingsPanelProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Model Settings</DialogTitle>
          <DialogDescription>
            Configure the model parameters for this session.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="model">Model</Label>
            <select
              id="model"
              value={config.model}
              onChange={(e) => onConfigChange({ ...config, model: e.target.value })}
              className="w-full p-2 mt-1 border rounded bg-background text-foreground"
            >
              {OPENAI_MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center">
              <Label htmlFor="temperature">Temperature: {config.temperature}</Label>
              <span className="text-xs text-muted-foreground">0.0 - 2.0</span>
            </div>
            <Slider
              id="temperature"
              min={0}
              max={2}
              step={0.1}
              value={[config.temperature]}
              onValueChange={(value: number[]) => onConfigChange({ ...config, temperature: value[0] })}
              className="mt-2"
            />
          </div>

          <div>
            <div className="flex justify-between items-center">
              <Label htmlFor="max_tokens">Max Tokens</Label>
              <Input
                id="max_tokens"
                type="number"
                min={1}
                max={4096}
                value={config.max_tokens}
                onChange={(e) =>
                  onConfigChange({ ...config, max_tokens: Number(e.target.value) })
                }
                className="w-20 h-8 text-right"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center">
              <Label htmlFor="top_p">Top P: {config.top_p}</Label>
              <span className="text-xs text-muted-foreground">0.0 - 1.0</span>
            </div>
            <Slider
              id="top_p"
              min={0}
              max={1}
              step={0.1}
              value={[config.top_p]}
              onValueChange={(value: number[]) => onConfigChange({ ...config, top_p: value[0] })}
              className="mt-2"
            />
          </div>

          <div>
            <div className="flex justify-between items-center">
              <Label htmlFor="frequency_penalty">Frequency Penalty: {config.frequency_penalty}</Label>
              <span className="text-xs text-muted-foreground">-2.0 - 2.0</span>
            </div>
            <Slider
              id="frequency_penalty"
              min={-2}
              max={2}
              step={0.1}
              value={[config.frequency_penalty]}
              onValueChange={(value: number[]) => onConfigChange({ ...config, frequency_penalty: value[0] })}
              className="mt-2"
            />
          </div>

          <div>
            <div className="flex justify-between items-center">
              <Label htmlFor="presence_penalty">Presence Penalty: {config.presence_penalty}</Label>
              <span className="text-xs text-muted-foreground">-2.0 - 2.0</span>
            </div>
            <Slider
              id="presence_penalty"
              min={-2}
              max={2}
              step={0.1}
              value={[config.presence_penalty]}
              onValueChange={(value: number[]) => onConfigChange({ ...config, presence_penalty: value[0] })}
              className="mt-2"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
