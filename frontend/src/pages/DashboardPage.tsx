import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { evaluationsApi } from "@/features/evaluations/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  FlaskConical,
  CheckCircle,
  Clock,
  XCircle,
  Brain,
  Database,
  Activity,
  MessageSquare,
  Plus,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts"

const STATUS_CONFIG: Record<string, { color: string; icon: typeof Clock }> = {
  pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
  running: { color: "bg-blue-100 text-blue-800", icon: FlaskConical },
  completed: { color: "bg-green-100 text-green-800", icon: CheckCircle },
  failed: { color: "bg-red-100 text-red-800", icon: XCircle },
}

// Mocked data for Model Bias Comparison (hackathon demo)
const BIAS_MOCK = [
  { model: "LLaVA-1.6", bias: 32, color: "#f59e0b" },
  { model: "Qwen-VL", bias: 18, color: "#10b981" },
  { model: "CogVLM", bias: 45, color: "#ef4444" },
  { model: "InternVL2", bias: 27, color: "#f59e0b" },
  { model: "Llama-Vision", bias: 12, color: "#10b981" },
]

export default function DashboardPage() {
  const { data: evaluations = [] } = useQuery({
    queryKey: ["evaluations"],
    queryFn: evaluationsApi.list,
  })

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: evaluationsApi.stats,
  })

  const recentEvals = evaluations.slice(0, 5)

  const kpis = [
    {
      label: "Models Connected",
      value: stats?.models_connected ?? 0,
      icon: Brain,
      color: "text-indigo-600",
    },
    {
      label: "Datasets Mapped",
      value: stats?.datasets_mapped ?? 0,
      icon: Database,
      color: "text-emerald-600",
    },
    {
      label: "Evaluations Run",
      value: stats?.evaluations_run ?? 0,
      icon: Activity,
      color: "text-amber-600",
    },
    {
      label: "Total Inferences",
      value: stats?.total_inferences ?? 0,
      icon: MessageSquare,
      color: "text-rose-600",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Command Center</h2>
        <p className="text-muted-foreground">
          High-level overview of your bias evaluation pipeline.
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {kpi.label}
                </CardTitle>
                <Icon className={`h-4 w-4 ${kpi.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{kpi.value.toLocaleString()}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Evaluation Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Evaluation Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.weekly_activity ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Model Bias Comparison (mocked) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Model Bias Comparison
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Average bias rate (%) — demo data
            </p>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={BIAS_MOCK} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 10 }} domain={[0, 60]} unit="%" />
                <YAxis type="category" dataKey="model" tick={{ fontSize: 10 }} width={90} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="bias" radius={[0, 4, 4, 0]}>
                  {BIAS_MOCK.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bias Audits */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Recent Bias Audits</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {/* New Evaluation card */}
          <Link to="/benchmark">
            <Card className="h-full border-dashed hover:shadow-md transition-shadow cursor-pointer flex items-center justify-center min-h-[140px]">
              <CardContent className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
                <Plus className="h-8 w-8" />
                <span className="text-sm font-medium">New Evaluation</span>
              </CardContent>
            </Card>
          </Link>

          {recentEvals.map((ev) => {
            const cfg = STATUS_CONFIG[ev.status] ?? STATUS_CONFIG.pending
            const StatusIcon = cfg.icon
            return (
              <Link key={ev.evaluation_id} to={`/evaluations/${ev.evaluation_id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">
                      Evaluation #{ev.evaluation_id}
                    </CardTitle>
                    <Badge variant="outline" className={cfg.color}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {ev.status}
                    </Badge>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground space-y-1">
                    <p>Model ID: {ev.model_id}</p>
                    <p>Dataset ID: {ev.dataset_id}</p>
                    <p>
                      Images: {ev.num_images} ({ev.images_resolution} res)
                    </p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
