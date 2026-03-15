import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import {
  fetchEvaluation,
  fetchInferences,
  fetchMetrics,
  updateAuditStatus,
  type Evaluation,
  type Inference,
  type Metric,
} from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ThumbsUp, ThumbsDown, FileDown, BarChart3 } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"

export default function EvaluationPage() {
  const { id } = useParams<{ id: string }>()
  const evalId = Number(id)

  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [inferences, setInferences] = useState<Inference[]>([])
  const [metrics, setMetrics] = useState<Metric[]>([])

  const load = () => {
    fetchEvaluation(evalId).then(setEvaluation).catch(console.error)
    fetchInferences(evalId).then(setInferences).catch(console.error)
    fetchMetrics(evalId).then(setMetrics).catch(console.error)
  }

  useEffect(() => { load() }, [evalId])

  // Auto-refresh while running
  useEffect(() => {
    if (evaluation?.status !== "running") return
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [evaluation?.status])

  const handleAudit = async (inferenceId: number, status: string) => {
    await updateAuditStatus(inferenceId, status)
    load()
  }

  const kpiMetric = metrics.find((m) => m.chart_type === "kpi_delta")
  const barMetric = metrics.find((m) => m.chart_type === "bar_chart")

  const kpiData = kpiMetric ? JSON.parse(kpiMetric.value_json) : null
  const barData = barMetric
    ? Object.entries(JSON.parse(barMetric.value_json)).map(([name, value]) => ({
        name,
        value,
      }))
    : []

  const audited = inferences.filter((i) => i.audit_status !== "unreviewed").length

  if (!evaluation) {
    return <p className="text-muted-foreground">Loading…</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            Evaluation #{evaluation.evaluation_id}
          </h2>
          <Badge variant="outline">{evaluation.status}</Badge>
        </div>
        <Button
          variant="outline"
          render={<a href={`/api/evaluations/${evalId}/export-pdf`} target="_blank" rel="noreferrer" />}
        >
          <FileDown className="h-4 w-4 mr-2" />
          Export to PDF
        </Button>
      </div>

      {/* Metrics */}
      {metrics.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* KPI */}
          {kpiData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Overall Bias Delta
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold">Δ {kpiData.delta_percent}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpiData.flagged} flagged / {kpiData.total} total
                </p>
              </CardContent>
            </Card>
          )}

          {/* Bar chart */}
          {barData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> Bias by Dimension
                </CardTitle>
              </CardHeader>
              <CardContent className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Separator />

      {/* Inference gallery */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Inference Gallery</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Audited: {audited} / {inferences.length}
        </p>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {inferences.map((inf) => (
            <Card
              key={inf.inference_id}
              className={
                inf.audit_status === "flag"
                  ? "border-red-400"
                  : inf.audit_status === "pass"
                  ? "border-green-400"
                  : ""
              }
            >
              <CardContent className="pt-4 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Prompt #{inf.prompt_id} · Image #{inf.image_id}
                </p>
                <p className="text-sm leading-relaxed">{inf.response}</p>
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    variant={inf.audit_status === "pass" ? "default" : "outline"}
                    onClick={() => handleAudit(inf.inference_id, "pass")}
                  >
                    <ThumbsUp className="h-3 w-3 mr-1" /> Pass
                  </Button>
                  <Button
                    size="sm"
                    variant={inf.audit_status === "flag" ? "destructive" : "outline"}
                    onClick={() => handleAudit(inf.inference_id, "flag")}
                  >
                    <ThumbsDown className="h-3 w-3 mr-1" /> Flag
                  </Button>
                  <Badge variant="outline" className="ml-auto text-xs">
                    {inf.audit_status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
