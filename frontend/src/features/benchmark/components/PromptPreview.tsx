/** Prompt template list matching the mockup — with trash icons per prompt. */

import type { Prompt, Dimension } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, Plus } from "lucide-react"

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
      <CardContent className="space-y-2 max-h-80 overflow-y-auto">
        {prompts.map((p) => (
          <div
            key={p.prompt_id}
            className="flex items-start justify-between gap-3 rounded-lg border p-4"
          >
            <p className="text-sm leading-relaxed">{p.text}</p>
            <button className="shrink-0 text-muted-foreground hover:text-destructive transition-colors mt-0.5">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
