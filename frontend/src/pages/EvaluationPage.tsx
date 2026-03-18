/** Evaluation results page with live KPI recalculation + progress bar. */

import { useState } from "react"
import { useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { evaluationsApi } from "@/features/evaluations/api"
import MetricsPanel from "@/features/evaluations/components/MetricsPanel"
import InferenceGallery from "@/features/evaluations/components/InferenceGallery"
import ProgressBar from "@/features/evaluations/components/ProgressBar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { FileDown, Loader2 } from "lucide-react"

export default function EvaluationPage() {
  const { id } = useParams<{ id: string }>()
  const evalId = Number(id)
  const queryClient = useQueryClient()
  const [exportingPdf, setExportingPdf] = useState(false)
  const [hasDimension, setHasDimension] = useState(false)

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
            disabled={exportingPdf}
            onClick={async () => {
              setExportingPdf(true)
              try {
                const res = await fetch(`/api/evaluations/${evalId}/export-pdf`)
                if (!res.ok) throw new Error("PDF generation failed")
                const blob = await res.blob()
                const url = URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = `fairly_report_${evalId}.pdf`
                a.click()
                URL.revokeObjectURL(url)
              } catch {
                // silent fail — user sees button reset
              } finally {
                setExportingPdf(false)
              }
            }}
          >
            {exportingPdf ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4 mr-2" />
            )}
            {exportingPdf ? "Generating PDF…" : "Export to PDF"}
          </Button>
        )}
      </div>

      {/* Progress bar (Story 3.3) */}
      <ProgressBar evaluation={evaluation} inferenceCount={inferences.length} />

      {/* Dimension analysis charts */}
      {evaluation.status === "completed" && (
        <MetricsPanel
          evaluationId={evalId}
          onAudit={(inferenceId, status) =>
            auditMutation.mutate({ inferenceId, status })
          }
          onDimensionChange={setHasDimension}
        />
      )}

      {!hasDimension && (
        <>
          <Separator />

          {/* Inference gallery */}
          <InferenceGallery
            inferences={inferences}
            onAudit={(inferenceId, status) =>
              auditMutation.mutate({ inferenceId, status })
            }
          />
        </>
      )}
    </div>
  )
}
