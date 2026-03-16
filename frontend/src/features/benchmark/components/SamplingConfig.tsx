/** Sampling config + cost estimation (Story 3.2). */

import { useBenchmarkStore } from "@/features/benchmark/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlertTriangle, Calculator } from "lucide-react"
import type { Prompt } from "@/types"

interface Props {
  promptCount: number
}

export default function SamplingConfig({ promptCount }: Props) {
  const { numImages, resolution, setNumImages, setResolution } =
    useBenchmarkStore()

  const totalInferences = numImages * promptCount

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">4. Sampling &amp; Cost</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Number of Images</Label>
          <Select
            value={String(numImages)}
            onValueChange={(v) => { if (v) setNumImages(Number(v)) }}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 (Quick test)</SelectItem>
              <SelectItem value="50">50 (Recommended)</SelectItem>
              <SelectItem value="200">200</SelectItem>
              <SelectItem value="1000">1,000</SelectItem>
              <SelectItem value="10000">10,000 (Full)</SelectItem>
            </SelectContent>
          </Select>
          {numImages >= 1000 && (
            <div className="flex items-center gap-2 mt-2 text-orange-600 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Large sample sizes consume many tokens and may take a long time.
            </div>
          )}
        </div>

        <div>
          <Label>Image Resolution</Label>
          <Select
            value={resolution}
            onValueChange={(v) => { if (v) setResolution(v) }}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low (recommended)</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
          {resolution === "high" && (
            <div className="flex items-center gap-2 mt-2 text-orange-600 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              High resolution increases API costs significantly.
            </div>
          )}
        </div>

        {/* Cost estimation (Story 3.2) */}
        {promptCount > 0 && (
          <div className="rounded-lg bg-muted p-4 space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calculator className="h-4 w-4" />
              Inference Estimate
            </div>
            <p className="text-xs text-muted-foreground">
              {numImages} images × {promptCount} prompts ={" "}
              <span className="font-semibold text-foreground">{totalInferences}</span>{" "}
              total inferences
            </p>
            {totalInferences > 500 && (
              <p className="text-xs text-orange-600">
                ⚠ This may take a while depending on the model's response time.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
