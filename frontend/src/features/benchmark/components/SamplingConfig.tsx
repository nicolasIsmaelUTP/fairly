/** Sampling & Cost Control — matches the mockup with Full/Recommended/Custom sample sizes. */

import { useBenchmarkStore } from "@/features/benchmark/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Zap } from "lucide-react"

const TOKENS_PER_IMAGE_LOW = 85
const TOKENS_PER_IMAGE_HIGH = 340

interface Props {
  promptCount: number
  totalDatasetImages?: number
}

export default function SamplingConfig({ promptCount, totalDatasetImages = 500 }: Props) {
  const {
    numImages, resolution, sampleMode, customSampleSize,
    setNumImages, setResolution, setSampleMode, setCustomSampleSize,
  } = useBenchmarkStore()

  const tokensPerImage = resolution === "high" ? TOKENS_PER_IMAGE_HIGH : TOKENS_PER_IMAGE_LOW
  const estTokens = numImages * promptCount * tokensPerImage

  const handleSampleMode = (mode: "full" | "recommended" | "custom") => {
    setSampleMode(mode)
    if (mode === "full") setNumImages(totalDatasetImages)
    else if (mode === "recommended") setNumImages(50)
    else setNumImages(customSampleSize)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Sampling &amp; Cost Control
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Sample size */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Sample Size
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleSampleMode("full")}
              className={`rounded-lg border p-3 text-center transition-colors ${
                sampleMode === "full"
                  ? "border-primary bg-primary/5 text-primary"
                  : "hover:bg-muted"
              }`}
            >
              <span className="block text-sm font-medium">Full Dataset</span>
              <span className="block text-xs text-muted-foreground">{totalDatasetImages} images</span>
            </button>
            <button
              onClick={() => handleSampleMode("recommended")}
              className={`rounded-lg border p-3 text-center transition-colors ${
                sampleMode === "recommended"
                  ? "border-primary bg-primary/5 text-primary"
                  : "hover:bg-muted"
              }`}
            >
              <span className="block text-sm font-medium">Recommended</span>
              <span className="block text-xs text-muted-foreground">Stratified 50</span>
            </button>
            <button
              onClick={() => handleSampleMode("custom")}
              className={`rounded-lg border p-3 text-center transition-colors ${
                sampleMode === "custom"
                  ? "border-primary bg-primary/5 text-primary"
                  : "hover:bg-muted"
              }`}
            >
              <span className="block text-sm font-medium">Custom</span>
              <span className="block text-xs text-muted-foreground">Set your own</span>
            </button>
          </div>
          {sampleMode === "custom" && (
            <Input
              type="number"
              min={1}
              max={totalDatasetImages}
              value={customSampleSize}
              onChange={(e) => {
                const n = Number(e.target.value)
                setCustomSampleSize(n)
                setNumImages(n)
              }}
              className="mt-2 w-32"
            />
          )}
        </div>

        {/* Image quality */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Image Quality
          </p>
          <div className="inline-flex rounded-lg border overflow-hidden">
            <button
              onClick={() => setResolution("high")}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                resolution === "high"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              High Resolution
            </button>
            <button
              onClick={() => setResolution("low")}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                resolution === "low"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Low Resolution
            </button>
          </div>
        </div>

        {/* Cost estimate */}
        {promptCount > 0 && (
          <div className="rounded-lg bg-muted/50 border border-border px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Estimated payload:{" "}
              <span className="font-mono font-semibold text-foreground">{numImages}</span>{" "}
              images @{" "}
              <span className="font-mono font-semibold text-foreground">
                {resolution === "high" ? "High" : "Low"} Res
              </span>{" "}
              ={" "}
              <span className="font-mono font-semibold text-foreground">
                {estTokens.toLocaleString()}
              </span>{" "}
              tokens
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
