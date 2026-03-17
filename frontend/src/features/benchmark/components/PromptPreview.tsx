/** Prompt template list — shows text, expected result, and bias type badges. */

import type { Prompt, Dimension } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, Plus } from "lucide-react"

const BIAS_COLORS: Record<string, string> = {
  Undersampling: "bg-amber-100 text-amber-800 border-amber-200",
  "Label Noise": "bg-sky-100 text-sky-800 border-sky-200",
}

interface Props {
  prompts: Prompt[]
  dimensions: Dimension[]
}

export default function PromptPreview({ prompts, dimensions }: Props) {
  if (prompts.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold">
          Prompt Templates
        </CardTitle>
        <button className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium">
          <Plus className="h-4 w-4" /> Add
        </button>
      </CardHeader>
      <CardContent className="space-y-2 max-h-96 overflow-y-auto">
        {prompts.map((p) => {
          const colorCls =
            BIAS_COLORS[p.bias_type] ?? "bg-gray-100 text-gray-700 border-gray-200"
          return (
            <div
              key={p.prompt_id}
              className="flex items-start justify-between gap-3 rounded-lg border p-4"
            >
              <div className="space-y-2 min-w-0">
                <p className="text-sm leading-relaxed">{p.text}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${colorCls}`}
                  >
                    {p.bias_type}
                  </span>
                  {p.expected_result && (
                    <span className="text-[11px] text-muted-foreground">
                      Expected: <span className="font-medium text-foreground/70">{p.expected_result}</span>
                    </span>
                  )}
                </div>
              </div>
              <button className="shrink-0 text-muted-foreground hover:text-destructive transition-colors mt-0.5">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
