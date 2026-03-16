/** Evaluation results page with live KPI recalculation + progress bar. */

import { useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { evaluationsApi } from "@/features/evaluations/api"
import MetricsPanel from "@/features/evaluations/components/MetricsPanel"
import InferenceGallery from "@/features/evaluations/components/InferenceGallery"
import ProgressBar from "@/features/evaluations/components/ProgressBar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { FileDown } from "lucide-react"

export default function EvaluationPage() {
  const { id } = useParams<{ id: string }>()
  const evalId = Number(id)
  const queryClient = useQueryClient()

  const { data: evaluation } = useQuery({
    queryKey: ["evaluation", evalId],
    queryFn: () => evaluationsApi.get(evalId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === "running" || status === "pending" ? 3000 : false
    },
  })

  const { data: inferences = [] } = useQuery({
    queryKey: ["inferences", evalId],
    queryFn: () => evaluationsApi.inferences(evalId),
    refetchInterval: (query) =>
      evaluation?.status === "running" || evaluation?.status === "pending" ? 3000 : false,
  })

  const { data: metrics = [] } = useQuery({
    queryKey: ["metrics", evalId],
    queryFn: () => evaluationsApi.metrics(evalId),
    refetchInterval: (query) =>
      evaluation?.status === "running" ? 5000 : false,
  })

  /* Optimistic audit update — updates local cache immediately (Story 4.1). */
  const auditMutation = useMutation({
    mutationFn: ({ inferenceId, status }: { inferenceId: number; status: string }) =>
      evaluationsApi.updateAudit(inferenceId, status),
    onMutate: async ({ inferenceId, status }) => {
      await queryClient.cancelQueries({ queryKey: ["inferences", evalId] })
      const prev = queryClient.getQueryData<typeof inferences>(["inferences", evalId])
      queryClient.setQueryData(
        ["inferences", evalId],
        (old: typeof inferences | undefined) =>
          old?.map((inf) =>
            inf.inference_id === inferenceId ? { ...inf, audit_status: status } : inf
          ) ?? []
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["inferences", evalId], ctx.prev)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["inferences", evalId] }),
  })

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
        {evaluation.status === "completed" && (
          <Button
            variant="outline"
            render={
              <a
                href={`/api/evaluations/${evalId}/export-pdf`}
                download={`fairly_report_${evalId}.pdf`}
                rel="noreferrer"
              />
            }
          >
            <FileDown className="h-4 w-4 mr-2" />
            Export to PDF
          </Button>
        )}
      </div>

      {/* Progress bar (Story 3.3) */}
      <ProgressBar evaluation={evaluation} inferenceCount={inferences.length} />

      {/* Metrics with live recalculation */}
      {inferences.length > 0 && (
        <MetricsPanel metrics={metrics} inferences={inferences} />
      )}

      <Separator />

      {/* Inference gallery */}
      <InferenceGallery
        inferences={inferences}
        onAudit={(inferenceId, status) =>
          auditMutation.mutate({ inferenceId, status })
        }
      />
    </div>
  )
}
