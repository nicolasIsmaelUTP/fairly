import api from "@/lib/axios"
import type { Model } from "@/types"

export const modelsApi = {
  list: () => api.get<Model[]>("/models").then((r) => r.data),

  get: (id: number) => api.get<Model>(`/models/${id}`).then((r) => r.data),

  create: (data: { name: string; source: string; metadata_json: string }) =>
    api.post<Model>("/models", data).then((r) => r.data),

  delete: (id: number) => api.delete(`/models/${id}`).then((r) => r.data),
}
