"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import type { Layer } from "@/components/synthetic-seismogram"

interface LayerModelProps {
  layers: Layer[]
  onUpdate: (id: string, updates: Partial<Layer>) => void
  onRemove: (id: string) => void
}

export function LayerModel({ layers, onUpdate, onRemove }: LayerModelProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground">
        <span>速度 (m/s)</span>
        <span>密度 (kg/m³)</span>
        <span>厚度 (m)</span>
        <span></span>
      </div>
      {layers.map((layer, index) => (
        <div key={layer.id} className="grid grid-cols-4 gap-2 items-center">
          <Input
            type="number"
            value={layer.velocity}
            onChange={(e) => onUpdate(layer.id, { velocity: Number(e.target.value) })}
            min={500}
            max={8000}
            className="h-8 text-sm"
          />
          <Input
            type="number"
            value={layer.density}
            onChange={(e) => onUpdate(layer.id, { density: Number(e.target.value) })}
            min={1000}
            max={4000}
            className="h-8 text-sm"
          />
          <Input
            type="number"
            value={layer.thickness}
            onChange={(e) => onUpdate(layer.id, { thickness: Number(e.target.value) })}
            min={10}
            max={1000}
            className="h-8 text-sm"
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onRemove(layer.id)}
            disabled={layers.length <= 2}
            className="h-8 w-8"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  )
}
