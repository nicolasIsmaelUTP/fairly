/** Real-time progress bar for a running evaluation (Story 3.3). */

import type { Evaluation, Inference } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FlaskConical } from "lucide-react"

interface Props {
  evaluation: Evaluation
  inferenceCount: number
}

export default function ProgressBar({ evaluation, inferenceCount }: Props) {
  if (evaluation.status !== "running" && evaluation.status !== "pending") return null

  const expectedTotal = evaluation.num_images // approximate: real total = images × prompts
  const pct = expectedTotal > 0 ? Math.min((inferenceCount / expectedTotal) * 100, 100) : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FlaskConical className="h-4 w-4 animate-pulse" />
          {evaluation.status === "pending" ? "Preparing…" : "Running benchmark…"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Processing: {inferenceCount} inference{inferenceCount !== 1 ? "s" : ""} completed
        </p>
      </CardContent>
    </Card>
  )
}
