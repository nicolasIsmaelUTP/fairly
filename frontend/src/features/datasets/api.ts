import api from "@/lib/axios"
import type { Dataset, ColumnMapping } from "@/types"

export const datasetsApi = {
  list: () => api.get<Dataset[]>("/datasets").then((r) => r.data),

  get: (id: number) => api.get<Dataset>(`/datasets/${id}`).then((r) => r.data),

  create: (data: { name: string; imgs_route: string; csv_route: string }) =>
    api.post<Dataset>("/datasets", data).then((r) => r.data),

  delete: (id: number) => api.delete(`/datasets/${id}`).then((r) => r.data),

  csvHeaders: (id: number) =>
    api.get<string[]>(`/datasets/${id}/csv-headers`).then((r) => r.data),

  listColumns: (id: number) =>
    api.get<ColumnMapping[]>(`/datasets/${id}/columns`).then((r) => r.data),

  createColumn: (datasetId: number, data: { name: string; dimension_id: number }) =>
    api.post<ColumnMapping>(`/datasets/${datasetId}/columns`, data).then((r) => r.data),
}
