/** Benchmark Constructor page — thin wrapper over feature components. */

import { useQuery } from "@tanstack/react-query"
import { promptsApi } from "@/features/benchmark/api"
import { useBenchmarkStore } from "@/features/benchmark/store"
import EntitySelector from "@/features/benchmark/components/EntitySelector"
import DimensionToggles from "@/features/benchmark/components/DimensionToggles"
import SamplingConfig from "@/features/benchmark/components/SamplingConfig"
import PromptPreview from "@/features/benchmark/components/PromptPreview"
import RunBenchmarkButton from "@/features/benchmark/components/RunBenchmarkButton"

export default function BenchmarkPage() {
  const { domainId, activeDims } = useBenchmarkStore()

  /* Reactively fetch & filter prompts (Story 3.1). */
  const { data: allPrompts = [] } = useQuery({
    queryKey: ["prompts", domainId],
    queryFn: () => promptsApi.list({ domain_id: domainId ?? undefined }),
    enabled: !!domainId,
  })

  const { data: dimensions = [] } = useQuery({
    queryKey: ["dimensions"],
    queryFn: promptsApi.dimensions,
  })

  const visiblePrompts = allPrompts.filter((p) => activeDims.has(p.dimension_id))

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold">Benchmark Constructor</h2>
        <p className="text-muted-foreground">
          Configure and launch a bias evaluation.
        </p>
      </div>

      <EntitySelector />
      <DimensionToggles />
      <SamplingConfig promptCount={visiblePrompts.length} />
      <PromptPreview prompts={visiblePrompts} dimensions={dimensions} />
      <RunBenchmarkButton />
    </div>
  )
}
