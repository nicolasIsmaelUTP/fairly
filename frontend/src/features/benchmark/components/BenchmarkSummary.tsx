/** Sticky Benchmark Summary panel — right sidebar of the benchmark page. */

import { useQuery } from "@tanstack/react-query"
import { modelsApi } from "@/features/models/api"
import { datasetsApi } from "@/features/datasets/api"
import { promptsApi } from "@/features/benchmark/api"
import { useBenchmarkStore } from "@/features/benchmark/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import RunBenchmarkButton from "./RunBenchmarkButton"
import { FlaskConical } from "lucide-react"

interface Props {
  promptCount: number
}

export default function BenchmarkSummary({ promptCount }: Props) {
  const {
    modelId, datasetId, setModelId, setDatasetId, domainId, activeDims, numImages,
  } = useBenchmarkStore()

  const { data: models = [] } = useQuery({
    queryKey: ["models"],
    queryFn: modelsApi.list,
  })

  const { data: datasets = [] } = useQuery({
    queryKey: ["datasets"],
    queryFn: datasetsApi.list,
  })

  const { data: domains = [] } = useQuery({
    queryKey: ["domains"],
    queryFn: promptsApi.domains,
  })

  const domainName = domains.find((d) => d.domain_id === domainId)?.name ?? "—"
  const TOKENS_PER_IMAGE = 85
  const estTokens = numImages * promptCount * TOKENS_PER_IMAGE

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-primary" />
          Benchmark Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Model selector */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Model
          </p>
          <Select
            value={modelId ? String(modelId) : ""}
            onValueChange={(v) => { if (v) setModelId(Number(v)) }}
          >
            <SelectTrigger>
              <span className="flex flex-1 text-left truncate text-sm">
                {models.find((m) => m.model_id === modelId)?.name ?? "Select model"}
              </span>
            </SelectTrigger>
            <SelectContent>
              {models.map((m) => (
                <SelectItem key={m.model_id} value={String(m.model_id)}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Dataset selector */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Dataset
          </p>
          <Select
            value={datasetId ? String(datasetId) : ""}
            onValueChange={(v) => { if (v) setDatasetId(Number(v)) }}
          >
            <SelectTrigger>
              <span className="flex flex-1 text-left truncate text-sm">
                {datasets.find((d) => d.dataset_id === datasetId)?.name ?? "Select dataset"}
              </span>
            </SelectTrigger>
            <SelectContent>
              {datasets.map((d) => (
                <SelectItem key={d.dataset_id} value={String(d.dataset_id)}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Stats */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Use case</span>
            <span className="font-medium">{domainName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Prompts</span>
            <span className="font-medium">{promptCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Active biases</span>
            <span className="font-medium">{activeDims.size}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sample</span>
            <span className="font-medium">{numImages} imgs</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Est. tokens</span>
            <span className="font-medium">{estTokens.toLocaleString()}</span>
          </div>
        </div>

        <RunBenchmarkButton />
      </CardContent>
    </Card>
  )
}
