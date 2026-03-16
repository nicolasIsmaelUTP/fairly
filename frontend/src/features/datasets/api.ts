import api from "@/lib/axios"
import type { Dataset, ColumnMapping, CsvPreview } from "@/types"

export const datasetsApi = {
  list: () => api.get<Dataset[]>("/datasets").then((r) => r.data),

  get: (id: number) => api.get<Dataset>(`/datasets/${id}`).then((r) => r.data),

  create: (data: { name: string; imgs_route: string; csv_route: string; image_column?: string }) =>
    api.post<Dataset>("/datasets", data).then((r) => r.data),

  update: (id: number, data: Record<string, unknown>) =>
    api.put<Dataset>(`/datasets/${id}`, data).then((r) => r.data),

  delete: (id: number) => api.delete(`/datasets/${id}`).then((r) => r.data),

  uploadCsv: (file: File) => {
    const form = new FormData()
    form.append("file", file)
    return api
      .post<CsvPreview & { path: string }>("/datasets/upload-csv", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data)
  },

  csvPreview: (id: number) =>
    api.get<CsvPreview>(`/datasets/${id}/csv-preview`).then((r) => r.data),

  csvHeaders: (id: number) =>
    api.get<string[]>(`/datasets/${id}/csv-headers`).then((r) => r.data),

  listColumns: (id: number) =>
    api.get<ColumnMapping[]>(`/datasets/${id}/columns`).then((r) => r.data),

  createColumn: (datasetId: number, data: { name: string; dimension_id: number }) =>
    api.post<ColumnMapping>(`/datasets/${datasetId}/columns`, data).then((r) => r.data),

  deleteColumn: (datasetId: number, columnId: number) =>
    api.delete(`/datasets/${datasetId}/columns/${columnId}`).then((r) => r.data),
}
