/** Sampling & Cost Control — dynamic recommended sampling, Original/Optimized quality. */

import { useEffect } from "react"
import { useBenchmarkStore } from "@/features/benchmark/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Zap, Info } from "lucide-react"

const TOKENS_PER_IMAGE_ORIGINAL = 340
const TOKENS_PER_IMAGE_OPTIMIZED = 85

interface Props {
  promptCount: number
  totalDatasetImages?: number
  recommendedN?: number
}

export default function SamplingConfig({ promptCount, totalDatasetImages = 500, recommendedN = 50 }: Props) {
  const {
    numImages, resolution, sampleMode, customSampleSize,
    setNumImages, setResolution, setSampleMode, setCustomSampleSize,
  } = useBenchmarkStore()

  // Auto-sync numImages when sampleMode is "recommended" and recommendedN changes
  useEffect(() => {
    if (sampleMode === "recommended") setNumImages(recommendedN)
  }, [sampleMode, recommendedN, setNumImages])

  const tokensPerImage = resolution === "original" ? TOKENS_PER_IMAGE_ORIGINAL : TOKENS_PER_IMAGE_OPTIMIZED
  const estTokens = numImages * promptCount * tokensPerImage

  const handleSampleMode = (mode: "full" | "recommended" | "custom") => {
    setSampleMode(mode)
    if (mode === "full") setNumImages(totalDatasetImages)
    else if (mode === "recommended") setNumImages(recommendedN)
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
          <div className="space-y-2">
            <button
              onClick={() => handleSampleMode("full")}
              className={`w-full rounded-lg border p-3 text-center transition-colors ${
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
              className={`w-full rounded-lg border p-3 text-center transition-colors ${
                sampleMode === "recommended"
                  ? "border-primary bg-primary/5 text-primary"
                  : "hover:bg-muted"
              }`}
            >
              <span className="block text-sm font-medium">Recommended</span>
              <span className="block text-xs text-muted-foreground">Stratified {recommendedN}</span>
            </button>
            <button
              onClick={() => handleSampleMode("custom")}
              className={`w-full rounded-lg border p-3 text-center transition-colors ${
                sampleMode === "custom"
                  ? "border-primary bg-primary/5 text-primary"
                  : "hover:bg-muted"
              }`}
            >
              <span className="block text-sm font-medium">Custom</span>
              <span className="block text-xs text-muted-foreground">Set your own</span>
            </button>
          </div>
          {sampleMode === "recommended" && (
            <div className="flex items-start gap-1.5 mt-2">
              <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground">
                C<sub>max</sub> × 5 = <span className="font-medium">{recommendedN}</span> images — minimum for statistically valid bias detection across your active dimensions.
              </p>
            </div>
          )}
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
              className="mt-2 w-full"
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
              onClick={() => setResolution("original")}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                resolution === "original"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Original
            </button>
            <button
              onClick={() => setResolution("optimized")}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                resolution === "optimized"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Optimized
            </button>
          </div>
          {resolution === "optimized" && (
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Images resized to minimum viable resolution — reduces token cost without compromising bias detection.
            </p>
          )}
        </div>

        {/* Cost estimate */}
        {promptCount > 0 && (
          <div className="rounded-lg bg-muted/50 border border-border px-3 py-2">
            <p className="text-xs text-muted-foreground">
              Est. payload:{" "}
              <span className="font-mono font-semibold text-foreground">{numImages}</span>{" "}
              imgs @{" "}
              <span className="font-mono font-semibold text-foreground">
                {resolution === "original" ? "Original" : "Optimized"}
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
