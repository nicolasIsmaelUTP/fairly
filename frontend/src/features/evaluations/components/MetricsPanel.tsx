/** KPI + Bar chart panels with live recalculation from local audit state (Story 4.1). */

import type { Metric, Inference } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"

interface Props {
  metrics: Metric[]
  inferences: Inference[]
}

export default function MetricsPanel({ metrics, inferences }: Props) {
  /* Compute live KPI from the local inferences array (human-in-the-loop). */
  const total = inferences.length
  const flagged = inferences.filter((i) => i.audit_status === "flag").length
  const passed = inferences.filter((i) => i.audit_status === "pass").length
  const reviewed = flagged + passed
  const deltaPercent = total > 0 ? ((flagged / total) * 100).toFixed(1) : "0.0"

  /* Fall back to server-provided bar metric if available. */
  const barMetric = metrics.find((m) => m.chart_type === "bar_chart")
  const barData = barMetric
    ? Object.entries(JSON.parse(barMetric.value_json)).map(([name, value]) => ({
        name,
        value,
      }))
    : []

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Live KPI */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Overall Bias Delta</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">Δ {deltaPercent}%</p>
          <p className="text-xs text-muted-foreground mt-1">
            {flagged} flagged · {passed} passed · {total - reviewed} unreviewed — of {total} total
          </p>
        </CardContent>
      </Card>

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
  )
}
