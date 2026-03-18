/** Real-time progress bar for a running evaluation (Story 3.3). */

import type { Evaluation } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FlaskConical } from "lucide-react"

interface Props {
  evaluation: Evaluation
  inferenceCount: number
}

export default function ProgressBar({ evaluation, inferenceCount }: Props) {
  if (evaluation.status !== "running" && evaluation.status !== "pending") return null

  const pct = evaluation.progress || 0
  const phase = pct <= 30 ? "Downloading & preprocessing images…" : "Running inferences…"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FlaskConical className="h-4 w-4 animate-pulse" />
          {evaluation.status === "pending" ? "Preparing…" : phase}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {pct}% · {inferenceCount} inference{inferenceCount !== 1 ? "s" : ""} completed
        </p>
      </CardContent>
    </Card>
  )
}
