import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { fetchEvaluations, type Evaluation } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FlaskConical, CheckCircle, Clock, XCircle } from "lucide-react"

const STATUS_CONFIG: Record<string, { color: string; icon: typeof Clock }> = {
  pending: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
  running: { color: "bg-blue-100 text-blue-800", icon: FlaskConical },
  completed: { color: "bg-green-100 text-green-800", icon: CheckCircle },
  failed: { color: "bg-red-100 text-red-800", icon: XCircle },
}

export default function DashboardPage() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])

  useEffect(() => {
    fetchEvaluations().then(setEvaluations).catch(console.error)
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of your bias evaluations.
        </p>
      </div>

      {evaluations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FlaskConical className="mx-auto h-10 w-10 mb-4 opacity-50" />
            <p className="text-lg font-medium">No evaluations yet</p>
            <p className="text-sm mt-1">
              Go to the{" "}
              <Link to="/benchmark" className="underline text-primary">
                Benchmark
              </Link>{" "}
              page to run your first evaluation.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {evaluations.map((ev) => {
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
                    <p>Images: {ev.num_images} ({ev.images_resolution} res)</p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
