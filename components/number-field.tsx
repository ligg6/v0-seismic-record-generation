"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface NumberFieldProps {
  value: number
  onCommit: (value: number) => void
  min: number
  max: number
  step?: number
  className?: string
  "aria-label"?: string
}

const parse = (text: string) => (text.trim() === "" ? Number.NaN : Number(text))

/**
 * 数字输入框：编辑过程中允许临时为空或超出范围（如删掉 "1" 准备输入 "0.5"），
 * 只有有限且在 [min, max] 内的值才提交给计算；非法时标红，失焦后恢复为当前有效值
 */
export function NumberField({ value, onCommit, min, max, step, className, ...rest }: NumberFieldProps) {
  const [draft, setDraft] = useState(String(value))

  // 外部值变化（如"重置"）时同步；正在输入的等值文本（如 "1.0"）保持不动
  useEffect(() => {
    setDraft((d) => (parse(d) === value ? d : String(value)))
  }, [value])

  const parsed = parse(draft)
  const valid = Number.isFinite(parsed) && parsed >= min && parsed <= max

  return (
    <Input
      type="number"
      inputMode="decimal"
      value={draft}
      min={min}
      max={max}
      step={step}
      aria-invalid={!valid}
      title={valid ? undefined : `请输入 ${min} – ${max} 之间的数值`}
      onChange={(e) => {
        const text = e.target.value
        setDraft(text)
        const v = parse(text)
        if (Number.isFinite(v) && v >= min && v <= max) onCommit(v)
      }}
      onBlur={() => setDraft(String(value))}
      className={cn(className, !valid && "border-destructive focus-visible:ring-destructive/40")}
      {...rest}
    />
  )
}
