import api from "@/lib/axios"
import type { Model } from "@/types"

export const modelsApi = {
  list: () => api.get<Model[]>("/models").then((r) => r.data),

  get: (id: number) => api.get<Model>(`/models/${id}`).then((r) => r.data),

  create: (data: { name: string; source: string; metadata_json: string }) =>
    api.post<Model>("/models", data).then((r) => r.data),

  update: (id: number, metadata_json: string) =>
    api.patch<Model>(`/models/${id}`, { metadata_json }).then((r) => r.data),

  delete: (id: number) => api.delete(`/models/${id}`).then((r) => r.data),

  testConnection: (endpoint: string, api_key: string, model_id: string) =>
    api.post<{ ok: boolean; response: string }>("/models/test-connection", { endpoint, api_key, model_id }).then((r) => r.data),
}
