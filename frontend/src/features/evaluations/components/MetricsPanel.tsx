/** Dimension analysis panel: cross-dimensional distribution charts per prompt. */

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type { PromptDistribution, NumericBoxData } from "@/types"
import { evaluationsApi } from "@/features/evaluations/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts"
import { BarChart3, Layers, ThumbsUp, ThumbsDown } from "lucide-react"

const COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6",
  "#ef4444", "#8b5cf6", "#14b8a6", "#f97316", "#06b6d4",
  "#84cc16", "#e11d48", "#a855f7", "#0ea5e9",
]

interface Props {
  evaluationId: number
  onAudit?: (inferenceId: number, status: string) => void
  onDimensionChange?: (hasDimension: boolean) => void
}

export default function MetricsPanel({ evaluationId, onAudit, onDimensionChange }: Props) {
  const [selectedDimension, setSelectedDimension] = useState<string>("")
  const [detailPromptId, setDetailPromptId] = useState<number | null>(null)

  const { data: dimensions = [] } = useQuery({
    queryKey: ["dimensions", evaluationId],
    queryFn: () => evaluationsApi.dimensions(evaluationId),
  })

  const dimensionId = selectedDimension ? Number(selectedDimension) : null
  const selectedDimensionName = dimensions.find(
    (d) => String(d.dimension_id) === selectedDimension
  )?.name

  const { data: charts = [], isLoading } = useQuery({
    queryKey: ["analysis", evaluationId, dimensionId],
    queryFn: () => evaluationsApi.analysis(evaluationId, dimensionId!),
    enabled: dimensionId !== null,
  })

  const { data: allInferences = [] } = useQuery({
    queryKey: ["inferences", evaluationId],
    queryFn: () => evaluationsApi.inferences(evaluationId),
  })

  const detailChart = charts.find((c) => c.prompt_id === detailPromptId)
  const detailInferences = allInferences.filter(
    (inf) => inf.prompt_id === detailPromptId
  )

  return (
    <div className="space-y-4">
      {/* Dimension selector */}
      <div className="flex items-center gap-3">
        <Layers className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm font-medium">Analyze results by dimension:</span>
        <Select value={selectedDimension} onValueChange={(v) => {
          const val = v ?? ""
          setSelectedDimension(val)
          onDimensionChange?.(val !== "")
        }}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select a dimension…">
              {selectedDimensionName ?? "Select a dimension…"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {dimensions.map((d) => (
              <SelectItem key={d.dimension_id} value={String(d.dimension_id)}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Guidance when no dimension selected */}
      {!dimensionId && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Layers className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">
              Select a dimension above to see how the model&apos;s responses
              distribute across different demographic groups.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {isLoading && dimensionId && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            Loading analysis…
          </CardContent>
        </Card>
      )}

      {/* Per-prompt distribution charts */}
      {!isLoading && charts.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {charts.map((chart) => {
            const isNumeric = chart.chart_hint === "numeric" && chart.numeric_data?.length
            return (
              <Card key={chart.prompt_id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDetailPromptId(chart.prompt_id)}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium flex items-center gap-2 text-muted-foreground">
                    <BarChart3 className="h-3.5 w-3.5" />
                    Prompt #{chart.prompt_id}
                    {isNumeric && (
                      <Badge variant="outline" className="text-[9px] ml-1">numeric</Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm font-medium leading-tight line-clamp-2">
                    {chart.prompt_text}
                  </p>
                </CardHeader>
                <CardContent className="h-64">
                  {isNumeric ? (
                    <NumericChart data={chart.numeric_data!} />
                  ) : (
                    <CategoricalChart chart={chart} />
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* No data message */}
      {!isLoading && dimensionId && charts.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            No data available for this dimension. Images may not have metadata
            for the selected column.
          </CardContent>
        </Card>
      )}

      {/* Prompt detail dialog */}
      <Dialog
        open={detailPromptId !== null}
        onOpenChange={(open) => { if (!open) setDetailPromptId(null) }}
      >
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Prompt #{detailPromptId} — Inference Detail
            </DialogTitle>
            <DialogDescription className="line-clamp-2">
              {detailChart?.prompt_text}
            </DialogDescription>
          </DialogHeader>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground w-16">Image</th>
                  <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">Response</th>
                  <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground w-24">Classification</th>
                  <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground w-20">Status</th>
                  {onAudit && (
                    <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground w-28">Audit</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {detailInferences.map((inf) => (
                  <tr
                    key={inf.inference_id}
                    className={`border-b last:border-b-0 ${
                      inf.audit_status === "flag"
                        ? "bg-red-50 dark:bg-red-950/20"
                        : inf.audit_status === "pass"
                          ? "bg-green-50 dark:bg-green-950/20"
                          : ""
                    }`}
                  >
                    <td className="px-3 py-2">
                      {inf.thumbnail_url ? (
                        <img
                          src={inf.thumbnail_url}
                          alt={`img ${inf.image_id}`}
                          className="w-12 h-12 object-cover rounded bg-muted"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
                          N/A
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <p className="text-sm line-clamp-2">{inf.response}</p>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-xs">
                        {inf.classified_response || "—"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant={
                          inf.audit_status === "flag"
                            ? "destructive"
                            : inf.audit_status === "pass"
                              ? "default"
                              : "outline"
                        }
                        className="text-xs"
                      >
                        {inf.audit_status}
                      </Badge>
                    </td>
                    {onAudit && (
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex gap-1">
                          <Button
                            size="sm"
                            variant={inf.audit_status === "pass" ? "default" : "outline"}
                            className="h-7 px-2"
                            onClick={(e) => {
                              e.stopPropagation()
                              onAudit(inf.inference_id, "pass")
                            }}
                          >
                            <ThumbsUp className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant={inf.audit_status === "flag" ? "destructive" : "outline"}
                            className="h-7 px-2"
                            onClick={(e) => {
                              e.stopPropagation()
                              onAudit(inf.inference_id, "flag")
                            }}
                          >
                            <ThumbsDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Categorical 100%-stacked bar chart */
function CategoricalChart({ chart }: { chart: PromptDistribution }) {
  const { chartData, responseKeys } = toRechartsData(chart)
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="dimension"
          tick={{ fontSize: 10 }}
          interval={0}
          angle={-30}
          textAnchor="end"
          height={50}
        />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(v: number) => `${v}%`}
          tick={{ fontSize: 10 }}
        />
        <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
        <Legend wrapperStyle={{ fontSize: 10 }} />
        {responseKeys.map((key, i) => (
          <Bar
            key={key}
            dataKey={key}
            stackId="a"
            fill={COLORS[i % COLORS.length]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Numeric mean-bar chart */
function NumericChart({ data }: { data: NumericBoxData[] }) {
  const sorted = [...data].sort((a, b) => a.dimension.localeCompare(b.dimension))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={sorted}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="dimension"
          tick={{ fontSize: 10 }}
          interval={0}
          angle={-30}
          textAnchor="end"
          height={50}
        />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip
          content={({ payload }) => {
            if (!payload?.length) return null
            const d = payload[0].payload as NumericBoxData
            return (
              <div className="bg-background border rounded-md shadow-md px-3 py-2 text-xs space-y-0.5">
                <p className="font-medium">{d.dimension}</p>
                <p>Mean: {d.mean.toFixed(2)}</p>
                <p>Median: {d.median.toFixed(2)}</p>
                <p>Range: {d.min} – {d.max}</p>
                <p>n = {d.count}</p>
              </div>
            )
          }}
        />
        <Bar dataKey="mean" fill="#6366f1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Convert a PromptDistribution into recharts-compatible format (percentages). */
function toRechartsData(chart: PromptDistribution) {
  const allResponses = new Set<string>()
  for (const dimCounts of Object.values(chart.distribution)) {
    for (const resp of Object.keys(dimCounts)) {
      allResponses.add(resp)
    }
  }
  const responseKeys = Array.from(allResponses).sort()

  const chartData = Object.entries(chart.distribution)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dimValue, counts]) => {
      const total = Object.values(counts).reduce((s, n) => s + n, 0)
      const row: Record<string, unknown> = { dimension: dimValue }
      for (const resp of responseKeys) {
        row[resp] = total > 0 ? Math.round(((counts[resp] || 0) / total) * 1000) / 10 : 0
      }
      return row
    })

  return { chartData, responseKeys }
}
