/** Entity selector (Model + Dataset) for the Benchmark Constructor. */

import { useQuery } from "@tanstack/react-query"
import { modelsApi } from "@/features/models/api"
import { datasetsApi } from "@/features/datasets/api"
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

export default function EntitySelector() {
  const { modelId, datasetId, setModelId, setDatasetId } = useBenchmarkStore()

  const { data: models = [] } = useQuery({
    queryKey: ["models"],
    queryFn: modelsApi.list,
  })

  const { data: datasets = [] } = useQuery({
    queryKey: ["datasets"],
    queryFn: datasetsApi.list,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">1. Select Entities</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Model</Label>
          <Select
            value={modelId ? String(modelId) : ""}
            onValueChange={(v) => { if (v) setModelId(Number(v)) }}
          >
            <SelectTrigger><SelectValue placeholder="Choose a model" /></SelectTrigger>
            <SelectContent>
              {models.map((m) => (
                <SelectItem key={m.model_id} value={String(m.model_id)}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Dataset</Label>
          <Select
            value={datasetId ? String(datasetId) : ""}
            onValueChange={(v) => { if (v) setDatasetId(Number(v)) }}
          >
            <SelectTrigger><SelectValue placeholder="Choose a dataset" /></SelectTrigger>
            <SelectContent>
              {datasets.map((d) => (
                <SelectItem key={d.dataset_id} value={String(d.dataset_id)}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
