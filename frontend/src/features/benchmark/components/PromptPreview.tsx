/** Dynamic prompt preview — reacts to domain + dimension switches in real-time (Story 3.1). */

import type { Prompt, Dimension } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Props {
  prompts: Prompt[]
  dimensions: Dimension[]
}

export default function PromptPreview({ prompts, dimensions }: Props) {
  if (prompts.length === 0) return null

  const dimMap = new Map(dimensions.map((d) => [d.dimension_id, d.name]))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Prompt Templates ({prompts.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-72 overflow-y-auto">
        {prompts.map((p) => (
          <div
            key={p.prompt_id}
            className="text-sm p-3 rounded-md bg-muted flex items-start gap-2"
          >
            <Badge variant="outline" className="shrink-0 text-[10px]">
              {dimMap.get(p.dimension_id) ?? "—"}
            </Badge>
            <span className="leading-relaxed">{p.text}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
