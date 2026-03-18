/** Metrics dashboard: Fairness Semaphore, Radar Chart (bias pillars), Error Rate bar chart. */

import type { Metric, Inference } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, Shield } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts"

interface Props {
  metrics: Metric[]
  inferences: Inference[]
}

export default function MetricsPanel({ metrics, inferences }: Props) {
  /* Live KPI from local inferences */
  const total = inferences.length
  const flagged = inferences.filter((i) => i.audit_status === "flag").length
  const passed = inferences.filter((i) => i.audit_status === "pass").length
  const errored = inferences.filter(
    (i) => i.response.startsWith("[ERROR]") || i.response.startsWith("[SKIPPED]"),
  ).length
  const reviewed = flagged + passed

  /* Parse metrics from server */
  const fairnessMetric = metrics.find((m) => m.chart_type === "fairness_indicator")
  const radarMetric = metrics.find((m) => m.chart_type === "radar_chart")
  const barMetric = metrics.find((m) => m.chart_type === "bar_chart")

  const fairness = fairnessMetric ? JSON.parse(fairnessMetric.value_json) as {
    verdict: string; error_rate: number; total: number; errors: number
  } : null

  const radarData = radarMetric
    ? Object.entries(JSON.parse(radarMetric.value_json) as Record<string, number>).map(
        ([name, score]) => ({ bias: name, score }),
      )
    : []

  const barData = barMetric
    ? Object.entries(JSON.parse(barMetric.value_json) as Record<string, number>).map(
        ([name, value]) => ({ name, value }),
      )
    : []

  const verdictColor = fairness
    ? fairness.verdict === "FAIR"
      ? "text-green-600 dark:text-green-400"
      : fairness.verdict === "WARNING"
        ? "text-amber-500 dark:text-amber-400"
        : "text-red-600 dark:text-red-400"
    : ""

  const verdictBg = fairness
    ? fairness.verdict === "FAIR"
      ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800"
      : fairness.verdict === "WARNING"
        ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
        : "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800"
    : ""

  return (
    <div className="space-y-4">
      {/* Top row: Fairness semaphore + live KPI */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Fairness Indicator */}
        <Card className={fairness ? verdictBg : ""}>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" /> Fairness Indicator
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fairness ? (
              <>
                <p className={`text-4xl font-bold ${verdictColor}`}>
                  {fairness.verdict}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {fairness.error_rate}% error rate · {fairness.errors}/{fairness.total} failed
                </p>
              </>
            ) : (
              <>
                <p className="text-4xl font-bold text-muted-foreground">—</p>
                <p className="text-xs text-muted-foreground mt-1">Awaiting results</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Live audit KPI */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Audit Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{reviewed}/{total}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {flagged} flagged · {passed} passed · {errored} errors · {total - reviewed - errored} pending
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: Radar + Bar charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Radar chart — bias pillars */}
        {radarData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Bias Pillars (Score %)</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="75%">
                  <PolarGrid />
                  <PolarAngleAxis dataKey="bias" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="var(--color-primary)"
                    fill="var(--color-primary)"
                    fillOpacity={0.25}
                  />
                  <Tooltip formatter={(v) => `${v}%`} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Bar chart — error rate by bias type */}
        {barData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Error Rate by Bias Type (%)
              </CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={130} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Bar dataKey="value" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
