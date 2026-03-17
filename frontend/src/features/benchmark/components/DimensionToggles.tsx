/** Bias dimension toggles — compact chip layout. Dimensions without column mappings show "No data". */

import { useQuery } from "@tanstack/react-query"
import { promptsApi } from "@/features/benchmark/api"
import { datasetsApi } from "@/features/datasets/api"
import { useBenchmarkStore } from "@/features/benchmark/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DimensionToggles() {
  const { datasetId, activeDims, toggleDim } = useBenchmarkStore()

  const { data: dimensions = [] } = useQuery({
    queryKey: ["dimensions"],
    queryFn: promptsApi.dimensions,
  })

  const { data: columns = [] } = useQuery({
    queryKey: ["columns", datasetId],
    queryFn: () => datasetsApi.listColumns(datasetId!),
    enabled: !!datasetId,
  })

  const mappedDimIds = new Set(columns.map((c) => c.dimension_id))

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Bias Dimensions</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Based on metadata mapped in your connected dataset
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {dimensions.map((dim) => {
            const hasData = datasetId ? mappedDimIds.has(dim.dimension_id) : true
            const isActive = activeDims.has(dim.dimension_id)
            return (
              <button
                key={dim.dimension_id}
                onClick={() => hasData && toggleDim(dim.dimension_id)}
                disabled={!hasData}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : hasData
                      ? "bg-background text-foreground border-border hover:bg-muted"
                      : "bg-muted/40 text-muted-foreground border-transparent cursor-not-allowed"
                }`}
              >
                {dim.name}
                {!hasData && (
                  <span className="text-[9px] opacity-60">No data</span>
                )}
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
