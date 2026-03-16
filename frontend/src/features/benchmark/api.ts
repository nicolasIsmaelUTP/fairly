import api from "@/lib/axios"
import type { Domain, Dimension, Prompt } from "@/types"

export const promptsApi = {
  domains: () => api.get<Domain[]>("/prompts/domains").then((r) => r.data),

  dimensions: () =>
    api.get<Dimension[]>("/prompts/dimensions").then((r) => r.data),

  list: (params?: { domain_id?: number; dimension_id?: number }) =>
    api.get<Prompt[]>("/prompts", { params }).then((r) => r.data),
}
