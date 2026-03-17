/** Benchmark Constructor — two-column layout matching the design mockup. */

import { useQuery } from "@tanstack/react-query"
import { promptsApi } from "@/features/benchmark/api"
import { datasetsApi } from "@/features/datasets/api"
import { useBenchmarkStore } from "@/features/benchmark/store"
import UseCasePicker from "@/features/benchmark/components/UseCasePicker"
import DimensionToggles from "@/features/benchmark/components/DimensionToggles"
import SamplingConfig from "@/features/benchmark/components/SamplingConfig"
import PromptPreview from "@/features/benchmark/components/PromptPreview"
import BenchmarkSummary from "@/features/benchmark/components/BenchmarkSummary"
import EntitySelector from "@/features/benchmark/components/EntitySelector"

export default function BenchmarkPage() {
  const { domainId, datasetId, activeDims } = useBenchmarkStore()

  const { data: allPrompts = [] } = useQuery({
    queryKey: ["prompts", domainId],
    queryFn: () => promptsApi.list({ domain_id: domainId ?? undefined }),
    enabled: !!domainId,
  })

  const { data: dimensions = [] } = useQuery({
    queryKey: ["dimensions"],
    queryFn: promptsApi.dimensions,
  })

  const visiblePrompts = allPrompts.filter((p) =>
    p.dimension_ids.some((id) => activeDims.has(id)),
  )

  return (
    <div className="flex gap-6 items-start">
      {/* Left — main content */}
      <div className="flex-1 space-y-6 min-w-0">
        <div>
          <h2 className="text-2xl font-bold">Benchmark Constructor</h2>
          <p className="text-muted-foreground">
            Configure and launch bias evaluations
          </p>
        </div>

        <UseCasePicker />
        <DimensionToggles />
        <PromptPreview prompts={visiblePrompts} dimensions={dimensions} />
      </div>

      {/* Right — sticky summary sidebar */}
      <div className="w-80 shrink-0 hidden lg:block sticky top-6 space-y-6">
        <BenchmarkSummary promptCount={visiblePrompts.length} />
        <SamplingConfig promptCount={visiblePrompts.length} />
      </div>
    </div>
  )
}
