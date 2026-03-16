/** Bias dimension toggles — 2-column grid. Dimensions without column mappings show "No data". */

import { useQuery } from "@tanstack/react-query"
import { promptsApi } from "@/features/benchmark/api"
import { datasetsApi } from "@/features/datasets/api"
import { useBenchmarkStore } from "@/features/benchmark/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"

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
        <div className="grid grid-cols-2 gap-3">
          {dimensions.map((dim) => {
            const hasData = datasetId ? mappedDimIds.has(dim.dimension_id) : true
            return (
              <div
                key={dim.dimension_id}
                className={`flex items-center justify-between rounded-lg border p-3 ${
                  hasData ? "bg-background" : "bg-muted/50 opacity-60"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{dim.name}</span>
                  {!hasData && (
                    <span className="text-[10px] text-muted-foreground">No data</span>
                  )}
                </div>
                <Switch
                  checked={activeDims.has(dim.dimension_id)}
                  onCheckedChange={() => toggleDim(dim.dimension_id)}
                  disabled={!hasData}
                />
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
