"use client"

import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { NumberField } from "@/components/number-field"
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
          <NumberField
            value={layer.velocity}
            onCommit={(v) => onUpdate(layer.id, { velocity: v })}
            min={500}
            max={8000}
            aria-label={`层 ${index + 1} 速度`}
            className="h-8 text-sm"
          />
          <NumberField
            value={layer.density}
            onCommit={(v) => onUpdate(layer.id, { density: v })}
            min={1000}
            max={4000}
            aria-label={`层 ${index + 1} 密度`}
            className="h-8 text-sm"
          />
          {index === layers.length - 1 ? (
            // 最底层是半空间：没有下界面，厚度不参与计算
            <span className="text-xs text-muted-foreground px-2" title="最底层为半空间，厚度不参与计算">
              半空间
            </span>
          ) : (
            <NumberField
              value={layer.thickness}
              onCommit={(v) => onUpdate(layer.id, { thickness: v })}
              min={1}
              max={1000}
              aria-label={`层 ${index + 1} 厚度`}
              className="h-8 text-sm"
            />
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onRemove(layer.id)}
            disabled={layers.length <= 2}
            aria-label={`删除层 ${index + 1}`}
            className="h-8 w-8"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  )
}
