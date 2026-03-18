import api from "@/lib/axios"
import type { DimensionOption, Evaluation, Inference, Metric, PromptDistribution, Stats } from "@/types"

export const evaluationsApi = {
  list: () => api.get<Evaluation[]>("/evaluations").then((r) => r.data),

  get: (id: number) =>
    api.get<Evaluation>(`/evaluations/${id}`).then((r) => r.data),

  create: (data: {
    model_id: number
    dataset_id: number
    domain_id: number
    dimension_ids: number[]
    num_images: number
    images_resolution: string
  }) => api.post<Evaluation>("/evaluations", data).then((r) => r.data),

  inferences: (evalId: number) =>
    api.get<Inference[]>(`/evaluations/${evalId}/inferences`).then((r) => r.data),

  updateAudit: (inferenceId: number, audit_status: string) =>
    api
      .patch<Inference>(`/evaluations/inferences/${inferenceId}`, {
        audit_status,
      })
      .then((r) => r.data),

  metrics: (evalId: number) =>
    api.get<Metric[]>(`/evaluations/${evalId}/metrics`).then((r) => r.data),

  dimensions: (evalId: number) =>
    api.get<DimensionOption[]>(`/evaluations/${evalId}/dimensions`).then((r) => r.data),

  analysis: (evalId: number, dimensionId: number) =>
    api.get<PromptDistribution[]>(`/evaluations/${evalId}/analysis`, {
      params: { dimension_id: dimensionId },
    }).then((r) => r.data),

  stats: () => api.get<Stats>("/stats").then((r) => r.data),
}
